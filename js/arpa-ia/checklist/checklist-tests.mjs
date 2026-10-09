/**
 * Pruebas del checklist de mantenimiento (lógica pura, sin DOM ni red).
 * Uso: node js/arpa-ia/checklist/checklist-tests.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(here, 'checklist-datos.js'), 'utf8'), sandbox);
const D = sandbox.ArpaChecklistDatos;

let fails = 0;
function check(name, cond) {
  if (cond) console.log('  ok  ' + name);
  else { fails++; console.error('  FAIL ' + name); }
}

check('sin tipo de puerta muestra solo el grupo general', D.gruposParaChips([]).map((g) => g.key).join() === 'general');
check('corrediza agrega su grupo después del general', D.gruposParaChips(['c1']).map((g) => g.key).join() === 'general,corrediza');
check('batiente 1 y 2 hojas no duplican el grupo', D.gruposParaChips(['c2', 'c3']).map((g) => g.key).join() === 'general,batiente');
check('levadiza y seccional comparten grupo', D.gruposParaChips(['c4', 'c5']).length === 2);
check('chip "Otra" (c8) no agrega grupo', D.gruposParaChips(['c8']).length === 1);
check('cortina enrollable (c9) tiene grupo', D.gruposParaChips(['c9'])[1].key === 'cortina');

const ids = Object.values(D.GRUPOS).flatMap((g) => g.puntos.map((p) => p[0]));
check('ids de puntos únicos', new Set(ids).size === ids.length);

check('alternar pone un estado', D.alternar('', 'ok') === 'ok');
check('alternar el mismo estado lo quita', D.alternar('ok', 'ok') === '');
check('alternar cambia de estado', D.alternar('ok', 'cambio') === 'cambio');
check('estado desconocido se ignora', D.normalizarEstado('roto') === '');

const g = D.gruposParaChips(['c1']);
const r = D.resumen(g, { 'gen-tarjeta': 'ok', 'cor-pinon': 'cambio', 'cor-ruedas': 'ajuste', 'bat-bisagras': 'ok' });
check('resumen cuenta solo puntos visibles', r.revisados === 3 && r.ok === 1 && r.cambio === 1 && r.ajuste === 1);
check('resumen total = puntos visibles', r.total === D.GRUPOS.general.puntos.length + D.GRUPOS.corrediza.puntos.length);

check('clave vacía usa _sin_numero', D.claveDocumento('  ') === '_sin_numero');
check('clave usa el número', D.claveDocumento(' OT-012 ') === 'OT-012');

const store = { a: { t: 1 }, b: { t: 3 }, c: { t: 2 } };
const podado = D.podar(store, 2);
check('podar conserva los más recientes', Object.keys(podado).sort().join() === 'b,c');
check('podar no modifica el original', Object.keys(store).length === 3);

if (fails) { console.error('\nchecklist: ' + fails + ' prueba(s) fallaron'); process.exit(1); }
console.log('\nchecklist: todas las pruebas pasaron');
