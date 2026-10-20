import type { Audio } from "../core/audio.ts";
import type { Display } from "../core/display.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import type { Keyboard } from "../core/input.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { DEEP_FOREST_BACKGROUND_ID, DRY_CREEK_BACKGROUND_ID, ECHO_GALLERY_BACKGROUND_ID, FALLEN_BRIDGE_BACKGROUND_ID, FOREST_BOUNDARY_BACKGROUND_ID, GUARDIAN_HOLLOW_BACKGROUND_ID, HUNTER_CAMP_BACKGROUND_ID, KNOT_TREE_BACKGROUND_ID, ROOT_HEART_BACKGROUND_ID, ROOT_HOLLOW_ENTRY_BACKGROUND_ID, RUIN_APPROACH_BACKGROUND_ID, SNARE_PATH_BACKGROUND_ID } from "../core/series2Assets.ts";
import { renderFallenBridge } from "../fx/fallenBridge.ts";
import { renderHunterCamp } from "../fx/hunterCamp.ts";
import { renderGuardianHollow } from "../fx/guardianHollow.ts";
import { renderRootHollowEntry } from "../fx/rootHollowEntry.ts";
import { renderEchoGallery } from "../fx/echoGallery.ts";
import { renderRootHeart } from "../fx/rootHeart.ts";
import { renderDeepForestPath } from "../fx/deepForestPath.ts";
import { renderKnotTree } from "../fx/knotTree.ts";
import { renderRuinApproach } from "../fx/ruinApproach.ts";
import { renderDryCreek } from "../fx/dryCreek.ts";
import { renderSnarePath } from "../fx/snarePath.ts";
import { isForestBoundaryBackgroundReady, renderForestBoundary } from "../fx/storyArt.ts";
import { Player } from "../game/player.ts";
import { panelById } from "../sideview/data.ts";
import { SideViewScene } from "../sideview/scene.ts";
import type { SideViewState } from "../sideview/types.ts";
import { windowBox } from "../ui/hud.ts";

const STATES = [
  { label: "獣との対峙", x: 298, flags: ["border_open"], objective: "白い木の境を確かめる" },
  { label: "戦闘後", x: 350, flags: ["border_open", "intro_battle_won"], objective: "村へ戻り、森へ入る支度を整える" },
  { label: "セナと帰還", x: 346, flags: ["border_open", "intro_battle_won", "chapter2_started", "ring_left_with_sena"], objective: "セナと境界を決める" },
] as const;
const CREEK_STATES = [
  { label: "狼との対峙", x: 144, flags: ["intro_battle_won", "chapter2_started", "forest_entry_seen"], objective: "涸れ沢で狩人を捜す" },
  { label: "狩人の救出", x: 302, flags: ["intro_battle_won", "chapter2_started", "forest_entry_seen", "creek_wolf_cleared"], objective: "倒れている狩人を確かめる" },
  { label: "救出後", x: 302, flags: ["intro_battle_won", "chapter2_started", "forest_entry_seen", "creek_wolf_cleared", "young_hunter_found", "torme_found"], objective: "狩人頭の足跡を追う" },
] as const;
const SNARE_STATES = [
  { label: "蔓との対峙", x: 144, flags: ["chapter2_started", "young_hunter_found"], objective: "狩人頭の足跡を追う" },
  { label: "守人の出現", x: 326, flags: ["chapter2_started", "young_hunter_found", "snare_path_clear"], objective: "道の奥の人影を追う" },
  { label: "守人が去る", x: 302, flags: ["chapter2_started", "young_hunter_found", "snare_path_clear", "masked_guardian_left_hand"], objective: "仮面の人物を追い、橋へ向かう" },
] as const;
const BRIDGE_STATES = [
  { label: "蛾との対峙", x: 144, flags: ["chapter2_started", "masked_guardian_left_hand"], objective: "仮面の人物を追い、橋へ向かう" },
  { label: "橋綱の発見", x: 320, flags: ["chapter2_started", "masked_guardian_left_hand", "short_forgetting_seen"], objective: "切れた橋を調べる" },
  { label: "結び目を記憶", x: 320, flags: ["chapter2_started", "masked_guardian_left_hand", "short_forgetting_seen", "double_knot_clue"], objective: "狩人の野営地へ向かう" },
] as const;
const CAMP_STATES = [
  { label: "猪との対峙", x: 168, flags: ["chapter2_started", "double_knot_clue"], objective: "狩人の野営地へ向かう" },
  { label: "手帳と熾火", x: 326, flags: ["chapter2_started", "double_knot_clue", "hunter_camp_clear"], objective: "野営地に残された手帳を調べる" },
  { label: "休息後", x: 326, flags: ["chapter2_started", "double_knot_clue", "hunter_camp_clear", "hunter_chief_trail", "camp_rest_taken"], objective: "守護樹の窪地へ向かう" },
] as const;
const HOLLOW_STATES = [
  { label: "根の裂け目を調べる", x: 354, flags: ["chapter2_started", "hunter_chief_trail", "camp_rest_taken"], objective: "守護樹の窪地へ向かう" },
  { label: "根洞窟への入口", x: 354, flags: ["chapter2_started", "hunter_chief_trail", "camp_rest_taken", "root_hollow_opened"], objective: "根洞窟へ入り、狩人頭を捜す" },
] as const;
const ROOT_ENTRY_STATES = [
  { label: "反響標で試し打ち", x: 98, flags: ["chapter2_started", "root_hollow_opened"], objective: "根洞窟へ入り、狩人頭を捜す" },
  { label: "蔓との対峙", x: 224, flags: ["chapter2_started", "root_hollow_opened"], objective: "根洞窟へ入り、狩人頭を捜す" },
  { label: "反響回廊が開通", x: 260, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear"], objective: "根洞窟の反響回廊へ進む" },
] as const;
const ECHO_GALLERY_STATES = [
  { label: "白枝鹿と外套", x: 220, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear"], objective: "根洞窟の反響回廊を抜ける" },
  { label: "最深部へ開通", x: 304, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear", "echo_gallery_clear"], objective: "根洞窟の最深部へ進む" },
] as const;
const ROOT_HEART_STATES = [
  { label: "根の番人と対峙", x: 246, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear", "echo_gallery_clear"], objective: "根洞窟の最深部で、狩人頭を捜す" },
  { label: "狩人頭の救出", x: 346, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear", "echo_gallery_clear", "root_warden_yielded"], objective: "倒れている狩人頭を確かめる" },
  { label: "救出後", x: 346, flags: ["chapter2_started", "root_hollow_opened", "root_entry_clear", "echo_gallery_clear", "root_warden_yielded", "hunter_chief_found", "chapter2_complete"], objective: "狩人頭と村へ戻る" },
] as const;
const DEEP_FOREST_STATES = [
  { label: "狼との対峙", x: 120, flags: ["chapter3_started", "hunter_chief_entered_ruin"], objective: "守護樹の先へ進み、狩人頭を追う" },
  { label: "白枝鹿との対峙", x: 292, flags: ["chapter3_started", "hunter_chief_entered_ruin", "deep_wolf_clear"], objective: "白い枝角の魔物を退かせる" },
  { label: "守人の警告", x: 372, flags: ["chapter3_started", "hunter_chief_entered_ruin", "deep_wolf_clear", "deep_forest_clear"], objective: "道の奥にいる守人を追う" },
  { label: "古木へ開通", x: 404, flags: ["chapter3_started", "hunter_chief_entered_ruin", "deep_wolf_clear", "deep_forest_clear", "masked_guardian_warning"], objective: "結び目の残る古木へ進む" },
] as const;
const KNOT_TREE_STATES = [
  { label: "白枝鹿との対峙", x: 144, flags: ["chapter3_started", "hunter_chief_entered_ruin", "masked_guardian_warning"], objective: "結び目の残る古木へ進む" },
  { label: "古木の刻み", x: 326, flags: ["chapter3_started", "hunter_chief_entered_ruin", "masked_guardian_warning", "knot_antler_clear"], objective: "印のある古木を調べる" },
  { label: "筆跡を記憶", x: 326, flags: ["chapter3_started", "hunter_chief_entered_ruin", "masked_guardian_warning", "knot_antler_clear", "guardian_handwriting_seen"], objective: "王国印のある遺跡へ向かう" },
] as const;
const RUIN_APPROACH_STATES = [
  { label: "名喰い蛭との対峙", x: 144, flags: ["chapter3_started", "guardian_handwriting_seen"], objective: "王国印のある遺跡へ向かう" },
  { label: "校訂印を調べる", x: 344, flags: ["chapter3_started", "guardian_handwriting_seen", "approach_leech_clear"], objective: "遺跡入口の印を調べる" },
  { label: "十年前を記憶", x: 344, flags: ["chapter3_started", "guardian_handwriting_seen", "approach_leech_clear", "royal_revision_mark_found", "knowledge:royal_revision_ten_years"], objective: "遺跡の外庭へ入る" },
] as const;

type PreviewArea = "boundary" | "creek" | "snare" | "bridge" | "camp" | "hollow" | "rootEntry" | "echoGallery" | "rootHeart" | "deepForest" | "knotTree" | "ruinApproach";

/** DEV専用。使い捨ての進行状態を実SideViewSceneへ渡す。ユーザーの保存は読まず書かない。 */
export class ForestBoundaryPreviewScene implements Scene {
  private clock = 0;
  private stage = 0;
  private candidate = true;
  private clean = false;
  private controls = true;
  private atTracks = false;
  private readonly images: ImageMap = {};
  private field: SideViewScene;

  constructor(
    private readonly onBack: () => void,
    private readonly image?: HTMLImageElement,
    private readonly area: PreviewArea = "boundary",
    private readonly sourceLabel?: string,
  ) {
    if (this.image) this.images[this.backgroundId] = this.image;
    this.field = this.makeField();
  }

  private get backgroundId(): string { return this.area === "boundary" ? FOREST_BOUNDARY_BACKGROUND_ID : this.area === "creek" ? DRY_CREEK_BACKGROUND_ID : this.area === "snare" ? SNARE_PATH_BACKGROUND_ID : this.area === "bridge" ? FALLEN_BRIDGE_BACKGROUND_ID : this.area === "camp" ? HUNTER_CAMP_BACKGROUND_ID : this.area === "hollow" ? GUARDIAN_HOLLOW_BACKGROUND_ID : this.area === "rootEntry" ? ROOT_HOLLOW_ENTRY_BACKGROUND_ID : this.area === "echoGallery" ? ECHO_GALLERY_BACKGROUND_ID : this.area === "rootHeart" ? ROOT_HEART_BACKGROUND_ID : this.area === "deepForest" ? DEEP_FOREST_BACKGROUND_ID : this.area === "knotTree" ? KNOT_TREE_BACKGROUND_ID : RUIN_APPROACH_BACKGROUND_ID; }
  private get stages() { return this.area === "boundary" ? STATES : this.area === "creek" ? CREEK_STATES : this.area === "snare" ? SNARE_STATES : this.area === "bridge" ? BRIDGE_STATES : this.area === "camp" ? CAMP_STATES : this.area === "hollow" ? HOLLOW_STATES : this.area === "rootEntry" ? ROOT_ENTRY_STATES : this.area === "echoGallery" ? ECHO_GALLERY_STATES : this.area === "rootHeart" ? ROOT_HEART_STATES : this.area === "deepForest" ? DEEP_FOREST_STATES : this.area === "knotTree" ? KNOT_TREE_STATES : RUIN_APPROACH_STATES; }

  private get panelId(): string {
    return this.area === "boundary" ? "forest_boundary"
      : this.area === "creek" ? "dry_creek"
        : this.area === "snare" ? "snare_path"
          : this.area === "bridge" ? "fallen_bridge"
            : this.area === "camp" ? "hunter_camp"
              : this.area === "hollow" ? "guardian_hollow"
                : this.area === "rootEntry" ? "root_hollow_entry"
                  : this.area === "echoGallery" ? "echo_gallery"
                    : this.area === "rootHeart" ? "root_heart"
                      : this.area === "deepForest" ? "deep_forest"
                        : this.area === "knotTree" ? "knot_tree" : "ruin_approach";
  }

  private defeatedForStage(): Set<string> {
    if (this.area === "rootEntry") return new Set(this.stage >= 2 ? ["snare_vine_root"] : []);
    if (this.area === "echoGallery") return new Set(this.stage >= 1 ? ["white_antler_echo"] : []);
    if (this.area === "rootHeart") return new Set(this.stage >= 1 ? ["root_warden"] : []);
    if (this.area === "deepForest") {
      if (this.stage === 0) return new Set();
      return new Set(this.stage === 1 ? ["moss_wolf_deep"] : ["moss_wolf_deep", "white_antler_deep"]);
    }
    if (this.area === "knotTree") return new Set(this.stage >= 1 ? ["white_antler_knot"] : []);
    if (this.area === "ruinApproach") return new Set(this.stage >= 1 ? ["name_leech_approach"] : []);
    if (this.stage === 0 || this.area === "hollow") return new Set();
    return new Set([
      this.area === "boundary" ? "intro_boundary_beast"
        : this.area === "creek" ? "moss_wolf_creek"
          : this.area === "snare" ? "snare_vine_path"
            : this.area === "bridge" ? "hush_moth_bridge" : "hollow_boar_camp",
    ]);
  }

  private makeField(): SideViewScene {
    const stage = this.stages[this.stage]!;
    const state: SideViewState = {
      panelId: panelById(this.panelId).id,
      x: stage.x, facing: 1,
      flags: new Set<string>(stage.flags),
      defeated: this.defeatedForStage(),
      objective: stage.objective,
    };
    const player = new Player();
    player.name = "TEST";
    return new SideViewScene(
      { isDown: () => false } as unknown as Keyboard,
      player,
      { play() {} } as unknown as Audio,
      this.onBack,
      () => ({ ok: true }),
      // 導入会話は確認できるが、比較画面から戦闘や実保存へは遷移しない。
      () => {}, state, () => {}, this.images,
    );
  }

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    for (const key of keys) {
      if (key === "Escape" || key.toLowerCase() === "b") { this.onBack(); return; }
      if (key.toLowerCase() === "g") {
        this.candidate = !this.candidate;
        if (this.candidate && this.image) this.images[this.backgroundId] = this.image;
        else delete this.images[this.backgroundId];
      }
      if (key.toLowerCase() === "u") {
        this.stage = (this.stage + 1) % this.stages.length;
        this.atTracks = false;
        this.field = this.makeField();
      }
      if (key.toLowerCase() === "c") this.clean = !this.clean;
      if (key.toLowerCase() === "h") this.controls = !this.controls;
      if (key.toLowerCase() === "p" && this.area === "boundary") {
        // 足跡の調査点と、この状態で話す相手の手前を往復する。
        this.field = this.makeField();
        this.atTracks = !this.atTracks;
        if (this.atTracks) this.field.state.x = 170;
      }
    }
    // 外のマップへの移動を防ぎ、会話だけ本編の入力処理を通す。
    this.field.update(dt, this.clean ? [] : keys.filter((key) => key === "Enter" || key === " "));
  }

  render(d: Display): void {
    if (this.clean) {
      if (this.area === "creek") renderDryCreek(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "snare") renderSnarePath(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "bridge") renderFallenBridge(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "camp") renderHunterCamp(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "hollow") renderGuardianHollow(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "rootEntry") renderRootHollowEntry(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "echoGallery") renderEchoGallery(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "rootHeart") renderRootHeart(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "deepForest") renderDeepForestPath(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "knotTree") renderKnotTree(d, this.clock, this.candidate ? this.image : undefined, false);
      else if (this.area === "ruinApproach") renderRuinApproach(d, this.clock, this.candidate ? this.image : undefined, false);
      else renderForestBoundary(d, this.clock, {
        background: this.candidate ? this.image : undefined,
        disturbed: false, atmosphere: false,
      });
    } else this.field.render(d);

    if (!this.controls) return;
    const complete = this.image?.complete;
    const source = !this.candidate ? "コード版"
      : isForestBoundaryBackgroundReady(this.image) ? this.sourceLabel ?? (this.area === "boundary" ? "正式背景 v35" : this.area === "creek" ? "正式背景 v37" : this.area === "snare" ? "正式背景 v39" : this.area === "bridge" ? "正式背景 v41" : this.area === "camp" ? "正式背景 v45" : this.area === "hollow" ? "正式背景 v47" : this.area === "rootEntry" ? "正式背景 v49" : this.area === "echoGallery" ? "正式背景 v51" : this.area === "rootHeart" ? "正式背景 v53" : this.area === "deepForest" ? "正式背景 v55" : this.area === "knotTree" ? "正式背景 v57" : "正式背景 v59")
        : !this.image || complete ? "読込失敗：コードで表示" : "読込中：コードで表示";
    windowBox(d, 12, 56, 270, 61);
    d.text(`${this.area === "boundary" ? "白い木の境" : this.area === "creek" ? "涸れ沢" : this.area === "snare" ? "罠の道" : this.area === "bridge" ? "落ちた橋" : this.area === "camp" ? "狩人の野営地" : this.area === "hollow" ? "守護樹の窪地" : this.area === "rootEntry" ? "根洞窟入口" : this.area === "echoGallery" ? "反響回廊" : this.area === "rootHeart" ? "守護樹心部" : this.area === "deepForest" ? "深い森" : this.area === "knotTree" ? "結び木" : "遺跡前"}　${source}　${this.stages[this.stage]!.label}`, 23, 64, PAL.accentCool, 8);
    d.text("G 背景　U 場面　C 静景　H 比較表示", 23, 81, PAL.hint, 8);
    d.text(this.area === "boundary" ? "P 足跡へ　ENTER 会話　B/ESC 戻る" : "ENTER 会話　B/ESC 戻る　保存変更なし", 23, 98, PAL.hint, 8);
  }
}
