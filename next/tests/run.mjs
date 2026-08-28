import { parseTechnicianNote } from '../js/ai/parser.js';
import { buildAssistance } from '../js/ai/recommend.js';
import { getChecklist, serviceTypeLabel } from '../js/ai/knowledge.js';
import { quoteTotals, draftQuoteFromAssistance, money } from '../js/quote.js';
import { planFollowups, isOverdue, addDays } from '../js/followup.js';
import { createMemoryStore, createClient, createEquipment, createService, buildIntelligentBrief } from '../js/store.js';
import { applyNoteToService } from '../js/flow.js';
import { buildReportModel } from '../js/report.js';

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

section('Informe');
const model = buildReportModel(applied.job, cli, eq, { name: 'Demo Co' });
assert(model.findings.length >= 1, 'informe incluye hallazgos');
assert(model.companyName === 'Demo Co', 'informe usa marca');
assert(model.workDone.length >= 1, 'informe incluye trabajo');

console.log('\n' + passed + ' ok, ' + failed + ' fallos');
if (failed) process.exit(1);
