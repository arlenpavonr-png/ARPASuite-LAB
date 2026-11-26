/**
 * Cara nueva de los documentos en PDF (cotización e informe) — aprobada por Arlen el 24-nov-2026.
 * SOLO APARIENCIA: estilos que aplican mientras la app arma el PDF (body.is-printing).
 * No cambia datos, numeración, nombres de archivo ni el envío.
 *  - Encabezado corto en fila: logo, empresa y número.
 *  - No imprime campos vacíos ni opciones sin marcar (tipo de puerta, accesorios, tipo de servicio).
 *  - El informe ya no lleva datos bancarios.
 *  - Fechas escritas en español ("24 de noviembre de 2026").
 *  - Total de la cotización en franja oscura con el valor en dorado.
 */
(function (global) {
  if (typeof document === 'undefined' || global.ArpaDocEstilo) return;

  const NAVY = '#16284B';
  const GOLD = '#C9A84C';
  const GOLD_TXT = '#E2C46B';
  const LABEL = '#8A93A6';
  const LINE = '#E3E6EE';
  const P = 'html body.is-printing';

  const CSS = `
${P} .page > .header{display:flex!important;flex-direction:row!important;align-items:center!important;text-align:left!important;gap:16px!important;padding:18px 26px!important;background:${NAVY}!important}
${P} .page > .header .brand-logo-wrap{order:0!important;margin:0!important;width:66px!important;height:66px!important;min-height:0!important;max-width:none!important;padding:6px!important;background:#fff!important;border-radius:12px!important;flex:none!important;display:flex!important;align-items:center!important;justify-content:center!important}
${P} .page > .header #brand-logo{max-height:54px!important;max-width:54px!important;width:auto!important;height:auto!important}
${P} .page > .header .header-info{flex:1 1 auto!important;width:auto!important;text-align:left!important;min-width:0}
${P} .page > .header .header-info h1{color:#fff!important;font-size:18px!important;font-weight:800!important;margin:0 0 4px!important;letter-spacing:.01em!important;text-align:left!important}
${P} .page > .header #brand-company-contact{color:#AEB8CC!important;font-size:10.5px!important;line-height:1.45!important;text-align:left!important}
${P} .page > .header .header-meta{flex:none!important;width:auto!important;text-align:right!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:2px!important}
${P} .page > .header .doc-type{background:none!important;border:none!important;color:${GOLD_TXT}!important;padding:0!important;font-size:10.5px!important;letter-spacing:.14em!important;font-weight:800!important;text-transform:uppercase!important;box-shadow:none!important}
${P} .page > .header .no-field{justify-content:flex-end!important;margin:0!important}
${P} .page > .header .no-field label{display:none!important}
${P} .page > .header .no-field input,${P} .page > .header .pdf-valor-numero-cot{background:transparent!important;border:none!important;color:#fff!important;font-size:19px!important;font-weight:800!important;text-align:right!important;padding:0!important;min-width:0!important;box-shadow:none!important}
${P} .page > .gold-bar{height:4px!important;background:${GOLD}!important}

${P} .no-print{display:none!important}
${P} .section{border:none!important;box-shadow:none!important;padding-top:14px!important;padding-bottom:2px!important}
${P} .section-title{border:none!important;background:none!important;color:${LABEL}!important;font-size:10px!important;font-weight:700!important;letter-spacing:.12em!important;text-transform:uppercase!important;padding:0!important;margin:0 0 6px!important}
${P} .section-title .dot{display:none!important}
${P} .field > label,${P} .dim-field > label{color:${LABEL}!important;font-size:9.5px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;margin-bottom:1px!important}
${P} .pdf-valor{border:none!important;padding:1px 0 6px!important;min-height:0!important;color:${NAVY}!important;font-weight:600!important;font-family:inherit!important}

${P} .page > .header .lang-switch,${P} .page > .header .settings-btn,${P} .page > .header #validation-badge,${P} .page > .header button,${P} .page > .header [id^="sync-status"]{display:none!important}
${P} #formato-ot-status-bar,${P} #formato-ot-lock-note{display:none!important}
${P} .field > .pdf-valor:empty{display:none!important}
${P} .field:has(> .pdf-valor):not(:has(> .pdf-valor:not(:empty))){display:none!important}
${P} #before-placeholder,${P} #after-placeholder{display:none!important}
${P} .photo-box:has(> [id$="-preview"][style*="display:none"]),${P} .photo-box:has(> [id$="-preview"][style*="display: none"]){display:none!important}
${P} .section:has(.photos-grid):not(:has([id$="-preview"]:not([style*="display:none"]):not([style*="display: none"]))){display:none!important}
${P} .section:has(> .grid):not(:has(.pdf-valor:not(:empty))){display:none!important}

${P} .toggle-group{border:none!important;background:none!important;display:flex!important;padding:0!important;box-shadow:none!important}
${P} .toggle-group input:not(:checked) + label{display:none!important}
${P} .toggle-group input:checked + label{flex:none!important;width:auto!important;background:${GOLD}!important;color:${NAVY}!important;border:none!important;border-radius:999px!important;padding:5px 16px!important;font-weight:800!important;box-shadow:none!important}

${P} .chips input:not(:checked) + label{display:none!important}
${P} .chips input:checked + label{background:${NAVY}!important;color:#fff!important;border-color:${NAVY}!important}
${P} #formato-tipo-section:not(:has(.chips input:checked)):not(:has(#formato-tipo-otra-wrap .pdf-valor:not(:empty))){display:none!important}

${P} .check-item:not(:has(input:checked)){display:none!important}
${P} .check-item input{display:none!important}
${P} .check-item span::before{content:'\\2713  ';color:#1F8A4C;font-weight:800}
${P} #formato-equipo-accesorios:not(:has(input:checked)){display:none!important}

${P} #formato-medidas-section:not(:has(.pdf-valor-dim:not(:empty))):not(:has(.dims-extra .pdf-valor:not(:empty))){display:none!important}
${P} .dims{background:none!important;border:none!important;padding:0!important}
${P} .dims-extra .dim-field:has(.pdf-valor:empty){display:none!important}

${P} #formato-materiales-section:not(:has(#formato-materiales-body tr td:first-child .pdf-valor:not(:empty))){display:none!important}
${P} #formato-materiales-section > p{display:none!important}

${P} .obs-box{border:none!important;background:none!important;padding:0!important;box-shadow:none!important}
${P} .obs-lines .pdf-valor:empty{display:none!important}
${P} .obs-lines .pdf-valor{border-bottom:1px solid ${LINE}!important;padding:6px 0!important;font-weight:500!important}
${P} #formato-section-observaciones:not(:has(.pdf-valor:not(:empty))){display:none!important}

${P} #formato-video-section:not(:has(.pdf-valor:not(:empty))){display:none!important}
html body.is-printing-formato .section:has(> #brand-bank-block-formato){display:none!important}
html body.is-printing-formato #view-formato .nota{display:none!important}
${P} .verification-seal{border:none!important;background:none!important;padding:4px 0!important;text-align:center!important}

${P} .firma-box{border:1px solid ${LINE}!important;background:#fff!important;box-shadow:none!important}
${P} .firma-box .pdf-valor:empty{display:none!important}
${P} .firma-label{color:${LABEL}!important;font-size:9.5px!important;letter-spacing:.08em!important;text-transform:uppercase!important}

${P} .tabla-cot-wrap{border:none!important;border-radius:0!important;box-shadow:none!important}
${P} .tabla-productos thead tr,${P} .tabla-productos tbody tr{background:#fff!important}
${P} .tabla-productos col:nth-child(6){width:0!important}
${P} .tabla-productos thead th{background:none!important;color:${LABEL}!important;font-size:9.5px!important;letter-spacing:.1em!important;border:none!important;border-bottom:2px solid ${NAVY}!important}
${P} .tabla-productos tbody td{background:#fff!important;border:none!important;border-bottom:1px solid ${LINE}!important;font-family:inherit!important;color:${NAVY}!important}
${P} .tabla-productos tbody td:first-child{font-size:9px!important;color:${LABEL}!important;word-break:break-all!important}
${P} .tabla-productos tbody td:nth-child(2){font-weight:700!important}
${P} .tabla-productos .pdf-valor{font-family:inherit!important;padding:0!important}

${P} .totales-box{background:none!important;border:none!important;padding:0!important;box-shadow:none!important;max-width:380px!important;margin-left:auto!important}
${P} .total-row{border:none!important}
${P} .total-val{font-family:inherit!important;color:${NAVY}!important}
${P} .total-row.grand{background:${NAVY}!important;border-radius:10px!important;padding:14px 16px!important;margin-top:8px!important}
${P} .total-row.grand .total-label{color:#AEB8CC!important;letter-spacing:.14em!important}
${P} .total-row.grand .total-val{color:${GOLD_TXT}!important;font-size:22px!important;font-weight:800!important}
${P} .brand-bank-info{background:#F5F6F9!important;border:none!important;border-radius:10px!important}
`;

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function injectStyle() {
    if (document.getElementById('arpa-doc-estilo-css')) return;
    const st = document.createElement('style');
    st.id = 'arpa-doc-estilo-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // Las fechas de los campos salen escritas: 2026-11-24 → 24 de noviembre de 2026 (solo en español).
  function prettyDates() {
    if (!document.body || !document.body.classList.contains('is-printing')) return;
    if (global.ArpaDocLang?.isEnglish?.()) return;
    document.querySelectorAll('.pdf-valor').forEach((s) => {
      if (s.closest('.tabla-productos')) return;
      // Una lista sin elegir no se imprime ("Seleccionar referencia...").
      if (/^(seleccionar|select)\b.*(\.\.\.|…)$/i.test(String(s.textContent || '').trim())) { s.textContent = ''; return; }
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s.textContent || '').trim());
      if (!m) return;
      const mes = MESES[Number(m[2]) - 1];
      if (mes) s.textContent = `${Number(m[3])} de ${mes} de ${m[1]}`;
    });
  }

  // Una sola validez (Arlen 24-nov): la nota dice "válida hasta el <fecha>" en vez de "por 15 días calendario".
  function notaValidez() {
    const nota = document.getElementById('cot-nota-legal');
    if (!nota || nota.dataset.arpaNotaOriginal != null) return;
    if (global.ArpaDocLang?.isEnglish?.()) return;
    const lbl = document.querySelector('#view-cotizacion [data-i18n="cot.label.valida_hasta"]');
    let fecha = String(lbl?.parentElement?.querySelector('.pdf-valor')?.textContent || '').trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (iso && MESES[Number(iso[2]) - 1]) fecha = `${Number(iso[3])} de ${MESES[Number(iso[2]) - 1]} de ${iso[1]}`;
    if (!fecha) return;
    const html = nota.innerHTML;
    const nuevo = html.replace(/v[áa]lida\s+por\s*(<strong>)?\s*\d+\s*d[íi]as(\s+calendario)?\s*(<\/strong>)?/i, `válida hasta el <strong>${fecha}</strong>`);
    if (nuevo === html) return;
    nota.dataset.arpaNotaOriginal = html;
    nota.innerHTML = nuevo;
  }

  function restoreNota() {
    const nota = document.getElementById('cot-nota-legal');
    if (!nota || nota.dataset.arpaNotaOriginal == null) return;
    nota.innerHTML = nota.dataset.arpaNotaOriginal;
    delete nota.dataset.arpaNotaOriginal;
  }

  function onPrintState() {
    if (document.body?.classList.contains('is-printing')) {
      prettyDates();
      notaValidez();
    } else {
      restoreNota();
    }
  }

  function init() {
    injectStyle();
    global.addEventListener?.('beforeprint', onPrintState);
    global.addEventListener?.('afterprint', () => setTimeout(onPrintState, 0));
    if (typeof MutationObserver === 'function' && document.body) {
      new MutationObserver(() => onPrintState()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  global.ArpaDocEstilo = { CSS, prettyDates };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
