import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "docs/concepts/forest-boundary-imagegen-a-v34.png");
const palettePath = resolve(root, "src/assets/series2/backgrounds/forest_edge/middle.png");
const oneXPath = resolve(root, "docs/concepts/forest-boundary-game-palette-v34-1x.png");
const twoXPath = resolve(root, "docs/concepts/forest-boundary-game-palette-v34.png");

const SOURCE_HASH = "545e76b653a0ebdeb44e09d2fed55d262d39c33d448ed1b6506ae8ed4a10a8b1";
const PALETTE_HASH = "3716953b189661a78e67f9d5d204e42b68b8870a07519c6b6a786490fd165a39";
const DESIGN_W = 480;
const DESIGN_H = 270;
const ROAD_TOP = 162;
const SOURCE_ROAD_TOP = 565;

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const sourceBytes = readFileSync(sourcePath);
const paletteBytes = readFileSync(palettePath);
assert.equal(hash(sourceBytes), SOURCE_HASH, "v34生成A原本が変更されています");
assert.equal(hash(paletteBytes), PALETTE_HASH, "採用森背景が変更されています");

const source = PNG.sync.read(sourceBytes);
const paletteImage = PNG.sync.read(paletteBytes);
assert.deepEqual([source.width, source.height], [1672, 941], "v34生成A原本の寸法");
assert.deepEqual([paletteImage.width, paletteImage.height], [960, 540], "色基準寸法");

const palette = [...new Set(Array.from(
  { length: paletteImage.width * paletteImage.height },
  (_, index) => {
    const offset = index * 4;
    return (paletteImage.data[offset]! << 16)
      | (paletteImage.data[offset + 1]! << 8)
      | paletteImage.data[offset + 2]!;
  },
))];
assert.equal(palette.length, 138, "森背景の色数");

const nearestCache = new Map<number, number>();
function nearestColor(rgb: number): number {
  const cached = nearestCache.get(rgb);
  if (cached !== undefined) return cached;
  const r = rgb >> 16;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  let best = palette[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of palette) {
    const cr = candidate >> 16;
    const cg = (candidate >> 8) & 0xff;
    const cb = candidate & 0xff;
    // 村道・共同倉と同じ距離式で、村側と森側の光を同じ世界色へ揃える。
    const distance = (r - cr) ** 2 * 0.8 + (g - cg) ** 2 * 1.1 + (b - cb) ** 2 * 0.7;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  nearestCache.set(rgb, best);
  return best;
}

function sourceYFor(targetY: number): number {
  if (targetY < ROAD_TOP) {
    return Math.min(
      SOURCE_ROAD_TOP - 1,
      Math.floor((targetY + 0.5) * SOURCE_ROAD_TOP / ROAD_TOP),
    );
  }
  return Math.min(
    source.height - 1,
    SOURCE_ROAD_TOP + Math.floor(
      (targetY - ROAD_TOP + 0.5)
      * (source.height - SOURCE_ROAD_TOP)
      / (DESIGN_H - ROAD_TOP),
    ),
  );
}

const design = new PNG({ width: DESIGN_W, height: DESIGN_H });
for (let y = 0; y < DESIGN_H; y++) {
  const sourceY = sourceYFor(y);
  for (let x = 0; x < DESIGN_W; x++) {
    const sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / DESIGN_W));
    const sourceOffset = (sourceY * source.width + sourceX) * 4;
    const rgb = (source.data[sourceOffset]! << 16)
      | (source.data[sourceOffset + 1]! << 8)
      | source.data[sourceOffset + 2]!;
    const mapped = nearestColor(rgb);
    const targetOffset = (y * DESIGN_W + x) * 4;
    design.data[targetOffset] = mapped >> 16;
    design.data[targetOffset + 1] = (mapped >> 8) & 0xff;
    design.data[targetOffset + 2] = mapped & 0xff;
    design.data[targetOffset + 3] = 255;
  }
}

const doubled = new PNG({ width: DESIGN_W * 2, height: DESIGN_H * 2 });
for (let y = 0; y < DESIGN_H; y++) for (let x = 0; x < DESIGN_W; x++) {
  const sourceOffset = (y * DESIGN_W + x) * 4;
  for (const dy of [0, 1]) for (const dx of [0, 1]) {
    const targetOffset = ((y * 2 + dy) * doubled.width + x * 2 + dx) * 4;
    doubled.data[targetOffset] = design.data[sourceOffset]!;
    doubled.data[targetOffset + 1] = design.data[sourceOffset + 1]!;
    doubled.data[targetOffset + 2] = design.data[sourceOffset + 2]!;
    doubled.data[targetOffset + 3] = 255;
  }
}

const oneXBytes = PNG.sync.write(design, { colorType: 2 });
const twoXBytes = PNG.sync.write(doubled, { colorType: 2 });
writeFileSync(oneXPath, oneXBytes);
writeFileSync(twoXPath, twoXBytes);
assert.ok(readFileSync(resolve(root, "src/assets/series2/backgrounds/forest_boundary/middle.png")).equals(twoXBytes), "正式境界PNGが候補の決定的出力と一致する");

const used = new Set<number>();
for (let i = 0; i < design.data.length; i += 4) {
  used.add((design.data[i]! << 16) | (design.data[i + 1]! << 8) | design.data[i + 2]!);
}
assert.ok(used.size <= palette.length, "採用森パレット外の色が混ざっています");

for (let y = 0; y < DESIGN_H; y++) for (let x = 0; x < DESIGN_W; x++) {
  const smallOffset = (y * DESIGN_W + x) * 4;
  for (const dy of [0, 1]) for (const dx of [0, 1]) {
    const largeOffset = ((y * 2 + dy) * doubled.width + x * 2 + dx) * 4;
    assert.deepEqual(
      Array.from(doubled.data.subarray(largeOffset, largeOffset + 4)),
      Array.from(design.data.subarray(smallOffset, smallOffset + 4)),
      "2倍画像に補間色が混ざっています",
    );
  }
}

console.log(JSON.stringify({
  source: { width: source.width, height: source.height, sha256: SOURCE_HASH },
  design: { width: design.width, height: design.height, colors: used.size, sha256: hash(oneXBytes) },
  doubled: { width: doubled.width, height: doubled.height, sha256: hash(twoXBytes) },
  roadTop: ROAD_TOP,
  characterFoot: 176,
}));
