export const CATEGORY_LABELS: Record<string, string> = {
  bebida: "Bebida",
  botella: "Botella",
  comida: "Comida",
  otro: "Otro",
};

/** Curated unit choices per category — kept as a picker so the field stays unambiguous. */
export const UNIT_OPTIONS: Record<string, string[]> = {
  bebida: ["lata", "botella", "vaso", "copa", "trago"],
  botella: ["botella", "garrafa", "litro"],
  comida: ["porción", "pieza", "charola", "kg"],
  otro: ["pieza", "paquete", "kg", "litro"],
};

/** Only drinks (loose or bottled) carry a meaningful volume in milliliters. */
export function categoryHasVolume(category: string): boolean {
  return category === "bebida" || category === "botella";
}
