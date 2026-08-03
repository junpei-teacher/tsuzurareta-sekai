/**
 * スプライトのキャンバスを揃える（手順書 7-2）。
 *
 *   npm run fit -- <ディレクトリ> [--size 92] [--pad 11]
 *
 * PixelLab は生成モードによってキャンバスの大きさが変わる。
 * standard は 92x92、v3 は 116 だったり 128 だったりする。
 *
 * ところが `d.spriteFoot()` は**キャンバスの下端**を足元に合わせるので、
 * 絵の下に余白があるぶん、そのキャラだけ宙に浮く。
 * 実際、ミラ(128) は絵の下に32px の余白があり、16デザインpx 浮いていた。
 *
 * そこで、
 *   1. ディレクトリ内の全PNGから**まとめて**不透明部分の範囲を取る
 *   2. 横は範囲の中心、縦は範囲の下端が「下から pad」に来るよう切り出す
 *   3. 指定サイズのキャンバスに置き直す
 *
 * **1 をまとめてやるのが肝心。** 向きごとに切り出すと、
 * 東を向いた瞬間に数ピクセル飛ぶ。歩行フレームなら足踏みのたびに震える。
 *
 * 既定値は hero3（92x92・絵の下端はキャンバス下から 11px）に合わせてある。
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const args = process.argv.slice(2);
const dir = args[0];
if (!dir) {
  console.error("使い方: npm run fit -- <ディレクトリ> [--size 92] [--pad 11]");
  process.exit(1);
}
const num = (flag: string, dflt: number): number => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : dflt;
};
const SIZE = num("--size", 92);
const PAD = num("--pad", 11);

const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
if (files.length === 0) {
  console.error(`${dir} に png がありません`);
  process.exit(1);
}

type Loaded = { file: string; png: PNG };
const loaded: Loaded[] = files.map((file) => ({
  file,
  png: PNG.sync.read(readFileSync(join(dir, file))),
}));

// ── 1. 全フレームをまとめた不透明範囲 ──
let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
for (const { png } of loaded) {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3]! <= 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
const inkW = x1 - x0 + 1;
const inkH = y1 - y0 + 1;
console.log(`  ${files.length} 枚をまとめた絵の範囲  ${inkW}x${inkH}  (${x0},${y0})`);

if (inkH + PAD > SIZE) {
  console.error(
    `  **絵が枠に入りません。** 絵の高さ ${inkH} ＋ 余白 ${PAD} > ${SIZE}\n` +
    "  --size を上げるか --pad を下げてください（縮小はしません。ドットが潰れるので）",
  );
  process.exit(1);
}

// ── 2. 切り出し位置。横は中心、縦は下端を「下から PAD」に置く ──
const srcCenterX = Math.round((x0 + x1) / 2);
const offX = srcCenterX - Math.floor(SIZE / 2); // 出力(0,0)に対応する元画像のx
const offY = y1 + PAD - (SIZE - 1);

for (const { file, png } of loaded) {
  const out = new PNG({ width: SIZE, height: SIZE });
  out.data.fill(0);
  for (let y = 0; y < SIZE; y++) {
    const sy = y + offY;
    if (sy < 0 || sy >= png.height) continue;
    for (let x = 0; x < SIZE; x++) {
      const sx = x + offX;
      if (sx < 0 || sx >= png.width) continue;
      const s = (sy * png.width + sx) * 4;
      const d = (y * SIZE + x) * 4;
      out.data[d] = png.data[s]!;
      out.data[d + 1] = png.data[s + 1]!;
      out.data[d + 2] = png.data[s + 2]!;
      out.data[d + 3] = png.data[s + 3]!;
    }
  }
  writeFileSync(join(dir, file), PNG.sync.write(out));
}

console.log(`  → ${SIZE}x${SIZE} に揃えました（足元はキャンバス下から ${PAD}px）`);
