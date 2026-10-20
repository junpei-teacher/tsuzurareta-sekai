/** 本番ビルドにシリーズ1の舞台・画像・DEV入口が混ざっていないことを検査する。 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SERIES2_MANIFEST } from "../src/core/series2Assets.ts";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
if (!existsSync(dist)) {
  console.error("distがありません。先に npm run build を実行してください。");
  process.exit(1);
}

function filesBelow(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesBelow(path));
    else out.push(path);
  }
  return out;
}

const files = filesBelow(dist);
const textFiles = files.filter((file) => [".js", ".css", ".html", ".txt"].includes(extname(file)));
const text = textFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const forbidden = [
  "/assets/tiles2/",
  "/assets/enemies/",
  "legacy.opening",
  "legacy/devRuntime",
  "禁書の夜",
  "ためす（開発）",
  "/docs/concepts/",
  "forest-edge-pixellab-",
  "forest-edge-ground-v18",
  "storehouse-imagegen-",
  "storehouse-game-palette-v27",
  "village-road-imagegen-",
  "village-road-game-palette-v30",
  "village-gate-imagegen-",
  "village-gate-game-palette-v32",
  "forest-boundary-imagegen-",
  "forest-boundary-game-palette-v34",
  "dry-creek-imagegen-",
  "dry-creek-game-palette-v36",
  "snare-path-imagegen-",
  "snare-path-game-palette-v38",
  "fallen-bridge-imagegen-",
  "fallen-bridge-game-palette-v40",
  "hunter-camp-imagegen-",
  "hunter-camp-game-palette-v42",
  "hunter-camp-illustrated-",
  "guardian-hollow-imagegen-",
  "guardian-hollow-game-palette-v46",
  "接地未合格",
  "キャラ生成比較 v20",
  "キャラ生成比較 v21",
  "キャラ生成比較 v22",
  "sena-pixen-",
  "boundary-beast-pixen-yield-v22",
  "boundary-beast-pixen-kneel-v22",
  "hero-pixen-sky-v21",
  "hero-pixen-v20",
  "boundary-beast-pixen-v20",
  "hero-pixen-clean-v20",
  "boundary-beast-pixen-clean-v20",
];
const errors: string[] = [];
// 目録の正式画像がファイルとして配布され、JSから参照されていることも確かめる。
for (const [id, src] of Object.entries(SERIES2_MANIFEST)) {
  const sourceBytes = readFileSync(fileURLToPath(src));
  const emitted = files.find((file) => extname(file) === ".png" && readFileSync(file).equals(sourceBytes));
  if (!emitted) errors.push(`採用画像が配布物にありません: ${id}`);
  else if (!text.includes(relative(dist, emitted).replaceAll("\\", "/"))) errors.push(`配布画像への参照がありません: ${id}`);
}
for (const token of forbidden) if (text.includes(token)) errors.push(`禁止文字列が残っています: ${token}`);
for (const file of files) {
  if (/forest-edge-(pixellab-|ground-v18)|storehouse-(imagegen-|game-palette-v27)|village-road-(imagegen-|game-palette-v30)|village-gate-(imagegen-|game-palette-v32)|snare-path-(imagegen-|game-palette-v38)|fallen-bridge-(imagegen-|game-palette-v40)|hunter-camp-(imagegen-|game-palette-v42|illustrated-)|guardian-hollow-(imagegen-|game-palette-v46)|(?:hero|sena|boundary-beast)-pixen-|character-pixen-/.test(relative(dist, file))) {
    errors.push(`DEV用の画像試作が配布物にあります: ${relative(dist, file)}`);
  }
}

if (!files.some((file) => /PixelMplus12-Regular.*\.ttf$/.test(file))) {
  errors.push("PixelMplus12-Regular.ttfが配布物にありません");
}
if (!files.some((file) => /PixelMplus-LICENSE.*\.txt$/.test(file))) {
  errors.push("PixelMplusのライセンス原文が配布物にありません");
}

if (errors.length > 0) {
  console.error(`本番bundle検証: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`本番bundle検証 OK: ${files.length}ファイル`);
for (const file of files) console.log(`  ${relative(dist, file)}`);
