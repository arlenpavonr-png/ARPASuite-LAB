/**
 * Módulo: Navegación entre vistas
 */
(function (global) {
  let currentView = 'formato';

  function setHeaderActions(view) {
    const docType = document.getElementById('doc-type-label');
    const metaFormato = document.getElementById('header-meta-formato');
    const metaCot = document.getElementById('header-meta-cot');
    const metaCc = document.getElementById('header-meta-cc');
    const pdfFormato = document.getElementById('pdf-actions-formato');
    const pdfCot = document.getElementById('pdf-actions-cot');

    if (window.ArpaI18n?.refreshDocTypeLabel) {
      window.ArpaI18n.refreshDocTypeLabel();
    } else {
      const labels = {
        formato: 'Formato de Servicio',
        cotizacion: '💰 Cotización',
        catalogo: '📦 Mi Catálogo',
        'cuenta-cobro': '🧾 Cuenta de Cobro',
        historial: '📋 Historial de Servicios'
      };
      if (docType) docType.textContent = labels[view] || labels.formato;
    }
    if (metaFormato) metaFormato.hidden = view !== 'formato';
    if (metaCot) metaCot.hidden = view !== 'cotizacion';
    if (metaCc) metaCc.hidden = view !== 'cuenta-cobro';
    if (pdfFormato) pdfFormato.hidden = view !== 'formato';
    if (pdfCot) pdfCot.hidden = view !== 'cotizacion';
  }

  function showView(view, menuBtn) {
    currentView = view;
    document.querySelectorAll('.suite-view').forEach((el) => {
      el.hidden = el.id !== `view-${view}`;
    });
    document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
    menuBtn?.classList.add('active');
    setHeaderActions(view);
    global.ArpaMiCatalogo?.setFabVisible?.(view === 'catalogo');

    if (view === 'cotizacion') {
      global.ArpaCobros?.seedFromPriceList('cot');
      global.ArpaCotizacion?.refreshCobros?.();
      global.ArpaCotizacion?.renderTablaCot?.();
      global.ArpaCotizacion?.ensureCotNumero?.();
      global.ArpaCotizacion?.updateCatalogHint?.();
    }
    if (view === 'cuenta-cobro') {
      global.applyUserSettingsToUI?.();
      global.ArpaCuentaCobro?.refreshView?.();
      global.ArpaCuentaCobro?.ensureCcNumero?.();
    }
    if (view === 'catalogo') {
      global.ArpaMiCatalogo?.refreshView?.();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToTopMenu(btn) {
    showView('formato', btn);
  }

  function openCotizacionView(btn) {
    showView('cotizacion', btn);
  }

  function openCuentaCobroView(btn) {
    showView('cuenta-cobro', btn);
  }

  function openCatalogoView(btn) {
    showView('catalogo', btn);
  }

  function openHistorialView(menuBtn) {
    currentView = 'historial';
    global.applyUserSettingsToUI?.();
    global.ArpaMiCatalogo?.setFabVisible?.(false);
    document.querySelectorAll('.suite-view').forEach((el) => {
      el.hidden = el.id !== 'view-historial';
    });
    document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
    menuBtn?.classList.add('active');
    setHeaderActions('historial');
    global.ArpaHistorial?.render?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  global.ArpaViews = {
    showView,
    scrollToTopMenu,
    openCotizacionView,
    openCuentaCobroView,
    openCatalogoView,
    openHistorialView,
    getCurrentView: () => currentView
  };
  global.scrollToTopMenu = scrollToTopMenu;
  global.openCotizacionView = openCotizacionView;
  global.openCuentaCobroView = openCuentaCobroView;
  global.openCatalogoView = openCatalogoView;
  global.openHistorialView = openHistorialView;
})(window);
