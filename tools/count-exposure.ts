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
 *
 * ────────────────────────────────────────────
 * 【この数字を目標にしてはいけない】
 *
 * 一度、この数を上げにいって失敗している。25回まで積んだ結果、
 * ミラが「署名を書く装置」になり、遊んだ人の感想は
 * 「MIRA、MIRA 言い過ぎ」「探して話しかけるだけの作業に見える」だった。
 *
 * **回数ではなく、覚えているかが要る。**
 * 彼女が自分の名を綴ってみせる場面が一度あるほうが、
 * 棚札に10回書いてあるより効く。
 *
 * したがって下限は 12 とする。**これは床であって、天井ではない。**
 * 下回ったら足す。上回っても、それ以上は積まない。
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
const foundRooms = Object.entries(mira.found ?? {});
const foundAll = foundRooms.flatMap(([, ls]) => ls);
const foundHits = foundAll.reduce((n, l) => n + count(l), 0);
const foundExpected = foundAll.length > 0
  ? (mira.talks.length * foundHits) / foundAll.length
  : 0;

console.log("\n── ミラを見つけたときの一行 ────────────────");
console.log(`  ${foundRooms.length} 部屋 × 各 ${foundRooms[0]?.[1].length ?? 0} 通り = ${foundAll.length} 行`);
console.log(`  うち MIRA を含む行 ${foundAll.filter((l) => l.includes(WORD)).length}（期待値 ${foundExpected.toFixed(1)} 回）`);
console.log("  ※ ここは毎回必ず読まれる枠なので、**詰め込むと真っ先に飽きられる。**");

// ── 2. 家具を調べたときの一行 ────────────────────
//
// 何回調べるかは人によるので、**控えめな見積もりを明示して**数える。
// 第1章は4部屋を何度も往復する作りで、各部屋に本棚が4ブロックある。
// 15分の章で本棚を10回しか調べないというのは、かなり少なめの想定である。
// 家具は1つにつき1本の文が固定で割り当たる（src/field/notices.ts）。
// 何本の家具を調べるかで露出が決まるので、「調べた家具の数 × MIRA を含む文の割合」で見る。
const ASSUMED: Record<string, number> = { B: 10, T: 4, C: 4, V: 2 };
const LABEL: Record<string, string> = { B: "本棚", T: "写字机", C: "燭台", V: "階段" };

console.log("\n── 家具を調べる（1つの家具に1本が固定で割り当たる）──");
let noticeExposure = 0;
for (const [tile, e] of Object.entries(notices).filter(([k]) => isData(k))) {
  const hits = e.ch1.reduce((a, l) => a + count(l), 0);
  const n = (ASSUMED[tile] ?? 0) * (hits / e.ch1.length);
  noticeExposure += n;
  console.log(
    `  ${LABEL[tile]?.padEnd(4) ?? tile}  ${e.ch1.length}本の文のうち MIRA 入り ${hits}本` +
    ` × ${ASSUMED[tile]}個調べる → ${n.toFixed(1)} 回`,
  );
}
console.log(`  → 合計 ${noticeExposure.toFixed(1)} 回`);

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

// ── 4. 第2章 ────────────────────────────────
//
// **ここを数えないのは間違いだった。** 禁書に書き込むのは第3章の終わりで、
// 記憶がいちばん新しいのは第2章である。しかも焼け残った当番表は、
// 彼女を探している最中に読むことになる。第1章のどの一行より強い。
const ch2 = read("data/dialogue/ch2.json") as Record<string, Speaker>;
console.log("\n── 第2章 ────────────────────────────────");
let ch2Total = 0;
const board2 = ch2["duty_board"];
if (board2) {
  const first = board2.talks[0]?.reduce((n, l) => n + count(l), 0) ?? 0;
  ch2Total += first;
  console.log(`  焼け残った当番表（最初に調べた1回で ${first} 回）`);
  board2.talks[0]?.filter((l) => l.includes(WORD)).forEach((l) => console.log(`    ${l}`));
}
const ASSUMED2: Record<string, number> = { B: 6, T: 3, C: 2, V: 2 };
for (const [tile, e] of Object.entries(notices).filter(([k]) => isData(k))) {
  const lines = e.ch2 ?? e.ch1;
  const hits = lines.reduce((a, l) => a + count(l), 0);
  const n = (ASSUMED2[tile] ?? 0) * (hits / lines.length);
  if (n > 0) console.log(`  ${LABEL[tile]} を ${ASSUMED2[tile]}個調べる → ${n.toFixed(1)} 回`);
  ch2Total += n;
}
console.log(`  → 第2章で ${ch2Total.toFixed(1)} 回`);

// ── まとめ ────────────────────────────────────
const floor = miraTotal + foundExpected;
const ch1Realistic = floor + firstLook + noticeExposure;
const realistic = ch1Realistic + ch2Total;
console.log("\n── まとめ ────────────────────────────────");
console.log(`  必ず通る（ミラとの会話）                    ${floor.toFixed(1)} 回`);
console.log(`  第1章の控えめな通し                        ${ch1Realistic.toFixed(1)} 回`);
console.log(`  ＋ 第2章                                   ${ch2Total} 回`);
console.log(`  合計                                       ${realistic.toFixed(1)} 回`);
const FLOOR = 12;
console.log(`\n  下限 ${FLOOR} 回 … ${realistic >= FLOOR ? "満たしている" : "**足りない**"}`);
console.log("  （下限であって目標ではない。上回っても積み増さないこと）");

if (realistic < FLOOR) process.exitCode = 1;
