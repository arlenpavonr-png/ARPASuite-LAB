// Pruebas unitarias de las funciones puras del contestador.
// Correr: node --test agente-whatsapp/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { crearEntorno } from '../ensayo/simulador.mjs';
import { firmaValida, reenviar } from '../intermediario-cloudflare/worker.js';

const { gs } = crearEntorno({ silencioso: true });
const NEG = gs.NEGOCIOS.automatismos;
const COL = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h + 5, min); // hora Colombia → ms UTC

test('filtro de precios: deja pasar solo los de la ficha', () => {
  const ok = gs.filtrarPrecios_('Bulldozer 850 a $1.459.900 con IVA incluido; visita técnica $80.000.', NEG.preciosPermitidos);
  assert.equal(ok.ok, true);
  assert.deepEqual([...ok.encontrados], [1459900, 80000]);
  assert.equal(gs.filtrarPrecios_('La visita vale 80 mil pesos', NEG.preciosPermitidos).ok, true);
  // El Fox 1000 Pro se quitó de la web el 18-oct: su precio ya no puede salir.
  assert.equal(gs.filtrarPrecios_('Fox 1000 Pro desde $ 799.900', NEG.preciosPermitidos).ok, false);
  // El Pitbull 400 ($1.099.900) ya no se ofrece (Arlen, 26-oct).
  assert.equal(gs.filtrarPrecios_('Pitbull 400 desde $1.099.900', NEG.preciosPermitidos).ok, false);
  assert.equal(gs.filtrarPrecios_('Garantía de 2 años y 50 % de anticipo', NEG.preciosPermitidos).ok, true);
});

test('filtro de precios: bloquea valores inventados', () => {
  for (const t of ['La instalación vale $350.000', 'Le sale en 350 mil', 'Unos 1,5 millones con todo',
    'Son $1.200.000', 'El control adicional cuesta 90.000 pesos', 'Cuesta 300 USD', '$1.459.900 instalado']) {
    assert.equal(gs.filtrarPrecios_(t, NEG.preciosPermitidos).ok, false, t);
  }
});

test('filtro de precios: precio permitido junto a "instalación" sin aclarar que va aparte', () => {
  assert.equal(gs.filtrarPrecios_('Con instalación queda en $1.459.900', NEG.preciosPermitidos).ok, false);
  assert.equal(gs.filtrarPrecios_('Desde $1.459.900 con IVA incluido; la instalación se cotiza aparte.', NEG.preciosPermitidos).ok, true);
});

test('handoff: casos que se pasan a Arlen', () => {
  const casos = {
    '¿Cuánto cobra por instalar?': 'precio_instalacion',
    'cuanto vale la mano de obra': 'precio_instalacion',
    'Quiero agendar una visita': 'visita',
    '¿Pueden venir mañana?': 'visita',
    'Lo quiero, ¿cómo le pago?': 'compra',
    'Quiero hablar con una persona': 'persona',
    'Pésimo servicio': 'molesto',
    'Nadie responde en este número': 'molesto'
  };
  for (const [t, motivo] of Object.entries(casos)) {
    assert.equal(gs.decidirHandoff_(t).motivo, motivo, t);
  }
  assert.equal(gs.decidirHandoff_('La puerta mide 3 x 2 metros', { tieneFotos: true }).motivo, 'medidas_con_fotos');
});

test('handoff: preguntas normales no se pasan', () => {
  for (const t of ['Hola', '¿Cuánto vale un motor corredizo?', '¿El motor funciona sin luz?', '¿Tienen garantía?',
    'La puerta mide 3 x 2 metros']) {
    assert.equal(gs.decidirHandoff_(t, { tieneFotos: false }).pasar, false, t);
  }
});

test('silencio tras el eco de Arlen (12 h por defecto)', () => {
  const ahora = COL(2026, 10, 22, 10);
  const hist = [{ rol: 'cliente', ms: ahora - 7200000 }, { rol: 'arlen', ms: ahora - 3600000 }];
  assert.equal(gs.enSilencio_(hist, ahora, 12), true);
  assert.equal(gs.enSilencio_(hist, ahora + 12 * 3600000, 12), false);
  assert.equal(gs.enSilencio_([{ rol: 'asistente', ms: ahora }], ahora, 12), false);
});

test('cuándo responde Arlen', () => {
  const h = NEG.horario;
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 21, 10), h, []).cuando, 'hoy mismo');          // miércoles
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 21, 16, 30), h, []).cuando, 'mañana a primera hora');
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 24, 22), h, []).cuando, 'el lunes a primera hora'); // sábado
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 23, 18), h, []).cuando, 'el lunes a primera hora'); // viernes
  assert.equal(gs.cuandoResponde_(COL(2026, 11, 1, 12), h, []).cuando, 'el martes a primera hora'); // lunes 2-nov festivo
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 22, 6), h, []).cuando, 'hoy a partir de las 8 a. m.');
  assert.equal(gs.cuandoResponde_(COL(2026, 10, 26, 10), h, ['2026-10-26']).cuando, 'mañana a primera hora');
});

test('armado del prompt: sistema y mensajes', () => {
  const sis = gs.construirSistema_(NEG, { fecha: 'x', enHorario: false, cuando: 'el lunes a primera hora', handoff: 'visita', nombre: 'Ana' });
  assert.equal(sis.length, 2);
  assert.match(sis[0].text, /NUNCA dé precios de instalación/);
  assert.equal(sis[0].cache_control.type, 'ephemeral');
  assert.match(sis[1].text, /el lunes a primera hora/);
  assert.match(sis[1].text, /\[ARLEN\]/);
  const msgs = gs.construirMensajes_([
    { rol: 'asistente', texto: 'mensaje viejo' },
    { rol: 'cliente', tipo: 'text', texto: 'Hola' },
    { rol: 'cliente', tipo: 'image', texto: '' },
    { rol: 'sistema', texto: 'no va' },
    { rol: 'arlen', texto: 'Ya le cotizo' },
    { rol: 'cliente', tipo: 'text', texto: 'Gracias' }
  ], 20);
  assert.deepEqual(JSON.parse(JSON.stringify(msgs)), [
    { role: 'user', content: 'Hola\n(El cliente envió una foto)' },
    { role: 'assistant', content: '(Arlen escribió desde su celular) Ya le cotizo' },
    { role: 'user', content: 'Gracias' }
  ]);
  const cuerpo = gs.cuerpoClaude_('claude-sonnet-5-5', sis, msgs);
  assert.equal(cuerpo.model, 'claude-sonnet-5-5');
  assert.equal(cuerpo.fallbacks, 'default');
  assert.ok(!('temperature' in cuerpo));
});

test('revisión de la respuesta: marca, markdown y respaldo', () => {
  const r1 = gs.revisarRespuesta_(NEG, '[ARLEN] **Claro**. Le paso su caso a Arlen.', { handoff: '' }, 'hoy mismo');
  assert.equal(r1.handoff, true);
  assert.equal(r1.enviar, 'Claro. Le paso su caso a Arlen.');
  const r2 = gs.revisarRespuesta_(NEG, 'La instalación vale $300.000', {}, 'mañana a primera hora');
  assert.equal(r2.bloqueada, true);
  assert.match(r2.enviar, /Le paso su caso a Arlen, que le responde mañana a primera hora/);
  const r3 = gs.revisarRespuesta_(NEG, 'Con gusto le ayudamos.', { handoff: 'visita' }, 'hoy mismo');
  assert.match(r3.enviar, /Le paso su caso a Arlen/);
  const r4 = gs.revisarRespuesta_(NEG, '', {}, 'hoy mismo');
  assert.equal(r4.handoff, true);
});

test('tono de usted', () => {
  assert.equal(gs.tieneTuteo_('¿Me puede enviar fotos de su puerta?'), false);
  assert.equal(gs.tieneTuteo_('¿Me puedes enviar fotos de tu puerta?'), true);
  assert.equal(gs.tieneTuteo_('Si tú quieres, te paso con Arlen'), true);
});

test('lectura del webhook: mensajes, ecos y estados', () => {
  const ev = gs.parsearWebhook_({ entry: [{ changes: [
    { field: 'messages', value: { metadata: { phone_number_id: '1' }, contacts: [{ wa_id: '573001', profile: { name: 'Ana' } }],
      messages: [{ from: '573001', id: 'w1', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } },
        { from: '573001', id: 'w2', timestamp: '1700000001', type: 'image', image: { id: 'm1', caption: 'puerta' } }] } },
    { field: 'messages', value: { metadata: { phone_number_id: '1' }, statuses: [{ id: 'x', status: 'read' }] } },
    { field: 'smb_message_echoes', value: { metadata: { phone_number_id: '1' },
      message_echoes: [{ from: '573005683914', to: '573001', id: 'w3', timestamp: '1700000002', type: 'text', text: { body: 'Hola, soy Arlen' } }] } },
    { field: 'history', value: {} }
  ] }] });
  assert.equal(ev.length, 3);
  assert.equal(ev[0].nombre, 'Ana');
  assert.equal(ev[1].texto, 'puerta');
  assert.equal(ev[1].mediaId, 'm1');
  assert.equal(ev[2].tipo, 'eco');
  assert.equal(ev[2].cliente, '573001');
});

test('intermediario: firma X-Hub-Signature-256', async () => {
  const cuerpo = '{"entry":[]}';
  const secreto = 'secreto-de-prueba';
  const firma = 'sha256=' + crypto.createHmac('sha256', secreto).update(cuerpo).digest('hex');
  assert.equal(await firmaValida(cuerpo, firma, secreto), true);
  assert.equal(await firmaValida(cuerpo + ' ', firma, secreto), false);
  assert.equal(await firmaValida(cuerpo, 'sha256=00', secreto), false);
  assert.equal(await firmaValida(cuerpo, firma, ''), false);
});

test('intermediario: reenvía a Apps Script con relay_token', async () => {
  const llamadas = [];
  const estado = await reenviar('{"a":1}', { APPS_SCRIPT_URL: 'https://ejemplo.test/web', RELAY_TOKEN: 'abc' },
    async (url, opts) => { llamadas.push({ url, opts }); return { status: 200 }; });
  assert.equal(estado, 200);
  assert.equal(llamadas[0].url, 'https://ejemplo.test/web?relay_token=abc');
  assert.equal(llamadas[0].opts.body, '{"a":1}');
  assert.equal(llamadas[0].opts.redirect, 'follow');
});

test('regla precio fijo, sin rebajas (Arlen 7-nov): está en el cerebro y pasa a Arlen si insiste', () => {
  const c = NEG.cerebro;
  const s = Array.isArray(c) ? c.join(' ') : String(c);
  assert.match(s, /no manejamos rebajas/);
  assert.match(s, /insiste en un descuento/);
});

// ── ARPA Suite (301 609 2542), Arlen 9-nov-2026 ──
const AS = gs.NEGOCIOS.arpasuite;
const opAS = { permiteUsd: true, revisaInstalacion: false };

test('ARPA Suite: activo, con cerebro, link de prueba y precio fijo', () => {
  assert.equal(AS.activo, true);
  const c = gs.textoCerebro_(AS);
  assert.match(c, /Asistente ARPA Suite/);
  assert.match(c, /link de la prueba gratis: https:\/\/arpatechnologyglobal\.com/); // sin la propiedad, la página principal
  assert.match(c, /NO ofrezcas descuentos/);
  assert.match(c, /No digas que eres una persona/);
  assert.equal(gs.textoCerebro_(NEG), NEG.cerebro);
});

test('ARPA Suite: precios en USD y COP permitidos; los demás no', () => {
  for (const t of ['La licencia Técnico vale 83 USD, pago único.', 'PYME: 190 USD. Marca blanca: USD 333.',
    'Son $83 USD de por vida.', 'En Colombia: $340.000, $779.000 y $1.365.000 COP.', '83 dólares, sin mensualidades']) {
    assert.equal(gs.filtrarPrecios_(t, AS.preciosPermitidos, opAS).ok, true, t);
  }
  for (const t of ['Hoy te la dejo en 59 USD.', 'Cuesta $59.', 'Son 1.616 MXN aprox.', 'Vale 75 dólares', 'Son 300 soles']) {
    assert.equal(gs.filtrarPrecios_(t, AS.preciosPermitidos, opAS).ok, false, t);
  }
});

test('ARPA Suite: "instalar la app" no se confunde con mano de obra', () => {
  assert.equal(gs.filtrarPrecios_('Son 83 USD y para instalar la app tocas el botón Instalar.', AS.preciosPermitidos, opAS).ok, true);
  assert.equal(gs.decidirHandoff_('¿Cuánto cuesta instalar la app?', { reglas: AS.reglasHandoff }).pasar, false);
  assert.equal(gs.decidirHandoff_('¿Cómo la descargo?', { reglas: AS.reglasHandoff }).pasar, false);
});

test('ARPA Suite: pasa a Arlen al pagar, pedir persona o estar molesto; "¿eres un bot?" lo responde el asistente', () => {
  const r = { reglas: AS.reglasHandoff };
  assert.equal(gs.decidirHandoff_('Ya quiero comprar, ¿cómo pago?', r).motivo, 'compra');
  assert.equal(gs.decidirHandoff_('Quiero hablar con una persona', r).motivo, 'persona');
  assert.equal(gs.decidirHandoff_('Pésimo, nadie responde', r).motivo, 'molesto');
  assert.equal(gs.decidirHandoff_('¿Eres un bot?', r).pasar, false);
  assert.equal(gs.decidirHandoff_('¿Pueden venir mañana?', r).pasar, false);
  // Automatismos no cambia: el robot sí se pasa a Arlen.
  assert.equal(gs.decidirHandoff_('¿Es un robot?').motivo, 'persona');
});

test('ARPA Suite: respaldo y acuse de tú', () => {
  const rev = gs.revisarRespuesta_(AS, 'Hoy te la dejo en 59 USD.', { handoff: '' }, 'mañana a las 8 a. m.');
  assert.equal(rev.bloqueada, true);
  assert.match(rev.enviar, /Te paso tu caso a Arlen/);
  assert.match(rev.enviar, /probar ARPA Suite gratis 7 días/);
  const ok = gs.revisarRespuesta_(AS, '[ARLEN] Listo, para el pago le aviso a Arlen.', { handoff: 'compra' }, 'hoy');
  assert.equal(ok.handoff, true);
  assert.equal(ok.bloqueada, false);
  assert.equal(gs.textoAcuse_(AS, 'image', 'hoy'), 'Recibimos tu foto, gracias. Arlen te responde hoy.');
  assert.equal(gs.textoAcuse_(NEG, 'image', 'hoy'), 'Recibimos su foto, gracias. Arlen le responde hoy.');
});