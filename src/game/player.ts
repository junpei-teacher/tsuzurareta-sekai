import type { StatusKind } from "../spell/book.ts";

export type StatusInst = { kind: StatusKind; turns: number; magnitude?: number };

/**
 * レベルごとのHP/MP（設計書 4.5）。
 * レベルは物語進行で自動的に上がる。経験値稼ぎは存在しない。
 */
export const LEVELS: ReadonlyArray<{ hp: number; mp: number }> = [
  { hp:   0, mp:  0 }, // Lv0（未使用）
  { hp:  30, mp: 30 }, // Lv1  開始
  { hp:  37, mp: 34 },
  { hp:  45, mp: 38 }, // Lv3  第1章終了
  { hp:  54, mp: 42 },
  { hp:  63, mp: 46 },
  { hp:  72, mp: 49 },
  { hp:  80, mp: 52 }, // Lv7  第2章終了
  { hp:  92, mp: 56 },
  { hp: 104, mp: 60 },
  { hp: 116, mp: 64 },
  { hp: 123, mp: 67 },
  { hp: 130, mp: 70 }, // Lv12 第3章終盤
];

export class Player {
  /** Phase 5 で起動時にプレイヤーが入力する。それまでの仮置き */
  name = "APPRENTICE";
  level = 1;
  hp = 30;
  mp = 30;
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

  items = { ink: 3, drop: 1 };

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

  /** サジェストの辞書。呪文帳に載っている文字列 */
  knownWords(): string[] {
    return [...this.grimoire.values()];
  }
}
