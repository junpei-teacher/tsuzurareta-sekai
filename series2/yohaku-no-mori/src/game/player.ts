import type { StatusKind } from "../spell/book.ts";
import { validWeaponId, weaponById, type WeaponDef } from "./weapons.ts";

export type StatusInst = { kind: StatusKind; turns: number; magnitude?: number };

/**
 * 欠けた綴りの控え（設計書 3.8）。
 *
 * `mask` は見せる形（`H A _ A L`）、`place` は見つけた部屋の名。
 * **場所を一緒に控えるのは、戦闘中に開いたときのためである。**
 * 綴りだけ並んでいても、何を見て書いたものか思い出せない。
 */
export type Riddle = { mask: string; place: string };

/** 控えの見せ形から、照合用の型（`HA_AL`）を作る。`_` が読めなかった一字 */
export function riddlePattern(mask: string): string {
  return mask.replace(/\s+/g, "");
}

/**
 * 打ちかけの文字列が、まだこの控えに収まる可能性があるか。
 *
 * 前方一致だが、`_` はどの字とも合う。**合致しなくなった控えは引っ込める**ので、
 * 打つほど手元の候補が絞れていく。
 */
export function riddleMatches(mask: string, typed: string): boolean {
  const pat = riddlePattern(mask);
  if (typed.length > pat.length) return false;
  for (let i = 0; i < typed.length; i++) {
    if (pat[i] !== "_" && pat[i] !== typed[i]) return false;
  }
  return true;
}

export type LevelDef = {
  level: number;
  requiredXp: number;
  maxHp: number;
  maxMp: number;
  attack: number;
};

/** シリーズ2の短い固定戦ルート用。稼ぎを要求せず、Lv5で止まる。 */
export const LEVELS: readonly LevelDef[] = [
  { level: 1, requiredXp: 0, maxHp: 30, maxMp: 90, attack: 0 },
  { level: 2, requiredXp: 30, maxHp: 36, maxMp: 96, attack: 3 },
  { level: 3, requiredXp: 75, maxHp: 43, maxMp: 104, attack: 6 },
  { level: 4, requiredXp: 130, maxHp: 51, maxMp: 114, attack: 9 },
  { level: 5, requiredXp: 210, maxHp: 60, maxMp: 126, attack: 12 },
] as const;

export type LevelUpNotice = {
  level: number;
  hpGain: number;
  mpGain: number;
  attackGain: number;
};

function levelDef(level: number): LevelDef {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.floor(level) - 1))]!;
}

function levelForXp(xp: number): LevelDef {
  let result = LEVELS[0]!;
  for (const candidate of LEVELS) {
    if (candidate.requiredXp > xp) break;
    result = candidate;
  }
  return result;
}

/** 道具1つで戻るMP。MPの総量を3倍にしたので、こちらも同じ倍率で上げる */
export const ITEM_MP = { ink: 30, drop: 90 } as const;

export const ITEM_NAME = { ink: "インク壺", drop: "魔力の雫" } as const;

export type ItemKind = keyof typeof ITEM_MP;

export class Player {
  /** Phase 5 で起動時にプレイヤーが入力する。それまでの仮置き */
  name = "APPRENTICE";
  hp = 30;
  mp = 90;
  /** シリーズ1では章、シリーズ2ではレベルアップでも動く上限。 */
  maxHp = 30;
  maxMp = 90;
  level = 1;
  xp = 0;
  ownedWeapons = new Set<string>();
  equippedWeaponId: string | null = null;
  statuses: StatusInst[] = [];

  /**
   * 呪文帳。spellId → その呪文を呼び出す文字列。
   *
   * discovery の呪文は canonical を持たないので、
   * **プレイヤーが実際に打った文字列**が記録される。
   * 同じ呪文でも人によって違う言葉が載る——「真の名は一つではない」。
   */
  grimoire = new Map<number, string>();

  /** 引き当てたがMPが足りず唱えられなかった呪文（設計書 3.6） */
  unspoken = new Set<number>();

  /**
   * 見つけた欠けた綴り。spellId → 控え。
   *
   * **控えを持たせないと、この仕掛けは成立しない。**
   * 紙片を見つけるのは書庫のどこかで、打つのは戦闘の入力欄である。
   * あいだに部屋の移動と戦闘の開始が挟まるので、
   * 手元に控えが無ければプレイヤーは紙とペンを要求されることになる。
   * 主人公の仕事は書き写すことなので、控えは呪文帳の末尾に載る。
   *
   * 埋まったものは呪文帳の本体へ移る。ここからは消さない（表示側で除く）。
   */
  riddles = new Map<number, Riddle>();

  /** 到達した専用エンディングのキー。周回を跨いで残る */
  seenEndings = new Set<string>();
  /** 見た断章の番号。周回を跨いで残る */
  seenFragments = new Set<number>();

  items: Record<ItemKind, number> = { ink: 3, drop: 1 };

  get equippedWeapon(): WeaponDef | null {
    return weaponById(this.equippedWeaponId);
  }

  get levelAttack(): number {
    return levelDef(this.level).attack;
  }

  get weaponAttack(): number {
    return this.equippedWeapon?.attack ?? 0;
  }

  get attack(): number {
    return this.levelAttack + this.weaponAttack;
  }

  /** 攻撃呪文だけへ掛ける。回復・補助・物語上の正解語には掛けない。 */
  get attackMultiplier(): number {
    return 1 + this.attack / 100;
  }

  get nextLevel(): LevelDef | null {
    return LEVELS[this.level] ?? null;
  }

  get xpToNext(): number | null {
    const next = this.nextLevel;
    return next ? Math.max(0, next.requiredXp - this.xp) : null;
  }

  /** セーブ復元・デバッグ開始用。XPを正としてレベルを再計算する。 */
  setProgression(xp: number, weapons: Iterable<string> = [], equipped: string | null = null): void {
    const cap = LEVELS[LEVELS.length - 1]!.requiredXp;
    this.xp = Math.max(0, Math.min(cap, Math.floor(xp)));
    this.level = levelForXp(this.xp).level;
    this.ownedWeapons = new Set([...weapons].filter(validWeaponId));
    this.equippedWeaponId = equipped && this.ownedWeapons.has(equipped) && validWeaponId(equipped)
      ? equipped
      : null;
  }

  /** 固定戦の初回勝利でだけ呼ぶ。レベルアップ時は増えた最大値ぶん現在値も伸ばす。 */
  gainXp(amount: number): LevelUpNotice[] {
    const gained = Math.max(0, Math.floor(amount));
    const cap = LEVELS[LEVELS.length - 1]!.requiredXp;
    this.xp = Math.min(cap, this.xp + gained);
    const notices: LevelUpNotice[] = [];
    while (this.level < LEVELS.length && this.xp >= levelDef(this.level + 1).requiredXp) {
      const before = levelDef(this.level);
      const after = levelDef(this.level + 1);
      this.level = after.level;
      const hpGain = after.maxHp - before.maxHp;
      const mpGain = after.maxMp - before.maxMp;
      this.maxHp += hpGain;
      this.maxMp += mpGain;
      this.hp = Math.min(this.maxHp, this.hp + hpGain);
      this.mp = Math.min(this.maxMp, this.mp + mpGain);
      notices.push({
        level: after.level,
        hpGain,
        mpGain,
        attackGain: after.attack - before.attack,
      });
    }
    return notices;
  }

  /** 入手時に自動装備する。シリーズ2は選択UIを増やさない一枠構成。 */
  acquireWeapon(id: string): WeaponDef | null {
    const weapon = weaponById(id);
    if (!weapon) return null;
    this.ownedWeapons.add(id);
    this.equippedWeaponId = id;
    return weapon;
  }

  /** シリーズ1互換の章体力設定。シリーズ2の成長は`gainXp`を使う。 */
  setBody(hp: number, mp: number): void {
    this.maxHp = hp;
    this.maxMp = mp;
    this.hp = Math.min(this.hp, hp);
    this.mp = Math.min(this.mp, mp);
  }

  /** 章の切れ目で全回復（設計書 5章） */
  restore(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.statuses = [];
  }

  /**
   * 道具を使う。戦闘でもフィールドでも**同じこれを呼ぶ**。
   *
   * 戦闘の中でしか飲めないと、次の部屋へ向かう前に整える、という
   * ごく当たり前の手が打てない。ここに置いて両方から使う。
   *
   * @returns 実際に回復したMP。持っていなければ -1
   */
  useItem(kind: ItemKind): number {
    if (this.items[kind] <= 0) return -1;
    this.items[kind]--;
    const before = this.mp;
    this.mp = Math.min(this.maxMp, this.mp + ITEM_MP[kind]);
    return this.mp - before;
  }

  /** サジェストの辞書。呪文帳に載っている文字列 */
  knownWords(): string[] {
    return [...this.grimoire.values()];
  }

  /**
   * まだ埋まっていない控え（設計書 3.8）。
   * 埋まったものは呪文帳の本体に移っているので、ここから落とす。
   */
  openRiddles(): Riddle[] {
    return [...this.riddles.entries()]
      .filter(([id]) => !this.grimoire.has(id))
      .map(([, r]) => r);
  }
}
