#!/usr/bin/env node
/**
 * Ensayo sin conexión del contestador de WhatsApp de Automatismos ARPA.
 *
 *   node agente-whatsapp/ensayo/ensayo.mjs          → Claude y Meta simulados (no gasta nada)
 *   node agente-whatsapp/ensayo/ensayo.mjs --real   → Claude DE VERDAD (Meta sigue simulado).
 *        Requiere la variable de entorno ANTHROPIC_API_KEY (solo en su computador; no se guarda).
 *        Cuesta unos centavos de dólar por corrida.
 *
 * Verifica: tono de usted, que nunca salga un precio no permitido, que se dispare el
 * "pasar a Arlen", que se calle cuando Arlen escribe y con el interruptor apagado.
 */
import { crearEntorno, instalar, postear, texto, msgCliente, ecoArlen, estadoEntrega } from './simulador.mjs';

const REAL = process.argv.includes('--real');
if (REAL && !process.env.ANTHROPIC_API_KEY) {
  console.error('Modo --real: falta la variable de entorno ANTHROPIC_API_KEY.');
  process.exit(2);
}

const resultados = [];
const respuestas = [];
function chequear(escenario, nombre, ok, detalle) {
  resultados.push({ escenario, nombre, ok: !!ok, detalle: detalle || '' });
}

function nuevoEntorno() {
  const e = crearEntorno({ real: REAL, silencioso: true });
  instalar(e, REAL ? { CLAUDE_API_KEY: process.env.ANTHROPIC_API_KEY } : {});
  return e;
}

/** Cada mensaje enviado: usted, sin precios no permitidos, sin markdown. */
function chequearEnviados(escenario, e, desde) {
  const permitidos = e.gs.NEGOCIOS.automatismos.preciosPermitidos;
  e.estado.enviados.slice(desde).forEach((m) => {
    respuestas.push({ escenario, texto: m.texto });
    chequear(escenario, 'habla de usted', !e.gs.tieneTuteo_(m.texto), m.texto);
    const f = e.gs.filtrarPrecios_(m.texto, permitidos);
    chequear(escenario, 'sin precios no permitidos', f.ok, m.texto);
    chequear(escenario, 'sin markdown pesado', !/\*\*|^#/m.test(m.texto), m.texto);
  });
}

function hora(e, anio, mes, dia, h, min = 0) {
  e.estado.reloj = Date.UTC(anio, mes - 1, dia, h + 5, min); // hora de Colombia → UTC
}

const CLIENTE = '573001112233';
let e; let n;

// 1. Saludo, miércoles 3 p. m.
e = nuevoEntorno(); hora(e, 2026, 10, 21, 15);
postear(e, texto(e, CLIENTE, 'Carolina', 'Hola, buenas tardes'));
chequear('1 saludo', 'responde una vez', e.estado.enviados.length === 1, e.estado.enviados.map((m) => m.texto).join(' | '));
chequear('1 saludo', 'no molesta a Arlen', e.estado.correos.length === 0);
chequearEnviados('1 saludo', e, 0);

// 2. Precio de un motor corredizo (permitido, "desde").
n = e.estado.enviados.length;
postear(e, texto(e, CLIENTE, 'Carolina', '¿Cuánto vale un motor corredizo?'));
const r2 = (e.estado.enviados[n] || {}).texto || '';
chequear('2 motor corredizo', 'responde', e.estado.enviados.length === n + 1, r2);
chequear('2 motor corredizo', 'da el precio "desde" de la ficha', REAL ? true : /1\.099\.900/.test(r2), r2);
chequearEnviados('2 motor corredizo', e, n);

// 3. ¿Cuánto cobra por instalar? → nunca da precio, pasa a Arlen.
n = e.estado.enviados.length; let c = e.estado.correos.length;
postear(e, texto(e, CLIENTE, 'Carolina', '¿Y cuánto me cobra por instalarlo?'));
const r3 = (e.estado.enviados[n] || {}).texto || '';
chequear('3 precio de instalación', 'responde', e.estado.enviados.length === n + 1, r3);
chequear('3 precio de instalación', 'dice que pasa el caso a Arlen', /arlen/i.test(r3), r3);
chequear('3 precio de instalación', 'le llega el correo a Arlen', e.estado.correos.length === c + 1,
  (e.estado.correos[c] || {}).subject);
chequearEnviados('3 precio de instalación', e, n);
if (!REAL) {
  const filas = e.estado.libros[e.estado.props.SHEET_ID_CONTESTADOR].getSheetByName('Conversaciones').filas;
  chequear('3 precio de instalación', 'el "$350.000" inventado se bloqueó', filas.some((f) => /precio_no_permitido/.test(f[10])));
}

// 4. Fotos: dos seguidas → un solo acuse de recibo y aviso a Arlen.
e = nuevoEntorno(); hora(e, 2026, 10, 21, 10);
postear(e, msgCliente(e, CLIENTE, 'Jorge', { type: 'image', image: { id: 'media1', mime_type: 'image/jpeg' } }));
postear(e, msgCliente(e, CLIENTE, 'Jorge', { type: 'image', image: { id: 'media2', mime_type: 'image/jpeg', caption: '3 x 2 metros' } }));
chequear('4 fotos', 'un solo acuse de recibo', e.estado.enviados.length === 1, e.estado.enviados.map((m) => m.texto).join(' | '));
chequear('4 fotos', 'acusa recibo de la foto', /recibimos su foto/i.test((e.estado.enviados[0] || {}).texto), (e.estado.enviados[0] || {}).texto);
chequear('4 fotos', 'no llama a Claude para la foto', e.estado.llamadasClaude.length === 0);
chequear('4 fotos', 'avisa a Arlen', e.estado.correos.length >= 1);
chequearEnviados('4 fotos', e, 0);

// 5. Sábado 10 p. m.: quiere visita → pasa a Arlen para el lunes.
e = nuevoEntorno(); hora(e, 2026, 10, 24, 22);
postear(e, texto(e, CLIENTE, 'Luis', 'Buenas noches, necesito que vengan a mirar la puerta del garaje para poner motor'));
const r5 = (e.estado.enviados[0] || {}).texto || '';
chequear('5 sábado 10 p. m.', 'responde aunque es sábado de noche', e.estado.enviados.length === 1, r5);
chequear('5 sábado 10 p. m.', 'contexto: Arlen responde el lunes', /el lunes a primera hora/.test(JSON.stringify((e.estado.llamadasClaude[0] || {}).body || '')));
chequear('5 sábado 10 p. m.', 'pasa a Arlen', /arlen/i.test(r5) && e.estado.correos.length === 1, r5);
chequearEnviados('5 sábado 10 p. m.', e, 0);

// 6. Cliente molesto → disculpa, pasa a Arlen, correo URGENTE.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 11);
postear(e, texto(e, CLIENTE, 'Marta', 'Pésimo servicio, les escribí ayer y nadie me responde'));
const r6 = (e.estado.enviados[0] || {}).texto || '';
chequear('6 cliente molesto', 'responde', e.estado.enviados.length === 1, r6);
chequear('6 cliente molesto', 'correo urgente a Arlen', /URGENTE/.test((e.estado.correos[0] || {}).subject), (e.estado.correos[0] || {}).subject);
chequearEnviados('6 cliente molesto', e, 0);

// 7. Arlen escribe desde su celular → el asistente se calla 12 h en ESE chat.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
postear(e, ecoArlen(e, CLIENTE, 'Hola don Pedro, ya le mando la cotización'));
hora(e, 2026, 10, 22, 9, 30);
postear(e, texto(e, CLIENTE, 'Pedro', 'Listo, quedo atento'));
chequear('7 eco de Arlen', 'se calla en ese chat', e.estado.enviados.length === 0, e.estado.enviados.map((m) => m.texto).join(' | '));
postear(e, texto(e, '573004445566', 'Ana', 'Hola'));
chequear('7 eco de Arlen', 'sigue respondiendo en otros chats', e.estado.enviados.length === 1);
hora(e, 2026, 10, 22, 22);
postear(e, texto(e, CLIENTE, 'Pedro', 'Buenas noches, ¿me confirma?'));
chequear('7 eco de Arlen', 'vuelve a responder pasadas 12 h', e.estado.enviados.length === 2);

// 8. Interruptor apagado → guarda, no responde.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
e.gs.apagarAsistente();
postear(e, texto(e, CLIENTE, 'Pedro', 'Hola'));
const filas8 = e.estado.libros[e.estado.props.SHEET_ID_CONTESTADOR].getSheetByName('Conversaciones').filas;
chequear('8 interruptor apagado', 'no responde', e.estado.enviados.length === 0 && e.estado.llamadasClaude.length === 0);
chequear('8 interruptor apagado', 'pero guarda el mensaje', filas8.some((f) => f[8] === 'Hola' && /interruptor_apagado/.test(f[10])));

// 9. Meta reintenta el mismo mensaje → una sola respuesta.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
const repetido = texto(e, CLIENTE, 'Pedro', 'Hola');
postear(e, repetido); postear(e, repetido);
chequear('9 reintento de Meta', 'responde una sola vez', e.estado.enviados.length === 1);

// 10. Estados de entrega, número excluido y POST sin relay → no responde.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
e.estado.props.NUMEROS_EXCLUIDOS = '+57 300 999 8877';
postear(e, estadoEntrega(e));
postear(e, texto(e, '573009998877', 'Proveedor', 'Hola Arlen'));
postear(e, texto(e, CLIENTE, 'Desconocido', 'Hola'), false);
chequear('10 filtros', 'ignora estados, excluidos y POST sin relay', e.estado.enviados.length === 0 && e.estado.llamadasClaude.length === 0);

// 11. Modo borrador → no le escribe al cliente; le manda el borrador a Arlen.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
e.estado.props.MODO_BORRADOR = 'SI';
postear(e, texto(e, CLIENTE, 'Pedro', 'Hola'));
chequear('11 modo borrador', 'no envía al cliente', e.estado.enviados.length === 0);
chequear('11 modo borrador', 'manda el borrador a Arlen', /Borrador/.test((e.estado.correos[0] || {}).subject));

// 12. Petición a Claude bien armada.
e = nuevoEntorno(); hora(e, 2026, 10, 22, 9);
postear(e, texto(e, CLIENTE, 'Pedro', 'Hola'));
const ll = e.estado.llamadasClaude[0] || { headers: {}, body: {} };
chequear('12 llamada a Claude', 'cabeceras x-api-key y anthropic-version', ll.headers['x-api-key'] && ll.headers['anthropic-version'] === '2023-06-01');
chequear('12 llamada a Claude', 'modelo por defecto claude-sonnet-5-5', ll.body.model === 'claude-sonnet-5-5', ll.body.model);
chequear('12 llamada a Claude', 'sin temperature ni budget_tokens', !('temperature' in ll.body) && !('thinking' in ll.body));

// ---------- Informe ----------
const fallos = resultados.filter((r) => !r.ok);
let actual = '';
for (const r of resultados) {
  if (r.escenario !== actual) { actual = r.escenario; console.log('\n' + actual); }
  console.log('  ' + (r.ok ? 'OK   ' : 'FALLA') + ' ' + r.nombre + (r.ok ? '' : '  → ' + r.detalle));
}
console.log('\nModo: ' + (REAL ? 'REAL (Claude de verdad, Meta simulado)' : 'simulado'));
console.log((fallos.length ? 'FALLA' : 'OK') + ': ' + (resultados.length - fallos.length) + '/' + resultados.length + ' verificaciones.');
console.log('\nRespuestas que se enviaron al cliente:');
respuestas.forEach((r) => console.log('  [' + r.escenario + '] ' + r.texto.replace(/\n/g, ' / ')));
process.exit(fallos.length ? 1 : 0);
