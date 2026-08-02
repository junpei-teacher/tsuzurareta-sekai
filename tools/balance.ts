/**
 * 戦闘バランスの検査（手順書 8-2）。
 *
 *   npm run balance
 *
 * 全戦闘が手配置なので、1戦ずつ手で調整する（設計書 4.5 / 5）。
 * だが「手で」といっても、**MPが足りるかどうかは計算できる。**
 * 感覚で置いた敵のHPが、実は絶対に倒せない量だった、という事故を防ぐ。
 *
 * 見るもの:
 *   1. 章ごとに、確実に持っている呪文だけで全戦闘を抜けられるか
 *   2. そのときMPがどれだけ残るか（**ちょうど尽きかけるのが設計値**）
 *   3. 属性で詰まないか（火が無効な相手しかいないのに火しか無い、など）
 *
 * ここで言う「確実に持っている呪文」は、
 * **人から教わるか、決まった場所で拾えるものだけ**である。
 * 打って偶然当てた呪文は数えない。運を前提にしたバランスは調整ではない。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string): any => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

type Spell = {
  id: number; name: string; canonical: string; element: string;
  power: number; mp: number; target: string;
};
type Enemy = {
  id: string; name: string; hp: number; atk: number; def: number;
  weak: string[]; resist: string[]; immune: string[]; boss?: boolean;
};

/** src/battle/model.ts の LEVEL_GAIN を読む。二重管理しない */
const LEVEL_GAIN = Number(
  /export const LEVEL_GAIN = ([\d.]+)/.exec(
    readFileSync(join(ROOT, "src/battle/model.ts"), "utf8"),
  )![1],
);

const SPELLS: Spell[] = read("data/spells.json").spells;
const ENEMIES: Enemy[] = read("data/enemies.json").enemies;
const byId = (id: number): Spell => SPELLS.find((s) => s.id === id)!;

// src/game/player.ts の LEVELS と合わせること
const LEVELS = [
  { hp: 0, mp: 0 }, { hp: 30, mp: 30 }, { hp: 37, mp: 34 }, { hp: 45, mp: 38 },
  { hp: 54, mp: 42 }, { hp: 63, mp: 46 }, { hp: 72, mp: 49 }, { hp: 80, mp: 52 },
  { hp: 92, mp: 56 }, { hp: 104, mp: 60 }, { hp: 116, mp: 64 }, { hp: 123, mp: 67 },
  { hp: 130, mp: 70 },
];

/**
 * レベルと補給は **src/field/state.ts の CHAPTERS から読む。**
 * ここに書き写すと必ずずれる（実際、一度ずれかけた）。
 *
 * 呪文と戦闘の並びだけは、ここに書く。
 * 「確実に持っている呪文」はデータからは分からず、
 * 戦闘の順序はマップの歩き方で決まるためである。
 */
const CH_SRC = readFileSync(join(ROOT, "src/field/state.ts"), "utf8");
const SUPPLY = [...CH_SRC.matchAll(
  /\{ level: (\d+), max: (\d+),[^}]*ink: (\d+), drop: (\d+) \}/g,
)].map((m) => ({
  level: +m[1]!, max: +m[2]!, ink: +m[3]!, drop: +m[4]!,
}));

const PLAN = [
  {
    // ミラが ROZHA と PROSO をくれる。石壁の QOTHREN は任意なので数えない
    spells: [20, 3],
    battles: ["bookworm", "bookworm", "inkslime", "bookworm", "bookworm"],
  },
  {
    // 司書長が SLANE を、焼け残った巻物が LEPRU をくれる
    spells: [20, 3, 24, 23],
    battles: ["sootbat", "soldier", "emberfiend", "sootbat", "emberfiend", "ashvoice"],
  },
  {
    spells: [20, 3, 24, 23],
    battles: ["unnamed", "unnamed", "unnamed", "unnamed", "unnamed", "archdemon", "erased"],
  },
];

const CHAPTERS = PLAN.map((p, i) => ({ n: i + 1, ...SUPPLY[i]!, ...p }));

function multiplier(e: Enemy, element: string): number {
  if (element === "NONE" || element === "HEAL") return 1;
  if (e.immune.includes(element)) return 0;
  if (e.weak.includes(element)) return 2;
  if (e.resist.includes(element)) return 0.5;
  return 1;
}

function damage(sp: Spell, e: Enemy, level: number): number {
  const mul = multiplier(e, sp.element);
  if (mul === 0) return 0;
  return Math.max(1, Math.floor(sp.power * (1 + level * LEVEL_GAIN) * mul) - e.def);
}

let bad = 0;

for (const ch of CHAPTERS) {
  console.log(`\n══ 第${ch.n}章 ═══════════════════════════════`);
  const arsenal = ch.spells.map(byId);
  const attacks = arsenal.filter((s) => s.element !== "HEAL");
  const heal = arsenal.find((s) => s.element === "HEAL");
  console.log(
    `  確実に持つ呪文  ${arsenal.map((s) => `${s.canonical}(${s.name} MP${s.mp})`).join("　")}`,
  );

  let level = ch.level;
  let mp = LEVELS[level]!.mp;
  let hp = LEVELS[level]!.hp;
  let ink = ch.ink;
  let drop = ch.drop;
  let spent = 0;

  for (const id of ch.battles) {
    const e = ENEMIES.find((x) => x.id === id)!;
    const maxHp = LEVELS[level]!.hp;

    // いちばんMP効率の良い攻撃を選ぶ。効かないものは除く
    const usable = attacks
      .map((s) => ({ s, dmg: damage(s, e, level) }))
      .filter((x) => x.dmg > 0)
      .sort((a, b) => b.dmg / b.s.mp - a.dmg / a.s.mp);

    if (usable.length === 0) {
      console.log(`  ✕ ${e.name.padEnd(10)} **有効な攻撃が一つも無い**（属性で詰み）`);
      bad++;
      continue;
    }
    const best = usable[0]!;

    let ehp = e.hp;
    let turns = 0;
    let used = 0;
    let healed = 0;
    while (ehp > 0 && turns < 60) {
      // 次の一撃で落ちるなら回復を優先する
      if (heal && hp <= e.atk * 2 && mp >= heal.mp) {
        hp = Math.min(maxHp, hp + Math.floor(heal.power * (1 + level * LEVEL_GAIN)));
        mp -= heal.mp; used += heal.mp; healed++;
      } else if (mp >= best.s.mp) {
        ehp -= best.dmg; mp -= best.s.mp; used += best.s.mp;
      } else if (ink > 0) {
        ink--; mp = Math.min(LEVELS[level]!.mp, mp + 10);
      } else if (drop > 0) {
        drop--; mp = Math.min(LEVELS[level]!.mp, mp + 30);
      } else {
        break; // 手が無い
      }
      turns++;
      if (ehp > 0) hp -= e.atk; // 敵の一撃（平均）
      if (hp <= 0) break;
    }

    spent += used;
    const ok = ehp <= 0 && hp > 0;
    if (!ok) bad++;
    console.log(
      `  ${ok ? "ok" : "✕ "} ${e.name.padEnd(10)} ${best.s.canonical} ${best.dmg}/発　` +
      `${turns}ターン　MP-${used}　残HP ${Math.max(0, hp)}/${maxHp}　残MP ${mp}` +
      `${healed ? `　回復${healed}回` : ""}${ok ? "" : "　**倒せない**"}`,
    );

    if (ok && level < ch.max) { level++; hp = Math.min(hp, LEVELS[level]!.hp); }
  }

  const supply = LEVELS[ch.level]!.mp + ch.ink * 10 + ch.drop * 30;
  const rate = (spent / supply) * 100;
  console.log(
    `  ── 合計 MP消費 ${spent} / 供給 ${supply}（${rate.toFixed(0)}%）　` +
    `未使用 インク壺${ink} 雫${drop}`,
  );
  if (rate < 55) console.log("     余りすぎ。**MPが尽きかける緊張が無い**（設計書 5）");
  if (rate > 100) console.log("     足りない。敵のHPを下げるか、補給を増やす");
}

console.log(bad === 0 ? "\n全戦闘を抜けられます。" : `\n**${bad} 戦が抜けられません。**`);
process.exitCode = bad === 0 ? 0 : 1;
