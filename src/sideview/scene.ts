import type { Audio } from "../core/audio.ts";
import { Display, SCREEN_H, SCREEN_W } from "../core/display.ts";
import type { Keyboard } from "../core/input.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import { DEEP_FOREST_BACKGROUND_ID, DRY_CREEK_BACKGROUND_ID, ECHO_GALLERY_BACKGROUND_ID, FALLEN_BRIDGE_BACKGROUND_ID, FOREST_BOUNDARY_BACKGROUND_ID, GUARDIAN_HOLLOW_BACKGROUND_ID, HUNTER_CAMP_BACKGROUND_ID, KNOT_TREE_BACKGROUND_ID, ROOT_HEART_BACKGROUND_ID, ROOT_HOLLOW_ENTRY_BACKGROUND_ID, RUIN_APPROACH_BACKGROUND_ID, SNARE_PATH_BACKGROUND_ID, VILLAGE_GATE_BACKGROUND_ID, VILLAGE_ROAD_BACKGROUND_ID } from "../core/series2Assets.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { THEMES } from "../core/theme.ts";
import { renderForestEntranceScene } from "../fx/forestEntrance.ts";
import { renderDryCreek } from "../fx/dryCreek.ts";
import { renderSnarePath } from "../fx/snarePath.ts";
import { renderFallenBridge } from "../fx/fallenBridge.ts";
import { drawHunterCampStoryState, renderHunterCamp } from "../fx/hunterCamp.ts";
import { drawGuardianHollowStoryState, renderGuardianHollow } from "../fx/guardianHollow.ts";
import { drawRootHollowEntryStoryState, renderRootHollowEntry } from "../fx/rootHollowEntry.ts";
import { drawEchoGalleryStoryState, renderEchoGallery } from "../fx/echoGallery.ts";
import { drawRootHeartStoryState, renderRootHeart } from "../fx/rootHeart.ts";
import { renderDeepForestPath } from "../fx/deepForestPath.ts";
import { drawKnotTreeClue, renderKnotTree } from "../fx/knotTree.ts";
import { drawRuinApproachClue, renderRuinApproach } from "../fx/ruinApproach.ts";
import {
  drawBoundaryBeast,
  drawDoubleLoopKnot,
  drawForestEnemy,
  drawStoryPerson,
  isForestBoundaryBackgroundReady,
  type StoryPersonMotion,
  renderDeepForest,
  renderForestBoundary,
  renderRuinExterior,
  renderRuinInterior,
  renderShallowForest,
  renderStorehouse,
  renderVillageGate,
  renderVillageRoad,
} from "../fx/storyArt.ts";
import { ITEM_NAME, type ItemKind, type Player } from "../game/player.ts";
import { DialogueBox, type Speaker } from "../ui/dialogueBox.ts";
import { GrimoireView } from "../ui/grimoire.ts";
import { bar, explorationHud, selectionRow, windowBox } from "../ui/hud.ts";
import { spellFor } from "../spell/book.ts";
import { DIALOGUE, newSideViewState, panelById } from "./data.ts";
import {
  gateOpen,
  type DialogueAction,
  type DialoguePart,
  type EncounterDef,
  type PanelDef,
  type SideViewState,
} from "./types.ts";

type Overlay = "pause" | "objective" | "status" | "grimoire" | "items" | "settings";
type Transition = { from: string; direction: -1 | 1; elapsed: number };
type Speech = { speaker: Speaker; lines: string[] };
type AutoSaveResult = { ok: boolean; message?: string };

const MOVE_SPEED = 72;
const TAP_DISTANCE = 12;
const INTERACT_DISTANCE = 36;
const TRANSITION_SECONDS = 0.34;
const PAUSE_ITEMS = ["目的", "ステータス", "呪文帳", "道具", "設定", "タイトルへ戻る"] as const;
const ITEM_KINDS: ItemKind[] = ["ink", "drop"];

/**
 * 第一章以降の固定画面を一つだけで扱う共通Scene。
 * 背景や会話を増やしても、このクラスを複製しない。
 */
export class SideViewScene implements Scene {
  readonly state: SideViewState;
  private panel: PanelDef;
  private clock = 0;
  private stepT = 0;
  private heroMotionT = 0;
  private heroWalkDistance = 0;
  private exitLatch = false;
  private transition: Transition | null = null;
  private overlay: Overlay | null = null;
  private pauseIndex = 0;
  private itemIndex = 0;
  private notice = "";
  private noticeT = 0;
  private objectiveToast = 3.8;
  private pendingTitle = 0;
  private readonly dialogue = new DialogueBox();
  private readonly grimoire = new GrimoireView("read");
  private speechQueue: Speech[] = [];
  private afterDialogue: (() => void) | null = null;

  constructor(
    private readonly keyboard: Keyboard,
    private readonly player: Player,
    private readonly audio: Audio,
    private readonly onTitle: () => void,
    private readonly onAutoSave: (state: SideViewState) => AutoSaveResult = () => ({ ok: true }),
    private readonly onEncounter: (encounter: EncounterDef, state: SideViewState) => void = () => {},
    state = newSideViewState(),
    private readonly onEnding: () => void = () => {},
    private readonly images: ImageMap = {},
  ) {
    this.state = state;
    this.panel = panelById(state.panelId);
    this.audio.play(this.panel.music);
  }

  update(dt: number, keys: string[]): void {
    this.clock += dt;
    this.heroMotionT = Math.max(0, this.heroMotionT - dt);
    this.noticeT = Math.max(0, this.noticeT - dt);
    this.objectiveToast = Math.max(0, this.objectiveToast - dt);
    this.dialogue.update(dt);

    if (this.pendingTitle > 0) {
      this.pendingTitle -= dt;
      if (this.pendingTitle <= 0) this.onTitle();
      return;
    }

    if (this.transition) {
      this.transition.elapsed += dt;
      if (this.transition.elapsed >= TRANSITION_SECONDS) this.transition = null;
      return;
    }

    if (this.dialogue.active) {
      if (keys.some((key) => key === "Enter" || key === " ")) this.advanceDialogue();
      return;
    }

    if (this.overlay) {
      this.updateOverlay(keys);
      return;
    }

    if (keys.includes("Escape")) {
      sfx.play("cancel");
      this.overlay = "pause";
      return;
    }
    if (keys.includes("I")) {
      sfx.play("page");
      this.overlay = "items";
      return;
    }

    const tapped = keys.includes("ArrowLeft") ? -1 : keys.includes("ArrowRight") ? 1 : 0;
    const held = this.keyboard.isDown("ArrowLeft") ? -1 : this.keyboard.isDown("ArrowRight") ? 1 : 0;
    const direction = (tapped || held) as -1 | 0 | 1;
    if (direction === 0) {
      this.stepT = 0;
      this.exitLatch = false;
    } else {
      this.move(direction, tapped !== 0 ? TAP_DISTANCE : MOVE_SPEED * dt, dt, tapped !== 0);
    }

    if (keys.some((key) => key === "Enter" || key === " ")) {
      const action = this.nearestAction();
      if (action) this.startAction(action);
    }
  }

  render(d: Display): void {
    this.renderBackground(d);
    this.renderWorld(d);

    if (!this.dialogue.active && !this.overlay && !this.transition) {
      const action = this.nearestAction();
      if (action) this.renderActionHint(d, action.label);
      else d.textRight("← → 移動　ENTER 調べる　ESC メニュー", SCREEN_W - 18, 158, PAL.hint, 10);

      if (this.state.flags.has("intro_battle_won")) explorationHud(d, this.player);
      if (this.objectiveToast > 0) this.renderObjectiveToast(d);
    }

    if (this.noticeT > 0 && !this.dialogue.active) this.renderNotice(d);
    if (this.transition) this.renderTransition(d);
    this.dialogue.render(d);
    if (this.overlay) this.renderOverlay(d);
  }

  private renderBackground(d: Display): void {
    switch (this.panel.background.renderer) {
      case "storehouse":
        renderStorehouse(d, {
          depleted: true,
          showSenaTag: false,
          playerName: this.player.name,
        });
        break;
      case "road":
        renderVillageRoad(d, this.clock, {
          merchantArrived: this.state.flags.has("heard_forest_warning"),
          fireDateKnown: this.state.flags.has("merchant_date_known"),
          background: this.images[VILLAGE_ROAD_BACKGROUND_ID],
        });
        break;
      case "gate":
        renderVillageGate(d, this.clock, {
          disturbed: this.state.flags.has("storehouse_reported"),
          warningKnown: this.state.flags.has("heard_forest_warning"),
          borderOpen: this.state.flags.has("border_open"),
          hunterDeparted: this.state.flags.has("chapter2_started"),
          background: this.images[VILLAGE_GATE_BACKGROUND_ID],
        });
        break;
      case "forestBoundary":
        renderForestBoundary(d, this.clock, {
          disturbed: true,
          background: this.images[FOREST_BOUNDARY_BACKGROUND_ID],
        });
        break;
      case "shallowForest":
        if (this.panel.id === "forest_edge") renderForestEntranceScene(d, this.clock, this.images);
        else if (this.panel.id === "dry_creek") renderDryCreek(d, this.clock, this.images[DRY_CREEK_BACKGROUND_ID]);
        else if (this.panel.id === "snare_path") renderSnarePath(d, this.clock, this.images[SNARE_PATH_BACKGROUND_ID]);
        else if (this.panel.id === "fallen_bridge") renderFallenBridge(d, this.clock, this.images[FALLEN_BRIDGE_BACKGROUND_ID]);
        else if (this.panel.id === "hunter_camp") renderHunterCamp(d, this.clock, this.images[HUNTER_CAMP_BACKGROUND_ID]);
        else if (this.panel.id === "guardian_hollow") renderGuardianHollow(d, this.clock, this.images[GUARDIAN_HOLLOW_BACKGROUND_ID]);
        else renderShallowForest(d, this.clock, this.panel.background.middle);
        break;
      case "deepForest":
        if (this.panel.id === "root_hollow_entry") renderRootHollowEntry(d, this.clock, this.images[ROOT_HOLLOW_ENTRY_BACKGROUND_ID]);
        else if (this.panel.id === "echo_gallery") renderEchoGallery(d, this.clock, this.images[ECHO_GALLERY_BACKGROUND_ID]);
        else if (this.panel.id === "root_heart") renderRootHeart(d, this.clock, this.images[ROOT_HEART_BACKGROUND_ID]);
        else if (this.panel.id === "deep_forest") renderDeepForestPath(d, this.clock, this.images[DEEP_FOREST_BACKGROUND_ID]);
        else if (this.panel.id === "knot_tree") renderKnotTree(d, this.clock, this.images[KNOT_TREE_BACKGROUND_ID]);
        else renderDeepForest(d, this.clock, this.panel.background.middle);
        break;
      case "ruinExterior":
        if (this.panel.id === "ruin_approach") renderRuinApproach(d, this.clock, this.images[RUIN_APPROACH_BACKGROUND_ID]);
        else renderRuinExterior(d, this.clock, this.panel.background.middle);
        break;
      case "ruinInterior": renderRuinInterior(d, this.clock, this.panel.background.middle); break;
    }
  }

  private renderWorld(d: Display): void {
    if (this.panel.id === "hunter_camp") {
      drawHunterCampStoryState(d, this.clock, {
        campClear: this.state.flags.has("hunter_camp_clear"),
        recordRead: this.state.flags.has("hunter_chief_trail"),
      });
    }
    if (this.panel.id === "guardian_hollow") {
      drawGuardianHollowStoryState(d, this.clock, {
        opened: this.state.flags.has("root_hollow_opened"),
      });
    }
    if (this.panel.id === "root_hollow_entry") {
      drawRootHollowEntryStoryState(d, this.clock, {
        cleared: this.state.flags.has("root_entry_clear"),
      });
    }
    if (this.panel.id === "knot_tree") {
      drawKnotTreeClue(d, this.state.flags.has("guardian_handwriting_seen"));
    }
    if (this.panel.id === "ruin_approach") {
      drawRuinApproachClue(d, this.state.flags.has("royal_revision_mark_found"));
    }
    if (this.panel.id === "fallen_bridge" && this.state.flags.has("short_forgetting_seen") && !this.state.flags.has("double_knot_clue")) {
      // 橋綱は風景の一部、セナの二重結びだけを調査可能になったとき重ねる。
      if (!isForestBoundaryBackgroundReady(this.images[FALLEN_BRIDGE_BACKGROUND_ID])) {
        d.rect(307, 146, 37, 2, "#806747");
      }
      drawDoubleLoopKnot(d, 344, 146, 1, "#d1b273");
    }
    for (const actor of this.panel.actors) {
      if (!gateOpen(actor, this.state.flags)) continue;
      const actorMotion: StoryPersonMotion | undefined = (
        actor.kind === "sena" || actor.kind === "guardian" || actor.kind === "keeper"
        || actor.kind === "hunter" || actor.kind === "merchant"
      )
        ? { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2,
            injured: actor.id === "young_hunter_rescue" || actor.id === "hunter_chief_rescue" }
        : undefined;
      drawStoryPerson(d, actor.x, this.panel.groundY, actor.kind, actor.facing ?? -1, false, actorMotion);
    }

    for (const encounter of this.panel.encounters) {
      if (!gateOpen(encounter, this.state.flags) || this.state.defeated.has(encounter.id)) continue;
      if (encounter.enemy === "boundary_beast") {
        drawBoundaryBeast(d, encounter.x, this.panel.groundY, this.clock);
      } else {
        drawForestEnemy(d, encounter.x, this.panel.groundY, this.clock, encounter.enemy,
          encounter.enemy === "moss_wolf" ? -1 : 1);
      }
    }

    if (this.panel.id === "echo_gallery") {
      drawEchoGalleryStoryState(d, this.clock, {
        cleared: this.state.flags.has("echo_gallery_clear"),
      });
    }
    if (this.panel.id === "root_heart") {
      drawRootHeartStoryState(d, this.clock, {
        wardenYielded: this.state.flags.has("root_warden_yielded"),
        hunterFound: this.state.flags.has("hunter_chief_found"),
      });
    }

    // 袋はフラグで出し分け、データ上の調査点と視覚を一致させる。
    if (this.panel.id === "village_storehouse" && !this.state.flags.has("sack_returned")) {
      // heroの腕に重ねるより、戻す対象が読みやすい入口側へ置く。
      d.rect(72, 162, 30, 14, "#9b7e4e");
      d.rect(77, 158, 19, 5, "#665136");
      d.frame(72, 162, 30, 14, "#d0af70");
    }

    const heroMotion: StoryPersonMotion = this.heroMotionT > 0
      ? { mode: "walk", frame: Math.floor(this.heroWalkDistance / 12) % 4 }
      : { mode: "idle", frame: Math.floor(this.clock / 0.72) % 2 };
    drawStoryPerson(d, this.state.x, this.panel.groundY, "heroAdult", this.state.facing, false, heroMotion);
  }

  private move(direction: -1 | 1, distance: number, dt: number, tapped: boolean): void {
    this.state.facing = direction;
    const before = this.state.x;
    let next = Math.max(this.panel.walk.min, Math.min(this.panel.walk.max, before + direction * distance));

    for (const block of this.panel.blocks) {
      if (!gateOpen(block, this.state.flags)) continue;
      if (direction > 0 && before <= block.min && next >= block.min) next = block.min;
      if (direction < 0 && before >= block.max && next <= block.max) next = block.max;
    }
    this.state.x = next;

    if (next !== before) {
      this.heroWalkDistance += Math.abs(next - before);
      // 単打移動でも一歩が見える長さだけ歩行姿勢を残す。
      // 押し続けている間は毎フレーム更新され、止めると最後の一歩から自然に待機へ戻る。
      this.heroMotionT = 0.12;
      this.stepT -= dt;
      if (tapped || this.stepT <= 0) {
        sfx.play("step");
        this.stepT = 0.24;
      }
    }

    const atLeft = direction < 0 && next <= this.panel.walk.min;
    const atRight = direction > 0 && next >= this.panel.walk.max;
    if ((atLeft || atRight) && !this.exitLatch) {
      this.exitLatch = true;
      this.tryExit(direction);
    }
  }

  private tryExit(direction: -1 | 1): void {
    const exit = direction < 0 ? this.panel.leftExit : this.panel.rightExit;
    if (!exit) return;
    if (!gateOpen(exit, this.state.flags)) {
      sfx.play("denied");
      this.showNotice(this.state.objective);
      return;
    }
    const from = this.panel.id;
    this.panel = panelById(exit.to);
    this.state.panelId = this.panel.id;
    this.state.x = exit.spawn;
    this.state.facing = direction;
    this.transition = { from, direction, elapsed: 0 };
    this.audio.play(this.panel.music);
    sfx.play("door");
    this.autoSave();
  }

  private nearestAction(): DialogueAction | null {
    const actions: DialogueAction[] = [
      ...this.panel.actors.filter((actor) => gateOpen(actor, this.state.flags)),
      ...this.panel.interactables.filter((item) => gateOpen(item, this.state.flags)),
      ...this.panel.encounters.filter((encounter) =>
        gateOpen(encounter, this.state.flags) && !this.state.defeated.has(encounter.id)
      ),
    ];
    let nearest: DialogueAction | null = null;
    let best = INTERACT_DISTANCE + 1;
    for (const action of actions) {
      const distance = Math.abs(action.x - this.state.x);
      if (distance <= INTERACT_DISTANCE && distance < best) {
        nearest = action;
        best = distance;
      }
    }
    return nearest;
  }

  private startAction(action: DialogueAction): void {
    const parts = DIALOGUE[action.dialogue];
    if (!parts) {
      console.error(`会話IDが見つかりません: ${action.dialogue}`);
      return;
    }
    sfx.play("confirm");
    this.beginDialogue(parts, () => {
      for (const word of action.learnWords ?? []) {
        const spell = spellFor(word);
        if (!spell || spell.canonical !== word) {
          console.error(`固定綴りが呪文表と一致しません: ${word}`);
          continue;
        }
        if (!this.player.grimoire.has(spell.id)) {
          this.player.grimoire.set(spell.id, word);
          this.player.unspoken.delete(spell.id);
          sfx.play("learn");
          this.showNotice(`呪文帳に「${spell.name}」を書き加えた`);
        }
      }
      if (action.restore) {
        this.player.restore();
        sfx.play("learn");
        this.showNotice("休息して、HPとMPが戻った");
      }
      for (const riddle of action.riddles ?? []) {
        if (!this.player.riddles.has(riddle.spellId)) {
          this.player.riddles.set(riddle.spellId, { mask: riddle.mask, place: riddle.place });
          sfx.play("learn");
          this.showNotice(`欠けた綴り「${riddle.mask}」を控えた`);
        }
      }
      for (const flag of action.setFlags ?? []) this.state.flags.add(flag);
      if (action.objective && action.objective !== this.state.objective) {
        this.state.objective = action.objective;
        this.objectiveToast = 4.2;
      }
      const encounter = this.panel.encounters.find((candidate) => candidate.id === action.id);
      if (encounter) this.onEncounter(encounter, this.state);
      else if (action.ending) {
        this.autoSave();
        this.onEnding();
      } else this.autoSave();
    });
  }

  private beginDialogue(parts: DialoguePart[], after: () => void): void {
    this.speechQueue = parts.map((part) => ({
      speaker: {
        name: part.name === "{NAME}" ? this.player.name : part.name,
        color: part.color,
        talks: [],
        portrait: part.name === "{NAME}" ? "hero"
          : part.name === "セナ" ? "sena"
          : part.name === "仮面の守人" ? "sena_masked"
          : part.name === "狩人頭" ? "hunter_chief"
          : part.name === "行商人" ? "merchant"
          : undefined,
      },
      lines: part.lines,
    }));
    this.afterDialogue = after;
    this.openNextSpeech();
  }

  private openNextSpeech(): void {
    const next = this.speechQueue.shift();
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

  private updateOverlay(keys: string[]): void {
    if (keys.includes("Escape")) {
      sfx.play("cancel");
      if (this.overlay === "pause") this.overlay = null;
      else this.overlay = "pause";
      return;
    }
    if (keys.includes("I")) {
      sfx.play("cancel");
      this.overlay = this.overlay === "items" ? null : "items";
      return;
    }

    if (this.overlay === "pause") {
      for (const key of keys) {
        if (key === "ArrowUp") {
          this.pauseIndex = (this.pauseIndex + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
          sfx.play("move");
        } else if (key === "ArrowDown") {
          this.pauseIndex = (this.pauseIndex + 1) % PAUSE_ITEMS.length;
          sfx.play("move");
        } else if (key === "Enter" || key === " ") {
          sfx.play("confirm");
          if (this.pauseIndex === 0) this.overlay = "objective";
          else if (this.pauseIndex === 1) this.overlay = "status";
          else if (this.pauseIndex === 2) this.overlay = "grimoire";
          else if (this.pauseIndex === 3) this.overlay = "items";
          else if (this.pauseIndex === 4) this.overlay = "settings";
          else this.requestTitle();
          return;
        }
      }
      return;
    }

    if (this.overlay === "grimoire") {
      for (const key of keys) this.grimoire.handle(key, this.player);
      return;
    }

    if (this.overlay === "items") this.updateItems(keys);
  }

  private updateItems(keys: string[]): void {
    for (const key of keys) {
      if (key === "ArrowUp" || key === "ArrowDown") {
        const direction = key === "ArrowUp" ? -1 : 1;
        this.itemIndex = (this.itemIndex + ITEM_KINDS.length + direction) % ITEM_KINDS.length;
        sfx.play("move");
      }
      if (key !== "Enter" && key !== " ") continue;
      const kind = ITEM_KINDS[this.itemIndex]!;
      const recovered = this.player.useItem(kind);
      if (recovered < 0) {
        sfx.play("denied");
        this.showNotice(`${ITEM_NAME[kind]}を持っていない`);
      } else if (recovered === 0) {
        sfx.play("denied");
        this.showNotice("MPはすでに満ちている");
      } else {
        sfx.play("learn");
        this.showNotice(`MPが${recovered}回復した`);
      }
      this.autoSave();
    }
  }

  private renderOverlay(d: Display): void {
    d.ctx.save();
    d.ctx.globalAlpha = 0.64;
    d.rect(0, 0, SCREEN_W, SCREEN_H, PAL.shadow);
    d.ctx.restore();

    if (this.overlay === "pause") this.renderPause(d);
    else if (this.overlay === "objective") this.renderObjectivePage(d);
    else if (this.overlay === "status") this.renderStatus(d);
    else if (this.overlay === "grimoire") this.renderGrimoirePage(d);
    else if (this.overlay === "items") this.renderItems(d);
    else this.renderSettings(d);
  }

  private renderPause(d: Display): void {
    const x = 142, y = 20, w = 196, h = 228;
    windowBox(d, x, y, w, h);
    d.text("一時停止", x + 16, y + 13, PAL.accentCool, 11);
    d.rect(x + 14, y + 34, w - 28, 1, PAL.line);
    PAUSE_ITEMS.forEach((label, index) => {
      const rowY = y + 48 + index * 25;
      const selected = index === this.pauseIndex;
      if (selected) selectionRow(d, x + 12, rowY - 4, w - 24, 21);
      d.text(selected ? "◆" : " ", x + 23, rowY, PAL.accentCool);
      d.text(label, x + 45, rowY, selected ? PAL.ink : PAL.dim);
    });
    d.textRight("ESC 閉じる", x + w - 13, y + h - 18, PAL.hint, 10);
  }

  private renderObjectivePage(d: Display): void {
    windowBox(d, 62, 58, 356, 138);
    d.text("目的", 82, 76, PAL.accentCool, 11);
    d.rect(82, 97, 316, 1, PAL.line);
    d.text(this.state.objective, 82, 114, PAL.ink);
    d.text("行動は一つ。詳しい事情は、人に聞けばいい。", 82, 143, PAL.dim, 10);
    d.textRight("ESC メニューへ", 398, 174, PAL.hint, 10);
  }

  private renderStatus(d: Display): void {
    const x = 68, y = 38, w = 344, h = 186;
    const weapon = this.player.equippedWeapon;
    windowBox(d, x, y, w, h, PAL.accentCool);
    d.text("ステータス", x + 20, y + 14, PAL.accentCool, 11);
    d.textRight(`LEVEL ${this.player.level}`, x + w - 20, y + 12, PAL.accent, 14);
    d.rect(x + 18, y + 38, w - 36, 1, PAL.line);

    d.text("HP", x + 22, y + 54, PAL.dim, 10);
    bar(d, x + 48, y + 56, 112, 6, this.player.hp / this.player.maxHp, PAL.hp);
    d.textRight(`${this.player.hp} / ${this.player.maxHp}`, x + 222, y + 52, PAL.ink, 10);
    d.text("MP", x + 22, y + 76, PAL.dim, 10);
    bar(d, x + 48, y + 78, 112, 6, this.player.mp / this.player.maxMp, PAL.mp);
    d.textRight(`${this.player.mp} / ${this.player.maxMp}`, x + 222, y + 74, PAL.ink, 10);

    d.text("攻撃", x + 242, y + 54, PAL.dim, 10);
    d.textRight(String(this.player.attack), x + w - 22, y + 54, PAL.ink, 14);
    d.textRight(`基礎 ${this.player.levelAttack} ＋ 杖 ${this.player.weaponAttack}`, x + w - 22, y + 76, PAL.dim, 9);

    d.rect(x + 18, y + 101, w - 36, 1, PAL.line);
    d.text("武器", x + 22, y + 114, PAL.dim, 10);
    d.text(weapon?.name ?? "なし", x + 72, y + 112, weapon ? PAL.accent : PAL.ink, 12);
    if (weapon) d.textRight(`攻撃 ＋${weapon.attack}`, x + w - 22, y + 114, PAL.ink, 10);
    d.text(
      weapon?.description ?? "杖を手に入れると、自動でこの一枠へ装備します。",
      x + 22,
      y + 137,
      PAL.dim,
      9,
    );
    d.text(
      this.player.xpToNext === null
        ? `経験値 ${this.player.xp}　LEVEL MAX`
        : `経験値 ${this.player.xp}　次まで ${this.player.xpToNext}`,
      x + 22,
      y + 158,
      PAL.dim,
      10,
    );
    d.textRight("ESC メニューへ", x + w - 18, y + h - 18, PAL.hint, 10);
  }

  private renderGrimoirePage(d: Display): void {
    d.text("呪文帳", 24, 12, PAL.accentCool);
    this.grimoire.render(d, 16, 30, SCREEN_W - 32, 204, this.player);
    d.textRight("ESC メニューへ", SCREEN_W - 20, 244, PAL.hint, 10);
  }

  private renderItems(d: Display): void {
    const x = 84, y = 45, w = 312, h = 168;
    windowBox(d, x, y, w, h);
    d.text("道具", x + 18, y + 14, PAL.accentCool, 11);
    d.textRight(`MP ${this.player.mp}/${this.player.maxMp}`, x + w - 18, y + 14, PAL.dim, 10);
    ITEM_KINDS.forEach((kind, index) => {
      const rowY = y + 52 + index * 36;
      const selected = index === this.itemIndex;
      if (selected) selectionRow(d, x + 14, rowY - 6, w - 28, 26);
      d.text(selected ? "◆" : " ", x + 24, rowY, PAL.accentCool);
      d.text(ITEM_NAME[kind], x + 48, rowY, selected ? PAL.ink : PAL.dim);
      d.textRight(`× ${this.player.items[kind]}`, x + w - 26, rowY, PAL.ink);
    });
    d.text("ENTER 使う", x + 18, y + h - 24, PAL.hint, 10);
    d.textRight("I/ESC 戻る", x + w - 18, y + h - 24, PAL.hint, 10);
  }

  private renderSettings(d: Display): void {
    windowBox(d, 92, 65, 296, 128);
    d.text("設定", 112, 83, PAL.accentCool, 11);
    d.rect(112, 105, 256, 1, PAL.line);
    d.text("BGM・効果音", 112, 122, PAL.dim);
    d.textRight(this.audio.label, 368, 122, PAL.ink);
    d.text("－／＝ で音量を変更できます。", 112, 148, PAL.dim, 10);
    d.textRight("ESC メニューへ", 368, 171, PAL.hint, 10);
  }

  private renderActionHint(d: Display, label: string): void {
    const text = `ENTER　${label}`;
    const width = Math.ceil(d.measure(text, 10)) + 18;
    const x = Math.round((SCREEN_W - width) / 2);
    d.rect(x, 151, width, 18, "rgba(3,9,8,0.82)");
    d.frame(x, 151, width, 18, PAL.line);
    d.text(text, x + 9, 155, PAL.ink, 10);
  }

  private renderObjectiveToast(d: Display): void {
    const x = 274, y = 14, w = 188, h = 49;
    windowBox(d, x, y, w, h, PAL.accentCool);
    d.text("目的", x + 11, y + 7, PAL.accentCool, 9);
    d.text(this.state.objective, x + 11, y + 24, PAL.ink, 10);
  }

  private renderNotice(d: Display): void {
    const width = Math.min(380, Math.ceil(d.measure(this.notice, 10)) + 28);
    const x = Math.round((SCREEN_W - width) / 2);
    windowBox(d, x, 130, width, 30);
    d.text(this.notice, x + 14, 139, PAL.ink, 10);
  }

  private renderTransition(d: Display): void {
    if (!this.transition) return;
    const progress = Math.min(1, this.transition.elapsed / TRANSITION_SECONDS);
    const eased = 1 - (1 - progress) * (1 - progress);
    const remaining = 1 - eased;
    const theme = THEMES[panelById(this.transition.from).theme];
    const edge = this.transition.direction > 0
      ? Math.round(SCREEN_W * remaining)
      : Math.round(SCREEN_W * eased);

    d.ctx.save();
    d.ctx.globalAlpha = 0.76 * remaining;
    if (this.transition.direction > 0) d.rect(0, 0, edge, SCREEN_H, theme.shadow);
    else d.rect(edge, 0, SCREEN_W - edge, SCREEN_H, theme.shadow);
    d.ctx.globalAlpha = 0.34 * remaining;
    const farEdge = this.transition.direction > 0 ? edge + 34 : edge - 34;
    d.rect(Math.max(0, farEdge - 3), 0, 6, SCREEN_H, theme.fog);
    d.ctx.globalAlpha = 0.55 * remaining;
    d.rect(Math.max(0, edge - 2), 0, 4, SCREEN_H, PAL.accentCool);
    d.ctx.restore();
  }

  private showNotice(message: string): void {
    this.notice = message;
    this.noticeT = 2.2;
  }

  private autoSave(): boolean {
    const result = this.onAutoSave(this.state);
    if (!result.ok) this.showNotice(result.message ?? "保存できませんでした");
    return result.ok;
  }

  private requestTitle(): void {
    if (!this.autoSave()) {
      this.overlay = null;
      return;
    }
    this.overlay = null;
    this.showNotice("保存しました");
    this.pendingTitle = 0.72;
  }
}
