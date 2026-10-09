/**
 * Pruebas locales del motor ARPA IA COTIZADOR (sin red real, sin claves).
 * Uso: node js/arpa-ia/tests/cotizador-run.mjs
 *
 * No llama a Apps Script de producción. El LLM se simula en memoria.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

const PRODUCTION_LICENSE = 'https://script.google.com/macros/s/AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2/exec';
const PRODUCTION_COT = 'https://script.google.com/macros/s/AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg/exec';

const memory = {};
let fetchImpl = async function () {
  throw new Error('fetch no configurado en la prueba');
};

const sandbox = {
  console,
  parseInt,
  parseFloat,
  Number,
  String,
  Boolean,
  Array,
  Object,
  JSON,
  Math,
  Date,
  RegExp,
  Error,
  TypeError,
  setTimeout,
  clearTimeout,
  AbortController,
  fetch: function () { return fetchImpl.apply(this, arguments); },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
    removeItem: (k) => { delete memory[k]; }
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/arpa-catalogo.js');
load('js/catalogo-bft-nas.js');
load('js/arpa-oficios.js');
load('js/arpa-ia/perfiles.js');
load('js/arpa-ia/cotizador-parser.js');
load('js/arpa-ia/cotizador-llm.js');
load('js/arpa-ia/cotizador-api.js');
load('js/arpa-ia/cotizador-catalogo.js');
load('js/arpa-ia/cotizador-matcher.js');
load('js/arpa-ia/cotizador.js');
load('js/arpa-ia/cotizador-config.js');

const cotizar = sandbox.ArpaIaCotizador.cotizarDesdeTexto;
const cotizarAsync = sandbox.ArpaIaCotizador.cotizarDesdeTextoAsync;
const knownCodes = new Set(
  sandbox.ArpaCatalogo.getListaProductosDefault().map((p) => p.cod)
);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('  ok  ' + msg);
  } else {
    failed += 1;
    console.error('  FAIL  ' + msg);
  }
}

function section(name) {
  console.log('\n' + name);
}

function onlyKnownProducts(result) {
  const all = result.productos_sugeridos.concat(result.materiales_sugeridos);
  return all.every((p) => knownCodes.has(p.codigo));
}

function noInventedPrices(result) {
  const catalog = sandbox.ArpaCatalogo.getListaProductosDefault();
  const byCod = new Map(catalog.map((p) => [p.cod, p]));
  return result.productos_sugeridos.concat(result.materiales_sugeridos).every((p) => {
    const src = byCod.get(p.codigo);
    if (!src) return false;
    const expected = Number(src.pvp) > 0 ? Number(src.pvp) : null;
    return p.precio_catalogo === expected;
  });
}

function isValidShape(result) {
  return result
    && typeof result.solicitud_original === 'string'
    && result.datos_extraidos && typeof result.datos_extraidos === 'object'
    && Array.isArray(result.productos_sugeridos)
    && Array.isArray(result.materiales_sugeridos)
    && Array.isArray(result.datos_faltantes)
    && Array.isArray(result.observaciones)
    && typeof result.fuente === 'string'
    && typeof result.estado_llm === 'string';
}

const CASES = [
  {
    id: 1,
    text: 'Puerta corrediza residencial de 500 kg, 5 metros, Medellín.',
    llm: {
      tipo_de_trabajo: 'instalacion',
      tipo_de_puerta: 'corrediza',
      uso: 'residencial',
      peso_kg: 500,
      ancho_m: 5,
      ciudad: 'Medellín',
      materiales_mencionados: [],
      observaciones: [],
      datos_faltantes: []
    },
    check(r, tag) {
      assert(r.datos_extraidos.tipo_de_puerta === 'corrediza', tag + ' tipo puerta');
      assert(r.datos_extraidos.uso === 'residencial', tag + ' uso');
      assert(r.datos_extraidos.peso_estimado === 500, tag + ' peso 500');
      assert(r.datos_extraidos.recorrido_m === 5, tag + ' recorrido 5 m');
      assert(r.datos_extraidos.ciudad === 'Medellín', tag + ' ciudad');
      assert(r.productos_sugeridos.length > 0, tag + ' sugiere motores');
      assert(
        r.productos_sugeridos.every((p) => /corrediz/i.test(p.categoria)),
        tag + ' solo categoría corrediza'
      );
      assert(
        r.productos_sugeridos.every((p) => p.capacidad_kg_catalogo == null || p.capacidad_kg_catalogo >= 500),
        tag + ' no sugiere subdimensionados'
      );
    }
  },
  {
    id: 2,
    text: 'Necesito motor para una puerta de 800 kilos.',
    llm: {
      tipo_de_trabajo: 'instalacion',
      tipo_de_puerta: null,
      uso: null,
      peso_kg: 800,
      ancho_m: null,
      ciudad: null,
      materiales_mencionados: [],
      observaciones: [],
      datos_faltantes: ['tipo_de_puerta', 'uso', 'ciudad']
    },
    check(r, tag) {
      assert(r.datos_extraidos.peso_estimado === 800, tag + ' peso 800');
      assert(r.datos_faltantes.includes('tipo_de_puerta'), tag + ' falta tipo de puerta');
      assert(r.datos_faltantes.includes('ciudad'), tag + ' falta ciudad');
      assert(r.datos_faltantes.includes('uso'), tag + ' falta uso');
      assert(
        r.productos_sugeridos.every((p) => p.capacidad_kg_catalogo == null || p.capacidad_kg_catalogo >= 800),
        tag + ' capacidad >= 800 cuando se conoce'
      );
    }
  },
  {
    id: 3,
    text: 'Quiero automatizar una puerta batiente residencial.',
    llm: {
      tipo_de_trabajo: 'instalacion',
      tipo_de_puerta: 'batiente',
      uso: 'residencial',
      peso_kg: null,
      ancho_m: null,
      ciudad: null,
      materiales_mencionados: [],
      observaciones: [],
      datos_faltantes: ['peso_estimado', 'ancho_m', 'ciudad']
    },
    check(r, tag) {
      assert(r.datos_extraidos.tipo_de_trabajo === 'instalacion', tag + ' instalación');
      assert(r.datos_extraidos.tipo_de_puerta === 'batiente', tag + ' batiente');
      assert(r.datos_extraidos.uso === 'residencial', tag + ' residencial');
      assert(r.datos_faltantes.includes('peso_estimado') || r.datos_faltantes.includes('peso_kg'), tag + ' falta peso');
      assert(r.datos_faltantes.includes('ancho_m'), tag + ' falta ancho');
      assert(
        r.productos_sugeridos.every((p) => /batiente/i.test(p.categoria)),
        tag + ' solo batientes del catálogo'
      );
    }
  },
  {
    id: 4,
    text: 'Motor para puerta corrediza de 1200 kg.',
    llm: {
      tipo_de_trabajo: 'instalacion',
      tipo_de_puerta: 'corrediza',
      uso: null,
      peso_kg: 1200,
      ancho_m: null,
      ciudad: null,
      materiales_mencionados: [],
      observaciones: [],
      datos_faltantes: ['uso', 'ciudad', 'recorrido_m']
    },
    check(r, tag) {
      assert(r.datos_extraidos.tipo_de_puerta === 'corrediza', tag + ' corrediza');
      assert(r.datos_extraidos.peso_estimado === 1200, tag + ' peso 1200');
      assert(r.datos_faltantes.includes('ciudad'), tag + ' falta ciudad');
      assert(r.productos_sugeridos.length > 0, tag + ' hay opciones DEV');
      assert(
        r.productos_sugeridos.every((p) => p.capacidad_kg_catalogo == null || p.capacidad_kg_catalogo >= 1200),
        tag + ' no sugiere menos de 1200 kg'
      );
      assert(
        r.productos_sugeridos.some((p) => /1200/i.test(p.nombre)),
        tag + ' incluye motor 1200 del catálogo'
      );
    }
  }
];

CASES.forEach((c) => {
  section('Parser local — caso ' + c.id + ' — ' + c.text);
  const result = cotizar(c.text);
  console.log('  fuente:', result.fuente, '| llm:', result.estado_llm);
  console.log('  productos:', result.productos_sugeridos.slice(0, 5).map((p) => p.codigo + ' (' + p.coincidencia + ')').join(', ') || '(ninguno)');
  console.log('  faltantes:', result.datos_faltantes.join(', ') || '(ninguno)');
  assert(isValidShape(result), 'JSON con forma esperada');
  assert(result.solicitud_original === c.text, 'conserva solicitud original');
  assert(result.fuente === 'local', 'fuente local por defecto');
  assert(result.estado_llm === 'desconectado', 'LLM desconectado sin backend DEV');
  assert(onlyKnownProducts(result), 'solo códigos del catálogo DEV');
  assert(noInventedPrices(result), 'precios idénticos al catálogo o null');
  c.check(result, 'local caso ' + c.id);
});

section('Seguridad — no usar producción');
{
  let productionCalled = 0;
  fetchImpl = async function (url) {
    productionCalled += 1;
    throw new Error('NO se debe llamar producción: ' + url);
  };
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: PRODUCTION_LICENSE });
  const r1 = await cotizarAsync(CASES[0].text);
  assert(productionCalled === 0, 'no se envió fetch a LICENSE_API');
  assert(r1.estado_llm === 'bloqueado_produccion', 'bloquea LICENSE_API de producción');
  assert(r1.fuente === 'local_por_error_llm', 'cae a parser local tras bloqueo');
  assert(r1.datos_extraidos.peso_estimado === 500, 'el fallback local sigue extrayendo');

  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: PRODUCTION_COT });
  const r2 = await cotizarAsync(CASES[0].text);
  assert(productionCalled === 0, 'no se envió fetch a COT_SHEETS_URL');
  assert(r2.estado_llm === 'bloqueado_produccion', 'bloquea COT_SHEETS_URL de producción');
}

section('LLM simulado (sin red) — contrato + matcher local');
{
  const DEV_FAKE = 'https://script.google.com/macros/s/DEV-FAKE-ARPA-IA-LLM-ONLY/exec';
  fetchImpl = async function (url, options) {
    if (String(url).indexOf('AKfycbzKBey') !== -1 || String(url).indexOf('AKfycbyV0') !== -1) {
      throw new Error('fetch a producción bloqueado en mock');
    }
    assert(String(url) === DEV_FAKE, 'fetch solo al endpoint DEV falso');
    const body = JSON.parse(options.body);
    assert(typeof body.text === 'string' && body.text.length > 0, 'payload text');
    assert(body.oficio === 'automatizacion', 'payload oficio oficial automatizacion');
    assert(!body.productos && !body.catalogo && !body.precios, 'no envía catálogo ni precios al LLM');
    assert(body.modo !== 'tecnica', 'cotizador no envía modo tecnica');
    const found = CASES.find((c) => c.text === body.text);
    const extraido = found
      ? Object.assign({}, found.llm, {
          productos_inventados: [{ codigo: 'FAKE', precio: 999999 }],
          pvp: 123456
        })
      : null;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, extraido: extraido })
    };
  };

  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: DEV_FAKE });
  for (const c of CASES) {
    const result = await cotizarAsync(c.text);
    console.log('  caso ' + c.id + ' fuente=' + result.fuente + ' productos=' + result.productos_sugeridos.slice(0, 3).map((p) => p.codigo).join(','));
    assert(isValidShape(result), 'llm caso ' + c.id + ' JSON válido');
    assert(result.fuente === 'llm', 'llm caso ' + c.id + ' fuente llm');
    assert(result.estado_llm === 'ok', 'llm caso ' + c.id + ' estado ok');
    assert(result.error_llm == null, 'llm caso ' + c.id + ' sin error');
    assert(onlyKnownProducts(result), 'llm caso ' + c.id + ' no inventa productos');
    assert(noInventedPrices(result), 'llm caso ' + c.id + ' no inventa precios');
    assert(!result.productos_sugeridos.some((p) => p.codigo === 'FAKE'), 'llm caso ' + c.id + ' ignora productos del modelo');
    c.check(result, 'llm caso ' + c.id);
  }
}

section('LLM inválido — fallback local limpio');
{
  const DEV_FAKE = 'https://script.google.com/macros/s/DEV-FAKE-ARPA-IA-LLM-ONLY/exec';
  fetchImpl = async function () {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, extraido: 'esto no es json de extracción' })
    };
  };
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: DEV_FAKE });
  const result = await cotizarAsync(CASES[1].text);
  assert(result.fuente === 'local_por_error_llm', 'cae a local si el LLM no da JSON');
  assert(result.estado_llm === 'error', 'estado_llm error');
  assert(result.error_llm && result.error_llm.codigo === 'json_invalido', 'error_llm json_invalido');
  assert(result.datos_extraidos.peso_estimado === 800, 'fallback extrae 800 kg');
  assert(isValidShape(result), 'JSON válido tras error LLM');
}

section('Sin endpoint — no rompe');
{
  fetchImpl = async function () { throw new Error('no debería fetch'); };
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'remote', endpoint: '' });
  const result = await cotizarAsync(CASES[2].text);
  assert(result.estado_llm === 'desconectado', 'sin endpoint = desconectado');
  assert(result.datos_extraidos.tipo_de_puerta === 'batiente', 'parser local responde');
}

section('Once oficios — parser, matcher y catálogo');
{
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'local', endpoint: '' });
  const AUTO_FIELDS = ['tipo_de_puerta', 'peso_estimado', 'peso_kg', 'ancho_m', 'recorrido_m', 'cantidad_motores'];
  const PREFIX = {
    electricidad: 'ELE-',
    gas: 'GAS-',
    refrigeracion: 'RAC-',
    metalmecanica: 'MET-',
    plagas: 'PLA-',
    linea_blanca: 'LB-',
    solar: 'SOL-',
    plomeria: 'PLO-',
    cctv: 'CAM-',
    taller_motos: 'MOT-'
  };

  function fieldIds(profile) {
    return (profile.fields || []).map((f) => f.id);
  }

  function pricesFromResolved(result, oficioId) {
    const cat = sandbox.ArpaIaCotizadorCatalogo.resolveCatalog(oficioId);
    const byCod = new Map(cat.products.map((p) => [p.codigo, p]));
    return result.productos_sugeridos.concat(result.materiales_sugeridos).every((p) => {
      const src = byCod.get(p.codigo);
      if (!src) return false;
      return p.precio_catalogo === src.precio_catalogo;
    });
  }

  const OFICIO_CASES = [
    {
      id: 'electricidad',
      alias: 'electricidad',
      text: 'Instalar 8 puntos eléctricos, 40 metros de cable, Medellín.',
      check(r) {
        assert(r.datos_extraidos.puntos === 8, 'electricidad 8 puntos');
        assert(r.datos_extraidos.metros_cable === 40, 'electricidad 40 m cable');
        assert(r.datos_extraidos.ciudad === 'Medellín', 'electricidad ciudad');
        assert(r.datos_extraidos.tipo_de_trabajo === 'instalacion', 'electricidad instalación');
      }
    },
    {
      id: 'gas',
      text: 'Instalación de gas para cocina, 12 metros de tubería, Medellín.',
      check(r) {
        assert(r.datos_extraidos.metros_tuberia === 12, 'gas 12 m tubería');
        assert(r.datos_extraidos.ciudad === 'Medellín', 'gas ciudad');
        assert(r.datos_extraidos.tipo_servicio === 'cocina' || r.datos_extraidos.tipo_de_trabajo === 'instalacion', 'gas servicio/trabajo');
      }
    },
    {
      id: 'refrigeracion',
      text: 'Mantenimiento de aire acondicionado de 12000 BTU, Medellín.',
      check(r) {
        assert(r.datos_extraidos.btu === 12000, 'refrigeracion 12000 BTU');
        assert(r.datos_extraidos.tipo_equipo === 'aire acondicionado', 'refrigeracion tipo equipo');
        assert(r.datos_extraidos.tipo_de_trabajo === 'mantenimiento', 'refrigeracion mantenimiento');
        assert(r.datos_extraidos.ciudad === 'Medellín', 'refrigeracion ciudad');
      }
    },
    {
      id: 'metalmecanica',
      text: 'Fabricar una reja de 2 por 3 metros en acero.',
      check(r) {
        assert(r.datos_extraidos.tipo_pieza === 'reja', 'metalmecanica reja');
        assert(r.datos_extraidos.material === 'acero', 'metalmecanica acero');
        assert(r.datos_extraidos.metros_cuadrados === 6, 'metalmecanica 6 m²');
      }
    },
    {
      id: 'plagas',
      alias: 'control_de_plagas',
      text: 'Control de plagas para una casa de 180 m2.',
      check(r) {
        assert(r.datos_extraidos.area_m2 === 180, 'plagas 180 m²');
        assert(r.datos_extraidos.tipo_servicio === 'control', 'plagas control');
      }
    },
    {
      id: 'linea_blanca',
      text: 'Reparar lavadora Haceb que no centrifuga.',
      check(r) {
        assert(r.datos_extraidos.tipo_equipo === 'lavadora', 'linea blanca lavadora');
        assert(r.datos_extraidos.marca === 'Haceb', 'linea blanca Haceb');
        assert(r.datos_extraidos.falla === 'no centrifuga', 'linea blanca falla');
        assert(r.datos_extraidos.tipo_de_trabajo === 'reparacion', 'linea blanca reparación');
      }
    },
    {
      id: 'solar',
      alias: 'energia_solar',
      text: 'Instalar sistema solar de 5 kW con 10 paneles.',
      check(r) {
        assert(r.datos_extraidos.potencia_kw === 5, 'solar 5 kW');
        assert(r.datos_extraidos.paneles === 10, 'solar 10 paneles');
        assert(r.datos_extraidos.tipo_de_trabajo === 'instalacion', 'solar instalación');
      }
    },
    {
      id: 'plomeria',
      text: 'Reparar fuga de agua y cambiar 8 metros de tubería.',
      check(r) {
        assert(r.datos_extraidos.tipo_de_trabajo === 'reparacion', 'plomeria reparación');
        assert(r.datos_extraidos.metros_tuberia === 8, 'plomeria 8 m');
        assert(r.datos_extraidos.tipo_servicio === 'fuga', 'plomeria fuga');
      }
    },
    {
      id: 'cctv',
      alias: 'cctv_seguridad',
      text: 'Instalar 6 cámaras IP con 80 metros de cable.',
      check(r) {
        assert(r.datos_extraidos.camaras === 6, 'cctv 6 cámaras');
        assert(r.datos_extraidos.metros_cable === 80, 'cctv 80 m cable');
        assert(r.datos_extraidos.tipo_sistema === 'IP', 'cctv IP');
        assert(r.datos_extraidos.tipo_de_trabajo === 'instalacion', 'cctv instalación');
      }
    },
    {
      id: 'taller_motos',
      text: 'Revisión y mantenimiento de moto Honda 150 con 25000 km.',
      check(r) {
        assert(r.datos_extraidos.marca === 'Honda', 'motos Honda');
        assert(r.datos_extraidos.cilindraje === 150, 'motos 150 cc');
        assert(r.datos_extraidos.kilometraje === 25000, 'motos 25000 km');
        assert(r.datos_extraidos.tipo_servicio === 'revision' || r.datos_extraidos.tipo_de_trabajo === 'mantenimiento', 'motos servicio');
      }
    }
  ];

  OFICIO_CASES.forEach((c) => {
    const r = sandbox.ArpaIaCotizador.cotizarDesdeTexto(c.text, { oficioId: c.alias || c.id });
    const profile = sandbox.ArpaIaPerfiles.getProfile(c.id);
    const ids = fieldIds(profile);
    const cat = sandbox.ArpaIaCotizadorCatalogo.resolveCatalog(c.id);
    console.log('  ' + c.id + ' oficio=' + r.oficio_id + ' fuente=' + r.catalogo_fuente + ' productos=' + r.productos_sugeridos.slice(0, 3).map((p) => p.codigo).join(','));
    assert(r.oficio_id === c.id, c.id + ' oficio correcto');
    assert(r.perfil_id === c.id, c.id + ' perfil correcto');
    assert(sandbox.ArpaIaCotizadorMatcher.suggest(r.datos_extraidos, cat.products, profile).oficio_id === c.id, c.id + ' matcher recibe perfil');
    AUTO_FIELDS.forEach((f) => {
      assert(r.datos_extraidos[f] == null, c.id + ' no extrae ' + f);
    });
    assert(!r.productos_sugeridos.some((p) => p.capacidad_kg_catalogo != null), c.id + ' UI/matcher sin kg');
    assert(r.productos_sugeridos.every((p) => cat.products.some((s) => s.codigo === p.codigo)), c.id + ' solo catálogo del oficio');
    assert(!r.productos_sugeridos.some((p) => knownCodes.has(p.codigo)), c.id + ' no mezcla automatismos');
    if (PREFIX[c.id]) {
      assert(r.productos_sugeridos.every((p) => String(p.codigo).indexOf(PREFIX[c.id]) === 0), c.id + ' prefijo de catálogo');
    }
    assert(pricesFromResolved(r, c.id), c.id + ' precios del catálogo');
    assert(!ids.includes('tipo_de_puerta'), c.id + ' perfil sin campo puerta');
    assert(!ids.includes('peso_estimado'), c.id + ' perfil sin campo kg');
    c.check(r);
    assert(r.productos_sugeridos.length > 0, c.id + ' sugiere del seed/catálogo');
  });

  const rAuto = sandbox.ArpaIaCotizador.cotizarDesdeTexto(CASES[0].text, { oficioId: 'automatizacion' });
  assert(rAuto.oficio_id === 'automatismos', 'alias automatizacion → automatismos');
  assert(rAuto.datos_extraidos.tipo_de_puerta === 'corrediza', 'automatización sigue extrayendo puerta');
  assert(rAuto.datos_extraidos.peso_estimado === 500, 'automatización sigue extrayendo 500 kg');
  assert(rAuto.productos_sugeridos.every((p) => knownCodes.has(p.codigo)), 'automatización usa su catálogo');

  const rGhost = sandbox.ArpaIaCotizador.cotizarDesdeTexto('Instalar tablero', { oficioId: 'foobar_inexistente' });
  assert(rGhost.oficio_id !== 'automatismos', 'oficio desconocido no cae a automatismos');
  assert(!rGhost.productos_sugeridos.some((p) => knownCodes.has(p.codigo)), 'desconocido no usa catálogo de puertas');
}

section('Aislamiento — oficio y catálogo explícitos');
{
  sandbox.ArpaIaCotizadorApi.configure({ mode: 'local', endpoint: '' });
  const rAuto = sandbox.ArpaIaCotizador.cotizarDesdeTexto(CASES[0].text, { oficioId: 'automatismos' });
  assert(rAuto.oficio_id === 'automatismos', 'oficio explícito automatismos');
  assert(rAuto.perfil_id === 'automatismos', 'perfil automatismos');
  assert(rAuto.catalogo_fuente === 'default' || rAuto.catalogo_fuente === 'mi_catalogo' || rAuto.catalogo_fuente === 'explicito', 'catálogo resuelto');
  assert(rAuto.productos_sugeridos.every((p) => knownCodes.has(p.codigo)), 'automatismos no sale del catálogo default');

  const elecCatalog = [
    { codigo: 'ELE-001', nombre: 'Breaker 1 polo 20A', marca: 'Gen', categoria: 'Protección', precio_catalogo: 18000 },
    { codigo: 'ELE-003', nombre: 'Tablero de distribución 12 circuitos', marca: 'Gen', categoria: 'Tableros', precio_catalogo: 95000 }
  ];
  const rElec = sandbox.ArpaIaCotizador.cotizarDesdeTexto(
    'Instalación de tablero eléctrico residencial en Medellín.',
    { oficioId: 'electricidad', catalogo: elecCatalog }
  );
  assert(rElec.oficio_id === 'electricidad', 'oficio electricidad explícito');
  assert(rElec.perfil_id === 'electricidad', 'perfil electricidad');
  assert(rElec.catalogo_fuente === 'explicito', 'catálogo pasado explícitamente');
  assert(rElec.productos_sugeridos.every((p) => p.codigo.indexOf('ELE-') === 0), 'electricidad no mezcla motores de puertas');
  assert(!rElec.productos_sugeridos.some((p) => knownCodes.has(p.codigo) && p.codigo.indexOf('ELE-') !== 0), 'no aparecen códigos de automatismos');
  assert(rElec.productos_sugeridos.length > 0, 'matcher genérico usa el catálogo eléctrico');
  assert(rElec.productos_sugeridos.every((p) => p.precio_catalogo === 18000 || p.precio_catalogo === 95000), 'precios del catálogo eléctrico');
}

section('Selector Configuración — taller_motos');
{
  const list = sandbox.ArpaOficios.getOficiosList();
  const ids = list.map((o) => o.id);
  assert(ids.includes('taller_motos'), 'OFICIOS incluye taller_motos');
  assert(ids.length === 11, 'selector tiene 11 oficios');
  assert(ids.filter((id) => id === 'taller_motos').length === 1, 'taller_motos no está duplicado');
  assert(sandbox.ArpaOficios.getOficioById('taller_motos').id === 'taller_motos', 'getOficioById resuelve taller_motos');
  assert(sandbox.ArpaOficios.getOficioLabel('taller_motos') === 'Taller de motos', 'nombre visible Taller de motos');
  const others = ['automatismos', 'electricidad', 'gas', 'refrigeracion', 'cctv', 'plomeria', 'metalmecanica', 'plagas', 'linea_blanca', 'solar'];
  others.forEach((id) => assert(ids.includes(id), 'oficio previo intacto: ' + id));
}

section('ARPA IA — PVP desde catálogo default si Mi Catálogo tiene 0');
{
  const def = sandbox.ArpaCatalogo.getListaProductosDefault().find((p) => p.cod === 'KARESBTA1000Z25-2');
  assert(def && Number(def.pvp) > 0, 'catálogo default tiene PVP real');
  const expected = Number(def.pvp);
  sandbox.localStorage.setItem('arpa_catalog_automatismos', JSON.stringify([{
    id: 'test-zero',
    cod: 'KARESBTA1000Z25-2',
    nom: 'Kit BFT Ares BT A1000 220V Pinon 25 - Corrediza hasta 500kg 12m/min',
    marca: 'BFT',
    categoria: 'Corrediza',
    pvp: 0
  }]));
  const resolved = sandbox.ArpaIaCotizadorCatalogo.resolveCatalog('automatismos');
  const iaItem = resolved.products.find((p) => p.codigo === 'KARESBTA1000Z25-2');
  const stored = JSON.parse(sandbox.localStorage.getItem('arpa_catalog_automatismos'));
  assert(resolved.fuente === 'mi_catalogo', 'usa Mi Catálogo cuando hay productos');
  assert(iaItem && iaItem.precio_catalogo === expected, 'IA toma PVP del catálogo default');
  assert(Number(stored[0].pvp) === 0, 'no muta el pvp guardado en Mi Catálogo');

  sandbox.localStorage.setItem('arpa_catalog_automatismos', JSON.stringify([{
    id: 'test-ghost',
    cod: 'MOT-NO-EXISTE',
    nom: 'Producto sin PVP en default',
    marca: '',
    categoria: 'Servicios',
    pvp: 0
  }]));
  const ghost = sandbox.ArpaIaCotizadorCatalogo.resolveCatalog('automatismos').products[0];
  assert(ghost.precio_catalogo == null, 'sin PVP real en default = sin precio');
  sandbox.localStorage.removeItem('arpa_catalog_automatismos');
}

section('ARPA IA — PVP default + BFT/NAS por SKU exacto');
{
  function setUserProducts(rows) {
    sandbox.localStorage.setItem('arpa_catalog_automatismos', JSON.stringify(rows.map((row, i) => ({
      id: 't' + i,
      marca: row.marca || 'NAS',
      categoria: 'Corrediza',
      pvp: 0,
      ...row
    }))));
  }
  function resolveByCod(cod) {
    return sandbox.ArpaIaCotizadorCatalogo.resolveCatalog('automatismos').products.find((p) => p.codigo === cod);
  }

  const defAres = sandbox.ArpaCatalogo.getListaProductosDefault().find((p) => p.cod === 'KARESBTA1000Z25-2');
  const nasAres = sandbox.CATALOGO_BFT_NAS.find((p) => p.codigo === 'KARESBTA1000Z25-2');
  const nas110 = sandbox.CATALOGO_BFT_NAS.find((p) => p.codigo === 'KFORZA800-1');
  const nas220 = sandbox.CATALOGO_BFT_NAS.find((p) => p.codigo === 'KFORZA800-2');
  assert(defAres && Number(defAres.pvp) > 0, 'C default Ares tiene PVP');
  assert(nas110 && Number(nas110.precio) === 1183900, 'A BFT/NAS Forza 800 110V = 1183900');
  assert(nas220 && Number(nas220.precio) === 1218900, 'B BFT/NAS Forza 800 220V = 1218900');
  assert(Number(nasAres.precio) !== Number(defAres.pvp), 'C default y BFT/NAS Ares no son el mismo número');

  setUserProducts([
    { cod: 'KFORZA800-1', nom: 'Motor NAS Forza 800 110V - Corrediza hasta 800kg 13m/min Semi Intensivo' },
    { cod: 'KFORZA800-2', nom: 'Motor NAS Forza 800 220V - Corrediza hasta 800kg 13m/min Semi Intensivo' },
    { cod: 'KARESBTA1000Z25-2', nom: 'Kit BFT Ares BT A1000 220V Pinon 25 - Corrediza hasta 500kg 12m/min', marca: 'BFT' },
    { cod: 'MOT-NO-EXISTE', nom: 'Producto sin PVP en ninguna fuente' }
  ]);
  const r110 = resolveByCod('KFORZA800-1');
  const r220 = resolveByCod('KFORZA800-2');
  const rAres = resolveByCod('KARESBTA1000Z25-2');
  const rGhost = resolveByCod('MOT-NO-EXISTE');
  const stored = JSON.parse(sandbox.localStorage.getItem('arpa_catalog_automatismos'));

  assert(r110 && r110.precio_catalogo === 1183900, 'A Forza 800 110V PVP por SKU KFORZA800-1');
  assert(r220 && r220.precio_catalogo === 1218900, 'B Forza 800 220V PVP 1218900 por SKU KFORZA800-2');
  assert(rAres && rAres.precio_catalogo === Number(defAres.pvp), 'C conserva PVP del catálogo default');
  assert(rAres.precio_catalogo !== Number(nasAres.precio), 'C no pisa default con BFT/NAS');
  assert(rGhost && rGhost.precio_catalogo == null, 'D sin PVP en ninguna fuente = sin precio');
  assert(r110.precio_catalogo !== r220.precio_catalogo, 'E 110V y 220V no comparten precio');
  assert(stored.every((p) => Number(p.pvp) === 0), 'no muta Mi Catálogo');

  sandbox.localStorage.removeItem('arpa_catalog_automatismos');
}

section('FASE 4.12 — integración Cotizaciones (oficio, faltantes, aislamiento)');
{
  const inf = sandbox.ArpaIaPerfiles.inferOficioFromText;
  assert(inf('Necesito automatizar una puerta corrediza residencial de 500 kg, 5 metros, Medellín.') === 'automatismos', 'infiere automatismos');
  assert(inf('Necesito automatizar una puerta batiente residencial.') === 'automatismos', 'infiere batiente');
  assert(inf('Necesito revisar una nevera que no enfría.') === 'refrigeracion', 'infiere refrigeracion');
  assert(inf('Necesito reparar una moto Honda 150 que tiene 25000 km.') === 'taller_motos', 'infiere taller_motos');

  const r1 = cotizar('Necesito automatizar una puerta corrediza residencial de 500 kg, 5 metros, Medellín.');
  assert(r1.oficio_id === 'automatismos', '1 oficio automatismos');
  assert(r1.datos_extraidos.tipo_de_puerta === 'corrediza', '1 extrae corrediza');
  assert(r1.datos_extraidos.peso_estimado === 500, '1 extrae 500 kg');
  assert(r1.datos_extraidos.recorrido_m === 5, '1 extrae 5 m');
  assert(r1.productos_sugeridos.length > 0, '1 productos reales');
  assert(r1.productos_sugeridos.every((p) => p.codigo), '1 códigos reales');
  assert(r1.productos_sugeridos.every((p) => p.precio_catalogo == null || Number(p.precio_catalogo) > 0), '1 PVP real o vacío, nunca inventado');
  assert(r1.productos_sugeridos.every((p) => {
    const def = sandbox.ArpaCatalogo.getListaProductosDefault().find((x) => x.cod === p.codigo);
    const nas = sandbox.CATALOGO_BFT_NAS.find((x) => x.codigo === p.codigo);
    return !!(def || nas);
  }), '1 SKU existe en catálogo LAB');

  const r2 = cotizar('Necesito automatizar una puerta batiente residencial.');
  assert(r2.oficio_id === 'automatismos', '2 oficio automatismos');
  assert(r2.datos_extraidos.tipo_de_puerta === 'batiente', '2 extrae batiente');
  assert(r2.datos_faltantes.includes('peso_estimado'), '2 pide peso');
  assert(r2.datos_faltantes.includes('ancho_m'), '2 pide ancho');
  assert(r2.datos_extraidos.peso_estimado == null, '2 no inventa peso');
  assert(r2.datos_extraidos.ancho_m == null, '2 no inventa ancho');

  const r3 = cotizar('Necesito revisar una nevera que no enfría.');
  assert(r3.oficio_id === 'refrigeracion', '3 oficio refrigeracion');
  assert(!r3.productos_sugeridos.some((p) => knownCodes.has(p.codigo)), '3 no muestra automatización');
  assert(r3.productos_sugeridos.every((p) => String(p.codigo).indexOf('RAC-') === 0), '3 catálogo refrigeración');

  const r4 = cotizar('Necesito reparar una moto Honda 150 que tiene 25000 km.');
  assert(r4.oficio_id === 'taller_motos', '4 oficio taller_motos');
  assert(!r4.productos_sugeridos.some((p) => knownCodes.has(p.codigo)), '4 no muestra automatización');
  assert(r4.productos_sugeridos.every((p) => String(p.codigo).indexOf('MOT-') === 0), '4 catálogo taller motos');
}

section('FASE 4.17 — kilometraje 25.000 km');
{
  const text = 'Motor para moto Honda 150, 25.000 km.';
  const r = cotizar(text);
  const kmField = sandbox.ArpaIaPerfiles.getProfile('taller_motos').fields.find((f) => f.id === 'kilometraje');
  const shown = sandbox.ArpaIaPerfiles.formatFieldValue(kmField, r.datos_extraidos.kilometraje);
  assert(r.oficio_id === 'taller_motos', '4.17 oficio taller_motos');
  assert(r.datos_extraidos.marca === 'Honda', '4.17 marca Honda');
  assert(r.datos_extraidos.cilindraje === 150, '4.17 cilindraje 150');
  assert(r.datos_extraidos.kilometraje === 25000, '4.17 extrae 25000 km desde 25.000');
  assert(shown === '25.000 km', '4.17 muestra 25.000 km');
  assert(r.productos_sugeridos.length > 0, '4.17 sugiere productos');
  assert(r.productos_sugeridos.every((p) => String(p.codigo).indexOf('MOT-') === 0), '4.17 catálogo motos');
  assert(!r.productos_sugeridos.some((p) => knownCodes.has(p.codigo)), '4.17 no mezcla automatismos');

  const rPlain = cotizar('Revisión y mantenimiento de moto Honda 150 con 25000 km.');
  assert(rPlain.datos_extraidos.kilometraje === 25000, '4.17 25000 sin puntos sigue igual');

  const rPeso = cotizar('Puerta corrediza residencial de 500 kg, 5 metros, Medellín.');
  assert(rPeso.datos_extraidos.peso_estimado === 500, '4.17 peso 500 kg intacto');
  assert(rPeso.datos_extraidos.recorrido_m === 5, '4.17 recorrido 5 m intacto');
}

section('Resumen');
console.log('  pasaron ' + passed + '  fallaron ' + failed);
if (failed) process.exit(1);
