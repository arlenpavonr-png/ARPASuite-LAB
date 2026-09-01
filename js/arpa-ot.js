/**
 * Orden de Trabajo — estados, tiempos y materiales del Formato de Servicio.
 * Reutiliza numeración `formato` y el historial existente. No toca inventario.
 */
(function (global) {
  const ESTADOS = {
    BORRADOR: 'BORRADOR',
    PROGRAMADA: 'PROGRAMADA',
    EN_EJECUCION: 'EN_EJECUCION',
    FINALIZADA: 'FINALIZADA',
    CERRADA: 'CERRADA'
  };

  const LABELS = {
    BORRADOR: 'Borrador',
    PROGRAMADA: 'Programada',
    EN_EJECUCION: 'En ejecución',
    FINALIZADA: 'Finalizada',
    CERRADA: 'Cerrada'
  };

  const UNIDADES = ['Unidad', 'Metro', 'Servicio', 'Hora'];

  function t(key, fallback) {
    if (global.ArpaI18n && typeof global.ArpaI18n.t === 'function') {
      const val = global.ArpaI18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function normalizeEstado(value) {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (raw === 'EN EJECUCION' || raw === 'EN_EJECUCIÓN') return ESTADOS.EN_EJECUCION;
    if (ESTADOS[raw]) return ESTADOS[raw];
    return ESTADOS.BORRADOR;
  }

  function estadoLabel(estado) {
    const key = normalizeEstado(estado);
    return t('ot.estado.' + key.toLowerCase(), LABELS[key] || LABELS.BORRADOR);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDisplayDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      const s = String(iso);
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
        const [date, time] = s.split('T');
        const [y, m, day] = date.split('-');
        return day + '/' + m + '/' + y + ' ' + time.slice(0, 5);
      }
      return s;
    }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function splitProgramada(iso) {
    const s = String(iso || '');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      return { fecha: s.slice(0, 10), hora: s.slice(11, 16) };
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return {
        fecha: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
        hora: pad(d.getHours()) + ':' + pad(d.getMinutes())
      };
    }
    return { fecha: '', hora: '' };
  }

  function combineProgramada(fecha, hora) {
    const f = String(fecha || '').trim();
    const h = String(hora || '').trim();
    if (!f || !h) return '';
    return f + 'T' + h;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function getEstado() {
    return normalizeEstado(el('formato-ot-estado')?.value);
  }

  function setEstado(estado) {
    const next = normalizeEstado(estado);
    const input = el('formato-ot-estado');
    if (input) input.value = next;
    refreshStatusUI();
    return next;
  }

  function getFechaHoraProgramada() {
    return combineProgramada(el('formato-ot-fecha-prog')?.value, el('formato-ot-hora-prog')?.value)
      || (el('formato-ot-programada')?.value || '');
  }

  function setFechaHoraProgramada(iso) {
    const parts = splitProgramada(iso);
    if (el('formato-ot-fecha-prog')) el('formato-ot-fecha-prog').value = parts.fecha;
    if (el('formato-ot-hora-prog')) el('formato-ot-hora-prog').value = parts.hora;
    if (el('formato-ot-programada')) el('formato-ot-programada').value = iso || '';
  }

  function getFechaHoraInicio() {
    return el('formato-ot-inicio')?.value || '';
  }

  function setFechaHoraInicio(iso) {
    if (el('formato-ot-inicio')) el('formato-ot-inicio').value = iso || '';
    refreshTimesUI();
  }

  function getFechaHoraFinalizacion() {
    return el('formato-ot-fin')?.value || '';
  }

  function setFechaHoraFinalizacion(iso) {
    if (el('formato-ot-fin')) el('formato-ot-fin').value = iso || '';
    refreshTimesUI();
  }

  function refreshTimesUI() {
    const inicioEl = el('formato-ot-inicio-display');
    const finEl = el('formato-ot-fin-display');
    if (inicioEl) inicioEl.textContent = formatDisplayDateTime(getFechaHoraInicio()) || '—';
    if (finEl) finEl.textContent = formatDisplayDateTime(getFechaHoraFinalizacion()) || '—';
    const progHidden = el('formato-ot-programada');
    if (progHidden) progHidden.value = getFechaHoraProgramada();
  }

  function refreshStatusUI() {
    const estado = getEstado();
    const badge = el('formato-ot-badge');
    if (badge) {
      badge.textContent = estadoLabel(estado);
      badge.setAttribute('data-estado', estado);
    }
    const root = el('view-formato');
    if (root) root.setAttribute('data-ot-estado', estado);

    const map = {
      'ot-btn-guardar': true,
      'ot-btn-programar': estado === ESTADOS.BORRADOR || estado === ESTADOS.PROGRAMADA,
      'ot-btn-iniciar': estado === ESTADOS.BORRADOR || estado === ESTADOS.PROGRAMADA,
      'ot-btn-finalizar': estado === ESTADOS.EN_EJECUCION,
      'ot-btn-cerrar': estado === ESTADOS.FINALIZADA
    };
    Object.keys(map).forEach((id) => {
      const btn = el(id);
      if (!btn) return;
      const show = estado !== ESTADOS.CERRADA && map[id];
      btn.hidden = !show;
      btn.disabled = !show;
    });

    setFormLocked(estado === ESTADOS.CERRADA);
  }

  function setFormLocked(locked) {
    const root = el('view-formato');
    if (!root) return;
    root.classList.toggle('ot-locked', !!locked);
    root.querySelectorAll('input, select, textarea').forEach((node) => {
      if (node.id === 'formato-ot-estado') return;
      if (node.type === 'file') {
        node.disabled = !!locked;
        return;
      }
      node.readOnly = !!locked;
      if (node.tagName === 'SELECT' || node.type === 'checkbox' || node.type === 'radio' || node.type === 'date' || node.type === 'time') {
        node.disabled = !!locked;
      }
    });
    root.querySelectorAll('.btn-firma-clear, .btn-mat-add, .btn-mat-del, .ph-btn-label').forEach((node) => {
      node.hidden = !!locked;
      if ('disabled' in node) node.disabled = !!locked;
    });
    const numero = el('numero-formato');
    if (numero) numero.readOnly = !!locked;
    const lockNote = el('formato-ot-lock-note');
    if (lockNote) lockNote.hidden = !locked;
  }

  function emptyMaterial() {
    return { desc: '', cant: '', unidad: 'Unidad', obs: '' };
  }

  function readMaterialRow(tr) {
    return {
      desc: (tr.querySelector('.ot-mat-desc')?.value || '').trim(),
      cant: (tr.querySelector('.ot-mat-cant')?.value || '').trim(),
      unidad: (tr.querySelector('.ot-mat-unidad')?.value || '').trim() || 'Unidad',
      obs: (tr.querySelector('.ot-mat-obs')?.value || '').trim()
    };
  }

  function collectMaterialesVisual() {
    return Array.from(document.querySelectorAll('#formato-materiales-body tr')).map(readMaterialRow);
  }

  function collectMateriales() {
    return collectMaterialesVisual().filter((row) => row.desc || row.cant || row.obs);
  }

  function materialesTexto(rows) {
    return (rows || []).map((r) => {
      const parts = [r.desc, r.cant, r.unidad, r.obs].filter(Boolean);
      return parts.join(' ');
    }).filter(Boolean).join('; ');
  }

  function renderMateriales(rows) {
    const body = el('formato-materiales-body');
    if (!body) return;
    const list = Array.isArray(rows) && rows.length ? rows : [emptyMaterial()];
    body.innerHTML = list.map((row, index) => materialRowHtml(row, index, list.length)).join('');
    bindMaterialRowEvents();
  }

  function materialRowHtml(row, index, total) {
    const unidadOpts = UNIDADES.map((u) => {
      const sel = (row.unidad || 'Unidad') === u ? ' selected' : '';
      return '<option value="' + u + '"' + sel + '>' + u + '</option>';
    }).join('');
    const del = total > 1
      ? '<button type="button" class="btn-mat-del no-print" data-index="' + index + '" aria-label="' + t('ot.mat.quitar', 'Quitar') + '">✕</button>'
      : '';
    return '<tr class="mat-row">'
      + '<td><input type="text" class="ot-mat-desc" value="' + escapeAttr(row.desc || '') + '" placeholder="' + escapeAttr(t('ot.mat.placeholder.desc', 'Ej: Fotocelda')) + '"></td>'
      + '<td><input type="text" class="ot-mat-cant" inputmode="decimal" value="' + escapeAttr(row.cant || '') + '" placeholder="1"></td>'
      + '<td><select class="ot-mat-unidad">' + unidadOpts + '</select></td>'
      + '<td><input type="text" class="ot-mat-obs" value="' + escapeAttr(row.obs || '') + '" placeholder="' + escapeAttr(t('ot.mat.placeholder.obs', 'Opcional')) + '"></td>'
      + '<td class="ot-mat-actions no-print">' + del + '</td>'
      + '</tr>';
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function bindMaterialRowEvents() {
    const body = el('formato-materiales-body');
    if (!body || body.__otBound) return;
    body.__otBound = true;
    body.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-mat-del');
      if (!btn || getEstado() === ESTADOS.CERRADA) return;
      const tr = btn.closest('tr');
      const visual = Array.from(body.querySelectorAll('tr'));
      const idx = visual.indexOf(tr);
      if (idx < 0) return;
      const rows = collectMaterialesVisual();
      rows.splice(idx, 1);
      renderMateriales(rows.length ? rows : [emptyMaterial()]);
      persistDraftSoon();
    });
  }

  function addMaterialRow() {
    if (getEstado() === ESTADOS.CERRADA) return;
    const rows = collectMaterialesVisual();
    rows.push(emptyMaterial());
    renderMateriales(rows);
    persistDraftSoon();
  }

  function persistDraftSoon() {
    if (typeof global.scheduleFormatoDraftSave === 'function') {
      global.scheduleFormatoDraftSave();
    }
  }

  function persistDraftNow() {
    try {
      if (typeof global.collectFormatoDraft === 'function') {
        localStorage.setItem(
          global.ArpaBrand?.FORMATO_DRAFT_KEY || 'arpa_formato_borrador',
          JSON.stringify(global.collectFormatoDraft())
        );
      }
    } catch (e) { /* ignore */ }
  }

  function enrichDraft(data) {
    if (!data || typeof data !== 'object') return data;
    data._estado = getEstado();
    data._fechaHoraProgramada = getFechaHoraProgramada();
    data._fechaHoraInicio = getFechaHoraInicio();
    data._fechaHoraFinalizacion = getFechaHoraFinalizacion();
    data._materiales = collectMateriales();
    return data;
  }

  function restoreFromDraft(data) {
    if (!data || typeof data !== 'object') {
      resetMeta({ keepNumero: true });
      return;
    }
    const estado = normalizeEstado(data._estado || data['formato-ot-estado'] || ESTADOS.BORRADOR);
    if (el('formato-ot-estado')) el('formato-ot-estado').value = estado;
    const prog = data._fechaHoraProgramada || data['formato-ot-programada'] || '';
    if (prog) setFechaHoraProgramada(prog);
    else {
      setFechaHoraProgramada(combineProgramada(data['formato-ot-fecha-prog'], data['formato-ot-hora-prog']));
    }
    setFechaHoraInicio(data._fechaHoraInicio || data['formato-ot-inicio'] || '');
    setFechaHoraFinalizacion(data._fechaHoraFinalizacion || data['formato-ot-fin'] || '');
    renderMateriales(Array.isArray(data._materiales) ? data._materiales : []);
    refreshStatusUI();
    refreshTimesUI();
  }

  function resetMeta(options) {
    setEstado(ESTADOS.BORRADOR);
    setFechaHoraProgramada('');
    setFechaHoraInicio('');
    setFechaHoraFinalizacion('');
    renderMateriales([emptyMaterial()]);
    refreshTimesUI();
    refreshStatusUI();
    if (!options?.keepNumero) { /* numero lo limpia el formato */ }
  }

  function alertMsg(key, fallback) {
    alert(t(key, fallback));
  }

  async function ensureNumero() {
    const field = el('numero-formato');
    if (field && String(field.value || '').trim()) return true;
    if (!global.ArpaNumeracion?.blockIfPymeMissingCode?.()) return false;
    if (!global.ArpaNumeracion?.nextNumberAsync) return false;
    try {
      const { value } = await global.ArpaNumeracion.nextNumberAsync('formato', field?.value);
      if (field) field.value = value;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function guardarBorrador() {
    if (getEstado() === ESTADOS.CERRADA) {
      alertMsg('ot.alert.cerrada_no_editar', 'Esta orden está cerrada y no se puede modificar.');
      return;
    }
    if (!(await ensureNumero())) return;
    if (getEstado() !== ESTADOS.PROGRAMADA && getEstado() !== ESTADOS.EN_EJECUCION && getEstado() !== ESTADOS.FINALIZADA) {
      setEstado(ESTADOS.BORRADOR);
    }
    persistDraftNow();
    alertMsg('ot.alert.borrador_guardado', 'Borrador guardado en este dispositivo.');
  }

  async function programar() {
    if (getEstado() === ESTADOS.CERRADA) {
      alertMsg('ot.alert.cerrada_no_editar', 'Esta orden está cerrada y no se puede modificar.');
      return;
    }
    if (getEstado() === ESTADOS.EN_EJECUCION || getEstado() === ESTADOS.FINALIZADA) {
      alertMsg('ot.alert.no_programar_avanzada', 'No se puede programar una orden que ya está en ejecución o finalizada.');
      return;
    }
    if (!(await ensureNumero())) return;
    const fecha = el('formato-ot-fecha-prog')?.value || '';
    const hora = el('formato-ot-hora-prog')?.value || '';
    if (!fecha || !hora) {
      alertMsg('ot.alert.falta_programacion', 'Indique fecha y hora programada para programar la orden.');
      el('formato-ot-fecha-prog')?.focus();
      return;
    }
    setFechaHoraProgramada(combineProgramada(fecha, hora));
    setEstado(ESTADOS.PROGRAMADA);
    persistDraftNow();
    alertMsg('ot.alert.programada', 'Orden programada.');
  }

  async function iniciar() {
    const estado = getEstado();
    if (estado === ESTADOS.CERRADA) {
      alertMsg('ot.alert.no_iniciar_cerrada', 'No se puede iniciar una orden cerrada.');
      return;
    }
    if (estado === ESTADOS.FINALIZADA) {
      alertMsg('ot.alert.no_iniciar_finalizada', 'Esta orden ya está finalizada.');
      return;
    }
    if (estado === ESTADOS.EN_EJECUCION) {
      alertMsg('ot.alert.ya_en_ejecucion', 'El trabajo ya está en ejecución.');
      return;
    }
    if (!(await ensureNumero())) return;
    if (!getFechaHoraInicio()) setFechaHoraInicio(nowIso());
    setEstado(ESTADOS.EN_EJECUCION);
    persistDraftNow();
    alertMsg('ot.alert.iniciada', 'Trabajo iniciado. Se registró la hora de inicio.');
  }

  function finalizar() {
    const estado = getEstado();
    if (estado !== ESTADOS.EN_EJECUCION) {
      alertMsg('ot.alert.no_finalizar', 'Solo se puede finalizar una orden que está en ejecución.');
      return;
    }
    if (!getFechaHoraFinalizacion()) setFechaHoraFinalizacion(nowIso());
    setEstado(ESTADOS.FINALIZADA);
    persistDraftNow();
    alertMsg('ot.alert.finalizada', 'Trabajo finalizado. Complete observaciones, fotos y firmas antes de cerrar.');
  }

  function cerrar() {
    const estado = getEstado();
    if (estado !== ESTADOS.FINALIZADA) {
      alertMsg('ot.alert.no_cerrar', 'Solo se puede cerrar una orden que esté finalizada.');
      return;
    }
    setEstado(ESTADOS.CERRADA);
    persistDraftNow();
    if (global.ArpaHistorial && typeof global.ArpaHistorial.captureFromFormato === 'function') {
      global.ArpaHistorial.captureFromFormato();
    }
    persistDraftNow();
    alertMsg('ot.alert.cerrada', 'Orden de trabajo cerrada y guardada en el historial.');
  }

  function collectOtFields() {
    return {
      estado: getEstado(),
      fechaHoraProgramada: getFechaHoraProgramada(),
      fechaHoraInicio: getFechaHoraInicio(),
      fechaHoraFinalizacion: getFechaHoraFinalizacion(),
      materiales: collectMateriales()
    };
  }

  function init() {
    if (document.body && document.body.__arpaOtInit) return;
    if (document.body) document.body.__arpaOtInit = true;
    const addBtn = el('ot-btn-mat-add');
    addBtn?.addEventListener('click', addMaterialRow);
    el('ot-btn-guardar')?.addEventListener('click', () => { guardarBorrador(); });
    el('ot-btn-programar')?.addEventListener('click', () => { programar(); });
    el('ot-btn-iniciar')?.addEventListener('click', () => { iniciar(); });
    el('ot-btn-finalizar')?.addEventListener('click', finalizar);
    el('ot-btn-cerrar')?.addEventListener('click', cerrar);

    ['formato-ot-fecha-prog', 'formato-ot-hora-prog'].forEach((id) => {
      el(id)?.addEventListener('change', () => {
        if (el('formato-ot-programada')) el('formato-ot-programada').value = getFechaHoraProgramada();
      });
    });

    if (!el('formato-materiales-body')?.children.length) {
      renderMateriales([emptyMaterial()]);
    }
    if (!el('formato-ot-estado')?.value) setEstado(ESTADOS.BORRADOR);
    refreshTimesUI();
    refreshStatusUI();
  }

  global.ArpaOT = {
    ESTADOS,
    getEstado,
    setEstado,
    estadoLabel,
    collectMateriales,
    renderMateriales,
    enrichDraft,
    restoreFromDraft,
    resetMeta,
    collectOtFields,
    formatDisplayDateTime,
    init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
