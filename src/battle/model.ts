import rawEnemies from "../../data/enemies.json";
import { spellFor, type Element, type Spell, type StatusKind } from "../spell/book.ts";
import { resolveSpell, type Resolution } from "../spell/resolver.ts";
import type { ItemKind, Player, StatusInst } from "../game/player.ts";

// ── 敵 ────────────────────────────────────────

export type EnemyDef = {
  id: string;
  name: string;
  chapter: number;
  boss?: boolean;
  hp: number;
  atk: number;
  def: number;
  weak: Element[];
  resist: Element[];
  immune: Element[];
  tags: string[];
  sprite: { w: number; h: number; color: string };
  /** 自ら光る敵だけが持つ。dy は足元から光源までの高さ（デザイン単位）*/
  glow?: { color: string; radius: number; strength: number; dy: number };
  desc: string;
  /**
   * 稽古台。**MPを消費せず、倒れず、攻撃してこない。**
   *
   * この作品で強くなる手段は言葉を知ることだけだが（設計書 1）、
   * 知らない言葉を試すにはMPが要る。周回はせいぜい2回なので、
   * **57種のうち大半に一度も出会わないまま終わる。**
   * 出会う場所を1つ、第1章に置いた。ここで撃ったものも呪文帳に載る。
   */
  dummy?: boolean;
  /**
   * その敵の技。`turns` を省くと3ターン。
   *
   * **長さを敵ごとに変えられるようにしてある。**
   * 忘却（呪文帳を封じる）を地下の雑魚にも持たせたが、
   * 1戦2ターンで終わる相手が3ターン封じてくると、封じられたまま次の戦いに入る。
   * 前振りとして置くものなので、あちらは短くする。
   */
  skill?: { name: string; kind: StatusKind; chance: number; turns?: number };
};

export const ENEMIES = (rawEnemies as unknown as { enemies: EnemyDef[] }).enemies;

export type EnemyInst = {
  def: EnemyDef;
  hp: number;
  maxHp: number;
  statuses: StatusInst[];
};

export function spawn(def: EnemyDef): EnemyInst {
  return { def, hp: def.hp, maxHp: def.hp, statuses: [] };
}

// ── 状態異常のヘルパ ─────────────────────────────

type HasStatuses = { statuses: StatusInst[] };

function findStatus(t: HasStatuses, kind: StatusKind): StatusInst | undefined {
  return t.statuses.find((s) => s.kind === kind);
}
function has(t: HasStatuses, kind: StatusKind): boolean {
  return findStatus(t, kind) !== undefined;
}
function addStatus(t: HasStatuses, kind: StatusKind, turns: number, magnitude?: number): void {
  const cur = findStatus(t, kind);
  if (cur) {
    cur.turns = Math.max(cur.turns, turns);
    if (magnitude !== undefined) cur.magnitude = Math.max(cur.magnitude ?? 0, magnitude);
  } else {
    t.statuses.push({ kind, turns, magnitude });
  }
}
function consume(t: HasStatuses, kind: StatusKind): StatusInst | undefined {
  const i = t.statuses.findIndex((s) => s.kind === kind);
  if (i < 0) return undefined;
  return t.statuses.splice(i, 1)[0];
}
function tick(t: HasStatuses): void {
  for (const s of t.statuses) s.turns--;
  t.statuses = t.statuses.filter((s) => s.turns > 0);
}

// ── 属性倍率（設計書 4.4）────────────────────────

/**
 * **威力はレベルで伸びない**（設計書 4.5）。
 *
 * かつては `1 + level × 0.09` を掛けていた。レベルを廃止したので、
 * 威力を決めるのは**どの呪文を当てたか**だけになった。
 * 同じ ROZHA は最初から最後まで 24 を出す。
 * 強くなりたければ、より強い言葉を掘り当てるしかない。
 *
 * **敵のHPを触ったら必ず `npm run balance` を回すこと。**
 */

/** 継続ダメージ。レベルが無いので固定値 */
const BURN_ENEMY = 10;
const BURN_SELF = 5;

/**
 * 属性倍率。
 *
 * **NONE も相性判定に乗せる。**
 * 白紙（QOTHREN, power 55）のような無属性の大技は、
 * 相性で止められないぶん、序盤に引き当てると他の全てを腐らせる。
 * 「無属性だから誰にでも等しく効く」を通すと、**弱点を探す遊びが消える。**
 * 書庫の生き物と焚書隊は NONE に耐性を持つ（data/enemies.json）。
 *
 * HEAL だけは敵に撃つものではないので、相性の外に置く。
 */
export function elementMultiplier(e: Element, enemy: EnemyInst): number {
  if (e === "HEAL") return 1;
  if (enemy.def.immune.includes(e)) return 0;
  if (enemy.def.weak.includes(e)) return 2;
  if (enemy.def.resist.includes(e)) return 0.5;
  return 1;
}

// ── 戦闘 ──────────────────────────────────────

export type Phase =
  | "COMMAND" | "CASTING" | "ITEM" | "GRIMOIRE" | "MESSAGE"
  | "WIN" | "LOSE" | "FLED";

export type CastReport = {
  /**
   * DUD=不発 / CAST=発動 / LOCKED=MP不足で唱えられなかった /
   * REFUSED=既知だがMP不足 / SHORT=短すぎて言葉になっていない
   */
  kind: "DUD" | "CAST" | "LOCKED" | "REFUSED" | "SHORT";
  word: string;
  resolution: Resolution;
  spell?: Spell;
  /** その呪文を初めて発動したか（演出の長短に使う） */
  firstTime: boolean;
};

export class Battle {
  readonly player: Player;
  readonly enemy: EnemyInst;

  phase: Phase = "COMMAND";
  /** 表示待ちのメッセージ。Enterで1件ずつ消費する */
  messages: string[] = [];
  /** メッセージを消化しきったあとに進む先 */
  private after: "COMMAND" | "ENEMY" | "END" = "COMMAND";

  /** 直前の詠唱。演出の再生に使う */
  lastCast: CastReport | null = null;
  /** やまびこ（id 37）が継承する属性 */
  private lastElement: Element = "NONE";

  constructor(player: Player, enemy: EnemyInst) {
    this.player = player;
    this.enemy = enemy;
    this.say(`${enemy.def.name} が あらわれた。`);
    this.after = "COMMAND";
  }

  private say(...lines: string[]): void {
    this.messages.push(...lines);
    this.phase = "MESSAGE";
  }

  /**
   * 記憶を封じられているか（抹消された名前の者の「忘却」）。
   * このあいだは**呪文帳が開けず、サジェストも出ない**（設計書 4.3.1）。
   * 手元の記憶だけで打つしかなくなる。
   */
  get memorySealed(): boolean {
    return has(this.player, "SILENCE");
  }

  /** 敵の弱点が見えているか（開眼） */
  get revealed(): boolean {
    return has(this.player, "REVEAL");
  }

  // ── プレイヤーの行動 ────────────────────────

  cast(input: string): CastReport {
    const res = resolveSpell(input);
    const spell = spellFor(input);

    // ── 短すぎる。言葉になっていない ──
    //
    // **MPも手番も取らない。** これは失敗ではなく、詠唱が始まってすらいない。
    // 一字で強い呪文に当たってしまう穴を塞ぐための線引きなので（resolver.ts）、
    // 打ち間違えた人を罰する場所ではない。
    if (res.tooShort) {
      this.lastCast = { kind: "SHORT", word: res.word, resolution: res, firstTime: false };
      this.say("それは、まだ言葉になっていない。");
      this.after = "COMMAND";
      return this.lastCast;
    }

    // ── 不発 ──
    if (!spell) {
      const cost = Math.min(3, this.player.mp);
      this.player.mp -= cost;
      this.lastCast = { kind: "DUD", word: res.word, resolution: res, firstTime: false };
      this.say("その呪文は、存在しなかった。", `（MP ${cost} を失った）`);
      this.after = "ENEMY";
      return this.lastCast;
    }

    const known = this.player.grimoire.has(spell.id);
    const halved = has(this.player, "MP_HALF");
    // 稽古台には墨を使わない。**試すことに値段を付けない**
    const cost = this.enemy.def.dummy ? 0 : halved ? Math.ceil(spell.mp / 2) : spell.mp;

    // ── MPが足りない ──
    if (cost > this.player.mp) {
      if (known) {
        // 既知呪文は撃たせない。ターンも消費しない（全能感を損なわない）
        this.lastCast = { kind: "REFUSED", word: res.word, resolution: res, spell, firstTime: false };
        this.say(`${spell.name} を唱えるには MP ${cost} が要る。`);
        this.after = "COMMAND";
        return this.lastCast;
      }
      // 未知の言葉を掘り当てたが、届かない（設計書 3.6）
      this.player.grimoire.set(spell.id, res.word);
      this.player.unspoken.add(spell.id);
      this.lastCast = { kind: "LOCKED", word: res.word, resolution: res, spell, firstTime: true };
      this.say(
        `——${res.word}。`,
        "舌がその形を覚えた瞬間、指先から力が抜けた。",
        "知っている。だが、まだ届かない。",
        `［呪文帳に記録：${res.word} ／ 未詠唱］`,
      );
      this.after = "ENEMY";
      return this.lastCast;
    }

    // ── 発動 ──
    const firstTime = !known || this.player.unspoken.has(spell.id);
    this.player.mp -= cost;
    if (halved) consume(this.player, "MP_HALF");
    if (!known) this.player.grimoire.set(spell.id, res.word);
    this.player.unspoken.delete(spell.id);

    this.lastCast = { kind: "CAST", word: res.word, resolution: res, spell, firstTime };
    if (!known) this.say(`${res.word} ——`, `${spell.name}。`);
    else this.say(`${spell.name}。`);

    this.applySpell(spell);

    // **掘り当てたことを、必ず言う。**
    //
    // 人から教わったときも、MP不足で届かなかったときも記録の一行が出るのに、
    // 自分で打ち当てたときだけ黙っていた。**このゲームで唯一積み上がるのが
    // 呪文帳**なので、そこに何か増えたことを黙っているのはいちばんまずい。
    if (firstTime) {
      this.say(
        known
          ? `（「${spell.name}」の未詠唱が外れた）`
          : `（呪文帳に「${spell.name}」を書き加えた）`,
      );
    }

    if (this.enemy.hp <= 0) {
      this.say(`${this.enemy.def.name} は 消えた。`);
      this.after = "END";
      this.phase = "MESSAGE";
    } else {
      this.after = "ENEMY";
    }
    return this.lastCast;
  }

  private applySpell(sp: Spell): void {
    // 白紙：敵の状態をすべて洗い流してから撃つ
    if (sp.id === 47 && this.enemy.statuses.length > 0) {
      this.enemy.statuses = [];
      this.say("書かれていたことが、消えた。");
    }

    if (sp.element === "HEAL" || sp.target === "SELF") {
      this.applySelfSpell(sp);
    } else {
      this.applyOffensive(sp);
    }

    if (sp.element !== "HEAL" && sp.element !== "NONE") this.lastElement = sp.element;
  }

  private applySelfSpell(sp: Spell): void {
    if (sp.element === "HEAL") {
      // 完全な一冊：全回復＋全解除
      if (sp.id === 55) {
        this.player.hp = this.player.maxHp;
        this.player.statuses = [];
        this.say("欠けた頁は、一枚もない。", "（すべて元に戻った）");
        return;
      }
      const heal = sp.power;
      const before = this.player.hp;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.say(`HP が ${this.player.hp - before} 回復した。`);
    }

    if (sp.status) {
      if (sp.status.kind === "CLEANSE") {
        this.player.statuses = [];
        this.say("澱みが、消えた。");
      } else {
        addStatus(this.player, sp.status.kind, sp.status.turns, sp.status.magnitude);
        this.say(this.statusLine(sp.status.kind, true));
      }
    }
  }

  private applyOffensive(sp: Spell): void {
    const mul = elementMultiplier(sp.element, this.enemy);
    if (mul === 0) {
      this.say(`${this.enemy.def.name} には 通じない。`);
      return;
    }

    let power = sp.power;

    // やまびこ：直前に唱えた属性を継承する
    const element = sp.id === 37 ? this.lastElement : sp.element;
    const useMul = sp.id === 37 ? elementMultiplier(element, this.enemy) : mul;

    // 裂け目：敵の残HPが少ないほど鋭い
    if (sp.id === 39) power = Math.floor(power * (1 + (1 - this.enemy.hp / this.enemy.maxHp) * 0.8));
    // 仕返し：失ったHPに比例
    if (sp.id === 48) power = Math.floor(power * (1 + (1 - this.player.hp / this.player.maxHp) * 1.0));
    // 虫封じ：虫に特効
    let special = 1;
    if (sp.id === 6 && this.enemy.def.tags.includes("INSECT")) special = 2.5;

    // 先読み・加筆による強化
    const boost = findStatus(this.player, "POWER_UP");
    const boostMul = boost ? 1 + (boost.magnitude ?? 0) / 100 : 1;
    if (boost && boost.turns <= 1) consume(this.player, "POWER_UP");

    const defDown = findStatus(this.enemy, "DEF_DOWN");
    const effDef = Math.floor(this.enemy.def.def * (1 - (defDown?.magnitude ?? 0) / 100));

    const base = power * useMul * special * boostMul;
    const dmg = Math.max(1, Math.floor(base) - effDef);

    // 稽古台は倒れない。数字だけ出す
    const floor = this.enemy.def.dummy ? 1 : 0;
    this.enemy.hp = Math.max(floor, this.enemy.hp - dmg);

    if (useMul >= 2) this.say(`弱点を突いた！　${dmg} のダメージ。`);
    else if (useMul <= 0.5) this.say(`効果はいまひとつだ。　${dmg} のダメージ。`);
    else this.say(`${dmg} のダメージ。`);

    if (sp.status && this.enemy.hp > 0) {
      addStatus(this.enemy, sp.status.kind, sp.status.turns, sp.status.magnitude);
      this.say(this.statusLine(sp.status.kind, false));
    }
  }

  private statusLine(kind: StatusKind, onSelf: boolean): string {
    const who = onSelf ? "" : `${this.enemy.def.name} は `;
    switch (kind) {
      case "BURN":     return `${who}燃えている。`;
      case "FREEZE":   return `${who}凍りついた。`;
      case "SLOW":     return `${who}鈍くなった。`;
      case "SILENCE":  return `${who}言葉を失った。`;
      case "DEF_DOWN": return `${who}輪郭が あいまいになった。`;
      case "ACC_DOWN": return `${who}視界を 奪われた。`;
      case "POWER_UP": return "次の言葉に、力がこもる。";
      case "MP_HALF":  return "次の一語は、墨を食わない。";
      case "SHIELD":   return "影が、身代わりに立った。";
      case "GUARD":    return "誰にも届かない場所に、身を置いた。";
      case "REVEAL":   return "それが何であるか、わかった。";
      case "FLEE_UP":  return "逃げ道が、見えた。";
      case "CLEANSE":  return "澱みが、消えた。";
    }
  }

  useItem(kind: ItemKind): void {
    const healed = this.player.useItem(kind);
    if (healed < 0) {
      this.say("持っていない。");
      this.after = "COMMAND";
      return;
    }
    this.say(
      kind === "ink" ? "インク壺を 空けた。" : "魔力の雫を 飲んだ。",
      `MP が ${healed} 回復した。`,
    );
    this.after = "ENEMY";
  }

  flee(): void {
    // 稽古台からはいつでも離れられる。ここで足止めする理由が無い
    if (this.enemy.def.dummy) {
      this.say("人形から、離れた。");
      this.after = "END";
      this.phase = "MESSAGE";
      this.fled = true;
      return;
    }
    // ボスからは逃げられない。
    // 禁書庫は一本道で、戻る扉が無い。逃げられてしまうと、
    // **倒していないラスボスと同じ部屋に取り残される。**
    if (this.enemy.def.boss) {
      this.say("背を向けられなかった。");
      this.after = "ENEMY";
      return;
    }
    const sure = has(this.player, "FLEE_UP");
    if (sure || Math.random() < 0.5) {
      consume(this.player, "FLEE_UP");
      this.say("背を向けて、走った。");
      this.after = "END";
      this.phase = "MESSAGE";
      this.fled = true;
      return;
    }
    this.say("回り込まれた。");
    this.after = "ENEMY";
  }

  private fled = false;

  // ── 敵の行動 ──────────────────────────────

  private enemyTurn(): void {
    const e = this.enemy;

    // 稽古台は撃ち返してこない。**ここは戦いではなく、練習である**
    if (e.def.dummy) {
      this.say("人形は、黙って立っている。");
      this.endRound();
      return;
    }

    if (has(e, "FREEZE")) {
      this.say(`${e.def.name} は 動けない。`);
      this.endRound();
      return;
    }
    if (has(e, "SLOW") && Math.random() < 0.5) {
      this.say(`${e.def.name} は 出遅れた。`);
      this.endRound();
      return;
    }

    const skill = e.def.skill;
    const canSkill = skill && !has(e, "SILENCE") && Math.random() < skill.chance;

    if (canSkill && skill) {
      this.say(`${e.def.name} の ${skill.name}。`);
      addStatus(this.player, skill.kind, skill.turns ?? 3, skill.kind === "DEF_DOWN" ? 30 : undefined);
      this.say(
        skill.kind === "SILENCE"
          ? "覚えていたはずの綴りが、思い出せない。"
          : this.statusLine(skill.kind, true),
      );
      this.endRound();
      return;
    }

    if (has(e, "ACC_DOWN") && Math.random() < 0.35) {
      this.say(`${e.def.name} の こうげきは 外れた。`);
      this.endRound();
      return;
    }

    let dmg = Math.max(1, e.def.atk + Math.floor(Math.random() * 4) - 1);
    if (consume(this.player, "SHIELD")) {
      this.say(`${e.def.name} の こうげき。`, "影が、代わりに裂けた。");
      this.endRound();
      return;
    }
    if (has(this.player, "GUARD")) dmg = Math.max(1, Math.floor(dmg * 0.5));

    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.say(`${e.def.name} の こうげき。`, `${dmg} のダメージ。`);
    this.endRound();
  }

  /** ラウンド終了処理。継続ダメージと状態異常の経過 */
  private endRound(): void {
    const burnEnemy = findStatus(this.enemy, "BURN");
    if (burnEnemy && this.enemy.hp > 0) {
      const d = BURN_ENEMY;
      this.enemy.hp = Math.max(0, this.enemy.hp - d);
      this.say(`${this.enemy.def.name} は 燃えている。　${d} のダメージ。`);
    }
    const burnSelf = findStatus(this.player, "BURN");
    if (burnSelf && this.player.hp > 0) {
      const d = BURN_SELF;
      this.player.hp = Math.max(0, this.player.hp - d);
      this.say(`灰が燻っている。　${d} のダメージ。`);
    }

    tick(this.enemy);
    tick(this.player);

    if (this.player.hp <= 0) {
      this.say("目の前が、白くなった。");
      this.after = "END";
    } else if (this.enemy.hp <= 0) {
      this.say(`${this.enemy.def.name} は 消えた。`);
      this.after = "END";
    } else {
      this.after = "COMMAND";
    }
  }

  // ── メッセージ送り ─────────────────────────

  /** ウィンドウに一度に出せる行数 */
  static readonly PAGE = 3;

  /** Enterで呼ぶ。1ページぶん消化し、尽きたら次のフェーズへ */
  advance(): void {
    for (let i = 0; i < Battle.PAGE && this.messages.length > 0; i++) this.messages.shift();
    if (this.messages.length > 0) return;

    switch (this.after) {
      case "ENEMY":
        this.enemyTurn();
        // enemyTurn がメッセージを積んでいるはず
        if (this.messages.length === 0) this.resolveEnd();
        else this.phase = "MESSAGE";
        break;
      case "END":
        this.resolveEnd();
        break;
      case "COMMAND":
        this.phase = "COMMAND";
        break;
    }
  }

  private resolveEnd(): void {
    if (this.fled) this.phase = "FLED";
    else if (this.player.hp <= 0) this.phase = "LOSE";
    else if (this.enemy.hp <= 0) this.phase = "WIN";
    else { this.phase = "COMMAND"; return; }

    // 戦いが終わったら状態異常は持ち越さない。
    // **「忘却」を残すと、以後ずっと呪文帳が開けなくなる。**
    // 記憶を封じるのは、その一戦を素手で戦わせるための技であって、
    // 罰ではない。
    this.player.statuses = [];
  }
}
