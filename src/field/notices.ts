import rawNotices from "../../data/dialogue/notices.json";
import type { GameMap, Tile } from "./mapFormat.ts";

/**
 * 「しらべる」で家具に向かったときの一行（data/dialogue/notices.json）。
 *
 * **同じ棚は、いつ調べても同じことを言う。**
 *
 * 以前は調べるたびに順送りしていた。文の数は稼げるが、
 * 「同じ棚なのに毎回ちがうことが書いてある」ことになり、
 * 書庫がその場ででっち上げられているように見える。
 * 部屋を覚えることが第1章の目的（設計書 2.3）なのに、これでは覚えようがない。
 *
 * そこで、**家具のかたまりごとに1本の文を割り当てる。**
 * 割り当てはマップIDと左上の座標から決まるので、データを増やす必要はなく、
 * 同じ棚は何度調べても同じ、隣の棚は別の文になる。
 */

type NoticeTable = Record<string, { ch1: string[]; ch2?: string[]; ch3?: string[] }>;

const TABLE = Object.fromEntries(
  Object.entries(rawNotices as unknown as NoticeTable).filter(([k]) => !k.startsWith("_")),
) as NoticeTable;

/**
 * 同じタイルが続くかたまりの左上を返す。
 * 家具は矩形なので、左へ、上へ辿れば角に着く。
 */
function corner(map: GameMap, x: number, y: number, t: Tile): { x: number; y: number } {
  let cx = x;
  let cy = y;
  while (cx > 0 && map.tiles[cy]?.[cx - 1] === t) cx--;
  while (cy > 0 && map.tiles[cy - 1]?.[cx] === t) cy--;
  return { x: cx, y: cy };
}

/** 文字列から安定した整数を作る（FNV-1a。呪文のものとは別用途） */
function keyHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** その家具について返す一行。無ければ undefined */
export function noticeFor(
  map: GameMap, x: number, y: number, chapter: number,
): string | undefined {
  const tile = map.tiles[y]?.[x];
  if (!tile) return undefined;
  const entry = TABLE[tile];
  if (!entry) return undefined;

  // 章ごとに専用の文がある物だけ差し替える。無ければ平時の文で通す。
  //
  // **第3章は必ず専用の文を持たせること。** 禁書庫は見習いが入れない場所なので、
  // ch1 に落ちると「前回の担当は MIRA」のような書庫の日常の文が地下に現れ、
  // 四十年誰も来ていないという設定がその場で崩れる。
  const lines =
    (chapter === 3 ? entry.ch3 : chapter === 2 ? entry.ch2 : undefined) ?? entry.ch1;
  if (lines.length === 0) return undefined;

  const c = corner(map, x, y, tile);
  return lines[keyHash(`${map.id}:${tile}:${c.x},${c.y}`) % lines.length];
}

/** 露出回数を数えるツールから使う */
export const NOTICE_TABLE = TABLE;
