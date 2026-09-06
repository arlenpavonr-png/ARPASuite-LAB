/**
 * Convierte el resultado de una consulta en respuesta estructurada.
 * Nunca inventa cifras, clientes, fechas, trabajos ni estados.
 */
(function (global) {
  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function contar(items) {
    return Array.isArray(items) ? items.length : 0;
  }

  function listarClientes(items) {
    const seen = {};
    const out = [];
    (items || []).forEach(function (it) {
      const n = trimStr(it.cliente);
      if (!n || seen[n.toLowerCase()]) return;
      seen[n.toLowerCase()] = true;
      out.push(n);
    });
    return out;
  }

  function resumenTrabajos(intencion, consulta) {
    const n = contar(consulta.items);
    if (intencion === 'trabajos_hoy') {
      if (!n) return 'No hay trabajos registrados en la fecha de hoy.';
      return n === 1
        ? 'Hay 1 trabajo registrado hoy.'
        : 'Hay ' + n + ' trabajos registrados hoy.';
    }
    if (!n) return 'No hay trabajos registrados en el período consultado.';
    return n === 1
      ? 'Hay 1 trabajo registrado en el período.'
      : 'Hay ' + n + ' trabajos registrados en el período.';
  }

  function resumenMantenimiento(intencion, consulta) {
    const n = contar(consulta.items);
    if (intencion === 'mantenimientos_vencidos') {
      if (!n) return 'No hay mantenimientos vencidos en los registros.';
      return n === 1
        ? 'Hay 1 mantenimiento vencido según la fecha real y el plazo de 6 meses.'
        : 'Hay ' + n + ' mantenimientos vencidos según la fecha real y el plazo de 6 meses.';
    }
    if (!n) return 'No hay mantenimientos próximos en los registros.';
    return n === 1
      ? 'Hay 1 mantenimiento próximo según la fecha real y el plazo de 6 meses.'
      : 'Hay ' + n + ' mantenimientos próximos según la fecha real y el plazo de 6 meses.';
  }

  function resumenSeguimiento(consulta) {
    const n = contar(consulta.items);
    if (!n) return 'No hay clientes con 180 días o más sin un servicio registrado.';
    const nombres = listarClientes(consulta.items);
    return n === 1
      ? 'Hay 1 cliente sin servicio desde hace 180 días o más: ' + nombres[0] + '.'
      : 'Hay ' + n + ' clientes sin servicio desde hace 180 días o más.';
  }

  function resumenCotizaciones(intencion, consulta) {
    const n = contar(consulta.items);
    if (intencion === 'cotizaciones_cerradas') {
      if (!n) return 'No hay cotizaciones cerradas (con formato o cuenta de cobro posterior) en los registros.';
      return n === 1
        ? 'Hay 1 cotización cerrada en los registros.'
        : 'Hay ' + n + ' cotizaciones cerradas en los registros.';
    }
    if (!n) return 'No hay cotizaciones pendientes en los registros.';
    return n === 1
      ? 'Hay 1 cotización pendiente (sin formato ni cuenta de cobro posterior).'
      : 'Hay ' + n + ' cotizaciones pendientes (sin formato ni cuenta de cobro posterior).';
  }

  function resumenCuentas(consulta) {
    const n = contar(consulta.items);
    if (!n) return 'No hay cuentas de cobro en los registros.';
    return n === 1
      ? 'Hay 1 cuenta de cobro registrada. No se inventa si está pagada o pendiente.'
      : 'Hay ' + n + ' cuentas de cobro registradas. No se inventa si están pagadas o pendientes.';
  }

  function resumenCliente(consulta) {
    const n = contar(consulta.items);
    const nombre = consulta.meta && consulta.meta.cliente ? consulta.meta.cliente : 'el cliente';
    if (!n) return 'No hay documentos de ' + nombre + ' en el historial.';
    return n === 1
      ? nombre + ' tiene 1 documento en el historial.'
      : nombre + ' tiene ' + n + ' documentos en el historial.';
  }

  function resumenVentas(consulta) {
    const meta = consulta.meta || {};
    const n = typeof meta.cantidad === 'number' ? meta.cantidad : contar(consulta.items);
    if (!n) return 'No hay cotizaciones ni cuentas de cobro con fecha en el período.';
    if (meta.total_registrado == null) {
      return 'Hay ' + n + ' documento(s) en el período. Ninguno tiene total registrado. No se inventó el monto.';
    }
    return 'Hay ' + n + ' documento(s) en el período. Total registrado: ' + meta.total_registrado + '.';
  }

  function armarResumen(intencion, consulta) {
    if (!consulta || !consulta.disponible) return 'NO DISPONIBLE EN LAB';
    switch (intencion) {
      case 'trabajos_hoy':
      case 'trabajos_periodo':
        return resumenTrabajos(intencion, consulta);
      case 'mantenimientos_proximos':
      case 'mantenimientos_vencidos':
        return resumenMantenimiento(intencion, consulta);
      case 'clientes_sin_seguimiento':
        return resumenSeguimiento(consulta);
      case 'cotizaciones_pendientes':
      case 'cotizaciones_cerradas':
        return resumenCotizaciones(intencion, consulta);
      case 'cuentas_cobro_pendientes':
        return resumenCuentas(consulta);
      case 'cliente_historial':
        return resumenCliente(consulta);
      case 'resumen_ventas':
        return resumenVentas(consulta);
      default:
        return 'NO DISPONIBLE EN LAB';
    }
  }

  function construir(intencion, consulta, extras) {
    const q = consulta && typeof consulta === 'object' ? consulta : {
      disponible: false,
      items: [],
      advertencias: ['No existen datos suficientes para responder.']
    };
    const extra = extras && typeof extras === 'object' ? extras : {};
    const disponible = !!q.disponible;
    const advertencias = Array.isArray(q.advertencias) ? q.advertencias.slice() : [];
    if (!disponible && !advertencias.length) {
      advertencias.push('No existen datos suficientes para responder.');
    }
    const out = {
      ok: true,
      intencion: intencion || 'desconocida',
      datos_disponibles: disponible,
      resultados: disponible && Array.isArray(q.items) ? q.items.slice() : [],
      resumen: armarResumen(intencion, q),
      advertencias: advertencias
    };
    if (extra.oficio) out.oficio = extra.oficio;
    if (extra.hoy) out.hoy = extra.hoy;
    out.fuente = 'local';
    out.resumen_local = out.resumen;
    out.llm_usado = false;
    out.llm_descartado = '';
    return out;
  }

  function aplicarRedaccion(local, redaccion) {
    const src = local && typeof local === 'object' ? local : construir('desconocida', { disponible: false, items: [] });
    const out = {
      ok: true,
      intencion: src.intencion || 'desconocida',
      datos_disponibles: !!src.datos_disponibles,
      resultados: Array.isArray(src.resultados) ? src.resultados.slice() : [],
      resumen: src.resumen || 'NO DISPONIBLE EN LAB',
      advertencias: Array.isArray(src.advertencias) ? src.advertencias.slice() : [],
      fuente: src.fuente || 'local',
      resumen_local: src.resumen_local || src.resumen || '',
      llm_usado: false,
      llm_descartado: ''
    };
    if (src.oficio) out.oficio = src.oficio;
    if (src.hoy) out.hoy = src.hoy;
    const red = redaccion && typeof redaccion === 'object' ? redaccion : {};
    if (red.ok && trimStr(red.resumen)) {
      out.resumen = trimStr(red.resumen);
      out.fuente = 'local+llm';
      out.llm_usado = true;
      out.llm_descartado = '';
    } else {
      out.llm_usado = false;
      out.llm_descartado = trimStr(red.motivo);
    }
    return out;
  }

  global.ArpaIaCopilotoRespuesta = {
    construir: construir,
    aplicarRedaccion: aplicarRedaccion
  };
})(typeof window !== 'undefined' ? window : globalThis);
