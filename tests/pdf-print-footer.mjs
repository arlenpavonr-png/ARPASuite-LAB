/**
 * Genera PDFs Letter (impresión Chromium y ruta WhatsApp/html2canvas) y rasteriza cada página.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// PDF_MOBILE=1 → simula un celular (412 px). Así se detectó el PDF de WhatsApp cortado (4-oct-2026).
const MOBILE = process.env.PDF_MOBILE === '1';
const OUT = path.join(ROOT, MOBILE ? 'pdf-test-out-mobile' : 'pdf-test-out');
const PORT = 8768;
const BASE = `http://127.0.0.1:${PORT}`;

const LONG_DESC =
  'Motor corredizo 1500 kg para portón residencial de 6 metros con riel de aluminio, fin de carrera y dos controles. Incluye configuración de fuerza y prueba en sitio.';

const THREE_LINE_DESC =
  'Motor corredizo 1500 kg para portón residencial de 6 metros con riel de aluminio y fin de carrera. Incluye dos controles remotos, configuración de fuerza en sitio y prueba de apertura. Garantía de instalación sujeta a polo a tierra y uso según manual del fabricante.';

const SETTINGS = {
  companyName: 'Puertas del Norte SAS',
  nit: '900.111.222-3',
  address: 'Cra 50 #12-34',
  city: 'Bogotá',
  phone: '3001234567',
  website: 'https://puertasdelnorte.example',
  country: 'CO',
  bankName: 'Bancolombia',
  accountType: 'Ahorros',
  accountNumber: '123-456-789',
  accountHolder: 'Puertas del Norte SAS',
  accountHolderDocument: '900.111.222-3',
  technicianName: 'Carlos Ruiz',
  technicianDocument: '10101010',
  technicianCode: '',
  activeOficios: ['automatismos']
};

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.map': 'application/json'
  }[ext] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const file = path.normalize(path.join(ROOT, urlPath.replace(/^[/\\]+/, '')));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime(file) });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function countNeedle(text, needle) {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

function compactText(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ]/gi, '');
}

function hasCompact(hay, needle) {
  return compactText(hay).includes(compactText(needle));
}

function analyzePdfText(allText, labels) {
  const compacted = compactText(allText);
  const footerHits = countNeedle(compacted, compactText('Generado con ARPA Suite'))
    || countNeedle(compacted, compactText('ARPA Technology Global'));
  const missing = [];
  labels.forEach((t) => {
    if (!hasCompact(allText, t)) missing.push(t);
  });
  if (footerHits !== 1) missing.push(`pie x${footerHits} (se espera 1)`);
  return { footerHits, missing };
}

function pageIsFooterOnly(pageText) {
  const hasFooter = hasCompact(pageText, 'Generado con ARPA Suite')
    || hasCompact(pageText, 'ARPA Technology Global');
  const hasBody = hasCompact(pageText, 'Aprobado')
    || hasCompact(pageText, 'Elaborado')
    || hasCompact(pageText, 'Aprobación')
    || hasCompact(pageText, 'PROD-')
    || hasCompact(pageText, 'Subtotal')
    || hasCompact(pageText, 'TOTAL')
    || hasCompact(pageText, 'Términos de Garantía')
    || hasCompact(pageText, 'Observaciones')
    || hasCompact(pageText, 'Datos Bancarios')
    || hasCompact(pageText, 'Instalación');
  return hasFooter && !hasBody;
}

function anyFooterOnlyPage(texts) {
  if (!texts || texts.length < 2) return false;
  return texts.some(pageIsFooterOnly);
}

function lastPageIsFooterOnly(texts) {
  if (!texts || texts.length < 2) return false;
  return pageIsFooterOnly(texts[texts.length - 1] || '');
}

function collectPdfIssues(meta, labels, extraForbidden) {
  const allText = meta.texts.join('\n');
  const checked = analyzePdfText(allText, labels);
  const missing = checked.missing.slice();
  if (hasCompact(allText, 'Garantía – su empresa') || hasCompact(allText, 'Garantia – su empresa')) {
    missing.push('encabezado Garantía – su empresa');
  }
  if (anyFooterOnlyPage(meta.texts) || lastPageIsFooterOnly(meta.texts)) {
    missing.push('página solo con el pie');
  }
  (extraForbidden || []).forEach((n) => {
    if (hasCompact(allText, n)) missing.push('no debía: ' + n);
  });
  return { allText, footerHits: checked.footerHits, missing };
}

function whatsappPdfIssues(debug, pageSize, extra) {
  extra = extra || {};
  const missing = [];
  if (!debug) missing.push('sin meta de cortes');
  const wMm = debug?.pageWidthMm;
  const hMm = debug?.pageHeightMm;
  if (wMm != null && (Math.abs(wMm - 215.9) > 0.8 || Math.abs(hMm - 279.4) > 0.8)) {
    missing.push(`jsPDF=${wMm}x${hMm}mm (se espera Carta)`);
  }
  if (pageSize && (Math.abs(pageSize.width - 612) > 4 || Math.abs(pageSize.height - 792) > 4)) {
    missing.push(`página=${Math.round(pageSize.width)}x${Math.round(pageSize.height)}pt (se espera Carta 612x792)`);
  }
  const eps = 2.5;
  const pageH = debug?.pageCanvasH || 0;
  (debug?.starts || []).slice(1).forEach((cut) => {
    (debug?.ranges || []).forEach((r) => {
      const h = r.bottom - r.top;
      if (cut > r.top + eps && cut < r.bottom - eps && h <= pageH + eps) {
        missing.push(`corte parte ${r.name}`);
      }
    });
  });
  if (debug?.footerOnlyPages?.length) missing.push('página solo con el pie');
  if (debug?.prep && !debug.prep.buscarHidden) missing.push('buscador visible');
  if (debug?.prep && !debug.prep.ivaHidden) missing.push('casilla IVA visible');
  if (debug?.prep && !debug.prep.suiteFooterHidden) missing.push('pie global visible');
  if (debug?.prep && !debug.prep.cotFooterShown) missing.push('pie de cotización oculto');
  if (debug && debug.headerPx != null && debug.headerPx < 40) missing.push('encabezado no capturado');
  if (debug?.prep && debug.prep.headerCaptured === false) missing.push('encabezado no capturado');
  (extra.labels || []).forEach((t) => {
    if (!hasCompact(extra.allText || '', t)) missing.push('falta ' + t);
  });
  return missing;
}

async function resetPrint(page) {
  await page.evaluate(() => {
    document.body.classList.remove('is-printing', 'is-printing-formato');
    window.ArpaBrand?.restoreAfterPrint?.();
    window.ArpaSignature?.restoreAfterPrint?.();
    window.ArpaI18n?.restorePdfSpanish?.();
  });
}

async function assertBogotaDates(browser, clockIso, expected) {
  const context = await browser.newContext({
    timezoneId: 'America/Bogota',
    viewport: { width: 1280, height: 900 }
  });
  await context.addInitScript((settings) => {
    try {
      localStorage.setItem('arpa_suite_license_code', 'ARPA-PRO-PDFTEST');
      localStorage.setItem('arpa_suite_license_plan', 'PRO');
      localStorage.setItem('arpa_suite_license_vencimiento', '2099-12-31');
      localStorage.setItem('arpa_suite_had_paid_license', '1');
      localStorage.setItem('arpa_suite_settings_configured', 'true');
      localStorage.setItem('arpa_suite_user_settings', JSON.stringify(settings));
      localStorage.setItem('arpa_onboarding', 'true');
      localStorage.setItem('arpa_trial_captured', 'true');
      localStorage.setItem('arpa_active_oficios', JSON.stringify(['automatismos']));
    } catch (e) { /* ignore */ }
    document.documentElement.classList.add('license-ok');
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('license-ok');
      const style = document.createElement('style');
      style.textContent = '#license-gate,#onboarding-gate,#trial-capture-gate{display:none!important}html .page,html .main-menu,html .settings-overlay{visibility:visible!important}';
      document.head.appendChild(style);
    });
  }, SETTINGS);
  await context.route('**/*script.google.com/**', (route) => route.abort());
  await context.route('**/service-worker.js', (route) => route.abort());
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  if (page.clock && typeof page.clock.install === 'function') {
    await page.clock.install({ time: new Date(clockIso) });
  }
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await unlockApp(page);
  const info = await page.evaluate(() => {
    const hoy = new Date();
    const cotFechaEl = document.getElementById('cot-fecha');
    const cotValidezEl = document.getElementById('cot-validez');
    if (cotFechaEl) cotFechaEl.value = '';
    if (cotValidezEl) cotValidezEl.value = '';
    if (cotFechaEl) cotFechaEl.value = window.fechaLocalISO(hoy);
    if (cotValidezEl) {
      const v = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15);
      cotValidezEl.value = window.fechaLocalISO(v);
    }
    window.ArpaCuentaCobro?.limpiarFormulario?.();
    return {
      local: window.fechaLocalISO(hoy),
      utc: hoy.toISOString().slice(0, 10),
      cot: document.getElementById('cot-fecha')?.value || '',
      cc: document.getElementById('cc-fecha-emision')?.value || '',
      hours: hoy.getHours(),
      minutes: hoy.getMinutes()
    };
  });
  await context.close();
  if (info.cot !== expected || info.cc !== expected || info.local !== expected) {
    throw new Error(
      `fecha ${clockIso}: local=${info.local} cot=${info.cot} cc=${info.cc} utc=${info.utc} reloj=${info.hours}:${String(info.minutes).padStart(2, '0')} esperado=${expected}`
    );
  }
  return info;
}

function productCatalog(count, options) {
  options = options || {};
  const desc = options.desc || LONG_DESC;
  const allLong = !!options.allLong;
  const filas = [];
  for (let i = 1; i <= count; i += 1) {
    const long = allLong || i === 2 || i === 4 || i === count;
    filas.push({
      cod: `P-${String(i).padStart(2, '0')}`,
      nom: long
        ? `PROD-${String(i).padStart(2, '0')} ${desc}`
        : `PROD-${String(i).padStart(2, '0')} Kit de riel corto`,
      pvp: 150000 + i * 10000,
      cant: i % 3 === 0 ? 2 : 1,
      tipo: 'producto'
    });
  }
  return filas;
}

async function unlockApp(page) {
  await page.evaluate(() => {
    document.documentElement.classList.add('license-ok');
    document.documentElement.classList.remove('license-checking');
    const gate = document.getElementById('license-gate');
    if (gate) {
      gate.style.setProperty('display', 'none', 'important');
      gate.setAttribute('hidden', '');
    }
  });
  await page.waitForFunction(() => typeof window.ArpaCotizacion?.loadCotizacion === 'function', null, { timeout: 20000 });
}

async function drawInk(page, canvasId) {
  await page.evaluate((id) => {
    const canvas = document.getElementById(id);
    if (!canvas) throw new Error('no canvas ' + id);
    window.ArpaSignature?.initCanvas?.(id);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0f2044';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.lineTo(220, 40);
    ctx.lineTo(360, 110);
    ctx.stroke();
  }, canvasId);
}

async function assertPrintLayout(page, { view, rowSelector, extraSelectors, labels }) {
  const report = await page.evaluate(({ rowSelector, extraSelectors, labels }) => {
    const isFormato = document.body.classList.contains('is-printing-formato');
    const cotFt = document.getElementById('cot-print-footer');
    const suiteFt = document.getElementById('suite-footer');
    const cotVisible = !!(cotFt && getComputedStyle(cotFt).display !== 'none' && cotFt.getBoundingClientRect().height > 1);
    const footer = (!isFormato && cotVisible) ? cotFt : suiteFt;
    const cs = footer ? getComputedStyle(footer) : null;
    const footerBox = footer ? {
      left: footer.getBoundingClientRect().left,
      right: footer.getBoundingClientRect().right,
      top: footer.getBoundingClientRect().top,
      bottom: footer.getBoundingClientRect().bottom
    } : null;
    const overlaps = [];
    const check = (el, name) => {
      if (!el || !footerBox) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const hit = r.left < footerBox.right && r.right > footerBox.left && r.top < footerBox.bottom && r.bottom > footerBox.top;
      if (hit) overlaps.push({ name, top: r.top, bottom: r.bottom, footerTop: footerBox.top });
    };
    document.querySelectorAll(rowSelector).forEach((el, i) => check(el, 'row-' + i));
    extraSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => check(el, sel));
    });
    const pageText = (document.querySelector('.page')?.innerText || document.body.textContent || '').toUpperCase();
    const missing = labels.filter((t) => !pageText.includes(String(t).toUpperCase()));
    const rowCount = document.querySelectorAll(rowSelector).length;
    return {
      footerPosition: cs ? cs.position : 'missing',
      footerTop: footerBox && footerBox.top,
      overlaps,
      missing,
      rowCount,
      sample: (document.querySelector('.page')?.innerText || '').slice(0, 240),
      footerOnce: (pageText.split('GENERADO CON ARPA SUITE').length - 1)
    };
  }, { rowSelector, extraSelectors, labels });

  if (report.footerPosition !== 'static' && report.footerPosition !== 'relative') {
    throw new Error(`[${view}] pie position=${report.footerPosition}, se esperaba static`);
  }
  if (report.overlaps.length) {
    throw new Error(`[${view}] superposición con el pie: ${JSON.stringify(report.overlaps, null, 2)}`);
  }
  if (report.missing.length) {
    throw new Error(`[${view}] faltan textos en el layout: ${report.missing.join(', ')} | rows=${report.rowCount} | sample=${JSON.stringify(report.sample)}`);
  }
  return report;
}

async function extractPdfTextAndPngs(page, pdfBuffer, stem) {
  const pdfjsPath = '/node_modules/pdfjs-dist/build/pdf.mjs';
  const workerPath = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
  await page.goto(`${BASE}/tests/pdf-raster.html`, { waitUntil: 'domcontentloaded' });
  const b64 = pdfBuffer.toString('base64');
  const meta = await page.evaluate(async ({ b64, pdfjsPath, workerPath }) => {
    const pdfjs = await import(pdfjsPath);
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    window.__pdfDoc = doc;
    window.__pdfjs = pdfjs;
    const texts = [];
    let width = 0;
    let height = 0;
    for (let i = 1; i <= doc.numPages; i += 1) {
      const p = await doc.getPage(i);
      const content = await p.getTextContent();
      texts.push(content.items.map((it) => it.str).join(' '));
      if (i === 1) {
        const vp = p.getViewport({ scale: 1 });
        width = vp.width;
        height = vp.height;
      }
    }
    return { pages: doc.numPages, texts, width, height };
  }, { b64, pdfjsPath, workerPath });

  for (let i = 1; i <= meta.pages; i += 1) {
    const size = await page.evaluate(async (n) => {
      const p = await window.__pdfDoc.getPage(n);
      const viewport = p.getViewport({ scale: 2 });
      const canvas = document.getElementById('c');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await p.render({ canvasContext: ctx, viewport }).promise;
      return { w: canvas.width, h: canvas.height };
    }, i);
    await page.setViewportSize({
      width: Math.max(400, Math.ceil(size.w)),
      height: Math.max(400, Math.ceil(size.h))
    });
    const file = path.join(OUT, `${stem}-p${String(i).padStart(2, '0')}.png`);
    await page.locator('#c').screenshot({ path: file, type: 'png' });
  }
  return meta;
}

async function makePdf(page) {
  await page.emulateMedia({ media: 'print' });
  return page.pdf({
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true
  });
}

async function fillCotizacion(page, productCount, extra) {
  extra = extra || {};
  const filas = productCatalog(productCount, { allLong: extra.allLong, desc: extra.desc });
  const names = filas.map((_, i) => `PROD-${String(i + 1).padStart(2, '0')}`);
  await page.evaluate(({ filas, settings, extra }) => {
    window.openCotizacionView();
    window.ArpaCotizacion.loadCotizacion({
      numero: 'AP-TEST-' + filas.length,
      cliente: 'Cliente PDF Test',
      ciudad: 'Bogotá',
      fecha: '2026-09-30',
      nit: '900.111.222-3',
      tel: '3001234567',
      email: extra.email === undefined ? 'cliente@test.com' : extra.email,
      filas,
      cobros: [{ desc: 'Instalación', nom: 'Instalación', value: 180000, pvp: 180000, userEdited: true }]
    });
    const obs = document.getElementById('cot-obs');
    if (obs) {
      obs.value = extra.obs === undefined
        ? 'Observación de prueba: revisar riel y fin de carrera en sitio.'
        : extra.obs;
    }
    const iva = document.getElementById('iva-check-cot');
    if (iva) iva.checked = !!extra.iva;
    const elab = document.getElementById('cot-elaborado-nombre');
    if (elab) elab.value = settings.technicianName;
    const tel = document.getElementById('cot-elaborado-tel');
    if (tel) tel.value = settings.phone;
    const firmaCliente = document.querySelector('#view-cotizacion .firma-name');
    if (firmaCliente) firmaCliente.value = extra.firmaCliente === undefined ? 'Cliente PDF Test' : extra.firmaCliente;
    window.applyUserSettingsToUI?.();
    window.ArpaCotizacion.renderTablaCot();
    window.ArpaCotizacion.recalcularCotizacion();
  }, { filas, settings: SETTINGS, extra });
  await drawInk(page, 'canvas-cot-cliente');
  await drawInk(page, 'canvas-cot-elaborado');
  return names;
}

async function printCotizacion(page) {
  await page.evaluate(() => {
    window.print = () => {};
    window.guardarCotPDF();
  });
  await page.waitForFunction(() => document.body.classList.contains('is-printing'));
}

// Cuenta de Cobro no usa window.print: genera el PDF con jsPDF (renderCcToPdf).
// Un caso page.pdf + is-printing no representa la app real; no se prueba aquí.

async function fillFormato(page) {
  await page.evaluate(() => {
    window.scrollToTopMenu();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('formato-cliente-nombre', 'Cliente Formato Completo');
    set('formato-cliente-nit', '900.111.222-3');
    set('formato-cliente-tel', '3001234567');
    set('formato-cliente-direccion', 'Cra 7 # 12-34 Conjunto Alameda');
    set('formato-cliente-ciudad', 'Bogotá');
    set('formato-fecha', '2026-09-30');
    set('campo-tecnico-responsable', 'Carlos Ruiz');
    document.getElementById('c1').checked = true;
    document.querySelectorAll('#formato-medidas-section input').forEach((el, i) => {
      el.value = i < 4 ? '3.20' : (i === 4 ? '280' : 'Hierro');
    });
    const marca = document.getElementById('sel-marca');
    if (marca && marca.options.length > 1) marca.selectedIndex = 1;
    document.querySelectorAll('#formato-section-observaciones input').forEach((el, i) => {
      el.value = `Obs formato ${i + 1}: riel alineado y lubricado.`;
    });
    set('campo-tecnico-firma', 'Carlos Ruiz');
  });
  await drawInk(page, 'canvas-firma-cliente');
  await drawInk(page, 'canvas-firma-tecnico');
}

async function printFormato(page) {
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.evaluate(() => window.guardarPDF());
  await page.waitForFunction(() => document.body.classList.contains('is-printing-formato'), null, { timeout: 10000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
}

async function run() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { headless: true, executablePath: process.env.PW_CHROMIUM } : { headless: true }
  );
  const results = [];
  const failures = [];

  const context = await browser.newContext(MOBILE
    ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 1600 } });
  await context.addInitScript((settings) => {
    try {
      localStorage.setItem('arpa_suite_license_code', 'ARPA-PRO-PDFTEST');
      localStorage.setItem('arpa_suite_license_plan', 'PRO');
      localStorage.setItem('arpa_suite_license_vencimiento', '2099-12-31');
      localStorage.setItem('arpa_suite_had_paid_license', '1');
      localStorage.setItem('arpa_suite_settings_configured', 'true');
      localStorage.setItem('arpa_suite_user_settings', JSON.stringify(settings));
      localStorage.setItem('arpa_onboarding', 'true');
      localStorage.setItem('arpa_trial_captured', 'true');
      localStorage.setItem('arpa_active_oficios', JSON.stringify(['automatismos']));
    } catch (e) { /* ignore */ }
    document.documentElement.classList.add('license-ok');
    const keepUnlocked = () => document.documentElement.classList.add('license-ok');
    keepUnlocked();
    document.addEventListener('DOMContentLoaded', () => {
      keepUnlocked();
      const style = document.createElement('style');
      style.textContent = '#license-gate,#onboarding-gate,#trial-capture-gate{display:none!important}html .page,html .main-menu,html .settings-overlay{visibility:visible!important}html.onboarding-active .page{visibility:visible!important}';
      document.head.appendChild(style);
    });
    setInterval(keepUnlocked, 250);
  }, SETTINGS);
  await context.route('**/*script.google.com/**', (route) => route.abort());
  await context.route('**/service-worker.js', (route) => route.abort());

  const rasterPage = await context.newPage();
  const work = await context.newPage();
  work.on('dialog', (d) => d.dismiss());

  async function loadApp() {
    await work.emulateMedia({ media: 'screen' });
    await work.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlockApp(work);
  }

  try {
    const cotLayoutSelectors = [
      '#view-cotizacion .totales-box',
      '#view-cotizacion .cot-bank-section',
      '#view-cotizacion .section:has(#cot-obs)',
      '#view-cotizacion .nota-cot',
      '#view-cotizacion .nota',
      '#view-cotizacion .garantia',
      '#view-cotizacion .firmas'
    ];

    async function recordCotPdf(stem, names, extraLabels, extraForbidden) {
      const labels = extraLabels || ['Subtotal', 'TOTAL', 'Datos Bancarios', 'Observaciones', 'Nota', 'Instalación', ...names];
      const layout = await assertPrintLayout(work, {
        view: stem,
        rowSelector: '#view-cotizacion .tabla-productos tbody tr:not(.empty-row)',
        extraSelectors: cotLayoutSelectors,
        labels
      });
      const pdf = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const issues = collectPdfIssues(meta, labels, extraForbidden);
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), issues.allText);
      const missing = issues.missing;
      if (layout.overlaps.length) missing.push('contenido bajo el pie');
      const ok = missing.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits: issues.footerHits,
        layoutOverlaps: layout.overlaps.length,
        missing,
        ok
      });
      if (!ok) failures.push(`${stem}: ${missing.join(', ')}`);
      await resetPrint(work);
      return meta;
    }

    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (const n of counts) {
      await loadApp();
      const stem = `cot-${n}`;
      const names = await fillCotizacion(work, n);
      await printCotizacion(work);
      await recordCotPdf(stem, names);
    }

    for (const n of [4, 6]) {
      await loadApp();
      const stem = `cot-${n}-3lineas`;
      const names = await fillCotizacion(work, n, { allLong: true, desc: THREE_LINE_DESC });
      await printCotizacion(work);
      await recordCotPdf(stem, names);
    }

    {
      await loadApp();
      const stem = 'formato-completo';
      await fillFormato(work);
      await printFormato(work);
      const layout = await assertPrintLayout(work, {
        view: stem,
        rowSelector: '#view-formato .dims-table tbody tr, #view-formato .dims-extra tbody tr',
        extraSelectors: [
          '#view-formato #formato-section-observaciones',
          '#view-formato .nota',
          '#view-formato .firmas'
        ],
        labels: ['Cliente Formato Completo', 'Observaciones', 'Nota']
      });
      const pdf = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const allText = meta.texts.join('\n');
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), allText);
      const checked = analyzePdfText(allText, ['Cliente Formato Completo', 'Observaciones', 'Nota']);
      const missing = checked.missing;
      if (anyFooterOnlyPage(meta.texts)) missing.push('página solo con el pie');
      const footerHits = checked.footerHits;
      const ok = missing.length === 0 && layout.overlaps.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits,
        layoutOverlaps: layout.overlaps.length,
        missing,
        ok
      });
      if (!ok) failures.push(`${stem}: ${missing.join(', ') || 'overlap'}`);
    }

    {
      await loadApp();
      const night = await assertBogotaDates(browser, '2026-09-30T20:30:00-05:00', '2026-09-30');
      const morning = await assertBogotaDates(browser, '2026-09-30T08:00:00-05:00', '2026-09-30');
      results.push({
        doc: 'fecha-bogota-20:30',
        pages: 0,
        footerHits: 1,
        layoutOverlaps: 0,
        missing: [],
        ok: true,
        utcWouldHaveBeen: night.utc
      });
      results.push({
        doc: 'fecha-bogota-08:00',
        pages: 0,
        footerHits: 1,
        layoutOverlaps: 0,
        missing: [],
        ok: true,
        utcWouldHaveBeen: morning.utc
      });
    }

    {
      await loadApp();
      const stem = 'cot-4-iva-obs';
      const names = await fillCotizacion(work, 4, { iva: true });
      await printCotizacion(work);
      const layout = await assertPrintLayout(work, {
        view: stem,
        rowSelector: '#view-cotizacion .tabla-productos tbody tr:not(.empty-row)',
        extraSelectors: [
          '#view-cotizacion .totales-box',
          '#view-cotizacion .garantia',
          '#cot-nota-requisitos',
          '#view-cotizacion .section:has(#cot-obs)',
          '#view-cotizacion .firmas'
        ],
        labels: ['IVA', 'Términos de Garantía', 'polo a tierra', 'Observaciones', 'Aprobación', ...names]
      });
      const pdf = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const allText = meta.texts.join('\n');
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), allText);
      const issues = collectPdfIssues(meta, [
        'IVA', 'Términos de Garantía', 'polo a tierra', 'Observaciones', 'Aprobación', 'Instalación', ...names
      ], ['Incluir IVA', 'Buscar y agregar productos']);
      if (layout.overlaps.length) issues.missing.push('contenido bajo el pie');
      const ok = issues.missing.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits: issues.footerHits,
        layoutOverlaps: layout.overlaps.length,
        missing: issues.missing,
        ok
      });
      if (!ok) failures.push(`${stem}: ${issues.missing.join(', ') || 'overlap'}`);
      await resetPrint(work);
    }

    {
      await loadApp();
      const stem = 'cot-4-vacio-sin-iva';
      const names = await fillCotizacion(work, 4, {
        iva: false,
        obs: '',
        email: '',
        firmaCliente: ''
      });
      await printCotizacion(work);
      const pdf = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const allText = meta.texts.join('\n');
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), allText);
      const issues = collectPdfIssues(meta, ['Términos de Garantía', 'polo a tierra', ...names], [
        'correo@ejemplo.com',
        'Especificaciones adicionales',
        'Incluir IVA',
        'Buscar y agregar productos',
        'Nombre completo'
      ]);
      const ok = issues.missing.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits: issues.footerHits,
        layoutOverlaps: 0,
        missing: issues.missing,
        ok
      });
      if (!ok) failures.push(`${stem}: ${issues.missing.join(', ')}`);
      await resetPrint(work);
    }

    {
      await loadApp();
      await work.evaluate(() => {
        const s = window.ArpaBrand.getSettings();
        window.ArpaBrand.saveSettings({ ...s, warrantyTerms: 'Garantía de prueba 6 meses' });
        window.applyUserSettingsToUI();
      });
      const stem = 'cot-garantia-custom';
      await fillCotizacion(work, 2, { iva: false });
      await printCotizacion(work);
      const pdf = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const allText = meta.texts.join('\n');
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), allText);
      const issues = collectPdfIssues(meta, ['Garantía de prueba 6 meses'], ['mano de obra es de 1 año', 'Labor warranty is 1 year']);
      const ok = issues.missing.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits: issues.footerHits,
        layoutOverlaps: 0,
        missing: issues.missing,
        ok
      });
      if (!ok) failures.push(`${stem}: ${issues.missing.join(', ')}`);
      await resetPrint(work);
    }

    {
      await loadApp();
      await work.evaluate(() => {
        const s = window.ArpaBrand.getSettings();
        window.ArpaBrand.saveSettings({ ...s, warrantyTerms: 'Garantía de prueba 6 meses' });
        window.applyUserSettingsToUI();
      });
      await fillFormato(work);
      await printFormato(work);
      const stemF = 'formato-garantia-custom';
      const pdfF = await makePdf(work);
      fs.writeFileSync(path.join(OUT, `${stemF}.pdf`), pdfF);
      const metaF = await extractPdfTextAndPngs(rasterPage, pdfF, stemF);
      const allF = metaF.texts.join('\n');
      fs.writeFileSync(path.join(OUT, `${stemF}-text.txt`), allF);
      const issuesF = collectPdfIssues(metaF, ['Garantía de prueba 6 meses']);
      const okF = issuesF.missing.length === 0;
      results.push({
        doc: stemF,
        pages: metaF.pages,
        footerHits: issuesF.footerHits,
        layoutOverlaps: 0,
        missing: issuesF.missing,
        ok: okF
      });
      if (!okF) failures.push(`${stemF}: ${issuesF.missing.join(', ')}`);
    }

    async function recordWhatsAppPdf(stem, extraFill) {
      extraFill = extraFill || {};
      await loadApp();
      const names = await fillCotizacion(work, extraFill.count, {
        iva: extraFill.iva !== false,
        allLong: extraFill.allLong,
        desc: extraFill.desc
      });
      await work.waitForFunction(() => typeof window.html2canvas === 'function' && typeof window.ArpaCotizacion?.generarCotPdfFile === 'function', null, { timeout: 20000 });
      work.setDefaultTimeout(180000);
      const payload = await work.evaluate(async () => {
        try {
          const file = await window.ArpaCotizacion.generarCotPdfFile();
          if (!file) return { error: 'generarCotPdfFile devolvió null' };
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          return {
            b64: btoa(bin),
            name: file.name,
            debug: window.__arpaCotWhatsAppPdf || null
          };
        } catch (err) {
          return { error: String(err && err.stack || err && err.message || err) };
        }
      });
      if (!payload || payload.error || !payload.b64) {
        const why = payload?.error || 'no se generó el File';
        results.push({
          doc: stem,
          pages: 0,
          footerHits: 0,
          layoutOverlaps: 0,
          missing: [why],
          ok: false
        });
        failures.push(`${stem}: ${why}`);
        return;
      }
      const pdf = Buffer.from(payload.b64, 'base64');
      fs.writeFileSync(path.join(OUT, `${stem}.pdf`), pdf);
      const meta = await extractPdfTextAndPngs(rasterPage, pdf, stem);
      const allText = (meta.texts || []).join('\n');
      fs.writeFileSync(path.join(OUT, `${stem}-text.txt`), allText);
      const missing = whatsappPdfIssues(payload.debug, { width: meta.width, height: meta.height }, {
        allText,
        labels: [SETTINGS.companyName, SETTINGS.nit, 'AP-TEST-' + extraFill.count]
      });
      if (!names.length) missing.push('sin productos');
      const ok = missing.length === 0;
      results.push({
        doc: stem,
        pages: meta.pages,
        footerHits: payload.debug?.prep?.cotFooterShown ? 1 : 0,
        layoutOverlaps: (payload.debug?.footerOnlyPages || []).length,
        missing,
        ok,
        pagePt: `${Math.round(meta.width || 0)}x${Math.round(meta.height || 0)}`
      });
      if (!ok) failures.push(`${stem}: ${missing.join(', ')}`);
    }

    const waCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (const n of waCounts) {
      await recordWhatsAppPdf(`whatsapp-cot-${n}`, { count: n, iva: true });
    }
    for (const n of [4, 6]) {
      await recordWhatsAppPdf(`whatsapp-cot-${n}-3lineas`, {
        count: n,
        iva: true,
        allLong: true,
        desc: THREE_LINE_DESC
      });
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }

  const summary = { ok: failures.length === 0, failures, results };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(summary, null, 2));
  const lines = [
    'Resultado pruebas PDF (Letter: Guardar PDF + WhatsApp html2canvas)',
    summary.ok ? 'OK: ningún contenido quedó bajo el pie; el texto del pie aparece una vez.' : 'FALLÓ: ' + failures.join(' | '),
    ...results.map((r) => `${r.doc}: páginas=${r.pages} pie=${r.footerHits} overlaps=${r.layoutOverlaps}${r.pagePt ? ' size=' + r.pagePt : ''} ${r.ok ? 'OK' : 'FAIL ' + r.missing.join(',')}`)
  ];
  fs.writeFileSync(path.join(OUT, 'RESULTADO.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  if (failures.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
