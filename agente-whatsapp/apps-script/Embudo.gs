/**
 * Contador de clientes (pedido por Arlen el 10-nov-2026): cuántos escriben, qué preguntan,
 * a cuántos se les cotizó, cuántos compraron y cuántos solo preguntaron ("mirones").
 *
 * Arlen NO tiene que marcar nada: la venta se detecta sola con
 *   - los archivos que Arlen manda desde su celular (la cuenta de cobro de ARPA Suite = venta;
 *     la cotización "Cotizacion_<número>_<cliente>.pdf" = cotizado),
 *   - lo que escribe Arlen ("gracias por su compra", "quedó instalado"…),
 *   - lo que escribe el cliente ("ya le consigné", "¿cuándo vienen?", "mi dirección es…")
 *     o la foto que manda después de una cotización (posible comprobante).
 *
 * Funciones para correr a mano (una sola vez):
 *   activarInformes()  → informe diario (7 p. m.) y semanal (lunes 7 a. m.) al CORREO_ARLEN.
 *   informeDiario() / informeSemanal() → mandarlo ya, para probar.
 *
 * La parte de arriba es lógica pura (se prueba en Node). Los datos de clientes solo van al correo
 * de Arlen; el bloque "para Gemini" lleva únicamente números totales.
 */

var EMBUDO_HORA_DIARIO = 19;
var EMBUDO_FILAS_MAX = 6000;
var DIA_MS = 86400000;
var OFFSET_CO_MS = 5 * 3600000;

// Todo se compara en minúsculas y sin tildes (normalizar_).
var SENALES_VENTA_CLIENTE = /(ya (le |les )?(consigne|transferi|pague|hice (el|la) (pago|transferencia|consignacion))|comprobante|soporte de pago|consignacion|cuando (vienen|pueden venir|me lo instalan|lo instalan|instalan)|para cuando (lo )?(pueden|instalan)|le (mando|envio|paso) (la|mi) direccion|mi direccion es|lo compro|me lo llevo|quiero comprarlo|hagale pues|dele pues|cerramos el negocio|agendemos|agendamos)/;
var SENALES_VENTA_ARLEN = /(vendid|gracias por (su|la|tu) compra|gracias por preferirnos|quedo instalad|ya quedo (instalado|funcionando|listo)|recibi (el|su|tu) pago|pago recibido)/;
var SENALES_COTIZA_ARLEN = /(cotizacion|le (envio|comparto|mando) la (cotiz|propuesta)|\$\s?\d{1,3}([.\s]\d{3})+)/;
var ARCHIVO_VENTA = /(cuenta.?(de.?)?cobro|factura)/;
var ARCHIVO_COTIZA = /(cotizacion|estimate)/;
var TEMAS_EMBUDO = [
  ['precio', /(cuanto|precio|valor|cuesta|costo|vale)/],
  ['instalación', /instal/],
  ['controles y accesorios', /(control|llaver|fotocelda|tarjeta|bateria)/],
  ['reparación o mantenimiento', /(repar|dano|no abre|no cierra|no funciona|mantenim|revis)/],
  ['envío a otra ciudad', /(envio|envian|coordinadora|otra ciudad|mandan a)/]
];

/** Inicio del día en Colombia (UTC-5) para un instante dado. */
function inicioDiaColombia_(ms) {
  return Math.floor((ms - OFFSET_CO_MS) / DIA_MS) * DIA_MS + OFFSET_CO_MS;
}

/** Archivo que Arlen mandó (se guarda en la nota del eco como "archivo=…"). */
function archivoDeNota_(nota) {
  var m = /archivo=([^;]*)/.exec(String(nota || ''));
  return m ? m[1] : '';
}

/**
 * Agrupa las filas por chat y dice en qué quedó cada uno hasta hastaMs.
 * Solo devuelve los chats con movimiento en [desdeMs, hastaMs).
 * filas: [{ ms, negocio, cliente, nombre, rol, tipo, texto, nota }]
 */
function clasificarChats_(filas, desdeMs, hastaMs) {
  var chats = {};
  filas.forEach(function (f) {
    if (!f || !f.cliente || !(f.ms <= hastaMs)) return;
    var clave = f.negocio + '|' + f.cliente;
    (chats[clave] = chats[clave] || { negocio: f.negocio, cliente: String(f.cliente), nombre: '', filas: [] }).filas.push(f);
    if (f.nombre) chats[clave].nombre = f.nombre;
  });

  var salida = [];
  Object.keys(chats).forEach(function (clave) {
    var c = chats[clave];
    c.filas.sort(function (a, b) { return a.ms - b.ms; });
    var delCliente = c.filas.filter(function (f) { return f.rol === 'cliente'; });
    if (!delCliente.length) return; // chats que solo abrió Arlen no cuentan como clientes que escribieron
    var primera = delCliente[0].ms;
    var escribioEnPeriodo = delCliente.some(function (f) { return f.ms >= desdeMs; });

    var cotizadoMs = 0;
    var ventaConfirmadaMs = 0;
    var ventaProbableMs = 0;
    var pasadoArlen = false;
    var temas = {};
    c.filas.forEach(function (f) {
      var t = normalizar_(f.texto);
      var archivo = normalizar_(archivoDeNota_(f.nota));
      if (f.rol === 'arlen') {
        if (ARCHIVO_VENTA.test(archivo) || SENALES_VENTA_ARLEN.test(t)) ventaConfirmadaMs = ventaConfirmadaMs || f.ms;
        else if (ARCHIVO_COTIZA.test(archivo) || f.tipo === 'document' || SENALES_COTIZA_ARLEN.test(t)) cotizadoMs = cotizadoMs || f.ms;
      } else if (f.rol === 'cliente') {
        if (/handoff_/.test(String(f.nota || ''))) pasadoArlen = true;
        if (SENALES_VENTA_CLIENTE.test(t)) ventaProbableMs = ventaProbableMs || f.ms;
        else if (cotizadoMs && (f.tipo === 'image' || f.tipo === 'document') && f.ms > cotizadoMs) {
          ventaProbableMs = ventaProbableMs || f.ms; // foto o PDF después de la cotización: posible comprobante
        }
        if (f.ms >= desdeMs) {
          TEMAS_EMBUDO.forEach(function (par) { if (par[1].test(t)) temas[par[0]] = true; });
        }
      }
    });

    var ventaEnPeriodo = (ventaConfirmadaMs && ventaConfirmadaMs >= desdeMs) || (ventaProbableMs && ventaProbableMs >= desdeMs);
    if (!escribioEnPeriodo && !ventaEnPeriodo) return;

    var estado = ventaConfirmadaMs ? 'venta'
      : ventaProbableMs ? 'venta_probable'
        : cotizadoMs ? 'cotizado'
          : pasadoArlen ? 'pasado_a_arlen'
            : 'solo_pregunto';
    salida.push({
      negocio: c.negocio,
      cliente: c.cliente,
      nombre: c.nombre,
      nuevo: primera >= desdeMs,
      escribioEnPeriodo: escribioEnPeriodo,
      estado: estado,
      temas: Object.keys(temas)
    });
  });
  return salida;
}

/** Cuenta los chats clasificados. */
function resumenEmbudo_(chats) {
  var r = { escribieron: 0, nuevos: 0, cotizados: 0, ventas: 0, ventasProbables: 0, pasadosArlen: 0, soloPreguntaron: 0, temas: {} };
  chats.forEach(function (c) {
    if (c.escribioEnPeriodo) r.escribieron += 1;
    if (c.nuevo) r.nuevos += 1;
    if (c.estado === 'venta') r.ventas += 1;
    else if (c.estado === 'venta_probable') r.ventasProbables += 1;
    else if (c.estado === 'cotizado') r.cotizados += 1;
    else if (c.estado === 'pasado_a_arlen') r.pasadosArlen += 1;
    else r.soloPreguntaron += 1;
    c.temas.forEach(function (t) { r.temas[t] = (r.temas[t] || 0) + 1; });
  });
  return r;
}

function lineasResumen_(r) {
  var temas = Object.keys(r.temas).sort(function (a, b) { return r.temas[b] - r.temas[a]; })
    .map(function (t) { return r.temas[t] + ' ' + t; });
  return [
    '  Escribieron: ' + r.escribieron + ' (nuevos: ' + r.nuevos + ')',
    '  Compraron: ' + r.ventas + (r.ventasProbables ? ' + ' + r.ventasProbables + ' casi seguro' : ''),
    '  Cotizados, esperando respuesta: ' + r.cotizados,
    '  Pasados a usted, sin cotizar todavía: ' + r.pasadosArlen,
    '  Solo preguntaron (mirones): ' + r.soloPreguntaron,
    '  Qué preguntaron: ' + (temas.length ? temas.join(', ') : '—')
  ];
}

/**
 * Texto del informe para el correo de Arlen.
 * opciones: { titulo, negocios: {clave: nombre}, preguntarVentas: bool, bloqueGemini: bool }
 */
function textoInformeEmbudo_(chats, opciones) {
  opciones = opciones || {};
  var nombres = opciones.negocios || {};
  var claves = [];
  chats.forEach(function (c) { if (claves.indexOf(c.negocio) === -1) claves.push(c.negocio); });
  var total = resumenEmbudo_(chats);
  var lineas = [opciones.titulo || 'Resumen de WhatsApp', ''];
  if (!chats.length) {
    lineas.push('No escribió ningún cliente en este periodo.');
    return lineas.join('\n');
  }
  claves.forEach(function (k) {
    lineas.push((nombres[k] || k) + ':');
    lineas = lineas.concat(lineasResumen_(resumenEmbudo_(chats.filter(function (c) { return c.negocio === k; }))));
    lineas.push('');
  });
  var probables = chats.filter(function (c) { return c.estado === 'venta_probable'; });
  if (opciones.preguntarVentas && probables.length) {
    lineas.push('Estos parecen ventas. Si alguno NO compró, dígaselo al gerente (PC o celular); si no dice nada, quedan como venta:');
    probables.forEach(function (c) {
      lineas.push('  - ' + (c.nombre || '(sin nombre)') + ' +' + c.cliente + ' (' + (nombres[c.negocio] || c.negocio) + ')');
    });
    lineas.push('');
  }
  if (opciones.bloqueGemini) {
    lineas.push('Para Gemini (solo números, sin datos de clientes):');
    lineas.push('  escribieron=' + total.escribieron + '; nuevos=' + total.nuevos + '; compraron=' + total.ventas +
      '; casi_seguro=' + total.ventasProbables + '; cotizados=' + total.cotizados +
      '; pasados_a_arlen=' + total.pasadosArlen + '; solo_preguntaron=' + total.soloPreguntaron +
      '; temas=' + JSON.stringify(total.temas));
    lineas.push('');
  }
  lineas.push('Esto lo cuenta el asistente solo: usted no tiene que marcar nada.');
  return lineas.join('\n');
}

/* ---------- Apps Script (lee la hoja y manda el correo) ---------- */

function leerFilasEmbudo_(config) {
  var hoja = hojaConversaciones_(config);
  var ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  var desde = Math.max(2, ultima - EMBUDO_FILAS_MAX + 1);
  return hoja.getRange(desde, 1, ultima - desde + 1, COLUMNAS.length).getValues().map(function (f) {
    return { ms: Number(f[1]), negocio: f[2], cliente: String(f[4] || ''), nombre: String(f[5] || ''),
      rol: f[6], tipo: f[7], texto: String(f[8] || ''), nota: String(f[10] || '') };
  });
}

function nombresNegocios_() {
  var n = {};
  Object.keys(NEGOCIOS).forEach(function (k) { n[k] = NEGOCIOS[k].nombre || k; });
  return n;
}

function informeDiario() {
  var config = leerConfig_();
  var ahora = Date.now();
  var chats = clasificarChats_(leerFilasEmbudo_(config), inicioDiaColombia_(ahora), ahora);
  if (!chats.length) return; // día sin clientes: no se manda correo
  var r = resumenEmbudo_(chats);
  enviarCorreo_(config, 'WhatsApp hoy: ' + r.escribieron + ' escribieron, ' + r.ventas + ' compraron',
    textoInformeEmbudo_(chats, { titulo: 'Resumen de WhatsApp de hoy, ' + fechaLegible_(ahora), negocios: nombresNegocios_() }));
}

function informeSemanal() {
  var config = leerConfig_();
  var ahora = Date.now();
  var desde = inicioDiaColombia_(ahora) - 7 * DIA_MS;
  var chats = clasificarChats_(leerFilasEmbudo_(config), desde, ahora);
  var r = resumenEmbudo_(chats);
  enviarCorreo_(config, 'WhatsApp la semana: ' + r.escribieron + ' escribieron, ' + (r.ventas + r.ventasProbables) + ' compraron',
    textoInformeEmbudo_(chats, { titulo: 'Resumen de WhatsApp de los últimos 7 días', negocios: nombresNegocios_(),
      preguntarVentas: true, bloqueGemini: true }));
}

/** Una sola vez: programa el informe diario (7 p. m.) y el semanal (lunes 7 a. m.). */
function activarInformes() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'informeDiario' || f === 'informeSemanal') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('informeDiario').timeBased().everyDays(1).atHour(EMBUDO_HORA_DIARIO)
    .inTimezone(CONTESTADOR_DEFAULTS.ZONA_HORARIA).create();
  ScriptApp.newTrigger('informeSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7)
    .inTimezone(CONTESTADOR_DEFAULTS.ZONA_HORARIA).create();
  console.log('Listo: informe diario a las ' + EMBUDO_HORA_DIARIO + ' h y semanal los lunes a las 7 h.');
}
