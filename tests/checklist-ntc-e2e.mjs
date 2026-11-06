/**
 * E2E en navegador local: Lista de verificación NTC 5926-3 en el Formato de Servicio.
 * Abre index.html?labdemo=1 en 127.0.0.1 (servidor estático local), bloquea toda petición
 * a otro host, llena una puerta seccional con 2 "No cumple", guarda / recupera el borrador
 * y genera el PDF con la impresión real de la app (guardarPDF → window.print).
 *
 * Uso: node tests/checklist-ntc-e2e.mjs [ruta-del-pdf] [ruta-captura-celular.png]
 * Requiere Chrome instalado y puppeteer-core (está en next/node_modules).
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'next', 'package.json'));
const puppeteer = require('puppeteer-core');

const PORT = Number(process.env.NTC_PORT || 8765);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT_PDF = process.argv[2] || path.join(root, 'tmp-pdf-verify', 'checklist-ntc.pdf');
const OUT_SHOT = process.argv[3] || OUT_PDF.replace(/\.pdf$/i, '-celular.png');
const chrome = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && fs.existsSync(p));

function assert(cond, msg) {
  if (!cond) throw new Error('FALLO: ' + msg);
  console.log('  ok -', msg);
}

// Foto de prueba generada en el navegador (sin archivos externos).
const PHOTO_JS = `(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240;
  const g = c.getContext('2d'); g.fillStyle = '#8a9bb0'; g.fillRect(0, 0, 320, 240);
  g.fillStyle = '#c0392b'; g.fillRect(40, 60, 240, 30); g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif';
  g.fillText('Cable con hilos rotos', 45, 160); return c.toDataURL('image/jpeg', 0.7); })()`;

async function waitServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const r = await fetch(ORIGIN + '/index.html');
      if (r.ok) return;
    } catch (e) { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('no arrancó el servidor local');
}

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  await waitServer();
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const blocked = new Set();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:')) req.continue();
    else { blocked.add(new URL(url).host); req.abort(); }
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('arpa_lab_demo', '1'); } catch (e) { /* ignore */ }
  });

  console.log('1) Abrir el formato (demo del LAB)');
  await page.goto(ORIGIN + '/index.html?labdemo=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.ArpaChecklistNtc && document.querySelector('#formato-checklist-ntc-section [data-ntc="toggle"]'));
  await page.evaluate(() => { document.getElementById('t2').checked = true; document.getElementById('t2').dispatchEvent(new Event('change', { bubbles: true })); });
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('formato-cliente-nombre', 'IECM — Bodega industrial (ejemplo)');
    set('formato-cliente-ciudad', 'Medellín');
    set('formato-cliente-direccion', 'Muelle 3, bodega principal');
    set('campo-tecnico-responsable', 'Técnico de ejemplo');
    const c5 = document.getElementById('c5');
    if (c5 && !c5.checked) { c5.checked = true; c5.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  const visible = await page.$eval('#formato-checklist-ntc-section', (el) => !el.hidden);
  assert(visible, 'la sección aparece en Automatismos');

  console.log('2) Activar / desactivar');
  await page.click('#formato-checklist-ntc-section .ntc-switch');
  let st = await page.evaluate(() => window.ArpaChecklistNtc.getState());
  assert(st.enabled === true, 'el interruptor la activa');
  assert(st.tipo === 'seccional', 'toma el tipo de puerta marcado arriba (Seccional)');
  await page.click('#formato-checklist-ntc-section .ntc-switch');
  st = await page.evaluate(() => window.ArpaChecklistNtc.getState());
  assert(st.enabled === false && !(await page.$('.ntc-item')), 'el interruptor la apaga y esconde los puntos');
  await page.click('#formato-checklist-ntc-section .ntc-switch');

  console.log('3) Cambiar tipo de puerta');
  await page.select('#formato-checklist-ntc-section select[data-ntc="tipo"]', 'corrediza');
  let n = await page.$$eval('.ntc-item', (els) => els.length);
  assert(n === 21, 'corrediza: 21 puntos (16 comunes + 5)');
  await page.select('#formato-checklist-ntc-section select[data-ntc="tipo"]', 'seccional');
  n = await page.$$eval('.ntc-item', (els) => els.length);
  assert(n === 23, 'seccional: 23 puntos (16 comunes + 7)');

  console.log('4) Marcar puntos con los botones');
  const items = await page.$$eval('.ntc-item', (els) => els.map((e) => e.getAttribute('data-item')));
  const NO = { com_fotocelda: 'La fotocelda del lado derecho no detecta; limpiar o cambiar.', sec_cables: 'Cable derecho con hilos rotos; cambiar los dos cables.' };
  const NA = ['com_bateria', 'com_borde'];
  const progress = () => page.$eval('[data-ntc-progress]', (el) => ({
    text: el.innerText.replace(/\s+/g, ' '),
    ok: el.querySelector('[data-count="ok"]').textContent, no: el.querySelector('[data-count="no"]').textContent,
    na: el.querySelector('[data-count="na"]').textContent,
  }));
  let shotTaken = false;
  for (const [i, id] of items.entries()) {
    const v = NO[id] ? 'no' : NA.includes(id) ? 'na' : 'ok';
    await page.$eval(`.ntc-item[data-item="${id}"] [data-v="${v}"]`, (b) => { b.scrollIntoView({ block: 'center' }); b.click(); });
    if (NO[id]) {
      const openNo = await page.$eval(`.ntc-item[data-item="${id}"]`, (el) => ({
        box: !!el.querySelector('.ntc-extra-no textarea[data-ntc="obs"]'), foto: !!el.querySelector('.ntc-extra-no [data-ntc="foto"]'),
        stripe: getComputedStyle(el).borderLeftColor,
      }));
      assert(openNo.box && openNo.foto, `"No cumple" abre observación y foto (${id})`);
      assert(openNo.stripe === 'rgb(220, 38, 38)', 'franja roja a la izquierda de la tarjeta');
      await page.type(`.ntc-item[data-item="${id}"] [data-ntc="obs"]`, NO[id]);
    }
    if (i === 5 && !shotTaken) {
      // Captura del celular con algunos puntos marcados (6 de 23).
      shotTaken = true;
      const pr = await progress();
      assert(pr.text.includes('6 de 23 revisados') && pr.ok === '✓ 4' && pr.no === '✗ 1' && pr.na === 'N/A 1', 'progreso y contadores a mitad de camino: ' + pr.text);
      const btnH = await page.$eval('.ntc-btn', (b) => b.getBoundingClientRect().height);
      assert(btnH >= 44, 'botones de al menos 44 px de alto (' + Math.round(btnH) + ' px)');
      // Pantalla más alta (mismo ancho de 390 px) para que se vea la tarjeta roja completa.
      await page.setViewport({ width: 390, height: 1240, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await page.$eval('[data-ntc-progress]', (el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -12));
      fs.mkdirSync(path.dirname(OUT_SHOT), { recursive: true });
      await page.screenshot({ path: OUT_SHOT });
      console.log('  captura del celular:', OUT_SHOT);
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    }
  }
  const okToggle = await page.$eval('.ntc-item[data-item="com_senal"] [data-v="ok"]', (b) => b.getAttribute('aria-pressed'));
  assert(okToggle === 'true', 'botón elegido queda marcado');
  const photo = await page.evaluate(PHOTO_JS);
  await page.evaluate((src) => window.ArpaChecklistNtc.setItem('sec_cables', { foto: src }), photo);
  const pr0 = await progress();
  assert(pr0.text.includes('23 de 23 revisados') && pr0.ok === '✓ 19' && pr0.no === '✗ 2' && pr0.na === 'N/A 2', 'contadores en pantalla: 19 / 2 / 2');
  const sumText = await page.$eval('[data-ntc-summary]', (el) => el.innerText);
  assert(sumText.includes('Cable derecho con hilos rotos'), 'abajo se listan los "No cumple" con la observación');
  // Tocar de nuevo desmarca.
  await page.$eval('.ntc-item[data-item="com_paro"] [data-v="ok"]', (b) => b.click());
  assert((await progress()).text.includes('22 de 23 revisados'), 'tocar de nuevo desmarca y el progreso baja');
  await page.$eval('.ntc-item[data-item="com_paro"] [data-v="ok"]', (b) => b.click());
  // "+ Nota o foto" en un punto que cumple.
  await page.$eval('.ntc-item[data-item="com_zona"] [data-ntc="more"]', (b) => b.click());
  assert(!!(await page.$('.ntc-item[data-item="com_zona"] .ntc-extra-soft [data-ntc="obs"]')), '"+ Nota o foto" abre la nota en un punto que cumple');

  console.log('5) Guardar y recuperar (borrador)');
  await new Promise((r) => setTimeout(r, 700));
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem(window.ArpaBrand.FORMATO_DRAFT_KEY) || '{}'));
  assert(draft._checklistNtc && draft._checklistNtc.enabled && draft._checklistNtc.tipo === 'seccional', 'el borrador guarda la lista');
  assert(draft._checklistNtc.items.sec_cables.foto.startsWith('data:image/'), 'el borrador guarda la foto del punto');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.ntc-item').length === 23);
  st = await page.evaluate(() => window.ArpaChecklistNtc.getState());
  assert(st.items.com_fotocelda.r === 'no' && st.items.com_fotocelda.obs.startsWith('La fotocelda'), 'al recargar la app se recupera todo');
  const pressed = await page.$$eval('.ntc-btn[aria-pressed="true"]', (els) => els.length);
  assert(pressed === 23, 'los 23 botones marcados se ven al recuperar');

  console.log('6) Historial: guardar y abrir el informe');
  await page.evaluate(() => { document.getElementById('numero-formato').value = '0001'; });
  const recId = await page.evaluate(() => {
    window.ArpaHistorial.captureFromFormato();
    const recs = JSON.parse(localStorage.getItem('arpa_suite_servicio_historial') || '[]');
    const r = recs.find((x) => x.fullSnapshot && x.fullSnapshot._checklistNtc);
    return r ? r.id : null;
  });
  assert(!!recId, 'el informe queda en el historial con su lista');
  await page.evaluate(() => window.clearFormatoForm());
  st = await page.evaluate(() => window.ArpaChecklistNtc.getState());
  assert(st.enabled === false && Object.keys(st.items).length === 0, 'formato nuevo: la lista arranca apagada y vacía');
  await page.evaluate((id) => window.ArpaHistorial.verDocumento(id), recId);
  await page.waitForFunction(() => window.ArpaChecklistNtc.getState().enabled === true, { timeout: 5000 });
  st = await page.evaluate(() => window.ArpaChecklistNtc.getState());
  assert(st.tipo === 'seccional' && st.items.sec_cables.r === 'no', 'abrir el informe desde el historial recupera la lista');

  console.log('7) PDF (impresión real de la app)');
  // Firma del cliente (la app la exige para el PDF).
  const canvas = await page.$('#canvas-firma-cliente');
  await canvas.evaluate((c) => c.scrollIntoView({ block: 'center' }));
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  for (let i = 1; i <= 12; i += 1) await page.mouse.move(box.x + 20 + i * 18, box.y + 30 + (i % 2) * 25);
  await page.mouse.up();
  await page.evaluate(() => {
    window.__ntcPrinted = new Promise((resolve) => { window.print = () => resolve(true); });
    window.__ntcAfterPrint = () => window.dispatchEvent(new Event('afterprint'));
  });
  await page.evaluate(() => window.guardarPDF());
  await page.evaluate(() => window.__ntcPrinted);
  const pr = await page.evaluate(() => {
    const sec = document.getElementById('formato-checklist-ntc-section');
    const t = sec.querySelector('[data-ntc-print]');
    return {
      title: sec.querySelector('[data-ntc-title]').textContent,
      rows: t.querySelectorAll('.ntc-pr-row').length,
      no: t.querySelectorAll('.ntc-pr-row.ntc-pr-no').length,
      reco: !!t.querySelector('.ntc-pr-reco'),
      nota: t.querySelector('.ntc-pr-nota')?.textContent || '',
      fotos: t.querySelectorAll('.ntc-pr-foto img').length,
      verdict: t.querySelector('.ntc-pr-verdict')?.getAttribute('data-verdict'),
      verdictText: t.querySelector('.ntc-pr-verdict')?.textContent || '',
      cells: t.querySelectorAll('.ntc-pr-cell').length,
      cellsNo: [...t.querySelectorAll('.ntc-pr-cell.ntc-pr-cell-no')].map((c) => c.textContent),
      shown: getComputedStyle(t).display !== 'none',
      editorHiddenInPrint: true,
    };
  });
  assert(pr.title === 'Lista de verificación basada en la NTC 5926-3', 'título del PDF');
  assert(pr.rows === 23 && pr.no === 2, 'tabla del PDF: 23 filas, 2 "No cumple" resaltados');
  assert(pr.reco, 'recomendaciones con los "No cumple"');
  assert(pr.nota.includes('no reemplaza la norma'), 'nota de responsabilidad');
  assert(pr.fotos === 1, 'foto del punto en el PDF');
  assert(pr.verdict === 'no' && pr.verdictText.includes('REQUIERE ATENCIÓN') && pr.verdictText.includes('19 ✓ · 2 ✗ · 2 N/A'), 'veredicto rojo con la cuenta');
  assert(pr.cells === 23 && pr.cellsNo.join('|') === '4Fotocelda|17Cables', 'cuadrícula: 23 cuadritos, rojos Fotocelda y Cables');
  assert(pr.shown, 'la tabla se muestra al imprimir');
  await page.emulateMediaType('print');
  const editorPrintDisplay = await page.$eval('#formato-checklist-ntc-section [data-ntc-editor]', (el) => getComputedStyle(el).display);
  assert(editorPrintDisplay === 'none', 'los botones del editor no salen en el PDF');
  fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
  // No cambiar el viewport aquí: cambiar isMobile recarga la página y se pierde el estado de impresión.
  await page.pdf({ path: OUT_PDF, format: 'letter', printBackground: true, preferCSSPageSize: true });
  assert(fs.statSync(OUT_PDF).size > 20000, 'PDF generado: ' + OUT_PDF);
  await page.emulateMediaType('screen');
  await page.evaluate(() => window.__ntcAfterPrint());
  await page.waitForFunction(() => !document.body.classList.contains('is-printing-formato'));
  const after = await page.evaluate(() => ({
    print: document.querySelector('#formato-checklist-ntc-section [data-ntc-print]').innerHTML,
    items: document.querySelectorAll('.ntc-item').length,
    obsInputs: document.querySelectorAll('.ntc-item [data-ntc="obs"]').length,
  }));
  assert(after.print === '' && after.items === 23 && after.obsInputs >= 2, 'después del PDF el formato vuelve a quedar editable');

  console.log('8) Celular: la sección cabe sin scroll horizontal');
  const overflow = await page.$eval('#formato-checklist-ntc-section', (el) => el.scrollWidth - el.clientWidth);
  assert(overflow <= 1, 'sin desborde horizontal en 390 px');
  for (const w of [360, 375]) {
    await page.setViewport({ width: w, height: 800, isMobile: false, deviceScaleFactor: 1 });
    const o = await page.$eval('#formato-checklist-ntc-section', (el) => {
      const r = el.getBoundingClientRect();
      const bad = [...el.querySelectorAll('.ntc-item, .ntc-btn, .ntc-progress')].filter((x) => x.getBoundingClientRect().right > r.right + 1).length;
      return { diff: el.scrollWidth - el.clientWidth, bad };
    });
    assert(o.diff <= 1 && o.bad === 0, `sin desborde horizontal en ${w} px`);
  }

  const own = errors.filter((e) => /ntc|checklist/i.test(e));
  assert(own.length === 0, 'sin errores de la lista en la consola' + (own.length ? ': ' + own.join(' | ') : ''));
  if (errors.length) console.log('  (otros errores de la página, no de la lista):', errors.slice(0, 5).join(' | '));
  console.log('  hosts externos bloqueados:', [...blocked].join(', ') || 'ninguno');
  console.log('\nOK: lista de verificación NTC 5926-3 (e2e)');
} finally {
  if (browser) await browser.close();
  server.kill();
}
