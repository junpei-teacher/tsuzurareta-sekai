/** シリーズ2の表示台本とUI色用途を検査する。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const readText = (path: string): string => readFileSync(join(ROOT, path), "utf8");

type Speech = { name: string; color: string; lines: string[] };
type Dialogue = Record<string, Speech[]>;

const errors: string[] = [];
const warnings: string[] = [];
const scope = JSON.parse(readText("data/scope.json")) as { dialogueFiles: string[] };
const dialogue: Dialogue = {};
const dialogueOwner = new Map<string, string>();
for (const name of scope.dialogueFiles) {
  const path = `data/series2/dialogue/${name}.json`;
  if (!existsSync(join(ROOT, path))) continue;
  const chapter = JSON.parse(readText(path)) as Dialogue;
  for (const [id, speeches] of Object.entries(chapter)) {
    const previous = dialogueOwner.get(id);
    if (previous) errors.push(`${id}: 会話IDが${previous}と${path}で重複しています`);
    dialogueOwner.set(id, path);
    dialogue[id] = speeches;
  }
}

function displayWidth(value: string): number {
  let result = 0;
  for (const char of value.replaceAll("{NAME}", "名前名前名前名前")) {
    result += /[\x20-\x7e]/.test(char) ? 0.5 : 1;
  }
  return result;
}

for (const [dialogueId, speeches] of Object.entries(dialogue)) {
  if (speeches.length === 0) errors.push(`${dialogueId}: 発話がありません`);

  speeches.forEach((speech, speechIndex) => {
    if (speech.lines.length === 0 || speech.lines.length > 3) {
      errors.push(`${dialogueId}[${speechIndex}]: 1ページは1〜3行です（現在${speech.lines.length}行）`);
    }

    speech.lines.forEach((line, lineIndex) => {
      const where = `${dialogueId}[${speechIndex}].lines[${lineIndex}]`;
      const limit = speech.name.length > 0 && line.startsWith("「") ? 29 : 35;
      const width = displayWidth(line);
      if (width > limit) errors.push(`${where}: 表示幅 ${width} > ${limit}「${line}」`);
      if (line.startsWith("「") && !line.endsWith("」")) {
        errors.push(`${where}: 鉤括弧が閉じていません「${line}」`);
      }
      if (line.includes("SENA")) {
        errors.push(`${where}: SENAは最終入力前の通常台本へ直接表示しません`);
      }
      if (/\\r|\\n/.test(line)) errors.push(`${where}: 改行文字をlines内へ埋め込まないでください`);
    });
  });
}

// PAL.lineは罫線専用。本文へ使うと古いUIに見えるうえ、コントラストも不足する。
const series2UiSources = [
  "src/scenes/title.ts",
  "src/scenes/prologue.ts",
  "src/scenes/villagePlaceholder.ts",
  "src/sideview/scene.ts",
  "src/scenes/battle.ts",
];
for (const path of series2UiSources) {
  const source = readText(path);
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\.text(?:Rich|Right)?\([^;]*PAL\.line/.test(line)) {
      errors.push(`${path}:${index + 1}: PAL.lineを文字色に使っています`);
    }
  });
}

for (const warning of warnings) console.warn(`警告: ${warning}`);
if (errors.length > 0) {
  console.error(`シリーズ2台本検査: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const speechCount = Object.values(dialogue).reduce((sum, speeches) => sum + speeches.length, 0);
const lineCount = Object.values(dialogue).flat().reduce((sum, speech) => sum + speech.lines.length, 0);
console.log(`シリーズ2台本検査 OK: ${Object.keys(dialogue).length}会話 / ${speechCount}発話 / ${lineCount}行`);
