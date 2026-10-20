import rawCh1 from "../../data/dialogue/ch1.json";
import rawCh2 from "../../data/dialogue/ch2.json";
import rawCh3 from "../../data/dialogue/ch3.json";
import type { ImageMap } from "../core/assets.ts";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { sfx } from "../core/sfx.ts";
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
  /**
   * 欠けた綴り。**この場で呪文帳には入らない。**
   *
   * 焼けた紙、虫喰いの反故、擦り切れた煤の字——読めるのは途中までで、
   * 残りはプレイヤーが埋める。埋める場所は戦闘の入力欄しかない。
   *
   * 巻物を拾って「手に入れました」になる経路（`grants`）との違いがすべてで、
   * こちらは**自分で打たないと何も起きない**。このゲームの中心にある行為を、
   * 世界の側から一度だけ指さす仕掛けである。
   *
   * `mask` は見せる形（`H A _ A L`）、`id` は埋まったときの呪文。
   * 控えは呪文帳の末尾に「未解読」として残る（src/ui/grimoire.ts）。
   */
  riddle?: { id: number; mask: string };
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
  /**
   * 会話を閉じたら、この場所へ移る。
   *
   * **扉の絵を出さずに繋ぐための仕掛け。** 書架の裏の隙間のような
   * 「見た目は通り道に見えない場所」は、`!door` にすると扉が生えてしまう。
   * 調べる点（`!sign`）として置き、読み終えたところで潜らせる。
   */
  leadsTo?: {
    map: string; x: number; y: number;
    /**
     * 着いたときの向き。
     *
     * **省略すると、くぐった穴を向いたまま出る。**
     * そこで Enter を押すと、そのまま来た道を戻ってしまう。
     * 出た先で部屋のほうを向かせること。
     */
    facing?: "up" | "down" | "left" | "right";
  };
  /**
   * 部屋に入った瞬間、**全ての台詞を続けて出してから** `battleAfter` に入る。
   *
   * 話しかけて初めて始まる相手は、脇を通り抜けられる。
   * 禁書の台の前に立つ者がそれでは困る。**戦わずに台へ着いてしまう。**
   * この旗を立てた相手は、部屋に入った時点でもう始まっている。
   */
  onEnter?: boolean;
  /** `battleAfter` に勝ったときに渡すもの。負ければ渡さない */
  reward?: Reward;
};

/**
 * 戦って勝ったときに渡すもの。
 *
 * 呪文は原則「人から教わる」が、**勝ち取る**経路もここで一本だけ通す。
 * 話しかけて貰うのと違い、こちらは**倒さないと手に入らない**ので、
 * レア・神話級のような「終盤の切り札」を置く場所として都合がいい。
 */
export type Reward = { id: number; word: string; lines: string[] };

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

/**
 * いま世界のどこかに置いてある、欠けた綴りの呪文ID。
 *
 * **控えは周回を跨いで残る**（設計書 3.8）ので、置く紙を差し替えると、
 * 古いセーブに「どこにも無い紙の写し」が未解読のまま居座る。
 * 読み込みのときに、ここに無いものを落とす（`src/game/save.ts`）。
 */
export function activeRiddleIds(): Set<number> {
  const out = new Set<number>();
  for (const table of Object.values(BY_CHAPTER)) {
    for (const sp of Object.values(table)) {
      if (sp.riddle) out.add(sp.riddle.id);
    }
  }
  return out;
}

export function speaker(id: string, chapter = 1): Speaker | undefined {
  const s = BY_CHAPTER[chapter]?.[id] ?? BASE[id];
  return s && Array.isArray(s.talks) ? s : undefined;
}

/**
 * 会話文の中に置くプレイヤー名の差し込み口。
 *
 * **主人公の名は、世界の中に書かれていなければ意味がない。**
 * 目録の署名欄も当番表も、ミラの「あなたの名前も、もう百回は書いた」も、
 * 全部その名が実際に紙に載っていることを前提にした文である。
 * 会話データ側には `{NAME}` と書いておき、開くときに差し替える。
 */
let playerName = "";

export function setDialogueName(name: string): void {
  playerName = name;
}

export function fillName(line: string): string {
  return playerName ? line.split("{NAME}").join(playerName) : line;
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
    const lines = talk.map(fillName);
    this.pages = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
      this.pages.push(lines.slice(i, i + LINES_PER_PAGE));
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
      // 送るのではなく「急かした」ので、頁の音ではなく小さい音にする
      sfx.play("move");
      return false;
    }
    sfx.play("page");
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
      // 人が喋っている窓では、鉤括弧の無い行は地の文として一段落とす。
      // 「階段に腰かけていた」のような描写と、本人の声を、同じ色で流さない
      const narration = this.portrait !== undefined && !line.startsWith("「");
      d.textRich(shown, textX, y + 12 + i * 16, narration ? PAL.dim : PAL.ink, PAL.accent, 12, line);
    });

    if (this.revealed >= this.pageLength) {
      const blink = Math.floor(this.caret * 3) % 2 === 0;
      if (blink) d.text("▼", x + w - 18, y + h - 18, PAL.accent);
    }
  }
}
