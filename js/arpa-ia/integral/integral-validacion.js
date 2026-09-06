/**
 * Validación de ARPA IA INTEGRAL.
 * El oficio configurado no se cambia. No hay escritura. No se confirman diagnósticos.
 */
(function (global) {
  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function asList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  function leerOficioConfigurado(contexto) {
    const consultas = global.ArpaIaCopilotoConsultas;
    if (consultas && typeof consultas.leerOficioConfigurado === 'function') {
      return trimStr(consultas.leerOficioConfigurado(contexto || {}));
    }
    const src = contexto && typeof contexto === 'object' ? contexto : {};
    if (src.oficio || src.oficio_id) return trimStr(src.oficio || src.oficio_id);
    try {
      const ofic = global.ArpaOficios;
      if (ofic && typeof ofic.getActiveFormatoOficioId === 'function') {
        return trimStr(ofic.getActiveFormatoOficioId());
      }
    } catch (e) { /* solo lectura */ }
    return '';
  }

  function otSuficiente(ot) {
    if (!ot || typeof ot !== 'object') {
      return { ok: false, motivo: 'No hay OT disponible. No se inventó un informe.' };
    }
    const numero = trimStr(ot.numero_ot || ot.numero);
    const cliente = trimStr(ot.cliente || ot.nombre_cliente || ot.cliente_nombre);
    const desc = trimStr(ot.descripcion_trabajo || ot.descripcion || ot.trabajo);
    const tipo = trimStr(ot.tipo_servicio || ot.tipo);
    const equipo = trimStr(ot.equipo);
    const trabajos = asList(ot.trabajos_realizados || ot.trabajos_ejecutados);
    const hallazgos = asList(ot.hallazgos);
    const sintomas = asList(ot.sintomas);
    const identidad = !!(numero || cliente);
    const contenido = !!(desc || tipo || equipo || trabajos.length || hallazgos.length || sintomas.length);
    if (!identidad && !contenido) {
      return { ok: false, motivo: 'No hay datos de OT. No se inventó un informe.' };
    }
    if (!identidad) {
      return { ok: false, motivo: 'La OT no tiene número ni cliente. No se inventó un informe.' };
    }
    if (!contenido) {
      return { ok: false, motivo: 'La OT no tiene hechos de trabajo suficientes. No se inventó un informe.' };
    }
    return { ok: true, motivo: '' };
  }

  function hechosOt(ot) {
    if (!ot || typeof ot !== 'object') return [];
    const campos = [
      ['numero', trimStr(ot.numero_ot || ot.numero)],
      ['cliente', trimStr(ot.cliente || ot.nombre_cliente)],
      ['fecha', trimStr(ot.fecha)],
      ['tipo', trimStr(ot.tipo_servicio || ot.tipo)],
      ['equipo', trimStr(ot.equipo)],
      ['marca', trimStr(ot.marca)],
      ['modelo', trimStr(ot.modelo)]
    ];
    return campos.filter(function (row) { return !!row[1]; }).map(function (row) {
      return { campo: row[0], valor: row[1] };
    });
  }

  function nombresConocidos(contexto) {
    const ctx = contexto && typeof contexto === 'object' ? contexto : {};
    const seen = {};
    function add(nombre) {
      const k = trimStr(nombre).toLowerCase();
      if (k) seen[k] = true;
    }
    asList(ctx.clientes).forEach(function (c) {
      add(c && (c.nombre || c.nom || c.cliente));
    });
    asList(ctx.historial).forEach(function (r) {
      add(r && r.cliente);
    });
    if (ctx.ot) add(ctx.ot.cliente || ctx.ot.nombre_cliente);
    return seen;
  }

  function advertenciasAmenaza(amenazas) {
    const flags = amenazas || [];
    const out = [];
    if (flags.indexOf('cambiar_oficio') >= 0) {
      out.push('Se rechazó el intento de cambiar el oficio. El oficio lo configura usted en ARPASuite.');
    }
    if (flags.indexOf('inventar_precio') >= 0) {
      out.push('Se rechazó inventar un precio. Solo se usan precios del catálogo real.');
    }
    if (flags.indexOf('confirmar_diagnostico') >= 0) {
      out.push('Se rechazó confirmar un diagnóstico. Las causas siguen siendo hipótesis.');
    }
    if (flags.indexOf('escribir') >= 0) {
      out.push('Se rechazó escribir datos. ARPA IA INTEGRAL es solo lectura.');
    }
    if (flags.indexOf('jailbreak') >= 0) {
      out.push('Se rechazaron instrucciones que intentan anular las reglas del sistema.');
    }
    return out;
  }

  function validarSalida(intencion, resultado, contexto, amenazas) {
    const oficio = leerOficioConfigurado(contexto);
    const ads = advertenciasAmenaza(amenazas);
    const out = {
      oficio: oficio,
      escritura: false,
      causa_confirmada: false,
      advertencias: ads.slice(),
      ok: true
    };

    if (intencion === 'diagnosticar' && resultado) {
      if (resultado.causa_confirmada === true) {
        resultado.causa_confirmada = false;
        out.advertencias.push('No se confirma el diagnóstico. Las causas son hipótesis.');
      }
      out.causa_confirmada = false;
      if (resultado.oficio_id && oficio && resultado.oficio_id !== oficio) {
        out.advertencias.push('Se conservó el oficio configurado. La IA no cambia el oficio.');
      }
    }

    if (intencion === 'cotizar' && resultado) {
      if (resultado.oficio_id && oficio && resultado.oficio_id !== oficio) {
        out.advertencias.push('Se conservó el oficio configurado. La IA no cambia el oficio.');
      }
    }

    if (intencion === 'consultar' && resultado && resultado.resultados) {
      const known = nombresConocidos(contexto);
      const inventados = (resultado.resultados || []).filter(function (item) {
        const nom = trimStr(item && item.cliente).toLowerCase();
        return nom && !known[nom];
      });
      if (inventados.length) {
        resultado.resultados = [];
        resultado.datos_disponibles = false;
        resultado.resumen = 'NO DISPONIBLE EN LAB';
        out.advertencias.push('Se rechazó un cliente que no existe en los datos disponibles.');
      }
    }

    if (intencion === 'informar' && resultado && resultado.causa_confirmada === true && !(contexto && contexto.ot && contexto.ot.diagnostico_confirmado)) {
      resultado.causa_confirmada = false;
      out.advertencias.push('No se confirmó un diagnóstico. Solo se usan hechos de la OT.');
    }

    return out;
  }

  global.ArpaIaIntegralValidacion = {
    leerOficioConfigurado: leerOficioConfigurado,
    otSuficiente: otSuficiente,
    hechosOt: hechosOt,
    advertenciasAmenaza: advertenciasAmenaza,
    validarSalida: validarSalida
  };
})(typeof window !== 'undefined' ? window : globalThis);
