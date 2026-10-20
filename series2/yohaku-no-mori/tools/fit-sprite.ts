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
 * **立ち姿と歩行フレームは必ず一緒に渡すこと**（ディレクトリを複数書ける）。
 * 別々に切り出すと、立ち止まった瞬間にキャラが数ピクセル跳ぶ。
 *
 * そこで、
 *   1. 渡された全ディレクトリのPNGから**まとめて**不透明部分の範囲を取る
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
const dirs = args.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
if (dirs.length === 0) {
  console.error("使い方: npm run fit -- <ディレクトリ> [<ディレクトリ> ...] [--size 92] [--pad 11]");
  process.exit(1);
}
const num = (flag: string, dflt: number): number => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : dflt;
};
const SIZE = num("--size", 92);
const PAD = num("--pad", 11);
/**
 * `--feet` … 縦だけ**1枚ごとに**足元を揃える。
 *
 * 生成された歩行フレームは、コマによって figure 全体が数px 上下に描かれている。
 * まとめて1つの切り出しをかけると、そのずれがそのまま残り、
 * **一歩ごとに地面へ沈んで浮き上がる。** 実際 8px（4デザインpx）動いていた。
 *
 * 横はまとめたまま切る。1枚ごとに中央へ寄せると、
 * 腕を振るたびに体が左右に滑る。
 */
const FEET = args.includes("--feet");

type Loaded = { path: string; png: PNG };
const loaded: Loaded[] = [];
for (const dir of dirs) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
    const path = join(dir, file);
    loaded.push({ path, png: PNG.sync.read(readFileSync(path)) });
  }
}
if (loaded.length === 0) {
  console.error(`${dirs.join(" ")} に png がありません`);
  process.exit(1);
}

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
console.log(`  ${loaded.length} 枚をまとめた絵の範囲  ${inkW}x${inkH}  (${x0},${y0})`);

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
const globalOffY = y1 + PAD - (SIZE - 1);

/** その1枚だけの不透明範囲の下端 */
function bottomOf(png: PNG): number {
  for (let y = png.height - 1; y >= 0; y--) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3]! > 8) return y;
    }
  }
  return png.height - 1;
}

for (const { path, png } of loaded) {
  const offY = FEET ? bottomOf(png) + PAD - (SIZE - 1) : globalOffY;
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
  writeFileSync(path, PNG.sync.write(out));
}

console.log(
  `  → ${SIZE}x${SIZE} に揃えました（足元はキャンバス下から ${PAD}px` +
  `${FEET ? "・1枚ごとに足元を揃えた" : ""}）`,
);
