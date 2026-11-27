/**
 * Fotos del Formato en el dispositivo (IndexedDB), no en localStorage (AP-031, 16-nov-2026):
 * el Historial se llenaba (~5 MB) y guardaba el documento SIN fotos.
 * Aquí: separar / unir fotos, y que sin IndexedDB todo siga como antes (fotos dentro del registro).
 * La prueba con IndexedDB real se hizo en el navegador (ver el PR).
 * node --test tests/historial-fotos-dispositivo.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, esperar } = require('./helpers/historial-sandbox.js');

const F = (c) => 'data:image/jpeg;base64,' + c.repeat(50);
const snapshotConFotos = () => ({
  numero: 'AP-031',
  fotosAntes: [F('A'), F('B')],
  fotosDespues: [F('C')],
  _checklistNtc: { tipo: 'corrediza', items: { com_tierra: { r: 'si', foto: F('D') }, com_avisos: { r: 'na', foto: '' } } }
});

describe('fotos del formato fuera de localStorage', () => {
  it('separarFotos deja el snapshot sin fotos y las devuelve aparte', () => {
    const { H } = crearApp();
    const sep = H.separarFotos(snapshotConFotos());
    assert.ok(sep);
    assert.equal(JSON.stringify(sep.snapshot).indexOf('data:image'), -1);
    assert.equal(sep.fotos.antes.length, 2);
    assert.equal(sep.fotos.despues.length, 1);
    assert.equal(sep.fotos.ntc.com_tierra, F('D'));
    assert.equal(sep.snapshot._checklistNtc.items.com_tierra.r, 'si', 'lo demás del punto se conserva');
  });

  it('unirFotos devuelve exactamente lo que se separó', () => {
    const { H } = crearApp();
    const original = snapshotConFotos();
    const sep = H.separarFotos(original);
    assert.deepEqual(JSON.parse(JSON.stringify(H.unirFotos(sep.snapshot, sep.fotos))), original);
  });

  it('unirFotos no pisa fotos que el snapshot ya tenga', () => {
    const { H } = crearApp();
    const s = snapshotConFotos();
    const r = H.unirFotos(s, { antes: [F('Z')], despues: [], ntc: { com_tierra: F('Z') } });
    assert.deepEqual(r.fotosAntes, s.fotosAntes);
    assert.equal(r._checklistNtc.items.com_tierra.foto, F('D'));
  });

  it('sin fotos no hay nada que separar', () => {
    const { H } = crearApp();
    assert.equal(H.separarFotos({ fotosAntes: [], fotosDespues: [] }), null);
    assert.equal(H.separarFotos(null), null);
  });

  it('sin IndexedDB el registro guarda sus fotos como antes', async () => {
    const app = crearApp();
    app.sandbox.collectFormatoDraft = snapshotConFotos;
    app.H.captureFromFormato();
    await esperar();
    const rec = app.historial()[0];
    assert.equal(rec.fullSnapshot.fotosAntes.length, 2);
    assert.equal(rec._fotosEnDispositivo, undefined);
    assert.equal(await app.H.migrarFotosAlDispositivo(), 0);
  });

  it('la foto de la placa también sale del snapshot y vuelve igual (27-nov)', () => {
    const { H } = crearApp();
    const original = { numero: 'AP-040', fotosAntes: [], fotosDespues: [], 'formato-foto-placa': F('P') };
    const sep = H.separarFotos(original);
    assert.ok(sep, 'solo con la placa ya hay algo que separar');
    assert.equal(sep.snapshot['formato-foto-placa'], '');
    assert.equal(sep.fotos.placa, F('P'));
    assert.deepEqual(JSON.parse(JSON.stringify(H.unirFotos(sep.snapshot, sep.fotos))), original);
  });
});
