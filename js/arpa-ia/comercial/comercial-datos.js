/**
 * Extrae y normaliza datos YA existentes de ARPASuite para IA Comercial.
 * No inventa clientes, fechas, servicios ni precios.
 */
(function (global) {
  const TIPOS_SERVICIO = {
    instalacion: 'instalacion',
    instalación: 'instalacion',
    mantenimiento: 'mantenimiento',
    reparacion: 'reparacion',
    reparación: 'reparacion'
  };

  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function claveCliente(nombre) {
    return trimStr(nombre).toLowerCase();
  }

  function parseFecha(raw) {
    const s = trimStr(raw);
    if (!s) return '';
    const match = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);
    if (!match) return '';
    const iso = match[1];
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return (y + '-' + m + '-' + day === iso) ? iso : '';
  }

  function snapshotDe(rec) {
    return rec && rec.fullSnapshot && typeof rec.fullSnapshot === 'object' ? rec.fullSnapshot : {};
  }

  function clienteDesdeRegistro(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const snap = snapshotDe(rec);
    const nested = snap.cliente && typeof snap.cliente === 'object' ? snap.cliente : null;
    return trimStr(rec.cliente)
      || trimStr(rec.nombre)
      || trimStr(snap.cliente && typeof snap.cliente === 'string' ? snap.cliente : '')
      || trimStr(snap['formato-cliente-nombre'])
      || trimStr(nested && nested.nombre);
  }

  function fechaServicio(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const snap = snapshotDe(rec);
    return parseFecha(rec.fecha)
      || parseFecha(rec.fechaHoraFinalizacion)
      || parseFecha(rec.fechaHoraInicio)
      || parseFecha(snap['formato-fecha'])
      || parseFecha(snap['cot-fecha'])
      || parseFecha(snap.fecha)
      || parseFecha(snap.fechaEmision);
  }

  function equipoDesdeRegistro(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const snap = snapshotDe(rec);
    const marcaTxt = trimStr(snap['formato-equipo-marca-text']);
    const marcaSel = trimStr(snap['sel-marca']);
    const marca = marcaTxt || (marcaSel && marcaSel !== 'Otra' ? marcaSel : '');
    const modelo = trimStr(snap['formato-equipo-ref-text'])
      || trimStr(snap['ref-manual'])
      || trimStr(snap['sel-referencia']);
    return [marca, modelo].filter(Boolean).join(' ');
  }

  function tipoServicio(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const snap = snapshotDe(rec);
    const raw = trimStr(snap._tipo || rec.subtipo || rec.tipo).toLowerCase();
    if (!raw) return '';
    if (TIPOS_SERVICIO[raw]) return TIPOS_SERVICIO[raw];
    if (raw.indexOf('instal') >= 0) return 'instalacion';
    if (raw.indexOf('repar') >= 0) return 'reparacion';
    if (raw.indexOf('mant') >= 0) return 'mantenimiento';
    return '';
  }

  function inferModulo(rec) {
    const m = trimStr(rec && rec.modulo).toLowerCase();
    if (m === 'formato' || m === 'cotizacion' || m === 'cuenta-cobro') return m;
    const doc = trimStr(rec && (rec.documento || rec.tipo)).toLowerCase();
    if (doc.indexOf('cotiz') >= 0) return 'cotizacion';
    if (doc.indexOf('cuenta') >= 0 || doc.indexOf('cobro') >= 0) return 'cuenta-cobro';
    if (doc.indexOf('formato') >= 0 || doc.indexOf('servicio') >= 0) return 'formato';
    const num = trimStr(rec && rec.numero).toUpperCase();
    if (num.indexOf('COT-') === 0) return 'cotizacion';
    if (num.indexOf('CC-') === 0) return 'cuenta-cobro';
    return '';
  }

  function etiquetaServicio(rec) {
    const tipo = tipoServicio(rec);
    const labels = { instalacion: 'Instalación', mantenimiento: 'Mantenimiento', reparacion: 'Reparación' };
    const tipoLab = labels[tipo] || trimStr(rec.subtipo || rec.tipo);
    const num = trimStr(rec.numero || rec.numeroOt || rec.numeroServicio);
    const concepto = trimStr(rec.concepto);
    const equipo = equipoDesdeRegistro(rec);
    const bits = [];
    if (tipoLab) bits.push(tipoLab);
    if (num) bits.push(num);
    if (equipo && bits.join(' ').indexOf(equipo) === -1) bits.push(equipo);
    if (concepto && bits.join(' ').indexOf(concepto) === -1) bits.push(concepto);
    return bits.join(' — ');
  }

  function normalizarRegistro(raw) {
    const rec = raw && typeof raw === 'object' ? raw : {};
    const modulo = inferModulo(rec);
    const cliente = clienteDesdeRegistro(rec);
    const fecha = fechaServicio(rec);
    const tipo = modulo === 'formato' ? tipoServicio(rec) : '';
    const equipo = modulo === 'formato' ? equipoDesdeRegistro(rec) : '';
    return {
      id: trimStr(rec.id),
      modulo: modulo,
      cliente: cliente,
      ciudad: trimStr(rec.ciudad),
      fecha: fecha,
      tipo_servicio: tipo,
      numero: trimStr(rec.numero || rec.numeroOt || rec.numeroServicio),
      concepto: trimStr(rec.concepto),
      estado: trimStr(rec.estado || (rec.fullSnapshot && rec.fullSnapshot._estado)),
      total: typeof rec.total === 'number' && isFinite(rec.total) ? rec.total : null,
      equipo: equipo,
      servicio_relacionado: etiquetaServicio(rec),
      raw: rec
    };
  }

  function normalizarCliente(raw) {
    const c = raw && typeof raw === 'object' ? raw : {};
    return {
      nombre: trimStr(c.nombre || c.cliente),
      ciudad: trimStr(c.ciudad),
      tel: trimStr(c.tel || c.telefono),
      nit: trimStr(c.nit),
      dir: trimStr(c.dir || c.direccion),
      email: trimStr(c.email)
    };
  }

  function extraerCotDraft(draft) {
    if (!draft || typeof draft !== 'object') return null;
    const cliente = trimStr(draft.nombre || draft.cliente);
    const fecha = parseFecha(draft.fecha);
    const numero = trimStr(draft.numero);
    if (!cliente && !numero) return null;
    return {
      id: '',
      modulo: 'cotizacion',
      cliente: cliente,
      ciudad: trimStr(draft.ciudad),
      fecha: fecha,
      tipo_servicio: '',
      numero: numero,
      concepto: 'Cotización en borrador',
      estado: 'borrador',
      total: null,
      servicio_relacionado: numero ? ('Cotización — ' + numero) : 'Cotización en borrador',
      raw: draft,
      es_borrador: true
    };
  }

  function parseHoy(raw) {
    const parsed = parseFecha(raw);
    if (parsed) return parsed;
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function extraer(entrada) {
    const src = entrada && typeof entrada === 'object' ? entrada : {};
    const historial = asArray(src.historial || src.records || src.servicios).map(normalizarRegistro);
    const clientes = asArray(src.clientes).map(normalizarCliente).filter(function (c) { return !!c.nombre; });
    const draft = extraerCotDraft(src.cotDraft || src.cotizacion_borrador || null);
    const cotizaciones = historial.filter(function (r) { return r.modulo === 'cotizacion'; });
    if (draft) {
      const ya = cotizaciones.some(function (c) {
        return draft.numero && claveCliente(c.numero) === claveCliente(draft.numero);
      });
      if (!ya) cotizaciones.push(draft);
    }
    return {
      hoy: parseHoy(src.hoy || src.fecha_analisis),
      servicios: historial.filter(function (r) { return r.modulo === 'formato'; }),
      cotizaciones: cotizaciones,
      cuentas: historial.filter(function (r) { return r.modulo === 'cuenta-cobro'; }),
      historial: historial,
      clientes: clientes
    };
  }

  function leerBorradorExistente(key) {
    try {
      const raw = global.localStorage && typeof global.localStorage.getItem === 'function'
        ? global.localStorage.getItem(key)
        : null;
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function leerDesdeArpaSuite(extra) {
    const entrada = extra && typeof extra === 'object' ? {
      hoy: extra.hoy,
      fecha_analisis: extra.fecha_analisis,
      historial: extra.historial,
      records: extra.records,
      servicios: extra.servicios,
      clientes: extra.clientes,
      cotDraft: extra.cotDraft,
      cotizacion_borrador: extra.cotizacion_borrador
    } : {};
    const hist = global.ArpaHistorial;
    if (!entrada.historial && !entrada.records && !entrada.servicios && hist && typeof hist.getRecords === 'function') {
      entrada.historial = hist.getRecords();
    }
    if (!entrada.clientes && hist && typeof hist.getClientes === 'function') {
      entrada.clientes = hist.getClientes();
    }
    if (!entrada.cotDraft && !entrada.cotizacion_borrador) {
      const draft = leerBorradorExistente('arpa_cot_draft');
      if (draft) entrada.cotDraft = draft;
    }
    return extraer(entrada);
  }

  global.ArpaIaComercialDatos = {
    extraer: extraer,
    leerDesdeArpaSuite: leerDesdeArpaSuite,
    parseFecha: parseFecha,
    claveCliente: claveCliente,
    fechaServicio: fechaServicio,
    tipoServicio: tipoServicio,
    equipoDesdeRegistro: equipoDesdeRegistro,
    clienteDesdeRegistro: clienteDesdeRegistro,
    normalizarRegistro: normalizarRegistro
  };
})(typeof window !== 'undefined' ? window : globalThis);
