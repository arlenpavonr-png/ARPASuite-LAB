/**
 * UI LAB de prueba y panel en la Orden de Trabajo.
 * No toca cotizaciones, PDF ni WhatsApp.
 */
(function (global) {
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

  function listItems(items, emptyText) {
    if (!items || !items.length) {
      return '<p class="arpa-ia-tec-empty">' + escapeHtml(emptyText) + '</p>';
    }
    return '<ul>' + items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('') + '</ul>';
  }

  const PLACEHOLDERS = {
    automatismos: 'Ej. La puerta corrediza no cierra; las fotoceldas están sucias y el motor hace ruido.',
    electricidad: 'Ej. El breaker de 20 A se dispara al encender el aire. Hay olor a quemado en el tablero.',
    refrigeracion: 'Ej. El split de 12000 BTU no enfría y el evaporador se congela.',
    taller_motos: 'Ej. Moto Honda 150 con 25.000 km no arranca; se siente olor a gasolina.',
    gas: 'Ej. Huele a gas cerca de la estufa y la llama se pone amarilla.',
    cctv: 'Ej. Tres cámaras IP quedaron sin imagen y el NVR no graba.',
    plomeria: 'Ej. Fuga de agua en la unión de PVC bajo el lavamanos.',
    metalmecanica: 'Ej. La reja tiene holgura en la soldadura del anclaje.',
    plagas: 'Ej. Cucarachas en cocina de un apartamento de 80 m².',
    linea_blanca: 'Ej. Lavadora Haceb no centrifuga y hace ruido al final del ciclo.',
    solar: 'Ej. El inversor muestra alarma y el sistema no genera.'
  };

  function tipoServicioOt() {
    const el = document.querySelector('#view-formato input[name="tipo"]:checked');
    return el ? String(el.value || '').trim().toLowerCase() : '';
  }

  function visibleParaTipoServicio(tipo) {
    const t = String(tipo || '').trim().toLowerCase();
    return t === 'mantenimiento' || t === 'reparacion';
  }

  function syncOtPanelVisibility() {
    const panel = $('formato-ia-tecnica');
    if (!panel) return false;
    const visible = visibleParaTipoServicio(tipoServicioOt());
    panel.hidden = !visible;
    if (visible) refreshOtOficio();
    return visible;
  }

  function oficIoActivo() {
    if (global.ArpaOficios && typeof global.ArpaOficios.getActiveFormatoOficioId === 'function') {
      return global.ArpaOficios.getActiveFormatoOficioId();
    }
    return 'automatismos';
  }

  function labelOficio(id) {
    if (global.ArpaIaTecnica && typeof global.ArpaIaTecnica.labelOficio === 'function') {
      return global.ArpaIaTecnica.labelOficio(id);
    }
    if (global.ArpaOficios && typeof global.ArpaOficios.getOficioLabel === 'function') {
      return global.ArpaOficios.getOficioLabel(id);
    }
    return id;
  }

  function recogerContextoOt() {
    const oficioId = oficIoActivo();
    const tipo = (document.querySelector('#view-formato input[name="tipo"]:checked') || {}).value || '';
    const ciudad = ($('formato-cliente-ciudad') || {}).value || '';
    let tipos = [];
    if (global.ArpaOficios && typeof global.ArpaOficios.getFormatoCheckedLabels === 'function') {
      tipos = global.ArpaOficios.getFormatoCheckedLabels(oficioId) || [];
    }
    const marcaSel = ($('sel-marca') || {}).value || '';
    const marcaTxt = ($('formato-equipo-marca-text') || {}).value || '';
    const refSel = ($('sel-referencia') || {}).value || '';
    const refMan = ($('ref-manual') || {}).value || '';
    const refGen = ($('formato-equipo-ref-text') || {}).value || '';
    const pesoEl = document.querySelector('#formato-medidas-section .dim-field input');
    const anchoEl = document.querySelector('#formato-medidas-section .dims-table tbody input');
    const obs = [];
    document.querySelectorAll('#formato-section-observaciones .obs-lines input').forEach(function (el) {
      const v = String(el.value || '').trim();
      if (v) obs.push(v);
    });
    return {
      oficioId: oficioId,
      tipo_servicio: tipo,
      tipos_formato: tipos,
      ciudad: String(ciudad).trim(),
      marca: String(marcaTxt || (marcaSel && marcaSel !== 'Otra' ? marcaSel : '')).trim(),
      referencia: String(refGen || refMan || refSel).trim(),
      peso: pesoEl ? String(pesoEl.value || '').trim() : '',
      ancho: anchoEl ? String(anchoEl.value || '').trim() : '',
      observaciones: obs
    };
  }

  function contextoComoTexto(ctx) {
    if (!ctx) return '';
    const lines = [];
    if (ctx.tipo_servicio) lines.push('Tipo de servicio: ' + ctx.tipo_servicio);
    if (ctx.tipos_formato && ctx.tipos_formato.length) lines.push('Tipo / formato: ' + ctx.tipos_formato.join(', '));
    if (ctx.ciudad) lines.push('Ciudad: ' + ctx.ciudad);
    if (ctx.marca) lines.push('Marca: ' + ctx.marca);
    if (ctx.referencia) lines.push('Referencia / modelo: ' + ctx.referencia);
    if (ctx.peso) lines.push('Peso: ' + ctx.peso);
    if (ctx.ancho) lines.push('Ancho: ' + ctx.ancho);
    return lines.join('\n');
  }

  function fillOficios() {
    const sel = $('arpa-ia-tec-oficio');
    if (!sel) return;
    const oficios = global.ArpaOficios && typeof global.ArpaOficios.getOficiosList === 'function'
      ? global.ArpaOficios.getOficiosList()
      : [];
    const current = sel.value;
    sel.innerHTML = oficios.map(function (o) {
      const label = global.ArpaOficios.getOficioLabel
        ? global.ArpaOficios.getOficioLabel(o.id)
        : (global.ArpaIaTecnica && global.ArpaIaTecnica.OFICIO_LABELS[o.id]) || o.id;
      return '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(label) + '</option>';
    }).join('');
    if (current && oficios.some(function (o) { return o.id === current; })) {
      sel.value = current;
    } else if (oficios.length) {
      sel.value = oficios[0].id;
    }
    updatePlaceholder();
  }

  function updatePlaceholder() {
    const sel = $('arpa-ia-tec-oficio');
    const ta = $('arpa-ia-tec-text');
    if (!ta || !sel) return;
    ta.placeholder = PLACEHOLDERS[sel.value] || 'Describa la falla observada. No invente datos.';
  }

  function refreshOtOficio() {
    const el = $('arpa-ia-ot-oficio');
    if (!el) return;
    const id = oficIoActivo();
    el.textContent = 'Oficio de la OT: ' + labelOficio(id);
    const ta = $('arpa-ia-ot-text');
    if (ta && !ta.value) ta.placeholder = PLACEHOLDERS[id] || ta.placeholder;
  }

  function urgenciaClass(nivel) {
    const n = String(nivel || '').toLowerCase();
    if (n === 'critica') return 'is-critica';
    if (n === 'alta') return 'is-alta';
    if (n === 'media') return 'is-media';
    if (n === 'baja') return 'is-baja';
    return 'is-indet';
  }

  function setStatus(prefix, message, kind) {
    const el = $(prefix + '-status');
    if (!el) return;
    const text = String(message || '').trim();
    el.hidden = !text;
    el.textContent = text;
    el.className = 'arpa-ia-tec-status' + (kind ? ' is-' + kind : '');
  }

  function setBusy(prefix, busy) {
    const btn = $(prefix + '-run');
    const again = $(prefix + '-reanalizar');
    const ta = $(prefix + '-text');
    const sel = prefix === 'arpa-ia-tec' ? $('arpa-ia-tec-oficio') : null;
    if (btn) {
      btn.disabled = !!busy;
      btn.textContent = busy ? 'Analizando…' : (prefix === 'arpa-ia-ot' ? 'Analizar diagnóstico' : 'Analizar falla');
    }
    if (again) again.disabled = !!busy;
    if (ta) ta.disabled = !!busy;
    if (sel) sel.disabled = !!busy;
  }

  function renderInto(prefix, result) {
    const box = $(prefix + '-resultado');
    if (!box || !result) return;
    box.hidden = false;

    const oficioEl = $(prefix + '-oficio-usado');
    if (oficioEl) {
      oficioEl.hidden = !result.oficio_id;
      oficioEl.textContent = result.oficio_id
        ? 'Oficio usado: ' + (result.oficio_label || result.oficio_id)
        : '';
    }

    const msg = $(prefix + '-mensaje');
    if (msg) {
      msg.hidden = !result.mensaje;
      msg.textContent = result.mensaje || '';
      msg.className = 'arpa-ia-tec-mensaje' + (result.informacion_insuficiente ? ' is-warn' : '');
    }

    const sintomas = (result.sintomas || []).map(function (s) { return s.texto || s; });
    $(prefix + '-sintomas').innerHTML = listItems(sintomas, 'Ningún síntoma concreto detectado.');

    const datos = $(prefix + '-datos');
    const hechos = result.datos_conocidos || [];
    if (!hechos.length) {
      datos.innerHTML = '<p class="arpa-ia-tec-empty">No se extrajeron datos del texto. No se asumieron valores.</p>';
    } else {
      datos.innerHTML = '<div class="arpa-ia-datos">' + hechos.map(function (h) {
        const origen = h.fuente === 'ot' ? ' (dato de la OT)' : '';
        return (
          '<div class="arpa-ia-dato">' +
            '<span class="arpa-ia-dato-k">' + escapeHtml(h.label) + origen + '</span>' +
            '<span class="arpa-ia-dato-v">' + escapeHtml(h.valor) + '</span>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    $(prefix + '-faltantes').innerHTML = listItems(
      result.datos_faltantes,
      'No se identificaron datos faltantes adicionales.'
    );

    const causas = (result.posibles_causas || []).map(function (c, i) {
      const p = c.prioridad ? ('[' + c.prioridad + '] ') : (i === 0 ? '[1] ' : '');
      return p + (c.texto || c);
    });
    $(prefix + '-causas').innerHTML = listItems(
      causas,
      'No hay hipótesis: falta información o no hay síntomas suficientes. No se afirma un diagnóstico.'
    );

    $(prefix + '-pruebas').innerHTML = listItems(
      result.pruebas_recomendadas,
      'No hay pruebas específicas hasta tener más datos.'
    );
    $(prefix + '-procedimiento').innerHTML = listItems(
      result.procedimiento_sugerido,
      'No hay procedimiento sugerido.'
    );

    const urg = result.urgencia || {};
    const urgEl = $(prefix + '-urgencia');
    if (urgEl) {
      urgEl.className = 'arpa-ia-tec-urgencia ' + urgenciaClass(urg.nivel);
      urgEl.innerHTML = '<strong>' + escapeHtml((urg.nivel || 'indeterminada').toUpperCase()) + '</strong>' +
        (urg.motivo ? '<span>' + escapeHtml(urg.motivo) + '</span>' : '');
    }

    $(prefix + '-seguridad').innerHTML = listItems(
      result.advertencias_seguridad,
      'Sin advertencias adicionales.'
    );

    renderPreguntas(prefix, result.preguntas || []);
  }

  function renderPreguntas(prefix, preguntas) {
    const wrap = $(prefix + '-preguntas-wrap');
    const box = $(prefix + '-preguntas');
    if (!wrap || !box) return;
    const items = Array.isArray(preguntas) ? preguntas.filter(function (p) { return p && (p.pregunta || typeof p === 'string'); }) : [];
    if (!items.length) {
      wrap.hidden = true;
      box.innerHTML = '';
      return;
    }
    wrap.hidden = false;
    box.innerHTML = items.map(function (p, i) {
      const id = escapeHtml(p.id || ('q' + i));
      const q = escapeHtml(p.pregunta || p);
      return (
        '<div class="field arpa-ia-tec-pregunta">' +
          '<label for="' + prefix + '-ans-' + i + '">' + q + '</label>' +
          '<input type="text" id="' + prefix + '-ans-' + i + '" data-pregunta-id="' + id + '" data-pregunta="' + q + '">' +
        '</div>'
      );
    }).join('');
  }

  function leerRespuestas(prefix) {
    const out = {};
    document.querySelectorAll('#' + prefix + '-preguntas input[data-pregunta]').forEach(function (el) {
      const v = String(el.value || '').trim();
      if (!v) return;
      const id = el.getAttribute('data-pregunta-id') || el.getAttribute('data-pregunta');
      out[id] = v;
    });
    return out;
  }

  function otLocked() {
    const root = $('view-formato');
    return !!(root && root.classList.contains('ot-locked'));
  }

  let lastOtResult = null;
  let analisisSeqOt = 0;
  let analisisSeqLab = 0;

  function resetResultado(prefix) {
    const box = $(prefix + '-resultado');
    if (box) box.hidden = true;
    ['sintomas', 'datos', 'faltantes', 'causas', 'pruebas', 'procedimiento', 'seguridad'].forEach(function (k) {
      const el = $(prefix + '-' + k);
      if (el) el.innerHTML = '';
    });
    const urgEl = $(prefix + '-urgencia');
    if (urgEl) {
      urgEl.className = 'arpa-ia-tec-urgencia is-indet';
      urgEl.innerHTML = '';
    }
    const msg = $(prefix + '-mensaje');
    if (msg) {
      msg.hidden = true;
      msg.textContent = '';
    }
    renderPreguntas(prefix, []);
  }

  async function analizar(prefix, oficio, texto, options) {
    const motor = global.ArpaIaTecnica;
    if (!motor) return null;
    const fn = typeof motor.analizarFallaAsync === 'function'
      ? motor.analizarFallaAsync
      : function (t, o) { return Promise.resolve(motor.analizarFalla(t, o)); };
    return fn(texto, oficio, options);
  }

  async function runLab(withAnswers) {
    const ta = $('arpa-ia-tec-text');
    const sel = $('arpa-ia-tec-oficio');
    if (!ta || !sel) return;
    const oficio = sel.value;
    if (!oficio) {
      setStatus('arpa-ia-tec', 'Seleccione un oficio. La IA no lo inventa.', 'warn');
      return;
    }
    const options = {};
    if (withAnswers) options.respuestas = leerRespuestas('arpa-ia-tec');
    else options.respuestas = null;
    const seq = ++analisisSeqLab;
    const textoActual = String(ta.value || '');
    resetResultado('arpa-ia-tec');
    setBusy('arpa-ia-tec', true);
    setStatus('arpa-ia-tec', 'Analizando con motor local y LLM DEV…', 'busy');
    try {
      const result = await analizar('arpa-ia-tec', oficio, textoActual, options);
      if (seq !== analisisSeqLab) return;
      renderInto('arpa-ia-tec', result);
      statusFromResult('arpa-ia-tec', result);
    } catch (err) {
      if (seq !== analisisSeqLab) return;
      setStatus('arpa-ia-tec', 'No fue posible analizar la falla.', 'warn');
    }
    if (seq === analisisSeqLab) setBusy('arpa-ia-tec', false);
  }

  function statusFromResult(prefix, result) {
    if (!result) return;
    const insuf = !!result.informacion_insuficiente;
    const extra = insuf ? ' Hace falta más información.' : ' Causas no confirmadas.';
    if (result.estado_llm === 'ok') setStatus(prefix, 'Análisis listo (LLM DEV + motor local).' + extra, insuf ? 'warn' : 'ok');
    else if (result.estado_llm === 'bloqueado_produccion') setStatus(prefix, 'Se bloqueó un endpoint de producción. Se usó el motor local.', 'warn');
    else if (result.estado_llm === 'error') setStatus(prefix, (result.error_llm && result.error_llm.mensaje) ? result.error_llm.mensaje : 'LLM DEV no respondió. Se usó el motor local.', 'warn');
    else if (insuf) setStatus(prefix, 'Hace falta más información. Responda las preguntas y vuelva a analizar.', 'warn');
    else setStatus(prefix, 'Análisis local listo. LLM desconectado. Causas no confirmadas.', 'ok');
  }

  async function runOt(withAnswers) {
    if (!syncOtPanelVisibility()) return;
    if (otLocked()) {
      setStatus('arpa-ia-ot', 'La orden está cerrada y no se modifica.', 'warn');
      return;
    }
    refreshOtOficio();
    const ta = $('arpa-ia-ot-text');
    if (!ta) return;
    const seq = ++analisisSeqOt;
    lastOtResult = null;
    resetResultado('arpa-ia-ot');
    const ctx = recogerContextoOt();
    const textoActual = String(ta.value || '');
    const options = {
      contextoTexto: contextoComoTexto(ctx)
    };
    if (withAnswers) options.respuestas = leerRespuestas('arpa-ia-ot');
    else options.respuestas = null;
    setBusy('arpa-ia-ot', true);
    setStatus('arpa-ia-ot', 'Analizando con motor local y LLM DEV…', 'busy');
    try {
      const result = await analizar('arpa-ia-ot', ctx.oficioId, textoActual, options);
      if (seq !== analisisSeqOt) return;
      if (result) result.notas_tecnico = textoActual;
      lastOtResult = result ? JSON.parse(JSON.stringify(result)) : null;
      renderInto('arpa-ia-ot', result);
      statusFromResult('arpa-ia-ot', result);
    } catch (err) {
      if (seq !== analisisSeqOt) return;
      setStatus('arpa-ia-ot', 'No fue posible analizar la falla.', 'warn');
    }
    if (seq === analisisSeqOt) setBusy('arpa-ia-ot', false);
  }

  function guardarEnOt() {
    if (otLocked()) {
      setStatus('arpa-ia-ot', 'La orden está cerrada y no se modifica.', 'warn');
      return;
    }
    const motor = global.ArpaIaTecnica;
    if (!lastOtResult || !motor) {
      setStatus('arpa-ia-ot', 'Analice primero para guardar el resultado en la OT.', 'warn');
      return;
    }
    const jsonEl = $('formato-ia-tecnica-json');
    const resumen = $('formato-ia-tecnica-resumen');
    const json = motor.serializarParaOt(lastOtResult);
    if (jsonEl) jsonEl.value = json;
    if (resumen) {
      resumen.hidden = false;
      const causas = (lastOtResult.posibles_causas || []).slice(0, 3).map(function (c) { return c.texto || c; });
      resumen.innerHTML = '<strong>Análisis guardado en esta OT.</strong> Oficio: ' +
        escapeHtml(lastOtResult.oficio_label || lastOtResult.oficio_id) +
        (causas.length ? '. Hipótesis: ' + escapeHtml(causas.join(' / ')) : '.') +
        ' No es un diagnóstico confirmado.';
    }
    if (typeof global.scheduleFormatoDraftSave === 'function') global.scheduleFormatoDraftSave();
    setStatus('arpa-ia-ot', 'Análisis guardado en la Orden de Trabajo.', 'ok');
  }

  function restoreFromOt() {
    syncOtPanelVisibility();
    const jsonEl = $('formato-ia-tecnica-json');
    const motor = global.ArpaIaTecnica;
    if (!jsonEl || !motor || !String(jsonEl.value || '').trim()) return;
    const parsed = motor.parseDesdeOt(jsonEl.value);
    if (!parsed) return;
    const ta = $('arpa-ia-ot-text');
    const actual = ta ? String(ta.value || '').trim() : '';
    const guardado = String(parsed.notas_tecnico || '').trim();
    if (actual && guardado && actual !== guardado) return;
    lastOtResult = parsed;
    if (guardado && ta && !actual) ta.value = parsed.notas_tecnico;
    renderInto('arpa-ia-ot', parsed);
    const resumen = $('formato-ia-tecnica-resumen');
    if (resumen) {
      resumen.hidden = false;
      resumen.innerHTML = '<strong>Análisis recuperado de esta OT.</strong> Oficio: ' +
        escapeHtml(parsed.oficio_label || parsed.oficio_id || '') +
        '. No es un diagnóstico confirmado.';
    }
  }

  function bind() {
    fillOficios();
    refreshOtOficio();
    const sel = $('arpa-ia-tec-oficio');
    const btn = $('arpa-ia-tec-run');
    const labAgain = $('arpa-ia-tec-reanalizar');
    const entry = $('arpa-ia-tec-lab-entry');
    const otBtn = $('arpa-ia-ot-run');
    const otAgain = $('arpa-ia-ot-reanalizar');
    const otSave = $('arpa-ia-ot-guardar');
    if (sel) sel.addEventListener('change', updatePlaceholder);
    if (btn) btn.addEventListener('click', function () { runLab(false); });
    if (labAgain) labAgain.addEventListener('click', function () { runLab(true); });
    if (otBtn) otBtn.addEventListener('click', function () { runOt(false); });
    if (otAgain) otAgain.addEventListener('click', function () { runOt(true); });
    if (otSave) otSave.addEventListener('click', guardarEnOt);
    document.querySelectorAll('#view-formato input[name="tipo"]').forEach(function (radio) {
      radio.addEventListener('change', syncOtPanelVisibility);
    });
    if (entry) {
      entry.addEventListener('click', function () {
        if (global.ArpaViews && typeof global.ArpaViews.openIaTecnicaView === 'function') {
          global.ArpaViews.openIaTecnicaView();
        }
      });
    }
    restoreFromOt();
    syncOtPanelVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  global.ArpaIaTecnicaUi = {
    fillOficios,
    recogerContextoOt,
    contextoComoTexto,
    restoreFromOt,
    guardarEnOt,
    runLab,
    runOt,
    visibleParaTipoServicio,
    syncOtPanelVisibility
  };
})(typeof window !== 'undefined' ? window : globalThis);
