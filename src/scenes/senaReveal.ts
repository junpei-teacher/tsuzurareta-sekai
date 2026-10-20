import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { StoryCharacterLayer } from "../fx/storyCharacterLayer.ts";
import { drawStoryPerson, renderRuinInterior, type StoryPersonMotion } from "../fx/storyArt.ts";

const REVEAL_AT = 1.05;
const SETTLE_AT = 2.8;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * SENAが届いた直後だけに入る、戦闘と会話の継ぎ目。
 * 仮面を撃破エフェクトで砕かず、左手が下がり、色が戻ることで終戦を見せる。
 */
export class SenaRevealScene implements Scene {
  private clock = 0;
  private maskCuePlayed = false;
  private done = false;
  private generatedBodies: boolean;
  private previewPaused = false;

  constructor(
    private readonly onDone: () => void,
    private readonly characterLayer?: StoryCharacterLayer,
    private readonly previewControls = false,
  ) {
    this.generatedBodies = Boolean(characterLayer);
  }

  update(dt: number, keys: string[]): void {
    if (!this.previewPaused) this.clock += dt;
    if (this.previewControls) {
      for (const key of keys) {
        if (key.toUpperCase() === "P") {
          this.generatedBodies = !this.generatedBodies;
          sfx.play("page");
        } else if (key.toUpperCase() === "R") {
          this.clock = 0;
          this.previewPaused = false;
          this.maskCuePlayed = false;
          this.done = false;
        } else if (key.toUpperCase() === "T") {
          this.previewPaused = !this.previewPaused;
          sfx.play("page");
        } else if (key === "ArrowLeft" || key === "ArrowRight") {
          this.clock = Math.max(0, Math.min(SETTLE_AT, this.clock + (key === "ArrowRight" ? 0.25 : -0.25)));
          this.previewPaused = true;
          this.maskCuePlayed = this.clock >= REVEAL_AT;
          this.done = false;
        }
      }
    }
    if (!this.maskCuePlayed && this.clock >= REVEAL_AT) {
      this.maskCuePlayed = true;
      // 紙と布の中間の短い擦れ。勝利音や破砕音にはしない。
      sfx.play("page");
    }

    if (!keys.some((key) => key === "Enter" || key === " ")) return;
    if (this.clock < SETTLE_AT) {
      this.clock = SETTLE_AT;
      return;
    }
    if (this.done) return;
    this.done = true;
    sfx.play("confirm");
    this.onDone();
  }

  render(d: Display): void {
    renderRuinInterior(d, this.clock, "sanctum");

    const idleFrame = Math.floor(this.clock / 0.72) % 2;
    const heroMotion: StoryPersonMotion = { mode: "idle", frame: idleFrame };
    const handLower = clamp01((this.clock - 0.72) / 1.25);
    const senaMotion: StoryPersonMotion = {
      mode: "idle",
      frame: idleFrame,
      ringHandLower: handLower,
    };

    // 実際の最奥聖域へ戻った時と同じ左右関係。欠けた環の中心を二人の間へ置く。
    this.drawHero(d, heroMotion);
    if (this.clock < REVEAL_AT) {
      this.drawSena(d, true, senaMotion);
    } else {
      this.drawSena(d, false, senaMotion);
      this.renderLeavingMask(d, senaMotion);
    }

    this.renderRingResponse(d, senaMotion);
    this.renderReturningColor(d);

    if (this.previewControls) {
      d.rect(282, 8, 182, 29, PAL.panel);
      d.frame(282, 8, 182, 29, PAL.line);
      d.text(
        `${this.generatedBodies ? "PNG正式v26" : "コード基準"}　${this.clock.toFixed(2)}秒${this.previewPaused ? "・停止" : ""}`,
        289, 11, PAL.hint, 8,
      );
      d.text("P 比較　←→ 時刻　R 再生　T 停止", 289, 24, PAL.dim, 7);
    }

    if (this.clock >= SETTLE_AT) {
      const blink = Math.floor(this.clock * 2.4) % 2 === 0;
      if (blink) d.textRight("ENTER　つづける", SCREEN_W - 22, 242, PAL.hint, 10);
    }
  }

  private drawHero(d: Display, motion: StoryPersonMotion): void {
    const drawn = this.generatedBodies && this.characterLayer?.drawHero(d, 310, 176, 1, motion);
    if (!drawn) drawStoryPerson(d, 310, 176, "heroAdult", 1, false, motion);
  }

  private drawSena(d: Display, masked: boolean, motion: StoryPersonMotion): void {
    const drawn = this.generatedBodies && this.characterLayer?.drawSena(d, 405, 176, -1, masked, motion);
    if (!drawn) drawStoryPerson(d, 405, 176, masked ? "guardian" : "sena", -1, false, motion);
  }

  private renderLeavingMask(d: Display, motion: StoryPersonMotion): void {
    const progress = clamp01((this.clock - REVEAL_AT) / 1.18);
    const drop = Math.round(progress * progress * 9);
    const alpha = 1 - clamp01((progress - 0.56) / 0.44);
    if (alpha <= 0) return;

    const ctx = d.ctx;
    if (this.generatedBodies && this.characterLayer) {
      this.characterLayer.drawLeavingSenaMask(d, 405, 176, -1, motion, drop, alpha);
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(405, 176 + drop);
      ctx.scale(-1, 1);
      // フィールド仮面と同じ寸法。右頬の欠けとCALLで入った細いひびだけを足す。
      d.rect(-5, -45, 11, 12, "#869687");
      d.rect(-4, -44, 11, 9, "#c9c9ad");
      d.rect(-3, -43, 8, 2, "#e6dfc2");
      d.rect(4, -39, 2, 2, "#18302b");
      d.rect(6, -37, 2, 1, "#8d9b88");
      d.rect(0, -36, 1, 2, "#6f7e73");
      d.rect(1, -35, 2, 1, "#6f7e73");
      ctx.restore();
    }

    // 仮面そのものを粉々にせず、輪郭から小片が二つだけほどける。
    if (progress > 0.42) {
      const dust = clamp01((progress - 0.42) / 0.58);
      const centerX = 405 + (this.generatedBodies ? this.characterLayer?.senaMaskCenterOffset ?? 0 : 0);
      ctx.save();
      ctx.globalAlpha = (1 - dust) * 0.7;
      d.rect(centerX - 6 - Math.round(dust * 5), 142 + Math.round(dust * 7), 2, 2, "#b8b9a4");
      d.rect(centerX + 6 + Math.round(dust * 4), 147 + Math.round(dust * 5), 1, 2, "#879487");
      ctx.restore();
    }
  }

  private renderRingResponse(d: Display, motion: StoryPersonMotion): void {
    const progress = clamp01((this.clock - 0.82) / 1.55);
    if (progress <= 0 || progress >= 1) return;

    // セナが左向きのため、非反転の左手は画面左側にある。
    const generatedAnchor = this.generatedBodies
      ? this.characterLayer?.senaRingAnchor(405, 176, -1, motion)
      : undefined;
    const handX = generatedAnchor?.x ?? 393;
    const handY = generatedAnchor?.y ?? 162 + Math.round(clamp01((this.clock - 0.72) / 1.25) * 3);
    const ctx = d.ctx;
    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.68;
    ctx.strokeStyle = PAL.accentCool;
    ctx.lineWidth = 1;
    const radius = 4 + progress * 22;
    ctx.beginPath();
    ctx.arc(handX, handY, radius, -Math.PI * 0.82, Math.PI * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handX, handY, radius, Math.PI * 0.36, Math.PI * 1.18);
    ctx.stroke();
    d.rect(handX - 1, handY - 1, 2, 2, PAL.accentCool);
    ctx.restore();
  }

  private renderReturningColor(d: Display): void {
    const restored = clamp01((this.clock - 0.18) / 2.12);
    const ctx = d.ctx;
    ctx.save();
    ctx.globalAlpha = (1 - restored) * 0.58;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#111726");
    ctx.globalAlpha = (1 - restored) * 0.18;
    d.rect(0, 0, SCREEN_W, 176, "#c6c8c0");
    ctx.restore();

    // 色が戻る終端だけ、環の青緑と古金を別々に一度ずつ拾う。
    const glint = clamp01((this.clock - 1.62) / 0.72);
    if (glint <= 0 || glint >= 1) return;
    ctx.save();
    ctx.globalAlpha = Math.sin(glint * Math.PI) * 0.5;
    d.rect(347, 49, 3, 104, PAL.accentCool);
    d.rect(350, 100, 52, 2, PAL.accent);
    ctx.restore();
  }
}
