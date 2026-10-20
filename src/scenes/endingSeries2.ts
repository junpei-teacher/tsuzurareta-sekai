import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { StoryCharacterLayer } from "../fx/storyCharacterLayer.ts";
import {
  drawSack, drawStoryPerson, renderStorehouse, renderVillageRoad, type StoryPersonMotion,
} from "../fx/storyArt.ts";
import { windowBox } from "../ui/hud.ts";
import { SERIES2_ENDING_PAGE_HOLD, villageWalkStateAt } from "./endingMotion.ts";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 単一エンディング。分岐一覧は作らず、王国へ向かう問いだけを残す。 */
export class Series2EndingScene implements Scene {
  private page = 0;
  private clock = 0;
  private pageClock = 0;
  private generatedBodies: boolean;
  private previewPaused = false;

  constructor(
    private readonly playerName: string,
    private readonly onDone: () => void,
    private readonly characterLayer?: StoryCharacterLayer,
    private readonly previewControls = false,
    private readonly storehouseBackground?: HTMLImageElement,
    private readonly villageRoadBackground?: HTMLImageElement,
  ) {
    this.generatedBodies = Boolean(characterLayer);
  }

  update(dt: number, keys: string[]): void {
    if (!this.previewPaused) {
      this.clock += dt;
      this.pageClock += dt;
    }
    if (this.previewControls) {
      for (const key of keys) {
        const upper = key.toUpperCase();
        if (upper === "P") {
          this.generatedBodies = !this.generatedBodies;
          sfx.play("page");
        } else if (upper === "R") {
          this.pageClock = 0;
          this.previewPaused = false;
        } else if (upper === "T") {
          this.previewPaused = !this.previewPaused;
        } else if (key === "ArrowLeft" || key === "ArrowRight") {
          const direction = key === "ArrowLeft" ? -1 : 1;
          const hold = SERIES2_ENDING_PAGE_HOLD[this.page] ?? 1.5;
          this.pageClock = Math.max(0, Math.min(hold, this.pageClock + direction * 0.25));
          this.previewPaused = true;
        }
      }
    }
    if (!keys.some((key) => key === "Enter" || key === " ")) return;
    const hold = SERIES2_ENDING_PAGE_HOLD[this.page] ?? 1.5;
    if (this.pageClock < hold) {
      // 誤って二度押ししても情景を一枚は見せる。最初の入力は停止点まで送るだけ。
      this.pageClock = hold;
      return;
    }
    sfx.play("page");
    this.page++;
    this.pageClock = 0;
    this.previewPaused = false;
    if (this.page > 2) this.onDone();
  }

  render(d: Display): void {
    if (this.page === 0) {
      this.renderStorehouseReturn(d);
    } else if (this.page === 1) {
      this.renderVillageWalk(d);
    } else {
      this.renderRoadToKingdom(d);
    }

    const hold = SERIES2_ENDING_PAGE_HOLD[this.page] ?? 1.5;
    if (this.pageClock >= hold && Math.floor(this.clock * 2.4) % 2 === 0) {
      d.textRight(this.page === 2 ? "ENTER　タイトルへ" : "ENTER　つづける", 454, 242, PAL.hint, 10);
    }
    if (this.previewControls) {
      d.rect(328, 8, 136, 28, PAL.panel);
      d.frame(328, 8, 136, 28, PAL.line);
      d.text(
        `${this.generatedBodies ? "PNG正式v26" : "コード基準"}　${this.pageClock.toFixed(2)}秒${this.previewPaused ? "・停止" : ""}`,
        334,
        11,
        PAL.hint,
        8,
      );
      d.text("P 比較　T 停止　←→ 時刻　R 再生", 334, 23, PAL.dim, 7);
    }
    this.renderPageFade(d);
  }

  private renderStorehouseReturn(d: Display): void {
    renderStorehouse(d, {
      depleted: true,
      showSenaTag: true,
      playerName: this.playerName,
      background: this.storehouseBackground,
    });
    const idle: StoryPersonMotion = { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2 };
    this.drawHero(d, 210, 176, 1, idle);
    this.drawSena(d, 272, 176, -1, idle);
    drawSack(d, 238, 176, 0.82, "#b99a61", true);
    drawSack(d, 304, 176, 0.82, "#b99a61", true);

    // 採取路から届いた最初の樹脂瓶。富ではなく、冬を越す具体的な小ささに留める。
    d.rect(326, 162, 13, 14, "#5d4931");
    d.rect(328, 158, 9, 17, "#8fa06c");
    d.rect(330, 155, 5, 4, "#d4a866");
    d.rect(330, 161, 3, 7, "#72d6c0");

    windowBox(d, 16, 186, 448, 68);
    d.text("一袋多かった配給は、", 34, 201, PAL.ink);
    d.text("今度は、受け取る本人の前へ置かれた。", 34, 219, PAL.ink);
  }

  private renderVillageWalk(d: Display): void {
    renderVillageRoad(d, this.clock, { background: this.villageRoadBackground });
    const ctx = d.ctx;

    // 同じ村道を夕方の色へ寄せる。別の美しい村へ取り替えない。
    ctx.save();
    ctx.globalAlpha = 0.16;
    d.rect(0, 0, SCREEN_W, SCREEN_H, "#6f4665");
    ctx.globalAlpha = 0.22;
    d.rect(0, 112, SCREEN_W, 64, "#dfbd69");
    ctx.globalAlpha = 0.64;
    d.rect(0, 0, SCREEN_W, 99, "#102b30");
    ctx.restore();

    const walk = villageWalkStateAt(this.pageClock);
    this.drawHero(d, walk.heroX, 176, -1, walk.motion);
    this.drawSena(d, walk.senaX, 176, -1, walk.motion);

    const title = "余白の森";
    this.centerText(d, title, 24, PAL.ink, 25);
    this.centerText(d, "記憶は、すべて戻らなかった。", 62, PAL.dim, 11);
    this.centerText(d, "それでも二人は、もう一度友人になった。", 82, PAL.accentCool, 11);
  }

  private renderRoadToKingdom(d: Display): void {
    const ctx = d.ctx;
    d.clear("#081816");
    const sky = ctx.createLinearGradient(0, 0, 0, 176);
    sky.addColorStop(0, "#14213b");
    sky.addColorStop(0.55, "#315360");
    sky.addColorStop(1, "#b19a68");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SCREEN_W, 176);

    // 左は余白の森、右奥は王国。道だけが二つの色域をつなぐ。
    ctx.fillStyle = "#173229";
    ctx.beginPath();
    ctx.moveTo(0, 78);
    ctx.lineTo(54, 61);
    ctx.lineTo(104, 91);
    ctx.lineTo(151, 53);
    ctx.lineTo(214, 95);
    ctx.lineTo(260, 72);
    ctx.lineTo(305, 117);
    ctx.lineTo(0, 138);
    ctx.closePath();
    ctx.fill();
    for (const x of [8, 37, 72, 116, 164, 207, 252]) {
      d.rect(x, 82 + (x % 4) * 7, 9, 91, x % 3 === 0 ? "#1f4435" : "#102a23");
      d.rect(x - 12, 90 + (x % 5) * 5, 34, 6, "#28513f");
    }

    d.rect(0, 164, SCREEN_W, SCREEN_H - 164, "#263a31");
    d.rect(0, 176, SCREEN_W, SCREEN_H - 176, "#33483a");
    // 遠くで細く、手前で広い一本道。シリーズ3の目的地を矢印で説明しない。
    ctx.fillStyle = "#8f7b55";
    ctx.beginPath();
    ctx.moveTo(176, SCREEN_H);
    ctx.lineTo(372, 105);
    ctx.lineTo(388, 105);
    ctx.lineTo(328, SCREEN_H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#dfbd69";
    ctx.beginPath();
    ctx.moveTo(243, SCREEN_H);
    ctx.lineTo(378, 105);
    ctx.lineTo(383, 105);
    ctx.lineTo(273, SCREEN_H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // 遠い王国はまだ人物より小さい。塔の一つだけに校訂光を置く。
    d.rect(363, 82, 36, 23, "#31394d");
    d.rect(369, 68, 8, 37, "#464d61");
    d.rect(387, 60, 7, 45, "#3c4458");
    d.rect(366, 78, 30, 4, "#6d6f78");
    d.rect(389, 63, 3, 4, PAL.memory);
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = PAL.memory;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(381, 82, 29, -Math.PI * 0.88, Math.PI * 0.38);
    ctx.stroke();
    ctx.restore();

    const idle: StoryPersonMotion = { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2 };
    this.drawHero(d, 168, 196, 1, idle);
    this.drawSena(d, 220, 196, 1, idle);

    windowBox(d, 18, 16, 304, 102);
    d.text("指輪が守れるのは、一人だけ。", 34, 30, PAL.ink, 11);
    d.text("なら、この自由を", 34, 55, PAL.dim, 11);
    d.text("すべての人へ渡すには？", 34, 74, PAL.accent, 12);
    d.text("王国へ続く道が、森の向こうに開いた。", 34, 96, PAL.accentCool, 9);
  }

  private centerText(d: Display, text: string, y: number, color: string, size: number): void {
    const x = Math.round((SCREEN_W - d.measure(text, size)) / 2);
    d.text(text, x + 1, y + 1, PAL.shadow, size);
    d.text(text, x, y, color, size);
  }

  private drawHero(
    d: Display, x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): void {
    const drawn = this.generatedBodies && this.characterLayer?.drawHero(d, x, bottom, facing, motion);
    if (!drawn) drawStoryPerson(d, x, bottom, "heroAdult", facing, false, motion);
  }

  private drawSena(
    d: Display, x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): void {
    const drawn = this.generatedBodies && this.characterLayer?.drawSena(d, x, bottom, facing, false, motion);
    if (!drawn) drawStoryPerson(d, x, bottom, "sena", facing, false, motion);
  }

  private renderPageFade(d: Display): void {
    const alpha = 1 - clamp01(this.pageClock / 0.42);
    if (alpha <= 0) return;
    d.ctx.save();
    d.ctx.globalAlpha = alpha;
    d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.bg);
    d.ctx.restore();
  }
}
