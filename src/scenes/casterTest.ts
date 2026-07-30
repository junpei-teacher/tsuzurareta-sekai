import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { Keyboard } from "../core/input.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import { resolveSpell, TIERS, type Resolution, type Tier } from "../spell/resolver.ts";

/**
 * Phase 1 テストベッド（手順書 1-4）。
 * 文字列を打って ENTER を押すと、どの帯の何番が出たかだけを表示する。
 *
 * 完了条件は「100回ほど手打ちして、もう1回打ちたいと思えること」。
 * 思えなければ帯の境界値か演出を調整する。
 */
export class CasterTestScene {
  private readonly kb: Keyboard;
  private history: Resolution[] = [];
  private tally: Record<Tier, number> = {
    DUD: 0, COMMON: 0, UNCOMMON: 0, RARE: 0, MYTH: 0,
  };
  private total = 0;

  private caret = 0;      // カーソル点滅用
  private flash = 0;      // 神話級を引いたときの閃光（1→0）
  private shake = 0;      // 同・揺れ

  constructor(kb: Keyboard) {
    this.kb = kb;
  }

  update(dt: number): void {
    this.caret += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);

    let submitted: string | null;
    while ((submitted = this.kb.takeSubmission()) !== null) {
      if (submitted.trim().length === 0) continue; // 空Enterは無視
      const res = resolveSpell(submitted);
      this.history.unshift(res);
      if (this.history.length > 4) this.history.pop();
      this.tally[res.tier]++;
      this.total++;
      if (res.tier === "MYTH") {
        this.flash = 1;
        this.shake = 1;
      }
    }
  }

  render(d: Display): void {
    d.clear();

    // ── ヘッダ ─────────────────────────────
    d.text("PHASE 1 ／ 詠唱テストベッド", 16, 8, PAL.accent);
    d.textRight("hash: FNV-1a 32bit", SCREEN_W - 16, 8, PAL.dim);

    // ── 入力欄 ─────────────────────────────
    d.rect(16, 26, 448, 24, PAL.panel);
    d.frame(16, 26, 448, 24, PAL.line);
    const cursorOn = Math.floor(this.caret * 2) % 2 === 0;
    d.text(`> ${this.kb.text}${cursorOn ? "_" : ""}`, 24, 32, PAL.ink);

    // ── 結果パネル ──────────────────────────
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 6 * this.shake) : 0;
    d.rect(16, 56, 448, 54, PAL.panel);
    d.frame(16, 56, 448, 54, PAL.line);

    const latest = this.history[0];
    if (!latest) {
      d.text("文字を打って ENTER", 28, 74, PAL.dim);
    } else {
      const col = TIER_COLOR[latest.tier];
      d.text(latest.label, 28 + sx, 62, col, 24);
      if (latest.tier === "DUD") {
        d.text("言葉は、意味をなさなかった。", 28, 90, PAL.dim);
      } else {
        d.text(`帯内 #${latest.index}   spellId ${latest.spellId}`, 28, 90, PAL.dim);
      }
      d.textRight(latest.word, SCREEN_W - 28, 64, PAL.ink);
      d.textRight(
        `hash 0x${latest.hash.toString(16).toUpperCase().padStart(8, "0")}`,
        SCREEN_W - 28, 80, PAL.dim,
      );
      d.textRight(`r = ${latest.r}`, SCREEN_W - 28, 94, PAL.dim);
    }

    // ── 直近の記録 ──────────────────────────
    d.text("直近の記録", 16, 118, PAL.dim);
    this.history.forEach((h, i) => {
      if (i === 0) return; // 最新は上のパネルに出ている
      const y = 132 + (i - 1) * 14;
      d.text(h.word, 16, y, PAL.dim);
      d.text(h.label, 140, y, TIER_COLOR[h.tier]);
      if (h.tier !== "DUD") d.text(`#${h.index}`, 230, y, PAL.dim);
    });

    // ── 分布の実測 ──────────────────────────
    d.rect(16, 176, 448, 1, PAL.line);
    TIERS.forEach((t, i) => {
      const x = 16 + i * 90;
      const n = this.tally[t.tier];
      const pct = this.total > 0 ? (n / this.total) * 100 : 0;
      d.text(t.label, x, 186, TIER_COLOR[t.tier]);
      d.text(`${n}`, x, 202, PAL.ink);
      d.text(`${pct.toFixed(1)}%`, x, 216, PAL.dim);
      d.text(`設計 ${t.designedRate}%`, x, 230, PAL.line);
    });

    d.textRight(`総詠唱 ${this.total}`, SCREEN_W - 16, 202, PAL.ink);

    // ── 操作説明 ────────────────────────────
    d.text("A-Z 0-9 入力 ／ BACKSPACE 訂正 ／ ESC 全消し ／ ENTER 詠唱", 16, 252, PAL.dim);

    // ── 神話級の閃光 ────────────────────────
    if (this.flash > 0) {
      d.ctx.globalAlpha = this.flash * 0.55;
      d.rect(0, 0, SCREEN_W, SCREEN_H, TIER_COLOR.MYTH);
      d.ctx.globalAlpha = 1;
    }
  }
}
