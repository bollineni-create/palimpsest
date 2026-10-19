"use strict";
// Palimpsest · search: a moment ("1453", "20 July 1969"), things already in Palimpsest, or anything on Wikipedia.
// Picking a Wikipedia result reads its date and place from Wikidata, sets the timeline, flies there and opens its card.

const fold = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let searchSeq = 0, searchTimer = 0, searchItems = [], searchActive = -1;

// Every word of the query must appear somewhere, in any order, ignoring case and accents
function matcher(q) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  return text => { const t = fold(text); return words.every(w => t.includes(w)); };
}
function localMatches(q) {
  const hit = matcher(q), out = [];
  const add = (group, title, sub, run) => out.push({ group, title, sub, run });
  MILESTONES.filter(m => hit(`${m.t} ${m.d} ${m.w}`)).forEach(m => add("On the timeline", m.t, msDate(m), () => openMilestone(m)));
  THINKERS.filter(t => hit(`${t.n} ${t.s} ${t.i} ${t.w}`)).forEach(t => add("Thinkers", t.n, `${thinkerYears(t)} · ${t.s}`, () => { setYear(Math.round((t.b + t.d) / 2), { exact: true }); openThinker(t); }));
  TOURS.filter(t => hit(`${t.title} ${t.sub} ${t.steps.map(x => x.text).join(" ")}`)).forEach(t => add("Journeys", t.title, t.sub, () => startTour(TOURS.indexOf(t))));
  MAPS.filter(m => hit(`${m.title} ${m.sub}`)).forEach(m => add("Old maps", m.title, rangeText(m), () => goToMap(m)));
  // Events from every year already looked at in this session, not just the one on screen
  const years = new Map();
  if (state.history) years.set(state.history.title, state.history);
  loadedHistories.forEach((d, title) => { if (!years.has(title)) years.set(title, d); });
  years.forEach(d => d.events.map((e, i) => [e, i]).filter(([e]) => hit(e.text)).forEach(([e, i]) =>
    add(`Events · ${d.title}`, e.text.length > 110 ? e.text.slice(0, 108) + "…" : e.text, e.m && e.d ? dayLabel(d.year || state.year, e.m, e.d, false) : "",
      () => { if (state.history !== d && d.year != null) { setYear(d.year, { exact: true }); state.history = d; } openEvent(d, i); })));
  return out;
}

async function wikiMatches(q, offset = 0) {
  const r = await wikiApi({ action: "query", generator: "search", gsrsearch: q, gsrlimit: 20, gsroffset: offset, gsrnamespace: 0,
    prop: "description|pageprops|pageimages", ppprop: "wikibase_item|disambiguation", piprop: "thumbnail", pithumbsize: 80 }).catch(() => null);
  const pages = (r && r.query && r.query.pages || []).filter(p => !(p.pageprops && "disambiguation" in p.pageprops)).sort((a, b) => a.index - b.index);
  const items = pages.map(p => ({ group: "Wikipedia", title: p.title, sub: p.description || "", thumb: p.thumbnail && p.thumbnail.source,
    run: () => openFromWikipedia(p.title, p.pageprops && p.pageprops.wikibase_item, p.description || "") }));
  const next = r && r.continue && r.continue.gsroffset;
  return { items, next };
}
async function spellingSuggestion(q) {
  const r = await wikiApi({ action: "query", list: "search", srsearch: q, srinfo: "suggestion", srlimit: 1 }).catch(() => null);
  return r && r.query && r.query.searchinfo && r.query.searchinfo.suggestion;
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
    map.flyTo({ center: at, zoom: wide ? 4 : 7, pitch: 0, duration: 2600, essential: true });
    setSearchPin(at, title);
  } else clearSearchPin();
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
  if (!loading && searchMore) {
    const more = document.createElement("button");
    more.type = "button"; more.className = "sr-more"; more.textContent = "Show more results from Wikipedia";
    more.addEventListener("mousedown", e => { e.preventDefault(); loadMoreResults(); });
    box.appendChild(more);
  }
  if (!items.length && !loading) box.innerHTML = '<div class="sr-loading">Nothing found. Try a year, a name or an event.</div>';
  box.hidden = false;
}
function chooseResult(i) {
  const it = searchItems[i]; if (!it) return;
  $("searchResults").hidden = true;
  $("searchInput").value = it.title;
  it.run();
}
let searchMore = null, searchBase = [], searchQuery = "";
async function loadMoreResults() {
  if (searchMore == null) return;
  const seq = searchSeq, { items, next } = await wikiMatches(searchQuery, searchMore);
  if (seq !== searchSeq) return;
  searchMore = next || null;
  const keep = searchActive;
  renderResults(searchItems.concat(items), false);
  searchActive = keep;
  $("searchInput").focus();
}
function runSearch(q) {
  q = q.trim();
  searchQuery = q; searchMore = null;
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
    let { items: wiki, next } = await wikiMatches(q);
    if (seq !== searchSeq) return;
    if (!wiki.length) {
      const suggestion = await spellingSuggestion(q);
      if (seq !== searchSeq) return;
      if (suggestion) {
        ({ items: wiki, next } = await wikiMatches(suggestion));
        wiki.forEach(w => w.group = `Wikipedia · showing results for “${suggestion}”`);
        searchQuery = suggestion;
      }
    }
    searchMore = next || null;
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

/* ---------- A pin on the place you searched for ---------- */
let searchPin = null;
function setSearchPin(at, label) {
  clearSearchPin();
  const el = document.createElement("div");
  el.className = "search-pin";
  el.innerHTML = '<span class="sp-label"></span><svg viewBox="0 0 24 34" width="30" height="42" aria-hidden="true"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 34 12 34s12-13.2 12-22.1C24 5.3 18.6 0 12 0z"/><circle cx="12" cy="12" r="4.6"/></svg>';
  el.querySelector(".sp-label").textContent = label;
  el.title = label;
  searchPin = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(at).addTo(map);
}
function clearSearchPin() { if (searchPin) { searchPin.remove(); searchPin = null; } }
$("closePlace").addEventListener("click", clearSearchPin);
