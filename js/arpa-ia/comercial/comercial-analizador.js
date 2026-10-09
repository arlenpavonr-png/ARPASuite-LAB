/**
 * Análisis comercial local a partir de historial, cotizaciones y clientes reales.
 * No inventa. Si falta un dato, lo marca como faltante.
 */
(function (global) {
  function clave(nombre) {
    const datos = global.ArpaIaComercialDatos;
    return datos ? datos.claveCliente(nombre) : String(nombre || '').trim().toLowerCase();
  }

  function porCliente(lista) {
    const map = {};
    (lista || []).forEach(function (item) {
      const k = clave(item.cliente);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(item);
    });
    return map;
  }

  function sortFechaAsc(a, b) {
    return String(a.fecha || '').localeCompare(String(b.fecha || ''));
  }

  function sortFechaDesc(a, b) {
    return String(b.fecha || '').localeCompare(String(a.fecha || ''));
  }

  function hayCierrePosterior(cot, servicios, cuentas) {
    const k = clave(cot.cliente);
    if (!k) return false;
    const despues = function (rec) {
      if (clave(rec.cliente) !== k) return false;
      if (!cot.fecha || !rec.fecha) return rec.numero && cot.numero && rec.numero === cot.numero;
      return rec.fecha >= cot.fecha;
    };
    const servicioDespues = (servicios || []).some(despues);
    const cobroDespues = (cuentas || []).some(despues);
    return servicioDespues || cobroDespues;
  }

  function fechaReferenciaMantenimiento(serviciosCliente) {
    const conFecha = (serviciosCliente || []).filter(function (s) { return !!s.fecha; }).sort(sortFechaAsc);
    const instalaciones = conFecha.filter(function (s) { return s.tipo_servicio === 'instalacion'; });
    const mantenimientos = conFecha.filter(function (s) { return s.tipo_servicio === 'mantenimiento'; });
    if (!instalaciones.length && !mantenimientos.length) return null;
    const ultimaInst = instalaciones.length ? instalaciones[instalaciones.length - 1] : null;
    const ultimoMant = mantenimientos.length ? mantenimientos[mantenimientos.length - 1] : null;
    if (ultimaInst && ultimoMant && ultimoMant.fecha >= ultimaInst.fecha) return ultimoMant;
    if (ultimaInst) return ultimaInst;
    return ultimoMant;
  }

  function analizarMantenimiento(datos, reglas) {
    const out = [];
    const grupos = porCliente(datos.servicios);
    Object.keys(grupos).forEach(function (k) {
      const lista = grupos[k];
      const cliente = lista[0].cliente;
      const ref = fechaReferenciaMantenimiento(lista);
      if (!ref || !ref.fecha) return;
      const proxima = reglas.fechaProximaMantenimiento(ref.fecha);
      if (!proxima) return;
      const dias = reglas.diasEntre(datos.hoy, proxima);
      if (dias == null) return;
      const vencido = dias <= 0;
      out.push(reglas.oportunidad({
        id: ref.id || '',
        numero: ref.numero || '',
        cliente: cliente,
        tipo: vencido ? reglas.TIPOS.MANTENIMIENTO_VENCIDO : reglas.TIPOS.MANTENIMIENTO_PROXIMO,
        motivo: vencido
          ? 'Hay una ' + (ref.tipo_servicio === 'mantenimiento' ? 'fecha de mantenimiento' : 'fecha de instalación') +
            ' (' + ref.fecha + '). El mantenimiento preventivo a 6 meses venció el ' + proxima + '.'
          : 'Hay una ' + (ref.tipo_servicio === 'mantenimiento' ? 'fecha de mantenimiento' : 'fecha de instalación') +
            ' (' + ref.fecha + '). El mantenimiento preventivo se recomienda a los 6 meses, el ' + proxima + '.',
        servicio_relacionado: ref.servicio_relacionado,
        fecha_referencia: ref.fecha,
        fecha_proxima: proxima,
        dias_para_vencimiento: dias,
        prioridad: reglas.prioridadMantenimiento(dias),
        accion_sugerida: vencido
          ? 'Ofrecer mantenimiento preventivo vencido.'
          : 'Programar o cotizar el mantenimiento preventivo antes de la fecha recomendada.'
      }));
    });
    return out;
  }

  function analizarSeguimiento(datos, reglas) {
    const out = [];
    const grupos = porCliente(datos.servicios);
    Object.keys(grupos).forEach(function (k) {
      const lista = grupos[k].filter(function (s) { return !!s.fecha; }).sort(sortFechaDesc);
      if (!lista.length) return;
      const ultimo = lista[0];
      const dias = reglas.diasEntre(ultimo.fecha, datos.hoy);
      if (dias == null || dias < 180) return;
      out.push(reglas.oportunidad({
        id: ultimo.id || '',
        numero: ultimo.numero || '',
        cliente: ultimo.cliente,
        tipo: reglas.TIPOS.SEGUIMIENTO_CLIENTE,
        motivo: 'El cliente tiene servicios registrados y el último es del ' + ultimo.fecha +
          ' (' + dias + ' días sin un nuevo servicio).',
        servicio_relacionado: ultimo.servicio_relacionado,
        fecha_referencia: ultimo.fecha,
        fecha_proxima: '',
        dias_para_vencimiento: null,
        prioridad: reglas.prioridadSeguimiento(dias),
        accion_sugerida: 'Contactar para seguimiento comercial. No se inventó un servicio nuevo.'
      }));
    });
    return out;
  }

  function analizarRecurrente(datos, reglas) {
    const out = [];
    const grupos = porCliente(datos.servicios);
    Object.keys(grupos).forEach(function (k) {
      const lista = grupos[k];
      if (lista.length < 2) return;
      const conFecha = lista.filter(function (s) { return !!s.fecha; }).sort(sortFechaDesc);
      const ultimo = conFecha[0] || lista[0];
      out.push(reglas.oportunidad({
        id: ultimo.id || '',
        numero: ultimo.numero || '',
        cliente: lista[0].cliente,
        tipo: reglas.TIPOS.OPORTUNIDAD_RECURRENTE,
        motivo: 'El cliente tiene ' + lista.length + ' servicios de formato registrados. Es un cliente recurrente.',
        servicio_relacionado: ultimo.servicio_relacionado,
        fecha_referencia: ultimo.fecha || '',
        fecha_proxima: '',
        dias_para_vencimiento: null,
        prioridad: 'MEDIA',
        accion_sugerida: 'Proponer un plan de mantenimiento o un nuevo servicio a partir del historial real.'
      }));
    });
    return out;
  }

  function analizarCotizaciones(datos, reglas) {
    const out = [];
    (datos.cotizaciones || []).forEach(function (cot) {
      if (!cot.cliente) return;
      if (hayCierrePosterior(cot, datos.servicios, datos.cuentas)) return;
      const dias = cot.fecha ? reglas.diasEntre(cot.fecha, datos.hoy) : null;
      const faltantes = [];
      if (!cot.fecha) faltantes.push('fecha de la cotización');
      if (cot.total == null) faltantes.push('total de la cotización');
      const totalTxt = cot.total == null ? '' : ' Total registrado: ' + cot.total + '.';
      out.push(reglas.oportunidad({
        id: cot.id || '',
        numero: cot.numero || '',
        cliente: cot.cliente,
        tipo: reglas.TIPOS.COTIZACION_SIN_CIERRE,
        motivo: (cot.es_borrador
          ? 'Hay una cotización en borrador sin documento guardado ni cierre posterior.'
          : 'Hay una cotización guardada y no aparece un formato ni una cuenta de cobro posterior del mismo cliente.') +
          totalTxt,
        servicio_relacionado: cot.servicio_relacionado,
        fecha_referencia: cot.fecha || '',
        fecha_proxima: '',
        dias_para_vencimiento: null,
        prioridad: reglas.prioridadCotizacion(dias),
        accion_sugerida: 'Hacer seguimiento de la cotización existente. No se inventó un cierre ni un precio.',
        faltantes: faltantes
      }));
    });
    return out;
  }

  function recogerFaltantes(datos) {
    const faltantes = [];
    const sinNombre = (datos.historial || []).filter(function (r) { return !r.cliente; });
    if (sinNombre.length) {
      faltantes.push({
        cliente: '',
        faltan: ['cliente'],
        detalle: 'Hay ' + sinNombre.length + ' registro(s) sin nombre de cliente. No se creó oportunidad.'
      });
    }
    (datos.servicios || []).forEach(function (s) {
      if (!s.cliente) return;
      const faltan = [];
      if (!s.fecha) faltan.push('fecha');
      if (!s.tipo_servicio) faltan.push('tipo_servicio');
      if (!faltan.length) return;
      faltantes.push({
        cliente: s.cliente,
        faltan: faltan,
        detalle: 'El servicio ' + (s.numero || 'sin número') + ' no tiene ' + faltan.join(' y ') + '.'
      });
    });
    (datos.cotizaciones || []).forEach(function (c) {
      if (c.cliente) return;
      faltantes.push({
        cliente: '',
        faltan: ['cliente'],
        detalle: 'La cotización ' + (c.numero || 'sin número') + ' no tiene cliente. No se creó oportunidad.'
      });
    });
    if (!datos.servicios.length && !datos.cotizaciones.length && !datos.cuentas.length && !datos.clientes.length) {
      faltantes.push({
        cliente: '',
        faltan: ['historial', 'clientes'],
        detalle: 'No hay historial ni clientes para analizar.'
      });
    }
    return faltantes;
  }

  function uniqOportunidades(lista) {
    const seen = {};
    const out = [];
    (lista || []).forEach(function (op) {
      const k = [op.tipo, clave(op.cliente), op.fecha_referencia, op.servicio_relacionado].join('|');
      if (seen[k]) return;
      seen[k] = true;
      out.push(op);
    });
    return out;
  }

  function ordenar(lista) {
    const rank = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    return (lista || []).slice().sort(function (a, b) {
      const pa = rank[a.prioridad] != null ? rank[a.prioridad] : 9;
      const pb = rank[b.prioridad] != null ? rank[b.prioridad] : 9;
      if (pa !== pb) return pa - pb;
      return String(a.cliente || '').localeCompare(String(b.cliente || ''));
    });
  }

  function analizar(datos) {
    const reglas = global.ArpaIaComercialReglas;
    const pack = datos && typeof datos === 'object' ? datos : { hoy: '', servicios: [], cotizaciones: [], cuentas: [], historial: [], clientes: [] };
    const oportunidades = ordenar(uniqOportunidades([].concat(
      analizarMantenimiento(pack, reglas),
      analizarSeguimiento(pack, reglas),
      analizarRecurrente(pack, reglas),
      analizarCotizaciones(pack, reglas)
    )));
    const porTipo = {};
    const porPrioridad = { ALTA: 0, MEDIA: 0, BAJA: 0 };
    oportunidades.forEach(function (op) {
      porTipo[op.tipo] = (porTipo[op.tipo] || 0) + 1;
      if (porPrioridad[op.prioridad] != null) porPrioridad[op.prioridad] += 1;
    });
    return {
      ok: true,
      fuente: 'local',
      hoy: pack.hoy || '',
      oportunidades: oportunidades,
      faltantes: recogerFaltantes(pack),
      resumen: {
        total: oportunidades.length,
        por_tipo: porTipo,
        por_prioridad: porPrioridad
      }
    };
  }

  global.ArpaIaComercialAnalizador = {
    analizar: analizar,
    fechaReferenciaMantenimiento: fechaReferenciaMantenimiento
  };
})(typeof window !== 'undefined' ? window : globalThis);
