/**
 * Mantenimientos por hacer: a los 6 meses de cada instalación o mantenimiento.
 * - Al guardar el formato muestra la fecha del próximo mantenimiento y permite agendarla en Google Calendar.
 * - En Historial muestra los vencidos y los de los próximos 30 días, con WhatsApp al cliente en un toque.
 * Todo queda en el dispositivo; no envía nada solo (fase 2: WhatsApp Business API).
 */
(function (global) {
  const ESTADO_KEY = 'arpa_mantenimientos_estado';
  const DIAS = 180;
  const VENTANA_DIAS = 30;
  const DAY = 86400000;

  function norm(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function isoDate(raw) {
    const d = String(raw || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
  }

  function addDays(iso, days) {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY);
  }

  function fmt(iso) {
    return iso ? iso.split('-').reverse().join('/') : '';
  }

  /** Fecha de hoy en hora de Colombia (toISOString usa UTC y después de las 7 p. m. daría mañana). */
  function hoy() {
    if (typeof global.arpaHoyIso === 'function') return global.arpaHoyIso();
    try {
      const p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return p.year + '-' + p.month + '-' + p.day;
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function esInstalacionOMantenimiento(r) {
    if (!r || (r.modulo && r.modulo !== 'formato')) return false;
    const t = norm(r.subtipo || r.tipo);
    return t.startsWith('instalaci') || t.startsWith('mantenimiento');
  }

  function readJson(key, fallback) {
    try {
      const v = JSON.parse(global.localStorage.getItem(key) || 'null');
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function getEstados() {
    const e = readJson(ESTADO_KEY, {});
    return e && typeof e === 'object' && !Array.isArray(e) ? e : {};
  }

  function setEstado(key, data) {
    const all = getEstados();
    all[key] = { ...data, at: new Date().toISOString() };
    try { global.localStorage.setItem(ESTADO_KEY, JSON.stringify(all)); } catch (e) { /* sin espacio */ }
  }

  /**
   * Un mantenimiento por cliente: 6 meses después de su última instalación o mantenimiento.
   * El estado (hecho, descartado, pospuesto) solo vale para esa fecha base: un servicio nuevo reinicia.
   */
  function calcular(records, clientes, estados, today) {
    const ult = new Map();
    for (const r of records || []) {
      if (!esInstalacionOMantenimiento(r)) continue;
      const fecha = isoDate(r.fecha) || isoDate(r.savedAt);
      const key = norm(r.cliente);
      if (!fecha || !key) continue;
      const prev = ult.get(key);
      if (!prev || fecha > prev.fecha) ult.set(key, { fecha, r });
    }
    const out = [];
    for (const [key, { fecha, r }] of ult) {
      const est = (estados || {})[key];
      const vigente = est && est.base === fecha;
      if (vigente && (est.status === 'hecho' || est.status === 'descartado')) continue;
      let vence = addDays(fecha, DIAS);
      if (vigente && est.status === 'pospuesto' && est.hasta > vence) vence = est.hasta;
      const cli = (clientes || []).find((c) => norm(c.nombre) === key) || {};
      const snap = r.fullSnapshot || {};
      out.push({
        key,
        cliente: String(r.cliente || '').trim(),
        tel: cli.tel || snap['formato-cliente-tel'] || '',
        ciudad: r.ciudad || cli.ciudad || '',
        base: fecha,
        tipoBase: r.subtipo || r.tipo || '',
        numero: r.numeroServicio || r.numero || '',
        concepto: r.concepto || '',
        vence,
        dias: daysBetween(today, vence),
        avisadoEl: vigente && est.avisadoEl ? est.avisadoEl : '',
      });
    }
    return out.sort((a, b) => a.vence.localeCompare(b.vence));
  }

  function companyName() {
    return global.ArpaBrand?.getSettings?.()?.companyName?.trim() || '';
  }

  function mensajeCliente(item, company) {
    const nombre = String(item.cliente || '').split(/\s+/)[0] || '';
    const saludo = nombre ? `Hola ${nombre}` : 'Hola';
    const firma = company ? ` Quedamos atentos. ${company}.` : ' Quedamos atentos.';
    const desde = item.tipoBase && /instalaci/i.test(item.tipoBase) ? 'la instalación' : 'el último mantenimiento';
    return `${saludo}, ya se cumplen 6 meses desde ${desde} del ${fmt(item.base)} y le corresponde el mantenimiento preventivo de su equipo. ¿Qué día le queda bien que pasemos?${firma}`;
  }

  function waUrl(tel, text) {
    const t = String(tel || '').replace(/\D/g, '');
    const phone = t.length >= 10 ? (t.length === 10 ? '57' + t : t) : '';
    return (phone ? `https://wa.me/${phone}` : 'https://wa.me/') + '?text=' + encodeURIComponent(text);
  }

  /** Evento de día completo en Google Calendar el día del mantenimiento, con el WhatsApp listo en la descripción. */
  function calendarUrl(item, company) {
    const d1 = item.vence.replace(/-/g, '');
    const d2 = addDays(item.vence, 1).replace(/-/g, '');
    const detalles = [
      `Mantenimiento preventivo de ${item.cliente}${item.ciudad ? ' (' + item.ciudad + ')' : ''}.`,
      `${item.tipoBase || 'Servicio'} del ${fmt(item.base)}${item.numero ? ' · N° ' + item.numero : ''}.`,
      item.concepto ? item.concepto : '',
      item.tel ? 'Avisar al cliente por WhatsApp: ' + waUrl(item.tel, mensajeCliente(item, company)) : '',
    ].filter(Boolean).join('\n');
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Mantenimiento – ${item.cliente}`,
      dates: `${d1}/${d2}`,
      details: detalles,
    });
    if (item.ciudad) p.set('location', item.ciudad);
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  function proximoDesdeRecord(r) {
    if (!esInstalacionOMantenimiento(r)) return null;
    const base = isoDate(r.fecha) || isoDate(r.savedAt);
    if (!base || !String(r.cliente || '').trim()) return null;
    const cli = (global.ArpaHistorial?.getClientes?.() || []).find((c) => norm(c.nombre) === norm(r.cliente)) || {};
    return {
      key: norm(r.cliente),
      cliente: String(r.cliente).trim(),
      tel: cli.tel || r.fullSnapshot?.['formato-cliente-tel'] || '',
      ciudad: r.ciudad || '',
      base,
      tipoBase: r.subtipo || r.tipo || '',
      numero: r.numeroServicio || r.numero || '',
      concepto: r.concepto || '',
      vence: addDays(base, DIAS),
    };
  }

  // ── Interfaz ────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function lista() {
    const records = global.ArpaHistorial?.getRecords?.() || readJson('arpa_suite_servicio_historial', []);
    const clientes = global.ArpaHistorial?.getClientes?.() || [];
    return calcular(records, clientes, getEstados(), hoy());
  }

  function btn(act, key, label, primary) {
    return `<button type="button" data-mant="${act}" data-key="${esc(key)}" style="padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid ${primary ? '#16a34a' : 'var(--border,#d0d7e2)'};background:${primary ? '#16a34a' : '#fff'};color:${primary ? '#fff' : 'var(--navy,#1a2a4a)'};">${label}</button>`;
  }

  function renderPanel() {
    const view = global.document?.getElementById('view-historial');
    if (!view) return;
    let panel = global.document.getElementById('arpa-mant-panel');
    if (!panel) {
      panel = global.document.createElement('div');
      panel.id = 'arpa-mant-panel';
      panel.className = 'no-print';
      const anchor = global.document.getElementById('historial-stats');
      if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor);
      else (view.querySelector('.section') || view).prepend(panel);
      panel.addEventListener('click', onPanelClick);
    }
    const todos = lista();
    const visibles = todos.filter((i) => i.dias <= VENTANA_DIAS);
    const vencidos = visibles.filter((i) => i.dias < 0).length;
    const luego = todos.length - visibles.length;
    if (!todos.length) {
      panel.innerHTML = '';
      return;
    }
    const filas = visibles.map((i) => {
      const cuando = i.dias < 0 ? `<b style="color:#b91c1c;">Vencido hace ${-i.dias} día${i.dias === -1 ? '' : 's'}</b>`
        : i.dias === 0 ? '<b style="color:#b45309;">Es hoy</b>'
          : `En ${i.dias} día${i.dias === 1 ? '' : 's'}`;
      return `<div style="border:1px solid var(--border,#d0d7e2);border-left:4px solid ${i.dias < 0 ? '#dc2626' : '#f59e0b'};border-radius:8px;padding:10px;margin-top:8px;background:#fff;">
        <div style="font-weight:700;color:var(--navy,#1a2a4a);">${esc(i.cliente)}</div>
        <div style="font-size:12px;color:var(--muted,#64748b);margin:2px 0 8px;">${cuando} · ${fmt(i.vence)} · ${esc(i.tipoBase)} del ${fmt(i.base)}${i.avisadoEl ? ' · avisado el ' + fmt(i.avisadoEl) : ''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${i.tel ? btn('wa', i.key, 'WhatsApp al cliente', true) : '<span style="font-size:11px;color:var(--muted,#64748b);align-self:center;">Sin teléfono: agréguelo en el formato</span>'}
          ${btn('cal', i.key, 'Calendario')}
          ${btn('posponer', i.key, '+1 semana')}
          ${btn('hecho', i.key, 'Hecho')}
          ${btn('descartar', i.key, 'Descartar')}
        </div>
      </div>`;
    }).join('');
    panel.innerHTML = `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin-bottom:14px;">
      <div style="font-weight:700;color:var(--navy,#1a2a4a);">🔧 Mantenimientos por hacer${vencidos ? ` · <span style="color:#b91c1c;">${vencidos} vencido${vencidos > 1 ? 's' : ''}</span>` : ''}</div>
      <div style="font-size:12px;color:var(--muted,#64748b);margin-top:2px;">A los 6 meses de cada instalación o mantenimiento.${luego ? ` ${luego} más después de 30 días.` : ''}</div>
      ${filas || '<div style="font-size:12px;color:var(--muted,#64748b);margin-top:8px;">Nada para los próximos 30 días.</div>'}
    </div>`;
  }

  function onPanelClick(ev) {
    const b = ev.target.closest?.('[data-mant]');
    if (!b) return;
    const key = b.getAttribute('data-key');
    const item = lista().find((i) => i.key === key);
    if (!item) return;
    const act = b.getAttribute('data-mant');
    const company = companyName();
    if (act === 'wa') {
      global.open(waUrl(item.tel, mensajeCliente(item, company)), '_blank', 'noopener,noreferrer');
      const prev = getEstados()[key];
      const mismo = prev && prev.base === item.base ? prev : { status: 'pendiente' };
      setEstado(key, { ...mismo, base: item.base, avisadoEl: hoy() });
    } else if (act === 'cal') {
      global.open(calendarUrl(item, company), '_blank', 'noopener,noreferrer');
      return;
    } else if (act === 'posponer') {
      const desde = item.dias < 0 ? hoy() : item.vence;
      setEstado(key, { base: item.base, status: 'pospuesto', hasta: addDays(desde, 7), avisadoEl: item.avisadoEl });
    } else if (act === 'hecho') {
      setEstado(key, { base: item.base, status: 'hecho' });
    } else if (act === 'descartar') {
      if (global.confirm && !global.confirm(`¿Quitar el recordatorio de ${item.cliente}? Vuelve a aparecer si le hace otro servicio.`)) return;
      setEstado(key, { base: item.base, status: 'descartado' });
    }
    renderPanel();
  }

  /** Aviso al guardar: fecha del próximo mantenimiento y botón para agendarlo. */
  function avisoAlGuardar(record) {
    const item = proximoDesdeRecord(record);
    const doc = global.document;
    if (!item || !doc?.body) return;
    doc.getElementById('arpa-mant-aviso')?.remove();
    const box = doc.createElement('div');
    box.id = 'arpa-mant-aviso';
    box.className = 'no-print';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:16px;z-index:9999;max-width:480px;margin:0 auto;background:#0f2044;color:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:14px;';
    box.innerHTML = `<div style="font-weight:700;">🔧 Próximo mantenimiento: ${fmt(item.vence)}</div>
      <div style="font-size:12px;opacity:.85;margin:2px 0 10px;">${esc(item.cliente)} · lo verá en Historial → Mantenimientos por hacer.</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" data-a="cerrar" style="padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-weight:600;">Cerrar</button>
        <button type="button" data-a="cal" style="padding:7px 12px;border-radius:8px;border:0;background:#22c55e;color:#fff;font-weight:700;">Agendar en mi calendario</button>
      </div>`;
    box.addEventListener('click', (ev) => {
      const a = ev.target.closest?.('[data-a]')?.getAttribute('data-a');
      if (a === 'cal') global.open(calendarUrl(item, companyName()), '_blank', 'noopener,noreferrer');
      if (a) box.remove();
    });
    doc.body.appendChild(box);
    setTimeout(() => box.remove(), 20000);
  }

  function instalarGanchos() {
    const H = global.ArpaHistorial;
    if (H && typeof H.captureFromFormato === 'function' && !H.captureFromFormato.__mant) {
      const orig = H.captureFromFormato;
      H.captureFromFormato = function () {
        const rec = orig.apply(this, arguments);
        try {
          avisoAlGuardar(rec);
          renderPanel();
        } catch (e) { /* el aviso nunca bloquea el guardado */ }
        return rec;
      };
      H.captureFromFormato.__mant = true;
    }
    const view = global.document?.getElementById('view-historial');
    if (view && global.MutationObserver) {
      new global.MutationObserver(() => { if (!view.hidden) renderPanel(); })
        .observe(view, { attributes: true, attributeFilter: ['hidden'] });
    }
    renderPanel();
  }

  global.ArpaMantenimientos = {
    DIAS,
    calcular,
    proximoDesdeRecord,
    mensajeCliente,
    calendarUrl,
    waUrl,
    renderPanel,
  };

  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', instalarGanchos);
    else instalarGanchos();
  }
})(typeof window !== 'undefined' ? window : globalThis);
