import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "docs/concepts/ruin-approach-imagegen-a-v58.png");
const oneXPath = resolve(root, "docs/concepts/ruin-approach-game-palette-v58-1x.png");
const twoXPath = resolve(root, "docs/concepts/ruin-approach-game-palette-v58.png");
const adoptedPath = resolve(root, "src/assets/series2/backgrounds/ruin_approach/middle.png");

const SOURCE_HASH = "4b9bb1366bdf058ac5e27fe9f68c0556a02326258c81ab9a5d516819c391b884";
const DESIGN_W = 480;
const DESIGN_H = 270;
const ROAD_TOP = 162;
const SOURCE_ROAD_TOP = 584;
const PALETTE_LIMIT = 192;

type Bucket = {
  colors: number[];
  total: number;
  ranges: readonly [number, number, number];
};

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function channels(rgb: number): readonly [number, number, number] {
  return [rgb >> 16, (rgb >> 8) & 0xff, rgb & 0xff];
}

const sourceBytes = readFileSync(sourcePath);
assert.equal(hash(sourceBytes), SOURCE_HASH, "v58 ImageGen原本が変更されています");
const source = PNG.sync.read(sourceBytes);
assert.deepEqual([source.width, source.height], [1672, 941], "v58 ImageGen原本の寸法");

function sourceYFor(targetY: number): number {
  if (targetY < ROAD_TOP) {
    return Math.min(SOURCE_ROAD_TOP - 1, Math.floor((targetY + 0.5) * SOURCE_ROAD_TOP / ROAD_TOP));
  }
  return Math.min(
    source.height - 1,
    SOURCE_ROAD_TOP + Math.floor(
      (targetY - ROAD_TOP + 0.5) * (source.height - SOURCE_ROAD_TOP) / (DESIGN_H - ROAD_TOP),
    ),
  );
}

// まずゲーム座標へ落とし、その画面に実在する色から遺跡地域の基準色を作る。
const raw = new Uint32Array(DESIGN_W * DESIGN_H);
const histogram = new Map<number, number>();
for (let y = 0; y < DESIGN_H; y++) {
  const sourceY = sourceYFor(y);
  for (let x = 0; x < DESIGN_W; x++) {
    const sourceX = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / DESIGN_W));
    const sourceOffset = (sourceY * source.width + sourceX) * 4;
    const rgb = (source.data[sourceOffset]! << 16)
      | (source.data[sourceOffset + 1]! << 8)
      | source.data[sourceOffset + 2]!;
    raw[y * DESIGN_W + x] = rgb;
    histogram.set(rgb, (histogram.get(rgb) ?? 0) + 1);
  }
}

function makeBucket(colors: number[]): Bucket {
  let total = 0;
  let rMin = 255; let rMax = 0;
  let gMin = 255; let gMax = 0;
  let bMin = 255; let bMax = 0;
  for (const rgb of colors) {
    const [r, g, b] = channels(rgb);
    total += histogram.get(rgb)!;
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    gMin = Math.min(gMin, g); gMax = Math.max(gMax, g);
    bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
  }
  return { colors, total, ranges: [rMax - rMin, gMax - gMin, bMax - bMin] };
}

const buckets: Bucket[] = [makeBucket([...histogram.keys()])];
while (buckets.length < PALETTE_LIMIT) {
  let selected = -1;
  let bestScore = -1;
  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i]!;
    if (bucket.colors.length < 2) continue;
    const range = Math.max(...bucket.ranges);
    const score = range * Math.log2(bucket.total + 1);
    if (score > bestScore) { selected = i; bestScore = score; }
  }
  assert.notEqual(selected, -1, "遺跡パレットを指定色数まで分割できません");
  const bucket = buckets[selected]!;
  const axis = bucket.ranges.indexOf(Math.max(...bucket.ranges));
  const sorted = [...bucket.colors].sort((a, b) => channels(a)[axis]! - channels(b)[axis]! || a - b);
  const half = bucket.total / 2;
  let cumulative = 0;
  let split = 1;
  for (; split < sorted.length; split++) {
    cumulative += histogram.get(sorted[split - 1]!)!;
    if (cumulative >= half) break;
  }
  split = Math.max(1, Math.min(sorted.length - 1, split));
  buckets.splice(selected, 1, makeBucket(sorted.slice(0, split)), makeBucket(sorted.slice(split)));
}

// 平均色を新造せず、各箱の重心に最も近い実在色を代表にして彩度を保つ。
const palette = buckets.map((bucket) => {
  let rSum = 0; let gSum = 0; let bSum = 0;
  for (const rgb of bucket.colors) {
    const count = histogram.get(rgb)!;
    const [r, g, b] = channels(rgb);
    rSum += r * count; gSum += g * count; bSum += b * count;
  }
  const mean = [rSum / bucket.total, gSum / bucket.total, bSum / bucket.total] as const;
  return bucket.colors.reduce((best, rgb) => {
    const [r, g, b] = channels(rgb);
    const distance = (r - mean[0]) ** 2 * 0.85 + (g - mean[1]) ** 2 + (b - mean[2]) ** 2 * 0.9;
    const [br, bg, bb] = channels(best);
    const bestDistance = (br - mean[0]) ** 2 * 0.85 + (bg - mean[1]) ** 2 + (bb - mean[2]) ** 2 * 0.9;
    return distance < bestDistance ? rgb : best;
  }, bucket.colors[0]!);
});
assert.equal(new Set(palette).size, PALETTE_LIMIT, "遺跡パレットに重複色があります");

const nearestCache = new Map<number, number>();
function nearestColor(rgb: number): number {
  const cached = nearestCache.get(rgb);
  if (cached !== undefined) return cached;
  const [r, g, b] = channels(rgb);
  let best = palette[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of palette) {
    const [cr, cg, cb] = channels(candidate);
    const distance = (r - cr) ** 2 * 0.85 + (g - cg) ** 2 + (b - cb) ** 2 * 0.9;
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
  }
  nearestCache.set(rgb, best);
  return best;
}

const design = new PNG({ width: DESIGN_W, height: DESIGN_H });
for (let i = 0; i < raw.length; i++) {
  const mapped = nearestColor(raw[i]!);
  const offset = i * 4;
  design.data[offset] = mapped >> 16;
  design.data[offset + 1] = (mapped >> 8) & 0xff;
  design.data[offset + 2] = mapped & 0xff;
  design.data[offset + 3] = 255;
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
if (process.argv.includes("--write-candidate")) {
  console.warn("候補を書き出しました。正式素材へ複製後、引数なしで再検証してください");
} else {
  assert.ok(existsSync(adoptedPath), "正式背景 v59 がありません");
  assert.deepEqual(readFileSync(adoptedPath), twoXBytes, "正式背景 v59 と再生成結果が一致しません");
}

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
  design: { width: design.width, height: design.height, colors: new Set(palette).size, sha256: hash(oneXBytes) },
  doubled: { width: doubled.width, height: doubled.height, sha256: hash(twoXBytes) },
  roadTop: ROAD_TOP,
  sourceRoadTop: SOURCE_ROAD_TOP,
  characterFoot: 176,
  regionPalette: "ruin-v59",
}));

