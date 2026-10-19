"use strict";
// Palimpsest · fine-tuning time: type an exact moment, or scrub a zoomable ruler around the current one

/* ---------- Typing a moment ---------- */
const MONTH_INDEX = {};
MONTHS.forEach((m, i) => { MONTH_INDEX[m.toLowerCase()] = i + 1; MONTH_INDEX[m.slice(0, 3).toLowerCase()] = i + 1; });
MONTH_INDEX.sept = 9;

// Understands "1453", "323 BC", "AD 79", "-500", "66 million years ago", "4.5 bn", "12k years ago",
// "20 July 1969", "July 20, 1969", "1969-07-20" and "today". Returns { year, m, d } or null.
function parseMoment(text) {
  const s = text.trim().toLowerCase().replace(/(\d),(\d{3})/g, "$1$2").replace(/,/g, " ").replace(/\s+/g, " ").replace(/\./g, (c, i, str) => /\d\.\d/.test(str.slice(i - 1, i + 2)) ? "." : "");
  let m;
  if (/^(today|now|present)$/.test(s)) return { year: TODAY };
  if (/^(the )?big bang$/.test(s)) return { year: BIG_BANG };
  if ((m = s.match(/^(\d+(?:\.\d+)?) ?(billion|bn|b|bya|ga)\b/))) return { year: -parseFloat(m[1]) * 1e9 };
  if ((m = s.match(/^(\d+(?:\.\d+)?) ?(million|mn|m|mya|ma|myr)\b/))) return { year: -parseFloat(m[1]) * 1e6 };
  if ((m = s.match(/^(\d+(?:\.\d+)?) ?(thousand|k)\b/))) return { year: -parseFloat(m[1]) * 1000 };
  if ((m = s.match(/^(\d+) ?(years ago|yrs ago|ya)$/))) { const n = +m[1]; return { year: n >= 10000 ? -n : TODAY - n }; }
  if ((m = s.match(/^(-?\d{1,4})-(\d{1,2})-(\d{1,2})$/))) return { year: +m[1], m: +m[2], d: +m[3] };
  const era = (n, tag) => tag && /^(bc|bce)$/.test(tag) ? -n : n;
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+) (\d{1,4})(?: (bc|bce|ad|ce))?$/)) && MONTH_INDEX[m[2]]) return { year: era(+m[3], m[4]), m: MONTH_INDEX[m[2]], d: +m[1] };
  if ((m = s.match(/^([a-z]+) (\d{1,2})(?:st|nd|rd|th)? (\d{1,4})(?: (bc|bce|ad|ce))?$/)) && MONTH_INDEX[m[1]]) return { year: era(+m[3], m[4]), m: MONTH_INDEX[m[1]], d: +m[2] };
  if ((m = s.match(/^([a-z]+) (\d{1,4})(?: (bc|bce|ad|ce))?$/)) && MONTH_INDEX[m[1]]) return { year: era(+m[2], m[3]) };
  if ((m = s.match(/^(\d+) ?(bc|bce|b c)$/))) return { year: -+m[1] };
  if ((m = s.match(/^(?:ad|ce) ?(\d+)$/)) || (m = s.match(/^(\d+) ?(?:ad|ce)$/))) return { year: +m[1] };
  if ((m = s.match(/^(-?\d+)$/))) return { year: +m[1] };
  return null;
}
function goToMoment(year, mo, d) {
  stopPlay();
  setYear(year, { exact: true });
  if (mo && d) {
    if (state.history && state.history.year === state.year && state.history.exact) selectDay(mo, d, true);
    else state.pendingDay = `${mo}-${d}`;
  }
}
function startYearEdit() {
  const yr = $("yr");
  if (yr.hidden) return;
  const input = document.createElement("input");
  input.type = "text"; input.className = "yr-input"; input.id = "yrInput";
  input.setAttribute("aria-label", "Type a year or a date");
  input.placeholder = "1453 · 323 BC · 66 million years ago · 20 July 1969";
  input.value = (state.day ? `${state.day.d} ${MONTHS[state.day.m - 1]} ` : "") + fmtLabel(state.year);
  const hint = document.createElement("div");
  hint.className = "yr-hint"; hint.textContent = "Type a year or a date, then press Return";
  yr.hidden = true;
  yr.after(input, hint);
  input.focus(); input.select();
  let done = false;
  const finish = commit => {
    if (done) return; done = true;
    if (commit) {
      const r = parseMoment(input.value);
      if (!r || !isFinite(r.year)) { done = false; hint.textContent = "Try a form like 1453, 323 BC, 66 million years ago or 20 July 1969"; hint.classList.add("bad"); input.focus(); return; }
      goToMoment(r.year, r.m, r.d);
    }
    input.remove(); hint.remove(); yr.hidden = false;
  };
  input.addEventListener("keydown", e => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); e.stopPropagation(); });
  input.addEventListener("blur", () => setTimeout(() => finish(false), 150));
}
$("yr").addEventListener("click", startYearEdit);
$("yr").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startYearEdit(); } });

/* ---------- The fine ruler ---------- */
const FINE_SPANS = [10, 50, 100, 500, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10];
let fineSpan = null, fineDragging = false, fineWindow = [0, 1];
function autoSpan(y) {
  if (y >= 1500) return 100; if (y >= 0) return 500; if (y >= -5000) return 1000;
  if (y >= -300000) return 1e5; if (y >= -1e8) return 1e7; if (y >= -1e9) return 1e8; return 1e9;
}
const currentSpan = () => fineSpan || autoSpan(state.year);
function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); return [1, 2, 5, 10].map(k => k * p).find(v => v >= x) || p * 10; }
function shortLabel(t) {
  if (t >= TODAY) return "Today";
  const a = Math.abs(t);
  if (a >= 1e9) return `${+(a / 1e9).toFixed(2)} bn`;
  if (a >= 1e6) return `${+(a / 1e6).toFixed(1)} m`;
  if (a >= 1e5) return `${Math.round(a / 1000)}k`;
  if (t < 0) return `${a.toLocaleString("en-US")} BC`;
  return String(t);
}
const spanLabel = s => s >= 1e9 ? `${s / 1e9} billion years` : s >= 1e6 ? `${s / 1e6} million years` : `${s.toLocaleString("en-US")} years`;
function updateFine() {
  const y = state.year, sp = currentSpan();
  let lo = y - sp / 2, hi = y + sp / 2;
  if (hi > TODAY) { lo -= hi - TODAY; hi = TODAY; }
  if (lo < BIG_BANG) { hi += BIG_BANG - lo; lo = BIG_BANG; }
  hi = Math.min(hi, TODAY);
  fineWindow = [lo, hi];
  const input = $("fine");
  input.min = 0; input.max = 1000; input.step = 1;
  input.value = Math.round((y - lo) / (hi - lo) * 1000);
  input.setAttribute("aria-valuetext", fmtLabel(y));
  const ticks = $("fineTicks");
  ticks.innerHTML = "";
  const step = niceStep(sp / 7);
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
    const s = document.createElement("span");
    s.style.left = ((t - lo) / (hi - lo) * 100) + "%";
    s.textContent = shortLabel(t === 0 ? 1 : t);
    ticks.appendChild(s);
  }
  $("fineHead").style.left = ((y - lo) / (hi - lo) * 100) + "%";
  $("fineSpan").textContent = spanLabel(sp);
  $("fineIn").disabled = sp <= FINE_SPANS[0];
  $("fineOut").disabled = sp >= FINE_SPANS[FINE_SPANS.length - 1];
}
function zoomFine(dir) {
  const sp = currentSpan();
  const i = FINE_SPANS.findIndex(v => v >= sp);
  fineSpan = FINE_SPANS[Math.max(0, Math.min(FINE_SPANS.length - 1, (i < 0 ? FINE_SPANS.length - 1 : i) + dir))];
  updateFine();
}
$("fine").addEventListener("input", e => {
  fineDragging = true;
  stopPlay();
  const [lo, hi] = fineWindow;
  const y = lo + (hi - lo) * (+e.target.value / 1000);
  setYear(y, { exact: currentSpan() <= 1e5, fromFine: true });
  $("fineHead").style.left = (+e.target.value / 10) + "%";
});
$("fine").addEventListener("change", () => { fineDragging = false; updateFine(); });
$("fineIn").addEventListener("click", () => zoomFine(-1));
$("fineOut").addEventListener("click", () => zoomFine(1));
$("fineAuto").addEventListener("click", () => { fineSpan = null; updateFine(); });
yearHooks.push((y, opts) => { if (!fineDragging && !opts.fromFine) updateFine(); });
updateFine();
