/**
 * Webhook del contestador: recibe de Meta (directo o a través del intermediario),
 * guarda la conversación, le pregunta a Claude y responde por la Cloud API.
 */

var CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
var CLAUDE_VERSION = '2023-06-01';
var CLAUDE_BETAS = 'server-side-fallback-2026-07-01';
var HOJA_CONVERSACIONES = 'Conversaciones';
var HOJA_REGISTRO = 'Registro';
var COLUMNAS = ['fecha', 'ms', 'negocio', 'phone_number_id', 'cliente', 'nombre', 'rol', 'tipo', 'texto', 'wamid', 'nota'];

/** Verificación del webhook (Meta llama con hub.mode, hub.verify_token y hub.challenge). */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var token = prop_('VERIFY_TOKEN');
  if (p['hub.mode'] === 'subscribe' && token && p['hub.verify_token'] === token) {
    return ContentService.createTextOutput(String(p['hub.challenge'] || ''));
  }
  if (p.chat) return chatPrueba_(p.chat, p.negocio);
  return ContentService.createTextOutput('ARPA contestador');
}

/** Llegan los mensajes. Siempre devuelve "ok" (a Meta no le sirve un error). */
function doPost(e) {
  var config = leerConfig_();
  try {
    if (!relayValido_(e, config)) {
      registrar_('aviso', 'rechazado', 'POST sin RELAY_TOKEN válido');
      return ContentService.createTextOutput('ok');
    }
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var eventos = parsearWebhook_(payload);
    if (!eventos.length) return ContentService.createTextOutput('ok');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) {
      registrar_('error', 'lock', 'No se obtuvo el turno; Meta reintentará');
      return ContentService.createTextOutput('ok');
    }
    try {
      eventos.forEach(function (ev) {
        try {
          procesarEvento_(ev, config, Date.now());
        } catch (err) {
          registrar_('error', 'evento', String(err && err.stack || err));
        }
      });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    registrar_('error', 'doPost', String(err && err.stack || err));
  }
  return ContentService.createTextOutput('ok');
}

/** Con RELAY_TOKEN puesto, solo se aceptan mensajes que trae el intermediario. */
function relayValido_(e, config) {
  var dado = (e && e.parameter && e.parameter.relay_token) || '';
  if (config.relayToken) return dado === config.relayToken;
  return config.permitirSinRelay;
}

function negocioPorPhoneId_(phoneNumberId, config) {
  var claves = Object.keys(config.phoneIds);
  for (var i = 0; i < claves.length; i += 1) {
    if (config.phoneIds[claves[i]] && config.phoneIds[claves[i]] === String(phoneNumberId)) {
      return NEGOCIOS[claves[i]] || null;
    }
  }
  return null;
}

function procesarEvento_(ev, config, ahoraMs) {
  var negocio = negocioPorPhoneId_(ev.phoneNumberId, config);
  var hoja = hojaConversaciones_(config);
  var historial = negocio ? leerHistorial_(hoja, negocio.clave, ev.cliente) : [];
  var cache = CacheService.getScriptCache();
  var duplicado = !!(ev.wamid && (cache.get('w_' + ev.wamid) ||
    historial.some(function (f) { return f.wamid === ev.wamid; })));
  var plan = planificar_(ev, { negocio: negocio, config: config, historial: historial, ahoraMs: ahoraMs, duplicado: duplicado });

  if (plan.accion === 'ignorar') {
    if (plan.motivo !== 'duplicado') registrar_('info', plan.motivo, ev.phoneNumberId);
    return plan;
  }
  if (ev.wamid) cache.put('w_' + ev.wamid, '1', 21600);

  if (plan.accion === 'registrar_eco') {
    if (!negocio || duplicado) return plan;
    guardarFila_(hoja, negocio, ev.cliente, '', 'arlen', ev.msgTipo, ev.texto, ev.wamid, 'eco', ev.timestampMs || ahoraMs);
    return plan;
  }

  guardarFila_(hoja, negocio, ev.cliente, ev.nombre, 'cliente', ev.msgTipo, ev.texto, ev.wamid, plan.motivo, ev.timestampMs || ahoraMs);
  if (plan.accion === 'registrar') return plan;

  var horario = cuandoResponde_(ahoraMs, negocio.horario, config.festivosExtra);

  if (plan.accion === 'acuse') {
    var claveAcuse = 'ack_' + negocio.clave + '_' + ev.cliente;
    if (cache.get(claveAcuse)) return plan; // ya acusamos recibo hace poco (varias fotos seguidas)
    cache.put(claveAcuse, '1', CONTESTADOR_DEFAULTS.AVISO_MEDIA_MIN * 60);
    var acuse = textoAcuse_(negocio, ev.msgTipo, horario.cuando);
    entregar_(config, negocio, ev, acuse, plan.motivo, hoja, ahoraMs);
    avisarArlen_(config, negocio, ev, plan.motivo, historial, acuse, null, true);
    return plan;
  }

  // plan.accion === 'responder'
  var sistema = construirSistema_(negocio, {
    fecha: fechaLegible_(ahoraMs), enHorario: horario.enHorario, cuando: horario.cuando,
    nombre: ev.nombre, handoff: plan.handoff
  });
  var mensajes = construirMensajes_(historial.concat([{ rol: 'cliente', tipo: ev.msgTipo, texto: ev.texto }]),
    CONTESTADOR_DEFAULTS.HISTORIAL_MENSAJES);
  var claude = llamarClaude_(config, sistema, mensajes);
  var revision = revisarRespuesta_(negocio, claude.texto, plan, horario.cuando);
  var nota = [plan.motivo].concat(revision.motivos, claude.rechazo ? ['rechazo_claude'] : [], claude.error ? ['error_claude'] : []).join(',');
  entregar_(config, negocio, ev, revision.enviar, nota, hoja, ahoraMs);
  if (revision.handoff) {
    var urgente = plan.handoff === 'molesto' || revision.bloqueada;
    avisarArlen_(config, negocio, ev, nota, historial, revision.enviar, revision.bloqueada ? claude.texto : null, urgente);
  }
  return plan;
}

/** Envía al cliente (o, en modo borrador, le manda a Arlen el borrador) y lo guarda. */
function entregar_(config, negocio, ev, texto, nota, hoja, ahoraMs) {
  if (config.borrador) {
    enviarCorreo_(config, '[Borrador] ' + negocio.nombre + ' → ' + (ev.nombre || ev.cliente),
      'Mensaje del cliente:\n' + (ev.texto || '(' + ev.msgTipo + ')') +
      '\n\nRespuesta que se enviaría:\n' + texto + '\n\nResponder: https://wa.me/' + ev.cliente);
    guardarFila_(hoja, negocio, ev.cliente, '', 'sistema', 'borrador', texto, '', nota, ahoraMs);
    return;
  }
  var wamid = enviarWhatsApp_(config, negocio, ev.phoneNumberId, ev.cliente, texto);
  guardarFila_(hoja, negocio, ev.cliente, '', 'asistente', 'text', texto, wamid, nota + (wamid ? '' : ',envio_fallido'), ahoraMs);
}

function llamarClaude_(config, sistema, mensajes) {
  if (!config.claudeKey) {
    registrar_('error', 'claude', 'Falta CLAUDE_API_KEY');
    return { texto: '', rechazo: false, error: true };
  }
  var opciones = {
    method: 'post',
    contentType: 'application/json',
    headers: cabecerasClaude_(config),
    payload: JSON.stringify(cuerpoClaude_(config.modelo, sistema, mensajes)),
    muteHttpExceptions: true
  };
  for (var intento = 1; intento <= 2; intento += 1) {
    try {
      var r = UrlFetchApp.fetch(CLAUDE_URL, opciones);
      var codigo = r.getResponseCode();
      if (codigo === 200) return leerRespuestaClaude_(JSON.parse(r.getContentText()));
      registrar_('error', 'claude_' + codigo, r.getContentText().slice(0, 500));
      if (codigo !== 429 && codigo < 500) break;
    } catch (err) {
      registrar_('error', 'claude_red', String(err));
    }
    if (intento === 1) Utilities.sleep(2000);
  }
  return { texto: '', rechazo: false, error: true };
}

function enviarWhatsApp_(config, negocio, phoneNumberId, cliente, texto) {
  var token = metaToken_(negocio.clave);
  if (!token) {
    registrar_('error', 'meta', 'Falta META_TOKEN');
    return '';
  }
  var url = 'https://graph.facebook.com/' + config.metaVersion + '/' + phoneNumberId + '/messages';
  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
        messaging_product: 'whatsapp', recipient_type: 'individual', to: cliente,
        type: 'text', text: { preview_url: false, body: texto }
      }),
      muteHttpExceptions: true
    });
    var cuerpo = JSON.parse(r.getContentText() || '{}');
    if (r.getResponseCode() === 200 && cuerpo.messages && cuerpo.messages[0]) return cuerpo.messages[0].id;
    registrar_('error', 'meta_' + r.getResponseCode(), r.getContentText().slice(0, 500));
  } catch (err) {
    registrar_('error', 'meta_red', String(err));
  }
  return '';
}

/**
 * Correo a Arlen con el caso. Para no llenarle el buzón, un aviso por chat cada
 * AVISO_HANDOFF_HORAS, salvo si es urgente (cliente molesto o respuesta bloqueada).
 */
function avisarArlen_(config, negocio, ev, motivo, historial, respuesta, bloqueada, urgente) {
  var cache = CacheService.getScriptCache();
  var clave = 'aviso_' + negocio.clave + '_' + ev.cliente;
  if (!urgente && cache.get(clave)) return;
  cache.put(clave, '1', CONTESTADOR_DEFAULTS.AVISO_HANDOFF_HORAS * 3600);
  var ultimos = historial.slice(-8).map(function (f) {
    return '  ' + ({ cliente: 'Cliente', asistente: 'Asistente', arlen: 'Arlen', sistema: 'Sistema' }[f.rol] || f.rol) +
      ': ' + (f.texto || '(' + f.tipo + ')');
  });
  var cuerpo = [
    'Negocio: ' + negocio.nombre + ' (' + negocio.numeroVisible + ')',
    'Cliente: ' + (ev.nombre || '(sin nombre)') + ' — +' + ev.cliente,
    'Motivo: ' + motivo,
    'Responder por WhatsApp: https://wa.me/' + ev.cliente,
    '',
    'Último mensaje del cliente: ' + (ev.texto || '(' + ev.msgTipo + ')'),
    'Lo que respondió el asistente: ' + respuesta,
    bloqueada ? '\nOJO: la respuesta de Claude traía un precio no permitido y NO se envió. Decía:\n' + bloqueada : '',
    '',
    'Conversación reciente:',
    ultimos.join('\n') || '  (primer mensaje)',
    '',
    'Si usted le escribe desde su celular, el asistente se calla en ese chat por ' + config.silencioHoras + ' horas.'
  ].join('\n');
  enviarCorreo_(config, (urgente ? '[URGENTE] ' : '') + 'Pasar a Arlen: ' + (ev.nombre || '+' + ev.cliente) + ' (' + negocio.nombre + ')', cuerpo);
}

function enviarCorreo_(config, asunto, cuerpo) {
  if (!config.correoArlen) {
    registrar_('aviso', 'correo', 'Falta CORREO_ARLEN: ' + asunto);
    return;
  }
  try {
    MailApp.sendEmail({ to: config.correoArlen, subject: asunto, body: cuerpo });
  } catch (err) {
    registrar_('error', 'correo', String(err));
  }
}

/* ---------- Hoja propia del contestador ---------- */

function hojaConversaciones_(config) {
  if (!config.sheetId) throw new Error('Falta SHEET_ID_CONTESTADOR: corra configurar() una vez.');
  return SpreadsheetApp.openById(config.sheetId).getSheetByName(HOJA_CONVERSACIONES);
}

function guardarFila_(hoja, negocio, cliente, nombre, rol, tipo, texto, wamid, nota, ms) {
  hoja.appendRow([new Date(ms), ms, negocio.clave, '', cliente, nombre || '', rol, tipo || '', texto || '', wamid || '', nota || '']);
}

/** Últimas filas de ese chat (se leen como mucho las últimas 3000 filas de la hoja). */
function leerHistorial_(hoja, negocioClave, cliente) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var desde = Math.max(2, ultima - 2999);
  var valores = hoja.getRange(desde, 1, ultima - desde + 1, COLUMNAS.length).getValues();
  return valores.filter(function (f) {
    return f[2] === negocioClave && String(f[4]) === String(cliente);
  }).map(function (f) {
    return { ms: Number(f[1]), rol: f[6], tipo: f[7], texto: String(f[8] || ''), wamid: String(f[9] || '') };
  });
}

function registrar_(nivel, evento, detalle) {
  try {
    var id = prop_('SHEET_ID_CONTESTADOR');
    if (!id) { console.log(nivel, evento, detalle); return; }
    SpreadsheetApp.openById(id).getSheetByName(HOJA_REGISTRO)
      .appendRow([new Date(), nivel, evento, String(detalle || '').slice(0, 1000)]);
  } catch (err) {
    console.log('registro falló', nivel, evento, detalle, err);
  }
}

/** Cabeceras para la API de Claude; la beta de reintento solo va con los modelos que la tienen. */
function cabecerasClaude_(config) {
  var h = { 'x-api-key': config.claudeKey, 'anthropic-version': CLAUDE_VERSION };
  if (usaFallbacks_(config.modelo)) h['anthropic-beta'] = CLAUDE_BETAS;
  return h;
}
