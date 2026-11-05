/**
 * Checklist de mantenimiento preventivo — sección del Formato de Servicio.
 *
 * No toca index.html: inserta su propia sección justo antes del slot
 * #arpa-ia-slot-formato (después de "Registro Fotográfico", antes de
 * "Observaciones"). Solo se muestra con tipo de servicio = Mantenimiento
 * y oficio automatismos. Al no llevar `no-print`, sale en el PDF; en la
 * impresión solo aparecen los puntos revisados y el estado elegido.
 *
 * Guardado: localStorage propio (`arpa_checklist_mant_v1`), una entrada por
 * número de formato. No escribe en el borrador ni en el historial del formato.
 */
(function (global) {
  const D = global.ArpaChecklistDatos;
  if (!D || !global.document) return;

  const STORE_KEY = 'arpa_checklist_mant_v1';
  const MAX_DOCS = 60;
  const SECTION_ID = 'arpa-checklist-mant-section';
  const LABELS = { ok: 'OK', ajuste: 'Ajustado', cambio: 'Requiere cambio' };

  const doc = global.document;
  let section = null;
  let lastSignature = '';

  function t(key, fallback) {
    const i18n = global.ArpaI18n;
    if (i18n && typeof i18n.t === 'function') {
      const v = i18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function readStore() {
    try { return JSON.parse(global.localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function writeStore(store) {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(D.podar(store, MAX_DOCS))); } catch (e) { /* almacenamiento lleno o bloqueado */ }
  }

  function numeroActual() {
    const el = doc.getElementById('numero-formato');
    return el ? el.value : '';
  }

  function docState() {
    const entry = readStore()[D.claveDocumento(numeroActual())];
    return entry ? { estados: entry.estados || {}, proximo: entry.proximo || '' } : { estados: {}, proximo: '' };
  }

  function saveDocState(state) {
    const store = readStore();
    store[D.claveDocumento(numeroActual())] = { estados: state.estados, proximo: state.proximo, t: Date.now() };
    writeStore(store);
  }

  function tipoServicio() {
    const r = doc.querySelector('input[name="tipo"]:checked');
    return r ? r.value : '';
  }

  function oficioActivo() {
    const ft = global.ArpaFormatoTipo;
    if (ft && typeof ft.getDocumentFormatoOficio === 'function') return ft.getDocumentFormatoOficio();
    return 'automatismos';
  }

  function chipsMarcados() {
    return Array.prototype.map.call(
      doc.querySelectorAll('#formato-tipo-chips input[type="checkbox"]:checked'),
      function (el) { return el.id; }
    );
  }

  function bloqueado() {
    const el = doc.getElementById('formato-ot-estado');
    return !!el && String(el.value).toUpperCase() === 'CERRADA';
  }

  function visible() {
    return tipoServicio() === 'mantenimiento' && oficioActivo() === 'automatismos';
  }

  function injectCss() {
    if (doc.getElementById('arpa-checklist-mant-css')) return;
    const style = doc.createElement('style');
    style.id = 'arpa-checklist-mant-css';
    style.textContent = [
      '#' + SECTION_ID + ' .ck-hint{font-size:11px;color:var(--muted);margin:-4px 0 10px;line-height:1.4}',
      '#' + SECTION_ID + ' .ck-grupo{margin-bottom:12px}',
      '#' + SECTION_ID + ' .ck-grupo-titulo{font-size:11px;font-weight:700;color:var(--navy);margin:0 0 4px}',
      '#' + SECTION_ID + ' .ck-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;padding:7px 0;border-bottom:1px solid var(--light)}',
      '#' + SECTION_ID + ' .ck-texto{flex:1 1 220px;min-width:0;font-size:12.5px;color:var(--text)}',
      '#' + SECTION_ID + ' .ck-btns{display:flex;gap:4px;flex-wrap:wrap}',
      '#' + SECTION_ID + ' .ck-btn{font:600 11px/1 inherit;padding:6px 9px;border-radius:999px;border:1px solid var(--border);background:var(--bg);color:var(--muted);cursor:pointer}',
      '#' + SECTION_ID + ' .ck-btn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}',
      '#' + SECTION_ID + ' .ck-btn:disabled{cursor:not-allowed;opacity:.7}',
      '#' + SECTION_ID + ' .ck-btn.on[data-estado="ok"]{background:var(--green);border-color:var(--green);color:#fff}',
      '#' + SECTION_ID + ' .ck-btn.on[data-estado="ajuste"]{background:var(--gold);border-color:var(--gold);color:#fff}',
      '#' + SECTION_ID + ' .ck-btn.on[data-estado="cambio"]{background:#dc2626;border-color:#dc2626;color:#fff}',
      '#' + SECTION_ID + ' .ck-resumen{font-size:12px;font-weight:600;color:var(--navy);background:var(--light);border-radius:8px;padding:8px 10px;margin-top:4px}',
      '#' + SECTION_ID + ' .ck-proximo{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;font-size:12px;color:var(--text)}',
      '#' + SECTION_ID + ' .ck-proximo .ck-btn.on{background:var(--navy);border-color:var(--navy);color:#fff}',
      /* PDF: solo puntos revisados y el estado elegido */
      'body.is-printing #' + SECTION_ID + ' .ck-row:not(.has-estado),body.is-printing #' + SECTION_ID + ' .ck-grupo:not(.has-estado){display:none}',
      'body.is-printing #' + SECTION_ID + ' .ck-btn:not(.on){display:none}',
      'body.is-printing #' + SECTION_ID + ' .ck-proximo:not(.has-estado){display:none}',
      '@media print{#' + SECTION_ID + ' .ck-row:not(.has-estado),#' + SECTION_ID + ' .ck-grupo:not(.has-estado),#' + SECTION_ID + ' .ck-proximo:not(.has-estado){display:none}#' + SECTION_ID + ' .ck-btn:not(.on){display:none}#' + SECTION_ID + '{break-inside:auto}#' + SECTION_ID + ' .ck-row{break-inside:avoid}}'
    ].join('\n');
    doc.head.appendChild(style);
  }

  function ensureSection() {
    if (section && doc.contains(section)) return section;
    const slot = doc.getElementById('arpa-ia-slot-formato');
    if (!slot || !slot.parentNode) return null;
    section = doc.createElement('div');
    section.className = 'section';
    section.id = SECTION_ID;
    section.hidden = true;
    slot.parentNode.insertBefore(section, slot);
    return section;
  }

  function el(tag, cls, text) {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render() {
    const sec = ensureSection();
    if (!sec) return;
    const show = visible();
    sec.hidden = !show;
    if (!show) return;

    const state = docState();
    const grupos = D.gruposParaChips(chipsMarcados());
    const lock = bloqueado();
    sec.replaceChildren();

    const title = el('div', 'section-title');
    title.append(el('span', 'dot'), el('span', null, t('checklist.titulo', 'Checklist de Mantenimiento Preventivo')));
    sec.append(title);
    if (!chipsMarcados().length) {
      sec.append(el('p', 'ck-hint no-print', t('checklist.hint_tipo', 'Marque el tipo de puerta arriba para ver los puntos específicos de ese equipo.')));
    }

    grupos.forEach(function (g) {
      const box = el('div', 'ck-grupo');
      box.append(el('div', 'ck-grupo-titulo', g.titulo));
      let alguno = false;
      g.puntos.forEach(function (p) {
        const actual = D.normalizarEstado(state.estados[p.id]);
        if (actual) alguno = true;
        const row = el('div', 'ck-row' + (actual ? ' has-estado' : ''));
        row.append(el('span', 'ck-texto', p.texto));
        const btns = el('div', 'ck-btns');
        btns.setAttribute('role', 'group');
        btns.setAttribute('aria-label', p.texto);
        D.ESTADOS.forEach(function (estado) {
          const b = el('button', 'ck-btn' + (actual === estado ? ' on' : ''), t('checklist.estado.' + estado, LABELS[estado]));
          b.type = 'button';
          b.setAttribute('data-estado', estado);
          b.setAttribute('aria-pressed', actual === estado ? 'true' : 'false');
          b.disabled = lock;
          b.addEventListener('click', function () {
            const s = docState();
            const nuevo = D.alternar(s.estados[p.id], estado);
            if (nuevo) s.estados[p.id] = nuevo; else delete s.estados[p.id];
            saveDocState(s);
            render();
          });
          btns.append(b);
        });
        row.append(btns);
        box.append(row);
      });
      if (alguno) box.classList.add('has-estado');
      sec.append(box);
    });

    const r = D.resumen(grupos, state.estados);
    sec.append(el('div', 'ck-resumen',
      t('checklist.resumen', 'Puntos revisados') + ': ' + r.revisados + ' / ' + r.total +
      '  ·  OK: ' + r.ok + '  ·  ' + LABELS.ajuste + 's: ' + r.ajuste + '  ·  ' + LABELS.cambio + ': ' + r.cambio));

    const prox = el('div', 'ck-proximo' + (state.proximo ? ' has-estado' : ''));
    prox.append(el('span', null, t('checklist.proximo', 'Próximo mantenimiento sugerido en') + ':'));
    D.PROXIMO.forEach(function (op) {
      const b = el('button', 'ck-btn' + (state.proximo === op ? ' on' : ''), op);
      b.type = 'button';
      b.setAttribute('aria-pressed', state.proximo === op ? 'true' : 'false');
      b.disabled = lock;
      b.addEventListener('click', function () {
        const s = docState();
        s.proximo = s.proximo === op ? '' : op;
        saveDocState(s);
        render();
      });
      prox.append(b);
    });
    sec.append(prox);
  }

  function signature() {
    return [tipoServicio(), oficioActivo(), chipsMarcados().join(','), numeroActual(), bloqueado(), global.ArpaI18n && global.ArpaI18n.getLang ? global.ArpaI18n.getLang() : ''].join('|');
  }

  function refreshIfChanged() {
    const sig = signature();
    if (sig === lastSignature) return;
    lastSignature = sig;
    render();
  }

  function init() {
    if (!doc.getElementById('arpa-ia-slot-formato')) return;
    injectCss();
    refreshIfChanged();
    doc.addEventListener('change', function (ev) {
      const tg = ev.target;
      if (!tg) return;
      if (tg.name === 'tipo' || tg.id === 'numero-formato' || (tg.closest && tg.closest('#formato-tipo-chips'))) refreshIfChanged();
    });
    // El borrador, "Nuevo N°" y el cambio de oficio cambian valores sin eventos.
    global.setInterval(refreshIfChanged, 1500);
  }

  global.ArpaChecklistMantenimiento = { render: render, refresh: refreshIfChanged };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
