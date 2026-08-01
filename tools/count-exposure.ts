/**
 * `MIRA` のアルファベット露出を数える（手順書 8-2.5）。
 *
 *   npm run count:mira
 *
 * 会話ウィンドウの話者名はカタカナの「ミラ」である。日本語の会話で
 * `MIRA` と表記するのは不自然なので、そこは変えられない（設計書 2.3）。
 * したがってプレイヤーは、**世界の中に書かれた文字**としてしか
 * アルファベットの綴りに触れない。署名・整理票・彫り跡がその経路になる。
 *
 * 最後に禁書の白紙を前にして `MIRA` と打てなければ、この物語は成立しない。
 * **だから露出回数は感想ではなく数字で管理する。**
 *
 * 数えるのは「行数」ではなく「プレイヤーが必ず通る回数」であることに注意。
 * 任意で調べる張り紙に10行あっても、露出は0回かもしれない。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string): any => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const WORD = "MIRA";
const count = (s: string): number => s.split(WORD).length - 1;

type Speaker = { name: string; talks: string[][]; found?: Record<string, string> };
const ch1 = read("data/dialogue/ch1.json") as Record<string, Speaker>;
const notices = read("data/dialogue/notices.json") as Record<string, { ch1: string[]; ch2?: string[] }>;

const isData = (k: string): boolean => !k.startsWith("_");

// ── 1. ミラとの会話（第1章の進行そのもの）────────────
const mira = ch1["mira"]!;
const miraTalks = mira.talks.map((t) => t.reduce((n, l) => n + count(l), 0));
const miraHits = miraTalks.filter((n) => n > 0).length;
const miraTotal = miraTalks.reduce((a, b) => a + b, 0);

console.log("── ミラとの会話 ──────────────────────────");
console.log(`  全 ${mira.talks.length} 会話中 ${miraHits} 会話に MIRA（計 ${miraTotal} 回）`);
console.log(`  **最後まで話すと第1章が終わる仕掛けなので、この ${miraTotal} 回は必ず通る。**`);
mira.talks.forEach((t, i) => {
  const n = t.reduce((a, l) => a + count(l), 0);
  if (n > 0) console.log(`    [${String(i).padStart(2)}] ${t.find((l) => l.includes(WORD))}`);
});

// ── 1.5 「見つけたときの様子」────────────────────
//
// これは **会話1回につき必ず1行、頭に入る**。部屋はミラが移った先で決まるので、
// 期待値は「会話数 × (MIRA を含む部屋の割合)」になる。
const foundLines = Object.entries(mira.found ?? {});
const foundHits = foundLines.reduce((n, [, l]) => n + count(l), 0);
const foundExpected = foundLines.length > 0
  ? (mira.talks.length * foundHits) / foundLines.length
  : 0;

console.log("\n── ミラを見つけたときの一行 ────────────────");
console.log(`  ${foundLines.length} 部屋中 ${foundLines.filter(([, l]) => l.includes(WORD)).length} 部屋の文に MIRA`);
for (const [room, l] of foundLines) {
  console.log(`    ${count(l) > 0 ? "◯" : "　"} ${room.padEnd(12)} ${l}`);
}
console.log(`  会話 ${mira.talks.length} 回の頭に必ず1行入るので、期待値 ${foundExpected.toFixed(1)} 回`);

// ── 2. 家具を調べたときの一行 ────────────────────
//
// 何回調べるかは人によるので、**控えめな見積もりを明示して**数える。
// 第1章は4部屋を何度も往復する作りで、各部屋に本棚が4ブロックある。
// 15分の章で本棚を10回しか調べないというのは、かなり少なめの想定である。
const ASSUMED: Record<string, number> = { B: 10, T: 4, C: 4, V: 2 };
const LABEL: Record<string, string> = { B: "本棚", T: "写字机", C: "燭台", V: "階段" };

console.log("\n── 家具を調べる ──────────────────────────");
let noticeExposure = 0;
for (const [tile, e] of Object.entries(notices).filter(([k]) => isData(k))) {
  const times = ASSUMED[tile] ?? 0;
  // 順に一巡して先頭へ戻る。実際の巡り方をそのまま再現して数える
  let n = 0;
  for (let i = 0; i < times; i++) n += count(e.ch1[i % e.ch1.length]!);
  noticeExposure += n;
  const perCycle = e.ch1.reduce((a, l) => a + count(l), 0);
  console.log(
    `  ${LABEL[tile]?.padEnd(4) ?? tile}  ${e.ch1.length}行（一巡で ${perCycle} 回）` +
    ` × ${times}回調べる → ${n} 回`,
  );
}
console.log(`  → 合計 ${noticeExposure} 回`);

// ── 3. 張り紙・目録（任意。調べなければ0回）──────────
console.log("\n── 掲示物（任意。調べなければ 0 回）────────");
let optional = 0;
let firstLook = 0;
for (const [id, sp] of Object.entries(ch1).filter(([k]) => isData(k) && k !== "mira")) {
  const per = sp.talks.map((t) => t.reduce((n, l) => n + count(l), 0));
  const sum = per.reduce((a, b) => a + b, 0);
  if (sum === 0) continue;
  optional += sum;
  firstLook += per[0] ?? 0;
  console.log(`  ${sp.name || id} 全${sum}回（最初に調べた1回で ${per[0]} 回）`);
}

// ── まとめ ────────────────────────────────────
const floor = miraTotal + foundExpected;
const realistic = floor + firstLook + noticeExposure;
console.log("\n── まとめ ────────────────────────────────");
console.log(`  必ず通る（ミラとの会話＋見つけたときの一行） ${floor.toFixed(1)} 回`);
console.log(`  控えめな通し（＋掲示物を1回ずつ＋上の想定）  ${realistic.toFixed(1)} 回`);
console.log(`  上限（掲示物も最後まで読む）                ${(floor + optional + noticeExposure).toFixed(1)} 回`);
console.log(`\n  目標 20 回 … ${realistic >= 20 ? "達成" : "**未達**"}`);

if (realistic < 20) process.exitCode = 1;
