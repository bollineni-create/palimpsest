"use strict";
// Palimpsest · Philosophy and Art pages: each era as a grand picture, with its people, questions or works, and topics to explore

const SUBJECT = document.body.dataset.subject;            // "philosophy" or "art"
const ERAS = (SUBJECT === "art" ? ART_ERAS : PHILOSOPHY_ERAS).slice().sort((a, b) => a.from - b.from || a.to - b.to);   // in date order
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
  $("strip").innerHTML = `<div class="track">${ERAS.map(e => `<a href="#${e.id}" data-id="${e.id}" title="${esc(e.title)}, ${esc(fmtSpan(e))}"><i aria-hidden="true"></i><b>${esc(fmtYear(e.from))}</b><span>${esc(e.title)}</span></a>`).join("")}</div>`;
}
// The fuller picture: what shaped the era, its breakthroughs, the world around it and what it led to
const DEPTH = SUBJECT === "art" ? ART_DEPTH : PHILOSOPHY_DEPTH;
function depthHtml(e) {
  const d = DEPTH[e.id];
  if (!d) return "";
  const list = items => `<ul>${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  return `<div class="depth">
    <div class="card"><h4>What shaped it</h4>${list(d.shaped)}</div>
    <div class="card"><h4>${SUBJECT === "art" ? "New techniques and discoveries" : "Breakthrough ideas"}</h4>${list(d.ideas)}</div>
    <div class="card"><h4>The world around it</h4><p>${esc(d.world)}</p><h4>What it led to</h4><p>${esc(d.legacy)}</p></div>
  </div>`;
}
// Key concepts of a philosophy era, and the guide to each of its big questions
const questionOf = (e, i) => typeof PHILOSOPHY_QUESTIONS !== "undefined" && PHILOSOPHY_QUESTIONS[e.id] ? PHILOSOPHY_QUESTIONS[e.id][i] : null;
function conceptsHtml(e) {
  const list = typeof PHILOSOPHY_CONCEPTS !== "undefined" && SUBJECT === "philosophy" ? PHILOSOPHY_CONCEPTS[e.id] : null;
  if (!list) return "";
  return `<div class="concepts"><h4>Key concepts</h4><div class="concept-grid">${list.map(c => `
    <div class="concept"><button type="button" data-topic="${esc(c.w)}">${esc(c.term)} <span aria-hidden="true">→</span></button><p>${esc(c.text)}</p></div>`).join("")}</div></div>`;
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
         <h4>The big questions</h4><ul class="questions">${e.questions.map((q, qi) => `<li><button type="button" data-question="${qi}"><span>${esc(q)}</span>${questionOf(e, qi) ? `<small>${esc(questionOf(e, qi).branch)} · ${questionOf(e, qi).answers.length} answers →</small>` : ""}</button></li>`).join("")}</ul>`
      : `<p class="intro">${esc(e.intro)}</p>`;
    const right = SUBJECT === "philosophy"
      ? (people.length ? `<h4>Thinkers of the age</h4><ul class="people">${people.map(t => `<li><button type="button" data-thinker="${esc(t.n)}"><b>${esc(t.n)} <em>${esc(t.s)}</em></b><small>${esc(lifeSpan(t))}</small><i>${esc(t.i)}</i></button></li>`).join("")}</ul>` : "")
      : `<h4>Famous works</h4><div class="works">${e.works.map(w => `<button type="button" data-work="${esc(w)}"><div class="pic"><img alt="" loading="lazy" hidden></div><span>${esc(w.replace(/ \((?:painting|Leonardo|Michelangelo|Klimt|Picasso|Monet series|Sinai|Isfahan|sculpture)\)$/, ""))}</span></button>`).join("")}</div>`;
    s.innerHTML = `
      <figure class="hero" data-empty="${esc(e.hero)}"><img alt="${esc(e.hero)}"><div class="shade"></div>
        <div class="era-head"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="when">${esc(fmtSpan(e))}</span><span class="region">${esc(e.region)}</span><h2>${esc(e.title)}</h2></div>
        <figcaption><span>Pictured</span><button type="button" data-topic="${esc(e.hero)}">${esc(e.hero)}</button></figcaption>
        <div class="cue" aria-hidden="true">Click the picture to zoom · scroll to explore ↓</div></figure>
      <div class="era-body ${SUBJECT}">
        <div class="col">${left}</div>
        <div class="col">${right}</div>
        ${conceptsHtml(e)}
        ${depthHtml(e)}
        <div class="explore">
          <h4>Topics to explore</h4><div class="topics">${e.topics.map(t => `<button type="button" data-topic="${esc(t)}">${esc(t.replace(/ \((?:philosophy|Chinese philosophy|Plato|Augustine|Montaigne|book|Spinoza|Hobbes book)\)$/, ""))}</button>`).join("")}</div>
          <a class="globe" href="${globeHref(midYear(e), e.at)}">See ${esc(fmtYear(midYear(e)))} on the globe →</a>
        </div>
      </div>`;
    s.dataset.index = i;
    s.querySelectorAll(".era-body .col > *, .era-body .concepts, .era-body .depth .card, .era-body .explore").forEach(el => { el.classList.add("reveal"); revealObserver.observe(el); });
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
// The era's details rise into view as you scroll down past its picture
const revealObserver = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); }
}), { rootMargin: "0px 0px -8% 0px" });
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
  const at = ERAS.findIndex(e => e.id === id);
  document.querySelectorAll("#strip a").forEach((a, i) => {
    const on = a.dataset.id === id;
    a.classList.toggle("on", on);
    a.classList.toggle("past", at >= 0 && i < at);
    if (on) { const strip = $("strip"); strip.scrollTo({ left: a.offsetLeft - strip.clientWidth / 2 + a.offsetWidth / 2, behavior: instant ? "instant" : "smooth" }); }
  });
  history.replaceState(null, "", id ? "#" + id : location.pathname);
}
let ticking = false;
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; markCurrent(); }); } }, { passive: true });

/* ---------- Big pictures: the largest sensible version of a Wikimedia picture ---------- */
// Thumbnails come in fixed widths; the original is used only when it is a web format and not enormous.
function largeImage(src, fileWidth) {
  if (!src) return src;
  src = src.replace(/^\/\//, "https://").replace(/\?.*$/, "");
  const m = src.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/([^/]+)\/thumb\/(.+?)\/[^/]+$/);
  if (!m) return src;
  const original = `https://upload.wikimedia.org/wikipedia/${m[1]}/${m[2]}`;
  if (fileWidth && fileWidth <= 2560 && /\.(jpe?g|png|gif|webp|svg)$/i.test(m[2])) return original;
  return src.replace(/\/(\d+)px-([^/]+)$/, (all, w, rest) => `/${fileWidth && fileWidth < 1920 ? w : 1920}px-${rest}`);
}

/* ---------- Picture viewer: zoom and pan ---------- */
const view = { s: 1, x: 0, y: 0, fit: 1, pointers: new Map(), pinch: null };
function applyView() { $("vImg").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`; }
function fitView() {
  const img = $("vImg"), st = $("vStage").getBoundingClientRect();
  if (!img.naturalWidth) return;
  view.fit = Math.min(st.width / img.naturalWidth, st.height / img.naturalHeight, 1.5);
  view.s = view.fit;
  view.x = (st.width - img.naturalWidth * view.s) / 2;
  view.y = (st.height - img.naturalHeight * view.s) / 2;
  applyView();
}
function zoomAt(factor, cx, cy) {
  const st = $("vStage").getBoundingClientRect();
  const px = cx - st.left, py = cy - st.top;
  const next = Math.max(view.fit * 0.5, Math.min(view.fit * 24, view.s * factor));
  const k = next / view.s;
  view.x = px - (px - view.x) * k; view.y = py - (py - view.y) * k; view.s = next;
  applyView();
}
function openViewer(src, title, better) {
  const img = $("vImg");
  $("vTitle").textContent = title || "";
  $("viewer").hidden = false;
  document.documentElement.style.overflow = "hidden";       // the page stays put underneath
  img.onload = fitView;
  img.src = src;
  // Swap in a sharper version once it arrives, keeping the same place on screen
  if (better && better !== src) {
    const hi = new Image();
    hi.onload = () => {
      if ($("viewer").hidden || img.src !== src) return;
      const k = img.naturalWidth / hi.naturalWidth;
      img.onload = () => { view.s *= k; view.fit *= k; applyView(); img.onload = fitView; };
      img.src = better;
    };
    hi.src = better;
  }
}
function closeViewer() { $("viewer").hidden = true; $("vImg").removeAttribute("src"); document.documentElement.style.overflow = ""; }
$("vClose").addEventListener("click", closeViewer);
$("vFit").addEventListener("click", fitView);
$("vIn").addEventListener("click", () => { const r = $("vStage").getBoundingClientRect(); zoomAt(1.5, r.left + r.width / 2, r.top + r.height / 2); });
$("vOut").addEventListener("click", () => { const r = $("vStage").getBoundingClientRect(); zoomAt(1 / 1.5, r.left + r.width / 2, r.top + r.height / 2); });
$("vStage").addEventListener("wheel", e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY); }, { passive: false });
$("vStage").addEventListener("dblclick", e => zoomAt(2.2, e.clientX, e.clientY));
$("vStage").addEventListener("pointerdown", e => { $("vStage").setPointerCapture(e.pointerId); view.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); $("vStage").classList.add("dragging"); });
$("vStage").addEventListener("pointermove", e => {
  const prev = view.pointers.get(e.pointerId);
  if (!prev) return;
  const now = { x: e.clientX, y: e.clientY };
  if (view.pointers.size === 2) {
    const [a, b] = [...view.pointers.entries()].map(([id, p]) => id === e.pointerId ? now : p);
    const dist = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (view.pinch) { zoomAt(dist / view.pinch.dist, mid.x, mid.y); view.x += mid.x - view.pinch.mid.x; view.y += mid.y - view.pinch.mid.y; applyView(); }
    view.pinch = { dist, mid };
  } else { view.x += now.x - prev.x; view.y += now.y - prev.y; applyView(); }
  view.pointers.set(e.pointerId, now);
});
const endPointer = e => { view.pointers.delete(e.pointerId); view.pinch = null; if (!view.pointers.size) $("vStage").classList.remove("dragging"); };
$("vStage").addEventListener("pointerup", endPointer);
$("vStage").addEventListener("pointercancel", endPointer);
addEventListener("resize", () => { if (!$("viewer").hidden) fitView(); });

/* ---------- Reader: the whole article, inside the app ---------- */
const DROP_SECTIONS = /^(references|notes|citations|footnotes|sources|bibliography|further reading|external links|see also|notes and references|works cited|general and cited (references|sources)|explanatory notes)$/i;
const KEEP_TAGS = new Set(["P", "H2", "H3", "H4", "UL", "OL", "LI", "B", "STRONG", "I", "EM", "A", "BLOCKQUOTE", "FIGURE", "FIGCAPTION", "IMG", "SPAN", "SECTION", "DIV", "SUB", "SUP", "BR", "DL", "DT", "DD", "SMALL", "ABBR", "Q", "CITE"]);
const artCache = new Map();
async function articleHtml(title) {
  if (artCache.has(title)) return artCache.get(title);
  const r = await fetch(WIKI + "/api/rest_v1/page/html/" + encodeURIComponent(title.replace(/ /g, "_"))).catch(() => null);
  if (!r || !r.ok) return null;
  const doc = new DOMParser().parseFromString(await r.text(), "text/html");
  doc.querySelectorAll("style, script, link, meta, table, .mw-ref, sup.reference, .reference, .mw-references-wrap, .references, .navbox, .infobox, .metadata, .ambox, .hatnote, .shortdescription, .noprint, .mw-empty-elt, .gallery, .reflist, .sistersitebox, .side-box, .portalbox, .thumbcaption .magnify, audio, video, math, .mwe-math-element").forEach(n => n.remove());
  // Drop the reference sections, and the lead (already shown as the summary)
  doc.querySelectorAll("section").forEach(sec => {
    const h = sec.querySelector(":scope > h2, :scope > h3, :scope > h4");
    if (h && DROP_SECTIONS.test(h.textContent.trim())) sec.remove();
  });
  const lead = doc.querySelector("body > section");
  if (lead && !lead.querySelector(":scope > h2")) lead.remove();
  // Keep a small, safe set of elements; turn wiki links into in-app links and pictures into zoomable ones
  const clean = node => {
    [...node.children].forEach(el => {
      if (!KEEP_TAGS.has(el.tagName)) { el.remove(); return; }
      const keep = {};
      if (el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        if (el.getAttribute("rel") === "mw:WikiLink" && href.startsWith("./")) keep["data-wiki"] = decodeURIComponent(href.slice(2).split("#")[0]).replace(/_/g, " ");
        else if (/^https?:/.test(href)) { keep.href = href; keep.target = "_blank"; keep.rel = "noopener"; }
      }
      if (el.tagName === "IMG") {
        const src = (el.getAttribute("src") || "").replace(/^\/\//, "https://").replace(/\?.*$/, "");
        if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(src) || +el.getAttribute("width") < 60) { el.remove(); return; }
        const fw = +el.getAttribute("data-file-width") || 0;
        Object.assign(keep, { src: src.replace(/\/(\d+)px-([^/]+)$/, (all, w, rest) => `/${fw && fw < 500 ? w : 500}px-${rest}`), alt: el.getAttribute("alt") || "", loading: "lazy", "data-full": largeImage(src, fw), class: "zoomable" });
      }
      [...el.attributes].forEach(at => el.removeAttribute(at.name));
      Object.entries(keep).forEach(([k, v]) => el.setAttribute(k, v));
      clean(el);
    });
  };
  clean(doc.body);
  doc.querySelectorAll("p, li, figcaption, span, div, section").forEach(el => { if (!el.textContent.trim() && !el.querySelector("img")) el.remove(); });
  const html = doc.body.innerHTML;
  artCache.set(title, html);
  return html;
}

let readReq = 0, lastButton = null, readerStack = [];
function setGlobe(year, at) { $("rGlobe").href = globeHref(year, at); $("rGlobe").textContent = `See ${fmtYear(Math.round(year))} on the globe →`; }
async function openReader(entry, { push = false } = {}) {
  if (entry.kind === "question") {     // carry the era's moment and place, for links opened from the question
    const era = ERAS.find(x => x.id === entry.era);
    entry = { ...entry, title: era.questions[entry.i], tag: era.title, year: midYear(era), at: era.at };
  }
  if (push && $("reader").dataset.current) readerStack.push(JSON.parse($("reader").dataset.current));
  if (!push) readerStack = readerStack.length && entry.fromBack ? readerStack : [];
  $("reader").dataset.current = JSON.stringify({ ...entry, fromBack: undefined });
  $("rBack").hidden = !readerStack.length;
  const { title, tag, sub, year, at } = entry;
  const id = ++readReq;
  if (entry.kind === "question") { renderQuestion(entry); return; }
  $("reader").hidden = false; $("reader").scrollTop = 0;
  $("rTag").textContent = tag || "";
  $("rTitle").textContent = title;
  $("rSub").textContent = sub || ""; $("rSub").hidden = !sub;
  $("rPic").hidden = true;
  $("rText").textContent = "Loading…";
  $("rArticle").innerHTML = "";
  $("rLink").href = WIKI + "/wiki/" + encodeURIComponent(title.replace(/ /g, "_"));
  setGlobe(year, at);
  const s = await summary(title);
  if (id !== readReq) return;
  if (!s || s.type === "disambiguation") { $("rText").textContent = "There's no article on this yet."; return; }
  $("rTitle").textContent = s.title.replace(/<[^>]+>/g, "");
  if (!sub && s.description) { $("rSub").textContent = s.description; $("rSub").hidden = false; }
  $("rText").textContent = s.extract || "";
  if (s.thumbnail) {
    const ow = s.originalimage ? s.originalimage.width : 0;
    const shown = s.thumbnail.source.replace(/\?.*$/, "").replace(/\/(\d+)px-([^/]+)$/, (all, w, rest) => `/${ow && ow < 960 ? w : 960}px-${rest}`);
    $("rImg").src = shown; $("rImg").alt = s.title;
    $("rImg").onerror = () => { if ($("rImg").src !== s.thumbnail.source) $("rImg").src = s.thumbnail.source; };
    $("rPic").dataset.full = largeImage(s.thumbnail.source, ow);
    $("rPic").dataset.title = s.title;
    $("rPic").hidden = false;
  }
  if (s.content_urls) $("rLink").href = s.content_urls.desktop.page;
  if (s.coordinates) setGlobe(year, [s.coordinates.lon, s.coordinates.lat, 7]);
  $("rArticle").innerHTML = '<p class="loading">Loading the full article…</p>';
  const html = await articleHtml(s.title);
  if (id !== readReq) return;
  $("rArticle").innerHTML = html || "";
}
// A big question: its branch, what's at stake, how thinkers answered and where the debate stands
function renderQuestion({ era: eraId, i }) {
  const era = ERAS.find(x => x.id === eraId), q = questionOf(era, i);
  $("reader").hidden = false; $("reader").scrollTop = 0;
  $("rTag").textContent = `${q ? q.branch : "Question"} · ${era.title}`;
  $("rTitle").textContent = era.questions[i];
  $("rSub").hidden = true; $("rPic").hidden = true;
  setGlobe(midYear(era), era.at);
  $("rLink").href = WIKI + "/wiki/" + encodeURIComponent(((q && q.bw) || "Philosophy").replace(/ /g, "_"));
  if (!q) { $("rText").textContent = "A question people argued about in this era."; $("rArticle").innerHTML = ""; return; }
  $("rText").textContent = q.frame;
  const others = era.questions.map((t, j) => j === i ? "" : `<button type="button" data-question-jump="${j}">${esc(t)}</button>`).join("");
  $("rArticle").innerHTML = `
    <h2>How they answered</h2>
    <div class="answers">${q.answers.map(a => `
      <div class="answer"><div class="who"><a data-wiki="${esc(a.w)}">${esc(a.who)}</a><span class="school">${esc(a.school)}</span></div><p>${esc(a.says)}</p></div>`).join("")}</div>
    <h2>Where the debate stands</h2><p>${esc(q.today)}</p>
    <h2>Go deeper</h2><p>This is a question of ${esc(q.branch.toLowerCase())}. <a data-wiki="${esc(q.bw)}">Read about ${esc(q.bw)} →</a> Or click any thinker above for their life and ideas.</p>
    ${others ? `<h2>More questions from this era</h2><div class="more-q">${others}</div>` : ""}`;
}
function closeReader() { $("reader").hidden = true; delete $("reader").dataset.current; readerStack = []; if (lastButton) lastButton.classList.remove("on"); lastButton = null; }
$("closeReader").addEventListener("click", closeReader);
$("rBack").addEventListener("click", () => { const prev = readerStack.pop(); if (prev) openReader({ ...prev, fromBack: true }); });
$("rPic").addEventListener("click", () => openViewer($("rImg").src, $("rPic").dataset.title, $("rPic").dataset.full));
$("reader").addEventListener("click", e => {
  const img = e.target.closest("img.zoomable");
  if (img) { const cap = img.closest("figure") && img.closest("figure").querySelector("figcaption"); openViewer(img.src, cap ? cap.textContent.trim() : img.alt, img.dataset.full); return; }
  const jump = e.target.closest("button[data-question-jump]");
  if (jump) { const cur = JSON.parse($("reader").dataset.current || "{}"); openReader({ kind: "question", era: cur.era, i: +jump.dataset.questionJump, title: "" }, { push: true }); return; }
  const a = e.target.closest("a[data-wiki]");
  if (a) {
    e.preventDefault();
    const cur = JSON.parse($("reader").dataset.current || "{}");
    openReader({ title: a.dataset.wiki, tag: cur.tag, year: cur.year, at: cur.at }, { push: true });
  }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("viewer").hidden) closeViewer(); else closeReader();
});
$("eras").addEventListener("click", ev => {
  const hero = ev.target.closest(".hero");
  if (hero && !ev.target.closest("button")) {
    const img = hero.querySelector("img");
    if (img.src) openViewer(img.src, hero.querySelector("figcaption button").textContent, largeImage(img.src, 0).replace(/\/\d+px-/, "/3840px-"));
    return;
  }
  const qb = ev.target.closest("button[data-question]");
  if (qb) {
    const era = ERAS[+qb.closest(".era").dataset.index];
    if (lastButton) lastButton.classList.remove("on");
    lastButton = qb; qb.classList.add("on");
    openReader({ kind: "question", era: era.id, i: +qb.dataset.question, title: era.questions[+qb.dataset.question] });
    return;
  }
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
// Jump to a linked era, and again once the web fonts have settled the layout above it
const target = location.hash && document.getElementById(location.hash.slice(1));
if (target) {
  target.scrollIntoView({ behavior: "instant" });
  const settle = () => { if (Math.abs(target.getBoundingClientRect().top) > 4 && scrollY > 0) target.scrollIntoView({ behavior: "instant" }); markCurrent(true); };
  document.fonts.ready.then(settle);
  addEventListener("load", settle, { once: true });
}
markCurrent(true);
