import { PAL } from "./palette.ts";

// 設計書 7.2 — 内部解像度 480x270、整数倍スケール

export const SCREEN_W = 480;
export const SCREEN_H = 270;

/** 日本語ドットフォント。Phase 0-5 で PixelMplus12 を入れるまでは等幅で代用する */
const FONT_STACK = "'PixelMplus12', 'MS Gothic', monospace";

export class Display {
  readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2Dコンテキストを取得できませんでした");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = "top";

    this.fitToWindow();
    window.addEventListener("resize", () => this.fitToWindow());
  }

  /**
   * ウィンドウに収まる最大の整数倍でCSS拡大する。
   * ウィンドウが内部解像度より小さい場合だけ、はみ出しを避けるため
   * 例外的に等倍未満（非整数）へ縮小する。
   */
  private fitToWindow(): void {
    const raw = Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    this.canvas.style.width = `${SCREEN_W * scale}px`;
    this.canvas.style.height = `${SCREEN_H * scale}px`;
  }

  clear(color: string = PAL.bg): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  /** 1px の枠線 */
  frame(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x, y, w, 1, color);
    this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color);
    this.rect(x + w - 1, y, 1, h, color);
  }

  text(str: string, x: number, y: number, color: string = PAL.ink, size = 12): void {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(str, x | 0, y | 0);
  }

  /** 右端を x に揃えて描く */
  textRight(str: string, x: number, y: number, color: string = PAL.ink, size = 12): void {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    const w = this.ctx.measureText(str).width;
    this.ctx.fillStyle = color;
    this.ctx.fillText(str, (x - w) | 0, y | 0);
  }

  measure(str: string, size = 12): number {
    this.ctx.font = `${size}px ${FONT_STACK}`;
    return this.ctx.measureText(str).width;
  }
}
