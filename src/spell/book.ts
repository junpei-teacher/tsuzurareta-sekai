import rawBook from "../../data/spells.json";
import { normalizeWord } from "./hash.ts";
import { resolveSpell, type Tier } from "./resolver.ts";

/** 属性。NAME は本作固有で、言葉・名前に干渉する呪文に割り当てる */
export type Element = "FIRE" | "ICE" | "BOLT" | "NAME" | "HEAL" | "NONE";
export type SpellTarget = "SINGLE" | "ALL" | "SELF";

export type StatusKind =
  | "DEF_DOWN" | "SLOW" | "SILENCE" | "BURN" | "FREEZE"
  | "POWER_UP" | "MP_HALF" | "REVEAL" | "FLEE_UP" | "SHIELD"
  | "ACC_DOWN" | "CLEANSE" | "GUARD";

export type Spell = {
  id: number;
  tier: Tier;
  index: number;
  origin: "scroll" | "taught" | "discovery";
  name: string;
  /** ゲーム内に表示される文字列。discovery は空 */
  canonical: string;
  element: Element;
  target: SpellTarget;
  power: number;
  mp: number;
  fx: string;
  flavor: string;
  note?: string;
  status?: { kind: StatusKind; turns: number; magnitude?: number };
};

const SPELLS = (rawBook as unknown as { spells: Spell[] }).spells;

const BY_ID = new Map<number, Spell>();
for (const s of SPELLS) BY_ID.set(s.id, s);

export function allSpells(): readonly Spell[] {
  return SPELLS;
}

export function spellById(id: number): Spell | undefined {
  return BY_ID.get(id);
}

/** 入力文字列がどの呪文になるかを引く。不発なら undefined */
export function spellFor(input: string): Spell | undefined {
  const res = resolveSpell(input);
  if (res.spellId < 0) return undefined;
  return BY_ID.get(res.spellId);
}

/** ゲーム内に文字列が登場する呪文（巻物・口伝） */
export function namedSpells(): readonly Spell[] {
  return SPELLS.filter((s) => s.canonical.length > 0);
}

/**
 * 呪文帳に載っている呪文の文字列。サジェストの辞書になる。
 * discovery の呪文は canonical を持たないので、
 * プレイヤーが実際に打った文字列を別途登録する必要がある。
 */
export function canonicalOf(id: number): string {
  return BY_ID.get(id)?.canonical ?? "";
}

/** 起動時の自己点検。canonical が正しい呪文に着地するかを確認する */
export function verifyCanonicals(): string[] {
  const errors: string[] = [];
  for (const s of SPELLS) {
    if (!s.canonical) continue;
    const res = resolveSpell(s.canonical);
    if (res.spellId !== s.id) {
      errors.push(`${s.name}: "${s.canonical}" → spellId ${res.spellId}（期待 ${s.id}）`);
    }
    if (normalizeWord(s.canonical) !== s.canonical) {
      errors.push(`${s.name}: "${s.canonical}" が正規化前提を満たしていない`);
    }
  }
  return errors;
}
