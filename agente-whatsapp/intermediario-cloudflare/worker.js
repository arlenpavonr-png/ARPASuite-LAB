/**
 * Intermediario mínimo (Cloudflare Worker, plan gratis) entre Meta y Apps Script.
 * NO está desplegado. Ver agente-whatsapp/README.md, paso "Intermediario".
 *
 * Por qué existe: el web app de Apps Script responde a los POST con una redirección 302
 * y no deja leer cabeceras. Meta reintenta todo lo que no sea un 200 (hasta 7 días) y
 * pide validar la firma X-Hub-Signature-256. Este Worker:
 *   1. Responde la verificación de Meta (GET con hub.challenge).
 *   2. Valida la firma de cada POST con el App Secret de Meta.
 *   3. Responde 200 al instante y reenvía el cuerpo tal cual a Apps Script,
 *      con ?relay_token=... para que Apps Script sepa que viene de aquí.
 *
 * Variables (secretas, en Cloudflare → Worker → Settings → Variables, nunca en el repo):
 *   VERIFY_TOKEN     la misma de Script Properties
 *   META_APP_SECRET  App Secret de la app de Meta (Configuración básica)
 *   APPS_SCRIPT_URL  URL del web app de Apps Script (la que termina en /exec)
 *   RELAY_TOKEN      la misma de Script Properties
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const ok = url.searchParams.get('hub.mode') === 'subscribe' &&
        env.VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === env.VERIFY_TOKEN;
      return ok
        ? new Response(url.searchParams.get('hub.challenge') || '', { status: 200 })
        : new Response('forbidden', { status: 403 });
    }

    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

    const cuerpo = await request.text();
    const firma = request.headers.get('x-hub-signature-256') || '';
    if (!(await firmaValida(cuerpo, firma, env.META_APP_SECRET))) {
      return new Response('invalid signature', { status: 401 });
    }

    ctx.waitUntil(reenviar(cuerpo, env));
    return new Response('ok', { status: 200 });
  }
};

/** Reenvía a Apps Script (sigue la redirección 302 de Google). Un reintento si falla la red. */
export async function reenviar(cuerpo, env, fetchFn = fetch) {
  const destino = env.APPS_SCRIPT_URL + (env.APPS_SCRIPT_URL.includes('?') ? '&' : '?') +
    'relay_token=' + encodeURIComponent(env.RELAY_TOKEN || '');
  for (let intento = 1; intento <= 2; intento += 1) {
    try {
      const r = await fetchFn(destino, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: cuerpo,
        redirect: 'follow'
      });
      if (r.status < 500) return r.status;
    } catch (err) {
      console.log('reenvio fallo', intento, String(err));
    }
  }
  return 0;
}

/** Compara "sha256=<hex>" con el HMAC-SHA256 del cuerpo, en tiempo constante. */
export async function firmaValida(cuerpo, cabecera, secreto) {
  if (!secreto || !cabecera || !cabecera.startsWith('sha256=')) return false;
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo));
  const esperado = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const dado = cabecera.slice(7).toLowerCase();
  if (dado.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i += 1) diff |= esperado.charCodeAt(i) ^ dado.charCodeAt(i);
  return diff === 0;
}
