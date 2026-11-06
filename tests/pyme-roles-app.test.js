/**
 * Plan PYME en la app: el técnico baja empresa/catálogo del jefe, no sube cambios,
 * ve solo sus informes de trabajo sin montos y usa sus iniciales fijas.
 * Servidor simulado (sin red). node --test tests/pyme-roles-app.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const { crearApp, esperar } = require('./helpers/historial-sandbox');

const TEC_STORE = {
  arpa_suite_license_code: 'ARPA-TEC-0001',
  arpa_suite_license_plan: 'PYME',
  arpa_suite_license_rol: 'tecnico',
  arpa_suite_license_jefe: 'ARPA-PYME-0003',
  arpa_suite_tecnico_iniciales: 'JP',
  arpa_suite_tecnico_nombre: 'Juan Pérez',
  arpa_suite_user_settings: JSON.stringify({ technicianCode: 'XX' }),
  arpa_catalogo_usuario: JSON.stringify([{ id: 'viejo', nom: 'Copia vieja', pvp: 99 }])
};

function servidorFalso(registro) {
  return (p) => {
    registro.push(p.accion);
    if (p.accion === 'getcatalogo') {
      return { ok: true, sin_precios: true, productos: [{ id: 'p1', cod: 'BFT-1', nom: 'Motor corredizo', pvp: 1500000, categoria: 'Motores' }] };
    }
    if (p.accion === 'gethistorial') {
      return {
        ok: true,
        entradas: [
          { id: 'c1', tipo: 'Cotización', numero: 'JF-COT-001', cliente: 'A', fecha: '2026-11-01', monto: 2500000 },
          { id: 'f1', tipo: 'Formato de Servicio', subtipo: 'Mantenimiento', numero: 'JP-OT-001', cliente: 'B', fecha: '2026-11-02', monto: 800 }
        ]
      };
    }
    return { ok: true };
  };
}

test('técnico: reconoce el rol y usa sus iniciales fijas (no las de Configuración)', () => {
  const app = crearApp({ conLicencia: true, store: TEC_STORE });
  assert.strictEqual(app.L.isTechnicianRole(), true);
  assert.strictEqual(app.L.getBossLicense(), 'ARPA-PYME-0003');
  assert.strictEqual(app.N.getTechnicianCode(), 'JP');
});

test('técnico: al abrir baja el catálogo del jefe y reemplaza su copia, sin precios', async () => {
  const registro = [];
  const app = crearApp({ conLicencia: true, store: TEC_STORE, servidor: servidorFalso(registro) });
  let escritos = null;
  // Catálogo local NO vacío (copia vieja): el técnico igual la reemplaza con la del jefe.
  app.sandbox.ArpaMiCatalogo = {
    collectProductsForCloud: () => [{ id: 'viejo', nom: 'Copia vieja', pvp: 99 }],
    getActiveOficioId: () => 'automatismos',
    writeCategoriesRaw() {},
    writeProductsRaw: (oficio, productos) => { escritos = productos; }
  };
  await app.C.restoreCloudDataIfNeeded();
  await esperar();
  assert.ok(registro.includes('getcatalogo'));
  assert.ok(escritos, 'reemplazó la copia vieja');
  assert.strictEqual(escritos.length, 1);
  assert.strictEqual(escritos[0].nom, 'Motor corredizo');
  assert.strictEqual(escritos[0].pvp, 0, 'sin precios aunque el servidor mandara uno');
});

test('técnico: nunca sube el catálogo y no sube cotizaciones', async () => {
  const registro = [];
  const app = crearApp({ conLicencia: true, store: TEC_STORE, servidor: servidorFalso(registro) });
  await app.C.pushCatalogo();
  const subio = await app.C.pushHistorialEntry({ id: 'x1', documento: 'Cotización', modulo: 'cotizacion', total: 5 });
  await esperar();
  assert.strictEqual(subio, false);
  assert.ok(!registro.includes('savecatalogo'));
  assert.ok(!registro.includes('savehistorialentry'));
});

test('técnico: el historial solo muestra sus informes y nunca montos', async () => {
  const registro = [];
  const app = crearApp({ conLicencia: true, store: TEC_STORE, servidor: servidorFalso(registro) });
  await app.C.restoreCloudDataIfNeeded();
  await esperar();
  const guardado = app.historial();
  assert.deepStrictEqual(guardado.map((r) => r.id), ['f1']);
  assert.ok(guardado.every((r) => r.total == null));
  app.H.render();
  const html = app.elementos['historial-list'].innerHTML;
  assert.ok(html.includes('JP-OT-001'));
  assert.ok(!html.includes('JF-COT-001'));
  assert.strictEqual(app.elementos['hist-stat-cot-mes'].textContent.replace(/\D/g, ''), '0');
});

test('técnico: aunque el celular tenga cotizaciones viejas guardadas, no se muestran (ni se borran)', () => {
  const store = Object.assign({}, TEC_STORE, {
    arpa_suite_servicio_historial: JSON.stringify([
      { id: 'c9', modulo: 'cotizacion', documento: 'Cotización', numero: 'OLD-COT-9', cliente: 'Z', total: 777, savedAt: '2026-11-01T00:00:00Z' },
      { id: 'f9', modulo: 'formato', documento: 'Formato de Servicio', numeroServicio: 'JP-OT-009', cliente: 'Y', savedAt: '2026-11-02T00:00:00Z' }
    ])
  });
  const app = crearApp({ conLicencia: true, store });
  app.H.render();
  const html = app.elementos['historial-list'].innerHTML;
  assert.ok(html.includes('JP-OT-009'));
  assert.ok(!html.includes('OLD-COT-9'));
  assert.strictEqual(app.historial().length, 2, 'no borra lo guardado');
});

test('jefe y licencia PYME vieja sin rol: todo como hoy (sube catálogo, ve montos)', async () => {
  for (const rol of ['jefe', null]) {
    const store = {
      arpa_suite_license_code: 'ARPA-PYME-0003',
      arpa_suite_license_plan: 'PYME',
      arpa_suite_user_settings: JSON.stringify({ technicianCode: 'JF' })
    };
    if (rol) store.arpa_suite_license_rol = rol;
    const registro = [];
    const app = crearApp({ conLicencia: true, store, servidor: servidorFalso(registro) });
    assert.strictEqual(app.L.isTechnicianRole(), false);
    assert.strictEqual(app.N.getTechnicianCode(), 'JF');
    app.sandbox.ArpaMiCatalogo = { collectProductsForCloud: () => [{ id: 'p', nom: 'M', pvp: 10 }], markEverHadProducts() {} };
    await app.C.pushCatalogo();
    assert.ok(registro.includes('savecatalogo'), 'rol ' + rol);
    await app.C.restoreCloudDataIfNeeded();
    await esperar();
    const cot = app.historial().find((r) => r.id === 'c1');
    assert.strictEqual(cot.total, 2500000, 'el jefe ve sus montos');
  }
});

test('validar: guarda el rol de técnico y al volver a jefe lo borra', () => {
  const app = crearApp({ conLicencia: true, store: { arpa_suite_license_code: 'ARPA-TEC-0001' } });
  const cambio = app.L.saveRoleFromValidation({ rol: 'tecnico', licencia_jefe: 'arpa-pyme-0003', iniciales: 'jp', nombre_tecnico: 'Juan' });
  assert.strictEqual(cambio, true);
  assert.strictEqual(app.L.isTechnicianRole(), true);
  assert.strictEqual(app.L.getTechnicianInitials(), 'JP');
  assert.strictEqual(app.L.saveRoleFromValidation({ rol: 'tecnico', licencia_jefe: 'ARPA-PYME-0003', iniciales: 'JP' }), false);
  app.L.saveRoleFromValidation({ rol: 'jefe' });
  assert.strictEqual(app.L.isTechnicianRole(), false);
  assert.strictEqual(app.store.arpa_suite_tecnico_iniciales, undefined);
});
