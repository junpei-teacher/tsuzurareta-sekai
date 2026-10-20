/** 森入口の原本と、ドットを変形しない採用素材・合成規格を検査する。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { SCREEN_H, SCREEN_W } from "../src/core/display.ts";
import { FOREST_ENTRANCE_LAYERS as layout } from "../src/fx/forestEntranceLayers.ts";

const dir = join(import.meta.dirname, "../docs/concepts");
function asset(name: string, width: number, height: number, hash: string): PNG {
  const bytes = readFileSync(join(dir, name));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, `${name}: 原本の変更`);
  const png = PNG.sync.read(bytes);
  assert.equal(png.width, width, `${name}: 幅`);
  assert.equal(png.height, height, `${name}: 高さ`);
  for (let i = 3; i < png.data.length; i += 4) assert.equal(png.data[i], 255, `${name}: 透過の混入`);
  return png;
}

const forest = asset("forest-edge-pixellab-a-v1.png", 480, 270,
  "ef52069d816dd76ea94e5c258757afbf8b412ac1bf98900c28171dd27cf8a7ee");
const soil = asset("forest-edge-ground-v18.png", 480, 128,
  "0f4736ed50db51b5da6ac7e90f2df7333b31ffcfb31852970470693e02e038fb");
assert.equal(SCREEN_W, forest.width);
assert.equal(SCREEN_W, soil.width);
assert.equal(layout.soilHeight, soil.height);
assert.equal(layout.soilTop + layout.soilHeight, SCREEN_H, "土は拡縮せず下端まで埋める");
assert.equal(layout.groundY, 176, "本編の接地位置を変更しない");
assert.equal(layout.forestBottom, 263, "Aの明色帯を表示しない");
assert.ok(layout.forestTop > 0 && layout.forestTop < layout.forestBottom);
assert.ok(layout.soilTop < layout.forestBottom - layout.forestTop - layout.blendRows, "土の層が継ぎ目の下にも存在する");
assert.ok(Number.isInteger(layout.blendRows) && layout.blendRows > 0, "整数行で合成する");
assert.ok(layout.groundY < layout.forestBottom - layout.forestTop - layout.blendRows, "継ぎ目を人物の足元に重ねない");

for (let y = 0; y < soil.height; y++) {
  let allLight = true;
  for (let x = 0; x < soil.width; x++) {
    const i = (y * soil.width + x) * 4;
    if (Math.min(soil.data[i]!, soil.data[i + 1]!, soil.data[i + 2]!) < 240) allLight = false;
  }
  assert.equal(allLight, false, `地面に全幅の明色帯: y=${y}`);
}
console.log("森入口素材検証 OK: 原本不変／480×270＋480×128／不透明／明色帯なし／足元176／整数配置・下端被覆");

const adoptedBytes = readFileSync(join(import.meta.dirname, "../src/assets/series2/backgrounds/forest_edge/middle.png"));
assert.equal(createHash("sha256").update(adoptedBytes).digest("hex"),
  "3716953b189661a78e67f9d5d204e42b68b8870a07519c6b6a786490fd165a39", "採用した静的背景の変更");
const adopted = PNG.sync.read(adoptedBytes);
assert.equal(adopted.width, 960);
assert.equal(adopted.height, 540);
for (let y = 0; y < 270; y++) {
  for (let x = 0; x < 480; x++) {
    const i: number = (y * 2 * adopted.width + x * 2) * 4;
    for (const offset of [4, adopted.width * 4, adopted.width * 4 + 4]) {
      assert.deepEqual(adopted.data.subarray(i, i + 4), adopted.data.subarray(i + offset, i + offset + 4),
        `整数2倍のドットが崩れている: ${x},${y}`);
    }
    // 上部の原本色と、継ぎ目より下の地面は元画素に一致。文字・光の焼込みも検出する。
    const source = y < 144 ? forest : y >= 199 ? soil : undefined;
    if (source) {
      const sy = source === forest ? y + layout.forestTop : y - layout.soilTop;
      const j: number = (sy * source.width + x) * 4;
      assert.deepEqual(adopted.data.subarray(i, i + 4), source.data.subarray(j, j + 4), `原本色の変化: ${x},${y}`);
    }
  }
}
console.log("採用森背景 OK: v19静的画像ハッシュ／960×540／全画素が整数2倍／森林・地面の原本色維持");
