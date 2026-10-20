import rawEndings from "../../data/endings.json";
import rawFragments from "../../data/fragments.json";
import { normalizeWord, spellHash } from "../spell/hash.ts";
import { spellFor } from "../spell/book.ts";

/**
 * 禁書への書き込みの判定（設計書 6.2）。
 *
 * 判定順：
 *   1. 空欄            → 「本を閉じる」
 *   2. 専用エンディング → 手書き。@SELF はプレイヤー名に対応
 *   3. 神話級呪文      → 発掘専用の4種は canonical を持たないので帯で判定する
 *   4. それ以外        → 断章プールから1本
 */

export type Ending = { title: string; lines: string[] };

const ENDINGS = (rawEndings as unknown as { endings: Record<string, Ending> }).endings;
const FRAGMENTS = (rawFragments as unknown as { fragments: string[][] }).fragments;

/** プレイヤー自身の名前を指すキー */
const SELF = "@SELF";
/** 神話級に着地した語を指すキー */
const MYTH = "@MYTH";

/**
 * 書き込んだ語を1つのキーへ正規化する。
 * 重複を除き、アルファベット順に並べる。**語順は問わない。**
 */
export function endingKey(words: string[], playerName: string): string {
  const self = normalizeWord(playerName);
  const uniq = [
    ...new Set(
      words
        .map(normalizeWord)
        .filter((w) => w.length > 0)
        // 自分の名前は @SELF に畳む。ただし MIRA と名乗った場合は畳まない
        .map((w) => (self && self !== "MIRA" && w === self ? SELF : w)),
    ),
  ].sort();
  return uniq.join("|");
}

export type Resolution =
  | { kind: "authored"; key: string; ending: Ending }
  | { kind: "fragment"; index: number; lines: string[] };

export function resolveEnding(words: string[], playerName: string): Resolution {
  const key = endingKey(words, playerName);

  const authored = ENDINGS[key];
  if (authored) return { kind: "authored", key, ending: authored };

  // 神話級を掘り当てた語で書いた場合。発掘専用の4種を拾うための規則判定
  const hasMyth = words.some((w) => spellFor(w)?.tier === "MYTH");
  if (hasMyth) {
    const m = ENDINGS[MYTH];
    if (m) return { kind: "authored", key: MYTH, ending: m };
  }

  const index = spellHash(key) % FRAGMENTS.length;
  return { kind: "fragment", index, lines: FRAGMENTS[index] ?? [] };
}

export function fragmentCount(): number {
  return FRAGMENTS.length;
}

export function authoredCount(): number {
  return Object.keys(ENDINGS).length;
}

export function fragmentAt(i: number): string[] {
  return FRAGMENTS[i] ?? [];
}

export function endingTitle(key: string): string {
  return ENDINGS[key]?.title ?? "";
}

/**
 * 専用エンディングの一覧。**書いた順のまま返す。**
 *
 * 収集画面はこの並びで番号を振るので、`data/endings.json` の行を入れ替えると
 * 番号がずれる。追加は末尾に足すこと。
 */
export function authoredEntries(): Array<{ key: string; ending: Ending }> {
  return Object.entries(ENDINGS).map(([key, ending]) => ({ key, ending }));
}
