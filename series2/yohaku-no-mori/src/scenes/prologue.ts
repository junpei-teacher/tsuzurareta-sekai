import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import type { Keyboard } from "../core/input.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { THEMES } from "../core/theme.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import { seg } from "../fx/easing.ts";
import {
  drawDoubleLoopKnot,
  drawStoryPerson,
  drawWoodTag,
  isStorehouseBackgroundReady,
  renderForestBoundary,
  renderStorehouse,
} from "../fx/storyArt.ts";
import { DialogueBox, type Speaker } from "../ui/dialogueBox.ts";
import { windowBox } from "../ui/hud.ts";

type Stage = "store" | "tag" | "knot" | "forest" | "rubbing" | "returning" | "night";
type Speech = { speaker: Speaker; lines: string[] };

const SENA: Speaker = { name: "セナ", color: PAL.accentCool, talks: [] };

const STORE_LIGHTS: Light[] = [
  { x: 405, y: 62, radius: 108, strength: 0.22, color: THEMES.village.glow },
  { x: 244, y: 90, radius: 72, strength: 0.08, color: PAL.accentCool },
];

const FOREST_LIGHTS: Light[] = [
  { x: 82, y: 34, radius: 132, strength: 0.17, color: THEMES.village.glow },
  { x: 360, y: 86, radius: 116, strength: 0.15, color: PAL.accentCool },
];

/**
 * シリーズ2のプロローグ。
 *
 * 既存 FieldScene は王立書庫、ミラ、焚書の章遷移に強く結びついているため使わない。
 * 子供二人の短い操作と一枚絵の会話だけを独立させ、旧作の物語を通常導線へ漏らさない。
 */
export class PrologueScene implements Scene {
  private stage: Stage = "store";
  private stageT = 0;
  private clock = 0;
  private fade = 1;
  private heroX = 92;
  private senaX = 340;
  private stepT = 0;
  private ringGlow = 0;
  private nightErased = 0;
  private heroMoving = false;

  private readonly dialogue = new DialogueBox();
  private queue: Speech[] = [];
  private afterDialogue: (() => void) | null = null;
  private readonly bloom = new BloomLayer();
  private readonly hero: Speaker;

  constructor(
    private readonly keyboard: Keyboard,
    private readonly playerName: string,
    private readonly onDone: () => void,
    private readonly onExit: () => void,
    private readonly storehouseBackground?: HTMLImageElement,
  ) {
    this.hero = { name: playerName, color: PAL.accent, talks: [] };
  }

  update(dt: number, keys: string[]): void {
    const before = this.stageT;
    this.clock += dt;
    this.stageT += dt;
    this.fade = Math.max(0, this.fade - dt * 1.8);
    this.ringGlow = Math.max(0, this.ringGlow - dt * 0.55);
    this.bloom.update(dt);
    this.dialogue.update(dt);

    if (keys.includes("Escape")) {
      sfx.play("cancel");
      this.onExit();
      return;
    }

    if (this.dialogue.active) {
      if (keys.some((key) => key === "Enter" || key === " ")) this.advanceDialogue();
      return;
    }

    if (this.stage === "store") {
      this.moveHero(dt, keys, 68, 300);
      if (this.action(keys) && this.heroX >= 252) this.startStoreTalk();
      return;
    }

    if (this.stage === "tag") {
      if (!this.action(keys)) return;
      sfx.play("confirm");
      this.setStage("knot");
      return;
    }

    if (this.stage === "knot") {
      if (before < 0.82 && this.stageT >= 0.82) sfx.play("page");
      if (this.stageT < 1.5) return;
      this.beginDialogue([
        { speaker: SENA, lines: [
          "「二枚一組なら、こう結ぶ」",
          "「片方を引いても、」",
          "「ほどけないだろ」",
        ] },
        { speaker: this.hero, lines: ["「毎年やるんだから、忘れないよ」"] },
      ], () => this.goForest());
      return;
    }

    if (this.stage === "forest") {
      // 主人公は最初の白い木の手前まで。境界を越えるのはセナだけ。
      this.moveHero(dt, keys, 56, 274);
      if (this.action(keys) && this.heroX >= 262) {
        this.beginDialogue([
          { speaker: SENA, lines: [
            "「森で拾ったんだ」",
            "「白い木の向こうの石に、」",
            "「こんな字が刻まれてた」",
          ] },
        ], () => this.setStage("rubbing"));
      }
      return;
    }

    if (this.stage === "rubbing") {
      if (!this.action(keys)) return;
      sfx.play("page");
      this.ringGlow = 1;
      this.beginDialogue([
        { speaker: this.hero, lines: ["「スレイン？」"] },
        { speaker: SENA, lines: [
          "「たぶん。意味は分からない」",
          "「でも声にすると、」",
          "「この指輪が少し温かくなる」",
        ] },
        { speaker: this.hero, lines: ["「どこで拾ったんだよ」"] },
        { speaker: SENA, lines: [
          "「白い木の向こう」",
          "「明日、ちゃんと見せる」",
          "「今度は二人で行こう」",
        ] },
        { speaker: this.hero, lines: ["「一人で先に行くなよ」"] },
        { speaker: SENA, lines: ["「じゃあ明日。忘れるなよ」"] },
        { speaker: this.hero, lines: ["「忘れない」"] },
      ], () => this.goReturning());
      return;
    }

    if (this.stage === "returning") {
      this.heroX -= dt * 44;
      this.senaX -= dt * 44;
      if (this.stageT >= 2.8) this.setStage("night", 1);
      return;
    }

    if (this.stage === "night") {
      const erased = Math.min(4, Math.floor(seg(this.stageT, 1.4, 3.2) * 4.01));
      if (erased > this.nightErased) {
        for (let i = this.nightErased; i < erased; i++) sfx.play("erase", i * 0.035);
        this.nightErased = erased;
      }
      if (before < 4.1 && this.stageT >= 4.1) sfx.play("page");
      if (this.stageT >= 6.6) this.onDone();
    }
  }

  render(d: Display): void {
    if (this.stage === "store" || this.stage === "tag" || this.stage === "knot") this.renderStore(d);
    else if (this.stage === "night") this.renderNight(d);
    else this.renderForest(d);

    if (this.stage === "tag" || this.stage === "knot") this.renderTagCloseup(d);
    if (this.stage === "rubbing") this.renderRubbing(d);
    this.dialogue.render(d);

    if (this.fade > 0) {
      d.ctx.save();
      d.ctx.globalAlpha = this.fade;
      d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.shadow);
      d.ctx.restore();
    }
  }

  private renderStore(d: Display): void {
    renderStorehouse(d, {
      showSenaTag: true,
      playerName: this.playerName,
      background: this.storehouseBackground,
    });
    drawStoryPerson(d, this.heroX, 176, "heroChild", 1, false, {
      mode: this.heroMoving ? "walk" : "idle",
      frame: Math.floor(this.clock / (this.heroMoving ? 0.14 : 0.72)),
    });
    drawStoryPerson(d, this.senaX, 176, "senaChild", -1, false, {
      mode: "idle", frame: Math.floor(this.clock / 0.72),
    });
    this.bloom.render(d, STORE_LIGHTS, 0.018, THEMES.village.glow);

    if (this.stage !== "store" || this.dialogue.active) return;
    if (this.heroX >= 252) {
      const label = "ENTER　セナに話す";
      d.text(label, Math.round((SCREEN_W - d.measure(label)) / 2), 158, PAL.ink);
    } else {
      d.textRight("← → 移動", SCREEN_W - 22, 158, PAL.hint);
    }
  }

  private renderForest(d: Display): void {
    renderForestBoundary(d, this.clock);
    const returning = this.stage === "returning";
    drawStoryPerson(d, this.heroX, 176, "heroChild", returning ? -1 : 1, false, {
      mode: returning || this.heroMoving ? "walk" : "idle",
      frame: Math.floor(this.clock / (returning || this.heroMoving ? 0.14 : 0.72)),
    });
    drawStoryPerson(d, this.senaX, 176, "senaChild", -1, false, {
      mode: returning ? "walk" : "idle",
      frame: Math.floor(this.clock / (returning ? 0.14 : 0.72)),
    });
    const lights = this.ringGlow > 0
      ? [...FOREST_LIGHTS, {
        x: this.senaX - 10, y: 151, radius: 28,
        strength: 0.30 * this.ringGlow, color: PAL.accent,
      }]
      : FOREST_LIGHTS;
    this.bloom.render(d, lights, 0.012, PAL.accentCool);

    if (this.stage === "forest" && !this.dialogue.active) {
      if (this.heroX >= 262) {
        const label = "ENTER　石摺りを見る";
        d.text(label, Math.round((SCREEN_W - d.measure(label)) / 2), 158, PAL.ink);
      } else {
        d.textRight("← → セナを追う", SCREEN_W - 22, 158, PAL.hint);
      }
    }
  }

  private renderTagCloseup(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.72;
    d.rect(0, 0, SCREEN_W, 182, PAL.shadow);
    d.ctx.restore();
    windowBox(d, 66, 34, 348, 128);
    d.text("越冬配給札", 88, 47, PAL.accent);
    const tying = this.stage === "knot";
    const approach = tying ? seg(this.stageT, 0.05, 0.55) : 0;
    const leftX = 88 + Math.round(approach * 8);
    const rightX = 260 - Math.round(approach * 8);
    this.drawBareTag(d, leftX, 78, 132, 30, "SENA");
    this.drawBareTag(d, rightX, 78, 132, 30, this.playerName);
    d.text("麦 1　塩 1　油 1", leftX + 11, 115, PAL.dim, 10);
    d.text("麦 1　塩 1　油 1", rightX + 11, 115, PAL.dim, 10);

    const ctx = d.ctx;
    const knotX = 240;
    const knotY = 69;
    const cordA = tying ? seg(this.stageT, 0.18, 0.82) : 0;
    ctx.save();
    ctx.globalAlpha = tying ? 0.35 + cordA * 0.65 : 0.48;
    ctx.strokeStyle = "#8d7650";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX + 66, 81);
    ctx.quadraticCurveTo(190, 62 + (1 - cordA) * 10, knotX, knotY);
    ctx.moveTo(rightX + 66, 81);
    ctx.quadraticCurveTo(290, 62 + (1 - cordA) * 10, knotX, knotY);
    ctx.stroke();
    ctx.restore();

    if (tying) {
      const hands = 1 - seg(this.stageT, 0.92, 1.32);
      const close = Math.round((1 - seg(this.stageT, 0.08, 0.72)) * 16);
      ctx.save();
      ctx.globalAlpha = hands;
      d.rect(knotX - 18 - close, 62, 13, 7, "#315f5a");
      d.rect(knotX + 5 + close, 62, 13, 7, "#315f5a");
      d.rect(knotX - 7 - close, 63, 5, 5, "#d9b184");
      d.rect(knotX + 2 + close, 63, 5, 5, "#d9b184");
      ctx.restore();
      drawDoubleLoopKnot(d, knotX, knotY, 1.25, "#8d7650", seg(this.stageT, 0.7, 1.16));
    }

    if (this.stage === "tag" && !this.dialogue.active) {
      d.textRight("ENTER　札を結ぶ", 394, 141, PAL.hint);
    } else if (tying && !this.dialogue.active) {
      const hint = this.stageT < 1.08 ? "二枚一組" : "左右に輪を残す結び目";
      d.text(hint, Math.round((SCREEN_W - d.measure(hint)) / 2), 141, PAL.hint);
    }
  }

  private drawBareTag(
    d: Display, x: number, y: number, w: number, h: number, text: string,
  ): void {
    d.rect(x + 2, y + 2, w, h, PAL.shadow);
    d.rect(x, y, w, h, "#b3955c");
    d.rect(x + 2, y + 2, w - 4, 1, "#d7bc79");
    d.frame(x, y, w, h, "#675439");
    d.rect(x + Math.floor(w / 2), y + 2, 2, 2, "#584830");
    const tw = d.measure(text, 11);
    d.text(text, Math.round(x + (w - tw) / 2), y + 4, "#1b211b", 11);
  }

  private renderRubbing(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.75;
    d.rect(0, 0, SCREEN_W, 182, PAL.shadow);
    d.ctx.restore();
    windowBox(d, 92, 28, 296, 142);
    d.rect(116, 47, 248, 101, "#c8b98d");
    d.frame(116, 47, 248, 101, "#6c6046");
    for (let y = 55; y < 142; y += 13) d.rect(124, y, 229, 1, "#b4a57d");
    const word = "SLANE";
    d.text(word, Math.round((SCREEN_W - d.measure(word, 24)) / 2), 70, "#27362f", 24);
    // 左側が低い、セナ固有の署名。終盤の守人が残す文字と照合する手掛かり。
    [..."SENA"].forEach((char, i) => d.text(char, 293 + i * 7, 124 - i * 2, "#35483e", 11));
    if (!this.dialogue.active) {
      d.textRight("ENTER　読む", 366, 153, PAL.hint);
    }
  }

  private renderNight(d: Display): void {
    renderStorehouse(d, {
      night: true,
      showSenaTag: false,
      playerName: this.playerName,
      background: this.storehouseBackground,
    });
    const adopted = isStorehouseBackgroundReady(this.storehouseBackground);
    const tagX = adopted ? 180 : 196;
    const tagY = adopted ? 82 : 67;
    const tagW = adopted ? 104 : 114;
    const tagH = adopted ? 17 : 19;
    const tagCenterX = tagX + tagW / 2;
    const tagAlpha = 1 - seg(this.stageT, 3.35, 4.1);
    drawWoodTag(d, tagX, tagY, tagW, tagH, "", tagAlpha);

    const chars = [..."SENA"];
    const pitch = d.measure("A", 11);
    const startX = tagCenterX - (pitch * chars.length) / 2;
    chars.forEach((char, i) => {
      const a = (1 - seg(this.stageT, 1.4 + i * 0.45, 1.76 + i * 0.45)) * tagAlpha;
      d.ctx.save();
      d.ctx.globalAlpha = a;
      d.text(char, Math.round(startX + i * pitch), tagY + 4, "#1b211b", 11);
      d.ctx.restore();
    });

    // 札が消えたあと、片側だけ残った紐が床へ落ちる。
    if (this.stageT >= 3.8) {
      const fall = seg(this.stageT, 3.8, 4.9);
      const ctx = d.ctx;
      ctx.save();
      ctx.globalAlpha = 1 - seg(this.stageT, 5.0, 5.8);
      ctx.strokeStyle = "#665c4a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tagCenterX, tagY - 7 + fall * 70);
      ctx.quadraticCurveTo(tagCenterX - 23, tagY + 15 + fall * 76, tagCenterX - 7, tagY + 34 + fall * 68);
      ctx.stroke();
      ctx.restore();
    }

    if (this.stageT >= 5.15) {
      const glow = 1 - seg(this.stageT, 5.15, 6.15);
      const ctx = d.ctx;
      ctx.save();
      const g = ctx.createRadialGradient(454, 78, 0, 454, 78, 38);
      g.addColorStop(0, `rgba(223,189,105,${0.34 * glow})`);
      g.addColorStop(1, "rgba(223,189,105,0)");
      ctx.fillStyle = g;
      ctx.fillRect(414, 38, 66, 80);
      ctx.restore();
    }

    const line = this.stageT < 3.5
      ? "音が、ひとつずつ消えていく。"
      : "誰かを呼ぼうとした。";
    if (this.stageT >= 1.0 && this.stageT < 5.5) {
      d.ctx.save();
      d.ctx.globalAlpha = seg(this.stageT, 1.0, 1.5) * (1 - seg(this.stageT, 5.0, 5.5));
      d.text(line, Math.round((SCREEN_W - d.measure(line)) / 2), 154, PAL.dim);
      d.ctx.restore();
    }
  }

  private startStoreTalk(): void {
    sfx.play("confirm");
    this.beginDialogue([
      { speaker: SENA, lines: ["「遅い。先に一枚、彫っちゃったぞ」"] },
      { speaker: this.hero, lines: ["「自分の名前だけ、ずいぶん丁寧だな」"] },
      { speaker: SENA, lines: [
        "「四文字しかないからな」",
        "「S、E、N、A」",
        "「これなら、お前も間違えない」",
      ] },
    ], () => this.setStage("tag"));
  }

  private goForest(): void {
    this.heroX = 76;
    this.senaX = 350;
    this.setStage("forest", 1);
  }

  private goReturning(): void {
    this.heroX = 260;
    this.senaX = 318;
    this.setStage("returning");
  }

  private setStage(stage: Stage, fade = 0): void {
    this.stage = stage;
    this.stageT = 0;
    this.fade = fade;
  }

  private beginDialogue(parts: Speech[], after: () => void): void {
    this.queue = [...parts];
    this.afterDialogue = after;
    this.openNextSpeech();
  }

  private openNextSpeech(): void {
    const next = this.queue.shift();
    if (next) {
      this.dialogue.open(next.speaker, next.lines);
      return;
    }
    const done = this.afterDialogue;
    this.afterDialogue = null;
    done?.();
  }

  private advanceDialogue(): void {
    if (this.dialogue.advance()) this.openNextSpeech();
  }

  private moveHero(dt: number, keys: string[], min: number, max: number): void {
    const tap = keys.includes("ArrowLeft") ? -1 : keys.includes("ArrowRight") ? 1 : 0;
    const held = this.keyboard.isDown("ArrowLeft") ? -1 : this.keyboard.isDown("ArrowRight") ? 1 : 0;
    const dir = tap || held;
    this.heroMoving = dir !== 0;
    if (dir === 0) { this.stepT = 0; return; }
    const distance = tap ? 12 : dt * 72;
    this.heroX = Math.max(min, Math.min(max, this.heroX + dir * distance));
    this.stepT -= dt;
    if (tap || this.stepT <= 0) {
      sfx.play("step");
      this.stepT = 0.24;
    }
  }

  private action(keys: string[]): boolean {
    return keys.some((key) => key === "Enter" || key === " ");
  }
}
