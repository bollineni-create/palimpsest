"use strict";
// Palimpsest · the globe, the timeline and the history panel

/* ---------- Historical borders (snapshots available in the dataset) ---------- */
const BORDER_YEARS = [-123000,-10000,-8000,-5000,-4000,-3000,-2000,-1500,-1000,-700,-500,-400,-323,-300,-200,-100,-1,
  100,200,300,400,500,600,700,800,900,1000,1100,1200,1279,1300,1400,1492,1500,1530,1600,1650,1700,1715,1783,1800,1815,
  1878,1880,1900,1914,1920,1930,1938,1945,1960,1994,2000,2010];
const BORDER_URL = y => `https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson/world_${y < 0 ? "bc" + (-y) : y}.geojson`;
const PRECISION = { 1: "rough outline", 2: "moderately precise", 3: "precise" };

/* ---------- Time scale: all of time, with the recent past given the most room ---------- */
const BIG_BANG = -13.8e9;
const SEG = [[BIG_BANG, 0], [-4.6e9, .06], [-538.8e6, .14], [-66e6, .22], [-2.6e6, .30], [-300000, .36], [-12000, .43],
  [-3000, .50], [1, .58], [1000, .65], [1500, .71], [1800, .79], [1900, .87], [TODAY, 1]];
function posToYear(p) {
  for (let i = 1; i < SEG.length; i++) if (p <= SEG[i][1]) {
    const [y0, p0] = SEG[i - 1], [y1, p1] = SEG[i];
    return y0 + (y1 - y0) * (p - p0) / (p1 - p0);
  }
  return TODAY;
}
function yearToPos(y) {
  if (y <= BIG_BANG) return 0;
  for (let i = 1; i < SEG.length; i++) if (y <= SEG[i][0]) {
    const [y0, p0] = SEG[i - 1], [y1, p1] = SEG[i];
    return p0 + (p1 - p0) * (y - y0) / (y1 - y0);
  }
  return 1;
}
function snapYear(y) {
  const a = Math.abs(y);
  const s = a >= 1e9 ? 1e7 : a >= 1e8 ? 1e6 : a >= 1e7 ? 1e5 : a >= 1e6 ? 1e4 : a >= 1e5 ? 1000 : a >= 3000 ? 100 : y < 1500 ? 10 : 1;
  let r = Math.round(y / s) * s;
  if (r === 0) r = 1;
  return Math.max(BIG_BANG, Math.min(TODAY, r));
}
const trim = n => String(+n.toFixed(2));
function fmtYear(y) {
  if (y >= TODAY) return { n: "Today", s: "" };
  if (y <= -1e9) return { n: trim(-y / 1e9), s: "billion years ago" };
  if (y <= -1e6) return { n: trim(-y / 1e6), s: "million years ago" };
  if (y < -100000) return { n: Math.abs(y).toLocaleString("en-US"), s: "years ago" };
  if (y < 0) return { n: Math.abs(y).toLocaleString("en-US"), s: "BC" };
  if (y < 1000) return { n: String(y), s: "AD" };
  return { n: String(y), s: "" };
}
const fmtLabel = y => { const f = fmtYear(y); return f.s ? `${f.n} ${f.s}` : f.n; };
function eraOf(y) {
  if (y >= TODAY) return "The present day";
  if (y < -13.79e9) return "The Big Bang";
  if (y < -4.6e9) return "The young universe";
  if (y < -4.0e9) return "The Hadean · a molten Earth";
  if (y < -2.5e9) return "The Archean · the first life";
  if (y < -538.8e6) return "The Proterozoic · oxygen and complex cells";
  if (y < -251.9e6) return "The Paleozoic · life fills the seas and land";
  if (y < -66e6) return "The Mesozoic · the age of dinosaurs";
  if (y < -2.58e6) return "The Cenozoic · the age of mammals";
  if (y < -300000) return "The Ice Ages · early humans";
  if (y < -10000) return "The last Ice Age";
  if (y < -3000) return "The Neolithic";
  if (y < -800) return "The Bronze Age";
  if (y < 500) return "Classical antiquity";
  if (y < 1500) return "The Middle Ages";
  if (y < 1760) return "The early modern era";
  if (y < 1914) return "The industrial age";
  if (y < 1946) return "The world wars";
  if (y < 1991) return "The Cold War";
  return "The digital age";
}
const bordersFor = y => { let best = null; for (const b of BORDER_YEARS) if (b <= y) best = b; return best; };

/* ---------- Map ---------- */
const ESRI = svc => `https://server.arcgisonline.com/ArcGIS/rest/services/${svc}/MapServer/tile/{z}/{y}/{x}`;
const style = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  projection: { type: "globe" },
  sky: {
    "sky-color": "#eeebe3", "horizon-color": "#d6e2df", "fog-color": "#e2e6e0",
    "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.5,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
  },
  sources: {
    imagery: { type: "raster", tiles: [ESRI("World_Imagery")], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
    labels: { type: "raster", tiles: [ESRI("Reference/World_Boundaries_and_Places")], tileSize: 256, maxzoom: 19, attribution: "Place names © Esri" },
    dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS Terrain Tiles" },
    paper: { type: "geojson", data: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]]] } } },
    borders: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "Historical borders: " + A("https://github.com/aourednik/historical-basemaps", "historical-basemaps") + " (approximate)" },
    oldmarks: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    paleo: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "Ancient continents: " + A("https://gwsdoc.gplates.org/", "GPlates") + " (Merdith et al. 2021)" },
    events: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "History: " + A("https://en.wikipedia.org/", "Wikipedia") },
  },
  layers: [
    { id: "space", type: "background", paint: { "background-color": "#a9c9cf" } },
    { id: "imagery", type: "raster", source: "imagery", paint: { "raster-fade-duration": 0 } },
    { id: "paper", type: "fill", source: "paper", paint: { "fill-color": "#6b4e24", "fill-opacity": 0 } },
    { id: "paleo-land", type: "fill", source: "paleo", paint: { "fill-color": "#a08d5e", "fill-outline-color": "#a08d5e", "fill-opacity": 1, "fill-antialias": false } },
  ],
};
MAPS.forEach(m => {
  style.sources["s-" + m.id] = {
    type: "raster", tiles: [m.years ? m.url.replace("{year}", m.years[0]) : m.url], tileSize: 256,
    bounds: m.bbox, minzoom: m.min || 0, maxzoom: m.max || 19, attribution: m.attr,
  };
  style.layers.push({ id: "m-" + m.id, type: "raster", source: "s-" + m.id, layout: { visibility: "none" }, paint: { "raster-opacity": 0.85, "raster-fade-duration": 200 } });
});
style.layers.push(
  { id: "b-fill", type: "fill", source: "borders", paint: { "fill-color": "#9fc7b6", "fill-opacity": 0.3 } },
  { id: "b-line", type: "line", source: "borders", paint: { "line-color": "#f3e6c8", "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.55, 9, 0.25], "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.4] } },
  { id: "b-hover", type: "line", source: "borders", filter: ["==", ["get", "NAME"], ""], paint: { "line-color": "#e0714f", "line-width": 2.2 } },
  { id: "labels", type: "raster", source: "labels", layout: { visibility: "none" } },
  { id: "b-label", type: "symbol", source: "borders",
    layout: { "text-field": ["get", "NAME"], "text-font": ["Open Sans Semibold"], "text-size": ["interpolate", ["linear"], ["get", "a"], 0, 9, 50, 11, 800, 14],
      "text-transform": "uppercase", "text-letter-spacing": 0.14, "text-max-width": 7, "symbol-placement": "point", "text-padding": 8, "symbol-sort-key": ["-", 0, ["get", "a"]] },
    paint: { "text-color": "#f6ecd2", "text-halo-color": "rgba(20,14,6,.8)", "text-halo-width": 1.2, "text-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.85, 7, 0.95, 10, 0] } },
  { id: "old-dot", type: "circle", source: "oldmarks", maxzoom: 9,
    paint: { "circle-radius": 7, "circle-color": "#d6b26e", "circle-stroke-color": "#1a120a", "circle-stroke-width": 2, "circle-opacity": 0.95 } },
  { id: "ev-glow", type: "circle", source: "events",
    paint: { "circle-radius": ["*", ["case", ["boolean", ["feature-state", "active"], false], 2, 1], ["interpolate", ["linear"], ["get", "imp"], 0, 7, 1, 16]], "circle-color": "#e0714f", "circle-opacity": 0.25, "circle-blur": 0.6 } },
  { id: "ev-dot", type: "circle", source: "events",
    paint: { "circle-radius": ["+", ["case", ["boolean", ["feature-state", "active"], false], 3, 0], ["interpolate", ["linear"], ["get", "imp"], 0, 3.5, 1, 8]], "circle-color": "#e0714f", "circle-stroke-color": "#fff4ea", "circle-stroke-width": 1.5 } },
  { id: "old-dot-label", type: "symbol", source: "oldmarks", maxzoom: 9,
    layout: { "text-field": ["get", "label"], "text-font": ["Open Sans Semibold"], "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-max-width": 10, "text-optional": true, "symbol-sort-key": 0 },
    paint: { "text-color": "#d6b26e", "text-halo-color": "#0b0805", "text-halo-width": 1.5 } },
);

// Without WebGL (or if MapLibre didn't load) there is no globe to build, so show the explanation instead
const map = (() => {
  try {
    return new maplibregl.Map({
      container: "map", style, center: [12, 38], zoom: 1.7, maxPitch: 80,
      attributionControl: { compact: true }, hash: false,
      maxTileCacheSize: 800,       // keep more tiles while panning, so areas don't reload and blink
      fadeDuration: 150,           // labels settle faster after a move
    });
  } catch (err) { showNoGlobe(); throw err; }
})();
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.addControl(new maplibregl.GlobeControl(), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

/* ---------- State ---------- */
const state = { ready: false, deep: false, paleoMa: null, day: null, pendingDay: null, history: null, year: 1900, borderYear: null, blend: 0.85, playing: false, tour: null, tourStep: 0, swissYear: null, labels: false };
const cache = new Map();
const $ = id => document.getElementById(id);

function hashName(name) { let h = 0; for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 840; }

function bboxArea(g) {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = c => typeof c[0] === "number" ? (w = Math.min(w, c[0]), e = Math.max(e, c[0]), s = Math.min(s, c[1]), n = Math.max(n, c[1])) : c.forEach(walk);
  walk(g.coordinates);
  return Math.max(0, (e - w) * (n - s));
}
async function loadBorders(by) {
  if (cache.has(by)) return cache.get(by);
  const p = fetch(BORDER_URL(by)).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(fc => {
    fc.features = fc.features.filter(f => f.properties && f.properties.NAME);
    fc.features.forEach(f => {
      f.properties.h = hashName(f.properties.SUBJECTO || f.properties.NAME);
      f.properties.a = bboxArea(f.geometry);           // rough size, so big realms get labels first
    });
    return fc;
  });
  cache.set(by, p);
  p.catch(() => cache.delete(by));
  return p;
}
let borderReq = 0;
async function showBorders(by) {
  if (state.borderYear === by) return;
  state.borderYear = by;
  const id = ++borderReq;
  $("src").textContent = by == null ? "" : `Loading borders for ${fmtYear(by).n} ${fmtYear(by).s}…`;
  try {
    const fc = by == null ? { type: "FeatureCollection", features: [] } : await loadBorders(by);
    if (id !== borderReq) return;
    map.getSource("borders").setData(fc);
    updateSourceLine();
    followRegionCard(fc, by);
    // warm the neighbours so scrubbing feels instant
    const i = BORDER_YEARS.indexOf(by);
    [BORDER_YEARS[i - 1], BORDER_YEARS[i + 1]].forEach(n => n != null && loadBorders(n).catch(() => {}));
  } catch {
    if (id === borderReq) $("src").textContent = "Couldn't load borders for this era. Check your connection.";
  }
}
// An open region card describes one border snapshot; when the borders change, update it or close it
function followRegionCard(fc, by) {
  const sel = state.selected;
  if (!sel || sel.kind !== "region" || $("place").hidden) return;
  const f = by != null && fc.features.find(x => x.properties.NAME === sel.name);
  if (!f) { $("place").hidden = true; state.selected = null; return; }
  $("pYear").textContent = `${fmtYear(by).n} ${fmtYear(by).s}`.trim() + " · " + (PRECISION[f.properties.BORDERPRECISION] || "approximate");
}
function updateSourceLine() {
  const y = state.year, by = state.borderYear;
  if (y >= TODAY) { $("src").textContent = "Today's world · satellite imagery"; return; }
  if (state.deepNote) { $("src").textContent = state.deepNote; return; }
  if (state.deep) { $("src").textContent = state.paleoReady ? `The continents ${fmtLabel(-state.paleoMa * 1e6)} · plate model by GPlates` : `Rebuilding the continents for ${fmtLabel(-state.paleoMa * 1e6)}…`; return; }
  if (y < -123000) { $("src").textContent = "Before any borders · today's land shown"; return; }
  const active = MAPS.filter(m => isActive(m, y)).length;
  const b = by == null ? "" : `Borders as of ${fmtYear(by).n}${fmtYear(by).s ? " " + fmtYear(by).s : ""}`;
  $("src").textContent = b + (active ? ` · ${active} old map${active > 1 ? "s" : ""} on the globe` : "");
}

const isActive = (m, y) => y >= m.from && y <= m.to && y < TODAY;

/* ---------- Apply a year to everything ---------- */
function renderYearText(f) { $("yr").innerHTML = f.n + (f.s ? `<small>${f.s}</small>` : ""); }
let swissTimer = 0;
function setYear(y, { fromSlider = false, exact = false, fromFine = false } = {}) {
  y = exact ? Math.max(BIG_BANG, Math.min(TODAY, Math.round(y) || 1)) : snapYear(y);
  if (y !== state.year) { state.day = null; updateDayReadout(); }
  state.year = y;
  const f = fmtYear(y);
  renderYearText(f);
  const period = periodOf(y);
  $("period").innerHTML = `<i style="background:${period.c}"></i>${period.name}`;
  $("era").textContent = eraOf(y);
  const pos = yearToPos(y);
  if (!fromSlider) $("time").value = Math.round(pos * 10000);
  $("head").style.left = (pos * 100) + "%";
  $("time").setAttribute("aria-valuetext", f.n + (f.s ? " " + f.s : ""));
  yearHooks.forEach(h => h(y, { fromSlider, fromFine }));
  if (!state.ready) return;

  const today = y >= TODAY;
  applyDeep(y);
  showBorders(today ? null : bordersFor(y));
  map.setLayoutProperty("labels", "visibility", (today || state.labels) ? "visible" : "none");

  MAPS.forEach(m => {
    const on = isActive(m, y);
    map.setLayoutProperty("m-" + m.id, "visibility", on ? "visible" : "none");
    if (on && m.years) {
      let sy = m.years[0]; for (const v of m.years) if (v <= y) sy = v;
      if (sy !== state.swissYear) {
        state.swissYear = sy;
        clearTimeout(swissTimer);
        swissTimer = setTimeout(() => map.getSource("s-" + m.id).setTiles([m.url.replace("{year}", sy)]), 120);
      }
    }
  });
  applyLook();
  updateMarks();
  renderMapList();
  updateSourceLine();
  scheduleHistory();
  saveView();
}

// The further back, the more the present-day imagery fades to sepia.
function applyLook() {
  const y = state.year, t = state.blend;
  const age = y >= TODAY ? 0 : Math.min(1, (TODAY - y) / 250);
  const s = THEME;
  map.setPaintProperty("imagery", "raster-saturation", Math.max(-1, s.sat - 0.75 * age * t * (1 + s.sat)));
  map.setPaintProperty("imagery", "raster-brightness-max", s.bright * (1 - 0.18 * age * t));
  map.setPaintProperty("imagery", "raster-contrast", s.contrast);
  map.setPaintProperty("imagery", "raster-brightness-min", s.lift || 0);
  map.setPaintProperty("paper", "fill-opacity", 0.22 * age * t);
  map.setPaintProperty("b-fill", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 1, Math.min(0.9, 0.34 * t * s.fill), 5, Math.min(0.8, 0.2 * t * s.fill), 8, 0]);
  MAPS.forEach(m => map.setPaintProperty("m-" + m.id, "raster-opacity", Math.max(0, Math.min(1, 0.15 + t))));
}

function updateMarks() {
  const feats = MAPS.filter(m => isActive(m, state.year)).map(m => ({
    type: "Feature", properties: { id: m.id, label: m.title }, geometry: { type: "Point", coordinates: [m.view[0], m.view[1]] },
  }));
  map.getSource("oldmarks").setData({ type: "FeatureCollection", features: feats });
}


/* ---------- The design: a painted globe, and a transit line coloured by geologic time ---------- */
const THEME_LIGHT = {
  lift: 0.36, sat: -0.3, bright: 1, contrast: -0.12, fill: 1.7, blur: 1.4,       // imagery softened like a watercolour wash
  palette: ["#9fc7b6", "#e6b77e", "#c98ea6", "#a7b8d8", "#d9c27a", "#b7a3cf", "#b9d39b", "#e9a890"],
  border: "#6b5a48", label: "#22302a", halo: "rgba(251,250,246,.85)",
  pin: "#ffffff", stroke: "#22302a", old: "#d4492a",                                // event pins are drawn as transit stations
  land: "#d8c79f", ocean: "#a9c9cf", sky: ["#eeebe3", "#d6e2df", "#e2e6e0"],
  thinker: "#5f8f7d", thinkerLabel: "#3e6b5b", tint: "paper",
};
// Field line at night: the imagery dimmed, empires in deeper washes, light ink on a dark sky
const THEME_DARK = {
  lift: 0.0, sat: -0.3, bright: 0.72, contrast: 0.08, fill: 1.45, blur: 1.4,
  palette: ["#4f8a76", "#b0864a", "#9c5f78", "#6579aa", "#a99447", "#7e6ba5", "#7a9c5c", "#b4705c"],
  border: "#d6c4a2", label: "#eef1ec", halo: "rgba(14,19,16,.88)",
  pin: "#f2f4ef", stroke: "#121815", old: "#ef6c4b",
  land: "#8c7c57", ocean: "#11313d", sky: ["#0a1119", "#243a48", "#18252d"],
  thinker: "#8fc2ab", thinkerLabel: "#bfe3d1", tint: "night",
};
let THEME = isDark() ? THEME_DARK : THEME_LIGHT;
const PAPER = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="p"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 .28 0"/></filter><rect width="100%" height="100%" filter="url(#p)"/></svg>')}")`;
// Official geologic time scale colours (International Commission on Stratigraphy), oldest first
const PERIODS = [
  { from: -13.8e9, name: "Before Earth", c: "#3b3b52" }, { from: -4.567e9, name: "Hadean", c: "#ae027e" }, { from: -4.031e9, name: "Archean", c: "#f0047f" },
  { from: -2.5e9, name: "Proterozoic", c: "#f73563" }, { from: -538.8e6, name: "Cambrian", c: "#7fa056" }, { from: -485.4e6, name: "Ordovician", c: "#009270" },
  { from: -443.8e6, name: "Silurian", c: "#b3e1b6" }, { from: -419.2e6, name: "Devonian", c: "#cb8c37" }, { from: -358.9e6, name: "Carboniferous", c: "#67a599" },
  { from: -298.9e6, name: "Permian", c: "#f04028" }, { from: -251.9e6, name: "Triassic", c: "#812b92" }, { from: -201.4e6, name: "Jurassic", c: "#34b2c9" },
  { from: -145e6, name: "Cretaceous", c: "#7fc64e" }, { from: -66e6, name: "Paleogene", c: "#fd9a52" }, { from: -23.03e6, name: "Neogene", c: "#ffe619" },
  { from: -2.58e6, name: "Pleistocene", c: "#fff2ae" }, { from: -9700, name: "Holocene", c: "#fef2e0" },
];
const periodOf = y => { let p = PERIODS[0]; for (const q of PERIODS) if (q.from <= y) p = q; return p; };
// The timeline rail is painted in those colours, at their true positions on the time scale
function buildRail() {
  const pct = y => (yearToPos(y) * 100).toFixed(2) + "%";
  const strata = PERIODS.map((p, i) => `${p.c} ${pct(p.from)} ${pct(i < PERIODS.length - 1 ? PERIODS[i + 1].from : TODAY)}`).join(", ");
  document.documentElement.style.setProperty("--rail", `linear-gradient(90deg, ${strata})`);
}
const TEXT = { top: y => `Main stops of ${y}`, day: "Stops on this day" };
const uiText = (k, fallback) => TEXT[k] || fallback;
function setBaseLayers() { map.setLayoutProperty("imagery", "visibility", state.deep ? "none" : "visible"); }
const TINTS = {
  paper: () => ({ background: `${PAPER}, radial-gradient(ellipse at center, transparent 55%, rgba(120,100,70,.18))`, mixBlendMode: "multiply" }),
  night: () => ({ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.38))", mixBlendMode: "normal" }),
};
// Switch between the light and dark designs: page colours (via data-theme), the map, and anything else that listens
function setAppearance() {
  const mode = themeMode();
  if (mode === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = mode;
  THEME = isDark() ? THEME_DARK : THEME_LIGHT;
  const tint = $("tint"); tint.removeAttribute("style"); Object.assign(tint.style, TINTS[THEME.tint]());
  if (state.ready) { applyTheme(); setYear(state.year, { exact: true }); }
  themeHooks.forEach(h => h(isDark()));
}
function applyTheme() {
  const t = THEME;
  map.setSky({ "sky-color": t.sky[0], "horizon-color": t.sky[1], "fog-color": t.sky[2], "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.5,
    "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] });
  map.setPaintProperty("b-fill", "fill-color", ["to-color", ["at", ["%", ["get", "h"], t.palette.length], ["literal", t.palette]]]);
  map.setPaintProperty("b-line", "line-color", t.border);
  map.setPaintProperty("b-line", "line-blur", t.blur);
  map.setPaintProperty("b-label", "text-color", t.label);
  map.setPaintProperty("b-label", "text-halo-color", t.halo);
  map.setPaintProperty("ev-dot", "circle-color", t.pin);
  map.setPaintProperty("ev-dot", "circle-stroke-color", t.stroke);
  map.setPaintProperty("ev-dot", "circle-stroke-width", 2.5);
  map.setPaintProperty("ev-glow", "circle-opacity", 0);
  map.setPaintProperty("old-dot", "circle-color", t.old);
  map.setPaintProperty("old-dot", "circle-stroke-color", t.stroke);
  map.setPaintProperty("old-dot-label", "text-color", t.old);
  map.setPaintProperty("old-dot-label", "text-halo-color", t.halo);
  map.setPaintProperty("paleo-land", "fill-color", t.land);
  map.setPaintProperty("paleo-land", "fill-outline-color", t.land);
  map.setPaintProperty("paper", "fill-color", isDark() ? "#3a3020" : "#8a7a5a");
}

/* ---------- Deep time: no imagery, drifting continents, a molten or absent Earth ---------- */
const PALEO_MA = [5,10,15,20,25,30,35,40,45,50,55,60,66,70,75,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,252,
  260,270,280,290,300,320,340,360,380,400,420,440,460,480,500,520,540,560,580,600,625,650,675,700,750,800,850,900,950,1000];
const nearestMa = ma => PALEO_MA.reduce((a, b) => Math.abs(b - ma) < Math.abs(a - ma) ? b : a);
const paleoCache = new Map();
let paleoTimer = 0, paleoReq = 0;
function applyDeep(y) {
  const deep = y < -5e6;
  if (deep !== state.deep) {
    state.deep = deep;
    setBaseLayers();
    updateTerrain();
  }
  let bg = THEME.ocean, note = "";
  if (y < -4.54e9) { bg = THEME.sky[0]; note = y < -4.568e9 ? "No Sun and no Earth yet · this is where Earth will be" : "The Sun is shining · Earth is still dust and rock"; }
  else if (y < -4.0e9) { bg = "#6a2410"; note = "A molten young Earth · no lasting oceans yet"; }
  else if (deep) bg = THEME.ocean;
  if (deep && y < -1000e6 && y >= -4.0e9) note = "Ocean world · where the continents sat this long ago is unknown";
  map.setPaintProperty("space", "background-color", bg);
  state.deepNote = note;
  if (deep && y >= -1000e6) loadPaleo(nearestMa(-y / 1e6)); else clearPaleo();
}
function loadPaleo(ma) {
  if (state.paleoMa === ma) return;
  state.paleoMa = ma; state.paleoReady = false;
  const id = ++paleoReq;
  clearTimeout(paleoTimer);
  paleoTimer = setTimeout(async () => {
    try {
      if (!paleoCache.has(ma)) paleoCache.set(ma, fetch(`https://gws.gplates.org/reconstruct/coastlines/?time=${ma}&model=MERDITH2021`).then(r => r.json()));
      const fc = await paleoCache.get(ma);
      if (id !== paleoReq) return;
      map.getSource("paleo").setData(fc);
      state.paleoReady = true;
      updateSourceLine();
      if (state.deepMilestones) pinMilestones(state.deepMilestones);
    } catch {
      paleoCache.delete(ma);
      if (id === paleoReq) $("src").textContent = "Couldn't rebuild the ancient continents. Check your connection.";
    }
  }, state.playing ? 600 : 200);
}
function clearPaleo() {
  if (state.paleoMa == null) return;
  state.paleoMa = null; state.paleoReady = false; paleoReq++;
  map.getSource("paleo").setData({ type: "FeatureCollection", features: [] });
}
// Move today's coordinates back to where that rock sat at the time
async function reconstructPoints(points, ma) {
  if (!points.length || !ma) return points;
  try {
    const r = await fetch(`https://gws.gplates.org/reconstruct/reconstruct_points/?points=${points.map(p => p.join(",")).join(",")}&time=${ma}&model=MERDITH2021`).then(r => r.json());
    return r.coordinates && r.coordinates.length === points.length ? r.coordinates : points;
  } catch { return points; }
}

/* ---------- Panel ---------- */
function rangeText(m) { return m.from === m.to ? String(m.from) : `${m.from}–${String(m.to).slice(m.from >= 1000 && Math.floor(m.from / 100) === Math.floor(m.to / 100) ? 2 : 0)}`; }
function renderMapList() {
  const el = $("tab-maps");
  const y = state.year;
  const now = MAPS.filter(m => isActive(m, y)), other = MAPS.filter(m => !isActive(m, y));
  const label = y >= TODAY ? "today" : `${fmtYear(y).n}${fmtYear(y).s ? " " + fmtYear(y).s : ""}`;
  el.innerHTML = "";
  const h1 = document.createElement("h2"); h1.textContent = `On the globe in ${label}`; el.appendChild(h1);
  if (!now.length) {
    const p = document.createElement("p"); p.className = "empty";
    p.textContent = y < 1747 ? "No detailed survey maps reach back this far. The coloured regions show who held which lands." : "No detailed map for this exact year. Pick one below to jump to its time and place.";
    el.appendChild(p);
  }
  now.forEach(m => el.appendChild(card(m, true)));
  const h2 = document.createElement("h2"); h2.textContent = "Elsewhere in time"; el.appendChild(h2);
  other.forEach(m => el.appendChild(card(m, false)));
}
function card(m, on) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "card " + (on ? "on" : "off");
  b.innerHTML = `<span class="when"></span><span><span class="t"></span><span class="s"></span></span>`;
  b.querySelector(".when").textContent = rangeText(m);
  b.querySelector(".t").textContent = m.title;
  b.querySelector(".s").textContent = m.sub;
  b.addEventListener("click", () => goToMap(m));
  return b;
}
function goToMap(m) {
  stopPlay();
  if (!isActive(m, state.year)) setYear(m.years ? 1900 : Math.round((m.from + m.to) / 2), { exact: true });
  map.flyTo({ center: [m.view[0], m.view[1]], zoom: m.view[2], pitch: m.view[2] > 12 ? 45 : 0, bearing: 0, duration: 3500, essential: true });
  if (innerWidth < 760) $("drawer").classList.add("closed");
}
function renderTours() {
  const el = $("tab-tours");
  el.innerHTML = "<h2>Guided journeys</h2>";
  TOURS.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "card on";
    b.innerHTML = `<span class="when"></span><span><span class="t"></span><span class="s"></span></span>`;
    b.querySelector(".when").textContent = `${t.steps.length} stops`;
    b.querySelector(".t").textContent = t.title;
    b.querySelector(".s").textContent = t.sub;
    b.addEventListener("click", () => startTour(i));
    el.appendChild(b);
  });
}
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  ["history", "maps", "tours"].forEach(t => $("tab-" + t).hidden = b.dataset.tab !== t);
}));

/* ---------- Journeys ---------- */
function startTour(i) {
  stopPlay(); state.tour = TOURS[i]; state.tourStep = 0; $("caption").hidden = false;
  if (innerWidth < 760) $("drawer").classList.add("closed");   // on a phone the caption would sit on the panel
  showStep();
}
function showStep() {
  const t = state.tour, s = t.steps[state.tourStep];
  // Remember the journey, so a reload (or the Mac app refreshing after an update) carries on from this stop
  try { localStorage.setItem("palimpsest:tour", JSON.stringify({ i: TOURS.indexOf(t), step: state.tourStep })); } catch {}
  $("capTitle").textContent = t.title;
  $("capText").textContent = s.text;
  $("capCount").textContent = `${state.tourStep + 1} of ${t.steps.length}`;
  $("capPrev").disabled = state.tourStep === 0;
  $("capNext").textContent = state.tourStep === t.steps.length - 1 ? "Finish" : "Next ▸";
  if (s.day) state.pendingDay = s.day;
  if (s.layers && typeof setLayers === "function") setLayers(s.layers);
  setYear(s.year, { exact: true });
  map.flyTo({ center: s.center, zoom: s.zoom, pitch: s.pitch || 0, bearing: s.bearing || 0, duration: 4000, essential: true });
}
$("capNext").addEventListener("click", () => { if (state.tourStep < state.tour.steps.length - 1) { state.tourStep++; showStep(); } else endTour(); });
$("capPrev").addEventListener("click", () => { if (state.tourStep > 0) { state.tourStep--; showStep(); } });
$("capStop").addEventListener("click", endTour);
function endTour() { state.tour = null; $("caption").hidden = true; try { localStorage.removeItem("palimpsest:tour"); } catch {} }
function resumeTour() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem("palimpsest:tour")); } catch {}
  if (!saved || !TOURS[saved.i] || !TOURS[saved.i].steps[saved.step]) return;
  state.tour = TOURS[saved.i]; state.tourStep = saved.step; $("caption").hidden = false; showStep();
}

/* ---------- Timeline ---------- */
// Hide any tick label that would touch its neighbour (the ends always win); shorten band names to fit.
function layoutTicks() {
  const spans = [...$("ticks").children];
  spans.forEach(s => s.classList.remove("off"));
  const box = s => s.getBoundingClientRect();
  const keep = [spans[0], spans[spans.length - 1]];
  let lastRight = box(spans[0]).right;
  const endLeft = box(spans[spans.length - 1]).left;
  spans.slice(1, -1).forEach(s => {
    const r = box(s);
    if (r.left < lastRight + 10 || r.right > endLeft - 10) s.classList.add("off");
    else lastRight = r.right;
  });
  [...$("bands").children].forEach(s => {
    const w = s.getBoundingClientRect().width - 8;
    const fits = t => { s.innerHTML = `<i style="font-style:normal">${t}</i>`; return s.firstChild.getBoundingClientRect().width <= w; };
    if (!fits(s.dataset.full) && !fits(s.dataset.short)) s.textContent = "";
  });
}
addEventListener("resize", () => requestAnimationFrame(layoutTicks));
document.fonts && document.fonts.ready.then(() => layoutTicks());
function buildTicks() {
  const marks = [[BIG_BANG, "Big Bang"], [-4.6e9, "4.6 bn"], [-538.8e6, "539 m"], [-66e6, "66 m"], [-2.6e6, "2.6 m"], [-300000, "300k"],
    [-12000, "12k"], [-3000, "3000 BC"], [1, "AD 1"], [1000, "1000"], [1500, "1500"], [1800, "1800"], [1900, "1900"], [TODAY, "Today"]];
  const t = $("ticks");
  t.innerHTML = "";
  marks.forEach(([y, l]) => { const s = document.createElement("span"); s.style.left = yearToPos(y) * 100 + "%"; s.textContent = l; t.appendChild(s); });
  const b = $("bands");
  b.innerHTML = "";
  BANDS.forEach(band => {
    const a = yearToPos(band.from), z = yearToPos(Math.min(band.to, TODAY));
    const s = document.createElement("span"); s.style.left = a * 100 + "%"; s.style.width = (z - a) * 100 + "%";
    s.dataset.full = band.label; s.dataset.short = band.short || band.label; s.title = band.label; b.appendChild(s);
  });
  layoutTicks();
  const d = $("density");
  d.innerHTML = "";
  MAPS.forEach(m => { for (let y = m.from; y <= m.to; y += Math.max(1, Math.round((m.to - m.from) / 6))) { const i = document.createElement("i"); i.style.left = yearToPos(y) * 100 + "%"; d.appendChild(i); } });
  const mk = $("marks");
  mk.innerHTML = "";
  MILESTONES.forEach(ms => {
    const btn = document.createElement("button");
    btn.className = "k" + ms.k;
    btn.style.left = yearToPos(ms.y) * 100 + "%";
    btn.title = `${msDate(ms)} · ${ms.t}`;
    btn.setAttribute("aria-label", btn.title);
    btn.addEventListener("click", e => { e.stopPropagation(); openMilestone(ms); });
    mk.appendChild(btn);
  });
}
$("time").addEventListener("input", e => { stopPlay(); setYear(posToYear(e.target.value / 10000), { fromSlider: true }); });
document.querySelectorAll(".nudge [data-step]").forEach(b => b.addEventListener("click", () => { stopPlay(); setYear(Math.min(TODAY, state.year + +b.dataset.step), { exact: true }); }));
$("blend").addEventListener("input", e => { state.blend = e.target.value / 100; applyLook(); });
$("labelsBtn").addEventListener("click", e => { state.labels = !state.labels; e.currentTarget.setAttribute("aria-pressed", String(state.labels)); setYear(state.year, { exact: true }); });
$("tiltBtn").addEventListener("click", toggleTilt);
// Phones show only the timeline until More is pressed (the button is hidden on wider screens)
function setTimelineMore(on) {
  document.querySelector(".timeline").classList.toggle("expanded", on);
  $("tlMore").setAttribute("aria-expanded", String(on));
  $("tlMore").textContent = on ? "Fewer controls" : "More controls";
  requestAnimationFrame(() => { layoutTicks(); placeOverlays(); if (on && typeof updateFine === "function") updateFine(); });
}
$("tlMore").addEventListener("click", () => setTimelineMore(!document.querySelector(".timeline").classList.contains("expanded")));
// Hide the timeline to see the whole globe; a pill at the bottom (or H) brings it back. Remembered between visits.
const TL_HIDDEN_KEY = "palimpsest:timeline-hidden";
function setTimelineHidden(on, { save = true } = {}) {
  const tl = document.querySelector(".timeline");
  if (tl.classList.contains("tucked") === on) return;
  const hadFocus = tl.contains(document.activeElement) || document.activeElement === $("tlShow");
  tl.classList.toggle("tucked", on);
  tl.toggleAttribute("inert", on);
  $("tlShow").hidden = !on;
  if (save) try { localStorage.setItem(TL_HIDDEN_KEY, on ? "1" : ""); } catch {}
  if (hadFocus) (on ? $("tlShow") : $("tlHide")).focus({ preventScroll: true });
  requestAnimationFrame(placeOverlays);
}
$("tlHide").addEventListener("click", () => setTimelineHidden(true));
$("tlShow").addEventListener("click", () => setTimelineHidden(false));
yearHooks.push(y => { $("tlShowYr").textContent = fmtLabel(y); });
// Swipe the timeline's empty edges down to hide it, and the pill up to bring it back
(() => {
  let sy = null;
  const tl = document.querySelector(".timeline");
  tl.addEventListener("pointerdown", e => { sy = e.target === tl || e.target.matches(".tl-row, .tl-controls, .ticks") ? e.clientY : null; });
  tl.addEventListener("pointerup", e => { if (sy !== null && e.clientY - sy > 40) setTimelineHidden(true); sy = null; });
  $("tlShow").addEventListener("pointerdown", e => { sy = e.clientY; });
  $("tlShow").addEventListener("pointermove", e => { if (sy !== null && sy - e.clientY > 24) { sy = null; setTimelineHidden(false); } });
})();
$("todayBtn").addEventListener("click", () => { stopPlay(); setYear(TODAY, { exact: true }); });
function toggleTilt() {
  const tilted = map.getPitch() > 10;
  map.easeTo({ pitch: tilted ? 0 : 60, duration: 1200 });
  $("tiltBtn").setAttribute("aria-pressed", String(!tilted));
}
map.on("pitchend", () => { $("tiltBtn").setAttribute("aria-pressed", String(map.getPitch() > 10)); updateTerrain(); });
map.on("pitchstart", () => { if (!state.deep) updateTerrain(true); });
// 3D terrain only while the globe is tilted: in a flat, top-down view it adds nothing but redraw flicker
let terrainOn = false;
function updateTerrain(tilting) {
  const want = !state.deep && (tilting || map.getPitch() > 5);
  if (want === terrainOn) return;
  terrainOn = want;
  try { map.setTerrain(want ? { source: "dem", exaggeration: 1.4 } : null); } catch {}
}

/* ---------- Playback ---------- */
let raf = 0, last = 0;
function tick(ts) {
  if (!state.playing) return;
  const dt = last ? Math.min(100, ts - last) : 16; last = ts;
  // a continuous playhead; the displayed year snaps, the playhead doesn't
  state.playPos = Math.min(1, state.playPos + dt * +$("speed").value * 0.000012);
  setYear(posToYear(state.playPos));
  if (state.playPos >= 1) { setYear(TODAY, { exact: true }); stopPlay(); return; }
  raf = requestAnimationFrame(tick);
}
function startPlay() {
  if (state.year >= TODAY) setYear(-3000, { exact: true });
  state.playPos = yearToPos(state.year);
  state.playing = true; last = 0; $("play").textContent = "❚❚"; $("play").setAttribute("aria-label", "Pause");
  raf = requestAnimationFrame(tick);
}
function stopPlay() { state.playing = false; cancelAnimationFrame(raf); $("play").textContent = "▶"; $("play").setAttribute("aria-label", "Play through time"); }
$("play").addEventListener("click", () => state.playing ? stopPlay() : startPlay());

/* ---------- Exploring: hover and click on historical regions ---------- */
const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "hover-pop", offset: 10 });
// Re-filtering a layer makes MapLibre redraw it, so only do it when the hovered region actually changes, and not while dragging
let hovered = "";
function setHovered(name) {
  if (name === hovered) return;
  hovered = name;
  map.setFilter("b-hover", ["==", ["get", "NAME"], name]);
}
map.on("mousemove", "b-fill", e => {
  if (map.isMoving()) return;
  const f = e.features && e.features[0]; if (!f) return;
  map.getCanvas().style.cursor = "pointer";
  setHovered(f.properties.NAME);
  pop.setLngLat(e.lngLat).setText(f.properties.NAME).addTo(map);
});
map.on("mouseleave", "b-fill", () => { map.getCanvas().style.cursor = ""; setHovered(""); pop.remove(); });
map.on("movestart", () => { pop.remove(); });
map.on("click", "b-fill", e => {
  const f = e.features && e.features[0]; if (!f) return;
  const p = f.properties, by = state.borderYear;
  $("pYear").textContent = `${fmtYear(by).n} ${fmtYear(by).s}`.trim() + " · " + (PRECISION[p.BORDERPRECISION] || "approximate");
  $("pName").textContent = p.NAME;
  const ruler = p.SUBJECTO && p.SUBJECTO !== p.NAME ? `Ruled by or part of ${p.SUBJECTO}.` : (p.PARTOF && p.PARTOF !== p.NAME ? `Part of ${p.PARTOF}.` : "Independent in this era.");
  $("pSub").textContent = ruler;
  state.selected = { kind: "region", name: p.NAME, text: `${p.NAME}, a region on a historical map of ${fmtLabel(by)}. ${ruler}${p.SUBJECTO && p.SUBJECTO !== p.NAME ? "" : ""} Border precision: ${PRECISION[p.BORDERPRECISION] || "approximate"}` };
  $("pLink").href = "https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(p.NAME);
  $("place").hidden = false;
  fillSummary(p.NAME, true);
});
map.on("click", "old-dot", e => { const m = MAPS.find(x => x.id === e.features[0].properties.id); if (m) goToMap(m); });
map.on("mouseenter", "old-dot", () => map.getCanvas().style.cursor = "pointer");
map.on("mouseleave", "old-dot", () => map.getCanvas().style.cursor = "");
$("closePlace").addEventListener("click", () => $("place").hidden = true);

/* ---------- History: what happened, year by year and day by day ---------- */
const WIKI = "https://en.wikipedia.org";
const wikiApi = params => fetch(WIKI + "/w/api.php?" + new URLSearchParams({ ...params, format: "json", formatversion: 2, origin: "*" }))
  .then(r => { if (!r.ok) throw new Error("Wikipedia answered " + r.status); return r.json(); });
const ordinal = n => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const wikiUrl = t => WIKI + "/wiki/" + encodeURIComponent(t.replace(/ /g, "_"));
const MONTH = "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTHS = MONTH.split("|");
const DATE_LINK = new RegExp(`^(?:(?:${MONTH})( \\d{1,2})?|\\d{1,2} (?:${MONTH})|AD \\d+|\\d+(?:s)?(?: BC| BCE)?|\\d+(?:st|nd|rd|th) (?:century|millennium)(?: BC)?|Common Era|Anno Domini)$`);
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Which article describes this moment best: the year itself, else its century or millennium.
function historyTitles(y) {
  if (y >= TODAY || y < -10000) return [];
  if (y >= 1000) return [String(y), `AD ${y}`];
  if (y >= 1) return [`AD ${y}`, `${ordinal(Math.ceil(y / 100))} century`];
  if (y >= -999) return [`${-y} BC`, `${ordinal(Math.ceil(-y / 100))} century BC`];
  if (y >= -3000) return [`${ordinal(Math.ceil(-y / 100))} century BC`, `${ordinal(Math.ceil(-y / 1000))} millennium BC`];
  return [`${ordinal(Math.ceil(-y / 1000))} millennium BC`];
}
const ageArticle = y => (AGES.find(a => y < a.before) || {}).w;

// "July 28", "28 July", or a month-only heading → {m, d}
function parseDay(date, group) {
  let m = date.match(new RegExp(`(${MONTH})\\s+(\\d{1,2})\\b`));
  if (m) return { m: MONTHS.indexOf(m[1]) + 1, d: +m[2] };
  m = date.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH})`));
  if (m) return { m: MONTHS.indexOf(m[2]) + 1, d: +m[1] };
  m = date.match(new RegExp(`(${MONTH})`)) || (MONTHS.includes(group) ? [null, group] : null);
  if (m) return { m: MONTHS.indexOf(m[1]) + 1, d: 0 };
  return { m: 0, d: 0 };
}
const dayKey = (m, d) => m * 100 + d;
function dayLabel(y, m, d, long = true) {
  let w = "";
  if (y >= 1583 && d) w = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + " ";
  return (long ? w : "") + (d ? `${d} ` : "") + MONTHS[m - 1];
}

const histCache = new Map();
function loadHistory(title) {
  if (!histCache.has(title)) {
    const p = fetchHistory(title);
    histCache.set(title, p);
    p.catch(() => histCache.delete(title));
  }
  return histCache.get(title);
}
const loadedHistories = new Map();       // every year article read this session, so search can look through them
async function fetchHistory(title) {
  const parsed = await parseYearArticle(title);
  if (!parsed) return null;
  await enrichEvents(parsed.items, parsed.year);
  const data = { title: parsed.title, events: parsed.items, year: parsed.year };
  loadedHistories.set(parsed.title, data);
  return data;
}
// Lines that are page furniture, not events: footnotes, citations, statistics rows, bare numbers
const NOT_AN_EVENT = [
  /^[\^↑]/,                                                        // footnote backlinks
  /Archived from the original|Retrieved \d|\bISBN\b|\bdoi:|\bp{1,2}\.\s?\d+\.?$/,     // citations
  /^[\p{L} .'’()-]{2,40}:\s*[\d.,\s%~≈-]+$/u,                       // "Africa: 106,000,000"
  /^\(?[\d.,\s–-]+\)?\.?$/,                                          // a bare number or range
];
// Read a Wikipedia year, century or millennium article into a list of events (no network beyond the article itself)
async function parseYearArticle(title) {
  const sec = await wikiApi({ action: "parse", page: title, prop: "sections|properties", redirects: 1 });
  if (sec.error) return null;
  if (sec.parse.properties && "disambiguation" in sec.parse.properties) return null;   // a page about the number, not the year
  const ev = sec.parse.sections.find(x => /^events/i.test(x.line));
  // Most year articles keep events under an "Events" heading; some (like 1453) list them by region straight away, up to "Births"
  const END = /^(births|deaths|references|see also|notes|sources|citations|footnotes|bibliography|works cited|further reading|external links)/i;
  const wholePage = !ev;
  if (wholePage && (!sec.parse.sections.length || END.test(sec.parse.sections[0].line))) return null;
  const res = await wikiApi(wholePage
    ? { action: "parse", page: title, prop: "text", redirects: 1, disableeditsection: 1, disablelimitreport: 1 }
    : { action: "parse", page: title, section: ev.index, prop: "text", redirects: 1, disableeditsection: 1, disablelimitreport: 1 });
  if (res.error) return null;
  const doc = new DOMParser().parseFromString(res.parse.text, "text/html");
  doc.querySelectorAll("sup, .mw-ref, style, .reflist, .refbegin, .mw-references-wrap, ol.references, .references, cite, .citation, .gallery, table, .thumb, figure, .hatnote, .shortdescription, .navbox, .metadata, .noprint, .sistersitebox, .side-box, .portalbox, .sidebar, .infobox, .mw-empty-elt").forEach(n => n.remove());
  const items = [];
  let group = "", started = !wholePage, stopped = false;
  const merged = new Set(), seenText = new Set();
  // Prose-style articles (like 1453) tell their events in paragraphs rather than bullets, so read those too
  doc.querySelectorAll(wholePage ? "h2, h3, h4, h5, li, p" : "h2, h3, h4, h5, li").forEach(el => {
    if (stopped) return;
    if (/^H\d$/.test(el.tagName)) {
      group = el.textContent.trim();
      if (wholePage && el.tagName === "H2") { if (END.test(group)) { stopped = true; return; } started = true; }
      if (/^(events|global events)$/i.test(group)) group = "";
      return;
    }
    if (!started) return;
    if (merged.has(el)) return;
    if (el.querySelector("ul, ol")) {
      // A bullet that introduces a list ("The satrapies are divided:") is one event with its clauses, not several fragments
      const own = el.cloneNode(true); own.querySelectorAll("ul, ol").forEach(n => n.remove());
      const intro = own.textContent.replace(/\s+/g, " ").trim();
      const kids = [...el.querySelectorAll(":scope > ul > li, :scope > ol > li")];
      if (intro.length > 40 && /[:;,]\s*$/.test(intro) && kids.length && kids.every(k => !k.querySelector("ul, ol") && k.textContent.trim().length < 120)) {
        kids.forEach(k => merged.add(k));
        pushItem(el, `${intro.replace(/[;,]\s*$/, ":")} ${kids.map(k => k.textContent.replace(/\s+/g, " ").trim().replace(/[;,.]$/, "")).join("; ")}.`);
      }
      return;                                                   // otherwise a parent bullet: its text becomes the date of its children
    }
    pushItem(el);
  });
  function pushItem(el, override) {
    let text = (override || el.textContent.replace(/\s+/g, " ").trim()).replace(/\s*[,;:]\s*$/, ".");
    if (text.length < 12 || NOT_AN_EVENT.some(rx => rx.test(text)) || seenText.has(text)) return;
    seenText.add(text);
    let date = "";
    const parentLi = el.parentElement && el.parentElement.closest("li");
    if (parentLi) { const c = parentLi.cloneNode(true); c.querySelectorAll("ul, ol").forEach(n => n.remove()); date = c.textContent.replace(/\s+/g, " ").replace(/[\s–—:-]+$/, "").trim(); }
    const m = text.match(/^(.{2,40}?)\s[–—]\s(.+)$/);
    if (m && !/[.!?]/.test(m[1])) { date = date ? `${date}, ${m[1]}` : m[1]; text = m[2]; }
    // Overviews start lines with the year: "1274 BCE: …", "c. 1300–1046 BC: …", "440s BC: …"
    const y = !m && text.match(/^((?:c\.\s*|ca\.\s*|circa\s*)?\d{1,4}s?(?:\s*[–-]\s*\d{1,4}s?)?\s*(?:BC|BCE|AD|CE)?)\s*:\s+(.+)$/i);
    if (y) { date = date ? `${date}, ${y[1]}` : y[1]; text = y[2].charAt(0).toUpperCase() + y[2].slice(1); }
    const links = [...el.querySelectorAll('a[href^="/wiki/"]')]
      .map(a => decodeURIComponent(a.getAttribute("href").slice(6)).split("#")[0].replace(/_/g, " "))
      .filter(t => !t.includes(":") && !DATE_LINK.test(t));
    if (date.length > 40) date = "";
    // In prose paragraphs the date sits inside the sentence ("On June 14, …")
    const when = date || (el.tagName === "P" ? (text.match(new RegExp(`\\b(?:${MONTH}) \\d{1,2}\\b|\\b\\d{1,2} (?:${MONTH})\\b`)) || [""])[0] : "");
    items.push({ group, date: date || when, text, links: [...new Set(links)].slice(0, 5), ...parseDay(when, group) });
  }
  const events = items.slice(0, 600);
  const year = /^\d{1,4}$/.test(res.parse.title) ? +res.parse.title : (res.parse.title.match(/^AD (\d+)$/) || [])[1] ? +res.parse.title.slice(3) : (res.parse.title.match(/^(\d+) BC$/) || [])[1] ? -res.parse.title.match(/^(\d+) BC$/)[1] : null;
  return { title: res.parse.title, items: events, year };
}

// Pin each event at its first linked place, and score it by how widely known its subjects are
// (the number of Wikipedia language editions that cover them, from Wikidata).
const BROAD = /\b(country|sovereign|state in|state of|empire|kingdom|republic|federation|union of|city|capital|town|village|region|continent|province|county|island|ocean|sea|river|mountain|political party|religion|language|ethnic group|people of|nation|organi[sz]ation|university|company|newspaper|sport|branch of|field of|concept|period|era|dynasty|government|armed forces|army|navy|military)\b/i;
const EVENTY = /\b(war|battle|siege|revolution|landing|treaty|massacre|uprising|rebellion|election|referendum|assassination|earthquake|eruption|tsunami|hurricane|cyclone|disaster|attack|bombing|invasion|offensive|campaign|crisis|riot|coup|independence|declaration|conference|expedition|mission|launch|flight|pandemic|epidemic|fire|flood|famine|revolt|genocide|surrender|armistice|summit|incident|accident|crash|sinking|discovery|founding|festival|olympics|games|strike|protest|trial|execution|coronation|abdication|murder)\b/i;
const PERSON = /\(born \d|\(\d{3,4}\s*[–-]\s*\d{3,4}\)|\b(politician|activist|president|prime minister|king|queen|emperor|empress|pope|general|writer|poet|actor|actress|singer|musician|painter|scientist|philosopher|businessman|explorer|footballer|lawyer)\b/i;
async function enrichEvents(events, year) {
  const titles = [...new Set(events.flatMap(e => e.links))];
  const coords = new Map(), qids = new Map(), size = new Map(), desc = new Map();
  const batches = [];
  for (let i = 0; i < titles.length; i += 50) batches.push(titles.slice(i, i + 50));
  await Promise.all(batches.map(async batch => {
    const r = await wikiApi({ action: "query", prop: "coordinates|pageprops|info", ppprop: "wikibase_item|wikibase-shortdesc", titles: batch.join("|"), redirects: 1, colimit: "max" }).catch(() => null);
    if (!r || !r.query) return;
    const alias = new Map();
    (r.query.normalized || []).forEach(n => alias.set(n.from, n.to));
    (r.query.redirects || []).forEach(n => alias.set(n.from, n.to));
    const byTitle = new Map((r.query.pages || []).map(pg => [pg.title, pg]));
    batch.forEach(t => {
      let k = t, hops = 0; while (alias.has(k) && hops++ < 3) k = alias.get(k);
      const pg = byTitle.get(k); if (!pg) return;
      if (pg.coordinates && pg.coordinates[0]) coords.set(t, { at: [pg.coordinates[0].lon, pg.coordinates[0].lat], page: k });
      if (pg.pageprops && pg.pageprops.wikibase_item) qids.set(t, pg.pageprops.wikibase_item);
      if (pg.length) size.set(t, pg.length);
      if (pg.pageprops && pg.pageprops["wikibase-shortdesc"]) desc.set(t, pg.pageprops["wikibase-shortdesc"]);
    });
  }));
  const ids = [...new Set(qids.values())], reach = new Map();
  const idBatches = [];
  for (let i = 0; i < ids.length; i += 50) idBatches.push(ids.slice(i, i + 50));
  await Promise.all(idBatches.map(async batch => {
    const r = await fetch("https://www.wikidata.org/w/api.php?" + new URLSearchParams({ action: "wbgetentities", ids: batch.join("|"), props: "sitelinks", format: "json", origin: "*" })).then(r => r.json()).catch(() => null);
    if (r && r.entities) Object.entries(r.entities).forEach(([id, ent]) => reach.set(id, Object.keys(ent.sitelinks || {}).length));
  }));
  let max = 1;
  events.forEach(e => {
    const hit = e.links.map(l => coords.get(l)).find(Boolean);
    if (hit) { e.at = hit.at; e.page = hit.page; }
    // Score each linked article: long, widely translated articles count for more; Wikipedia's one-line
    // description says whether it's a specific event (best when it names this very year), a person,
    // or something broad like a country or a topic, which is linked from everything and counts for little.
    const weight = (l, i) => {
      const d = desc.get(l) || "";
      let f = 1;
      const tenure = /\bfrom \d{3,4}\b|\(\d{3,4}\s*[–-]|\b(since|until) \d{3,4}/i.test(d);
      if (PERSON.test(d) || (tenure && !EVENTY.test(d))) f = 0.4;
      else if (year != null && d.includes(String(Math.abs(year)))) f = 2.4;
      else if (EVENTY.test(d) || EVENTY.test(l)) f = 1.5;
      else if (BROAD.test(d) || (coords.has(l) && (reach.get(qids.get(l)) || 0) >= 120)) f = 0.12;
      return Math.sqrt((size.get(l) || 0) / 1000) * (1 + Math.log10(1 + (reach.get(qids.get(l)) || 0))) * f * (i === 0 ? 1.15 : 1);
    };
    const ws = e.links.map(weight);
    e.raw = Math.max(0, ...ws);
    e.subject = e.links[ws.indexOf(e.raw)] || "";
    max = Math.max(max, e.raw);
  });
  events.forEach(e => e.imp = e.raw / max);
}

let histTimer = 0, histReq = 0, lastHistKey = "", lastHistAt = 0;
function scheduleHistory() {
  const titles = historyTitles(state.year);
  const key = titles.length ? titles.join("|") : state.year >= TODAY ? "today" : "deep:" + nearbyMilestones(state.year).map(m => m.t).join("|");
  if (key === lastHistKey) return;
  clearTimeout(histTimer);
  const wait = state.playing ? Math.max(0, 2500 - (Date.now() - lastHistAt)) : 450;
  histTimer = setTimeout(() => { lastHistKey = key; lastHistAt = Date.now(); showHistory(state.year); }, wait);
}
function setPins(features) { map.getSource("events").setData({ type: "FeatureCollection", features }); }
async function showHistory(y) {
  const id = ++histReq, el = $("tab-history");
  state.history = null; state.deepMilestones = null;
  el.innerHTML = `<div class="hist-head"><span class="tag">History</span><h3>${fmtLabel(y)}</h3><span class="ctx">Looking up what happened…</span></div>`;
  setPins([]);
  if (y >= TODAY) { el.querySelector(".ctx").textContent = "Drag the timeline back to see what happened at any moment, from the Big Bang to yesterday."; renderMilestoneList(el, nearbyMilestones(y)); panelHooks.forEach(h => h(el)); return; }
  const titles = historyTitles(y);
  if (!titles.length) { await showDeepHistory(y, id); return; }
  let data = null, failed = false;
  for (const t of titles) { data = await loadHistory(t).catch(() => { failed = true; return null; }); if (id !== histReq) return; if (data && data.events.length) break; }
  if (!data || !data.events.length) { await showDeepHistory(y, id, failed); return; }
  data.year = y;
  data.exact = data.title === String(y) || data.title === `AD ${y}` || data.title === `${-y} BC`;
  if (data.exact && !data.boosted) {
    data.boosted = true;
    MILESTONES.filter(ms => ms.y === y && ms.md).forEach(ms => {
      const [m, d] = ms.md.split("-").map(Number);
      const words = ms.w.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      data.events.forEach(e => { if (e.m === m && e.d === d && (e.links.some(l => l.toLowerCase().includes(words[0] || "~")) || e.text.toLowerCase().includes(words[0] || "~"))) e.imp = Math.max(e.imp, 1.05); });
    });
  }
  state.history = data;
  state.showAll = false;
  if (state.pendingDay) {
    const [m, d] = state.pendingDay.split("-").map(Number);
    state.pendingDay = null;
    if (data.events.some(e => e.m === m && e.d === d)) { state.day = { m, d }; updateDayReadout(); }
  }
  renderHistory();
}

function renderHistory() {
  const data = state.history, el = $("tab-history"), y = data.year;
  const located = data.events.filter(e => e.at).length;
  const dated = data.events.filter(e => e.m && e.d);
  el.innerHTML = "";
  const head = document.createElement("div");
  head.className = "hist-head";
  head.innerHTML = `<span class="tag">History</span><h3></h3><span class="ctx"></span><a target="_blank" rel="noopener"></a>`;
  head.querySelector("h3").textContent = fmtLabel(y);
  head.querySelector(".ctx").textContent = `${data.events.length} events${data.exact ? "" : ` from ${data.title}`} · ${located} on the globe · ranked by how widely known they are`;
  head.querySelector("a").href = wikiUrl(data.title);
  head.querySelector("a").textContent = `Wikipedia: ${data.title} ↗`;
  el.appendChild(head);

  const landmarks = MILESTONES.filter(ms => ms.y === y);
  if (landmarks.length) { const h = document.createElement("h2"); h.textContent = "On the grand timeline"; el.appendChild(h); landmarks.forEach(ms => el.appendChild(milestoneRow(ms))); }

  // A calendar of the year: brighter squares mark days with bigger events
  if (data.exact && dated.length >= 3) {
    const best = new Map();
    dated.forEach(e => best.set(dayKey(e.m, e.d), Math.max(best.get(dayKey(e.m, e.d)) || 0, e.imp)));
    const cal = document.createElement("div");
    cal.className = "cal";
    cal.setAttribute("aria-label", "Days of the year with events");
    MONTHS.forEach((name, mi) => {
      const row = document.createElement("div"); row.className = "row";
      row.innerHTML = `<b>${name.slice(0, 3)}</b>`;
      for (let d = 1; d <= 31; d++) {
        const b = document.createElement("button"); b.type = "button";
        const v = best.get(dayKey(mi + 1, d));
        if (d > DAYS_IN[mi]) b.className = "void";
        else if (v != null) {
          b.className = "has";
          b.style.background = `color-mix(in srgb, var(--accent) ${Math.round(28 + 72 * Math.sqrt(v))}%, transparent)`;
          b.title = `${dayLabel(y, mi + 1, d)}: ${dated.filter(e => e.m === mi + 1 && e.d === d).length} event(s)`;
          b.addEventListener("click", () => selectDay(mi + 1, d, true));
          if (state.day && state.day.m === mi + 1 && state.day.d === d) b.classList.add("sel");
        } else b.disabled = true;
        row.appendChild(b);
      }
      cal.appendChild(row);
    });
    el.appendChild(cal);
    const lg = document.createElement("div"); lg.className = "cal-legend";
    lg.innerHTML = `<span>${dated.length} dated events · ${new Set(dated.map(e => dayKey(e.m, e.d))).size} days</span><span>[ ] step days</span>`;
    el.appendChild(lg);
  }

  if (state.day) {
    const { m, d } = state.day;
    const nav = document.createElement("div"); nav.className = "daynav";
    nav.innerHTML = `<button type="button" data-dir="-1" aria-label="Previous day with events">◂</button><span class="lbl"></span><button type="button" data-dir="1" aria-label="Next day with events">▸</button><button type="button" data-all>Whole year</button>`;
    nav.querySelector(".lbl").textContent = dayLabel(y, m, d);
    nav.querySelectorAll("[data-dir]").forEach(b => b.addEventListener("click", () => stepDay(+b.dataset.dir)));
    nav.querySelector("[data-all]").addEventListener("click", () => { state.day = null; updateDayReadout(); renderHistory(); });
    el.appendChild(nav);
    const onDay = rankDiverse(data.events.map((e, i) => [e, i]).filter(([e]) => e.m === m && e.d === d));
    const h = document.createElement("h2"); h.textContent = uiText("day", "Most impactful first"); el.appendChild(h);
    onDay.forEach(([e, i], n) => el.appendChild(eventRow(e, i, true, n + 1)));
    const month = data.events.map((e, i) => [e, i]).filter(([e]) => e.m === m && !e.d);
    if (month.length) { const h2 = document.createElement("h2"); h2.textContent = `Also in ${MONTHS[m - 1]}, day unknown`; el.appendChild(h2); month.forEach(([e, i]) => el.appendChild(eventRow(e, i))); }
    setPins(onDay.filter(([e]) => e.at).map(([e, i]) => pinFeature(e, i)));
    panelHooks.forEach(h => h(el));
  } else {
    const top = rankDiverse(data.events.map((e, i) => [e, i])).slice(0, 10);
    const h = document.createElement("h2"); h.textContent = uiText("top", l => `Most impactful of ${l}`)(fmtLabel(y)); el.appendChild(h);
    top.forEach(([e, i], n) => el.appendChild(eventRow(e, i, true, n + 1)));
    if (!state.showAll) {
      const more = document.createElement("button");
      more.type = "button"; more.className = "more";
      more.textContent = `Show all ${data.events.length} events in order`;
      more.addEventListener("click", () => { state.showAll = true; renderHistory(); });
      el.appendChild(more);
    } else {
      const h2 = document.createElement("h2"); h2.textContent = "Everything, in order"; el.appendChild(h2);
      let group = null;
      data.events.forEach((e, i) => {
        if (e.group !== group) { group = e.group; if (group) { const g = document.createElement("h2"); g.textContent = group; el.appendChild(g); } }
        el.appendChild(eventRow(e, i));
      });
    }
    setPins(data.events.map((e, i) => e.at && pinFeature(e, i)).filter(Boolean));
    panelHooks.forEach(h => h(el));
  }
}
// Rank by impact, but let each subject (a person, a war) lead only once before others get a turn
function rankDiverse(pairs) {
  const seen = new Map();
  return pairs.slice().sort((a, b) => b[0].imp - a[0].imp).map(([e, i]) => {
    const n = seen.get(e.subject) || 0; seen.set(e.subject, n + 1);
    return [e, i, e.imp * Math.pow(0.55, n)];
  }).sort((a, b) => b[2] - a[2]).map(([e, i]) => [e, i]);
}
const pinFeature = (e, i) => ({ type: "Feature", id: i, properties: { i, imp: e.imp || 0, text: e.text.length > 90 ? e.text.slice(0, 88) + "…" : e.text }, geometry: { type: "Point", coordinates: e.at } });
function eventRow(e, i, showImpact = false, rank = 0) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "ev" + (rank ? " ranked" : ""); b.dataset.i = i;
  b.innerHTML = (rank ? `<span class="rank">${rank}</span>` : "") + `<span class="d"></span><span><span class="x2"></span></span><span class="pin${e.at ? "" : " no"}"></span>`;
  b.querySelector(".d").textContent = e.m && e.d ? dayLabel(state.history.year, e.m, e.d, false) : e.date;
  b.querySelector(".x2").textContent = e.text;
  if (showImpact) { const bar = document.createElement("span"); bar.className = "imp"; bar.style.width = Math.max(8, Math.round(Math.min(1, e.imp) * 100)) + "%"; b.querySelector(".x2").parentElement.appendChild(bar); }
  b.addEventListener("click", () => { if (e.m && e.d && state.history.exact && !(state.day && state.day.m === e.m && state.day.d === e.d)) selectDay(e.m, e.d, false); openEvent(state.history, i); });
  return b;
}
function selectDay(m, d, fly) {
  if (!state.history) { state.pendingDay = `${m}-${d}`; return; }
  state.day = { m, d };
  updateDayReadout();
  renderHistory();
  if (!fly) return;
  const pts = state.history.events.filter(e => e.m === m && e.d === d && e.at).map(e => e.at);
  if (pts.length === 1) map.flyTo({ center: pts[0], zoom: Math.max(map.getZoom(), 4), duration: 1800, essential: true });
  else if (pts.length > 1) {
    const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    map.fitBounds(b, { padding: { top: 120, bottom: 220, left: 360, right: 80 }, maxZoom: 5, duration: 1800 });
  }
}
function stepDay(dir) {
  const data = state.history; if (!data || !data.exact) return;
  const days = [...new Set(data.events.filter(e => e.m && e.d).map(e => dayKey(e.m, e.d)))].sort((a, b) => a - b);
  if (!days.length) return;
  const cur = state.day ? dayKey(state.day.m, state.day.d) : (dir > 0 ? 0 : 1300);
  const next = dir > 0 ? days.find(k => k > cur) : [...days].reverse().find(k => k < cur);
  if (next != null) selectDay(Math.floor(next / 100), next % 100, true);
}
function updateDayReadout() {
  const el = $("day");
  if (state.day && state.year >= 1) { el.textContent = dayLabel(state.year, state.day.m, state.day.d); el.hidden = false; }
  else el.hidden = true;
}

let activeEv = null;
// The year an event belongs to: the article's own year, or (in century and millennium overviews) the year in its date or heading
function eventYear(e, data) {
  if (data.exact && data.year != null) return data.year;
  const m = `${e.date || ""} ${e.group || ""}`.match(/\b(\d{1,4})s?\s*(BC|BCE)?\b/i);
  if (!m) return null;
  const n = +m[1];
  return m[2] ? -n : (/\bBC\b/i.test(data.title) ? -n : n);
}
function openEvent(data, i) {
  const e = data.events[i];
  // Take the timeline to the event's own moment: its year, and its day when the date is known
  const y = eventYear(e, data);
  if (y != null && y !== state.year && y >= BIG_BANG && y <= TODAY) {
    if (e.m && e.d) state.pendingDay = `${e.m}-${e.d}`;
    setYear(y, { exact: true });
  } else if (data.exact && e.m && e.d && !(state.day && state.day.m === e.m && state.day.d === e.d) && state.history === data) {
    state.day = { m: e.m, d: e.d };
    updateDayReadout();
    renderHistory();
  }
  if (activeEv != null) map.setFeatureState({ source: "events", id: activeEv }, { active: false });
  document.querySelectorAll(".ev.active").forEach(n => n.classList.remove("active"));
  const btn = document.querySelector(`.ev[data-i="${i}"]`); if (btn) { btn.classList.add("active"); btn.scrollIntoView({ block: "nearest" }); }
  stopPlay();
  // Go to where it happened. A pin on a specific place (a battle, a city) earns a closer look than one on a whole country.
  if (e.at) {
    activeEv = i;
    map.setFeatureState({ source: "events", id: i }, { active: true });
    const specific = e.page && e.page === e.subject;          // the event's own article has coordinates: a battle, a building, a city
    map.flyTo({ center: e.at, zoom: Math.max(map.getZoom(), specific ? 6.5 : 4.5), pitch: 0, duration: 2500, essential: true });
  }
  const ey = y != null ? y : data.year;
  const when = ey == null ? (e.date || data.title) : e.m && e.d ? `${dayLabel(ey, e.m, e.d)} ${fmtLabel(ey)}` : (e.date && !/\d{3,4}/.test(e.date) ? `${e.date} · ${fmtLabel(ey)}` : fmtLabel(ey));
  // Explain it with the event's own subject (its most important linked article), not just the place it's pinned to
  const topic = e.subject || e.page || e.links[0];
  $("pYear").textContent = when;
  // Without a linked subject, title the card with the event's own opening words rather than a placeholder
  const headline = e.text.split(/(?<=\w)[.;:](?=\s|$)/)[0].replace(/^(?:On|In|At|By) [^,]{1,30}, /, "").slice(0, 80);
  $("pName").textContent = topic || headline;
  $("pSub").innerHTML = "";
  const t = document.createElement("span"); t.className = "event-text"; t.textContent = e.text; $("pSub").appendChild(t);
  const where = document.createElement("span"); where.className = "where";
  where.textContent = e.at ? `📍 ${e.page || "On the map"}` : "No location on the map for this event";
  $("pSub").appendChild(where);
  $("place").hidden = false;
  state.selected = { kind: "event", name: topic || headline, text: `${when}: ${e.text}${e.page ? ` (located at ${e.page})` : ""}` };
  if (topic) fillSummary(topic, false, [...new Set([topic, ...e.links])]);
  else { $("pImg").hidden = true; $("pExtract").hidden = true; $("pLink").href = wikiUrl(data.title); }
}

/* ---------- The grand timeline: landmarks across all of time ---------- */
function msDate(ms) {
  const f = fmtLabel(ms.y);
  if (!ms.md) return f;
  const [m, d] = ms.md.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${f}`;
}
function nearbyMilestones(y) {
  let i = -1; MILESTONES.forEach((m, j) => { if (m.y <= y) i = j; });
  return MILESTONES.slice(Math.max(0, i - 3), i + 4);
}
function milestoneRow(ms) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "ms-row";
  b.innerHTML = `<span class="d"></span><span><span class="t"></span><span class="s"></span></span><span class="pin${ms.at ? "" : " no"}"></span>`;
  b.querySelector(".d").textContent = msDate(ms);
  b.querySelector(".t").textContent = ms.t;
  b.querySelector(".s").textContent = ms.d;
  b.addEventListener("click", () => openMilestone(ms));
  return b;
}
function renderMilestoneList(el, list) {
  const h = document.createElement("h2"); h.textContent = "On the grand timeline"; el.appendChild(h);
  let placed = false;
  list.forEach(ms => {
    if (!placed && ms.y > state.year) { const here = document.createElement("div"); here.className = "here"; here.textContent = `You are here · ${fmtLabel(state.year)}`; el.appendChild(here); placed = true; }
    el.appendChild(milestoneRow(ms));
  });
  if (!placed) { const here = document.createElement("div"); here.className = "here"; here.textContent = `You are here · ${fmtLabel(state.year)}`; el.appendChild(here); }
}
async function pinMilestones(list) {
  const withAt = list.filter(ms => ms.at);
  const pts = state.deep && state.paleoMa ? await reconstructPoints(withAt.map(ms => ms.at), state.paleoMa) : withAt.map(ms => ms.at);
  if (state.deepMilestones !== list) return;
  setPins(withAt.map((ms, j) => ({ type: "Feature", id: 1000 + MILESTONES.indexOf(ms), properties: { ms: MILESTONES.indexOf(ms), imp: ms.k / 3, text: ms.t }, geometry: { type: "Point", coordinates: pts[j] } })));
}
async function showDeepHistory(y, id, failed = false) {
  const el = $("tab-history");
  const art = ageArticle(y) || historyTitles(y)[0];
  const sum = art ? await summary(art).catch(() => { failed = true; return null; }) : null;
  if (id !== histReq) return;
  el.querySelector(".ctx").textContent = sum ? sum.extract : failed ? "Couldn't reach Wikipedia just now." : "No event list exists for this moment.";
  if (!sum && failed) {
    const retry = document.createElement("button");
    retry.type = "button"; retry.className = "retry"; retry.textContent = "Try again";
    retry.addEventListener("click", () => { lastHistKey = ""; showHistory(state.year); });
    el.querySelector(".hist-head").appendChild(retry);
  }
  if (sum) el.querySelector(".hist-head").insertAdjacentHTML("beforeend", `<a href="${wikiUrl(sum.title)}" target="_blank" rel="noopener">Read “${sum.title}” on Wikipedia ↗</a>`);
  const list = nearbyMilestones(y);
  renderMilestoneList(el, list);
  state.deepMilestones = list;
  pinMilestones(list);
  panelHooks.forEach(h => h(el));
}
async function openMilestone(ms) {
  stopPlay();
  if (ms.md) state.pendingDay = ms.md;
  if (state.year !== ms.y) setYear(ms.y, { exact: true });
  $("pYear").textContent = msDate(ms);
  $("pName").textContent = ms.t;
  $("pSub").innerHTML = "";
  const t = document.createElement("span"); t.className = "event-text"; t.textContent = ms.d; $("pSub").appendChild(t);
  $("place").hidden = false;
  state.selected = { kind: "landmark", name: ms.t, text: `${msDate(ms)}: ${ms.d}` };
  fillSummary(ms.w, true);
  if (ms.at) {
    let at = ms.at;
    if (ms.y < -5e6 && ms.y >= -1000e6) at = (await reconstructPoints([ms.at], nearestMa(-ms.y / 1e6)))[0];
    map.flyTo({ center: at, zoom: ms.y < -5e6 ? 2.2 : Math.max(4, Math.min(6, map.getZoom() + 2)), pitch: 0, duration: 2600, essential: true });
  } else if (ms.y < -5e6) map.flyTo({ zoom: 1.4, pitch: 0, duration: 1800, essential: true });
}
map.on("click", "ev-dot", e => {
  const p = e.features[0].properties;
  if (p.ms != null) openMilestone(MILESTONES[p.ms]);
  else if (state.history) openEvent(state.history, p.i);
});
map.on("mouseenter", "ev-dot", e => { map.getCanvas().style.cursor = "pointer"; pop.setLngLat(e.features[0].geometry.coordinates).setText(e.features[0].properties.text).addTo(map); });
map.on("mouseleave", "ev-dot", () => { map.getCanvas().style.cursor = ""; pop.remove(); });

// Wikipedia summary (extract + picture) for a page, falling back to search for names like "Empire of Alexander".
const sumCache = new Map();
async function summary(title, search = false) {
  const key = title + (search ? "?s" : "");
  if (sumCache.has(key)) return sumCache.get(key);
  // a missing article is an answer (null); a refused or failed request is an error, so it isn't cached and can be retried
  const get = t => fetch(WIKI + "/api/rest_v1/page/summary/" + encodeURIComponent(t.replace(/ /g, "_"))).then(r => r.ok ? r.json() : r.status === 404 ? null : Promise.reject(new Error("Wikipedia answered " + r.status)));
  let s = await get(title);
  if ((!s || s.type === "disambiguation") && search) {
    // Accept a search result only if its title covers nearly every meaningful word of the name
    const words = t => t.toLowerCase().replace(/[()]/g, "").split(/[\s,-]+/).filter(w => w.length > 2 && !/^(the|and|of)$/.test(w)).map(w => w.replace(/s$/, ""));
    const want = words(title);
    const r = await wikiApi({ action: "query", list: "search", srsearch: title, srlimit: 5 }).catch(() => null);
    const hit = (r && r.query && r.query.search || []).find(h => { const got = words(h.title); return want.filter(w => got.some(g => g.startsWith(w) || w.startsWith(g))).length >= Math.max(1, want.length - (want.length > 3 ? 1 : 0)); });
    s = hit ? await get(hit.title) : null;
    if (s && s.type === "disambiguation") s = null;
  }
  sumCache.set(key, s);
  return s;
}
let sumReq = 0;
// The first of these articles that has a lead picture, so an event shows a relevant image even when its subject has none
const picCache = new Map();
async function firstPicture(titles) {
  const key = titles.join("|");
  if (!picCache.has(key)) picCache.set(key, wikiApi({ action: "query", prop: "pageimages", piprop: "thumbnail", pithumbsize: 640, titles: titles.slice(0, 20).join("|"), redirects: 1 })
    .then(r => {
      if (!r.query) return null;
      const alias = new Map();
      (r.query.normalized || []).forEach(n => alias.set(n.from, n.to));
      (r.query.redirects || []).forEach(n => alias.set(n.from, n.to));
      const byTitle = new Map((r.query.pages || []).map(p => [p.title, p]));
      for (const t of titles) { let k = t, hops = 0; while (alias.has(k) && hops++ < 3) k = alias.get(k); const p = byTitle.get(k); if (p && p.thumbnail) return { src: p.thumbnail.source, from: p.title }; }
      return null;
    }).catch(() => null));
  return picCache.get(key);
}
async function fillSummary(title, search, pictureFrom) {
  const id = ++sumReq;
  $("place").scrollTop = 0;
  $("pImg").hidden = true; $("pExtract").hidden = false; $("pExtract").textContent = "Loading…";
  const s = await summary(title, search).catch(() => null);
  if (id !== sumReq) return;
  $("pLink").textContent = "Read more on Wikipedia ↗";
  $("pLink").href = "https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(title);
  $("aiNote").hidden = true;
  if (!s) {
    $("pExtract").textContent = "Writing a description…";
    const context = (state.selected && state.selected.text) || `${fmtLabel(state.year)}`;
    const text = typeof describeWithAI === "function" ? await describeWithAI(title, `${context}. Year on the map: ${fmtLabel(state.year)}.`) : null;
    if (id !== sumReq) return;
    if (text) { $("pExtract").textContent = text; $("aiNote").hidden = false; $("pLink").textContent = "Search Wikipedia ↗"; }
    else $("pExtract").textContent = (state.selected && state.selected.text) || "No description is available for this yet.";
  }
  else $("pExtract").textContent = s.extract;
  if (s && s.thumbnail && s.thumbnail.source) { $("pImg").src = (s.originalimage && s.originalimage.width <= 1200 ? s.originalimage.source : s.thumbnail.source); $("pImg").alt = s.title; $("pImg").hidden = false; }
  else if (pictureFrom && pictureFrom.length) {
    const pic = await firstPicture(pictureFrom);
    if (id !== sumReq) return;
    if (pic) { $("pImg").src = pic.src; $("pImg").alt = pic.from; $("pImg").hidden = false; }
  }
  if (!s) return;
  $("pLink").href = (s.content_urls && s.content_urls.desktop.page) || wikiUrl(s.title);
  $("pLink").textContent = "Read more on Wikipedia ↗";
}

/* ---------- Remember where you were (survives reloads and live updates) ---------- */
let saveTimer = 0;
function saveView() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { const c = map.getCenter(); localStorage.setItem("palimpsest:view", JSON.stringify({ year: state.year, center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() })); } catch {}
  }, 400);
}
map.on("moveend", saveView);
function savedView() { try { return JSON.parse(localStorage.getItem("palimpsest:view")); } catch { return null; } }

/* ---------- Drawer & keys ---------- */
$("closeDrawer").addEventListener("click", () => $("drawer").classList.add("closed"));
if (innerWidth < 760) $("drawer").classList.add("closed");   // on a phone the panel would cover the globe and the year
let wasWide = innerWidth >= 760;
addEventListener("resize", () => {   // folding a foldable (iPhone Duo) turns a tablet-sized screen into a phone mid-session: give the globe back the same way
  const wide = innerWidth >= 760;
  if (wasWide && !wide) { $("drawer").classList.add("closed"); setTimelineMore(false); }
  wasWide = wide;
});
$("openDrawer").addEventListener("click", () => $("drawer").classList.remove("closed"));
document.addEventListener("keydown", e => {
  if (e.target.matches("input:not([type=range]), textarea, select")) return;
  if (e.key === " " && !e.target.matches("button")) { e.preventDefault(); state.playing ? stopPlay() : startPlay(); }
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.target.matches("input")) {
    e.preventDefault(); stopPlay();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    if (state.year >= 1500) setYear(Math.min(TODAY, state.year + dir * (e.shiftKey ? 10 : 1)), { exact: true });
    else setYear(posToYear(Math.max(0, Math.min(1, yearToPos(state.year) + dir * 0.004))));
  }
  if (e.key === "[" || e.key === "]") { e.preventDefault(); stepDay(e.key === "]" ? 1 : -1); }
  if (e.key === "Escape") $("drawer").classList.toggle("closed");
  if (e.key === "t" || e.key === "T") toggleTilt();
  if (e.key === "h" || e.key === "H") setTimelineHidden(!document.querySelector(".timeline").classList.contains("tucked"));
});

/* ---------- Boot ---------- */
buildRail();
setAppearance();
darkQuery.addEventListener("change", () => { if (themeMode() === "auto") setAppearance(); });
const THEME_LABELS = { auto: ["◐", "Auto"], light: ["☀", "Light"], dark: ["☾", "Dark"] };
function renderThemeBtn() {
  const [icon, name] = THEME_LABELS[themeMode()];
  $("themeBtn").innerHTML = `<b aria-hidden="true">${icon}</b>${name}`;
  $("themeBtn").setAttribute("aria-label", `Appearance: ${name}. Click to change.`);
}
$("themeBtn").addEventListener("click", () => {
  const order = ["auto", "light", "dark"], next = order[(order.indexOf(themeMode()) + 1) % 3];
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  renderThemeBtn(); setAppearance();
});
renderThemeBtn();
map.on("load", applyTheme);
buildTicks();
renderTours();
// A link from the Philosophy or Art pages (index.html?year=-430&at=23.7,38,6) opens at that moment and place
const linked = (() => {
  const q = new URLSearchParams(location.search), y = parseFloat(q.get("year")), at = (q.get("at") || "").split(",").map(Number);
  if (!isFinite(y)) return null;
  history.replaceState(null, "", location.pathname + location.hash);
  return { year: y, center: at.length >= 2 && at.every(isFinite) ? [at[0], at[1]] : null, zoom: at[2] || 4 };
})();
const restored = savedView();
if (linked) {
  if (linked.center) map.jumpTo({ center: linked.center, zoom: linked.zoom, pitch: 0, bearing: 0 });
  setYear(linked.year, { exact: true });
} else if (restored && typeof restored.year === "number") {
  map.jumpTo({ center: restored.center, zoom: restored.zoom, pitch: restored.pitch, bearing: restored.bearing });
  setYear(restored.year, { exact: true });
} else setYear(1900);
map.on("load", () => { state.ready = true; setYear(state.year, { exact: true }); updateTerrain(); resumeTour(); });
function placeOverlays() {
  const tl = document.querySelector(".timeline");
  const h = (tl.classList.contains("tucked") ? $("tlShow").offsetHeight : tl.offsetHeight) + 28;
  $("caption").style.bottom = h + "px";
  const place = $("place");
  if (innerWidth >= 760) place.style.maxHeight = `${innerHeight - h - 28}px`; else place.style.maxHeight = "";   // card sits 14px from the top and stops 14px above the timeline
  const guide = document.getElementById("guide");
  if (guide && innerWidth >= 760) guide.style.bottom = h + "px";
  $("drawer").style.bottom = (innerWidth < 760 ? "auto" : h + "px");
  document.querySelectorAll(".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right").forEach(el => el.style.bottom = (h - 14) + "px");
}
addEventListener("resize", placeOverlays);
map.on("load", placeOverlays);
// keep the credits folded into the ⓘ button until asked for
map.on("load", () => document.querySelectorAll(".maplibregl-ctrl-attrib").forEach(el => el.classList.remove("maplibregl-compact-show")));
try { if (localStorage.getItem(TL_HIDDEN_KEY) === "1") setTimelineHidden(true, { save: false }); } catch {}
placeOverlays();
