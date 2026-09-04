import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Circuits route iRacing (section Road Course). */
const ROAD_VENUES = [
  { venue: "Atlanta Motor Speedway", layouts: ["Road - 2008"] },
  {
    venue: "Auto Club Speedway",
    layouts: ["Competition", "Moto", "Interior"],
  },
  {
    venue: "Autodromo Internazionale Enzo e Dino Ferrari",
    layouts: ["Grand Prix", "Moto"],
  },
  {
    venue: "Autodromo Nazionale Monza",
    layouts: [
      "Grand Prix",
      "GP without first chicane",
      "GP without chicanes",
      "Combined",
      "Combined without first chicane",
      "Combined without chicanes",
      "Junior",
    ],
  },
  {
    venue: "Autódromo José Carlos Pace",
    layouts: ["Grand Prix", "Moto"],
  },
  {
    venue: "Barber Motorsports Park",
    layouts: ["Full Course", "Short A", "Short B"],
  },
  { venue: "Brands Hatch Circuit", layouts: ["Grand Prix", "Indy"] },
  { venue: "Canadian Tire Motorsports Park", layouts: [] },
  {
    venue: "Charlotte Motor Speedway",
    layouts: [
      "Roval",
      "Roval - 2018",
      "Roval Long - 2018",
      "Legends RC Short - 2018",
      "Legends RC Medium - 2018",
      "Legends RC Long - 2018",
    ],
  },
  { venue: "Chicago Street Course", layouts: ["Prototype", "2023 Cup"] },
  {
    venue: "Circuit de Barcelona Catalunya",
    layouts: ["Grand Prix", "National", "Club", "Moto", "Historic"],
  },
  { venue: "Circuit de Nevers Magny-Cours", layouts: [] },
  { venue: "Circuit de Lédenon", layouts: [] },
  {
    venue: "Circuit de Spa-Francorchamps",
    layouts: ["Endurance", "Classic Pits", "Grand Prix Pits"],
  },
  {
    venue: "Circuit des 24 Heures du Mans",
    layouts: ["24 Heures du Mans", "Historic"],
  },
  {
    venue: "Circuit of the Americas",
    layouts: ["Grand Prix", "East", "West"],
  },
  { venue: "Circuit Gilles Villeneuve", layouts: [] },
  {
    venue: "Circuit Park Zandvoort",
    layouts: [
      "Grand Prix",
      "Nationaal",
      "Grand Prix w/chicane",
      "Oostelijk",
      "Grand Prix - 2009",
      "National - 2009",
      "Chicane - 2009",
      "Oostelijk - 2009",
      "Club - 2009",
    ],
  },
  { venue: "Circuit Zolder", layouts: ["Grand Prix", "Alternate"] },
  {
    venue: "Circuito de Jerez - Ángel Nieto",
    layouts: ["Grand Prix", "Moto"],
  },
  {
    venue: "Daytona International Speedway",
    layouts: [
      "Road Course",
      "NASCAR Road",
      "Moto",
      "Short",
      "Road Course - 2008",
      "Moto - 2008",
      "Short - 2008",
    ],
  },
  { venue: "Detroit Grand Prix at Belle Isle", layouts: [] },
  {
    venue: "Donington Park Racing Circuit",
    layouts: ["Grand Prix", "National"],
  },
  {
    venue: "Fuji International Speedway",
    layouts: ["Grand Prix", "No Chicane"],
  },
  {
    venue: "Hockenheimring Baden-Württemberg",
    layouts: [
      "Grand Prix",
      "National A",
      "National B",
      "Short A",
      "Short B",
      "Outer",
      "Porsche Experience Center - East",
      "Porsche Experience Center - Outer",
      "Porsche Experience Center - West",
      "Porsche Experience Center - Handling",
    ],
  },
  {
    venue: "Homestead Miami Speedway",
    layouts: ["Road Course A", "Road Course B"],
  },
  { venue: "Hungaroring", layouts: [] },
  {
    venue: "Indianapolis Motor Speedway",
    layouts: ["Road Course", "Road Course - 2009", "Bike - 2009"],
  },
  { venue: "Iowa Speedway", layouts: ["Road Course"] },
  {
    venue: "Kansas Speedway",
    layouts: ["Road Course", "Infield Road Course"],
  },
  {
    venue: "Knockhill Racing Circuit",
    layouts: [
      "International",
      "International Reverse",
      "National",
      "National Reverse",
    ],
  },
  {
    venue: "Lånkebanen (Hell RX)",
    layouts: ["Road Short", "Road Long"],
  },
  {
    venue: "Las Vegas Motor Speedway",
    layouts: [
      "Road Course Combined",
      "Road Course Long",
      "Road Course Short",
    ],
  },
  {
    venue: "Lime Rock Park",
    layouts: ["Grand Prix", "Classic", "Chicane", "West Bend Chicane"],
  },
  { venue: "Long Beach Street Circuit", layouts: [] },
  {
    venue: "Mid-Ohio Sports Car Course",
    layouts: ["Full Course", "Chicane", "Short", "Alt Oval"],
  },
  {
    venue: "MotorLand Aragón",
    layouts: [
      "Grand Prix",
      "National",
      "West",
      "Motorcycle Grand Prix",
      "Motorcycle National",
      "Outer",
      "Touring Car",
    ],
  },
  {
    venue: "Motorsport Arena Oschersleben",
    layouts: ["Grand Prix", "Alternate", "B Course", "C Course"],
  },
  { venue: "Mount Panorama Circuit", layouts: [] },
  {
    venue: "New Hampshire Motor Speedway",
    layouts: [
      "Road Course",
      "Road Course with South Oval",
      "Road Course with North Oval",
    ],
  },
  {
    venue: "New Jersey Motorsports Park",
    layouts: [
      "Thunderbolt",
      "Thunderbolt w/both chicanes",
      "Thunderbolt w/first chicane",
      "Thunderbolt w/second chicane",
    ],
  },
  {
    venue: "Nürburgring Combined",
    layouts: [
      "Gesamtstrecke Short w/out Arena",
      "Gesamtstrecke 24h",
      "Gesamtstrecke VLN",
      "Gesamtstrecke Long",
    ],
  },
  {
    venue: "Nürburgring Grand-Prix-Strecke",
    layouts: [
      "Grand Prix w/out Arena",
      "Grand Prix",
      "BES/WEC",
      "Sprintstrecke",
      "Kurzanbindung w/out Arena",
      "Müllenbachschleife",
    ],
  },
  {
    venue: "Nürburgring Nordschleife",
    layouts: ["Industriefahrten", "Touristenfahrten"],
  },
  {
    venue: "Okayama International Circuit",
    layouts: ["Full Course", "Short"],
  },
  {
    venue: "Oran Park Raceway",
    layouts: ["Grand Prix", "South", "North", "Road A", "Road B", "Moto"],
  },
  {
    venue: "Oulton Park Circuit",
    layouts: [
      "International",
      "Fosters",
      "Island",
      "Intl w/out Hislop",
      "Intl w/out Brittens",
      "Intl w/no Chicanes",
      "Fosters w/Hislop",
      "Island Historic",
    ],
  },
  { venue: "Phillip Island Circuit", layouts: [] },
  {
    venue: "Red Bull Ring",
    layouts: ["Grand Prix", "North", "National"],
  },
  { venue: "Road America", layouts: ["Full Course", "Bend"] },
  { venue: "Road Atlanta", layouts: ["Full Course", "Club", "Short"] },
  {
    venue: "Rockingham Speedway",
    layouts: ["Road Course", "Infield Road Course", "Short Road Course"],
  },
  { venue: "Rudskogen Motorsenter", layouts: [] },
  { venue: "Sandown International Motor Raceway", layouts: [] },
  {
    venue: "Sebring International Raceway",
    layouts: ["International", "Club", "Modified"],
  },
  {
    venue: "Silverstone Circuit",
    layouts: ["Grand Prix", "International", "National"],
  },
  { venue: "Snetterton Circuit", layouts: ["300", "200", "100"] },
  {
    venue: "Sonoma Raceway",
    layouts: [
      "Open Wheel 2012-2018",
      "Open Wheel 2008-2011",
      "Cup Historic",
      "Cup",
      "Open Wheel pre-2008",
    ],
  },
  {
    venue: "Summit Point Raceway",
    layouts: [
      "Summit Point Raceway",
      "Jefferson Circuit",
      "Short",
      "Jefferson Reverse",
      "School",
    ],
  },
  {
    venue: "Suzuka International Racing Course",
    layouts: ["Grand Prix", "Moto", "East", "West", "West w/chicane"],
  },
  {
    venue: "Tsukuba Circuit",
    layouts: [
      "2000 Full",
      "2000 Moto",
      "2000 Short",
      "1000 Full",
      "1000 Outer",
      "1000 Chicane",
      "1000 Full Reverse",
    ],
  },
  {
    venue: "Twin Ring Motegi",
    layouts: ["Grand Prix", "East", "West"],
  },
  {
    venue: "Virginia International Raceway",
    layouts: [
      "Full Course",
      "North Course",
      "South Course",
      "Grand Course",
      "Patriot Course",
    ],
  },
  {
    venue: "Watkins Glen International",
    layouts: ["Cup", "Boot", "Classic Boot", "Classic"],
  },
  {
    venue: "WeatherTech Raceway at Laguna Seca",
    layouts: ["Full Course", "School"],
  },
  { venue: "Willow Springs International Raceway", layouts: [] },
  {
    venue: "Winton Motor Raceway",
    layouts: ["National Circuit", "Club Circuit"],
  },
  {
    venue: "World Wide Technology Raceway (Gateway)",
    layouts: ["Road Course"],
  },
  {
    venue: "[Legacy] Charlotte Motor Speedway - 2008",
    layouts: ["Infield Road Course"],
  },
  {
    venue: "[Legacy] Lime Rock Park",
    layouts: ["Full Course", "Chicane", "School"],
  },
  {
    venue: "[Legacy] Phoenix Raceway - 2008",
    layouts: ["Road Course"],
  },
  {
    venue: "[Legacy] Pocono Raceway - 2009",
    layouts: ["International", "East", "South", "North"],
  },
  {
    venue: "[Legacy] Silverstone Circuit - 2008",
    layouts: [
      "Grand Prix",
      "Historical Grand Prix",
      "International",
      "Southern",
      "National",
    ],
  },
  {
    venue: "[Legacy] Texas Motor Speedway - 2009",
    layouts: [
      "Road Course Combined",
      "Road Course Long",
      "Road Course Short A",
      "Road Course Short B",
    ],
  },
];

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const usedIds = new Set();

function uniqueId(venue, layout) {
  let base = layout ? `${slug(venue)}-${slug(layout)}` : slug(venue);
  let id = base;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  usedIds.add(id);
  return id;
}

const tracks = [];

for (const { venue, layouts } of ROAD_VENUES) {
  const variantList = layouts.length > 0 ? layouts : [null];
  for (const layout of variantList) {
    const label = layout ? `${venue} — ${layout}` : venue;
    tracks.push({
      id: uniqueId(venue, layout ?? ""),
      label,
      category: "Road",
    });
  }
}

tracks.sort((a, b) => a.label.localeCompare(b.label, "fr"));

const output = {
  tracks,
};

const outPath = join(__dirname, "..", "src", "endurance", "data", "tracks.json");
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${tracks.length} road layouts to ${outPath}`);
