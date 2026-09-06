/**
 * Parser local de intenciones del Copiloto.
 * No usa LLM. Si no puede clasificar, devuelve desconocida.
 */
(function (global) {
  const INTENCIONES = {
    TRABAJOS_HOY: 'trabajos_hoy',
    TRABAJOS_PERIODO: 'trabajos_periodo',
    MANTENIMIENTOS_PROXIMOS: 'mantenimientos_proximos',
    MANTENIMIENTOS_VENCIDOS: 'mantenimientos_vencidos',
    CLIENTES_SIN_SEGUIMIENTO: 'clientes_sin_seguimiento',
    COTIZACIONES_PENDIENTES: 'cotizaciones_pendientes',
    COTIZACIONES_CERRADAS: 'cotizaciones_cerradas',
    CUENTAS_COBRO_PENDIENTES: 'cuentas_cobro_pendientes',
    CLIENTE_HISTORIAL: 'cliente_historial',
    RESUMEN_VENTAS: 'resumen_ventas',
    DESCONOCIDA: 'desconocida'
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

  function extraerCliente(pregunta, norm) {
    const original = trimStr(pregunta);
    const mEste = /\b(este|esta)\s+cliente\b/i.test(original) || /\beste cliente\b/.test(norm);
    const mNom = original.match(/\bcliente\s+(?!este\b|esta\b)([^?.,;]+)/i);
    if (mNom && mNom[1]) {
      const nombre = trimStr(mNom[1]);
      if (nombre && nombre.toLowerCase() !== 'este' && nombre.toLowerCase() !== 'esta') {
        return { nombre: nombre, es_este: false };
      }
    }
    const mDe = original.match(/\b(?:servicios|historial|trabajos)\s+de\s+(?!este\b|hoy\b|este mes\b)([^?.,;]+)/i);
    if (mDe && mDe[1]) {
      const nombre = trimStr(mDe[1]);
      if (nombre.length >= 3) return { nombre: nombre, es_este: false };
    }
    if (mEste) return { nombre: '', es_este: true };
    return { nombre: '', es_este: false };
  }

  function extraerPeriodo(norm) {
    if (tiene(norm, /\bhoy\b/)) return { tipo: 'hoy' };
    if (tiene(norm, /\besta semana\b/)) return { tipo: 'semana' };
    if (tiene(norm, /\beste ano\b/)) return { tipo: 'anio' };
    const ult = norm.match(/\bultimos?\s+(\d+)\s+meses?\b/);
    if (ult) return { tipo: 'ultimos_meses', meses: parseInt(ult[1], 10) };
    if (tiene(norm, /\bultimos?\s+seis\s+meses\b/) || tiene(norm, /\bultimos?\s+6\s+meses\b/)) {
      return { tipo: 'ultimos_meses', meses: 6 };
    }
    if (tiene(norm, /\beste mes\b/) || tiene(norm, /\bdel mes\b/) || tiene(norm, /\ben el mes\b/)) {
      return { tipo: 'mes' };
    }
    return { tipo: '' };
  }

  function clasificar(norm) {
    const mant = tiene(norm, /\bmantenim/);
    const venc = tiene(norm, /\bvencid|\batrasad/);
    const cotiz = tiene(norm, /\bcotiz/);
    const cobro = tiene(norm, /\bcuentas?\s+de\s+cobro\b/) ||
      tiene(norm, /\bcuenta\s+cobro\b/) ||
      tiene(norm, /\bcobros?\s+pendient/) ||
      (tiene(norm, /\bcobro\b/) && tiene(norm, /\bcuenta/));
    const cliente = tiene(norm, /\bclientes?\b/);
    const seguimiento = tiene(norm, /\bsin\s+servicio/) ||
      tiene(norm, /\bsin\s+atender/) ||
      tiene(norm, /\bno\s+atiendo/) ||
      tiene(norm, /\bsin\s+atencion/) ||
      tiene(norm, /\bseguimiento\b/) ||
      tiene(norm, /\bmas\s+de\s+(6|seis)\s+meses\b/) ||
      tiene(norm, /\bmas\s+de\s+180\s+dias\b/) ||
      tiene(norm, /\bllevan\s+mas\b/) ||
      tiene(norm, /\bhace\s+mas\s+de\b/);
    const ventas = tiene(norm, /\bvendi\b/) ||
      tiene(norm, /\bventas?\b/) ||
      tiene(norm, /\bfactur/) ||
      tiene(norm, /\bcobre\b/) ||
      tiene(norm, /\bingres[oe]/);
    const trabajo = tiene(norm, /\btrabajos?\b/) ||
      tiene(norm, /\bservicios?\b/) ||
      tiene(norm, /\bformatos?\b/) ||
      tiene(norm, /\borders?\b/) ||
      tiene(norm, /\bots?\b/);
    const hoy = tiene(norm, /\bhoy\b/);
    const periodo = extraerPeriodo(norm);
    const histCliente = (tiene(norm, /\bservicios?\b/) || tiene(norm, /\bhistorial\b/) || tiene(norm, /\btrabajos?\b/)) &&
      (tiene(norm, /\beste cliente\b/) || tiene(norm, /\bel cliente\b/) || tiene(norm, /\btiene\b/));

    if (mant && venc) return INTENCIONES.MANTENIMIENTOS_VENCIDOS;
    if (mant) return INTENCIONES.MANTENIMIENTOS_PROXIMOS;
    if (cliente && seguimiento) return INTENCIONES.CLIENTES_SIN_SEGUIMIENTO;
    if (cotiz && tiene(norm, /\bcerrad|aceptad|aprobad/)) return INTENCIONES.COTIZACIONES_CERRADAS;
    if (cotiz) return INTENCIONES.COTIZACIONES_PENDIENTES;
    if (cobro) return INTENCIONES.CUENTAS_COBRO_PENDIENTES;
    if (ventas) return INTENCIONES.RESUMEN_VENTAS;
    if (trabajo && hoy && !tiene(norm, /\beste mes\b/)) return INTENCIONES.TRABAJOS_HOY;
    if (trabajo && (periodo.tipo === 'mes' || periodo.tipo === 'semana' || periodo.tipo === 'anio' || periodo.tipo === 'ultimos_meses')) {
      return INTENCIONES.TRABAJOS_PERIODO;
    }
    if (histCliente) return INTENCIONES.CLIENTE_HISTORIAL;
    return INTENCIONES.DESCONOCIDA;
  }

  function parsear(pregunta) {
    const raw = trimStr(pregunta);
    if (!raw) {
      return {
        intencion: INTENCIONES.DESCONOCIDA,
        pregunta: '',
        periodo: { tipo: '' },
        cliente: '',
        cliente_este: false
      };
    }
    const norm = normalizar(raw);
    const intencion = clasificar(norm);
    const periodo = extraerPeriodo(norm);
    const cli = extraerCliente(raw, norm);
    return {
      intencion: intencion,
      pregunta: raw,
      periodo: periodo,
      cliente: cli.nombre,
      cliente_este: cli.es_este
    };
  }

  global.ArpaIaCopilotoParser = {
    INTENCIONES: INTENCIONES,
    parsear: parsear,
    normalizar: normalizar
  };
})(typeof window !== 'undefined' ? window : globalThis);
