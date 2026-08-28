import { buildAssistance } from './ai/recommend.js';
import { getChecklist, QUICK_CHIPS, PART_CHIPS, equipmentTypeLabel } from './ai/knowledge.js';
import { quoteFromService, readLegacyCatalogProducts } from './quote.js';
import { applyNoteToService, closeService } from './flow.js';
import { planFollowups, isOverdue, followUpLabel, filterFollowups, serviceTypeFromFollowup } from './followup.js';
import {
  openStore, newId, createClient, createEquipment, createService, createFollowup,
  equipmentHistory, buildIntelligentBrief, assembleClientView, assembleEquipmentView,
} from './store.js';
import { importLegacyData, readCompanySettings } from './legacy.js';
import { createVoiceCapture } from './voice.js';
import { compressImage } from './photos.js';
import { bindSignaturePad, clearSignature, restoreSignature, mergeSignatures, isSignedDataUrl } from './signature.js';
import { shareOrDownload, shareMessage, whatsAppMessage, openWhatsApp } from './share.js';
import { buildReportModel, buildQuoteModel, renderReportHtml, openReportWindow } from './report.js';
import { pdfFileFromModel } from './pdf.js';
import { bindClicks, val } from './ui.js';
import * as S from './screens.js';

let store;
let company = { name: '', technician: '' };
let ui = {
  screen: 'home',
  jobId: null,
  step: 'tipo',
  search: '',
  showNewClient: false,
  showNewEq: false,
  newEqType: 'corrediza',
  buffer: '',
  interim: '',
  listening: false,
  voiceSupported: false,
  fuFilter: 'open',
  clientId: null,
  equipmentId: null,
};
let voice;
let root;
let saveTimer;

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}

function parseHash() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { screen: 'home' };
  if (parts[0] === 'clientes') return { screen: 'clients' };
  if (parts[0] === 'cliente' && parts[1]) return { screen: 'client-detail', clientId: parts[1] };
  if (parts[0] === 'equipo' && parts[1]) return { screen: 'equipment-detail', equipmentId: parts[1] };
  if (parts[0] === 'servicios') return { screen: 'services' };
  if (parts[0] === 'seguimiento') return { screen: 'followups' };
  if (parts[0] === 'servicio' && parts[1] === 'nuevo') return { screen: 'job', step: 'tipo', jobId: null };
  if (parts[0] === 'servicio' && parts[1]) {
    return { screen: 'job', jobId: parts[1], step: parts[2] || 'captura' };
  }
  return { screen: 'home' };
}

function go(hash) {
  location.hash = hash;
}

async function getJob() {
  if (!ui.jobId) return null;
  return store.get('services', ui.jobId);
}

async function saveJob(patch) {
  const job = await getJob();
  if (!job) return null;
  const next = { ...job, ...patch, updatedAt: new Date().toISOString() };
  await store.put('services', next);
  return next;
}

function clientNameOf(clients, id) {
  return clients.find((c) => c.id === id)?.name || '';
}

async function seedDemoIfNeeded() {
  const metaRows = await store.getAll('meta');
  let meta = metaRows.find((m) => m.id === 'app') || { id: 'app', serviceSeq: 0, seeded: false };
  if (meta.seeded) return;
  const existing = await store.getAll('clients');
  if (existing.length) {
    await store.put('meta', { ...meta, seeded: true });
    return;
  }
  const cli = createClient({
    name: 'Conjunto Los Almendros (demo LAB)',
    phone: '3005550100',
    city: 'Medellín',
    address: 'Calle 10 # 20-30',
  });
  await store.put('clients', cli);
  const eq = createEquipment({
    clientId: cli.id,
    type: 'corrediza',
    brand: 'Accessmatic',
    model: 'ARES 1500',
    serial: 'AM-1500-8841',
    location: 'Portón vehicular',
  });
  await store.put('equipment', eq);
  const past = createService({
    number: 'SV-2026-0001',
    clientId: cli.id,
    equipmentId: eq.id,
    type: 'mantenimiento',
    status: 'closed',
    technician: company.technician || 'Técnico LAB',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 160).toISOString(),
    closedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 160).toISOString(),
    findings: [{ text: 'Desgaste inicial del piñón', severity: 'medium', source: 'seed' }],
    workDone: [{ text: 'Lubricación de sistema', source: 'seed' }],
    parts: [{ id: 'pt_seed', name: 'Grasa de piñón', qty: 1, source: 'seed' }],
    recommendations: [{ text: 'Vigilar piñón en la próxima visita', source: 'seed' }],
    equipmentStatus: { code: 'operational_watch', label: 'Equipo operativo con observación' },
    checklist: getChecklist('mantenimiento').map((i) => ({ ...i, done: true })),
  });
  await store.put('services', past);
  await store.put('followups', createFollowup({
    clientId: cli.id,
    equipmentId: eq.id,
    serviceId: past.id,
    type: 'maintenance',
    label: 'Próximo mantenimiento',
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
    notes: 'Mantenimiento preventivo cada 6 meses.',
    status: 'open',
  }));
  meta.seeded = true;
  meta.serviceSeq = 1;
  await store.put('meta', meta);
}

function applyParseToJob(job, text) {
  return applyNoteToService(job, text, readLegacyCatalogProducts()).job;
}

async function startNewJob(type, technician, preset) {
  const number = await store.nextServiceNumber();
  const job = createService({
    number,
    type,
    technician,
    status: 'draft',
    checklist: getChecklist(type),
    clientId: preset?.clientId || '',
    equipmentId: preset?.equipmentId || '',
  });
  await store.put('services', job);
  ui.jobId = job.id;
  if (preset?.equipmentId) {
    await saveJob({ status: 'in_progress', startedAt: new Date().toISOString() });
    go('#/servicio/' + job.id + '/resumen');
    return;
  }
  if (preset?.clientId) {
    go('#/servicio/' + job.id + '/equipo');
    return;
  }
  go('#/servicio/' + job.id + '/cliente');
}

async function attachClient(clientId) {
  await saveJob({ clientId });
  go('#/servicio/' + ui.jobId + '/equipo');
}

async function attachEquipment(equipmentId) {
  await saveJob({ equipmentId, status: 'in_progress', startedAt: new Date().toISOString() });
  go('#/servicio/' + ui.jobId + '/resumen');
}

async function closeJob() {
  const job = await getJob();
  if (!job) return;
  const notes = val('close-notes');
  const checked = [...document.querySelectorAll('[data-fu]:checked')].map((el) => el.getAttribute('data-fu'));
  const result = await closeService(store, job, {
    notes,
    selectedFollowUpTypes: checked,
  });
  if (!result.job) return;
  toast(result.skipped ? 'Servicio ya estaba cerrado' : 'Servicio cerrado');
  go('#/servicio/' + result.job.id + '/listo');
}

async function openReport() {
  const job = await getJob();
  if (!job) return;
  const client = job.clientId ? await store.get('clients', job.clientId) : null;
  const equipment = job.equipmentId ? await store.get('equipment', job.equipmentId) : null;
  const model = buildReportModel(job, client, equipment, company);
  const ok = openReportWindow(renderReportHtml(model));
  if (!ok) toast('Permita ventanas emergentes para ver el informe');
}

function schedulePersistCapture() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushCaptureText();
  }, 400);
}

async function flushCaptureText() {
  const ta = document.getElementById('capture-text');
  const text = ta ? ta.value : ui.buffer;
  if (text == null) return '';
  ui.buffer = text;
  const job = await getJob();
  if (job && text !== (job.captureText || '')) {
    await saveJob({ captureText: text });
  }
  return text;
}

async function flushCaptureAndParse(options = {}) {
  const raw = await flushCaptureText();
  const text = String(raw || '').trim();
  if (!text) {
    if (options.toastOnEmpty) toast('Dicte o escriba algo primero');
    return false;
  }
  const job = await getJob();
  if (!job) return false;
  const patched = applyParseToJob(job, text);
  await saveJob(patched);
  if (options.toastOnOk) toast('Revise los datos organizados');
  return true;
}

async function runParseBuffer() {
  const ok = await flushCaptureAndParse({ toastOnEmpty: true, toastOnOk: true });
  if (ok) render();
}

function bindVoice() {
  voice = createVoiceCapture({
    lang: 'es-CO',
    onResult({ finalText, interim }) {
      ui.interim = interim;
      if (finalText) {
        const ta = document.getElementById('capture-text');
        const cur = ta ? ta.value : ui.buffer;
        const next = (cur ? cur.replace(/\s+$/, '') + (cur ? '. ' : '') : '') + finalText;
        ui.buffer = next;
        if (ta) ta.value = next;
      }
      const interimEl = document.querySelector('.interim');
      if (interimEl) interimEl.textContent = ui.interim;
      else render();
    },
    onError(err) {
      ui.listening = false;
      toast(err.message || 'No se pudo dictar');
      render();
    },
    onEnd() {
      ui.listening = false;
      flushCaptureAndParse({ toastOnOk: true }).finally(() => render());
    },
  });
  ui.voiceSupported = !!voice.supported;
}

async function render() {
  const route = parseHash();
  ui.screen = route.screen;
  if (route.clientId) ui.clientId = route.clientId;
  if (route.equipmentId) ui.equipmentId = route.equipmentId;
  if (route.screen === 'job' && route.jobId && route.jobId !== ui.jobId) {
    ui.buffer = '';
    ui.interim = '';
  }
  if (route.screen === 'job' && route.jobId) ui.jobId = route.jobId;
  if (route.screen === 'job' && !route.jobId) ui.jobId = null;
  if (route.step) ui.step = route.step;

  if (ui.screen === 'home') {
    const services = await store.getAll('services');
    const followups = await store.getAll('followups');
    const clients = await store.getAll('clients');
    const openService = services.find((s) => s.status === 'in_progress' || s.status === 'draft');
    const recent = services.filter((s) => s.status === 'closed').slice(0, 5).map((s) => ({
      ...s,
      clientName: clientNameOf(clients, s.clientId),
    }));
    const openFu = followups.filter((f) => f.status === 'open').slice(0, 5).map((f) => ({
      ...f,
      clientName: clientNameOf(clients, f.clientId),
    }));
    root.innerHTML = S.screenHome({
      companyName: company.name,
      openService,
      followups: openFu,
      recent,
    });
    return;
  }

  if (ui.screen === 'clients') {
    let clients = await store.getAll('clients');
    if (ui.search) {
      const q = ui.search.toLowerCase();
      clients = clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    root.innerHTML = S.screenClients({ clients, search: ui.search, showNew: ui.showNewClient });
    wireInputs();
    return;
  }

  if (ui.screen === 'client-detail') {
    const client = await store.get('clients', ui.clientId);
    if (!client) { go('#/clientes'); return; }
    const bags = {
      equipment: await store.getAll('equipment'),
      services: await store.getAll('services'),
      followups: await store.getAll('followups'),
    };
    const view = assembleClientView(client.id, bags);
    root.innerHTML = S.screenClientDetail({ client, ...view });
    return;
  }

  if (ui.screen === 'equipment-detail') {
    const equipment = await store.get('equipment', ui.equipmentId);
    if (!equipment) { go('#/clientes'); return; }
    const bags = {
      services: await store.getAll('services'),
      followups: await store.getAll('followups'),
    };
    const view = assembleEquipmentView(equipment.id, bags);
    const brief = buildIntelligentBrief(equipment, view.services);
    root.innerHTML = S.screenEquipmentDetail({
      equipment,
      brief,
      services: view.services,
      clientId: equipment.clientId,
    });
    return;
  }

  if (ui.screen === 'services') {
    const services = await store.getAll('services');
    const clients = await store.getAll('clients');
    root.innerHTML = S.screenServices({
      services: services.map((s) => ({ ...s, clientName: clientNameOf(clients, s.clientId) })),
    });
    return;
  }

  if (ui.screen === 'followups') {
    const followups = await store.getAll('followups');
    const clients = await store.getAll('clients');
    const filtered = filterFollowups(followups, ui.fuFilter);
    root.innerHTML = S.screenFollowups({
      filter: ui.fuFilter,
      followups: filtered.map((f) => ({
        ...f,
        clientName: clientNameOf(clients, f.clientId),
        overdue: isOverdue(f),
        label: f.label || followUpLabel(f.type),
      })),
    });
    return;
  }

  if (ui.screen === 'job' && (!ui.jobId || ui.step === 'tipo')) {
    root.innerHTML = S.screenJobType({ type: ui.jobType || 'mantenimiento', technician: company.technician });
    return;
  }

  const job = await getJob();
  if (!job) {
    go('#/');
    return;
  }

  const client = job.clientId ? await store.get('clients', job.clientId) : null;
  const equipment = job.equipmentId ? await store.get('equipment', job.equipmentId) : null;
  const equipLine = equipment
    ? [equipmentTypeLabel(equipment.type), equipment.brand, equipment.model, equipment.location].filter(Boolean).join(' · ')
    : '';

  if (ui.step === 'cliente') {
    const clients = await store.getAll('clients');
    root.innerHTML = S.screenPickClient({
      clients,
      search: ui.search,
      showNew: ui.showNewClient,
      clientId: job.clientId,
      jobId: job.id,
    });
    wireInputs();
    return;
  }

  if (ui.step === 'equipo') {
    const eqs = (await store.getAll('equipment')).filter((e) => e.clientId === job.clientId);
    root.innerHTML = S.screenPickEquipment({
      equipment: eqs,
      showNew: ui.showNewEq,
      newType: ui.newEqType,
      clientName: client?.name,
      jobId: job.id,
    });
    return;
  }

  if (ui.step === 'resumen') {
    const hist = equipment ? await equipmentHistory(store, equipment.id) : [];
    const brief = buildIntelligentBrief(equipment, hist);
    root.innerHTML = S.screenBrief({ brief, jobId: job.id, equipLine });
    return;
  }

  if (ui.step === 'captura') {
    if (!ui.buffer) ui.buffer = job.captureText || (job.transcripts || []).map((t) => t.text).join('. ') || '';
    root.innerHTML = S.screenCapture({
      service: job,
      jobId: job.id,
      equipLine,
      buffer: ui.buffer,
      interim: ui.interim,
      listening: ui.listening,
      voiceSupported: ui.voiceSupported,
    });
    wireCapture();
    return;
  }

  if (ui.step === 'repuestos') {
    root.innerHTML = S.screenParts({ service: job, jobId: job.id });
    wireReview();
    return;
  }

  if (ui.step === 'checklist') {
    root.innerHTML = S.screenChecklist({ service: job, jobId: job.id });
    return;
  }

  if (ui.step === 'revision') {
    root.innerHTML = S.screenReview({ service: job, jobId: job.id });
    wireReview();
    return;
  }

  if (ui.step === 'firma') {
    const sig = mergeSignatures(job.signatures, {
      client: { name: job.signatures?.client?.name || client?.name || '' },
      technician: { name: job.signatures?.technician?.name || job.technician || company.technician || '' },
    });
    root.innerHTML = S.screenSign({
      jobId: job.id,
      signatures: sig,
      clientName: client?.name || '',
      technician: job.technician || company.technician || '',
    });
    wireSign(job);
    return;
  }

  if (ui.step === 'informe') {
    const model = buildReportModel(job, client, equipment, company);
    root.innerHTML = S.screenReport({ model, jobId: job.id });
    return;
  }

  if (ui.step === 'cierre' && job.status === 'closed') {
    root.innerHTML = S.screenClosed({ service: job });
    return;
  }
  if (ui.step === 'listo') {
    root.innerHTML = S.screenClosed({ service: job });
    return;
  }

  if (ui.step === 'cierre') {
    const assistance = buildAssistance({
      findings: job.findings,
      recommendations: job.recommendations,
      partsMentioned: (job.parts || []).map((p) => ({ id: p.partId, name: p.name })),
      status: job.equipmentStatus,
      transcript: (job.transcripts || []).map((t) => t.text).join(' '),
    });
    let quote = quoteFromService(job, assistance, readLegacyCatalogProducts());
    const notesEl = document.getElementById('close-notes');
    const notes = notesEl ? notesEl.value : job.notes;
    const patch = {};
    if (JSON.stringify(quote.items) !== JSON.stringify(job.quote?.items || [])) patch.quote = quote;
    if (notes != null && notes !== (job.notes || '')) patch.notes = notes;
    if (Object.keys(patch).length) await saveJob(patch);
    const followPlans = planFollowups({
      followUpTypes: assistance.followUpTypes,
      recommendations: job.recommendations,
      quoteHasItems: (quote.items || []).length > 0,
      serviceType: job.type,
    }).map((p) => ({ ...p, checked: true }));
    root.innerHTML = S.screenQuote({ service: { ...job, quote, notes }, followPlans, jobId: job.id });
    wireQuote();
  }
}

function wireInputs() {
  const search = document.getElementById('client-search');
  search?.addEventListener('input', () => {
    ui.search = search.value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => render(), 180);
  });
}

function wireCapture() {
  const ta = document.getElementById('capture-text');
  ta?.addEventListener('input', () => {
    ui.buffer = ta.value;
    schedulePersistCapture();
  });
  root.querySelectorAll('input[type="file"][data-photo]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const img = await compressImage(file);
        const job = await getJob();
        const photos = [...(job.photos || [])];
        if (photos.length >= 8) {
          toast('Máximo 8 fotos por servicio');
          return;
        }
        photos.push({
          id: newId('ph'),
          kind: input.getAttribute('data-photo'),
          dataUrl: img.dataUrl,
          createdAt: new Date().toISOString(),
        });
        await saveJob({ photos });
        render();
      } catch (e) {
        toast('No se pudo guardar la foto');
      }
    });
  });
}

function wireReview() {
  root.querySelectorAll('[data-edit]').forEach((input) => {
    input.addEventListener('change', async () => {
      const kind = input.getAttribute('data-edit');
      const idx = Number(input.getAttribute('data-idx'));
      const job = await getJob();
      const key = kind === 'f' ? 'findings' : kind === 'w' ? 'workDone' : 'recommendations';
      const list = [...(job[key] || [])];
      if (!list[idx]) return;
      list[idx] = { ...list[idx], text: input.value, source: 'user' };
      await saveJob({ [key]: list });
    });
  });
  root.querySelectorAll('[data-part]').forEach((input) => {
    input.addEventListener('change', async () => {
      const field = input.getAttribute('data-part');
      const idx = Number(input.getAttribute('data-idx'));
      const job = await getJob();
      const parts = [...(job.parts || [])];
      if (!parts[idx]) return;
      parts[idx] = { ...parts[idx], [field]: field === 'qty' ? Number(input.value) || 1 : input.value };
      await saveJob({ parts });
    });
  });
}

function wireQuote() {
  const notes = document.getElementById('close-notes');
  notes?.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveJob({ notes: notes.value }), 400);
  });
  root.querySelectorAll('[data-q]').forEach((input) => {
    input.addEventListener('change', async () => {
      const field = input.getAttribute('data-q');
      const idx = Number(input.getAttribute('data-idx'));
      const job = await getJob();
      const items = [...(job.quote?.items || [])];
      if (!items[idx]) return;
      items[idx] = { ...items[idx], [field]: Number(input.value) || 0 };
      await saveJob({
        quote: { ...job.quote, items, status: 'draft' },
        notes: val('close-notes'),
      });
      render();
    });
  });
}

async function persistSignMeta() {
  const job = await getJob();
  if (!job) return;
  await saveJob({
    signatures: mergeSignatures(job.signatures, {
      client: {
        name: val('sig-client-name').trim(),
        doc: val('sig-client-doc').trim(),
      },
      technician: { name: val('sig-tech-name').trim() },
    }),
  });
}

function wireSign(job) {
  const clientCanvas = document.getElementById('sig-client');
  const techCanvas = document.getElementById('sig-tech');
  bindSignaturePad(clientCanvas, {
    onChange(dataUrl) {
      getJob().then((current) => {
        if (!current) return;
        return saveJob({ signatures: mergeSignatures(current.signatures, { client: { dataUrl } }) });
      });
    },
  });
  bindSignaturePad(techCanvas, {
    onChange(dataUrl) {
      getJob().then((current) => {
        if (!current) return;
        return saveJob({ signatures: mergeSignatures(current.signatures, { technician: { dataUrl } }) });
      });
    },
  });
  restoreSignature(clientCanvas, job.signatures?.client?.dataUrl);
  restoreSignature(techCanvas, job.signatures?.technician?.dataUrl);
  ['sig-client-name', 'sig-client-doc', 'sig-tech-name'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', persistSignMeta);
  });
}

async function shareCurrentDocument(kind, options = {}) {
  const job = await getJob();
  if (!job) return;
  const client = job.clientId ? await store.get('clients', job.clientId) : null;
  const equipment = job.equipmentId ? await store.get('equipment', job.equipmentId) : null;
  if (kind === 'report' && !isSignedDataUrl(job.signatures?.client?.dataUrl)) {
    toast('Falta la firma del cliente para compartir el informe');
    go('#/servicio/' + job.id + '/firma');
    return;
  }
  const model = kind === 'quote'
    ? buildQuoteModel(job, client, company)
    : buildReportModel(job, client, equipment, company);
  toast('Generando PDF…');
  let file;
  try {
    file = await pdfFileFromModel(kind, model);
  } catch (err) {
    console.warn('[arpa-next] pdf', err);
    toast('No se pudo generar el PDF');
    return;
  }
  const text = options.whatsapp
    ? whatsAppMessage(kind, job.number, client?.name, company.name)
    : shareMessage(kind, job.number, client?.name, company.name);
  const result = await shareOrDownload({
    file,
    title: file.name,
    text,
  });
  if (result === 'aborted') return;
  if (options.whatsapp) {
    openWhatsApp(client?.phone || '', text);
    toast('WhatsApp abierto. Adjunte el PDF si no se envió solo.');
    return;
  }
  if (result === 'shared') toast(kind === 'quote' ? 'Cotización lista para enviar' : 'Informe listo para enviar');
  else toast(kind === 'quote' ? 'Cotización PDF guardada' : 'Informe PDF guardado');
}

function actions() {
  return {
    'set-type': (el) => {
      ui.jobType = el.getAttribute('data-id');
      render();
    },
    'to-client': async () => {
      const technician = val('job-tecnico').trim();
      company.technician = technician || company.technician;
      await startNewJob(ui.jobType || 'mantenimiento', technician);
    },
    'toggle-new-client': () => {
      ui.showNewClient = !ui.showNewClient;
      render();
    },
    'create-client': async () => {
      const name = val('new-cli-name').trim();
      if (!name) {
        toast('El nombre es obligatorio');
        return;
      }
      const client = createClient({
        name,
        phone: val('new-cli-phone'),
        address: val('new-cli-addr'),
        city: val('new-cli-city'),
      });
      await store.put('clients', client);
      ui.showNewClient = false;
      await attachClient(client.id);
    },
    'pick-client': async (el) => attachClient(el.getAttribute('data-id')),
    'toggle-new-eq': () => {
      ui.showNewEq = !ui.showNewEq;
      render();
    },
    'eq-type': (el) => {
      ui.newEqType = el.getAttribute('data-id');
      render();
    },
    'create-eq': async () => {
      const job = await getJob();
      const eq = createEquipment({
        clientId: job.clientId,
        type: ui.newEqType || 'corrediza',
        brand: val('new-eq-brand'),
        model: val('new-eq-model'),
        serial: val('new-eq-serial'),
        location: val('new-eq-loc'),
      });
      await store.put('equipment', eq);
      ui.showNewEq = false;
      await attachEquipment(eq.id);
    },
    'pick-eq': async (el) => attachEquipment(el.getAttribute('data-id')),
    'start-capture': () => go('#/servicio/' + ui.jobId + '/captura'),
    'toggle-voice': () => {
      if (!voice?.supported) {
        toast('Use Chrome o Safari para dictar');
        return;
      }
      if (ui.listening) {
        voice.stop();
        return;
      }
      ui.listening = true;
      voice.start();
      render();
    },
    'parse-text': () => runParseBuffer(),
    'chip': async (el) => {
      const chip = QUICK_CHIPS.find((c) => c.id === el.getAttribute('data-id'));
      if (!chip) return;
      const ta = document.getElementById('capture-text');
      const cur = ta?.value || ui.buffer || '';
      const next = (cur ? cur.replace(/\s+$/, '') + ' ' : '') + chip.insert;
      ui.buffer = next;
      if (ta) ta.value = next;
      await runParseBuffer();
    },
    'to-parts': async () => {
      await flushCaptureAndParse({ toastOnOk: false });
      go('#/servicio/' + ui.jobId + '/repuestos');
    },
    'to-checklist': () => go('#/servicio/' + ui.jobId + '/checklist'),
    'toggle-check': async (el) => {
      const id = el.getAttribute('data-id');
      const job = await getJob();
      const checklist = (job.checklist || []).map((i) => i.id === id ? { ...i, done: !i.done } : i);
      await saveJob({ checklist });
      render();
    },
    'to-review': () => go('#/servicio/' + ui.jobId + '/revision'),
    'f-add': async () => {
      const job = await getJob();
      await saveJob({ findings: [...(job.findings || []), { id: newId('it'), text: '', source: 'user' }] });
      render();
    },
    'w-add': async () => {
      const job = await getJob();
      await saveJob({ workDone: [...(job.workDone || []), { id: newId('it'), text: '', source: 'user' }] });
      render();
    },
    'r-add': async () => {
      const job = await getJob();
      await saveJob({ recommendations: [...(job.recommendations || []), { id: newId('it'), text: '', source: 'user' }] });
      render();
    },
    'p-add': async () => {
      const job = await getJob();
      await saveJob({ parts: [...(job.parts || []), { id: newId('pt'), name: '', qty: 1, source: 'user' }] });
      render();
    },
    'part-chip': async (el) => {
      const partId = el.getAttribute('data-id');
      const chip = PART_CHIPS.find((c) => c.id === partId);
      if (!chip) return;
      const job = await getJob();
      const parts = [...(job.parts || [])];
      if (parts.some((p) => p.partId === partId)) {
        toast('Ese repuesto ya está');
        return;
      }
      parts.push({ id: newId('pt'), partId, name: chip.name, qty: 1, source: 'user' });
      await saveJob({ parts });
      render();
    },
    'p-del': async (el) => {
      const idx = Number(el.getAttribute('data-idx'));
      const job = await getJob();
      await saveJob({ parts: (job.parts || []).filter((_, i) => i !== idx) });
      render();
    },
    'f-del': async (el) => {
      const idx = Number(el.getAttribute('data-idx'));
      const job = await getJob();
      await saveJob({ findings: (job.findings || []).filter((_, i) => i !== idx) });
      render();
    },
    'w-del': async (el) => {
      const idx = Number(el.getAttribute('data-idx'));
      const job = await getJob();
      await saveJob({ workDone: (job.workDone || []).filter((_, i) => i !== idx) });
      render();
    },
    'r-del': async (el) => {
      const idx = Number(el.getAttribute('data-idx'));
      const job = await getJob();
      await saveJob({ recommendations: (job.recommendations || []).filter((_, i) => i !== idx) });
      render();
    },
    'to-quote': () => go('#/servicio/' + ui.jobId + '/cierre'),
    'close-job': () => closeJob(),
    'open-report': () => go('#/servicio/' + ui.jobId + '/informe'),
    'to-report': async () => {
      await persistSignMeta();
      go('#/servicio/' + ui.jobId + '/informe');
    },
    'sig-clear': async (el) => {
      const who = el.getAttribute('data-id');
      const canvas = document.getElementById(who === 'tech' ? 'sig-tech' : 'sig-client');
      clearSignature(canvas);
      const job = await getJob();
      const patch = who === 'tech' ? { technician: { dataUrl: '' } } : { client: { dataUrl: '' } };
      await saveJob({ signatures: mergeSignatures(job.signatures, patch) });
    },
    'share-report': () => shareCurrentDocument('report'),
    'share-quote': () => shareCurrentDocument('quote'),
    'wa-report': () => shareCurrentDocument('report', { whatsapp: true }),
    'wa-quote': () => shareCurrentDocument('quote', { whatsapp: true }),
    'print-report': () => window.print(),
    'create-client-list': async () => {
      const name = val('new-cli-name').trim();
      if (!name) {
        toast('El nombre es obligatorio');
        return;
      }
      const client = createClient({
        name,
        phone: val('new-cli-phone'),
        address: val('new-cli-addr'),
        city: val('new-cli-city'),
      });
      await store.put('clients', client);
      ui.showNewClient = false;
      go('#/cliente/' + client.id);
    },
    'job-from-client': async (el) => {
      await startNewJob('mantenimiento', company.technician, { clientId: el.getAttribute('data-id') });
    },
    'job-from-eq': async (el) => {
      await startNewJob('mantenimiento', company.technician, {
        equipmentId: el.getAttribute('data-id'),
        clientId: el.getAttribute('data-client'),
      });
    },
    'fu-filter': (el) => {
      ui.fuFilter = el.getAttribute('data-id') || 'open';
      render();
    },
    'fu-done': async (el) => {
      const id = el.getAttribute('data-id');
      const row = await store.get('followups', id);
      if (!row) return;
      await store.put('followups', { ...row, status: 'done' });
      render();
    },
    'fu-cancel': async (el) => {
      const id = el.getAttribute('data-id');
      const row = await store.get('followups', id);
      if (!row) return;
      await store.put('followups', { ...row, status: 'cancelled' });
      render();
    },
    'fu-start': async (el) => {
      const id = el.getAttribute('data-id');
      const row = await store.get('followups', id);
      if (!row?.clientId) {
        toast('Este seguimiento no tiene cliente');
        return;
      }
      await startNewJob(serviceTypeFromFollowup(row.type), company.technician, {
        clientId: row.clientId,
        equipmentId: row.equipmentId,
      });
    },
  };
}

export async function boot() {
  root = document.getElementById('app');
  root.innerHTML = S.screenBoot('Preparando ARPASuite NEXT…');
  store = await openStore();
  company = readCompanySettings();
  if (!company.name) company.name = 'ARPASuite LAB';
  bindVoice();
  await importLegacyData(store);
  await seedDemoIfNeeded();
  bindClicks(root, actions());
  window.addEventListener('hashchange', async () => {
    ui.search = '';
    ui.showNewClient = false;
    ui.showNewEq = false;
    await flushCaptureText();
    render();
  });
  await render();
}

boot().catch((err) => {
  console.error(err);
  const app = document.getElementById('app');
  if (app) app.innerHTML = '<main class="sheet"><p>No se pudo iniciar NEXT. Recargue la página.</p></main>';
});
