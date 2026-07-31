import type { Display } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Player } from "../game/player.ts";
import { spellById } from "../spell/book.ts";
import { windowBox } from "./hud.ts";

const ROWS = 8;

/**
 * 呪文帳。戦闘中にもセレクト画面にも埋め込める。
 *
 * 記録されるのは spellId → **プレイヤーが実際に打った文字列**。
 * 巻物の呪文は canonical、発掘した呪文は自分が掘り当てた綴りが載る。
 *
 * 「詠唱妨害」を受けているあいだは開けない（設計書 4.3.1）。
 * 手元の記憶だけが頼りになる。
 */
export class GrimoireView {
  private index = 0;
  private scroll = 0;

  reset(): void {
    this.index = 0;
    this.scroll = 0;
  }

  /** @returns 閉じる要求があれば true */
  handle(key: string, player: Player): boolean {
    const n = player.grimoire.size;
    if (key === "ArrowUp") this.index = (this.index + Math.max(1, n) - 1) % Math.max(1, n);
    if (key === "ArrowDown") this.index = (this.index + 1) % Math.max(1, n);
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + ROWS) this.scroll = this.index - ROWS + 1;
    return key === "Escape" || key === "Enter" || key === " ";
  }

  render(d: Display, x: number, y: number, w: number, h: number, player: Player): void {
    windowBox(d, x, y, w, h);

    const ids = [...player.grimoire.keys()].sort((a, b) => a - b);
    d.text(`呪文帳　${ids.length} 種`, x + 12, y + 8, PAL.accent);
    if (player.unspoken.size > 0) {
      d.textRight(`未詠唱 ${player.unspoken.size}`, x + w - 12, y + 8, PAL.danger);
    }

    if (ids.length === 0) {
      d.text("まだ、何も知らない。", x + 12, y + 30, PAL.dim);
      return;
    }

    const view = ids.slice(this.scroll, this.scroll + ROWS);
    view.forEach((id, i) => {
      const sp = spellById(id);
      if (!sp) return;
      const row = this.scroll + i;
      const ry = y + 26 + i * 15;
      const on = row === this.index;
      const unspoken = player.unspoken.has(id);

      if (on) d.rect(x + 8, ry - 2, w - 16, 15, "#2c241f");
      d.text(on ? "▸" : " ", x + 10, ry, PAL.accent);

      const word = player.grimoire.get(id) ?? "";
      d.text(word, x + 24, ry, unspoken ? PAL.dim : PAL.ink);
      d.text(sp.name, x + 108, ry, TIER_COLOR[sp.tier]);
      d.text(sp.element, x + 196, ry, PAL.dim);
      d.textRight(unspoken ? "未詠唱" : `MP${sp.mp}`, x + w - 14, ry, unspoken ? PAL.danger : PAL.dim);
    });

    // スクロール位置
    if (ids.length > ROWS) {
      d.textRight(`${this.index + 1} / ${ids.length}`, x + w - 14, y + h - 30, PAL.line);
    }

    // 選択中の呪文のフレーバー
    const sel = spellById(ids[this.index] ?? -1);
    if (sel) {
      d.rect(x + 8, y + h - 24, w - 16, 1, PAL.line);
      d.text(sel.flavor, x + 12, y + h - 18, PAL.dim);
    }
  }
}
