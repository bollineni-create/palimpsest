"use strict";
// Palimpsest · guided journeys

/* ---------- Guided journeys ---------- */
const TOURS = [
  { title: "From the Big Bang to you", sub: "13.8 billion years in twelve stops", steps: [
    { year: -13.8e9, center: [0, 20], zoom: 1.3, text: "13.8 billion years ago. The Big Bang. No stars, no Sun, no Earth: just hot, expanding energy." },
    { year: -4.54e9, center: [0, 20], zoom: 1.4, text: "4.54 billion years ago. Earth forms, a glowing ball of molten rock." },
    { year: -3.48e9, center: [119.45, -21.15], zoom: 1.8, text: "3.5 billion years ago. Microbes leave the oldest fossils we know of, in today's Western Australia." },
    { year: -720e6, center: [20, 0], zoom: 1.4, text: "720 million years ago. Snowball Earth: ice reaches all the way to the equator." },
    { year: -300e6, center: [10, 0], zoom: 1.4, text: "300 million years ago. Pangaea: nearly all land is one supercontinent." },
    { year: -66e6, center: [-65, 25], zoom: 2.2, text: "66 million years ago. An asteroid strikes off Mexico and ends the age of dinosaurs." },
    { year: -3.2e6, center: [40.58, 11.1], zoom: 4, text: "3.2 million years ago. Lucy walks upright in Ethiopia." },
    { year: -70000, center: [43.3, 12.6], zoom: 3, text: "70,000 years ago. Modern humans begin spreading out of Africa." },
    { year: -9500, center: [38.5, 36.5], zoom: 4, text: "9500 BC. Farming begins in the Fertile Crescent." },
    { year: -3200, center: [45.637, 31.322], zoom: 5, text: "3200 BC. Writing is invented in Sumer." },
    { year: 1969, center: [-80.6, 28.6], zoom: 5, day: "07-20", text: "20 July 1969. People walk on the Moon." },
    { year: TODAY, center: [10, 20], zoom: 1.5, text: "Today. Eight billion of us, on a planet 4.5 billion years old." },
  ]},
  { title: "Empires rise and fall", sub: "The world map from Alexander to the Cold War", steps: [
    { year: -323, center: [35, 33], zoom: 2.6, text: "323 BC. Alexander has just died, and his empire stretches from Greece to the Indus." },
    { year: 100, center: [20, 38], zoom: 2.6, text: "AD 100. Rome rules the Mediterranean. Han China rules the far east." },
    { year: 1279, center: [80, 40], zoom: 1.9, text: "1279. The Mongol empires cover most of Asia." },
    { year: 1492, center: [-30, 30], zoom: 1.6, text: "1492. The Atlantic world is about to change for ever." },
    { year: 1914, center: [30, 25], zoom: 1.5, text: "1914. Colonial empires on the eve of the First World War." },
    { year: 1945, center: [40, 35], zoom: 1.6, text: "1945. A redrawn world at the end of the Second World War." },
    { year: 1960, center: [15, 5], zoom: 2.2, text: "1960. Africa's year of independence." },
  ]},
  { title: "Paris through three centuries", sub: "Cassini, the army surveyors, the air, today", steps: [
    { year: 1780, center: [2.3522, 48.8566], zoom: 11.5, pitch: 40, text: "1780s. Cassini's Paris, still inside its old walls, ringed by villages." },
    { year: 1850, center: [2.3376, 48.8606], zoom: 14, pitch: 45, text: "1850. Medieval streets just before Haussmann cuts his boulevards." },
    { year: 1955, center: [2.2945, 48.8584], zoom: 15.5, pitch: 55, bearing: -30, text: "1950s. The Eiffel Tower and Champ de Mars from the air." },
    { year: TODAY, center: [2.2945, 48.8584], zoom: 15.5, pitch: 55, bearing: -30, text: "Today. The same view now." },
  ]},
  { title: "Zürich grows up", sub: "One city, one map, 136 years", steps: [
    { year: 1864, center: [8.541, 47.3739], zoom: 13, pitch: 50, text: "1864. A compact lakeside town." },
    { year: 1900, center: [8.541, 47.3739], zoom: 13, pitch: 50, text: "1900. Railways and industry spread out along the Limmat." },
    { year: 1938, center: [8.541, 47.3739], zoom: 13, pitch: 50, text: "1938. The suburbs climb the hillsides." },
    { year: 1970, center: [8.541, 47.3739], zoom: 13, pitch: 50, text: "1970. Motorways arrive." },
    { year: 2000, center: [8.541, 47.3739], zoom: 13, pitch: 50, text: "2000. The modern city." },
  ]},
  { title: "London, before and after the Blitz", sub: "The City in the 1890s and the 1940s", steps: [
    { year: 1895, center: [-0.0877, 51.5079], zoom: 16, pitch: 45, bearing: 20, text: "1890s. Every warehouse on the Thames, drawn at five feet to the mile." },
    { year: 1945, center: [-0.0984, 51.5138], zoom: 16, pitch: 45, bearing: 20, text: "1940s. Around St Paul's, much of this was bombed flat." },
    { year: TODAY, center: [-0.0984, 51.5138], zoom: 16, pitch: 45, bearing: 20, text: "Today. Glass towers stand where the warehouses were." },
  ]},
  { title: "Tokyo rebuilt", sub: "1945 to 1964 to now", steps: [
    { year: 1947, center: [139.7671, 35.6812], zoom: 14.5, pitch: 40, text: "1945–50. Tokyo Station and the burned-out city around it." },
    { year: 1963, center: [139.7, 35.6655], zoom: 14.5, pitch: 40, text: "1961–64. Building for the Olympics." },
    { year: TODAY, center: [139.7, 35.6655], zoom: 14.5, pitch: 40, text: "Today. One of the largest cities on Earth." },
  ]},
];
