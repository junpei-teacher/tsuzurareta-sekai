import rawStone from "../../data/tiles/stone_pro.json";
import rawShelf from "../../data/tiles/shelf32.json";

/**
 * PixelLab の Wang タイルセット（16タイル）。
 *
 * 【重要】スプライトシートを添字で切ってはいけない。
 * `wang_13` がシートの左上に置かれているように、名前や生成順とシート上の位置は
 * 一致しない。必ず各タイルの `bounding_box` で切り出す。
 *
 * 【地形は「頂点」で定義される】
 * 1枚のタイルは4隅の頂点（NW/NE/SW/SE）の値で決まる。
 * 本作のマップは「マス」で床と壁を持っているので、
 * **マスの中心を頂点とみなし、タイル層だけを半マスずらして描く**（src/scenes/field.ts）。
 * こうすると壁と床の境界がマスの境界にぴったり乗り、当たり判定と一致する。
 *
 * 【2層構成】
 *   stone … 石床↔石壁。全面に敷く
 *   shelf … 石床↔本棚。本棚のあるマスにだけ重ねる（全て床の組み合わせは描かない）
 * どちらも同じ「石床」ベースタイルから生成しているので、境目が揃う。
 */

type Corner = "upper" | "lower";

type RawTile = {
  name: string;
  corners: { NW: Corner; NE: Corner; SW: Corner; SE: Corner };
  bounding_box: { x: number; y: number; width: number; height: number };
};

type RawSet = { tileset_data: { tiles: RawTile[]; tile_size: { width: number; height: number } } };

export type SrcRect = { sx: number; sy: number; w: number; h: number };
export type WangTable = ReadonlyArray<SrcRect | undefined>;

function build(raw: unknown): WangTable {
  const data = raw as RawSet;
  const out = new Array<SrcRect | undefined>(16);
  for (const t of data.tileset_data.tiles) {
    const i =
      (t.corners.NW === "upper" ? 8 : 0) +
      (t.corners.NE === "upper" ? 4 : 0) +
      (t.corners.SW === "upper" ? 2 : 0) +
      (t.corners.SE === "upper" ? 1 : 0);
    out[i] = {
      sx: t.bounding_box.x,
      sy: t.bounding_box.y,
      w: t.bounding_box.width,
      h: t.bounding_box.height,
    };
  }
  return out;
}

export const WANG_STONE = build(rawStone);
export const WANG_SHELF = build(rawShelf);

/** 16通りすべてが埋まっているかの自己点検 */
export function missingWangIndices(): string[] {
  const out: string[] = [];
  for (const [name, table] of [["stone", WANG_STONE], ["shelf", WANG_SHELF]] as const) {
    for (let i = 0; i < 16; i++) if (!table[i]) out.push(`${name}#${i}`);
  }
  return out;
}
