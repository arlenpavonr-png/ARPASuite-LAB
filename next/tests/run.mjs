import { parseTechnicianNote } from '../js/ai/parser.js';
import { buildAssistance } from '../js/ai/recommend.js';
import { getChecklist, serviceTypeLabel } from '../js/ai/knowledge.js';
import { quoteTotals, draftQuoteFromAssistance, money, mergeQuoteWithEdits } from '../js/quote.js';
import { planFollowups, isOverdue, addDays, filterFollowups, serviceTypeFromFollowup } from '../js/followup.js';
import { createMemoryStore, createClient, createEquipment, createService, buildIntelligentBrief, assembleClientView } from '../js/store.js';
import { applyNoteToService, usedPartsFromWork } from '../js/flow.js';
import { buildReportModel, buildQuoteModel, renderReportHtml, renderQuoteHtml } from '../js/report.js';
import { imageDataHasInk, isSignedDataUrl, mergeSignatures } from '../js/signature.js';
import { sanitizeFilenamePart, documentFilename, htmlDocumentToFile, shareMessage, buildWaMeUrl, whatsAppMessage } from '../js/share.js';
import { renderReportPdf, renderQuotePdf, isPdfMagic } from '../js/pdf.js';
import { createRequire } from 'module';
import { buildBackup, backupToFile, backupFilename, parseBackup, restoreBackup, backupStatus } from '../js/backup.js';

const EXAMPLE = 'Encontré desgaste avanzado del piñón, ajusté la cremallera, lubriqué el sistema y recomiendo cambiar el piñón.';

let failed = 0;
let passed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log('  ok  ' + msg);
  } else {
    failed += 1;
    console.error('  FAIL  ' + msg);
  }
}

function section(name) {
  console.log('\n' + name);
}

section('Parser — caso del técnico');
const parsed = parseTechnicianNote(EXAMPLE);
assert(parsed.findings.length === 1, 'un hallazgo');
assert(/pi[nñ][oó]n/i.test(parsed.findings[0].text), 'hallazgo menciona piñón');
assert(parsed.findings[0].severity === 'high', 'desgaste avanzado = severidad alta');
assert(parsed.workDone.length === 2, 'dos trabajos');
assert(parsed.workDone.some((w) => /ajuste/i.test(w.text)), 'trabajo de ajuste');
assert(parsed.workDone.some((w) => /lubric/i.test(w.text)), 'trabajo de lubricación');
assert(parsed.recommendations.some((r) => /pi[nñ]/i.test(r.text)), 'recomendación de piñón');
assert(parsed.status.code === 'operational_repair', 'estado: operativo con reparación');
assert(parsed.partsMentioned.some((p) => p.id === 'pinon'), 'detecta pieza piñón');
assert(parsed.partsMentioned.some((p) => p.id === 'cremallera'), 'detecta pieza cremallera');

section('Parser — vacíos y estado');
assert(parseTechnicianNote('').findings.length === 0, 'texto vacío no inventa hallazgos');
assert(parseTechnicianNote('El equipo queda operativo.').status.code === 'operational', 'queda operativo');
assert(parseTechnicianNote('El motor está fuera de servicio.').status.code === 'out_of_service', 'fuera de servicio');

section('Motor de recomendaciones y cotización');
const assist = buildAssistance(parsed);
assert(assist.quoteItems.some((i) => i.partId === 'pinon'), 'cotiza piñón');
assert(assist.followUpTypes.includes('repair') || assist.followUpTypes.includes('quote'), 'sugiere seguimiento');
const quote = draftQuoteFromAssistance(assist);
assert(quote.items.length >= 1, 'borrador tiene ítems');
assert(quoteTotals(quote.items).total > 0, 'total sugerido > 0');
assert(money(1200).includes('1'), 'formato de dinero');

section('Flujo applyNoteToService');
const job0 = createService({ type: 'mantenimiento', status: 'in_progress' });
const applied = applyNoteToService(job0, EXAMPLE, []);
assert(applied.job.findings.length >= 1, 'servicio recibe hallazgos');
assert(applied.job.workDone.length >= 2, 'servicio recibe trabajo');
assert(applied.job.quote.items.length >= 1, 'servicio recibe cotización');
const again = applyNoteToService(applied.job, EXAMPLE, []);
assert(again.job.findings.length === applied.job.findings.length, 'reparsear no duplica hallazgos');
assert((applied.job.parts || []).length === 0, 'recomendar piñón no lo marca como usado');
const changed = applyNoteToService(createService({ type: 'reparacion' }), 'Cambié el control remoto y lubriqué el sistema.', []);
assert((changed.job.parts || []).some((p) => p.partId === 'control' || /control/i.test(p.name)), 'cambio de control registra repuesto usado');
assert(usedPartsFromWork(changed.parsed).some((p) => p.id === 'control'), 'usedPartsFromWork detecta control');

section('Checklist y etiquetas');
assert(getChecklist('mantenimiento').length >= 8, 'checklist de mantenimiento completo');
assert(getChecklist('instalacion').some((i) => /fotocelda/i.test(i.label)), 'instalación incluye fotoceldas');
assert(serviceTypeLabel('reparacion') === 'Reparación', 'etiqueta reparación');

section('Seguimiento');
const plans = planFollowups({
  followUpTypes: ['repair', 'maintenance'],
  recommendations: [{ text: 'Cambio de piñón' }],
  quoteHasItems: true,
  serviceType: 'mantenimiento',
  now: '2026-08-28T12:00:00.000Z',
});
assert(plans.some((p) => p.type === 'maintenance'), 'plan de mantenimiento');
assert(plans.some((p) => p.type === 'quote'), 'plan de cotización por ítems');
assert(addDays('2026-08-28', 7) === '2026-09-04', 'addDays 7');
assert(isOverdue({ status: 'open', dueDate: '2026-08-01' }, '2026-08-28'), 'vencido');
assert(!isOverdue({ status: 'done', dueDate: '2026-08-01' }, '2026-08-28'), 'hecho no está vencido');
assert(serviceTypeFromFollowup('repair') === 'reparacion', 'seguimiento reparación abre servicio de reparación');
assert(filterFollowups([{ status: 'open' }, { status: 'done' }], 'open').length === 1, 'filtro abiertos');
const merged = mergeQuoteWithEdits(
  { items: [{ partId: 'pinon', name: 'Piñón', unitPrice: 10, labor: 5, qty: 1 }] },
  { items: [{ partId: 'pinon', name: 'Piñón', unitPrice: 99, labor: 5, qty: 1 }] }
);
assert(merged.items[0].unitPrice === 99, 'cotización conserva precio editado');

section('Store en memoria');
const store = createMemoryStore();
const cli = createClient({ name: 'Acme', phone: '300' });
await store.put('clients', cli);
const eq = createEquipment({ clientId: cli.id, type: 'corrediza', model: 'ARES 1500' });
await store.put('equipment', eq);
const n1 = await store.nextServiceNumber();
const n2 = await store.nextServiceNumber();
assert(n1 !== n2, 'números de servicio únicos');
assert((await store.get('clients', cli.id)).name === 'Acme', 'lee cliente');
const closed = createService({
  clientId: cli.id,
  equipmentId: eq.id,
  status: 'closed',
  findings: [{ text: 'Ruido en motor' }],
  workDone: [{ text: 'Ajuste de fines de carrera' }],
  parts: [{ name: 'Fin de carrera', qty: 1 }],
  recommendations: [{ text: 'Cambiar capacitor' }],
  closedAt: '2026-01-10T00:00:00.000Z',
});
await store.put('services', closed);
const brief = buildIntelligentBrief(eq, await store.getAll('services'));
assert(brief.lastService, 'brief tiene último servicio');
assert(brief.findings[0].text.includes('Ruido'), 'brief muestra falla anterior');
assert(brief.pendingRecommendations.length === 1, 'brief muestra recomendación pendiente');
const clientView = assembleClientView(cli.id, {
  equipment: [eq],
  services: [closed],
  followups: [{ clientId: cli.id, status: 'open' }],
});
assert(clientView.equipment.length === 1, 'vista cliente lista equipos');
assert(clientView.services.length === 1, 'vista cliente lista historial');

section('Informe');
const model = buildReportModel(applied.job, cli, eq, { name: 'Demo Co' });
assert(model.findings.length >= 1, 'informe incluye hallazgos');
assert(model.companyName === 'Demo Co', 'informe usa marca');
assert(model.workDone.length >= 1, 'informe incluye trabajo');
assert(Array.isArray(model.parts), 'informe incluye sección de repuestos');

section('Firmas y envío local');
const blank = new Uint8ClampedArray(32);
assert(!imageDataHasInk(blank), 'canvas vacío no cuenta como firma');
blank[3] = 200;
assert(imageDataHasInk(blank), 'píxel con alfa es tinta');
assert(!isSignedDataUrl(''), 'data URL vacía no es firma');
assert(isSignedDataUrl('data:image/png;base64,' + 'A'.repeat(900)), 'data URL de imagen es firma');
const sigMerged = mergeSignatures(null, { client: { name: 'Juan', dataUrl: 'data:image/png;base64,' + 'B'.repeat(900) } });
assert(sigMerged.client.name === 'Juan', 'fusiona nombre de firma');
const signedJob = {
  ...applied.job,
  number: 'SV-TEST',
  signatures: sigMerged,
};
const signedHtml = renderReportHtml(buildReportModel(signedJob, cli, eq, { name: 'Demo Co' }));
assert(/Firma del cliente/.test(signedHtml), 'informe HTML incluye firma');
assert(/Aceptación/.test(signedHtml), 'informe HTML tiene bloque de aceptación');
const qHtml = renderQuoteHtml(buildQuoteModel({
  number: 'SV-TEST',
  technician: 'Ana',
  quote: { items: [{ name: 'Piñón', qty: 1, unitPrice: 1000, labor: 500 }] },
}, cli, { name: 'Demo Co' }));
assert(/COTIZACIÓN BORRADOR/.test(qHtml), 'HTML de cotización');
assert(/Piñón/.test(qHtml), 'cotización lista el ítem');
assert(documentFilename('report', 'SV-1', 'Acme Steel') === 'Informe_SV-1_Acme_Steel.pdf', 'nombre de archivo informe PDF');
assert(documentFilename('quote', 'SV-1', 'Acme') === 'Cotizacion_SV-1_Acme.pdf', 'nombre de archivo cotización PDF');
assert(sanitizeFilenamePart('A/B') === 'AB', 'sanitiza nombre');
const file = htmlDocumentToFile('<html>ok</html>', 'Informe_x.html');
assert(file.name === 'Informe_x.html', 'File HTML local sigue disponible');
assert(!/wa\.me|script.google/i.test(shareMessage('report', 'SV-1', 'Acme', 'Demo')), 'mensaje de ficha local sin wa.me');
const wa = buildWaMeUrl('3005550100', 'Hola cliente');
assert(wa.startsWith('https://wa.me/573005550100?text='), 'wa.me con indicativo 57');
assert(decodeURIComponent(wa.split('text=')[1]).includes('Hola cliente'), 'mensaje en wa.me');
assert(buildWaMeUrl('', 'x').startsWith('https://wa.me/?text='), 'wa.me sin teléfono abre selector');
assert(/Adjunte el PDF/.test(whatsAppMessage('report', 'SV-9', 'Acme', 'Demo')), 'WhatsApp pide adjuntar PDF');
assert(!/script.google|graph.facebook|api.whatsapp.com/i.test(whatsAppMessage('quote', 'SV-1', 'Acme', 'Demo')), 'WhatsApp solo wa.me, sin APIs');

const { jsPDF } = createRequire(import.meta.url)('../../js/jspdf.umd.min.js');
const photoModel = buildReportModel({
  ...signedJob,
  photos: [{ kind: 'before', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }],
  quote: { items: [{ name: 'Piñón', qty: 1, unitPrice: 1000, labor: 500 }] },
}, cli, eq, { name: 'Demo Co' });
const reportPdf = renderReportPdf(photoModel, jsPDF);
const reportBytes = new Uint8Array(await reportPdf.blob.arrayBuffer());
assert(isPdfMagic(reportBytes), 'informe es PDF real (%PDF)');
assert(/Informe_/.test(reportPdf.filename) && /\.pdf$/.test(reportPdf.filename), 'archivo informe .pdf');
const quotePdf = renderQuotePdf(buildQuoteModel({
  number: 'SV-TEST',
  technician: 'Ana',
  quote: { items: [{ name: 'Piñón', qty: 1, unitPrice: 1000, labor: 500 }] },
}, cli, { name: 'Demo Co' }), jsPDF);
const quoteBytes = new Uint8Array(await quotePdf.blob.arrayBuffer());
assert(isPdfMagic(quoteBytes), 'cotización es PDF real (%PDF)');
assert(quoteBytes.length > 400, 'PDF de cotización no está vacío');

section('Copia de seguridad');
{
  const src = createMemoryStore();
  const bc = createClient({ name: 'Cliente Copia', phone: '3000000000' });
  await src.put('clients', bc);
  const be = createEquipment({ clientId: bc.id, type: 'corrediza', brand: 'BFT' });
  await src.put('equipment', be);
  const bs = createService({
    number: 'SV-2026-0007', clientId: bc.id, equipmentId: be.id, status: 'closed',
    closedAt: '2026-10-08T15:00:00.000Z',
    findings: [{ id: 'f1', text: 'Desgaste de piñón' }],
    photos: [{ id: 'ph1', kind: 'antes', dataUrl: 'data:image/jpeg;base64,/9j/AAAA' }],
    signatures: { client: { name: 'Pedro', doc: '', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }, technician: { name: 'Arlen', dataUrl: '' } },
  });
  await src.put('services', bs);
  await src.nextServiceNumber();
  const backup = await buildBackup(src, new Date('2026-10-08T16:00:00Z'));
  assert(backup.format === 'arpa-next-copia' && backup.version === 1, 'copia con formato y versión');
  assert(backup.data.services[0].photos[0].dataUrl.startsWith('data:image'), 'copia incluye fotos');
  assert(backup.data.services[0].signatures.client.dataUrl.startsWith('data:image'), 'copia incluye firmas');
  assert(/^ARPA-NEXT-copia-2026-10-08\.txt$/.test(backupFilename(new Date(2026, 9, 8))), 'nombre de archivo de copia (.txt para poder compartir)');
  const file = backupToFile(backup);
  const parsed = parseBackup(await file.text());
  assert(parsed.data.clients.length === 1, 'archivo de copia se vuelve a leer');

  let err = '';
  try { parseBackup('{"hola":1}'); } catch (e) { err = e.message; }
  assert(/no es una copia/.test(err), 'archivo ajeno se rechaza con mensaje claro');
  err = '';
  try { parseBackup('no es json'); } catch (e) { err = e.message; }
  assert(/no es una copia/.test(err), 'texto inválido se rechaza');

  const dst = createMemoryStore();
  const r1 = await restoreBackup(dst, parsed);
  assert(r1.added === 3, 'restaurar en celular nuevo trae cliente, equipo y servicio');
  const restored = await dst.get('services', bs.id);
  assert(restored?.photos?.length === 1 && restored.findings[0].text === 'Desgaste de piñón', 'servicio restaurado completo');
  const seqNext = await dst.nextServiceNumber();
  assert(seqNext === 'SV-' + new Date().getFullYear() + '-0002', 'numeración sigue después de la copia (' + seqNext + ')');

  await dst.put('clients', { ...(await dst.get('clients', bc.id)), phone: '3111111111' });
  const r2 = await restoreBackup(dst, parsed);
  assert(r2.added === 0 && (await dst.get('clients', bc.id)).phone === '3111111111', 'restaurar no pisa cambios más nuevos');
  const r3 = await restoreBackup(dst, parsed);
  assert(r3.added === 0, 'restaurar dos veces no duplica');

  // Celular nuevo: NEXT ya importó el mismo cliente desde la suite, con otro id.
  const fresh = createMemoryStore();
  const imported = createClient({ name: 'cliente copia ', city: 'Medellín' });
  await fresh.put('clients', imported);
  const r4 = await restoreBackup(fresh, parsed);
  const freshClients = await fresh.getAll('clients');
  assert(freshClients.length === 1, 'restaurar no duplica el cliente importado de la suite');
  assert(freshClients[0].phone === '3000000000' && freshClients[0].city === 'Medellín', 'cliente unido conserva y completa sus datos');
  const freshSv = (await fresh.getAll('services'))[0];
  const freshEq = (await fresh.getAll('equipment'))[0];
  assert(freshSv.clientId === imported.id && freshEq.clientId === imported.id && freshSv.equipmentId === freshEq.id, 'servicio y equipo quedan ligados al cliente existente');
  assert(r4.added === 2, 'trae equipo y servicio (' + JSON.stringify(r4) + ')');

  const now = new Date('2026-10-20T12:00:00Z');
  const closedList = [{ status: 'closed', updatedAt: '2026-10-10T10:00:00Z' }];
  assert(backupStatus([], '', now).due === false, 'sin servicios no pide copia');
  assert(backupStatus(closedList, '', now).due === true, 'nunca hizo copia: la pide');
  assert(backupStatus(closedList, '2026-10-11T00:00:00Z', now).pending === 0, 'servicio ya copiado no queda pendiente');
  assert(backupStatus(closedList, '2026-10-09T00:00:00Z', now).due === true, 'copia vieja con servicio nuevo: la pide');
  assert(backupStatus([{ status: 'closed', source: 'classic', updatedAt: '2026-10-10' }], '', now).due === false, 'servicios importados de la suite no cuentan');
}

console.log('\n' + passed + ' ok, ' + failed + ' fallos');
if (failed) process.exit(1);
