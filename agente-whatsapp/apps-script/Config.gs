/**
 * Contestador de WhatsApp de ARPA — configuración.
 *
 * Todas las claves y datos sensibles viven SOLO en Script Properties
 * (Proyecto de Apps Script → Configuración del proyecto → Propiedades del script).
 * Aquí no hay ninguna clave, token ni URL de despliegue.
 *
 * Propiedades que usa (ver README.md):
 *   ASISTENTE_ACTIVO        SI / NO. Interruptor general. Si no dice SI, no responde a nadie.
 *   MODO_BORRADOR           SI / NO. Con SI no envía nada al cliente: le manda a Arlen el borrador por correo.
 *   CLAUDE_API_KEY          Clave de la API de Claude (Anthropic).
 *   CLAUDE_MODELO           Opcional. Por defecto claude-sonnet-5-5.
 *   META_TOKEN              Token permanente de Meta (usuario del sistema) para la Cloud API.
 *   META_TOKEN_<NEGOCIO>    Opcional. Token distinto para un negocio (p. ej. META_TOKEN_ARPASUITE).
 *   META_API_VERSION        Opcional. Por defecto v24.0.
 *   VERIFY_TOKEN            Palabra secreta que se pega en Meta al registrar el webhook.
 *   RELAY_TOKEN             Palabra secreta compartida con el intermediario (Cloudflare Worker).
 *   PERMITIR_SIN_RELAY      SI / NO. Con NO (por defecto) solo acepta mensajes que traen RELAY_TOKEN.
 *   PHONE_ID_AUTOMATISMOS   phone_number_id de Meta del 300 568 3914.
 *   PHONE_ID_ARPASUITE      phone_number_id de Meta del 301 609 2542 (cuando se active).
 *   LINK_PRUEBA_ARPASUITE   Link de la prueba gratis de la app (el ?start=1 de producción). Sin él, se manda la página principal.
 *   CORREO_ARLEN            Correo donde llegan los avisos de "pasar a Arlen".
 *   SILENCIO_HORAS          Opcional. Horas que se calla en un chat después de que Arlen escribe. Por defecto 12.
 *   NUMEROS_EXCLUIDOS       Opcional. Números que nunca se responden, separados por coma (573001112233,...).
 *   FESTIVOS_EXTRA          Opcional. Fechas AAAA-MM-DD sin atención, separadas por coma.
 *   SHEET_ID_CONTESTADOR    Lo escribe configurar(). Es la hoja PROPIA del contestador.
 */

var CONTESTADOR_DEFAULTS = {
  CLAUDE_MODELO: 'claude-sonnet-5-5',
  CLAUDE_MAX_TOKENS: 4000,
  CLAUDE_EFFORT: 'low',
  META_API_VERSION: 'v24.0',
  SILENCIO_HORAS: 12,
  HISTORIAL_MENSAJES: 20,
  MAX_ANTIGUEDAD_MIN: 120,
  AVISO_MEDIA_MIN: 15,
  AVISO_HANDOFF_HORAS: 6,
  ZONA_HORARIA: 'America/Bogota'
};

/** Lee una propiedad del script (o '' si no existe). */
function prop_(nombre) {
  var v = PropertiesService.getScriptProperties().getProperty(nombre);
  return v == null ? '' : String(v).trim();
}

function propNumero_(nombre, porDefecto) {
  var v = parseFloat(prop_(nombre));
  return isNaN(v) ? porDefecto : v;
}

function propSi_(nombre) {
  return /^(si|sí|yes|true|1)$/i.test(prop_(nombre));
}

/** Arma la configuración de ejecución leyendo Script Properties. */
function leerConfig_() {
  return {
    activo: propSi_('ASISTENTE_ACTIVO'),
    borrador: propSi_('MODO_BORRADOR'),
    claudeKey: prop_('CLAUDE_API_KEY'),
    modelo: prop_('CLAUDE_MODELO') || CONTESTADOR_DEFAULTS.CLAUDE_MODELO,
    metaVersion: prop_('META_API_VERSION') || CONTESTADOR_DEFAULTS.META_API_VERSION,
    verifyToken: prop_('VERIFY_TOKEN'),
    relayToken: prop_('RELAY_TOKEN'),
    permitirSinRelay: propSi_('PERMITIR_SIN_RELAY'),
    correoArlen: prop_('CORREO_ARLEN'),
    silencioHoras: propNumero_('SILENCIO_HORAS', CONTESTADOR_DEFAULTS.SILENCIO_HORAS),
    excluidos: listaNumeros_(prop_('NUMEROS_EXCLUIDOS')),
    festivosExtra: prop_('FESTIVOS_EXTRA').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    phoneIds: {
      automatismos: prop_('PHONE_ID_AUTOMATISMOS'),
      arpasuite: prop_('PHONE_ID_ARPASUITE')
    },
    sheetId: prop_('SHEET_ID_CONTESTADOR')
  };
}

/** Token de Meta para un negocio: META_TOKEN_<NEGOCIO> o, si no hay, META_TOKEN. */
function metaToken_(negocioClave) {
  return prop_('META_TOKEN_' + String(negocioClave || '').toUpperCase()) || prop_('META_TOKEN');
}
