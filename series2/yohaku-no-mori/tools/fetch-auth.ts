/**
 * PixelLab の認証付きエンドポイントからファイルを取得する。
 *
 *   npm run fetch:auth -- <出力パス> <URL>
 *
 * マップオブジェクトとタイルセットのメタデータは
 * api.pixellab.ai 上にあり、Bearer トークンが要る。
 * （キャラのスプライトとタイルのシートは backblaze 上の公開URLなので `npm run fetch` でよい）
 *
 * 【トークンの扱い】
 * プロジェクト直下の `.pixellab.token` を読む。このファイルは .gitignore 済み。
 * トークンは環境変数 PIXELLAB_TOKEN でも渡せる。
 * どちらの経路でも、中身をログに出さない。
 *
 * 作り方（PowerShell、初回だけ）:
 *   Set-Content -Path .pixellab.token -Value "あなたのトークン" -NoNewline -Encoding ascii
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TOKEN_FILE = join(ROOT, ".pixellab.token");

function readToken(): string {
  const fromEnv = process.env["PIXELLAB_TOKEN"];
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (existsSync(TOKEN_FILE)) {
    const t = readFileSync(TOKEN_FILE, "utf8").trim();
    if (t) return t;
  }
  console.error(
    "トークンが見つかりません。\n" +
    "  PowerShell で次を1回だけ実行してください（値はご自身のトークンに置き換え）:\n" +
    '    Set-Content -Path .pixellab.token -Value "YOUR_TOKEN" -NoNewline -Encoding ascii',
  );
  process.exit(1);
}

const [outPath, url] = process.argv.slice(2);
if (!outPath || !url) {
  console.error("使い方: npm run fetch:auth -- <出力パス> <URL>");
  process.exit(1);
}

const token = readToken();

async function get(u: string, tries = 3): Promise<Buffer> {
  let last: unknown;
  for (let t = 1; t <= tries; t++) {
    try {
      const res = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      last = e;
      if (t < tries) await new Promise((r) => setTimeout(r, 800 * t));
    }
  }
  throw last;
}

const abs = join(ROOT, outPath);
mkdirSync(dirname(abs), { recursive: true });
const buf = await get(url);
if (buf.length === 0) {
  console.error("0バイトでした。URLかトークンを確認してください。");
  process.exit(1);
}
writeFileSync(abs, buf);
console.log(`${buf.length} bytes → ${outPath}`);
