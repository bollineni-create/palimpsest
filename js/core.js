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
