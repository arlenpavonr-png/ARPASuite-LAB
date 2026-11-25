/**
 * Onboarding de primera apertura — oficio principal, catálogo demo (Automatismos)
 * y explicador de bienvenida antes de entrar a la app.
 */
(function (global) {
  const ONBOARDING_KEY = 'arpa_onboarding';
  const RUBRO_KEY = 'arpa_rubro';
  const OFICIO_AUTOMATISMOS = 'automatismos';
  let pendingFinish = null; // { oficioId, opts }

  function isOnboardingDone() {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function isLicenseReady() {
    return document.documentElement.classList.contains('license-ok');
  }

  function setOnboardingActive(active) {
    document.documentElement.classList.toggle('onboarding-active', active);
  }

  function showGate() {
    // Primer minuto (Arlen 24-nov): nombre → logo → ver su cotización. Si no carga, queda el selector de rubro de siempre.
    if (global.ArpaPrimerMinuto && typeof global.ArpaPrimerMinuto.open === 'function') {
      setOnboardingActive(true);
      if (global.ArpaPrimerMinuto.open(finishFromPrimerMinuto)) return;
    }
    renderRubroButtons();
    setOnboardingActive(true);
    document.getElementById('onboarding-gate')?.classList.add('open');
  }

  function closeStepModals() {
    document.getElementById('onboarding-demo-modal')?.classList.remove('open');
    document.getElementById('onboarding-otro-modal')?.classList.remove('open');
  }

  function hideGate() {
    document.getElementById('onboarding-gate')?.classList.remove('open');
    closeStepModals();
    setOnboardingActive(false);
  }

  function getAutomatismosSeedCount() {
    return global.ArpaOficios?.getSeedProductCount?.(OFICIO_AUTOMATISMOS) || 0;
  }

  function openDemoModal() {
    const count = getAutomatismosSeedCount();
    const title = document.getElementById('onboarding-demo-title');
    const text = document.getElementById('onboarding-demo-text');
    if (title) title.textContent = window.ArpaI18n.t('onboarding.demo.titulo');
    if (text) text.textContent = window.ArpaI18n.t('onboarding.demo.pregunta', { count });
    closeStepModals();
    document.getElementById('onboarding-demo-modal')?.classList.add('open');
  }

  function openExplainerModal() {
    closeStepModals();
    document.getElementById('onboarding-otro-modal')?.classList.add('open');
  }

  function loadDemoCatalog() {
    global.ArpaOficios?.importSeedCatalog?.(OFICIO_AUTOMATISMOS, { force: true });
    global.ArpaCatalogo?.invalidateListaCache?.();
    global.ArpaCotizacion?.updateCatalogHint?.();
    global.ArpaMiCatalogo?.refreshView?.();
  }

  function activateOficio(oficioId) {
    if (!oficioId) return;
    global.ArpaOficios?.saveActiveOficios?.([oficioId]);
  }

  function finishOnboarding(oficioId, opts) {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.setItem(RUBRO_KEY, oficioId);
    activateOficio(oficioId);
    hideGate();
    if (opts?.loadDemo) {
      loadDemoCatalog();
    }
    if (opts?.goToCatalog) {
      const btn = document.querySelector('[data-onboarding-oficio="' + OFICIO_AUTOMATISMOS + '"]')
        || document.querySelector('.main-menu-btn[onclick*="openCatalogoView"]');
      global.openCatalogoView?.(btn);
      global.ArpaMiCatalogo?.refreshView?.();
    }
  }

  function finishFromPrimerMinuto(result) {
    const oficioId = global.ArpaOficios?.normalizeOficioId?.(result.oficioId) || result.oficioId || OFICIO_AUTOMATISMOS;
    try {
      if (global.ArpaBrand?.SETTINGS_CONFIGURED_KEY) {
        localStorage.setItem(global.ArpaBrand.SETTINGS_CONFIGURED_KEY, 'true');
      }
      global.ArpaBrand?.saveSettings?.({ companyName: result.companyName, logoBase64: result.logo || '' });
      global.ArpaBrand?.applyToUI?.();
    } catch (e) {
      console.warn('[arpa-onboarding] primer minuto', e);
    }
    // Desde aquí sigue el mismo camino de siempre (pregunta del catálogo, explicación y entrada).
    onOficioSelected(oficioId);
  }

  function onOficioSelected(oficioId) {
    const id = global.ArpaOficios?.normalizeOficioId?.(oficioId) || oficioId;
    if (id === OFICIO_AUTOMATISMOS) {
      openDemoModal();
      return;
    }
    pendingFinish = { oficioId: id, opts: null };
    openExplainerModal();
  }

  function renderRubroButtons() {
    const container = document.getElementById('onboarding-rubros');
    if (!container) return;
    const oficios = global.ArpaOficios?.getOficiosList?.() || [];
    container.innerHTML = oficios.map((o) => {
      const label = global.ArpaOficios?.getOficioLabel?.(o.id) || o.id;
      const isPrimary = o.id === OFICIO_AUTOMATISMOS;
      return (
        '<button type="button" class="btn-onboarding-rubro' + (isPrimary ? ' primary' : '') + '" ' +
        'data-onboarding-oficio="' + o.id + '" data-i18n="' + o.i18nKey + '">' +
        label +
        '</button>'
      );
    }).join('');
    container.querySelectorAll('[data-onboarding-oficio]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        onOficioSelected(btn.getAttribute('data-onboarding-oficio'));
      });
    });
    if (global.ArpaI18n && typeof global.ArpaI18n.apply === 'function') {
      global.ArpaI18n.apply(global.ArpaI18n.getLang?.() || 'es');
    }
  }

  function initOnboarding() {
    renderRubroButtons();
    document.getElementById('btn-onboarding-demo-yes')?.addEventListener('click', () => {
      pendingFinish = { oficioId: OFICIO_AUTOMATISMOS, opts: { loadDemo: true, goToCatalog: true } };
      openExplainerModal();
    });
    document.getElementById('btn-onboarding-demo-skip')?.addEventListener('click', () => {
      pendingFinish = { oficioId: OFICIO_AUTOMATISMOS, opts: null };
      openExplainerModal();
    });
    document.getElementById('btn-onboarding-otro-continue')?.addEventListener('click', () => {
      if (pendingFinish) {
        finishOnboarding(pendingFinish.oficioId, pendingFinish.opts);
        pendingFinish = null;
      }
    });
  }

  function tryShow() {
    if (!isLicenseReady() || isOnboardingDone()) return false;
    showGate();
    return true;
  }

  global.ArpaOnboarding = {
    ONBOARDING_KEY,
    RUBRO_KEY,
    isOnboardingDone,
    loadDemoCatalog,
    tryShow,
    initOnboarding,
    renderRubroButtons
  };

  document.addEventListener('DOMContentLoaded', () => {
    initOnboarding();
    tryShow();
  });
})(window);

/**
 * Primer minuto — el técnico escribe el nombre de su empresa, pone su logo
 * (foto o iniciales) y ve SU cotización de ejemplo antes de llenar nada.
 * Todo queda en el dispositivo: no llama a ningún servidor.
 */
(function (global) {
  const OVERLAY_ID = 'primer-minuto';
  const NAVY = '#0B1530';
  const NAVY_DOC = '#16284B';
  const GOLD = '#C9A84C';

  const TXT = {
    es: {
      step1_tag: 'Paso 1 de 2 · 10 segundos',
      step1_title: '¿Cómo se llama tu empresa?',
      step1_sub: 'Así va a salir en cada cotización que mandes. Si no tienes empresa, pon tu nombre.',
      name_label: 'Nombre de tu empresa',
      name_ph: 'Ej: Portones Gómez',
      oficio_label: '¿Qué haces?',
      more: 'Otro oficio',
      next: 'Seguir',
      step2_tag: 'Paso 2 de 2 · último',
      step2_title: 'Ponle tu sello',
      step2_sub: 'Toma una foto de tu logo, o quédate con este que hicimos para ti.',
      photo: 'Tomar foto',
      gallery: 'De la galería',
      see: 'Ver mi cotización',
      magic_tag: 'Listo en {s} segundos',
      magic_title: 'Mira, {name}.',
      magic_title2: 'Así te van a ver.',
      magic_sub: 'Tu cliente recibe esto en su WhatsApp. Con tu nombre. Sin papeles ni Excel.',
      doc: 'COTIZACIÓN',
      example: 'Ejemplo · así queda con tus productos',
      total: 'TOTAL',
      real: 'Hacer una de verdad',
      share: 'Mandármela por WhatsApp',
      made_with: 'Hecho con ARPA Suite',
      back: 'Volver'
    },
    en: {
      step1_tag: 'Step 1 of 2 · 10 seconds',
      step1_title: "What's your business called?",
      step1_sub: "It will appear on every quote you send. No company? Use your own name.",
      name_label: 'Business name',
      name_ph: "E.g. Gomez Gates",
      oficio_label: 'What do you do?',
      more: 'Other trade',
      next: 'Continue',
      step2_tag: 'Step 2 of 2 · last one',
      step2_title: 'Add your stamp',
      step2_sub: 'Take a photo of your logo, or keep the one we made for you.',
      photo: 'Take photo',
      gallery: 'From gallery',
      see: 'See my quote',
      magic_tag: 'Ready in {s} seconds',
      magic_title: 'Look, {name}.',
      magic_title2: "This is how they'll see you.",
      magic_sub: 'Your client gets this on WhatsApp. With your name. No paper, no Excel.',
      doc: 'QUOTE',
      example: 'Example · this is how it looks with your products',
      total: 'TOTAL',
      real: 'Make a real one',
      share: 'Send it to my WhatsApp',
      made_with: 'Made with ARPA Suite',
      back: 'Back'
    }
  };

  // Ejemplos por oficio (solo para mostrar; no se guardan como cotización).
  const SAMPLES = {
    automatismos: { es: [['Motor corredizo 600 kg', 2450000], ['Cremallera x 6 m', 330000], ['Instalación y puesta en marcha', 700000]],
      en: [['Sliding gate motor 600 kg', 2450000], ['Rack x 6 m', 330000], ['Installation and setup', 700000]] },
    electricidad: { es: [['Revisión de tablero eléctrico', 180000], ['Cableado y materiales', 620000], ['Mano de obra', 450000]],
      en: [['Electrical panel inspection', 180000], ['Wiring and materials', 620000], ['Labor', 450000]] },
    refrigeracion: { es: [['Mantenimiento aire 12.000 BTU', 180000], ['Recarga de gas', 250000], ['Mano de obra', 150000]],
      en: [['A/C service 12,000 BTU', 180000], ['Gas recharge', 250000], ['Labor', 150000]] },
    cctv: { es: [['Kit 4 cámaras HD', 1150000], ['Cableado y accesorios', 280000], ['Instalación y configuración', 450000]],
      en: [['4 HD camera kit', 1150000], ['Cabling and accessories', 280000], ['Installation and setup', 450000]] },
    _: { es: [['Visita técnica y diagnóstico', 85000], ['Materiales', 420000], ['Mano de obra', 350000]],
      en: [['Site visit and diagnosis', 85000], ['Materials', 420000], ['Labor', 350000]] }
  };

  const MAIN_OFICIOS = ['automatismos', 'electricidad', 'refrigeracion', 'cctv'];
  const SHORT_LABEL = {
    es: { automatismos: 'Puertas y portones', electricidad: 'Electricidad', refrigeracion: 'Aires', cctv: 'Cámaras' },
    en: { automatismos: 'Gates and doors', electricidad: 'Electrical', refrigeracion: 'A/C', cctv: 'Cameras' }
  };

  const state = { step: 1, name: '', oficio: '', logo: '', logoIsPhoto: false, startedAt: 0, onDone: null, showAll: false };

  function lang() {
    const l = global.ArpaI18n?.getLang?.() || 'es';
    return l === 'en' ? 'en' : 'es';
  }
  function t(key, vars) {
    let s = (TXT[lang()] || TXT.es)[key] || TXT.es[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function money(n) {
    return '$ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function initials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const ini = words.slice(0, 2).map((w) => w[0]).join('') || 'AS';
    return ini.toUpperCase();
  }
  function oficioLabel(id) {
    return (SHORT_LABEL[lang()] || {})[id] || global.ArpaOficios?.getOficioLabel?.(id) || id;
  }
  function sampleFor(id) {
    const set = SAMPLES[id] || SAMPLES._;
    return set[lang()] || set.es;
  }

  function initialsLogo(name) {
    try {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 320;
      const g = c.getContext('2d');
      g.fillStyle = GOLD;
      if (g.roundRect) { g.beginPath(); g.roundRect(0, 0, 320, 320, 72); g.fill(); } else { g.fillRect(0, 0, 320, 320); }
      g.fillStyle = NAVY;
      g.font = '800 132px system-ui, -apple-system, "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(initials(name), 160, 172);
      return c.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }

  function readPhoto(file) {
    return new Promise((resolve) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 400;
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const g = c.getContext('2d');
          g.fillStyle = '#FFFFFF';
          g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = () => resolve('');
        img.src = reader.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  function injectStyles() {
    if (document.getElementById('primer-minuto-css')) return;
    const css = `
#primer-minuto{position:fixed;inset:0;z-index:100000;background:${NAVY};color:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:inherit}
#primer-minuto *{box-sizing:border-box}
.pm-wrap{max-width:440px;min-height:100%;margin:0 auto;padding:24px 22px 28px;display:flex;flex-direction:column;gap:26px}
.pm-bars{display:flex;gap:8px}.pm-bars span{flex:1;height:4px;border-radius:2px;background:#22335E}.pm-bars span.on{background:${GOLD}}
.pm-tag{font-size:14px;font-weight:700;color:#E2C46B;margin:0 0 10px}
.pm-title{font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.02em;margin:0 0 10px}
.pm-sub{font-size:15px;line-height:1.5;color:#B7C1D8;margin:0}
.pm-label{display:block;font-size:13px;color:#B7C1D8;font-weight:600;margin-bottom:10px}
.pm-input{width:100%;height:62px;border-radius:16px;border:2px solid #2E4370;background:#13204A;color:#fff;font-family:inherit;font-weight:800;font-size:22px;padding:0 18px;outline:none}
.pm-input:focus{border-color:${GOLD}}
.pm-chips{display:flex;flex-wrap:wrap;gap:8px}
.pm-chip{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #2E4370;background:transparent;color:#fff;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer}
.pm-chip.on{background:${GOLD};border-color:${GOLD};color:${NAVY};font-weight:700}
.pm-spacer{flex:1}
.pm-btn{width:100%;min-height:58px;border-radius:16px;border:none;background:${GOLD};color:${NAVY};font-family:inherit;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 10px 30px rgba(201,168,76,.3)}
.pm-btn:disabled{opacity:.4;box-shadow:none;cursor:default}
.pm-btn2{width:100%;min-height:50px;border-radius:14px;border:1px solid #2E4370;background:transparent;color:#fff;font-family:inherit;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.pm-link{background:none;border:none;color:#B7C1D8;font-family:inherit;font-weight:600;font-size:14px;padding:10px;cursor:pointer;align-self:center}
.pm-logo{display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0}
.pm-logo img{width:150px;height:150px;border-radius:36px;object-fit:contain;background:#fff;box-shadow:0 0 0 10px rgba(201,168,76,.14),0 24px 50px rgba(201,168,76,.28)}
.pm-logo b{font-size:20px}.pm-logo small{font-size:13px;color:#B7C1D8}
.pm-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.pm-pick{min-height:88px;border-radius:16px;border:1px solid #2E4370;background:#13204A;color:#fff;font-family:inherit;font-weight:700;font-size:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;position:relative;overflow:hidden}
.pm-pick input{position:absolute;inset:0;opacity:0;cursor:pointer}
.pm-center{text-align:center}
.pm-doc{background:#fff;color:${NAVY_DOC};border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px rgba(201,168,76,.5),0 30px 70px rgba(0,0,0,.5),0 0 60px rgba(201,168,76,.22)}
.pm-doc-h{background:${NAVY_DOC};padding:16px;display:flex;align-items:center;gap:12px}
.pm-doc-h img{width:46px;height:46px;border-radius:12px;object-fit:contain;background:#fff}
.pm-doc-h .n{flex:1;min-width:0;color:#fff;font-size:14px;font-weight:800;text-transform:uppercase;overflow-wrap:anywhere}
.pm-doc-h .k{color:#E2C46B;font-size:10px;font-weight:800;letter-spacing:.08em}
.pm-doc-b{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.pm-doc-b .ex{font-size:11px;color:#6A7489}
.pm-row{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:8px 0;border-bottom:1px solid #EEF0F4}.pm-row b{white-space:nowrap}
.pm-total{background:${NAVY_DOC};border-radius:8px;padding:11px 12px;display:flex;justify-content:space-between;align-items:center}
.pm-total span{color:#AEB8CC;font-size:11px;font-weight:800;letter-spacing:.08em}.pm-total b{color:#E2C46B;font-size:20px}
.pm-actions{display:flex;flex-direction:column;gap:10px}
`;
    const st = document.createElement('style');
    st.id = 'primer-minuto-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  const ICON_ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const ICON_CAM = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E2C46B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const ICON_IMG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E2C46B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="M20 15l-5-5-9 9"/></svg>';
  const ICON_SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E2C46B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';

  function bars(n) {
    return '<div class="pm-bars" aria-hidden="true">' + [1, 2, 3].map((i) => '<span class="' + (i <= n ? 'on' : '') + '"></span>').join('') + '</div>';
  }

  function renderStep1() {
    const all = global.ArpaOficios?.getOficiosList?.() || [];
    const ids = state.showAll ? all.map((o) => o.id) : MAIN_OFICIOS.slice();
    if (state.oficio && !ids.includes(state.oficio)) ids.push(state.oficio);
    const chips = ids.map((id) => '<button type="button" class="pm-chip' + (state.oficio === id ? ' on' : '') + '" data-pm-oficio="' + esc(id) + '">' + esc(oficioLabel(id)) + '</button>').join('')
      + (state.showAll ? '' : '<button type="button" class="pm-chip" data-pm-more="1">' + esc(t('more')) + '</button>');
    return bars(1)
      + '<div><p class="pm-tag">' + esc(t('step1_tag')) + '</p><h1 class="pm-title" id="pm-title">' + esc(t('step1_title')) + '</h1><p class="pm-sub">' + esc(t('step1_sub')) + '</p></div>'
      + '<div><label class="pm-label" for="pm-name">' + esc(t('name_label')) + '</label><input class="pm-input" id="pm-name" type="text" autocomplete="organization" maxlength="60" placeholder="' + esc(t('name_ph')) + '" value="' + esc(state.name) + '"></div>'
      + '<div><span class="pm-label">' + esc(t('oficio_label')) + '</span><div class="pm-chips">' + chips + '</div></div>'
      + '<div class="pm-spacer"></div>'
      + '<button type="button" class="pm-btn" id="pm-next1"' + (canNext1() ? '' : ' disabled') + '>' + esc(t('next')) + ICON_ARROW + '</button>';
  }

  function renderStep2() {
    return bars(2)
      + '<div><p class="pm-tag">' + esc(t('step2_tag')) + '</p><h1 class="pm-title" id="pm-title">' + esc(t('step2_title')) + '</h1><p class="pm-sub">' + esc(t('step2_sub')) + '</p></div>'
      + '<div class="pm-logo"><img src="' + esc(state.logo) + '" alt=""><b>' + esc(state.name) + '</b><small>' + esc(oficioLabel(state.oficio)) + '</small></div>'
      + '<div class="pm-grid2">'
      + '<label class="pm-pick">' + ICON_CAM + esc(t('photo')) + '<input type="file" accept="image/*" capture="environment" data-pm-file="1"></label>'
      + '<label class="pm-pick">' + ICON_IMG + esc(t('gallery')) + '<input type="file" accept="image/png,image/jpeg,image/webp" data-pm-file="1"></label>'
      + '</div>'
      + '<div class="pm-spacer"></div>'
      + '<div class="pm-actions"><button type="button" class="pm-btn" id="pm-next2">' + esc(t('see')) + ICON_ARROW + '</button>'
      + '<button type="button" class="pm-link" id="pm-back">' + esc(t('back')) + '</button></div>';
  }

  function renderStep3() {
    const items = sampleFor(state.oficio);
    const total = items.reduce((a, it) => a + it[1], 0);
    const secs = Math.max(12, Math.min(59, Math.round((Date.now() - state.startedAt) / 1000)));
    return bars(3)
      + '<div class="pm-center"><p class="pm-tag">' + esc(t('magic_tag', { s: secs })) + '</p><h1 class="pm-title" id="pm-title">' + esc(t('magic_title', { name: state.name })) + '<br>' + esc(t('magic_title2')) + '</h1></div>'
      + '<div class="pm-doc"><div class="pm-doc-h"><img src="' + esc(state.logo) + '" alt=""><span class="n">' + esc(state.name) + '</span><span class="k">' + esc(t('doc')) + '</span></div>'
      + '<div class="pm-doc-b"><span class="ex">' + esc(t('example')) + '</span>'
      + items.map((it) => '<div class="pm-row"><span>' + esc(it[0]) + '</span><b>' + money(it[1]) + '</b></div>').join('')
      + '<div class="pm-total"><span>' + esc(t('total')) + '</span><b>' + money(total) + '</b></div></div></div>'
      + '<p class="pm-sub pm-center">' + esc(t('magic_sub')) + '</p>'
      + '<div class="pm-spacer"></div>'
      + '<div class="pm-actions"><button type="button" class="pm-btn" id="pm-done">' + esc(t('real')) + ICON_ARROW + '</button>'
      + '<button type="button" class="pm-btn2" id="pm-share">' + ICON_SEND + esc(t('share')) + '</button></div>';
  }

  function canNext1() {
    return state.name.trim().length >= 2 && Boolean(state.oficio);
  }

  function render() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    const html = state.step === 1 ? renderStep1() : state.step === 2 ? renderStep2() : renderStep3();
    el.innerHTML = '<div class="pm-wrap">' + html + '</div>';
    el.scrollTop = 0;
    bind(el);
  }

  function bind(el) {
    const name = el.querySelector('#pm-name');
    if (name) {
      name.addEventListener('input', () => {
        state.name = name.value;
        const b = el.querySelector('#pm-next1');
        if (b) b.disabled = !canNext1();
      });
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });
    }
    el.querySelectorAll('[data-pm-oficio]').forEach((b) => b.addEventListener('click', () => {
      state.oficio = b.getAttribute('data-pm-oficio');
      el.querySelectorAll('[data-pm-oficio]').forEach((x) => x.classList.toggle('on', x === b));
      const n = el.querySelector('#pm-next1');
      if (n) n.disabled = !canNext1();
    }));
    el.querySelector('[data-pm-more]')?.addEventListener('click', () => { state.showAll = true; render(); });
    el.querySelector('#pm-next1')?.addEventListener('click', () => {
      if (!canNext1()) return;
      state.name = state.name.trim();
      if (!state.logoIsPhoto) state.logo = initialsLogo(state.name);
      state.step = 2; render();
    });
    el.querySelectorAll('[data-pm-file]').forEach((inp) => inp.addEventListener('change', async () => {
      const data = await readPhoto(inp.files && inp.files[0]);
      if (data) { state.logo = data; state.logoIsPhoto = true; render(); }
    }));
    el.querySelector('#pm-back')?.addEventListener('click', () => { state.step = 1; render(); });
    el.querySelector('#pm-next2')?.addEventListener('click', () => { state.step = 3; render(); });
    el.querySelector('#pm-share')?.addEventListener('click', shareImage);
    el.querySelector('#pm-done')?.addEventListener('click', done);
  }

  function loadImg(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
  }

  async function buildShareBlob() {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const font = (w, s) => w + ' ' + s + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    g.fillStyle = '#F3F4F8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#FFFFFF'; g.fillRect(60, 60, W - 120, H - 120);
    g.fillStyle = NAVY_DOC; g.fillRect(60, 60, W - 120, 220);
    const logo = await loadImg(state.logo);
    if (logo) { g.fillStyle = '#FFFFFF'; g.fillRect(100, 100, 140, 140); g.drawImage(logo, 100, 100, 140, 140); }
    g.fillStyle = '#FFFFFF'; g.font = font(800, 46);
    g.fillText(String(state.name).toUpperCase().slice(0, 28), 270, 165);
    g.fillStyle = '#E2C46B'; g.font = font(800, 30);
    g.fillText(t('doc'), 270, 220);
    const items = sampleFor(state.oficio);
    let y = 380;
    g.font = font(500, 26); g.fillStyle = '#6A7489';
    g.fillText(t('example'), 110, 340);
    items.forEach((it) => {
      g.fillStyle = NAVY_DOC; g.font = font(500, 36);
      g.fillText(it[0], 110, y + 40);
      g.font = font(800, 36); g.textAlign = 'right';
      g.fillText(money(it[1]), W - 110, y + 40);
      g.textAlign = 'left';
      g.fillStyle = '#EEF0F4'; g.fillRect(110, y + 70, W - 220, 3);
      y += 110;
    });
    const total = items.reduce((a, it) => a + it[1], 0);
    g.fillStyle = NAVY_DOC; g.fillRect(110, y + 30, W - 220, 130);
    g.fillStyle = '#AEB8CC'; g.font = font(800, 30); g.fillText(t('total'), 150, y + 108);
    g.fillStyle = '#E2C46B'; g.font = font(800, 56); g.textAlign = 'right';
    g.fillText(money(total), W - 150, y + 115); g.textAlign = 'left';
    g.fillStyle = '#6A7489'; g.font = font(600, 28); g.textAlign = 'center';
    g.fillText(t('made_with'), W / 2, H - 110); g.textAlign = 'left';
    return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
  }

  async function shareImage() {
    try {
      const blob = await buildShareBlob();
      if (!blob) return;
      const fileName = 'cotizacion-' + (state.name || 'arpa').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '.png';
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: state.name });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('[primer-minuto] share', e);
    }
  }

  function close() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function done() {
    const cb = state.onDone;
    const result = { companyName: state.name.trim(), oficioId: state.oficio, logo: state.logo };
    close();
    if (typeof cb === 'function') cb(result);
  }

  function open(onDone) {
    try {
      if (document.getElementById(OVERLAY_ID)) return true;
      injectStyles();
      state.step = 1; state.onDone = onDone; state.startedAt = Date.now();
      const el = document.createElement('div');
      el.id = OVERLAY_ID;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'pm-title');
      document.body.appendChild(el);
      render();
      return true;
    } catch (e) {
      console.warn('[primer-minuto] open', e);
      close();
      return false;
    }
  }

  global.ArpaPrimerMinuto = { open, close };
})(window);
