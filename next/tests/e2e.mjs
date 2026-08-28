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
page.setDefaultTimeout(15000);
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

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
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
  await clickAct(page, 'parse-text');
  await page.waitForFunction(() => /hallazgos/i.test(document.body.innerText) && /pi[nñ]/i.test(document.body.innerText));
  const capture = await page.evaluate(() => document.body.innerText);
  assert(/pi[nñ]/i.test(capture), 'hallazgo de piñón en pantalla');
  assert(/ajuste|cremallera/i.test(capture), 'trabajo de cremallera en pantalla');
  await clickAct(page, 'to-checklist');

  await page.waitForFunction(() => document.querySelector('button[data-act="toggle-check"]'));
  await clickAct(page, 'toggle-check');
  await clickAct(page, 'to-review');

  await page.waitForFunction(() => /revisar/i.test(document.body.innerText));
  await clickAct(page, 'to-quote');

  await page.waitForFunction(() => /borrador de cotizaci/i.test(document.body.innerText));
  const quoteScreen = await page.evaluate(() => document.body.innerText);
  assert(/pi[nñ][oó]n|cotizaci/i.test(quoteScreen), 'borrador de cotización visible');
  await clickAct(page, 'close-job');

  await page.waitForFunction(() => /ver informe/i.test(document.body.innerText));
  const closed = await page.evaluate(() => document.body.innerText);
  assert(/hallazgo/i.test(closed), 'resumen con hallazgo');
  assert(/operativ/i.test(closed), 'estado del equipo');

  await page.evaluate(() => document.querySelector('a[href="#/servicios"]').click());
  await page.waitForFunction(() => document.querySelectorAll('a.row-card').length >= 1 && /cerrado/i.test(document.body.innerText));
  const services = await page.evaluate(() => document.body.innerText);
  assert(/SV-/.test(services), 'servicio numerado en lista');

  await page.evaluate(() => document.querySelector('a[href="#/seguimiento"]').click());
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
