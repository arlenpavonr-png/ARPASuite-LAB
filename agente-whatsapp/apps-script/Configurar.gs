/**
 * Funciones que Arlen corre a mano desde el editor de Apps Script (botón "Ejecutar").
 *   configurar()          → una sola vez: crea la hoja propia y los valores iniciales.
 *   revisarConfiguracion()→ dice qué falta.
 *   probarClaude()        → prueba la clave de Claude con una pregunta (no envía WhatsApp).
 *   encenderAsistente() / apagarAsistente() → el interruptor general.
 *   conectarCuentaWhatsApp() → una vez: conecta la cuenta de WhatsApp con la app de Meta.
 *   revisarNumeroWhatsApp()  → solo lectura: estado del número en Meta.
 */

function configurar() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID_CONTESTADOR');
  var libro = null;
  if (id) {
    try { libro = SpreadsheetApp.openById(id); } catch (err) { libro = null; }
  }
  if (!libro) {
    libro = SpreadsheetApp.create('ARPA - Contestador WhatsApp (conversaciones)');
    props.setProperty('SHEET_ID_CONTESTADOR', libro.getId());
  }
  prepararHoja_(libro, HOJA_CONVERSACIONES, COLUMNAS);
  prepararHoja_(libro, HOJA_REGISTRO, ['fecha', 'nivel', 'evento', 'detalle']);
  var hoja1 = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (hoja1 && libro.getSheets().length > 2) libro.deleteSheet(hoja1);

  // Valores iniciales seguros: apagado y en borrador hasta que Arlen lo pruebe.
  var iniciales = {
    ASISTENTE_ACTIVO: 'NO',
    MODO_BORRADOR: 'SI',
    PERMITIR_SIN_RELAY: 'NO',
    SILENCIO_HORAS: String(CONTESTADOR_DEFAULTS.SILENCIO_HORAS),
    CLAUDE_MODELO: CONTESTADOR_DEFAULTS.CLAUDE_MODELO,
    VERIFY_TOKEN: Utilities.getUuid().replace(/-/g, ''),
    RELAY_TOKEN: Utilities.getUuid().replace(/-/g, '')
  };
  Object.keys(iniciales).forEach(function (k) {
    if (!props.getProperty(k)) props.setProperty(k, iniciales[k]);
  });
  console.log('Listo. Hoja del contestador: ' + libro.getUrl());
  revisarConfiguracion();
}

function prepararHoja_(libro, nombre, encabezados) {
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(encabezados);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function revisarConfiguracion() {
  var obligatorias = ['CLAUDE_API_KEY', 'META_TOKEN', 'VERIFY_TOKEN', 'CORREO_ARLEN', 'PHONE_ID_AUTOMATISMOS', 'SHEET_ID_CONTESTADOR'];
  var faltan = obligatorias.filter(function (k) { return !prop_(k); });
  var c = leerConfig_();
  if (!c.relayToken && !c.permitirSinRelay) faltan.push('RELAY_TOKEN (o PERMITIR_SIN_RELAY=SI)');
  console.log(faltan.length ? 'Faltan: ' + faltan.join(', ') : 'Todas las claves están puestas.');
  console.log('Asistente activo: ' + (c.activo ? 'SI' : 'NO') + ' · Modo borrador: ' + (c.borrador ? 'SI' : 'NO') +
    ' · Modelo: ' + c.modelo + ' · Silencio tras Arlen: ' + c.silencioHoras + ' h');
  return faltan;
}

function probarClaude() {
  var c = leerConfig_();
  var ahora = Date.now();
  var h = cuandoResponde_(ahora, NEGOCIOS.automatismos.horario, c.festivosExtra);
  var sistema = construirSistema_(NEGOCIOS.automatismos, { fecha: fechaLegible_(ahora), enHorario: h.enHorario, cuando: h.cuando });
  var r = llamarClaude_(c, sistema, [{ role: 'user', content: 'Buenas, ¿cuánto vale un motor para puerta corrediza?' }]);
  var rev = revisarRespuesta_(NEGOCIOS.automatismos, r.texto, {}, h.cuando);
  console.log('Claude respondió: ' + (r.texto || '(nada: revise la hoja Registro)'));
  console.log('Se enviaría: ' + rev.enviar);
}

function encenderAsistente() {
  PropertiesService.getScriptProperties().setProperty('ASISTENTE_ACTIVO', 'SI');
  console.log('Asistente ENCENDIDO.');
}

function apagarAsistente() {
  PropertiesService.getScriptProperties().setProperty('ASISTENTE_ACTIVO', 'NO');
  console.log('Asistente APAGADO: guarda los mensajes pero no responde a nadie.');
}

/**
 * Una sola vez, después de poner META_TOKEN: le dice a la cuenta de WhatsApp de Automatismos
 * que le pase los mensajes a la app de Meta (sin esto el webhook no recibe nada).
 * Prueba los identificadores de cuenta conocidos y deja suscrita la que responde.
 * No muestra el token.
 */
function conectarCuentaWhatsApp() {
  var token = metaToken_('automatismos');
  if (!token) { console.log('Falta META_TOKEN.'); return; }
  var version = leerConfig_().metaVersion;
  var cuentas = String(prop_('WABA_IDS') || '244264513764691,1604859234622379').split(',');
  var auth = { Authorization: 'Bearer ' + token };
  cuentas.forEach(function (id) {
    id = id.trim();
    if (!id) return;
    var base = 'https://graph.facebook.com/' + version + '/' + id + '/subscribed_apps';
    var post = UrlFetchApp.fetch(base, { method: 'post', headers: auth, muteHttpExceptions: true });
    var get = UrlFetchApp.fetch(base, { method: 'get', headers: auth, muteHttpExceptions: true });
    console.log('Cuenta ' + id + ': suscribir → ' + post.getResponseCode() + ' ' + post.getContentText().slice(0, 200) +
      ' | apps suscritas → ' + get.getContentText().slice(0, 300));
  });
}

/** Solo lectura: le pregunta a Meta el estado del número de Automatismos (no cambia nada, no muestra el token). */
function revisarNumeroWhatsApp() {
  var token = metaToken_('automatismos');
  var phoneId = prop_('PHONE_ID_AUTOMATISMOS');
  if (!token || !phoneId) { console.log('Falta META_TOKEN o PHONE_ID_AUTOMATISMOS.'); return; }
  var version = leerConfig_().metaVersion;
  var campos = 'display_phone_number,verified_name,status,platform_type,code_verification_status,quality_rating,name_status,is_on_biz_app,messaging_limit_tier,throughput';
  var r = UrlFetchApp.fetch('https://graph.facebook.com/' + version + '/' + phoneId + '?fields=' + campos,
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  console.log('Número → ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 600));
}

/**
 * Solo para el video de la revisión de Meta: manda UN mensaje de texto desde el número 315 187 8378
 * (cuenta "Automatismos Arpa Motores Para Puertas") al celular de Arlen. Arlen debe escribirle primero
 * a ese número desde su celular (abre la ventana de 24 horas). No muestra el token.
 */
function enviarMensajeRevision() {
  var token = metaToken_('automatismos');
  var phoneId = prop_('PHONE_ID_REVISION') || '752775974586548';
  var destino = prop_('DESTINO_REVISION') || '573003208557';
  var version = leerConfig_().metaVersion;
  // La app tiene que estar suscrita a la cuenta del 315 para poder enviar desde ella.
  var waba = prop_('WABA_REVISION') || '2562892354065147';
  var sub = UrlFetchApp.fetch('https://graph.facebook.com/' + version + '/' + waba + '/subscribed_apps',
    { method: 'post', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  console.log('Suscribir app a la cuenta ' + waba + ' → ' + sub.getResponseCode() + ' ' + sub.getContentText().slice(0, 200));
  var r = UrlFetchApp.fetch('https://graph.facebook.com/' + version + '/' + phoneId + '/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: destino, type: 'text',
      text: { preview_url: false, body: 'Hola, le escribimos de Automatismos ARPA. Este es un mensaje de prueba enviado desde nuestra app con la API de WhatsApp.' }
    })
  });
  console.log('Enviar → ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}
