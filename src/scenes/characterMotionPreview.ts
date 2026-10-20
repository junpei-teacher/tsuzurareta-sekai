import { Display, SCREEN_W } from "../core/display.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { GeneratedStoryCharacterLayer } from "../fx/generatedStoryCharacters.ts";
import {
  drawStoryPerson, drawStoryPortrait, renderForestBoundary, type StoryPersonMotion,
} from "../fx/storyArt.ts";
import { windowBox } from "../ui/hud.ts";

/**
 * 開発時だけ使う人物アニメーション比較画面。
 * 物語フラグや進行保存を変更せず、同じ背景・足元・速度で主人公とセナを比較する。
 */
export class CharacterMotionPreviewScene implements Scene {
  private clock = 0;
  private motionEpoch = 0;
  private mode: StoryPersonMotion["mode"] = "walk";
  private stopRequested = false;
  private stopFrameSeen = false;
  private facing: -1 | 1 = 1;
  private masked = true;
  private group: "lead" | "npc" | "portrait" = "lead";
  private generatedBodies = false;
  private rawStrip = false;
  private rawSubject: "hero" | "sena" = "hero";
  private readonly generated: GeneratedStoryCharacterLayer;

  constructor(
    private readonly onBack: () => void,
    private readonly onArt: (() => void) | undefined,
    images: ImageMap,
  ) {
    this.generated = new GeneratedStoryCharacterLayer(images);
  }

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    if (this.mode === "walk" && this.stopRequested) {
      const walkFrame = Math.floor((this.clock - this.motionEpoch) * 6) % 4;
      if (this.stopFrameSeen && walkFrame !== 3) {
        this.mode = "idle";
        this.motionEpoch = this.clock;
        this.stopRequested = false;
        this.stopFrameSeen = false;
      } else if (walkFrame === 3) {
        this.stopFrameSeen = true;
      }
    }
    for (const key of keys) {
      if (key === "Escape") { sfx.play("cancel"); this.onBack(); return; }
      if (key.toUpperCase() === "G" && this.onArt) { this.onArt(); return; }
      if (key.toUpperCase() === "P" && this.group === "lead") {
        this.generatedBodies = !this.generatedBodies;
        sfx.play("page");
      }
      if (key.toUpperCase() === "V" && this.group === "lead") {
        this.rawStrip = !this.rawStrip;
        sfx.play("page");
      }
      if (key.toUpperCase() === "N" && this.group === "lead" && this.rawStrip) {
        this.rawSubject = this.rawSubject === "hero" ? "sena" : "hero";
        sfx.play("page");
      }
      if ((key === "Enter" || key === " ") && this.group === "lead") {
        if (this.mode === "walk") {
          this.stopRequested = !this.stopRequested;
          this.stopFrameSeen = false;
        } else {
          this.mode = "walk";
          this.motionEpoch = this.clock;
        }
        sfx.play("confirm");
      }
      if (key === "ArrowLeft") { this.facing = -1; sfx.play("move"); }
      if (key === "ArrowRight") { this.facing = 1; sfx.play("move"); }
      if ((key === "m" || key === "M") && this.group !== "npc") {
        this.masked = !this.masked;
        sfx.play("page");
      }
      if (key === "Tab") {
        this.group = this.group === "lead" ? "npc" : this.group === "npc" ? "portrait" : "lead";
        sfx.play("page");
      }
    }
  }

  render(d: Display): void {
    renderForestBoundary(d, this.clock);
    const motionTime = this.clock - this.motionEpoch;
    const leadFrame = this.mode === "walk"
      ? Math.floor(motionTime * 6) % 4
      : Math.floor(motionTime / 0.72) % 2;
    const npcFrame = Math.floor(this.clock / 0.72) % 2;
    const motion: StoryPersonMotion = { mode: this.mode, frame: leadFrame };
    const groundY = 176;

    if (this.group === "lead" && this.rawStrip) {
      this.renderGeneratedStrip(d, groundY);
      return;
    }

    // 全コマの靴底が重なることを目視できる1pxの基準線。
    if (this.group !== "portrait") d.rect(46, groundY, SCREEN_W - 92, 1, "#d7c67a");
    if (this.group === "lead") {
      if (this.generatedBodies) this.generated.drawHero(d, 158, groundY, this.facing, motion);
      else drawStoryPerson(d, 158, groundY, "heroAdult", this.facing, false, motion);
      if (this.generatedBodies) this.generated.drawSena(d, 322, groundY, this.facing, this.masked, motion);
      else drawStoryPerson(d, 322, groundY, this.masked ? "guardian" : "sena", this.facing, false, motion);
    } else if (this.group === "npc") {
      const idle: StoryPersonMotion = { mode: "idle", frame: npcFrame };
      drawStoryPerson(d, 78, groundY, "keeper", this.facing, false, idle);
      drawStoryPerson(d, 190, groundY, "villager", this.facing, false, idle);
      drawStoryPerson(d, 302, groundY, "hunter", this.facing, false, idle);
      drawStoryPerson(d, 414, groundY, "merchant", this.facing, false, idle);
    } else {
      windowBox(d, 29, 67, 422, 116);
      const portraits = [
        { x: 48, id: "hero" as const, label: "主人公" },
        { x: 155, id: this.masked ? "sena_masked" as const : "sena" as const, label: this.masked ? "セナ（仮面）" : "セナ" },
        { x: 262, id: "hunter_chief" as const, label: "狩人頭" },
        { x: 369, id: "merchant" as const, label: "行商人" },
      ];
      for (const portrait of portraits) {
        drawStoryPortrait(d, portrait.x, 78, portrait.id);
        d.frame(portrait.x, 78, 64, 64, PAL.line);
        d.rect(portrait.x, 148, 64, 15, PAL.panel);
        d.frame(portrait.x, 148, 64, 15, PAL.line);
        const labelX = portrait.x + Math.floor((64 - d.measure(portrait.label, 9)) / 2);
        d.text(portrait.label, labelX, 151, PAL.ink, 9);
      }
    }

    windowBox(d, 18, 12, 444, 43);
    d.text("人物アニメーション比較", 30, 19, PAL.accentCool, 11);
    d.textRight(
      this.group === "lead"
        ? `${this.stopRequested ? "停止待ち" : this.mode === "walk" ? "歩行4" : "待機2"}　FRAME ${leadFrame + 1}／${this.generatedBodies ? "PNG正式v26" : "コード基準"}`
        : this.group === "npc" ? `NPC待機2　FRAME ${npcFrame + 1}` : "会話肖像 64×64",
      448, 19, PAL.accent, 10,
    );
    if (this.group === "lead") {
      d.rect(116, 108, 84, 15, PAL.panel);
      d.frame(116, 108, 84, 15, PAL.line);
      d.text(this.generatedBodies ? "主人公・PNG" : "主人公・コード", this.generatedBodies ? 125 : 121, 111, PAL.ink, 8);
      d.rect(272, 108, 100, 15, PAL.panel);
      d.frame(272, 108, 100, 15, PAL.line);
      const senaLabel = this.generatedBodies ? (this.masked ? "セナPNG・仮面" : "セナ・PNG") : this.masked ? "セナ（仮面）" : "セナ・コード";
      d.text(senaLabel, this.generatedBodies ? (this.masked ? 286 : 294) : this.masked ? 291 : 298, 111, PAL.ink, 9);
    } else if (this.group === "npc") {
      for (const [x, label] of [[43, "管理人"], [155, "村人"], [267, "狩人"], [379, "行商人"]] as const) {
        d.rect(x, 108, 70, 15, PAL.panel);
        d.frame(x, 108, 70, 15, PAL.line);
        d.text(label, x + (label.length === 3 ? 20 : 25), 111, PAL.ink, 9);
      }
    }

    windowBox(d, 18, 205, 444, 50);
    d.text("TAB 主役/NPC/肖像　←→ 向き　G 静止比較　ESC", 34, 215, PAL.hint, 9);
    d.text(
      this.group === "lead" ? "ENTER 待機/歩行　M 仮面　P コード/PNG　V 接地列"
        : this.group === "npc" ? "NPCは待機1〜2コマのみ" : "M セナの仮面を比較",
      34, 233, PAL.hint, 10,
    );
  }

  private generatedFrames(subject: "hero" | "sena"): readonly (HTMLImageElement | undefined)[] {
    return this.generated.frames(subject, this.mode);
  }

  private renderGeneratedStrip(d: Display, groundY: number): void {
    const frames = this.generatedFrames(this.rawSubject);
    const hero = this.rawSubject === "hero";
    d.rect(34, groundY, SCREEN_W - 68, 1, "#d7c67a");
    for (let index = 0; index < frames.length; index++) {
      const x = 48 + index * 96;
      this.generated.drawSprite(d, frames[index]!, x, groundY, this.facing, hero ? 14 : 15, hero ? 44 : 46, 2);
      d.rect(x - 18, 70, 36, 14, PAL.panel);
      d.frame(x - 18, 70, 36, 14, PAL.line);
      d.text(`FRAME ${index + 1}`, x - 18, 73, PAL.ink, 7);
    }
    windowBox(d, 18, 12, 444, 43);
    d.text(`${hero ? "主人公" : "セナ"}PNG・${this.mode === "walk" ? "歩行" : "待機"} 接地検査`, 30, 19, PAL.accentCool, 11);
    d.textRight(`正式${frames.length}コマ／Canvas foot=${hero ? 44 : 46}固定`, 448, 19, PAL.accent, 8);
    const failed = frames.filter((image) => !this.generated.ready(image)).length;
    if (failed) d.text(`読込待ち・寸法エラー ${failed}枚`, 30, 42, PAL.danger, 9);
    else d.text(hero ? "頭頂・靴底・鞄・補修布・余計な床を確認" : "頭頂・靴底・長髪・上衣・余計な床を確認", 30, 42, PAL.hint, 9);
    windowBox(d, 18, 205, 444, 50);
    d.text("ENTER 待機/歩行　N 主人公/セナ　V 通常比較　ESC 戻る", 34, 215, PAL.hint, 9);
    d.text("本番目録と同じPNGを、原寸座標と足元固定で表示しています。", 34, 233, PAL.hint, 9);
  }
}
