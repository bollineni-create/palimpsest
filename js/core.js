"use strict";
// Palimpsest · shared basics, loaded first

const TODAY = new Date().getFullYear();
const A = (href, name) => `<a href="${href}" target="_blank" rel="noopener">${name}</a>`;

// Extension points: later scripts (layers, fine-tuning, the guide) register here
const yearHooks = [];   // called with (year, opts) whenever the timeline moves
const panelHooks = [];  // called with (panelElement) after the history panel redraws
