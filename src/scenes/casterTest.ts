import { Display, SCREEN_W } from "../core/display.ts";
import { PAL, TIER_COLOR } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { CastFx, type FxElement } from "../fx/castFx.ts";
import { spellById } from "../spell/book.ts";
import { resolveSpell, TIERS, type Resolution, type Tier } from "../spell/resolver.ts";
import { TextField } from "../ui/textField.ts";

/**
 * Phase 1 テストベッド（手順書 1-4）。
 * 文字列を打って ENTER を押すと、どの帯の何番が出たかを表示する。
 * 分布の実測もその場で見られる。
 */
export class CasterTestScene implements Scene {
  private readonly fx = new CastFx();
  private readonly field = new TextField();

  private history: Resolution[] = [];
  private tally: Record<Tier, number> = {
    DUD: 0, COMMON: 0, UNCOMMON: 0, RARE: 0, MYTH: 0,
  };
  private total = 0;

  /** 一度発動した呪文。2回目以降は演出を短縮版にする */
  private seen = new Set<number>();
  private lastWasShort = false;
  private caret = 0;

  constructor(private readonly onExit: () => void) {}

  update(dt: number, keys: string[]): void {
    this.caret += dt;
    this.fx.update(dt);

    for (const key of keys) {
      if (key === "Escape" && this.field.value.length === 0) {
        this.onExit();
        return;
      }
      const submitted = this.field.feed(key);
      if (submitted === null) continue;
      if (submitted.trim().length === 0) continue;

      const res = resolveSpell(submitted);
      const known = res.spellId >= 0 && this.seen.has(res.spellId);
      this.lastWasShort = known;
      if (res.spellId >= 0) this.seen.add(res.spellId);

      // **光と音の作り込みはこの画面でやる**ので、属性の渡し方も戦闘と揃えておく
      const element = (res.spellId >= 0 ? spellById(res.spellId)?.element : undefined) ?? "NONE";
      this.fx.play(res.tier, res.word, res.hash, known, element as FxElement);

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

    this.fx.renderBehind(d);
    this.fx.renderFront(d);
  }

  private renderUi(d: Display): void {
    d.text("PHASE 1 ／ 詠唱テストベッド", 16, 8, PAL.accent);
    d.textRight("ESC もどる", SCREEN_W - 16, 8, PAL.dim);

    d.rect(16, 26, 448, 24, PAL.panel);
    d.frame(16, 26, 448, 24, PAL.line);
    const cursorOn = Math.floor(this.caret * 2) % 2 === 0;
    d.text(`> ${this.field.value}${cursorOn ? "_" : ""}`, 24, 32, PAL.ink);

    d.rect(16, 56, 448, 54, PAL.panel);
    const latest = this.history[0];
    d.frame(16, 56, 448, 54, latest ? TIER_COLOR[latest.tier] : PAL.line);

    if (!latest) {
      d.text("文字を打って ENTER", 28, 74, PAL.dim);
    } else {
      d.text(latest.label, 28, 62, TIER_COLOR[latest.tier], 24);
      if (latest.tier === "DUD") {
        d.text("言葉は、意味をなさなかった。", 28, 90, PAL.dim);
      } else {
        const sp = spellById(latest.spellId);
        d.text(sp ? `${sp.name}　${sp.element}　MP${sp.mp}` : `#${latest.index}`, 28, 90, PAL.dim);
        if (this.lastWasShort) d.text("［短縮演出］", 240, 90, PAL.hint);
      }
      d.textRight(latest.word, SCREEN_W - 28, 64, PAL.ink);
      d.textRight(
        `hash 0x${latest.hash.toString(16).toUpperCase().padStart(8, "0")}`,
        SCREEN_W - 28, 80, PAL.dim,
      );
      d.textRight(`r = ${latest.r}`, SCREEN_W - 28, 94, PAL.dim);
    }

    d.text("直近の記録", 16, 118, PAL.dim);
    this.history.forEach((h, i) => {
      if (i === 0) return;
      const y = 132 + (i - 1) * 14;
      const sp = spellById(h.spellId);
      d.text(h.word, 16, y, PAL.dim);
      d.text(h.label, 130, y, TIER_COLOR[h.tier]);
      if (sp) d.text(sp.name, 220, y, PAL.dim);
    });

    d.rect(16, 176, 448, 1, PAL.line);
    TIERS.forEach((t, i) => {
      const x = 16 + i * 90;
      const n = this.tally[t.tier];
      const pct = this.total > 0 ? (n / this.total) * 100 : 0;
      d.text(t.label, x, 186, TIER_COLOR[t.tier]);
      d.text(`${n}`, x, 202, PAL.ink);
      d.text(`${pct.toFixed(1)}%`, x, 216, PAL.dim);
      d.text(`設計 ${t.designedRate}%`, x, 230, PAL.hint);
    });

    d.textRight(`総詠唱 ${this.total}`, SCREEN_W - 16, 202, PAL.ink);
    d.textRight(`既知 ${this.seen.size} 種`, SCREEN_W - 16, 216, PAL.dim);

    d.text("A-Z 0-9 入力 ／ BACKSPACE 訂正 ／ ESC 全消し・もどる ／ ENTER 詠唱", 16, 252, PAL.dim);
  }
}
