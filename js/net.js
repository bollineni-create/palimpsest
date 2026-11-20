"use strict";
// Palimpsest · polite Wikimedia requests, loaded before every other script on each page
//
// Wikipedia and Wikidata answer 429 ("too many requests") when one browser fires dozens of calls at once,
// which clicking quickly through the art, philosophy or year panels did: images and summaries then came up
// blank. Every Wikimedia call goes through wikiFetch: at most 4 in flight per host, and a 429 or 503 waits
// (Retry-After when the browser can read it, else 1 s, 2 s, 4 s; never over 4 s) and tries again, up to three retries.
const wikiFetch = (() => {
  const LIMIT = 4, RETRIES = 3;
  const lanes = new Map();
  const lane = url => {
    let host = "";
    try { host = new URL(url).host; } catch {}
    let l = lanes.get(host);
    if (!l) lanes.set(host, l = { active: 0, waiting: [] });
    return l;
  };
  const acquire = l => l.active < LIMIT ? (l.active++, Promise.resolve()) : new Promise(go => l.waiting.push(go));
  const release = l => { const next = l.waiting.shift(); if (next) next(); else l.active--; }; // hand the slot on
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  return async function wikiFetch(url, opts) {
    const l = lane(url);
    for (let attempt = 0; ; attempt++) {
      await acquire(l);
      let r;
      try { r = await fetch(url, opts); } finally { release(l); }
      if ((r.status !== 429 && r.status !== 503) || attempt >= RETRIES) return r;
      const after = Number(r.headers.get("Retry-After"));
      await sleep(Math.min(after > 0 ? after * 1000 : 1000 * 2 ** attempt, 4000)); // at most ~11 s in all
    }
  };
})();
