/**
 * 手順書 1-3 — 分布の検証。
 *
 *   npm run verify:dist
 *
 * ランダムな文字列を10万回流し込み、
 *   1) 帯ごとの出現率が設計値と ±1% 以内で一致するか
 *   2) 帯内の個体分布が偏っていないか
 * を確認する。ズレる場合は resolver.ts の帯境界を調整する。
 */
import { resolveSpell, TIERS, type Tier } from "../src/spell/resolver.ts";

const SAMPLES = 100_000;
const TOLERANCE = 1.0; // 許容誤差（パーセントポイント）
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 乱打を模した文字列を作る（長さ3〜10） */
function randomWord(): string {
  const len = 3 + Math.floor(Math.random() * 8);
  let s = "";
  for (let i = 0; i < len; i++) {
    s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return s;
}

const tally: Record<Tier, number> = {
  DUD: 0, COMMON: 0, UNCOMMON: 0, RARE: 0, MYTH: 0,
};
/** 帯ごとの個体別カウント */
const perIndex: Record<Tier, number[]> = {
  DUD: [], COMMON: [], UNCOMMON: [], RARE: [], MYTH: [],
};
for (const t of TIERS) perIndex[t.tier] = new Array<number>(t.size).fill(0);

for (let i = 0; i < SAMPLES; i++) {
  const res = resolveSpell(randomWord());
  tally[res.tier]++;
  if (res.index >= 0) perIndex[res.tier][res.index]!++;
}

let failed = false;

console.log(`\n=== 帯の出現率（${SAMPLES.toLocaleString()} サンプル）===\n`);
console.log("帯          回数      実測      設計     差    判定");
for (const t of TIERS) {
  const n = tally[t.tier];
  const actual = (n / SAMPLES) * 100;
  const diff = actual - t.designedRate;
  const ok = Math.abs(diff) <= TOLERANCE;
  if (!ok) failed = true;
  console.log(
    `${t.label.padEnd(10, "　")} ${String(n).padStart(7)}  ${actual.toFixed(2).padStart(6)}%  ` +
    `${String(t.designedRate).padStart(4)}%  ${(diff >= 0 ? "+" : "") + diff.toFixed(2)}  ` +
    `${ok ? "OK" : "*** NG ***"}`,
  );
}

console.log(`\n=== 帯内の個体分布の偏り ===\n`);
console.log("帯          種類  期待値    最小    最大    最大乖離  判定");
for (const t of TIERS) {
  if (t.size === 0) continue;
  const counts = perIndex[t.tier];
  const expected = tally[t.tier] / t.size;
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  // 期待値からの最大乖離率。個体数が少ないので 15% を目安にする
  const dev = Math.max(
    Math.abs(min - expected) / expected,
    Math.abs(max - expected) / expected,
  ) * 100;
  const ok = dev <= 15;
  if (!ok) failed = true;
  console.log(
    `${t.label.padEnd(10, "　")} ${String(t.size).padStart(4)}  ` +
    `${expected.toFixed(0).padStart(6)}  ${String(min).padStart(6)}  ${String(max).padStart(6)}  ` +
    `${dev.toFixed(1).padStart(7)}%  ${ok ? "OK" : "*** NG ***"}`,
  );
}

// 参考値：本作の実プレイでの体感を数字で確認する
const mythRate = tally.MYTH / SAMPLES;
const p20 = (1 - Math.pow(1 - mythRate, 20)) * 100;
console.log(`\n=== 参考 ===`);
console.log(`1周で20回乱打したとき、神話級を一度でも引く確率： ${p20.toFixed(1)}%`);
console.log(`（設計書 3.4.1 の想定は約46%）\n`);

if (failed) {
  console.error("検証に失敗しました。resolver.ts の帯境界を調整してください。");
  process.exit(1);
}
console.log("すべて設計値の範囲内です。ハッシュ関数を凍結してよい状態です。\n");
