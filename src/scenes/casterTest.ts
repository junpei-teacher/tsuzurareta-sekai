import { Display, SCREEN_W } from "../core/display.ts";
import { Keyboard } from "../core/input.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import { CastFx } from "../fx/castFx.ts";
import { resolveSpell, TIERS, type Resolution, type Tier } from "../spell/resolver.ts";

/**
 * Phase 1 テストベッド（手順書 1-4）。
 * 文字列を打って ENTER を押すと、どの帯の何番が出たかを表示する。
 *
 * 完了条件は「100回ほど手打ちして、もう1回打ちたいと思えること」。
 */
export class CasterTestScene {
  private readonly kb: Keyboard;
  private readonly fx = new CastFx();

  private history: Resolution[] = [];
  private tally: Record<Tier, number> = {
    DUD: 0, COMMON: 0, UNCOMMON: 0, RARE: 0, MYTH: 0,
  };
  private total = 0;

  /** 一度発動した呪文。2回目以降は演出を短縮版にする */
  private seen = new Set<number>();
  private lastWasShort = false;

  private caret = 0;

  constructor(kb: Keyboard) {
    this.kb = kb;
  }

  update(dt: number): void {
    this.caret += dt;
    this.fx.update(dt);

    let submitted: string | null;
    while ((submitted = this.kb.takeSubmission()) !== null) {
      if (submitted.trim().length === 0) continue; // 空Enterは無視
      const res = resolveSpell(submitted);

      // 撃ち慣れた呪文は短縮版で流す。
      // 戦闘で同じ呪文を20回撃つ場面を考えると、初回と同じ尺は苦痛になる。
      const known = res.spellId >= 0 && this.seen.has(res.spellId);
      this.lastWasShort = known;
      if (res.spellId >= 0) this.seen.add(res.spellId);

      this.fx.play(res.tier, res.word, res.hash, known);

      this.history.unshift(res);
      if (this.history.length > 4) this.history.pop();
      this.tally[res.tier]++;
      this.total++;
    }
  }

  render(d: Display): void {
    d.clear();

    const sh = this.fx.shake;
    d.ctx.save();
    d.ctx.translate(sh.x, sh.y);
    this.renderUi(d);
    d.ctx.restore();

    this.fx.renderBehind(d); // 暗転（溜め）
    this.fx.renderFront(d);  // 光
  }

  private renderUi(d: Display): void {
    // ── ヘッダ ─────────────────────────────
    d.text("PHASE 1 ／ 詠唱テストベッド", 16, 8, PAL.accent);
    d.textRight("hash: FNV-1a 32bit", SCREEN_W - 16, 8, PAL.dim);

    // ── 入力欄 ─────────────────────────────
    d.rect(16, 26, 448, 24, PAL.panel);
    d.frame(16, 26, 448, 24, PAL.line);
    const cursorOn = Math.floor(this.caret * 2) % 2 === 0;
    d.text(`> ${this.kb.text}${cursorOn ? "_" : ""}`, 24, 32, PAL.ink);

    // ── 結果パネル ──────────────────────────
    d.rect(16, 56, 448, 54, PAL.panel);
    const latest = this.history[0];
    d.frame(16, 56, 448, 54, latest ? TIER_COLOR[latest.tier] : PAL.line);

    if (!latest) {
      d.text("文字を打って ENTER", 28, 74, PAL.dim);
    } else {
      const col = TIER_COLOR[latest.tier];
      d.text(latest.label, 28, 62, col, 24);
      if (latest.tier === "DUD") {
        d.text("言葉は、意味をなさなかった。", 28, 90, PAL.dim);
      } else {
        d.text(`帯内 #${latest.index}   spellId ${latest.spellId}`, 28, 90, PAL.dim);
        if (this.lastWasShort) d.text("［短縮演出］", 200, 90, PAL.line);
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
    d.textRight(`既知 ${this.seen.size} 種`, SCREEN_W - 16, 216, PAL.dim);

    // ── 操作説明 ────────────────────────────
    d.text("A-Z 0-9 入力 ／ BACKSPACE 訂正 ／ ESC 全消し ／ ENTER 詠唱", 16, 252, PAL.dim);
  }
}
