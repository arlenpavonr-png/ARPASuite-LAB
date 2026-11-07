/**
 * Lógica pura del contestador (sin llamadas a Google, Meta ni Claude).
 * Todo lo de este archivo se prueba en Node (agente-whatsapp/tests y agente-whatsapp/ensayo).
 */

var DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
var MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Festivos de Colombia (Ley Emiliani). Actualizar cada año o usar FESTIVOS_EXTRA.
var FESTIVOS_CO = [
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
  '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
  '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26', '2027-05-01',
  '2027-05-10', '2027-05-31', '2027-06-07', '2027-07-05', '2027-07-20', '2027-08-07',
  '2027-08-16', '2027-10-18', '2027-11-01', '2027-11-15', '2027-12-08', '2027-12-25'
];

var TIPOS_MEDIA = ['image', 'video', 'audio', 'document', 'location', 'contacts'];
var TIPOS_IGNORADOS = ['reaction', 'sticker', 'unsupported', 'system', 'ephemeral', 'request_welcome', 'order'];

/** Deja solo dígitos ("+57 300 568 3914" → "573005683914"). */
function soloDigitos_(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

function listaNumeros_(texto) {
  return String(texto || '').split(/[,;\n]+/).map(soloDigitos_).filter(Boolean);
}

/** Minúsculas y sin tildes, para comparar palabras. */
function normalizar_(s) {
  return String(s || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u');
}

/**
 * Convierte el JSON que manda Meta en una lista simple de eventos.
 * Ignora estados (enviado/entregado/leído) y los webhooks de sincronización.
 */
function parsearWebhook_(payload) {
  var eventos = [];
  var entradas = (payload && payload.entry) || [];
  entradas.forEach(function (entrada) {
    (entrada.changes || []).forEach(function (cambio) {
      var v = cambio.value || {};
      var pnid = String((v.metadata && v.metadata.phone_number_id) || '');
      if (cambio.field === 'messages') {
        var nombres = {};
        (v.contacts || []).forEach(function (c) {
          nombres[soloDigitos_(c.wa_id)] = (c.profile && c.profile.name) || '';
        });
        (v.messages || []).forEach(function (m) {
          var from = soloDigitos_(m.from);
          eventos.push({
            tipo: 'mensaje',
            phoneNumberId: pnid,
            cliente: from,
            nombre: nombres[from] || '',
            wamid: String(m.id || ''),
            timestampMs: parseInt(m.timestamp, 10) * 1000 || 0,
            msgTipo: String(m.type || ''),
            texto: textoDeMensaje_(m),
            mediaId: mediaId_(m)
          });
        });
        // v.statuses se ignora a propósito.
      } else if (cambio.field === 'smb_message_echoes') {
        // Coexistencia: mensajes que Arlen escribe desde la app WhatsApp Business.
        (v.message_echoes || []).forEach(function (m) {
          eventos.push({
            tipo: 'eco',
            phoneNumberId: pnid,
            cliente: soloDigitos_(m.to),
            nombre: '',
            wamid: String(m.id || ''),
            timestampMs: parseInt(m.timestamp, 10) * 1000 || 0,
            msgTipo: String(m.type || ''),
            texto: textoDeMensaje_(m),
            mediaId: ''
          });
        });
      }
    });
  });
  return eventos;
}

function textoDeMensaje_(m) {
  switch (m.type) {
    case 'text': return (m.text && m.text.body) || '';
    case 'button': return (m.button && m.button.text) || '';
    case 'interactive':
      var i = m.interactive || {};
      return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
    case 'image': case 'video': case 'document':
      return (m[m.type] && m[m.type].caption) || '';
    case 'location':
      var l = m.location || {};
      return [l.name, l.address].filter(Boolean).join(' - ');
    default: return '';
  }
}

function mediaId_(m) {
  var bloque = m && m[m.type];
  return (bloque && bloque.id) ? String(bloque.id) : '';
}

/** Hora de Colombia (UTC-5, sin horario de verano) a partir de milisegundos UTC. */
function horaColombia_(ms) {
  var d = new Date(ms - 5 * 3600 * 1000);
  return {
    anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(),
    diaSemana: d.getUTCDay(), hora: d.getUTCHours(), minuto: d.getUTCMinutes(),
    ymd: d.toISOString().slice(0, 10)
  };
}

function esDiaHabil_(ms, horario, festivosExtra) {
  var h = horaColombia_(ms);
  if (horario.dias.indexOf(h.diaSemana) === -1) return false;
  if (FESTIVOS_CO.indexOf(h.ymd) !== -1) return false;
  if ((festivosExtra || []).indexOf(h.ymd) !== -1) return false;
  return true;
}

/**
 * ¿Cuándo le responde Arlen a un caso que se le pasa ahora?
 * Devuelve { enHorario, cuando } con frases como "hoy mismo", "mañana a primera hora",
 * "el lunes a primera hora".
 */
function cuandoResponde_(ms, horario, festivosExtra) {
  var h = horaColombia_(ms);
  var habilHoy = esDiaHabil_(ms, horario, festivosExtra);
  var enHorario = habilHoy && h.hora >= horario.desde && h.hora < horario.hasta;
  if (habilHoy && h.hora < horario.desde) {
    return { enHorario: false, cuando: 'hoy a partir de las ' + horario.desde + ' a. m.' };
  }
  if (enHorario && h.hora < horario.hasta - 1) {
    return { enHorario: true, cuando: 'hoy mismo' };
  }
  // Buscar el siguiente día hábil.
  for (var i = 1; i <= 10; i += 1) {
    var ms2 = ms + i * 24 * 3600 * 1000;
    if (esDiaHabil_(ms2, horario, festivosExtra)) {
      if (i === 1) return { enHorario: enHorario, cuando: 'mañana a primera hora' };
      return { enHorario: enHorario, cuando: 'el ' + DIAS_ES[horaColombia_(ms2).diaSemana] + ' a primera hora' };
    }
  }
  return { enHorario: enHorario, cuando: 'el siguiente día hábil' };
}

function fechaLegible_(ms) {
  var h = horaColombia_(ms);
  var hora12 = h.hora % 12 === 0 ? 12 : h.hora % 12;
  var mm = (h.minuto < 10 ? '0' : '') + h.minuto;
  return DIAS_ES[h.diaSemana] + ' ' + h.dia + ' de ' + MESES_ES[h.mes] + ' de ' + h.anio +
    ', ' + hora12 + ':' + mm + (h.hora < 12 ? ' a. m.' : ' p. m.');
}

/**
 * ¿Este mensaje del cliente se le pasa a Arlen? Reglas fijas, aparte de lo que decida Claude.
 * ctx.tieneFotos: el cliente ya mandó fotos en este chat.
 */
function decidirHandoff_(texto, ctx) {
  var t = normalizar_(texto);
  ctx = ctx || {};
  var reglas = [
    ['precio_instalacion', function () {
      return /(cuanto|precio|valor|cobra|cuesta|vale|sale|cotiz|presupuesto)/.test(t) &&
        /(instal|mano de obra|montaje|montar|ponerl|colocar|colocarl)/.test(t);
    }],
    ['visita', function () {
      return /\bvisita|agendar|\bagenda|\bcita\b|pueden venir|puede venir|vengan|venir a (mirar|ver)|pasar a (mirar|ver)/.test(t);
    }],
    ['compra', function () {
      return /\b(comprar|compro|lo quiero|la quiero|me lo llevo|quiero (el|ese|uno|un) motor|como (le )?pago|donde pago|anticipo|consign|transferencia|cuenta bancaria|nequi|daviplata|separar(lo|la)?)\b/.test(t);
    }],
    ['persona', function () {
      return /(hablar con|una persona|un humano|asesor|alguien real|con arlen|llamame|llameme|me llaman|me puede llamar|me pueden llamar|eres (un )?(robot|bot)|es (un )?(robot|bot))/.test(t);
    }],
    ['molesto', function () {
      return /(molest|pesimo|terrible|estafa|ladron|nadie (me )?responde|no responden|no contestan|queja|reclamo|demanda|mal servicio|no me (vuelvan a )?escrib|groser|incumpl|enojad|furios|indignad|que falta de)/.test(t);
    }],
    ['medidas_con_fotos', function () {
      return !!ctx.tieneFotos && /\d+([.,]\d+)?\s*(x|por)\s*\d+|\d+([.,]\d+)?\s*(m|mt|mts|metros|cm)\b/.test(t);
    }]
  ];
  for (var i = 0; i < reglas.length; i += 1) {
    if (reglas[i][1]()) return { pasar: true, motivo: reglas[i][0] };
  }
  return { pasar: false, motivo: '' };
}

/** Convierte "1.099.900", "80 mil", "1,5 millones" en un número entero de pesos. */
function parsearMonto_(numero, sufijo) {
  var n = String(numero || '').replace(/\s/g, '');
  var suf = normalizar_(sufijo || '');
  var mult = 1;
  if (/^(mil|miles|k|lucas)$/.test(suf)) mult = 1000;
  if (/^(millon|millones|m|palos|millon(es)?)$/.test(suf)) mult = 1000000;
  var valor;
  if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(n)) {
    var sinDecimales = n.replace(/[.,]\d{1,2}$/, '');
    valor = parseInt(sinDecimales.replace(/[.,]/g, ''), 10);
  } else if (/^\d+[.,]\d{1,2}$/.test(n)) {
    valor = parseFloat(n.replace(',', '.'));
  } else {
    valor = parseInt(n.replace(/[.,]/g, ''), 10);
  }
  return Math.round(valor * mult);
}

/**
 * Regla de respaldo: busca valores en dinero en la respuesta. Si aparece uno que NO está
 * en la lista de precios permitidos (o un precio de instalación), la respuesta no se envía.
 */
function filtrarPrecios_(texto, permitidos) {
  var t = String(texto || '');
  var encontrados = [];
  var re1 = /\$\s*(\d[\d.,\s]*\d|\d)(?:\s*(mil|millones|millón|millon|k|m)\b)?/gi;
  var re2 = /\b(\d[\d.,]*)\s*(mil(?:es)?|millones|millón|millon|pesos|cop|lucas|palos)\b/gi;
  var m;
  while ((m = re1.exec(t)) !== null) encontrados.push(parsearMonto_(m[1], m[2]));
  while ((m = re2.exec(t)) !== null) {
    var suf = normalizar_(m[2]);
    encontrados.push(parsearMonto_(m[1], /^(pesos|cop)$/.test(suf) ? '' : suf));
  }
  var prohibidos = encontrados.filter(function (v) {
    return isNaN(v) || (permitidos || []).indexOf(v) === -1;
  });
  var motivos = [];
  if (prohibidos.length) motivos.push('precio_no_permitido');
  if (/\b(usd|us\$|dolares|dólares|euros)\b/i.test(t)) motivos.push('moneda_extranjera');
  // Un valor en la misma frase que "instalación" sin aclarar que va aparte.
  var frases = t.split(/[!?\n]|\.(?=\s|$)/);
  frases.forEach(function (f) {
    var fn = normalizar_(f);
    var tieneValor = /\$\s*\d|\d\s*(mil|millones|pesos)\b/.test(fn);
    if (tieneValor && /(instalacion|instalad|instalar|mano de obra)/.test(fn) &&
      !/(aparte|no incluye|sin instal|se cotiza|por separado|sin iva)/.test(fn)) {
      motivos.push('valor_con_instalacion');
    }
  });
  return { ok: motivos.length === 0, encontrados: encontrados, prohibidos: prohibidos, motivos: motivos };
}

/** ¿La respuesta tutea al cliente? (el asistente siempre habla de usted). */
function tieneTuteo_(texto) {
  return /(^|[^\wáéíóúñ])(tú|tienes|puedes|quieres|necesitas|cuéntame|cuentame|dime|escríbeme|escribeme|envíame|enviame|mándame|mandame|contigo|te (paso|ayudo|cuento|escribo|envío|envio|respondo|comparto|explico)|tu (puerta|casa|garaje|pedido|correo|número|numero|barrio|caso))(?=$|[^\wáéíóúñ])/i
    .test(String(texto || ''));
}

/** Quita la marca de handoff y el markdown pesado; deja texto simple de WhatsApp. */
function limpiarRespuesta_(texto) {
  var t = String(texto || '').split(MARCA_HANDOFF).join('');
  t = t.replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/`+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (t.length > 900) t = t.slice(0, 900).replace(/\s+\S*$/, '') + '…';
  return t;
}

/** ¿Arlen escribió en este chat hace menos de `horas`? Entonces el asistente se calla. */
function enSilencio_(historial, ahoraMs, horas) {
  var limite = ahoraMs - horas * 3600 * 1000;
  for (var i = historial.length - 1; i >= 0; i -= 1) {
    if (historial[i].rol === 'arlen' && historial[i].ms >= limite) return true;
  }
  return false;
}

/**
 * Historial del chat → mensajes para la API de Claude (alternando user/assistant,
 * empezando y terminando en user). Lo que Arlen escribió va como mensaje del negocio.
 */
function construirMensajes_(historial, max) {
  var filas = historial.filter(function (f) {
    return f.rol === 'cliente' || f.rol === 'asistente' || f.rol === 'arlen';
  }).slice(-(max || 20));
  var mensajes = [];
  filas.forEach(function (f) {
    var role = f.rol === 'cliente' ? 'user' : 'assistant';
    var texto = String(f.texto || '').trim();
    if (f.rol === 'cliente' && f.tipo && f.tipo !== 'text') {
      texto = '(El cliente envió ' + descripcionTipo_(f.tipo) + ')' + (texto ? ' ' + texto : '');
    }
    if (f.rol === 'arlen') texto = '(Arlen escribió desde su celular) ' + texto;
    if (!texto) return;
    var ultimo = mensajes[mensajes.length - 1];
    if (ultimo && ultimo.role === role) {
      ultimo.content += '\n' + texto;
    } else {
      mensajes.push({ role: role, content: texto });
    }
  });
  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  return mensajes;
}

function descripcionTipo_(tipo) {
  return ({
    image: 'una foto', video: 'un video', audio: 'un audio', document: 'un documento',
    location: 'su ubicación', contacts: 'un contacto', button: 'un botón', interactive: 'una opción'
  })[tipo] || ('un mensaje de tipo ' + tipo);
}

/** Bloques de sistema: el cerebro (fijo, cacheable) + el contexto del momento. */
function construirSistema_(negocio, ctx) {
  var lineas = [
    'Contexto de este momento:',
    '- Fecha y hora en Colombia: ' + ctx.fecha + '.',
    '- Arlen ' + (ctx.enHorario ? 'está en horario de atención.' : 'está fuera de horario.'),
    '- Arlen responde: ' + ctx.cuando + '.'
  ];
  if (ctx.nombre) lineas.push('- Nombre del cliente en WhatsApp: ' + ctx.nombre + ' (úselo con moderación).');
  if (ctx.handoff) {
    lineas.push('- Este mensaje SÍ se pasa a Arlen (motivo: ' + ctx.handoff + '). Empiece con ' +
      MARCA_HANDOFF + ', diga que le pasa el caso a Arlen y que le responde ' + ctx.cuando + '.');
  }
  return [
    { type: 'text', text: negocio.cerebro, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: lineas.join('\n') }
  ];
}

/** Cuerpo de la petición a la API de Claude (Messages API). */
function cuerpoClaude_(modelo, sistema, mensajes) {
  var cuerpo = {
    model: modelo,
    max_tokens: CONTESTADOR_DEFAULTS.CLAUDE_MAX_TOKENS,
    output_config: { effort: CONTESTADOR_DEFAULTS.CLAUDE_EFFORT },
    system: sistema,
    messages: mensajes
  };
  // El reintento con otro modelo ante un rechazo por error solo existe en Sonnet 5.5, Opus y Fable; Haiku no lo tiene.
  if (usaFallbacks_(modelo)) cuerpo.fallbacks = 'default';
  return cuerpo;
}

function usaFallbacks_(modelo) {
  return /^claude-(sonnet-5-5|opus-5|fable-5)/.test(String(modelo || ''));
}

/** Saca el texto de la respuesta de Claude. Devuelve { texto, rechazo }. */
function leerRespuestaClaude_(resp) {
  if (!resp || resp.type === 'error') return { texto: '', rechazo: false, error: true };
  if (resp.stop_reason === 'refusal') return { texto: '', rechazo: true, error: false };
  var texto = (resp.content || []).filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; }).join('\n').trim();
  return { texto: texto, rechazo: false, error: !texto };
}

/**
 * Decide qué hacer con un evento (sin efectos). Devuelve:
 *   { accion: 'ignorar' | 'registrar' | 'registrar_eco' | 'acuse' | 'responder', motivo, handoff }
 */
function planificar_(ev, ctx) {
  if (ev.tipo === 'eco') return { accion: 'registrar_eco', motivo: 'arlen_escribio' };
  if (!ctx.negocio) return { accion: 'ignorar', motivo: 'numero_no_configurado' };
  if (ctx.duplicado) return { accion: 'ignorar', motivo: 'duplicado' };
  if (TIPOS_IGNORADOS.indexOf(ev.msgTipo) !== -1) return { accion: 'registrar', motivo: 'tipo_' + ev.msgTipo };
  if (!ctx.negocio.activo) return { accion: 'registrar', motivo: 'negocio_inactivo' };
  if ((ctx.config.excluidos || []).indexOf(ev.cliente) !== -1) return { accion: 'registrar', motivo: 'numero_excluido' };
  if (!ctx.config.activo) return { accion: 'registrar', motivo: 'interruptor_apagado' };
  if (enSilencio_(ctx.historial, ctx.ahoraMs, ctx.config.silencioHoras)) {
    return { accion: 'registrar', motivo: 'arlen_en_el_chat' };
  }
  if (ev.timestampMs && ctx.ahoraMs - ev.timestampMs > CONTESTADOR_DEFAULTS.MAX_ANTIGUEDAD_MIN * 60000) {
    return { accion: 'registrar', motivo: 'mensaje_viejo' };
  }
  if (TIPOS_MEDIA.indexOf(ev.msgTipo) !== -1) return { accion: 'acuse', motivo: 'media_' + ev.msgTipo };
  if (!String(ev.texto || '').trim()) return { accion: 'registrar', motivo: 'sin_texto' };
  var tieneFotos = ctx.historial.some(function (f) { return f.rol === 'cliente' && f.tipo === 'image'; });
  var h = decidirHandoff_(ev.texto, { tieneFotos: tieneFotos });
  return { accion: 'responder', motivo: h.pasar ? 'handoff_' + h.motivo : 'normal', handoff: h.pasar ? h.motivo : '' };
}

/**
 * Revisa la respuesta de Claude antes de enviarla. Devuelve
 *   { enviar: texto, handoff: bool, bloqueada: bool, motivos: [] }
 */
function revisarRespuesta_(negocio, textoClaude, plan, cuando) {
  var marca = String(textoClaude || '').indexOf(MARCA_HANDOFF) !== -1;
  var limpio = limpiarRespuesta_(textoClaude);
  var filtro = filtrarPrecios_(limpio, negocio.preciosPermitidos);
  if (!limpio || !filtro.ok) {
    return { enviar: mensajeHandoffFijo_(cuando), handoff: true, bloqueada: !!limpio, motivos: filtro.motivos.length ? filtro.motivos : ['respuesta_vacia'] };
  }
  var handoff = marca || !!plan.handoff;
  if (handoff && !/arlen/i.test(limpio)) {
    limpio += '\nLe paso su caso a Arlen, que le responde ' + cuando + '.';
  }
  return { enviar: limpio, handoff: handoff, bloqueada: false, motivos: [] };
}
