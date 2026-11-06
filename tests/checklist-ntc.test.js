/**
 * Lista de verificación de puertas (basada en la NTC 5926-3) en el Formato de Servicio.
 * node --test tests/checklist-ntc.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function load(opts) {
  const o = opts || {};
  const saves = [];
  const sb = {
    console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    scheduleFormatoDraftSave: () => saves.push(1),
    ArpaDocLang: { isEnglish: () => !!o.docEnglish }
  };
  sb.window = sb;
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read('js/arpa-formato-tipo.js'), sb);
  return { C: sb.ArpaChecklistNtc, saves };
}

const FOTO = 'data:image/jpeg;base64,AAAA';
// Los objetos del sandbox vm son de otro contexto: se comparan como JSON.
const J = (x) => JSON.parse(JSON.stringify(x));

test('cada tipo de puerta trae los puntos comunes y los propios, con id válido y texto en ES y EN', () => {
  const { C } = load();
  assert.deepStrictEqual(J(C.DOOR_TYPES), ['corrediza', 'batiente', 'seccional', 'enrollable', 'peatonal', 'barrera']);
  const comunes = C.getItems('', 'es');
  assert.strictEqual(comunes.length, 16);
  const vistos = new Set();
  C.DOOR_TYPES.forEach((tipo) => {
    const es = C.getItems(tipo, 'es');
    const en = C.getItems(tipo, 'en');
    assert.ok(es.length > comunes.length, tipo + ' tiene puntos propios');
    assert.strictEqual(es.length, en.length);
    es.forEach((it, i) => {
      assert.match(it.id, /^[a-z]{3}_[a-z_]+$/, 'id que normalize acepta: ' + it.id);
      assert.strictEqual(it.num, i + 1);
      assert.ok(it.text.length > 10 && en[i].text.length > 10, 'texto ' + it.id);
      assert.notStrictEqual(it.text, en[i].text, 'traducido: ' + it.id);
      if (it.group !== 'comun') {
        assert.ok(!vistos.has(it.id), 'id repetido: ' + it.id);
        vistos.add(it.id);
      }
    });
  });
});

test('los textos de la lista existen en español e inglés', () => {
  const { C } = load();
  assert.deepStrictEqual(J(Object.keys(C.TEXT.es).sort()), J(Object.keys(C.TEXT.en).sort()));
  assert.strictEqual(C.TEXT.es.print_title, 'Lista de verificación basada en la NTC 5926-3');
  assert.strictEqual(C.TEXT.es.nota, 'Esta lista no reemplaza la norma; el técnico es responsable de su aplicación.');
});

test('activar y desactivar la lista; apagada no va al PDF', () => {
  const { C, saves } = load();
  assert.strictEqual(C.getState().enabled, false);
  C.setEnabled(true);
  assert.strictEqual(C.getState().enabled, true);
  assert.ok(saves.length >= 1, 'guarda el borrador');
  C.setTipo('seccional');
  C.setItem('com_paro', { r: 'ok' });
  assert.ok(C.buildPrintHtml(C.getState(), 'es').includes('ntc-pr-table'));
  C.setEnabled(false);
  assert.strictEqual(C.buildPrintHtml(C.getState(), 'es'), '');
  // Lo marcado se conserva si se vuelve a encender.
  C.setEnabled(true);
  assert.strictEqual(C.getState().items.com_paro.r, 'ok');
});

test('cambiar el tipo de puerta cambia los puntos y el resumen', () => {
  const { C } = load();
  C.setEnabled(true);
  C.setTipo('seccional');
  C.setItem('sec_cables', { r: 'no', obs: 'Cable derecho con hilos rotos' });
  C.setItem('com_paro', { r: 'ok' });
  let s = C.summarize(C.getState(), 'es');
  assert.strictEqual(s.total, 23);
  assert.strictEqual(s.no, 1);
  C.setTipo('corrediza');
  s = C.summarize(C.getState(), 'es');
  assert.strictEqual(s.total, 21);
  assert.strictEqual(s.no, 0, 'el punto de seccional no cuenta en corrediza');
  assert.strictEqual(s.ok, 1, 'los comunes se conservan');
  C.setTipo('nada');
  assert.strictEqual(C.getState().tipo, '');
  assert.strictEqual(C.summarize(C.getState(), 'es').total, 0);
});

test('resumen: cuenta cumple / no cumple / no aplica / sin revisar y lista los "No cumple" con su observación', () => {
  const { C } = load();
  const st = {
    enabled: true,
    tipo: 'seccional',
    items: {
      com_senal: { r: 'ok' },
      com_luz: { r: 'na' },
      com_fotocelda: { r: 'no', obs: 'Fotocelda izquierda no detecta' },
      sec_resortes: { r: 'no', obs: '' },
      sec_cables: { r: 'ok', foto: FOTO },
      bat_bisagras: { r: 'no' }
    }
  };
  const s = C.summarize(st, 'es');
  assert.deepStrictEqual([s.ok, s.no, s.na, s.pending, s.total], [2, 2, 1, 18, 23]);
  assert.deepStrictEqual(J(s.noItems.map((n) => [n.num, n.id, n.obs])), [[4, 'com_fotocelda', 'Fotocelda izquierda no detecta'], [18, 'sec_resortes', '']]);
  assert.strictEqual(s.fotos.length, 1);
});

test('limpia datos raros al recuperar', () => {
  const { C } = load();
  const n = C.normalize({
    enabled: 'si', tipo: 'otra',
    items: { com_paro: { r: 'tal vez', obs: 5, foto: 'javascript:alert(1)' }, 'MAL-ID': { r: 'ok' }, com_luz: { r: 'ok', obs: 'x'.repeat(500) } }
  });
  assert.strictEqual(n.enabled, false);
  assert.strictEqual(n.tipo, '');
  assert.ok(!n.items.com_paro, 'sin datos válidos no se guarda');
  assert.ok(!n.items['MAL-ID']);
  assert.strictEqual(n.items.com_luz.obs.length, 240);
});

test('se guarda con el borrador y se recupera (historial)', () => {
  const { C } = load();
  const vacio = C.enrichDraft({ a: 1 });
  assert.ok(!('_checklistNtc' in vacio), 'apagada y vacía no ocupa espacio');
  C.setEnabled(true);
  C.setTipo('enrollable');
  C.setItem('enr_freno', { r: 'no', obs: 'Freno patina', foto: FOTO });
  const draft = JSON.parse(JSON.stringify(C.enrichDraft({ numero: 'Mant-0001' })));
  assert.strictEqual(draft._checklistNtc.tipo, 'enrollable');
  assert.strictEqual(draft._checklistNtc.items.enr_freno.obs, 'Freno patina');
  C.reset();
  assert.strictEqual(C.getState().enabled, false);
  assert.strictEqual(Object.keys(C.getState().items).length, 0);
  C.restoreFromDraft(draft);
  const st = C.getState();
  assert.strictEqual(st.enabled, true);
  assert.strictEqual(st.items.enr_freno.foto, FOTO);
  // Borrador viejo sin la lista: queda apagada.
  C.restoreFromDraft({ numero: 'x' });
  assert.strictEqual(C.getState().enabled, false);
});

test('sin espacio: se quitan solo las fotos de la lista, sin tocar el original', () => {
  const { C } = load();
  const original = { _checklistNtc: { enabled: true, tipo: 'barrera', items: { bar_brazo: { r: 'no', obs: 'Brazo doblado', foto: FOTO }, bar_apoyo: { foto: FOTO } } } };
  const copia = Object.assign({}, original);
  C.stripPhotos(copia);
  assert.strictEqual(copia._checklistNtc.items.bar_brazo.foto, '');
  assert.strictEqual(copia._checklistNtc.items.bar_brazo.obs, 'Brazo doblado');
  assert.ok(!copia._checklistNtc.items.bar_apoyo, 'punto que solo tenía foto desaparece');
  assert.strictEqual(original._checklistNtc.items.bar_brazo.foto, FOTO);
});

test('PDF: tabla con resumen, "No cumple" resaltados, recomendaciones, nota y sin HTML inyectado', () => {
  const { C } = load();
  const st = {
    enabled: true,
    tipo: 'seccional',
    items: {
      com_fotocelda: { r: 'no', obs: 'No detecta <script>x</script>' },
      sec_resortes: { r: 'no' },
      com_paro: { r: 'ok', foto: FOTO },
      com_luz: { r: 'na' }
    }
  };
  const html = C.buildPrintHtml(st, 'es');
  assert.ok(html.includes('Tipo de puerta: <strong>Seccional o levadiza</strong>'));
  assert.strictEqual((html.match(/ntc-pr-row ntc-pr-no/g) || []).length, 2);
  assert.strictEqual((html.match(/class="ntc-pr-row /g) || []).length, 23);
  assert.ok(html.includes('Recomendaciones (puntos que no cumplen)'));
  assert.ok(html.includes('Corregir antes de seguir usando la puerta'), 'texto por defecto si no hay observación');
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'));
  assert.ok(html.includes('Esta lista no reemplaza la norma; el técnico es responsable de su aplicación.'));
  assert.ok(html.includes('ntc-pr-foto') && html.includes('#7 · Cumple'));
  assert.ok(html.includes('Sin revisar'));
  const en = C.buildPrintHtml(st, 'en');
  assert.ok(en.includes('Door type: <strong>Sectional or up-and-over</strong>'));
  assert.ok(en.includes('Fail') && !en.includes('No cumple'));
});

test('index.html: sección después de las fotos y antes de las firmas, y enganches de borrador y PDF', () => {
  const html = read('index.html');
  const pos = (s) => {
    const i = html.indexOf(s);
    assert.ok(i > 0, 'falta ' + s);
    return i;
  };
  const sec = pos('id="formato-checklist-ntc-section"');
  assert.ok(sec > pos('id="after-preview"') && sec < pos('id="canvas-firma-cliente"'));
  ['ArpaChecklistNtc?.enrichDraft?.(data)', 'ArpaChecklistNtc?.restoreFromDraft?.(data)', 'ArpaChecklistNtc?.reset?.()',
    'ArpaChecklistNtc?.stripPhotos?.(fallback)', 'ArpaChecklistNtc?.prepareForPrint?.()', 'ArpaChecklistNtc?.restoreAfterPrint?.()']
    .forEach(pos);
  // El PDF se arma antes de que guardarPDF cambie los campos por texto.
  const g = html.slice(pos('function guardarPDF()'), pos('function forzarSaltoSiSeCorta()'));
  assert.ok(g.indexOf('prepareForPrint') < g.indexOf('replaceChild(span, el)'));
  assert.ok(read('js/arpa-historial.js').includes('ArpaChecklistNtc?.stripPhotos?.(next.fullSnapshot)'));
});
