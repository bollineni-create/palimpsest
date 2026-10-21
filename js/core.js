"use strict";
// Palimpsest · shared basics, loaded first

const TODAY = new Date().getFullYear();
const A = (href, name) => `<a href="${href}" target="_blank" rel="noopener">${name}</a>`;

// Extension points: later scripts (layers, fine-tuning, the guide) register here
const yearHooks = [];   // called with (year, opts) whenever the timeline moves
const panelHooks = [];  // called with (panelElement) after the history panel redraws
const themeHooks = [];  // called with (isDark) when the appearance changes

// Appearance: "auto" follows the system; "light" and "dark" are the reader's choice
const THEME_KEY = "palimpsest:theme";
const darkQuery = matchMedia("(prefers-color-scheme: dark)");
const themeMode = () => { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch { return "auto"; } };
const isDark = () => themeMode() === "dark" || (themeMode() === "auto" && darkQuery.matches);

// The globe needs WebGL. Browsers can turn it off (Lockdown Mode on iPhone, iPad and Mac does), and then
// MapLibre can't start. Instead of a half-built page, say so and explain how to turn it back on for this site.
let noGlobe = false;
function showNoGlobe() {
  if (noGlobe) return;
  noGlobe = true;
  // the scripts after app.js depend on the globe; their errors are expected now, so keep the console readable
  addEventListener("error", e => e.preventDefault());
  const render = () => {
    document.documentElement.classList.add("no-globe");
    const box = document.createElement("div");
    box.className = "no-globe-note glass";
    box.setAttribute("role", "alert");
    box.innerHTML = `<h1>Palim<span>psest</span></h1>
      <p class="lead">The globe needs WebGL, and this browser has turned it off.</p>
      <p>On an iPhone, iPad or Mac this is usually <b>Lockdown Mode</b>. You can switch it off for this site only:</p>
      <ol>
        <li>In Safari, tap the page menu at the left of the address bar.</li>
        <li>Choose <b>Website Settings</b> and turn off <b>Lockdown Mode</b>.</li>
        <li>Reload the page.</li>
      </ol>
      <p>Elsewhere, check that hardware acceleration is on in your browser's settings.</p>
      <p class="links">These work without the globe: <a href="philosophy.html">The story of philosophy →</a> <a href="art.html">The story of art →</a></p>
      <button type="button" class="reload">Reload</button>`;
    box.querySelector(".reload").addEventListener("click", () => location.reload());
    document.body.appendChild(box);
  };
  document.body ? render() : addEventListener("DOMContentLoaded", render, { once: true });
}
