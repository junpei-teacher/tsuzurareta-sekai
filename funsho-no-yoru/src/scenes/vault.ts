import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";

const SLOTS = 3;
const MAX_LEN = 12;

/**
 * 禁書（設計書 6.1）。
 *
 * 最下層。開かれた本。白紙の頁と、羽根ペン。
 * そして戦闘中とまったく同じ入力欄が出る。
 *
 * **ヒントも候補も制限時間もない。**
 * ゲームは、プレイヤーが何かを打ち込むまで永遠に待つ。
 *
 * 空欄のまま ENTER を押せる。それが最も重い選択になる。
 */
export class VaultScene implements Scene {
  private slots: string[] = ["", "", ""];
  private cursor = 0;
  private t = 0;
  /** 入場時の暗転から明けるまで */
  private fade = 1;

  constructor(private readonly onWrite: (words: string[]) => void) {}

  update(dt: number, keys: string[]): void {
    this.t += dt;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 0.9);

    for (const key of keys) {
      if (key === "Enter") {
        // 暗転が明けきるまでは確定させない。
        // 直前の画面から Enter を押しっぱなしにしていた場合に、
        // 空欄のまま「本を閉じる」へ飛んでしまうのを防ぐ
        if (this.fade > 0.05) continue;
        // 本を閉じる音。**ここが最後の音になる**
        sfx.play("page");
        this.onWrite([...this.slots]);
        return;
      }
      if (key === "Tab" || key === "ArrowRight") {
        this.cursor = (this.cursor + 1) % SLOTS;
        sfx.play("move");
        continue;
      }
      if (key === "ArrowLeft") {
        this.cursor = (this.cursor + SLOTS - 1) % SLOTS;
        sfx.play("move");
        continue;
      }
      if (key === "Backspace") {
        const cur = this.slots[this.cursor] ?? "";
        if (cur.length > 0) {
          this.slots[this.cursor] = cur.slice(0, -1);
          sfx.play("erase");
        } else if (this.cursor > 0) {
          this.cursor--;
          sfx.play("move");
        }
        continue;
      }
      if (key.length === 1 && /[A-Z0-9]/.test(key)) {
        const cur = this.slots[this.cursor] ?? "";
        if (cur.length < MAX_LEN) {
          this.slots[this.cursor] = cur + key;
          sfx.play("type");
        }
        continue;
      }
    }
  }

  render(d: Display): void {
    d.clear("#0a0806");

    // 台の上の本。ゆっくり明滅する
    const glow = 0.5 + 0.2 * Math.sin(this.t * 1.4);
    d.ctx.globalAlpha = glow * 0.28;
    d.rect(150, 44, 180, 60, "#c8912f");
    d.ctx.globalAlpha = 1;

    d.rect(160, 52, 160, 44, "#241d16");
    d.rect(164, 56, 74, 36, "#d8cfb4");
    d.rect(242, 56, 74, 36, "#d8cfb4");
    d.rect(238, 52, 4, 44, "#3a2f22");

    // 羽根ペン
    d.rect(300, 40, 2, 18, "#e8dcc0");
    d.rect(299, 56, 4, 4, "#8a7a58");

    const line = "禁書のページに、羽根ペンを走らせる。";
    d.text(line, Math.round((SCREEN_W - d.measure(line)) / 2), 122, PAL.dim);

    // ── 3つの書き込み欄 ────────────────────
    const slotW = 118;
    const gap = 12;
    const totalW = slotW * SLOTS + gap * (SLOTS - 1);
    const x0 = Math.round((SCREEN_W - totalW) / 2);
    const y = 150;

    for (let i = 0; i < SLOTS; i++) {
      const x = x0 + i * (slotW + gap);
      const active = i === this.cursor;
      d.rect(x, y, slotW, 26, "#161210");
      d.frame(x, y, slotW, 26, active ? PAL.accent : PAL.line);
      // 記入線
      d.rect(x + 6, y + 21, slotW - 12, 1, active ? "#5a4b32" : "#2e2720");

      const text = this.slots[i] ?? "";
      const caret = active && Math.floor(this.t * 2) % 2 === 0 ? "_" : "";
      d.text(text + caret, x + 8, y + 6, PAL.ink);
    }

    d.textRight("TAB 欄を移る", x0 + totalW, y + 34, PAL.hint);
    d.text("ENTER 書き終える", x0, y + 34, PAL.hint);

    // 暗転から明ける
    if (this.fade > 0) {
      d.ctx.globalAlpha = this.fade;
      d.rect(0, 0, SCREEN_W, SCREEN_H, "#000000");
      d.ctx.globalAlpha = 1;
    }
  }
}
