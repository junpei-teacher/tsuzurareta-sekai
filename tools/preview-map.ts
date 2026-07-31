/**
 * .room マップを PNG に書き出す（Phase 7 の目視確認用）。
 *
 *   npm run preview:map -- ch1_reading [出力先.png]
 *
 * ゲーム本体と同じ Wang 判定でタイルを並べるので、
 * ブラウザを開かずに壁と床のつながりを確認できる。
 *
 * 【Wang の並べ方】タイルセットは「頂点」で地形を定義する。
 * マスの中心を頂点とみなし、タイルを半マスずらして (w+1)x(h+1) 枚描く。
 * 画面外は壁として扱う。src/scenes/field.ts の renderWang と同じ規則。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const ROOT = join(import.meta.dirname, "..");
const TILE = 16;

const mapName = process.argv[2];
if (!mapName) {
  console.error("使い方: npm run preview:map -- <マップ名> [出力先.png]");
  process.exit(1);
}
const args = process.argv.slice(2);
const flag = (name: string, def: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : def;
};
const outPath = flag("--out", join(ROOT, `public/assets/tiles/_map_${mapName}.png`));
const sheetPath = flag("--sheet", join(ROOT, "public/assets/tiles/stone_pal.png"));

// ── マップを読む（!指示行は読み飛ばして本体だけ使う） ──────────
const src = readFileSync(join(ROOT, `data/maps/${mapName}.room`), "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");
const start = lines.findIndex((l) => l.startsWith("!map")) + 1;
if (start === 0) throw new Error(`${mapName}: !map が見つかりません`);
const rows = lines.slice(start);
while (rows.length > 0 && rows[rows.length - 1]!.trim() === "") rows.pop();

const H = rows.length;
const W = Math.max(...rows.map((r) => r.length));
const isWall = (x: number, y: number): number => {
  if (x < 0 || y < 0 || x >= W || y >= H) return 1;
  return (rows[y]![x] ?? "#") === "#" ? 1 : 0;
};

// ── タイルセット ────────────────────────────────
type RawTile = {
  corners: { NW: string; NE: string; SW: string; SE: string };
  bounding_box: { x: number; y: number; width: number; height: number };
};
const meta = JSON.parse(readFileSync(join(ROOT, "data/tiles/stone.json"), "utf8")) as {
  tileset_data: { tiles: RawTile[] };
};
const sheet = PNG.sync.read(readFileSync(sheetPath));

const wang = new Array<RawTile["bounding_box"] | undefined>(16);
for (const t of meta.tileset_data.tiles) {
  const i =
    (t.corners.NW === "upper" ? 8 : 0) +
    (t.corners.NE === "upper" ? 4 : 0) +
    (t.corners.SW === "upper" ? 2 : 0) +
    (t.corners.SE === "upper" ? 1 : 0);
  wang[i] = t.bounding_box;
}
const missing = wang.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
if (missing.length) console.warn(`Wang欠番: ${missing.join(", ")}`);

// ── 描画 ────────────────────────────────────────
const out = new PNG({ width: W * TILE, height: H * TILE });
// 背景は闇で塗る
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = 0x14; out.data[i + 1] = 0x10; out.data[i + 2] = 0x0f; out.data[i + 3] = 255;
}

function blit(src: PNG, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number): void {
  for (let y = 0; y < sh; y++) {
    const py = dy + y;
    if (py < 0 || py >= out.height) continue;
    for (let x = 0; x < sw; x++) {
      const px = dx + x;
      if (px < 0 || px >= out.width) continue;
      const s = ((sy + y) * src.width + (sx + x)) * 4;
      if (src.data[s + 3]! < 128) continue;
      const dst = (py * out.width + px) * 4;
      out.data[dst] = src.data[s]!;
      out.data[dst + 1] = src.data[s + 1]!;
      out.data[dst + 2] = src.data[s + 2]!;
      out.data[dst + 3] = 255;
    }
  }
}

for (let y = -1; y < H; y++) {
  for (let x = -1; x < W; x++) {
    const idx =
      isWall(x, y) * 8 + isWall(x + 1, y) * 4 + isWall(x, y + 1) * 2 + isWall(x + 1, y + 1);
    const b = wang[idx];
    if (!b) continue;
    blit(sheet, b.x, b.y, b.width, b.height, x * TILE + TILE / 2, y * TILE + TILE / 2);
  }
}

// 家具は判別できる色の矩形で置く（本体側の描画とは別物、位置確認用）
const PROP: Record<string, [number, number, number]> = {
  B: [0x5c, 0x4b, 0x3a],
  T: [0x7a, 0x3f, 0x20],
  C: [0xf0, 0xb8, 0x3c],
  "=": [0x3b, 0x32, 0x2a],
  V: [0x24, 0x1d, 0x16],
};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = PROP[rows[y]![x] ?? ""];
    if (!c) continue;
    for (let py = 2; py < TILE - 2; py++) {
      for (let px = 2; px < TILE - 2; px++) {
        const d = ((y * TILE + py) * out.width + (x * TILE + px)) * 4;
        out.data[d] = c[0]; out.data[d + 1] = c[1]; out.data[d + 2] = c[2]; out.data[d + 3] = 255;
      }
    }
  }
}

writeFileSync(outPath, PNG.sync.write(out));
console.log(`${mapName}  ${W}x${H} マス → ${out.width}x${out.height}px  →  ${outPath}`);
