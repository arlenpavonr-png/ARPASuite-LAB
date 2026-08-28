import { esc, fmtDate, severityLabel } from './ui.js';
import { EQUIPMENT_TYPES, SERVICE_TYPES, QUICK_CHIPS, equipmentTypeLabel, serviceTypeLabel } from './ai/knowledge.js';
import { money, quoteTotals } from './quote.js';
import { followUpLabel } from './followup.js';

function nav(active) {
  const items = [
    ['home', '#/', 'Inicio'],
    ['services', '#/servicios', 'Servicios'],
    ['clients', '#/clientes', 'Clientes'],
    ['followups', '#/seguimiento', 'Seguimiento'],
  ];
  return `<nav class="tabbar">${items.map(([id, href, label]) =>
    `<a class="tab ${active === id ? 'is-on' : ''}" href="${href}">${esc(label)}</a>`
  ).join('')}</nav>`;
}

function top(title, backHref) {
  return `<header class="top">
    ${backHref ? `<a class="back" href="${esc(backHref)}" aria-label="Volver">‹</a>` : '<span class="back-spacer"></span>'}
    <h1>${esc(title)}</h1>
    <a class="ghost-link" href="../index.html">Clásica</a>
  </header>`;
}

function progress(step, total) {
  const pct = Math.round((step / total) * 100);
  return `<div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
    <p class="progress-label">Paso ${step} de ${total}</p>`;
}

export function screenHome(d) {
  const open = d.openService;
  const follow = (d.followups || []).slice(0, 3);
  const recent = (d.recent || []).slice(0, 3);
  return `${top('ARPASuite NEXT')}
  <main class="sheet">
    <p class="kicker">${esc(d.companyName || 'Laboratorio LAB')}</p>
    <p class="lead">Inicie el servicio. La app organiza hallazgos, trabajo y recomendaciones.</p>
    ${open ? `<a class="btn btn-warn btn-block" href="#/servicio/${esc(open.id)}/captura">Continuar ${esc(open.number)}</a>` : ''}
    <a class="btn btn-primary btn-xl btn-block" href="#/servicio/nuevo">Iniciar servicio</a>
    ${follow.length ? `<section class="block"><h2>Pendiente</h2>${follow.map((f) =>
      `<a class="row-card" href="#/seguimiento"><strong>${esc(f.label || followUpLabel(f.type))}</strong><span>${esc(f.clientName || '')} · ${esc(fmtDate(f.dueDate))}</span></a>`
    ).join('')}</section>` : ''}
    ${recent.length ? `<section class="block"><h2>Últimos servicios</h2>${recent.map((s) =>
      `<a class="row-card" href="#/servicio/${esc(s.id)}/listo"><strong>${esc(s.number)}</strong><span>${esc(s.clientName || '')} · ${esc(serviceTypeLabel(s.type))}</span></a>`
    ).join('')}</section>` : ''}
    <p class="hint">Los documentos PDF clásicos siguen en la suite anterior.</p>
  </main>
  ${nav('home')}`;
}

export function screenJobType(d) {
  return `${top('Nuevo servicio', '#/')}
  ${progress(1, 7)}
  <main class="sheet">
    <h2 class="q">¿Qué van a hacer hoy?</h2>
    <div class="stack">
      ${SERVICE_TYPES.map((t) =>
        `<button type="button" class="choice ${d.type === t.id ? 'is-on' : ''}" data-act="set-type" data-id="${t.id}">${esc(t.label)}</button>`
      ).join('')}
    </div>
    <label class="lbl">Técnico</label>
    <input id="job-tecnico" class="input" value="${esc(d.technician || '')}" placeholder="Nombre del técnico" autocomplete="name">
    <button type="button" class="btn btn-primary btn-block" data-act="to-client">Continuar</button>
  </main>`;
}

export function screenPickClient(d) {
  const q = (d.search || '').toLowerCase();
  const list = (d.clients || []).filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
  return `${top('Cliente', '#/servicio/nuevo')}
  ${progress(2, 7)}
  <main class="sheet">
    <input id="client-search" class="input" placeholder="Buscar cliente" value="${esc(d.search || '')}" data-act-input="search-client">
    <button type="button" class="btn btn-secondary btn-block" data-act="toggle-new-client">${d.showNew ? 'Cerrar alta' : 'Nuevo cliente'}</button>
    ${d.showNew ? `<div class="card">
      <input id="new-cli-name" class="input" placeholder="Nombre / empresa">
      <input id="new-cli-phone" class="input" placeholder="Teléfono" inputmode="tel">
      <input id="new-cli-addr" class="input" placeholder="Dirección">
      <input id="new-cli-city" class="input" placeholder="Ciudad">
      <button type="button" class="btn btn-primary btn-block" data-act="create-client">Guardar y usar</button>
    </div>` : ''}
    <div class="list">
      ${list.length ? list.map((c) =>
        `<button type="button" class="row-card ${d.clientId === c.id ? 'is-on' : ''}" data-act="pick-client" data-id="${esc(c.id)}">
          <strong>${esc(c.name)}</strong>
          <span>${esc([c.phone, c.city].filter(Boolean).join(' · ') || 'Sin datos extra')}</span>
        </button>`
      ).join('') : '<p class="empty">No hay clientes. Cree uno para continuar.</p>'}
    </div>
  </main>`;
}

export function screenPickEquipment(d) {
  const list = d.equipment || [];
  return `${top('Equipo', '#/servicio/' + esc(d.jobId) + '/cliente')}
  ${progress(3, 7)}
  <main class="sheet">
    <p class="muted">${esc(d.clientName || '')}</p>
    <button type="button" class="btn btn-secondary btn-block" data-act="toggle-new-eq">${d.showNew ? 'Cerrar alta' : 'Nuevo equipo'}</button>
    ${d.showNew ? `<div class="card">
      <div class="chips">
        ${EQUIPMENT_TYPES.map((t) =>
          `<button type="button" class="chip ${d.newType === t.id ? 'is-on' : ''}" data-act="eq-type" data-id="${t.id}">${esc(t.label)}</button>`
        ).join('')}
      </div>
      <input id="new-eq-brand" class="input" placeholder="Marca">
      <input id="new-eq-model" class="input" placeholder="Referencia / modelo">
      <input id="new-eq-serial" class="input" placeholder="Serie (si está a la vista)">
      <input id="new-eq-loc" class="input" placeholder="Ubicación: portón, sótano…">
      <button type="button" class="btn btn-primary btn-block" data-act="create-eq">Guardar y usar</button>
    </div>` : ''}
    <div class="list">
      ${list.length ? list.map((e) =>
        `<button type="button" class="row-card" data-act="pick-eq" data-id="${esc(e.id)}">
          <strong>${esc(equipmentTypeLabel(e.type))}${e.model ? ' · ' + esc(e.model) : ''}</strong>
          <span>${esc([e.brand, e.location].filter(Boolean).join(' · ') || 'Sin ubicación')}</span>
        </button>`
      ).join('') : '<p class="empty">Este cliente no tiene equipos. Cree el primero.</p>'}
    </div>
  </main>`;
}

export function screenBrief(d) {
  const b = d.brief || {};
  const last = b.lastService;
  const block = (title, items, render) => {
    if (!items || !items.length) return '';
    return `<section class="brief-card"><h3>${esc(title)}</h3>${items.map(render).join('')}</section>`;
  };
  return `${top('Antes de empezar', '#/servicio/' + esc(d.jobId) + '/equipo')}
  ${progress(4, 7)}
  <main class="sheet">
    <p class="equip-line">${esc(d.equipLine || '')}</p>
    ${last
      ? `<section class="brief-card accent"><h3>Último servicio</h3><p>${esc(serviceTypeLabel(last.type))} · ${esc(fmtDate(last.closedAt || last.startedAt))} · ${esc(last.number)}</p><p class="muted">${esc(last.equipmentStatus?.label || '')}</p></section>`
      : '<section class="brief-card"><h3>Último servicio</h3><p class="muted">Primera visita registrada a este equipo.</p></section>'}
    ${block('Fallas anteriores', b.findings, (f) => `<p>• ${esc(f.text)}</p>`)}
    ${block('Reparaciones', b.repairs, (r) => `<p>• ${esc(r.text)}</p>`)}
    ${block('Repuestos usados', b.parts, (p) => `<p>• ${esc((p.qty || 1) + ' × ' + p.name)}</p>`)}
    ${block('Recomendaciones pendientes', b.pendingRecommendations, (r) => `<p>• ${esc(r.text)}</p>`)}
    <button type="button" class="btn btn-primary btn-xl btn-block" data-act="start-capture">Comenzar servicio</button>
  </main>`;
}

export function screenCapture(d) {
  const s = d.service || {};
  const findings = s.findings || [];
  const work = s.workDone || [];
  const recs = s.recommendations || [];
  const photos = s.photos || [];
  return `${top('En campo', '#/servicio/' + esc(d.jobId) + '/resumen')}
  ${progress(5, 7)}
  <main class="sheet capture">
    <p class="muted">${esc(d.equipLine || '')}</p>
    <button type="button" class="mic ${d.listening ? 'is-on' : ''}" data-act="toggle-voice" ${d.voiceSupported ? '' : 'disabled'}>
      ${d.listening ? 'Detener dictado' : (d.voiceSupported ? 'Dictar hallazgo' : 'Dictado no disponible')}
    </button>
    ${d.interim ? `<p class="interim">${esc(d.interim)}</p>` : ''}
    <textarea id="capture-text" class="area" rows="4" placeholder="O escriba: encontré desgaste del piñón, ajusté la cremallera…">${esc(d.buffer || '')}</textarea>
    <button type="button" class="btn btn-secondary btn-block" data-act="parse-text">Organizar con IA local</button>
    <div class="chips wrap">
      ${QUICK_CHIPS.map((c) => `<button type="button" class="chip" data-act="chip" data-id="${c.id}">${esc(c.label)}</button>`).join('')}
    </div>
    <div class="parsed">
      ${findings.length ? `<div class="tag-col"><h3>Hallazgos</h3>${findings.map((f) =>
        `<span class="tag sev-${esc(f.severity || 'low')}">${esc(f.text)}</span>`).join('')}</div>` : ''}
      ${work.length ? `<div class="tag-col"><h3>Trabajo</h3>${work.map((w) =>
        `<span class="tag tag-work">${esc(w.text)}</span>`).join('')}</div>` : ''}
      ${recs.length ? `<div class="tag-col"><h3>Recomendaciones</h3>${recs.map((r) =>
        `<span class="tag tag-rec">${esc(r.text)}</span>`).join('')}</div>` : ''}
      ${s.equipmentStatus ? `<p class="status-line">${esc(s.equipmentStatus.label)}</p>` : ''}
    </div>
    <div class="photo-row">
      <label class="photo-btn">Antes<input type="file" accept="image/*" capture="environment" data-photo="before" hidden></label>
      <label class="photo-btn">Después<input type="file" accept="image/*" capture="environment" data-photo="after" hidden></label>
    </div>
    ${photos.length ? `<div class="thumbs">${photos.map((p) =>
      `<img src="${esc(p.dataUrl)}" alt="${esc(p.kind)}">`).join('')}</div>` : ''}
    <button type="button" class="btn btn-primary btn-block" data-act="to-checklist">Siguiente: checklist</button>
  </main>`;
}

export function screenChecklist(d) {
  const items = d.service?.checklist || [];
  const done = items.filter((i) => i.done).length;
  return `${top('Checklist', '#/servicio/' + esc(d.jobId) + '/captura')}
  ${progress(6, 7)}
  <main class="sheet">
    <p class="muted">${done} de ${items.length} hechos</p>
    <div class="checks">
      ${items.map((item) =>
        `<button type="button" class="check ${item.done ? 'is-on' : ''}" data-act="toggle-check" data-id="${esc(item.id)}">
          <span class="box">${item.done ? '✓' : ''}</span>
          <span>${esc(item.label)}</span>
        </button>`
      ).join('')}
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="to-review">Revisar resumen</button>
  </main>`;
}

function editableList(title, items, actPrefix, field) {
  return `<section class="block">
    <div class="block-head"><h2>${esc(title)}</h2>
      <button type="button" class="text-btn" data-act="${actPrefix}-add">Añadir</button></div>
    ${(items || []).map((it, idx) =>
      `<div class="edit-row">
        <input class="input" data-edit="${actPrefix}" data-idx="${idx}" value="${esc(it[field] || it.text || '')}">
        <button type="button" class="icon-del" data-act="${actPrefix}-del" data-idx="${idx}" aria-label="Quitar">×</button>
      </div>`
    ).join('') || '<p class="muted">Nada aún. Añada o vuelva al dictado.</p>'}
  </section>`;
}

export function screenReview(d) {
  const s = d.service || {};
  return `${top('Revisar', '#/servicio/' + esc(d.jobId) + '/checklist')}
  ${progress(7, 7)}
  <main class="sheet">
    <p class="status-line">${esc(s.equipmentStatus?.label || 'Sin estado')}</p>
    ${editableList('Hallazgos', s.findings, 'f', 'text')}
    ${editableList('Trabajo realizado', s.workDone, 'w', 'text')}
    ${editableList('Recomendaciones', s.recommendations, 'r', 'text')}
    <section class="block">
      <div class="block-head"><h2>Repuestos</h2>
        <button type="button" class="text-btn" data-act="p-add">Añadir</button></div>
      ${(s.parts || []).map((p, idx) =>
        `<div class="part-row">
          <input class="input" data-part="name" data-idx="${idx}" value="${esc(p.name || '')}" placeholder="Repuesto">
          <input class="input qty" data-part="qty" data-idx="${idx}" value="${esc(p.qty || 1)}" inputmode="numeric">
        </div>`
      ).join('') || '<p class="muted">Ninguno.</p>'}
    </section>
    <button type="button" class="btn btn-primary btn-block" data-act="to-quote">Cotización y cierre</button>
  </main>`;
}

export function screenQuote(d) {
  const q = d.service?.quote;
  const items = q?.items || [];
  const tot = quoteTotals(items);
  const plans = d.followPlans || [];
  return `${top('Cierre', '#/servicio/' + esc(d.jobId) + '/revision')}
  <main class="sheet">
    <h2>Borrador de cotización</h2>
    <p class="muted">Revise precios. No se envía sola.</p>
    ${items.length ? `<div class="quote">
      ${items.map((it, idx) =>
        `<div class="quote-row">
          <strong>${esc(it.name)}</strong>
          ${it.needsQuote ? '<span class="pill">Confirmar precio</span>' : ''}
          <label>Precio<input class="input" data-q="unitPrice" data-idx="${idx}" value="${esc(it.unitPrice || 0)}" inputmode="decimal"></label>
          <label>Mano de obra<input class="input" data-q="labor" data-idx="${idx}" value="${esc(it.labor || 0)}" inputmode="decimal"></label>
        </div>`
      ).join('')}
      <p class="total">Total sugerido ${esc(money(tot.total))}</p>
    </div>` : '<p class="empty">No hay reparación cotizable en este servicio.</p>'}
    <h2>Seguimiento</h2>
    ${plans.map((p) =>
      `<label class="check-line"><input type="checkbox" data-fu="${esc(p.type)}" ${p.checked ? 'checked' : ''}> ${esc(p.label)} · ${esc(fmtDate(p.dueDate))}</label>`
    ).join('') || '<p class="muted">Sin seguimientos sugeridos.</p>'}
    <label class="lbl">Nota interna</label>
    <textarea id="close-notes" class="area" rows="2">${esc(d.service?.notes || '')}</textarea>
    <button type="button" class="btn btn-primary btn-xl btn-block" data-act="close-job">Cerrar e informar</button>
  </main>`;
}

export function screenClosed(d) {
  const s = d.service || {};
  return `${top('Servicio cerrado', '#/')}
  <main class="sheet">
    <p class="done-kicker">${esc(s.number)} cerrado</p>
    <h2 class="q">${esc(s.equipmentStatus?.label || 'Listo')}</h2>
    <ul class="summary">
      ${(s.findings || []).map((f) => `<li><strong>Hallazgo.</strong> ${esc(f.text)}</li>`).join('')}
      ${(s.workDone || []).map((w) => `<li><strong>Trabajo.</strong> ${esc(w.text)}</li>`).join('')}
      ${(s.recommendations || []).map((r) => `<li><strong>Recomendación.</strong> ${esc(r.text)}</li>`).join('')}
    </ul>
    <button type="button" class="btn btn-primary btn-block" data-act="open-report">Ver informe</button>
    <a class="btn btn-secondary btn-block" href="#/">Ir al inicio</a>
  </main>
  ${nav('home')}`;
}

export function screenClients(d) {
  return `${top('Clientes')}
  <main class="sheet">
    <input id="client-search" class="input" placeholder="Buscar" data-act-input="search-client" value="${esc(d.search || '')}">
    <a class="btn btn-secondary btn-block" href="#/servicio/nuevo">Nuevo servicio</a>
    <div class="list">${(d.clients || []).map((c) =>
      `<div class="row-card"><strong>${esc(c.name)}</strong><span>${esc([c.phone, c.city].filter(Boolean).join(' · '))}</span></div>`
    ).join('') || '<p class="empty">Aún no hay clientes.</p>'}</div>
  </main>
  ${nav('clients')}`;
}

export function screenServices(d) {
  return `${top('Servicios')}
  <main class="sheet">
    <div class="list">${(d.services || []).map((s) =>
      `<a class="row-card" href="#/servicio/${esc(s.id)}/${s.status === 'closed' ? 'listo' : 'captura'}">
        <strong>${esc(s.number)} · ${esc(serviceTypeLabel(s.type))}</strong>
        <span>${esc(s.clientName || '')} · ${esc(s.status === 'closed' ? 'Cerrado' : 'En curso')}</span>
      </a>`
    ).join('') || '<p class="empty">Sin servicios todavía.</p>'}</div>
  </main>
  ${nav('services')}`;
}

export function screenFollowups(d) {
  return `${top('Seguimiento')}
  <main class="sheet">
    <div class="list">${(d.followups || []).map((f) =>
      `<div class="row-card ${f.overdue ? 'is-overdue' : ''}">
        <strong>${esc(f.label || followUpLabel(f.type))}</strong>
        <span>${esc(f.clientName || '')} · ${esc(fmtDate(f.dueDate))}</span>
        ${f.status === 'open' ? `<button type="button" class="text-btn" data-act="fu-done" data-id="${esc(f.id)}">Hecho</button>` : '<span class="pill">Cerrado</span>'}
      </div>`
    ).join('') || '<p class="empty">Nada pendiente.</p>'}</div>
  </main>
  ${nav('followups')}`;
}

export function screenBoot(msg) {
  return `<main class="sheet boot"><p>${esc(msg || 'Cargando…')}</p></main>`;
}
