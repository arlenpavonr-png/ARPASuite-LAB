/**
 * Host de montaje: slots genéricos + carga ordenada de scripts IA.
 */
(function (global) {
  const loadedScripts = Object.create(null);
  let booted = false;

  function $(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function loadCss(href) {
    if (!global.document) return Promise.resolve();
    const existing = global.document.querySelector('link[data-arpa-ia-css="' + href + '"]');
    if (existing) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const link = global.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-arpa-ia-css', href);
      link.onload = function () { resolve(); };
      link.onerror = function () { reject(new Error('No se pudo cargar CSS IA: ' + href)); };
      global.document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    if (!global.document) return Promise.resolve();
    if (loadedScripts[src]) return loadedScripts[src];
    loadedScripts[src] = new Promise(function (resolve, reject) {
      const s = global.document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('No se pudo cargar script IA: ' + src)); };
      global.document.head.appendChild(s);
    });
    return loadedScripts[src];
  }

  function loadScriptsInOrder(list) {
    let chain = Promise.resolve();
    (list || []).forEach(function (src) {
      chain = chain.then(function () { return loadScript(src); });
    });
    return chain;
  }

  function mountPanel(slotId, panelKey) {
    const slot = $(slotId);
    const panels = global.ArpaIaPanels;
    if (!slot || !panels || !panels[panelKey]) return false;
    if (slot.querySelector('[data-arpa-ia-panel="' + panelKey + '"]')) return true;
    const wrap = global.document.createElement('div');
    wrap.setAttribute('data-arpa-ia-panel', panelKey);
    wrap.innerHTML = panels[panelKey];
    while (wrap.firstChild) slot.appendChild(wrap.firstChild);
    return true;
  }

  function onViewOpen(viewId) {
    if (viewId === 'historial' && global.ArpaIaComercialUi && typeof global.ArpaIaComercialUi.refresh === 'function') {
      global.ArpaIaComercialUi.refresh();
    }
  }

  function boot() {
    if (booted) return Promise.resolve(true);
    const registry = global.ArpaIaRegistry;
    if (!registry || !Array.isArray(registry.modules)) {
      return Promise.reject(new Error('ArpaIaRegistry no disponible'));
    }
    booted = true;
    let chain = Promise.resolve();
    (registry.css || []).forEach(function (href) {
      chain = chain.then(function () { return loadCss(href); });
    });
    registry.modules.forEach(function (mod) {
      chain = chain.then(function () {
        mountPanel(mod.slot, mod.panel);
        return loadScriptsInOrder(mod.scripts);
      });
    });
    return chain.then(function () {
      return true;
    });
  }

  global.ArpaIaHost = {
    boot: boot,
    mountPanel: mountPanel,
    loadScriptsInOrder: loadScriptsInOrder,
    onViewOpen: onViewOpen
  };
})(typeof window !== 'undefined' ? window : globalThis);
