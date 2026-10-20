import { Display } from "../core/display.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { drawBoundaryBeast, drawStoryPerson } from "../fx/storyArt.ts";
import { renderForestEntranceScene } from "../fx/forestEntrance.ts";
import { renderBattleBackdrop } from "../fx/battleBackdrop.ts";
import { Player } from "../game/player.ts";
import { DialogueBox } from "../ui/dialogueBox.ts";
import { bar, explorationHud, windowBox } from "../ui/hud.ts";

const TRIALS = [
  { name: "主人公・茶髪", url: "/docs/concepts/hero-pixen-clean-v20.png", width: 32, height: 48, foot: 44, center: 14 },
  { name: "白樹の獣", url: "/docs/concepts/boundary-beast-pixen-clean-v20.png", width: 80, height: 64, foot: 61, center: 39 },
  { name: "不採用の水色試作", url: "/docs/concepts/hero-pixen-sky-v21.png", width: 32, height: 48, foot: 44, center: 14 },
  { name: "セナ・素顔", url: "/docs/concepts/sena-pixen-groundless-v22.png", width: 32, height: 48, foot: 46, center: 15 },
  { name: "獣の姿勢・不合格案", url: "/docs/concepts/boundary-beast-pixen-kneel-v22.png", width: 80, height: 64, foot: 59, center: 39 },
  { name: "セナ・仮面", url: "/docs/concepts/sena-pixen-masked-v22.png", width: 32, height: 48, foot: 46, center: 15 },
] as const;

/** DEV限定の静止画比較。本編・ユーザーのPlayer・保存へ接続しない。 */
export class CharacterArtPreviewScene implements Scene {
  private clock = 0;
  private mode = 0;
  private heroSpot = 0;
  private facing: -1 | 1 = 1;
  private generated = true;
  private yielding = false;
  private senaVisible = false;
  private dialogueVisible = false;
  private readonly player = new Player();
  private readonly dialogue = new DialogueBox();
  private readonly sprites = TRIALS.map((trial) => {
    const image = new Image();
    image.src = trial.url;
    return image;
  });

  constructor(private readonly onBack: () => void, private readonly backgrounds: ImageMap) {
    this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, [
      "森の光の下で、並んで立つ姿を確かめる。", "※ 静止画の比較用。物語の進行は変更しません。",
    ]);
    this.dialogue.update(60);
  }

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    for (const key of keys) {
      if (key === "Escape") { this.onBack(); return; }
      if (key === "Tab") this.mode = (this.mode + 1) % 6;
      if (/^[1-6]$/.test(key)) this.mode = Number(key) - 1;
      if (key === "ArrowLeft") this.facing = -1;
      if (key === "ArrowRight") this.facing = 1;
      if (key.toUpperCase() === "G") this.generated = !this.generated;
      if (key.toUpperCase() === "U") this.dialogueVisible = !this.dialogueVisible;
      if (key.toUpperCase() === "P") this.heroSpot = (this.heroSpot + 1) % 3;
      if (key.toUpperCase() === "Y") this.yielding = !this.yielding;
      if (key.toUpperCase() === "S") this.senaVisible = !this.senaVisible;
    }
  }

  render(d: Display): void {
    if (this.mode === 0) this.renderForest(d);
    else if (this.mode === 1) this.renderInspection(d);
    else if (this.mode === 2) this.renderBattle(d);
    else if (this.mode === 3) this.renderHairComparison(d);
    else if (this.mode === 4) this.renderSenaComparison(d);
    else this.renderBeastPoses(d);
    if (this.mode !== 2) {
      windowBox(d, 14, 8, 452, 43);
      d.text("キャラ生成比較 v22（本番未採用・静止画）", 25, 16, PAL.accentCool, 11);
      d.text("1 森　2 拡大　3 戦闘　4 髪色　5 セナ　6 獣姿勢　←→ 向き　ESC", 25, 34, PAL.hint, 8);
    }
    const failed = TRIALS.filter((_, i) => !this.ready(i));
    if (failed.length) {
      windowBox(d, 18, 56, 444, 25);
      d.text(`読込待ち・寸法エラー: ${failed.map((trial) => trial.name).join(" / ")}`, 28, 64, PAL.danger, 9);
    }
  }

  private ready(index: number): boolean {
    const image = this.sprites[index]!;
    const trial = TRIALS[index]!;
    return image.complete && image.naturalWidth === trial.width && image.naturalHeight === trial.height;
  }

  private sprite(d: Display, index: number, x: number, bottom: number, scale = 1): void {
    if (!this.ready(index)) return;
    const image = this.sprites[index]!;
    const trial = TRIALS[index]!;
    if (this.mode === 0 || this.mode === 2) {
      d.ctx.save(); d.ctx.globalAlpha = 0.3; d.ctx.fillStyle = PAL.shadow;
      d.ctx.beginPath(); d.ctx.ellipse(x, bottom + 1, index === 1 || index === 4 ? 27 : 12, 3, 0, 0, Math.PI * 2);
      d.ctx.fill(); d.ctx.restore();
    }
    // 32×48/80×64の生成原本を、整数倍率のみで表示。切り抜き・色変更はしない。
    d.ctx.save();
    d.ctx.translate(x, bottom);
    d.ctx.scale(this.facing * scale, scale);
    d.ctx.drawImage(image, -trial.center, -trial.foot, trial.width, trial.height);
    d.ctx.restore();
  }

  private renderForest(d: Display): void {
    renderForestEntranceScene(d, this.clock, this.backgrounds);
    const heroX = [152, 214, 334][this.heroSpot]!;
    drawStoryPerson(d, 70, 176, "heroAdult", this.facing, false, { mode: "idle", frame: 0 });
    this.sprite(d, 0, heroX, 176);
    if (this.senaVisible) {
      this.sprite(d, 3, 280, 176);
      this.sprite(d, 5, 392, 176);
    } else {
      this.codeBeast(d, 280, 176);
      this.sprite(d, 1, 392, 176);
    }
    for (const [x, name] of [[70, "主人公・原型"], [heroX, "主人公・生成"], [280, this.senaVisible ? "セナ・素顔" : "獣・原型"], [392, this.senaVisible ? "セナ・仮面" : "獣・生成"]] as const) {
      this.label(d, x, 93, name);
    }
    if (this.dialogueVisible) this.dialogue.render(d);
    else {
      windowBox(d, 18, 210, 444, 43);
      d.text("同じ足元・原本1px＝設計1px。大きさを合わせる縮小はしません。", 30, 220, PAL.ink, 9);
      d.text("静止画のみ。P 主人公位置　U 会話窓　S セナ/獣　←→ 向き", 30, 236, PAL.hint, 9);
    }
  }

  private renderInspection(d: Display): void {
    d.clear("#10231e");
    d.rect(14, 64, 202, 184, "#eee3c3");
    d.rect(226, 64, 240, 184, "#233e37");
    // 主人公は3倍、獣は2倍。実ゲーム倍率ではないことを明記する。
    this.sprite(d, 0, 110, 232, 3);
    this.sprite(d, 1, 346, 232, 2);
    d.text("主人公：検査3倍", 39, 70, "#263d32", 10);
    d.text("白樹の獣：検査2倍", 259, 70, PAL.ink, 10);
    d.rect(25, 232, 180, 1, "#a17741");
    d.rect(239, 232, 212, 1, "#a9bd80");
    d.text("ベタ面で透過の抜け・縁・足元を検査", 114, 257, PAL.hint, 9);
  }

  private renderBattle(d: Display): void {
    renderBattleBackdrop(d, this.clock, "forest", "boundary");
    d.text("白樹の獣", 211, 12, PAL.ink, 12);
    d.text(this.yielding ? "姿勢比較" : "警戒", 133, 33, PAL.dim, 10);
    bar(d, 183, 33, 145, 5, this.yielding ? 0 : 1, PAL.accentCool);
    if (this.generated) this.sprite(d, this.yielding ? 4 : 1, 240, 130);
    else this.codeBeast(d, 240, 130, this.yielding);
    windowBox(d, 18, 138, 444, 64);
    d.text(this.generated ? "PixelLab候補・戦闘配置の比較" : "現行コード・戦闘配置の比較", 30, 149, PAL.accent, 10);
    d.text(this.yielding && this.generated ? "不合格：前脚が立ったまま。道を譲る姿には採用しません。" : "本編の道を譲る演出はコード版を維持。PNG接続は未実施。", 30, 174, this.yielding && this.generated ? PAL.danger : PAL.ink, 9);
    d.text("1〜6 画面　Y 警戒/譲る　G 原型/生成　←→ 向き　ESC", 30, 190, PAL.hint, 8);
    // プレイヤー情報も本編と同じ部品で置く。戦闘処理を進行する画面ではない。
    d.ctx.save(); d.ctx.translate(0, 202); explorationHud(d, this.player); d.ctx.restore();
  }

  private renderHairComparison(d: Display): void {
    d.clear(PAL.panel);
    d.rect(14, 64, 218, 184, "#eee3c3");
    d.rect(248, 64, 218, 184, "#eee3c3");
    this.sprite(d, 0, 123, 232, 3);
    this.sprite(d, 2, 357, 232, 3);
    d.text("採用する方向：茶髪", 43, 74, "#263d32", 10);
    d.text("不採用の試作：水色", 277, 74, "#263d32", 10);
    d.rect(30, 232, 186, 1, "#a17741");
    d.rect(264, 232, 186, 1, "#a17741");
    d.text("主人公は元の茶髪を採用。水色は比較履歴としてのみ残す。", 30, 257, PAL.hint, 9);
  }

  private renderSenaComparison(d: Display): void {
    d.clear(PAL.panel);
    for (const x of [14, 168, 322]) d.rect(x, 64, 144, 184, "#eee3c3");
    this.sprite(d, 0, 86, 232, 3);
    this.sprite(d, 3, 240, 232, 3);
    this.sprite(d, 5, 394, 232, 3);
    d.text("主人公・元の茶髪", 30, 74, "#263d32", 9);
    d.text("セナ・素顔試作", 190, 74, "#263d32", 9);
    d.text("セナ・仮面試作", 344, 74, "#263d32", 9);
    for (const x of [24, 178, 332]) d.rect(x, 232, 124, 1, "#a17741");
    d.text("検査3倍・接地補正あり。指輪は別層。1→S で森の縮尺を比較。", 24, 257, PAL.hint, 9);
  }

  private renderBeastPoses(d: Display): void {
    d.clear(PAL.panel);
    for (const x of [14, 248]) d.rect(x, 64, 218, 184, "#233e37");
    this.sprite(d, 1, 123, 232, 2);
    this.sprite(d, 4, 357, 232, 2);
    d.text("警戒：v20の基準", 55, 74, PAL.ink, 10);
    d.text("不合格：前脚が立つ", 277, 74, PAL.danger, 10);
    for (const x of [30, 264]) d.rect(x, 232, 186, 1, "#a9bd80");
    d.text("検査2倍・足元2px補正。首だけでは不十分。本編はコード版を維持。", 18, 257, PAL.hint, 9);
  }

  private codeBeast(d: Display, x: number, bottom: number, yielding = false): void {
    d.ctx.save(); d.ctx.translate(x, 0); d.ctx.scale(this.facing, 1);
    drawBoundaryBeast(d, 0, bottom, 0, yielding); d.ctx.restore();
  }

  private label(d: Display, x: number, y: number, text: string): void {
    const width = d.measure(text, 8) + 12;
    d.rect(x - width / 2, y, width, 14, PAL.panel);
    d.text(text, x - width / 2 + 6, y + 3, PAL.ink, 8);
  }
}
