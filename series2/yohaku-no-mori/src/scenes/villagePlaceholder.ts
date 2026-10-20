import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { THEMES } from "../core/theme.ts";
import { BloomLayer, type Light } from "../fx/bloom.ts";
import { seg } from "../fx/easing.ts";
import { drawSack, drawStoryPerson, renderStorehouse } from "../fx/storyArt.ts";
import { DialogueBox, type Speaker } from "../ui/dialogueBox.ts";
import { windowBox } from "../ui/hud.ts";

type Stage = "intro" | "talk" | "chapter";
type Speech = { speaker: Speaker; lines: string[] };

const KEEPER: Speaker = { name: "共同倉の管理人", color: PAL.accentCool, talks: [] };

const LIGHTS: Light[] = [
  { x: 405, y: 62, radius: 116, strength: 0.24, color: THEMES.village.glow },
  { x: 170, y: 100, radius: 82, strength: 0.07, color: PAL.accentCool },
];

/**
 * 正式な村マップができるまでの第一章入口。
 * 同じ共同倉の十年後を歩かせ、旧作の王立書庫へは接続しない。
 */
export class VillagePlaceholderScene implements Scene {
  private stage: Stage = "intro";
  private stageT = 0;
  private clock = 0;
  private introStarted = false;
  private readonly bloom = new BloomLayer();
  private readonly dialogue = new DialogueBox();
  private readonly hero: Speaker;
  private queue: Speech[] = [];
  private afterDialogue: (() => void) | null = null;

  constructor(
    private readonly playerName: string,
    private readonly onDone: () => void,
    private readonly storehouseBackground?: HTMLImageElement,
  ) {
    this.hero = { name: playerName, color: PAL.accent, talks: [] };
  }

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    this.stageT += dt;
    this.bloom.update(dt);
    this.dialogue.update(dt);

    if (keys.includes("Escape")) {
      sfx.play("cancel");
      this.onDone();
      return;
    }

    if (this.dialogue.active) {
      if (keys.some((key) => key === "Enter" || key === " ")) {
        if (this.dialogue.advance()) this.openNextSpeech();
      }
      return;
    }

    if (this.stage === "intro") {
      if (!this.introStarted && (this.stageT >= 1.65 || this.action(keys))) {
        this.introStarted = true;
        this.stage = "talk";
        this.stageT = 0;
        this.beginDialogue([
          { speaker: KEEPER, lines: ["「また一袋、多いよ」"] },
          { speaker: this.hero, lines: ["「……そうでしたか」"] },
          { speaker: KEEPER, lines: [
            "「去年も、その前もだ」",
            "「疲れてるなら、」",
            "「今日はもう休みな」",
          ] },
        ], () => {
          this.stage = "chapter";
          this.stageT = 0;
        });
      }
      return;
    }

    if (this.stage === "chapter" && this.action(keys) && this.stageT >= 0.35) {
      this.onDone();
    }
  }

  render(d: Display): void {
    renderStorehouse(d, {
      depleted: true,
      showSenaTag: false,
      playerName: this.playerName,
      background: this.storehouseBackground,
    });

    drawStoryPerson(d, 232, 176, "heroAdult", 1, false);
    drawStoryPerson(d, 350, 176, "keeper", -1);
    drawSack(d, 212, 174, 1, "#b99a61", true);
    drawSack(d, 240, 174, 1, "#b99a61", true);
    this.bloom.render(d, LIGHTS, 0.018, THEMES.village.glow);

    if (this.stage === "intro") this.renderTenYears(d);
    if (this.stage === "chapter") this.renderChapter(d);
    this.dialogue.render(d);
  }

  private renderTenYears(d: Display): void {
    const a = seg(this.stageT, 0.1, 0.55) * (1 - seg(this.stageT, 1.15, 1.6));
    d.ctx.save();
    d.ctx.globalAlpha = 0.55 * (1 - seg(this.stageT, 1.1, 1.65));
    d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.shadow);
    d.ctx.globalAlpha = a;
    const label = "十年後";
    d.text(label, Math.round((SCREEN_W - d.measure(label, 20)) / 2), 78, PAL.ink, 20);
    d.ctx.restore();
  }

  private renderChapter(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.76;
    d.rect(0, 0, SCREEN_W, 182, PAL.shadow);
    d.ctx.restore();
    windowBox(d, 78, 35, 324, 128);
    d.text("第一章", 100, 51, PAL.accentCool, 11);
    const title = "一人分多い村";
    d.text(title, Math.round((SCREEN_W - d.measure(title, 20)) / 2), 72, PAL.ink, 20);
    d.rect(116, 102, 248, 1, PAL.line);
    d.text("一袋、多い。", 126, 115, PAL.dim);
    d.text("誰の分かは、思い出せない。", 126, 133, PAL.dim);
    d.textRight("ENTER　村を歩く", 384, 148, PAL.hint);
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

  private action(keys: string[]): boolean {
    return keys.some((key) => key === "Enter" || key === " ");
  }
}
