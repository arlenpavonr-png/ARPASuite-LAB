const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const CONFIGURED_KEY = 'arpa_suite_settings_configured';

function mockLocalStorage(initial) {
  const store = Object.assign({}, initial || {});
  global.localStorage = {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    }
  };
}

mockLocalStorage({});
const brand = require('../js/arpa-brand.js');

describe('containsLegacyBrandText', () => {
  it('no da true con oficio automatismos + técnico real (falso positivo de hoy)', () => {
    const draft = JSON.stringify({
      _formatoOficio: 'automatismos',
      'campo-tecnico-responsable': 'Carlos Ruiz'
    });
    assert.equal(brand.containsLegacyBrandText(draft), false);
  });

  it('no da true con "automatismos" y "arlen" sueltos sin las frases del regex', () => {
    const blob = 'oficio automatismos, cliente Marlen Gomez, ciudad Medellin';
    assert.equal(brand.containsLegacyBrandText(blob), false);
  });

  it('sigue detectando el placeholder Automatismos Arlen Pav', () => {
    assert.equal(brand.containsLegacyBrandText('Automatismos Arlen Pav'), true);
  });

  it('sigue detectando el placeholder Automatismos Arlenpav', () => {
    assert.equal(brand.containsLegacyBrandText('Automatismos Arlenpav'), true);
  });
});

describe('isFakeDefaultSettings / isLegacyPreset / isLegacyFieldValue', () => {
  it('isFakeDefaultSettings reconoce Su Empresa S.A.S. + NIT 000', () => {
    assert.equal(brand.isFakeDefaultSettings({
      companyName: 'Su Empresa S.A.S.',
      nit: '000.000.000-0'
    }), true);
  });

  it('isLegacyFieldValue reconoce NIT legacy 901.473.259', () => {
    assert.equal(brand.isLegacyFieldValue('901.473.259'), true);
  });

  it('isLegacyPreset es false con empresa real sin patrones legacy', () => {
    assert.equal(brand.isLegacyPreset({
      companyName: 'Puertas del Norte SAS',
      nit: '900.111.222-3',
      technicianName: 'Carlos Ruiz'
    }), false);
  });
});

describe('shouldPurgeSettings / shouldPurgeDraft / hasUserSettings', () => {
  beforeEach(() => {
    mockLocalStorage({ [CONFIGURED_KEY]: 'true' });
  });

  it('hasUserSettings es true con el flag configurado', () => {
    assert.equal(brand.hasUserSettings(), true);
  });

  it('shouldPurgeSettings siempre false si el usuario ya configuró', () => {
    assert.equal(brand.shouldPurgeSettings({
      companyName: 'Automatismos Arlenpav',
      technicianName: 'arlen pavon',
      activeOficios: ['automatismos']
    }), false);
    assert.equal(brand.shouldPurgeSettings(null), false);
    assert.equal(brand.shouldPurgeSettings({}), false);
  });

  it('shouldPurgeDraft siempre false si el usuario ya configuró', () => {
    const dirty = JSON.stringify({
      _formatoOficio: 'automatismos',
      technicianName: 'arlen pavon'
    });
    assert.equal(brand.shouldPurgeDraft(dirty), false);
    assert.equal(brand.shouldPurgeDraft('{}'), false);
    assert.equal(brand.shouldPurgeDraft(''), false);
  });
});

describe('Modo Demo backup/restore', () => {
  const SETTINGS_KEY = 'arpa_suite_user_settings';
  const CONFIGURED_KEY = 'arpa_suite_settings_configured';
  const LOGO_KEY = 'arpa_logo';
  const DEMO_MODE_KEY = 'arpa_suite_demo_mode';
  const DEMO_BACKUP_SETTINGS_KEY = 'arpa_suite_demo_backup_settings';
  const DEMO_BACKUP_CONFIGURED_KEY = 'arpa_suite_demo_backup_configured';
  const DEMO_BACKUP_LOGO_KEY = 'arpa_suite_demo_backup_logo';
  const LICENSE_CODE_KEY = 'arpa_suite_license_code';
  const LICENSE_VENC_KEY = 'arpa_suite_license_vencimiento';
  const LICENSE_PLAN_KEY = 'arpa_suite_license_plan';
  const DEVICE_ID_KEY = 'arpa_suite_device_id';
  const HISTORIAL_KEY = 'arpa_suite_servicio_historial';

  function api() {
    return global.ArpaBrand;
  }

  beforeEach(() => {
    mockLocalStorage({
      [SETTINGS_KEY]: JSON.stringify({ companyName: 'Mi Empresa Real', nit: '900.111.222-3' }),
      [CONFIGURED_KEY]: 'true',
      [LOGO_KEY]: 'data:image/png;base64,REALLOGO',
      [LICENSE_CODE_KEY]: 'FOUNDER1',
      [LICENSE_VENC_KEY]: '2099-12-31',
      [LICENSE_PLAN_KEY]: 'white-label',
      [DEVICE_ID_KEY]: 'device-abc',
      [HISTORIAL_KEY]: JSON.stringify([{ id: 'h1' }])
    });
  });

  it('enterDemoMode respalda settings/logo y marca el flag', () => {
    api().enterDemoMode();
    assert.equal(api().isDemoMode(), true);
    assert.equal(localStorage.getItem(DEMO_MODE_KEY), 'true');
    assert.equal(localStorage.getItem(SETTINGS_KEY), null);
    assert.equal(localStorage.getItem(CONFIGURED_KEY), null);
    assert.equal(localStorage.getItem(LOGO_KEY), null);
    assert.ok(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY).includes('Mi Empresa Real'));
    assert.equal(localStorage.getItem(DEMO_BACKUP_CONFIGURED_KEY), 'true');
    assert.equal(localStorage.getItem(DEMO_BACKUP_LOGO_KEY), 'data:image/png;base64,REALLOGO');
  });

  it('exitDemoMode restaura backups y borra el flag; backups vacíos no escriben string vacío', () => {
    api().enterDemoMode();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: 'Vector Proyectos y Servicios' }));
    localStorage.setItem(CONFIGURED_KEY, 'true');
    localStorage.setItem(LOGO_KEY, 'data:image/png;base64,DEMOLOGO');
    api().exitDemoMode();
    assert.equal(api().isDemoMode(), false);
    assert.equal(localStorage.getItem(DEMO_MODE_KEY), null);
    assert.equal(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY), null);
    assert.equal(localStorage.getItem(DEMO_BACKUP_CONFIGURED_KEY), null);
    assert.equal(localStorage.getItem(DEMO_BACKUP_LOGO_KEY), null);
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('Mi Empresa Real'));
    assert.equal(localStorage.getItem(CONFIGURED_KEY), 'true');
    assert.equal(localStorage.getItem(LOGO_KEY), 'data:image/png;base64,REALLOGO');
  });

  it('exitDemoMode elimina arpa_logo si el backup de logo está vacío', () => {
    mockLocalStorage({
      [SETTINGS_KEY]: JSON.stringify({ companyName: 'Sin Logo SAS' }),
      [CONFIGURED_KEY]: 'true'
    });
    api().enterDemoMode();
    localStorage.setItem(LOGO_KEY, 'data:image/png;base64,DEMOLOGO');
    api().exitDemoMode();
    assert.equal(localStorage.getItem(LOGO_KEY), null);
  });

  it('no toca licencia, device_id ni historial', () => {
    api().enterDemoMode();
    assert.equal(localStorage.getItem(LICENSE_CODE_KEY), 'FOUNDER1');
    assert.equal(localStorage.getItem(LICENSE_VENC_KEY), '2099-12-31');
    assert.equal(localStorage.getItem(LICENSE_PLAN_KEY), 'white-label');
    assert.equal(localStorage.getItem(DEVICE_ID_KEY), 'device-abc');
    assert.equal(localStorage.getItem(HISTORIAL_KEY), JSON.stringify([{ id: 'h1' }]));
    api().exitDemoMode();
    assert.equal(localStorage.getItem(LICENSE_CODE_KEY), 'FOUNDER1');
    assert.equal(localStorage.getItem(DEVICE_ID_KEY), 'device-abc');
    assert.equal(localStorage.getItem(HISTORIAL_KEY), JSON.stringify([{ id: 'h1' }]));
  });

  it('enterDemoMode no hace nada si ya está activo', () => {
    api().enterDemoMode();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: 'Vector' }));
    api().enterDemoMode();
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('Vector'));
    assert.ok(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY).includes('Mi Empresa Real'));
  });

  it('si ya se guardó el cliente, respalda la empresa real (home) y deja el cliente como demo', () => {
    localStorage.setItem('arpa_suite_home_settings', JSON.stringify({ companyName: 'Automatismos Arlenpav S.A.S' }));
    localStorage.setItem('arpa_suite_home_configured', 'true');
    localStorage.setItem('arpa_suite_home_logo', 'data:image/png;base64,REALLOGO');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: 'Vector Proyectos y Servicios' }));
    api().enterDemoMode();
    assert.equal(api().isDemoMode(), true);
    assert.ok(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY).includes('Automatismos Arlenpav'));
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('Vector Proyectos y Servicios'));
  });

  it('corrige inversión: empresa real en vivo y Vector en el backup', () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: 'AUTOMATISMOSARLENPAV S.A.S' }));
    localStorage.setItem(CONFIGURED_KEY, 'true');
    localStorage.setItem(LOGO_KEY, 'data:image/png;base64,REALLOGO');
    localStorage.setItem(DEMO_BACKUP_SETTINGS_KEY, JSON.stringify({ companyName: 'Vector Proyectos y Servicios' }));
    localStorage.setItem(DEMO_BACKUP_CONFIGURED_KEY, 'true');
    localStorage.setItem(DEMO_BACKUP_LOGO_KEY, 'data:image/png;base64,DEMOLOGO');
    assert.equal(api().repairInvertedDemoIfNeeded('AUTOMATISMOSARLENPAV S.A.S'), true);
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('Vector Proyectos y Servicios'));
    assert.ok(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY).includes('AUTOMATISMOSARLENPAV'));
    api().exitDemoMode();
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('AUTOMATISMOSARLENPAV'));
    assert.equal(api().isDemoMode(), false);
  });

  it('no invierte un demo correcto (Vector en vivo, empresa real en backup)', () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: 'Vector Proyectos y Servicios' }));
    localStorage.setItem(DEMO_BACKUP_SETTINGS_KEY, JSON.stringify({ companyName: 'AUTOMATISMOSARLENPAV S.A.S' }));
    assert.equal(api().repairInvertedDemoIfNeeded('AUTOMATISMOSARLENPAV S.A.S'), false);
    assert.ok(localStorage.getItem(SETTINGS_KEY).includes('Vector Proyectos y Servicios'));
    assert.ok(localStorage.getItem(DEMO_BACKUP_SETTINGS_KEY).includes('AUTOMATISMOSARLENPAV'));
  });
});

describe('fechaLocalISO', () => {
  it('devuelve AAAA-MM-DD con año/mes/día locales, no UTC', () => {
    const d = new Date(2026, 8, 30, 20, 30, 0);
    assert.equal(brand.fechaLocalISO(d), '2026-09-30');
  });

  it('suma días de validez en calendario local', () => {
    const hoy = new Date(2026, 8, 30, 20, 30, 0);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 15);
    assert.equal(brand.fechaLocalISO(hasta), '2026-10-15');
  });
});
