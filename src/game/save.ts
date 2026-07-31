import type { Player } from "./player.ts";

/**
 * セーブ（設計書 5.4 / 手順書 5-4）。
 *
 * **周回を跨いで残すもの**
 *   - 発見済み呪文（呪文帳）。掘り当てた綴りごと
 *   - 未詠唱の記録
 *   - 見た断章・到達したエンディング（Phase 6 で追加）
 *
 * **周回でリセットするもの**
 *   - 進行状況・HP/MP・レベル・所持アイテム
 *
 * 知識だけが積み上がる。プレイヤー自身が強くなる、という成長軸そのもの。
 */

const KEY = "funsho-no-yoru/v1";

type SaveData = {
  version: 1;
  grimoire: Array<[number, string]>;
  unspoken: number[];
  /** Phase 6 で使う */
  fragments?: number[];
  endings?: string[];
};

export function saveProgress(player: Player): void {
  const data: SaveData = {
    version: 1,
    grimoire: [...player.grimoire.entries()],
    unspoken: [...player.unspoken],
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
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
    player.grimoire = new Map(data.grimoire);
    player.unspoken = new Set(data.unspoken ?? []);
    return true;
  } catch (e) {
    // 壊れたセーブでクラッシュさせない（手順書 9-3）
    console.warn("セーブデータが壊れています。無視します", e);
    return false;
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("セーブの削除に失敗しました", e);
  }
}
