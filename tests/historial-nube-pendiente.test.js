/**
 * Cotización perdida AP-COT-186 (19-oct-2026): número local repetido que pisaba
 * otro documento, subida a la nube que fallaba en silencio y fusión en la que
 * ganaba la nube. Corre numeración + historial + nube reales, sin red.
 * node --test tests/historial-nube-pendiente.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, esperar } = require('./helpers/historial-sandbox.js');

const LICENCIA = 'FOUNDER-TEST-8DHJHX';

function cot(id, n, cliente, total, fecha) {
  return {
    id, modulo: 'cotizacion', documento: 'Cotización', tipo: 'Cotización',
    numero: 'AP-COT-' + n, numeroServicio: 'AP-COT-' + n, cliente, fecha, total,
    savedAt: fecha + 'T15:00:00.000Z'
  };
}

/** PC con el contador local atrasado (185) y en el Historial 186, 187, 188 y 191 ya hechos. */
function appCaso186(servidor) {
  return crearApp({
    servidor,
    store: {
      arpa_suite_license_code: LICENCIA,
      arpa_suite_user_settings: JSON.stringify({ technicianCode: 'AP' }),
      arpa_ultimo_cot: '185',
      arpa_suite_servicio_historial: JSON.stringify([
        cot('id191', 191, 'C191', 100, '2026-10-17'),
        cot('id188', 188, 'C188', 100, '2026-10-16'),
        cot('id187', 187, 'C187', 100, '2026-10-15'),
        cot('mv5px9ho6fkke', 186, 'Cliente', 2522681, '2026-10-12')
      ])
    }
  });
}

const sinRed = () => { throw new Error('offline'); };
const nubeOk = (entradas) => (p) => (p.accion === 'gethistorial' ? { ok: true, entradas: entradas || [] } : { ok: true, numero: 999 });

const pendientes = (app) => JSON.parse(app.store.arpa_historial_pendientes_nube || '{}');

function guardarCot(app, numero, cliente, total) {
  return app.H.captureFromCotizacion({ numero, cliente, ciudad: 'Medellín', fecha: '2026-10-19', total });
}

describe('a) número local: no repite uno que ya está en el Historial', () => {
  it('sin nube, salta 186/187/188 y entrega 189 con aviso (local)', async () => {
    const app = appCaso186(sinRed);
    const r = await app.N.nextNumberAsync('cot', '');
    assert.equal(r.sincronizado, false);
    assert.equal(r.value, 'AP-COT-189');
    assert.equal(app.store.arpa_ultimo_cot, '189');
  });

  it('un número reservado que ya está usado no se vuelve a entregar', () => {
    const app = appCaso186(sinRed);
    app.store.arpa_numero_reservado_cot = 'AP-COT-186';
    assert.equal(app.N.getReserved('cot'), '');
    app.store.arpa_numero_reservado_cot = 'AP-COT-192';
    assert.equal(app.N.getReserved('cot'), 'AP-COT-192');
  });

  it('el número que da la nube se respeta tal cual', async () => {
    const app = appCaso186(nubeOk());
    const r = await app.N.nextNumberAsync('cot', '');
    assert.equal(r.sincronizado, true);
    assert.equal(r.value, 'AP-COT-999');
  });
});

describe('PRUEBA 1 — sin conexión: queda "Sin subir" y sube sola al reconectar', () => {
  it('cotización nueva sin red → pendiente con aviso; online → sube y el aviso desaparece', async () => {
    const app = appCaso186(sinRed);
    const r = await app.N.nextNumberAsync('cot', '');
    const rec = guardarCot(app, r.value, 'Muros y Techos S.A.S', 7525441);
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), true);
    app.H.render();
    assert.match(app.elementos['historial-list'].innerHTML, /ui\.historial\.sin_subir/);
    assert.ok(app.store.arpa_ultimo_error_nube, 'el error queda registrado, no solo en consola');

    app.servidor = nubeOk();
    app.disparar('online');
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), false);
    assert.ok(app.enviados.some((p) => p.accion === 'savehistorialentry' && p.entrada.id === rec.id && p.entrada.cliente === 'Muros y Techos S.A.S'));
    app.H.render();
    assert.doesNotMatch(app.elementos['historial-list'].innerHTML, /ui\.historial\.sin_subir/);
  });

  it('respuesta ok:false del servidor también queda pendiente', async () => {
    const app = appCaso186((p) => (p.accion === 'savehistorialentry' ? { ok: false, mensaje: 'EntradaId requerido.' } : { ok: true }));
    const rec = guardarCot(app, 'AP-COT-200', 'X', 1);
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), true);
    assert.equal(pendientes(app)[rec.id].error, 'EntradaId requerido.');
  });

  it('servidor con error que responde texto ("Error: ...") → pendiente y se guarda el motivo', async () => {
    const app = appCaso186(() => 'Error: Lock timeout');
    const rec = guardarCot(app, 'AP-COT-201', 'X', 1);
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), true);
    assert.match(pendientes(app)[rec.id].error, /no JSON: Error: Lock timeout/);
  });

  it('al abrir la app / sincronizar se reintenta (sin hacer esperar la bajada)', async () => {
    const app = appCaso186(sinRed);
    const rec = guardarCot(app, 'AP-COT-202', 'X', 1);
    await esperar();
    app.servidor = nubeOk();
    await app.C.forceSyncFromCloud();
    await esperar();
    assert.ok(app.enviados.some((p) => p.accion === 'gethistorial'));
    assert.equal(app.C.estaPendiente(rec.id), false);
    assert.ok(app.historial().find((x) => x.id === rec.id), 'sigue en el Historial después de bajar');
  });

  it('lo que ya va subiendo no se vuelve a mandar en el reintento (no duplica filas)', async () => {
    let soltar;
    const app = appCaso186(() => ({ ok: true }));
    app.sandbox.fetch = (url, init) => {
      app.enviados.push(JSON.parse(init.body));
      return new Promise((resolve) => { soltar = () => resolve({ text: () => Promise.resolve('{"ok":true}') }); });
    };
    const rec = guardarCot(app, 'AP-COT-203', 'X', 1);
    app.disparar('online');
    await esperar();
    assert.equal(app.enviados.filter((p) => p.accion === 'savehistorialentry' && p.entrada.id === rec.id).length, 1);
    soltar();
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), false);
  });

  it('la marca de pendiente se guarda aunque el historial no quepa en el almacenamiento', async () => {
    const app = appCaso186(sinRed);
    const setItem = app.sandbox.localStorage.setItem;
    app.sandbox.localStorage.setItem = (k, v) => {
      if (k === 'arpa_suite_servicio_historial' && app.bloquearHistorial) {
        const e = new Error('lleno'); e.name = 'QuotaExceededError'; throw e;
      }
      setItem(k, v);
    };
    const rec = guardarCot(app, 'AP-COT-204', 'X', 1);
    app.bloquearHistorial = true;
    await esperar();
    assert.equal(app.C.estaPendiente(rec.id), true);
  });
});

describe('PRUEBA 2 — número local repetido: el documento nuevo NO pisa al viejo', () => {
  it('quedan los dos, con id distinto, y se avisa', async () => {
    const app = appCaso186(sinRed);
    const rec = guardarCot(app, 'AP-COT-186', 'Muros y Techos S.A.S', 7525441);
    await esperar();
    const de186 = app.historial().filter((x) => x.numero === 'AP-COT-186');
    assert.equal(de186.length, 2);
    const viejo = de186.find((x) => x.id === 'mv5px9ho6fkke');
    assert.equal(viejo.cliente, 'Cliente');
    assert.equal(viejo.total, 2522681);
    const nuevo = de186.find((x) => x.id === rec.id);
    assert.notEqual(rec.id, 'mv5px9ho6fkke');
    assert.equal(nuevo.cliente, 'Muros y Techos S.A.S');
    assert.equal(nuevo.numeroRepetido, true);
    assert.equal(app.alertas.length, 1);
    assert.match(app.alertas[0], /alert\.historial\.numero_repetido/);
  });

  it('la limpieza de duplicados al abrir la app no borra ninguno de los dos', async () => {
    const app = appCaso186(sinRed);
    guardarCot(app, 'AP-COT-186', 'Muros y Techos S.A.S', 7525441);
    await esperar();
    app.H.dedupeRecords();
    assert.equal(app.historial().filter((x) => x.numero === 'AP-COT-186').length, 2);
    assert.ok(!app.enviados.some((p) => p.accion === 'deletehistorialentry'));
  });

  it('volver a guardar el mismo documento nuevo (PDF y luego compartir) no lo duplica', async () => {
    const app = appCaso186(sinRed);
    const r = await app.N.nextNumberAsync('cot', '');
    const a = guardarCot(app, r.value, 'Muros y Techos S.A.S', 7525441);
    const b = guardarCot(app, r.value, 'Muros y Techos S.A.S', 7600000);
    assert.equal(b.id, a.id);
    const de189 = app.historial().filter((x) => x.numero === r.value);
    assert.equal(de189.length, 1);
    assert.equal(de189[0].total, 7600000);
    assert.equal(app.alertas.length, 0);
  });
});

describe('PRUEBA 3 — sincronizar con datos de otro dispositivo: el pendiente no se pierde', () => {
  it('registro pendiente con el mismo id que la nube: gana el local', async () => {
    const app = appCaso186(sinRed);
    // Caso real: el registro local (pendiente) quedó con el id viejo y la nube trae la versión del 12-oct.
    const locales = app.historial();
    const i = locales.findIndex((x) => x.id === 'mv5px9ho6fkke');
    locales[i] = Object.assign({}, locales[i], { cliente: 'Muros y Techos S.A.S', total: 7525441 });
    app.store.arpa_suite_servicio_historial = JSON.stringify(locales);
    app.store.arpa_historial_pendientes_nube = JSON.stringify({ mv5px9ho6fkke: { savedAt: locales[i].savedAt, error: '' } });
    app.servidor = (p) => (p.accion === 'gethistorial'
      ? { ok: true, entradas: [{ id: 'mv5px9ho6fkke', tipo: 'Cotización', numero: 'AP-COT-186', cliente: 'Cliente', fecha: '2026-10-12', monto: 2522681 }] }
      : (() => { throw new Error('offline'); })());
    await app.C.forceSyncFromCloud();
    const r = app.historial().find((x) => x.id === 'mv5px9ho6fkke');
    assert.equal(r.cliente, 'Muros y Techos S.A.S');
    assert.equal(r.total, 7525441);
    assert.equal(app.C.estaPendiente('mv5px9ho6fkke'), true);
  });

  it('la nube trae documentos de otro dispositivo: se agregan y el pendiente local sigue', async () => {
    const app = appCaso186(sinRed);
    const rec = guardarCot(app, 'AP-COT-189', 'Muros y Techos S.A.S', 7525441);
    await esperar();
    app.servidor = (p) => (p.accion === 'gethistorial'
      ? { ok: true, entradas: [{ id: 'celular1', tipo: 'Cotización', numero: 'AP-COT-192', cliente: 'Desde el celular', fecha: '2026-10-20', monto: 5 }] }
      : (() => { throw new Error('offline'); })());
    await app.C.forceSyncFromCloud();
    const h = app.historial();
    assert.ok(h.find((x) => x.id === 'celular1'));
    const mio = h.find((x) => x.id === rec.id);
    assert.equal(mio.cliente, 'Muros y Techos S.A.S');
    assert.equal(app.C.estaPendiente(rec.id), true);
  });

  it('si gana la nube, se conserva el detalle local (la nube no guarda fullSnapshot)', async () => {
    const app = appCaso186(nubeOk([{ id: 'id187', tipo: 'Cotización', numero: 'AP-COT-187', cliente: 'C187', fecha: '2026-10-15', monto: 100 }]));
    const locales = app.historial();
    locales.find((x) => x.id === 'id187').fullSnapshot = { filas: [{ nom: 'Motor' }] };
    app.store.arpa_suite_servicio_historial = JSON.stringify(locales);
    await app.C.forceSyncFromCloud();
    const r = app.historial().find((x) => x.id === 'id187');
    assert.deepEqual(r.fullSnapshot, { filas: [{ nom: 'Motor' }] });
    assert.equal(r.savedAt, '2026-10-15T15:00:00.000Z');
  });
});

describe('Revisión: fusión con la nube', () => {
  it('si gana la nube, se conservan los campos que la nube no guarda (aviso de número repetido, estado)', async () => {
    const app = appCaso186(nubeOk([{ id: 'id188', tipo: 'Cotización', numero: 'AP-COT-188', cliente: 'C188', fecha: '2026-10-16', monto: 100 }]));
    const locales = app.historial();
    Object.assign(locales.find((x) => x.id === 'id188'), { numeroRepetido: true, estado: 'FINALIZADA' });
    app.store.arpa_suite_servicio_historial = JSON.stringify(locales);
    await app.C.forceSyncFromCloud();
    const r = app.historial().find((x) => x.id === 'id188');
    assert.equal(r.numeroRepetido, true);
    assert.equal(r.estado, 'FINALIZADA');
  });

  it('fecha que llega de Sheets como texto de Date ("Mon Oct 12 2026 …") se ordena bien', async () => {
    const app = crearApp({
      servidor: nubeOk([
        { id: 'n1', tipo: 'Cotización', numero: 'AP-COT-010', cliente: 'A', fecha: 'Mon Oct 12 2026 00:00:00 GMT-0500 (Colombia Standard Time)', monto: 1 },
        { id: 'n2', tipo: 'Cotización', numero: 'AP-COT-011', cliente: 'B', fecha: 'Tue Oct 20 2026 00:00:00 GMT-0500 (Colombia Standard Time)', monto: 1 }
      ]),
      store: {
        arpa_suite_license_code: LICENCIA,
        arpa_suite_servicio_historial: JSON.stringify([cot('local', 12, 'C', 1, '2026-10-15')])
      }
    });
    await app.C.forceSyncFromCloud();
    assert.deepEqual(app.historial().map((x) => x.id), ['n2', 'local', 'n1']);
    assert.match(app.historial()[0].savedAt, /^2026-10-20T/);
  });
});

describe('PRUEBA 4 — editar un documento abierto desde Historial', () => {
  it('se actualiza el mismo registro (mismo id), no se duplica', async () => {
    const app = appCaso186(nubeOk());
    app.H.verDocumento('mv5px9ho6fkke');
    const rec = guardarCot(app, 'AP-COT-186', 'Cliente', 2600000);
    await esperar();
    assert.equal(rec.id, 'mv5px9ho6fkke');
    const de186 = app.historial().filter((x) => x.numero === 'AP-COT-186');
    assert.equal(de186.length, 1);
    assert.equal(de186[0].total, 2600000);
    assert.equal(de186[0].numeroRepetido, undefined);
    assert.equal(app.alertas.filter((m) => /numero_repetido/.test(m)).length, 0);
  });

  it('abrir uno viejo y luego pedir número nuevo: lo nuevo no pisa al abierto', async () => {
    const app = appCaso186(sinRed);
    app.H.verDocumento('mv5px9ho6fkke');
    const r = await app.N.nextNumberAsync('cot', '');
    const rec = guardarCot(app, r.value, 'Otro cliente', 1);
    assert.notEqual(rec.id, 'mv5px9ho6fkke');
    assert.equal(app.historial().find((x) => x.id === 'mv5px9ho6fkke').cliente, 'Cliente');
  });

  it('cambiarle el número a uno marcado "número repetido" actualiza ese mismo (no crea un tercero)', async () => {
    const app = appCaso186(sinRed);
    const dup = guardarCot(app, 'AP-COT-186', 'Muros y Techos S.A.S', 7525441);
    const corregido = guardarCot(app, 'AP-COT-192', 'Muros y Techos S.A.S', 7525441);
    assert.equal(corregido.id, dup.id);
    assert.equal(corregido.numeroRepetido, undefined);
    const h = app.historial();
    assert.equal(h.filter((x) => x.numero === 'AP-COT-186').length, 1);
    assert.equal(h.find((x) => x.id === 'mv5px9ho6fkke').cliente, 'Cliente');
    assert.equal(h.filter((x) => x.numero === 'AP-COT-192').length, 1);
  });

  it('documento guardado antes de esta versión (sin marca): mismo número y cliente → se actualiza', async () => {
    const app = appCaso186(sinRed);
    const rec = guardarCot(app, 'AP-COT-187', 'C187', 150);
    assert.equal(rec.id, 'id187');
    assert.equal(app.historial().filter((x) => x.numero === 'AP-COT-187').length, 1);
    assert.equal(app.alertas.length, 0);
  });
});

describe('f) "Cotizado mes" y g) búsqueda sin resultados', () => {
  it('lo bajado de la nube cuenta en el mes de su fecha, no en el de la sincronización', async () => {
    const hoy = new Date();
    const esteMes = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-01';
    const app = crearApp({
      servidor: nubeOk([{ id: 'vieja', tipo: 'Cotización', numero: 'AP-COT-050', cliente: 'Vieja', fecha: '2025-01-10', monto: 3510500000 }]),
      store: {
        arpa_suite_license_code: LICENCIA,
        arpa_suite_servicio_historial: JSON.stringify([cot('a', 300, 'Este mes', 5000, esteMes)])
      }
    });
    await app.C.forceSyncFromCloud();
    app.H.render();
    // Con el código anterior daba $ 3.510.505.000: la de enero-2025 quedaba "guardada hoy" al sincronizar.
    assert.equal(app.elementos['hist-stat-cot-mes'].textContent, '$ 5.000');
  });

  it('con registros guardados, una búsqueda sin coincidencias dice "No se encontraron resultados"', () => {
    const app = appCaso186(sinRed);
    app.H.initFiltros();
    const buscar = app.sandbox.document.getElementById('historial-buscar');
    buscar.value = 'zzz-no-existe';
    buscar.listeners.input.forEach((fn) => fn());
    const empty = app.elementos['historial-empty'];
    assert.equal(empty.hidden, false);
    assert.equal(empty.innerHTML, 'No se encontraron resultados.');
  });

  it('con el Historial realmente vacío sigue diciendo "Aún no hay servicios…"', () => {
    const app = crearApp({ store: { arpa_suite_license_code: LICENCIA } });
    app.H.render();
    assert.match(app.elementos['historial-empty'].innerHTML, /^Aún no hay servicios/);
  });
});
