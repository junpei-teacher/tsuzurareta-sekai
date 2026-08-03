import type { StatusKind } from "../spell/book.ts";

export type StatusInst = { kind: StatusKind; turns: number; magnitude?: number };

/**
 * レベルごとのHP/MP（設計書 4.5）。
 * レベルは物語進行で自動的に上がる。経験値稼ぎは存在しない。
 *
 * **MPは意図的に多い。**
 *
 * かつては「MPが実質の命」で、章のMP消費が9割前後になるよう詰めてあった。
 * ところがそれだと、**思いついた言葉を試す余裕が消える。**
 * 打つ前に「これは外れるかもしれない」と勘定してしまい、
 * 呪文帳に載っている言葉しか打たなくなる。
 * それはこのゲームの中心にある遊び——**知らない言葉を打ってみること**——を殺す。
 *
 * だからMPは元の約3倍にした。緊張はMPではなく、
 * **ターンの取り合い**（回復に1手使えば、そのぶん殴られる）に残してある。
 */
export const LEVELS: ReadonlyArray<{ hp: number; mp: number }> = [
  { hp:   0, mp:   0 }, // Lv0（未使用）
  { hp:  30, mp:  90 }, // Lv1  開始
  { hp:  37, mp: 100 },
  { hp:  45, mp: 112 }, // Lv3  第1章終了
  { hp:  54, mp: 124 },
  { hp:  63, mp: 136 },
  { hp:  72, mp: 146 },
  { hp:  80, mp: 156 }, // Lv7  第2章終了
  { hp:  92, mp: 168 },
  { hp: 104, mp: 180 },
  { hp: 116, mp: 192 },
  { hp: 123, mp: 200 },
  { hp: 130, mp: 210 }, // Lv12 第3章終盤
];

/** 道具1つで戻るMP。MPの総量を3倍にしたので、こちらも同じ倍率で上げる */
export const ITEM_MP = { ink: 30, drop: 90 } as const;

export const ITEM_NAME = { ink: "インク壺", drop: "魔力の雫" } as const;

export type ItemKind = keyof typeof ITEM_MP;

export class Player {
  /** Phase 5 で起動時にプレイヤーが入力する。それまでの仮置き */
  name = "APPRENTICE";
  level = 1;
  hp = LEVELS[1]!.hp;
  mp = LEVELS[1]!.mp;
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

  /** 到達した専用エンディングのキー。周回を跨いで残る */
  seenEndings = new Set<string>();
  /** 見た断章の番号。周回を跨いで残る */
  seenFragments = new Set<number>();

  items: Record<ItemKind, number> = { ink: 3, drop: 1 };

  get maxHp(): number {
    return LEVELS[Math.min(this.level, LEVELS.length - 1)]!.hp;
  }
  get maxMp(): number {
    return LEVELS[Math.min(this.level, LEVELS.length - 1)]!.mp;
  }

  setLevel(lv: number): void {
    this.level = Math.max(1, Math.min(lv, LEVELS.length - 1));
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
}
