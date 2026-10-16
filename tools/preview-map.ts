/**
 * .room マップを PNG に書き出す（Phase 7 の目視確認用）。
 *
 *   npm run preview:map -- ch1_reading [--out 出力.png] [--chars] [--raw]
 *
 * **ゲーム本体（src/scenes/field.ts）と同じ手順で描く。**
 *   1層目 石床↔石壁の Wang
 *   2層目 石床↔本棚の Wang（全て床の組み合わせは描かない）
 *   3層目 家具スプライト（机・燭台・階段・扉）
 * ブラウザを開かずに、壁のつながりと家具の位置を確認できる。
 *
 * --chars  主人公とミラを置く。床とキャラの見分けやすさの確認用
 * --raw    減色前の素材で描く。減色がどれだけ色を削っているかの確認用
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const ROOT = join(import.meta.dirname, "..");
const TILE = 32;

const args = process.argv.slice(2);
const mapName = args[0];
if (!mapName || mapName.startsWith("--")) {
  console.error("使い方: npm run preview:map -- <マップ名> [--out 出力.png] [--chars] [--raw]");
  process.exit(1);
}
const flag = (name: string, def: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : def;
};
const withChars = args.includes("--chars");
const raw = args.includes("--raw");
const outPath = flag(
  "--out",
  join(ROOT, `public/assets/tiles/_map_${mapName}${raw ? "_raw" : ""}.png`),
);

// 減色は既定で使わない方針になったため、--raw は出力ファイル名の区別のみに残している

// ── マップを読む ──────────────────────────────
const src = readFileSync(join(ROOT, `data/maps/${mapName}.room`), "utf8").replace(/\r\n/g, "\n");
const lines = src.split("\n");
const mapStart = lines.findIndex((l) => l.startsWith("!map")) + 1;
if (mapStart === 0) throw new Error(`${mapName}: !map が見つかりません`);

/** 指示行から、扉として使われている文字を集める */
const doorChars = new Set<string>();
for (const l of lines.slice(0, mapStart)) {
  const m = /^!door\s+(\S+)/.exec(l);
  if (m) doorChars.add(m[1]!);
}

const rows = lines.slice(mapStart);
while (rows.length > 0 && rows[rows.length - 1]!.trim() === "") rows.pop();
const H = rows.length;
const W = Math.max(...rows.map((r) => r.length));
const at = (x: number, y: number): string => (rows[y]?.[x] ?? "#");

// ── 画像を読む ────────────────────────────────
const loadPng = (p: string): PNG | null =>
  existsSync(join(ROOT, p)) ? PNG.sync.read(readFileSync(join(ROOT, p))) : null;

type RawTile = {
  corners: { NW: string; NE: string; SW: string; SE: string };
  bounding_box: { x: number; y: number; width: number; height: number };
};
function wangTable(metaPath: string): Array<RawTile["bounding_box"] | undefined> {
  const meta = JSON.parse(readFileSync(join(ROOT, metaPath), "utf8")) as {
    tileset_data: { tiles: RawTile[] };
  };
  const out = new Array<RawTile["bounding_box"] | undefined>(16);
  for (const t of meta.tileset_data.tiles) {
    const i =
      (t.corners.NW === "upper" ? 8 : 0) + (t.corners.NE === "upper" ? 4 : 0) +
      (t.corners.SW === "upper" ? 2 : 0) + (t.corners.SE === "upper" ? 1 : 0);
    out[i] = t.bounding_box;
  }
  return out;
}

const stoneSheet = loadPng("public/assets/tiles2/stone.png");
const shelfSheet = loadPng("public/assets/tiles2/shelf.png");
const stoneWang = wangTable("data/tiles/stone32.json");
const shelfWang = wangTable("data/tiles/shelf32.json");

const props = {
  desk: loadPng("public/assets/props2/desk.png"),
  candle: loadPng("public/assets/props2/candle.png"),
  door: loadPng("public/assets/props2/door.png"),
  stairs: loadPng("public/assets/props2/stairs.png"),
};

// ── 描画 ────────────────────────────────────────
const out = new PNG({ width: W * TILE, height: H * TILE });
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = 0x14; out.data[i + 1] = 0x10; out.data[i + 2] = 0x0f; out.data[i + 3] = 255;
}

function blit(s: PNG, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number): void {
  for (let y = 0; y < sh; y++) {
    const py = dy + y;
    if (py < 0 || py >= out.height) continue;
    for (let x = 0; x < sw; x++) {
      const px = dx + x;
      if (px < 0 || px >= out.width) continue;
      const si = ((sy + y) * s.width + (sx + x)) * 4;
      if (s.data[si + 3]! < 128) continue;
      const di = (py * out.width + px) * 4;
      out.data[di] = s.data[si]!; out.data[di + 1] = s.data[si + 1]!;
      out.data[di + 2] = s.data[si + 2]!; out.data[di + 3] = 255;
    }
  }
}

const place = (s: PNG | null, cx: number, cy: number, dy = 4): void => {
  if (!s) return;
  blit(s, 0, 0, s.width, s.height, Math.round(cx - s.width / 2), Math.round(cy - s.height + dy));
};

function wangLayer(
  sheet: PNG | null,
  table: Array<RawTile["bounding_box"] | undefined>,
  isUpper: (c: string) => boolean,
  skipEmpty: boolean,
): void {
  if (!sheet) return;
  const vert = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= W || y >= H) return skipEmpty ? 0 : 1;
    return isUpper(at(x, y)) ? 1 : 0;
  };
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const idx =
        vert(x, y) * 8 + vert(x + 1, y) * 4 + vert(x, y + 1) * 2 + vert(x + 1, y + 1);
      if (skipEmpty && idx === 0) continue;
      const b = table[idx];
      if (!b) continue;
      blit(sheet, b.x, b.y, b.width, b.height, x * TILE + TILE / 2, y * TILE + TILE / 2);
    }
  }
}

wangLayer(stoneSheet, stoneWang, (c) => c === "#", false);
wangLayer(shelfSheet, shelfWang, (c) => c === "B", true);

// 写字机：横に連なるマスの先頭から2マスおき
for (let y = 0; y < H; y++) {
  let run = -1;
  for (let x = 0; x <= W; x++) {
    const isDesk = x < W && at(x, y) === "T";
    if (isDesk && run < 0) run = x;
    if (!isDesk && run >= 0) {
      if (at(run, y - 1) !== "T") {
        for (let i = run; i < x; i += 2) {
          if (props.desk) blit(props.desk, 0, 0, props.desk.width, props.desk.height, i * TILE, y * TILE);
        }
      }
      run = -1;
    }
  }
}

// 燭台と扉
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (c === "C") place(props.candle, x * TILE + TILE / 2, (y + 1) * TILE);
    else if (doorChars.has(c)) place(props.door, x * TILE + TILE / 2, (y + 1) * TILE, 6);
  }
}

// 階段：塊の中心に1枚
let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (at(x, y) !== "V") continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
}
if (maxX >= 0 && props.stairs) {
  blit(props.stairs, 0, 0, props.stairs.width, props.stairs.height,
    Math.round(((minX + maxX + 1) * TILE - props.stairs.width) / 2),
    Math.round(((minY + maxY + 1) * TILE - props.stairs.height) / 2));
}

// キャラ（床との見分けやすさの確認用）
if (withChars) {
  place(loadPng("public/assets/sprites/hero2/south.png"), 14 * TILE + TILE / 2, 7 * TILE);
  place(loadPng("public/assets/sprites/mira2/south.png"), 19 * TILE + TILE / 2, 6 * TILE);
}

writeFileSync(outPath, PNG.sync.write(out));
console.log(`${mapName}  ${W}x${H} マス → ${out.width}x${out.height}px  →  ${outPath}`);
