/**
 * Carga los archivos .gs del contestador en un "Apps Script de mentiras" (Node + vm),
 * con Google, Meta y Claude simulados. Lo usan el ensayo y las pruebas unitarias.
 * No toca internet salvo en modo real (solo la API de Claude, con ANTHROPIC_API_KEY local).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const CARPETA_GS = path.join(aqui, '..', 'apps-script');
export const ARCHIVOS_GS = ['Config.gs', 'Cerebros.gs', 'Logica.gs', 'Webhook.gs', 'Configurar.gs'];
export const PHONE_ID_PRUEBA = '100000000000001';

function libroFalso(nombre) {
  const hojas = {};
  const libro = {
    id: 'libro-' + crypto.randomUUID(),
    nombre,
    getId() { return this.id; },
    getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; },
    getSheets() { return Object.values(hojas); },
    getSheetByName(n) { return hojas[n] || null; },
    deleteSheet(h) { delete hojas[h.nombre]; },
    insertSheet(n) {
      const filas = [];
      hojas[n] = {
        nombre: n, filas,
        appendRow(f) { filas.push(f.slice()); },
        getLastRow() { return filas.length; },
        setFrozenRows() {},
        getRange(r, c, nf, nc) {
          return { getValues: () => filas.slice(r - 1, r - 1 + nf).map((f) => f.slice(c - 1, c - 1 + nc)) };
        }
      };
      return hojas[n];
    }
  };
  libro.insertSheet('Hoja 1');
  return libro;
}

/**
 * Crea un entorno nuevo. opciones.claude(body) devuelve el JSON de respuesta simulado,
 * o con opciones.real = true se llama la API de verdad (síncrono, vía un proceso hijo).
 */
export function crearEntorno(opciones = {}) {
  const estado = {
    props: {}, libros: {}, cache: {}, enviados: [], correos: [], llamadasClaude: [], reloj: Date.UTC(2026, 9, 21, 20, 0)
  };
  const props = {
    getProperty: (k) => (k in estado.props ? estado.props[k] : null),
    setProperty: (k, v) => { estado.props[k] = String(v); }
  };
  const RealDate = Date;
  class FalsoDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(estado.reloj); }
    static now() { return estado.reloj; }
  }

  function fetchClaude(url, opts) {
    const body = JSON.parse(opts.payload);
    estado.llamadasClaude.push({ url, headers: opts.headers, body });
    if (opciones.real) {
      const hijo = spawnSync(process.execPath, ['-e', `
        let d='';process.stdin.on('data',c=>d+=c).on('end',async()=>{
          const r=JSON.parse(d);
          const res=await fetch(r.url,{method:'POST',headers:Object.assign({'content-type':'application/json'},r.headers),body:r.payload});
          process.stdout.write(JSON.stringify({status:res.status,body:await res.text()}));
        });`], { input: JSON.stringify({ url, headers: opts.headers, payload: opts.payload }), encoding: 'utf8', env: process.env, timeout: 120000 });
      if (hijo.status !== 0) throw new Error('Fallo la llamada real a Claude: ' + hijo.stderr);
      const r = JSON.parse(hijo.stdout);
      return { getResponseCode: () => r.status, getContentText: () => r.body };
    }
    const resp = (opciones.claude || claudeSimulado)(body);
    if (resp && resp.__status) {
      return { getResponseCode: () => resp.__status, getContentText: () => JSON.stringify(resp) };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(resp) };
  }

  const contexto = {
    console: opciones.silencioso ? { log() {} } : console,
    Date: FalsoDate,
    PropertiesService: { getScriptProperties: () => props },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => {
          const e = estado.cache[k];
          return e && e.hasta > estado.reloj ? e.v : null;
        },
        put: (k, v, seg) => { estado.cache[k] = { v, hasta: estado.reloj + (seg || 600) * 1000 }; }
      })
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    SpreadsheetApp: {
      create: (n) => { const l = libroFalso(n); estado.libros[l.id] = l; return l; },
      openById: (id) => { if (!estado.libros[id]) throw new Error('no existe ' + id); return estado.libros[id]; }
    },
    MailApp: { sendEmail: (m) => estado.correos.push(m) },
    ContentService: { createTextOutput: (s) => ({ contenido: s, getContent: () => s }) },
    Utilities: { sleep() {}, getUuid: () => crypto.randomUUID() },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (url.indexOf('https://api.anthropic.com/') === 0) return fetchClaude(url, opts);
        if (url.indexOf('https://graph.facebook.com/') === 0) {
          const body = JSON.parse(opts.payload);
          const id = 'wamid.enviado.' + (estado.enviados.length + 1);
          estado.enviados.push({ url, to: body.to, texto: body.text.body, id, ms: estado.reloj });
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id }] }) };
        }
        throw new Error('URL no simulada: ' + url);
      }
    }
  };
  vm.createContext(contexto);
  for (const f of ARCHIVOS_GS) {
    vm.runInContext(fs.readFileSync(path.join(CARPETA_GS, f), 'utf8'), contexto, { filename: f });
  }
  return { gs: contexto, estado };
}

/** Deja el entorno listo como si Arlen hubiera hecho la instalación (con valores de prueba). */
export function instalar(entorno, extra = {}) {
  entorno.gs.configurar();
  Object.assign(entorno.estado.props, {
    CLAUDE_API_KEY: 'clave-simulada',
    META_TOKEN: 'token-simulado',
    CORREO_ARLEN: 'arlen@ejemplo.test',
    PHONE_ID_AUTOMATISMOS: PHONE_ID_PRUEBA,
    ASISTENTE_ACTIVO: 'SI',
    MODO_BORRADOR: 'NO'
  }, extra);
  return entorno;
}

/** POST como lo haría el intermediario (con relay_token). */
export function postear(entorno, payload, conRelay = true) {
  const parameter = conRelay ? { relay_token: entorno.estado.props.RELAY_TOKEN } : {};
  return entorno.gs.doPost({ parameter, postData: { contents: JSON.stringify(payload) } });
}

let contador = 0;
export function msgCliente(entorno, cliente, nombre, mensaje) {
  contador += 1;
  const m = Object.assign({ from: cliente, id: 'wamid.cliente.' + contador, timestamp: String(Math.floor(entorno.estado.reloj / 1000)) }, mensaje);
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '573005683914', phone_number_id: PHONE_ID_PRUEBA },
      contacts: [{ profile: { name: nombre }, wa_id: cliente }],
      messages: [m]
    } }] }]
  };
}

export function texto(entorno, cliente, nombre, body) {
  return msgCliente(entorno, cliente, nombre, { type: 'text', text: { body } });
}

export function ecoArlen(entorno, cliente, body) {
  contador += 1;
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'smb_message_echoes', value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '573005683914', phone_number_id: PHONE_ID_PRUEBA },
      message_echoes: [{ from: '573005683914', to: cliente, id: 'wamid.eco.' + contador,
        timestamp: String(Math.floor(entorno.estado.reloj / 1000)), type: 'text', text: { body } }]
    } }] }]
  };
}

export function estadoEntrega(entorno) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: PHONE_ID_PRUEBA },
      statuses: [{ id: 'wamid.enviado.1', status: 'delivered', recipient_id: '573000000000' }]
    } }] }]
  };
}

/* ---------- Claude simulado: responde como lo haría, según el cerebro y el contexto ---------- */

function respuestaTexto(t) {
  return { id: 'msg_sim', type: 'message', role: 'assistant', stop_reason: 'end_turn',
    content: [{ type: 'thinking', thinking: '', signature: 'sim' }, { type: 'text', text: t }] };
}

export function claudeSimulado(body) {
  const contexto = body.system.map((b) => b.text).join('\n');
  const ultimo = body.messages[body.messages.length - 1].content.toLowerCase();
  const cuando = (contexto.match(/Arlen responde: (.+)\./) || [])[1] || 'el siguiente día hábil';
  if (/instalar|instalaci/.test(ultimo)) {
    // A propósito, un "mal día" del modelo: da un precio de instalación. El filtro debe frenarlo.
    return respuestaTexto('[ARLEN] La instalación le sale en unos $350.000, pero le paso su caso a Arlen.');
  }
  if (/Este mensaje SÍ se pasa a Arlen/.test(contexto)) {
    return respuestaTexto('[ARLEN] Con mucho gusto. Le paso su caso a Arlen, que le responde ' + cuando +
      '. Mientras tanto, ¿me puede enviar fotos de la puerta y su barrio?');
  }
  if (/corredi/.test(ultimo)) {
    return respuestaTexto('Para portón corredizo tenemos el Accessmatic Bulldozer 850 a $1.599.900 y el BFT Deimos BT A400 desde $1.948.900; la instalación se cotiza aparte según la puerta. ¿Me envía fotos de su puerta y las medidas?');
  }
  if (/garaje/.test(ultimo)) {
    return respuestaTexto('Para puerta de garaje el precio depende de las medidas: Arlen se lo da al ver las fotos. ¿Me envía una foto de la puerta y en qué barrio o municipio está?');
  }
  return respuestaTexto('¡Hola! 👋 Gracias por escribir a Automatismos ARPA. ¿Qué tipo de puerta desea automatizar: corrediza, batiente o de garaje?');
}
