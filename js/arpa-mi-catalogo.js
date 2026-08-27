/**
 * Módulo: Mi Catálogo (productos y categorías del usuario en localStorage)
 */
(function (global) {
  const LEGACY_STORAGE_KEY = 'arpa_catalogo_usuario';
  const LEGACY_CATEGORIES_KEY = 'arpa_categorias_usuario';
  const MIGRATION_FLAG_KEY = 'arpa_catalog_per_oficio_migrated_v1';
  /** @deprecated legacy key name — datos viven en arpa_catalog_{oficio} */
  const STORAGE_KEY = LEGACY_STORAGE_KEY;
  /** @deprecated legacy key name — datos viven en arpa_categorias_{oficio} */
  const CATEGORIES_KEY = LEGACY_CATEGORIES_KEY;
  const UNIDADES = ['unidad', 'metro', 'hora', 'servicio'];
  const SIN_CATEGORIA_ID = '__sin_categoria__';

  let editingProductId = null;
  let editingCategoryId = null;
  let editingOficioId = 'automatismos';
  let currentOficioId = 'automatismos';
  let activeTabOficio = 'automatismos';
  const searchByOficio = {};
  let importPreviewRows = [];

  function normalizeOficioId(oficioId) {
    return global.ArpaOficios?.normalizeOficioId?.(oficioId) || 'automatismos';
  }

  function resolveItemOficioId(item) {
    return global.ArpaOficios?.resolveItemOficioId?.(item) || 'automatismos';
  }

  function catalogProductsKey(oficioId) {
    return 'arpa_catalog_' + normalizeOficioId(oficioId);
  }

  function catalogCategoriesKey(oficioId) {
    return 'arpa_categorias_' + normalizeOficioId(oficioId);
  }

  function resolveStorageOficioId(item) {
    const raw = item?.oficioId;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return 'automatismos';
    }
    return normalizeOficioId(raw);
  }

  function migrateLegacyCatalogIfNeeded() {
    try {
      if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') return;
    } catch (e) {
      return;
    }

    let legacyProducts = [];
    let legacyCategories = [];
    try {
      legacyProducts = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]');
      legacyCategories = JSON.parse(localStorage.getItem(LEGACY_CATEGORIES_KEY) || '[]');
      if (!Array.isArray(legacyProducts)) legacyProducts = [];
      if (!Array.isArray(legacyCategories)) legacyCategories = [];
    } catch (e) {
      legacyProducts = [];
      legacyCategories = [];
    }

    const productsByOficio = {};
    const categoriesByOficio = {};

    legacyProducts.forEach((p) => {
      const oid = resolveStorageOficioId(p);
      if (!productsByOficio[oid]) productsByOficio[oid] = [];
      productsByOficio[oid].push(p);
    });

    legacyCategories.forEach((c) => {
      const oid = resolveStorageOficioId(c);
      if (!categoriesByOficio[oid]) categoriesByOficio[oid] = [];
      categoriesByOficio[oid].push(c);
    });

    const oficioIds = new Set([
      ...Object.keys(productsByOficio),
      ...Object.keys(categoriesByOficio)
    ]);

    oficioIds.forEach((oid) => {
      try {
        if (productsByOficio[oid]?.length) {
          localStorage.setItem(catalogProductsKey(oid), JSON.stringify(productsByOficio[oid]));
        }
        if (categoriesByOficio[oid]?.length) {
          localStorage.setItem(catalogCategoriesKey(oid), JSON.stringify(categoriesByOficio[oid]));
        }
      } catch (e) {
        console.warn('[arpa-mi-catalogo] migrate bucket', oid, e);
      }
    });

    try {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    } catch (e) { /* ignore */ }
  }

  function readProductsRaw(oficioId) {
    migrateLegacyCatalogIfNeeded();
    const oid = normalizeOficioId(oficioId);
    try {
      const data = JSON.parse(localStorage.getItem(catalogProductsKey(oid)) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function writeProductsRaw(oficioId, products) {
    migrateLegacyCatalogIfNeeded();
    const oid = normalizeOficioId(oficioId);
    try {
      localStorage.setItem(catalogProductsKey(oid), JSON.stringify(products));
    } catch (e) {
      console.warn('[arpa-mi-catalogo] writeProductsRaw', e);
    }
    global.ArpaCatalogo?.invalidateListaCache?.();
    global.ArpaCotizacion?.updateCatalogHint?.();
  }

  function readCategoriesRaw(oficioId) {
    migrateLegacyCatalogIfNeeded();
    const oid = normalizeOficioId(oficioId);
    try {
      const data = JSON.parse(localStorage.getItem(catalogCategoriesKey(oid)) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function writeCategoriesRaw(oficioId, categories) {
    migrateLegacyCatalogIfNeeded();
    const oid = normalizeOficioId(oficioId);
    try {
      localStorage.setItem(catalogCategoriesKey(oid), JSON.stringify(categories));
    } catch (e) {
      console.warn('[arpa-mi-catalogo] writeCategoriesRaw', e);
    }
  }

  function getActiveOficioId() {
    const active = global.ArpaOficios?.getActiveOficiosFromSettings?.();
    if (Array.isArray(active) && active.length) {
      return normalizeOficioId(active[0]);
    }
    return 'automatismos';
  }

  function sectionDomIds(oficioId) {
    const id = normalizeOficioId(oficioId);
    if (id === 'automatismos') {
      return {
        panel: 'catalogo-categorias-panel',
        list: 'catalogo-list',
        empty: 'catalogo-empty',
        count: 'catalogo-count',
        search: 'catalogo-buscar',
        section: 'catalogo-section-automatismos'
      };
    }
    return {
      panel: `catalogo-categorias-panel-${id}`,
      list: `catalogo-list-${id}`,
      empty: `catalogo-empty-${id}`,
      count: `catalogo-count-${id}`,
      search: `catalogo-buscar-${id}`,
      section: `catalogo-section-${id}`
    };
  }

  function getActiveOficios() {
    const active = global.ArpaOficios?.getActiveOficiosFromSettings?.();
    return Array.isArray(active) ? active : [];
  }

  const IMPORT_HEADERS = {
    nombre: 'nom',
    referencia: 'cod',
    precio: 'pvp',
    preciounitario: 'pvp',
    pvp: 'pvp',
    unidad: 'unidad',
    marca: 'marca',
    categoria: 'categoria'
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function formatoPesos(n) {
    return global.ArpaPricing?.formatoPesos(n) || ('$ ' + (Number(n) || 0).toLocaleString('es-CO'));
  }

  function parsePvp(value) {
    const n = Number(String(value).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getCategories(oficioId) {
    return readCategoriesRaw(oficioId);
  }

  function saveCategories(categories, oficioId) {
    const oid = normalizeOficioId(oficioId != null ? oficioId : currentOficioId);
    writeCategoriesRaw(oid, categories);
  }

  function hasCategories(oficioId) {
    return getCategories(oficioId).length > 0;
  }

  function getCategoryById(id, oficioId) {
    const oid = oficioId != null ? normalizeOficioId(oficioId) : null;
    const pool = oid != null ? getCategories(oid) : getCategories(currentOficioId);
    return pool.find((c) => c.id === id) || null;
  }

  function getCategoryName(id, oficioId) {
    if (!id || id === SIN_CATEGORIA_ID) return '';
    return getCategoryById(id, oficioId)?.name || '';
  }

  function countProductsInCategory(categoryId, oficioId) {
    return getProducts(oficioId).filter((p) => resolveProductCategoryId(p) === categoryId).length;
  }

  function getProducts(oficioId) {
    return readProductsRaw(oficioId);
  }

  function saveProducts(products, oficioId) {
    const oid = normalizeOficioId(oficioId != null ? oficioId : currentOficioId);
    writeProductsRaw(oid, products);
  }

  function hasProducts(oficioId) {
    return getProducts(oficioId).some((p) => (p.nom || '').trim() && (p.cod || '').trim());
  }

  function resolveProductCategoryId(product) {
    if (product.categoriaId) return product.categoriaId;
    const legacy = (product.categoria || '').trim();
    if (!legacy) return SIN_CATEGORIA_ID;
    const oid = resolveItemOficioId(product);
    const match = getCategories(oid).find(
      (c) => c.name.toLowerCase() === legacy.toLowerCase()
    );
    return match ? match.id : SIN_CATEGORIA_ID;
  }

  function toFlatProduct(p) {
    const nom = (p.nom || '').trim();
    const marca = (p.marca || '').trim();
    const categoria = getCategoryName(resolveProductCategoryId(p));
    return {
      cod: (p.cod || '').trim(),
      nom: marca ? `${marca} – ${nom}` : nom,
      marca,
      categoria,
      pvp: parsePvp(p.pvp),
      unidad: p.unidad || 'unidad',
      _userId: p.id
    };
  }

  function getListaFlat(oficioId) {
    const oid = oficioId != null ? normalizeOficioId(oficioId) : getActiveOficioId();
    return getProducts(oid)
      .filter((p) => (p.nom || '').trim() && (p.cod || '').trim())
      .map(toFlatProduct);
  }

  function findByCod(cod) {
    return getListaFlat().find((p) => p.cod === cod) || null;
  }

  function getFilteredProducts(oficioId) {
    const oid = normalizeOficioId(oficioId);
    const q = (searchByOficio[oid] || '').toLowerCase().trim();
    const list = getProducts(oid);
    if (!q) return list;
    return list.filter((p) =>
      (p.nom || '').toLowerCase().includes(q) ||
      (p.cod || '').toLowerCase().includes(q) ||
      getCategoryName(resolveProductCategoryId(p), oid).toLowerCase().includes(q)
    );
  }

  function setFabVisible(visible) {
    const fab = document.getElementById('btn-catalogo-fab');
    if (fab) fab.hidden = !visible;
  }

  function populateCategorySelect(selectedId, oficioId) {
    const sel = document.getElementById('cat-form-categoria');
    if (!sel) return;
    const oid = normalizeOficioId(oficioId || editingOficioId);
    const categories = getCategories(oid);
    sel.innerHTML = categories.length
      ? categories.map((c) =>
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`
        ).join('')
      : '<option value="">— Cree categorías primero —</option>';
    if (selectedId && categories.some((c) => c.id === selectedId)) {
      sel.value = selectedId;
    } else if (categories.length) {
      sel.value = categories[0].id;
    }
  }

  function openProductForm(product, oficioId) {
    editingOficioId = normalizeOficioId(oficioId || resolveItemOficioId(product) || currentOficioId);
    currentOficioId = editingOficioId;
    if (!hasCategories(editingOficioId)) {
      openCategoryForm(null, editingOficioId);
      return;
    }
    editingProductId = product?.id || null;
    const overlay = document.getElementById('catalogo-form-modal');
    const title = document.getElementById('catalogo-form-title');
    if (title) title.textContent = editingProductId ? window.ArpaI18n.t('ui.catalogo.editar_producto') : window.ArpaI18n.t('ui.catalogo.nuevo_producto');

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    };

    set('cat-form-nom', product?.nom);
    set('cat-form-cod', product?.cod);
    set('cat-form-pvp', product?.pvp != null ? product.pvp : '');
    set('cat-form-marca', product?.marca);
    populateCategorySelect(product ? resolveProductCategoryId(product) : null, editingOficioId);
    const unidad = document.getElementById('cat-form-unidad');
    if (unidad) unidad.value = UNIDADES.includes(product?.unidad) ? product.unidad : 'unidad';

    showProductFormError('');
    overlay?.classList.add('open');
    document.getElementById('cat-form-nom')?.focus();
  }

  function closeProductForm() {
    editingProductId = null;
    document.getElementById('catalogo-form-modal')?.classList.remove('open');
  }

  function readProductFormData() {
    return {
      nom: document.getElementById('cat-form-nom')?.value.trim() || '',
      cod: document.getElementById('cat-form-cod')?.value.trim() || '',
      pvp: parsePvp(document.getElementById('cat-form-pvp')?.value),
      unidad: document.getElementById('cat-form-unidad')?.value || 'unidad',
      marca: document.getElementById('cat-form-marca')?.value.trim() || '',
      categoriaId: document.getElementById('cat-form-categoria')?.value || ''
    };
  }

  function showProductFormError(msg) {
    const el = document.getElementById('catalogo-form-error');
    if (el) {
      el.textContent = msg;
      el.hidden = !msg;
    }
  }

  function saveProductForm() {
    const data = readProductFormData();
    const oid = editingOficioId;
    if (!data.nom) {
      showProductFormError(window.ArpaI18n.t('alert.catalogo.nombre_obligatorio'));
      return;
    }
    if (!data.cod) {
      showProductFormError(window.ArpaI18n.t('alert.catalogo.referencia_obligatoria'));
      return;
    }
    if (data.pvp <= 0) {
      showProductFormError(window.ArpaI18n.t('alert.catalogo.precio_invalido'));
      return;
    }
    if (!data.categoriaId || !getCategoryById(data.categoriaId, oid)) {
      showProductFormError(window.ArpaI18n.t('alert.catalogo.categoria_invalida'));
      return;
    }

    const products = getProducts(oid);
    const duplicate = products.find((p) =>
      p.cod.toLowerCase() === data.cod.toLowerCase() &&
      p.id !== editingProductId
    );
    if (duplicate) {
      showProductFormError(window.ArpaI18n.t('alert.catalogo.referencia_duplicada'));
      return;
    }

    const payload = {
      nom: data.nom,
      cod: data.cod,
      pvp: data.pvp,
      unidad: data.unidad,
      marca: data.marca,
      categoriaId: data.categoriaId,
      oficioId: oid
    };

    if (editingProductId) {
      const idx = products.findIndex((p) => p.id === editingProductId);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...payload };
        delete products[idx].categoria;
      }
    } else {
      products.unshift({ id: newId(), ...payload });
    }

    saveProducts(products, oid);
    showProductFormError('');
    closeProductForm();
    render();
  }

  function deleteProduct(id) {
    let productOficio = normalizeOficioId(currentOficioId);
    let product = getProducts(productOficio).find((p) => p.id === id);
    if (!product) {
      for (const oid of getActiveOficios()) {
        product = getProducts(oid).find((p) => p.id === id);
        if (product) {
          productOficio = oid;
          break;
        }
      }
    }
    if (!product) return;
    const label = product.nom || product.cod || 'este producto';
    if (!confirm(window.ArpaI18n.t('confirm.catalogo.eliminar_producto', { label }))) return;
    saveProducts(getProducts(productOficio).filter((p) => p.id !== id), productOficio);
    render();
  }

  function openCategoryForm(category, oficioId) {
    editingOficioId = normalizeOficioId(oficioId || resolveItemOficioId(category) || currentOficioId);
    currentOficioId = editingOficioId;
    editingCategoryId = category?.id || null;
    const overlay = document.getElementById('catalogo-cat-modal');
    const title = document.getElementById('catalogo-cat-title');
    const input = document.getElementById('cat-cat-nombre');
    if (title) title.textContent = editingCategoryId ? window.ArpaI18n.t('ui.catalogo.editar_categoria') : window.ArpaI18n.t('ui.catalogo.nueva_categoria');
    if (input) input.value = category?.name || '';
    showCategoryFormError('');
    overlay?.classList.add('open');
    input?.focus();
  }

  function closeCategoryForm() {
    editingCategoryId = null;
    document.getElementById('catalogo-cat-modal')?.classList.remove('open');
  }

  function showCategoryFormError(msg) {
    const el = document.getElementById('catalogo-cat-error');
    if (el) {
      el.textContent = msg;
      el.hidden = !msg;
    }
  }

  function saveCategoryForm() {
    const name = document.getElementById('cat-cat-nombre')?.value.trim() || '';
    const oid = editingOficioId;
    if (!name) {
      showCategoryFormError(window.ArpaI18n.t('alert.catalogo.categoria_nombre_obligatorio'));
      return;
    }

    const categories = getCategories(oid);
    const duplicate = categories.find(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        c.id !== editingCategoryId
    );
    if (duplicate) {
      showCategoryFormError(window.ArpaI18n.t('alert.catalogo.categoria_duplicada'));
      return;
    }

    if (editingCategoryId) {
      const idx = categories.findIndex((c) => c.id === editingCategoryId);
      if (idx >= 0) categories[idx] = { ...categories[idx], name };
    } else {
      categories.push({ id: newId(), name, oficioId: oid });
    }

    saveCategories(categories, oid);
    showCategoryFormError('');
    closeCategoryForm();
    render();
  }

  function deleteCategory(id) {
    const category = getCategoryById(id, currentOficioId)
      || getActiveOficios().map((oid) => getCategoryById(id, oid)).find(Boolean);
    if (!category) return;
    const oid = resolveItemOficioId(category);
    const count = countProductsInCategory(id, oid);
    if (count > 0) {
      alert(window.ArpaI18n.t('alert.catalogo.no_eliminar_categoria', { count }));
      return;
    }
    if (!confirm(window.ArpaI18n.t('confirm.catalogo.eliminar_categoria', { name: category.name }))) return;
    saveCategories(getCategories(oid).filter((c) => c.id !== id), oid);
    render();
  }

  function renderProductCard(p) {
    return `
      <article class="catalogo-card" data-id="${escapeHtml(p.id)}">
        <div class="catalogo-card-head">
          <span class="catalogo-ref">${escapeHtml(p.cod)}</span>
          <span class="catalogo-unidad">${escapeHtml(p.unidad || 'unidad')}</span>
        </div>
        <h3 class="catalogo-nom">${escapeHtml(p.nom)}</h3>
        ${p.marca ? `<p class="catalogo-meta"><span>${escapeHtml(p.marca)}</span></p>` : ''}
        <div class="catalogo-card-foot">
          <strong class="catalogo-pvp">${formatoPesos(p.pvp)}</strong>
          <div class="catalogo-card-actions">
            <button type="button" class="btn-catalogo-edit" data-id="${escapeHtml(p.id)}" aria-label="${escapeHtml(window.ArpaI18n.t('aria.catalogo.editar'))}">✏️</button>
            <button type="button" class="btn-catalogo-del" data-id="${escapeHtml(p.id)}" aria-label="${escapeHtml(window.ArpaI18n.t('aria.catalogo.eliminar'))}">🗑️</button>
          </div>
        </div>
      </article>`;
  }

  function bindProductCardActions(container, oficioId) {
    const oid = normalizeOficioId(oficioId);
    container.querySelectorAll('.btn-catalogo-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = getProducts(oid).find((p) => p.id === btn.dataset.id);
        if (product) openProductForm(product, oid);
      });
    });
    container.querySelectorAll('.btn-catalogo-del').forEach((btn) => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });
  }

  function renderCategoriesPanel(oficioId) {
    const oid = normalizeOficioId(oficioId);
    const dom = sectionDomIds(oid);
    const panel = document.getElementById(dom.panel);
    if (!panel) return;

    const categories = getCategories(oid);
    if (!categories.length) {
      panel.innerHTML = `
        <div class="catalogo-cat-empty" data-i18n="cat.cat_empty">
          Primero crea tus categorías. Ejemplo: Motores, Repuestos, Servicios, Materiales…
        </div>
        <button type="button" class="btn-catalogo-add-cat" data-oficio="${escapeHtml(oid)}">${escapeHtml(window.ArpaI18n.t('ui.catalogo.crear_primera_categoria'))}</button>`;
      panel.querySelector('.btn-catalogo-add-cat')?.addEventListener('click', () => openCategoryForm(null, oid));
      global.ArpaI18n?.apply?.(global.ArpaI18n?.getLang?.() || 'es');
      return;
    }

    panel.innerHTML = `
      <div class="catalogo-cat-list">
        ${categories.map((c) => {
          const n = countProductsInCategory(c.id, oid);
          const canDelete = n === 0;
          return `
            <div class="catalogo-cat-chip" data-id="${escapeHtml(c.id)}">
              <span class="catalogo-cat-chip-name">${escapeHtml(c.name)}</span>
              <span class="catalogo-cat-chip-count">${n}</span>
              <button type="button" class="btn-cat-edit" data-id="${escapeHtml(c.id)}" aria-label="${escapeHtml(window.ArpaI18n.t('aria.catalogo.editar_categoria'))}">✏️</button>
              ${canDelete ? `<button type="button" class="btn-cat-del" data-id="${escapeHtml(c.id)}" aria-label="${escapeHtml(window.ArpaI18n.t('aria.catalogo.eliminar_categoria'))}">✕</button>` : ''}
            </div>`;
        }).join('')}
      </div>
      <button type="button" class="btn-catalogo-add-cat" data-oficio="${escapeHtml(oid)}">${escapeHtml(window.ArpaI18n.t('ui.catalogo.nueva_categoria_btn'))}</button>`;

    panel.querySelector('.btn-catalogo-add-cat')?.addEventListener('click', () => openCategoryForm(null, oid));
    panel.querySelectorAll('.btn-cat-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = getCategoryById(btn.dataset.id, oid);
        if (cat) openCategoryForm(cat, oid);
      });
    });
    panel.querySelectorAll('.btn-cat-del').forEach((btn) => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });
  }

  function renderProductGroups(oficioId) {
    const oid = normalizeOficioId(oficioId);
    const dom = sectionDomIds(oid);
    const list = document.getElementById(dom.list);
    const empty = document.getElementById(dom.empty);
    const count = document.getElementById(dom.count);
    if (!list) return;

    const categories = getCategories(oid);
    const products = getFilteredProducts(oid);
    const total = getProducts(oid).length;
    const q = (searchByOficio[oid] || '').trim();

    if (count) {
      count.textContent = total
        ? `${total} producto${total !== 1 ? 's' : ''}${q ? ` · ${products.length} mostrados` : ''}`
        : '';
    }

    if (!categories.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = true;
      return;
    }

    if (!total) {
      list.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = 'Aún no hay productos.<br>Pulse <strong>+</strong> para agregar el primero.';
      }
      return;
    }

    if (empty) empty.hidden = true;

    if (!products.length) {
      list.innerHTML = '<div class="catalogo-no-results">' + escapeHtml(window.ArpaI18n.t('ui.catalogo.sin_resultados_busqueda')) + '</div>';
      return;
    }

    const groups = [];
    categories.forEach((cat) => {
      const items = products.filter((p) => resolveProductCategoryId(p) === cat.id);
      if (items.length) groups.push({ id: cat.id, name: cat.name, items });
    });

    const sinCat = products.filter((p) => resolveProductCategoryId(p) === SIN_CATEGORIA_ID);
    if (sinCat.length) {
      groups.push({ id: SIN_CATEGORIA_ID, name: 'Sin categoría', items: sinCat });
    }

    list.innerHTML = groups.map((g) => `
      <section class="catalogo-grupo">
        <h3 class="catalogo-grupo-title">
          <span class="catalogo-grupo-dot">🔹</span>
          ${escapeHtml(g.name.toUpperCase())}
          <span class="catalogo-grupo-count">(${g.items.length} producto${g.items.length !== 1 ? 's' : ''})</span>
        </h3>
        <div class="catalogo-grupo-cards">
          ${g.items.map(renderProductCard).join('')}
        </div>
      </section>
    `).join('');

    bindProductCardActions(list, oid);
  }

  function setCatalogoTab(oficioId) {
    const id = normalizeOficioId(oficioId);
    activeTabOficio = id;
    currentOficioId = id;
    applyCatalogoTabVisibility(getActiveOficios());
  }

  function applyCatalogoTabVisibility(activeOficios) {
    const active = Array.isArray(activeOficios) ? activeOficios : getActiveOficios();
    const multi = active.length > 1;
    const tabsWrap = document.getElementById('catalogo-oficios-tabs');
    const allOficios = global.ArpaOficios?.getOficiosList?.().map((o) => o.id) || ['automatismos'];

    if (!active.length || !active.includes(activeTabOficio)) {
      activeTabOficio = active[0] || 'automatismos';
      currentOficioId = activeTabOficio;
    }

    if (tabsWrap) tabsWrap.hidden = !multi;

    allOficios.forEach((oid) => {
      const section = document.getElementById(sectionDomIds(oid).section);
      if (!section) return;
      if (!active.includes(oid)) {
        section.hidden = true;
        return;
      }
      section.hidden = multi && oid !== activeTabOficio;
    });

    document.querySelectorAll('#catalogo-oficios-tabs-list .catalogo-oficio-tab').forEach((btn) => {
      const isActive = btn.dataset.oficio === activeTabOficio;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function renderOficioTabs(activeOficios) {
    const tabsWrap = document.getElementById('catalogo-oficios-tabs');
    const tabsList = document.getElementById('catalogo-oficios-tabs-list');
    if (!tabsWrap || !tabsList) {
      applyCatalogoTabVisibility(activeOficios);
      return;
    }

    if (activeOficios.length <= 1) {
      tabsList.innerHTML = '';
      applyCatalogoTabVisibility(activeOficios);
      return;
    }

    tabsList.innerHTML = activeOficios.map((oficioId) => {
      const i18nKey = global.ArpaOficios?.getOficioById?.(oficioId)?.i18nKey || '';
      const label = global.ArpaOficios?.getOficioLabel?.(oficioId) || oficioId;
      const isActive = oficioId === activeTabOficio;
      return `<button type="button" class="catalogo-oficio-tab${isActive ? ' active' : ''}" role="tab" data-oficio="${escapeHtml(oficioId)}" aria-selected="${isActive ? 'true' : 'false'}"${i18nKey ? ` data-i18n="${escapeHtml(i18nKey)}"` : ''}>${escapeHtml(label)}</button>`;
    }).join('');

    global.ArpaI18n?.apply?.(global.ArpaI18n?.getLang?.() || 'es');

    tabsList.querySelectorAll('.catalogo-oficio-tab').forEach((btn) => {
      btn.addEventListener('click', () => setCatalogoTab(btn.dataset.oficio));
    });

    applyCatalogoTabVisibility(activeOficios);
  }

  function renderExtraOficioSections(activeOficios) {
    const container = document.getElementById('catalogo-extra-sections');
    if (!container) return;

    const extras = activeOficios.filter((id) => id !== 'automatismos');
    container.innerHTML = extras.map((oficioId) => {
      const i18nKey = global.ArpaOficios?.getOficioById?.(oficioId)?.i18nKey || '';
      const label = global.ArpaOficios?.getOficioLabel?.(oficioId) || oficioId;
      const seedCount = global.ArpaOficios?.getSeedProductCount?.(oficioId) || 0;
      return `
        <div id="catalogo-section-${escapeHtml(oficioId)}" class="catalogo-oficio-section" data-oficio="${escapeHtml(oficioId)}">
          <h2 class="catalogo-oficio-title"><span class="dot"></span><span${i18nKey ? ` data-i18n="${escapeHtml(i18nKey)}"` : ''}>${escapeHtml(label)}</span></h2>
          <div class="section catalogo-categorias-block">
            <div class="section-title"><span class="dot"></span><span data-i18n="cat.section.categorias">Categorías</span></div>
            <div id="catalogo-categorias-panel-${escapeHtml(oficioId)}"></div>
          </div>
          <div class="section">
            <div class="section-title"><span class="dot"></span><span data-i18n="cat.section.productos">Productos</span></div>
            <p class="catalogo-oficio-intro" data-i18n="cat.oficio.intro">Catálogo genérico editable. Ajuste precios y productos según su negocio.</p>
            <div class="catalogo-toolbar">
              <div class="catalogo-toolbar-row">
                <input type="search" id="catalogo-buscar-${escapeHtml(oficioId)}" data-i18n-placeholder="cat.placeholder.buscar" placeholder="🔍 Buscar por nombre o referencia…" autocomplete="off" inputmode="search">
                <button type="button" class="btn-catalogo-import btn-catalogo-seed-oficio" data-oficio="${escapeHtml(oficioId)}" data-i18n="cat.btn.cargar_catalogo_base">📦 Cargar catálogo base (${seedCount})</button>
                <button type="button" class="btn-catalogo-import btn-catalogo-maestro-oficio" data-oficio="${escapeHtml(oficioId)}">☁️ Catálogo maestro</button>
                <button type="button" class="btn-catalogo-import btn-catalogo-add-oficio" data-oficio="${escapeHtml(oficioId)}" data-i18n="cat.btn.agregar_producto">+ Agregar producto</button>
              </div>
              <span id="catalogo-count-${escapeHtml(oficioId)}" class="catalogo-count"></span>
            </div>
            <div id="catalogo-empty-${escapeHtml(oficioId)}" class="catalogo-empty" hidden data-i18n-html="cat.empty">
              Aún no hay productos.<br>Pulse <strong>+</strong> para agregar el primero.
            </div>
            <div id="catalogo-list-${escapeHtml(oficioId)}" class="catalogo-list"></div>
          </div>
        </div>`;
    }).join('');

    global.ArpaI18n?.apply?.(global.ArpaI18n?.getLang?.() || 'es');

    extras.forEach((oficioId) => {
      document.getElementById(`catalogo-buscar-${oficioId}`)?.addEventListener('input', (e) => {
        searchByOficio[oficioId] = e.target.value;
        currentOficioId = oficioId;
        renderProductGroups(oficioId);
      });
      container.querySelector(`.btn-catalogo-seed-oficio[data-oficio="${oficioId}"]`)?.addEventListener('click', () => {
        currentOficioId = oficioId;
        global.ArpaOficios?.precargarCatalogoOficio?.(oficioId);
      });
      container.querySelector(`.btn-catalogo-maestro-oficio[data-oficio="${oficioId}"]`)?.addEventListener('click', () => {
        currentOficioId = oficioId;
        importarCatalogoMaestro(oficioId);
      });
      container.querySelector(`.btn-catalogo-add-oficio[data-oficio="${oficioId}"]`)?.addEventListener('click', () => {
        currentOficioId = oficioId;
        onFabClick();
      });
      container.querySelector(`#catalogo-section-${oficioId}`)?.addEventListener('focusin', () => {
        currentOficioId = oficioId;
      });
    });
  }

  function importarCatalogoMaestro(oficioId) {
    if (!global.ArpaCloudSync?.getCatalogoBase) {
      alert('Sincronización con la nube no disponible.');
      return;
    }
    const btn = document.querySelector(`.btn-catalogo-maestro-oficio[data-oficio="${oficioId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Descargando…'; }

    global.ArpaCloudSync.getCatalogoBase()
      .then((data) => {
        if (!data?.ok || !data.productos?.length) {
          alert(data?.mensaje || 'El catálogo maestro está vacío o no está disponible.');
          return;
        }

        // Productos existentes en el catálogo local (para evitar duplicados por código)
        const localProducts = getProducts(oficioId);
        const existingCodes = new Set(localProducts.map((p) => String(p.cod || '').trim().toLowerCase()));

        // Solo importar los que no existen localmente
        const toImport = data.productos.filter((p) => {
          const cod = String(p.cod || '').trim().toLowerCase();
          return cod && !existingCodes.has(cod);
        });

        if (!toImport.length) {
          alert('✓ Ya tienes todos los productos del catálogo maestro.');
          return;
        }

        // Agregar al catálogo local
        const cats = getCategories(oficioId);
        const catMap = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
        const newCats = [];

        function ensureCat(nombre) {
          const key = (nombre || 'General').toLowerCase();
          if (catMap.has(key)) return catMap.get(key);
          const cat = { id: newId(), name: nombre || 'General', oficioId: normalizeOficioId(oficioId) };
          newCats.push(cat);
          catMap.set(key, cat.id);
          return cat.id;
        }

        const newProducts = toImport.map((p) => ({
          id: newId(),
          cod: String(p.cod || '').trim(),
          nom: String(p.nom || '').trim(),
          pvp: Number(p.pvp) || 0,
          unidad: String(p.unidad || 'unidad').trim() || 'unidad',
          marca: String(p.marca || '').trim(),
          categoriaId: ensureCat(p.categoria || 'General'),
          oficioId: normalizeOficioId(oficioId)
        })).filter((p) => p.cod && p.nom);

        if (newCats.length) {
          const allCats = [...cats, ...newCats];
          try { localStorage.setItem(catalogCategoriesKey(oficioId), JSON.stringify(allCats)); } catch(e) {}
        }

        const allProducts = [...localProducts, ...newProducts];
        try { localStorage.setItem(catalogProductsKey(oficioId), JSON.stringify(allProducts)); } catch(e) {}

        global.ArpaCatalogo?.invalidateListaCache?.();
        renderCategoriesPanel(oficioId);
        renderProductGroups(oficioId);
        global.ArpaCloudSync?.scheduleCatalogCloudSync?.();

        alert(`✓ Se importaron ${newProducts.length} producto(s) del catálogo maestro.`);
      })
      .catch((err) => {
        console.warn('[arpa-mi-catalogo] importarCatalogoMaestro', err);
        alert('Error al conectar con el catálogo maestro.');
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.textContent = '☁️ Catálogo maestro'; }
      });
  }

  function render() {
    const active = getActiveOficios();
    global.ArpaOficios?.seedActiveOficios?.();

    renderExtraOficioSections(active);
    renderOficioTabs(active);

    active.forEach((oficioId) => {
      renderCategoriesPanel(oficioId);
      renderProductGroups(oficioId);
    });

    applyCatalogoTabVisibility(active);
  }

  function refreshView() {
    searchByOficio.automatismos = document.getElementById('catalogo-buscar')?.value || '';
    getActiveOficios().forEach((oficioId) => {
      if (oficioId === 'automatismos') return;
      const el = document.getElementById(`catalogo-buscar-${oficioId}`);
      if (el) searchByOficio[oficioId] = el.value;
    });
    render();
  }

  function onFabClick() {
    const oid = normalizeOficioId(currentOficioId);
    if (!hasCategories(oid)) {
      openCategoryForm(null, oid);
    } else {
      openProductForm(null, oid);
    }
  }

  function normalizeHeaderKey(key) {
    return String(key || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  function mapImportRow(raw) {
    const mapped = {};
    Object.entries(raw || {}).forEach(([key, val]) => {
      const field = IMPORT_HEADERS[normalizeHeaderKey(key)];
      if (field) mapped[field] = val;
    });
    return mapped;
  }

  function normalizeUnidad(val) {
    const v = String(val || '').trim().toLowerCase();
    if (UNIDADES.includes(v)) return v;
    const aliases = {
      unidades: 'unidad',
      und: 'unidad',
      mts: 'metro',
      metros: 'metro',
      m: 'metro',
      horas: 'hora',
      hr: 'hora',
      servicios: 'servicio'
    };
    return aliases[v] || 'unidad';
  }

  function parseCSVLine(line, delimiter) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function parseCSVText(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];

    const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const headers = parseCSVLine(lines[0], delimiter);
    return lines.slice(1).map((line) => {
      const vals = parseCSVLine(line, delimiter);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = vals[i] ?? '';
      });
      return row;
    });
  }

  function parseExcelArrayBuffer(buffer) {
    const XLSX = global.XLSX;
    if (!XLSX) throw new Error('No se pudo cargar la librería SheetJS.');
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  }

  function validateImportRow(mapped) {
    const nom = String(mapped.nom || '').trim();
    const cod = String(mapped.cod || '').trim();
    const pvp = parsePvp(mapped.pvp);
    const errors = [];
    if (!nom) errors.push('Falta nombre');
    if (!cod) errors.push('Falta referencia');
    if (pvp <= 0) errors.push('Precio inválido');
    return {
      nom,
      cod,
      pvp,
      unidad: normalizeUnidad(mapped.unidad),
      marca: String(mapped.marca || '').trim(),
      categoria: String(mapped.categoria || '').trim() || 'General',
      valid: errors.length === 0,
      errors: errors.join(', ')
    };
  }

  function buildImportPreview(rawRows) {
    return rawRows
      .map(mapImportRow)
      .map(validateImportRow)
      .filter((row) => row.nom || row.cod || row.pvp || row.marca || row.categoria);
  }

  function ensureCategoryByName(name, categories, oficioId) {
    const oid = normalizeOficioId(oficioId || currentOficioId);
    const label = (name || 'General').trim() || 'General';
    let cat = categories.find(
      (c) => resolveItemOficioId(c) === oid && c.name.toLowerCase() === label.toLowerCase()
    );
    if (!cat) {
      cat = { id: newId(), name: label, oficioId: oid };
      categories.push(cat);
    }
    return cat.id;
  }

  function rowsToProducts(rows, categories, oficioId) {
    const oid = normalizeOficioId(oficioId || currentOficioId);
    return rows
      .filter((r) => r.valid)
      .map((r) => ({
        id: newId(),
        nom: r.nom,
        cod: r.cod,
        pvp: r.pvp,
        unidad: r.unidad,
        marca: r.marca,
        categoriaId: ensureCategoryByName(r.categoria, categories, oid),
        oficioId: oid
      }));
  }

  function openImportModal() {
    document.getElementById('catalogo-import-modal')?.classList.add('open');
  }

  function closeImportModal() {
    importPreviewRows = [];
    document.getElementById('catalogo-import-modal')?.classList.remove('open');
    document.getElementById('catalogo-import-tbody').innerHTML = '';
    const summary = document.getElementById('catalogo-import-summary');
    if (summary) summary.textContent = '';
    document.getElementById('btn-catalogo-import-add').disabled = true;
    document.getElementById('btn-catalogo-import-replace').disabled = true;
  }

  function renderImportPreview(rows) {
    importPreviewRows = rows;
    const validCount = rows.filter((r) => r.valid).length;
    const invalidCount = rows.length - validCount;
    const summary = document.getElementById('catalogo-import-summary');
    if (summary) {
      summary.innerHTML = `Se detectaron <strong>${rows.length}</strong> filas: ` +
        `<strong>${validCount}</strong> válidas` +
        (invalidCount ? `, <strong>${invalidCount}</strong> con errores (no se importarán).` : '.');
    }

    const tbody = document.getElementById('catalogo-import-tbody');
    if (tbody) {
      tbody.innerHTML = rows.slice(0, 100).map((r) => `
        <tr class="${r.valid ? '' : 'row-invalid'}">
          <td>${escapeHtml(r.nom || '—')}</td>
          <td>${escapeHtml(r.cod || '—')}</td>
          <td>${r.valid ? escapeHtml(formatoPesos(r.pvp)) : escapeHtml(String(r.pvp || '—'))}</td>
          <td>${escapeHtml(r.unidad)}</td>
          <td>${escapeHtml(r.marca || '—')}</td>
          <td>${escapeHtml(r.categoria)}</td>
          <td>${r.valid ? '✓ OK' : escapeHtml(r.errors)}</td>
        </tr>
      `).join('') + (rows.length > 100 ? `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:10px;">… y ${rows.length - 100} filas más</td></tr>` : '');
    }

    const canImport = validCount > 0;
    document.getElementById('btn-catalogo-import-add').disabled = !canImport;
    document.getElementById('btn-catalogo-import-replace').disabled = !canImport;
    openImportModal();
  }

  async function handleImportFile(file) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    try {
      let rawRows = [];
      if (ext === 'csv') {
        const text = await file.text();
        rawRows = parseCSVText(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        rawRows = parseExcelArrayBuffer(buffer);
      } else {
        alert(window.ArpaI18n.t('alert.catalogo.formato_no_soportado'));
        return;
      }

      const preview = buildImportPreview(rawRows);
      if (!preview.length) {
        alert(window.ArpaI18n.t('alert.catalogo.sin_productos_encontrados'));
        return;
      }
      renderImportPreview(preview);
    } catch (e) {
      alert(window.ArpaI18n.t('alert.catalogo.error_leer_archivo', { detail: e.message || window.ArpaI18n.t('alert.catalogo.formato_invalido') }));
    }
  }

  function applyImport(mode) {
    const validRows = importPreviewRows.filter((r) => r.valid);
    if (!validRows.length) return;

    const oid = normalizeOficioId(currentOficioId);
    const categories = getCategories(oid).slice();
    const imported = rowsToProducts(validRows, categories, oid);
    saveCategories(categories, oid);

    let products;
    let skipped = 0;

    if (mode === 'replace') {
      if (!confirm(window.ArpaI18n.t('confirm.catalogo.reemplazar', { count: validRows.length }))) return;
      products = imported;
    } else {
      if (!confirm(window.ArpaI18n.t('confirm.catalogo.agregar', { count: validRows.length }))) return;
      const existing = getProducts(oid);
      const codes = new Set(existing.map((p) => p.cod.toLowerCase()));
      products = existing.slice();
      imported.forEach((p) => {
        if (codes.has(p.cod.toLowerCase())) {
          skipped++;
        } else {
          products.push(p);
          codes.add(p.cod.toLowerCase());
        }
      });
    }

    saveProducts(products, oid);
    closeImportModal();
    render();

    let msg = mode === 'replace'
      ? window.ArpaI18n.t('alert.catalogo.reemplazado', { count: imported.length })
      : window.ArpaI18n.t('alert.catalogo.agregados', { count: imported.length - skipped });
    if (skipped) msg += ' ' + window.ArpaI18n.t('alert.catalogo.omitidos', { count: skipped });
    alert(msg);
  }

  function triggerImportPicker() {
    const input = document.getElementById('catalogo-import-file');
    if (!input) return;
    input.value = '';
    input.click();
  }

  function initMiCatalogo() {
    document.getElementById('catalogo-buscar')?.addEventListener('input', (e) => {
      searchByOficio.automatismos = e.target.value;
      currentOficioId = 'automatismos';
      renderProductGroups('automatismos');
    });
    document.getElementById('catalogo-section-automatismos')?.addEventListener('focusin', () => {
      currentOficioId = 'automatismos';
    });
    document.getElementById('btn-catalogo-fab')?.addEventListener('click', onFabClick);
    document.getElementById('btn-catalogo-form-save')?.addEventListener('click', saveProductForm);
    document.getElementById('btn-catalogo-form-cancel')?.addEventListener('click', closeProductForm);
    document.getElementById('catalogo-form-close')?.addEventListener('click', closeProductForm);
    document.getElementById('catalogo-form-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'catalogo-form-modal') closeProductForm();
    });
    document.getElementById('btn-catalogo-cat-save')?.addEventListener('click', saveCategoryForm);
    document.getElementById('btn-catalogo-cat-cancel')?.addEventListener('click', closeCategoryForm);
    document.getElementById('catalogo-cat-close')?.addEventListener('click', closeCategoryForm);
    document.getElementById('catalogo-cat-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'catalogo-cat-modal') closeCategoryForm();
    });
    document.getElementById('btn-catalogo-import')?.addEventListener('click', () => {
      currentOficioId = 'automatismos';
      triggerImportPicker();
    });
    document.getElementById('catalogo-import-file')?.addEventListener('change', (e) => {
      handleImportFile(e.target.files?.[0]);
    });
    document.getElementById('btn-catalogo-import-cancel')?.addEventListener('click', closeImportModal);
    document.getElementById('catalogo-import-close')?.addEventListener('click', closeImportModal);
    document.getElementById('catalogo-import-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'catalogo-import-modal') closeImportModal();
    });
    document.getElementById('btn-catalogo-import-add')?.addEventListener('click', () => applyImport('add'));
    document.getElementById('btn-catalogo-import-replace')?.addEventListener('click', () => applyImport('replace'));
    render();
  }

  global.ArpaMiCatalogo = {
    STORAGE_KEY,
    CATEGORIES_KEY,
    MIGRATION_FLAG_KEY,
    catalogProductsKey,
    catalogCategoriesKey,
    getActiveOficioId,
    getProducts,
    getCategories,
    saveProducts,
    saveCategories,
    hasProducts,
    hasCategories,
    getListaFlat,
    findByCod,
    render,
    refreshView,
    setFabVisible,
    initMiCatalogo
  };
})(window);
