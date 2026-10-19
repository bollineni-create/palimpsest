"use strict";
// Palimpsest · georeferenced historical maps, each tied to the years it shows

/* ---------- Detailed old maps, each tied to its years ---------- */
const NLS = "https://mapseries-tilesets.s3.amazonaws.com/";
const IGNF = (layer, fmt) => `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`;
const IGNES = layer => `https://www.ign.es/wmts/primera-edicion-mtn?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg`;
const NLS_A = "Old map: " + A("https://maps.nls.uk/", "National Library of Scotland");
const SWISS_A = "Old map: " + A("https://www.swisstopo.admin.ch/", "swisstopo");
const IGNF_A = "Old map: " + A("https://www.geoportail.gouv.fr/", "IGN France");
const IGNES_A = "Old map: " + A("https://www.ign.es/", "IGN España");
const GSI_A = "Old imagery: " + A("https://maps.gsi.go.jp/", "GSI Japan");
const AM_A = who => `Old map: ${who} via ${A("https://allmaps.org/", "Allmaps")}`;
const SWISS_YEARS = [1864,1870,1880,1890,1900,1910,1920,1930,1938,1950,1960,1970,1980,1990,2000];
// bbox = [west, south, east, north]
const MAPS = [
  { id: "roy", from: 1747, to: 1755, title: "Roy Military Survey of Scotland", sub: "Drawn by the army after the 1745 rising", url: NLS + "roy/lowlands/{z}/{x}/{y}.png", max: 14, min: 6, bbox: [-6.3,54.6,-1.5,57.1], view: [-3.19,55.95,12], attr: NLS_A },
  { id: "cassini", from: 1756, to: 1815, title: "Carte de Cassini", sub: "France, the first country mapped by triangulation", url: IGNF("BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI", "image/png"), max: 14, min: 5, bbox: [-5.2,41.3,9.6,51.1], view: [2.3522,48.8566,12], attr: IGNF_A },
  { id: "etatmajor", from: 1820, to: 1866, title: "Carte de l'état-major", sub: "Hand-coloured military survey · Paris before Haussmann", url: IGNF("GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40", "image/jpeg"), max: 15, min: 5, bbox: [-5.2,41.3,9.6,51.1], view: [2.3376,48.8606,14], attr: IGNF_A },
  { id: "6inch1", from: 1843, to: 1882, title: "Scotland, Six-inch first edition", sub: "Every field, wall and close of Edinburgh", url: NLS + "os/6inchfirst/{z}/{x}/{y}.png", max: 17, min: 6, bbox: [-8.7,54.6,-0.7,60.9], view: [-3.1999,55.9486,15], attr: NLS_A },
  { id: "dufour", from: 1845, to: 1863, title: "Dufour map", sub: "Switzerland's first official survey, with dramatic hill shading", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hiks-dufour/default/current/3857/{z}/{x}/{y}.png", max: 15, min: 6, bbox: [5.9,45.8,10.5,47.85], view: [8.0,46.62,10], attr: SWISS_A },
  { id: "swiss", from: 1864, to: 2000, title: "Swiss national map, year by year", sub: "Changes with the timeline, edition by edition", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.zeitreihen/default/{year}1231/3857/{z}/{x}/{y}.png", years: SWISS_YEARS, max: 17, min: 6, bbox: [5.9,45.8,10.5,47.85], view: [8.5410,47.3739,13.5], attr: SWISS_A },
  { id: "minutas", from: 1870, to: 1950, title: "Minutas cartográficas", sub: "Spain · field drafts for the national map, block by block", url: IGNES("catastrones"), max: 17, min: 6, bbox: [-9.4,35.9,4.4,43.9], view: [-3.7038,40.4168,15], attr: IGNES_A },
  { id: "mtn50", from: 1875, to: 1968, title: "Spain, MTN50 first edition", sub: "The national topographic map at 1:50,000", url: IGNES("mtn50-edicion1"), max: 15, min: 5, bbox: [-9.4,35.9,4.4,43.9], view: [-3.7038,40.4168,12], attr: IGNES_A },
  { id: "1inch2", from: 1885, to: 1900, title: "Scotland, One-inch second edition", sub: "Highlands drawn with hachures", url: NLS + "1inch_2nd_ed/{z}/{x}/{y}.png", max: 16, min: 6, bbox: [-8.7,54.6,-0.7,60.9], view: [-4.62,56.12,11], attr: NLS_A },
  { id: "6inch2", from: 1892, to: 1960, title: "Scotland, Six-inch later editions", sub: "Industrial Glasgow and the Clyde", url: NLS + "os/6inchsecond/{z}/{x}/{y}.png", max: 17, min: 6, bbox: [-8.7,54.6,-0.7,60.9], view: [-4.2514,55.8609,15], attr: NLS_A },
  { id: "london1890", from: 1893, to: 1899, title: "London, Five-foot town plan", sub: "Victorian London, every building drawn", url: NLS + "london_1890s/{z}/{x}/{y}.png", max: 20, min: 11, bbox: [-0.56,51.28,0.33,51.72], view: [-0.0877,51.5079,16], attr: NLS_A },
  { id: "boston", from: 1896, to: 1896, title: "Winthrop Steamboat routes", sub: "Boston Harbor in the season of 1896", url: "https://allmaps.xyz/maps/a9458d2f895dcdfb/{z}/{x}/{y}.png", min: 11, bbox: [-71.0412,42.3603,-70.9711,42.3967], view: [-71.006,42.3785,14], attr: AM_A(A("https://www.digitalcommonwealth.org/", "Digital Commonwealth")) },
  { id: "nyc", from: 1905, to: 1925, title: "Hammond's New York City", sub: "Manhattan & the Bronx with elevated and subway lines", url: "https://allmaps.xyz/images/d180902cb93d5bf2/{z}/{x}/{y}.png", min: 10, bbox: [-73.9945,40.7001,-73.8426,40.8715], view: [-73.9686,40.7831,12.5], attr: AM_A(A("https://www.digitalcommonwealth.org/", "Digital Commonwealth")) },
  { id: "london1940", from: 1940, to: 1949, title: "London, National Grid plans", sub: "The City just before post-war rebuilding", url: NLS + "london_1940s/{z}/{x}/{y}.png", max: 19, min: 11, bbox: [-0.56,51.28,0.33,51.72], view: [-0.0984,51.5138,16], attr: NLS_A },
  { id: "rotterdam", from: 1940, to: 1949, title: "Rotterdam from the air", sub: "The city centre cleared after the 1940 bombing", url: "https://allmaps.xyz/maps/7fa68f258b316b33/{z}/{x}/{y}.png", min: 12, bbox: [4.4761,51.9124,4.4981,51.9265], view: [4.4871,51.9195,15], attr: AM_A(A("https://www.nationaalarchief.nl/", "Nationaal Archief")) },
  { id: "tokyo45", from: 1945, to: 1950, title: "Tokyo from the air, post-war", sub: "US Army aerial survey after the firebombing", url: "https://cyberjapandata.gsi.go.jp/xyz/ort_USA10/{z}/{x}/{y}.png", max: 17, min: 10, bbox: [122,24,146,46], view: [139.7671,35.6812,14.5], attr: GSI_A },
  { id: "france50", from: 1950, to: 1965, title: "France from the air", sub: "Post-war aerial photographs, nationwide", url: IGNF("ORTHOIMAGERY.ORTHOPHOTOS.1950-1965", "image/png"), max: 18, min: 9, bbox: [-5.2,41.3,9.6,51.1], view: [2.2945,48.8584,15.5], attr: IGNF_A },
  { id: "tenmile", from: 1950, to: 1960, title: "Great Britain, Ten-mile map", sub: "The whole island on one sheet", url: NLS + "ten_mile/general/{z}/{x}/{y}.png", max: 12, min: 4, bbox: [-9,49.7,2.2,61], view: [-3.2,54.6,5.5], attr: NLS_A },
  { id: "tokyo61", from: 1961, to: 1964, title: "Tokyo before the Olympics", sub: "Aerial photos from the run-up to the 1964 Games", url: "https://cyberjapandata.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png", max: 17, min: 10, bbox: [122,24,146,46], view: [139.70,35.6655,14.5], attr: GSI_A },
];
