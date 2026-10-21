"use strict";
// Palimpsest · a guided tour of the interface, shown on first launch and from the Tutorial button

const TUTORIAL_KEY = "palimpsest:tutorial-done";
const TUTORIAL = [
  { title: "Welcome to Palimpsest", text: "A journey through 13.8 billion years on a 3D globe: borders, old maps, thinkers, art and what happened each day. This tour takes about a minute.", start: true },
  { target: ".search", title: "Search anything", text: "Type a year or date, a person, a place or an event. Palimpsest finds its moment and location, takes you there and shows what it was. Press / to search at any time." },
  { target: ".track", title: "The timeline", text: "Drag along this line to travel through time: the Big Bang on the left, today on the right. It's coloured by the geologic time scale, and each dot is a landmark moment. Hover over a dot to see what it is, or click to jump there." },
  { target: "#yr", title: "Type any moment", text: "Click the year to type an exact moment: 1453, 323 BC, 66 million years ago, or a date like 20 July 1969." },
  { target: ".fine-row", title: "Fine-tune", text: "This ruler zooms in around the current moment. Use − and + to choose a span from 10 years to a billion, then drag to scrub precisely." },
  { target: "#play", title: "Watch it unfold", text: "Press play to run history forwards and watch borders change. The Speed slider sets how fast." },
  { title: "Explore the globe", text: "Drag to spin, scroll to zoom, and tilt into 3D terrain with the 3D tilt button or T. Click any region to see who ruled it, with a Wikipedia summary.",
    before: () => { setYear(1914, { exact: true }); map.flyTo({ center: [16, 46], zoom: 3.2, pitch: 0, bearing: 0, duration: 1600 }); } },
  { target: "#tab-history", title: "What happened", text: "The History panel ranks the year's biggest events. Brighter calendar squares are bigger days: click one, or press [ and ], to step day by day. Red pins put events on the globe.",
    before: () => selectTab("history") },
  { target: "#layerChips", title: "Thinkers and art", text: "Switch on layers for the philosophers alive at the time and for real artworks from the period, shown where they were made. Philosophy and Art, at the bottom of the panel, tell each story era by era." },
  { target: '.tabs button[data-tab="tours"]', title: "Guided journeys", text: "Seventeen journeys fly you through big stories, from the Big Bang to you, the Silk Road and the Second World War. Old maps lists the historical maps on the globe." },
  { target: "#askBtn", title: "Ask the guide", text: "Ask an AI guide about wherever you are. It knows the moment and what's on screen, and it can take you places. It starts on a free model with no key; Settings lets you switch to Claude, ChatGPT or other free models." },
  { title: "You're ready", text: "Keys: ← → step years · [ ] step days · Space plays · T tilts · Esc hides the panel. Replay this tour any time from Tutorial at the bottom of the panel.", end: true },
];
let tutStep = -1;

function selectTab(name) { const b = document.querySelector(`.tabs button[data-tab="${name}"]`); if (b) b.click(); }
function startTutorial() {
  stopPlay();
  endTour();
  $("drawer").classList.remove("closed");
  $("place").hidden = true;
  const guide = document.getElementById("guide"); if (guide) guide.hidden = true;
  setTimelineMore(true);   // the tour points at the fine-tune ruler
  tutStep = 0;
  $("tutorial").hidden = false;
  showTutorialStep();
}
function endTutorial() {
  tutStep = -1;
  $("tutorial").hidden = true;
  if (innerWidth < 760) { $("drawer").classList.add("closed"); setTimelineMore(false); }   // the tour opened the panels; on a phone, give the globe back
  try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch {}
}
function showTutorialStep() {
  const s = TUTORIAL[tutStep];
  if (s.before) s.before();
  const card = $("tutCard"), spot = $("tutSpot");
  $("tutTitle").textContent = s.title;
  $("tutText").textContent = s.text;
  $("tutCount").textContent = s.start || s.end ? "" : `${tutStep} of ${TUTORIAL.length - 2}`;
  $("tutBack").hidden = !!s.start;
  $("tutSkip").hidden = !!s.end;
  $("tutNext").textContent = s.start ? "Start the tour" : s.end ? "Start exploring" : "Next";
  // Wait a frame so panels that just opened have their final size
  requestAnimationFrame(() => {
    const el = s.target && document.querySelector(s.target);
    if (!el) {
      spot.hidden = true;
      card.classList.add("center");
      card.style.left = card.style.top = "";
    } else {
      const r = el.getBoundingClientRect(), pad = 8;
      spot.hidden = false;
      Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      card.classList.remove("center");
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let top = r.bottom + 18 + ch < innerHeight ? r.bottom + 18 : r.top - ch - 18;
      top = Math.max(12, Math.min(innerHeight - ch - 12, top));
      let left = r.left + r.width / 2 - cw / 2;
      if (r.width > innerWidth * 0.6 || r.right < cw + 40) left = Math.max(r.left, 12);
      if (r.left > innerWidth - cw - 40) left = r.right - cw;
      left = Math.max(12, Math.min(innerWidth - cw - 12, left));
      // Tall targets (the side panel) get the card beside them rather than on top
      if (r.height > innerHeight * 0.4 && r.right + cw + 30 < innerWidth) { left = r.right + 22; top = Math.max(12, Math.min(innerHeight - ch - 12, r.top + 60)); }
      Object.assign(card.style, { left: left + "px", top: top + "px" });
    }
    $("tutNext").focus();
  });
}
function stepTutorial(dir) {
  const next = tutStep + dir;
  if (next >= TUTORIAL.length) { endTutorial(); return; }
  if (next < 0) return;
  tutStep = next;
  showTutorialStep();
}
$("tutNext").addEventListener("click", () => stepTutorial(1));
$("tutBack").addEventListener("click", () => stepTutorial(-1));
$("tutSkip").addEventListener("click", endTutorial);
$("tutorialBtn").addEventListener("click", startTutorial);
document.addEventListener("keydown", e => {
  if (tutStep < 0) return;
  if (e.key === "Escape") { e.stopImmediatePropagation(); endTutorial(); }
  else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); stepTutorial(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); stepTutorial(-1); }
}, true);
addEventListener("resize", () => { if (tutStep >= 0) showTutorialStep(); });
// First visit: start once the globe has loaded
const tutorialSeen = (() => { try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch { return false; } })();
if (!tutorialSeen || location.hash === "#tutorial") {
  const go = () => setTimeout(startTutorial, 900);
  if (state.ready) go(); else map.once("load", go);
}
