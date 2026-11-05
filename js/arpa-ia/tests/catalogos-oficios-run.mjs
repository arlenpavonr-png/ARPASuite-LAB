/**
 * Pruebas de los catálogos base por oficio (sin red).
 * Uso: node js/arpa-ia/tests/catalogos-oficios-run.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sandbox = {
  console,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { language: 'es-CO' }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(root, 'js/arpa-oficios.js'), 'utf8'), sandbox, { filename: 'arpa-oficios.js' });
const O = sandbox.ArpaOficios;

const catSrc = readFileSync(path.join(root, 'js/arpa-mi-catalogo.js'), 'utf8');
const UNIDADES = JSON.parse(catSrc.match(/const UNIDADES = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
const normalize = (u) => ({ un: 'unidad', und: 'unidad' }[String(u || '').toLowerCase()] || String(u || '').toLowerCase());
// Ítems sin precio a propósito.
const SIN_PRECIO_OK = new Set(['LB-020', 'SOL-020']);

let fails = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { fails++; console.error('  FAIL ' + name + (detail ? ' → ' + detail : '')); }
}

for (const of of O.getOficiosList()) {
  if (of.id === 'automatismos') continue; // catálogo propio (catalogo-bft-nas.js), precios en lista aparte
  const items = O.getSeedProductsForOficio(of.id) || [];
  check(of.id + ': tiene catálogo base', items.length > 0, items.length + ' ítems');
  const malas = items.filter((p) => !UNIDADES.includes(normalize(p.unidad))).map((p) => p.cod + ':' + p.unidad);
  check(of.id + ': todas las unidades existen en la app', !malas.length, malas.join(', '));
  const sinPrecio = items.filter((p) => !(Number(p.pvp) > 0) && !SIN_PRECIO_OK.has(p.cod)).map((p) => p.cod);
  check(of.id + ': todos tienen precio de referencia', !sinPrecio.length, sinPrecio.join(', '));
  const relleno = items.filter((p) => /\(seed\)/i.test(p.nom)).map((p) => p.cod);
  check(of.id + ': sin nombres de relleno "(seed)"', !relleno.length, relleno.join(', '));
  const m2 = items.filter((p) => /\(m²\)/.test(p.nom) && normalize(p.unidad) !== 'm2').map((p) => p.cod);
  check(of.id + ': lo que dice "(m²)" se cobra por m²', !m2.length, m2.join(', '));
  const cods = items.map((p) => p.cod);
  check(of.id + ': códigos únicos', new Set(cods).size === cods.length);
}

if (fails) { console.error('\ncatalogos-oficios: ' + fails + ' prueba(s) fallaron'); process.exit(1); }
console.log('\ncatalogos-oficios: todas las pruebas pasaron');
