import type { StatusKind } from "../spell/book.ts";

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

/**
 * **レベルは廃止した。**
 *
 * かつては章の進行に合わせてレベルが上がり、威力が `1 + Lv × 0.09` 倍された。
 * だが通しプレイでの結論は「レベルが上がって嬉しい瞬間が無い」だった。
 * 当然で、**このゲームで強くなる手段は言葉を知ることだけ**（設計書 1）であり、
 * レベルはそこに何も足していない。数字が増える演出があるだけ、
 * かえって「打って強い呪文を掘り当てる」ことの重みを薄めていた。
 *
 * いま威力を決めるのは**どの呪文を当てたか**だけである。
 * 体力だけは章ごとに一段ずつ上がる（`src/field/state.ts` の CHAPTERS）。
 */

/** 道具1つで戻るMP。MPの総量を3倍にしたので、こちらも同じ倍率で上げる */
export const ITEM_MP = { ink: 30, drop: 90 } as const;

export const ITEM_NAME = { ink: "インク壺", drop: "魔力の雫" } as const;

export type ItemKind = keyof typeof ITEM_MP;

export class Player {
  /** Phase 5 で起動時にプレイヤーが入力する。それまでの仮置き */
  name = "APPRENTICE";
  hp = 30;
  mp = 90;
  /** 章ごとの上限。`setBody` でしか動かない */
  maxHp = 30;
  maxMp = 90;
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

  /**
   * 章の体力を設定する。上げ幅は章の切れ目でしか起きない。
   * **戦闘に勝っても何も増えない。** 増えるのは呪文帳だけである。
   */
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
