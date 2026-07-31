import raw from "../../data/tiles/stone.json";

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
 */

type Corner = "upper" | "lower";

type RawTile = {
  name: string;
  corners: { NW: Corner; NE: Corner; SW: Corner; SE: Corner };
  bounding_box: { x: number; y: number; width: number; height: number };
};

const data = raw as unknown as {
  tileset_data: {
    tiles: RawTile[];
    tile_size: { width: number; height: number };
  };
};

export type SrcRect = { sx: number; sy: number; w: number; h: number };

export const TILESET_SIZE = data.tileset_data.tile_size;

/** Wang番号（NW*8 + NE*4 + SW*2 + SE*1）→ シート上の切り出し位置 */
export const WANG: ReadonlyArray<SrcRect | undefined> = (() => {
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
})();

/** 16通りすべてが埋まっているかの自己点検 */
export function missingWangIndices(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 16; i++) if (!WANG[i]) out.push(i);
  return out;
}
