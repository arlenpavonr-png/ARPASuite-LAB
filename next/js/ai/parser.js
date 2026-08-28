/**
 * Parser de notas de campo (voz o texto) → datos estructurados.
 * Sin APIs externas. Pensado para técnicos de automatización en español.
 */

const CONNECTORS = /\s*(?:,|;|\.\s+|\n+| y (?:también )?| además | luego | después )\s*/i;

const FINDING_CUES = [
  /encontr[eé]/i,
  /se observa/i,
  /presenta/i,
  /hay\b/i,
  /desgaste/i,
  /roto|rota|rotura/i,
  /fisura|grieta/i,
  /holgura/i,
  /ruido/i,
  /falla|fallando/i,
  /no abre|no cierra|no opera|no funciona/i,
  /oxid/i,
  /suelto|suelta/i,
  /desalinead/i,
  /flojo|floja/i,
  /quemad/i,
  /gastad/i,
  /juego excesivo/i,
  /golpead/i,
  /sucio|sucia|suciedad/i,
];

const WORK_CUES = [
  /ajust[eé]/i,
  /lubric[eé]|lubriqu[eé]|engrase|engras[eé]/i,
  /cambi[eé]|reemplaz[eé]/i,
  /revis[eé]|inspeccion[eé]/i,
  /apret[eé]|tensor/i,
  /aline[eé]|nivel[eé]/i,
  /sold[eé]/i,
  /limpi[eé]/i,
  /program[eé]|configur[eé]/i,
  /calibr[eé]/i,
  /instal[eé]/i,
  /prob[eé]|verifiqu[eé]/i,
  /liber[eé]/i,
  /soldadura/i,
  /realic[eé]/i,
];

const REC_CUES = [
  /recomiend/i,
  /se recomienda/i,
  /hay que\b/i,
  /conviene/i,
  /suger/i,
  /debe(?:ría)?\s+cambi/i,
  /urgente/i,
  /cotizar/i,
  /pendiente\s+cambi/i,
  /programar\s+cambio/i,
];

const STATUS_RULES = [
  { code: 'out_of_service', re: /fuera de servicio|no opera|inoperativ|no funciona el (?:equipo|motor|sistema)/i, label: 'Equipo fuera de servicio' },
  { code: 'operational_repair', re: /operativ\w* con|funciona(?:ndo)? con observación|queda pendiente/i, label: 'Equipo operativo con reparación recomendada' },
  { code: 'operational', re: /operativ|funcionando|en servicio|queda ok|queda bien|ciclo (?:ok|bien)/i, label: 'Equipo operativo' },
];

const PARTS = [
  { id: 'pinon', re: /pi[nñ][oó]n(?:es)?/i, name: 'Piñón' },
  { id: 'cremallera', re: /cremallera/i, name: 'Cremallera' },
  { id: 'fotocelda', re: /fotocelda|fotocélula|foto celda/i, name: 'Fotocelda' },
  { id: 'control', re: /control(?:es)?(?: remoto)?|transmisor/i, name: 'Control remoto' },
  { id: 'motor', re: /\bmotor(?:es)?\b/i, name: 'Motor' },
  { id: 'tarjeta', re: /tarjeta|placa|electr[oó]nica/i, name: 'Tarjeta electrónica' },
  { id: 'bateria', re: /bater[ií]a/i, name: 'Batería de respaldo' },
  { id: 'sensor', re: /sensor(?:es)?/i, name: 'Sensor' },
  { id: 'fin_carrera', re: /fin(?:es)? de carrera|limit switch/i, name: 'Fin de carrera' },
  { id: 'rueda', re: /rueda|rodamiento|rodillo/i, name: 'Rueda / rodamiento' },
  { id: 'electrocerradura', re: /electro.?cerradura|chapa el[eé]ctrica/i, name: 'Electrocerradura' },
  { id: 'lampara', re: /l[aá]mpara|luz de cortes[ií]a/i, name: 'Lámpara' },
  { id: 'guia', re: /gu[ií]a(?:s)?/i, name: 'Guía' },
  { id: 'brazo', re: /brazo(?:s)?/i, name: 'Brazo' },
  { id: 'condensador', re: /condensador|capacitor/i, name: 'Condensador' },
];

function splitClauses(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  return raw
    .split(CONNECTORS)
    .map((c) => c.replace(/^[\s\-–—]+|[\s\.]+$/g, '').trim())
    .filter((c) => c.length > 2);
}

function cueScore(text, cues) {
  let n = 0;
  for (const re of cues) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function classifyClause(clause) {
  const rec = cueScore(clause, REC_CUES);
  const work = cueScore(clause, WORK_CUES);
  const find = cueScore(clause, FINDING_CUES);
  if (rec > 0 && rec >= work) return 'recommendation';
  if (work > 0 && work >= find) return 'work';
  if (find > 0) return 'finding';
  if (/cambio|cambiar|reemplazo/i.test(clause) && rec === 0 && work === 0) {
    return 'recommendation';
  }
  return 'unknown';
}

function capitalize(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function tidyClause(clause, kind) {
  let s = String(clause || '').trim();
  s = s.replace(/^(encontr[eé]|encontramos|se observa(?:ron)?|observ[eé])\s+/i, '');
  s = s.replace(/^(y\s+)?(?:tambi[eé]n\s+)?/i, '');
  if (kind === 'work') {
    s = s.replace(/^ajust[eé]\s+(?:la |el |los |las )?/i, 'Ajuste de ');
    s = s.replace(/^lubric[eé]\s+(?:el |la |los |las )?/i, 'Lubricación de ');
    s = s.replace(/^lubriqu[eé]\s+(?:el |la |los |las )?/i, 'Lubricación de ');
    s = s.replace(/^engras[eé]\s+(?:el |la |los |las )?/i, 'Engrase de ');
    s = s.replace(/^apret[eé]\s+(?:la |el |los |las )?/i, 'Apriete de ');
    s = s.replace(/^aline[eé]\s+(?:la |el |los |las )?/i, 'Alineación de ');
    s = s.replace(/^limpi[eé]\s+(?:la |el |los |las )?/i, 'Limpieza de ');
    s = s.replace(/^prob[eé]\s+(?:el |la |los |las )?/i, 'Prueba de ');
    s = s.replace(/^revis[eé]\s+(?:la |el |los |las )?/i, 'Revisión de ');
    s = s.replace(/^cambi[eé]\s+(?:el |la |los |las )?/i, 'Cambio de ');
  }
  if (kind === 'recommendation') {
    s = s.replace(/^recomiend\w*\s+/i, '');
    s = s.replace(/^se recomienda\s+/i, '');
    s = s.replace(/^cambiar\s+(?:el |la |los |las )?/i, 'Cambio de ');
    s = s.replace(/^hay que\s+cambi(?:ar)?\s+(?:el |la )?/i, 'Cambio de ');
  }
  return capitalize(s);
}

function extractParts(text) {
  const found = [];
  const seen = new Set();
  for (const part of PARTS) {
    if (part.re.test(text) && !seen.has(part.id)) {
      seen.add(part.id);
      found.push({ id: part.id, name: part.name });
    }
  }
  return found;
}

function inferSeverity(text) {
  const t = String(text || '').toLowerCase();
  if (/avanzad|crític|critic|urgente|grave|fuera de servicio|no opera|roto/.test(t)) return 'high';
  if (/moderad|desgaste|holgura|ruido|desaline/.test(t)) return 'medium';
  return 'low';
}

function inferStatus(text, findings, recommendations) {
  for (const rule of STATUS_RULES) {
    if (rule.re.test(text)) return { code: rule.code, label: rule.label };
  }
  const severe = findings.some((f) => f.severity === 'high');
  const hasRec = recommendations.length > 0;
  if (severe && /fuera|no opera|no funciona/.test(String(text).toLowerCase())) {
    return { code: 'out_of_service', label: 'Equipo fuera de servicio' };
  }
  if (hasRec || severe) {
    return { code: 'operational_repair', label: 'Equipo operativo con reparación recomendada' };
  }
  if (findings.length === 0) {
    return { code: 'operational', label: 'Equipo operativo' };
  }
  return { code: 'operational_watch', label: 'Equipo operativo con observación' };
}

/**
 * @param {string} text
 * @returns {{
 *  transcript: string,
 *  findings: {text: string, severity: string, source: string}[],
 *  workDone: {text: string, source: string}[],
 *  recommendations: {text: string, source: string}[],
 *  partsMentioned: {id: string, name: string}[],
 *  status: {code: string, label: string},
 *  unmatched: string[],
 *  confidence: number
 * }}
 */
export function parseTechnicianNote(text) {
  const transcript = String(text || '').trim();
  const clauses = splitClauses(transcript);
  const findings = [];
  const workDone = [];
  const recommendations = [];
  const unmatched = [];

  for (const clause of clauses) {
    const kind = classifyClause(clause);
    const tidy = tidyClause(clause, kind);
    if (!tidy) continue;
    if (kind === 'finding') {
      findings.push({ text: tidy, severity: inferSeverity(clause), source: 'parser' });
    } else if (kind === 'work') {
      workDone.push({ text: tidy, source: 'parser' });
    } else if (kind === 'recommendation') {
      recommendations.push({ text: tidy, source: 'parser' });
    } else {
      unmatched.push(tidy);
    }
  }

  const partsMentioned = extractParts(transcript);
  const classified = findings.length + workDone.length + recommendations.length;
  const confidence = clauses.length === 0
    ? 0
    : Math.min(1, classified / clauses.length);

  return {
    transcript,
    findings,
    workDone,
    recommendations,
    partsMentioned,
    status: inferStatus(transcript, findings, recommendations),
    unmatched,
    confidence,
  };
}

export const PARSER_PARTS = PARTS;
export { inferSeverity, extractParts };
