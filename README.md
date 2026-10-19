<p align="center"><img src="assets/icon.png" width="96" alt=""></p>

<h1 align="center">Palimpsest</h1>

<p align="center"><b>A journey through time on a 3D globe, from the Big Bang to yesterday.</b><br>
Drag the timeline and the world changes with it: historical borders, old maps laid over the land, drifting continents in deep time, and what happened on each day.</p>

<p align="center"><b><a href="https://bollineni-create.github.io/palimpsest/">Open Palimpsest in your browser</a></b> · <a href="TUTORIAL.md">Tutorial</a></p>

![Palimpsest showing Europe in 1914](docs/screenshot-1914.jpg)

## What it does

- **A timeline of everything.** One line runs from the Big Bang 13.8 billion years ago to today, painted in the official geologic time-scale colours, with about 90 landmark moments as stations along it. Press play and watch history run.
- **Search for anything.** A year, a date, a person, a place or an event: Palimpsest finds its moment and location on Wikipedia and Wikidata and takes you there.
- **Fine-tune the moment.** Click the year and type any moment: "1453", "323 BC", "66 million years ago" or "20 July 1969". A zoom ruler under the timeline scrubs a chosen span, from 10 years to a billion.
- **Explore like a globe.** Spin, zoom and tilt into 3D terrain. Satellite imagery is softened like a watercolour, and fades towards sepia the further back you go.
- **Borders for every era.** Empires and countries redraw themselves for the year you're on, back to 123,000 BC. Click any region for who ruled it and a Wikipedia summary.
- **What happened, day by day.** Every year from AD 1000 on gets a calendar heat-map. Pick a day to see its events ranked by impact, pinned on the globe. Earlier eras show the year, century or millennium.
- **Thinkers and art.** Switch on layers for the philosophers alive at the time (about 95, from Confucius and the Buddha to Arendt and Fanon) and for public-domain artworks from the period, shown where they were made.
- **Ask the guide.** "Ask about this moment" opens a chat with Claude that knows the year, the place and what's on screen. It answers like a museum guide and can move the globe to show you what it's describing. It starts on a free model through Pollinations, with no key needed; you can switch to Claude or ChatGPT with your own API key, or to free models through OpenRouter. Keys stay in your browser. Places Wikipedia doesn't cover get a short AI-written description, labelled as such.
- **Old maps in their own time.** Ordnance Survey London in the 1890s, the Cassini map of France, Swiss maps edition by edition, post-war Tokyo from the air and more fade in on the globe when the timeline reaches their years.
- **Deep time.** Before people, the globe shows the continents where they actually sat, back a billion years. Before that it's an ocean world, then a molten young Earth, then nothing at all.
- **Seventeen guided journeys.** From the Big Bang to you, the Axial Age, the Silk Road, the age of exploration, Renaissance art, the Second World War, the space race, the great extinctions, Ice Age humans and more.
- **The story of philosophy and the story of art.** Two illustrated companion pages ([`philosophy.html`](philosophy.html) and [`art.html`](art.html)) walk through 17 eras each, from the Upanishads to today and from Ice Age caves to today. Each era opens with a full-window picture; scroll down and its story rises over it: an introduction, its thinkers and big questions or its famous works, its key concepts explained (philosophy), what shaped it, its breakthroughs, the world around it and what it led to, and topics to explore. Each big question opens a guide to it: the branch of philosophy it belongs to, what's at stake, how three or four thinkers and schools answered it, and where the debate stands today. Every topic opens the full article inside the app, with links you can follow, and every picture opens in a viewer you can zoom and pan.
- **Side-by-side compare.** A second view ([`compare.html`](compare.html)) lays old maps over modern ones with fade, swipe and spyglass modes, and accepts any [Allmaps](https://allmaps.org) or XYZ tile link.

![Thinkers and artworks around Europe in 1505](docs/screenshot-layers.jpg)

![The guide, with the thinkers alive in 1972](docs/screenshot-guide.jpg)

![The continents 66 million years ago](docs/screenshot-deep-time.jpg)

New here? Read the **[tutorial](TUTORIAL.md)**. The app also opens with a short guided tour the first time, and you can replay it from **Tutorial** in the side panel.

## Run it

It's a static site with no build step. It needs an internet connection, because the maps and history load live from their sources.

```bash
git clone https://github.com/<you>/palimpsest.git
cd palimpsest
python3 -m http.server 8000
```

Then open <http://localhost:8000>. GitHub Pages works too: publish the repository root and you're done.

### Keyboard

| Key | Does |
| --- | --- |
| `←` `→` | Step a year (Shift: ten years) |
| `[` `]` | Previous or next day with events |
| `Space` | Play or pause |
| `T` | Tilt to 3D |
| `Esc` | Show or hide the panel |
| Click the year | Type a year or a date |
| `/` or `⌘K` | Search |

## The Mac app

[`app/macos`](app/macos) wraps the site in a native window with its own menus and Dock icon.

```bash
./app/macos/build.sh              # builds build/Palimpsest.app and installs it in /Applications
./app/macos/build.sh --no-install # builds only
```

It needs Xcode's command line tools. The app reads its pages straight from the folder you built it in and reloads within a second whenever a file changes, which makes it a handy live preview while you work on the site. If the folder moves, it falls back to a copy bundled inside the app. The build is ad-hoc signed, so on another Mac you'll need to right-click and choose **Open** the first time.

## How it's put together

```
index.html            the time machine
compare.html          the side-by-side old-map viewer
philosophy.html       the story of philosophy, era by era
art.html              the story of art, era by era
css/app.css           the "Field line" design: tokens first, then components
js/core.js            shared basics (loaded first)
js/data/milestones.js landmarks on the grand timeline, from the Big Bang on
js/data/maps.js       georeferenced historical maps and the years they cover
js/data/tours.js      guided journeys
js/data/thinkers.js   philosophers from every tradition, with where and when they worked
js/app.js             globe, timeline, deep time, history and impact ranking
js/layers.js          the thinker and art layers
js/finetune.js        typing a moment, and the zoom ruler
js/guide.js           the AI guide (Claude via the official Anthropic SDK; ChatGPT, OpenRouter and Pollinations via their chat APIs)
js/search.js          search: moments, things in Palimpsest, and anything on Wikipedia
js/tutorial.js        the first-run guided tour
js/eras.js            the Philosophy and Art pages (eras in js/data/philosophy-eras.js and art-eras.js; concepts and question guides in js/data/philosophy-concepts.js)
app/macos/            the native Mac wrapper (Swift, no Xcode project needed)
```

Plain scripts, no framework and no bundler. [MapLibre GL JS](https://maplibre.org) draws the globe, and [Leaflet](https://leafletjs.com) draws the compare view.

**The guide.** It runs entirely in the browser, with no server in between. With Claude, the page loads the official [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) and talks to Claude Opus 5.5 directly, with your own API key saved in `localStorage`. ChatGPT, OpenRouter's free models and Pollinations are called through their OpenAI-compatible chat APIs, streamed the same way. There's no server in between. Each question carries a short description of where you are (the moment, the map view and what's on screen), and Claude has two tools: `go_to_moment`, which moves the timeline and globe, and `set_layers`. Server-side refusal fallback is switched on, so if a safeguard declines a request, the API retries it on a suitable fallback model. Questions are billed to your Anthropic account.

**How "impact" is ranked.** Wikipedia's year articles list events without any ranking. Palimpsest scores each event by its subject: how long and how widely translated that Wikipedia article is, read from Wikidata. Wikipedia's one-line description adds a boost for specific events from that very year ("First crewed Moon landing (1969)"). People, countries and broad topics, which are linked from everything, are damped, and each subject leads the top list only once. It's a heuristic, and it gets some years wrong.

## Sources and credits

Everything is loaded live from its source and shown with attribution on the map. Nothing below is redistributed in this repository. Check each provider's terms before using Palimpsest commercially.

- **Historical borders:** [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik (GPL-3.0). Borders are approximate, very much so for early eras.
- **History:** [Wikipedia](https://en.wikipedia.org) year, century and millennium articles (CC BY-SA 4.0) and [Wikidata](https://www.wikidata.org) (CC0).
- **Ancient continents:** the [GPlates Web Service](https://gwsdoc.gplates.org) using the plate model of Merdith et al. (2021), *Extending full-plate tectonic models into deep time*, Earth-Science Reviews 214.
- **Imagery and place names:** Esri World Imagery and World Boundaries and Places.
- **Terrain:** [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) on AWS Open Data, originally from Mapzen.
- **Old maps:** [National Library of Scotland](https://maps.nls.uk), [swisstopo](https://www.swisstopo.admin.ch), [IGN France](https://www.geoportail.gouv.fr), [IGN España](https://www.ign.es), [GSI Japan](https://maps.gsi.go.jp), and maps from Digital Commonwealth, the Nationaal Archief, Yale Library and MSU Libraries, warped by [Allmaps](https://allmaps.org).
- **Art:** the [Cleveland Museum of Art Open Access](https://www.clevelandart.org/open-access) collection (CC0). Era pictures on the Philosophy and Art pages are the lead images of Wikipedia articles, from Wikimedia Commons.
- **AI guide:** [Claude](https://www.anthropic.com/claude) by Anthropic or ChatGPT by OpenAI (your own API key), or free models via [OpenRouter](https://openrouter.ai) and [Pollinations](https://pollinations.ai).
- **Fonts:** Inter Tight, Cormorant Garamond and IBM Plex Mono from Google Fonts (SIL Open Font License).
- **Libraries:** MapLibre GL JS (BSD-3-Clause), Leaflet (BSD-2-Clause) and the Anthropic TypeScript SDK (MIT).

The landmark texts in `js/data/milestones.js` and the thinker summaries in `js/data/thinkers.js` were written for this project. Deep-time dates are the commonly cited estimates, and many carry wide uncertainty.

## Licence

[MIT](LICENSE) for the code in this repository. The data and imagery it displays belong to their sources above.
