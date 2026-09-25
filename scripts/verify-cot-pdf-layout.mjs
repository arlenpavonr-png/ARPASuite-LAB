/**
 * Verifica conversión COP→MXN y genera un PDF de 2 páginas
 * con el mismo CSS de print (footer reservado, sin columna acción).
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'tmp-pdf-verify');
mkdirSync(outDir, { recursive: true });

const FX = { COP: 1, MXN: 220, CLP: 4.2, PEN: 1080, USD: 4000 };

function roundCleanPrice(n, code) {
  const value = Number(n) || 0;
  if (value <= 0) return 0;
  if (code === 'MXN' || code === 'PEN') {
    if (value < 50) return Math.round(value);
    if (value < 5000) return Math.round(value / 10) * 10;
    return Math.round(value / 50) * 50;
  }
  return Math.round(value);
}

function convertCop(cop, currency) {
  if (currency === 'COP') return cop;
  return roundCleanPrice(cop / FX[currency], currency);
}

const SEED = {
  AUACKMTD624: 5399900,
  AUACEG250: 2519900,
  'KDEIMOSBTA400-1': 1948900,
  'KARESBTA1000Z18-2': 3539900,
  D112306: 89000,
  AUACMTD624: 4599900,
  'KDEIMOSACA600-1': 2960900
};

const rows = [
  { cod: 'AUACKMTD624', nom: 'Accessmatic – Kit Mastodon 624 + asta telescópica 3-6 m', cant: 1 },
  { cod: 'KDEIMOSBTA400-1', nom: 'BFT – Kit Deimos BT A400 110V corrediza 400 kg', cant: 1 },
  { cod: 'AUACEG250', nom: 'Accessmatic – Eagle 250 – 2 hojas / 250 kg / 3 m', cant: 1 },
  { cod: 'KARESBTA1000Z18-2', nom: 'BFT – Kit Ares BT A1000 220V piñón 18 corrediza 1000 kg', cant: 1 },
  { cod: 'D112306', nom: 'BFT – Control remoto Mitto Cool C2 – 2 canales 433 MHz', cant: 1 },
  { cod: 'COBRO-1', nom: 'Instalación', cant: 1, pvp: 1590 },
  { cod: 'COBRO-2', nom: 'Visita técnica', cant: 1, pvp: 390 }
];

const extra = Array.from({ length: 16 }, (_, i) => ({
  cod: 'LAB-FILL-' + String(i + 1).padStart(2, '0'),
  nom: 'Ítem de relleno ' + (i + 1) + ' para forzar segunda página — instalación, accesorios y puesta en marcha en Ciudad de México',
  cant: 1,
  pvp: 100
}));

const lineas = rows.map((r) => {
  const pvp = r.pvp != null ? r.pvp : convertCop(SEED[r.cod], 'MXN');
  return { ...r, pvp, total: pvp * r.cant };
}).concat(extra.map((r) => ({ ...r, total: r.pvp * r.cant })));

const subtotal = lineas.reduce((s, r) => s + r.total, 0);

console.log('Conversión MXN (÷220 + redondeo):');
for (const [cod, cop] of Object.entries(SEED)) {
  const mxn = convertCop(cop, 'MXN');
  if (mxn === cop) throw new Error(cod + ' no se convirtió');
  if (mxn >= 100000) throw new Error(cod + ' sigue en magnitud COP: ' + mxn);
  console.log('  ' + cod + '  COP ' + cop + ' → MXN ' + mxn);
}

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>COT-PDF-TEST</title>
<style>
  @page { size: letter; margin: 12mm 12mm 28mm 12mm; }
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #1e293b; }
  .suite-footer {
    position: fixed; bottom: 0; left: 0; right: 0; max-height: 24mm;
    background: #fff; border-top: 1px solid #e2e8f0; font-size: 9px; padding: 6px 16px;
  }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  col.c1 { width: 14%; } col.c2 { width: 38%; } col.c3 { width: 8%; }
  col.c4 { width: 20%; } col.c5 { width: 20%; }
  th { background: #0f2044; color: #fff; font-size: 10px; padding: 8px; text-align: left; }
  td { border-bottom: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .num { text-align: right; font-family: Consolas, monospace; }
  .totales { margin-top: 16px; break-inside: avoid; }
</style></head><body>
<h1 style="font-size:18px;margin:0 0 8px">COTIZACIÓN PDF TEST</h1>
<p style="margin:0 0 12px">México · 10 filas · footer reservado en @page</p>
<table>
  <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
  <thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>PRECIO UNIT.</th><th>Total</th></tr></thead>
  <tbody>
    ${lineas.map((r) => `<tr>
      <td>${r.cod}</td><td>${r.nom}</td><td class="num">${r.cant}</td>
      <td class="num">$ ${r.pvp.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="num">$ ${r.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="totales">
  <p><strong>SUBTOTAL $ ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
  <p>Filas: ${lineas.length} · Suma filas = subtotal</p>
</div>
<footer class="suite-footer">ARPA Suite LAB · pie reservado · no debe tapar filas</footer>
</body></html>`;

const htmlPath = join(outDir, 'cot-pdf-test.html');
const pdfPath = join(outDir, 'cot-pdf-test.pdf');
writeFileSync(htmlPath, html, 'utf8');

function findBrowser() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

const browser = findBrowser();
if (!browser) {
  console.log('No se encontró Edge/Chrome. HTML listo en ' + htmlPath);
  process.exit(2);
}

const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
const result = spawnSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  fileUrl
], { encoding: 'utf8', timeout: 30000 });

if (result.status !== 0 || !existsSync(pdfPath)) {
  console.error(result.stderr || result.stdout || 'print-to-pdf falló');
  process.exit(1);
}

const buf = readFileSync(pdfPath);
const text = buf.toString('latin1');
const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
const missing = lineas.filter((r) => !text.includes(r.cod));
const hasSubtotal = text.includes('SUBTOTAL') || text.includes(String(Math.floor(subtotal)));

console.log('PDF: ' + pdfPath);
console.log('Bytes: ' + buf.length);
console.log('Páginas (aprox): ' + pageCount);
console.log('Filas esperadas: ' + lineas.length);
console.log('Filas encontradas en PDF: ' + (lineas.length - missing.length));
if (missing.length) {
  console.error('FALTAN: ' + missing.map((r) => r.cod).join(', '));
  process.exit(1);
}
if (pageCount < 2) {
  console.error('El PDF no tiene 2 páginas');
  process.exit(1);
}
if (!hasSubtotal) {
  console.error('No se encontró el subtotal en el PDF');
  process.exit(1);
}
console.log('OK: ' + lineas.length + ' filas visibles, suma ' + subtotal + ', páginas ' + pageCount);
