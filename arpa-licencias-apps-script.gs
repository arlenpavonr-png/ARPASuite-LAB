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
 * Prefijos: ARPA-FREE- | ARPA-PRO- | ARPA-PYME- | ARPA-WL- | ARPA-FOUNDER-7X9K2M4QZ1 (fundador, permanente)

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
 */

const CONFIG = {

  SHEET_ID: '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',

  SHEET_NAME: 'Hoja 1',

  APP_URL: 'https://arlenpavonr-png.github.io/Formato-Arlenpav/',

  MANUAL_URL: 'https://arlenpavonr-png.github.io/Formato-Arlenpav/manual.html',

  SUPPORT_WHATSAPP: '573005683914',

  SUPPORT_WHATSAPP_DISPLAY: '+57 300-568-3914',

  EMAIL_FROM_NAME: 'ARPA Technology Global',

  PLANS: {

    FREE: { prefix: 'ARPA-FREE-', planLabel: 'Free', days: 7 },

    PRO:  { prefix: 'ARPA-PRO-',  planLabel: 'Pro',  days: 365 },

    PYME: { prefix: 'ARPA-PYME-', planLabel: 'PYME', days: 365 },

    WL:   { prefix: 'ARPA-WL-',   planLabel: 'White Label', days: 365 },

  },

  /** Licencia fundador — nunca expira, exenta de bloqueos. */
  FOUNDER_CODE: 'ARPA-FOUNDER-7X9K2M4QZ1',

  EMPRESAS_SHEET_NAME: 'Empresas',

  CATALOGO_SHEET_NAME: 'Catalogo',

  HISTORIAL_SHEET_NAME: 'Historial',

  TRIALS_SHEET_NAME: 'Trials',

  TRIAL_NOTIFY_EMAIL: 'support@arpatechnologyglobal.com',

  /** Link Gumroad plan Técnico Independiente ($83 USD) — actualizar si cambia */
  TRIAL_UPGRADE_GUMROAD_URL: 'https://arpatechnologyglobal.com/',

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

          founder: codigo === CONFIG.FOUNDER_CODE,

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

    founder: codigo === CONFIG.FOUNDER_CODE,

    white_label: String(codigo || '').indexOf('ARPA-WL-') === 0,

  };

}



function isPermanentLicense_(codigo) {

  const c = String(codigo || '').trim().toUpperCase();

  return c === CONFIG.FOUNDER_CODE;

}



/** Ejecutar una vez en Apps Script para registrar el código founder en el Sheet. */
function seedFounderLicense() {

  const codigo = CONFIG.FOUNDER_CODE;

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



const CATALOGO_HEADERS_ = ['Licencia', 'ProductoId', 'Codigo', 'Nombre', 'Precio', 'Unidad', 'Marca', 'Categoria'];



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

  if (accion === 'siguientenumero') {

    return respondJson_(siguienteNumero_(licencia, body.tipo, body.clienteUltimo));

  }



  return null;

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

  const sheet = getCatalogoSheet_();

  deleteRowsForLicencia_(sheet, licencia);



  const list = Array.isArray(productos) ? productos : [];

  if (!list.length) {

    return { ok: true, count: 0 };

  }



  const rows = list.map(function (p) {

    return [

      licencia,

      String(p.id || ''),

      String(p.cod || p.codigo || ''),

      String(p.nom || p.nombre || ''),

      Number(p.pvp != null ? p.pvp : p.precio) || 0,

      String(p.unidad || ''),

      String(p.marca || ''),

      String(p.categoria || p.category || 'General')

    ];

  });



  const startRow = sheet.getLastRow() + 1;

  sheet.getRange(startRow, 1, startRow + rows.length - 1, CATALOGO_HEADERS_.length).setValues(rows);

  return { ok: true, count: rows.length };

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



const TRIALS_HEADERS_ = ['Nombre', 'Oficio', 'Telefono', 'FechaInicio', 'FechaVencimiento', 'TrialId', 'Notificado', 'Convertido'];



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

  if (first === 'Nombre') return getTrialsColumnMap_(row);

  sheet.getRange(1, 1, 1, TRIALS_HEADERS_.length).setValues([TRIALS_HEADERS_]);

  return getTrialsColumnMap_(TRIALS_HEADERS_);

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

  sheet.appendRow(row);

  return { ok: true };

}



function normalizePhoneForWaMe_(telefono) {

  let digits = String(telefono || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 10) digits = '57' + digits;

  if (digits.length === 11 && digits.charAt(0) === '3') digits = '57' + digits;

  return digits;

}



function buildTrialDay6WhatsAppMessage_(nombre) {

  const gumroad = CONFIG.TRIAL_UPGRADE_GUMROAD_URL || 'https://arpatechnologyglobal.com/';

  const first = String(nombre || '').trim().split(/\s+/)[0];

  const saludo = first ? ('Hola ' + first + '! ') : 'Hola! ';

  return saludo + 'Vi que llevas usando ARPA Suite estos días. ¿Cómo te ha ido con las cotizaciones? Mañana se vence tu prueba gratis. Si te sirvió, el plan Técnico Independiente queda en $83 USD pago único, de por vida. ¿Quieres que te ayude a activarlo? Aquí está el link: ' + gumroad;

}



function buildTrialWhatsAppLink_(telefono, message) {

  const phone = normalizePhoneForWaMe_(telefono);

  if (!phone) return '';

  const text = encodeURIComponent(message || buildTrialDay6WhatsAppMessage_());

  return 'https://wa.me/' + phone + '?text=' + text;

}



/**

 * Revisar trials en día 6 (FechaInicio + 6 días). Marca Notificado y envía email con links WA.

 * Configurar trigger: Time-driven → Day timer → 8am-9am → revisarTrialsDia6

 */

function revisarTrialsDia6() {

  const sheet = getTrialsSheet_();

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return;



  const today = stripTime_(new Date());

  const col = ensureTrialsSheetHeaders_(sheet);

  const leads = [];



  for (let i = 1; i < values.length; i++) {

    const nombre = String(values[i][col.nombre != null ? col.nombre : 0] || '').trim();

    const oficio = String(values[i][col.oficio != null ? col.oficio : 1] || '').trim();

    const telefono = String(values[i][col.telefono != null ? col.telefono : 2] || '').trim();

    const fechaInicioRaw = values[i][col.fechainicio != null ? col.fechainicio : 3];

    const notificado = String(values[i][col.notificado != null ? col.notificado : 6] || '').trim();

    if (!telefono || notificado) continue;



    let fechaInicio = null;

    if (fechaInicioRaw instanceof Date) {

      fechaInicio = stripTime_(fechaInicioRaw);

    } else {

      fechaInicio = parseDateFromIsoString_(String(fechaInicioRaw || ''));

      if (fechaInicio) fechaInicio = stripTime_(fechaInicio);

    }

    if (!fechaInicio) continue;



    const day6 = stripTime_(addDays_(fechaInicio, 6));

    if (day6.getTime() !== today.getTime()) continue;



    const message = buildTrialDay6WhatsAppMessage_(nombre);

    const waLink = buildTrialWhatsAppLink_(telefono, message);

    sheet.getRange(i + 1, (col.notificado != null ? col.notificado : 6) + 1).setValue('Si');

    leads.push({

      nombre: nombre,

      oficio: oficio,

      telefono: telefono,

      trialId: String(values[i][col.trialid != null ? col.trialid : 5] || ''),

      waLink: waLink

    });

  }



  if (!leads.length) return;



  const lines = leads.map(function (lead, idx) {

    const label = (lead.nombre || 'Sin nombre') +

      (lead.oficio ? ' · ' + lead.oficio : '') +

      ' · ' + lead.telefono +

      (lead.trialId ? ' (' + lead.trialId + ')' : '');

    return (idx + 1) + '. ' + label + ' — <a href="' + lead.waLink + '">Abrir WhatsApp</a>';

  });



  const htmlBody =

    '<p>Hola,</p>' +

    '<p>Estos usuarios de trial están en <strong>día 6</strong> (vence mañana). Contactar por WhatsApp:</p>' +

    '<ul><li>' + lines.join('</li><li>') + '</li></ul>' +

    '<p>Ejemplo de mensaje al cliente (personalizado con nombre):</p>' +

    '<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444;">' +

    buildTrialDay6WhatsAppMessage_('Juan').replace(/</g, '&lt;') +

    '</blockquote>';



  MailApp.sendEmail({

    to: CONFIG.TRIAL_NOTIFY_EMAIL,

    subject: 'ARPA Suite — Leads para contactar hoy (día 6)',

    htmlBody: htmlBody

  });

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


