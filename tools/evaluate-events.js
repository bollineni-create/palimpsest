"use strict";
// Palimpsest · event-quality evaluator (a developer tool, not loaded by the app).
// Open the app, then in the browser console:  await import("./tools/evaluate-events.js")  — or load it with a <script> tag —
// and run  await evaluateEvents()  to parse a sample of Wikipedia year/century/millennium articles with the app's own parser
// and flag anything that doesn't read like a real event. Prints a summary and returns the full report.

const EVAL_SAMPLE = [
  "AD 1", "AD 33", "AD 79", "AD 117", "AD 200", "AD 250", "AD 313", "AD 380", "AD 410", "AD 455", "AD 476", "AD 527", "AD 570", "AD 600",
  "AD 620", "AD 632", "AD 680", "AD 711", "AD 750", "AD 800", "AD 850", "AD 900", "AD 950", "AD 987",
  "1000", "1054", "1066", "1099", "1150", "1204", "1215", "1250", "1279", "1300", "1347", "1400", "1453", "1492", "1517", "1550",
  "1600", "1648", "1700", "1750", "1776", "1789", "1815", "1848", "1865", "1900", "1914", "1929", "1945", "1969", "1989", "2001", "2020",
  "AD 1000", "500 BC", "323 BC", "221 BC", "44 BC", "5th century BC", "3rd century", "10th century", "2nd millennium BC", "6th millennium BC",
];
// Defects: an item that is not an event at all. Each test returns a reason, or nothing.
const EVAL_CHECKS = [
  t => /^[\^↑]/.test(t) && "footnote",
  t => (/\b(pp?)\.\s?\d/.test(t) || /\bISBN\b|\bdoi\b|Retrieved \d|Archived from|\bet al\.|\bVol\. \d/i.test(t)) && "citation",
  t => /^(main articles?|see also|further information|for (?:more|other|the))\b/i.test(t) && "navigation note",
  t => /^\S+ calendar\s+[\d–-]+/i.test(t) && "calendar row",
  t => /^[\p{L} .'’()-]{2,40}:\s*[\d.,\s%~≈-]+$/u.test(t) && "statistic row",
  t => !/[a-z]{3,}/.test(t) && "no words",
  t => /[:;,]\s*$/.test(t) && "fragment (ends with : ; or ,)",
  t => /^\(?\d{1,4}\)?\.?$/.test(t) && "just a number",
];
// Warnings: legitimate but worth a look (shown separately, not counted as defects)
const EVAL_WARNINGS = [
  t => t.length < 20 && "very short",
  t => t.length > 900 && "very long paragraph",
];
async function evaluateEvents(sample = EVAL_SAMPLE) {
  const report = [];
  for (const title of sample) {
    let parsed = null;
    try { parsed = await parseYearArticle(title); } catch (e) { report.push({ title, error: e.message }); continue; }
    if (!parsed) { report.push({ title, events: 0, flagged: [] }); continue; }
    const seen = new Set(), flagged = [];
    parsed.items.forEach(e => {
      const reasons = EVAL_CHECKS.map(c => c(e.text)).filter(Boolean);
      if (seen.has(e.text)) reasons.push("duplicate");
      seen.add(e.text);
      if (/^(births|deaths|references|sources|notes|citations|bibliography|other uses)$/i.test(e.group)) reasons.push(`inside "${e.group}"`);
      const warnings = EVAL_WARNINGS.map(c => c(e.text)).filter(Boolean);
      if (reasons.length || warnings.length) flagged.push({ text: e.text.slice(0, 140), group: e.group, reasons, warnings });
    });
    report.push({ title: parsed.title, events: parsed.items.length, flagged });
  }
  const total = report.reduce((n, r) => n + (r.events || 0), 0);
  const bad = report.reduce((n, r) => n + (r.flagged ? r.flagged.filter(f => f.reasons.length).length : 0), 0);
  const byReason = {}, byWarning = {};
  report.forEach(r => (r.flagged || []).forEach(f => { f.reasons.forEach(x => byReason[x] = (byReason[x] || 0) + 1); f.warnings.forEach(x => byWarning[x] = (byWarning[x] || 0) + 1); }));
  const summary = { pages: report.length, events: total, defects: bad, defectRate: total ? +(100 * bad / total).toFixed(2) + "%" : "0%", byReason, byWarning,
    empty: report.filter(r => !r.events).map(r => r.title) };
  console.table(byReason);
  return { summary, report };
}
window.evaluateEvents = evaluateEvents;
