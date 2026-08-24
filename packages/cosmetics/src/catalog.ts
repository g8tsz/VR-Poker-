import type { CosmeticKind, CosmeticSku } from "./types.ts";

const sku = (
  id: string,
  kind: CosmeticKind,
  name: string,
  description: string,
  priceChips: number,
  tags: string[] = [],
): CosmeticSku => ({
  id,
  kind,
  name,
  description,
  priceChips,
  grantsChips: 0,
  tags,
});

/** Seed catalog — virtual vanity only, no chip minting. */
export const DEFAULT_CATALOG: CosmeticSku[] = [
  sku("skin-neon-52", "card_skin", "Neon 52", "Glowing edge card backs for late-night sessions.", 2_500, ["neon", "cards"]),
  sku("skin-wood-classic", "card_skin", "Classic Wood", "Warm walnut card backs.", 1_200, ["classic", "cards"]),
  sku("theme-vegas-night", "table_theme", "Vegas Night", "Deep felt with gold rail lighting.", 5_000, ["table", "dark"]),
  sku("theme-clubhouse", "table_theme", "Clubhouse", "Muted green felt and brass accents.", 3_500, ["table", "classic"]),
  sku("avatar-cowboy-hat", "avatar_item", "Cowboy Hat", "Wide-brim hat for the showdown.", 1_800, ["avatar", "hat"]),
  sku("avatar-shades", "avatar_item", "Shades", "Mirror aviators — unreadable tells.", 900, ["avatar", "face"]),
  sku("avatar-lucky-chain", "avatar_item", "Lucky Chain", "Gold chain cosmetic, zero RNG boost.", 4_200, ["avatar", "jewelry"]),
];

export function catalogById(catalog: CosmeticSku[]): Map<string, CosmeticSku> {
  return new Map(catalog.map((s) => [s.id, s]));
}
