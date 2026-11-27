/**
 * Módulo: "Calcular peso y motor" en Cotización.
 *
 * El técnico toca cómo abre la puerta, de qué está hecha y cuánto mide. La app
 * calcula el peso aproximado y recomienda motores con margen de seguridad. Si el
 * motor está en el catálogo del usuario, un toque lo agrega a la cotización con
 * el precio del catálogo. Todo pasa en el teléfono; no llama a ningún servidor.
 *
 * Pesos (kg por m² de puerta) aprobados por Arlen el 16-nov-2026, calculados con
 * tablas de acero y lámina y redondeados hacia arriba para no quedarse cortos.
 * Margen mínimo del motor (Arlen): Accessmatic 30 %, BFT 20 %.
 */
(function (global) {
  const KG_M2 = { tubo: 12, calado: 15, lamina: 20, madera: 25, delgada: 8, gruesa: 11 };
  const MARGEN = { Accessmatic: 0.30, BFT: 0.20 };

  // cap = kg (por hoja en batientes); largo = metros máximos por hoja; hojas = kit para 1 o 2 hojas.
  const MOTORES = {
    corredizo: [
      { cod: 'AUACKBD850', m: 'Accessmatic', n: 'Bulldozer 850', cap: 850 },
      { cod: 'AUACKBD1100', m: 'Accessmatic', n: 'Bulldog 1100', cap: 1100 },
      { cod: 'AUACKBD1522', m: 'Accessmatic', n: 'Bulldog 1522 (220V)', cap: 1500 },
      { cod: 'KDEIMOSBTA400-1', m: 'BFT', n: 'Deimos BT A400', cap: 400 },
      { cod: 'KDEIMOSBTA600-1', m: 'BFT', n: 'Deimos BT A600', cap: 600 },
      { cod: 'KDEIMOSACA800SLDN-1', m: 'BFT', n: 'Deimos AC A800 SL', cap: 800 },
    ],
    batiente: [
      { cod: 'AUACEG250', m: 'Accessmatic', n: 'Eagle 250 (2 hojas)', cap: 250, largo: 3, hojas: 2 },
      { cod: 'K1PHOBOSBT-A25', m: 'BFT', n: 'Phobos BT A25 (1 brazo)', cap: 400, largo: 2.5, hojas: 1 },
      { cod: 'K1PHOBOSBT-A40', m: 'BFT', n: 'Phobos BT A40 (1 brazo)', cap: 500, largo: 4, hojas: 1 },
      { cod: 'K2PHOBOSBT-A25', m: 'BFT', n: 'Phobos BT A25 (2 brazos)', cap: 400, largo: 2.5, hojas: 2 },
      { cod: 'K2PHOBOSBT-A40', m: 'BFT', n: 'Phobos BT A40 (2 brazos)', cap: 500, largo: 4, hojas: 2 },
    ],
    levadiza: [],
    enrollable: [],
  };

  const TIPOS = [
    { id: 'corredizo', es: 'Corre de lado', en: 'Slides', sub: ['Portón corredizo', 'Sliding gate'] },
    { id: 'batiente', es: 'Abre como puerta', en: 'Swings', sub: ['Una o dos hojas', 'One or two leaves'] },
    { id: 'levadiza', es: 'Sube al techo', en: 'Lifts up', sub: ['Puerta de garaje', 'Garage door'] },
    { id: 'enrollable', es: 'Se enrolla', en: 'Rolls up', sub: ['Cortina de local', 'Roller shutter'] },
  ];
  const MATS = {
    porton: [
      { id: 'tubo', es: 'Reja de tubo', en: 'Tube bars', sub: ['Se ve a través', 'See-through'] },
      { id: 'lamina', es: 'Forrada en lámina', en: 'Sheet metal', sub: ['Cerrada', 'Closed'] },
      { id: 'calado', es: 'Calado o con diseño', en: 'Cut pattern', sub: ['Mitad abierta', 'Half open'] },
      { id: 'madera', es: 'Madera', en: 'Wood', sub: ['Tablas o paneles', 'Boards or panels'] },
    ],
    cortina: [
      { id: 'delgada', es: 'Lámina delgada', en: 'Thin slats', sub: ['Rayas finas', 'Narrow ribs'] },
      { id: 'gruesa', es: 'Lámina gruesa', en: 'Thick slats', sub: ['Rayas anchas', 'Wide ribs'] },
    ],
  };

  function esIngles() {
    try { return (global.ArpaI18n?.getLang?.() || 'es') === 'en'; } catch (e) { return false; }
  }
  function t(es, en) { return esIngles() ? en : es; }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function redondear10(n) { return Math.round(n / 10) * 10; }

  /** Peso aproximado en kg. En batientes también devuelve el peso y el largo por hoja. */
  function calcularPeso(tipo, material, ancho, alto, hojas) {
    const a = Number(ancho), h = Number(alto);
    if (!(a > 0 && h > 0) || !KG_M2[material]) return null;
    const peso = redondear10(a * h * KG_M2[material]);
    if (tipo === 'batiente') {
      const n = hojas === 1 ? 1 : 2;
      return { peso: peso, porHoja: redondear10(peso / n), largoHoja: Math.round((a / n) * 100) / 100, hojas: n };
    }
    return { peso: peso, porHoja: null, largoHoja: null, hojas: null };
  }

  /** Motores que aguantan el peso con el margen de su marca (y el largo de hoja en batientes). */
  function motoresRecomendados(tipo, calc) {
    if (!calc) return [];
    const base = calc.porHoja != null ? calc.porHoja : calc.peso;
    return (MOTORES[tipo] || []).filter(function (x) {
      if (x.cap < base * (1 + (MARGEN[x.m] || 0.3))) return false;
      if (tipo === 'batiente') {
        if (x.hojas !== calc.hojas) return false;
        if (x.largo && calc.largoHoja > x.largo) return false;
      }
      return true;
    }).sort(function (x, y) { return x.cap - y.cap; });
  }

  function precioCatalogo(prod) {
    const seed = global.ArpaCatalogo?.getSeedCop?.(prod.cod);
    let v = typeof global.ArpaPricing?.resolveDisplayPvp === 'function'
      ? global.ArpaPricing.resolveDisplayPvp(prod, seed || undefined)
      : prod.pvp;
    const n = Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function formatoPrecio(n) {
    if (typeof global.formatoPesos === 'function') return global.formatoPesos(n);
    return '$' + Math.round(n).toLocaleString('es-CO');
  }

  /** Agrega el motor a la cotización sin tocar los datos del cliente ni los cobros. */
  function agregarACotizacion(cod) {
    const cot = global.ArpaCotizacion;
    if (!cot) return false;
    const prod = (cot.getCatalogoActivo?.() || []).find(function (p) { return p.cod === cod; });
    if (!prod) return false;
    const filas = cot.getFilas();
    const existe = filas.find(function (f) { return f.cod === cod; });
    if (existe) existe.cant = (Number(existe.cant) || 0) + 1;
    else filas.push({ cod: prod.cod, nom: prod.nom, pvp: precioCatalogo(prod), cant: 1, tipo: 'producto' });
    const val = function (id) { return document.getElementById(id)?.value || ''; };
    const iva = document.getElementById('iva-check-cot');
    // Se pasan todos los campos que loadCotizacion toca (observaciones, firma, validez, IVA)
    // para que agregar un motor no borre nada de lo que ya está escrito.
    cot.loadCotizacion({
      numero: val('numero-cot'), cliente: val('cot-nombre'), ciudad: val('cot-ciudad'), fecha: val('cot-fecha'),
      nit: val('cot-nit'), tel: val('cot-tel'), email: val('cot-email'),
      validez: val('cot-validez'), obs: val('cot-obs'), firmaClienteNombre: val('cot-firma-cliente-nombre'),
      conIva: iva ? iva.checked : null,
      filas: filas,
    });
    cot.recalcularCotizacion?.();
    cot.scheduleCotDraftSave?.();
    return true;
  }

  // ---------- Pantalla ----------
  const st = { tipo: 'corredizo', material: 'lamina', hojas: 2, ancho: '4', alto: '2' };

  function botones(lista, clave, extra) {
    return lista.map(function (o) {
      const on = String(st[clave]) === String(o.id);
      return '<button type="button" class="cp-opt" data-k="' + clave + '" data-v="' + o.id + '" aria-pressed="' + on + '">' +
        '<span>' + escapeHtml(t(o.es, o.en)) + '</span>' + (o.sub ? '<small>' + escapeHtml(t(o.sub[0], o.sub[1])) + '</small>' : '') + '</button>';
    }).join('') + (extra || '');
  }

  function resultadoHtml() {
    const calc = calcularPeso(st.tipo, st.material, st.ancho, st.alto, st.hojas);
    if (!calc) return '<p class="cp-nota">' + t('Escribe el ancho y el alto.', 'Enter width and height.') + '</p>';
    let html = '<div class="cp-kg">' + calc.peso.toLocaleString('es-CO') + ' <span>kg</span></div>';
    if (calc.porHoja != null) {
      html += '<p class="cp-nota">' + t('Unos ', 'About ') + calc.porHoja + t(' kg y ', ' kg and ') + calc.largoHoja + t(' m por hoja.', ' m per leaf.') + '</p>';
    }
    const lista = motoresRecomendados(st.tipo, calc);
    const catalogo = global.ArpaCotizacion?.getCatalogoActivo?.() || [];
    if (!(MOTORES[st.tipo] || []).length) {
      html += '<p class="cp-nota">' + t('Para este tipo de puerta, elige el motor en tu catálogo según el peso.', 'For this door type, pick the motor from your catalog by weight.') + '</p>';
    } else if (!lista.length) {
      html += '<p class="cp-nota">' + t('Ningún motor de la lista aguanta este peso con margen. Revisa en tu catálogo uno más fuerte.', 'No listed motor handles this weight with margin. Look for a stronger one in your catalog.') + '</p>';
    } else {
      html += '<p class="cp-nota">' + t('Motores que le sirven (con margen: Accessmatic 30 %, BFT 20 %):', 'Suitable motors (margin: Accessmatic 30%, BFT 20%):') + '</p><ul class="cp-lista">';
      lista.forEach(function (x) {
        const prod = catalogo.find(function (p) { return p.cod === x.cod; });
        const capTxt = t('Hasta ', 'Up to ') + x.cap + ' kg' + (st.tipo === 'batiente' ? t(' y ', ' and ') + x.largo + t(' m por hoja', ' m per leaf') : '');
        html += '<li><div><b>' + escapeHtml(x.m + ' ' + x.n) + '</b><small>' + escapeHtml(capTxt) + '</small></div>' +
          (prod
            ? '<button type="button" class="cp-add" data-cod="' + escapeHtml(x.cod) + '">' + escapeHtml(formatoPrecio(precioCatalogo(prod))) + '<br>' + t('Agregar', 'Add') + '</button>'
            : '<span class="cp-falta">' + t('No está en tu catálogo', 'Not in your catalog') + '</span>') +
          '</li>';
      });
      html += '</ul>';
    }
    return html;
  }

  function pintar() {
    const caja = document.getElementById('cp-cuerpo');
    if (!caja) return;
    const cortina = st.tipo === 'enrollable';
    const mats = cortina ? MATS.cortina : MATS.porton;
    if (!mats.some(function (m) { return m.id === st.material; })) st.material = mats[0].id;
    caja.innerHTML =
      '<p class="cp-paso">1 · ' + t('¿Cómo abre?', 'How does it open?') + '</p><div class="cp-grid">' + botones(TIPOS, 'tipo') + '</div>' +
      '<p class="cp-paso">2 · ' + t('¿De qué está hecha?', 'What is it made of?') + '</p><div class="cp-grid">' + botones(mats, 'material') + '</div>' +
      '<p class="cp-paso">3 · ' + t('¿Cuánto mide? (metros)', 'Size (meters)') + '</p>' +
      '<div class="cp-campos"><label>' + t('Ancho', 'Width') + '<input id="cp-ancho" type="number" inputmode="decimal" min="0.5" step="0.1" value="' + escapeHtml(st.ancho) + '"></label>' +
      '<label>' + t('Alto', 'Height') + '<input id="cp-alto" type="number" inputmode="decimal" min="0.5" step="0.1" value="' + escapeHtml(st.alto) + '"></label></div>' +
      (st.tipo === 'batiente' ? '<div class="cp-grid cp-hojas">' + botones([{ id: 1, es: '1 hoja', en: '1 leaf' }, { id: 2, es: '2 hojas', en: '2 leaves' }], 'hojas') + '</div>' : '') +
      '<div id="cp-resultado" aria-live="polite">' + resultadoHtml() + '</div>';
    caja.querySelectorAll('.cp-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.dataset.k;
        st[k] = k === 'hojas' ? Number(b.dataset.v) : b.dataset.v;
        pintar();
      });
    });
    ['ancho', 'alto'].forEach(function (k) {
      document.getElementById('cp-' + k).addEventListener('input', function (e) {
        st[k] = e.target.value;
        document.getElementById('cp-resultado').innerHTML = resultadoHtml();
        enlazarAgregar();
      });
    });
    enlazarAgregar();
  }

  function enlazarAgregar() {
    document.querySelectorAll('#cp-resultado .cp-add').forEach(function (b) {
      b.addEventListener('click', function () {
        if (agregarACotizacion(b.dataset.cod)) {
          b.disabled = true;
          b.textContent = '✓ ' + t('Agregado', 'Added');
        }
      });
    });
  }

  function cerrarModal() { document.getElementById('cp-modal')?.remove(); }

  function abrirModal() {
    cerrarModal();
    const wrap = document.createElement('div');
    wrap.id = 'cp-modal';
    wrap.className = 'no-print';
    wrap.innerHTML =
      '<div class="cp-fondo"></div>' +
      '<div class="cp-caja" role="dialog" aria-modal="true" aria-labelledby="cp-titulo">' +
        '<h3 id="cp-titulo">📐 ' + t('Calcular peso y motor', 'Weight and motor calculator') + '</h3>' +
        '<div id="cp-cuerpo"></div>' +
        '<button type="button" class="cp-listo">' + t('Listo', 'Done') + '</button>' +
        '<button type="button" class="cp-cerrar" aria-label="' + t('Cerrar', 'Close') + '">✕</button>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.cp-fondo').addEventListener('click', cerrarModal);
    wrap.querySelector('.cp-cerrar').addEventListener('click', cerrarModal);
    wrap.querySelector('.cp-listo').addEventListener('click', cerrarModal);
    pintar();
  }

  function inyectarEstilos() {
    if (document.getElementById('cp-estilos')) return;
    const s = document.createElement('style');
    s.id = 'cp-estilos';
    s.textContent =
      '.cp-boton{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:0 0 14px;padding:12px;border:2px dashed #2f4a63;border-radius:10px;background:transparent;color:#2f4a63;font-weight:700;font-size:14px;cursor:pointer}' +
      '#cp-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px}' +
      '#cp-modal .cp-fondo{position:absolute;inset:0;background:rgba(0,0,0,.55)}' +
      '#cp-modal .cp-caja{position:relative;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;color:#16212b;border-radius:14px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
      '#cp-modal h3{margin:0 28px 8px 0;font-size:17px}' +
      '#cp-modal .cp-paso{margin:12px 0 6px;font-weight:700;font-size:14px}' +
      '#cp-modal .cp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
      '#cp-modal .cp-hojas{margin-top:8px}' +
      '#cp-modal .cp-opt{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 6px;border:2px solid #d6dde4;border-radius:10px;background:#f3f5f7;color:#16212b;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' +
      '#cp-modal .cp-opt small{font-weight:400;font-size:12px;color:#5b6876}' +
      '#cp-modal .cp-opt[aria-pressed="true"]{border-color:#e0a100;background:#fff;box-shadow:0 0 0 2px #e0a100 inset}' +
      '#cp-modal .cp-campos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' +
      '#cp-modal label{display:flex;flex-direction:column;gap:3px;font-size:13px;color:#5b6876}' +
      '#cp-modal input{font:inherit;font-size:18px;padding:8px 10px;border:2px solid #d6dde4;border-radius:8px;width:100%;box-sizing:border-box}' +
      '#cp-modal #cp-resultado{margin-top:14px;border-top:2px solid #2f4a63;padding-top:10px}' +
      '#cp-modal .cp-kg{font-size:34px;font-weight:800;line-height:1.1}#cp-modal .cp-kg span{font-size:18px;color:#5b6876}' +
      '#cp-modal .cp-nota{margin:6px 0;font-size:13.5px;color:#334155}' +
      '#cp-modal .cp-lista{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '#cp-modal .cp-lista li{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid #d6dde4;border-radius:10px;padding:8px 10px}' +
      '#cp-modal .cp-lista li div{min-width:0;display:flex;flex-direction:column}#cp-modal .cp-lista small{color:#5b6876;font-size:12px}' +
      '#cp-modal .cp-add{flex:none;background:#1f7a4d;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-weight:700;font-size:12.5px;cursor:pointer;line-height:1.25}' +
      '#cp-modal .cp-add:disabled{background:#94a3b8}' +
      '#cp-modal .cp-falta{flex:none;font-size:12px;color:#94a3b8;text-align:right;max-width:90px}' +
      '#cp-modal .cp-listo{margin-top:14px;width:100%;padding:11px;border:none;border-radius:8px;background:#2f4a63;color:#fff;font-weight:700;font-size:14px;cursor:pointer}' +
      '#cp-modal .cp-cerrar{position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;color:#64748b}' +
      '@media print{.cp-boton,#cp-modal{display:none!important}}';
    document.head.appendChild(s);
  }

  function init() {
    const slot = document.getElementById('pp-slot-cotizacion');
    if (!slot || slot.__cpListo) return;
    slot.__cpListo = true;
    inyectarEstilos();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cp-boton no-print';
    btn.id = 'btn-calculadora-peso';
    btn.textContent = '📐 ' + t('Calcular peso y motor', 'Weight and motor calculator');
    btn.addEventListener('click', abrirModal);
    slot.appendChild(btn);
    actualizarVisibilidad();
    // Si el técnico cambia de oficio (Configuración o bienvenida), el botón aparece o se va solo.
    global.addEventListener?.('arpa-active-oficio-changed', actualizarVisibilidad);
    global.addEventListener?.('arpa:onboarding-done', actualizarVisibilidad);
  }

  /**
   * Solo para puertas y portones (Arlen, 27-nov-2026): a un plomero o un electricista
   * no le sirve un botón de motores. Si la app no tiene oficios guardados (usuarios
   * de antes), se deja como estaba: visible.
   */
  function esOficioPuertas() {
    let activos = [];
    try { activos = global.ArpaOficios?.getActiveOficiosFromSettings?.() || []; } catch (e) { activos = []; }
    return !activos.length || activos.indexOf('automatismos') >= 0;
  }

  function actualizarVisibilidad() {
    const btn = document.getElementById('btn-calculadora-peso');
    // .cp-boton tiene display:flex, que le gana al atributo hidden: se esconde con el estilo.
    if (btn) btn.style.display = esOficioPuertas() ? '' : 'none';
  }

  global.ArpaCalculadoraPeso = {
    KG_M2: KG_M2, MARGEN: MARGEN, MOTORES: MOTORES,
    calcularPeso: calcularPeso,
    motoresRecomendados: motoresRecomendados,
    agregarACotizacion: agregarACotizacion,
    abrirModal: abrirModal,
    esOficioPuertas: esOficioPuertas,
    actualizarVisibilidad: actualizarVisibilidad,
    init: init,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
