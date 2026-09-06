/**
 * Módulo IA ficticio — experimento Fase B.
 * Solo prueba que un módulo nuevo puede montarse sin tocar Capa A.
 * No llama APIs, no usa LLM, no escribe datos.
 */
(function (global) {
  const STATUS_ID = 'arpa-ia-prueba-status';
  const BTN_ID = 'arpa-ia-prueba-run';
  let clicks = 0;
  let wired = false;

  function $(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function setStatus(msg) {
    const el = $(STATUS_ID);
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
  }

  function wire() {
    if (wired) return true;
    const btn = $(BTN_ID);
    if (!btn) return false;
    btn.addEventListener('click', function () {
      clicks += 1;
      setStatus('Fase B OK — módulo dummy activo (clics: ' + clicks + ').');
    });
    wired = true;
    setStatus('Módulo dummy cargado. Listo para probar sin tocar Capa A.');
    return true;
  }

  function refresh() {
    wire();
  }

  // Init al cargar el script (panel ya montado por el host).
  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', wire);
    } else {
      // El host carga este script después de montar el panel.
      wire();
    }
  }

  global.ArpaIaPruebaUi = {
    refresh: refresh,
    wire: wire
  };
})(typeof window !== 'undefined' ? window : globalThis);
