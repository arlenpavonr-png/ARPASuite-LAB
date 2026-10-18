/**
 * Entrada LAB de ARPA IA INTEGRAL.
 * No es un módulo administrativo. Coordina los motores ya existentes.
 */
(function (global) {
  const SUGERENCIAS = [
    'Necesito instalar un motor para una puerta corrediza residencial de 500 kg y 5 metros de ancho en Medellín.',
    'La puerta corrediza no cierra y las fotoceldas están sucias.',
    'Genera el informe técnico de esta reparación.',
    '¿Qué mantenimientos tengo próximos?',
    'Necesito ayuda con el motor.'
  ];

  const MOTOR_LABEL = {
    cotizador: 'ARPA IA Cotizador',
    tecnica: 'ARPA IA Técnica',
    informes: 'ARPA IA Informes',
    copiloto: 'ARPA IA Copiloto',
    comercial: 'ARPA IA Comercial',
    ninguno: 'Ninguno'
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
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function setStatus(text, kind) {
    const el = $('arpa-ia-int-status');
    if (!el) return;
    el.hidden = !text;
    el.className = 'arpa-ia-tec-status' + (kind ? ' is-' + kind : '');
    el.textContent = text || '';
  }

  function setBusy(busy) {
    const btn = $('arpa-ia-int-run');
    if (btn) btn.disabled = !!busy;
  }

  function formatPvp(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '';
    return ' · PVP ' + String(Math.round(n));
  }

  function formatPvpMiles(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function detalleOtrasOpciones(r) {
    const otras = r && Array.isArray(r.otras_opciones) ? r.otras_opciones : [];
    if (!otras.length) return '';
    const items = otras.map(function (o) {
      const kg = o.capacidad_kg != null ? String(o.capacidad_kg) + ' kg' : '—';
      const pvp = formatPvpMiles(o.pvp);
      return '<li>' +
        '<span class="arpa-ia-int-otras-marca">' + escapeHtml(o.marca || '') + '</span>' +
        ' — ' + escapeHtml(o.producto || '') +
        ' — SKU ' + escapeHtml(o.sku || '') +
        ' — Capacidad ' + escapeHtml(kg) +
        (pvp ? ' — PVP ' + escapeHtml(pvp) : '') +
        '</li>';
    }).join('');
    return '<div class="arpa-ia-tec-block arpa-ia-int-otras" id="arpa-ia-int-otras">' +
      '<div class="arpa-ia-sub">OTRAS OPCIONES ELEGIBLES DEL CATÁLOGO</div>' +
      '<p class="arpa-ia-tec-empty">Alternativas del catálogo. No forman parte del Top 12.</p>' +
      '<ul id="arpa-ia-int-otras-list">' + items + '</ul>' +
      '</div>';
  }

  function detalleResultado(r) {
    if (!r || !r.resultado) return '';
    const res = r.resultado;
    if (r.motor === 'cotizador') {
      const list = res.productos_sugeridos || [];
      const n = list.length;
      if (r.aclaracion && !n) return '';
      if (!n) return '<p class="arpa-ia-tec-empty">Sin productos del catálogo para este oficio.</p>';
      const items = list.map(function (p) {
        return '<li>' + escapeHtml((p.codigo || p.cod || '') + ' — ' + (p.nombre || p.nom || '')) +
          escapeHtml(formatPvp(p.precio_catalogo != null ? p.precio_catalogo : p.pvp)) + '</li>';
      }).join('');
      return '<div class="arpa-ia-sub">' + n + ' producto(s) sugerido(s)</div><ul id="arpa-ia-int-cot-list">' + items + '</ul>' +
        detalleOtrasOpciones(r);
    }
    if (r.motor === 'tecnica') {
      const sins = (res.sintomas || []).map(function (s) {
        return '<li>' + escapeHtml(s.texto || s) + '</li>';
      }).join('');
      return (sins ? '<ul>' + sins + '</ul>' : '') +
        (res.urgencia && res.urgencia.nivel ? '<p>Urgencia: ' + escapeHtml(res.urgencia.nivel) + '</p>' : '');
    }
    if (r.motor === 'informes') {
      return '<p>' + escapeHtml(res.titulo || '') + '</p><p>' + escapeHtml(res.resumen_cliente || '') + '</p>';
    }
    if (r.motor === 'copiloto') {
      const items = (res.resultados || []).slice(0, 8).map(function (it) {
        return '<li>' + escapeHtml(it.cliente || it.numero || it.campo || JSON.stringify(it)) +
          (it.valor ? ': ' + escapeHtml(it.valor) : '') + '</li>';
      }).join('');
      return items ? '<ul>' + items + '</ul>' : '';
    }
    if (r.motor === 'comercial') {
      const n = res.resumen && res.resumen.total != null ? res.resumen.total : (res.oportunidades || []).length;
      return '<p>' + n + ' oportunidad(es) de solo lectura.</p>';
    }
    return '';
  }

  function render(r) {
    const box = $('arpa-ia-int-resultado');
    if (!box) return;
    box.hidden = false;
    const ads = (r.advertencias || []).map(function (a) {
      return '<li>' + escapeHtml(a) + '</li>';
    }).join('');
    box.innerHTML =
      '<div class="arpa-ia-cop-meta">Intención: <strong>' + escapeHtml(r.intencion) +
      '</strong> · Motor: <strong>' + escapeHtml(MOTOR_LABEL[r.motor] || r.motor) +
      '</strong> · Oficio: <strong>' + escapeHtml(r.oficio || '—') +
      '</strong></div>' +
      (r.aclaracion ? '<p class="arpa-ia-tec-empty">' + escapeHtml(r.aclaracion) + '</p>' : '') +
      '<div class="arpa-ia-tec-block"><div class="arpa-ia-sub">Resumen</div><p>' +
      escapeHtml(r.resumen || 'NO DISPONIBLE EN LAB') + '</p></div>' +
      detalleResultado(r) +
      (ads ? '<div class="arpa-ia-tec-block arpa-ia-tec-seguridad"><div class="arpa-ia-sub">Advertencias</div><ul>' + ads + '</ul></div>' : '');
  }

  async function run() {
    const api = global.ArpaIaIntegral;
    const ta = $('arpa-ia-int-text');
    const texto = ta ? String(ta.value || '').trim() : '';
    if (!texto) {
      setStatus('Escriba qué necesita. No se ejecutó ninguna acción.', 'warn');
      return;
    }
    if (!api) {
      setStatus('ARPA IA INTEGRAL no está cargada.', 'warn');
      return;
    }
    setBusy(true);
    setStatus('Clasificando y reutilizando el motor correspondiente…', 'busy');
    try {
      const fn = typeof api.ejecutarDesdeArpaSuiteAsync === 'function'
        ? api.ejecutarDesdeArpaSuiteAsync
        : function (t) { return Promise.resolve(api.ejecutar(t, { hoy: hoyIso() })); };
      const res = await fn(texto, { hoy: hoyIso() });
      render(res);
      if (res.intencion === 'desconocida') {
        setStatus('Se necesita una aclaración. No se ejecutó ningún motor.', 'warn');
      } else if (res.aclaracion) {
        setStatus(res.aclaracion, 'warn');
      } else if (!res.datos_disponibles) {
        setStatus('NO DISPONIBLE EN LAB. No se inventaron datos.', 'warn');
      } else {
        setStatus('Resultado del motor ' + (MOTOR_LABEL[res.motor] || res.motor) + '.', 'ok');
      }
    } catch (err) {
      setStatus('No se pudo completar la consulta. No se escribieron datos.', 'warn');
    } finally {
      setBusy(false);
    }
  }

  function fillSugerencias() {
    const wrap = $('arpa-ia-int-sugs');
    if (!wrap || wrap.__arpaIntFilled) return;
    wrap.innerHTML = SUGERENCIAS.map(function (q) {
      return '<button type="button" class="arpa-ia-cop-sug" data-arpa-int-q="' +
        escapeHtml(q) + '">' + escapeHtml(q) + '</button>';
    }).join('');
    wrap.__arpaIntFilled = true;
  }

  function onSugClick(ev) {
    const btn = ev.target && ev.target.closest ? ev.target.closest('[data-arpa-int-q]') : null;
    if (!btn) return;
    const ta = $('arpa-ia-int-text');
    if (ta) ta.value = btn.getAttribute('data-arpa-int-q') || '';
    run();
  }

  function openView() {
    if (global.ArpaViews && typeof global.ArpaViews.openIaIntegralView === 'function') {
      global.ArpaViews.openIaIntegralView();
    } else if (global.ArpaViews && typeof global.ArpaViews.showView === 'function') {
      global.ArpaViews.showView('ia-integral');
    }
    fillSugerencias();
    const ta = $('arpa-ia-int-text');
    if (ta) {
      try { ta.focus(); } catch (e) { /* ignore */ }
    }
  }

  function bind() {
    fillSugerencias();
    const runBtn = $('arpa-ia-int-run');
    const entry = $('arpa-ia-int-lab-entry');
    const sugs = $('arpa-ia-int-sugs');
    const ta = $('arpa-ia-int-text');
    if (runBtn && !runBtn.__arpaIntBound) {
      runBtn.addEventListener('click', run);
      runBtn.__arpaIntBound = true;
    }
    if (entry && !entry.__arpaIntBound) {
      entry.addEventListener('click', openView);
      entry.__arpaIntBound = true;
    }
    if (sugs && !sugs.__arpaIntBound) {
      sugs.addEventListener('click', onSugClick);
      sugs.__arpaIntBound = true;
    }
    if (ta && !ta.__arpaIntBound) {
      ta.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          ev.preventDefault();
          run();
        }
      });
      ta.__arpaIntBound = true;
    }
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  global.ArpaIaIntegralUi = {
    run: run,
    openView: openView
  };
})(typeof window !== 'undefined' ? window : globalThis);
