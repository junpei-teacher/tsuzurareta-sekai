import rawCh1 from "../../data/dialogue/ch1.json";
import rawCh2 from "../../data/dialogue/ch2.json";
import rawCh3 from "../../data/dialogue/ch3.json";
import type { ImageMap } from "../core/assets.ts";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { windowBox } from "./hud.ts";

export type Speaker = {
  name: string;
  color: string;
  talks: string[][];
  /**
   * 部屋ごとの「見つけたときの様子」。会話の頭に1行入る。
   * **部屋あたり複数書ける。** 話しかけるたびに順に変わる。
   * 1つしか無いと、16回の会話で同じ一行を16回読むことになり、
   * 「彼女を探して話しかける作業」に見えてしまう。
   */
  found?: Record<string, string[]>;
  /**
   * この会話で呪文帳に書き加わる言葉。`talk` は何番目の会話か。
   * 巻物を拾わせるのではなく、**人から教わる**形にするために使う。
   */
  grants?: { talk: number; id: number; word: string }[];
  /** 立ち絵のアセットキーの末尾。`portrait.<これ>` を引く。無ければ地の文扱い */
  portrait?: string;
  /** この人物が現れる章。省略したら全章 */
  chapters?: number[];
  /**
   * フィールドの立ち姿のアセットキー。省略したら会話IDをそのまま使う。
   * 兵士のように、場面ごとに会話IDが違っても絵は同じ、という場合に指定する
   */
  sprite?: string;
  /** 最後の会話を閉じたら、この敵と戦いが始まる（ボス用） */
  battleAfter?: string;
};

type Table = Record<string, Speaker>;
const strip = (o: unknown): Table =>
  Object.fromEntries(Object.entries(o as Table).filter(([k]) => !k.startsWith("_")));

/**
 * 章ごとの会話表。
 *
 * **第1章と第2章は同じマップを使う**（設計書 2.8）。同じ張り紙、同じ机を
 * 調べても、燃えたあとでは書いてあるものが違う。
 * そこで、まず今の章の表を引き、無ければ第1章の表に落とす。
 * 差分だけ書けばよいので、ch2.json には「変わったものだけ」置く。
 */
const BY_CHAPTER: Record<number, Table> = {
  1: strip(rawCh1),
  2: strip(rawCh2),
  3: strip(rawCh3),
};
const BASE = BY_CHAPTER[1]!;

export function speaker(id: string, chapter = 1): Speaker | undefined {
  const s = BY_CHAPTER[chapter]?.[id] ?? BASE[id];
  return s && Array.isArray(s.talks) ? s : undefined;
}

const LINES_PER_PAGE = 3;
/** 立ち絵の一辺（デザイン単位）。素材は倍の128pxで作る */
const PORTRAIT = 64;
/** 1秒あたりの表示文字数 */
const TYPE_SPEED = 42;

/**
 * 会話ウィンドウ。3行ずつ、1文字ずつ出す。
 * Enterで送り、表示途中なら全文を即座に出す。
 */
export class DialogueBox {
  active = false;
  private pages: string[][] = [];
  private page = 0;
  private revealed = 0;
  private name = "";
  private color: string = PAL.ink;
  private caret = 0;
  private portrait: string | undefined;

  open(sp: Speaker, talk: string[]): void {
    this.pages = [];
    for (let i = 0; i < talk.length; i += LINES_PER_PAGE) {
      this.pages.push(talk.slice(i, i + LINES_PER_PAGE));
    }
    this.page = 0;
    this.revealed = 0;
    this.name = sp.name;
    this.color = sp.color;
    this.portrait = sp.portrait;
    this.active = this.pages.length > 0;
  }

  private get pageLength(): number {
    return (this.pages[this.page] ?? []).reduce((n, l) => n + l.length, 0);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.caret += dt;
    this.revealed = Math.min(this.pageLength, this.revealed + dt * TYPE_SPEED);
  }

  /** Enterで呼ぶ。@returns 会話が終わったら true */
  advance(): boolean {
    if (!this.active) return true;
    if (this.revealed < this.pageLength) {
      this.revealed = this.pageLength; // 途中なら全文表示
      return false;
    }
    this.page++;
    this.revealed = 0;
    if (this.page >= this.pages.length) {
      this.active = false;
      return true;
    }
    return false;
  }

  /**
   * @param images 立ち絵を引くため。地の文しか出さない場面では省略してよい
   */
  render(d: Display, images?: ImageMap): void {
    if (!this.active) return;
    // 枠の位置は話者の有無で動かさない。喋る／地の文で窓が跳ねると読みにくい
    const x = 16, y = 182, w = SCREEN_W - 32, h = 76;
    windowBox(d, x, y, w, h);

    const face = this.portrait ? images?.[`portrait.${this.portrait}`] : undefined;
    // 立ち絵があるぶんだけ本文を右へ寄せる
    const textX = face ? x + PORTRAIT + 18 : x + 14;

    if (face) {
      const fx = x + 7, fy = y + 6;
      d.rect(fx, fy, PORTRAIT, PORTRAIT, PAL.bg);
      d.spriteFoot(face, fx + PORTRAIT / 2, fy + PORTRAIT);
      d.frame(fx, fy, PORTRAIT, PORTRAIT, PAL.line);
    }

    if (this.name) {
      const nw = Math.ceil(d.measure(this.name)) + 12;
      d.rect(x + 10, y - 7, nw, 15, PAL.panel);
      d.frame(x + 10, y - 7, nw, 15, PAL.line);
      d.text(this.name, x + 16, y - 5, this.color);
    }

    // 文字数を行にまたいで割り当てる
    let budget = Math.floor(this.revealed);
    const lines = this.pages[this.page] ?? [];
    lines.forEach((line, i) => {
      const shown = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      d.text(shown, textX, y + 12 + i * 16, PAL.ink);
    });

    if (this.revealed >= this.pageLength) {
      const blink = Math.floor(this.caret * 3) % 2 === 0;
      if (blink) d.text("▼", x + w - 18, y + h - 18, PAL.accent);
    }
  }
}
