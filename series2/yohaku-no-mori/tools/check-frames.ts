/**
 * 歩行フレームの揺れを測る（docs/アートバイブル.md 第1節）。
 *
 *   npm run frames -- public/assets/sprites/hero5/walk
 *
 * 歩いていると背丈が変わって見える、という指摘は目では原因を特定できない。
 * **フレームごとの不透明範囲を並べて数字で出す。**
 *
 * 見るところ:
 *   高さ  … 歩行中に伸び縮みしていないか
 *   上端  … 頭のてっぺんが上下していないか（跳ねて見える主因）
 *   下端  … 足元が揃っているか。ここがずれると地面に沈む／浮く
 *
 * **許容は 4px（＝2デザインpx）まで。**
 * 歩行には本来わずかな頭の上下があるので、0 を目指すと動きが死ぬ。
 * 実際に破綻していたときは 16px（8デザインpx）だった。桁が違う。
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const TOLERANCE = 4;

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error("使い方: npm run frames -- <ディレクトリ> [...]");
  process.exit(1);
}

type Row = { name: string; top: number; bottom: number; h: number; w: number };

for (const dir of dirs) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const rows: Row[] = [];
  for (const f of files) {
    const png = PNG.sync.read(readFileSync(join(dir, f)));
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
    rows.push({ name: f, top: y0, bottom: y1, h: y1 - y0 + 1, w: x1 - x0 + 1 });
  }

  // 方向ごとにまとめる。south_0..3 のような名前を前提にする
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.name.replace(/_?\d+\.png$/, "").replace(/\.png$/, "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  console.log(`\n── ${dir}`);
  let worst = 0;
  for (const [key, g] of groups) {
    const hs = g.map((r) => r.h);
    const tops = g.map((r) => r.top);
    const bottoms = g.map((r) => r.bottom);
    const spread = Math.max(...hs) - Math.min(...hs);
    const topSpread = Math.max(...tops) - Math.min(...tops);
    const botSpread = Math.max(...bottoms) - Math.min(...bottoms);
    worst = Math.max(worst, spread, topSpread, botSpread);
    const bad = spread > TOLERANCE || topSpread > TOLERANCE || botSpread > TOLERANCE;
    const flag = bad ? " ← **揺れている**" : "";
    console.log(
      `  ${key.padEnd(8)} 高さ ${hs.join("/")}（幅 ${spread}）　` +
      `上端 ${tops.join("/")}（幅 ${topSpread}）　` +
      `下端 ${bottoms.join("/")}（幅 ${botSpread}）${flag}`,
    );
  }
  console.log(
    worst <= TOLERANCE
      ? `  → 揺れは ${TOLERANCE}px 以内。歩行の自然な上下の範囲`
      : `  → **最大 ${worst}px 揺れている。** 実寸では ${(worst / 2).toFixed(1)} デザインpx 動く`,
  );
}
