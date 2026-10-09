/**
 * ARPASuite SIMPLE — capa de UX (Inicio, navegación, OT por pasos).
 * No cambia motores de IA, PDF, catálogo ni numeración.
 */
(function (global) {
  const PASO_CLIENTE = 'cliente';
  const PASO_SITIO = 'sitio';
  const PASO_EQUIPO = 'equipo';
  const PASO_DIAG = 'diagnostico';
  const PASO_TRABAJO = 'trabajo';
  const PASO_CIERRE = 'cierre';

  const LABELS = {
    cliente: { es: 'Cliente', en: 'Client' },
    sitio: { es: 'Equipo / sitio', en: 'Equipment / site' },
    equipo: { es: 'Equipo', en: 'Equipment' },
    diagnostico: { es: 'Diagnóstico', en: 'Diagnosis' },
    trabajo: { es: 'Trabajo hecho', en: 'Work done' },
    cierre: { es: 'Cierre', en: 'Close-out' }
  };

  let pasoIndex = 0;
  let verTodo = false;
  let bound = false;
  let incomingTrabajo = null;
  let tipoLock = '';
  let tipoLockTimer = 0;
  let clienteModo = '';
  let clienteFiltro = 'recientes';
  let clienteQuery = '';
  let clienteContexto = null;

  function t(key, fallback) {
    if (global.ArpaI18n && typeof global.ArpaI18n.t === 'function') {
      const val = global.ArpaI18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function lang() {
    return global.ArpaI18n && typeof global.ArpaI18n.getLang === 'function'
      ? global.ArpaI18n.getLang()
      : 'es';
  }

  function $(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function datePart(value) {
    const s = String(value || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return '';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function settings() {
    try {
      return global.ArpaBrand && typeof global.ArpaBrand.getSettings === 'function'
        ? (global.ArpaBrand.getSettings() || {})
        : JSON.parse(localStorage.getItem('arpa_suite_user_settings') || '{}');
    } catch (e) {
      return {};
    }
  }

  function technicianName() {
    const s = settings();
    const fromSettings = String(s.technicianName || '').trim();
    if (fromSettings) return fromSettings;
    const field = $('campo-tecnico-responsable');
    const fromField = field ? String(field.value || '').trim() : '';
    if (fromField) return fromField;
    return String(s.companyName || '').trim();
  }

  function firstName() {
    const full = technicianName();
    if (!full) return '';
    return full.split(/\s+/)[0];
  }

  function tipoServicio() {
    const el = document.querySelector('#view-formato input[name="tipo"]:checked');
    return el ? String(el.value || '').trim().toLowerCase() : 'instalacion';
  }

  function setTipoServicio(tipo) {
    const value = String(tipo || '').trim().toLowerCase();
    if (!value) return;
    const radio = document.querySelector('#view-formato input[name="tipo"][value="' + value + '"]');
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (global.ArpaIaTecnicaUi && typeof global.ArpaIaTecnicaUi.syncOtPanelVisibility === 'function') {
      global.ArpaIaTecnicaUi.syncOtPanelVisibility();
    }
  }

  function pasosParaTipo(tipo) {
    const tpo = String(tipo || tipoServicio()).toLowerCase();
    if (tpo === 'reparacion' || tpo === 'mantenimiento') {
      return [PASO_CLIENTE, PASO_DIAG, PASO_TRABAJO, PASO_CIERRE];
    }
    return [PASO_CLIENTE, PASO_SITIO, PASO_EQUIPO, PASO_TRABAJO, PASO_CIERRE];
  }

  function labelPaso(id) {
    const pack = LABELS[id] || { es: id, en: id };
    return lang() === 'en' ? pack.en : pack.es;
  }

  function setFieldValue(id, value) {
    const el = $(id);
    const next = String(value || '').trim();
    if (!el || !next) return;
    el.value = next;
  }

  function clientesDb() {
    if (global.ArpaHistorial && typeof global.ArpaHistorial.getClientes === 'function') {
      return global.ArpaHistorial.getClientes() || [];
    }
    return [];
  }

  function snapshotVal(snap, key) {
    if (!snap || typeof snap !== 'object') return '';
    return String(snap[key] || '').trim();
  }

  function recordsForCliente(nombre) {
    const n = normalize(nombre);
    if (!n) return [];
    return records().filter(function (r) { return normalize(r.cliente) === n; });
  }

  function lastRelevantWork(nombre) {
    const recs = recordsForCliente(nombre);
    for (let i = 0; i < recs.length; i += 1) {
      const kind = String(recs[i].modulo || recs[i].documento || '').toLowerCase();
      if (kind.indexOf('cot') >= 0 || kind.indexOf('cuenta') >= 0) continue;
      return recs[i];
    }
    return recs[0] || null;
  }

  function buildClienteFicha(nombre) {
    const wanted = String(nombre || '').trim();
    if (!wanted) return null;
    const n = normalize(wanted);
    const db = clientesDb().find(function (c) { return normalize(c.nombre) === n; }) || null;
    const last = lastRelevantWork(wanted);
    const snap = last && last.fullSnapshot && typeof last.fullSnapshot === 'object' ? last.fullSnapshot : {};
    const tel = String((db && db.tel) || snapshotVal(snap, 'formato-cliente-tel') || snapshotVal(snap, 'cot-tel') || '').trim();
    const dir = String((db && db.dir) || snapshotVal(snap, 'formato-cliente-direccion') || snapshotVal(snap, 'cc-cliente-dir') || '').trim();
    const ciudad = String((db && db.ciudad) || (last && last.ciudad) || snapshotVal(snap, 'formato-cliente-ciudad') || '').trim();
    const equipo = snapshotVal(snap, 'formato-equipo-ref-text') || snapshotVal(snap, 'formato-equipo-marca-text');
    const ultimoParts = [];
    if (last) {
      ultimoParts.push(recordKind(last));
      if (last.numero) ultimoParts.push(last.numero);
      if (last.concepto) ultimoParts.push(last.concepto);
      const when = recordDate(last);
      if (when) ultimoParts.push(when);
    }
    return {
      nombre: String((db && db.nombre) || (last && last.cliente) || wanted).trim(),
      tel: tel,
      dir: dir,
      ciudad: ciudad,
      sitio: dir || ciudad,
      equipo: equipo,
      ultimo: ultimoParts.join(' · '),
      lastRecord: last
    };
  }

  function listKnownClientes() {
    const seen = Object.create(null);
    const out = [];
    function add(nombre, fecha) {
      const label = String(nombre || '').trim();
      const key = normalize(label);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push({
        nombre: label,
        fecha: datePart(fecha) || '',
        ficha: buildClienteFicha(label)
      });
    }
    records().forEach(function (r) { add(r.cliente, recordDate(r) || r.fecha || r.savedAt); });
    clientesDb().forEach(function (c) { add(c.nombre, c.updatedAt); });
    const draft = draftHint();
    if (draft && draft.cliente) add(draft.cliente, draft.fecha);
    return out;
  }

  function clientesHoy() {
    const hoy = todayIso();
    return listKnownClientes().filter(function (c) {
      if (c.fecha === hoy) return true;
      return recordsForCliente(c.nombre).some(function (r) { return recordDate(r) === hoy; });
    });
  }

  function clientesFiltrados() {
    if (clienteFiltro === 'hoy') return clientesHoy();
    const q = normalize(clienteQuery);
    const all = listKnownClientes();
    if (clienteFiltro === 'buscar' && q) {
      return all.filter(function (c) { return normalize(c.nombre).indexOf(q) >= 0; });
    }
    return all.slice(0, 8);
  }

  function persistClienteMinimo() {
    const nombre = String(($('formato-cliente-nombre') || {}).value || '').trim();
    const tel = String(($('formato-cliente-tel') || {}).value || '').trim();
    if (!nombre || !global.ArpaHistorial || typeof global.ArpaHistorial.saveCliente !== 'function') return;
    global.ArpaHistorial.saveCliente({ nombre: nombre, tel: tel });
  }

  function applyClienteToForm(ficha) {
    if (!ficha) return;
    setFieldValue('formato-cliente-nombre', ficha.nombre);
    setFieldValue('formato-cliente-tel', ficha.tel);
    setFieldValue('formato-cliente-direccion', ficha.dir);
    setFieldValue('formato-cliente-ciudad', ficha.ciudad);
    clienteContexto = {
      nombre: ficha.nombre,
      tel: ficha.tel,
      dir: ficha.dir,
      ciudad: ficha.ciudad,
      sitio: ficha.sitio,
      equipo: ficha.equipo,
      ultimo: ficha.ultimo
    };
    autofillTrabajo();
  }

  function ensureClienteStyles() {
    if ($('simple-cliente-css') || !global.document) return;
    const st = global.document.createElement('style');
    st.id = 'simple-cliente-css';
    st.textContent = [
      '#simple-cliente-wrap { margin: 0 0 14px; }',
      '#simple-cliente-wrap h3 { margin: 0 0 10px; font-size: 18px; color: var(--navy); }',
      '.simple-cliente-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }',
      '.simple-cliente-tab, .simple-cliente-nuevo {',
      '  min-height: 40px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 999px;',
      '  background: #fff; color: var(--navy); font: 700 13px/1 "DM Sans", sans-serif; cursor: pointer;',
      '}',
      '.simple-cliente-tab.is-on, .simple-cliente-nuevo { background: var(--navy); color: #fff; border-color: var(--navy); }',
      '.simple-cliente-nuevo { width: 100%; border-radius: 12px; margin-top: 6px; }',
      '#simple-cliente-search { width: 100%; margin-bottom: 10px; min-height: 44px; padding: 10px 12px;',
      '  border: 1px solid var(--border); border-radius: 10px; font-size: 16px; }',
      '#simple-cliente-card { border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: #fff; }',
      '#simple-cliente-card strong { display: block; font-size: 16px; color: var(--navy); }',
      '#simple-cliente-card span { display: block; margin-top: 4px; font-size: 13px; color: var(--muted); }',
      '#simple-cliente-cambiar { margin-top: 10px; min-height: 40px; width: 100%; border: 1px solid var(--border);',
      '  border-radius: 10px; background: #fff; color: var(--navy); font-weight: 700; cursor: pointer; }'
    ].join('\n');
    global.document.head.appendChild(st);
  }

  function ensureClientePanel() {
    if ($('simple-cliente-wrap') || !global.document) return;
    const root = $('view-formato');
    if (!root) return;
    ensureClienteStyles();
    const wrap = global.document.createElement('div');
    wrap.id = 'simple-cliente-wrap';
    wrap.className = 'section no-print';
    wrap.setAttribute('data-ot-paso', 'cliente');
    wrap.innerHTML = '<h3>' + escapeHtml(t('simple.cliente.titulo', '¿Para quién es el trabajo?')) + '</h3>' +
      '<div class="simple-cliente-tabs" id="simple-cliente-tabs"></div>' +
      '<input type="search" id="simple-cliente-search" hidden autocomplete="off" placeholder="' +
      escapeHtml(t('simple.cliente.buscar', 'Buscar cliente')) + '">' +
      '<div id="simple-cliente-list"></div>' +
      '<button type="button" class="simple-cliente-nuevo" id="simple-cliente-nuevo">' +
      escapeHtml(t('simple.cliente.nuevo', 'Cliente nuevo')) + '</button>' +
      '<div id="simple-cliente-card" hidden></div>';
    const bar = $('ot-pasos-bar');
    if (bar && bar.nextSibling) root.insertBefore(wrap, bar.nextSibling);
    else root.insertBefore(wrap, root.firstChild);
    $('simple-cliente-tabs')?.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-simple-cli-filtro]') : null;
      if (!btn) return;
      clienteFiltro = btn.getAttribute('data-simple-cli-filtro') || 'recientes';
      syncClientePaso();
      if (clienteFiltro === 'buscar') $('simple-cliente-search')?.focus();
    });
    $('simple-cliente-search')?.addEventListener('input', function (ev) {
      clienteQuery = String(ev.target.value || '');
      clienteFiltro = 'buscar';
      syncClientePaso();
    });
    $('simple-cliente-list')?.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-simple-cli]') : null;
      if (btn) seleccionarClienteExistente(btn.getAttribute('data-simple-cli'));
    });
    $('simple-cliente-nuevo')?.addEventListener('click', function () {
      clienteModo = 'nuevo';
      clienteContexto = null;
      syncClientePaso();
      const nombre = $('formato-cliente-nombre');
      if (nombre) nombre.focus();
    });
    $('simple-cliente-card')?.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('#simple-cliente-cambiar') : null;
      if (!btn) return;
      clienteModo = 'pick';
      clienteContexto = null;
      ['formato-cliente-nombre', 'formato-cliente-tel', 'formato-cliente-direccion'].forEach(function (id) {
        const el = $(id);
        if (el) el.value = '';
      });
      syncClientePaso();
    });
  }

  function maskClienteAdminFields(pasoCliente) {
    const compact = pasoCliente && !verTodo;
    const showNombreTel = compact && clienteModo === 'nuevo';
    const nombre = $('formato-cliente-nombre');
    const grid = nombre && nombre.closest('.grid');
    if (grid) {
      grid.querySelectorAll('.field').forEach(function (field) {
        const keep = field.contains($('formato-cliente-nombre')) || field.contains($('formato-cliente-tel'));
        field.hidden = compact && !(showNombreTel && keep);
      });
      const datos = grid.closest('.section');
      if (datos) datos.hidden = compact && clienteModo !== 'nuevo';
    }
    const tec = $('campo-tecnico-responsable');
    const tecSection = tec && tec.closest('.section');
    if (tecSection) tecSection.hidden = compact;
    const status = $('formato-ot-status-bar');
    if (status) status.hidden = compact;
  }

  function renderClienteTabs(known) {
    const tabs = $('simple-cliente-tabs');
    if (!tabs) return;
    if (!known.length) {
      tabs.hidden = true;
      tabs.innerHTML = '';
      return;
    }
    tabs.hidden = false;
    const items = [
      ['hoy', t('simple.cliente.hoy', 'Hoy')],
      ['recientes', t('simple.cliente.recientes', 'Recientes')],
      ['buscar', t('simple.cliente.buscar_tab', 'Buscar')]
    ];
    tabs.innerHTML = items.map(function (pair) {
      const on = clienteFiltro === pair[0] ? ' is-on' : '';
      return '<button type="button" class="simple-cliente-tab' + on + '" data-simple-cli-filtro="' +
        pair[0] + '">' + escapeHtml(pair[1]) + '</button>';
    }).join('');
  }

  function renderClienteList(items) {
    const list = $('simple-cliente-list');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<p class="simple-empty">' +
        escapeHtml(t('simple.cliente.vacio', 'No hay clientes en esta lista.')) + '</p>';
      return;
    }
    list.innerHTML = items.map(function (c) {
      const extra = (c.ficha && c.ficha.tel) ? c.ficha.tel : (c.ficha && c.ficha.ciudad ? c.ficha.ciudad : '');
      return '<button type="button" class="simple-row" data-simple-cli="' +
        escapeHtml(c.nombre) + '"><strong>' + escapeHtml(c.nombre) + '</strong>' +
        (extra ? '<span>' + escapeHtml(extra) + '</span>' : '') + '</button>';
    }).join('');
  }

  function renderClienteCard(ficha) {
    const card = $('simple-cliente-card');
    if (!card || !ficha) return;
    const lines = [];
    if (ficha.tel) lines.push(ficha.tel);
    if (ficha.dir || ficha.ciudad) lines.push([ficha.dir, ficha.ciudad].filter(Boolean).join(' · '));
    if (ficha.ultimo) lines.push(ficha.ultimo);
    card.hidden = false;
    card.innerHTML = '<strong>' + escapeHtml(ficha.nombre) + '</strong>' +
      lines.map(function (line) { return '<span>' + escapeHtml(line) + '</span>'; }).join('') +
      '<button type="button" id="simple-cliente-cambiar">' +
      escapeHtml(t('simple.cliente.cambiar', 'Cambiar cliente')) + '</button>';
  }

  function seleccionarClienteExistente(nombre) {
    const ficha = buildClienteFicha(nombre);
    if (!ficha || !ficha.nombre) return;
    clienteModo = 'existente';
    applyClienteToForm(ficha);
    syncClientePaso();
    irPaso(1);
  }

  function syncClientePaso() {
    ensureClientePanel();
    const pasos = pasosParaTipo();
    const actual = pasos[pasoIndex];
    const onCliente = !verTodo && actual === PASO_CLIENTE;
    const wrap = $('simple-cliente-wrap');
    const known = listKnownClientes();
    if (!clienteModo && onCliente) {
      const filled = String(($('formato-cliente-nombre') || {}).value || '').trim();
      if (filled) {
        clienteModo = known.some(function (c) { return normalize(c.nombre) === normalize(filled); })
          ? 'existente'
          : 'nuevo';
        if (clienteModo === 'existente') {
          const ficha = buildClienteFicha(filled);
          applyClienteToForm(ficha);
        }
      } else if (!known.length) {
        clienteModo = 'nuevo';
      }
    }
    if (wrap) wrap.hidden = !onCliente;
    maskClienteAdminFields(onCliente);
    if (!onCliente || !wrap) return;
    const picker = clienteModo !== 'existente' && clienteModo !== 'nuevo';
    const search = $('simple-cliente-search');
    const list = $('simple-cliente-list');
    const nuevoBtn = $('simple-cliente-nuevo');
    const card = $('simple-cliente-card');
    renderClienteTabs(known);
    if (search) search.hidden = !(picker && clienteFiltro === 'buscar' && known.length);
    if (list) list.hidden = !picker || !known.length;
    if (nuevoBtn) nuevoBtn.hidden = !picker && clienteModo !== '';
    if (picker && known.length) renderClienteList(clientesFiltrados());
    if (clienteModo === 'existente') {
      if (nuevoBtn) nuevoBtn.hidden = true;
      renderClienteCard(buildClienteFicha(($('formato-cliente-nombre') || {}).value));
    } else if (card) {
      card.hidden = true;
      card.innerHTML = '';
    }
    if (clienteModo === 'nuevo' && nuevoBtn) nuevoBtn.hidden = true;
  }

  function primerObs() {
    return document.querySelector('#formato-section-observaciones .obs-lines input');
  }

  function syncProblemaToCampos() {
    const ta = $('formato-simple-problema');
    if (!ta) return;
    const text = String(ta.value || '').trim();
    const ot = $('arpa-ia-ot-text');
    if (ot && !String(ot.value || '').trim()) ot.value = text;
    const obs = primerObs();
    if (obs && text && !String(obs.value || '').trim()) obs.value = text;
  }

  function hydrateProblemaFromCampos() {
    const ta = $('formato-simple-problema');
    if (!ta || String(ta.value || '').trim()) return;
    const ot = $('arpa-ia-ot-text');
    const fromOt = ot ? String(ot.value || '').trim() : '';
    if (fromOt) {
      ta.value = fromOt;
      return;
    }
    const obs = primerObs();
    const fromObs = obs ? String(obs.value || '').trim() : '';
    if (fromObs) ta.value = fromObs;
  }

  function setProblema(text) {
    const value = String(text || '').trim();
    if (!value) return;
    const ta = $('formato-simple-problema');
    if (ta) ta.value = value;
    syncProblemaToCampos();
  }

  function autofillTrabajo() {
    const fecha = $('formato-fecha');
    if (fecha && !String(fecha.value || '').trim()) fecha.value = todayIso();
    const ciudad = $('formato-cliente-ciudad');
    const s = settings();
    if (ciudad && !String(ciudad.value || '').trim() && s.city) ciudad.value = s.city;
    global.applyUserSettingsToUI?.();
    if (global.ArpaOT && typeof global.ArpaOT.ensureNumero === 'function') {
      global.ArpaOT.ensureNumero();
    }
  }

  function setPasoClass(on) {
    const root = $('view-formato');
    if (!root) return;
    root.classList.toggle('ot-pasos-on', !!on);
    root.classList.toggle('ot-pasos-all', !on);
  }

  function applyPaso() {
    const root = $('view-formato');
    if (!root) return;
    const pasos = pasosParaTipo();
    if (pasoIndex < 0) pasoIndex = 0;
    if (pasoIndex > pasos.length - 1) pasoIndex = pasos.length - 1;
    const actual = pasos[pasoIndex];
    setPasoClass(!verTodo);
    root.querySelectorAll('[data-ot-paso]').forEach(function (el) {
      const ids = String(el.getAttribute('data-ot-paso') || '').split(/\s+/);
      const match = ids.indexOf(actual) >= 0;
      el.classList.toggle('is-on', verTodo || match);
    });
    root.classList.toggle('ot-pasos-on', !verTodo);
    root.classList.toggle('ot-pasos-all', verTodo);
    const label = $('ot-pasos-label');
    if (label) {
      label.textContent = verTodo
        ? t('simple.pasos.todos', 'Todos los campos')
        : t('simple.pasos.estado', 'Paso {n} de {total} · {nombre}')
          .replace('{n}', String(pasoIndex + 1))
          .replace('{total}', String(pasos.length))
          .replace('{nombre}', labelPaso(actual));
    }
    const track = $('ot-pasos-track');
    if (track) {
      track.innerHTML = pasos.map(function (id, i) {
        const cls = i < pasoIndex ? 'is-done' : (i === pasoIndex ? 'is-now' : '');
        return '<span class="ot-pasos-dot ' + cls + '" title="' + escapeHtml(labelPaso(id)) + '"></span>';
      }).join('');
    }
    const prev = $('ot-pasos-prev');
    const next = $('ot-pasos-next');
    const allBtn = $('ot-pasos-all');
    if (prev) prev.disabled = verTodo || pasoIndex <= 0;
    if (next) {
      next.hidden = verTodo;
      next.textContent = actual === PASO_CIERRE
        ? t('simple.pasos.listo', 'Listo')
        : t('simple.pasos.continuar', 'Continuar');
    }
    if (allBtn) {
      allBtn.textContent = verTodo
        ? t('simple.pasos.por_pasos', 'Ver por pasos')
        : t('simple.pasos.ver_todos', 'Ver todos los campos');
    }
    const nav = $('ot-pasos-nav');
    if (nav) nav.hidden = verTodo;
    syncPdfChrome(actual);
    if (actual === PASO_DIAG && global.ArpaIaTecnicaUi) {
      global.ArpaIaTecnicaUi.syncOtPanelVisibility?.();
    }
    syncClientePaso();
  }

  function syncPdfChrome(pasoId) {
    const view = global.ArpaViews && typeof global.ArpaViews.getCurrentView === 'function'
      ? global.ArpaViews.getCurrentView()
      : '';
    const pdf = $('pdf-actions-formato');
    if (!pdf) return;
    if (view !== 'formato') {
      pdf.hidden = true;
      return;
    }
    const actual = pasoId || pasosParaTipo()[pasoIndex];
    pdf.hidden = !verTodo && actual !== PASO_CIERRE;
  }

  function irPaso(delta) {
    if (verTodo) return;
    const pasos = pasosParaTipo();
    if (delta > 0) {
      syncProblemaToCampos();
      if (pasos[pasoIndex] === PASO_CLIENTE) {
        const nombre = $('formato-cliente-nombre');
        const filled = String((nombre || {}).value || '').trim();
        if (!filled) {
          if (clienteModo !== 'nuevo' && listKnownClientes().length) {
            const list = $('simple-cliente-list');
            if (list) {
              list.classList.add('simple-need');
              setTimeout(function () { list.classList.remove('simple-need'); }, 1600);
            }
            return;
          }
          if (nombre) {
            if (clienteModo !== 'nuevo') clienteModo = 'nuevo';
            syncClientePaso();
            nombre.focus();
            nombre.classList.add('simple-need');
            setTimeout(function () { nombre.classList.remove('simple-need'); }, 1600);
          }
          return;
        }
        if (clienteModo === 'nuevo') persistClienteMinimo();
      }
    }
    pasoIndex += delta;
    if (pasoIndex >= pasos.length) {
      pasoIndex = pasos.length - 1;
      return;
    }
    applyPaso();
    if (delta > 0 && pasos[pasoIndex] === PASO_DIAG) {
      const sintoma = String(($('arpa-ia-ot-text') || {}).value || ($('formato-simple-problema') || {}).value || '').trim();
      if (sintoma && global.ArpaIaTecnicaUi && typeof global.ArpaIaTecnicaUi.runOt === 'function') {
        setTimeout(function () { global.ArpaIaTecnicaUi.runOt(false); }, 80);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function irAPasoId(id) {
    const pasos = pasosParaTipo();
    const idx = pasos.indexOf(id);
    if (idx >= 0) pasoIndex = idx;
    verTodo = false;
    applyPaso();
  }

  function mostrarTodo() {
    verTodo = true;
    applyPaso();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function mostrarPorPasos() {
    verTodo = false;
    applyPaso();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleTodos() {
    if (verTodo) mostrarPorPasos();
    else mostrarTodo();
  }

  function expandForPrint() {
    const root = $('view-formato');
    if (root) root.classList.add('ot-pasos-print');
  }

  function restoreAfterPrint() {
    const root = $('view-formato');
    if (root) root.classList.remove('ot-pasos-print');
  }

  function onTipoChange() {
    const pasos = pasosParaTipo();
    if (pasoIndex > pasos.length - 1) pasoIndex = pasos.length - 1;
    applyPaso();
  }

  function prepararTrabajo(opts) {
    const o = opts || {};
    if (o.tipo) setTipoServicio(o.tipo);
    autofillTrabajo();
    hydrateProblemaFromCampos();
    if (o.problema) setProblema(o.problema);
    if (o.tipo) setTipoServicio(o.tipo);
    verTodo = o.verTodo === true;
    clienteModo = '';
    clienteFiltro = 'recientes';
    clienteQuery = '';
    clienteContexto = null;
    if (o.paso) irAPasoId(o.paso);
    else {
      pasoIndex = 0;
      applyPaso();
    }
    if (o.tipo) setTipoServicio(o.tipo);
    if (o.informe && global.ArpaIaInformesUi && typeof global.ArpaIaInformesUi.generarDesdeOt === 'function') {
      setTimeout(function () { global.ArpaIaInformesUi.generarDesdeOt(); }, 80);
    }
  }

  function onFormatoShown() {
    const o = incomingTrabajo || { verTodo: false };
    incomingTrabajo = null;
    prepararTrabajo(o);
  }

  function records() {
    if (global.ArpaHistorial && typeof global.ArpaHistorial.getRecords === 'function') {
      return global.ArpaHistorial.getRecords() || [];
    }
    return [];
  }

  function recordDate(r) {
    return datePart(r.fecha) ||
      datePart(r.fechaHoraFinalizacion) ||
      datePart(r.fechaHoraInicio) ||
      datePart(r.fechaHoraProgramada);
  }

  function recordKind(r) {
    const m = String(r.modulo || r.documento || '').toLowerCase();
    if (m.indexOf('cot') >= 0) return t('simple.kind.cot', 'Cotización');
    if (m.indexOf('cuenta') >= 0 || m === 'cuenta-cobro') return t('simple.kind.cc', 'Cuenta de cobro');
    return t('simple.kind.trabajo', 'Trabajo');
  }

  function draftHint() {
    try {
      const key = (global.ArpaBrand && global.ArpaBrand.FORMATO_DRAFT_KEY) || 'arpa_formato_borrador';
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      const cliente = String(data['formato-cliente-nombre'] || '').trim();
      const problema = String(data['formato-simple-problema'] || '').trim();
      const numero = String(data['numero-formato'] || '').trim();
      if (!cliente && !problema && !numero) return null;
      const fecha = datePart(data['formato-fecha']) || todayIso();
      return {
        id: 'draft',
        modulo: 'formato',
        numero: numero || t('simple.borrador', 'Borrador'),
        cliente: cliente || t('simple.sin_cliente', 'Sin cliente'),
        fecha: fecha,
        concepto: problema,
        _draft: true
      };
    } catch (e) {
      return null;
    }
  }

  function renderLista(el, items, emptyText) {
    if (!el) return;
    if (!items.length) {
      el.innerHTML = '<p class="simple-empty">' + escapeHtml(emptyText) + '</p>';
      return;
    }
    el.innerHTML = items.map(function (r) {
      const who = r.cliente || t('simple.sin_cliente', 'Sin cliente');
      const num = r.numero || '';
      const extra = r.concepto ? ' · ' + r.concepto : '';
      return '<button type="button" class="simple-row" data-simple-doc="' +
        escapeHtml(r._draft ? 'draft' : (r.id || '')) + '">' +
        '<strong>' + escapeHtml(who) + '</strong>' +
        '<span>' + escapeHtml(recordKind(r) + (num ? ' · ' + num : '') + extra) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderInicio() {
    const name = firstName();
    const hello = $('simple-hello');
    if (hello) {
      hello.textContent = name
        ? t('simple.hola_nom', 'Hola, {name}').replace('{name}', name)
        : t('simple.hola', 'Hola');
    }
    const hoy = todayIso();
    const all = records();
    const deHoy = all.filter(function (r) { return recordDate(r) === hoy; }).slice(0, 6);
    const draft = draftHint();
    if (draft && draft.fecha === hoy) {
      const already = deHoy.some(function (r) { return r.numero && r.numero === draft.numero; });
      if (!already) deHoy.unshift(draft);
    }
    renderLista($('simple-hoy-list'), deHoy, t('simple.hoy_vacio', 'No tienes trabajos para hoy.'));
    const recent = all.slice(0, 4);
    renderLista($('simple-reciente-list'), recent, t('simple.reciente_vacio', 'Aún no hay documentos recientes.'));
    const box = $('simple-ia-status');
    if (box && !box.dataset.keep) {
      box.hidden = true;
      box.textContent = '';
    }
  }

  function openDoc(id) {
    if (id === 'draft' || !id) {
      openTrabajos();
      return;
    }
    if (global.ArpaHistorial && typeof global.ArpaHistorial.verDocumento === 'function') {
      global.ArpaHistorial.verDocumento(id);
    }
  }

  function setHomeStatus(text, kind) {
    const el = $('simple-ia-status');
    if (!el) return;
    const msg = String(text || '').trim();
    el.hidden = !msg;
    el.textContent = msg;
    el.className = 'simple-ia-status' + (kind ? ' is-' + kind : '');
    el.dataset.keep = msg ? '1' : '';
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function heuristicaTipo(norm) {
    if (/repar/.test(norm) || /no (cierra|abre|funciona|prende|arranca)/.test(norm) || /falla/.test(norm)) {
      return 'reparacion';
    }
    if (/manten/.test(norm)) return 'mantenimiento';
    if (/instal/.test(norm)) return 'instalacion';
    return '';
  }

  function abrirCotizarConTexto(texto) {
    global.openCotizacionView?.();
    const ta = $('arpa-ia-cot-text');
    if (ta) ta.value = texto;
    if (global.ArpaIaCotizadorUi && typeof global.ArpaIaCotizadorUi.run === 'function') {
      setTimeout(function () { global.ArpaIaCotizadorUi.run(); }, 60);
    }
  }

  function abrirConsultaEnInicio(texto) {
    const api = global.ArpaIaCopiloto;
    const out = $('simple-ia-result');
    if (!api || typeof api.consultarDesdeArpaSuite !== 'function') {
      setHomeStatus(t('simple.ia.sin_consulta', 'No se pudo consultar. No se inventaron datos.'), 'warn');
      return;
    }
    const res = api.consultarDesdeArpaSuite(texto, { hoy: todayIso() });
    if (out) {
      out.hidden = false;
      out.textContent = res && res.resumen
        ? res.resumen
        : t('simple.ia.sin_datos', 'No hay datos para esa consulta.');
    }
    setHomeStatus('', '');
  }

  function abrirComercial() {
    global.openHistorialView?.();
    if (global.ArpaIaComercialUi && typeof global.ArpaIaComercialUi.analizar === 'function') {
      setTimeout(function () { global.ArpaIaComercialUi.analizar(); }, 80);
    }
  }

  function continuarInicio() {
    const ta = $('simple-ia-text');
    const texto = ta ? String(ta.value || '').trim() : '';
    const out = $('simple-ia-result');
    if (out) {
      out.hidden = true;
      out.textContent = '';
    }
    if (!texto) {
      setHomeStatus(t('simple.ia.vacio', 'Escribe qué necesitas hacer.'), 'warn');
      if (ta) ta.focus();
      return;
    }
    const parser = global.ArpaIaIntegralParser;
    const parsed = parser && typeof parser.parsear === 'function' ? parser.parsear(texto) : { intencion: 'desconocida' };
    const intencion = parsed.intencion || 'desconocida';
    const norm = normalize(parsed.texto_util || texto);
    const tipo = heuristicaTipo(norm);
    const pideCotizar = /\bcotiz|\bpresupuesto\b|\bcuanto\s+(cuesta|vale|sale)/.test(norm);

    if (intencion === 'cotizar' && (pideCotizar || !tipo)) {
      abrirCotizarConTexto(texto);
      return;
    }
    if (intencion === 'diagnosticar' || tipo === 'reparacion') {
      openTrabajos({ tipo: 'reparacion', problema: texto, paso: PASO_CLIENTE, verTodo: false });
      return;
    }
    if (tipo === 'instalacion' || tipo === 'mantenimiento') {
      openTrabajos({ tipo: tipo, problema: texto, paso: PASO_CLIENTE, verTodo: false });
      return;
    }
    if (intencion === 'informar') {
      openTrabajos({ paso: PASO_CIERRE, problema: texto });
      return;
    }
    if (intencion === 'consultar') {
      abrirConsultaEnInicio(texto);
      return;
    }
    if (intencion === 'comercial') {
      abrirComercial();
      return;
    }
    if (intencion === 'cotizar') {
      abrirCotizarConTexto(texto);
      return;
    }
    setHomeStatus(t('simple.ia.aclaracion', '¿Quieres crear un trabajo, cotizar o consultar algo ya guardado?'), 'warn');
  }

  function openInicio() {
    closeMas();
    if (global.ArpaViews && typeof global.ArpaViews.showView === 'function') {
      global.ArpaViews.showView('inicio', document.querySelector('.main-menu-btn[data-nav="inicio"]'));
    }
    renderInicio();
    const ta = $('simple-ia-text');
    if (ta) {
      try { ta.focus(); } catch (e) { /* ignore */ }
    }
  }

  function protectTipo(tipo) {
    const value = String(tipo || '').trim().toLowerCase();
    if (!value) return;
    tipoLock = value;
    setTipoServicio(value);
    const root = $('view-formato');
    if (root) root.classList.add('ot-tipo-lock');
    if (tipoLockTimer) clearTimeout(tipoLockTimer);
    tipoLockTimer = setTimeout(function () {
      setTipoServicio(tipoLock);
      if (root) root.classList.remove('ot-tipo-lock');
      tipoLockTimer = 0;
    }, 400);
  }

  function openTrabajos(opts) {
    closeMas();
    incomingTrabajo = Object.assign({ verTodo: false }, opts || {});
    const tipo = incomingTrabajo.tipo;
    if (tipo) setTipoServicio(tipo);
    const go = function () {
      if (global.ArpaViews && typeof global.ArpaViews.showView === 'function') {
        global.ArpaViews.showView('formato', document.querySelector('.main-menu-btn[data-nav="trabajos"]'));
      } else {
        prepararTrabajo(incomingTrabajo);
        incomingTrabajo = null;
      }
      if (tipo) protectTipo(tipo);
    };
    setTimeout(go, 0);
  }

  function openMas() {
    const sheet = $('simple-mas-sheet');
    if (sheet && sheet.classList.contains('open')) {
      closeMas();
      const view = global.ArpaViews && typeof global.ArpaViews.getCurrentView === 'function'
        ? global.ArpaViews.getCurrentView()
        : 'inicio';
      document.querySelectorAll('.main-menu-btn').forEach(function (b) { b.classList.remove('active'); });
      const nav = view === 'cotizacion' ? 'cotizar' : (view === 'formato' ? 'trabajos' : (view === 'inicio' ? 'inicio' : 'mas'));
      document.querySelector('.main-menu-btn[data-nav="' + nav + '"]')?.classList.add('active');
      return;
    }
    if (sheet) sheet.classList.add('open');
    document.querySelectorAll('.main-menu-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('.main-menu-btn[data-nav="mas"]')?.classList.add('active');
  }

  function closeMas() {
    $('simple-mas-sheet')?.classList.remove('open');
  }

  function wrapPdf() {
    if (typeof global.guardarPDF !== 'function' || global.guardarPDF.__arpaSimpleWrapped) return;
    const orig = global.guardarPDF;
    global.guardarPDF = function () {
      expandForPrint();
      try {
        return orig.apply(this, arguments);
      } finally {
        setTimeout(restoreAfterPrint, 1200);
      }
    };
    global.guardarPDF.__arpaSimpleWrapped = true;
  }

  function bind() {
    if (bound) return;
    bound = true;
    $('simple-ia-run')?.addEventListener('click', continuarInicio);
    $('simple-ia-text')?.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        continuarInicio();
      }
    });
    $('simple-btn-trabajo')?.addEventListener('click', function () { openTrabajos({ paso: PASO_CLIENTE }); });
    $('simple-btn-cotizar')?.addEventListener('click', function () { global.openCotizacionView?.(); });
    $('simple-hoy-list')?.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-simple-doc]') : null;
      if (btn) openDoc(btn.getAttribute('data-simple-doc'));
    });
    $('simple-reciente-list')?.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-simple-doc]') : null;
      if (btn) openDoc(btn.getAttribute('data-simple-doc'));
    });
    $('ot-pasos-prev')?.addEventListener('click', function () { irPaso(-1); });
    $('ot-pasos-next')?.addEventListener('click', function () { irPaso(1); });
    $('ot-pasos-all')?.addEventListener('click', toggleTodos);
    $('formato-simple-problema')?.addEventListener('input', syncProblemaToCampos);
    document.querySelectorAll('#view-formato input[name="tipo"]').forEach(function (radio) {
      radio.addEventListener('change', onTipoChange);
    });
    $('simple-mas-sheet')?.addEventListener('click', function (ev) {
      if (ev.target && ev.target.id === 'simple-mas-sheet') closeMas();
    });
    $('simple-mas-close')?.addEventListener('click', closeMas);
    document.querySelectorAll('[data-simple-mas]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const dest = btn.getAttribute('data-simple-mas');
        closeMas();
        if (dest === 'historial') global.openHistorialView?.();
        else if (dest === 'catalogo') global.openCatalogoView?.();
        else if (dest === 'cuenta-cobro') global.openCuentaCobroView?.();
        else if (dest === 'config') global.openSettingsModal?.();
        else if (dest === 'ayuda') {
          try { global.open('./manual.html', '_blank', 'noopener'); } catch (e) { /* ignore */ }
        }
      });
    });
    wrapPdf();
    document.body.classList.add('simple-inicio');
    ensureClientePanel();
    renderInicio();
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  global.ArpaSimple = {
    renderInicio: renderInicio,
    openInicio: openInicio,
    openTrabajos: openTrabajos,
    openMas: openMas,
    closeMas: closeMas,
    prepararTrabajo: prepararTrabajo,
    onFormatoShown: onFormatoShown,
    applyPaso: applyPaso,
    mostrarTodo: mostrarTodo,
    expandForPrint: expandForPrint,
    restoreAfterPrint: restoreAfterPrint,
    syncPdfChrome: syncPdfChrome,
    getClienteContexto: function () { return clienteContexto; }
  };
  global.openInicioView = function (btn) {
    if (global.ArpaViews && typeof global.ArpaViews.showView === 'function') {
      global.ArpaViews.showView('inicio', btn || document.querySelector('.main-menu-btn[data-nav="inicio"]'));
    }
    renderInicio();
  };
  global.openMasSheet = function (btn) { openMas(btn); };
})(typeof window !== 'undefined' ? window : globalThis);
