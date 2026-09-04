/**
 * Clasificador local de ARPA IA INTEGRAL.
 * Enum cerrado. El LLM no inventa intenciones.
 */
(function (global) {
  const INTENCIONES = {
    COTIZAR: 'cotizar',
    DIAGNOSTICAR: 'diagnosticar',
    INFORMAR: 'informar',
    CONSULTAR: 'consultar',
    COMERCIAL: 'comercial',
    DESCONOCIDA: 'desconocida'
  };

  const AMENAZA = {
    CAMBIAR_OFICIO: 'cambiar_oficio',
    INVENTAR_PRECIO: 'inventar_precio',
    CONFIRMAR_DIAGNOSTICO: 'confirmar_diagnostico',
    ESCRIBIR: 'escribir',
    JAILBREAK: 'jailbreak'
  };

  function trimStr(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function normalizar(texto) {
    return trimStr(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tiene(norm, re) {
    return re.test(norm);
  }

  function detectarAmenazas(norm, original) {
    const src = norm || normalizar(original);
    const flags = [];
    if (tiene(src, /\bcambia(?:r)?\s+(?:el\s+)?oficio\b/) ||
        tiene(src, /\boficio\s+a\s+\w+/) ||
        tiene(src, /\bconfigura(?:r)?\s+(?:el\s+)?oficio\b/) ||
        tiene(src, /\busa\s+(?:el\s+)?oficio\s+\w+/)) {
      flags.push(AMENAZA.CAMBIAR_OFICIO);
    }
    if (tiene(src, /\binventa(?:r)?\s+(?:un\s+)?precios?\b/) ||
        tiene(src, /\bprecio\s+(?:de\s+)?(?:\$|cop)?\s*\d/) ||
        tiene(src, /\basigna(?:r)?\s+(?:un\s+)?precio\b/)) {
      flags.push(AMENAZA.INVENTAR_PRECIO);
    }
    if (tiene(src, /\bconfirma(?:r)?\s+(?:el\s+)?diagnostico\b/) ||
        tiene(src, /\bdiagnostico\s+confirmado\b/) ||
        tiene(src, /\bla\s+causa\s+(?:es|esta)\s+confirmada\b/)) {
      flags.push(AMENAZA.CONFIRMAR_DIAGNOSTICO);
    }
    if (tiene(src, /\bcrea(?:r)?\s+(?:un\s+)?(?:cliente|ot|orden|formato|cotizacion|cuenta\s+de\s+cobro)\b/) ||
        tiene(src, /\bconvierte(?:r)?\s+(?:en\s+)?venta\b/) ||
        tiene(src, /\bguarda(?:r)?\s+(?:en\s+)?(?:historial|ot|cliente)\b/) ||
        tiene(src, /\bescribe\s+en\s+(?:la\s+)?(?:ot|cotizacion|historial)\b/)) {
      flags.push(AMENAZA.ESCRIBIR);
    }
    if (tiene(src, /\bignora(?:r)?\s+(?:las\s+)?(?:reglas|instrucciones)\b/) ||
        tiene(src, /\bolvida(?:r)?\s+tus\s+instrucciones\b/) ||
        tiene(src, /\beres\s+libre\b/) ||
        tiene(src, /\bactua\s+sin\s+restricciones\b/) ||
        tiene(src, /\bsystem\s+prompt\b/)) {
      flags.push(AMENAZA.JAILBREAK);
    }
    return flags;
  }

  function sanitizar(texto) {
    return trimStr(texto)
      .replace(/ignora(?:r)?\s+(?:las\s+)?(?:reglas|instrucciones)[^.!?]*/gi, ' ')
      .replace(/olvida(?:r)?\s+tus\s+instrucciones[^.!?]*/gi, ' ')
      .replace(/eres\s+libre[^.!?]*/gi, ' ')
      .replace(/act[uú]a\s+sin\s+restricciones[^.!?]*/gi, ' ')
      .replace(/cambia(?:r)?\s+(?:el\s+)?oficio(?:\s+a\s+\w+)?/gi, ' ')
      .replace(/configura(?:r)?\s+(?:el\s+)?oficio(?:\s+a\s+\w+)?/gi, ' ')
      .replace(/usa\s+(?:el\s+)?oficio\s+\w+/gi, ' ')
      .replace(/oficio\s+a\s+\w+/gi, ' ')
      .replace(/inventa(?:r)?\s+(?:un\s+)?precios?[^.!?]*/gi, ' ')
      .replace(/asigna(?:r)?\s+(?:un\s+)?precio[^.!?]*/gi, ' ')
      .replace(/confirma(?:r)?\s+(?:el\s+)?diagn[oó]stico/gi, ' ')
      .replace(/diagn[oó]stico\s+confirmado/gi, ' ')
      .replace(/crea(?:r)?\s+(?:un\s+)?(?:cliente|ot|orden|formato|cotizaci[oó]n|cuenta\s+de\s+cobro)/gi, ' ')
      .replace(/convierte(?:r)?\s+(?:en\s+)?venta/gi, ' ')
      .replace(/guarda(?:r)?\s+(?:en\s+)?(?:historial|ot|cliente)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esAyudaAmbiguo(norm) {
    const ayuda = tiene(norm, /\bayuda\b/) || tiene(norm, /\bayudame\b/) || tiene(norm, /\bnecesito\s+ayuda\b/);
    const motor = tiene(norm, /\bmotor\b/) || tiene(norm, /\bpuerta\b/);
    return ayuda && motor;
  }

  function esInformar(norm) {
    return tiene(norm, /\binformes?\b/) ||
      tiene(norm, /\bgenera(?:r)?\s+(?:el\s+)?informe\b/) ||
      tiene(norm, /\binforme\s+tecnico\b/) ||
      tiene(norm, /\bredacta(?:r)?\s+(?:el\s+)?informe\b/);
  }

  function esComercial(norm) {
    return tiene(norm, /\boportunidades?\b/) ||
      tiene(norm, /\banalisis\s+comercial\b/) ||
      tiene(norm, /\bseguimiento\s+comercial\b/) ||
      tiene(norm, /\bpanel\s+comercial\b/);
  }

  function esConsultaDatos(norm) {
    const dominio = tiene(norm, /\bmantenimientos?\b/) ||
      tiene(norm, /\btrabajos?\b/) ||
      tiene(norm, /\bservicios?\b/) ||
      tiene(norm, /\bclientes?\b/) ||
      tiene(norm, /\bcotizaciones?\b/) ||
      tiene(norm, /\bcuentas?\s+de\s+cobro\b/) ||
      tiene(norm, /\bhistorial\b/) ||
      tiene(norm, /\bvendi\b/) ||
      tiene(norm, /\bventas\b/);
    const pregunta = tiene(norm, /\b(que|cuales|cuantos|cuantas|muestrame|mostrame|dime|tengo|hay|proximos|pendientes|hoy|vencidos)\b/) ||
      tiene(norm, /\binformacion\s+de\s+(?:un\s+)?cliente\b/);
    const otActual = tiene(norm, /\bque\s+puedo\s+hacer\s+con\s+esta\s+(ot|orden|formato)\b/) ||
      tiene(norm, /\besta\s+ot\b/) && tiene(norm, /\b(puedo|hacer|opciones)\b/);
    return (dominio && pregunta) || otActual || tiene(norm, /\binformacion\s+de\s+(?:un\s+)?cliente\b/);
  }

  function esCotizar(norm) {
    if (tiene(norm, /\bcotizaciones?\b/)) return false;
    return tiene(norm, /\bcotiz(?:ar|ame|a|acion)\b/) ||
      tiene(norm, /\bpresupuesto\b/) ||
      tiene(norm, /\bcuanto\s+(cuesta|vale|sale)\b/) ||
      tiene(norm, /\b(?:necesito|quiero)\s+(?:instalar\s+)?(?:un\s+)?(?:motor|kit)\b/) ||
      tiene(norm, /\binstalar\s+(?:un\s+)?motor\b/) ||
      tiene(norm, /\bkit\s+(?:para|de)\s+(?:una\s+)?puerta\b/);
  }

  function esDiagnosticar(norm) {
    return tiene(norm, /\bno\s+(cierra|abre|responde|prende|funciona|arranca)\b/) ||
      tiene(norm, /\bfotoceldas?\s+(?:estan\s+)?sucias\b/) ||
      tiene(norm, /\b(?:hace|produc(?:e|en))\s+ruido\b/) ||
      tiene(norm, /\bdiagnost/) ||
      tiene(norm, /\bfalla\b/) ||
      tiene(norm, /\bse\s+trab[oó]\b/) ||
      tiene(norm, /\bciclo\s+incompleto\b/) ||
      tiene(norm, /\bno\s+cierra\b/);
  }

  function clasificar(norm) {
    if (!norm) return INTENCIONES.DESCONOCIDA;

    const informar = esInformar(norm);
    const consultaDatos = esConsultaDatos(norm);
    const comercial = esComercial(norm);
    const cotizar = esCotizar(norm);
    const diagnosticar = esDiagnosticar(norm);

    if (esAyudaAmbiguo(norm) && !informar && !consultaDatos && !comercial && !cotizar && !diagnosticar) {
      return INTENCIONES.DESCONOCIDA;
    }

    const hits = [];
    if (informar) hits.push(INTENCIONES.INFORMAR);
    if (consultaDatos) hits.push(INTENCIONES.CONSULTAR);
    if (comercial && !consultaDatos) hits.push(INTENCIONES.COMERCIAL);
    if (comercial && consultaDatos && tiene(norm, /\boportunidades?\b/)) {
      return INTENCIONES.COMERCIAL;
    }
    if (cotizar) hits.push(INTENCIONES.COTIZAR);
    if (diagnosticar) hits.push(INTENCIONES.DIAGNOSTICAR);

    const unique = hits.filter(function (item, i) { return hits.indexOf(item) === i; });
    if (!unique.length) return INTENCIONES.DESCONOCIDA;
    if (unique.length === 1) return unique[0];
    if (cotizar && diagnosticar) return INTENCIONES.DESCONOCIDA;
    if (consultaDatos) return INTENCIONES.CONSULTAR;
    if (informar) return INTENCIONES.INFORMAR;
    return INTENCIONES.DESCONOCIDA;
  }

  function parsear(texto) {
    const original = trimStr(texto);
    const amenazas = detectarAmenazas(normalizar(original), original);
    const util = sanitizar(original);
    const norm = normalizar(util || original);
    const intencion = clasificar(norm);
    return {
      intencion: intencion,
      texto_original: original,
      texto_util: util || original,
      amenazas: amenazas,
      conocida: intencion !== INTENCIONES.DESCONOCIDA
    };
  }

  global.ArpaIaIntegralParser = {
    INTENCIONES: INTENCIONES,
    AMENAZA: AMENAZA,
    parsear: parsear,
    normalizar: normalizar,
    sanitizar: sanitizar
  };
})(typeof window !== 'undefined' ? window : globalThis);
