import rawCh1 from "../../data/dialogue/ch1.json";
import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import { windowBox } from "./hud.ts";

export type Speaker = { name: string; color: string; talks: string[][] };

const TABLE = rawCh1 as unknown as Record<string, Speaker>;

export function speaker(id: string): Speaker | undefined {
  const s = TABLE[id];
  return s && Array.isArray(s.talks) ? s : undefined;
}

const LINES_PER_PAGE = 3;
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

  open(sp: Speaker, talk: string[]): void {
    this.pages = [];
    for (let i = 0; i < talk.length; i += LINES_PER_PAGE) {
      this.pages.push(talk.slice(i, i + LINES_PER_PAGE));
    }
    this.page = 0;
    this.revealed = 0;
    this.name = sp.name;
    this.color = sp.color;
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

  render(d: Display): void {
    if (!this.active) return;
    const x = 16, y = 190, w = SCREEN_W - 32, h = 68;
    windowBox(d, x, y, w, h);

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
      d.text(shown, x + 14, y + 10 + i * 16, PAL.ink);
    });

    if (this.revealed >= this.pageLength) {
      const blink = Math.floor(this.caret * 3) % 2 === 0;
      if (blink) d.text("▼", x + w - 18, y + h - 18, PAL.accent);
    }
  }
}
