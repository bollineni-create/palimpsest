"use strict";
// Palimpsest · layers: events, thinkers (philosophy) and art, each switchable

const LAYER_KEY = "palimpsest:layers";
const layers = Object.assign({ events: true, thinkers: true, art: true },
  (() => { try { return JSON.parse(localStorage.getItem(LAYER_KEY)) || {}; } catch { return {}; } })());
const LAYER_LABELS = { events: "Events", thinkers: "Thinkers", art: "Art" };

function renderLayerChips() {
  const el = $("layerChips");
  el.innerHTML = '<span class="tag">Show</span>';
  Object.keys(LAYER_LABELS).forEach(k => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip chip-" + k;
    b.setAttribute("aria-pressed", String(!!layers[k]));
    b.innerHTML = `<i></i>${LAYER_LABELS[k]}`;
    b.addEventListener("click", () => setLayers({ [k]: !layers[k] }));
    el.appendChild(b);
  });
}
function setLayers(patch) {
  Object.assign(layers, patch);
  try { localStorage.setItem(LAYER_KEY, JSON.stringify(layers)); } catch {}
  renderLayerChips();
  applyLayerVisibility();
  updateThinkers();
  scheduleArt(true);
  renderLayerSections($("tab-history"));
}
function applyLayerVisibility() {
  if (!state.ready || !map.getLayer("th-dot")) return;
  ["ev-dot", "ev-glow"].forEach(l => map.setLayoutProperty(l, "visibility", layers.events ? "visible" : "none"));
  ["th-dot", "th-label"].forEach(l => map.setLayoutProperty(l, "visibility", layers.thinkers ? "visible" : "none"));
  artMarkers.forEach(m => m.getElement().style.display = layers.art ? "" : "none");
}

/* ---------- Thinkers ---------- */
// Everyone alive in this year; if nobody is, the closest lives within 150 years
function thinkersFor(y) {
  if (y < -800 || y >= TODAY) return { list: [], exact: true };
  const alive = THINKERS.filter(t => t.b <= y && y <= t.d);
  if (alive.length) return { list: alive, exact: true };
  const gap = t => y < t.b ? t.b - y : y - t.d;
  const near = THINKERS.filter(t => gap(t) <= 150).sort((a, b) => gap(a) - gap(b)).slice(0, 5);
  return { list: near, exact: false };
}
const thinkerYears = t => `${fmtLabel(t.b)}–${fmtLabel(t.d)}`.replace(/ BC–(\d[\d,]*) BC$/, "–$1 BC");
function updateThinkers() {
  if (!state.ready || !map.getSource("thinkers")) return;
  const { list, exact } = layers.thinkers ? thinkersFor(state.year) : { list: [], exact: true };
  map.getSource("thinkers").setData({ type: "FeatureCollection", features: list.map(t => ({
    type: "Feature", properties: { i: THINKERS.indexOf(t), name: t.n, near: exact ? 0 : 1 }, geometry: { type: "Point", coordinates: t.at },
  })) });
}
function openThinker(t) {
  stopPlay();
  map.flyTo({ center: t.at, zoom: Math.max(map.getZoom(), 4.5), duration: 2200, essential: true });
  $("pYear").textContent = `Thinker · ${thinkerYears(t)}`;
  $("pName").textContent = t.n;
  $("pSub").innerHTML = "";
  const q = document.createElement("span"); q.className = "event-text"; q.textContent = `“${t.i}”`; $("pSub").appendChild(q);
  const s = document.createElement("span"); s.className = "school"; s.textContent = t.s; $("pSub").appendChild(s);
  $("place").hidden = false;
  state.selected = { kind: "thinker", name: t.n, text: `${t.n} (${thinkerYears(t)}), ${t.s}: ${t.i}` };
  fillSummary(t.w, true);
}

/* ---------- Art (Cleveland Museum of Art open access, public domain) ---------- */
const ART_API = "https://openaccess-api.clevelandart.org/api/artworks/";
const artCache = new Map();
let artMarkers = [], artTimer = 0, artReq = 0, artShown = [], artKey = "";
// How wide a slice of time to search, so each era turns up a handful of works
function artWindow(y) {
  if (y >= TODAY) return 0;
  if (y >= 1800) return 6; if (y >= 1400) return 12; if (y >= 500) return 50;
  if (y >= -1000) return 80; if (y >= -5000) return 400; return 0;
}
// Museum culture labels are free text ("Italy, Florence", "Greek, Attic"): turn them into place names to look up
const CULTURE_PLACES = { "greek": "Greece", "attic": "Attica", "roman": "Rome", "etruscan": "Etruria", "egyptian": "Egypt", "south italian": "Magna Graecia",
  "american": "United States", "america": "United States", "french": "France", "italian": "Italy", "spanish": "Spain", "dutch": "Netherlands", "flemish": "Flanders",
  "german": "Germany", "english": "England", "british": "United Kingdom", "chinese": "China", "japanese": "Japan", "korean": "Korea", "indian": "India",
  "persian": "Iran", "iranian": "Iran", "byzantine": "Constantinople", "mesopotamian": "Mesopotamia", "assyrian": "Assyria", "sumerian": "Sumer",
  "aztec": "Tenochtitlan", "maya": "Yucatán Peninsula", "olmec": "La Venta", "inca": "Cusco", "peruvian": "Peru", "mexican": "Mexico", "nubian": "Nubia",
  "cypriot": "Cyprus", "phoenician": "Phoenicia", "viking": "Scandinavia", "russian": "Russia", "ottoman": "Istanbul", "mughal": "Agra", "tibetan": "Tibet",
  "nepalese": "Nepal", "thai": "Thailand", "khmer": "Angkor", "cambodian": "Cambodia", "vietnamese": "Vietnam", "javanese": "Java", "african": "Africa" };
function placeCandidates(culture) {
  const parts = (Array.isArray(culture) ? culture.join(", ") : culture || "").split(",")
    .map(p => p.replace(/\(.*?\)/g, "").trim())
    .filter(p => p && !/\d|period|dynasty|century|style|reportedly|probably|possibly|workshop|school/i.test(p));
  const out = [];
  parts.slice().reverse().forEach(p => { const k = p.toLowerCase(); out.push(CULTURE_PLACES[k] || p); });
  return [...new Set(out)];
}
async function geocode(names) {
  const coords = new Map(), list = [...new Set(names)];
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const r = await wikiApi({ action: "query", prop: "coordinates", titles: batch.join("|"), redirects: 1, colimit: "max" }).catch(() => null);
    if (!r || !r.query) continue;
    const alias = new Map();
    (r.query.normalized || []).forEach(n => alias.set(n.from, n.to));
    (r.query.redirects || []).forEach(n => alias.set(n.from, n.to));
    const found = new Map();
    (r.query.pages || []).forEach(pg => pg.coordinates && pg.coordinates[0] && found.set(pg.title, [pg.coordinates[0].lon, pg.coordinates[0].lat]));
    batch.forEach(t => { let k = t, hops = 0; while (alias.has(k) && hops++ < 3) k = alias.get(k); if (found.has(k)) coords.set(t, found.get(k)); });
  }
  return coords;
}
async function fetchArt(lo, hi) {
  const q = extra => fetch(`${ART_API}?created_after=${lo}&created_before=${hi}&has_image=1&limit=20${extra}&fields=id,title,creation_date,creators,culture,images,url,type,wall_description`)
    .then(r => r.json()).then(d => d.data || []);
  let works = await q("&highlight=1");
  if (works.length < 8) works = works.concat((await q("")).filter(w => !works.some(x => x.id === w.id)));
  works = works.filter(w => w.images && w.images.web && w.images.web.url).slice(0, 16).map(w => ({
    id: w.id, title: w.title, date: w.creation_date || "", type: w.type || "",
    artist: (w.creators && w.creators[0] && w.creators[0].description) || "",
    culture: Array.isArray(w.culture) ? w.culture[0] || "" : w.culture || "",
    img: w.images.web.url, url: w.url, about: w.wall_description || "",
    places: placeCandidates(w.culture),
  }));
  const coords = await geocode(works.flatMap(w => w.places));
  works.forEach(w => { const hit = w.places.find(p => coords.has(p)); if (hit) { w.at = coords.get(hit); w.place = hit; } });
  return works;
}
function scheduleArt(force) {
  const w = artWindow(state.year);
  const c = w ? Math.round(state.year / w) * w : 0;
  const key = w && layers.art ? `${c - w}:${c + w}` : "";
  if (key === artKey && !force) return;
  artKey = key;
  clearTimeout(artTimer);
  if (!key) { showArt([]); return; }
  if (state.playing) return;                       // don't hammer the museum while time is playing
  artTimer = setTimeout(async () => {
    const id = ++artReq;
    if (!artCache.has(key)) artCache.set(key, fetchArt(c - w, c + w).catch(e => { artCache.delete(key); throw e; }));
    try { const works = await artCache.get(key); if (id === artReq) showArt(works); }
    catch { if (id === artReq) showArt([], "The museum didn't answer. Check your connection."); }
  }, 600);
}
function showArt(works, error) {
  artMarkers.forEach(m => m.remove());
  artMarkers = [];
  artShown = works;
  state.artError = error || "";
  const seen = new Map();
  works.filter(w => w.at).slice(0, 14).forEach(w => {
    const k = w.at.map(v => v.toFixed(1)).join(","), n = seen.get(k) || 0; seen.set(k, n + 1);
    const el = document.createElement("button");
    el.type = "button"; el.className = "art-pin"; el.title = `${w.title} · ${w.date}`;
    el.setAttribute("aria-label", el.title);
    el.innerHTML = `<img alt="" loading="lazy" src="${w.img}">`;
    el.addEventListener("click", ev => { ev.stopPropagation(); openArt(w); });
    const angle = n * 2.4, r = n ? 26 + 6 * n : 0;              // fan out works from the same place
    const m = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [Math.cos(angle) * r, Math.sin(angle) * r] }).setLngLat(w.at).addTo(map);
    if (!layers.art) el.style.display = "none";
    artMarkers.push(m);
  });
  renderLayerSections($("tab-history"));
}
function openArt(w) {
  stopPlay();
  if (w.at) map.flyTo({ center: w.at, zoom: Math.max(map.getZoom(), 4.5), duration: 2200, essential: true });
  $("pYear").textContent = [w.date, w.type].filter(Boolean).join(" · ");
  $("pName").textContent = w.title;
  $("pSub").textContent = [w.artist, w.culture].filter(Boolean).join(" · ");
  $("pImg").src = w.img; $("pImg").alt = w.title; $("pImg").hidden = false;
  $("pExtract").textContent = w.about || "From the open-access collection of the Cleveland Museum of Art.";
  $("pExtract").hidden = false;
  $("pLink").href = w.url; $("pLink").textContent = "See it at the Cleveland Museum of Art ↗";
  $("place").hidden = false; $("place").scrollTop = 0;
  state.selected = { kind: "artwork", name: w.title, text: `${w.title} (${w.date}) by ${w.artist || "an unknown maker"}, ${w.culture}. ${w.about}`.slice(0, 600) };
}

/* ---------- The panel: thinkers and art under the history ---------- */
function renderLayerSections(el) {
  if (!el) return;
  el.querySelectorAll(".layer-sec").forEach(n => n.remove());
  const label = fmtLabel(state.year);
  if (layers.thinkers) {
    const { list, exact } = thinkersFor(state.year);
    if (list.length) {
      const sec = document.createElement("section"); sec.className = "layer-sec";
      sec.innerHTML = `<h2>${exact ? `Thinkers alive in ${label}` : `Thinkers who lived around ${label}`}</h2>`;
      list.slice(0, 12).forEach(t => {
        const b = document.createElement("button"); b.type = "button"; b.className = "th-row";
        b.innerHTML = `<span class="d"></span><span><span class="t"></span><span class="s"></span></span>`;
        b.querySelector(".d").textContent = thinkerYears(t);
        b.querySelector(".t").textContent = t.n;
        b.querySelector(".s").textContent = `${t.s} · ${t.i}`;
        b.addEventListener("click", () => openThinker(t));
        sec.appendChild(b);
      });
      el.appendChild(sec);
    }
  }
  if (layers.art && artWindow(state.year)) {
    const sec = document.createElement("section"); sec.className = "layer-sec";
    sec.innerHTML = `<h2>Art from around ${label}</h2>`;
    if (state.artError) sec.insertAdjacentHTML("beforeend", `<p class="empty">${state.artError}</p>`);
    else if (!artShown.length) sec.insertAdjacentHTML("beforeend", `<p class="empty">Looking through the museum…</p>`);
    const grid = document.createElement("div"); grid.className = "art-grid";
    artShown.slice(0, 12).forEach(w => {
      const b = document.createElement("button"); b.type = "button"; b.className = "art-tile"; b.title = `${w.title} · ${w.date}`;
      b.innerHTML = `<img alt="" loading="lazy"><span></span>`;
      b.querySelector("img").src = w.img;
      b.querySelector("span").textContent = w.title;
      b.addEventListener("click", () => openArt(w));
      grid.appendChild(b);
    });
    sec.appendChild(grid);
    if (artShown.length) sec.insertAdjacentHTML("beforeend", `<p class="credit">Public-domain works from the <a href="https://www.clevelandart.org/open-access" target="_blank" rel="noopener">Cleveland Museum of Art</a></p>`);
    el.appendChild(sec);
  }
}

/* ---------- Wiring ---------- */
function initLayers() {
  map.addSource("thinkers", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({ id: "th-dot", type: "circle", source: "thinkers",
    paint: { "circle-radius": 6.5, "circle-color": "#5f8f7d", "circle-stroke-color": "#fbfaf6", "circle-stroke-width": 2, "circle-opacity": ["case", ["==", ["get", "near"], 1], 0.55, 1] } });
  map.addLayer({ id: "th-label", type: "symbol", source: "thinkers",
    layout: { "text-field": ["get", "name"], "text-font": ["Open Sans Semibold"], "text-size": 11.5, "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true },
    paint: { "text-color": "#3e6b5b", "text-halo-color": "rgba(251,250,246,.92)", "text-halo-width": 1.4 } });
  map.on("click", "th-dot", e => openThinker(THINKERS[e.features[0].properties.i]));
  map.on("mouseenter", "th-dot", () => map.getCanvas().style.cursor = "pointer");
  map.on("mouseleave", "th-dot", () => map.getCanvas().style.cursor = "");
  applyLayerVisibility();
  themeThinkers();
  updateThinkers();
  scheduleArt(true);
}
function themeThinkers() {
  if (!state.ready || !map.getLayer("th-dot")) return;
  map.setPaintProperty("th-dot", "circle-color", THEME.thinker);
  map.setPaintProperty("th-dot", "circle-stroke-color", THEME.stroke === "#121815" ? "#121815" : "#fbfaf6");
  map.setPaintProperty("th-label", "text-color", THEME.thinkerLabel);
  map.setPaintProperty("th-label", "text-halo-color", THEME.halo);
}
themeHooks.push(themeThinkers);
yearHooks.push(() => { updateThinkers(); scheduleArt(); });
panelHooks.push(el => renderLayerSections(el));
renderLayerChips();
if (state.ready) initLayers(); else map.on("load", initLayers);
