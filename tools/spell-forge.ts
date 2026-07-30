/**
 * 手順書 2-2 — 呪文名の逆引き。
 *
 *   npm run forge
 *
 * ハッシュ関数は凍結されているので、「FALGRIM に炎の効果を割り当てる」ことはできない。
 * そこで順序を逆にする：
 *   発音しやすい文字列を大量に生成 → 全部ハッシュ → 狙った呪文IDに当たったものを集める。
 *
 * 出力は tools/candidates.md。
 * origin が scroll / taught の呪文（＝ゲーム内に文字列が登場するもの）についてのみ、
 * 打鍵しやすさ順に候補を並べる。あとは人間が響きで選ぶ。
 *
 * 生成は決定論的（種を固定）なので、何度実行しても同じ候補が出る。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resolveSpell } from "../src/spell/resolver.ts";
import { makeRng } from "../src/fx/easing.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// ── 呪文表を読む ──────────────────────────────

type Spell = {
  id: number;
  tier: string;
  index: number;
  origin: "scroll" | "taught" | "discovery";
  name: string;
  canonical: string;
  element: string;
  target: string;
  power: number;
  mp: number;
  flavor: string;
  note?: string;
};

const book = JSON.parse(readFileSync(join(ROOT, "data/spells.json"), "utf8")) as {
  spells: Spell[];
};
const needName = book.spells.filter((s) => s.origin !== "discovery");

// ── 確定済み canonical の検証 ───────────────────
// 選んだ文字列が本当に狙った呪文に当たるかを毎回確かめる。
// ハッシュも帯境界も凍結済みなので、ここがズレたら人為ミスしかありえない。

const decided = needName.filter((s) => s.canonical.length > 0);
const mismatches: string[] = [];

for (const s of decided) {
  const res = resolveSpell(s.canonical);
  if (res.spellId !== s.id) {
    mismatches.push(
      `  id ${s.id} 「${s.name}」 canonical "${s.canonical}" → ` +
      `${res.label} #${res.index}（spellId ${res.spellId}）／ r=${res.r}`,
    );
  }
}

if (decided.length > 0) {
  console.log(`\n=== canonical の検証（${decided.length} 件）===\n`);
  if (mismatches.length > 0) {
    console.error("*** 不一致がありました ***");
    for (const m of mismatches) console.error(m);
    console.error("\ndata/spells.json の canonical を修正してください。");
    process.exit(1);
  }
  for (const s of decided) {
    const res = resolveSpell(s.canonical);
    console.log(
      `  OK  id ${String(s.id).padStart(2)} ${s.name.padEnd(6, "　")} ` +
      `${s.canonical.padEnd(9)} → ${res.label} #${res.index}  (r=${String(res.r).padStart(4)})`,
    );
  }
}

// ── 呪文表の概況 ───────────────────────────────

const ELEMENTS = ["FIRE", "ICE", "BOLT", "NAME", "HEAL", "NONE"] as const;
const TIERS_IN_BOOK = ["COMMON", "UNCOMMON", "RARE", "MYTH"] as const;

console.log(`\n=== 呪文表の概況（全 ${book.spells.length} 種）===\n`);
console.log("帯          " + ELEMENTS.map((e) => e.padStart(5)).join(" ") + "   巻物/口伝");
for (const t of TIERS_IN_BOOK) {
  const group = book.spells.filter((s) => s.tier === t);
  const cells = ELEMENTS.map(
    (e) => String(group.filter((s) => s.element === e).length).padStart(5),
  ).join(" ");
  const named = group.filter((s) => s.origin !== "discovery").length;
  console.log(`${t.padEnd(11)} ${cells}   ${named}/${group.length}`);
}

const stillOpen = needName.filter((s) => s.canonical.length === 0);
if (stillOpen.length === 0) {
  console.log(`\n命名は全 ${needName.length} 種で完了しています。候補リストの再生成は不要です。\n`);
  process.exit(0);
}

// ── 発音しやすい文字列を作る ────────────────────

const ONSETS = [
  "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "Z",
  "BR", "CR", "DR", "FL", "FR", "GL", "GR", "KR", "PL", "PR", "SH", "SK", "SL", "ST",
  "TH", "TR", "VR", "ZH",
];
const VOWELS = ["A", "E", "I", "O", "U", "A", "E", "I", "O", "AE", "IA", "OU"];
// 空文字を多めに入れて、開音節（母音終わり）も出やすくする
const CODAS = ["", "", "", "", "L", "M", "N", "R", "S", "X", "K", "TH", "RN", "ST"];

/** 明らかに避けたい綴り */
const BLOCK = [
  "FUCK", "SHIT", "COCK", "DICK", "PISS", "RAPE", "NAZI", "KILL", "SEX",
  "SHINE", "SHIN", "BAKA", "AHO", "KUSO", "CHIN", "MANK",
];

function isBad(w: string): boolean {
  if (BLOCK.some((b) => w.includes(b))) return true;
  // 同じ文字が3つ続く
  if (/(.)\1\1/.test(w)) return true;
  // 子音が4つ以上続く
  if (/[BCDFGHJKLMNPQRSTVWXZ]{4}/.test(w)) return true;
  return false;
}

const rng = makeRng(0x5EED1234); // 種を固定して再現性を確保
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;

function makeWord(): string {
  const syllables = rng() < 0.45 ? 2 : 3;
  let w = "";
  for (let i = 0; i < syllables; i++) {
    w += pick(ONSETS) + pick(VOWELS);
    // 語末は閉音節になりやすくする
    if (i === syllables - 1 ? rng() < 0.6 : rng() < 0.22) w += pick(CODAS);
  }
  return w;
}

// ── 打鍵しやすさの評価 ──────────────────────────

const LEFT = new Set("QWERTASDFGZXCVB");
const RIGHT = new Set("YUIOPHJKLNM");
const VOWEL_SET = new Set("AEIOU");

/**
 * 0..1 のスコア。高いほど打ちやすい。
 * 左右交互に打てること、同じ文字が連続しないこと、母音比率が適度なことを見る。
 */
function typability(w: string): number {
  if (w.length < 2) return 0;

  let alternations = 0;
  let repeats = 0;
  let sameHandRun = 1;
  let worstRun = 1;

  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    if (a === b) repeats++;
    const aL = LEFT.has(a);
    const bL = LEFT.has(b);
    const aR = RIGHT.has(a);
    const bR = RIGHT.has(b);
    if ((aL && bR) || (aR && bL)) {
      alternations++;
      sameHandRun = 1;
    } else {
      sameHandRun++;
      worstRun = Math.max(worstRun, sameHandRun);
    }
  }

  const altRate = alternations / (w.length - 1);
  const vowels = [...w].filter((c) => VOWEL_SET.has(c)).length;
  const vowelRate = vowels / w.length;

  let score = 0;
  score += altRate * 0.50;                               // 左右交互
  score += Math.max(0, 1 - repeats * 0.5) * 0.15;        // 連続同字なし
  score += Math.max(0, 1 - (worstRun - 3) * 0.25) * 0.15; // 片手の長い連打なし
  score += Math.max(0, 1 - Math.abs(vowelRate - 0.4) * 3) * 0.10; // 母音比率
  score += (w.length >= 5 && w.length <= 7 ? 1 : 0.4) * 0.10;     // 長さ
  return score;
}

// ── 生成して仕分ける ───────────────────────────

const TARGET_POOL = 400_000;
const PER_SPELL = 40;

const seen = new Set<string>();
const buckets = new Map<number, Array<{ w: string; score: number }>>();
for (const s of stillOpen) buckets.set(s.id, []);

let generated = 0;
for (let i = 0; i < TARGET_POOL; i++) {
  const w = makeWord();
  if (w.length < 4 || w.length > 8) continue;
  if (isBad(w)) continue;
  if (seen.has(w)) continue;
  seen.add(w);
  generated++;

  const res = resolveSpell(w);
  if (res.spellId < 0) continue;
  const bucket = buckets.get(res.spellId);
  if (!bucket) continue;
  bucket.push({ w, score: typability(w) });
}

// ── 出力 ──────────────────────────────────────

const lines: string[] = [];
lines.push("# 呪文名の候補リスト");
lines.push("");
lines.push("`npm run forge` の出力。**このファイルは自動生成される。直接編集しない。**");
lines.push("");
lines.push(`ユニークな生成語 **${generated.toLocaleString()}** 件から、`);
lines.push("ゲーム内に文字列が登場する呪文（origin が scroll / taught）について、");
lines.push("**打鍵しやすさ順**に上位40件を並べた。");
lines.push("");
lines.push("## 選び方（手順書 2-3）");
lines.push("");
lines.push("- **4〜8文字。** 長いと戦闘中に打つのが苦痛になる");
lines.push("- **打鍵しやすい。** 上に並んでいるものほど左右交互に打てる");
lines.push("- **属性の印象と音が合う。** 炎なら破裂音、癒しなら流音、など");
lines.push("");
lines.push("選んだら `data/spells.json` の `canonical` に書き込む。");
lines.push("**この選択は以降ずっと変えられない。** プレイヤーが何十回も打ち、");
lines.push("最後まで覚えている文字列になる。");
lines.push("");
lines.push("---");
lines.push("");

const TIER_ORDER = ["COMMON", "UNCOMMON", "RARE", "MYTH"];
for (const tier of TIER_ORDER) {
  const group = stillOpen.filter((s) => s.tier === tier);
  if (group.length === 0) continue;
  lines.push(`## ${tier}`);
  lines.push("");
  for (const s of group) {
    const bucket = (buckets.get(s.id) ?? []).sort((a, b) => b.score - a.score);
    const top = bucket.slice(0, PER_SPELL);

    lines.push(`### id ${s.id} — 「${s.name}」 ／ ${s.origin === "taught" ? "口伝" : "巻物"}`);
    lines.push("");
    lines.push(`> ${s.flavor}`);
    lines.push("");
    lines.push(
      `属性 **${s.element}** ／ 対象 ${s.target} ／ 威力 ${s.power} ／ MP ${s.mp}` +
      (s.note ? `　（${s.note}）` : ""),
    );
    lines.push("");
    lines.push(`候補 ${bucket.length} 件中の上位 ${top.length} 件：`);
    lines.push("");
    for (let i = 0; i < top.length; i += 5) {
      lines.push("- " + top.slice(i, i + 5).map((c) => `\`${c.w}\``).join("　"));
    }
    lines.push("");
  }
}

writeFileSync(join(ROOT, "tools/candidates.md"), lines.join("\n"), "utf8");

console.log(`生成: ${generated.toLocaleString()} 語（ユニーク）`);
console.log(`未命名の呪文: ${stillOpen.length} 種`);
for (const s of stillOpen) {
  console.log(`  id ${String(s.id).padStart(2)} ${s.name.padEnd(6, "　")} 候補 ${(buckets.get(s.id) ?? []).length} 件`);
}
console.log(`\n→ tools/candidates.md に書き出しました。`);
