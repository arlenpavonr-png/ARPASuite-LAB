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

    if (request.method === 'GET' && url.pathname === '/conectar') {
      return new Response(PAGINA_CONECTAR, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

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

/**
 * Página "Conectar WhatsApp" (registro insertado de Meta, flujo de coexistencia):
 * Arlen entra con su Facebook, elige "conectar mi WhatsApp Business existente" y escanea
 * el QR en el celular. El número sigue funcionando en la app y queda también en la Cloud API.
 * No guarda nada: solo muestra en pantalla el resultado que devuelve Meta.
 */
const PAGINA_CONECTAR = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conectar WhatsApp · Automatismos ARPA</title>
<style>
body{margin:0;background:#0f0f0f;color:#e8e8e8;font-family:system-ui,sans-serif;line-height:1.5}
main{max-width:560px;margin:0 auto;padding:32px 16px}
h1{color:#FFD700;font-size:28px;margin:0 0 8px}
button{background:#25D366;color:#0f0f0f;border:0;border-radius:10px;padding:14px 20px;font-size:18px;font-weight:700;cursor:pointer;width:100%}
pre{white-space:pre-wrap;background:#1a1a1a;border-radius:10px;padding:12px;font-size:14px}
li{margin-bottom:6px}
</style></head><body><main>
<h1>Conectar el WhatsApp de Automatismos</h1>
<ol>
<li>Toque el botón verde y entre con su Facebook.</li>
<li>Elija el portafolio <b>ARPA Technology Global</b>.</li>
<li>Cuando pregunte por el número, elija <b>conectar su app WhatsApp Business existente</b> y ponga el <b>300 568 3914</b>.</li>
<li>En el celular, abra WhatsApp Business y escanee el código QR que le muestre Meta. Acepte compartir el historial.</li>
</ol>
<button id="btn">Conectar WhatsApp</button>
<h2 style="font-size:18px">Resultado</h2>
<pre id="res">Todavía nada.</pre>
</main>
<script>
const res = document.getElementById('res');
function mostrar(t){ res.textContent = t; }
window.addEventListener('message', (event) => {
  if (!event.origin.endsWith('facebook.com')) return;
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'WA_EMBEDDED_SIGNUP') mostrar('Evento: ' + data.event + String.fromCharCode(10) + JSON.stringify(data.data || {}, null, 2));
  } catch (e) {}
});
window.fbAsyncInit = function () {
  FB.init({ appId: '1652083093092009', autoLogAppEvents: true, xfbml: true, version: 'v26.0' });
};
document.getElementById('btn').onclick = function () {
  if (!window.FB) { mostrar('Todavía está cargando Facebook. Espere unos segundos y vuelva a tocar el botón.'); return; }
  FB.login(function (response) {
    if (!response.authResponse) mostrar(res.textContent + String.fromCharCode(10) + '(Inicio de sesión cancelado o sin respuesta)');
  }, {
    config_id: '1094876990119399',
    response_type: 'code',
    override_default_response_type: true,
    extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' }
  });
};
</script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/es_LA/sdk.js"></script>
</body></html>`;
