/**
 * Consultas de solo lectura sobre datos ya existentes en ARPASuite-LAB.
 * No escribe. No inventa registros. No crea una segunda base.
 */
(function (global) {
  const MESES_MANTENIMIENTO = 6;
  const DIAS_SEGUIMIENTO = 180;
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

  function parseHoy(raw) {
    const parsed = parseFecha(raw);
    if (parsed) return parsed;
    return '';
  }

  function parseDay(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return (y + '-' + m + '-' + day === iso) ? d : null;
  }

  function toIso(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function addMonths(iso, months) {
    const d = parseDay(iso);
    if (!d) return '';
    const copy = new Date(d.getTime());
    const day = copy.getDate();
    copy.setMonth(copy.getMonth() + months);
    if (copy.getDate() < day) copy.setDate(0);
    return toIso(copy);
  }

  function addDays(iso, days) {
    const d = parseDay(iso);
    if (!d) return '';
    const copy = new Date(d.getTime());
    copy.setDate(copy.getDate() + days);
    return toIso(copy);
  }

  function diasEntre(desdeIso, hastaIso) {
    const a = parseDay(desdeIso);
    const b = parseDay(hastaIso);
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
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

  function totalRegistro(rec) {
    if (!rec || typeof rec !== 'object') return null;
    if (typeof rec.total === 'number' && isFinite(rec.total)) return rec.total;
    const snap = snapshotDe(rec);
    if (typeof snap.total === 'number' && isFinite(snap.total)) return snap.total;
    return null;
  }

  function normalizarRegistro(raw) {
    const rec = raw && typeof raw !== 'object' ? {} : (raw || {});
    if (!raw || typeof raw !== 'object') {
      return {
        id: '', modulo: '', cliente: '', fecha: '', tipo_servicio: '',
        numero: '', concepto: '', estado: '', total: null, raw: rec
      };
    }
    const modulo = inferModulo(rec);
    return {
      id: trimStr(rec.id),
      modulo: modulo,
      cliente: clienteDesdeRegistro(rec),
      ciudad: trimStr(rec.ciudad),
      fecha: fechaServicio(rec),
      tipo_servicio: modulo === 'formato' ? tipoServicio(rec) : '',
      numero: trimStr(rec.numero || rec.numeroOt || rec.numeroServicio),
      concepto: trimStr(rec.concepto),
      estado: trimStr(rec.estado || (rec.fullSnapshot && rec.fullSnapshot._estado)),
      total: totalRegistro(rec),
      raw: rec
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
      total: typeof draft.total === 'number' && isFinite(draft.total) ? draft.total : null,
      raw: draft,
      es_borrador: true
    };
  }

  function extraer(entrada) {
    const src = entrada && typeof entrada === 'object' ? entrada : {};
    const historial = asArray(src.historial || src.records || src.servicios).map(normalizarRegistro);
    const clientes = asArray(src.clientes).map(function (c) {
      const o = c && typeof c === 'object' ? c : {};
      return { nombre: trimStr(o.nombre || o.cliente), ciudad: trimStr(o.ciudad) };
    }).filter(function (c) { return !!c.nombre; });
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
      const ls = global.localStorage;
      if (!ls || typeof ls.getItem !== 'function') return null;
      const raw = ls.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function leerOficioConfigurado(extra) {
    const src = extra && typeof extra === 'object' ? extra : {};
    const directo = trimStr(src.oficio || src.oficio_id);
    if (directo) return directo;
    if (Array.isArray(src.oficios) && src.oficios.length) return trimStr(src.oficios[0]);
    const settings = src.settings && typeof src.settings === 'object' ? src.settings : null;
    if (settings && Array.isArray(settings.activeOficios) && settings.activeOficios.length) {
      return trimStr(settings.activeOficios[0]);
    }
    try {
      const ofic = global.ArpaOficios;
      if (ofic && typeof ofic.getActiveFormatoOficioId === 'function') {
        return trimStr(ofic.getActiveFormatoOficioId());
      }
    } catch (e) { /* solo lectura */ }
    try {
      const brand = global.ArpaBrand;
      const st = brand && typeof brand.getSettings === 'function' ? brand.getSettings() : null;
      if (st && Array.isArray(st.activeOficios) && st.activeOficios.length) {
        return trimStr(st.activeOficios[0]);
      }
    } catch (e) { /* solo lectura */ }
    return '';
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
    const pack = extraer(entrada);
    pack.oficio = leerOficioConfigurado(extra);
    return pack;
  }

  function vacioConsulta(advertencias) {
    return {
      disponible: false,
      items: [],
      advertencias: advertencias || ['No existen datos suficientes para responder.'],
      meta: {}
    };
  }

  function hayFuente(pack) {
    return !!(pack.servicios.length || pack.cotizaciones.length || pack.cuentas.length || pack.clientes.length);
  }

  function itemServicio(rec) {
    return {
      cliente: rec.cliente,
      numero: rec.numero,
      fecha: rec.fecha,
      tipo: rec.tipo_servicio,
      modulo: rec.modulo,
      concepto: rec.concepto,
      estado: rec.estado,
      total: rec.total
    };
  }

  function resolverPeriodo(periodo, hoy) {
    const p = periodo && typeof periodo === 'object' ? periodo : {};
    const tipo = p.tipo || '';
    if (!hoy) return { tipo: tipo, desde: '', hasta: '' };
    if (tipo === 'hoy') return { tipo: 'hoy', desde: hoy, hasta: hoy };
    if (tipo === 'mes') {
      const d = parseDay(hoy);
      if (!d) return { tipo: 'mes', desde: '', hasta: '' };
      const desde = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { tipo: 'mes', desde: desde, hasta: toIso(last) };
    }
    if (tipo === 'semana') {
      const d = parseDay(hoy);
      if (!d) return { tipo: 'semana', desde: '', hasta: '' };
      const dow = d.getDay();
      const diff = dow === 0 ? 6 : dow - 1;
      const ini = addDays(hoy, -diff);
      return { tipo: 'semana', desde: ini, hasta: hoy };
    }
    if (tipo === 'anio') {
      const d = parseDay(hoy);
      if (!d) return { tipo: 'anio', desde: '', hasta: '' };
      return { tipo: 'anio', desde: d.getFullYear() + '-01-01', hasta: hoy };
    }
    if (tipo === 'ultimos_meses' && p.meses > 0) {
      const desde = addMonths(hoy, -p.meses);
      return { tipo: 'ultimos_meses', desde: desde, hasta: hoy, meses: p.meses };
    }
    return { tipo: tipo, desde: '', hasta: '' };
  }

  function enPeriodo(fecha, rango) {
    if (!fecha || !rango || !rango.desde || !rango.hasta) return false;
    return fecha >= rango.desde && fecha <= rango.hasta;
  }

  function fechaReferenciaMantenimiento(serviciosCliente) {
    const conFecha = (serviciosCliente || []).filter(function (s) { return !!s.fecha; }).slice().sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha));
    });
    const instalaciones = conFecha.filter(function (s) { return s.tipo_servicio === 'instalacion'; });
    const mantenimientos = conFecha.filter(function (s) { return s.tipo_servicio === 'mantenimiento'; });
    if (!instalaciones.length && !mantenimientos.length) return null;
    const ultimaInst = instalaciones.length ? instalaciones[instalaciones.length - 1] : null;
    const ultimoMant = mantenimientos.length ? mantenimientos[mantenimientos.length - 1] : null;
    if (ultimaInst && ultimoMant && ultimoMant.fecha >= ultimaInst.fecha) return ultimoMant;
    if (ultimaInst) return ultimaInst;
    return ultimoMant;
  }

  function porCliente(lista) {
    const map = {};
    (lista || []).forEach(function (item) {
      const k = claveCliente(item.cliente);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(item);
    });
    return map;
  }

  function hayCierrePosterior(cot, servicios, cuentas) {
    const k = claveCliente(cot.cliente);
    if (!k) return false;
    const despues = function (rec) {
      if (claveCliente(rec.cliente) !== k) return false;
      if (!cot.fecha || !rec.fecha) return rec.numero && cot.numero && rec.numero === cot.numero;
      return rec.fecha >= cot.fecha;
    };
    return (servicios || []).some(despues) || (cuentas || []).some(despues);
  }

  function consultarTrabajosHoy(pack) {
    if (!pack.hoy) {
      return vacioConsulta(['No hay una fecha de referencia para interpretar "hoy".']);
    }
    if (!pack.servicios.length) {
      return vacioConsulta(['No hay formatos de servicio en el historial.']);
    }
    const items = pack.servicios.filter(function (s) { return s.fecha === pack.hoy; }).map(itemServicio);
    return { disponible: true, items: items, advertencias: [], meta: { hoy: pack.hoy } };
  }

  function consultarTrabajosPeriodo(pack, periodo) {
    if (!pack.hoy) {
      return vacioConsulta(['No hay una fecha de referencia para el período.']);
    }
    if (!pack.servicios.length) {
      return vacioConsulta(['No hay formatos de servicio en el historial.']);
    }
    const rango = resolverPeriodo(periodo && periodo.tipo ? periodo : { tipo: 'mes' }, pack.hoy);
    if (!rango.desde || !rango.hasta) {
      return vacioConsulta(['No se pudo determinar el período con la fecha de referencia.']);
    }
    const items = pack.servicios.filter(function (s) { return enPeriodo(s.fecha, rango); }).map(itemServicio);
    return { disponible: true, items: items, advertencias: [], meta: { periodo: rango } };
  }

  function consultarMantenimientos(pack, soloVencidos) {
    if (!pack.hoy) {
      return vacioConsulta(['No hay una fecha de referencia para calcular los 6 meses.']);
    }
    if (!pack.servicios.length) {
      return vacioConsulta(['No hay formatos de servicio en el historial.']);
    }
    const grupos = porCliente(pack.servicios);
    const items = [];
    const advertencias = [];
    Object.keys(grupos).forEach(function (k) {
      const lista = grupos[k];
      const ref = fechaReferenciaMantenimiento(lista);
      if (!ref || !ref.fecha) {
        if (lista.some(function (s) { return s.cliente && !s.fecha; })) {
          advertencias.push('El cliente ' + lista[0].cliente + ' no tiene fecha de instalación o mantenimiento. No se calculó el plazo de 6 meses.');
        }
        return;
      }
      const proxima = addMonths(ref.fecha, MESES_MANTENIMIENTO);
      if (!proxima) return;
      const dias = diasEntre(pack.hoy, proxima);
      if (dias == null) return;
      const vencido = dias <= 0;
      if (soloVencidos && !vencido) return;
      if (!soloVencidos && vencido) return;
      items.push({
        cliente: lista[0].cliente,
        numero: ref.numero,
        fecha: ref.fecha,
        fecha_proxima: proxima,
        dias: dias,
        tipo: ref.tipo_servicio,
        modulo: 'formato',
        estado: vencido ? 'vencido' : 'proximo',
        concepto: ref.concepto
      });
    });
    const sinFechaUtil = pack.servicios.every(function (s) {
      return !s.fecha || (s.tipo_servicio !== 'instalacion' && s.tipo_servicio !== 'mantenimiento');
    });
    if (sinFechaUtil && !items.length) {
      return vacioConsulta(['No hay una fecha real de instalación o mantenimiento para calcular los 6 meses.']);
    }
    return { disponible: true, items: items, advertencias: advertencias, meta: { meses: MESES_MANTENIMIENTO } };
  }

  function consultarClientesSinSeguimiento(pack) {
    if (!pack.hoy) {
      return vacioConsulta(['No hay una fecha de referencia para calcular los 180 días.']);
    }
    if (!pack.servicios.length) {
      return vacioConsulta(['No hay formatos de servicio en el historial.']);
    }
    const grupos = porCliente(pack.servicios);
    const items = [];
    Object.keys(grupos).forEach(function (k) {
      const lista = grupos[k].filter(function (s) { return !!s.fecha; }).slice().sort(function (a, b) {
        return String(b.fecha).localeCompare(String(a.fecha));
      });
      if (!lista.length) return;
      const ultimo = lista[0];
      const dias = diasEntre(ultimo.fecha, pack.hoy);
      if (dias == null || dias < DIAS_SEGUIMIENTO) return;
      items.push({
        cliente: ultimo.cliente,
        numero: ultimo.numero,
        fecha: ultimo.fecha,
        dias_sin_servicio: dias,
        tipo: ultimo.tipo_servicio,
        modulo: 'formato',
        concepto: ultimo.concepto
      });
    });
    return { disponible: true, items: items, advertencias: [], meta: { dias_minimos: DIAS_SEGUIMIENTO } };
  }

  function consultarCotizaciones(pack, soloCerradas) {
    if (!pack.cotizaciones.length) {
      return vacioConsulta(['No hay cotizaciones guardadas ni un borrador con datos suficientes.']);
    }
    const items = [];
    const advertencias = [];
    pack.cotizaciones.forEach(function (cot) {
      if (!cot.cliente) {
        advertencias.push('La cotización ' + (cot.numero || 'sin número') + ' no tiene cliente. No se clasificó.');
        return;
      }
      const cerrada = hayCierrePosterior(cot, pack.servicios, pack.cuentas);
      if (soloCerradas && !cerrada) return;
      if (!soloCerradas && cerrada) return;
      items.push({
        cliente: cot.cliente,
        numero: cot.numero,
        fecha: cot.fecha,
        tipo: cerrada ? 'cerrada' : 'pendiente',
        modulo: 'cotizacion',
        estado: cot.estado,
        total: cot.total,
        es_borrador: !!cot.es_borrador
      });
    });
    return { disponible: true, items: items, advertencias: advertencias, meta: {} };
  }

  function consultarCuentasCobro(pack) {
    if (!pack.cuentas.length) {
      return vacioConsulta(['No hay cuentas de cobro en el historial.']);
    }
    const items = pack.cuentas.map(function (c) {
      return {
        cliente: c.cliente,
        numero: c.numero,
        fecha: c.fecha,
        tipo: 'cuenta-cobro',
        modulo: 'cuenta-cobro',
        estado: c.estado,
        total: c.total,
        concepto: c.concepto
      };
    });
    return {
      disponible: true,
      items: items,
      advertencias: ['ARPASuite no registra un estado pagada/pendiente en la cuenta de cobro. Se listan las cuentas existentes; no se inventa cuáles están pendientes de pago.'],
      meta: {}
    };
  }

  function consultarHistorialCliente(pack, nombre) {
    const k = claveCliente(nombre);
    if (!k) {
      return vacioConsulta(['No se indicó el cliente.']);
    }
    if (!hayFuente(pack)) {
      return vacioConsulta(['No hay historial ni clientes para consultar.']);
    }
    const items = pack.historial.filter(function (r) {
      return claveCliente(r.cliente) === k;
    }).map(itemServicio);
    const enAgenda = pack.clientes.some(function (c) { return claveCliente(c.nombre) === k; });
    if (!items.length && !enAgenda) {
      return vacioConsulta(['No hay registros del cliente indicado.']);
    }
    return {
      disponible: true,
      items: items,
      advertencias: items.length ? [] : ['El cliente existe en la agenda pero no tiene documentos en el historial.'],
      meta: { cliente: nombre }
    };
  }

  function consultarVentas(pack, periodo) {
    if (!pack.hoy) {
      return vacioConsulta(['No hay una fecha de referencia para el período de ventas.']);
    }
    if (!pack.cotizaciones.length && !pack.cuentas.length) {
      return vacioConsulta(['No hay cotizaciones ni cuentas de cobro con las que calcular ventas.']);
    }
    const rango = resolverPeriodo(periodo && periodo.tipo ? periodo : { tipo: 'mes' }, pack.hoy);
    if (!rango.desde || !rango.hasta) {
      return vacioConsulta(['No se pudo determinar el período de ventas.']);
    }
    const docs = pack.cotizaciones.concat(pack.cuentas).filter(function (r) {
      return enPeriodo(r.fecha, rango);
    });
    let total = 0;
    let conTotal = 0;
    docs.forEach(function (r) {
      if (r.total == null) return;
      total += r.total;
      conTotal += 1;
    });
    const advertencias = [];
    if (docs.length && conTotal < docs.length) {
      advertencias.push((docs.length - conTotal) + ' documento(s) del período no tienen total. No se inventó el monto.');
    }
    return {
      disponible: true,
      items: docs.map(itemServicio),
      advertencias: advertencias,
      meta: {
        periodo: rango,
        cantidad: docs.length,
        cantidad_con_total: conTotal,
        total_registrado: conTotal ? total : null
      }
    };
  }

  function ejecutar(intencion, pack, parsed, contexto) {
    const datos = pack && typeof pack === 'object' ? pack : extraer({});
    const p = parsed && typeof parsed === 'object' ? parsed : {};
    const ctx = contexto && typeof contexto === 'object' ? contexto : {};
    switch (intencion) {
      case 'trabajos_hoy':
        return consultarTrabajosHoy(datos);
      case 'trabajos_periodo':
        return consultarTrabajosPeriodo(datos, p.periodo);
      case 'mantenimientos_proximos':
        return consultarMantenimientos(datos, false);
      case 'mantenimientos_vencidos':
        return consultarMantenimientos(datos, true);
      case 'clientes_sin_seguimiento':
        return consultarClientesSinSeguimiento(datos);
      case 'cotizaciones_pendientes':
        return consultarCotizaciones(datos, false);
      case 'cotizaciones_cerradas':
        return consultarCotizaciones(datos, true);
      case 'cuentas_cobro_pendientes':
        return consultarCuentasCobro(datos);
      case 'cliente_historial': {
        const nombre = trimStr(p.cliente) || trimStr(ctx.cliente);
        return consultarHistorialCliente(datos, nombre);
      }
      case 'resumen_ventas':
        return consultarVentas(datos, p.periodo && p.periodo.tipo ? p.periodo : { tipo: 'mes' });
      default:
        return vacioConsulta(['No se pudo determinar la intención. No se inventó una consulta.']);
    }
  }

  global.ArpaIaCopilotoConsultas = {
    extraer: extraer,
    leerDesdeArpaSuite: leerDesdeArpaSuite,
    leerOficioConfigurado: leerOficioConfigurado,
    ejecutar: ejecutar,
    parseFecha: parseFecha,
    addMonths: addMonths,
    diasEntre: diasEntre,
    MESES_MANTENIMIENTO: MESES_MANTENIMIENTO,
    DIAS_SEGUIMIENTO: DIAS_SEGUIMIENTO
  };
})(typeof window !== 'undefined' ? window : globalThis);
