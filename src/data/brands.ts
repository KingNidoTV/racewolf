export interface BrandEntry {
  id: string;
  name: string;
  color: string;
  slug: string;
}

/** Catalogue constructeurs ATH (ID = nom de fichier logo recommandé). */
export const BRANDS: BrandEntry[] = [
  { id: "01", name: "Ferrari", color: "#DC0000", slug: "ferrari" },
  { id: "02", name: "Porsche", color: "#FFFFFF", slug: "porsche" },
  { id: "03", name: "BMW", color: "#0066B1", slug: "bmw" },
  { id: "04", name: "Mercedes-Benz", color: "#00ffc8", slug: "mercedes-benz" },
  { id: "05", name: "Audi", color: "#4A4A4A", slug: "audi" },
  { id: "06", name: "Lamborghini", color: "#9ACD32", slug: "lamborghini" },
  { id: "07", name: "McLaren", color: "#FF8700", slug: "mclaren" },
  { id: "08", name: "Aston Martin", color: "#006F51", slug: "aston-martin" },
  { id: "09", name: "Ford", color: "#003399", slug: "ford" },
  { id: "10", name: "Chevrolet", color: "#FFD700", slug: "chevrolet" },
  { id: "11", name: "Cadillac", color: "#C9A227", slug: "cadillac" },
  { id: "12", name: "Acura", color: "#004B87", slug: "acura" },
  { id: "13", name: "Honda", color: "#CC0000", slug: "honda" },
  { id: "14", name: "Toyota", color: "#EB0A1E", slug: "toyota" },
  { id: "31", name: "RAM", color: "#5E6670", slug: "ram" },
  { id: "15", name: "Lexus", color: "#F8F8F8", slug: "lexus" },
  { id: "16", name: "Nissan", color: "#C3002F", slug: "nissan" },
  { id: "17", name: "Hyundai", color: "#002C5F", slug: "hyundai" },
  { id: "18", name: "Kia", color: "#BB162B", slug: "kia" },
  { id: "19", name: "Mazda", color: "#E10600", slug: "mazda" },
  { id: "20", name: "Volkswagen", color: "#001E50", slug: "volkswagen" },
  { id: "21", name: "Subaru", color: "#003DA5", slug: "subaru" },
  { id: "22", name: "Renault", color: "#FFD100", slug: "renault" },
  { id: "23", name: "Lotus", color: "#004225", slug: "lotus" },
  { id: "24", name: "Ligier", color: "#002147", slug: "ligier" },
  { id: "25", name: "Dallara", color: "#B22222", slug: "dallara" },
  { id: "26", name: "Radical", color: "#6A0DAD", slug: "radical" },
  { id: "27", name: "Caterham", color: "#006400", slug: "caterham" },
  { id: "28", name: "RUF", color: "#555555", slug: "ruf" },
  { id: "29", name: "Pontiac", color: "#C41E3A", slug: "pontiac" },
  { id: "30", name: "Buick", color: "#A7A8AA", slug: "buick" },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Associe un libellé iRacing (ex. « BMW M4 GT4 ») au constructeur du catalogue. */
export function resolveBrand(carBrand: string): BrandEntry | null {
  const norm = normalize(carBrand);
  if (!norm) return null;

  for (const brand of BRANDS) {
    const brandNorm = normalize(brand.name);
    const primary = brandNorm.split(" ")[0] ?? brandNorm;

    if (norm === brandNorm || norm.startsWith(`${brandNorm} `)) {
      return brand;
    }
    if (primary.length >= 3 && norm.startsWith(primary)) {
      return brand;
    }
    if (norm.includes(brandNorm) && brandNorm.length >= 3) {
      return brand;
    }
  }

  for (const brand of BRANDS) {
    if (norm.includes(brand.slug.replace(/-/g, " "))) {
      return brand;
    }
  }

  if (norm.includes("mercedes")) {
    return BRANDS.find((b) => b.id === "04") ?? null;
  }

  if (
    norm.includes("dallara") ||
    norm.includes("super formula") ||
    /\bsf\s?\d/.test(norm)
  ) {
    return BRANDS.find((b) => b.id === "25") ?? null;
  }

  if (norm.includes("ram") && !norm.includes("program")) {
    return BRANDS.find((b) => b.id === "31") ?? null;
  }

  return null;
}

export function brandColor(carBrand: string, fallback: string): string {
  return resolveBrand(carBrand)?.color ?? fallback;
}

/** Couleur du cadre logo : priorité n° voiture (équipe) puis constructeur. */
export function resolveCarColor(
  carNumber: string,
  carBrand: string,
  fallback: string,
): string {
  const num = carNumber.replace(/\D/g, "") || carNumber.trim();
  if (num === "31") {
    return BRANDS.find((b) => b.id === "31")?.color ?? "#5E6670";
  }
  return brandColor(carBrand, fallback);
}
