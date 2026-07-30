import { normalizeWord, spellHash } from "./hash.ts";

// 設計書 3.4 — 余りでレア度帯、商で帯内の個体を決める

export type Tier = "DUD" | "COMMON" | "UNCOMMON" | "RARE" | "MYTH";

type TierDef = {
  tier: Tier;
  /** r < limit ならこの帯（累積境界） */
  limit: number;
  /** 帯に属する呪文の種類数 */
  size: number;
  /** 表示用の帯名 */
  label: string;
  /** 設計上の出現率（%）。検証スクリプトが参照する */
  designedRate: number;
};

// 【凍結】この境界値を変更してはならない。
// Phase 2 の逆引きで決めた呪文名は、この配分に紐づいている。
// 境界を動かすと、巻物の呪文が別の帯へ滑り落ちる（設計書 3.5）。
export const TIERS: readonly TierDef[] = [
  { tier: "DUD",      limit:  1000, size:  0, label: "不発",       designedRate: 10 },
  { tier: "COMMON",   limit:  4700, size: 20, label: "コモン",     designedRate: 37 },
  { tier: "UNCOMMON", limit:  8200, size: 20, label: "アンコモン", designedRate: 35 },
  { tier: "RARE",     limit:  9700, size: 12, label: "レア",       designedRate: 15 },
  { tier: "MYTH",     limit: 10000, size:  5, label: "神話",       designedRate:  3 },
] as const;

/** 帯ごとの通し番号オフセット。全呪文に一意な spellId を振るために使う */
const TIER_OFFSET: Record<Tier, number> = (() => {
  const offset = {} as Record<Tier, number>;
  let acc = 0;
  for (const t of TIERS) {
    offset[t.tier] = acc;
    acc += t.size;
  }
  return offset;
})();

/** 呪文総数（不発を除く）。設計書では 57 種 */
export const SPELL_COUNT = TIERS.reduce((n, t) => n + t.size, 0);

export type Resolution = {
  /** 正規化後の入力 */
  word: string;
  hash: number;
  /** 帯の判定に使った余り（0-9999） */
  r: number;
  tier: Tier;
  label: string;
  /** 帯内の個体番号。不発なら -1 */
  index: number;
  /** 全呪文を通した一意ID。不発なら -1 */
  spellId: number;
};

/**
 * 入力文字列からどの呪文が発動するかを決める。
 * 空文字は不発として扱う。
 */
export function resolveSpell(input: string): Resolution {
  const word = normalizeWord(input);
  const hash = spellHash(word);
  const r = hash % 10000;
  const q = Math.floor(hash / 10000);

  // 空入力は無条件で不発（ハッシュ値に関わらず）
  if (word.length === 0) {
    return { word, hash, r, tier: "DUD", label: "不発", index: -1, spellId: -1 };
  }

  for (const t of TIERS) {
    if (r < t.limit) {
      if (t.size === 0) {
        return { word, hash, r, tier: t.tier, label: t.label, index: -1, spellId: -1 };
      }
      const index = q % t.size;
      return {
        word, hash, r,
        tier: t.tier,
        label: t.label,
        index,
        spellId: TIER_OFFSET[t.tier] + index,
      };
    }
  }

  // r は必ず 0-9999 なので到達しないが、型のために残す
  return { word, hash, r, tier: "DUD", label: "不発", index: -1, spellId: -1 };
}
