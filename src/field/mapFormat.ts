/**
 * 部屋の読み込み（設計書 7.4）。
 *
 * パーサ本体は `mapParse.ts` にある。**ここは Vite 固有の部分だけ。**
 * `import.meta.glob` はビルド時に展開される仕組みなので、
 * 素の Node（tools/*.ts）からは読めない。分けておくと道具が同じパーサを使える。
 */
export * from "./mapParse.ts";
import { parseMap, type GameMap } from "./mapParse.ts";

// ── マップの読み込み ─────────────────────────────

// 拡張子は .room。`.map` はソースマップ用の拡張子で、
// 開発サーバーが JSON として配信してしまいモジュールにならない。
const files = import.meta.glob("../../data/maps/*.room", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const MAPS = new Map<string, GameMap>();
for (const [path, text] of Object.entries(files)) {
  try {
    const m = parseMap(text);
    MAPS.set(m.id, m);
  } catch (e) {
    console.error(`${path} の読み込みに失敗:`, e);
  }
}

export function getMap(id: string): GameMap {
  const m = MAPS.get(id);
  if (!m) throw new Error(`マップ ${id} が見つかりません`);
  return m;
}

export function allMapIds(): string[] {
  return [...MAPS.keys()].sort();
}
