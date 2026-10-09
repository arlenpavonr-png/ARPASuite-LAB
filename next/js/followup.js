const TYPE_META = {
  maintenance: {
    label: 'Próximo mantenimiento',
    days: 180,
  },
  repair: {
    label: 'Reparación pendiente',
    days: 7,
  },
  quote: {
    label: 'Cotización pendiente',
    days: 3,
  },
  commercial: {
    label: 'Seguimiento comercial',
    days: 14,
  },
  recommendation: {
    label: 'Recomendación al cliente',
    days: 15,
  },
};

export function followUpLabel(type) {
  return TYPE_META[type]?.label || type;
}

export function addDays(iso, days) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) d.setTime(Date.now());
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

export function planFollowups(context) {
  const types = new Set(context?.followUpTypes || []);
  const now = context?.now || new Date().toISOString();
  const recs = (context?.recommendations || []).map((r) => r.text).filter(Boolean);

  if (context?.quoteHasItems) types.add('quote');
  if (recs.length) types.add('recommendation');
  if (context?.serviceType === 'instalacion' || context?.serviceType === 'mantenimiento') {
    types.add('maintenance');
  }

  const plans = [];
  for (const type of types) {
    const meta = TYPE_META[type];
    if (!meta) continue;
    let notes = '';
    if (type === 'recommendation') notes = recs.slice(0, 3).join(' ');
    if (type === 'repair') notes = recs[0] || 'Reparación detectada en servicio.';
    if (type === 'quote') notes = 'Enviar borrador de cotización al cliente.';
    if (type === 'maintenance') notes = 'Mantenimiento preventivo cada 6 meses.';
    plans.push({
      type,
      label: meta.label,
      dueDate: addDays(now, meta.days),
      notes,
      status: 'open',
    });
  }
  return plans;
}

export function isOverdue(followup, todayIso) {
  if (!followup || followup.status === 'done' || followup.status === 'cancelled') return false;
  const due = String(followup.dueDate || '').slice(0, 10);
  const today = String(todayIso || new Date().toISOString()).slice(0, 10);
  return due && due < today;
}

export function serviceTypeFromFollowup(type) {
  if (type === 'repair') return 'reparacion';
  if (type === 'instalacion') return 'instalacion';
  return 'mantenimiento';
}

export function filterFollowups(list, filter, todayIso) {
  const rows = Array.isArray(list) ? list : [];
  if (filter === 'done') return rows.filter((f) => f.status === 'done' || f.status === 'cancelled');
  if (filter === 'overdue') return rows.filter((f) => isOverdue(f, todayIso));
  return rows.filter((f) => f.status === 'open');
}

/**
 * Mensaje de WhatsApp para recordarle al cliente su seguimiento.
 * El técnico lo revisa en WhatsApp antes de enviarlo.
 */
export function followupWhatsAppMessage(followup, ctx = {}) {
  const nombre = String(ctx.clientName || '').trim();
  const saludo = nombre ? `Hola ${nombre}` : 'Hola';
  const company = String(ctx.companyName || '').trim();
  const firma = company ? ` Quedamos atentos. ${company}.` : ' Quedamos atentos.';
  const equipo = String(ctx.equipmentLabel || '').trim().toLowerCase();
  const del = equipo ? ` de su ${equipo}` : '';
  switch (followup?.type) {
    case 'maintenance':
      return `${saludo}, ya le corresponde el mantenimiento preventivo${del}. ¿Qué día le queda bien que pasemos?${firma}`;
    case 'repair':
      return `${saludo}, le escribimos por la reparación pendiente${del}${followup.notes ? ` (${followup.notes})` : ''}. ¿Cuándo podemos programarla?${firma}`;
    case 'quote':
      return `${saludo}, ¿pudo revisar la cotización que le enviamos? Con gusto le resolvemos cualquier duda.${firma}`;
    case 'recommendation':
      return `${saludo}, le recordamos lo que vimos en el último servicio${del}${followup.notes ? `: ${followup.notes}` : ''}. ¿Desea que lo programemos?${firma}`;
    default:
      return `${saludo}, le escribimos para hacerle seguimiento${del}. ¿Le podemos ayudar en algo?${firma}`;
  }
}

/** Corre la fecha del seguimiento: desde hoy si ya venció, si no desde su fecha. */
export function postponeFollowup(followup, days, todayIso) {
  const today = String(todayIso || new Date().toISOString()).slice(0, 10);
  const due = String(followup?.dueDate || '').slice(0, 10);
  const base = due && due >= today ? due : today;
  return { ...followup, dueDate: addDays(base + 'T12:00:00', days || 7) };
}
