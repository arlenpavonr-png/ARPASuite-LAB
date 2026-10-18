/**
 * Panel compacto de ARPA IA COMERCIAL en Historial.
 * Lee datos existentes. No inventa. No envía WhatsApp. No usa LLM.
 */
(function (global) {
  const TIPO_LABEL = {
    mantenimiento_proximo: 'Mantenimiento próximo',
    mantenimiento_vencido: 'Mantenimiento vencido',
    seguimiento_cliente: 'Seguimiento de cliente',
    cotizacion_sin_cierre: 'Cotización sin cierre',
    oportunidad_recurrente: 'Oportunidad recurrente'
  };

  const MSG_SIN_OPORTUNIDADES = 'IA Comercial no detectó oportunidades pendientes.';
  const MSG_FALTA_FECHA = 'No se puede calcular mantenimiento: falta fecha de referencia.';

  let ultimoResultado = null;
  let filtroPrioridad = '';

  function $(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function iconoPrioridad(prio) {
    if (prio === 'ALTA') return '🔴';
    if (prio === 'MEDIA') return '🟡';
    return '🔵';
  }

  function fechaRelevante(op) {
    if (!op) return '';
    return op.fecha_proxima || op.fecha_referencia || '';
  }

  function hayFechaFaltante(faltantes) {
    return (faltantes || []).some(function (f) {
      return f && Array.isArray(f.faltan) && f.faltan.indexOf('fecha') >= 0;
    });
  }

  function renderResumenHtml(resumen, filtro) {
    const r = resumen && typeof resumen === 'object' ? resumen : {};
    const pri = r.por_prioridad || {};
    const tipos = r.por_tipo || {};
    const chips = [];
    chips.push('<button type="button" class="arpa-ia-com-chip' + (!filtro ? ' is-on' : '') + '" data-arpa-com-filtro="">Todas ' + (r.total || 0) + '</button>');
    ['ALTA', 'MEDIA', 'BAJA'].forEach(function (p) {
      const n = pri[p] || 0;
      chips.push('<button type="button" class="arpa-ia-com-chip' + (filtro === p ? ' is-on' : '') + '" data-arpa-com-filtro="' + p + '">' + p + ' ' + n + '</button>');
    });
    const tipoBits = Object.keys(tipos).map(function (t) {
      return escapeHtml(TIPO_LABEL[t] || t) + ': ' + tipos[t];
    });
    return '<div class="arpa-ia-com-resumen">' + chips.join('') +
      (tipoBits.length ? '<div class="arpa-ia-com-resumen-tipos">' + tipoBits.join(' · ') + '</div>' : '') +
      '</div>';
  }

  function renderFaltantesHtml(faltantes) {
    const list = (faltantes || []).filter(function (f) {
      return f && (f.detalle || (f.faltan && f.faltan.length));
    });
    if (!list.length) return '';
    const items = list.map(function (f) {
      return '<li>' + escapeHtml(f.detalle || ('Falta: ' + (f.faltan || []).join(', '))) + '</li>';
    });
    return '<div class="arpa-ia-tec-block arpa-ia-tec-faltantes-box"><div class="arpa-ia-sub">Datos faltantes</div><ul>' + items.join('') + '</ul></div>';
  }

  function renderOportunidadHtml(op) {
    const tipo = TIPO_LABEL[op.tipo] || op.tipo || '';
    const prio = op.prioridad || '';
    const prioClass = prio === 'ALTA' ? 'is-alta' : (prio === 'MEDIA' ? 'is-media' : 'is-baja');
    const fecha = fechaRelevante(op);
    const rows = [];
    if (op.cliente) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Cliente:</span> ' + escapeHtml(op.cliente) + '</div>');
    }
    if (op.servicio_relacionado) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Servicio:</span> ' + escapeHtml(op.servicio_relacionado) + '</div>');
    }
    if (op.motivo) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Motivo:</span> ' + escapeHtml(op.motivo) + '</div>');
    }
    if (fecha) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Fecha:</span> ' + escapeHtml(fecha) + '</div>');
    }
    if (prio) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Prioridad:</span> ' + escapeHtml(prio) + '</div>');
    }
    if (op.accion_sugerida) {
      rows.push('<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">Acción:</span> ' + escapeHtml(op.accion_sugerida) + '</div>');
    }
    const ver = op.id
      ? '<button type="button" class="btn-arpa-ia-use arpa-ia-com-ver" data-arpa-com-id="' + escapeHtml(op.id) + '">Ver en historial</button>'
      : '';
    return '<div class="arpa-ia-com-card ' + prioClass + '" data-prioridad="' + escapeHtml(prio) + '" data-tipo="' + escapeHtml(op.tipo || '') + '">' +
      '<div class="arpa-ia-com-tipo">' + iconoPrioridad(prio) + ' ' + escapeHtml(tipo) + '</div>' +
      rows.join('') + ver +
      '</div>';
  }

  function renderHtml(resultado, filtro) {
    const res = resultado && typeof resultado === 'object' ? resultado : {};
    const opsAll = Array.isArray(res.oportunidades) ? res.oportunidades : [];
    const filtroOn = filtro || '';
    const ops = filtroOn
      ? opsAll.filter(function (o) { return o.prioridad === filtroOn; })
      : opsAll;
    const faltantes = Array.isArray(res.faltantes) ? res.faltantes : [];
    const notas = [];
    if (!opsAll.length) notas.push(MSG_SIN_OPORTUNIDADES);
    if (hayFechaFaltante(faltantes)) notas.push(MSG_FALTA_FECHA);
    const body = (ops.length ? ops.map(renderOportunidadHtml).join('') : '') +
      (notas.length ? '<p class="arpa-ia-tec-empty">' + notas.map(escapeHtml).join('<br>') + '</p>' : '') +
      renderFaltantesHtml(faltantes);
    return {
      empty: !opsAll.length,
      notas: notas,
      html: (opsAll.length ? renderResumenHtml(res.resumen, filtroOn) : '') + body
    };
  }

  function localizarEnHistorial(id) {
    if (!id || !global.document) return false;
    const safe = String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const btn = global.document.querySelector('[onclick*="verDocumento(\'' + safe + '\')"]');
    const card = btn && btn.closest ? btn.closest('.historial-card') : null;
    if (!card) return false;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('arpa-ia-com-loc');
    setTimeout(function () { card.classList.remove('arpa-ia-com-loc'); }, 1800);
    return true;
  }

  function pintar(resultado) {
    ultimoResultado = resultado;
    const box = $('arpa-ia-com-resultado');
    const status = $('arpa-ia-com-status');
    if (!box) return renderHtml(resultado, filtroPrioridad);
    const painted = renderHtml(resultado, filtroPrioridad);
    box.innerHTML = painted.html;
    box.hidden = false;
    if (status) {
      const n = (resultado && resultado.oportunidades) ? resultado.oportunidades.length : 0;
      status.hidden = false;
      status.className = 'arpa-ia-tec-status ' + (n ? 'is-ok' : 'is-warn');
      status.textContent = n
        ? (n + (n === 1 ? ' oportunidad detectada en el historial existente.' : ' oportunidades detectadas en el historial existente.'))
        : MSG_SIN_OPORTUNIDADES;
    }
    return painted;
  }

  function cotDraftExistente() {
    try {
      const raw = global.localStorage && global.localStorage.getItem('arpa_cot_draft');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function analizar(entrada) {
    const api = global.ArpaIaComercial;
    if (!api || typeof api.analizar !== 'function') {
      return pintar({
        ok: false,
        oportunidades: [],
        faltantes: [{ cliente: '', faltan: ['motor'], detalle: 'El motor de IA Comercial no está cargado.' }],
        resumen: { total: 0, por_tipo: {}, por_prioridad: { ALTA: 0, MEDIA: 0, BAJA: 0 } }
      });
    }
    return pintar(api.analizar(entrada || {}));
  }

  function refresh() {
    const api = global.ArpaIaComercial;
    if (!api || typeof api.analizarDesdeArpaSuite !== 'function') {
      return analizar({});
    }
    const extra = {};
    const draft = cotDraftExistente();
    if (draft) extra.cotDraft = draft;
    return pintar(api.analizarDesdeArpaSuite(extra));
  }

  function onResultadoClick(ev) {
    const t = ev && ev.target;
    if (!t || !t.closest) return;
    const chip = t.closest('[data-arpa-com-filtro]');
    if (chip && ultimoResultado) {
      filtroPrioridad = chip.getAttribute('data-arpa-com-filtro') || '';
      pintar(ultimoResultado);
      return;
    }
    const ver = t.closest('[data-arpa-com-id]');
    if (ver) localizarEnHistorial(ver.getAttribute('data-arpa-com-id'));
  }

  function init() {
    const btn = $('arpa-ia-com-run');
    if (btn && !btn.__arpaComBound) {
      btn.addEventListener('click', function () { refresh(); });
      btn.__arpaComBound = true;
    }
    const box = $('arpa-ia-com-resultado');
    if (box && !box.__arpaComBound) {
      box.addEventListener('click', onResultadoClick);
      box.__arpaComBound = true;
    }
    const view = $('view-historial');
    if (view && !view.hidden) refresh();
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  global.ArpaIaComercialUi = {
    analizar: analizar,
    refresh: refresh,
    renderHtml: renderHtml,
    localizarEnHistorial: localizarEnHistorial,
    TIPO_LABEL: TIPO_LABEL,
    MSG_SIN_OPORTUNIDADES: MSG_SIN_OPORTUNIDADES,
    MSG_FALTA_FECHA: MSG_FALTA_FECHA
  };
})(typeof window !== 'undefined' ? window : globalThis);
