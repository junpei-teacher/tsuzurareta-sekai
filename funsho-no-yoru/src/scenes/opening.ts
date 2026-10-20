import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";

/**
 * オープニング（設計書 2.1）。
 *
 * この作品の前提——**国が言葉を管理していること**、**主人公は読むことを
 * 許されていないこと**、**地下にもっと厳重な本があること**——は、
 * どれも第1章の中では説明されない。日常として当たり前に扱われるからである。
 *
 * それを先に一度だけ置く。エンディングと同じ「暗い画面に文字が浮かぶ」形にして、
 * 終わりと始まりが同じ表情になるようにしてある。
 */

/** 1ページの見せ方。浮かぶ → 保つ → 消える */
const FADE_IN = 0.7;
const FADE_OUT = 0.7;
/** 1文字あたりの追加の間。長い頁ほど長く出す */
const HOLD_PER_CHAR = 0.075;
const HOLD_MIN = 1.4;
/**
 * 全ての頁に足す間。
 *
 * 読み終わる速さで送っていたので、**文と文のあいだに何も無かった。**
 * ここは世界の前提を一度だけ置く場所で、急いで通す意味がない。
 * 読み終えてから、もう一拍おいてから消える。
 */
const HOLD_EXTRA = 2.0;

const PAGES: string[][] = [
  [
    "ここは、国が魔法と名前を管理する世界。",
    "力のある言葉は、すべて王立書庫に集められた。",
  ],
  [
    "あなたはその書庫の、写字見習い。",
    "英知が記された本の、いちばん端で働いている。",
  ],
  [
    "読むことは許されない。",
    "題名を書き写し、記録を取る。それだけが仕事だ。",
  ],
  [
    "地下には、さらに厳重に管理された本があるという。",
    "見た者はいない。見た、と言う者もいない。",
  ],
  [
    "今日も、いつもと同じ夜になるはずだった。",
  ],
];

function holdOf(page: string[]): number {
  const chars = page.reduce((n, l) => n + l.length, 0);
  return HOLD_EXTRA + Math.max(HOLD_MIN, chars * HOLD_PER_CHAR);
}

export class OpeningScene implements Scene {
  private page = 0;
  private t = 0;

  constructor(private readonly onDone: () => void) {}

  private get span(): number {
    return FADE_IN + holdOf(PAGES[this.page] ?? []) + FADE_OUT;
  }

  update(dt: number, keys: string[]): void {
    this.t += dt;

    for (const key of keys) {
      if (key !== "Enter" && key !== " " && key !== "Escape") continue;
      // ESC は丸ごと飛ばす。2周目に4回読ませない
      if (key === "Escape") { this.onDone(); return; }
      this.next();
      return;
    }

    if (this.t >= this.span) this.next();
  }

  private next(): void {
    this.page++;
    this.t = 0;
    if (this.page >= PAGES.length) this.onDone();
  }

  render(d: Display): void {
    d.clear("#0b0908");

    const lines = PAGES[this.page];
    if (!lines) return;

    // 浮かんで、保って、消える
    const hold = holdOf(lines);
    const a =
      this.t < FADE_IN ? this.t / FADE_IN
      : this.t < FADE_IN + hold ? 1
      : Math.max(0, 1 - (this.t - FADE_IN - hold) / FADE_OUT);

    const y0 = Math.round(SCREEN_H / 2 - (lines.length * 20) / 2);
    d.ctx.globalAlpha = a;
    lines.forEach((line, i) => {
      const w = d.measure(line, 12);
      d.text(line, Math.round((SCREEN_W - w) / 2), y0 + i * 20, PAL.ink);
    });
    d.ctx.globalAlpha = 1;

    // 進み具合。読み飛ばしていいことが分かるように、操作も出しておく
    const dots = PAGES.length;
    const dx = Math.round(SCREEN_W / 2 - (dots * 8) / 2);
    for (let i = 0; i < dots; i++) {
      d.rect(dx + i * 8, SCREEN_H - 40, 4, 1, i <= this.page ? PAL.accent : PAL.line);
    }
    d.textRight("ENTER 次へ　ESC とばす", SCREEN_W - 24, SCREEN_H - 26, PAL.hint);
  }
}
