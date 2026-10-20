import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { StoryCharacterLayer } from "../fx/storyCharacterLayer.ts";
import {
  drawSack,
  drawStoryPerson,
  renderStorehouse,
  type StoryPersonMotion,
} from "../fx/storyArt.ts";
import { windowBox } from "../ui/hud.ts";

const CANDIDATE_URL = "/docs/concepts/storehouse-game-palette-v27.png";
const STATES = ["十年前", "現在", "終幕"] as const;

/** DEV専用。共同倉のコード版とv27背景を、同じ人物・物語状態で比較する。 */
export class StorehouseBackgroundPreviewScene implements Scene {
  private clock = 0;
  private candidate = true;
  private state = 2;
  private night = false;
  private clean = false;
  private readonly image = Object.assign(new Image(), { src: CANDIDATE_URL });

  constructor(
    private readonly onBack: () => void,
    private readonly characters: StoryCharacterLayer,
  ) {}

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (key === "Escape") { sfx.play("cancel"); this.onBack(); return; }
      if (lower === "g") { this.candidate = !this.candidate; sfx.play("page"); }
      if (lower === "u") { this.state = (this.state + 1) % STATES.length; sfx.play("page"); }
      if (lower === "n") { this.night = !this.night; sfx.play("page"); }
      if (lower === "c") { this.clean = !this.clean; sfx.play("page"); }
    }
  }

  render(d: Display): void {
    const depleted = this.state === 1;
    const showSena = this.state !== 1;
    const candidateReady = this.image.complete
      && this.image.naturalWidth === 960
      && this.image.naturalHeight === 540;

    if (this.candidate && candidateReady && this.clean) {
      d.clear();
      d.ctx.save();
      d.ctx.imageSmoothingEnabled = false;
      d.ctx.drawImage(this.image, 0, 0, SCREEN_W, SCREEN_H);
      d.ctx.restore();
      if (this.night) this.renderNightTint(d);
    } else {
      renderStorehouse(d, {
        night: this.night,
        depleted,
        showSenaTag: showSena,
        playerName: "TEST",
        background: this.candidate ? this.image : undefined,
      });
    }

    if (!this.clean) this.renderPeopleAndCopy(d);
    this.renderControls(d, candidateReady);
  }

  private renderPeopleAndCopy(d: Display): void {
    const motion: StoryPersonMotion = { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2 };
    if (this.state === 0) {
      drawStoryPerson(d, 210, 176, "heroChild", 1, false, motion);
      drawStoryPerson(d, 267, 176, "senaChild", -1, false, motion);
    } else if (this.state === 1) {
      if (!this.characters.drawHero(d, 236, 176, 1, motion)) {
        drawStoryPerson(d, 236, 176, "heroAdult", 1, false, motion);
      }
    } else {
      if (!this.characters.drawHero(d, 210, 176, 1, motion)) {
        drawStoryPerson(d, 210, 176, "heroAdult", 1, false, motion);
      }
      if (!this.characters.drawSena(d, 272, 176, -1, false, motion)) {
        drawStoryPerson(d, 272, 176, "sena", -1, false, motion);
      }
      drawSack(d, 238, 176, 0.82, "#b99a61", true);
      drawSack(d, 304, 176, 0.82, "#b99a61", true);
      d.rect(328, 158, 9, 17, "#8fa06c");
      d.rect(330, 155, 5, 4, "#d4a866");
      d.rect(330, 161, 3, 7, "#72d6c0");
    }

    windowBox(d, 16, 186, 448, 68);
    const lines = this.state === 0
      ? ["十年前、ここには二人分の札があった。", "同じ倉、同じ足元で時代差を見る。"]
      : this.state === 1
        ? ["配給札から、一人の名前だけが消えている。", "棚の乏しさは、村の現在を示す。"]
        : ["一袋多かった配給は、", "今度は、受け取る本人の前へ置かれた。"];
    d.text(lines[0]!, 34, 201, PAL.ink);
    d.text(lines[1]!, 34, 219, PAL.ink);
  }

  private renderNightTint(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.62;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#07110f");
    d.ctx.globalAlpha = 0.22;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#171329");
    d.ctx.restore();
  }

  private renderControls(d: Display, candidateReady: boolean): void {
    windowBox(d, 236, 8, 228, 45);
    const source = this.candidate
      ? candidateReady ? "生成C→森138色・v27" : "候補読込待ち"
      : "コード基準";
    d.text(`共同倉　${source}`, 246, 15, PAL.accentCool, 8);
    d.text(`G 背景　U ${STATES[this.state]}　N ${this.night ? "夜" : "昼"}　C ${this.clean ? "静景" : "合成"}`, 246, 31, PAL.hint, 8);
  }
}
