/**
 * ARPA Suite — Link de pago (opcional).
 *
 * El técnico pega su link de cobro (Nequi, Bre-B, Bold, Wompi, Mercado Pago, PayPal, etc.)
 * en Configuración. Si hay link:
 *  - la Cotización muestra un recuadro "Pagar en línea" con el link y un código QR
 *    (debajo de los Datos Bancarios, también en el PDF que se imprime/comparte);
 *  - la Cuenta de cobro (PDF) agrega el mismo recuadro con link clicable y QR.
 * Sin link no cambia nada. Todo queda en el dispositivo (localStorage); no llama a ningún servidor.
 */
(function (global) {
  'use strict';

  const KEY = 'arpa_suite_payment_link';
  const FIELD_ID = 'settings-payment-link';
  const BLOCK_ID = 'brand-paylink-block';

  const TXT = {
    es: {
      label: 'Link de pago (opcional)',
      placeholder: 'https://… (Nequi, Bold, Wompi, Mercado Pago, PayPal)',
      help: 'Si lo pones, la cotización y la cuenta de cobro muestran un botón y un código QR para pagar.',
      invalid: 'Debe empezar por https:// (o http://)',
      title: 'PAGAR EN LÍNEA',
      cta: 'Escanea el código o abre el link para pagar:'
    },
    en: {
      label: 'Payment link (optional)',
      placeholder: 'https://… (PayPal, Stripe, Square, Zelle page)',
      help: 'If set, quotes and invoices show a button and a QR code to pay.',
      invalid: 'Must start with https:// (or http://)',
      title: 'PAY ONLINE',
      cta: 'Scan the code or open the link to pay:'
    }
  };

  function lang() {
    try {
      const l = global.ArpaI18n?.getLang?.() || global.localStorage?.getItem('arpa_suite_lang') || 'es';
      return l === 'en' ? 'en' : 'es';
    } catch (e) { return 'es'; }
  }
  function t(k) { return (TXT[lang()] || TXT.es)[k]; }

  /** Devuelve la URL normalizada o '' si no es válida (solo http/https). */
  function normalize(raw) {
    let s = String(raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) s = 'https://' + s;
    try {
      const u = new URL(s);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      if (!u.hostname || u.hostname.indexOf('.') < 0) return '';
      return u.href;
    } catch (e) { return ''; }
  }

  function get() {
    try { return normalize(global.localStorage?.getItem(KEY) || ''); } catch (e) { return ''; }
  }
  function set(raw) {
    const url = normalize(raw);
    try {
      if (url) global.localStorage.setItem(KEY, url);
      else global.localStorage.removeItem(KEY);
    } catch (e) { /* almacenamiento no disponible */ }
    render();
    return url;
  }

  function qrDataUrl(url, size) {
    const QR = global.QRCode;
    if (!url || !QR || typeof QR.toDataURL !== 'function') return Promise.resolve(null);
    return QR.toDataURL(url, { width: size || 240, margin: 1, color: { dark: '#1a2a4a', light: '#ffffff' } })
      .catch(() => null);
  }

  // ---------- Configuración ----------
  function injectField() {
    if (typeof document === 'undefined' || document.getElementById(FIELD_ID)) return;
    const anchor = document.getElementById('settings-account-number')?.closest('.field');
    if (!anchor) return;
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML =
      '<label for="' + FIELD_ID + '"></label>' +
      '<input type="url" id="' + FIELD_ID + '" inputmode="url" autocomplete="off" spellcheck="false">' +
      '<small class="paylink-help" style="display:block;font-size:11px;color:var(--muted,#64748b);margin-top:4px;"></small>';
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    const input = wrap.querySelector('input');
    const help = wrap.querySelector('small');
    const paint = () => {
      wrap.querySelector('label').textContent = t('label');
      input.placeholder = t('placeholder');
      const bad = input.value.trim() && !normalize(input.value);
      help.textContent = bad ? t('invalid') : t('help');
      help.style.color = bad ? '#dc2626' : '';
    };
    input.value = get();
    paint();
    input.addEventListener('input', paint);
    input.addEventListener('change', () => { const u = set(input.value); if (u) input.value = u; paint(); });
    input.addEventListener('blur', () => { if (!input.value.trim() || normalize(input.value)) set(input.value); });
  }

  // ---------- Cotización (HTML que se imprime) ----------
  function render() {
    if (typeof document === 'undefined') return;
    const bank = document.getElementById('brand-bank-block');
    if (!bank) return;
    let block = document.getElementById(BLOCK_ID);
    const url = get();
    if (!url) { if (block) block.remove(); return; }
    if (!block) {
      block = document.createElement('div');
      block.id = BLOCK_ID;
      block.className = 'paylink-block';
      block.style.cssText = 'display:flex;gap:12px;align-items:center;margin-top:10px;padding:10px 12px;border:1.5px solid #16a34a;border-radius:10px;background:#f0fdf4;break-inside:avoid;page-break-inside:avoid;';
      bank.parentNode.insertBefore(block, bank.nextSibling);
    }
    block.innerHTML =
      '<img alt="QR" class="paylink-qr" style="width:86px;height:86px;flex:0 0 auto;" />' +
      '<div style="min-width:0;">' +
        '<div class="paylink-title" style="font-weight:800;color:#15803d;font-size:12px;letter-spacing:.5px;"></div>' +
        '<div class="paylink-cta" style="font-size:11px;color:#334155;margin:2px 0;"></div>' +
        '<a target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:700;color:#1d4ed8;word-break:break-all;"></a>' +
      '</div>';
    block.querySelector('.paylink-title').textContent = t('title');
    block.querySelector('.paylink-cta').textContent = t('cta');
    const a = block.querySelector('a');
    a.href = url;
    a.textContent = url;
    const img = block.querySelector('.paylink-qr');
    qrDataUrl(url, 240).then((src) => { if (src) img.src = src; else img.remove(); });
  }

  // ---------- Cuenta de cobro (jsPDF) ----------
  /**
   * Dibuja el recuadro "Pagar en línea" en un jsPDF. Devuelve la nueva y.
   * Uso: y = await ArpaLinkPago.addToPdf(doc, { x: m, y, width: pw - m * 2, pageHeight: ph, margin: m });
   */
  async function addToPdf(doc, o) {
    const url = get();
    if (!url || !doc) return o.y;
    let y = o.y;
    const h = 30;
    if (y + h > o.pageHeight - o.margin) { doc.addPage(); y = o.margin; }
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(22, 163, 74);
    doc.roundedRect(o.x, y, o.width, h, 2, 2, 'FD');
    const qr = await qrDataUrl(url, 240);
    let tx = o.x + 4;
    if (qr) {
      try { doc.addImage(qr, 'PNG', o.x + 3, y + 3, 24, 24); tx = o.x + 31; } catch (e) { /* sin QR */ }
    }
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(t('title'), tx, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(t('cta'), tx, y + 13);
    doc.setTextColor(29, 78, 216);
    const lines = doc.splitTextToSize(url, o.x + o.width - tx - 4).slice(0, 2);
    lines.forEach((ln, i) => {
      if (typeof doc.textWithLink === 'function') doc.textWithLink(ln, tx, y + 19 + i * 4, { url });
      else doc.text(ln, tx, y + 19 + i * 4);
    });
    return y + h + 6;
  }

  function init() {
    injectField();
    render();
  }

  global.ArpaLinkPago = { get, set, normalize, render, addToPdf, KEY };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    // El modal de Configuración y el idioma pueden redibujarse: reintentar sin costo.
    document.addEventListener('click', () => setTimeout(injectField, 0), true);
    global.addEventListener?.('arpa:lang-changed', render);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalize };
})(typeof window !== 'undefined' ? window : globalThis);
