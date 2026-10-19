"use strict";
// Palimpsest · search: a moment ("1453", "20 July 1969"), things already in Palimpsest, or anything on Wikipedia.
// Picking a Wikipedia result reads its date and place from Wikidata, sets the timeline, flies there and opens its card.

const fold = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let searchSeq = 0, searchTimer = 0, searchItems = [], searchActive = -1;

function localMatches(q) {
  const f = fold(q), out = [];
  const add = (group, title, sub, run) => out.push({ group, title, sub, run });
  MILESTONES.filter(m => fold(m.t + " " + m.d).includes(f)).slice(0, 4).forEach(m => add("On the timeline", m.t, msDate(m), () => openMilestone(m)));
  THINKERS.filter(t => fold(t.n + " " + t.s).includes(f)).slice(0, 4).forEach(t => add("Thinkers", t.n, `${thinkerYears(t)} · ${t.s}`, () => { setYear(Math.round((t.b + t.d) / 2), { exact: true }); openThinker(t); }));
  TOURS.filter(t => fold(t.title + " " + t.sub).includes(f)).slice(0, 3).forEach(t => add("Journeys", t.title, t.sub, () => startTour(TOURS.indexOf(t))));
  MAPS.filter(m => fold(m.title + " " + m.sub).includes(f)).slice(0, 3).forEach(m => add("Old maps", m.title, rangeText(m), () => goToMap(m)));
  if (state.history) state.history.events.map((e, i) => [e, i]).filter(([e]) => fold(e.text).includes(f)).slice(0, 4)
    .forEach(([e, i]) => add(`Events in ${fmtLabel(state.history.year)}`, e.text.length > 90 ? e.text.slice(0, 88) + "…" : e.text, e.m && e.d ? dayLabel(state.history.year, e.m, e.d, false) : "", () => openEvent(state.history, i)));
  return out;
}

async function wikiMatches(q) {
  const r = await wikiApi({ action: "query", generator: "search", gsrsearch: q, gsrlimit: 7, gsrnamespace: 0,
    prop: "description|pageprops|pageimages", ppprop: "wikibase_item|disambiguation", piprop: "thumbnail", pithumbsize: 80 }).catch(() => null);
  const pages = (r && r.query && r.query.pages || []).filter(p => !(p.pageprops && "disambiguation" in p.pageprops)).sort((a, b) => a.index - b.index);
  return pages.map(p => ({ group: "Wikipedia", title: p.title, sub: p.description || "", thumb: p.thumbnail && p.thumbnail.source,
    run: () => openFromWikipedia(p.title, p.pageprops && p.pageprops.wikibase_item, p.description || "") }));
}

// Wikidata dates look like "+1914-06-28T00:00:00Z" with a precision (11 = day, 10 = month, 9 = year, lower = coarser)
function wdTime(claims, prop) {
  const c = claims[prop] && claims[prop].find(x => x.mainsnak && x.mainsnak.datavalue);
  if (!c) return null;
  const v = c.mainsnak.datavalue.value, m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
  if (!m) return null;
  return { year: (m[1] === "-" ? -1 : 1) * +m[2], m: +m[3], d: +m[4], precision: v.precision };
}
function wdCoord(claims) {
  const c = claims.P625 && claims.P625.find(x => x.mainsnak && x.mainsnak.datavalue);
  return c ? [c.mainsnak.datavalue.value.longitude, c.mainsnak.datavalue.value.latitude] : null;
}
async function wdClaims(qid) {
  const r = await fetch("https://www.wikidata.org/w/api.php?" + new URLSearchParams({ action: "wbgetentities", ids: qid, props: "claims", format: "json", origin: "*" })).then(r => r.json()).catch(() => null);
  return (r && r.entities && r.entities[qid] && r.entities[qid].claims) || {};
}
async function openFromWikipedia(title, qid, description) {
  stopPlay();
  $("searchInput").blur();
  const claims = qid ? await wdClaims(qid) : {};
  // When: an event's date, else when it began, was founded or published; for a person, the middle of their life
  let when = wdTime(claims, "P585") || wdTime(claims, "P580") || wdTime(claims, "P571") || wdTime(claims, "P577") || wdTime(claims, "P1619");
  const born = wdTime(claims, "P569"), died = wdTime(claims, "P570");
  if (!when && born) when = { year: died ? Math.round((born.year + died.year) / 2) : Math.min(TODAY, born.year + 35), precision: 9 };
  // Where: the article's own coordinates, else (for people) where they were born
  let at = wdCoord(claims);
  if (!at) {
    const r = await wikiApi({ action: "query", prop: "coordinates", titles: title, redirects: 1 }).catch(() => null);
    const pg = r && r.query && r.query.pages && r.query.pages[0];
    if (pg && pg.coordinates) at = [pg.coordinates[0].lon, pg.coordinates[0].lat];
  }
  if (!at && claims.P19) {
    const bp = claims.P19[0] && claims.P19[0].mainsnak.datavalue && claims.P19[0].mainsnak.datavalue.value.id;
    if (bp) at = wdCoord(await wdClaims(bp));
  }
  if (when && isFinite(when.year)) goToMoment(Math.max(BIG_BANG, Math.min(TODAY, when.year)), when.precision >= 11 ? when.m : 0, when.precision >= 11 ? when.d : 0);
  if (at) {
    const wide = /\b(country|continent|ocean|empire|region|sea|desert|mountain range|state of)\b/i.test(description);
    map.flyTo({ center: at, zoom: wide ? 4 : 6.5, pitch: 0, duration: 2600, essential: true });
  }
  $("pYear").textContent = [when ? (when.precision >= 11 ? `${dayLabel(when.year, when.m, when.d)} ` : "") + fmtLabel(when.year) : "", description].filter(Boolean).join(" · ");
  $("pName").textContent = title;
  $("pSub").innerHTML = "";
  const w = document.createElement("span"); w.className = "where";
  w.textContent = at ? (born && !wdCoord(claims) ? "📍 Birthplace" : "📍 On the map") : "No location on the map";
  $("pSub").appendChild(w);
  $("place").hidden = false;
  state.selected = { kind: "search result", name: title, text: `${title}${description ? ` (${description})` : ""}` };
  fillSummary(title, false, [title]);
}

/* ---------- The box and its results ---------- */
function renderResults(items, loading) {
  const box = $("searchResults");
  searchItems = items; searchActive = items.length ? 0 : -1;
  box.innerHTML = "";
  let group = null;
  items.forEach((it, i) => {
    if (it.group !== group) { group = it.group; const h = document.createElement("div"); h.className = "sr-group"; h.textContent = group; box.appendChild(h); }
    const b = document.createElement("button");
    b.type = "button"; b.className = "sr-item" + (i === 0 ? " on" : ""); b.dataset.i = i; b.setAttribute("role", "option");
    b.innerHTML = (it.thumb ? `<img alt="" src="${it.thumb}">` : `<i class="sr-dot sr-${it.kind || "x"}"></i>`) + `<span><span class="t"></span><span class="s"></span></span>`;
    b.querySelector(".t").textContent = it.title;
    b.querySelector(".s").textContent = it.sub;
    b.addEventListener("mousedown", e => { e.preventDefault(); chooseResult(i); });
    box.appendChild(b);
  });
  if (loading) box.insertAdjacentHTML("beforeend", '<div class="sr-loading">Searching Wikipedia…</div>');
  if (!items.length && !loading) box.innerHTML = '<div class="sr-loading">Nothing found. Try a year, a name or an event.</div>';
  box.hidden = false;
}
function chooseResult(i) {
  const it = searchItems[i]; if (!it) return;
  $("searchResults").hidden = true;
  $("searchInput").value = it.title;
  it.run();
}
function runSearch(q) {
  q = q.trim();
  clearTimeout(searchTimer);
  if (!q) { $("searchResults").hidden = true; return; }
  const items = [];
  const moment = parseMoment(q);
  if (moment && isFinite(moment.year)) {
    const label = (moment.m && moment.d ? `${moment.d} ${MONTHS[moment.m - 1]} ` : "") + fmtLabel(Math.max(BIG_BANG, Math.min(TODAY, moment.year)));
    items.push({ group: "Go to", title: label, sub: eraOf(moment.year), kind: "time", run: () => goToMoment(moment.year, moment.m, moment.d) });
  }
  items.push(...localMatches(q).map(x => ({ ...x, kind: "local" })));
  renderResults(items, q.length >= 2);
  if (q.length < 2) return;
  const seq = ++searchSeq;
  searchTimer = setTimeout(async () => {
    const wiki = await wikiMatches(q);
    if (seq !== searchSeq) return;
    renderResults(items.concat(wiki), false);
  }, 250);
}
$("searchInput").addEventListener("input", e => runSearch(e.target.value));
$("searchInput").addEventListener("focus", e => { if (e.target.value.trim()) runSearch(e.target.value); });
$("searchInput").addEventListener("blur", () => setTimeout(() => $("searchResults").hidden = true, 150));
$("searchInput").addEventListener("keydown", e => {
  const n = searchItems.length;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault(); if (!n) return;
    searchActive = (searchActive + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
    document.querySelectorAll(".sr-item").forEach(b => b.classList.toggle("on", +b.dataset.i === searchActive));
    const on = document.querySelector(".sr-item.on"); if (on) on.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") { e.preventDefault(); if (searchActive >= 0) chooseResult(searchActive); }
  else if (e.key === "Escape") { e.target.value = ""; $("searchResults").hidden = true; e.target.blur(); }
  e.stopPropagation();
});
// "/" or ⌘K / Ctrl-K jumps to the search box
document.addEventListener("keydown", e => {
  if (e.target.matches("input:not([type=range]), textarea, select")) return;
  if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); $("drawer").classList.remove("closed"); $("searchInput").focus(); $("searchInput").select(); }
});
