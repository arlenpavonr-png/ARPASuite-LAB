/**
 * Capa LLM DEV del Copiloto: solo redacción sobre hechos ya calculados.
 * No consulta historial. No escribe. No cambia la intención ni el oficio.
 */
(function (global) {
  const BLOCKED_PRODUCTION = [
    'AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2',
    'AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg',
    '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',
    'formato-arlenpav',
    'arpa.arpatechnologyglobal.com'
  ];

  const TIMEOUT_MS = 45000;

  const OFICIO_ALIASES = {
    automatismos: ['automatismos', 'automatizacion', 'automatización'],
    automatizacion: ['automatismos', 'automatizacion', 'automatización'],
    electricidad: ['electricidad'],
    gas: ['gas'],
    refrigeracion: ['refrigeracion', 'refrigeración'],
    metalmecanica: ['metalmecanica', 'metalmecánica'],
    plagas: ['plagas', 'control_de_plagas'],
    control_de_plagas: ['plagas', 'control_de_plagas'],
    solar: ['solar', 'energia_solar', 'energía solar'],
    energia_solar: ['solar', 'energia_solar', 'energía solar'],
    cctv: ['cctv', 'cctv_seguridad'],
    cctv_seguridad: ['cctv', 'cctv_seguridad'],
    plomeria: ['plomeria', 'plomería'],
    linea_blanca: ['linea_blanca', 'línea blanca'],
    taller_motos: ['taller_motos', 'taller de motos']
  };

  const OTROS_OFICIOS = [
    'automatismos', 'automatizacion', 'electricidad', 'gas', 'refrigeracion',
    'metalmecanica', 'plagas', 'control_de_plagas', 'solar', 'energia_solar',
    'cctv', 'cctv_seguridad', 'plomeria', 'linea_blanca', 'taller_motos'
  ];

  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function fold(value) {
    return trimStr(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function blockedReason(url) {
    const raw = String(url || '').trim().toLowerCase();
    if (!raw) return { codigo: 'backend_dev_ausente', mensaje: 'No hay endpoint LLM DEV configurado.' };
    for (let i = 0; i < BLOCKED_PRODUCTION.length; i += 1) {
      if (raw.indexOf(BLOCKED_PRODUCTION[i].toLowerCase()) !== -1) {
        return {
          codigo: 'bloqueado_produccion',
          mensaje: 'Se rechazó el endpoint porque coincide con un recurso de producción. No se envió la petición.'
        };
      }
    }
    return null;
  }

  function sanitizeClientError(mensaje) {
    return String(mensaje || 'Error del backend LLM DEV.')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redactado]')
      .replace(/sk-[A-Za-z0-9_-]+/g, '[redactado]')
      .replace(/ARPA_IA_LLM_KEY\s*[:=]\s*\S+/gi, 'ARPA_IA_LLM_KEY=[redactado]');
  }

  function itemPublico(item) {
    if (!item || typeof item !== 'object') return {};
    const out = {};
    ['cliente', 'numero', 'fecha', 'fecha_proxima', 'tipo', 'estado', 'concepto', 'modulo'].forEach(function (k) {
      if (item[k] != null && item[k] !== '') out[k] = item[k];
    });
    if (item.total != null && isFinite(item.total)) out.total = item.total;
    if (item.dias != null && isFinite(item.dias)) out.dias = item.dias;
    if (item.dias_sin_servicio != null && isFinite(item.dias_sin_servicio)) {
      out.dias_sin_servicio = item.dias_sin_servicio;
    }
    if (item.es_borrador) out.es_borrador = true;
    return out;
  }

  function construirPaquete(local) {
    const src = local && typeof local === 'object' ? local : {};
    const items = Array.isArray(src.resultados) ? src.resultados.map(itemPublico) : [];
    return {
      oficio: trimStr(src.oficio),
      intencion: trimStr(src.intencion) || 'desconocida',
      datos_disponibles: !!src.datos_disponibles,
      resultados: src.datos_disponibles ? items : [],
      advertencias: Array.isArray(src.advertencias) ? src.advertencias.map(trimStr).filter(Boolean) : [],
      resumen_local: trimStr(src.resumen),
      hoy: trimStr(src.hoy)
    };
  }

  function serializeItem(item) {
    const it = itemPublico(item);
    const parts = [];
    Object.keys(it).forEach(function (k) {
      parts.push(k + ': ' + it[k]);
    });
    return parts.join(' | ');
  }

  function oficioParaLlm(oficio) {
    const raw = trimStr(oficio);
    const perfiles = global.ArpaIaPerfiles;
    if (perfiles && typeof perfiles.toLlmOficioId === 'function') {
      const mapped = perfiles.toLlmOficioId(raw);
      if (mapped) return mapped;
    }
    if (raw === 'automatismos') return 'automatizacion';
    if (raw === 'plagas') return 'control_de_plagas';
    if (raw === 'solar') return 'energia_solar';
    if (raw === 'cctv') return 'cctv_seguridad';
    return raw;
  }

  function otDesdePaquete(pack) {
    const items = Array.isArray(pack.resultados) ? pack.resultados : [];
    const first = items[0] || {};
    const hallazgos = items.map(serializeItem);
    if (!hallazgos.length) {
      hallazgos.push(pack.resumen_local || 'NO DISPONIBLE EN LAB');
    }
    return {
      descripcion_trabajo: [
        'Consulta del Copiloto ARPASuite, solo lectura.',
        'Intencion cerrada: ' + (pack.intencion || 'desconocida') + '.',
        'Datos disponibles: ' + (pack.datos_disponibles ? 'si' : 'no') + '.',
        'Redacta una respuesta breve y profesional en espanol para el tecnico.',
        'Usa exclusivamente hallazgos, resultado y advertencias.',
        'Si datos disponibles es no, responde NO DISPONIBLE EN LAB.',
        'No inventes clientes, cotizaciones, PVP, cuentas de cobro, fechas ni servicios.',
        'No cambies el oficio. No conviertas BORRADOR en venta. No crees intenciones nuevas.'
      ].join(' '),
      resultado: pack.resumen_local || '',
      hallazgos: hallazgos,
      observaciones: (pack.advertencias || []).join(' '),
      advertencias: pack.advertencias || [],
      cliente: trimStr(first.cliente),
      numero_ot: trimStr(first.numero),
      fecha: trimStr(first.fecha),
      tipo_servicio: trimStr(pack.intencion),
      causa_confirmada: false,
      oficio: pack.oficio || ''
    };
  }

  function extraerTextoLlm(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
    if (data.extraido && !data.informe && !data.resumen && !data.copiloto) return '';
    if (typeof data.resumen === 'string' && trimStr(data.resumen)) return trimStr(data.resumen);
    if (data.copiloto && typeof data.copiloto.resumen === 'string') return trimStr(data.copiloto.resumen);
    const inf = data.informe && typeof data.informe === 'object' ? data.informe : data;
    const parts = [];
    ['resumen_cliente', 'nota_tecnica', 'resultado'].forEach(function (k) {
      if (typeof inf[k] === 'string' && trimStr(inf[k])) parts.push(trimStr(inf[k]));
    });
    if (parts.length) return parts.join('\n\n');
    if (typeof inf.titulo === 'string' && trimStr(inf.titulo)) return trimStr(inf.titulo);
    return '';
  }

  function allowedFromPack(pack) {
    const texts = [];
    const numeros = {};
    const fechas = {};
    const clientes = {};
    const estados = {};
    const enteros = {};

    function addText(v) {
      const s = trimStr(v);
      if (s) texts.push(s);
    }
    function addNumero(v) {
      const s = trimStr(v);
      if (s) numeros[fold(s)] = s;
    }
    function addFecha(v) {
      const s = trimStr(v);
      if (!s) return;
      fechas[s] = true;
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        fechas[m[3] + '/' + m[2] + '/' + m[1]] = true;
        enteros[m[1]] = true;
      }
    }
    function addCliente(v) {
      const s = trimStr(v);
      if (s) clientes[fold(s)] = s;
    }
    function addEstado(v) {
      const s = fold(v);
      if (s) estados[s] = true;
    }
    function addEntero(v) {
      if (v == null || v === '') return;
      enteros[String(v)] = true;
    }

    addText(pack.resumen_local);
    addText(pack.intencion);
    addText(pack.oficio);
    addFecha(pack.hoy);
    (pack.advertencias || []).forEach(function (w) {
      addText(w);
      const docs = String(w).match(/\b(?:OT|COT|CC)-\d+\b/gi) || [];
      docs.forEach(addNumero);
    });
    const docsLocal = String(pack.resumen_local || '').match(/\b(?:OT|COT|CC)-\d+\b/gi) || [];
    docsLocal.forEach(addNumero);
    (pack.resultados || []).forEach(function (it) {
      addText(serializeItem(it));
      addCliente(it.cliente);
      addNumero(it.numero);
      addFecha(it.fecha);
      addFecha(it.fecha_proxima);
      addEstado(it.estado);
      addEstado(it.tipo);
      addEntero(it.total);
      addEntero(it.dias);
      addEntero(it.dias_sin_servicio);
    });
    const aliases = OFICIO_ALIASES[fold(pack.oficio)] || [fold(pack.oficio)];
    aliases.forEach(addText);

    return {
      blob: fold(texts.join('\n')),
      numeros: numeros,
      fechas: fechas,
      clientes: clientes,
      estados: estados,
      enteros: enteros,
      oficio: fold(pack.oficio),
      oficioAliases: aliases.map(fold)
    };
  }

  function clienteMencionadoInventado(texto, allowed) {
    const re = /\bclientes?\s*:?\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]+){0,6})/g;
    let m;
    const folded = fold(texto);
    while ((m = re.exec(texto))) {
      const nombre = fold(m[1]);
      if (!nombre || nombre.length < 4) continue;
      if (/^(este|esta|el|la|los|las|un|una|no|sin)$/.test(nombre)) continue;
      const conocido = Object.keys(allowed.clientes).some(function (c) {
        return c.indexOf(nombre) >= 0 || nombre.indexOf(c) >= 0;
      });
      if (conocido) continue;
      if (allowed.blob.indexOf(nombre) >= 0) continue;
      if (folded.indexOf(nombre) >= 0 && allowed.blob.indexOf(nombre) < 0) return m[1];
    }
    return '';
  }

  function oficioAjeno(texto, allowed) {
    const t = fold(texto);
    if (!allowed.oficio) return '';
    for (let i = 0; i < OTROS_OFICIOS.length; i += 1) {
      const id = OTROS_OFICIOS[i];
      if (allowed.oficioAliases.indexOf(id) >= 0) continue;
      if (new RegExp('\\b' + id.replace(/_/g, '[_ ]') + '\\b').test(t)) return id;
    }
    return '';
  }

  function validarRedaccion(texto, pack) {
    const raw = trimStr(texto);
    if (!raw) {
      return { ok: false, resumen: '', motivo: 'El LLM no devolvió redacción.' };
    }
    const src = pack && typeof pack === 'object' ? pack : construirPaquete({});
    const allowed = allowedFromPack(src);
    const t = fold(raw);

    if (src.intencion === 'desconocida' || src.datos_disponibles === false) {
      if (!/no disponible/.test(t)) {
        return { ok: false, resumen: '', motivo: 'El LLM no declaró NO DISPONIBLE EN LAB.' };
      }
    }

    const docs = raw.match(/\b(?:OT|COT|CC)-\d+\b/gi) || [];
    for (let i = 0; i < docs.length; i += 1) {
      if (!allowed.numeros[fold(docs[i])]) {
        return { ok: false, resumen: '', motivo: 'El LLM introdujo un número inexistente: ' + docs[i] + '.' };
      }
    }

    const fechas = raw.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    const fechasAlt = raw.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || [];
    const allFechas = fechas.concat(fechasAlt);
    for (let j = 0; j < allFechas.length; j += 1) {
      if (!allowed.fechas[allFechas[j]]) {
        return { ok: false, resumen: '', motivo: 'El LLM introdujo una fecha inexistente: ' + allFechas[j] + '.' };
      }
    }

    const montos = raw.match(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\b/g) || [];
    const sueltos = raw.match(/\b\d{5,}\b/g) || [];
    const nums = montos.concat(sueltos);
    for (let k = 0; k < nums.length; k += 1) {
      const compact = String(nums[k]).replace(/[.,]/g, '');
      if (allowed.enteros[compact] || allowed.enteros[nums[k]]) continue;
      if (allowed.blob.indexOf(fold(nums[k])) >= 0 || allowed.blob.indexOf(compact) >= 0) continue;
      return { ok: false, resumen: '', motivo: 'El LLM introdujo un precio o cifra inexistente: ' + nums[k] + '.' };
    }

    if (/\b(pvp|\$|usd|iva)\b/i.test(raw) && !/pvp|\$|usd|iva/.test(allowed.blob)) {
      return { ok: false, resumen: '', motivo: 'El LLM introdujo un precio que no estaba en los datos.' };
    }

    const inventado = clienteMencionadoInventado(raw, allowed);
    if (inventado) {
      return { ok: false, resumen: '', motivo: 'El LLM introdujo un cliente inexistente: ' + inventado + '.' };
    }

    const oficioMal = oficioAjeno(raw, allowed);
    if (oficioMal) {
      return { ok: false, resumen: '', motivo: 'El LLM cambió el oficio a ' + oficioMal + '.' };
    }

    if (/\b(venta|vendid[oa]|facturad[oa])\b/i.test(raw) && !/venta|vendid|facturad/.test(allowed.blob)) {
      const hayBorrador = (src.resultados || []).some(function (it) {
        return fold(it.estado) === 'borrador' || it.es_borrador;
      });
      if (hayBorrador || !src.datos_disponibles || !(src.resultados || []).length) {
        return { ok: false, resumen: '', motivo: 'El LLM convirtió un BORRADOR o dato ausente en venta.' };
      }
    }

    if (/\b(pagad[oa]|pendiente de pago)\b/i.test(raw) && !/pagad|pendiente de pago/.test(allowed.blob)) {
      if (src.intencion === 'cuentas_cobro_pendientes') {
        return { ok: false, resumen: '', motivo: 'El LLM inventó el estado de cobro.' };
      }
    }

    if ((src.datos_disponibles === false || !(src.resultados || []).length) &&
        /\b(instalaci[oó]n|mantenimiento|reparaci[oó]n)\b/i.test(raw) &&
        !/instalaci|mantenimiento|reparaci/.test(allowed.blob)) {
      return { ok: false, resumen: '', motivo: 'El LLM inventó un servicio que no estaba disponible.' };
    }

    return { ok: true, resumen: raw, motivo: '' };
  }

  function endpointActual() {
    const api = global.ArpaIaCotizadorApi;
    if (!api || api.mode !== 'remote') return '';
    return trimStr(api.endpoint);
  }

  function isAppsScript(url) {
    return /script\.google\.com/i.test(String(url || ''));
  }

  async function redactar(pack, options) {
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.localOnly) {
      return { ok: false, error: { codigo: 'modo_local', mensaje: 'Redacción local: el LLM no se invocó.' } };
    }
    const url = endpointActual();
    const blocked = blockedReason(url);
    if (blocked) return { ok: false, error: blocked };
    if (!pack || !pack.oficio) {
      return { ok: false, error: { codigo: 'oficio_ausente', mensaje: 'Sin oficio configurado no se llama al LLM.' } };
    }

    const payload = {
      modo: 'informe',
      mode: 'informe',
      oficio: oficioParaLlm(pack.oficio),
      ot: otDesdePaquete(pack),
      text: JSON.stringify({
        oficio: pack.oficio,
        intencion: pack.intencion,
        datos_disponibles: pack.datos_disponibles,
        resultados: pack.resultados,
        advertencias: pack.advertencias,
        resumen_local: pack.resumen_local
      })
    };

    const headers = isAppsScript(url)
      ? { 'Content-Type': 'text/plain;charset=utf-8' }
      : { 'Content-Type': 'application/json' };
    const endpoint = url.indexOf('?') >= 0 ? url + '&modo=informe' : url + '?modo=informe';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    try {
      const req = {
        method: 'POST',
        headers: headers,
        credentials: 'omit',
        body: JSON.stringify(payload)
      };
      if (controller) req.signal = controller.signal;
      const res = await fetch(endpoint, req);
      if (!res || !res.ok) {
        return {
          ok: false,
          error: {
            codigo: 'backend_no_disponible',
            mensaje: 'El backend LLM DEV no está disponible (HTTP ' + (res ? res.status : 0) + ').'
          }
        };
      }
      const raw = typeof res.text === 'function' ? await res.text() : '';
      const text = String(raw || '').trim();
      if (!text || (text.charAt(0) !== '{' && text.charAt(0) !== '[')) {
        return { ok: false, error: { codigo: 'respuesta_no_json', mensaje: 'El backend LLM DEV no devolvió JSON.' } };
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El backend LLM DEV no devolvió JSON válido.' } };
      }
      if (data && data.ok === false) {
        const err = data.error;
        return {
          ok: false,
          error: {
            codigo: (err && err.codigo) || 'backend_error',
            mensaje: sanitizeClientError((err && err.mensaje) || err || 'El LLM DEV falló.')
          }
        };
      }
      const redactado = extraerTextoLlm(data);
      if (!redactado) {
        return { ok: false, error: { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió redacción usable.' } };
      }
      return { ok: true, texto: redactado };
    } catch (err) {
      const aborted = err && (err.name === 'AbortError' || /aborted|abortado/i.test(String(err.message || '')));
      if (aborted) {
        return { ok: false, error: { codigo: 'timeout_llm', mensaje: 'El backend LLM DEV no respondió a tiempo.' } };
      }
      return {
        ok: false,
        error: {
          codigo: 'error_red',
          mensaje: 'No hay conexión con el backend LLM DEV: ' + sanitizeClientError(err && err.message)
        }
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  global.ArpaIaCopilotoLlm = {
    construirPaquete: construirPaquete,
    validarRedaccion: validarRedaccion,
    extraerTextoLlm: extraerTextoLlm,
    redactar: redactar,
    blockedReason: blockedReason,
    oficioParaLlm: oficioParaLlm
  };
})(typeof window !== 'undefined' ? window : globalThis);
