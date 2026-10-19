"use strict";
// Palimpsest · Philosophy and Art pages: each era as a grand picture, with its people, questions or works, and topics to explore

const SUBJECT = document.body.dataset.subject;            // "philosophy" or "art"
const ERAS = SUBJECT === "art" ? ART_ERAS : PHILOSOPHY_ERAS;
const WIKI = "https://en.wikipedia.org";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------- Dates ---------- */
function fmtYear(y) {
  if (y >= 2026) return "today";
  if (y < 0) return (-y).toLocaleString("en") + " BC";
  return y < 1000 ? "AD " + y : String(y);
}
const fmtSpan = e => e.to >= 2026 ? `${fmtYear(e.from)} – today` : e.from < 0 && e.to < 0 ? `${(-e.from).toLocaleString("en")} – ${fmtYear(e.to)}` : `${fmtYear(e.from)} – ${fmtYear(e.to)}`;
const midYear = e => Math.round(e.to >= 2026 ? Math.max(e.from, 2000) : (e.from + e.to) / 2);

/* ---------- Thinkers of an era: alive during it and working near its region ---------- */
const RADIUS_KM = { 2: 20000, 3: 5000, 4: 3000, 5: 2000, 6: 1600 };
function km([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function thinkersOf(era) {
  const radius = RADIUS_KM[era.at[2]] || 3000;
  return THINKERS.filter(t => t.b <= era.to && t.d >= era.from && km(t.at, era.at) <= radius).sort((a, b) => a.b - b.b).slice(0, 12);
}
const lifeSpan = t => t.b < 0 && t.d < 0 ? `${-t.b}–${-t.d} BC` : t.b < 0 ? `${-t.b} BC–AD ${t.d}` : `${t.b}–${t.d >= 2026 ? "" : t.d}`;

/* ---------- Wikipedia ---------- */
const wikiApi = params => fetch(WIKI + "/w/api.php?" + new URLSearchParams({ ...params, format: "json", formatversion: 2, origin: "*" })).then(r => r.json());
// Lead pictures for a list of articles, in the order given, following redirects
async function pictures(titles, size) {
  const r = await wikiApi({ action: "query", prop: "pageimages", piprop: "thumbnail", pithumbsize: size, titles: titles.slice(0, 50).join("|"), redirects: 1 }).catch(() => null);
  const out = new Map();
  if (!r || !r.query) return out;
  const alias = new Map();
  (r.query.normalized || []).forEach(n => alias.set(n.from, n.to));
  (r.query.redirects || []).forEach(n => alias.set(n.from, n.to));
  const byTitle = new Map((r.query.pages || []).map(p => [p.title, p]));
  for (const t of titles) {
    let k = t, hops = 0; while (alias.has(k) && hops++ < 3) k = alias.get(k);
    const p = byTitle.get(k);
    if (p && p.thumbnail) out.set(t, p.thumbnail.source);
  }
  return out;
}
const sumCache = new Map();
function summary(title) {
  if (!sumCache.has(title)) sumCache.set(title, fetch(WIKI + "/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")))
    .then(r => r.ok ? r.json() : null).catch(() => null));
  return sumCache.get(title);
}

/* ---------- The time machine link ---------- */
function globeHref(year, at) { return `index.html?year=${Math.round(year)}&at=${at.map(n => +n.toFixed(3)).join(",")}`; }
// Turn on the matching layer so the globe opens showing this subject
document.addEventListener("click", e => {
  if (!e.target.closest('a[href^="index.html?"]')) return;
  try {
    const k = "palimpsest:layers", l = JSON.parse(localStorage.getItem(k)) || {};
    l[SUBJECT === "art" ? "art" : "thinkers"] = true;
    localStorage.setItem(k, JSON.stringify(l));
  } catch {}
});

/* ---------- Build the page ---------- */
const COPY = {
  philosophy: { tag: "Philosophy", h1: "The story of philosophy", p: `${ERAS.length} eras of people asking what is real, what we can know and how to live. Scroll through time, or pick an era above. Click any thinker or topic to read more.` },
  art: { tag: "Art", h1: "The story of art", p: `${ERAS.length} eras of people making pictures, buildings and objects, from Ice Age caves to today. Scroll through time, or pick an era above. Click any work or topic to read more.` },
}[SUBJECT];

function renderStrip() {
  $("strip").innerHTML = ERAS.map(e => `<a href="#${e.id}" data-id="${e.id}"><b>${esc(fmtYear(e.from))}</b><span>${esc(e.title)}</span></a>`).join("");
}
function renderEras() {
  const main = $("eras");
  main.innerHTML = `<header class="lede"><div class="tag">${COPY.tag}</div><h1>${COPY.h1}</h1><p>${esc(COPY.p)}</p></header>`;
  ERAS.forEach((e, i) => {
    const s = document.createElement("section");
    s.className = "era"; s.id = e.id;
    const people = SUBJECT === "philosophy" ? thinkersOf(e) : [];
    const left = SUBJECT === "philosophy"
      ? `<p class="intro">${esc(e.intro)}</p>
         <h4>The big questions</h4><ul class="questions">${e.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>`
      : `<p class="intro">${esc(e.intro)}</p>`;
    const right = SUBJECT === "philosophy"
      ? (people.length ? `<h4>Thinkers of the age</h4><ul class="people">${people.map(t => `<li><button type="button" data-thinker="${esc(t.n)}"><b>${esc(t.n)} <em>${esc(t.s)}</em></b><small>${esc(lifeSpan(t))}</small><i>${esc(t.i)}</i></button></li>`).join("")}</ul>` : "")
      : `<h4>Famous works</h4><div class="works">${e.works.map(w => `<button type="button" data-work="${esc(w)}"><div class="pic"><img alt="" loading="lazy" hidden></div><span>${esc(w.replace(/ \((?:painting|Leonardo|Michelangelo|Klimt|Picasso|Monet series|Sinai|Isfahan|sculpture)\)$/, ""))}</span></button>`).join("")}</div>`;
    s.innerHTML = `
      <div class="era-head"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="when">${esc(fmtSpan(e))}</span><h2>${esc(e.title)}</h2></div>
      <figure class="hero" data-empty="${esc(e.hero)}"><img alt="${esc(e.hero)}"><div class="shade"></div>
        <figcaption><button type="button" data-topic="${esc(e.hero)}">${esc(e.hero)}</button><span class="region">${esc(e.region)}</span></figcaption></figure>
      <div class="era-body ${SUBJECT}">
        <div>${left}
          <h4>Topics to explore</h4><div class="topics">${e.topics.map(t => `<button type="button" data-topic="${esc(t)}">${esc(t.replace(/ \((?:philosophy|Chinese philosophy|Plato|Augustine|Montaigne|book|Spinoza|Hobbes book)\)$/, ""))}</button>`).join("")}</div>
          <a class="globe" href="${globeHref(midYear(e), e.at)}">See ${esc(fmtYear(midYear(e)))} on the globe →</a>
        </div>
        <div>${right}</div>
      </div>`;
    s.dataset.index = i;
    main.appendChild(s);
  });
}

/* ---------- Pictures load as each era comes near the screen ---------- */
async function loadEraPictures(section) {
  if (section.dataset.loaded) return;
  section.dataset.loaded = "1";
  const e = ERAS[+section.dataset.index];
  const fig = section.querySelector(".hero"), img = fig.querySelector("img");
  const fallbacks = [e.hero, ...(e.works || []), ...e.topics];
  const big = await pictures(fallbacks, 1600);
  const src = fallbacks.map(t => big.get(t)).find(Boolean);
  if (src) {
    const from = fallbacks.find(t => big.get(t) === src);
    img.onload = () => img.classList.add("ready");
    img.src = src;
    if (from !== e.hero) { const b = fig.querySelector("figcaption button"); b.textContent = from; b.dataset.topic = from; }
  } else fig.classList.add("empty");
  if (e.works) {
    const small = await pictures(e.works, 480);
    section.querySelectorAll("[data-work]").forEach(b => {
      const u = small.get(b.dataset.work), im = b.querySelector("img");
      if (u) { im.src = u; im.hidden = false; return; }
      // No lead picture: try the article summary's, or leave an inked placeholder
      summary(b.dataset.work).then(x => { if (x && x.thumbnail) { im.src = x.thumbnail.source; im.hidden = false; } else b.querySelector(".pic").classList.add("none"); });
    });
  }
}
const nearObserver = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) loadEraPictures(en.target); }), { rootMargin: "120% 0px" });

/* ---------- The strip follows the reader ---------- */
let current = "";
function markCurrent(instant) {
  const line = 160;
  let best = null;
  document.querySelectorAll(".era").forEach(s => { if (s.getBoundingClientRect().top <= line) best = s; });
  const id = best ? best.id : "";
  if (id === current) return;
  current = id;
  document.querySelectorAll("#strip a").forEach(a => {
    const on = a.dataset.id === id;
    a.classList.toggle("on", on);
    if (on) { const strip = $("strip"); strip.scrollTo({ left: a.offsetLeft - strip.clientWidth / 2 + a.offsetWidth / 2, behavior: instant ? "instant" : "smooth" }); }
  });
  history.replaceState(null, "", id ? "#" + id : location.pathname);
}
let ticking = false;
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; markCurrent(); }); } }, { passive: true });

/* ---------- Reader card ---------- */
let readReq = 0, lastButton = null;
async function openReader({ title, tag, sub, year, at }) {
  const id = ++readReq;
  $("reader").hidden = false; $("reader").scrollTop = 0;
  $("rTag").textContent = tag || "";
  $("rTitle").textContent = title;
  $("rSub").textContent = sub || ""; $("rSub").hidden = !sub;
  $("rImg").hidden = true;
  $("rText").textContent = "Loading…";
  $("rLink").href = WIKI + "/wiki/Special:Search?search=" + encodeURIComponent(title);
  const setGlobe = (y, a) => { $("rGlobe").href = globeHref(y, a); $("rGlobe").textContent = `See ${fmtYear(Math.round(y))} on the globe →`; };
  setGlobe(year, at);
  const s = await summary(title);
  if (id !== readReq) return;
  if (!s || s.type === "disambiguation") { $("rText").textContent = "Wikipedia has no summary for this yet. Use the link below to search for it."; return; }
  $("rTitle").textContent = s.title.replace(/<[^>]+>/g, "");
  if (!sub && s.description) { $("rSub").textContent = s.description; $("rSub").hidden = false; }
  $("rText").textContent = s.extract || "";
  const pic = s.originalimage && s.originalimage.width <= 1400 ? s.originalimage.source : s.thumbnail && s.thumbnail.source.replace(/\/\d+px-/, "/800px-");
  if (pic) { $("rImg").src = pic; $("rImg").alt = s.title; $("rImg").hidden = false; $("rImg").onerror = () => { if (s.thumbnail && $("rImg").src !== s.thumbnail.source) $("rImg").src = s.thumbnail.source; else $("rImg").hidden = true; }; }
  $("rLink").href = (s.content_urls && s.content_urls.desktop.page) || WIKI + "/wiki/" + encodeURIComponent(title);
  if (s.coordinates) setGlobe(year, [s.coordinates.lon, s.coordinates.lat, 7]);
}
function closeReader() { $("reader").hidden = true; if (lastButton) lastButton.classList.remove("on"); lastButton = null; }
$("closeReader").addEventListener("click", closeReader);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeReader(); });
$("eras").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-topic], button[data-thinker], button[data-work]");
  if (!b) return;
  const era = ERAS[+b.closest(".era").dataset.index];
  if (lastButton) lastButton.classList.remove("on");
  lastButton = b; b.classList.add("on");
  if (b.dataset.thinker) {
    const t = THINKERS.find(x => x.n === b.dataset.thinker);
    openReader({ title: t.w, tag: `${lifeSpan(t)} · ${t.s}`, sub: t.i, year: Math.round((t.b + Math.min(t.d, 2026)) / 2), at: [t.at[0], t.at[1], 6] });
  } else {
    const title = b.dataset.topic || b.dataset.work;
    openReader({ title, tag: `${era.title} · ${fmtSpan(era)}`, year: midYear(era), at: era.at });
  }
});

/* ---------- Appearance (shared with the time machine) ---------- */
const THEME_KEY = "palimpsest:theme";
const THEME_LABELS = { auto: ["◐", "Auto"], light: ["☀", "Light"], dark: ["☾", "Dark"] };
function themeMode() { try { const t = localStorage.getItem(THEME_KEY); return t === "light" || t === "dark" ? t : "auto"; } catch { return "auto"; } }
function renderThemeBtn() { const [icon, name] = THEME_LABELS[themeMode()]; $("themeBtn").innerHTML = `<b aria-hidden="true">${icon}</b><span>${name}</span>`; $("themeBtn").title = name; }
$("themeBtn").addEventListener("click", () => {
  const next = { auto: "light", light: "dark", dark: "auto" }[themeMode()];
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  if (next === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
  renderThemeBtn();
});

/* ---------- Boot ---------- */
document.querySelectorAll(".views a").forEach(a => { if (a.dataset.view === SUBJECT) a.setAttribute("aria-current", "page"); });
renderStrip();
renderEras();
renderThemeBtn();
document.querySelectorAll(".era").forEach(s => nearObserver.observe(s));
if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ behavior: "instant" }); }
markCurrent(true);
