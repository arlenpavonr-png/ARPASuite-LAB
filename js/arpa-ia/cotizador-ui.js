/**
 * Panel LAB dentro de Cotizaciones. Asistente: no reemplaza ni guarda la cotización.
 */
(function (global) {
  const USER_ERROR = 'No fue posible consultar ARPA IA. Intenta nuevamente.';
  const PRICE_UNAVAILABLE = 'Precio no disponible';

  const TRABAJO = {
    instalacion: 'instalación',
    reparacion: 'reparación',
    mantenimiento: 'mantenimiento'
  };

  let lastSuggestions = [];
  let lastOficioId = '';

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(value) {
    if (value == null || value === '') return PRICE_UNAVAILABLE;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return PRICE_UNAVAILABLE;
    if (global.ArpaPricing && typeof global.ArpaPricing.formatoPesos === 'function') {
      return global.ArpaPricing.formatoPesos(n);
    }
    return '$ ' + n.toLocaleString('es-CO');
  }

  function prettyTrabajo(value) {
    if (!value) return '—';
    const key = String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return TRABAJO[key] || String(value).toLowerCase();
  }

  function activeProfile() {
    const perfiles = global.ArpaIaPerfiles;
    if (!perfiles) return { id: 'automatismos', fields: [], productMeta: [] };
    return perfiles.getProfile(perfiles.resolveOficioId());
  }

  function resolveRequestOficio(text) {
    const perfiles = global.ArpaIaPerfiles;
    const inferred = perfiles && typeof perfiles.inferOficioFromText === 'function'
      ? perfiles.inferOficioFromText(text)
      : '';
    if (inferred) return inferred;
    return activeProfile().id;
  }

  function setBusy(busy) {
    const btn = $('arpa-ia-cot-run');
    const ta = $('arpa-ia-cot-text');
    const useBtn = $('arpa-ia-cot-usar');
    if (btn) {
      btn.disabled = !!busy;
      btn.textContent = busy ? 'Analizando…' : 'Analizar con ARPA IA';
    }
    if (ta) ta.disabled = !!busy;
    if (useBtn) useBtn.disabled = !!busy;
  }

  function setStatus(message, kind) {
    const el = $('arpa-ia-cot-status');
    if (!el) return;
    const text = String(message || '').trim();
    el.hidden = !text;
    el.textContent = text;
    el.className = 'arpa-ia-cot-status' + (kind ? ' is-' + kind : '');
  }

  function messageForLlmError(error) {
    const codigo = error && error.codigo ? String(error.codigo) : '';
    if (codigo === 'timeout_llm') return 'ARPA IA tardó demasiado. Intenta de nuevo.';
    if (codigo === 'error_red' || codigo === 'red_o_parseo') return 'No hay conexión con ARPA IA.';
    if (codigo === 'backend_no_disponible') return 'ARPA IA no está disponible ahora. Intenta de nuevo.';
    if (codigo === 'respuesta_no_json' || codigo === 'json_invalido' || codigo === 'respuesta_vacia') {
      return 'ARPA IA no devolvió una respuesta válida.';
    }
    if (codigo === 'backend_dev_ausente' || codigo === 'modo_local') return 'ARPA IA no está configurado.';
    if (codigo === 'backend_error') return 'ARPA IA no pudo interpretar la solicitud. Intenta de nuevo.';
    return USER_ERROR;
  }

  function showError(message) {
    const box = $('arpa-ia-cot-error');
    if (!box) return;
    box.hidden = false;
    box.textContent = message || USER_ERROR;
  }

  function hideError() {
    const box = $('arpa-ia-cot-error');
    if (box) box.hidden = true;
  }

  function renderOficio(oficioId) {
    const el = $('arpa-ia-cot-oficio');
    const perfiles = global.ArpaIaPerfiles;
    if (!el) return;
    if (!oficioId) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const profile = perfiles ? perfiles.getProfile(oficioId) : { label: oficioId };
    el.hidden = false;
    el.textContent = 'Oficio detectado: ' + (profile.label || oficioId);
  }

  function renderDatos(datos, profile) {
    const wrap = $('arpa-ia-cot-datos');
    const perfiles = global.ArpaIaPerfiles;
    if (!wrap) return;
    const fields = profile && profile.fields ? profile.fields : [];
    wrap.innerHTML = fields.map((field) => {
      let value = perfiles ? perfiles.readFieldValue(datos, field.id) : datos[field.id];
      if (field.id === 'tipo_de_trabajo') value = prettyTrabajo(value);
      else value = perfiles ? perfiles.formatFieldValue(field, value) : (value == null ? '—' : String(value));
      return (
        '<div class="arpa-ia-dato">' +
          '<span class="arpa-ia-dato-k">' + escapeHtml(field.label) + '</span>' +
          '<span class="arpa-ia-dato-v">' + escapeHtml(value) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderFaltantes(list, profile) {
    const box = $('arpa-ia-cot-faltantes');
    const ul = $('arpa-ia-cot-faltantes-list');
    const perfiles = global.ArpaIaPerfiles;
    if (!box || !ul) return;
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!items.length) {
      box.hidden = true;
      ul.innerHTML = '';
      return;
    }
    const labelById = {};
    (profile && profile.fields ? profile.fields : []).forEach((f) => { labelById[f.id] = f.label; });
    box.hidden = false;
    ul.innerHTML = items.map((item) => {
      const label = labelById[item] || (perfiles ? item.replace(/_/g, ' ') : item);
      return '<li>' + escapeHtml(label) + '</li>';
    }).join('');
  }

  function suggestionList(productos, materiales) {
    return (productos || []).concat(materiales || []).filter((p) => p && p.codigo);
  }

  function renderProductos(productos, materiales, profile) {
    const list = $('arpa-ia-cot-productos');
    const empty = $('arpa-ia-cot-vacio');
    const actions = $('arpa-ia-cot-usar-wrap');
    if (!list || !empty) return;
    const all = suggestionList(productos, materiales);
    lastSuggestions = all;
    if (!all.length) {
      list.innerHTML = '';
      empty.hidden = false;
      if (actions) actions.hidden = true;
      return;
    }
    empty.hidden = true;
    if (actions) actions.hidden = false;
    const metas = profile && Array.isArray(profile.productMeta) ? profile.productMeta : [];
    list.innerHTML = all.map((p, idx) => {
      const precio = formatMoney(p.precio_catalogo);
      const extra = metas.map((meta) => {
        const raw = p[meta.id];
        if (raw == null || raw === '') return '';
        return '<span>' + escapeHtml(meta.label) + ': ' + escapeHtml(String(raw) + (meta.unit ? ' ' + meta.unit : '')) + '</span>';
      }).join('');
      const categoria = p.categoria ? '<span>Categoría: ' + escapeHtml(p.categoria) + '</span>' : '';
      return (
        '<article class="arpa-ia-prod">' +
          '<label class="arpa-ia-prod-pick">' +
            '<input type="checkbox" class="arpa-ia-prod-check" data-idx="' + idx + '" checked>' +
            '<span class="arpa-ia-prod-pick-ui"></span>' +
          '</label>' +
          '<div class="arpa-ia-prod-body">' +
            '<div class="arpa-ia-prod-top">' +
              '<span class="arpa-ia-prod-marca">' + escapeHtml(p.marca || '—') + '</span>' +
              '<span class="arpa-ia-prod-cod">' + escapeHtml(p.codigo || '—') + '</span>' +
            '</div>' +
            '<div class="arpa-ia-prod-nom">' + escapeHtml(p.nombre || '—') + '</div>' +
            '<div class="arpa-ia-prod-meta">' +
              extra +
              categoria +
              '<span class="arpa-ia-prod-precio">' + escapeHtml(precio) + '</span>' +
            '</div>' +
            '<div class="arpa-ia-prod-motivo">' + escapeHtml(p.motivo || 'Coincidencia con el catálogo') + '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function showResults(visible) {
    const panel = $('arpa-ia-cot-resultado');
    if (panel) panel.hidden = !visible;
  }

  function selectedSuggestions() {
    const checks = document.querySelectorAll('#arpa-ia-cot-productos .arpa-ia-prod-check');
    const picked = [];
    checks.forEach((input) => {
      if (!input.checked) return;
      const idx = Number(input.getAttribute('data-idx'));
      const item = lastSuggestions[idx];
      if (item) picked.push(item);
    });
    return picked;
  }

  function applyToCotizacion() {
    hideError();
    const cot = global.ArpaCotizacion;
    if (!cot || typeof cot.addProductoPorCodigo !== 'function') {
      showError('No se pudo agregar a la cotización.');
      return;
    }
    const selected = selectedSuggestions();
    if (!selected.length) {
      showError('Selecciona al menos un producto sugerido.');
      return;
    }
    let added = 0;
    let dup = 0;
    let missing = 0;
    selected.forEach((item) => {
      const result = cot.addProductoPorCodigo(item.codigo, { pvp: item.precio_catalogo });
      if (result && result.ok) added += 1;
      else if (result && result.reason === 'duplicado') dup += 1;
      else missing += 1;
    });
    const parts = [];
    if (added) parts.push(added === 1 ? '1 producto pasado a la cotización' : added + ' productos pasados a la cotización');
    if (dup) parts.push(dup === 1 ? '1 ya estaba y no se duplicó' : dup + ' ya estaban y no se duplicaron');
    if (missing) {
      const profile = global.ArpaIaPerfiles ? global.ArpaIaPerfiles.getProfile(lastOficioId) : null;
      const label = profile && profile.label ? profile.label : 'otro oficio';
      parts.push('algunos no están en el catálogo activo de Cotizaciones (' + label + ')');
    }
    if (!added && !dup && missing) {
      showError('Esos productos pertenecen a otro oficio. No se agregaron ni se inventaron ítems.');
      setStatus('', '');
      return;
    }
    setStatus((parts.join('. ') || 'Nada que agregar') + '. La cotización no se guardó.', added ? 'ok' : 'warn');
    const table = $('cot-tabla-body');
    if (added && table && typeof table.scrollIntoView === 'function') {
      table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  async function run() {
    const ta = $('arpa-ia-cot-text');
    const text = ta ? String(ta.value || '').trim() : '';
    hideError();
    lastSuggestions = [];
    lastOficioId = '';
    if (!text) {
      showError('Escribe la solicitud para analizarla con ARPA IA.');
      showResults(false);
      setStatus('', '');
      return;
    }
    const engine = global.ArpaIaCotizador;
    if (!engine || typeof engine.cotizarDesdeTextoAsync !== 'function') {
      showError(USER_ERROR);
      showResults(false);
      return;
    }
    const oficioId = resolveRequestOficio(text);
    lastOficioId = oficioId;
    setBusy(true);
    showResults(false);
    setStatus('Enviando solicitud a ARPA IA…', 'busy');
    try {
      const result = await engine.cotizarDesdeTextoAsync(text, { oficioId: oficioId });
      if (!result || result.estado_llm !== 'ok') {
        showError(messageForLlmError(result && result.error_llm));
        setStatus('', '');
        return;
      }
      const usedProfile = global.ArpaIaPerfiles
        ? global.ArpaIaPerfiles.getProfile(result.perfil_id || oficioId)
        : activeProfile();
      lastOficioId = result.oficio_id || oficioId;
      renderOficio(lastOficioId);
      renderDatos(result.datos_extraidos || {}, usedProfile);
      renderFaltantes(result.datos_faltantes, usedProfile);
      renderProductos(result.productos_sugeridos, result.materiales_sugeridos, usedProfile);
      showResults(true);
      const missing = Array.isArray(result.datos_faltantes) ? result.datos_faltantes.filter(Boolean).length : 0;
      setStatus(
        missing
          ? 'Análisis listo. Faltan datos para recomendar con más precisión; no se asumieron medidas ni precios.'
          : 'Análisis listo. Productos y PVP tomados del catálogo real.',
        missing ? 'warn' : 'ok'
      );
    } catch (err) {
      showError(USER_ERROR);
      setStatus('', '');
    } finally {
      setBusy(false);
    }
  }

  function applyPlaceholder() {
    const ta = $('arpa-ia-cot-text');
    const profile = activeProfile();
    if (ta && profile && profile.placeholder) ta.placeholder = profile.placeholder;
  }

  function bind() {
    const btn = $('arpa-ia-cot-run');
    const ta = $('arpa-ia-cot-text');
    const useBtn = $('arpa-ia-cot-usar');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    applyPlaceholder();
    btn.addEventListener('click', run);
    if (useBtn) useBtn.addEventListener('click', applyToCotizacion);
    if (ta) {
      ta.addEventListener('keydown', (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
          ev.preventDefault();
          run();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  global.ArpaIaCotizadorUi = { bind, run, applyPlaceholder, applyToCotizacion };
})(typeof window !== 'undefined' ? window : globalThis);
