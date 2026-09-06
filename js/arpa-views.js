/**
 * Módulo: Navegación entre vistas
 */
(function (global) {
  let currentView = 'inicio';

  function menuSelector(view) {
    if (view === 'inicio') return '.main-menu-btn[data-nav="inicio"]';
    if (view === 'cotizacion') return '.main-menu-btn[data-nav="cotizar"]';
    if (view === 'formato' || view === 'ia-tecnica') return '.main-menu-btn[data-nav="trabajos"]';
    return '.main-menu-btn[data-nav="mas"]';
  }

  function markMenu(view, menuBtn) {
    document.querySelectorAll('.main-menu-btn').forEach((b) => b.classList.remove('active'));
    const btn = menuBtn || document.querySelector(menuSelector(view));
    btn?.classList.add('active');
  }

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
        inicio: 'Inicio',
        formato: 'Trabajo',
        cotizacion: 'Cotización',
        catalogo: 'Mi Catálogo',
        'cuenta-cobro': 'Cuenta de Cobro',
        historial: 'Historial',
        'ia-tecnica': 'IA Técnica',
        'ia-copiloto': 'ARPA IA',
        'ia-integral': 'ARPA IA'
      };
      if (docType) docType.textContent = labels[view] || labels.inicio;
    }
    if (metaFormato) metaFormato.hidden = view !== 'formato';
    if (metaCot) metaCot.hidden = view !== 'cotizacion';
    if (metaCc) metaCc.hidden = view !== 'cuenta-cobro';
    if (pdfFormato) pdfFormato.hidden = view !== 'formato';
    if (pdfCot) pdfCot.hidden = view !== 'cotizacion';
    document.body.classList.toggle('simple-inicio', view === 'inicio');
    if (view === 'formato') {
      global.ArpaSimple?.syncPdfChrome?.();
    }
  }

  function showView(view, menuBtn) {
    currentView = view;
    document.querySelectorAll('.suite-view').forEach((el) => {
      el.hidden = el.id !== `view-${view}`;
    });
    markMenu(view, menuBtn);
    setHeaderActions(view);
    global.ArpaMiCatalogo?.setFabVisible?.(view === 'catalogo');
    global.ArpaSimple?.closeMas?.();

    if (view === 'inicio') {
      global.ArpaSimple?.renderInicio?.();
    }
    if (view === 'formato') {
      global.ArpaSimple?.onFormatoShown?.();
    }
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

  function openInicioView(btn) {
    showView('inicio', btn);
  }

  function scrollToTopMenu(btn) {
    showView('formato', btn || document.querySelector('.main-menu-btn[data-nav="trabajos"]'));
  }

  function openCotizacionView(btn) {
    showView('cotizacion', btn || document.querySelector('.main-menu-btn[data-nav="cotizar"]'));
  }

  function openCuentaCobroView(btn) {
    showView('cuenta-cobro', btn);
  }

  function openCatalogoView(btn) {
    showView('catalogo', btn);
  }

  function openIaTecnicaView(menuBtn) {
    showView('ia-tecnica', menuBtn);
  }

  function openIaCopilotoView(menuBtn) {
    showView('ia-copiloto', menuBtn);
  }

  function openIaIntegralView(menuBtn) {
    showView('ia-integral', menuBtn);
  }

  function openHistorialView(menuBtn) {
    currentView = 'historial';
    global.applyUserSettingsToUI?.();
    global.ArpaMiCatalogo?.setFabVisible?.(false);
    global.ArpaSimple?.closeMas?.();
    document.querySelectorAll('.suite-view').forEach((el) => {
      el.hidden = el.id !== 'view-historial';
    });
    markMenu('historial', menuBtn);
    setHeaderActions('historial');
    global.ArpaHistorial?.render?.();
    global.ArpaIaComercialUi?.refresh?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openMasSheet(btn) {
    markMenu('mas', btn);
    global.ArpaSimple?.openMas?.();
  }

  global.ArpaViews = {
    showView,
    openInicioView,
    scrollToTopMenu,
    openCotizacionView,
    openCuentaCobroView,
    openCatalogoView,
    openHistorialView,
    openIaTecnicaView,
    openIaCopilotoView,
    openIaIntegralView,
    openMasSheet,
    getCurrentView: () => currentView
  };
  global.openInicioView = openInicioView;
  global.scrollToTopMenu = scrollToTopMenu;
  global.openCotizacionView = openCotizacionView;
  global.openCuentaCobroView = openCuentaCobroView;
  global.openCatalogoView = openCatalogoView;
  global.openHistorialView = openHistorialView;
  global.openIaTecnicaView = openIaTecnicaView;
  global.openIaCopilotoView = openIaCopilotoView;
  global.openIaIntegralView = openIaIntegralView;
  global.openMasSheet = openMasSheet;
})(window);
