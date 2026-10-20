/**
 * create_tiles_pro の出力を、この作品の Wang タイル形式へ取り込む。
 *
 *   npm run tiles -- <storage_urls の共通部分> <出力名> "<lower>" "<upper>"
 *   例: npm run tiles -- https://.../<project>/<tile_id> stone_pro "石床" "石壁"
 *
 * 書き出すもの
 *   public/assets/tiles2/<名前>.png … 32px × 4×4 の 128×128 シート
 *   data/tiles/<名前>.json          … src/field/tileset.ts が読む形
 *
 * 【ビットの向き】
 * PixelLab は `mask = NW<<3 | NE<<2 | SW<<1 | SE` で、
 * **立っているビットが「1つ目の地形」**（＝床）を表す。
 * こちらの添字は「upper（壁・棚）が立っている隅」で組んでいるので、
 * **`ourIndex = 15 - mask`** で反転する。ここを間違えると壁と床が入れ替わる。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const [prefix, name, lowerDesc = "", upperDesc = ""] = process.argv.slice(2);
if (!prefix || !name) {
  console.error(
    '使い方: npm run tiles -- <tile_N.png の直前までのURL> <出力名> "<床>" "<壁>"',
  );
  console.error("URL は get_tiles_pro の storage_urls から取る（.../<project>/<tile_id>）");
  process.exit(1);
}
const SIZE = 32;
const COLS = 4;

/** 添字 → 4隅。src/field/tileset.ts と同じ規則 */
function cornersOf(i: number) {
  return {
    NW: (i & 8) ? "upper" : "lower",
    NE: (i & 4) ? "upper" : "lower",
    SW: (i & 2) ? "upper" : "lower",
    SE: (i & 1) ? "upper" : "lower",
  } as const;
}

async function main(): Promise<void> {
  // **`download` は zip を返す。** 1枚ずつ取るほうが確実で、Nodeに解凍が要らない
  const out = new PNG({ width: SIZE * COLS, height: SIZE * COLS });
  for (let mask = 0; mask < 16; mask++) {
    const res = await fetch(`${prefix}/tile_${mask}.png`);
    if (!res.ok) throw new Error(`tile_${mask} の取得に失敗: ${res.status}`);
    const tile = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    if (tile.width !== SIZE || tile.height !== SIZE) {
      throw new Error(`tile_${mask} は ${tile.width}×${tile.height}（${SIZE} 角のはず）`);
    }
    // PixelLab の並び（mask 0..15）を、こちらの添字（15-mask）へ組み替える
    const ours = 15 - mask;
    const to = { x: (ours % COLS) * SIZE, y: Math.floor(ours / COLS) * SIZE };
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const s = (y * SIZE + x) * 4;
        const t = ((to.y + y) * out.width + (to.x + x)) * 4;
        for (let k = 0; k < 4; k++) out.data[t + k] = tile.data[s + k]!;
      }
    }
  }

  const pngPath = join(ROOT, "public/assets/tiles2", `${name}.png`);
  mkdirSync(dirname(pngPath), { recursive: true });
  writeFileSync(pngPath, PNG.sync.write(out));

  const tiles = Array.from({ length: 16 }, (_, i) => ({
    name: `wang_${i}`,
    corners: cornersOf(i),
    bounding_box: {
      x: (i % COLS) * SIZE,
      y: Math.floor(i / COLS) * SIZE,
      width: SIZE,
      height: SIZE,
    },
  }));

  const jsonPath = join(ROOT, "data/tiles", `${name}.json`);
  writeFileSync(jsonPath, JSON.stringify({
    id: prefix?.split("/").pop() ?? name,
    name,
    lower_description: lowerDesc,
    upper_description: upperDesc,
    tile_size: { width: SIZE, height: SIZE },
    view: "high top-down",
    tileset_data: { tiles, tile_size: { width: SIZE, height: SIZE } },
    format: "tiles_pro/corner",
  }, null, 2) + "\n");

  console.log(`書き出し: ${pngPath}`);
  console.log(`書き出し: ${jsonPath}`);
  console.log("このあと npm run palettize -- " + pngPath + ' --suffix ""');
}

main().catch((e) => { console.error(e); process.exit(1); });
