import rawWeapons from "../../data/series2/weapons.json" with { type: "json" };

export type WeaponDef = {
  id: string;
  name: string;
  attack: number;
  description: string;
};

const weapons = (rawWeapons as { weapons: WeaponDef[] }).weapons;
const byId = new Map(weapons.map((weapon) => [weapon.id, weapon]));

export const WEAPONS: readonly WeaponDef[] = weapons;

export function weaponById(id: string | null | undefined): WeaponDef | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function validWeaponId(id: string): boolean {
  return byId.has(id);
}
