/**

 * ARPA Suite — Licencias (doGet) + Gumroad Ping (doPost) + email automático

 *

 * DESPLIEGUE

 * 1. Abre el Sheet → Extensiones → Apps Script → pega este archivo como Code.gs

 * 2. Ajusta CONFIG.SHEET_NAME si tu pestaña no se llama "Hoja 1"

 * 3. Agrega columna DEVICE_ID en fila 1 (o se crea sola al primer trial auto)

 * 4. Project Settings → Script Properties:

 *      GUMROAD_SELLER_ID     = (seller_id del primer Ping real)

 *      GUMROAD_PRODUCT_FREE  = product_id del plan gratis

 *      GUMROAD_PRODUCT_PRO   = product_id del plan Pro

 *      GUMROAD_PRODUCT_PYME  = product_id del plan PYME

 * 5. Deploy → Web app → Execute as: Me → Anyone → copia URL /exec

 * 6. Gumroad → Settings → Advanced → Ping → pega la URL

 *

 * COLUMNAS Sheet (fila 1): CODIGO | PLAN | CLIENTE | EMAIL | VENCIMIENTO | ACTIVO | DEVICE_ID
 *
 * Prefijos: ARPA-FREE- | ARPA-PRO- | ARPA-PYME- | ARPA-WL- | código fundador: en Script Properties → FOUNDER_CODE (NUNCA en el código)

 *

 * GET endpoints (JSONP):

 *   ?codigo=ARPA-FREE-0001&callback=fn          → validar licencia

 *   ?accion=provision_trial&device_id=UUID&callback=fn → trial auto 7 días
 *
 *   ?accion=saveCompanyData&licencia=...&nombreEmpresa=...&nit=...&direccion=...&ciudad=...&telefono=...&sitioWeb=...&logoBase64=...&banco=...&tipoCuenta=...&numeroCuenta=...&titularCuenta=...&documentoTitular=...&nombreTecnico=...&documentoTecnico=...&codigoTecnico=...&callback=fn
 *   ?accion=getCompanyData&licencia=...&callback=fn
 *
 * POST endpoints (JSON body, Content-Type: text/plain;charset=utf-8):
 *   { accion: 'saveCompanyData', licencia, nombreEmpresa, nit, ... logoBase64 }
 *   { accion: 'savecatalogo', licencia, productos: [...] }
 *   { accion: 'getcatalogo', licencia }
 *   { accion: 'savehistorialentry', licencia, entrada: {...} }
 *   { accion: 'deletehistorialentry', licencia, entradaId }
 *   { accion: 'gethistorial', licencia }
 *   { accion: 'registerTrialUser', nombre, oficio, telefono, fechaInicio, trialId }
 *   { accion: 'siguientenumero', licencia, tipo: 'formato'|'cot'|'cc', clienteUltimo }
 *
 * Pestaña Numeracion: Licencia | Tipo | UltimoNumero

 *

 * Pestaña Trials: Nombre | Oficio | Telefono | FechaInicio | FechaVencimiento | TrialId | Notificado | Convertido | Secuencia | Detener | Pais

 *   Secuencia, Detener y Pais se agregan solas al final si faltan. Trigger diario 8-9 a. m. → revisarSecuenciaPruebas

 *   (o el trigger viejo revisarTrialsDia6, que ahora llama a la misma función).

 *

 * Pestaña VentasManuales (pagos por Nequi / llave Bre-B): Fecha | Nombre | Email | Telefono | Plan | MontoCOP | Medio | Referencia | Codigo | Estado

 *   Menú del Sheet ARPA → "Crear licencias de pagos manuales" (procesarVentasManuales). Se crea sola si falta.
 *
 */

const CONFIG = {

  SHEET_ID: '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',

  SHEET_NAME: 'Hoja 1',

  APP_URL: 'https://arlenpavonr-png.github.io/Formato-Arlenpav/',

  MANUAL_URL: 'https://arlenpavonr-png.github.io/Formato-Arlenpav/manual.html',

  SUPPORT_WHATSAPP: '573016092542',

  SUPPORT_WHATSAPP_DISPLAY: '+57 301-609-2542',

  EMAIL_FROM_NAME: 'ARPA Technology Global',

  PLANS: {

    FREE: { prefix: 'ARPA-FREE-', planLabel: 'Free', days: 7 },

    PRO:  { prefix: 'ARPA-PRO-',  planLabel: 'Pro',  days: 365 },

    PYME: { prefix: 'ARPA-PYME-', planLabel: 'PYME', days: 365 },

    WL:   { prefix: 'ARPA-WL-',   planLabel: 'White Label', days: 365 },

  },

  /** Licencia fundador — nunca expira, exenta de bloqueos. */
  // FOUNDER_CODE se lee de Script Properties (ver getFounderCode_). No escribirlo aquí.

  EMPRESAS_SHEET_NAME: 'Empresas',

  CATALOGO_SHEET_NAME: 'Catalogo',

  HISTORIAL_SHEET_NAME: 'Historial',

  TRIALS_SHEET_NAME: 'Trials',

  TRIAL_NOTIFY_EMAIL: 'support@arpatechnologyglobal.com',

  /** Link Gumroad plan Técnico Independiente ($83 USD) — actualizar si cambia */
  TRIAL_UPGRADE_GUMROAD_URL: 'https://arpatech.gumroad.com/l/arpa-suite-tecnico',

};



// ─── GET: validación + trial automático (PWA JSONP) ─────────────────────────



function doGet(e) {

  const params = e && e.parameter ? e.parameter : {};

  const callback = params.callback;

  const accion = String(params.accion || '').trim().toLowerCase();



  if (accion === 'provision_trial') {

    const deviceId = String(params.device_id || '').trim();

    return respondJsonp_(provisionTrial_(deviceId), callback);

  }

  if (accion === 'savecompanydata') {

    return respondJsonp_(saveCompanyData_(params), callback);

  }

  if (accion === 'getcompanydata') {

    return respondJsonp_(getCompanyData_(params), callback);

  }



  const codigo = String(params.codigo || '').trim().toUpperCase();

  const deviceId = String(params.device_id || '').trim();

  return respondJsonp_(validateLicense_(codigo, deviceId), callback);

}



function validateLicense_(codigo, deviceId) {

  if (!codigo) {

    return { valido: false, mensaje: 'Código requerido.' };

  }



  const sheet = getLicenseSheet_();

  const data = sheet.getDataRange().getValues();

  const headers = normalizeHeaders_(data[0]);

  const cols = getColumnMap_(headers);



  if (cols.codigo < 0) {

    return { valido: false, mensaje: 'Error de configuración del Sheet.' };

  }



  for (let i = 1; i < data.length; i++) {

    const rowCodigo = String(data[i][cols.codigo] || '').trim().toUpperCase();

    if (rowCodigo !== codigo) continue;

    const planLabel = cols.plan >= 0 ? String(data[i][cols.plan] || '') : '';

    const deviceCheck = checkAndRegisterDevice_(rowCodigo, planLabel, deviceId);

    if (!deviceCheck.ok) {

      return { valido: false, mensaje: deviceCheck.mensaje, codigo: rowCodigo };

    }

    return buildValidationResult_(data[i], cols, rowCodigo);

  }



  return { valido: false, mensaje: 'Código de licencia inválido.' };

}



function provisionTrial_(deviceId) {

  deviceId = String(deviceId || '').trim();

  if (!deviceId || deviceId.length < 12) {

    return { valido: false, mensaje: 'Dispositivo inválido.' };

  }



  const sheet = getLicenseSheet_();

  ensureDeviceIdColumn_(sheet);

  const data = sheet.getDataRange().getValues();

  const headers = normalizeHeaders_(data[0]);

  const cols = getColumnMap_(headers);



  for (let i = 1; i < data.length; i++) {

    if (cols.deviceId < 0) break;

    const rowDevice = String(data[i][cols.deviceId] || '').trim();

    if (rowDevice !== deviceId) continue;



    const codigo = String(data[i][cols.codigo] || '').trim().toUpperCase();

    const result = buildValidationResult_(data[i], cols, codigo);

    result.trial = true;

    result.nuevo = false;

    return result;

  }



  const plan = CONFIG.PLANS.FREE;

  const codigo = generateCode_(plan.prefix);

  const vencimiento = addDays_(new Date(), plan.days);



  appendLicenseRow_({

    CODIGO: codigo,

    PLAN: plan.planLabel,

    CLIENTE: 'Trial automático',

    EMAIL: '',

    VENCIMIENTO: vencimiento,

    ACTIVO: 'SI',

    DEVICE_ID: deviceId,

  });



  return {

    valido: true,

    mensaje: 'Trial activado.',

    codigo: codigo,

    plan: plan.planLabel,

    vencimiento: formatDateIso_(vencimiento),

    trial: true,

    nuevo: true,

  };

}



function buildValidationResult_(row, cols, codigo) {

  const activo = cols.activo >= 0

    ? String(row[cols.activo] || '').trim().toUpperCase()

    : 'SI';



  if (activo !== 'SI' && activo !== 'SÍ') {

    return { valido: false, mensaje: 'Licencia inactiva.', codigo: codigo };

  }



  let vencStr = '';

  const permanent = isPermanentLicense_(codigo);

  if (!permanent && cols.venc >= 0) {

    const venc = row[cols.venc];

    if (venc instanceof Date && !isNaN(venc.getTime())) {

      vencStr = formatDateIso_(venc);

      if (stripTime_(venc) < stripTime_(new Date())) {

        const plan = cols.plan >= 0 ? String(row[cols.plan] || '') : '';

        const isTrial = String(codigo || '').indexOf('ARPA-FREE-') === 0;

        if (isTrial) {

          return {

            valido: false,

            mensaje: 'Período de prueba vencido.',

            codigo: codigo,

            plan: plan,

            vencimiento: vencStr,

            trial_usado: true,

            vencida: true,

          };

        }

        // Licencia paga: el vencimiento es solo del PMA (soporte/actualizaciones).
        // La licencia es perpetua — el uso de la app NUNCA se bloquea por esto.

        return {

          valido: true,

          mensaje: 'Licencia válida. Mantenimiento (PMA) vencido.',

          codigo: codigo,

          plan: plan,

          vencimiento: vencStr,

          pma_vencido: true,

          founder: codigo === getFounderCode_(),

          white_label: String(codigo || '').indexOf('ARPA-WL-') === 0,

        };

      }

    }

  }



  const plan = cols.plan >= 0 ? String(row[cols.plan] || '') : '';

  return {

    valido: true,

    mensaje: 'Licencia válida.',

    codigo: codigo,

    plan: plan,

    vencimiento: permanent ? '' : vencStr,

    founder: codigo === getFounderCode_(),

    white_label: String(codigo || '').indexOf('ARPA-WL-') === 0,

  };

}



/** Código fundador guardado en Project Settings → Script Properties → FOUNDER_CODE. */
function getFounderCode_() {
  const v = PropertiesService.getScriptProperties().getProperty('FOUNDER_CODE');
  const c = String(v || '').trim().toUpperCase();
  return c || '__SIN_FOUNDER_CONFIGURADO__';
}

function isPermanentLicense_(codigo) {

  const c = String(codigo || '').trim().toUpperCase();

  return c === getFounderCode_();

}



/** Ejecutar una vez en Apps Script para registrar el código founder en el Sheet. */
function seedFounderLicense() {

  const codigo = getFounderCode_();

  const sheet = getLicenseSheet_();

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0] || '').trim().toUpperCase() === codigo) {

      Logger.log('Founder license already in sheet: ' + codigo);

      return;

    }

  }

  appendLicenseRow_({

    CODIGO: codigo,

    PLAN: 'Founder',

    CLIENTE: 'Fundador ARPA',

    EMAIL: '',

    VENCIMIENTO: new Date(2099, 11, 31),

    ACTIVO: 'SI',

    DEVICE_ID: '',

  });

  Logger.log('Founder license seeded: ' + codigo);

}



function getColumnMap_(headers) {

  return {

    codigo: headers.indexOf('CODIGO'),

    plan: headers.indexOf('PLAN'),

    activo: headers.indexOf('ACTIVO'),

    venc: headers.indexOf('VENCIMIENTO'),

    deviceId: headers.indexOf('DEVICE_ID'),

  };

}



function ensureDeviceIdColumn_(sheet) {

  const headers = normalizeHeaders_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);

  if (headers.indexOf('DEVICE_ID') >= 0) return;

  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('DEVICE_ID');

}



function appendLicenseRow_(valuesByHeader) {

  const sheet = getLicenseSheet_();

  ensureDeviceIdColumn_(sheet);

  const data = sheet.getDataRange().getValues();

  const headers = normalizeHeaders_(data[0]);

  const row = headers.map(function (h) {

    return valuesByHeader[h] != null ? valuesByHeader[h] : '';

  });

  sheet.appendRow(row);

}



// ─── POST: Gumroad Ping ──────────────────────────────────────────────────────



function doPost(e) {

  try {

    const syncResponse = handleSyncPost_(e);

    if (syncResponse) return syncResponse;



    const payload = parseGumroadPayload_(e);

    if (!payload) return textResponse_('Bad payload', 400);

    debugLog_('payload_recibido', payload);



    if (payload.resource_name && payload.resource_name !== 'sale') {

      return textResponse_('Ignored: ' + payload.resource_name, 200);

    }

    if (String(payload.refunded || '').toLowerCase() === 'true') {

      return textResponse_('Ignored: refunded', 200);

    }



    const props = PropertiesService.getScriptProperties();

    const expectedSeller = props.getProperty('GUMROAD_SELLER_ID');

    if (expectedSeller && payload.seller_id !== expectedSeller) {

      debugLog_('seller_invalido', { recibido: payload.seller_id, esperado: expectedSeller });
      return textResponse_('Invalid seller', 403);

    }



    const plan = resolvePlanFromPayload_(payload);

    if (!plan) {

      debugLog_('producto_desconocido', { product_id: payload.product_id, price: payload.price });
      return textResponse_('Unknown product', 200);

    }



    const saleId = String(payload.sale_id || payload.order_number || '').trim();

    if (saleId && wasSaleProcessed_(saleId)) {

      return textResponse_('Already processed', 200);

    }



    const email = String(payload.email || '').trim().toLowerCase();

    const cliente = String(

      payload.full_name || payload.purchaser_name || 'Cliente ARPA Suite'

    ).trim();



    if (!email) return textResponse_('Missing email', 400);



    const codigo = generateCode_(plan.prefix);

    const vencimiento = addDays_(new Date(), plan.days);



    appendLicenseRow_({

      CODIGO: codigo,

      PLAN: plan.planLabel,

      CLIENTE: cliente,

      EMAIL: email,

      VENCIMIENTO: vencimiento,

      ACTIVO: 'SI',

    });



    sendActivationEmail_(email, cliente, plan, codigo, vencimiento);



    if (saleId) markSaleProcessed_(saleId);



    Logger.log('Licencia creada: ' + codigo + ' (' + plan.planLabel + ') → ' + email);

    debugLog_('licencia_creada', { codigo: codigo, plan: plan.planLabel, email: email });
    return textResponse_('OK', 200);

  } catch (err) {

    debugLog_('error_doPost', { mensaje: err.message });
    Logger.log('doPost error: ' + err.stack || err);

    // Pedidos JSON de la app (sync): responder JSON para que la app pueda leer el error.
    // Gumroad y los demás siguen recibiendo texto como antes.
    const syncBody = parseSyncJsonBody_(e);
    if (syncBody && syncBody.accion) {
      return respondJson_({ ok: false, mensaje: 'Error del servidor: ' + err.message });
    }

    return textResponse_('Error: ' + err.message, 500);

  }

}



// ─── Email HTML ──────────────────────────────────────────────────────────────



function sendActivationEmail_(to, cliente, plan, codigo, vencimiento) {

  const nombre = (cliente || 'Cliente').split(' ')[0];

  const vencStr = formatDateEs_(vencimiento);

  const waUrl = 'https://wa.me/' + CONFIG.SUPPORT_WHATSAPP;

  const subject = 'Tu licencia ARPA Suite — ' + codigo;



  const html = buildActivationEmailHtml_({

    nombre: nombre,

    planLabel: plan.planLabel,

    codigo: codigo,

    vencStr: vencStr,

    appUrl: CONFIG.APP_URL,

    manualUrl: CONFIG.MANUAL_URL,

    waUrl: waUrl,

    waDisplay: CONFIG.SUPPORT_WHATSAPP_DISPLAY,

  });



  MailApp.sendEmail({

    to: to,

    subject: subject,

    htmlBody: html,

    name: CONFIG.EMAIL_FROM_NAME,

  });

}



function buildActivationEmailHtml_(d) {

  return [

    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">',

    '<meta name="viewport" content="width=device-width,initial-scale=1">',

    '</head><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">',

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">',

    '<tr><td align="center">',

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">',



    // Header

    '<tr><td style="background:#1a2a4a;padding:28px 32px;text-align:center;">',

    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;font-weight:700;">ARPA Technology Global</p>',

    '<h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;">Bienvenido a ARPA Suite</h1>',

    '</td></tr>',



    // Body

    '<tr><td style="padding:32px;">',

    '<p style="margin:0 0 16px;font-size:16px;color:#1e2d4a;line-height:1.6;">Hola <strong>' + escapeHtml_(d.nombre) + '</strong>,</p>',

    '<p style="margin:0 0 20px;font-size:15px;color:#5a6a8a;line-height:1.65;">',

    'Tu plan <strong style="color:#1a2a4a;">' + escapeHtml_(d.planLabel) + '</strong> es tuyo <strong style="color:#1a2a4a;">de por vida</strong> — sin mensualidades, sin vencimiento. ',

    'Usa el código de abajo para activar la plataforma.',

    '</p>',

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">',

    '<tr><td style="background:#f8fafc;border-left:3px solid #c9a84c;border-radius:6px;padding:14px 16px;">',

    '<p style="margin:0;font-size:13px;color:#5a6a8a;line-height:1.55;">',

    '<strong style="color:#1a2a4a;">Soporte y actualizaciones gratis:</strong> incluidos hasta el <strong>' + escapeHtml_(d.vencStr) + '</strong>. ',

    'Si no renuevas, ARPA Suite sigue funcionando normal — solo dejas de recibir soporte prioritario y actualizaciones hasta que renueves.',

    '</p></td></tr></table>',



    // Code box

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">',

    '<tr><td style="background:#1a2a4a;border-radius:10px;padding:20px;text-align:center;border:2px solid #c9a84c;">',

    '<p style="margin:0 0 6px;font-size:11px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Tu código de licencia</p>',

    '<p style="margin:0;font-size:28px;color:#ffffff;font-weight:700;letter-spacing:1px;font-family:Consolas,Monaco,monospace;">',

    escapeHtml_(d.codigo),

    '</p></td></tr></table>',



    // Steps

    '<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a2a4a;text-transform:uppercase;letter-spacing:0.5px;">Activación en 3 pasos</p>',

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">',

    stepRow_(1, 'Abre ARPA Suite en tu navegador o celular'),

    stepRow_(2, 'Ingresa tu código de licencia en la pantalla de activación'),

    stepRow_(3, 'Pulsa <strong>Activar</strong> y comienza a generar documentos profesionales'),

    '</table>',



    // CTA button

    '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px;"><tr><td>',

    '<a href="' + escapeHtml_(d.appUrl) + '" target="_blank" style="display:inline-block;background:#c9a84c;color:#1a2a4a;',

    'font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">',

    'Abrir ARPA Suite →</a></td></tr></table>',



    // Manual

    '<p style="margin:0 0 28px;font-size:14px;color:#5a6a8a;line-height:1.6;text-align:center;">',

    '¿Primera vez? Consulta el ',

    '<a href="' + escapeHtml_(d.manualUrl) + '" target="_blank" style="color:#1a2a4a;font-weight:700;text-decoration:underline;">',

    'manual de usuario</a> con guías paso a paso.</p>',



    // Support

    '<p style="margin:0;font-size:14px;color:#5a6a8a;line-height:1.6;text-align:center;">',

    '¿Necesitas ayuda? Escríbenos por WhatsApp:<br>',

    '<a href="' + escapeHtml_(d.waUrl) + '" style="color:#c9a84c;font-weight:700;text-decoration:none;">',

    escapeHtml_(d.waDisplay) + '</a></p>',



    '</td></tr>',



    // Footer

    '<tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">',

    '<p style="margin:0;font-size:12px;color:#8896b3;">© ' + new Date().getFullYear() + ' ARPA Technology Global · Todos los derechos reservados</p>',

    '</td></tr>',



    '</table></td></tr></table></body></html>',

  ].join('');

}



function stepRow_(num, text) {

  return [

    '<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">',

    '<table role="presentation" cellspacing="0" cellpadding="0"><tr>',

    '<td style="width:36px;vertical-align:top;">',

    '<span style="display:inline-block;width:28px;height:28px;background:#c9a84c;color:#1a2a4a;',

    'border-radius:50%;text-align:center;line-height:28px;font-size:14px;font-weight:700;">',

    String(num), '</span></td>',

    '<td style="font-size:14px;color:#1e2d4a;line-height:1.5;vertical-align:middle;">', text, '</td>',

    '</tr></table></td></tr>',

  ].join('');

}



function escapeHtml_(s) {

  return String(s || '')

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;');

}



// ─── Planes Gumroad ──────────────────────────────────────────────────────────



function resolvePlanFromPayload_(payload) {

  const props = PropertiesService.getScriptProperties();

  const productId = String(payload.permalink || payload.product_id || '');

  const priceCents = parseInt(String(payload.price || '0'), 10);



  const freeId = props.getProperty('GUMROAD_PRODUCT_FREE') || '';

  const proId = props.getProperty('GUMROAD_PRODUCT_PRO') || '';

  const pymeId = props.getProperty('GUMROAD_PRODUCT_PYME') || '';

  const wlId = props.getProperty('GUMROAD_PRODUCT_WL') || '';



  if (freeId && productId === freeId) return CONFIG.PLANS.FREE;

  if (proId && productId === proId) return CONFIG.PLANS.PRO;

  if (pymeId && productId === pymeId) return CONFIG.PLANS.PYME;

  if (wlId && productId === wlId) return CONFIG.PLANS.WL;



  if (priceCents === 0 && !proId && !pymeId) return CONFIG.PLANS.FREE;

  if (priceCents === 0 && productId === freeId) return CONFIG.PLANS.FREE;



  return null;

}



// ─── Helpers Sheet / códigos ─────────────────────────────────────────────────



function getLicenseSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) throw new Error('Pestaña no encontrada: ' + CONFIG.SHEET_NAME);

  return sheet;

}



const EMPRESAS_HEADERS_ = [
  'Licencia', 'NombreEmpresa', 'NIT', 'Direccion', 'Ciudad', 'Telefono', 'SitioWeb',
  'UltimaActualizacion', 'LogoBase64', 'Banco', 'TipoCuenta', 'NumeroCuenta',
  'TitularCuenta', 'DocumentoTitular', 'NombreTecnico', 'DocumentoTecnico', 'CodigoTecnico'
];



// 'Oficio' (columna I) se agregó en oct-2026 para restaurar cada producto en su oficio.
// Las filas viejas la tienen vacía y la app las pone en el oficio activo, como antes.
const CATALOGO_HEADERS_ = ['Licencia', 'ProductoId', 'Codigo', 'Nombre', 'Precio', 'Unidad', 'Marca', 'Categoria', 'Oficio'];



const HISTORIAL_HEADERS_ = ['Licencia', 'EntradaId', 'Tipo', 'Subtipo', 'Numero', 'Cliente', 'Ciudad', 'Fecha', 'Monto', 'Concepto'];



function ensureEmpresasSheetHeaders_(sheet) {
  const needed = EMPRESAS_HEADERS_.length;
  const lastCol = Math.max(sheet.getLastColumn(), needed);
  const row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const first = String(row[0] || '').trim();
  if (first !== 'Licencia') {
    sheet.getRange(1, 1, 1, needed).setValues([EMPRESAS_HEADERS_]);
    return;
  }
  for (let i = 0; i < needed; i++) {
    if (String(row[i] || '').trim() !== EMPRESAS_HEADERS_[i]) {
      sheet.getRange(1, i + 1).setValue(EMPRESAS_HEADERS_[i]);
    }
  }
}

function getEmpresasSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(CONFIG.EMPRESAS_SHEET_NAME);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.EMPRESAS_SHEET_NAME);

    sheet.getRange(1, 1, 1, EMPRESAS_HEADERS_.length).setValues([EMPRESAS_HEADERS_]);

    return sheet;

  }

  ensureEmpresasSheetHeaders_(sheet);

  return sheet;

}



function readCompanyParam_(params, camelKey, lowerKey) {

  return String(params[camelKey] || params[lowerKey] || '').trim();

}



function saveCompanyData_(params) {

  const licencia = String(params.licencia || '').trim().toUpperCase();

  if (!licencia) {

    return { ok: false, mensaje: 'Licencia requerida.' };

  }

  const nombreEmpresa = readCompanyParam_(params, 'nombreEmpresa', 'nombreempresa');

  const nit = readCompanyParam_(params, 'nit', 'nit');

  const direccion = readCompanyParam_(params, 'direccion', 'direccion');

  const ciudad = readCompanyParam_(params, 'ciudad', 'ciudad');

  const telefono = readCompanyParam_(params, 'telefono', 'telefono');

  const sitioWeb = readCompanyParam_(params, 'sitioWeb', 'sitioweb');

  const banco = readCompanyParam_(params, 'banco', 'banco');

  const tipoCuenta = readCompanyParam_(params, 'tipoCuenta', 'tipocuenta');

  const numeroCuenta = readCompanyParam_(params, 'numeroCuenta', 'numerocuenta');

  const titularCuenta = readCompanyParam_(params, 'titularCuenta', 'titularcuenta');

  const documentoTitular = readCompanyParam_(params, 'documentoTitular', 'documentotitular');

  const nombreTecnico = readCompanyParam_(params, 'nombreTecnico', 'nombretecnico');

  const documentoTecnico = readCompanyParam_(params, 'documentoTecnico', 'documentotecnico');

  const codigoTecnico = readCompanyParam_(params, 'codigoTecnico', 'codigotecnico');

  let logoBase64 = readCompanyParam_(params, 'logoBase64', 'logobase64');

  if (logoBase64.length > 40000) logoBase64 = '';

  const sheet = getEmpresasSheet_();

  const values = sheet.getDataRange().getValues();

  const now = new Date();

  const row = [
    licencia, nombreEmpresa, nit, direccion, ciudad, telefono, sitioWeb, now, logoBase64,
    banco, tipoCuenta, numeroCuenta, titularCuenta, documentoTitular,
    nombreTecnico, documentoTecnico, codigoTecnico
  ];

  let targetRow = -1;

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0] || '').trim().toUpperCase() === licencia) {

      targetRow = i + 1;

      break;

    }

  }

  if (targetRow > 0) {

    sheet.getRange(targetRow, 1, 1, EMPRESAS_HEADERS_.length).setValues([row]);

  } else {

    sheet.appendRow(row);

  }

  return { ok: true, mensaje: 'Datos de empresa guardados.' };

}



function getCompanyData_(params) {

  const licencia = String(params.licencia || '').trim().toUpperCase();

  if (!licencia) {

    return { ok: false, encontrado: false, mensaje: 'Licencia requerida.' };

  }

  const sheet = getEmpresasSheet_();

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0] || '').trim().toUpperCase() !== licencia) continue;

    const nombreEmpresa = String(values[i][1] || '').trim();

    if (!nombreEmpresa) {

      return { ok: true, encontrado: false };

    }

    return {

      ok: true,

      encontrado: true,

      licencia: licencia,

      nombreEmpresa: nombreEmpresa,

      nit: String(values[i][2] || '').trim(),

      direccion: String(values[i][3] || '').trim(),

      ciudad: String(values[i][4] || '').trim(),

      telefono: String(values[i][5] || '').trim(),

      sitioWeb: String(values[i][6] || '').trim(),

      logoBase64: String(values[i][8] || '').trim(),

      banco: String(values[i][9] || '').trim(),

      tipoCuenta: String(values[i][10] || '').trim(),

      numeroCuenta: String(values[i][11] || '').trim(),

      titularCuenta: String(values[i][12] || '').trim(),

      documentoTitular: String(values[i][13] || '').trim(),

      nombreTecnico: String(values[i][14] || '').trim(),

      documentoTecnico: String(values[i][15] || '').trim(),

      codigoTecnico: String(values[i][16] || '').trim(),

      ultimaActualizacion: values[i][7] || ''

    };

  }

  return { ok: true, encontrado: false };

}



// ─── POST: sync catálogo / historial / empresa (JSON fetch desde PWA) ───────



function parseSyncJsonBody_(e) {

  if (!e || !e.postData || !e.postData.contents) return null;

  try {

    const parsed = JSON.parse(e.postData.contents);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;

  } catch (err) { /* no es JSON de sync */ }

  return null;

}



function respondJson_(obj) {

  return ContentService.createTextOutput(JSON.stringify(obj))

    .setMimeType(ContentService.MimeType.JSON);

}



function handleSyncPost_(e) {

  const body = parseSyncJsonBody_(e);

  if (!body || !body.accion) return null;

  const accion = String(body.accion).trim().toLowerCase();



  if (accion === 'savecompanydata') {

    return respondJson_(saveCompanyData_(body));

  }

  if (accion === 'registertrialuser') {

    return respondJson_(registerTrialUser_(body));

  }



  const licencia = String(body.licencia || '').trim().toUpperCase();

  if (!licencia) {

    return respondJson_({ ok: false, mensaje: 'Licencia requerida.' });

  }



  if (accion === 'savecatalogo') {

    return respondJson_(saveCatalogo_(licencia, body.productos));

  }

  if (accion === 'getcatalogo') {

    return respondJson_(getCatalogo_(licencia));

  }

  if (accion === 'savehistorialentry') {

    return respondJson_(saveHistorialEntry_(licencia, body.entrada));

  }

  if (accion === 'deletehistorialentry') {

    return respondJson_(deleteHistorialEntry_(licencia, body.entradaId));

  }

  if (accion === 'gethistorial') {

    return respondJson_(getHistorial_(licencia));

  }

  if (accion === 'respaldoguardar') {
    return respondJson_(respaldoGuardar_(licencia, body));
  }
  if (accion === 'respaldolistar') {
    return respondJson_(respaldoListar_(licencia, body));
  }
  if (accion === 'respaldoleer') {
    return respondJson_(respaldoLeer_(licencia, body));
  }
  if (accion === 'siguientenumero') {

    return respondJson_(siguienteNumero_(licencia, body.tipo, body.clienteUltimo));

  }

  // Pedido JSON que este servidor no conoce: responder JSON, nunca seguir al flujo de Gumroad.
  return respondJson_({ ok: false, mensaje: 'Acción desconocida.' });

}



function getCatalogoSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(CONFIG.CATALOGO_SHEET_NAME);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.CATALOGO_SHEET_NAME);

    sheet.getRange(1, 1, 1, CATALOGO_HEADERS_.length).setValues([CATALOGO_HEADERS_]);

    return sheet;

  }

  const firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();

  if (!firstCell) {

    sheet.getRange(1, 1, 1, CATALOGO_HEADERS_.length).setValues([CATALOGO_HEADERS_]);

  } else if (!String(sheet.getRange(1, CATALOGO_HEADERS_.length).getValue() || '').trim()) {

    // Hoja creada antes de la columna Oficio: solo se escribe el título que falta.
    sheet.getRange(1, CATALOGO_HEADERS_.length).setValue(CATALOGO_HEADERS_[CATALOGO_HEADERS_.length - 1]);

  }

  return sheet;

}



function getHistorialSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(CONFIG.HISTORIAL_SHEET_NAME);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.HISTORIAL_SHEET_NAME);

    sheet.getRange(1, 1, 1, HISTORIAL_HEADERS_.length).setValues([HISTORIAL_HEADERS_]);

    return sheet;

  }

  const firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();

  if (!firstCell) {

    sheet.getRange(1, 1, 1, HISTORIAL_HEADERS_.length).setValues([HISTORIAL_HEADERS_]);

  }

  return sheet;

}



const NUMERACION_SHEET_NAME_ = 'Numeracion';

const NUMERACION_HEADERS_ = ['Licencia', 'Tipo', 'UltimoNumero'];



function getNumeracionSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(NUMERACION_SHEET_NAME_);

  if (!sheet) {

    sheet = ss.insertSheet(NUMERACION_SHEET_NAME_);

    sheet.getRange(1, 1, 1, NUMERACION_HEADERS_.length).setValues([NUMERACION_HEADERS_]);

    return sheet;

  }

  const firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();

  if (!firstCell) {

    sheet.getRange(1, 1, 1, NUMERACION_HEADERS_.length).setValues([NUMERACION_HEADERS_]);

  }

  return sheet;

}



/**

 * Reserva y devuelve el siguiente número consecutivo para (licencia, tipo).

 * clienteUltimo: el número más alto que el dispositivo cliente tiene guardado

 * localmente — se usa para no retroceder por debajo de números ya emitidos

 * antes de que ese dispositivo empezara a usar la numeración centralizada.

 * Usa LockService para evitar que dos dispositivos reciban el mismo número

 * si generan documentos al mismo tiempo.

 */

function siguienteNumero_(licencia, tipo, clienteUltimo) {

  const lic = String(licencia || '').trim().toUpperCase();

  const tp = String(tipo || '').trim().toLowerCase();

  if (!lic) return { ok: false, mensaje: 'Licencia requerida.' };

  if (['formato', 'cot', 'cc'].indexOf(tp) < 0) {

    return { ok: false, mensaje: 'Tipo de documento inválido.' };

  }

  const clienteN = Math.max(0, parseInt(clienteUltimo, 10) || 0);

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getNumeracionSheet_();

    const values = sheet.getDataRange().getValues();

    let targetRow = -1;

    let actual = 0;

    for (let i = 1; i < values.length; i++) {

      if (String(values[i][0] || '').trim().toUpperCase() === lic &&

          String(values[i][1] || '').trim().toLowerCase() === tp) {

        targetRow = i + 1;

        actual = parseInt(values[i][2], 10) || 0;

        break;

      }

    }

    const base = Math.max(actual, clienteN);

    const siguiente = base + 1;

    if (targetRow > 0) {

      sheet.getRange(targetRow, 3).setValue(siguiente);

    } else {

      sheet.appendRow([lic, tp, siguiente]);

    }

    return { ok: true, numero: siguiente };

  } finally {

    lock.releaseLock();

  }

}



function deleteRowsForLicencia_(sheet, licencia) {

  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {

    if (String(values[i][0] || '').trim().toUpperCase() === licencia) {

      sheet.deleteRow(i + 1);

    }

  }

}



function saveCatalogo_(licencia, productos) {

  // Primero se arman y validan las filas; solo después se borra lo anterior.
  // Así un error al armar los datos no deja a la licencia sin catálogo en la nube.
  if (productos != null && !Array.isArray(productos)) {
    debugLog_('catalogo_guardado', { licencia: licenciaCorta_(licencia), cantidad: null, resultado: 'rechazado_invalido' });
    return { ok: false, mensaje: 'Productos inválidos.' };
  }

  const list = Array.isArray(productos) ? productos : [];

  // Una lista vacía casi siempre es un error de la app (catálogo sin cargar,
  // modo demo, datos borrados en el celular). Borrar por eso dejaría a la
  // licencia sin su copia en la nube, así que se rechaza y no se borra nada.
  if (!list.length) {
    debugLog_('catalogo_guardado', { licencia: licenciaCorta_(licencia), cantidad: 0, resultado: 'rechazado_vacio' });
    return { ok: false, mensaje: 'Catálogo vacío: no se borra la copia en la nube.' };
  }

  const rows = list.map(function (p) {
    const item = p && typeof p === 'object' ? p : {};
    return [
      licencia,
      String(item.id || ''),
      String(item.cod || item.codigo || ''),
      String(item.nom || item.nombre || ''),
      Number(item.pvp != null ? item.pvp : item.precio) || 0,
      String(item.unidad || ''),
      String(item.marca || ''),
      String(item.categoria || item.category || 'General'),
      String(item.oficioId || item.oficio || '')
    ];
  });

  // Un solo guardado a la vez: deleteRow por índice no es seguro si otro
  // dispositivo borra o agrega filas al mismo tiempo.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getCatalogoSheet_();
    deleteRowsForLicencia_(sheet, licencia);

    const startRow = sheet.getLastRow() + 1;
    // getRange(fila, columna, NÚMERO de filas, NÚMERO de columnas).
    sheet.getRange(startRow, 1, rows.length, CATALOGO_HEADERS_.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }

  debugLog_('catalogo_guardado', { licencia: licenciaCorta_(licencia), cantidad: rows.length, resultado: 'ok' });
  return { ok: true, count: rows.length };

}

// Solo los últimos 6 caracteres: basta para reconocer la licencia en Debug
// sin dejar la clave completa a la vista.
function licenciaCorta_(licencia) {
  const s = String(licencia || '');
  return s.slice(-6);
}



function getCatalogo_(licencia) {

  const sheet = getCatalogoSheet_();

  const values = sheet.getDataRange().getValues();

  const productos = [];



  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0] || '').trim().toUpperCase() !== licencia) continue;

    productos.push({

      id: String(values[i][1] || ''),

      cod: String(values[i][2] || ''),

      nom: String(values[i][3] || ''),

      pvp: Number(values[i][4]) || 0,

      unidad: String(values[i][5] || ''),

      marca: String(values[i][6] || ''),

      categoria: String(values[i][7] || 'General')

    });

    const oficio = String(values[i][8] || '').trim();

    if (oficio) productos[productos.length - 1].oficioId = oficio;

  }



  return { ok: true, productos: productos };

}



function saveHistorialEntry_(licencia, entrada) {

  const e = entrada || {};

  const entradaId = String(e.id || e.entradaId || '').trim();

  if (!entradaId) {

    return { ok: false, mensaje: 'EntradaId requerido.' };

  }



  const sheet = getHistorialSheet_();

  sheet.appendRow([

    licencia,

    entradaId,

    String(e.tipo || ''),

    String(e.subtipo || ''),

    String(e.numero || ''),

    String(e.cliente || ''),

    String(e.ciudad || ''),

    String(e.fecha || ''),

    e.monto != null && e.monto !== '' ? Number(e.monto) : '',

    String(e.concepto || '')

  ]);



  return { ok: true };

}



function deleteHistorialEntry_(licencia, entradaId) {

  const id = String(entradaId || '').trim();

  if (!id) {

    return { ok: false, mensaje: 'EntradaId requerido.' };

  }



  const sheet = getHistorialSheet_();

  const values = sheet.getDataRange().getValues();

  let deleted = false;



  for (let i = values.length - 1; i >= 1; i--) {

    if (String(values[i][0] || '').trim().toUpperCase() !== licencia) continue;

    if (String(values[i][1] || '').trim() !== id) continue;

    sheet.deleteRow(i + 1);

    deleted = true;

    break;

  }



  return { ok: true, deleted: deleted };

}



function getHistorial_(licencia) {

  const sheet = getHistorialSheet_();

  const values = sheet.getDataRange().getValues();

  const entradas = [];



  for (let i = 1; i < values.length; i++) {

    if (String(values[i][0] || '').trim().toUpperCase() !== licencia) continue;

    const monto = values[i][8];

    entradas.push({

      id: String(values[i][1] || ''),

      tipo: String(values[i][2] || ''),

      subtipo: String(values[i][3] || ''),

      numero: String(values[i][4] || ''),

      cliente: String(values[i][5] || ''),

      ciudad: String(values[i][6] || ''),

      fecha: String(values[i][7] || ''),

      monto: monto === '' || monto == null ? '' : Number(monto),

      concepto: String(values[i][9] || '')

    });

  }



  return { ok: true, entradas: entradas };

}



const TRIALS_HEADERS_ = ['Nombre', 'Oficio', 'Telefono', 'FechaInicio', 'FechaVencimiento', 'TrialId', 'Notificado', 'Convertido', 'Secuencia', 'Detener', 'Pais'];



function getTrialsColumnMap_(headerRow) {

  const map = {};

  (headerRow || []).forEach(function (h, i) {

    const key = String(h || '').trim().toLowerCase();

    if (key) map[key] = i;

  });

  return map;

}



function ensureTrialsSheetHeaders_(sheet) {

  const lastCol = Math.max(sheet.getLastColumn(), TRIALS_HEADERS_.length);

  const row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const first = String(row[0] || '').trim();

  if (first !== 'Nombre') {

    sheet.getRange(1, 1, 1, TRIALS_HEADERS_.length).setValues([TRIALS_HEADERS_]);

    return getTrialsColumnMap_(TRIALS_HEADERS_);

  }

  // Hojas existentes: agrega al final las columnas que falten (p. ej. Secuencia, Detener) sin mover las demás.

  const map = getTrialsColumnMap_(row);

  let used = 0;

  for (let i = 0; i < row.length; i++) {

    if (String(row[i] || '').trim()) used = i + 1;

  }

  TRIALS_HEADERS_.forEach(function (h) {

    const key = h.toLowerCase();

    if (map[key] != null) return;

    sheet.getRange(1, used + 1).setValue(h);

    map[key] = used;

    used += 1;

  });

  return map;

}



function getTrialsSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(CONFIG.TRIALS_SHEET_NAME);

  if (!sheet) {

    sheet = ss.insertSheet(CONFIG.TRIALS_SHEET_NAME);

    sheet.getRange(1, 1, 1, TRIALS_HEADERS_.length).setValues([TRIALS_HEADERS_]);

    return sheet;

  }

  ensureTrialsSheetHeaders_(sheet);

  return sheet;

}



function parseDateFromIsoString_(str) {

  const parts = String(str || '').trim().split('-');

  if (parts.length !== 3) return null;

  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  return isNaN(d.getTime()) ? null : d;

}



function registerTrialUser_(body) {

  const nombre = String(body.nombre || '').trim();

  const oficio = String(body.oficio || '').trim();

  const telefono = String(body.telefono || '').trim();

  const fechaInicioStr = String(body.fechaInicio || '').trim();

  const trialId = String(body.trialId || '').trim();

  if (!telefono || !fechaInicioStr || !trialId) {

    return { ok: false, mensaje: 'telefono, fechaInicio y trialId requeridos.' };

  }



  const sheet = getTrialsSheet_();

  const col = ensureTrialsSheetHeaders_(sheet);

  const values = sheet.getDataRange().getValues();

  const trialCol = col.trialid != null ? col.trialid : 5;

  for (let i = 1; i < values.length; i++) {

    if (String(values[i][trialCol] || '').trim() === trialId) {

      return { ok: true, duplicate: true };

    }

  }



  const fechaInicio = parseDateFromIsoString_(fechaInicioStr) || new Date();

  const fechaVenc = addDays_(fechaInicio, 7);

  const row = new Array(TRIALS_HEADERS_.length).fill('');

  row[col.nombre != null ? col.nombre : 0] = nombre;

  row[col.oficio != null ? col.oficio : 1] = oficio;

  row[col.telefono != null ? col.telefono : 2] = telefono;

  row[col.fechainicio != null ? col.fechainicio : 3] = formatDateIso_(fechaInicio);

  row[col.fechavencimiento != null ? col.fechavencimiento : 4] = formatDateIso_(fechaVenc);

  row[col.trialid != null ? col.trialid : 5] = trialId;

  // País de la app (CO, MX, US, CL, PE) para armar bien el link de WhatsApp.

  const pais = String(body.pais || '').trim().toUpperCase();

  if (col.pais != null && TRIAL_PHONE_COUNTRIES_[pais]) row[col.pais] = pais;

  sheet.appendRow(row);

  return { ok: true };

}



/**

 * Países de la app (mismo listado que js/arpa-pricing.js): código de país y

 * cuántos dígitos tiene el número nacional.

 */

const TRIAL_PHONE_COUNTRIES_ = {

  CO: { prefix: '57', national: 10 },

  MX: { prefix: '52', national: 10 },

  US: { prefix: '1', national: 10 },

  CL: { prefix: '56', national: 9 },

  PE: { prefix: '51', national: 9 }

};



/** ¿El número (ya con código) tiene la forma de un número de ese país? */

function trialPhoneMatchesCountry_(digits, pais) {

  const c = TRIAL_PHONE_COUNTRIES_[pais];

  if (!c || digits.indexOf(c.prefix) !== 0) return false;

  const rest = digits.slice(c.prefix.length);

  if (pais === 'CO') return rest.length === 10 && (rest.charAt(0) === '3' || rest.indexOf('60') === 0);

  if (pais === 'MX') return rest.length === 10 || (rest.length === 11 && rest.charAt(0) === '1');

  if (pais === 'US') return rest.length === 10 && /^[2-9]/.test(rest);

  return rest.length === c.national;

}



/**

 * Número para wa.me. Nunca adivina: si no es claro, devuelve phone '' y revisar true.

 * telefono: lo que guardó la app (solo dígitos; puede traer "+").

 * pais: CO, MX, US, CL o PE si la app lo envió; vacío en registros viejos.

 * → { phone: '573001234567' | '', revisar: bool, motivo: '' }

 */

function resolveTrialWaPhone_(telefono, pais) {

  const raw = String(telefono == null ? '' : telefono).trim();

  let digits = raw.replace(/\D/g, '');

  const p = TRIAL_PHONE_COUNTRIES_[String(pais || '').trim().toUpperCase()] ? String(pais).trim().toUpperCase() : '';

  if (!digits) return { phone: '', revisar: true, motivo: 'sin número' };

  if (digits.indexOf('00') === 0) digits = digits.slice(2);



  // 1. Ya trae código de país de la app (57, 52, 1, 56, 51) con el largo correcto.

  const codes = Object.keys(TRIAL_PHONE_COUNTRIES_);

  for (let i = 0; i < codes.length; i++) {

    if (!trialPhoneMatchesCountry_(digits, codes[i])) continue;

    if (p && p !== codes[i]) {

      return { phone: '', revisar: true, motivo: 'el número parece de ' + codes[i] + ' pero el país de la app es ' + p };

    }

    return { phone: digits, revisar: false, motivo: '' };

  }



  // 2. Número nacional sin código.

  if (p && digits.length === TRIAL_PHONE_COUNTRIES_[p].national) {

    const full = TRIAL_PHONE_COUNTRIES_[p].prefix + digits;

    if (trialPhoneMatchesCountry_(full, p)) return { phone: full, revisar: false, motivo: '' };

  }

  if (!p && digits.length === 10 && digits.charAt(0) === '3') {

    return { phone: '57' + digits, revisar: false, motivo: '' }; // celular de Colombia

  }



  // 3. Escrito con "+" y largo internacional válido: se respeta tal cual.

  if (raw.charAt(0) === '+' && digits.length >= 8 && digits.length <= 15) {

    return { phone: digits, revisar: false, motivo: '' };

  }

  return { phone: '', revisar: true, motivo: 'no se sabe el código de país' };

}



/** Compatibilidad: devuelve '' cuando el número no es claro (antes anteponía 57 siempre). */

function normalizePhoneForWaMe_(telefono, pais) {

  return resolveTrialWaPhone_(telefono, pais).phone;

}



// ─── Secuencia de seguimiento de pruebas (días 0, 2, 5, 6, 7, 10 y 20) ─────────

// Nada se envía solo al cliente: cada mañana Arlen recibe UN correo con los links

// de WhatsApp listos y él los envía a mano.

// day = día desde FechaInicio; hasta = último día en que todavía vale la pena

// mandarlo si el trigger no corrió (después de eso se salta, no se manda atrasado).



const TRIAL_SEQUENCE_ = [

  { day: 0, hasta: 1, objetivo: 'Bienvenida y poner el logo', cuando: 'lo antes posible (8 a. m. a 6 p. m.)' },

  { day: 2, hasta: 4, objetivo: 'Primer documento real', cuando: '9 a 10 a. m.' },

  { day: 5, hasta: 5, objetivo: 'Mostrar valor y resolver dudas', cuando: '9 a 10 a. m.' },

  { day: 6, hasta: 6, objetivo: 'Vence mañana: ofrecer el plan', cuando: '8 a 9 a. m.' },

  { day: 7, hasta: 7, objetivo: 'Último día de la prueba', cuando: '10 a 11 a. m.' },

  { day: 10, hasta: 12, objetivo: 'Recuperar al que no compró', cuando: 'en la mañana' },

  { day: 20, hasta: 22, objetivo: 'Último intento, puerta abierta', cuando: 'en la mañana' }

];



/** Nombre del oficio para los mensajes (la app guarda el id, p. ej. "linea_blanca"). */

const TRIAL_OFICIO_LABELS_ = {

  automatismos: 'automatismos',

  electricidad: 'electricidad',

  gas: 'gas',

  refrigeracion: 'refrigeración y aire acondicionado',

  cctv: 'cámaras y seguridad electrónica',

  plomeria: 'plomería',

  metalmecanica: 'metalmecánica y soldadura',

  plagas: 'control de plagas',

  linea_blanca: 'línea blanca',

  solar: 'energía solar'

};



function trialNormalizeText_(s) {

  return String(s || '').trim().toLowerCase()

    .normalize('NFD').replace(/[̀-ͯ]/g, '');

}



function trialFirstName_(nombre) {

  const first = String(nombre || '').trim().split(/\s+/)[0] || '';

  if (!first) return '';

  return first.charAt(0).toUpperCase() + first.slice(1);

}



function trialOficioLabel_(oficio) {

  const raw = String(oficio || '').trim();

  if (!raw) return '';

  const key = trialNormalizeText_(raw).replace(/\s+/g, '_');

  if (TRIAL_OFICIO_LABELS_[key]) return TRIAL_OFICIO_LABELS_[key];

  return raw.replace(/_/g, ' ');

}



/** Variante del día 2: refrigeración, gas y mantenimiento. */

function isTrialOficioMantenimiento_(oficio) {

  const n = trialNormalizeText_(oficio).replace(/_/g, ' ');

  if (!n) return false;

  return /refrigeracion|aire acondicionado|mantenimiento/.test(n) || /(^|\s)gas(\s|$)/.test(n);

}



/** "[Nombre], texto" → "Nombre, texto" o, sin nombre, "Texto" (con ¿ respetado). */

function trialNameLead_(first, rest) {

  if (first) return first + ', ' + rest;

  const m = String(rest).match(/^(¿|¡)?(.)([\s\S]*)$/);

  if (!m) return rest;

  return (m[1] || '') + m[2].toUpperCase() + m[3];

}



/**

 * Texto aprobado (Manual de ventas, 11 oct 2026) para el día de la secuencia.

 * Devuelve '' si el día no es parte de la secuencia.

 */

function buildTrialSequenceMessage_(day, nombre, oficio) {

  const first = trialFirstName_(nombre);

  const of = trialOficioLabel_(oficio);

  const gumroad = CONFIG.TRIAL_UPGRADE_GUMROAD_URL || 'https://arpatech.gumroad.com/l/arpa-suite-tecnico';

  const hola = first ? ('¡Hola ' + first + '!') : '¡Hola!';

  const holaComa = first ? ('Hola ' + first + ',') : 'Hola,';

  switch (Number(day)) {

    case 0:

      return hola + ' Bienvenido a ARPA Suite. Primer paso: en Configuración sube tu logo y los datos de tu empresa; desde ahí todos tus PDF salen con tu marca. Cualquier duda, me escribes aquí mismo.';

    case 2: {

      const tip = of ? ('Tip para ' + of + ': ') : 'Tip: ';

      if (isTrialOficioMantenimiento_(oficio)) {

        return trialNameLead_(first, '¿ya hiciste tu primera cotización? ' + tip + 'después de cada mantenimiento haz el Formato de Servicio con fotos; queda en tu historial y la app te recuerda a los 6 meses.');

      }

      return trialNameLead_(first, '¿ya hiciste tu primera cotización? ' + tip + 'agrega al Catálogo los 10 productos que más usas y la cotización sale en 2 minutos. Hazla con un cliente real y mándasela por WhatsApp.');

    }

    case 5:

      return trialNameLead_(first, 'ya llevas 5 días con ARPA Suite. ¿Algún cliente te ha dicho algo del PDF? Si algo no te ha funcionado, dime y te ayudo hoy mismo.');

    case 6:

      return hola + ' Mañana vence tu prueba de ARPA Suite. Si te sirvió para tus trabajos' + (of ? (' de ' + of) : '') + ', el plan Técnico Independiente es $83 USD pago único, sin mensualidades: ' + gumroad + ' ¿Te quedó alguna duda?';

    case 7:

      return trialNameLead_(first, 'hoy es el último día de tu prueba. Cuando actives tu código sigues donde ibas. $83 USD una sola vez: ' + gumroad + ' ¿Lo dejamos activo hoy?');

    case 10:

      return holaComa + ' tu prueba de ARPA Suite terminó hace unos días. ¿Qué te faltó para decidirte: el precio, la forma de pago o algo de la app? Si quieres, te doy 7 días más para probarla con un trabajo real. Respóndeme y te la activo.';

    case 20:

      return holaComa + ' último mensaje de mi parte, no te quiero llenar el WhatsApp. Si más adelante quieres mandar tus cotizaciones' + (of ? (' de ' + of) : '') + ' en PDF con tu logo, ARPA Suite sigue siendo pago único: https://arpatechnologyglobal.com ¡Éxitos con tus trabajos!';

    default:

      return '';

  }

}



/** Compatibilidad: el mensaje del día 6 ahora es el texto aprobado de la secuencia. */

function buildTrialDay6WhatsAppMessage_(nombre, oficio) {

  return buildTrialSequenceMessage_(6, nombre, oficio);

}



function buildTrialWhatsAppLink_(telefono, message, pais) {

  const phone = normalizePhoneForWaMe_(telefono, pais);

  if (!phone) return '';

  const text = encodeURIComponent(message || buildTrialDay6WhatsAppMessage_());

  return 'https://wa.me/' + phone + '?text=' + text;

}



/** "0,2,5" → [0, 2, 5] */

function parseTrialSequenceDays_(value) {

  return String(value == null ? '' : value).split(/[^0-9]+/)

    .filter(function (s) { return s !== ''; })

    .map(function (s) { return Number(s); });

}



function trialParseStartDate_(raw) {

  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : stripTime_(raw);

  const d = parseDateFromIsoString_(String(raw || ''));

  return d ? stripTime_(d) : null;

}



function trialDaysSinceStart_(fechaInicio, today) {

  return Math.round((stripTime_(today).getTime() - stripTime_(fechaInicio).getTime()) / 86400000);

}



/**

 * Qué mensaje toca hoy. Como máximo uno: el más reciente que ya llegó,

 * solo si no se ha preparado y todavía está dentro de su plazo ("hasta").

 */

function pickTrialSequenceStep_(daysSinceStart, sentDays) {

  const n = Number(daysSinceStart);

  if (!isFinite(n) || n < 0) return null;

  let step = null;

  TRIAL_SEQUENCE_.forEach(function (s) { if (s.day <= n) step = s; });

  if (!step) return null;

  if (n > step.hasta) return null;

  if ((sentDays || []).indexOf(step.day) !== -1) return null;

  return step;

}



/**

 * Decide para una fila de la hoja Trials. Sin efectos: no escribe ni envía.

 * row: { nombre, oficio, telefono, fechaInicio, trialId, notificado, convertido, secuencia, detener, pais }

 */

function planTrialSequenceRow_(row, today) {

  if (!row) return null;

  if (String(row.convertido || '').trim()) return null;

  if (String(row.detener || '').trim()) return null;

  const telefono = String(row.telefono || '').trim();

  if (!telefono) return null;

  const fechaInicio = trialParseStartDate_(row.fechaInicio);

  if (!fechaInicio) return null;

  const sent = parseTrialSequenceDays_(row.secuencia);

  // Filas avisadas por el revisarTrialsDia6 anterior (Notificado) ya tuvieron su día 6.

  if (String(row.notificado || '').trim() && sent.indexOf(6) === -1) sent.push(6);

  const days = trialDaysSinceStart_(fechaInicio, today);

  const step = pickTrialSequenceStep_(days, sent);

  if (!step) return null;

  const nombre = String(row.nombre || '').trim();

  const oficio = String(row.oficio || '').trim();

  const message = buildTrialSequenceMessage_(step.day, nombre, oficio);

  // Si el número no es claro no se adivina: va al correo sin link, marcado "revisar número".

  const pais = String(row.pais || '').trim().toUpperCase();

  const tel = resolveTrialWaPhone_(telefono, pais);

  const waLink = tel.phone ? buildTrialWhatsAppLink_(tel.phone, message) : '';

  return {

    pais: pais,

    revisarNumero: !waLink,

    motivoNumero: waLink ? '' : (tel.motivo || 'número no claro'),

    day: step.day,

    objetivo: step.objetivo,

    cuando: step.cuando,

    nombre: nombre,

    oficio: oficio,

    oficioLabel: trialOficioLabel_(oficio),

    telefono: telefono,

    trialId: String(row.trialId || '').trim(),

    message: message,

    waLink: waLink,

    secuenciaNueva: sent.filter(function (d) { return d !== step.day; })

      .concat([step.day]).sort(function (a, b) { return a - b; }).join(',')

  };

}



function buildTrialSequenceEmailHtml_(leads, fechaLabel) {

  const items = leads.map(function (lead, idx) {

    const label = escapeHtml_(lead.nombre || 'Sin nombre') +

      (lead.oficioLabel ? ' · ' + escapeHtml_(lead.oficioLabel) : '') +

      ' · ' + escapeHtml_(lead.telefono) +

      (lead.pais ? ' (' + escapeHtml_(lead.pais) + ')' : '');

    const accion = lead.waLink

      ? '<a href="' + lead.waLink + '">Abrir WhatsApp con el mensaje listo</a>'

      : '<strong style="color:#b00020;">REVISAR NÚMERO</strong> (' + escapeHtml_(lead.motivoNumero) +

        '): no se armó el link para no escribirle a otra persona. Confirma el código de país y copia el mensaje.';

    return '<li style="margin-bottom:14px;">' +

      '<strong>Día ' + lead.day + ' — ' + escapeHtml_(lead.objetivo) + '</strong><br>' +

      (idx + 1) + '. ' + label + '<br>' +

      'Enviar: ' + escapeHtml_(lead.cuando) + ' (hora del técnico) — ' +

      accion +

      '<blockquote style="border-left:3px solid #ccc;margin:6px 0;padding-left:12px;color:#444;">' +

      escapeHtml_(lead.message) + '</blockquote></li>';

  });

  return '<p>Hola Arlen,</p>' +

    '<p>Seguimiento de pruebas para hoy' + (fechaLabel ? ' (' + escapeHtml_(fechaLabel) + ')' : '') +

    ': <strong>' + leads.length + (leads.length === 1 ? ' mensaje' : ' mensajes') + '</strong> para enviar por WhatsApp. ' +

    'Toca cada link, revisa el texto y envíalo tú.</p>' +

    '<ol style="padding-left:18px;">' + items.join('') + '</ol>' +

    '<p style="color:#666;font-size:13px;">Si alguien responde o pide no recibir más mensajes, escribe algo en la columna ' +

    '<strong>Detener</strong> de la hoja Trials. Si compra, marca <strong>Convertido</strong>. ' +

    'La columna <strong>Secuencia</strong> guarda los días ya preparados.</p>';

}



function readTrialRow_(values, col) {

  function cell(key, fallback) {

    const idx = col[key] != null ? col[key] : fallback;

    return idx == null ? '' : values[idx];

  }

  return {

    nombre: cell('nombre', 0),

    oficio: cell('oficio', 1),

    telefono: cell('telefono', 2),

    fechaInicio: cell('fechainicio', 3),

    trialId: cell('trialid', 5),

    notificado: cell('notificado', 6),

    convertido: cell('convertido', 7),

    secuencia: cell('secuencia', null),

    detener: cell('detener', null),

    pais: cell('pais', null)

  };

}



function runTrialSequence_(dryRun) {

  const sheet = getTrialsSheet_();

  const col = ensureTrialsSheetHeaders_(sheet);

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const today = stripTime_(new Date());

  const leads = [];

  for (let i = 1; i < values.length; i++) {

    const plan = planTrialSequenceRow_(readTrialRow_(values[i], col), today);

    if (!plan) continue;

    plan.rowNumber = i + 1;

    leads.push(plan);

  }

  if (!leads.length) {

    Logger.log('Secuencia de pruebas: nada para hoy.');

    return leads;

  }

  if (dryRun) {

    leads.forEach(function (l) {

      Logger.log('Fila ' + l.rowNumber + ' · día ' + l.day + ' · ' + (l.nombre || 'Sin nombre') + ' · ' + l.telefono + (l.revisarNumero ? ' · REVISAR NÚMERO: ' + l.motivoNumero : '') + '\n' + l.message);

    });

    return leads;

  }

  // Primero el correo; si falla, no se marca nada y se reintenta al día siguiente (dentro del plazo).

  MailApp.sendEmail({

    to: CONFIG.TRIAL_NOTIFY_EMAIL,

    subject: 'ARPA Suite — Seguimiento de pruebas: ' + leads.length + (leads.length === 1 ? ' mensaje' : ' mensajes') + ' para enviar hoy',

    htmlBody: buildTrialSequenceEmailHtml_(leads, formatDateEs_(today))

  });

  leads.forEach(function (l) {

    sheet.getRange(l.rowNumber, col.secuencia + 1).setValue(l.secuenciaNueva);

    if (l.day === 6) {

      sheet.getRange(l.rowNumber, (col.notificado != null ? col.notificado : 6) + 1).setValue('Si');

    }

  });

  return leads;

}



/**

 * Revisión diaria de la secuencia de pruebas (días 0, 2, 5, 6, 7, 10 y 20).

 * Envía UN correo a CONFIG.TRIAL_NOTIFY_EMAIL con los links de WhatsApp listos.

 * Trigger: Time-driven → Day timer → 8am-9am → revisarSecuenciaPruebas

 */

function revisarSecuenciaPruebas() {

  return runTrialSequence_(false);

}



/** Vista previa en el editor: muestra en el registro qué saldría hoy. No escribe ni envía nada. */

function previsualizarSecuenciaPruebas() {

  return runTrialSequence_(true);

}



/**

 * Compatibilidad: el trigger existente "revisarTrialsDia6" sigue funcionando

 * y ahora prepara toda la secuencia (incluido el día 6).

 */

function revisarTrialsDia6() {

  return revisarSecuenciaPruebas();

}





// ─── Ventas manuales (Nequi / llave Bre-B / otro) ─────────────────────────────

// Arlen llena una fila en la pestaña VentasManuales y, desde el menú ARPA del Sheet,

// "Crear licencias de pagos manuales". Se crea la licencia igual que una venta de

// Gumroad y se envía el mismo correo de activación. Una fila con Codigo ya no se toca.



const VENTAS_MANUALES_SHEET_NAME_ = 'VentasManuales';



const VENTAS_MANUALES_HEADERS_ = ['Fecha', 'Nombre', 'Email', 'Telefono', 'Plan', 'MontoCOP', 'Medio', 'Referencia', 'Codigo', 'Estado'];



/** Menú del Sheet (solo aparece si este script está ligado al Sheet de licencias). */

function onOpen() {

  try {

    SpreadsheetApp.getUi()

      .createMenu('ARPA')

      .addItem('Crear licencias de pagos manuales', 'procesarVentasManuales')

      .addToUi();

  } catch (e) {

    Logger.log('onOpen: ' + e.message);

  }

}



function getVentasManualesSheet_() {

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  let sheet = ss.getSheetByName(VENTAS_MANUALES_SHEET_NAME_);

  if (!sheet) {

    sheet = ss.insertSheet(VENTAS_MANUALES_SHEET_NAME_);

    sheet.getRange(1, 1, 1, VENTAS_MANUALES_HEADERS_.length).setValues([VENTAS_MANUALES_HEADERS_]);

    return { sheet: sheet, creada: true };

  }

  return { sheet: sheet, creada: false };

}



/** Columnas por nombre (sin importar mayúsculas); agrega al final las que falten. */

function ensureVentasManualesHeaders_(sheet) {

  const lastCol = Math.max(sheet.getLastColumn(), 1);

  const row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const map = {};

  let used = 0;

  row.forEach(function (h, i) {

    const key = String(h || '').trim().toLowerCase();

    if (key) {

      map[key] = i;

      used = i + 1;

    }

  });

  VENTAS_MANUALES_HEADERS_.forEach(function (h) {

    const key = h.toLowerCase();

    if (map[key] != null) return;

    sheet.getRange(1, used + 1).setValue(h);

    map[key] = used;

    used += 1;

  });

  return map;

}



function isValidEmail_(email) {

  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[A-Za-z]{2,}$/.test(String(email || '').trim());

}



/** "Técnico Independiente"/"Pro" → PRO, "PYME" → PYME, "White Label"/"WL" → WL. Free no se vende a mano. */

function resolveManualPlan_(planRaw) {

  const n = trialNormalizeText_(planRaw).replace(/\s+/g, ' ');

  if (!n) return { error: 'falta el Plan' };

  if (/free|gratis|prueba|trial/.test(n)) return { error: 'el plan Free no se vende a mano' };

  if (n === 'pro' || n === 'plan pro' || n.indexOf('tecnico independiente') !== -1) return { plan: CONFIG.PLANS.PRO };

  if (n === 'pyme' || n === 'plan pyme') return { plan: CONFIG.PLANS.PYME };

  if (n === 'wl' || n === 'white label' || n === 'whitelabel' || n === 'plan white label') return { plan: CONFIG.PLANS.WL };

  return { error: 'plan desconocido "' + String(planRaw).trim() + '" (usa Técnico Independiente, Pro, PYME o White Label)' };

}



/** Revisa una fila. Sin efectos. → { vacia } | { error } | { nombre, email, plan } */

function validateVentaManual_(venta) {

  const nombre = String(venta.nombre || '').trim();

  const email = String(venta.email || '').trim().toLowerCase();

  const planRaw = String(venta.plan || '').trim();

  if (!nombre && !email && !planRaw) return { vacia: true };

  if (!nombre) return { error: 'falta el Nombre' };

  if (!email) return { error: 'falta el Email' };

  if (!isValidEmail_(email)) return { error: 'email no válido "' + email + '"' };

  const p = resolveManualPlan_(planRaw);

  if (p.error) return { error: p.error };

  return { nombre: nombre, email: email, plan: p.plan };

}



function showSheetAlert_(mensaje) {

  try {

    SpreadsheetApp.getUi().alert(mensaje);

  } catch (e) {

    Logger.log(mensaje);

  }

}



/**

 * Crea las licencias de la pestaña VentasManuales que todavía no tienen Codigo.

 * Se usa desde el menú ARPA → "Crear licencias de pagos manuales" (o Ejecutar en el editor).

 */

function procesarVentasManuales() {

  const resumen = { creadas: 0, errores: 0, codigos: [] };

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {

    showSheetAlert_('Hay otro proceso creando licencias. Espera un minuto y vuelve a intentarlo.');

    resumen.ocupado = true;

    return resumen;

  }

  try {

    const hoja = getVentasManualesSheet_();

    const sheet = hoja.sheet;

    if (hoja.creada) {

      showSheetAlert_('Se creó la pestaña "VentasManuales". Llena una fila por pago (Nombre, Email, Plan, MontoCOP, Medio y Referencia) y vuelve a usar el menú.');

      resumen.pestanaCreada = true;

      return resumen;

    }

    const col = ensureVentasManualesHeaders_(sheet);

    const values = sheet.getDataRange().getValues();

    function cell(row, key) {

      return col[key] != null && row[col[key]] != null ? row[col[key]] : '';

    }

    function setCell(rowNumber, key, value) {

      sheet.getRange(rowNumber, col[key] + 1).setValue(value);

    }

    // Referencias que ya generaron licencia (para no pagar dos veces el mismo comprobante).

    const refsUsadas = {};

    for (let i = 1; i < values.length; i++) {

      const ref = String(cell(values[i], 'referencia') || '').trim().toLowerCase();

      if (ref && String(cell(values[i], 'codigo') || '').trim()) refsUsadas[ref] = true;

    }



    for (let i = 1; i < values.length; i++) {

      const row = values[i];

      const rowNumber = i + 1;

      if (String(cell(row, 'codigo') || '').trim()) continue; // ya procesada: nunca se repite

      const v = validateVentaManual_({ nombre: cell(row, 'nombre'), email: cell(row, 'email'), plan: cell(row, 'plan') });

      if (v.vacia) continue;

      const ref = String(cell(row, 'referencia') || '').trim();

      let error = v.error;

      if (!error && ref && refsUsadas[ref.toLowerCase()]) error = 'la Referencia ' + ref + ' ya tiene una licencia en otra fila';

      if (error) {

        setCell(rowNumber, 'estado', 'ERROR: ' + error);

        resumen.errores += 1;

        debugLog_('venta_manual_error', { fila: rowNumber, motivo: error });

        continue;

      }



      const hoy = new Date();

      const codigo = generateCode_(v.plan.prefix);

      const vencimiento = addDays_(hoy, v.plan.days);

      appendLicenseRow_({

        CODIGO: codigo,

        PLAN: v.plan.planLabel,

        CLIENTE: v.nombre,

        EMAIL: v.email,

        VENCIMIENTO: vencimiento,

        ACTIVO: 'SI',

      });

      // El Codigo se escribe apenas existe la licencia: aunque el correo falle, la fila no se repite.

      setCell(rowNumber, 'codigo', codigo);

      if (!cell(row, 'fecha')) setCell(rowNumber, 'fecha', hoy);

      setCell(rowNumber, 'estado', 'Licencia creada, enviando correo…');

      if (ref) refsUsadas[ref.toLowerCase()] = true;

      SpreadsheetApp.flush();

      debugLog_('venta_manual_licencia', {

        fila: rowNumber, codigo: codigo, plan: v.plan.planLabel, email: v.email,

        montoCOP: cell(row, 'montocop'), medio: cell(row, 'medio'), referencia: ref

      });



      try {

        sendActivationEmail_(v.email, v.nombre, v.plan, codigo, vencimiento);

        setCell(rowNumber, 'estado', 'Enviado ' + formatDateEs_(hoy));

        resumen.creadas += 1;

        resumen.codigos.push(codigo);

      } catch (err) {

        setCell(rowNumber, 'estado', 'ERROR: licencia ' + codigo + ' creada pero el correo falló (' + err.message + '). Envíale el código a mano.');

        resumen.errores += 1;

        debugLog_('venta_manual_correo_error', { fila: rowNumber, codigo: codigo, mensaje: err.message });

      }

    }

  } finally {

    lock.releaseLock();

  }



  let msg;

  if (!resumen.creadas && !resumen.errores) {

    msg = 'No hay ventas nuevas para procesar. (Las filas con Codigo ya fueron procesadas.)';

  } else {

    msg = 'Listo: ' + resumen.creadas + (resumen.creadas === 1 ? ' licencia creada y enviada' : ' licencias creadas y enviadas') + '.' +

      (resumen.errores ? ' ' + resumen.errores + (resumen.errores === 1 ? ' fila con error' : ' filas con error') + ': mira la columna Estado.' : '');

  }

  resumen.mensaje = msg;

  showSheetAlert_(msg);

  return resumen;

}





function generateCode_(prefix) {

  const values = getLicenseSheet_().getDataRange().getValues();

  let maxNum = 0;

  const upperPrefix = prefix.toUpperCase();



  for (let i = 1; i < values.length; i++) {

    const cod = String(values[i][0] || '').trim().toUpperCase();

    if (!cod.startsWith(upperPrefix)) continue;

    const num = parseInt(cod.slice(upperPrefix.length), 10);

    if (!isNaN(num) && num > maxNum) maxNum = num;

  }



  return prefix + String(maxNum + 1).padStart(4, '0');

}



function normalizeHeaders_(row) {

  return row.map(function (h) { return String(h).trim().toUpperCase(); });

}



function parseGumroadPayload_(e) {

  if (!e || !e.postData || !e.postData.contents) return null;

  const params = {};

  e.postData.contents.split('&').forEach(function (pair) {

    if (!pair) return;

    const eq = pair.indexOf('=');

    const key = decodeURIComponent((eq >= 0 ? pair.slice(0, eq) : pair).replace(/\+/g, ' '));

    const val = decodeURIComponent((eq >= 0 ? pair.slice(eq + 1) : '').replace(/\+/g, ' '));

    params[key] = val;

  });

  return params;

}



function wasSaleProcessed_(saleId) {

  return PropertiesService.getScriptProperties().getProperty('sale_' + saleId) === '1';

}



function markSaleProcessed_(saleId) {

  PropertiesService.getScriptProperties().setProperty('sale_' + saleId, '1');

}



function getOrCreateDebugSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName('Debug');
  if (!sheet) {
    sheet = ss.insertSheet('Debug');
    sheet.appendRow(['TIMESTAMP', 'ETAPA', 'DETALLE']);
  }
  return sheet;
}

function debugLog_(etapa, datos) {
  try {
    const sheet = getOrCreateDebugSheet_();
    sheet.appendRow([new Date(), etapa, JSON.stringify(datos)]);
  } catch (e) {
    Logger.log('debugLog_ error: ' + e.message);
  }
}



function addDays_(date, days) {

  const d = new Date(date.getTime());

  d.setDate(d.getDate() + days);

  return d;

}



function stripTime_(date) {

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());

}



function formatDateEs_(date) {

  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'America/Bogota', 'dd/MM/yyyy');

}



function formatDateIso_(date) {

  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'America/Bogota', 'yyyy-MM-dd');

}



function respondJsonp_(obj, callback) {

  const json = JSON.stringify(obj);

  if (callback) {

    return ContentService.createTextOutput(callback + '(' + json + ');')

      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  }

  return ContentService.createTextOutput(json)

    .setMimeType(ContentService.MimeType.JSON);

}



function textResponse_(message) {

  return ContentService.createTextOutput(message);

}



// ─── Tests (Editor → Run) ────────────────────────────────────────────────────



function testProvisionTrial() {

  const deviceId = 'TEST-DEVICE-' + Date.now();

  const result = provisionTrial_(deviceId);

  Logger.log(JSON.stringify(result));

}



function testValidateCode() {

  const result = validateLicense_('ARPA-PRO-001');

  Logger.log(JSON.stringify(result));

}



function testGumroadFree() {

  runTestPing_({

    product_key: 'FREE',

    price: '0',

    email: 'test-free@ejemplo.com',

    full_name: 'Usuario Free Test',

  });

}



function testGumroadPro() {

  runTestPing_({

    product_key: 'PRO',

    price: '350000',

    email: 'test-pro@ejemplo.com',

    full_name: 'Usuario Pro Test',

  });

}



function testGumroadPyme() {

  runTestPing_({

    product_key: 'PYME',

    price: '800000',

    email: 'test-pyme@ejemplo.com',

    full_name: 'Usuario PYME Test',

  });

}



function runTestPing_(opts) {

  const props = PropertiesService.getScriptProperties();

  const map = {

    FREE: props.getProperty('GUMROAD_PRODUCT_FREE') || 'TEST_FREE',

    PRO: props.getProperty('GUMROAD_PRODUCT_PRO') || 'TEST_PRO',

    PYME: props.getProperty('GUMROAD_PRODUCT_PYME') || 'TEST_PYME',

  };



  const body = [

    'seller_id=' + (props.getProperty('GUMROAD_SELLER_ID') || 'TEST_SELLER'),

    'product_id=' + map[opts.product_key],

    'product_name=ARPA Suite ' + opts.product_key,

    'email=' + encodeURIComponent(opts.email),

    'full_name=' + encodeURIComponent(opts.full_name),

    'price=' + opts.price,

    'currency=cop',

    'quantity=1',

    'sale_id=TEST_' + opts.product_key + '_' + Date.now(),

    'resource_name=sale',

    'refunded=false',

  ].join('&');



  Logger.log(doPost({ postData: { contents: body } }).getContent());

}



function testRevisarTrialsDia6() {

  revisarTrialsDia6();

}



const DEVICE_LIMITS_ = { 'Pro': 1, 'PYME': 3, 'White Label': 5 };

const DISPOSITIVOS_SHEET_NAME_ = 'Dispositivos';

const DISPOSITIVOS_HEADERS_ = ['Codigo', 'DeviceId', 'FechaActivacion'];

function checkAndRegisterDevice_(codigo, planLabel, deviceId) {
  if (!deviceId) return { ok: true };
  if (isPermanentLicense_(codigo)) return { ok: true };
  if (String(codigo).indexOf('ARPA-FREE-') === 0) return { ok: true };
  const limit = DEVICE_LIMITS_[planLabel];
  if (!limit) {
    debugLog_('device_check_plan_desconocido', { codigo: codigo, plan: planLabel });
    return { ok: true };
  }
  const sheet = getDispositivosSheet_();
  const data = sheet.getDataRange().getValues();
  const devicesForCodigo = [];
  let alreadyRegistered = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim().toUpperCase() !== codigo) continue;
    const rowDevice = String(data[i][1] || '').trim();
    devicesForCodigo.push(rowDevice);
    if (rowDevice === deviceId) alreadyRegistered = true;
  }
  if (alreadyRegistered) return { ok: true };
  if (devicesForCodigo.length >= limit) {
    return {
      ok: false,
      mensaje: 'Límite de dispositivos alcanzado para tu plan (' + limit + '). Contacta soporte para agregar otro: ' + CONFIG.SUPPORT_WHATSAPP_DISPLAY,
    };
  }
  sheet.appendRow([codigo, deviceId, new Date()]);
  return { ok: true };
}

function getDispositivosSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(DISPOSITIVOS_SHEET_NAME_);
  if (!sheet) {
    sheet = ss.insertSheet(DISPOSITIVOS_SHEET_NAME_);
    sheet.getRange(1, 1, 1, DISPOSITIVOS_HEADERS_.length).setValues([DISPOSITIVOS_HEADERS_]);
  }
  return sheet;
}

// ─── Respaldo completo en Google Drive (suite y NEXT) ──────────────────────
// Guarda archivos JSON en la carpeta "ARPA Respaldos/<licencia>/<app>/" del Drive
// del dueño del script. Solo licencias pagas activas o fundador.
// Al publicar esta versión, Google pide autorizar el acceso a Drive.

const RESPALDO_CARPETA_ = 'ARPA Respaldos';
const RESPALDO_APPS_ = ['suite', 'next'];
const RESPALDO_NOMBRE_RE_ = /^[a-z0-9][a-z0-9_.-]{0,79}$/;
const RESPALDO_MAX_BYTES_ = 20 * 1024 * 1024;
const RESPALDO_DIARIOS_A_GUARDAR_ = 30;

/** ¿Esta licencia puede guardar respaldos? Activa y no es prueba gratis. */
function licenciaPuedeRespaldar_(licencia) {
  const codigo = String(licencia || '').trim().toUpperCase();
  if (!codigo || codigo.indexOf('ARPA-FREE-') === 0) return false;
  const sheet = getLicenseSheet_();
  const data = sheet.getDataRange().getValues();
  const cols = getColumnMap_(normalizeHeaders_(data[0]));
  if (cols.codigo < 0) return false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cols.codigo] || '').trim().toUpperCase() !== codigo) continue;
    if (cols.activo < 0) return true;
    return String(data[i][cols.activo] || '').trim().toUpperCase() === 'SI';
  }
  return false;
}

function respaldoSubcarpeta_(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function respaldoCarpeta_(licencia, app) {
  const props = PropertiesService.getScriptProperties();
  let raiz = null;
  const raizId = props.getProperty('RESPALDO_FOLDER_ID');
  if (raizId) {
    try { raiz = DriveApp.getFolderById(raizId); } catch (err) { raiz = null; }
  }
  if (!raiz) {
    raiz = respaldoSubcarpeta_(DriveApp.getRootFolder(), RESPALDO_CARPETA_);
    props.setProperty('RESPALDO_FOLDER_ID', raiz.getId());
  }
  const lic = respaldoSubcarpeta_(raiz, licencia.replace(/[^A-Z0-9-]/g, ''));
  return respaldoSubcarpeta_(lic, app);
}

function respaldoValidar_(licencia, body, conNombre) {
  const app = String(body.app || '').trim().toLowerCase();
  if (RESPALDO_APPS_.indexOf(app) < 0) return { error: 'App no válida.' };
  const nombre = String(body.nombre || '').trim().toLowerCase();
  if (conNombre && !RESPALDO_NOMBRE_RE_.test(nombre)) return { error: 'Nombre de archivo no válido.' };
  if (!licenciaPuedeRespaldar_(licencia)) return { error: 'La licencia no tiene respaldo en la nube.' };
  return { app: app, nombre: nombre };
}

/** Borra los respaldos diarios más viejos (<prefijo>-AAAA-MM-DD.json), deja los últimos N. */
function respaldoPodarDiarios_(carpeta, nombreGuardado) {
  const m = /^(.*)-\d{4}-\d{2}-\d{2}\.json$/.exec(nombreGuardado);
  if (!m) return;
  const prefijo = m[1] + '-';
  const diarios = [];
  const it = carpeta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const n = f.getName();
    if (n.indexOf(prefijo) === 0 && /-\d{4}-\d{2}-\d{2}\.json$/.test(n) && n.length === nombreGuardado.length) diarios.push(f);
  }
  diarios.sort(function (a, b) { return a.getName() < b.getName() ? 1 : -1; });
  diarios.slice(RESPALDO_DIARIOS_A_GUARDAR_).forEach(function (f) { f.setTrashed(true); });
}

function respaldoGuardar_(licencia, body) {
  const v = respaldoValidar_(licencia, body, true);
  if (v.error) return { ok: false, mensaje: v.error };
  const contenido = String(body.contenido == null ? '' : body.contenido);
  if (!contenido) return { ok: false, mensaje: 'Respaldo vacío.' };
  if (contenido.length > RESPALDO_MAX_BYTES_) return { ok: false, mensaje: 'Respaldo demasiado grande.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const carpeta = respaldoCarpeta_(licencia, v.app);
    const it = carpeta.getFilesByName(v.nombre);
    let file;
    if (it.hasNext()) {
      file = it.next();
      file.setContent(contenido);
    } else {
      file = carpeta.createFile(v.nombre, contenido, 'application/json');
    }
    respaldoPodarDiarios_(carpeta, v.nombre);
    return { ok: true, nombre: v.nombre, bytes: contenido.length, actualizado: file.getLastUpdated().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function respaldoListar_(licencia, body) {
  const v = respaldoValidar_(licencia, body, false);
  if (v.error) return { ok: false, mensaje: v.error };
  const carpeta = respaldoCarpeta_(licencia, v.app);
  const archivos = [];
  const it = carpeta.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    archivos.push({ nombre: f.getName(), bytes: f.getSize(), actualizado: f.getLastUpdated().toISOString() });
  }
  archivos.sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; });
  return { ok: true, archivos: archivos };
}

function respaldoLeer_(licencia, body) {
  const v = respaldoValidar_(licencia, body, true);
  if (v.error) return { ok: false, mensaje: v.error };
  const it = respaldoCarpeta_(licencia, v.app).getFilesByName(v.nombre);
  if (!it.hasNext()) return { ok: false, mensaje: 'No existe ese respaldo.' };
  return { ok: true, nombre: v.nombre, contenido: it.next().getBlob().getDataAsString('UTF-8') };
}
