/**
 * ARPA Suite — Aviso automático de mantenimiento por WhatsApp (WhatsApp Business Cloud API de Meta)
 *
 * Va como ARCHIVO APARTE en el mismo proyecto de Apps Script que Code.gs
 * (Archivos → + → Secuencia de comandos → nombre "WhatsApp"). Usa de Code.gs:
 * getLicenseSheet_, getFounderCode_, normalizePhoneForWaMe_ y deleteRowsForLicencia_.
 * Code.gs solo necesita la línea que enruta la acción 'mantenimientossync' en handleSyncPost_.
 *
 * Cómo funciona
 * - La suite manda su lista de "Mantenimientos por hacer" (acción mantenimientossync) cuando cambia.
 *   Solo se guarda para las licencias habilitadas (por defecto, solo la de fundador).
 * - Un disparador diario (8 a. m. hora de Colombia) manda la plantilla de WhatsApp al cliente
 *   7 días antes de que se cumplan los 6 meses. Un solo mensaje por cliente y fecha base.
 * - Lo que ya se avisó a mano desde la suite (botón WhatsApp) no se vuelve a mandar.
 * - Pestaña "Mantenimientos" del Sheet: una fila por cliente, con lo enviado y los errores.
 *
 * Script Properties (Configuración del proyecto → Propiedades de la secuencia de comandos)
 *   WA_TOKEN          token permanente del usuario del sistema de Meta (NUNCA en el código)
 *   WA_PHONE_ID       "Identificador del número de teléfono" en WhatsApp → Configuración de la API
 *   WA_ACTIVO         SI = enviar de verdad. Cualquier otro valor = modo prueba (solo anota en la hoja)
 *   WA_PLANTILLA      opcional, por defecto recordatorio_mantenimiento
 *   WA_IDIOMA         opcional, por defecto es_CO (el mismo idioma con que se creó la plantilla)
 *   WA_TELEFONO_PRUEBA  opcional, celular para probarWhatsAppMantenimiento()
 *   WA_LICENCIAS      opcional, licencias habilitadas separadas por coma (por defecto: FOUNDER_CODE)
 *
 * Plantilla en Meta (categoría Utilidad, idioma Español (COL)), nombre recordatorio_mantenimiento:
 *   Hola {{1}}, le escribe {{2}}. Ya se cumplen 6 meses desde {{3}} del {{4}} y le corresponde
 *   el mantenimiento preventivo de su equipo. ¿Qué día le queda bien que pasemos? Responda este
 *   mensaje para agendar.
 *   {{1}} nombre del cliente · {{2}} su empresa · {{3}} "la instalación" o "el último mantenimiento"
 *   {{4}} fecha dd/mm/aaaa
 */

const WA_HOJA_ = 'Mantenimientos';
const WA_HEADERS_ = ['Licencia', 'Clave', 'Cliente', 'Telefono', 'Base', 'Tipo', 'Vence', 'Estado', 'AvisadoEl', 'Resultado', 'Actualizado'];
const WA_DIAS_ANTES_ = 7;
const WA_DIAS_VENCIDO_MAX_ = 30;
const WA_MAX_POR_DIA_ = 40;
const WA_MAX_ITEMS_ = 2000;
const WA_TZ_ = 'America/Bogota';

function waProp_(nombre, porDefecto) {
  const v = PropertiesService.getScriptProperties().getProperty(nombre);
  return v == null || String(v).trim() === '' ? porDefecto : String(v).trim();
}

function waLicenciaHabilitada_(licencia) {
  const lic = String(licencia || '').trim().toUpperCase();
  if (!lic) return false;
  const lista = waProp_('WA_LICENCIAS', getFounderCode_())
    .split(',').map(function (s) { return s.trim().toUpperCase(); }).filter(String);
  return lista.indexOf(lic) >= 0;
}

function waEnvioReal_() {
  return waProp_('WA_ACTIVO', '').toUpperCase() === 'SI' && !!waProp_('WA_TOKEN', '') && !!waProp_('WA_PHONE_ID', '');
}

function waHoy_() {
  return Utilities.formatDate(new Date(), WA_TZ_, 'yyyy-MM-dd');
}

function waIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, WA_TZ_, 'yyyy-MM-dd');
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function waDias_(desde, hasta) {
  return Math.round((new Date(hasta + 'T12:00:00Z') - new Date(desde + 'T12:00:00Z')) / 86400000);
}

function waFmt_(iso) {
  return iso ? iso.split('-').reverse().join('/') : '';
}

function waHoja_() {
  const ss = getLicenseSheet_().getParent();
  let sheet = ss.getSheetByName(WA_HOJA_);
  if (!sheet) {
    sheet = ss.insertSheet(WA_HOJA_);
    sheet.getRange(1, 1, 1, WA_HEADERS_.length).setValues([WA_HEADERS_]);
    sheet.setFrozenRows(1);
    // Texto plano: que el Sheet no convierta fechas ni teléfonos.
    sheet.getRange('A:K').setNumberFormat('@');
  }
  return sheet;
}

function waLimpiar_(s, max) {
  return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 120);
}

/**
 * La suite manda su lista de mantenimientos pendientes. Reemplaza las filas de la licencia,
 * conservando lo que el servidor ya avisó para la misma clave y fecha base.
 * Devuelve los avisos hechos por el servidor para que la suite los muestre.
 */
function mantenimientosSync_(licencia, body) {
  if (!waLicenciaHabilitada_(licencia)) return { ok: true, activo: false };
  const items = Array.isArray(body.items) ? body.items.slice(0, WA_MAX_ITEMS_) : [];
  const empresa = waLimpiar_(body.empresa, 80);
  if (empresa) PropertiesService.getScriptProperties().setProperty('WA_EMPRESA', empresa);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = waHoja_();
    const values = sheet.getDataRange().getValues();
    const previos = {};
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() !== licencia) continue;
      previos[values[i][1] + '|' + waIso_(values[i][4])] = { avisadoEl: waIso_(values[i][8]), resultado: String(values[i][9] || '') };
    }
    deleteRowsForLicencia_(sheet, licencia);

    const ahora = new Date().toISOString();
    const filas = [];
    const avisados = {};
    items.forEach(function (it) {
      const clave = waLimpiar_(it && it.clave, 120).toLowerCase();
      const base = waIso_(it && it.base);
      const vence = waIso_(it && it.vence);
      if (!clave || !base || !vence) return;
      const prev = previos[clave + '|' + base] || {};
      const avisadoCliente = waIso_(it.avisadoEl);
      const avisadoServidor = prev.avisadoEl || '';
      if (avisadoServidor && !avisadoCliente) avisados[clave] = { base: base, avisadoEl: avisadoServidor };
      filas.push([
        licencia,
        clave,
        waLimpiar_(it.cliente, 120),
        waLimpiar_(it.tel, 30),
        base,
        waLimpiar_(it.tipo, 40),
        vence,
        it.estado === 'pospuesto' ? 'pospuesto' : 'pendiente',
        avisadoServidor || avisadoCliente,
        avisadoServidor ? prev.resultado : (avisadoCliente ? 'avisado a mano desde la suite' : prev.resultado || ''),
        ahora,
      ]);
    });
    if (filas.length) sheet.getRange(sheet.getLastRow() + 1, 1, filas.length, WA_HEADERS_.length).setValues(filas);
    return { ok: true, activo: true, envioReal: waEnvioReal_(), diasAntes: WA_DIAS_ANTES_, avisados: avisados };
  } finally {
    lock.releaseLock();
  }
}

/** Parámetros de la plantilla, en el orden {{1}}..{{4}}. */
function waParametros_(cliente, empresa, tipo, base) {
  const nombre = String(cliente || '').trim().split(/\s+/)[0] || 'cliente';
  const desde = /instalaci/i.test(String(tipo || '')) ? 'la instalación' : 'el último mantenimiento';
  return [nombre, empresa || CONFIG.EMAIL_FROM_NAME, desde, waFmt_(base)];
}

/** Manda la plantilla. Devuelve { ok, id } o { ok:false, error }. */
function waEnviarPlantilla_(telefono, parametros) {
  const url = 'https://graph.facebook.com/' + waProp_('WA_API_VERSION', 'v23.0') + '/' + waProp_('WA_PHONE_ID', '') + '/messages';
  const payload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'template',
    template: {
      name: waProp_('WA_PLANTILLA', 'recordatorio_mantenimiento'),
      language: { code: waProp_('WA_IDIOMA', 'es_CO') },
      components: [{
        type: 'body',
        parameters: parametros.map(function (p) { return { type: 'text', text: String(p).slice(0, 60) }; }),
      }],
    },
  };
  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + waProp_('WA_TOKEN', '') },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    let data = {};
    try { data = JSON.parse(res.getContentText()); } catch (e) { data = {}; }
    if (code >= 200 && code < 300 && data.messages && data.messages[0]) return { ok: true, id: data.messages[0].id };
    const err = data.error || {};
    return { ok: false, error: 'HTTP ' + code + (err.code ? ' (' + err.code + ')' : '') + ': ' + String(err.message || res.getContentText()).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e).slice(0, 200) };
  }
}

/**
 * Disparador diario. Avisa a los clientes cuyo mantenimiento vence en 7 días o menos
 * (o venció hace menos de 30 días) y que todavía no han sido avisados.
 */
function avisarMantenimientosDiario() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = waHoja_();
    const values = sheet.getDataRange().getValues();
    const hoy = waHoy_();
    const real = waEnvioReal_();
    const empresa = waProp_('WA_EMPRESA', '');
    const resumen = [];
    let enviados = 0;
    for (let i = 1; i < values.length && enviados < WA_MAX_POR_DIA_; i++) {
      const fila = values[i];
      const licencia = String(fila[0] || '').trim().toUpperCase();
      if (!waLicenciaHabilitada_(licencia) || waIso_(fila[8])) continue;
      const vence = waIso_(fila[6]);
      if (!vence) continue;
      const dias = waDias_(hoy, vence);
      if (dias > WA_DIAS_ANTES_ || dias < -WA_DIAS_VENCIDO_MAX_) continue;
      const cliente = String(fila[2] || '');
      const tel = normalizePhoneForWaMe_(fila[3]);
      let resultado;
      let avisadoEl = '';
      if (tel.length < 11) {
        resultado = 'sin teléfono válido';
      } else if (!real) {
        resultado = 'modo prueba ' + hoy + ': no enviado (WA_ACTIVO no es SI)';
      } else {
        const r = waEnviarPlantilla_(tel, waParametros_(cliente, empresa, fila[5], waIso_(fila[4])));
        if (r.ok) {
          avisadoEl = hoy;
          resultado = 'enviado ' + hoy + ' ' + r.id;
          enviados++;
        } else {
          resultado = 'error ' + hoy + ': ' + r.error;
        }
      }
      if (resultado === String(fila[9] || '')) continue;
      sheet.getRange(i + 1, 9, 1, 3).setValues([[avisadoEl, resultado, new Date().toISOString()]]);
      resumen.push(cliente + ' (' + waFmt_(vence) + '): ' + resultado);
    }
    if (resumen.length) {
      MailApp.sendEmail({
        to: Session.getEffectiveUser().getEmail(),
        subject: 'ARPA · Avisos de mantenimiento por WhatsApp (' + waFmt_(hoy) + ')',
        body: (real ? '' : 'MODO PRUEBA: no se envió nada. Pon WA_ACTIVO = SI para enviar.\n\n') + resumen.join('\n'),
      });
    }
    return resumen;
  } finally {
    lock.releaseLock();
  }
}

/** Ejecutar UNA vez desde el editor: crea el disparador diario de las 8 a. m. (hora de Colombia). */
function instalarAvisoWhatsApp() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'avisarMantenimientosDiario') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('avisarMantenimientosDiario').timeBased().everyDays(1).atHour(8).inTimezone(WA_TZ_).create();
  waHoja_();
  Logger.log('Listo: aviso diario a las 8 a. m. Envío real: ' + (waEnvioReal_() ? 'SÍ' : 'NO (modo prueba)'));
}

/** Ejecutar desde el editor: manda la plantilla con datos de ejemplo a WA_TELEFONO_PRUEBA. */
function probarWhatsAppMantenimiento() {
  const tel = normalizePhoneForWaMe_(waProp_('WA_TELEFONO_PRUEBA', ''));
  if (!tel) throw new Error('Falta WA_TELEFONO_PRUEBA en las propiedades del script.');
  if (!waProp_('WA_TOKEN', '') || !waProp_('WA_PHONE_ID', '')) throw new Error('Faltan WA_TOKEN o WA_PHONE_ID.');
  const r = waEnviarPlantilla_(tel, waParametros_('Arlen Prueba', waProp_('WA_EMPRESA', ''), 'Instalación', '2026-04-09'));
  Logger.log(JSON.stringify(r));
  return r;
}
