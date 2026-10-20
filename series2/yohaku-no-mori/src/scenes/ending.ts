import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import type { Player } from "../game/player.ts";
import { saveProgress } from "../game/save.ts";
import { authoredCount, fragmentCount, type Resolution } from "../ending/resolve.ts";

/** 1秒あたりの表示文字数 */
const TYPE_SPEED = 26;
/** 行と行のあいだの間 */
const LINE_PAUSE = 0.35;

/**
 * エンディング（設計書 6.3 / 6.4）。
 *
 * 専用エンディングは手書き。断章は「書き換わった世界の断片」。
 * どちらも背景は「夜明けの書庫」1枚を使い回す（Phase 7 まではグラデーション）。
 */
export class EndingScene implements Scene {
  private readonly lines: string[];
  private readonly title: string;
  private readonly authored: boolean;

  private t = 0;
  private shown = 0;      // 完全に表示し終えた行数
  private revealed = 0;   // 現在行の表示文字数
  private pause = 0;
  private done = false;

  constructor(
    result: Resolution,
    private readonly player: Player,
    private readonly onExit: () => void,
  ) {
    if (result.kind === "authored") {
      this.lines = result.ending.lines;
      this.title = result.ending.title;
      this.authored = true;
      player.seenEndings.add(result.key);
    } else {
      this.lines = result.lines;
      this.title = "断章";
      this.authored = false;
      player.seenFragments.add(result.index);
    }
    saveProgress(player);
  }

  private get currentLine(): string {
    return this.lines[this.shown] ?? "";
  }

  update(dt: number, keys: string[]): void {
    this.t += dt;

    for (const key of keys) {
      if (key !== "Enter" && key !== " ") continue;
      if (!this.done) {
        // 全文を即座に出す
        this.shown = this.lines.length;
        this.revealed = 0;
        this.done = true;
      } else {
        this.onExit();
        return;
      }
    }

    if (this.done) return;

    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    this.revealed += dt * TYPE_SPEED;
    if (this.revealed >= this.currentLine.length) {
      this.shown++;
      this.revealed = 0;
      this.pause = this.currentLine.length === 0 ? 0.15 : LINE_PAUSE;
      if (this.shown >= this.lines.length) this.done = true;
    }
  }

  render(d: Display): void {
    d.clear("#0b0908");

    // 夜明けの空。上ほど明るい（Phase 7 で1枚絵に差し替える）
    for (let i = 0; i < 40; i++) {
      const a = 1 - i / 40;
      d.ctx.globalAlpha = a * 0.14;
      d.rect(0, i * 2, SCREEN_W, 2, "#c8792f");
    }
    d.ctx.globalAlpha = 1;

    const x = 52;
    const y0 = 30;
    // 行数が多いエンディングでも、下のタイトル行に食い込まないよう行間を詰める
    const room = SCREEN_H - 54 - y0;
    const lh = Math.max(11, Math.min(15, Math.floor(room / Math.max(1, this.lines.length))));

    for (let i = 0; i <= this.shown && i < this.lines.length; i++) {
      const full = this.lines[i] ?? "";
      const text = i < this.shown ? full : full.slice(0, Math.floor(this.revealed));
      d.text(text, x, y0 + i * lh, PAL.ink);
    }

    if (this.done) {
      const blink = Math.floor(this.t * 2) % 2 === 0;
      d.rect(x, SCREEN_H - 44, SCREEN_W - x * 2, 1, PAL.line);
      d.text(this.title, x, SCREEN_H - 36, this.authored ? PAL.accent : PAL.dim);
      d.textRight(
        `専用 ${this.player.seenEndings.size}/${authoredCount()}　` +
        `断章 ${this.player.seenFragments.size}/${fragmentCount()}`,
        SCREEN_W - x, SCREEN_H - 36, PAL.hint,
      );
      if (blink) d.textRight("ENTER", SCREEN_W - x, SCREEN_H - 20, PAL.dim);
    }
  }
}
