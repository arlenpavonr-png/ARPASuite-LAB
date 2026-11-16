/**
 * Módulo: "Pegar pedido" en Cotización.
 *
 * Un asistente de IA (Gemini, Claude o cualquiera) o el mismo usuario escribe un
 * bloque de texto con formato fijo y la app llena la cotización sola, con los
 * productos y precios del catálogo del usuario. No llama a ningún servidor:
 * todo pasa en el teléfono. El usuario revisa y genera el PDF como siempre.
 *
 * Formato (las mayúsculas y tildes de las etiquetas no importan):
 *
 *   #PEDIDO-ARPA
 *   CLIENTE: Edificio Torre Picasso - Atn. Sra. Patricia Serna
 *   NIT:
 *   TELEFONO:
 *   CORREO:
 *   CIUDAD: Medellín
 *   PRODUCTO: K1LUXGV2B-1 | 1
 *   PRODUCTO: K1LUX2B-1 | 2 | 3800000      (el tercer dato, opcional, cambia el precio)
 *   COBRO: Instalación brazo hidráulico | 650000
 *   COBRO: Visita técnica | 1 | 85000        (con cantidad, opcional)
 *   OBS: El kit incluye dos controles remotos.
 *   #FIN
 */
(function (global) {
  const ETIQUETAS = {
    cliente: ['cliente', 'nombre', 'empresa', 'customer', 'client', 'name'],
    nit: ['nit', 'cedula', 'cc', 'documento', 'rfc', 'tax id', 'id'],
    tel: ['telefono', 'tel', 'celular', 'whatsapp', 'phone'],
    email: ['correo', 'email', 'e-mail', 'mail'],
    ciudad: ['ciudad', 'city', 'municipio'],
    producto: ['producto', 'product', 'item', 'equipo'],
    cobro: ['cobro', 'servicio', 'mano de obra', 'charge', 'service', 'labor'],
    obs: ['obs', 'observaciones', 'observacion', 'nota', 'notas', 'notes', 'note'],
  };

  function norm(str) {
    return String(str == null ? '' : str)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function etiquetaDe(raw) {
    const k = norm(raw).replace(/[*_]/g, '').trim();
    const keys = Object.keys(ETIQUETAS);
    for (let i = 0; i < keys.length; i++) {
      if (ETIQUETAS[keys[i]].indexOf(k) !== -1) return keys[i];
    }
    return '';
  }

  /** "650.000", "$ 650,000", "650000", "650 mil", "1,5 millones" → número; '' o inválido → null */
  function parseMonto(raw) {
    let s = norm(raw).replace(/\$|cop|usd|mxn|pesos?/g, '').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    let mult = 1;
    const m = s.match(/^(.*?)\s*(mil|k|millones|millon|m)$/);
    if (m) {
      s = m[1].trim();
      mult = (m[2] === 'mil' || m[2] === 'k') ? 1000 : 1000000;
    }
    s = s.replace(/\s/g, '');
    let n;
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) {
      n = Number(s.replace(/[.,]/g, ''));
    } else if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
      n = Number(s.replace(/\./g, '').replace(',', '.'));
    } else if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) {
      n = Number(s.replace(/,/g, ''));
    } else if (/^\d+([.,]\d+)?$/.test(s)) {
      n = Number(s.replace(',', '.'));
    } else {
      return null;
    }
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * mult * 100) / 100;
  }

  function parseCantidad(raw) {
    const s = norm(raw).replace(/^x\s*/, '').replace(/\s*(und|unidades|unidad|u|pcs|uds)\.?$/, '').trim();
    if (!s) return null;
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function partes(valor) {
    return String(valor).split('|').map(function (p) { return p.trim(); });
  }

  /**
   * Lee el texto y devuelve { datos, productos, cobros, obs, avisos, esPedido }.
   * No toca la página.
   */
  function parsePedido(texto) {
    const out = {
      esPedido: false,
      datos: { cliente: '', nit: '', tel: '', email: '', ciudad: '' },
      productos: [],
      cobros: [],
      obs: '',
      avisos: [],
    };
    const lineas = String(texto || '').replace(/\r/g, '').split('\n');
    let obsAbierta = false;
    lineas.forEach(function (lineaRaw, i) {
      let linea = lineaRaw.replace(/^\s*(```\w*|[-*•>]+\s+|\d+[.)]\s+)/, '').replace(/\*\*/g, '').trim();
      if (!linea || /^```/.test(linea)) return;
      if (/^#\s*pedido/i.test(linea)) { out.esPedido = true; obsAbierta = false; return; }
      if (/^#\s*fin/i.test(linea)) { obsAbierta = false; return; }
      const m = linea.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ_ .\-]{2,20}?)\s*[:=]\s*(.*)$/);
      const tipo = m ? etiquetaDe(m[1]) : '';
      if (!tipo) {
        if (obsAbierta) out.obs += (out.obs ? '\n' : '') + linea;
        else out.avisos.push('Línea ' + (i + 1) + ' no reconocida: "' + linea.slice(0, 60) + '"');
        return;
      }
      out.esPedido = true;
      obsAbierta = false;
      const valor = m[2].trim();
      if (tipo === 'producto') {
        const p = partes(valor);
        if (!p[0]) return;
        const cant = p.length > 1 && p[1] !== '' ? parseCantidad(p[1]) : 1;
        const precio = p.length > 2 && p[2] !== '' ? parseMonto(p[2]) : null;
        if (cant == null) out.avisos.push('Cantidad no válida en "' + valor + '": se usa 1.');
        out.productos.push({ ref: p[0], cant: cant == null ? 1 : cant, precio: precio });
      } else if (tipo === 'cobro') {
        const p = partes(valor);
        if (!p[0]) return;
        let cant = 1;
        let monto;
        if (p.length >= 3) {
          cant = parseCantidad(p[1]) || 1;
          monto = parseMonto(p[2]);
        } else {
          monto = p.length > 1 ? parseMonto(p[1]) : null;
        }
        if (monto == null) out.avisos.push('El cobro "' + p[0] + '" no trae valor: queda en 0 para que lo pongas.');
        out.cobros.push({ desc: p[0], cant: cant, valor: monto == null ? 0 : monto });
      } else if (tipo === 'obs') {
        out.obs += (out.obs ? '\n' : '') + valor;
        obsAbierta = true;
      } else {
        out.datos[tipo] = valor;
      }
    });
    return out;
  }

  /**
   * Busca cada producto en el catálogo: primero por código exacto, luego por
   * nombre (todas las palabras deben estar). Devuelve { encontrados, faltantes }.
   */
  function matchProductos(productos, catalogo) {
    const lista = Array.isArray(catalogo) ? catalogo : [];
    const porCod = new Map();
    lista.forEach(function (p) { porCod.set(norm(p.cod), p); });
    const encontrados = [];
    const faltantes = [];
    productos.forEach(function (item) {
      const ref = norm(item.ref);
      let prod = porCod.get(ref) || null;
      let sugerencias = [];
      if (!prod) {
        const palabras = ref.split(/[\s,/]+/).filter(function (w) { return w.length > 1; });
        const candidatos = palabras.length ? lista.filter(function (p) {
          const hay = norm(p.cod + ' ' + p.nom);
          return palabras.every(function (w) { return hay.indexOf(w) !== -1; });
        }) : [];
        if (candidatos.length === 1) prod = candidatos[0];
        else sugerencias = candidatos.slice(0, 3);
      }
      if (prod) encontrados.push({ prod: prod, cant: item.cant, precio: item.precio, ref: item.ref });
      else faltantes.push({ ref: item.ref, cant: item.cant, sugerencias: sugerencias });
    });
    return { encontrados: encontrados, faltantes: faltantes };
  }

  // ───────────────────────── Página ─────────────────────────

  function esIngles() {
    return (global.ArpaI18n?.getLang?.() || 'es') === 'en';
  }

  function t(es, en) {
    return esIngles() ? en : es;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fechaISO(d) {
    if (typeof global.fechaLocalISO === 'function') return global.fechaLocalISO(d);
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function precioCatalogo(prod) {
    const seed = global.ArpaCatalogo?.getSeedCop?.(prod.cod);
    let v;
    if (typeof global.ArpaPricing?.resolveDisplayPvp === 'function') {
      v = global.ArpaPricing.resolveDisplayPvp(prod, seed || undefined);
    } else {
      v = prod.pvp;
    }
    const n = Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function cotizacionTieneDatos() {
    const filas = global.ArpaCotizacion?.getFilas?.() || [];
    const nombre = document.getElementById('cot-nombre')?.value.trim();
    return !!(nombre || filas.length);
  }

  /** Llena la cotización. Devuelve el resumen para mostrar. */
  async function aplicarPedido(texto) {
    const cot = global.ArpaCotizacion;
    if (!cot) throw new Error('Cotización no disponible');
    const pedido = parsePedido(texto);
    if (!pedido.esPedido) {
      return { ok: false, mensaje: t('No encontré un pedido en el texto. Debe traer líneas como "CLIENTE:" y "PRODUCTO:".', 'No order found. It needs lines like "CLIENTE:" and "PRODUCTO:".') };
    }
    const match = matchProductos(pedido.productos, cot.getCatalogoActivo());

    const numField = document.getElementById('numero-cot');
    const habiaOtra = cotizacionTieneDatos() && !!numField?.value.trim();
    const numeroActual = habiaOtra ? '' : (numField?.value.trim() || '');

    const hoy = new Date();
    cot.loadCotizacion({
      numero: numeroActual,
      cliente: pedido.datos.cliente,
      ciudad: pedido.datos.ciudad,
      fecha: fechaISO(hoy),
      nit: pedido.datos.nit,
      tel: pedido.datos.tel,
      email: pedido.datos.email,
      filas: match.encontrados.map(function (e) {
        return {
          cod: e.prod.cod,
          nom: e.prod.nom,
          pvp: e.precio != null ? e.precio : precioCatalogo(e.prod),
          cant: e.cant,
          tipo: 'producto',
        };
      }),
    });

    const validez = document.getElementById('cot-validez');
    if (validez) validez.value = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15));
    const obs = document.getElementById('cot-obs');
    if (obs) obs.value = pedido.obs;

    // Cobros: los del pedido reemplazan a los precargados. userEdited evita que el
    // valor se cambie por el de la lista de precios cuando la descripción coincide.
    const lineasCobro = [];
    pedido.cobros.forEach(function (c) {
      for (let i = 0; i < Math.max(1, Math.round(c.cant)); i++) {
        lineasCobro.push({ desc: c.desc, value: c.valor, userEdited: true });
      }
    });
    global.ArpaCobros?.setLines?.('cot', lineasCobro, { keepSeeded: true });

    cot.renderTablaCot?.();
    cot.recalcularCotizacion?.();
    if (habiaOtra && typeof cot.nuevoCotNumero === 'function') {
      try { await cot.nuevoCotNumero(); } catch (e) { /* se asigna al guardar */ }
    }
    cot.scheduleCotDraftSave?.();

    return { ok: true, pedido: pedido, match: match, nuevoNumero: habiaOtra };
  }

  function resumenHtml(r) {
    if (!r.ok) return '<p class="pp-error">' + escapeHtml(r.mensaje) + '</p>';
    let html = '<p class="pp-ok">✅ ' + t('Cotización llenada. Revísala antes de generar el PDF.', 'Quote filled. Review it before creating the PDF.') + '</p><ul>';
    r.match.encontrados.forEach(function (e) {
      html += '<li>✔ ' + escapeHtml(e.cant + ' × ' + e.prod.cod + ' – ' + e.prod.nom) + '</li>';
    });
    r.pedido.cobros.forEach(function (c) {
      html += '<li>✔ ' + escapeHtml((c.cant !== 1 ? c.cant + ' × ' : '') + c.desc) + '</li>';
    });
    html += '</ul>';
    if (r.match.faltantes.length) {
      html += '<p class="pp-error">⚠️ ' + t('No encontré en tu catálogo (agrégalos a mano):', 'Not found in your catalog (add them by hand):') + '</p><ul>';
      r.match.faltantes.forEach(function (f) {
        let s = escapeHtml(f.cant + ' × ' + f.ref);
        if (f.sugerencias.length) {
          s += '<br><small>' + t('¿Será: ', 'Maybe: ') + escapeHtml(f.sugerencias.map(function (p) { return p.cod; }).join(', ')) + '?</small>';
        }
        html += '<li>' + s + '</li>';
      });
      html += '</ul>';
    }
    if (r.pedido.avisos.length) {
      html += '<details><summary>' + t('Avisos', 'Notes') + ' (' + r.pedido.avisos.length + ')</summary><ul>';
      r.pedido.avisos.forEach(function (a) { html += '<li>' + escapeHtml(a) + '</li>'; });
      html += '</ul></details>';
    }
    return html;
  }

  function cerrarModal() {
    document.getElementById('pp-modal')?.remove();
  }

  function abrirModal() {
    cerrarModal();
    const wrap = document.createElement('div');
    wrap.id = 'pp-modal';
    wrap.className = 'no-print';
    wrap.innerHTML =
      '<div class="pp-fondo"></div>' +
      '<div class="pp-caja" role="dialog" aria-modal="true" aria-labelledby="pp-titulo">' +
        '<h3 id="pp-titulo">📋 ' + t('Pegar pedido', 'Paste order') + '</h3>' +
        '<p class="pp-ayuda">' + t('Pega aquí el pedido que te armó tu asistente (Gemini, Claude…). La app llena la cotización con tus precios.', 'Paste the order your assistant wrote. The app fills the quote with your prices.') + '</p>' +
        '<textarea id="pp-texto" rows="9" placeholder="#PEDIDO-ARPA&#10;CLIENTE: ...&#10;CIUDAD: ...&#10;PRODUCTO: CODIGO | 1&#10;COBRO: Instalación | 650000&#10;OBS: ...&#10;#FIN"></textarea>' +
        '<div class="pp-botones">' +
          '<button type="button" id="pp-portapapeles" class="pp-sec">' + t('Pegar del portapapeles', 'Paste from clipboard') + '</button>' +
          '<button type="button" id="pp-llenar" class="pp-pri">' + t('Llenar cotización', 'Fill quote') + '</button>' +
        '</div>' +
        '<div id="pp-resultado" aria-live="polite"></div>' +
        '<button type="button" id="pp-cerrar" class="pp-cerrar" aria-label="' + t('Cerrar', 'Close') + '">✕</button>' +
      '</div>';
    document.body.appendChild(wrap);
    const area = document.getElementById('pp-texto');
    wrap.querySelector('.pp-fondo').addEventListener('click', cerrarModal);
    document.getElementById('pp-cerrar').addEventListener('click', cerrarModal);
    document.getElementById('pp-portapapeles').addEventListener('click', async function () {
      try {
        area.value = await navigator.clipboard.readText();
      } catch (e) {
        area.focus();
        document.getElementById('pp-resultado').innerHTML = '<p class="pp-error">' + escapeHtml(t('No pude leer el portapapeles: mantén presionado el cuadro y elige Pegar.', 'Could not read the clipboard: long-press the box and choose Paste.')) + '</p>';
      }
    });
    document.getElementById('pp-llenar').addEventListener('click', async function () {
      const res = document.getElementById('pp-resultado');
      const texto = area.value;
      if (!texto.trim()) { area.focus(); return; }
      if (cotizacionTieneDatos() && !global.confirm(t('Ya hay una cotización en pantalla. ¿Empezar una nueva con este pedido? (la actual sigue guardada en el Historial si ya la guardaste)', 'There is a quote on screen. Start a new one with this order?'))) {
        return;
      }
      try {
        const r = await aplicarPedido(texto);
        res.innerHTML = resumenHtml(r);
        if (r.ok) {
          // Clonar quita el listener de "Llenar": el botón pasa a cerrar y mostrar la cotización.
          const viejo = document.getElementById('pp-llenar');
          const btn = viejo.cloneNode(false);
          btn.textContent = t('Ver cotización', 'See quote');
          btn.addEventListener('click', function () { cerrarModal(); window.scrollTo(0, 0); });
          viejo.replaceWith(btn);
        }
      } catch (e) {
        res.innerHTML = '<p class="pp-error">' + escapeHtml(t('No se pudo llenar la cotización: ', 'Could not fill the quote: ') + (e && e.message)) + '</p>';
      }
    });
    setTimeout(function () { area.focus(); }, 50);
  }

  function inyectarEstilos() {
    if (document.getElementById('pp-estilos')) return;
    const st = document.createElement('style');
    st.id = 'pp-estilos';
    st.textContent =
      '.pp-boton{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:0 0 14px;padding:12px;border:2px dashed var(--gold,#d97706);border-radius:10px;background:transparent;color:var(--gold,#d97706);font-weight:700;font-size:14px;cursor:pointer}' +
      '#pp-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '#pp-modal .pp-fondo{position:absolute;inset:0;background:rgba(0,0,0,.55)}' +
      '#pp-modal .pp-caja{position:relative;width:100%;max-width:520px;max-height:90vh;overflow:auto;background:#fff;color:#1e293b;border-radius:14px;padding:18px 16px 16px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
      '#pp-modal h3{margin:0 0 6px;font-size:17px}' +
      '#pp-modal .pp-ayuda{margin:0 0 10px;font-size:13px;color:#475569}' +
      '#pp-modal textarea{width:100%;box-sizing:border-box;font:13px/1.4 ui-monospace,monospace;padding:10px;border:1px solid #cbd5e1;border-radius:8px;resize:vertical}' +
      '#pp-modal .pp-botones{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}' +
      '#pp-modal .pp-botones button{flex:1;min-width:140px;padding:11px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer}' +
      '#pp-modal .pp-pri{background:var(--gold,#d97706);color:#fff;border:none}' +
      '#pp-modal .pp-sec{background:#fff;color:#1e293b;border:1px solid #cbd5e1}' +
      '#pp-modal .pp-cerrar{position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;color:#64748b}' +
      '#pp-modal #pp-resultado{margin-top:10px;font-size:13px}' +
      '#pp-modal #pp-resultado ul{margin:4px 0 8px;padding-left:18px}' +
      '#pp-modal .pp-ok{color:#166534;font-weight:700;margin:6px 0}' +
      '#pp-modal .pp-error{color:#b91c1c;font-weight:700;margin:6px 0}' +
      '@media print{.pp-boton,#pp-modal{display:none!important}}';
    document.head.appendChild(st);
  }

  function initPegarPedido() {
    const slot = document.getElementById('pp-slot-cotizacion');
    if (!slot || slot.__ppListo) return;
    slot.__ppListo = true;
    inyectarEstilos();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pp-boton no-print';
    btn.id = 'btn-pegar-pedido';
    btn.textContent = '📋 ' + t('Pegar pedido (de tu asistente IA)', 'Paste order (from your AI assistant)');
    btn.addEventListener('click', abrirModal);
    slot.appendChild(btn);
  }

  global.ArpaPegarPedido = {
    parsePedido: parsePedido,
    parseMonto: parseMonto,
    matchProductos: matchProductos,
    aplicarPedido: aplicarPedido,
    abrirModal: abrirModal,
    init: initPegarPedido,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPegarPedido);
    else initPegarPedido();
  }
})(typeof window !== 'undefined' ? window : globalThis);
