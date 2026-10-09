/**
 * API pública de ARPA IA INFORMES.
 * Reutiliza el endpoint LLM DEV existente. No guarda chats. No usa claves en el frontend.
 */
(function (global) {
  const BLOCKED_PRODUCTION = [
    'AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2',
    'AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg',
    '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',
    'formato-arlenpav',
    'arpa.arpatechnologyglobal.com'
  ];

  const TIMEOUT_MS = 60000;

  function blockedReason(url) {
    const raw = String(url || '').trim().toLowerCase();
    if (!raw) return { codigo: 'backend_dev_ausente', mensaje: 'No hay endpoint LLM DEV configurado.' };
    for (let i = 0; i < BLOCKED_PRODUCTION.length; i += 1) {
      if (raw.indexOf(BLOCKED_PRODUCTION[i].toLowerCase()) !== -1) {
        return {
          codigo: 'bloqueado_produccion',
          mensaje: 'Se rechazó el endpoint porque coincide con un recurso de producción. No se envió la petición.'
        };
      }
    }
    return null;
  }

  function sanitizeClientError(mensaje) {
    return String(mensaje || 'Error del backend LLM DEV.')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redactado]')
      .replace(/sk-[A-Za-z0-9_-]+/g, '[redactado]')
      .replace(/ARPA_IA_LLM_KEY\s*[:=]\s*\S+/gi, 'ARPA_IA_LLM_KEY=[redactado]');
  }

  function endpointFromApi() {
    const api = global.ArpaIaCotizadorApi;
    if (api && api.mode === 'remote' && api.endpoint) return String(api.endpoint).trim();
    return '';
  }

  function isAppsScript(url) {
    return /script\.google\.com/i.test(String(url || ''));
  }

  function oficioLlm(oficioId) {
    const perfiles = global.ArpaIaPerfiles;
    if (perfiles && typeof perfiles.toLlmOficioId === 'function') {
      return perfiles.toLlmOficioId(oficioId);
    }
    return String(oficioId || '').trim();
  }

  function parseJsonRes(res) {
    return Promise.resolve()
      .then(function () { return res && typeof res.text === 'function' ? res.text() : ''; })
      .then(function (raw) {
        const text = String(raw || '').trim();
        if (!text) return { ok: false, error: { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió contenido.' } };
        if (text.charAt(0) !== '{' && text.charAt(0) !== '[') {
          return { ok: false, error: { codigo: 'respuesta_no_json', mensaje: 'El backend LLM DEV no devolvió JSON.' } };
        }
        try {
          return { ok: true, data: JSON.parse(text) };
        } catch (err) {
          return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El backend LLM DEV no devolvió JSON válido.' } };
        }
      });
  }

  function generarLocal(ot, meta) {
    const parser = global.ArpaIaInformesParser;
    const gen = global.ArpaIaInformesGenerador;
    const parsed = parser.parseOt(ot);
    return gen.construirLocal(parsed, meta || { fuente: 'local', estado_llm: 'desconectado' });
  }

  async function tryRemote(parsed) {
    const url = endpointFromApi();
    const blocked = blockedReason(url);
    if (blocked) return { ok: false, error: blocked };

    const prompts = global.ArpaIaInformesPrompts;
    const otPayload = prompts && typeof prompts.buildOtPayload === 'function'
      ? prompts.buildOtPayload(parsed)
      : parsed;
    const payload = {
      modo: 'informe',
      mode: 'informe',
      oficio: oficioLlm(parsed.oficio_id),
      ot: otPayload,
      text: JSON.stringify(otPayload),
      instrucciones: prompts ? prompts.buildSystemPrompt(parsed) : ''
    };
    const headers = isAppsScript(url)
      ? { 'Content-Type': 'text/plain;charset=utf-8' }
      : { 'Content-Type': 'application/json' };
    const endpoint = url.indexOf('?') >= 0 ? url + '&modo=informe' : url + '?modo=informe';
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    try {
      const req = { method: 'POST', headers: headers, credentials: 'omit', body: JSON.stringify(payload) };
      if (controller) req.signal = controller.signal;
      const res = await fetch(endpoint, req);
      if (!res.ok) {
        return {
          ok: false,
          error: {
            codigo: 'backend_no_disponible',
            mensaje: 'El backend LLM DEV no está disponible (HTTP ' + res.status + ').'
          }
        };
      }
      const parsedRes = await parseJsonRes(res);
      if (!parsedRes.ok) return parsedRes;
      const data = parsedRes.data;
      if (data && data.ok === false) {
        const err = data.error;
        return {
          ok: false,
          error: {
            codigo: (err && err.codigo) || 'backend_error',
            mensaje: sanitizeClientError((err && err.mensaje) || err || 'El LLM DEV de informes falló.')
          }
        };
      }
      if (data && data.extraido && !data.informe) {
        return {
          ok: false,
          error: {
            codigo: 'backend_sin_informe',
            mensaje: 'El Web App DEV respondió en modo extractivo y no devolvió un informe.'
          }
        };
      }
      const gen = global.ArpaIaInformesGenerador;
      const informe = gen.pickInformePayload(data);
      if (!informe) {
        return { ok: false, error: { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió un informe.' } };
      }
      return { ok: true, informe: informe };
    } catch (err) {
      const aborted = err && (err.name === 'AbortError' || /aborted|abortado/i.test(String(err.message || '')));
      if (aborted) {
        return { ok: false, error: { codigo: 'timeout_llm', mensaje: 'El backend LLM DEV no respondió a tiempo.' } };
      }
      return {
        ok: false,
        error: {
          codigo: 'error_red',
          mensaje: 'No hay conexión con el backend LLM DEV: ' + (err && err.message ? err.message : 'error desconocido') + '.'
        }
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function generar(ot) {
    return generarLocal(ot);
  }

  async function generarAsync(ot, options) {
    const parser = global.ArpaIaInformesParser;
    const gen = global.ArpaIaInformesGenerador;
    const parsed = parser.parseOt(ot);
    const local = gen.construirLocal(parsed, { fuente: 'local', estado_llm: 'desconectado' });
    if (options && options.localOnly) return local;

    const api = global.ArpaIaCotizadorApi;
    if (!api || api.mode !== 'remote' || !api.endpoint) return local;

    const remote = await tryRemote(parsed);
    if (remote && remote.ok && remote.informe) {
      const merged = gen.mergeLlm(local, remote.informe, parsed);
      merged.fuente = 'llm+local';
      merged.estado_llm = 'ok';
      merged.error_llm = null;
      return merged;
    }
    const error = remote && remote.error
      ? remote.error
      : { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió un informe.' };
    local.fuente = 'local_por_error_llm';
    local.estado_llm = error.codigo === 'bloqueado_produccion' ? 'bloqueado_produccion' : 'error';
    local.error_llm = {
      codigo: error.codigo,
      mensaje: sanitizeClientError(error.mensaje)
    };
    return local;
  }

  global.ArpaIaInformes = {
    parsear: function (ot) {
      return global.ArpaIaInformesParser.parseOt(ot);
    },
    generar: generar,
    generarAsync: generarAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
