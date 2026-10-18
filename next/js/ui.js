/**
 * Helpers de UI. Sin dependencias.
 */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function severityLabel(sev) {
  if (sev === 'high') return 'Alto';
  if (sev === 'medium') return 'Medio';
  return 'Bajo';
}

export function bindClicks(root, handlers) {
  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-act]');
    if (!t || !root.contains(t)) return;
    const act = t.getAttribute('data-act');
    const fn = handlers[act];
    if (fn) {
      ev.preventDefault();
      fn(t, ev);
    }
  });
}

export function val(id) {
  return document.getElementById(id)?.value || '';
}
