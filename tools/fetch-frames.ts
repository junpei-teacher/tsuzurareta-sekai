/**
 * PixelLab の生成物をローカルへ落とす（Phase 7）。
 *
 *   npm run fetch -- <出力ディレクトリ> <URLテンプレート> <枚数> [--prefix south]
 *
 * URLテンプレートの `{i}` が 0..枚数-1 に置き換わる。
 *
 * 例：
 *   npm run fetch -- public/assets/sprites/mira/walk_v3a \
 *     "https://backblaze.pixellab.ai/.../south/{i}.png" 8 --prefix south
 *
 * 落とし終えたら `npm run palettize -- <出力ディレクトリ>` で減色する。
 * 生成物は色が揺れるので、減色は必須（docs/アートバイブル.md 第2節）。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const [outDir, template, countRaw] = args;
const count = Number(countRaw);

if (!outDir || !template || !Number.isFinite(count) || count <= 0) {
  console.error(
    "使い方: npm run fetch -- <出力ディレクトリ> <URLテンプレート（{i}を含む）> <枚数> [--prefix name]",
  );
  process.exit(1);
}
// 連番のときだけ {i} が要る。1枚だけ落とす場合（回転画像など）は不要
if (count > 1 && !template.includes("{i}")) {
  console.error("2枚以上を落とすには URLテンプレートに {i} が必要です");
  process.exit(1);
}

const pi = args.indexOf("--prefix");
const prefix = pi >= 0 && args[pi + 1] !== undefined ? args[pi + 1]! : "frame";

mkdirSync(outDir, { recursive: true });

/** 一時的なDNS障害で全部落ちるのを避けるため、少しだけ粘る */
async function getWithRetry(url: string, tries = 3): Promise<Buffer> {
  let lastErr: unknown;
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (t < tries) await new Promise((r) => setTimeout(r, 800 * t));
    }
  }
  throw lastErr;
}

let ok = 0;
for (let i = 0; i < count; i++) {
  const url = template.replace("{i}", String(i));
  // 1枚だけなら連番を付けない（south.png のように使いたいので）
  const file = join(outDir, count === 1 ? `${prefix}.png` : `${prefix}_${i}.png`);
  try {
    const buf = await getWithRetry(url);
    writeFileSync(file, buf);
    ok++;
    console.log(`  ${String(i).padStart(2)}  ${buf.length.toString().padStart(6)} bytes  → ${file}`);
  } catch (e) {
    console.error(`  ${String(i).padStart(2)}  失敗: ${String(e)}`);
  }
}

console.log(`\n${ok}/${count} 枚を取得しました。`);
console.log(`次: npm run palettize -- ${outDir}`);
if (ok < count) process.exit(1);
