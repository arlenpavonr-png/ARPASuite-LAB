import puppeteer from 'puppeteer-core';

const BASE = process.env.NEXT_URL || 'http://127.0.0.1:4173/next/';
const EXAMPLE = 'Encontré desgaste avanzado del piñón, ajusté la cremallera, lubriqué el sistema y recomiendo cambiar el piñón.';

const chrome = [
  process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find(Boolean);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--window-size=390,844'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
page.setDefaultTimeout(20000);
await page.evaluateOnNewDocument(() => {
  window.__arpaFiles = [];
  window.__arpaOpens = [];
  const origOpen = window.open;
  window.open = function arpaOpen(url) {
    window.__arpaOpens.push(String(url || ''));
    return {
      closed: false,
      close() {},
      document: { write() {}, close() {}, open() {} },
    };
  };
  void origOpen;
  document.addEventListener('click', (ev) => {
    const a = ev.target?.closest?.('a[download]');
    if (a?.download) {
      window.__arpaFiles.push({ name: a.download, href: a.href });
    }
  }, true);
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

async function clickAct(page, act) {
  await page.waitForSelector(`[data-act="${act}"]`);
  await page.evaluate((a) => {
    const el = document.querySelector(`[data-act="${a}"]`);
    el.scrollIntoView({ block: 'center' });
    el.click();
  }, act);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function signPad(page, selector) {
  const handle = await page.$(selector);
  const box = await handle.boundingBox();
  assert(box && box.width > 10, 'canvas de firma visible: ' + selector);
  await page.mouse.move(box.x + 20, box.y + 36);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(box.x + 20 + i * 14, box.y + 36 + (i % 2) * 22);
  }
  await page.mouse.up();
}

async function canvasHasInk(page, selector) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) return false;
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 0) return true;
    }
    return false;
  }, selector);
}

async function attachPhoto(page, kind) {
  await page.waitForSelector(`input[data-photo="${kind}"]`);
  await page.evaluate(async (k) => {
    const input = document.querySelector(`input[data-photo="${k}"]`);
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = k === 'before' ? '#1a3a6e' : '#15803d';
    ctx.fillRect(0, 0, 160, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(k.toUpperCase(), 16, 58);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    const file = new File([blob], `${k}.jpg`, { type: 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, kind);
}

async function readDownloadedPdf(page, nameRe) {
  return page.evaluate(async (reSource) => {
    const re = new RegExp(reSource);
    const item = (window.__arpaFiles || []).find((f) => re.test(f.name));
    if (!item?.href) return { ok: false, reason: 'no-file' };
    const res = await fetch(item.href);
    const buf = new Uint8Array(await res.arrayBuffer());
    const head = String.fromCharCode(buf[0], buf[1], buf[2], buf[3], buf[4]);
    const latin = new TextDecoder('latin1').decode(buf);
    return {
      ok: head.startsWith('%PDF'),
      name: item.name,
      bytes: buf.length,
      hasImage: /\/Image|DCTDecode|JFIF/.test(latin),
    };
  }, nameRe.source);
}

async function readIdbServices(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('arpa-suite-next');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('services')) {
        resolve([]);
        return;
      }
      const tx = db.transaction('services', 'readonly');
      const getAll = tx.objectStore('services').getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => reject(getAll.error);
    };
  }));
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.__arpaFiles = [];
    const proto = HTMLAnchorElement.prototype;
    if (proto.click.__arpaPatched) return;
    const orig = proto.click;
    proto.click = function arpaClick() {
      if (this.download) {
        window.__arpaFiles.push({ name: this.download, href: this.href });
      }
      return orig.apply(this, arguments);
    };
    proto.click.__arpaPatched = true;
  });
  await page.waitForFunction(() => document.body.innerText.includes('Iniciar servicio'), { timeout: 10000 });
  const home = await page.evaluate(() => document.body.innerText);
  assert(home.includes('ARPASuite NEXT'), 'home title');
  assert(home.includes('Iniciar servicio'), 'CTA iniciar');

  await page.click('a.btn-primary');
  await page.waitForFunction(() => /qu[eé] van a hacer/i.test(document.body.innerText));
  await clickAct(page, 'set-type');
  await page.click('button[data-act="set-type"][data-id="mantenimiento"]');
  await clickAct(page, 'to-client');

  await page.waitForFunction(() => /cliente/i.test(document.body.innerText) && document.querySelector('button[data-act="pick-client"]'));
  const clientBtn = await page.$('button[data-act="pick-client"]');
  assert(clientBtn, 'hay un cliente demo o importado');
  await clientBtn.click();

  await page.waitForFunction(() => /equipo/i.test(document.body.innerText));
  const eqBtn = await page.$('button[data-act="pick-eq"]');
  if (eqBtn) {
    await eqBtn.click();
  } else {
    await page.click('button[data-act="toggle-new-eq"]');
    await page.waitForSelector('#new-eq-model');
    await page.type('#new-eq-model', 'ARES 1500');
    await page.type('#new-eq-loc', 'Portón vehicular');
    await page.click('button[data-act="create-eq"]');
  }

  await page.waitForFunction(() => /antes de empezar/i.test(document.body.innerText));
  const brief = await page.evaluate(() => document.body.innerText);
  assert(/[uú]ltimo servicio|primera visita/i.test(brief), 'brief de historial');
  await clickAct(page, 'start-capture');

  await page.waitForSelector('#capture-text');
  await page.click('#capture-text', { clickCount: 3 });
  await page.type('#capture-text', EXAMPLE);
  await attachPhoto(page, 'before');
  await attachPhoto(page, 'after');
  await page.waitForFunction(() => document.querySelectorAll('.thumbs img').length >= 2);
  console.log('e2e ok — fotos capturadas en campo');
  await clickAct(page, 'to-parts');
  await page.waitForSelector('[data-act="to-checklist"]');
  await page.waitForSelector('[data-act="part-chip"][data-id="pinon"]');
  await page.evaluate(() => document.querySelector('[data-act="part-chip"][data-id="pinon"]').click());
  await page.waitForSelector('[data-part="name"]');
  await clickAct(page, 'to-checklist');

  await page.waitForFunction(() => document.querySelector('button[data-act="toggle-check"]'));
  await clickAct(page, 'toggle-check');
  await clickAct(page, 'to-review');
  await page.waitForSelector('[data-act="to-quote"]');
  const review = await page.evaluate(() => ({
    findings: [...document.querySelectorAll('[data-edit="f"]')].map((i) => i.value).join(' '),
    work: [...document.querySelectorAll('[data-edit="w"]')].map((i) => i.value).join(' '),
  }));
  assert(/pi[nñ]/i.test(review.findings), 'hallazgo persistido en revisión (parse al salir de captura)');
  assert(/ajuste|cremallera|lubric/i.test(review.work), 'trabajo persistido en revisión');
  await clickAct(page, 'to-quote');
  await page.waitForSelector('[data-act="close-job"]');
  const quoteScreen = await page.evaluate(() => document.body.innerText);
  assert(/pi[nñ][oó]n|cotizaci/i.test(quoteScreen), 'borrador de cotización visible');
  assert(/total sugerido/i.test(quoteScreen), 'total de cotización visible');
  assert(/seguimiento/i.test(quoteScreen), 'seguimientos sugeridos en cierre');
  await clickAct(page, 'close-job');

  await page.waitForFunction(() => /firmar e informar|ver informe/i.test(document.body.innerText));
  const closed = await page.evaluate(() => document.body.innerText);
  assert(/hallazgo/i.test(closed), 'resumen con hallazgo');
  assert(/operativ/i.test(closed), 'estado del equipo');

  await page.evaluate(() => document.querySelector('a[href*="/firma"]')?.click());
  await page.waitForSelector('#sig-client');
  const prefill = await page.evaluate(() => ({
    client: document.getElementById('sig-client-name')?.value || '',
    asksClientAgain: !!document.querySelector('#new-cli-name, [data-act="pick-client"]'),
    asksCaptureAgain: !!document.querySelector('#capture-text'),
  }));
  assert(prefill.client.length > 0, 'nombre del cliente ya está en la firma');
  assert(!prefill.asksClientAgain, 'no vuelve a pedir el cliente');
  assert(!prefill.asksCaptureAgain, 'no vuelve a pedir hallazgos');
  await signPad(page, '#sig-client');
  await signPad(page, '#sig-tech');
  assert(await canvasHasInk(page, '#sig-client'), 'hay tinta en firma cliente');
  for (let i = 0; i < 25; i += 1) {
    const rows = await readIdbServices(page);
    if (rows.some((s) => /data:image\//.test(s.signatures?.client?.dataUrl || ''))) break;
    await new Promise((r) => setTimeout(r, 80));
  }
  await clickAct(page, 'to-report');

  await page.waitForSelector('[data-act="share-report"]');
  await page.waitForFunction(() => /informe/i.test(document.body.innerText) && /hallazgos/i.test(document.body.innerText));
  const reportText = await page.evaluate(() => document.body.innerText);
  assert(/pi[nñ]/i.test(reportText), 'informe muestra hallazgo capturado');
  assert(/cremallera|ajuste|lubric/i.test(reportText), 'informe muestra trabajo capturado');
  const signedImgs = await page.evaluate(() => document.querySelectorAll('img[alt*="Firma"]').length);
  assert(signedImgs >= 1, 'informe muestra la firma');
  const reportPhotos = await page.evaluate(() => document.querySelectorAll('.thumbs img, img[alt="before"], img[alt="after"]').length);
  assert(reportPhotos >= 2, 'informe muestra las fotos capturadas');
  console.log('e2e ok — informe en la app con datos, firma y fotos');

  await clickAct(page, 'share-report');
  await page.waitForFunction(() => (window.__arpaFiles || []).some((f) => /Informe_.*\.pdf$/i.test(f.name)), { timeout: 12000 });
  const reportPdf = await readDownloadedPdf(page, /Informe_.*\.pdf$/i);
  assert(reportPdf.ok, 'PDF de informe real (%PDF)');
  assert(reportPdf.hasImage, 'PDF de informe incluye imagen (fotos o firma)');
  await clickAct(page, 'share-quote');
  await page.waitForFunction(() => (window.__arpaFiles || []).some((f) => /Cotizacion_.*\.pdf$/i.test(f.name)), { timeout: 12000 });
  const quotePdf = await readDownloadedPdf(page, /Cotizacion_.*\.pdf$/i);
  assert(quotePdf.ok, 'PDF de cotización real (%PDF)');
  console.log('e2e ok — PDFs reales descargados');

  await clickAct(page, 'wa-report');
  await page.waitForFunction(() => (window.__arpaOpens || []).some((u) => /wa\.me/.test(u)), { timeout: 12000 });
  const waUrl = await page.evaluate(() => (window.__arpaOpens || []).find((u) => /wa\.me/.test(u)));
  assert(/wa\.me/.test(waUrl), 'abre wa.me');
  assert(/573005550100/.test(waUrl), 'wa.me usa el teléfono del cliente');
  assert(!/script.google|graph.facebook/i.test(waUrl), 'WhatsApp sin APIs de producción');
  console.log('e2e ok — WhatsApp wa.me');

  const idb = await readIdbServices(page);
  const closedJob = idb.find((s) => (s.findings || []).some((f) => /desgaste avanzado/i.test(f.text)));
  assert(closedJob, 'IndexedDB tiene el servicio con el hallazgo capturado');
  assert(closedJob.status === 'closed', 'IndexedDB marca el servicio cerrado');
  assert((closedJob.workDone || []).length >= 1, 'IndexedDB conserva trabajo');
  assert((closedJob.quote?.items || []).length >= 1, 'IndexedDB conserva cotización');
  assert(/data:image\//.test(closedJob.signatures?.client?.dataUrl || ''), 'IndexedDB conserva firma');
  assert((closedJob.photos || []).length >= 2, 'IndexedDB conserva fotos');
  assert((closedJob.photos || []).some((p) => p.kind === 'before' && p.dataUrl), 'foto antes persistida');
  assert((closedJob.photos || []).some((p) => p.kind === 'after' && p.dataUrl), 'foto después persistida');
  console.log('e2e ok — persistencia IndexedDB (incluye fotos)');

  await page.evaluate(() => { location.hash = '#/clientes'; });
  await page.waitForFunction(() => document.querySelector('a.row-card[href^="#/cliente/"]'));
  await page.evaluate(() => document.querySelector('a.row-card[href^="#/cliente/"]').click());
  await page.waitForFunction(() => /equipos/i.test(document.body.innerText) && /historial/i.test(document.body.innerText));
  console.log('e2e ok — ficha de cliente con historial');

  await page.evaluate(() => { location.hash = '#/servicios'; });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /iniciar servicio|servicios/i.test(document.body.innerText));
  await page.evaluate(() => { location.hash = '#/servicios'; });
  await page.waitForFunction(() => /SV-/.test(document.body.innerText) && /cerrado/i.test(document.body.innerText));
  const tabCount = await page.evaluate(() => document.querySelectorAll('nav.tabbar a.tab').length);
  assert(tabCount === 4, 'barra móvil de 4 destinos tras recarga');
  await page.evaluate(() => {
    const hit = [...document.querySelectorAll('a.row-card')].find((a) => /SV-2026-0002/.test(a.textContent || ''));
    (hit || document.querySelector('a.row-card'))?.click();
  });
  await page.waitForFunction(() => /informe|cerrado|hallazgo/i.test(document.body.innerText));
  await page.evaluate(() => {
    const a = document.querySelector('a[href*="/informe"]');
    if (a) a.click();
    else location.hash = (location.hash || '').replace(/\/listo$|\/captura$|\/firma$/, '/informe');
  });
  await page.waitForFunction(() => document.querySelectorAll('.thumbs img, img[alt="before"], img[alt="after"]').length >= 2);
  console.log('e2e ok — persistencia tras recarga (fotos en informe)');

  await page.evaluate(() => { location.hash = '#/seguimiento'; });
  await page.waitForFunction(() => /pr[oó]ximo mantenimiento|reparaci[oó]n pendiente|cotizaci[oó]n pendiente|nada pendiente/i.test(document.body.innerText));
  const fu = await page.evaluate(() => document.body.innerText);
  assert(/mantenimiento|cotizaci|reparaci|recomend/i.test(fu), 'hay seguimientos');

  if (errors.length) {
    console.log('console errors:', errors.slice(0, 8));
  }
  console.log('e2e ok — flujo de servicio completo en viewport móvil 390x844');

  await page.setViewport({ width: 1280, height: 800, isMobile: false });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => /iniciar servicio/i.test(document.body.innerText));
  const desk = await page.evaluate(() => ({
    w: document.getElementById('app')?.offsetWidth || 0,
    text: document.body.innerText,
  }));
  assert(/iniciar servicio/i.test(desk.text), 'home escritorio');
  console.log('e2e ok — home en escritorio (app width ' + desk.w + 'px)');

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /ARPASuite NEXT/i.test(document.body.innerText) || /formato/i.test(document.body.innerText), { timeout: 10000 });
  const classic = await page.evaluate(() => document.body.innerText);
  assert(/ARPASuite NEXT/i.test(classic), 'banner NEXT en suite clásica');
  console.log('e2e ok — suite clásica enlaza a NEXT');

  await browser.close();
} catch (err) {
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.error('e2e FAIL:', err.message);
  console.error('page text:\n', text.slice(0, 1500));
  if (errors.length) console.error('js errors:', errors);
  await browser.close();
  process.exit(1);
}
