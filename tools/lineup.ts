/**
 * 並び絵を作る（docs/アートバイブル.md 第1節）。
 *
 *   npm run lineup -- <出力.png> <sprite.png> [<sprite.png> ...]
 *
 * キャラは1体ずつ生成するので、**並べて初めて頭の大きさや背丈が
 * 揃っていないことに気づく。** 単体で見ると全部それらしく見えてしまう。
 *
 * 足元を一直線に揃え、3倍に拡大して横に並べる。
 * 頭身を自動で測ろうともしたが、髪とフードのせいで首の位置が取れず、
 * 「4pxの頭＝15頭身」のような嘘の数字しか出なかった。
 * **絵は目で見て判断する。道具は「並べて見せる」ところまででいい。**
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const [out, ...files] = process.argv.slice(2);
if (!out || files.length === 0) {
  console.error("使い方: npm run lineup -- <出力.png> <sprite.png> ...");
  process.exit(1);
}

const SCALE = 3;
const GAP = 6;
/** 目盛りの間隔（元ピクセル）。背丈の比較用 */
const RULE = 8;

type Cut = { png: PNG; x0: number; y0: number; w: number; h: number };

const cuts: Cut[] = files.map((f) => {
  const png = PNG.sync.read(readFileSync(f));
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3]! <= 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { png, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
});

const tallest = Math.max(...cuts.map((c) => c.h));
const totalW = cuts.reduce((n, c) => n + c.w + GAP, GAP);
const W = totalW * SCALE;
const H = (tallest + GAP * 2) * SCALE;

const sheet = new PNG({ width: W, height: H });
// 背景。床の色に近い灰色にして、黒い輪郭が見えるようにする
for (let i = 0; i < sheet.data.length; i += 4) {
  sheet.data[i] = 0x2a; sheet.data[i + 1] = 0x26; sheet.data[i + 2] = 0x22; sheet.data[i + 3] = 255;
}

const put = (x: number, y: number, r: number, g: number, b: number, a: number): void => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  const t = a / 255;
  sheet.data[i] = Math.round(sheet.data[i]! * (1 - t) + r * t);
  sheet.data[i + 1] = Math.round(sheet.data[i + 1]! * (1 - t) + g * t);
  sheet.data[i + 2] = Math.round(sheet.data[i + 2]! * (1 - t) + b * t);
};

const baseline = (tallest + GAP) * SCALE;

// 背丈の目盛り。8px ごとの横線
for (let k = 0; k * RULE <= tallest; k++) {
  const y = baseline - k * RULE * SCALE;
  const bright = k % 2 === 0;
  for (let x = 0; x < W; x++) put(x, y, bright ? 0x5c : 0x3d, bright ? 0x4a : 0x33, bright ? 0x38 : 0x2a, 255);
}

let cx = GAP;
for (const c of cuts) {
  // 足元を baseline に、横は自分の幅の中で左詰め
  const ox = cx * SCALE;
  const oy = baseline - c.h * SCALE;
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const s = ((y + c.y0) * c.png.width + (x + c.x0)) * 4;
      const a = c.png.data[s + 3]!;
      if (a <= 8) continue;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          put(ox + x * SCALE + dx, oy + y * SCALE + dy,
            c.png.data[s]!, c.png.data[s + 1]!, c.png.data[s + 2]!, a);
        }
      }
    }
  }
  cx += c.w + GAP;
}

writeFileSync(out, PNG.sync.write(sheet));
console.log(`${files.length} 体を並べました → ${out}`);
files.forEach((f, i) => {
  const c = cuts[i]!;
  console.log(`  ${f.split(/[\\/]/).slice(-2).join("/").padEnd(24)} ${c.w}x${c.h}px`);
});
console.log(`  目盛りは ${RULE}px ごと（明るい線が ${RULE * 2}px ごと）`);
