/**
 * v23の生成原本を変更せず、採用候補の歩行4コマを同じ靴底へそろえる。
 *
 * --write: 派生PNGが未作成なら生成する。既存ファイルは上書きしない。
 * 引数なし: 派生PNGが、記録した原本のコピー／整数移動と完全一致するか検査する。
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

type FrameSpec = {
  output: string;
  source: string;
  shiftY: number;
  expectedFoot: number;
};

const concepts = join(import.meta.dirname, "../docs/concepts");
const specs: readonly FrameSpec[] = [
  { output: "hero-pixen-walk-aligned-v24-f1.png", source: "hero-pixen-walk-short-v23-f1.png", shiftY: -1, expectedFoot: 43 },
  { output: "hero-pixen-walk-aligned-v24-f2.png", source: "hero-pixen-walk-short-v23-f2.png", shiftY: -1, expectedFoot: 43 },
  { output: "hero-pixen-walk-aligned-v24-f3.png", source: "hero-pixen-walk-short-v23-f3.png", shiftY: -1, expectedFoot: 43 },
  { output: "hero-pixen-walk-aligned-v24-f4.png", source: "hero-pixen-walk-short-v23-f4.png", shiftY: 0, expectedFoot: 43 },
  { output: "sena-pixen-walk-aligned-v24-f1.png", source: "sena-pixen-walk-clear-v23-f1.png", shiftY: 0, expectedFoot: 45 },
  // clear版f2は靴底が1px高い。生成原本のうち同じ足運びで接地済みの初期版f2を選ぶ。
  { output: "sena-pixen-walk-aligned-v24-f2.png", source: "sena-pixen-walk-v23-f2.png", shiftY: 0, expectedFoot: 45 },
  { output: "sena-pixen-walk-aligned-v24-f3.png", source: "sena-pixen-walk-clear-v23-f3.png", shiftY: 0, expectedFoot: 45 },
  { output: "sena-pixen-walk-aligned-v24-f4.png", source: "sena-pixen-walk-clear-v23-f4.png", shiftY: 0, expectedFoot: 45 },
] as const;

function shiftedBytes(sourceBytes: Buffer, shiftY: number): Buffer {
  if (shiftY === 0) return sourceBytes;
  const source = PNG.sync.read(sourceBytes);
  const output = new PNG({ width: source.width, height: source.height });
  output.data.fill(0);
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const sourceOffset = (y * source.width + x) * 4;
    const alpha = source.data[sourceOffset + 3]!;
    if (alpha === 0) continue;
    const targetY = y + shiftY;
    assert.ok(targetY >= 0 && targetY < source.height, `整数移動で画素が欠けます: y=${y}, shift=${shiftY}`);
    const targetOffset = (targetY * source.width + x) * 4;
    source.data.copy(output.data, targetOffset, sourceOffset, sourceOffset + 4);
  }
  return PNG.sync.write(output);
}

function bounds(bytes: Buffer): { minX: number; minY: number; maxX: number; maxY: number; solid: number; partial: number } {
  const png = PNG.sync.read(bytes);
  let minX = png.width, minY = png.height, maxX = -1, maxY = -1, solid = 0, partial = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const alpha = png.data[(y * png.width + x) * 4 + 3]!;
    if (alpha === 0) continue;
    if (alpha === 255) solid++; else partial++;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, solid, partial };
}

const write = process.argv.includes("--write");
for (const spec of specs) {
  const sourceBytes = readFileSync(join(concepts, spec.source));
  const expected = shiftedBytes(sourceBytes, spec.shiftY);
  const outputPath = join(concepts, spec.output);
  if (write && !existsSync(outputPath)) writeFileSync(outputPath, expected, { flag: "wx" });
  assert.ok(existsSync(outputPath), `${spec.output}: 未作成です。--writeを付けて生成してください`);
  const actual = readFileSync(outputPath);
  assert.ok(actual.equals(expected), `${spec.output}: 原本のコピー／整数移動と一致しません`);
  const box = bounds(actual);
  assert.equal(box.maxY, spec.expectedFoot, `${spec.output}: 靴底位置`);
  assert.equal(box.partial, 0, `${spec.output}: 半透明画素`);
  assert.ok(box.minX > 0 && box.minY > 0 && box.maxX < 31 && box.maxY < 47, `${spec.output}: 画像端へ届く画素`);
  console.log(JSON.stringify({
    file: spec.output,
    source: spec.source,
    shiftY: spec.shiftY,
    sha256: createHash("sha256").update(actual).digest("hex"),
    bounds: box,
  }));
}
console.log("人物歩行v24接地検証 OK: 生成原本は不変、8コマの靴底を人物別に統一。");
