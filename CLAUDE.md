# Palimpsest: notes for working on this project

- Static site, no build step: `index.html` (time machine), `compare.html` (old-map compare), `css/app.css`, `js/*.js`.
  Scripts are plain globals loaded in order: `core.js`, `data/milestones.js`, `data/maps.js`, `data/tours.js`, `app.js`.
- Preview locally with `python3 -m http.server 8643` from the repo root.
- The installed Mac app (`/Applications/Palimpsest.app`) reads these files live from the folder it was built in and reloads
  within a second of any change to `.html/.js/.css/.json`, so page changes need no rebuild. Only changes in `app/macos/`
  (Swift, Info.plist, icon) need `./app/macos/build.sh`, which rebuilds and reinstalls the app.
- Design: "Field line" (a painted globe, and a transit-style timeline coloured by the official geologic time scale).
  Colour and type tokens are at the top of `css/app.css`; map colours are in `THEME` in `js/app.js`.
- Everything is fetched live (Wikipedia/Wikidata, GPlates, historical-basemaps, tile services). Keep attribution on the map
  and in the README's credits when adding sources.
