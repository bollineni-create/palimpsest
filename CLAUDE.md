# Palimpsest: notes for working on this project

- Static site, no build step: `index.html` (time machine), `compare.html` (old-map compare), `css/app.css`, `js/*.js`.
  Scripts are plain globals loaded in order: `core.js`, `data/milestones.js`, `data/maps.js`, `data/tours.js`, `data/thinkers.js`, `app.js`,
  then `layers.js`, `finetune.js`, `guide.js`, which plug in through `yearHooks` / `panelHooks` (defined in `core.js`).
- The guide (`js/guide.js`) calls Claude from the browser with the official Anthropic SDK (pinned on jsDelivr) and the user's own key
  in localStorage; model `claude-opus-5-5`, effort `low`, server-side refusal fallback on. Keep the conversation append-only.
- Preview locally with `python3 -m http.server 8643` from the repo root.
- The installed Mac app (`/Applications/Palimpsest.app`) reads these files live from the folder it was built in and reloads
  within a second of any change to `.html/.js/.css/.json`, so page changes need no rebuild. Only changes in `app/macos/`
  (Swift, Info.plist, icon) need `./app/macos/build.sh`, which rebuilds and reinstalls the app.
- Design: "Field line" (a painted globe, and a transit-style timeline coloured by the official geologic time scale).
  Colour and type tokens are at the top of `css/app.css`; map colours are in `THEME` in `js/app.js`.
- Everything is fetched live (Wikipedia/Wikidata, GPlates, historical-basemaps, tile services). Keep attribution on the map
  and in the README's credits when adding sources.
- Event quality: `tools/evaluate-events.js` runs the app's own Wikipedia parser (`parseYearArticle`) over ~67 sample year,
  century and millennium articles and flags non-events (footnotes, citations, statistics rows, fragments, disambiguation leaks).
  Load it in the open app's console and run `await evaluateEvents()`; keep `defects` at 0 after any parser change.
- Before committing page changes, run `./tools/stamp-version.sh` so browsers and GitHub Pages pick up the new JS/CSS (it stamps `?v=` on links).
- The guide supports several providers (`PROVIDERS` in `js/guide.js`); keys live in localStorage per provider. Pollinations needs no key, so it can be tested end to end.
