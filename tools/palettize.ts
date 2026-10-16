/**
 * 生成物をアートバイブルの16色に叩き込む（手順書 7-4）。
 *
 *   npm run palettize -- <入力ファイル or ディレクトリ> [--warm 0.35] [--suffix _pal]
 *
 * PixelLab の出力はドット絵としては正しいが、色が16色を超え、
 * しかも寒色寄りに出ることがある。蝋燭の書庫に置くと浮くので、
 * **暖色側へ寄せてから**最近傍で減色する。
 *
 * --warm は暖色への寄せ具合（0で無変換）。
 *   青灰色のローブを暖かい石色へ引き込むために既定で 0.35 かけている。
 *
 * 透明ピクセルはそのまま残す。半透明は捨てる（ドット絵に半透明は要らない）。
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { PNG } from "pngjs";
import { PALETTE_ASSET, ASSET_RGB, nearest, type RGB } from "./palette.ts";

const args = process.argv.slice(2);
const target = args[0];
if (!target) {
  console.error("使い方: npm run palettize -- <ファイル|ディレクトリ> [--warm 0.35] [--suffix _pal]");
  process.exit(1);
}
const warm = num("--warm", 0.35);
const suffix = str("--suffix", "_pal");

function num(flag: string, def: number): number {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : def;
}
function str(flag: string, def: string): string {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : def;
}

/** 蝋燭の光の下へ寄せる。赤を上げ、青を下げる */
function warmify(c: RGB, k: number): RGB {
  return {
    r: Math.min(255, Math.round(c.r + (255 - c.r) * 0.10 * k + 14 * k)),
    g: Math.round(c.g * (1 - 0.02 * k)),
    b: Math.round(c.b * (1 - 0.30 * k)),
  };
}

function palettize(file: string): void {
  const png = PNG.sync.read(readFileSync(file));
  const used = new Set<number>();
  let before = new Set<string>();

  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3]!;
    if (a < 128) {
      // 半透明は完全な透明にする
      png.data[i + 3] = 0;
      continue;
    }
    png.data[i + 3] = 255;
    const src: RGB = { r: png.data[i]!, g: png.data[i + 1]!, b: png.data[i + 2]! };
    before.add(`${src.r},${src.g},${src.b}`);

    const idx = nearest(warmify(src, warm), ASSET_RGB);
    used.add(idx);
    const p = ASSET_RGB[idx]!;
    png.data[i] = p.r;
    png.data[i + 1] = p.g;
    png.data[i + 2] = p.b;
  }

  const out = join(dirname(file), basename(file, extname(file)) + suffix + ".png");
  writeFileSync(out, PNG.sync.write(png));

  const names = [...used].sort((a, b) => a - b).map((i) => PALETTE_ASSET[i]!.name);
  console.log(
    `${basename(file).padEnd(18)} ${String(before.size).padStart(3)}色 → ` +
    `${String(used.size).padStart(2)}色   [${names.join(" ")}]`,
  );
}

const st = statSync(target);
if (st.isDirectory()) {
  for (const f of readdirSync(target)) {
    if (!f.endsWith(".png")) continue;
    if (f.includes(suffix) || f.startsWith("_")) continue;
    palettize(join(target, f));
  }
} else {
  palettize(target);
}
