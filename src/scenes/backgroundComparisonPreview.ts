import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import {
  drawForestEnemy,
  drawForestEntranceAtmosphere,
  drawForestEntranceTracks,
  drawStoryPerson,
  isVillageGateBackgroundReady,
  isVillageRoadBackgroundReady,
  renderDeepForest,
  renderForestEntrance,
  renderVillageGate,
  renderRuinInterior,
  renderShallowForest,
  renderVillageRoad,
  type StoryPersonMotion,
} from "../fx/storyArt.ts";
import { Player } from "../game/player.ts";
import { renderForestEntranceLayers } from "../fx/forestEntranceLayers.ts";
import type { StoryCharacterLayer } from "../fx/storyCharacterLayer.ts";
import { DialogueBox } from "../ui/dialogueBox.ts";
import { explorationHud, windowBox } from "../ui/hud.ts";
import { ForestBoundaryPreviewScene } from "./forestBoundaryPreview.ts";

type BackgroundEntry = {
  label: string;
  objective: string;
  render: (d: Display, t: number) => void;
};

const BACKGROUNDS: readonly BackgroundEntry[] = [
  { label: "村", objective: "村門で狩人に話す", render: renderVillageRoad },
  { label: "浅い森", objective: "戻らない狩人を捜す", render: (d, t) => renderShallowForest(d, t, "edge") },
  { label: "深い森", objective: "守護樹の先へ進む", render: (d, t) => renderDeepForest(d, t, "knot") },
  { label: "遺跡", objective: "指輪の工房を探す", render: (d, t) => renderRuinInterior(d, t, "garden") },
];

type PreviewBuffer = { canvas: HTMLCanvasElement; display: Display };

// 開発サーバーでのみ読む資料。importや本番Manifestには入れず、配布画像にしない。
const FOREST_TRIALS = [
  { label: "PixelLab A・接地未合格", url: "/docs/concepts/forest-edge-pixellab-a-v1.png", height: 270 },
  { label: "PixelLab B・接地未合格", url: "/docs/concepts/forest-edge-pixellab-b-v1.png", height: 270 },
  { label: "配置C・地面分離", url: "/docs/concepts/forest-edge-ground-v18.png", height: 128 },
] as const;
const HERO_POSITIONS = [220, 114, 382] as const;
const VILLAGE_STATES = ["到着前", "行商人到着", "日付判明"] as const;
const VILLAGE_GATE_STATES = ["初期", "警告後", "出発後"] as const;

function makeBuffer(): PreviewBuffer {
  const canvas = document.createElement("canvas");
  const display = new Display(canvas);
  return { canvas, display };
}

/** DEV専用。4地域を同じ人物・UI・縮尺条件で比べる背景板。 */
export class BackgroundComparisonPreviewScene implements Scene {
  private boundaryPreview: ForestBoundaryPreviewScene | null = null;
  private clock = 0;
  private selected: number | null = null;
  private referenceView: "off" | "clean" | "guide" = "off";
  private exportDialog: HTMLDialogElement | null = null;
  private forestSource = 0;
  private forestUi = 0;
  private heroPosition = 0;
  private atmosphere = true;
  private villageCandidate = true;
  private villagePlace: "road" | "gate" = "road";
  private villageState = 0;
  private villageGateState = 0;
  private villageClean = false;
  private readonly previewPlayer = new Player();
  private readonly dialogue = new DialogueBox();
  private readonly trialImages = FOREST_TRIALS.map((trial) => {
    const image = new Image();
    image.src = trial.url;
    return image;
  });
  private readonly buffers = BACKGROUNDS.map(() => makeBuffer());

  constructor(
    private readonly onBack: () => void,
    private readonly characters: StoryCharacterLayer,
    private readonly villageRoadBackground?: HTMLImageElement,
    private readonly villageGateBackground?: HTMLImageElement,
    private readonly forestBoundaryBackground?: HTMLImageElement,
    private readonly dryCreekBackground?: HTMLImageElement,
    private readonly snarePathBackground?: HTMLImageElement,
    private readonly fallenBridgeBackground?: HTMLImageElement,
    private readonly hunterCampBackground?: HTMLImageElement,
    private readonly guardianHollowBackground?: HTMLImageElement,
    private readonly rootHollowEntryBackground?: HTMLImageElement,
    private readonly echoGalleryBackground?: HTMLImageElement,
    private readonly rootHeartBackground?: HTMLImageElement,
    private readonly deepForestBackground?: HTMLImageElement,
    private readonly knotTreeBackground?: HTMLImageElement,
    private readonly ruinApproachBackground?: HTMLImageElement,
  ) {}

  update(dt: number, keys: string[]): void {
    if (this.boundaryPreview) { this.boundaryPreview.update(dt, keys); return; }
    if (this.exportDialog) return;
    this.clock += dt;
    this.dialogue.update(dt);
    for (const key of keys) {
      if (key.toLowerCase() === "b") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.forestBoundaryBackground);
        return;
      }
      if (key.toLowerCase() === "r") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.dryCreekBackground, "creek");
        return;
      }
      if (key.toLowerCase() === "t") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.snarePathBackground, "snare");
        return;
      }
      if (key.toLowerCase() === "y") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.fallenBridgeBackground, "bridge");
        return;
      }
      if (key.toLowerCase() === "k") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.hunterCampBackground, "camp");
        return;
      }
      if (key.toLowerCase() === "l") {
        const previous = new Image();
        previous.src = "/docs/concepts/hunter-camp-game-palette-v42.png";
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, previous, "camp", "旧写実版 v43");
        return;
      }
      if (key.toLowerCase() === "j") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.guardianHollowBackground, "hollow");
        return;
      }
      if (key.toLowerCase() === "n") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.rootHollowEntryBackground, "rootEntry");
        return;
      }
      if (key.toLowerCase() === "o") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.echoGalleryBackground, "echoGallery");
        return;
      }
      if (key.toLowerCase() === "i") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.rootHeartBackground, "rootHeart");
        return;
      }
      if (key.toLowerCase() === "d") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.deepForestBackground, "deepForest");
        return;
      }
      if (key.toLowerCase() === "q") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.knotTreeBackground, "knotTree");
        return;
      }
      if (key.toLowerCase() === "a") {
        this.boundaryPreview = new ForestBoundaryPreviewScene(() => { this.boundaryPreview = null; }, this.ruinApproachBackground, "ruinApproach");
        return;
      }
      if (key === "Escape") {
        if (this.selected !== null) { this.selected = null; this.referenceView = "off"; sfx.play("cancel"); }
        else { sfx.play("cancel"); this.onBack(); }
        return;
      }
      if (key === "Tab") { this.selected = null; this.referenceView = "off"; sfx.play("page"); }
      if (this.selected === 0 && key.toLowerCase() === "g") {
        this.villageCandidate = !this.villageCandidate;
        sfx.play("page");
      }
      if (this.selected === 0 && key.toLowerCase() === "u") {
        if (this.villagePlace === "road") {
          this.villageState = (this.villageState + 1) % VILLAGE_STATES.length;
        } else {
          this.villageGateState = (this.villageGateState + 1) % VILLAGE_GATE_STATES.length;
        }
        sfx.play("page");
      }
      if (this.selected === 0 && key.toLowerCase() === "v") {
        this.villagePlace = this.villagePlace === "road" ? "gate" : "road";
        sfx.play("page");
      }
      if (this.selected === 0 && key.toLowerCase() === "c") {
        this.villageClean = !this.villageClean;
        sfx.play("page");
      }
      if (this.selected === 1 && key.toLowerCase() === "c") {
        this.referenceView = this.referenceView === "off" ? "clean" : this.referenceView === "clean" ? "guide" : "off";
        sfx.play("page");
      }
      if (this.selected === 1 && key.toLowerCase() === "s") this.exportEntranceReference();
      if (this.selected === 1 && key.toLowerCase() === "e") this.exportForestComposite();
      if (this.selected === 1 && key.toLowerCase() === "m") this.exportForestMaterial();
      if (this.selected === 1 && key.toLowerCase() === "g") {
        this.forestSource = (this.forestSource + 1) % (FOREST_TRIALS.length + 1);
        sfx.play("page");
      }
      if (this.selected === 1 && key.toLowerCase() === "u") {
        this.forestUi = (this.forestUi + 1) % 3;
        // 本編と同じ窓・本文を使う。進行フラグやユーザーの保存には触れない。
        this.dialogue.open({ name: "", color: PAL.ink, talks: [] }, this.forestUi === 1
          ? ["泥に残る靴跡は二人分。", "その周囲を、獣の足跡が囲んでいる。"]
          : ["苔をまとった狼が道へ回り込んだ。", "牙は森の奥ではなく、村側へ向いている。"]);
        this.dialogue.update(60);
        sfx.play("page");
      }
      if (this.selected === 1 && key.toLowerCase() === "p") {
        this.heroPosition = (this.heroPosition + 1) % HERO_POSITIONS.length;
        sfx.play("page");
      }
      if (this.selected === 1 && key.toLowerCase() === "f") {
        this.atmosphere = !this.atmosphere;
        sfx.play("page");
      }
      const number = Number.parseInt(key, 10);
      if (number >= 1 && number <= BACKGROUNDS.length) {
        this.selected = number - 1;
        this.referenceView = "off";
        sfx.play("confirm");
      }
      if (this.selected !== null && key === "ArrowLeft") {
        this.selected = (this.selected + BACKGROUNDS.length - 1) % BACKGROUNDS.length;
        this.referenceView = "off";
        sfx.play("page");
      }
      if (this.selected !== null && key === "ArrowRight") {
        this.selected = (this.selected + 1) % BACKGROUNDS.length;
        this.referenceView = "off";
        sfx.play("page");
      }
    }
  }

  render(d: Display): void {
    if (this.boundaryPreview) { this.boundaryPreview.render(d); return; }
    const motion: StoryPersonMotion = { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2 };
    if (this.selected === 1 && this.referenceView !== "off") {
      this.renderForestBase(d, true);
      if (this.referenceView === "guide") this.renderEntranceGuide(d);
      return;
    }
    if (this.selected === 1) {
      this.renderForestTrial(d, motion);
      return;
    }
    if (this.selected === 0) {
      if (this.villagePlace === "road") this.renderVillageTrial(d, motion);
      else this.renderVillageGateTrial(d, motion);
      return;
    }
    if (this.selected !== null) {
      const entry = BACKGROUNDS[this.selected]!;
      this.renderSample(d, entry, motion);
      this.header(d, `${this.selected + 1}　${entry.label}`, "←→ 地域　TAB 4面　ESC 4面");
      return;
    }

    d.clear("#071411");
    for (let i = 0; i < BACKGROUNDS.length; i++) {
      const entry = BACKGROUNDS[i]!;
      const buffer = this.buffers[i]!;
      this.renderSample(buffer.display, entry, motion);
      const x = (i % 2) * (SCREEN_W / 2);
      const y = Math.floor(i / 2) * (SCREEN_H / 2);
      d.ctx.save();
      d.ctx.beginPath();
      d.ctx.rect(x, y, SCREEN_W / 2, SCREEN_H / 2);
      d.ctx.clip();
      d.ctx.imageSmoothingEnabled = false;
      d.ctx.drawImage(buffer.canvas, 0, 0, buffer.canvas.width, buffer.canvas.height, x, y, SCREEN_W / 2, SCREEN_H / 2);
      d.ctx.restore();
      d.rect(x + 5, y + 5, 77, 16, PAL.panel);
      d.frame(x + 5, y + 5, 77, 16, PAL.line);
      d.text(`${i + 1} ${entry.label}`, x + 11, y + 8, PAL.ink, 9);
    }
    d.rect(20, SCREEN_H - 18, 440, 14, PAL.panel);
    d.frame(20, SCREEN_H - 18, 440, 14, PAL.line);
    d.text("B境界 R沢 T罠 Y橋 K野営 J窪地 N根洞 O反響 I心部 D深森 Q結木 A遺跡前", 24, SCREEN_H - 16, PAL.hint, 8);
  }

  private renderSample(d: Display, entry: BackgroundEntry, motion: StoryPersonMotion): void {
    entry.render(d, this.clock);
    this.drawHero(d, 240, motion);
    windowBox(d, 18, 205, 444, 50);
    d.text(`目的　${entry.objective}`, 34, 215, PAL.ink, 10);
    d.text("← → 移動　ENTER 調べる　ESC メニュー", 34, 233, PAL.hint, 10);
  }

  private villageTrialReady(): boolean {
    return isVillageRoadBackgroundReady(this.villageRoadBackground);
  }

  private renderVillageTrial(d: Display, motion: StoryPersonMotion): void {
    const candidateReady = this.villageTrialReady();
    const options = {
      merchantArrived: this.villageState >= 1,
      fireDateKnown: this.villageState >= 2,
    };
    if (this.villageCandidate && candidateReady) {
      if (this.villageClean) {
        d.clear();
        d.ctx.save();
        d.ctx.imageSmoothingEnabled = false;
        d.ctx.drawImage(this.villageRoadBackground!, 0, 0, SCREEN_W, SCREEN_H);
        d.ctx.restore();
      } else {
        renderVillageRoad(d, this.clock, { ...options, background: this.villageRoadBackground });
      }
    } else {
      renderVillageRoad(d, this.clock, this.villageClean ? {} : options);
    }

    if (!this.villageClean) {
      this.drawHero(d, 240, motion);
      windowBox(d, 18, 205, 444, 50);
      d.text("目的　村門で狩人に話す", 34, 215, PAL.ink, 10);
      d.text("← → 移動　ENTER 調べる　ESC メニュー", 34, 233, PAL.hint, 10);
    }

    windowBox(d, 176, 10, 288, 45);
    const source = this.villageCandidate
      ? candidateReady ? "正式・欧州農村屋根v31" : "正式背景読込待ち"
      : "コード基準";
    d.text(`村道　${source}`, 187, 17, PAL.accentCool, 8);
    d.text(`G 背景　V 村道　U ${VILLAGE_STATES[this.villageState]}　C ${this.villageClean ? "静景" : "合成"}`, 187, 33, PAL.hint, 8);
  }

  private villageGateTrialReady(): boolean {
    return isVillageGateBackgroundReady(this.villageGateBackground);
  }

  private renderVillageGateTrial(d: Display, motion: StoryPersonMotion): void {
    const candidateReady = this.villageGateTrialReady();
    const options = {
      disturbed: true,
      warningKnown: this.villageGateState >= 1,
      borderOpen: this.villageGateState >= 2,
      hunterDeparted: this.villageGateState >= 2,
    };
    if (this.villageCandidate && candidateReady) {
      if (this.villageClean) {
        d.clear();
        d.ctx.save();
        d.ctx.imageSmoothingEnabled = false;
        d.ctx.drawImage(this.villageGateBackground!, 0, 0, SCREEN_W, SCREEN_H);
        d.ctx.restore();
      } else {
        renderVillageGate(d, this.clock, { ...options, background: this.villageGateBackground });
      }
    } else {
      renderVillageGate(d, this.clock, options);
    }

    if (!this.villageClean) {
      this.drawHero(d, 205, motion);
      windowBox(d, 18, 205, 444, 50);
      d.text("目的　森の異変を狩人に聞く", 34, 215, PAL.ink, 10);
      d.text("門の状態だけを切替／本番・保存は変更しません", 34, 233, PAL.hint, 10);
    }

    windowBox(d, 176, 10, 288, 45);
    const source = this.villageCandidate
      ? candidateReady ? "正式・欧州農村境界v33" : "正式背景読込待ち"
      : "コード基準";
    d.text(`村門　${source}`, 187, 17, PAL.accentCool, 8);
    d.text(`G 背景　V 村門　U ${VILLAGE_GATE_STATES[this.villageGateState]}　C ${this.villageClean ? "静景" : "合成"}`, 187, 33, PAL.hint, 8);
  }

  private drawHero(d: Display, x: number, motion: StoryPersonMotion): void {
    if (!this.characters.drawHero(d, x, 176, 1, motion)) {
      drawStoryPerson(d, x, 176, "heroAdult", 1, false, motion);
    }
  }

  private forestSourceLabel(): string {
    if (this.forestSource === 0) return "コード版";
    const image = this.trialImages[this.forestSource - 1]!;
    if (!image.complete) return "読込中（コードで仮表示）";
    if (!this.trialImageReady(this.forestSource - 1)) return "画像エラー（コードで仮表示）";
    if (this.forestSource === 3 && !this.trialImageReady(0)) return "元背景エラー（コードで仮表示）";
    return FOREST_TRIALS[this.forestSource - 1]!.label;
  }

  private trialImageReady(index: number): boolean {
    const image = this.trialImages[index]!;
    return image.complete && image.naturalWidth === SCREEN_W && image.naturalHeight === FOREST_TRIALS[index]!.height;
  }

  private renderForestBase(d: Display, clean: boolean): void {
    const image = this.forestSource === 0 ? undefined : this.trialImages[this.forestSource - 1];
    if (!image || !this.trialImageReady(this.forestSource - 1)
      || (this.forestSource === 3 && !this.trialImageReady(0))) {
      renderForestEntrance(d, this.clock, { atmosphere: !clean && this.atmosphere, tracks: !clean });
      return;
    }
    // 原本480×270をデザイン座標へ1:1、内部Canvasへnearestの整数2倍で描く。
    if (this.forestSource === 3) renderForestEntranceLayers(d, this.trialImages[0]!, image);
    else {
      d.clear();
      d.ctx.drawImage(image, 0, 0, SCREEN_W, SCREEN_H);
    }
    if (!clean) {
      drawForestEntranceTracks(d, this.forestSource === 3 ? { sole: "#473a2c", paw: "#342e28" } : undefined);
      if (this.atmosphere) drawForestEntranceAtmosphere(d, this.clock);
    }
  }

  private renderForestTrial(d: Display, motion: StoryPersonMotion, controls = true): void {
    this.renderForestBase(d, false);
    drawForestEnemy(d, 302, 176, this.clock, "moss_wolf", -1);
    this.drawHero(d, HERO_POSITIONS[this.heroPosition]!, motion);
    if (this.forestUi === 0) {
      explorationHud(d, this.previewPlayer);
      windowBox(d, 18, 205, 444, 50);
      d.text("目的　戻らない狩人を捜す", 34, 215, PAL.ink, 10);
      d.text("比較専用　移動はP／本番・保存は変更しません", 34, 233, PAL.hint, 10);
    } else this.dialogue.render(d);

    if (!controls) return;
    windowBox(d, 166, 12, 298, 59);
    d.text(`森入口　${this.forestSourceLabel()}`, 177, 20, PAL.accentCool, 10);
    d.text(`G 背景　U 会話　P 位置　F 光:${this.atmosphere ? "有" : "無"}`, 177, 38, PAL.hint, 8);
    d.text("C 静景　S 構図　E 合成　M 素材PNG　TAB 4面", 177, 53, PAL.hint, 8);
  }

  private header(d: Display, title: string, help: string): void {
    windowBox(d, 18, 12, 444, 32);
    d.text(`背景比較　${title}`, 30, 20, PAL.accentCool, 10);
    d.textRight(help, 450, 20, PAL.hint, 8);
  }

  private renderEntranceGuide(d: Display): void {
    // 素材へ渡さない検査線。足元176、会話窓182、左の境界と右の森を固定する。
    d.frame(24, 128, 420, 49, PAL.accent);
    d.rect(24, 176, 420, 1, PAL.accentCool);
    d.frame(16, 182, 448, 76, PAL.accentCool);
    d.frame(94, 146, 84, 40, "#c5a375");
    windowBox(d, 14, 12, 452, 48);
    d.text(`構図ガイド　${this.forestSourceLabel()}`, 26, 21, PAL.ink, 10);
    d.text("足元176／会話182〜258／足跡132／狼302", 26, 39, PAL.dim, 10);
    d.text("C 表示切替　S 文字なしPNGを書出　TAB 4面", 30, 240, PAL.ink, 10);
  }

  private exportEntranceReference(): void {
    if (this.exportDialog) return;
    const buffer = this.buffers[1]!;
    // 表示モードにかかわらず、書き出すのは静的背景だけ。UIと検査線の混入を防ぐ。
    renderForestEntrance(buffer.display, 0, { atmosphere: false, tracks: false });
    this.openImageExport(buffer, {
      file: "forest-edge-layout-reference-v16.png",
      title: "森入口・生成用の静的背景",
      dialog: "森入口の構図PNG書き出し",
      save: "森入口の原寸PNGを保存（960×540）",
      alt: "人物・足跡・光・文字を含まない森入口の構図参照",
    });
  }

  private exportForestComposite(): void {
    if (this.exportDialog) return;
    const buffer = this.buffers[1]!;
    this.renderForestTrial(buffer.display, { mode: "idle", frame: 0 }, false);
    this.openImageExport(buffer, {
      file: `forest-edge-composite-${this.forestSource}-v19.png`,
      title: `森入口・開発比較（素材原本ではありません）　${this.forestSourceLabel()}`,
      dialog: "森入口の合成PNG書き出し",
      save: "現在の合成PNGを保存（960×540）",
      alt: "選択した景観に人物・狼・足跡と会話または探索HUDを重ねた開発用比較",
    });
  }

  private exportForestMaterial(): void {
    // 素材書出だけは読込失敗をコード版で代替しない。別の背景の誤採用を防ぐ。
    if (this.exportDialog) return;
    if (this.forestSource !== 3 || !this.trialImageReady(0) || !this.trialImageReady(2)) {
      sfx.play("denied");
      return;
    }
    const buffer = this.buffers[1]!;
    renderForestEntranceLayers(buffer.display, this.trialImages[0]!, this.trialImages[2]!);
    this.openImageExport(buffer, {
      file: "forest-edge-middle-v19.png",
      title: "森入口・配置Cの静的素材（人物・足跡・光・UIなし）",
      dialog: "森入口の素材PNG書き出し",
      save: "森入口の静的素材を保存（960×540）",
      alt: "配置Cの森林と地面だけを合成した960×540の背景素材",
    });
  }

  private openImageExport(buffer: PreviewBuffer, copy: {
    file: string; title: string; dialog: string; save: string; alt: string;
  }): void {
    const link = document.createElement("a");
    link.href = buffer.canvas.toDataURL("image/png");
    link.download = copy.file;
    link.textContent = copy.save;
    link.style.cssText = "color:#72d6c0;display:inline-block;padding:12px 0";

    // ダウンロードを扱わない埋め込みブラウザでも、原寸画像と保存リンクを確認できる。
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", copy.dialog);
    dialog.style.cssText = "max-width:960px;width:85vw;background:#10231e;color:#edf3e7;border:1px solid #72d6c0;padding:16px;font:14px sans-serif";
    const heading = document.createElement("h2");
    heading.textContent = copy.title;
    heading.style.cssText = "font-size:18px;margin:0 0 12px";
    const preview = document.createElement("img");
    preview.src = link.href;
    preview.alt = copy.alt;
    preview.width = buffer.canvas.width;
    preview.height = buffer.canvas.height;
    preview.style.cssText = "display:block;width:100%;height:auto;image-rendering:pixelated";
    const close = document.createElement("button");
    close.textContent = "比較画面へ戻る";
    close.style.cssText = "display:block;padding:8px 16px;background:#24463c;color:#edf3e7;border:1px solid #72d6c0";
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      this.exportDialog = null;
    });
    dialog.append(heading, preview, link, close);
    document.body.append(dialog);
    this.exportDialog = dialog;
    dialog.showModal();
    sfx.play("confirm");
  }
}
