import { equipmentTypeLabel, serviceTypeLabel } from './ai/knowledge.js';
import { money, quoteTotals } from './quote.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildReportModel(service, client, equipment, company) {
  const quote = service?.quote;
  const totals = quote?.items ? quoteTotals(quote.items) : null;
  return {
    companyName: company?.name || 'ARPASuite',
    companyLine: [company?.phone, company?.city].filter(Boolean).join(' · '),
    number: service?.number || '',
    type: serviceTypeLabel(service?.type),
    date: fmtDate(service?.closedAt || service?.startedAt),
    technician: service?.technician || company?.technician || '—',
    clientName: client?.name || '—',
    clientMeta: [client?.phone, client?.address, client?.city].filter(Boolean).join(' · '),
    equipmentLabel: [equipmentTypeLabel(equipment?.type), equipment?.brand, equipment?.model]
      .filter(Boolean).join(' · ') || '—',
    serial: equipment?.serial || '—',
    location: equipment?.location || '',
    status: service?.equipmentStatus?.label || '—',
    findings: (service?.findings || []).map((f) => f.text),
    workDone: (service?.workDone || []).map((w) => w.text),
    parts: (service?.parts || []).map((p) => `${p.qty || 1} × ${p.name}`),
    recommendations: (service?.recommendations || []).map((r) => r.text),
    checklistDone: (service?.checklist || []).filter((i) => i.done).map((i) => i.label),
    photos: service?.photos || [],
    quoteItems: quote?.items || [],
    quoteTotal: totals ? money(totals.total) : '',
    notes: service?.notes || '',
    clientSignedName: service?.signatures?.client?.name || client?.name || '',
    clientSignedDoc: service?.signatures?.client?.doc || '',
    clientSignature: service?.signatures?.client?.dataUrl || '',
    technicianSignedName: service?.signatures?.technician?.name || service?.technician || company?.technician || '',
    technicianSignature: service?.signatures?.technician?.dataUrl || '',
  };
}

export function buildQuoteModel(service, client, company) {
  const quote = service?.quote;
  const totals = quote?.items ? quoteTotals(quote.items) : { parts: 0, labor: 0, total: 0 };
  return {
    companyName: company?.name || 'ARPASuite',
    companyLine: [company?.phone, company?.city].filter(Boolean).join(' · '),
    number: service?.number || '',
    date: fmtDate(service?.closedAt || service?.startedAt),
    technician: service?.technician || company?.technician || '—',
    clientName: client?.name || '—',
    clientMeta: [client?.phone, client?.address, client?.city].filter(Boolean).join(' · '),
    items: quote?.items || [],
    totals,
    quoteTotal: money(totals.total),
    notes: quote?.notes || '',
    clientSignedName: service?.signatures?.client?.name || client?.name || '',
    clientSignature: service?.signatures?.client?.dataUrl || '',
    technicianSignedName: service?.signatures?.technician?.name || service?.technician || '',
    technicianSignature: service?.signatures?.technician?.dataUrl || '',
  };
}

export function renderReportHtml(model) {
  const list = (arr, empty) => {
    if (!arr.length) return `<p class="empty">${esc(empty)}</p>`;
    return `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  };
  const photos = (model.photos || []).slice(0, 8).map((p) =>
    `<figure><img src="${esc(p.dataUrl)}" alt="${esc(p.kind || 'foto')}"><figcaption>${esc(p.kind === 'after' ? 'Después' : p.kind === 'before' ? 'Antes' : 'Registro')}</figcaption></figure>`
  ).join('');
  const quoteRows = (model.quoteItems || []).map((i) =>
    `<tr><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${esc(money(i.unitPrice))}</td><td>${esc(money(i.labor))}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Informe ${esc(model.number)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#1e293b;margin:0;padding:24px;background:#fff}
  header{border-bottom:3px solid #0f2044;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;gap:16px}
  h1{font-size:20px;margin:0;color:#0f2044}
  .muted{color:#64748b;font-size:12px}
  .badge{background:#2563eb;color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 8px;border-radius:4px}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#1a3a6e;border-bottom:1px solid #e8edf5;padding-bottom:4px}
  section{margin:18px 0}
  ul{margin:6px 0 0 18px;padding:0}
  li{margin:4px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px}
  .photos{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  img{width:100%;height:140px;object-fit:cover;border:1px solid #d1d5db}
  figcaption{font-size:11px;color:#64748b;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{border-bottom:1px solid #e8edf5;text-align:left;padding:6px 4px}
  .empty{color:#64748b;font-size:13px}
  footer{margin-top:28px;font-size:11px;color:#64748b}
  @media print{body{padding:12px} .no-print{display:none!important}}
</style></head><body>
  <header>
    <div>
      <h1>${esc(model.companyName)}</h1>
      <div class="muted">${esc(model.companyLine)}</div>
    </div>
    <div style="text-align:right">
      <div class="badge">INFORME DE SERVICIO</div>
      <div style="margin-top:8px;font-weight:700">${esc(model.number)}</div>
      <div class="muted">${esc(model.date)}</div>
    </div>
  </header>
  <section>
    <h2>Cliente y equipo</h2>
    <div class="grid">
      <div><strong>Cliente</strong><br>${esc(model.clientName)}<br><span class="muted">${esc(model.clientMeta)}</span></div>
      <div><strong>Equipo</strong><br>${esc(model.equipmentLabel)}<br><span class="muted">Serie ${esc(model.serial)}${model.location ? ' · ' + esc(model.location) : ''}</span></div>
      <div><strong>Tipo</strong><br>${esc(model.type)}</div>
      <div><strong>Técnico</strong><br>${esc(model.technician)}</div>
    </div>
  </section>
  <section>
    <h2>Estado del equipo</h2>
    <p>${esc(model.status)}</p>
  </section>
  <section>
    <h2>Hallazgos</h2>
    ${list(model.findings, 'Sin hallazgos registrados.')}
  </section>
  <section>
    <h2>Trabajo realizado</h2>
    ${list(model.workDone, 'Sin trabajo registrado.')}
  </section>
  <section>
    <h2>Repuestos</h2>
    ${list(model.parts, 'Sin repuestos registrados.')}
  </section>
  <section>
    <h2>Recomendaciones</h2>
    ${list(model.recommendations, 'Sin recomendaciones.')}
  </section>
  ${quoteRows ? `<section><h2>Borrador de cotización</h2>
    <table><thead><tr><th>Ítem</th><th>Cant.</th><th>Precio</th><th>Mano de obra</th></tr></thead>
    <tbody>${quoteRows}</tbody></table>
    <p><strong>Total sugerido: ${esc(model.quoteTotal)}</strong></p>
  </section>` : ''}
  ${photos ? `<section><h2>Registro fotográfico</h2><div class="photos">${photos}</div></section>` : ''}
  ${model.checklistDone?.length ? `<section><h2>Checklist</h2>${list(model.checklistDone, '')}</section>` : ''}
  ${model.notes ? `<section><h2>Notas</h2><p>${esc(model.notes)}</p></section>` : ''}
  <section>
    <h2>Aceptación</h2>
    <div class="grid">
      <div>
        <strong>Cliente</strong>
        ${model.clientSignature ? `<p><img src="${esc(model.clientSignature)}" alt="Firma del cliente" style="height:80px;max-width:100%;object-fit:contain"></p>` : '<p class="empty">Sin firma</p>'}
        <p>${esc(model.clientSignedName || '')}${model.clientSignedDoc ? '<br><span class="muted">' + esc(model.clientSignedDoc) + '</span>' : ''}</p>
      </div>
      <div>
        <strong>Técnico</strong>
        ${model.technicianSignature ? `<p><img src="${esc(model.technicianSignature)}" alt="Firma del técnico" style="height:80px;max-width:100%;object-fit:contain"></p>` : '<p class="empty">Sin firma</p>'}
        <p>${esc(model.technicianSignedName || '')}</p>
      </div>
    </div>
  </section>
  <footer>Documento generado por ARPASuite NEXT a partir del servicio ${esc(model.number)}. El técnico no redactó este informe a mano.</footer>
</body></html>`;
}

export function renderQuoteHtml(model) {
  const rows = (model.items || []).map((i) =>
    `<tr><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${esc(money(i.unitPrice))}</td><td>${esc(money(i.labor))}</td><td>${esc(money((Number(i.qty) || 0) * (Number(i.unitPrice) || 0) + (Number(i.labor) || 0)))}</td></tr>`
  ).join('');
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Cotización ${esc(model.number)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#1e293b;margin:0;padding:24px;background:#fff}
  header{border-bottom:3px solid #0f2044;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;gap:16px}
  h1{font-size:20px;margin:0;color:#0f2044}
  .muted{color:#64748b;font-size:12px}
  .badge{background:#b45309;color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 8px;border-radius:4px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
  th,td{border-bottom:1px solid #e8edf5;text-align:left;padding:8px 4px}
  .empty{color:#64748b}
  footer{margin-top:28px;font-size:11px;color:#64748b}
</style></head><body>
  <header>
    <div>
      <h1>${esc(model.companyName)}</h1>
      <div class="muted">${esc(model.companyLine)}</div>
    </div>
    <div style="text-align:right">
      <div class="badge">COTIZACIÓN BORRADOR</div>
      <div style="margin-top:8px;font-weight:700">${esc(model.number)}</div>
      <div class="muted">${esc(model.date)}</div>
    </div>
  </header>
  <p><strong>Cliente</strong><br>${esc(model.clientName)}<br><span class="muted">${esc(model.clientMeta)}</span></p>
  <p><strong>Técnico</strong><br>${esc(model.technician)}</p>
  ${rows ? `<table><thead><tr><th>Ítem</th><th>Cant.</th><th>Precio</th><th>Mano de obra</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p><strong>Total sugerido: ${esc(model.quoteTotal)}</strong></p>` : '<p class="empty">No hay ítems cotizables.</p>'}
  ${model.notes ? `<p class="muted">${esc(model.notes)}</p>` : ''}
  <footer>Borrador generado en el dispositivo. Revise precios antes de formalizar. No se envió por canales externos.</footer>
</body></html>`;
}

export function openReportWindow(html) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
