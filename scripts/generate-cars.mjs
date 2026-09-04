import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Voitures et capacité réservoir de base (litres). */
const CARS = [
  ["Acura ARX-06 GTP", 88.96],
  ["Acura NSX GT3 EVO 22", 112.05],
  ["ARCA Chevrolet SS", 70.78],
  ["ARCA Ford Mustang", 70.78],
  ["ARCA Toyota Camry", 70.78],
  ["Aston Martin DBR9 GT1", 90.1],
  ["Aston Martin Vantage GT3 EVO", 106],
  ["Aston Martin Vantage GT4", 126.4],
  ["Audi 90 GTO", 120],
  ["Audi R8 LMS EVO II GT3", 121.1],
  ["Audi RS3 LMS Gen2 TCR", 100],
  ["BMW M Hybrid V8 (Evo)", 88.96],
  ["BMW M2 Racing (G87)", 120],
  ["BMW M4 G82 GT4 Evo", 105.23],
  ["BMW M4 GT3 EVO", 100],
  ["BMW M8 GTE", 91.98],
  ["Cadillac CTS-V Racecar", 94.64],
  ["Cadillac V-Series.R GTP", 88.96],
  ["Chevrolet Corvette C6.R GT1", 90.1],
  ["Chevrolet Corvette C8.R GTE", 96.9],
  ["Chevrolet Corvette Z06 GT3.R", 104.1],
  ["Dallara DW12", 68.71],
  ["Dallara F3", 45.5],
  ["Dallara IL-15", 75.7],
  ["Dallara IR-01", 80],
  ["Dallara IR18", 70],
  ["Dallara P217", 96.9],
  ["Euro Nascar V8GP", 98],
  ["Ferrari 296 Challenge", 140.06],
  ["Ferrari 296 GT3", 104.1],
  ["Ferrari 488 GTE", 90.09],
  ["Ferrari 499P", 88.96],
  ["FIA F4", 48.2],
  ["Ford GT GT2", 90],
  ["Ford GTE", 98.04],
  ["Ford Mustang FR500S", 58.3],
  ["Ford Mustang GT3", 110.15],
  ["Ford Mustang GT4", 99.94],
  ["Formula Vee", 20.06],
  ["Gen 4 Chevrolet Monte Carlo - 2003", 83.28],
  ["Gen 4 Ford Taurus - 2003", 83.28],
  ["Global Mazda MX-5 Cup", 45.05],
  ["Honda Civic Typre R TCR", 100],
  ["HPD ARX-01c", 80],
  ["Hyundai Elantra N TCR", 100],
  ["Hyundai Veloster N TCR", 100],
  ["Indy Pro 2000 PM-18", 40.13],
  ["Kia Optima", 68.14],
  ["Lamborghini Huracan GT3 EVO", 120],
  ["Legends Ford '34 Coupe", 20.06],
  ["Ligier JS P320", 99.94],
  ["Lotus 49", 179.58],
  ["Lotus 79", 154.56],
  ["Mclaren 570S GT4", 110.1],
  ["Mclaren 720S GT3 EVO", 110.15],
  ["Mercedes-AMG GT3 2020", 105.99],
  ["Mercedes-AMG GT4", 96.91],
  ["Mercedes-AMG W13 E Performance", 110.2],
  ["Nascar Cup Series Next Gen Chevrolet Camaro ZL1", 75.7],
  ["Nascar Cup Series Next Gen Ford Mustang", 75.7],
  ["Nascar Cup Series Next Gen Toyota Camry", 75.7],
  ["NASCAR Legends Buick LeSabre - 1987", 83.28],
  ["NASCAR Legends Chevrolet Monte Carlo - 1987", 83.28],
  ["NASCAR Legends Ford Thunderbird - 1987", 83.28],
  ["NASCAR Legends Pontiac Grand Prix - 1987", 83.28],
  ["Nascar O'Reilly Chevrolet Camaro", 68.71],
  ["Nascar O'Reilly Ford Mustang", 68.71],
  ["Nascar O'Reilly Toyota Supra", 68.71],
  ["NASCAR Truck Chevrolet Silverado", 68.71],
  ["NASCAR Truck Ford F150", 70.78],
  ["NASCAR Truck RAM", 70.78],
  ["NASCAR Truck Toyota Tundra TRD Pro", 68.71],
  ["Nissan GTP ZX-T", 90.55],
  ["Porsche 718 Cayman GT4 Clubsport MR", 87.1],
  ["Porsche 911 Cup (992.2)", 110.155],
  ["Porsche 911 GT3 R (992)", 99.94],
  ["Porsche 911 RSR", 99],
  ["Porsche 963 GTP", 88.96],
  ["Radical SR10", 97.2],
  ["Radical SR8", 77],
  ["Ray FF1600", 21.96],
  ["Renault Clio", 60.19],
  ["SCCA Spec Racer Ford", 26.5],
  ["Silver Crown", 283.91],
  ["Skip Barber Formula 2000", 19.7],
  ["Stock Car Brasil Chevrolet Cruze", 136.8],
  ["Stock Car Brasil Toyota Corrolla", 136.8],
  ["Street Stock - Casino M2", 83.28],
  ["Street Stock - Eagle T3", 83.28],
  ["Street Stock - Panther C1", 83.28],
  ["Super Formula Ligths", 46.18],
  ["Super Formula SF23", 95.01],
  ["Supercars Chevrolet Camaro Gen3", 133],
  ["Supercars Ford Mustang Gen 3", 133],
  ["Toyota GR86", 82.9],
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
const cars = CARS.map(([label, capaciteReservoirLitres]) => {
  let id = slug(label);
  let n = 2;
  while (usedIds.has(id)) {
    id = `${slug(label)}-${n}`;
    n += 1;
  }
  usedIds.add(id);
  return {
    id,
    label,
    capaciteReservoirLitres,
  };
}).sort((a, b) => a.label.localeCompare(b.label, "fr"));

const outPath = join(__dirname, "..", "src", "endurance", "data", "cars.json");
writeFileSync(outPath, `${JSON.stringify({ cars }, null, 2)}\n`, "utf8");
console.log(`Wrote ${cars.length} cars to ${outPath}`);
