import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { THEMES } from "../core/theme.ts";
import { renderVillageRoad } from "../fx/storyArt.ts";

/**
 * シリーズ2の入口。世界法則を説明せず、時間と距離だけを置く。
 * 王立書庫の火は遠すぎて見えないため、ここで事件の映像は挟まない。
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
  ["十年前"],
  ["王都から遠く離れた、小さな村。"],
];

function holdOf(page: string[]): number {
  const chars = page.reduce((n, l) => n + l.length, 0);
  return HOLD_EXTRA + Math.max(HOLD_MIN, chars * HOLD_PER_CHAR);
}

export class OpeningScene implements Scene {
  private page = 0;
  private t = 0;

  constructor(
    private readonly onDone: () => void,
    private readonly villageRoadBackground?: HTMLImageElement,
  ) {}

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
    const ctx = d.ctx;
    // 抽象的な森ではなく、これから失われる「同じ村」を最初から置く。
    // 十年後の村道と同じ骨格を暗く見せ、時間だけが飛んだことを後で拾えるようにする。
    renderVillageRoad(d, this.t * 0.22, { background: this.villageRoadBackground });
    ctx.save();
    const veil = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    veil.addColorStop(0, this.page === 0 ? "rgba(8,22,25,0.76)" : "rgba(8,25,27,0.62)");
    veil.addColorStop(0.7, "rgba(11,27,24,0.68)");
    veil.addColorStop(1, "rgba(5,14,13,0.90)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // 遠い村の灯り。王都の事件そのものは映さない。
    ctx.globalAlpha = 0.22 + Math.sin(this.t * 1.4) * 0.035;
    d.rect(43, 125, 13, 2, THEMES.village.glow);
    d.rect(386, 118, 10, 2, PAL.accentCool);
    ctx.restore();

    const lines = PAGES[this.page];
    if (!lines) return;

    // 浮かんで、保って、消える
    const hold = holdOf(lines);
    const a =
      this.t < FADE_IN ? this.t / FADE_IN
      : this.t < FADE_IN + hold ? 1
      : Math.max(0, 1 - (this.t - FADE_IN - hold) / FADE_OUT);

    const size = this.page === 0 ? 22 : 12;
    const y0 = Math.round(SCREEN_H / 2 - (lines.length * (size + 8)) / 2 - 8);
    d.ctx.globalAlpha = a;
    d.ctx.shadowColor = PAL.shadow;
    d.ctx.shadowBlur = 8;
    lines.forEach((line, i) => {
      const w = d.measure(line, size);
      d.text(line, Math.round((SCREEN_W - w) / 2), y0 + i * (size + 8), PAL.ink, size);
    });
    d.ctx.shadowBlur = 0;
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
