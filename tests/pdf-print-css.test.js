const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function printCssBlock(html) {
  const start = html.indexOf('@media print {');
  assert.ok(start >= 0, 'falta @media print en index.html');
  let i = start + '@media print {'.length;
  let depth = 1;
  while (i < html.length && depth > 0) {
    if (html[i] === '{') depth += 1;
    else if (html[i] === '}') depth -= 1;
    i += 1;
  }
  return html.slice(start, i);
}

describe('CSS de impresión: pie no tapa contenido', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const printBlocks = [];
  let from = 0;
  while (true) {
    const start = html.indexOf('@media print', from);
    if (start < 0) break;
    printBlocks.push(printCssBlock(html.slice(start)));
    from = start + 12;
  }
  const printCss = printBlocks.join('\n');

  it('el pie de impresión no usa position:fixed ni franja ::before', () => {
    assert.match(printCss, /\.suite-footer\s*\{[^}]*position:\s*static/s);
    assert.doesNotMatch(printCss, /\.suite-footer\s*\{[^}]*position:\s*fixed/s);
    assert.doesNotMatch(printCss, /body\.is-printing::before/);
    assert.doesNotMatch(printCss, /body\.is-printing-formato::before/);
  });

  it('CACHE_VERSION es igual o posterior a la del PDF WhatsApp sin cortes', () => {
    // No se fija la versión exacta: cada deploy la sube y la prueba no debe romperse por eso.
    const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
    const m = sw.match(/CACHE_VERSION = 'v(\d{8})-[^']+'/);
    assert.ok(m, 'CACHE_VERSION con formato vAAAAMMDD-nombre');
    assert.ok(Number(m[1]) >= 20261002, 'CACHE_VERSION anterior al 2-oct-2026: ' + m[0]);
  });

  it('el PDF de WhatsApp fija ancho de escritorio también en el celular', () => {
    const cot = fs.readFileSync(path.join(root, 'js/arpa-cotizacion.js'), 'utf8');
    assert.match(cot, /cot-pdf-fixed-width \.page \{ width:760px/);
    assert.match(cot, /cot-pdf-fixed-width \.tabla-cot-wrap \{ overflow:visible/);
    assert.match(cot, /classList\.add\('cot-pdf-fixed-width'\)/);
    assert.match(cot, /classList\.remove\('cot-pdf-fixed-width'\)/);
  });

  it('el PDF de WhatsApp de la cotización usa Carta y cortes por bloques', () => {
    const cot = fs.readFileSync(path.join(root, 'js/arpa-cotizacion.js'), 'utf8');
    const fn = cot.slice(cot.indexOf('async function generarCotPdfFile'), cot.indexOf('function guardarCotPDF'));
    assert.match(fn, /format:\s*['"]letter['"]/);
    assert.doesNotMatch(fn, /format:\s*['"]a4['"]/);
    assert.match(cot, /function computeCanvasPageStarts/);
    assert.match(cot, /collectCotPdfBreakRanges/);
    assert.match(cot, /beginCotPdfExport/);
    assert.match(cot, /endCotPdfExport/);
    assert.match(cot, /marginBottom:\s*14/);
    assert.match(fn, /\.header/);
    assert.match(cot, /#cot-print-footer-local/);
    assert.match(cot, /#334155/);
  });

  it('impresión oculta buscador, casilla IVA, placeholders y observaciones vacías', () => {
    assert.match(printCss, /#cot-buscar-section/);
    assert.match(printCss, /\.iva-toggle/);
    assert.match(printCss, /::placeholder/);
    assert.match(printCss, /print-hide-empty/);
    assert.match(printCss, /cot-obs:placeholder-shown/);
  });

  it('el cierre de cotización no evita saltos de página en bloque', () => {
    assert.doesNotMatch(printCss, /\.cot-cierre-block\s*\{[^}]*break-inside:\s*avoid/s);
    assert.doesNotMatch(printCss, /\.cot-cierre-block\s*\{[^}]*page-break-inside:\s*avoid/s);
    assert.match(printCss, /\.totales-box\s*\{[^}]*break-inside:\s*avoid/s);
    assert.match(printCss, /\.cot-bank-section/);
    assert.match(printCss, /\.garantia/);
    assert.match(printCss, /\.nota-cot/);
    assert.match(printCss, /\.firmas/);
  });

  it('en Cotización el pie de impresión va con las firmas y el pie global se oculta', () => {
    assert.match(html, /id="cot-print-footer"/);
    assert.match(html, /cot-firmas-print-block/);
    assert.match(printCss, /body\.is-printing:not\(\.is-printing-formato\) \.suite-footer/);
    assert.match(printCss, /body\.is-printing:not\(\.is-printing-formato\) #cot-print-footer/);
    assert.match(printCss, /\.cot-firmas-print-block\s*\{[^}]*break-inside:\s*avoid/s);
  });
});

describe('Fechas de documentos en hora local', () => {
  it('cotización y cuenta de cobro no usan toISOString para la fecha visible', () => {
    const cot = fs.readFileSync(path.join(root, 'js/arpa-cotizacion.js'), 'utf8');
    const cc = fs.readFileSync(path.join(root, 'js/arpa-cuenta-cobro.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.doesNotMatch(cot, /toISOString/);
    assert.doesNotMatch(cc, /toISOString/);
    assert.doesNotMatch(html, /toISOString\(\)\.slice\(0,\s*10\)/);
    assert.doesNotMatch(html, /toISOString\(\)\.split\('T'\)/);
  });
});
