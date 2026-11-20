/* Saved moments, and sync across devices.

   Saved moments: the Saved tab keeps places in time (a year and a view of the globe) to come back
   to. They work anywhere, kept in this browser.

   On bollineni.co, the site's sync (/sync/kit.js) keeps them, with the theme, layers, timeline,
   guide provider and journey progress, the same on every linked device, with no account. Where you
   were last is synced too: open Palimpsest on another device and it offers to pick up there.
   Everything is encrypted in this browser before it leaves. Off the site, the kit isn't there and
   sync is left out. */
(function () {
  "use strict";
  const KEY = "palimpsest:moments";
  const LAST_KEY = "palimpsest:last";
  // Settings that sync, as localStorage keys and the check each synced value has to pass.
  const PREFS = {
    "palimpsest:theme": v => v === "auto" || v === "light" || v === "dark",
    "palimpsest:layers": v => typeof v === "string" && v.length < 4000 && /^\{[^<>]*\}$/.test(v),
    "palimpsest:timeline-hidden": v => v === "" || v === "1",
    "palimpsest:tutorial-done": v => v === "1",
    "palimpsest:guide-provider": v => typeof v === "string" && /^[a-z0-9-]{1,30}$/.test(v),
    "palimpsest:tour": v => typeof v === "string" && v.length < 200 && /^\{"i":\d+,"step":\d+\}$/.test(v),
  };
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null || v === "" && k !== "palimpsest:timeline-hidden" ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
  };
  const readJSON = (k, d) => { try { return JSON.parse(ls.get(k)) || d; } catch { return d; } };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

  let moments = readJSON(KEY, {});
  const saveMoments = () => { ls.set(KEY, JSON.stringify(moments)); render(); if (engine) engine.changed(); };

  function here() {
    const c = map.getCenter();
    return { year: state.year, center: [round(c.lng, 4), round(c.lat, 4)], zoom: round(map.getZoom(), 2), pitch: Math.round(map.getPitch()), bearing: Math.round(map.getBearing()) };
  }
  function go(m) {
    if (typeof stopPlay === "function") stopPlay();
    setYear(m.year, { exact: true });
    map.flyTo({ center: m.center, zoom: m.zoom, pitch: m.pitch || 0, bearing: m.bearing || 0, duration: 2600, essential: true });
    if (innerWidth < 760) $("drawer").classList.add("closed");
  }
  function addMoment() {
    const v = here();
    const era = ($("era") && $("era").textContent.trim()) || "";
    const suggested = `${fmtLabel(v.year)}${era ? " · " + era : ""}`;
    const title = prompt("Name this moment", suggested);
    if (title === null) return;
    const id = uid();
    moments[id] = { ...v, title: (title.trim() || suggested).slice(0, 80), createdAt: Date.now() };
    saveMoments();
  }

  /* ---------- The Saved tab ---------- */
  const el = $("tab-saved");
  function render() {
    if (!el) return;
    const list = Object.entries(moments).sort((a, b) => b[1].createdAt - a[1].createdAt);
    el.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "saved-bar";
    bar.innerHTML = `<button type="button" class="pill ask" id="saveMoment">☆ Save this moment</button>`;
    el.appendChild(bar);
    bar.firstChild.addEventListener("click", addMoment);
    const h = document.createElement("h2");
    h.textContent = "Saved moments";
    el.appendChild(h);
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Save a year and a view of the globe to come back to it in one tap.";
      el.appendChild(p);
    }
    for (const [id, m] of list) {
      const row = document.createElement("div");
      row.className = "moment";
      row.innerHTML = `<button type="button" class="card on"><span class="when"></span><span><span class="t"></span><span class="s"></span></span></button><button type="button" class="rm" aria-label="Remove" title="Remove">×</button>`;
      row.querySelector(".when").textContent = fmtLabel(m.year);
      row.querySelector(".t").textContent = m.title;
      row.querySelector(".s").textContent = new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      row.querySelector(".card").addEventListener("click", () => go(m));
      row.querySelector(".rm").addEventListener("click", () => { delete moments[id]; saveMoments(); });
      el.appendChild(row);
    }
    const sync = document.createElement("div");
    sync.className = "sync-row";
    sync.hidden = true;
    sync.innerHTML = `<div><b>Sync across devices</b><small data-sync-text></small></div><button type="button" class="pill" data-sync-open>Turn on</button>`;
    el.appendChild(sync);
    if (engine) window.BollineniSync.mountButton(sync, engine, { app: "palimpsest", tint: "#F08A5D" });
  }

  /* ---------- Sync ---------- */
  const S = window.BollineniSync;
  let engine = null;
  const device = () => (S ? S.site.device() : null);

  // Where this device was last, kept so another device can offer to pick up there.
  let lastTimer = 0;
  function noteLast() {
    if (!engine) return;
    clearTimeout(lastTimer);
    lastTimer = setTimeout(() => {
      const d = device();
      ls.set(LAST_KEY, JSON.stringify({ ...here(), device: d.id, name: d.name, at: Date.now() }));
      engine.changed();
    }, 4000);
  }

  function read() {
    const prefs = {};
    for (const k of Object.keys(PREFS)) { const v = ls.get(k); if (v != null) prefs[k] = v; }
    const out = { moments: { ...moments }, prefs, last: {} };
    const last = readJSON(LAST_KEY, null);
    if (last) out.last.view = last;
    return out;
  }
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const okView = v => v && num(v.year, -14e9, 3000) && Array.isArray(v.center) && v.center.length === 2 && num(v.center[0], -360, 360) && num(v.center[1], -90, 90)
    && num(v.zoom, 0, 24) && num(v.pitch || 0, 0, 85) && num(v.bearing || 0, -360, 360);
  function clean(col, v, id) {
    if (col === "moments") return okView(v) && typeof v.title === "string" && v.title.length <= 80 && Number.isFinite(v.createdAt) && /^[\w-]{1,64}$/.test(id) ? v : null;
    if (col === "prefs") return Object.hasOwn(PREFS, id) && PREFS[id](v) ? v : null;
    if (col === "last") return id === "view" && okView(v) && /^[0-9a-f]{32}$/.test(v.device) && typeof v.name === "string" && v.name.length <= 40 && Number.isFinite(v.at) ? v : null;
    return null;
  }
  async function write(v) {
    moments = { ...v.moments };
    ls.set(KEY, JSON.stringify(moments));
    const themeBefore = ls.get("palimpsest:theme"), tlBefore = ls.get("palimpsest:timeline-hidden");
    for (const k of Object.keys(PREFS)) ls.set(k, Object.hasOwn(v.prefs, k) ? v.prefs[k] : null);
    if (ls.get("palimpsest:theme") !== themeBefore && typeof setAppearance === "function") { setAppearance(); if (typeof renderThemeBtn === "function") renderThemeBtn(); }
    const tl = ls.get("palimpsest:timeline-hidden");
    if (tl !== tlBefore && typeof setTimelineHidden === "function") setTimelineHidden(tl === "1", { save: false });
    const last = v.last.view;
    const mine = readJSON(LAST_KEY, null);
    if (last) ls.set(LAST_KEY, JSON.stringify(last));
    if (last && last.device !== device().id && (!mine || last.at > mine.at)) offerResume(last);
    render();
  }

  // "Pick up where you left off on your iPhone."
  let chip = null;
  function offerResume(v) {
    if (Date.now() - v.at > 7 * 86400000) return;
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "resume glass";
      chip.setAttribute("role", "status");
      document.body.appendChild(chip);
    }
    chip.innerHTML = `<span>Continue at <b></b> from <span class="from"></span>?</span><button type="button" class="pill ask">Go</button><button type="button" class="pill" aria-label="Dismiss">×</button>`;
    chip.querySelector("b").textContent = fmtLabel(v.year);
    chip.querySelector(".from").textContent = v.name;
    chip.hidden = false;
    const [goBtn, no] = chip.querySelectorAll("button");
    goBtn.addEventListener("click", () => { chip.hidden = true; go(v); });
    no.addEventListener("click", () => { chip.hidden = true; });
    setTimeout(() => { if (chip) chip.hidden = true; }, 20000);
  }

  if (S && window.crypto && crypto.subtle) {
    engine = S.createEngine({
      app: "palimpsest",
      collections: { moments: { first: "keep" }, prefs: { first: "remote" }, last: { first: "keep" } },
      read, write, clean, maxPayload: 290000,
    });
    S.register(engine, "Palimpsest");
    // Settings change in other parts of the app: notice them when this tab writes localStorage.
    const setItem = Storage.prototype.setItem, removeItem = Storage.prototype.removeItem;
    const watched = k => Object.hasOwn(PREFS, k);
    Storage.prototype.setItem = function (k, v) { setItem.call(this, k, v); if (this === localStorage && watched(k)) engine.changed(); };
    Storage.prototype.removeItem = function (k) { removeItem.call(this, k); if (this === localStorage && watched(k)) engine.changed(); };
    map.on("moveend", noteLast);
    if (typeof yearHooks !== "undefined" && Array.isArray(yearHooks)) yearHooks.push(noteLast);
    engine.start().catch(() => {});
  }
  render();
})();
