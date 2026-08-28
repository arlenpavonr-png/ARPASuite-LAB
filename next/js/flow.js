import { parseTechnicianNote } from './ai/parser.js';
import { buildAssistance } from './ai/recommend.js';
import { draftQuoteFromAssistance } from './quote.js';
import { newId } from './store.js';

function pushUnique(list, text, extra) {
  const value = String(text || '').trim();
  const key = value.toLowerCase();
  if (!key) return list;
  if (list.some((x) => String(x.text || '').trim().toLowerCase() === key)) return list;
  return [...list, { id: newId('it'), text: value, source: extra.source || 'parser', ...extra }];
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
  for (const item of assistance.quoteItems) {
    if (parts.some((p) => p.partId === item.partId || p.name === item.name)) continue;
    parts.push({
      id: newId('pt'),
      partId: item.partId,
      name: item.name,
      qty: 1,
      unitPrice: item.unitPrice,
      source: 'engine',
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
      transcripts: [
        ...(job.transcripts || []),
        { id: newId('tr'), text: parsed.transcript, at: new Date().toISOString() },
      ],
    },
    parsed,
    assistance,
  };
}
