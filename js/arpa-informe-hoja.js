/**
 * Informe de servicio en una o dos hojas (boceto 2 aprobado por Arlen el 26-nov-2026).
 * Arma el PDF del Formato de Servicio desde los datos del formulario, con una plantilla propia:
 *  - Arriba: "Trabajo terminado" y un resumen de una línea.
 *  - Cliente y equipo en una sola columna (se lee en el celular sin zoom).
 *  - Pruebas de seguridad hechas (si se usó la lista). La norma NO se nombra en el PDF del
 *    cliente (Arlen, 27-nov-2026): la NTC queda solo en la app.
 *  - Fotos de antes, después y de la placa del equipo (la placa: cajita propia, 27-nov).
 *  - Serie del equipo en "Cliente y equipo".
 *  - Garantía corta, siguiente paso (próximo mantenimiento, que se puede cambiar o quitar en
 *    el formulario) y botones que se pueden tocar: reseña en Google (link de Configuración)
 *    y WhatsApp de la empresa.
 * Sin precios. No cambia datos, numeración, historial ni el nombre del archivo.
 * Con idioma del documento en inglés, o si algo falla, se usa el PDF de siempre.
 */
(function (global) {
  'use strict';
  if (typeof document === 'undefined' || global.ArpaInformeHoja) return;

  const REVIEW_KEY = 'arpa_suite_review_link';
  const REVIEW_FIELD_ID = 'settings-review-link';
  const W = 816; // ancho Carta a 96 ppp
  const H = 1056; // alto Carta
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // ---------- utilidades ----------
  const $ = (id) => document.getElementById(id);
  const val = (id) => String($(id)?.value || '').trim();
  // Algunas versiones del formulario no tienen id en medidas y material: se buscan por su lugar.
  const valSel = (sel) => String(document.querySelector(sel)?.value || '').trim();
  const medida = (i, id) => val(id) || String(document.querySelectorAll('#formato-medidas-section .dims-table input')[i]?.value || '').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const limpiarEmoji = (s) => String(s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  const labelDe = (id) => limpiarEmoji(document.querySelector('label[for="' + id + '"]')?.textContent || '');

  function normalizarUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.hostname.indexOf('.') < 0) return '';
      return u.href;
    } catch (e) { return ''; }
  }

  function parseFecha(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  const fechaLarga = (d) => (d ? d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() : '');
  const mesAnio = (d) => (d ? MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1) + ' de ' + d.getFullYear() : '');
  function sumarMeses(d, n) {
    if (!d) return null;
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
    return r;
  }
  function telefonoLegible(t) {
    let d = String(t || '').replace(/\D/g, '');
    const pref = global.ArpaPricing?.getCountryProfile?.()?.phonePrefix || '57';
    if (d.length > 10 && d.startsWith(pref) && d.length - pref.length === 10) d = d.slice(pref.length);
    return d.length === 10 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : String(t || '').trim();
  }
  function waLink(t) {
    const d = String(t || '').replace(/\D/g, '');
    if (d.length < 7) return '';
    const pref = global.ArpaPricing?.getCountryProfile?.()?.phonePrefix || '57';
    return 'https://wa.me/' + (d.length > 10 ? d : pref + d);
  }

  // ---------- link de reseñas (Configuración) ----------
  function getReviewLink() {
    try { return normalizarUrl(global.localStorage?.getItem(REVIEW_KEY) || ''); } catch (e) { return ''; }
  }
  function setReviewLink(raw) {
    const url = normalizarUrl(raw);
    try {
      if (url) global.localStorage.setItem(REVIEW_KEY, url);
      else global.localStorage.removeItem(REVIEW_KEY);
    } catch (e) { /* sin almacenamiento */ }
    return url;
  }
  function injectReviewField() {
    if ($(REVIEW_FIELD_ID)) return;
    const anchor = $('settings-payment-link')?.closest('.field') || $('settings-website')?.closest('.field') || $('settings-phone')?.closest('.field');
    if (!anchor) return;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML =
      '<label for="' + REVIEW_FIELD_ID + '">Link para reseñas en Google (opcional)</label>' +
      '<input type="url" id="' + REVIEW_FIELD_ID + '" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://g.page/r/…/review">' +
      '<small style="display:block;font-size:11px;color:var(--muted,#64748b);margin-top:4px;">Si lo pones, el informe trae un botón para que el cliente te califique.</small>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    const input = wrap.querySelector('input');
    const help = wrap.querySelector('small');
    const ayuda = help.textContent;
    input.value = getReviewLink();
    const paint = () => {
      const malo = input.value.trim() && !normalizarUrl(input.value);
      help.textContent = malo ? 'Debe empezar por https://' : ayuda;
      help.style.color = malo ? '#dc2626' : '';
    };
    input.addEventListener('input', paint);
    input.addEventListener('change', () => { const u = setReviewLink(input.value); if (u) input.value = u; paint(); });
  }

  // ---------- foto de la placa y próximo mantenimiento (formulario) ----------
  // Se guardan en campos con id dentro de #view-formato: el borrador y el Historial los
  // guardan y los devuelven solos (collectFormatoDraft / applyFormatoDraft).
  const PLACA_ID = 'formato-foto-placa';
  const PROX_ID = 'formato-prox-mant';
  function valorDelBorrador(id) {
    try {
      const raw = global.localStorage?.getItem(global.ArpaBrand?.FORMATO_DRAFT_KEY || 'arpa_formato_borrador');
      const v = raw ? JSON.parse(raw)[id] : '';
      return typeof v === 'string' ? v : '';
    } catch (e) { return ''; }
  }
  function renderPlaca() {
    const input = $(PLACA_ID);
    if (!input) return;
    const src = String(input.value || '');
    const prev = $('placa-preview');
    const ph = $('placa-placeholder');
    if (!prev) return;
    prev.innerHTML = '';
    const hay = src.indexOf('data:image/') === 0;
    prev.style.display = hay ? 'flex' : 'none';
    if (ph) ph.style.display = hay ? 'none' : '';
    if (!hay) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Foto de la placa';
    img.title = 'Toca para quitar';
    img.style.cssText = 'width:100%;height:120px;object-fit:contain;border-radius:6px;cursor:pointer;background:#f1f5f9;';
    img.onclick = () => {
      input.value = '';
      renderPlaca();
      global.scheduleFormatoDraftSave?.();
    };
    prev.appendChild(img);
  }
  function injectPlacaBox() {
    if ($(PLACA_ID)) return;
    const grid = document.querySelector('#view-formato .photos-grid');
    if (!grid) return;
    const box = document.createElement('div');
    box.className = 'photo-box';
    box.id = 'box-placa';
    box.style.gridColumn = '1 / -1';
    box.innerHTML =
      '<div class="photo-badge" style="background:#475569">Placa</div>' +
      '<input type="hidden" id="' + PLACA_ID + '" value="">' +
      '<input type="file" id="file-placa-gal" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;">' +
      '<div id="placa-placeholder"><div class="icon">🏷️</div>' +
      '<div class="ph-label">Foto de la placa del equipo (marca, modelo y serie)</div>' +
      '<label class="ph-btn-label" for="file-placa-gal">🖼 Galería / Cámara</label></div>' +
      '<div id="placa-preview" style="display:none;width:100%;padding:4px;"></div>';
    grid.appendChild(box);
    const hidden = $(PLACA_ID);
    hidden.value = valorDelBorrador(PLACA_ID);
    $('file-placa-gal').addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const comprimir = typeof global.compressPhotoToJpeg === 'function'
          ? global.compressPhotoToJpeg(ev.target.result, 1200, 0.7)
          : Promise.resolve(ev.target.result);
        comprimir.then((url) => {
          hidden.value = url;
          this.value = '';
          renderPlaca();
          global.scheduleFormatoDraftSave?.();
        });
      };
      reader.readAsDataURL(file);
    });
    renderPlaca();
  }
  function injectProxMant() {
    if ($(PROX_ID)) return;
    const obs = $('formato-section-observaciones');
    if (!obs) return;
    const sec = document.createElement('div');
    sec.className = 'section no-print';
    sec.id = 'formato-prox-mant-section';
    sec.innerHTML =
      '<div class="section-title"><span class="dot"></span><span>Próximo mantenimiento</span></div>' +
      '<div class="field"><label for="' + PROX_ID + '">Sale en el informe como "Siguiente paso"</label>' +
      '<select id="' + PROX_ID + '">' +
      '<option value="">Automático: en 6 meses (en reparaciones no sale)</option>' +
      '<option value="3">En 3 meses</option>' +
      '<option value="6">En 6 meses</option>' +
      '<option value="12">En 12 meses</option>' +
      '<option value="no">No poner</option>' +
      '</select></div>';
    obs.parentNode.insertBefore(sec, obs);
    const sel = $(PROX_ID);
    const guardado = valorDelBorrador(PROX_ID);
    if (Array.from(sel.options).some((o) => o.value === guardado)) sel.value = guardado;
    sel.addEventListener('change', () => global.scheduleFormatoDraftSave?.());
  }
  /** Al abrir un borrador o un documento del Historial, o al limpiar el formulario, la placa se vuelve a pintar. */
  function engancharFormulario() {
    ['applyFormatoFotosFromDraft', 'clearFormatoDocumentFields'].forEach((nombre) => {
      const orig = global[nombre];
      if (typeof orig !== 'function' || orig.__informeHoja) return;
      const nuevo = function () {
        const r = orig.apply(this, arguments);
        try { renderPlaca(); } catch (e) { /* sin placa */ }
        return r;
      };
      nuevo.__informeHoja = true;
      global[nombre] = nuevo;
    });
  }
  /** Fecha del próximo mantenimiento según lo escogido; null si no va. */
  function proximoMantenimiento(d) {
    if (!d.fecha || d.proxMant === 'no') return null;
    const n = Number(d.proxMant) || ((d.tipoValor === 'instalacion' || d.tipoValor === 'mantenimiento') ? 6 : 0);
    return n ? sumarMeses(d.fecha, n) : null;
  }

  // ---------- datos del formulario ----------
  function leerGarantia() {
    const custom = document.querySelector('#view-formato .garantia-custom:not([hidden])');
    if (custom && custom.textContent.trim()) return [{ titulo: '', texto: custom.textContent.trim() }];
    return Array.from(document.querySelectorAll('#view-formato [data-arpa-warranty-items] .garantia-item')).map((it) => {
      const strong = it.querySelector('strong');
      const titulo = strong ? strong.textContent.replace(/:\s*$/, '').trim() : '';
      const caja = strong ? strong.parentElement : it;
      const todo = caja.textContent.replace(/\s+/g, ' ').trim();
      return { titulo, texto: strong ? todo.slice(todo.indexOf(strong.textContent.trim()) + strong.textContent.trim().length).trim() : todo };
    }).filter((g) => g.texto);
  }

  function leerPruebas() {
    const C = global.ArpaChecklistNtc;
    if (!C?.getState) return null;
    const st = C.normalize ? C.normalize(C.getState()) : C.getState();
    if (!st || !st.enabled || !st.tipo) return null;
    const items = C.getItems(st.tipo, 'es');
    const ok = [];
    const no = [];
    items.forEach((it) => {
      const r = st.items?.[it.id]?.r;
      if (r === 'ok') ok.push(it.short || it.text);
      else if (r === 'no') no.push({ texto: it.text, obs: st.items[it.id].obs || '' });
    });
    if (!ok.length && !no.length) return null;
    return { ok, no };
  }

  function leerDatos() {
    const s = global.ArpaBrand?.getSettings?.() || {};
    const tipoRadio = document.querySelector('#view-formato input[name="tipo"]:checked');
    const tipoServicio = tipoRadio ? labelDe(tipoRadio.id) : '';
    const tipoValor = tipoRadio?.value || '';
    const puertas = Array.from(document.querySelectorAll('#formato-tipo-chips input[type=checkbox]:checked, #view-formato .chips input[type=checkbox][id^="c"]:checked'))
      .filter((c, i, arr) => arr.indexOf(c) === i)
      .map((c) => (c.id === 'c8' ? (val('formato-tipo-otra-texto') || '') : labelDe(c.id)))
      .filter(Boolean);
    const esPuerta = Array.from(document.querySelectorAll('#view-formato .chips input[type=checkbox][id^="c"]:checked')).some((c) => c.id !== 'c8');
    const selRef = $('sel-referencia');
    const refTxt = selRef && selRef.selectedIndex > 0 && selRef.style.display !== 'none' ? selRef.options[selRef.selectedIndex].text : '';
    const referencia = limpiarEmoji(val('ref-manual') || (/^(seleccionar|select)\b/i.test(refTxt) ? '' : refTxt));
    const marcaSel = $('sel-marca');
    const marcaTxt = marcaSel && marcaSel.value ? (marcaSel.options[marcaSel.selectedIndex]?.text || marcaSel.value) : '';
    const marca = /^(seleccionar|select)\b/i.test(marcaTxt) ? '' : limpiarEmoji(marcaTxt);
    const accesorios = Array.from(document.querySelectorAll('#formato-equipo-accesorios input[type=checkbox]:checked'))
      .map((c) => limpiarEmoji(c.closest('label')?.textContent || labelDe(c.id))).filter(Boolean);
    const obs = ['formato-obs-1', 'formato-obs-2', 'formato-obs-3', 'formato-obs-4'].map(val).filter(Boolean);
    const fotos = global.__arpaFormatoFotos || { antes: [], despues: [] };
    const firma = (id) => {
      try { return global.ArpaSignature?.hasSignature?.(id) ? global.ArpaSignature.getDataUrl(id) : ''; } catch (e) { return ''; }
    };
    const fecha = parseFecha(val('formato-fecha'));
    return {
      empresa: {
        nombre: String(s.companyName || '').trim(),
        nit: String(s.nit || '').trim(),
        tel: String(s.phone || '').trim(),
        web: String(s.website || '').trim(),
        direccion: [s.address, s.city].map((x) => String(x || '').trim()).filter(Boolean).join(', '),
        logo: s.logoBase64 || ''
      },
      numero: val('numero-formato'),
      fecha,
      tipoServicio,
      tipoValor,
      puertas,
      esPuerta,
      cliente: {
        nombre: val('formato-cliente-nombre'),
        nit: val('formato-cliente-nit'),
        tel: val('formato-cliente-tel'),
        direccion: [val('formato-cliente-direccion'), val('formato-cliente-ciudad')].filter(Boolean).join(', ')
      },
      ancho: medida(0, 'formato-medida-ancho'),
      alto: medida(1, 'formato-medida-alto'),
      material: val('formato-material-puerta') || valSel('#formato-medidas-section [data-i18n="formato.label.material_puerta"] + input'),
      marca,
      referencia,
      voltaje: val('formato-voltaje'),
      // Serie: producción tiene id; versiones viejas del formulario se buscan por su etiqueta.
      serie: val('formato-serie') || valSel('#formato-equipo-section [data-i18n="formato.label.serie_codigo"] + input'),
      fotoPlaca: (val(PLACA_ID).indexOf('data:image/') === 0) ? val(PLACA_ID) : '',
      proxMant: val(PROX_ID),
      accesorios,
      tecnico: val('campo-tecnico-responsable') || String(s.technicianName || '').trim(),
      obs,
      fotosAntes: (fotos.antes || []).filter(Boolean),
      fotosDespues: (fotos.despues || []).filter(Boolean),
      pruebas: leerPruebas(),
      garantia: leerGarantia(),
      firmaCliente: firma('canvas-firma-cliente'),
      firmaTecnico: firma('canvas-firma-tecnico'),
      resena: getReviewLink()
    };
  }

  // ---------- resumen en palabras ----------
  function resumen(d) {
    if (d.obs.length) return d.obs[0];
    const partes = [];
    const equipo = [d.marca, d.referencia.replace(/^[A-Z0-9-]+\s*[–-]\s*/, '')].filter(Boolean).join(' ');
    const verbo = { instalacion: 'Instalamos', mantenimiento: 'Hicimos mantenimiento a', reparacion: 'Reparamos' }[d.tipoValor] || '';
    if (verbo && equipo) partes.push(verbo + (d.tipoValor === 'instalacion' ? ' un motor ' : ' el motor ') + equipo);
    else if (d.tipoServicio) partes.push(d.tipoServicio);
    if (d.puertas.length && d.esPuerta) {
      let p = 'en su puerta ' + d.puertas.join(' / ').toLowerCase();
      if (d.ancho && d.alto) p += ' de ' + d.ancho + ' × ' + d.alto + ' m';
      partes.push(p);
    }
    let txt = partes.join(' ');
    if (d.accesorios.length) txt += ', con ' + d.accesorios.map((a) => a.toLowerCase()).join(', ');
    return txt ? txt + '.' : '';
  }

  // ---------- plantilla ----------
  const CSS = `
.aih{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#fff;color:#0F1E3D;font-family:'DM Sans','Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.4;box-sizing:border-box}
.aih *{box-sizing:border-box;margin:0;padding:0}
.aih,.aih *{font-kerning:none!important;font-variant-ligatures:none!important}
.aih{letter-spacing:0.01px}
.aih .hdr{background:#16284B;color:#fff;display:flex;align-items:center;gap:16px;padding:16px 36px}
.aih .logo{width:70px;height:70px;background:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden}
.aih .logo img{max-width:60px;max-height:60px}
.aih .emp{min-width:0}
.aih .emp h1{font-size:20px;font-weight:800;line-height:1.2}
.aih .emp p{font-size:12px;color:#C9D1E2;margin-top:2px}
.aih .num{margin-left:auto;text-align:right;flex:none}
.aih .num .t{font-size:11px;letter-spacing:.14em;color:#E2C46B;font-weight:800}
.aih .num .n{font-size:28px;font-weight:800;line-height:1.15;white-space:nowrap}
.aih .num .f{font-size:12px;color:#C9D1E2}
.aih .gold{height:5px;background:#C9A84C}
.aih .main{padding:14px 36px 0}
.aih .ok{display:flex;gap:14px;align-items:center;background:#EAF6EE;border-left:6px solid #1F8A4C;border-radius:10px;padding:12px 16px}
.aih .ok .ic{width:38px;height:38px;border-radius:50%;background:#1F8A4C;color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.aih .ok b{font-size:17px;display:block}
.aih .ok span{font-size:13.5px;color:#2E3A52}
.aih h2{font-size:12px;letter-spacing:.12em;color:#16284B;font-weight:800;text-transform:uppercase;margin:12px 0 5px;display:flex;align-items:center;gap:8px}
.aih h2:after{content:'';flex:1;height:1px;background:#DDE1EA}
.aih table{width:100%;border-collapse:collapse}
.aih td{padding:3px 0;border-bottom:1px solid #EEF0F5;font-size:14px;vertical-align:top}
.aih td:first-child{color:#4A5570;width:30%}
.aih td:last-child{font-weight:700}
.aih .checks{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}
.aih .checks div{font-size:14px;display:flex;gap:8px;align-items:center}
.aih .checks i{font-style:normal;width:20px;height:20px;border-radius:50%;background:#1F8A4C;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.aih .malos{margin-top:6px;background:#FDF0EF;border-left:5px solid #C0392B;border-radius:8px;padding:8px 12px;font-size:13px}
.aih .malos b{color:#C0392B}
.aih .norma{font-size:11.5px;color:#4A5570;margin-top:4px}
.aih.medir{height:auto}
.aih .blk{display:flow-root}
.aih .hdr.corta{padding:12px 36px}
.aih .hdr.corta .emp h1{font-size:16px}
.aih .hdr.corta .num .n{font-size:20px}
.aih .fotos{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px}
.aih .fotos figure{height:182px;background:#EEF1F6}
.aih h2 .tag{position:static;display:inline-block;font-size:11px;letter-spacing:.1em}
.aih .fotos figure{position:relative;margin:0;background:#EEF1F6;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.aih .fotos img{display:block;max-width:none}
.aih .tag{position:absolute;top:8px;left:8px;color:#fff;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 9px;border-radius:5px}
.aih .tag.a{background:#16284B}.aih .tag.d{background:#1F8A4C}.aih .tag.p{background:#475569}
.aih .obs{font-size:13.5px;color:#2E3A52}
.aih .obs li{margin-left:18px}
.aih .gar{background:#F3F5F9;border-radius:10px;padding:9px 14px;font-size:12.5px;line-height:1.45}
.aih .gar b{color:#16284B}
.aih .sig{background:#16284B;color:#fff;border-radius:14px;padding:14px 18px;margin-top:12px}
.aih .sig .fila{display:flex;gap:16px;align-items:center}
.aih .prox small{font-size:11px;letter-spacing:.12em;color:#E2C46B;font-weight:800}
.aih .prox .fecha{font-size:22px;font-weight:800}
.aih .prox p{font-size:13px;color:#C9D1E2}
.aih .btns{display:flex;gap:10px;margin-top:12px}
.aih .btn{flex:1;text-align:center;border-radius:10px;padding:12px 10px;font-weight:800;font-size:15px}
.aih .btn.g{background:#C9A84C;color:#16284B}
.aih .btn.w{background:#fff;color:#16284B}
.aih .qr{margin-left:auto;text-align:center;font-size:10px;color:#C9D1E2;flex:none}
.aih .qr img{width:74px;height:74px;background:#fff;border-radius:6px;padding:3px;display:block;margin-bottom:3px}
.aih .firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:10px}
.aih .firmas .f{font-size:12px;color:#4A5570}
.aih .firmas .trazo{height:50px;display:flex;align-items:flex-end}
.aih .firmas .trazo img{max-height:50px;max-width:100%;object-fit:contain;display:block}
.aih .firmas .linea{border-top:1.5px solid #16284B;padding-top:5px}
.aih .firmas b{display:block;color:#16284B;font-size:13.5px}
.aih .gracias{text-align:center;font-size:13px;color:#2E3A52;margin-top:10px}
.aih .pie{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #DDE1EA;padding:8px 36px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4A5570;background:#fff}
.aih .pie .ad{color:#16284B;font-size:11.5px}
.aih .pie .ad b{color:#16284B}
.aih .pie .ad u{text-decoration:none;color:#B8902F;font-weight:700}
`;

  function fila(etq, v) { return v ? '<tr><td>' + esc(etq) + '</td><td>' + esc(v) + '</td></tr>' : ''; }

  function cabeceraHtml(d, corta) {
    const e = d.empresa;
    if (corta) {
      return '<div class="hdr corta"><div class="emp"><h1>' + esc(e.nombre || 'Mi empresa') + '</h1></div>' +
        '<div class="num"><div class="t">INFORME DE SERVICIO</div><div class="n">' + esc(d.numero || '') + '</div></div></div><div class="gold"></div>';
    }
    const contacto = [e.nit ? 'NIT ' + e.nit : '', e.tel ? 'WhatsApp ' + telefonoLegible(e.tel) : ''].filter(Boolean).join(' · ');
    const linea2 = [e.direccion, e.web].filter(Boolean).join(' · ');
    return '<div class="hdr">' + (e.logo ? '<div class="logo"><img src="' + esc(e.logo) + '"></div>' : '') +
      '<div class="emp"><h1>' + esc(e.nombre || 'Mi empresa') + '</h1>' +
      (contacto || linea2 ? '<p>' + esc(contacto) + (contacto && linea2 ? '<br>' : '') + esc(linea2) + '</p>' : '') + '</div>' +
      '<div class="num"><div class="t">INFORME DE SERVICIO</div><div class="n">' + esc(d.numero || '') + '</div><div class="f">' + esc(fechaLarga(d.fecha)) + '</div></div></div>' +
      '<div class="gold"></div>';
  }

  function pieHtml(d, n, total) {
    return '<div class="pie"><span>' + esc(d.numero || '') + ' · Página ' + n + ' de ' + total + '</span>' +
      '<span class="ad" data-link="https://arpatechnologyglobal.com">Generado con <b>ARPA Suite</b> · Pruébala gratis en <u>arpatechnologyglobal.com</u></span></div>';
  }

  /** Bloques del informe en orden. Cada bloque va entero en una hoja (nunca se parte). */
  function bloquesHtml(d, qr) {
    const e = d.empresa;
    const b = [];
    const titulo = d.esPuerta ? 'Trabajo terminado. Su puerta quedó funcionando.' : 'Trabajo terminado.';
    const res = resumen(d);
    const equipoTxt = [d.marca, d.referencia].filter(Boolean).join(' · ') + (d.voltaje ? ' · ' + d.voltaje : '');
    const puertaTxt = d.esPuerta
      ? [d.puertas.join(' / '), d.ancho && d.alto ? d.ancho + ' × ' + d.alto + ' m' : '', d.material].filter(Boolean).join(' · ')
      : d.puertas.join(' / ');

    b.push('<div class="ok"><div class="ic">✓</div><div><b>' + esc(titulo) + '</b>' + (res ? '<span>' + esc(res) + '</span>' : '') + '</div></div>');
    b.push('<h2>Cliente y equipo</h2><table>' +
      fila('Cliente', [d.cliente.nombre, d.cliente.nit ? 'NIT ' + d.cliente.nit : ''].filter(Boolean).join(' · ')) +
      fila('Teléfono', telefonoLegible(d.cliente.tel)) +
      fila('Dirección', d.cliente.direccion) +
      fila('Servicio', d.tipoServicio) +
      fila(d.esPuerta ? 'Puerta' : 'Trabajo', puertaTxt) +
      fila('Equipo', equipoTxt.replace(/^ · /, '')) +
      fila('Serie', d.serie) +
      fila('Accesorios', d.accesorios.join(', ')) +
      '</table>');

    if (d.pruebas) {
      let h = '<h2>Pruebas de seguridad hechas</h2>';
      if (d.pruebas.ok.length) h += '<div class="checks">' + d.pruebas.ok.slice(0, 12).map((t) => '<div><i>✓</i>' + esc(t) + '</div>').join('') + '</div>';
      if (d.pruebas.no.length) h += '<div class="malos"><b>Para revisar:</b> ' + d.pruebas.no.map((n) => esc(n.texto + (n.obs ? ' (' + n.obs + ')' : ''))).join(' · ') + '</div>';
      b.push(h);
    }

    // Fotos grandes, completas y con su forma real (vertical u horizontal): nunca se estiran ni se recortan.
    // Galería ordenada: todas las fotos del mismo tamaño, de 3 en 3, primero Antes y luego Después.
    // Cada foto se recorta al centro (nunca se estira) para que la cuadrícula quede pareja.
    const grupo = (lista, titulo, clase) => {
      const fotos = lista.slice(0, 6);
      for (let i = 0; i < fotos.length; i += 3) {
        b.push((i === 0 ? '<h2><span class="tag ' + clase + '">' + titulo + '</span></h2>' : '') + '<div class="fotos">' +
          fotos.slice(i, i + 3).map((f) => '<figure><img data-cover="1" src="' + esc(f) + '"></figure>').join('') + '</div>');
      }
    };
    grupo(d.fotosAntes, 'ANTES', 'a');
    grupo(d.fotosDespues, 'DESPUÉS', 'd');
    if (d.fotoPlaca) grupo([d.fotoPlaca], 'PLACA DEL EQUIPO', 'p');

    if (d.obs.length > 1) b.push('<h2>Observaciones</h2><ul class="obs">' + d.obs.slice(1).map((o) => '<li>' + esc(o) + '</li>').join('') + '</ul>');

    const prox = proximoMantenimiento(d);
    // El mantenimiento ya va en "Siguiente paso": en la garantía no se repite.
    const garantia = prox ? d.garantia.filter((g) => !/manten/i.test(g.titulo)) : d.garantia;
    if (garantia.length) {
      b.push('<h2>Garantía</h2><div class="gar">' + garantia.map((g) => (g.titulo ? '<b>' + esc(g.titulo) + ':</b> ' : '') + esc(g.texto)).join(' ') + '</div>');
    }

    const wa = waLink(e.tel);
    if (prox || d.resena || wa) {
      b.push('<div class="sig"><div class="fila"><div class="prox"><small>SIGUIENTE PASO</small>' +
        (prox ? '<div class="fecha">Mantenimiento en ' + esc(mesAnio(prox).toLowerCase()) + '</div><p>Le escribimos antes para apartar el día.</p>'
          : '<div class="fecha">¿Necesita algo más?</div><p>Escríbanos cuando lo necesite.</p>') +
        '</div>' + (d.resena && qr ? '<div class="qr"><img src="' + qr + '">Reseña</div>' : '') + '</div>' +
        '<div class="btns">' +
        (d.resena ? '<a class="btn g" data-link="' + esc(d.resena) + '">★ Califique nuestro servicio</a>' : '') +
        (wa ? '<a class="btn w" data-link="' + esc(wa) + '">WhatsApp ' + esc(telefonoLegible(e.tel)) + '</a>' : '') +
        '</div></div>');
    }

    // La firma va en su propio espacio, encima de la línea: nunca se monta sobre el recuadro de arriba.
    const firmaHtml = (img, nombre, rol) => '<div class="f"><div class="trazo">' + (img ? '<img src="' + img + '">' : '') + '</div>' +
      '<div class="linea"><b>' + esc(nombre) + '</b>' + rol + '</div></div>';
    b.push('<div class="firmas">' + firmaHtml(d.firmaCliente, d.cliente.nombre || 'Cliente', 'Recibido por el cliente') +
      firmaHtml(d.firmaTecnico, d.tecnico || e.nombre || '', 'Técnico') + '</div><p class="gracias">Gracias por confiar en nosotros.</p>');
    return b;
  }

  /** Vista previa en una sola pieza (para pruebas). */
  function buildHtml(d, qr) {
    return '<div class="aih medir">' + cabeceraHtml(d, false) + '<div class="main">' +
      bloquesHtml(d, qr).map((x) => '<div class="blk">' + x + '</div>').join('') + '</div>' + pieHtml(d, 1, 1) + '</div>';
  }

  function qrDataUrl(url) {
    const QR = global.QRCode;
    if (!url || !QR || typeof QR.toDataURL !== 'function') return Promise.resolve('');
    return QR.toDataURL(url, { width: 240, margin: 1, color: { dark: '#16284B', light: '#ffffff' } }).catch(() => '');
  }

  function esperarImagenes(root) {
    return Promise.all(Array.from(root.querySelectorAll('img')).map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }))));
  }

  function nombreArchivo(d) {
    const parte = (t) => String(t || '').replace(/[^\w\s-áéíóúÁÉÍÓÚñÑ]/g, '').replace(/\s+/g, '_').substring(0, 40) || 'Formato';
    return 'Formato_' + parte(d.numero) + '_' + parte(d.cliente.nombre) + '.pdf';
  }

  /** Ajusta cada foto a su cajita sin deformarla (html2canvas no entiende object-fit). */
  function ajustarFotos(root) {
    // Galería pareja: cada foto se recorta al centro al tamaño exacto de su cuadro (sin estirarla).
    root.querySelectorAll('img[data-cover]').forEach((img) => {
      const caja = img.parentElement;
      const bw = caja.clientWidth;
      const bh = caja.clientHeight;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh || !bw || !bh) return;
      const escala = Math.max(bw / nw, bh / nh);
      const sw = bw / escala;
      const sh = bh / escala;
      const c = document.createElement('canvas');
      c.width = bw * 2;
      c.height = bh * 2;
      try {
        c.getContext('2d').drawImage(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
        img.src = c.toDataURL('image/jpeg', 0.9);
      } catch (e) { /* si no se puede recortar, queda la foto entera */ }
      img.style.width = bw + 'px';
      img.style.height = bh + 'px';
    });
    root.querySelectorAll('img[data-fit]').forEach((img) => {
      const caja = img.parentElement;
      const bw = caja.clientWidth;
      const bh = caja.clientHeight;
      const nw = img.naturalWidth || bw;
      const nh = img.naturalHeight || bh;
      const k = Math.min(bw / nw, bh / nh);
      img.style.width = Math.round(nw * k) + 'px';
      img.style.height = Math.round(nh * k) + 'px';
    });
  }

  /** Arma el PDF (una o más hojas, sin partir bloques) y devuelve un File. Lanza error si no puede. */
  async function generarPdfFile() {
    const jsPDF = global.jspdf?.jsPDF || global.jsPDF;
    const html2canvas = global.html2canvas;
    if (!jsPDF || !html2canvas) throw new Error('sin jsPDF/html2canvas');
    const d = leerDatos();
    const qr = await qrDataUrl(d.resena);
    const bloques = bloquesHtml(d, qr);

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + W + 'px;z-index:-1;pointer-events:none;';
    document.body.appendChild(host);
    try {
      // 1) Medir: cabeceras, pie y cada bloque.
      host.innerHTML = '<style>' + CSS + '</style>' +
        '<div class="aih medir">' + cabeceraHtml(d, false) + '<div class="main">' + bloques.map((x) => '<div class="blk">' + x + '</div>').join('') + '</div>' + pieHtml(d, 1, 1) + '</div>' +
        '<div class="aih medir">' + cabeceraHtml(d, true) + '</div>';
      await esperarImagenes(host);
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) { /* sin fuentes */ } }
      ajustarFotos(host);
      const medidas = host.querySelectorAll('.aih.medir');
      const m1 = medidas[0];
      const m2 = medidas[1];
      const main = m1.querySelector('.main');
      const pieH = m1.querySelector('.pie').offsetHeight;
      const cab1 = main.offsetTop + 14;
      const cab2 = m2.scrollHeight + 14;
      const blks = Array.from(main.children);
      const altos = blks.map((el) => el.offsetHeight);

      // 2) Repartir los bloques en hojas sin partir ninguno.
      const paginas = [[]];
      let libre = H - cab1 - pieH - 16;
      altos.forEach((h, idx) => {
        if (h > libre && paginas[paginas.length - 1].length) {
          paginas.push([]);
          libre = H - cab2 - pieH - 16;
        }
        paginas[paginas.length - 1].push(idx);
        libre -= h;
      });
      m2.remove();

      // 3) Armar cada hoja con los mismos nodos (fotos ya ajustadas) y capturarla.
      const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const k = pw / W;
      for (let p = 0; p < paginas.length; p++) {
        const hoja = document.createElement('div');
        hoja.className = 'aih';
        hoja.innerHTML = cabeceraHtml(d, p > 0) + '<div class="main"></div>' + pieHtml(d, p + 1, paginas.length);
        const cont = hoja.querySelector('.main');
        paginas[p].forEach((idx) => cont.appendChild(blks[idx]));
        host.appendChild(hoja);
        await esperarImagenes(hoja);
        const base = hoja.getBoundingClientRect();
        const links = Array.from(hoja.querySelectorAll('[data-link]')).map((a) => {
          const r = a.getBoundingClientRect();
          return { url: a.getAttribute('data-link'), x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
        });
        const canvas = await html2canvas(hoja, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: W, height: H, windowWidth: W });
        if (p > 0) pdf.addPage('letter', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pw, ph);
        links.forEach((l) => pdf.link(l.x * k, l.y * k, l.w * k, l.h * k, { url: l.url }));
        hoja.remove();
      }
      return new File([pdf.output('blob')], nombreArchivo(d), { type: 'application/pdf' });
    } finally {
      host.remove();
    }
  }

  function usarHojaNueva() {
    return !global.ArpaDocLang?.isEnglish?.();
  }

  function descargar(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ---------- enganche con los botones de siempre ----------
  function engancharGuardar() {
    const orig = global.guardarPDFYHistorial;
    if (typeof orig !== 'function' || orig.__informeHoja) return;
    const nuevo = async function guardarPDFYHistorialHoja() {
      if (!usarHojaNueva()) return orig.apply(this, arguments);
      if (!(await global.ArpaBrand?.ensureCompanyName?.() ?? true)) return;
      if (typeof global.validarFirmaClienteFormato === 'function' && !global.validarFirmaClienteFormato()) return;
      global.ArpaTrialCapture?.beginPdfExport?.();
      try {
        global.ArpaHistorial?.captureFromFormato?.();
        const file = await generarPdfFile();
        descargar(file);
        global.ArpaWhatsApp?.showFormatoShareAfterPdf?.();
      } catch (err) {
        console.warn('[arpa-informe-hoja] se usa el PDF de siempre', err);
        global.ArpaTrialCapture?.endPdfExport?.();
        return orig.apply(this, arguments);
      }
      global.ArpaTrialCapture?.endPdfExport?.();
    };
    nuevo.__informeHoja = true;
    global.guardarPDFYHistorial = nuevo;
  }

  function engancharWhatsApp() {
    const W2 = global.ArpaWhatsApp;
    if (!W2 || W2.__informeHoja) return;
    const origFile = W2.generarFormatoPdfFile;
    const origShare = global.compartirFormatoWhatsApp;
    W2.generarFormatoPdfFile = async function () {
      if (!usarHojaNueva()) return origFile.apply(this, arguments);
      try { return await generarPdfFile(); } catch (err) {
        console.warn('[arpa-informe-hoja] WhatsApp con el PDF de siempre', err);
        return origFile.apply(this, arguments);
      }
    };
    const share = async function compartirFormatoWhatsAppHoja() {
      if (!usarHojaNueva() || typeof origShare !== 'function') return origShare?.apply(this, arguments);
      if (!(await global.ArpaBrand?.ensureCompanyName?.() ?? true)) return;
      const telRaw = val('formato-cliente-tel');
      const message = W2.buildFormatoMessage?.() || '';
      try {
        const file = await W2.generarFormatoPdfFile();
        if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: file.name, text: message });
          return;
        }
        if (file) descargar(file);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        console.warn('[arpa-informe-hoja] compartir', err);
      }
      try { global.alert?.(global.ArpaI18n?.t?.('alert.pdf.adjuntar_manual') || 'Adjunte el PDF desde su dispositivo.'); } catch (e) { /* sin aviso */ }
      W2.openWhatsAppWithMessage?.(telRaw, message + ' (Adjunte el PDF desde su dispositivo.)');
    };
    W2.compartirFormatoWhatsApp = share;
    global.compartirFormatoWhatsApp = share;
    W2.__informeHoja = true;
  }

  function init() {
    engancharGuardar();
    engancharWhatsApp();
    injectReviewField();
    injectPlacaBox();
    injectProxMant();
    engancharFormulario();
    // Configuración se redibuja: reintentar el campo sin costo.
    if (typeof MutationObserver === 'function' && document.body) {
      new MutationObserver(() => {
        if (!$(REVIEW_FIELD_ID)) injectReviewField();
        if (!$(PLACA_ID)) injectPlacaBox();
        if (!$(PROX_ID)) injectProxMant();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  global.ArpaInformeHoja = { generarPdfFile, leerDatos, buildHtml, resumen, getReviewLink, setReviewLink, sumarMeses, normalizarUrl, proximoMantenimiento, renderPlaca, CSS };
  if (document.readyState === 'complete') init();
  else global.addEventListener('load', init);
})(typeof window !== 'undefined' ? window : globalThis);
