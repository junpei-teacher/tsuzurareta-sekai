/**
 * 台本の検査（手順書 Phase 8）。
 *
 *   npm run lint:script
 *
 * 会話の文章は自由に書き換えてよいが、**枠に収まるかどうかだけは機械が見る。**
 * はみ出した行はゲーム中で黙って切れるので、目で気づけない。
 *
 * 見るもの:
 *   1. 1行が枠に収まるか（立ち絵があると本文の幅が狭くなる）
 *   2. 鉤括弧の付け方（人が喋る窓では、鉤括弧の無い行は地の文の色になる）
 *   3. 1会話の行数（3行で1ページ。半端だと最後のページがすかすかになる）
 *   4. 参照している立ち絵が実在するか
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string): any => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// ── 枠の幅（src/ui/dialogue.ts と合わせること）──────────
// 窓は x=16 幅448。本文は立ち絵があると x+64+18 から始まり、右に14の余白。
const FULL_WIDTH = (448 - 14 - 14) / 12;              // 立ち絵なし
const WITH_PORTRAIT = (448 - (64 + 18) - 14) / 12;    // 立ち絵あり

/** 全角を1、半角を0.5として数える */
function width(s: string): number {
  let w = 0;
  for (const ch of s) w += /[\x20-\x7e]/.test(ch) ? 0.5 : 1;
  return w;
}

type Speaker = {
  name: string; talks: string[][];
  found?: Record<string, string[]>;
  portrait?: string;
};

let problems = 0;
const warn = (where: string, msg: string): void => {
  problems++;
  console.log(`  ${where}\n      ${msg}`);
};

// 立ち絵の在処は MANIFEST が決める。
// **フォルダを見ないこと。** 抹消された名前の者のように、
// 戦闘用の絵をそのまま立ち絵に使っている例がある。
const manifest = readFileSync(join(ROOT, "src/core/assets.ts"), "utf8");
const portraits = new Set(
  [...manifest.matchAll(/"portrait\.([\w-]+)"\s*:\s*"([^"]+)"/g)]
    .filter(([, , path]) => existsSync(join(ROOT, "public", path!)))
    .map((m) => m[1]!),
);

for (const file of ["ch1", "ch2", "ch3"]) {
  const table = read(`data/dialogue/${file}.json`) as Record<string, Speaker>;
  console.log(`\n── ${file}.json ─────────────────────────`);

  for (const [id, sp] of Object.entries(table)) {
    if (id.startsWith("_")) continue;
    const limit = sp.portrait ? WITH_PORTRAIT : FULL_WIDTH;

    if (sp.portrait && !portraits.has(sp.portrait)) {
      warn(`${id}`, `立ち絵 "${sp.portrait}" が public/assets/portraits にありません`);
    }

    const check = (line: string, where: string): void => {
      const w = width(line);
      if (w > limit) {
        warn(where, `幅 ${w} > ${limit}（${Math.ceil(w - limit)} 文字ぶんはみ出す）\n      ${line}`);
      }
      // 人が喋る窓でだけ、鉤括弧が色分けの手がかりになる
      if (sp.portrait && line.startsWith("「") && !line.endsWith("」")) {
        warn(where, `鉤括弧が閉じていません（1行に1つ閉じる書き方にしています）\n      ${line}`);
      }
    };

    for (const [room, lines] of Object.entries(sp.found ?? {})) {
      lines.forEach((l, i) => check(l, `${id}.found.${room}[${i}]`));
    }
    sp.talks.forEach((talk, ti) => {
      talk.forEach((l, li) => check(l, `${id}.talks[${ti}][${li}]`));
      if (talk.length % 3 !== 0 && talk.length > 3) {
        console.log(
          `  ${id}.talks[${ti}] は ${talk.length} 行 → 最後のページが ${talk.length % 3} 行`,
        );
      }
    });
    console.log(`  ok ${id.padEnd(16)} ${sp.talks.length} 会話　幅上限 ${limit}`);
  }
}

// 家具の一行は幅448の帯に x=28 から描く
console.log("\n── notices.json ────────────────────────");
const notices = read("data/dialogue/notices.json") as
  Record<string, { ch1: string[]; ch2?: string[]; ch3?: string[] }>;
const NOTICE_LIMIT = (448 - 12 - 14) / 12;
for (const [tile, e] of Object.entries(notices)) {
  if (tile.startsWith("_")) continue;
  for (const [ch, lines] of Object.entries(e)) {
    (lines as string[]).forEach((l, i) => {
      const w = width(l);
      if (w > NOTICE_LIMIT) warn(`notices.${tile}.${ch}[${i}]`, `幅 ${w} > ${NOTICE_LIMIT}\n      ${l}`);
    });
  }
  // 第3章は禁書庫。ch1 に落ちると地下に MIRA の署名が現れる（src/field/notices.ts）
  if (!e.ch3?.length) warn(`notices.${tile}.ch3`, "第3章の文が無い。ch1 に落ちて MIRA が地下に出る");
  console.log(
    `  ok ${tile}  ch1 ${e.ch1.length}行 / ch2 ${e.ch2?.length ?? 0}行 / ch3 ${e.ch3?.length ?? 0}行`,
  );
}

console.log(problems === 0 ? "\n枠に収まっています。" : `\n**${problems} 件、直してください。**`);
process.exitCode = problems === 0 ? 0 : 1;
