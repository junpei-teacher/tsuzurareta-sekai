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

/**
 * 属性の日本語表記。
 *
 * 対象は中高生なので、`NAME` `NONE` のままでは何のことか分からない。
 * 一字に畳んであるのは戦闘画面の相性欄が狭いためで、
 * 呪文帳では `属性名 + "属性"` の形で出す。
 */
export const ELEMENT_JP: Record<Element, string> = {
  FIRE: "火", ICE: "氷", BOLT: "雷",
  NAME: "名", HEAL: "癒", NONE: "無",
};

/** 帯の日本語表記。「コモン」より「初級」のほうが強さの順が分かる */
export const TIER_JP: Record<Tier, string> = {
  DUD: "不発", COMMON: "初級", UNCOMMON: "中級", RARE: "上級", MYTH: "神話級",
};

const TARGET_JP: Record<SpellTarget, string> = {
  SINGLE: "単体", ALL: "全体", SELF: "自分",
};

/** 説明文に出す属性名。呪文帳では「火」ではなく「火属性」と書く */
const ELEMENT_LABEL: Record<Element, string> = {
  FIRE: "火属性", ICE: "氷属性", BOLT: "雷属性",
  NAME: "名属性", HEAL: "回復", NONE: "無属性",
};

/**
 * 説明文の前半と後半。**あいだに属性の絵記号を挟むため**に割ってある。
 *
 * 「火属性〔炎〕　威力24」の形にすると、字と記号が同じ場所に並ぶので、
 * どの記号が何かを、呪文帳を開くたびに覚え直せる。
 * 相性の一覧は戦闘中は出さない（設計書 4.4）ので、
 * **記号を覚える経路はここと、詠唱の候補欄だけである。**
 */
export type SpellSummary = { head: string; tail: string };

/**
 * 呪文帳に出す一行の説明。**フレーバーではなく、使うための情報を出す。**
 *
 * 以前ここには「ミラが最初に教えてくれた言葉。」のような一文が出ていた。
 * 読み物としては良いが、戦闘中に呪文帳を開く人が知りたいのは
 * **何属性で、どれくらい強くて、何に効くか**である。
 */
export function spellSummary(s: Spell): SpellSummary {
  const tier = TIER_JP[s.tier];
  const head = `${tier}　${ELEMENT_LABEL[s.element]}`;

  if (s.element === "HEAL") {
    return { head, tail: s.power >= 999 ? "すべて元に戻す" : `HPを ${s.power} 回復` };
  }
  if (s.power === 0) {
    return { head, tail: STATUS_JP[s.status?.kind ?? "CLEANSE"] };
  }
  const note = s.element === "NONE" ? "相性を受けにくい" : "弱点の相手に2倍";
  return { head, tail: `威力${s.power}　${TARGET_JP[s.target]}　${note}` };
}

/** 状態変化のやさしい言い換え。効果の説明にそのまま使う */
export const STATUS_JP: Record<StatusKind, string> = {
  DEF_DOWN: "相手の守りを下げる",
  SLOW:     "相手の動きを鈍らせる",
  SILENCE:  "相手の呪文を封じる",
  BURN:     "相手を燃やし続ける",
  FREEZE:   "相手を凍らせて動けなくする",
  POWER_UP: "次の呪文の威力を上げる",
  MP_HALF:  "次の呪文のMPを半分にする",
  REVEAL:   "相手の弱点を見抜く",
  FLEE_UP:  "確実に逃げられるようにする",
  SHIELD:   "攻撃を一度だけ肩代わりする",
  ACC_DOWN: "相手の攻撃を当たりにくくする",
  CLEANSE:  "自分の状態異常を治す",
  GUARD:    "受けるダメージを半分にする",
};

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
