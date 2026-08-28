import { parseTechnicianNote } from './ai/parser.js';
import { buildAssistance } from './ai/recommend.js';
import { draftQuoteFromAssistance } from './quote.js';
import { planFollowups } from './followup.js';
import { newId, createFollowup } from './store.js';

function pushUnique(list, text, extra) {
  const value = String(text || '').trim();
  const key = value.toLowerCase();
  if (!key) return list;
  if (list.some((x) => String(x.text || '').trim().toLowerCase() === key)) return list;
  return [...list, { id: newId('it'), text: value, source: extra.source || 'parser', ...extra }];
}

export function usedPartsFromWork(parsed) {
  const mentioned = parsed?.partsMentioned || [];
  const work = (parsed?.workDone || []).map((w) => w.text).join(' ');
  if (!/cambio de|reemplaz|instal/i.test(work)) return [];
  return mentioned.filter((p) => new RegExp(p.name, 'i').test(work));
}

export function applyNoteToService(job, text, catalogProducts) {
  const parsed = parseTechnicianNote(text);
  const assistance = buildAssistance(parsed);
  let findings = [...(job.findings || [])];
  let workDone = [...(job.workDone || [])];
  let recommendations = [...(job.recommendations || [])];

  for (const f of parsed.findings) {
    findings = pushUnique(findings, f.text, { severity: f.severity, source: 'parser' });
  }
  for (const w of parsed.workDone) {
    workDone = pushUnique(workDone, w.text, { source: 'parser' });
  }
  for (const r of assistance.recommendations) {
    recommendations = pushUnique(recommendations, r.text, { source: r.source || 'engine' });
  }

  const parts = [...(job.parts || [])];
  for (const item of usedPartsFromWork(parsed)) {
    const cat = assistance.quoteItems.find((q) => q.partId === item.id);
    if (parts.some((p) => p.partId === item.id || p.name === item.name)) continue;
    parts.push({
      id: newId('pt'),
      partId: item.id,
      name: cat?.name || item.name,
      qty: 1,
      unitPrice: cat?.unitPrice || 0,
      source: 'parser',
    });
  }

  const quote = draftQuoteFromAssistance(assistance, { catalogProducts });
  return {
    job: {
      ...job,
      findings,
      workDone,
      recommendations,
      parts,
      equipmentStatus: assistance.status,
      quote: quote.status === 'empty' ? job.quote || quote : quote,
      captureText: parsed.transcript || job.captureText || '',
      transcripts: [
        ...(job.transcripts || []),
        { id: newId('tr'), text: parsed.transcript, at: new Date().toISOString() },
      ],
    },
    parsed,
    assistance,
  };
}

function assistanceFromJob(job) {
  return buildAssistance({
    findings: job.findings,
    recommendations: job.recommendations,
    partsMentioned: (job.parts || []).map((p) => ({ id: p.partId, name: p.name })),
    status: job.equipmentStatus,
    transcript: (job.transcripts || []).map((t) => t.text).join(' '),
  });
}

/**
 * Cierra un servicio y crea seguimientos. No toca APIs externas.
 */
export async function closeService(store, job, options = {}) {
  if (!job) return { job: null, followups: [], skipped: true };
  if (job.status === 'closed') return { job, followups: [], skipped: true };

  const assistance = assistanceFromJob(job);
  const existing = (await store.getAll('followups')).filter((f) => f.serviceId === job.id);
  const created = [];
  if (!existing.length) {
    const planned = planFollowups({
      followUpTypes: assistance.followUpTypes,
      recommendations: job.recommendations,
      quoteHasItems: (job.quote?.items || []).length > 0,
      serviceType: job.type,
      now: options.now,
    });
    const selected = options.selectedFollowUpTypes;
    const toCreate = Array.isArray(selected)
      ? planned.filter((p) => selected.includes(p.type))
      : planned;
    for (const plan of toCreate) {
      const row = createFollowup({
        ...plan,
        clientId: job.clientId,
        equipmentId: job.equipmentId,
        serviceId: job.id,
      });
      await store.put('followups', row);
      created.push(row);
    }
  }

  const closed = {
    ...job,
    status: 'closed',
    closedAt: options.closedAt || new Date().toISOString(),
    notes: options.notes != null ? options.notes : job.notes,
  };
  await store.put('services', closed);
  return { job: closed, followups: created, skipped: false };
}
