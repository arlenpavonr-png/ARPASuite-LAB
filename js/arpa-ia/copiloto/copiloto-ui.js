/**
 * Interfaz de ARPA IA COPILOTO.
 * Llama al motor local y, si hay LLM DEV, a la redacción validada. No escribe datos.
 */
(function (global) {
  const SUGERENCIAS = [
    '¿Qué mantenimientos tengo próximos?',
    '¿Qué trabajos tengo hoy?',
    '¿Qué clientes llevan más de 6 meses sin servicio?',
    '¿Qué cotizaciones tengo pendientes?'
  ];

  const INTENCION_LABEL = {
    trabajos_hoy: 'Trabajos de hoy',
    trabajos_periodo: 'Trabajos del período',
    mantenimientos_proximos: 'Mantenimientos próximos',
    mantenimientos_vencidos: 'Mantenimientos vencidos',
    clientes_sin_seguimiento: 'Clientes sin seguimiento',
    cotizaciones_pendientes: 'Cotizaciones pendientes',
    cotizaciones_cerradas: 'Cotizaciones cerradas',
    cuentas_cobro_pendientes: 'Cuentas de cobro',
    cliente_historial: 'Historial del cliente',
    resumen_ventas: 'Resumen de ventas',
    desconocida: 'No reconocida'
  };

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

  function hoyIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function setStatus(text, kind) {
    const el = $('arpa-ia-cop-status');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'arpa-ia-tec-status' + (kind ? ' is-' + kind : '');
  }

  function setBusy(busy) {
    const btn = $('arpa-ia-cop-run');
    const ta = $('arpa-ia-cop-text');
    if (btn) {
      btn.disabled = !!busy;
      btn.textContent = busy ? 'Consultando…' : 'Consultar';
    }
    if (ta) ta.disabled = !!busy;
    document.querySelectorAll('.arpa-ia-cop-sug').forEach(function (b) {
      b.disabled = !!busy;
    });
  }

  function campo(label, valor) {
    if (valor == null || valor === '') return '';
    return '<div class="arpa-ia-com-row"><span class="arpa-ia-com-k">' +
      escapeHtml(label) + ':</span> ' + escapeHtml(String(valor)) + '</div>';
  }

  function renderItem(item) {
    if (!item || typeof item !== 'object') return '';
    return '<div class="arpa-ia-com-card is-baja">' +
      campo('Cliente', item.cliente) +
      campo('Número', item.numero) +
      campo('Fecha', item.fecha) +
      campo('Próximo', item.fecha_proxima) +
      campo('Tipo', item.tipo) +
      campo('Estado', item.estado) +
      campo('Concepto', item.concepto) +
      (item.dias_sin_servicio != null ? campo('Días sin servicio', item.dias_sin_servicio) : '') +
      (item.total != null ? campo('Total registrado', item.total) : '') +
      '</div>';
  }

  function renderRespuesta(res) {
    const box = $('arpa-ia-cop-resultado');
    if (!box) return;
    const r = res && typeof res === 'object' ? res : {};
    const noDisp = !r.datos_disponibles || r.resumen === 'NO DISPONIBLE EN LAB';
    const items = Array.isArray(r.resultados) ? r.resultados : [];
    const warns = Array.isArray(r.advertencias) ? r.advertencias : [];
    const intencion = INTENCION_LABEL[r.intencion] || r.intencion || '';
    let html = '';
    html += '<div class="arpa-ia-cop-meta">Fuente: ' + escapeHtml(r.fuente || 'local') +
      (intencion ? ' · ' + escapeHtml(intencion) : '') +
      (r.oficio ? ' · Oficio: ' + escapeHtml(r.oficio) : '') +
      '</div>';
    if (noDisp) {
      html += '<div class="arpa-ia-tec-block arpa-ia-tec-faltantes-box arpa-ia-cop-nodisp">' +
        '<div class="arpa-ia-sub">NO DISPONIBLE EN LAB</div>' +
        '<p class="arpa-ia-tec-empty">' + escapeHtml(r.resumen || 'NO DISPONIBLE EN LAB') + '</p>' +
        '</div>';
    } else {
      html += '<div class="arpa-ia-tec-mensaje">' + escapeHtml(r.resumen || '') + '</div>';
      if (items.length) {
        html += '<div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Resultados</div>' +
          items.map(renderItem).join('') + '</div>';
      }
    }
    if (warns.length) {
      html += '<div class="arpa-ia-tec-block arpa-ia-tec-faltantes-box"><div class="arpa-ia-sub">Advertencias</div><ul>' +
        warns.map(function (w) { return '<li>' + escapeHtml(w) + '</li>'; }).join('') +
        '</ul></div>';
    }
    box.hidden = false;
    box.innerHTML = html;
  }

  function consultarPregunta(pregunta) {
    const api = global.ArpaIaCopiloto;
    if (!api || typeof api.consultarDesdeArpaSuite !== 'function') {
      return Promise.resolve({
        ok: true,
        intencion: 'desconocida',
        datos_disponibles: false,
        resultados: [],
        resumen: 'NO DISPONIBLE EN LAB',
        advertencias: ['El motor del Copiloto no está cargado.'],
        fuente: 'local'
      });
    }
    const extra = { hoy: hoyIso() };
    if (typeof api.consultarDesdeArpaSuiteAsync === 'function') {
      return api.consultarDesdeArpaSuiteAsync(pregunta, extra);
    }
    return Promise.resolve(api.consultarDesdeArpaSuite(pregunta, extra));
  }

  function pintarResultado(res) {
    renderRespuesta(res);
    if (!res.datos_disponibles || res.resumen === 'NO DISPONIBLE EN LAB') {
      setStatus('NO DISPONIBLE EN LAB. El Copiloto no inventa datos.', 'warn');
    } else {
      setStatus('Respuesta del motor local. Solo lectura.', 'ok');
    }
    setBusy(false);
  }

  function run() {
    const ta = $('arpa-ia-cop-text');
    const pregunta = ta ? String(ta.value || '').trim() : '';
    if (!pregunta) {
      setStatus('Escriba una pregunta para consultar.', 'warn');
      return;
    }
    setBusy(true);
    setStatus('Consultando el historial y los clientes ya guardados…', 'busy');
    const box = $('arpa-ia-cop-resultado');
    if (box) box.hidden = true;
    global.setTimeout(function () {
      Promise.resolve(consultarPregunta(pregunta)).then(function (res) {
        pintarResultado(res && typeof res === 'object' ? res : {});
      }).catch(function () {
        const api = global.ArpaIaCopiloto;
        const fallback = api && typeof api.consultarDesdeArpaSuite === 'function'
          ? api.consultarDesdeArpaSuite(pregunta, { hoy: hoyIso() })
          : { resumen: 'NO DISPONIBLE EN LAB', datos_disponibles: false, resultados: [], advertencias: [] };
        pintarResultado(fallback);
      });
    }, 40);
  }

  function fillSugerencias() {
    const wrap = $('arpa-ia-cop-sugs');
    if (!wrap || wrap.__arpaCopFilled) return;
    wrap.innerHTML = SUGERENCIAS.map(function (q) {
      return '<button type="button" class="arpa-ia-cop-sug" data-arpa-cop-q="' +
        escapeHtml(q) + '">' + escapeHtml(q) + '</button>';
    }).join('');
    wrap.__arpaCopFilled = true;
  }

  function onSugClick(ev) {
    const btn = ev.target && ev.target.closest ? ev.target.closest('.arpa-ia-cop-sug') : null;
    if (!btn) return;
    const q = btn.getAttribute('data-arpa-cop-q') || '';
    const ta = $('arpa-ia-cop-text');
    if (ta) ta.value = q;
    run();
  }

  function openView() {
    if (global.ArpaViews && typeof global.ArpaViews.openIaCopilotoView === 'function') {
      global.ArpaViews.openIaCopilotoView();
    } else if (global.ArpaViews && typeof global.ArpaViews.showView === 'function') {
      global.ArpaViews.showView('ia-copiloto');
    } else if (typeof global.openIaCopilotoView === 'function') {
      global.openIaCopilotoView();
    }
    fillSugerencias();
    const ta = $('arpa-ia-cop-text');
    if (ta) {
      try { ta.focus(); } catch (e) { /* ignore */ }
    }
  }

  function bind() {
    fillSugerencias();
    const runBtn = $('arpa-ia-cop-run');
    const entry = $('arpa-ia-cop-lab-entry');
    const sugs = $('arpa-ia-cop-sugs');
    const ta = $('arpa-ia-cop-text');
    if (runBtn && !runBtn.__arpaCopBound) {
      runBtn.addEventListener('click', run);
      runBtn.__arpaCopBound = true;
    }
    if (entry && !entry.__arpaCopBound) {
      entry.addEventListener('click', openView);
      entry.__arpaCopBound = true;
    }
    if (sugs && !sugs.__arpaCopBound) {
      sugs.addEventListener('click', onSugClick);
      sugs.__arpaCopBound = true;
    }
    if (ta && !ta.__arpaCopBound) {
      ta.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          run();
        }
      });
      ta.__arpaCopBound = true;
    }
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  global.ArpaIaCopilotoUi = {
    run: run,
    openView: openView
  };
})(typeof window !== 'undefined' ? window : globalThis);
