/**
 * 本棚シートの「床」部分を、別のタイルセットの床で差し替える。
 *
 *   npm run matchfloor
 *
 * 【なぜ要るか】
 * 床↔壁（stone）と 床↔本棚（shelf）は**別々に生成された2つのWangセット**で、
 * どちらも縁に床を含んでいる。片方だけ作り直すと、
 * **本棚の周りだけ古い床が残り、明るい縁のように浮く。**
 *
 * 生成でこれを揃えるには、床を参照画像として渡せるツールが要る。
 * ここでは画素で解く：**旧セットの床色だった画素を、新しい床タイルの同じ位置の
 * 画素で置き換える。** どちらも32px格子なので、位置がそのまま対応し、
 * 石畳の目地までつながる。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const SIZE = 32;

type Box = { x: number; y: number; width: number; height: number };

/** 四隅すべてが lower（＝床だけ）のタイルの位置を、メタデータから引く */
function floorTileBox(jsonPath: string): Box {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
    tileset_data: { tiles: Array<{ corners: Record<string, string>; bounding_box: Box }> };
  };
  const t = raw.tileset_data.tiles.find((x) =>
    Object.values(x.corners).every((c) => c === "lower"));
  if (!t) throw new Error(`${jsonPath}: 床だけのタイルが見つからない`);
  return t.bounding_box;
}

function key(d: Buffer, i: number): string {
  return `${d[i]},${d[i + 1]},${d[i + 2]}`;
}

function main(): void {
  const oldSheet = PNG.sync.read(readFileSync(join(ROOT, "public/assets/tiles2/stone.png")));
  const newSheet = PNG.sync.read(readFileSync(join(ROOT, "public/assets/tiles2/stone_pro.png")));
  const shelf = PNG.sync.read(readFileSync(join(ROOT, "public/assets/tiles2/shelf.png")));

  const oldBox = floorTileBox(join(ROOT, "data/tiles/stone32.json"));
  const newBox = floorTileBox(join(ROOT, "data/tiles/stone_pro.json"));

  // 旧セットの床タイルに出てくる色 ＝ 差し替えてよい色
  const floorColors = new Set<string>();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = ((oldBox.y + y) * oldSheet.width + (oldBox.x + x)) * 4;
      if (oldSheet.data[i + 3]! < 128) continue;
      floorColors.add(key(oldSheet.data, i));
    }
  }
  // 床タイルに出ていない色でも、**冷たくて明るい灰**は床の側の画素である。
  // 本棚の輪郭として1〜2px残ると、暗い床の上で白い縁になって浮く。
  // 棚そのものの明るい部分（本の背の黄・緑）は青が低いので、ここには入らない
  for (let i = 0; i < shelf.data.length; i += 4) {
    if (shelf.data[i + 3]! < 128) continue;
    const r = shelf.data[i]!, g = shelf.data[i + 1]!, b = shelf.data[i + 2]!;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum >= 170 && b >= r) floorColors.add(key(shelf.data, i));
  }
  console.log(`床とみなす色: ${floorColors.size} 色`);

  let swapped = 0;
  for (let y = 0; y < shelf.height; y++) {
    for (let x = 0; x < shelf.width; x++) {
      const i = (y * shelf.width + x) * 4;
      if (shelf.data[i + 3]! < 128) continue;
      if (!floorColors.has(key(shelf.data, i))) continue;
      // タイル内の位置をそのまま新しい床から拾う。目地がつながる
      const sx = newBox.x + (x % SIZE);
      const sy = newBox.y + (y % SIZE);
      const s = (sy * newSheet.width + sx) * 4;
      for (let k = 0; k < 3; k++) shelf.data[i + k] = newSheet.data[s + k]!;
      swapped++;
    }
  }
  console.log(`差し替えた画素: ${swapped}`);

  const out = join(ROOT, "public/assets/tiles2/shelf.png");
  writeFileSync(out, PNG.sync.write(shelf));
  console.log(`書き出し: ${out}`);
}

main();
