/**
 * Reglas de oportunidad y cálculo de mantenimiento a 6 meses.
 * No crea fechas si no hay una fecha real de instalación o mantenimiento.
 */
(function (global) {
  const MESES_MANTENIMIENTO = 6;
  const TIPOS = {
    MANTENIMIENTO_PROXIMO: 'mantenimiento_proximo',
    MANTENIMIENTO_VENCIDO: 'mantenimiento_vencido',
    SEGUIMIENTO_CLIENTE: 'seguimiento_cliente',
    COTIZACION_SIN_CIERRE: 'cotizacion_sin_cierre',
    OPORTUNIDAD_RECURRENTE: 'oportunidad_recurrente'
  };

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

  function diasEntre(desdeIso, hastaIso) {
    const a = parseDay(desdeIso);
    const b = parseDay(hastaIso);
    if (!a || !b) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function fechaProximaMantenimiento(fechaReferencia) {
    return addMonths(fechaReferencia, MESES_MANTENIMIENTO);
  }

  function prioridadMantenimiento(dias) {
    if (dias == null) return '';
    if (dias <= 0) return 'ALTA';
    if (dias <= 30) return 'ALTA';
    if (dias <= 90) return 'MEDIA';
    return 'BAJA';
  }

  function prioridadSeguimiento(diasSinServicio) {
    if (diasSinServicio == null) return '';
    if (diasSinServicio >= 365) return 'ALTA';
    if (diasSinServicio >= 180) return 'MEDIA';
    return 'BAJA';
  }

  function prioridadCotizacion(diasAbierta) {
    if (diasAbierta == null) return 'MEDIA';
    if (diasAbierta >= 30) return 'ALTA';
    if (diasAbierta >= 7) return 'MEDIA';
    return 'BAJA';
  }

  function oportunidad(base) {
    return {
      id: base.id || '',
      numero: base.numero || '',
      cliente: base.cliente || '',
      tipo: base.tipo || '',
      motivo: base.motivo || '',
      servicio_relacionado: base.servicio_relacionado || '',
      fecha_referencia: base.fecha_referencia || '',
      fecha_proxima: base.fecha_proxima || '',
      dias_para_vencimiento: base.dias_para_vencimiento == null ? null : base.dias_para_vencimiento,
      prioridad: base.prioridad || '',
      accion_sugerida: base.accion_sugerida || '',
      faltantes: Array.isArray(base.faltantes) ? base.faltantes.slice() : []
    };
  }

  global.ArpaIaComercialReglas = {
    MESES_MANTENIMIENTO: MESES_MANTENIMIENTO,
    TIPOS: TIPOS,
    addMonths: addMonths,
    diasEntre: diasEntre,
    fechaProximaMantenimiento: fechaProximaMantenimiento,
    prioridadMantenimiento: prioridadMantenimiento,
    prioridadSeguimiento: prioridadSeguimiento,
    prioridadCotizacion: prioridadCotizacion,
    oportunidad: oportunidad
  };
})(typeof window !== 'undefined' ? window : globalThis);
