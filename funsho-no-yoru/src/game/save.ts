import type { Player, Riddle } from "./player.ts";
import { MIN_WORD_LENGTH } from "../spell/resolver.ts";
import { activeRiddleIds } from "../ui/dialogue.ts";
import { clearRun } from "./checkpoint.ts";

/**
 * セーブ（設計書 5.4 / 手順書 5-4）。
 *
 * **周回を跨いで残すもの**
 *   - 発見済み呪文（呪文帳）。掘り当てた綴りごと
 *   - 未詠唱の記録
 *   - 見た断章・到達したエンディング（Phase 6 で追加）
 *
 * **周回でリセットするもの**
 *   - 進行状況・HP/MP・所持アイテム（中断時は checkpoint.ts で別途保存）
 *
 * 知識だけが積み上がる。プレイヤー自身が強くなる、という成長軸そのもの。
 */

const KEY = "funsho-no-yoru/v1";

type SaveData = {
  version: 1;
  grimoire: Array<[number, string]>;
  unspoken: number[];
  fragments?: number[];
  endings?: string[];
  /**
   * 見つけた欠けた綴り。埋めないまま閉じたぶんを持ち越す。
   * 綴りだけを持っていた頃の形（`[id, "H A _ A L"]`）も読めるようにしてある
   */
  riddles?: Array<[number, Riddle | string]>;
};

export function saveProgress(player: Player): void {
  const data: SaveData = {
    version: 1,
    grimoire: [...player.grimoire.entries()],
    unspoken: [...player.unspoken],
    fragments: [...player.seenFragments],
    endings: [...player.seenEndings],
    riddles: [...player.riddles.entries()],
  };
  try {
    const raw = JSON.stringify(data);
    if (localStorage.getItem(KEY) !== raw) localStorage.setItem(KEY, raw);
  } catch (e) {
    console.warn("セーブに失敗しました", e);
  }
}

export function loadProgress(player: Player): boolean {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn("セーブの読み込みに失敗しました", e);
    return false;
  }
  if (!raw) return false;

  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1 || !Array.isArray(data.grimoire)) return false;
    // 三文字未満は呪文にならなくなった（設計書 3.4.3）。
    // それ以前のセーブには `A` や `X` が載っていて、
    // **候補には出るのに唱えると「言葉になっていない」**という食い違いが起きる
    player.grimoire = new Map(
      data.grimoire.filter(([, word]) => word.length >= MIN_WORD_LENGTH),
    );
    player.unspoken = new Set(data.unspoken ?? []);
    player.seenFragments = new Set(data.fragments ?? []);
    player.seenEndings = new Set(data.endings ?? []);
    // 置く紙を差し替えると、古いセーブに**どこにも無い紙の写し**が残る。
    // 今このゲームに置いてある欠字だけを持ち越す
    const placed = activeRiddleIds();
    player.riddles = new Map(
      (data.riddles ?? [])
        .filter(([id]) => placed.has(id))
        .map(([id, r]) =>
          [id, typeof r === "string" ? { mask: r, place: "" } : r] as const),
    );
    return true;
  } catch (e) {
    // 壊れたセーブでクラッシュさせない（手順書 9-3）
    console.warn("セーブデータが壊れています。無視します", e);
    return false;
  }
}

export function clearProgress(): void {
  clearRun();
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("セーブの削除に失敗しました", e);
  }
}
