/** プレイヤーへ見える範囲で、SLANE/SENAとシリーズ1要素の境界を検査する。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const readText = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const errors: string[] = [];

const nameInput = readText("src/scenes/nameInput.ts");
if (!/RESERVED_NAME\s*=\s*"SENA"/.test(nameInput)) errors.push("主人公名SENAの予約判定がありません");

const prologue = readText("src/scenes/prologue.ts");
if (!prologue.includes('const word = "SLANE"')) errors.push("プロローグにSLANEの記憶提示がありません");
if (/grimoire|knownWords|unspoken/.test(prologue)) errors.push("プロローグがSLANEを戦闘知識へ登録しています");

const spells = JSON.parse(readText("data/spells.json")) as {
  spells: Array<{ id: number; name: string; canonical: string }>;
};
if (spells.spells.some((spell) => spell.canonical === "SENA" || spell.name === "SENA")) {
  errors.push("SENAを57枠の呪文として登録しています");
}
const slane = spells.spells.find((spell) => spell.canonical === "SLANE");
if (slane?.id !== 24) errors.push("SLANEが凍結済みspellId 24にありません");

const scope = JSON.parse(readText("data/scope.json")) as { dialogueFiles: string[] };
for (const chapter of scope.dialogueFiles) {
  const path = `data/series2/dialogue/${chapter}.json`;
  if (!existsSync(join(ROOT, path))) continue;
  const text = readText(path);
  if (text.includes("MIRA")) errors.push(`${path}: MIRAを生存人物として表示しています`);
  if (chapter !== "ch4" && text.includes("SENA")) errors.push(`${path}: 終盤前にSENAの綴りを再掲しています`);
}

const panels = readText("data/series2/panels.json");
if (/断章|結末一覧|真エンド|MIRA/.test(panels)) errors.push("シリーズ2パネルへ旧収集・旧人物が混入しています");

if (errors.length > 0) {
  console.error(`正典境界検査: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("正典境界検査 OK: SENA予約／SLANE ID24／通常台本の再掲禁止／旧要素分離");

