/**
 * Pruebas por etapa del flujo local NEXT (sin DOM, sin red).
 */
import { getChecklist } from '../js/ai/knowledge.js';
import { applyNoteToService, closeService } from '../js/flow.js';
import { quoteFromService, mergeQuoteWithEdits, quoteTotals } from '../js/quote.js';
import { buildAssistance } from '../js/ai/recommend.js';
import {
  createMemoryStore, createClient, createEquipment, createService,
  buildIntelligentBrief, assembleClientView, cloneStore,
} from '../js/store.js';
import { mapClassicHistorial, mapServiceTypeFromClassic, importLegacyHistorial } from '../js/legacy.js';
import { buildReportModel, renderReportHtml, buildQuoteModel } from '../js/report.js';
import { filterFollowups } from '../js/followup.js';
import { mergeSignatures, isSignedDataUrl } from '../js/signature.js';
import { buildWaMeUrl } from '../js/share.js';
import { renderReportPdf, renderQuotePdf, isPdfMagic } from '../js/pdf.js';
import { createRequire } from 'module';

const NOTE = 'Encontré desgaste avanzado del piñón, ajusté la cremallera, lubriqué el sistema y recomiendo cambiar el piñón.';

let failed = 0;
let passed = 0;
function assert(cond, msg) {
  if (cond) { passed += 1; console.log('  ok  ' + msg); }
  else { failed += 1; console.error('  FAIL  ' + msg); }
}
function section(name) { console.log('\n' + name); }

const store = createMemoryStore();

section('1. Cliente');
const client = createClient({ name: 'Conjunto Norte', phone: '3001112222', city: 'Medellín', address: 'Cra 1 # 2-3' });
await store.put('clients', client);
assert((await store.get('clients', client.id)).name === 'Conjunto Norte', 'cliente persistido');

section('2. Equipo');
const equipment = createEquipment({
  clientId: client.id, type: 'corrediza', brand: 'Accessmatic', model: 'ARES 1500', serial: 'SN-1', location: 'Portón',
});
await store.put('equipment', equipment);
assert((await store.get('equipment', equipment.id)).model === 'ARES 1500', 'equipo persistido');

section('3. Servicio');
const number = await store.nextServiceNumber();
let job = createService({
  number, clientId: client.id, equipmentId: equipment.id, type: 'mantenimiento', status: 'in_progress',
  technician: 'Ana', checklist: getChecklist('mantenimiento'),
});
await store.put('services', job);
assert((await store.get('services', job.id)).status === 'in_progress', 'servicio en curso');

section('4. Historial inteligente');
const past = createService({
  number: 'SV-OLD', clientId: client.id, equipmentId: equipment.id, status: 'closed',
  findings: [{ text: 'Holgura en ruedas' }], workDone: [{ text: 'Ajuste de ruedas' }],
  parts: [{ name: 'Rueda', qty: 2 }], recommendations: [{ text: 'Cambiar guía' }],
  closedAt: '2026-01-01T00:00:00.000Z',
});
await store.put('services', past);
const brief = buildIntelligentBrief(equipment, await store.getAll('services'));
assert(brief.findings.some((f) => /holgura/i.test(f.text)), 'historial muestra falla anterior');
assert(brief.parts.some((p) => /rueda/i.test(p.name)), 'historial muestra repuesto anterior');

section('5. Voz/texto → hallazgos y trabajo');
job = await store.get('services', job.id);
const applied = applyNoteToService(job, NOTE, []);
job = applied.job;
await store.put('services', job);
assert(job.findings.length >= 1, 'hallazgos desde texto');
assert(job.workDone.length >= 2, 'trabajo desde texto');
assert(job.equipmentStatus.code === 'operational_repair', 'estado inferido');

section('6. Repuestos (usados vs cotización)');
assert((job.parts || []).length === 0, 'recomendar no registra usado');
job.parts = [{ id: 'pt1', partId: 'pinon', name: 'Piñón de ataque', qty: 1, source: 'user' }];
await store.put('services', job);

section('7. Checklist');
job = await store.get('services', job.id);
job.checklist = (job.checklist || []).map((i, idx) => idx < 3 ? { ...i, done: true } : i);
await store.put('services', job);
assert((await store.get('services', job.id)).checklist.filter((i) => i.done).length === 3, 'checklist persistido');

section('8. Revisión');
job = await store.get('services', job.id);
job.findings = job.findings.map((f, i) => i === 0 ? { ...f, text: 'Desgaste avanzado del piñón (confirmado)', source: 'user' } : f);
await store.put('services', job);
assert((await store.get('services', job.id)).findings[0].text.includes('confirmado'), 'edición de hallazgo persistida');

section('9. Cotización borrador');
const assistance = buildAssistance({
  findings: job.findings, recommendations: job.recommendations,
  partsMentioned: job.parts, status: job.equipmentStatus, transcript: job.captureText,
});
let quote = quoteFromService(job, assistance, []);
assert(quote.items.length >= 1, 'borrador tiene ítems');
assert(quoteTotals(quote.items).total > 0, 'total > 0');
quote = mergeQuoteWithEdits(quote, { items: quote.items.map((it) => it.partId === 'pinon' ? { ...it, unitPrice: 77000 } : it) });
job.quote = quote;
await store.put('services', job);
assert((await store.get('services', job.id)).quote.items.find((i) => i.partId === 'pinon').unitPrice === 77000, 'precio editado persiste');

section('10. Cierre y seguimientos');
const closed = await closeService(store, await store.get('services', job.id), {
  notes: 'Cliente avisado',
  selectedFollowUpTypes: ['repair', 'quote', 'maintenance'],
  now: '2026-08-28T12:00:00.000Z',
});
assert(closed.job.status === 'closed', 'servicio cerrado');
assert(closed.followups.length >= 1, 'seguimientos creados');
const again = await closeService(store, closed.job, { selectedFollowUpTypes: ['repair'] });
assert(again.skipped === true, 'segundo cierre no duplica');
assert((await store.getAll('followups')).filter((f) => f.serviceId === job.id).length === closed.followups.length, 'sin seguimientos duplicados');

section('11. Informe');
const model = buildReportModel(closed.job, client, equipment, { name: 'Taller LAB', technician: 'Ana' });
assert(model.findings[0].includes('confirmado'), 'informe usa hallazgo revisado');
assert(model.parts.some((p) => /piñón/i.test(p)), 'informe lista repuesto');
assert(model.quoteItems.length >= 1, 'informe incluye cotización');
assert(model.checklistDone.length === 3, 'informe incluye checklist hecho');
const html = renderReportHtml(model);
assert(/INFORME DE SERVICIO/.test(html), 'HTML de informe profesional');
assert(/77000|77.000/.test(html.replace(/\s/g, '')) || html.includes('77'), 'HTML muestra precio');

section('12. Persistencia (clonar almacén = recarga)');
const reloaded = createMemoryStore();
await cloneStore(store, reloaded);
const job2 = await reloaded.get('services', job.id);
assert(job2.status === 'closed', 'tras recarga el servicio sigue cerrado');
assert(job2.quote.items[0].unitPrice === 77000, 'tras recarga se conserva el precio');
assert((await reloaded.get('clients', client.id)).phone === '3001112222', 'tras recarga se conserva el cliente');
assert((await reloaded.getAll('followups')).length >= 1, 'tras recarga se conservan seguimientos');
const view = assembleClientView(client.id, {
  equipment: await reloaded.getAll('equipment'),
  services: await reloaded.getAll('services'),
  followups: await reloaded.getAll('followups'),
});
assert(view.services.filter((s) => s.status === 'closed').length >= 2, 'ficha cliente ve historial cerrado');
assert(filterFollowups(await reloaded.getAll('followups'), 'open').length >= 1, 'seguimientos abiertos tras recarga');

section('13. Reutilizar historial clásico (solo lectura)');
assert(mapServiceTypeFromClassic('Reparación') === 'reparacion', 'mapea tipo clásico');
const mapped = mapClassicHistorial([
  {
    id: 'h1', modulo: 'formato', cliente: 'Acme Steel', ciudad: 'Bello',
    subtipo: 'Mantenimiento', numero: 'AP-0042', concepto: 'Lubricación ARES',
    savedAt: '2026-02-01T00:00:00.000Z',
    fullSnapshot: {
      c1: true, 'sel-marca': 'Accessmatic', 'ref-manual': 'ARES 1500',
      'campo-tecnico-firma': 'Carlos Pérez',
    },
  },
  { id: 'c9', modulo: 'cotizacion', cliente: 'Acme Steel', concepto: 'No debe virar a servicio' },
]);
assert(mapped.equipment.length === 1 && mapped.equipment[0].type === 'corrediza', 'equipo inferido del formato');
assert(mapped.services.length === 1 && mapped.services[0].number === 'AP-0042', 'solo formatos viran a servicio');
assert(mapped.services[0].technician === 'Carlos Pérez', 'importa técnico del formato');
const classicStore = createMemoryStore();
const imported = await importLegacyHistorial(classicStore, [
  {
    id: 'h1', modulo: 'formato', cliente: 'Acme Steel', ciudad: 'Bello',
    subtipo: 'Mantenimiento', numero: 'AP-0042', concepto: 'Lubricación ARES',
    savedAt: '2026-02-01T00:00:00.000Z',
    fullSnapshot: { c1: true, 'sel-marca': 'Accessmatic', 'ref-manual': 'ARES 1500' },
  },
]);
assert(imported.servicesImported === 1, 'importa un servicio clásico a NEXT');
const second = await importLegacyHistorial(classicStore, [
  {
    id: 'h1', modulo: 'formato', cliente: 'Acme Steel', subtipo: 'Mantenimiento', numero: 'AP-0042',
    fullSnapshot: { c1: true, 'sel-marca': 'Accessmatic', 'ref-manual': 'ARES 1500' },
  },
]);
assert(second.servicesImported === 0, 'reimportar no duplica');

section('14. Firmas, PDF, WhatsApp y fotos');
const ink = 'data:image/png;base64,' + 'C'.repeat(900);
job2.signatures = mergeSignatures(job2.signatures, {
  client: { name: client.name, dataUrl: ink },
  technician: { name: 'Ana', dataUrl: ink },
});
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
job2.photos = [{ id: 'ph1', kind: 'before', dataUrl: tinyPng }];
await reloaded.put('services', job2);
const signed = await reloaded.get('services', job.id);
assert(isSignedDataUrl(signed.signatures.client.dataUrl), 'firma del cliente persistida');
assert(signed.photos[0].kind === 'before', 'foto recuperada del almacén');
const report2 = buildReportModel(signed, client, equipment, { name: 'Taller LAB' });
assert(report2.clientSignature === ink, 'informe reutiliza firma guardada');
assert(report2.findings[0].includes('confirmado'), 'informe no pide de nuevo los hallazgos');
assert(report2.photos.length === 1, 'informe incluye la foto capturada');
const { jsPDF } = createRequire(import.meta.url)('../../js/jspdf.umd.min.js');
const pdfOut = renderReportPdf(report2, jsPDF);
assert(isPdfMagic(new Uint8Array(await pdfOut.blob.arrayBuffer())), 'PDF de informe real');
assert(/\.pdf$/.test(pdfOut.filename), 'nombre PDF informe');
const qOut = renderQuotePdf(buildQuoteModel(signed, client, { name: 'Taller LAB' }), jsPDF);
assert(isPdfMagic(new Uint8Array(await qOut.blob.arrayBuffer())), 'PDF de cotización real');
assert(buildWaMeUrl(client.phone, 'hola').includes('wa.me/573001112222'), 'WhatsApp usa teléfono del cliente');

console.log('\nEtapas: ' + passed + ' ok, ' + failed + ' fallos');
if (failed) process.exit(1);
