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
 *   2. **章を抜けたあと、何回ぶん乱打できるMPが残るか**
 *   3. 属性で詰まないか（火が無効な相手しかいないのに火しか無い、など）
 *
 * 2 はかつて「MPが9割減るのが設計値」だった。だがそれだと、
 * **思いついた言葉を試す余裕が無くなる。**
 * 打つ前に勘定してしまい、呪文帳に載っている言葉しか打たなくなる。
 * それはこのゲームの中心を殺す。今は逆に、
 * **余りが乱打 30 回を切っていないか**を見る（不発は MP 3）。
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

const SPELLS: Spell[] = read("data/spells.json").spells;
const ENEMIES: Enemy[] = read("data/enemies.json").enemies;
const byId = (id: number): Spell => SPELLS.find((s) => s.id === id)!;

/** ITEM_MP は **src/game/player.ts から読む。** 書き写すと必ずずれる */
const ITEM_MP = (() => {
  const src = readFileSync(join(ROOT, "src/game/player.ts"), "utf8");
  const m = /ITEM_MP = \{ ink: (\d+), drop: (\d+) \}/.exec(src)!;
  return { ink: +m[1]!, drop: +m[2]! };
})();

/**
 * 体力と補給は **src/field/state.ts の CHAPTERS から読む。**
 * ここに書き写すと必ずずれる（実際、一度ずれかけた）。
 *
 * 呪文と戦闘の並びだけは、ここに書く。
 * 「確実に持っている呪文」はデータからは分からず、
 * 戦闘の順序はマップの歩き方で決まるためである。
 */
const CH_SRC = readFileSync(join(ROOT, "src/field/state.ts"), "utf8");
const SUPPLY = [...CH_SRC.matchAll(
  /hp: (\d+), mp: (\d+), ink: (\d+), drop: (\d+) \}/g,
)].map((m) => ({
  hp: +m[1]!, mp: +m[2]!, ink: +m[3]!, drop: +m[4]!,
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
    // 灰の中の声は階段の関所なので、DIZO(52) は必ず手に入る。
    // 兵士の JAKROS(43) は素通りできるので数えない
    spells: [20, 3, 24, 23, 52],
    battles: ["unnamed", "unnamed", "unnamed", "unnamed", "unnamed", "archdemon", "erased"],
  },
];

const CHAPTERS = PLAN.map((p, i) => ({ n: i + 1, ...SUPPLY[i]!, ...p }));

/** src/battle/model.ts の elementMultiplier と同じ規則。NONE も相性に乗る */
function multiplier(e: Enemy, element: string): number {
  if (element === "HEAL") return 1;
  if (e.immune.includes(element)) return 0;
  if (e.weak.includes(element)) return 2;
  if (e.resist.includes(element)) return 0.5;
  return 1;
}

/** レベルは無い。威力はどの呪文を当てたかだけで決まる（設計書 4.5） */
function damage(sp: Spell, e: Enemy): number {
  const mul = multiplier(e, sp.element);
  if (mul === 0) return 0;
  return Math.max(1, Math.floor(sp.power * mul) - e.def);
}

let bad = 0;

for (const ch of CHAPTERS) {
  console.log(`\n══ 第${ch.n}章 ═══════════════════════════════`);
  const arsenal = ch.spells.map(byId);
  const attacks = arsenal.filter((s) => s.element !== "HEAL");
  // いちばん大きい回復を使う。find だと PROSO(14) を掴んで
  // LEPRU(34) を持っているのに延々と回復し続ける絵になる
  const heal = arsenal
    .filter((s) => s.element === "HEAL")
    .sort((a, b) => b.power - a.power)[0];
  console.log(
    `  確実に持つ呪文  ${arsenal.map((s) => `${s.canonical}(${s.name} MP${s.mp})`).join("　")}`,
  );

  const maxHp = ch.hp;
  let mp = ch.mp;
  let hp = ch.hp;
  let ink = ch.ink;
  let drop = ch.drop;
  let spent = 0;

  for (const id of ch.battles) {
    const e = ENEMIES.find((x) => x.id === id)!;

    // いちばんMP効率の良い攻撃を選ぶ。効かないものは除く
    const usable = attacks
      .map((s) => ({ s, dmg: damage(s, e) }))
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
        hp = Math.min(maxHp, hp + heal.power);
        mp -= heal.mp; used += heal.mp; healed++;
      } else if (mp >= best.s.mp) {
        ehp -= best.dmg; mp -= best.s.mp; used += best.s.mp;
      } else if (ink > 0) {
        ink--; mp = Math.min(ch.mp, mp + ITEM_MP.ink);
      } else if (drop > 0) {
        drop--; mp = Math.min(ch.mp, mp + ITEM_MP.drop);
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

  }

  const supply = ch.mp + ch.ink * ITEM_MP.ink + ch.drop * ITEM_MP.drop;
  const rate = (spent / supply) * 100;
  // 不発は MP 3。余ったぶんを「何回そらで打てるか」に直す
  const spare = Math.floor((supply - spent) / 3);
  console.log(
    `  ── 合計 MP消費 ${spent} / 供給 ${supply}（${rate.toFixed(0)}%）　` +
    `乱打の余地 ${spare} 回　未使用 インク壺${ink} 雫${drop}`,
  );
  if (spare < 30) console.log("     **試し打ちの余裕が無い。** MPか補給を増やす（設計書 5）");
  if (rate > 100) console.log("     足りない。敵のHPを下げるか、補給を増やす");
}

console.log(bad === 0 ? "\n全戦闘を抜けられます。" : `\n**${bad} 戦が抜けられません。**`);
process.exitCode = bad === 0 ? 0 : 1;
