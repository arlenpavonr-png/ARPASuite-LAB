/**
 * Cliente LAB → backend LLM DEV.
 * Nunca colocar claves de proveedor aquí.
 * Nunca reutilizar los Apps Script de licencias, cloud o cotizaciones.
 *
 * POST: { oficio, text }  (Content-Type text/plain hacia Apps Script)
 * Diagnóstico técnico: { modo: "tecnica", oficio, text }
 */
(function (global) {
  const BLOCKED_PRODUCTION = [
    'AKfycbzKBeyDVWVqPG1R47EZTVKmCpa3SOwxs8LXrW4ipvRtiyyRV4trJKg7D4i89_cUTcH2',
    'AKfycbyV0-C_XACD5suCh9gm1JkiKvrI3mket-z5GSFGFc6Y87HZaqFyCtVz7jmtQMayNEUeJg',
    '154LeJlcAPa3dlWxXHC2WA2_xFNL4oQ45I8630Kzcd3E',
    'formato-arlenpav',
    'arpa.arpatechnologyglobal.com'
  ];

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

  function isAppsScript(url) {
    return /script\.google\.com/i.test(String(url || ''));
  }

  function resolveOficioForLlm(oficio) {
    const perfiles = global.ArpaIaPerfiles;
    if (perfiles && typeof perfiles.toLlmOficioId === 'function') {
      return perfiles.toLlmOficioId(oficio);
    }
    return String(oficio || '').trim();
  }

  const TIMEOUT_MS = 45000;
  const DIAG_TIMEOUT_MS = 90000;

  function sanitizeClientError(mensaje) {
    return String(mensaje || 'Error del backend LLM DEV.')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redactado]')
      .replace(/sk-[A-Za-z0-9_-]+/g, '[redactado]')
      .replace(/ARPA_IA_LLM_KEY\s*[:=]\s*\S+/gi, 'ARPA_IA_LLM_KEY=[redactado]');
  }

  function asBackendError(raw, fallbackCodigo, fallbackMensaje) {
    if (typeof raw === 'string') {
      return { ok: false, error: { codigo: fallbackCodigo || 'backend_error', mensaje: sanitizeClientError(raw) } };
    }
    const err = raw && typeof raw === 'object' ? raw : {};
    return {
      ok: false,
      error: {
        codigo: String(err.codigo || fallbackCodigo || 'backend_error'),
        mensaje: sanitizeClientError(err.mensaje || fallbackMensaje || 'El backend LLM DEV reportó error.')
      }
    };
  }

  function pickDiagnosticoPayload(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.diagnostico && typeof data.diagnostico === 'object' && !Array.isArray(data.diagnostico)) {
      return data;
    }
    if (String(data.modo || '').toLowerCase() === 'tecnica' && (data.sintomas || data.hipotesis || data.hechos)) {
      return { diagnostico: data };
    }
    return null;
  }

  function isDoGetHealth(data) {
    return !!(data && data.ok === true && data.service && !data.diagnostico && !data.extraido);
  }

  function withAttemptNonce(url, attempt) {
    const sep = String(url).indexOf('?') >= 0 ? '&' : '?';
    return String(url) + sep + 'r=' + Date.now() + '-' + attempt;
  }

  async function fetchAppsScriptPost(url, req) {
    const maxAttempts = 2;
    let lastRes = null;
    let lastParsed = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      lastRes = await fetch(withAttemptNonce(url, attempt), req);
      if (lastRes.status === 404) continue;
      if (!lastRes.ok) return { res: lastRes, parsed: null };
      lastParsed = await readJsonBody(lastRes);
      if (!lastParsed.ok) {
        if (attempt < maxAttempts - 1) continue;
        return { res: lastRes, parsed: lastParsed };
      }
      if (isDoGetHealth(lastParsed.data)) continue;
      return { res: lastRes, parsed: lastParsed };
    }
    return { res: lastRes, parsed: lastParsed };
  }

  async function readJsonBody(res) {
    if (res && typeof res.text === 'function') {
      const raw = await res.text();
      const text = String(raw || '').trim();
      if (!text) {
        return { ok: false, error: { codigo: 'respuesta_vacia', mensaje: 'El backend LLM DEV no devolvió contenido.' } };
      }
      if (text.charAt(0) !== '{' && text.charAt(0) !== '[') {
        return { ok: false, error: { codigo: 'respuesta_no_json', mensaje: 'El backend LLM DEV no devolvió JSON.' } };
      }
      try {
        return { ok: true, data: JSON.parse(text) };
      } catch (err) {
        return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El backend LLM DEV no devolvió JSON válido.' } };
      }
    }
    if (res && typeof res.json === 'function') {
      try {
        return { ok: true, data: await res.json() };
      } catch (err) {
        return { ok: false, error: { codigo: 'json_invalido', mensaje: 'El backend LLM DEV no devolvió JSON válido.' } };
      }
    }
    return { ok: false, error: { codigo: 'respuesta_no_json', mensaje: 'El backend LLM DEV no devolvió JSON.' } };
  }

  const ArpaIaCotizadorApi = {
    mode: 'local',
    endpoint: '',

    configure(options) {
      if (!options || typeof options !== 'object') return;
      if (options.mode === 'local' || options.mode === 'remote') this.mode = options.mode;
      if (typeof options.endpoint === 'string') this.endpoint = options.endpoint.trim();
    },

    isProductionEndpoint(url) {
      return !!blockedReason(url || this.endpoint);
    },

    async tryRemote(solicitud, oficio) {
      if (this.mode !== 'remote') {
        return { ok: false, error: { codigo: 'modo_local', mensaje: 'El motor está en modo local. El LLM remoto no se invocó.' } };
      }
      const blocked = blockedReason(this.endpoint);
      if (blocked) return { ok: false, error: blocked };

      const payload = {
        text: String(solicitud || '')
      };
      const oficioLlm = resolveOficioForLlm(oficio);
      if (oficioLlm) payload.oficio = oficioLlm;

      const body = JSON.stringify(payload);

      const headers = isAppsScript(this.endpoint)
        ? { 'Content-Type': 'text/plain;charset=utf-8' }
        : { 'Content-Type': 'application/json' };

      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

      try {
        const req = {
          method: 'POST',
          headers: headers,
          credentials: 'omit',
          body: body
        };
        if (controller) req.signal = controller.signal;
        const res = await fetch(this.endpoint, req);
        if (!res.ok) {
          return {
            ok: false,
            error: {
              codigo: 'backend_no_disponible',
              mensaje: 'El backend LLM DEV no está disponible (HTTP ' + res.status + ').'
            }
          };
        }
        const parsed = await readJsonBody(res);
        if (!parsed.ok) return parsed;
        const data = parsed.data;
        if (data && data.ok === false) {
          return asBackendError(data.error, 'backend_error', 'El backend LLM DEV reportó error.');
        }
        const llm = global.ArpaIaCotizadorLlm;
        if (!llm) {
          return { ok: false, error: { codigo: 'modulo_llm_ausente', mensaje: 'Falta el normalizador LLM en el cliente.' } };
        }
        const normalized = llm.normalizeLlmExtract(data);
        if (!normalized.ok) return normalized;
        return { ok: true, extraido: normalized.extraido };
      } catch (err) {
        const aborted = err && (err.name === 'AbortError' || /aborted|abortado/i.test(String(err.message || '')));
        if (aborted) {
          return {
            ok: false,
            error: { codigo: 'timeout_llm', mensaje: 'El backend LLM DEV no respondió a tiempo.' }
          };
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
    },

    async tryRemoteDiagnostico(solicitud, oficio) {
      if (this.mode !== 'remote') {
        return { ok: false, error: { codigo: 'modo_local', mensaje: 'El motor está en modo local. El LLM remoto no se invocó.' } };
      }
      const blocked = blockedReason(this.endpoint);
      if (blocked) return { ok: false, error: blocked };

      const payload = {
        modo: 'tecnica',
        mode: 'tecnica',
        text: String(solicitud || '')
      };
      const oficioLlm = resolveOficioForLlm(oficio);
      if (oficioLlm) payload.oficio = oficioLlm;

      const body = JSON.stringify(payload);
      const headers = isAppsScript(this.endpoint)
        ? { 'Content-Type': 'text/plain;charset=utf-8' }
        : { 'Content-Type': 'application/json' };
      const endpoint = this.endpoint.indexOf('?') >= 0
        ? this.endpoint + '&modo=tecnica'
        : this.endpoint + '?modo=tecnica';

      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(function () { controller.abort(); }, DIAG_TIMEOUT_MS) : null;

      try {
        const req = {
          method: 'POST',
          headers: headers,
          credentials: 'omit',
          body: body
        };
        if (controller) req.signal = controller.signal;
        const posted = await fetchAppsScriptPost(endpoint, req);
        const res = posted.res;
        if (!res || !res.ok) {
          return {
            ok: false,
            error: {
              codigo: 'backend_no_disponible',
              mensaje: 'El backend LLM DEV no está disponible (HTTP ' + (res ? res.status : 404) + ').'
            }
          };
        }
        const parsed = posted.parsed || await readJsonBody(res);
        if (!parsed.ok) return parsed;
        const data = parsed.data;
        if (data && data.ok === false) {
          return asBackendError(data.error, 'backend_error', 'El LLM DEV de diagnóstico falló.');
        }
        const diagPayload = pickDiagnosticoPayload(data);
        if (diagPayload) {
          const helper = global.ArpaIaTecnicaLlm;
          if (!helper) {
            return { ok: false, error: { codigo: 'modulo_llm_ausente', mensaje: 'Falta el normalizador de diagnóstico técnico.' } };
          }
          const normalized = helper.normalizeDiagnostico(diagPayload, oficio);
          if (!normalized.ok) return normalized;
          return { ok: true, diagnostico: normalized.diagnostico };
        }
        if (data && data.extraido) {
          return {
            ok: false,
            error: {
              codigo: 'backend_sin_diagnostico',
              mensaje: 'El Web App DEV ejecutó el extractor de cotizar (extraido) y no devolvió diagnóstico técnico. En ARPA IA — DEV hay que guardar Código.gs y desplegar una versión nueva del mismo Web App.'
            }
          };
        }
        return {
          ok: false,
          error: {
            codigo: 'respuesta_vacia',
            mensaje: 'El backend LLM DEV no devolvió diagnóstico técnico.'
          }
        };
      } catch (err) {
        const aborted = err && (err.name === 'AbortError' || /aborted|abortado/i.test(String(err.message || '')));
        if (aborted) {
          return {
            ok: false,
            error: { codigo: 'timeout_llm', mensaje: 'El backend LLM DEV no respondió a tiempo.' }
          };
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
  };

  global.ArpaIaCotizadorApi = ArpaIaCotizadorApi;
})(typeof window !== 'undefined' ? window : globalThis);
