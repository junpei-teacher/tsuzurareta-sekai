import "./style.css";
import pixelMplusLicenseUrl from "./assets/fonts/PixelMplus-LICENSE.txt?url";
import { Display, SCREEN_W } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
import { Audio } from "./core/audio.ts";
import { sfx } from "./core/sfx.ts";
import type { Scene } from "./core/scene.ts";
import { SERIES2_TRACKS } from "./core/tracks.ts";
import {
  loadSeries2Images,
  DEEP_FOREST_BACKGROUND_ID,
  DRY_CREEK_BACKGROUND_ID,
  ECHO_GALLERY_BACKGROUND_ID,
  FALLEN_BRIDGE_BACKGROUND_ID,
  FOREST_BOUNDARY_BACKGROUND_ID,
  GUARDIAN_HOLLOW_BACKGROUND_ID,
  HUNTER_CAMP_BACKGROUND_ID,
  KNOT_TREE_BACKGROUND_ID,
  ROOT_HOLLOW_ENTRY_BACKGROUND_ID,
  ROOT_HEART_BACKGROUND_ID,
  RUIN_APPROACH_BACKGROUND_ID,
  SNARE_PATH_BACKGROUND_ID,
  VILLAGE_GATE_BACKGROUND_ID,
  VILLAGE_ROAD_BACKGROUND_ID,
  VILLAGE_STOREHOUSE_BACKGROUND_ID,
} from "./core/series2Assets.ts";
import { PAL } from "./core/palette.ts";
import { GeneratedStoryCharacterLayer } from "./fx/generatedStoryCharacters.ts";
import { Player } from "./game/player.ts";
import {
  applyRun,
  clearRun,
  loadProfile,
  loadRun,
  profilePlayerWords,
  prologueRun,
  restoreCheckpoint,
  saveProfile,
  saveRun,
  sideViewRun,
  withCheckpoint,
  type RunSave,
} from "./game/saveV2.ts";
import { spellFor, verifyCanonicals } from "./spell/book.ts";
import { NameInputScene, loadName } from "./scenes/nameInput.ts";
import { OpeningScene } from "./scenes/opening.ts";
import { PrologueScene } from "./scenes/prologue.ts";
import { BattleScene } from "./scenes/battle.ts";
import { BattleRewardScene, type BattleReward } from "./scenes/battleReward.ts";
import { VillagePlaceholderScene } from "./scenes/villagePlaceholder.ts";
import { CollectionScene } from "./scenes/collection.ts";
import { TitleScene } from "./scenes/title.ts";
import { Series2EndingScene } from "./scenes/endingSeries2.ts";
import { Series2DebugScene, type Series2DebugTarget } from "./scenes/series2Debug.ts";
import { CharacterMotionPreviewScene } from "./scenes/characterMotionPreview.ts";
import { CharacterArtPreviewScene } from "./scenes/characterArtPreview.ts";
import { EnemySilhouettePreviewScene } from "./scenes/enemySilhouettePreview.ts";
import { BackgroundComparisonPreviewScene } from "./scenes/backgroundComparisonPreview.ts";
import { StorehouseBackgroundPreviewScene } from "./scenes/storehouseBackgroundPreview.ts";
import { SenaRevealScene } from "./scenes/senaReveal.ts";
import { SideViewScene } from "./sideview/scene.ts";
import { newSideViewState } from "./sideview/data.ts";
import { panelById } from "./sideview/data.ts";
import type { EncounterDef, SideViewState } from "./sideview/types.ts";
import { encounterRuleById, series2EnemyById } from "./battle/series2.ts";
import { setDialogueName } from "./ui/dialogueBox.ts";
import { windowBox } from "./ui/hud.ts";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen が見つかりません");

// フォントと同じ配布物にライセンス原文を含め、headから辿れるようにする。
const fontLicense = document.createElement("link");
fontLicense.rel = "license";
fontLicense.href = pixelMplusLicenseUrl;
fontLicense.title = "PixelMplus M+ FONT LICENSE";
document.head.append(fontLicense);

// Canvas文字は描いた後からWebフォントへ自動で差し替わらない。
// 最初の一枚を描く前に正式フォントを読み、計測幅と表示を一致させる。
try {
  await document.fonts.load("12px PixelMplus12");
} catch (error) {
  console.warn("PixelMplus12を読み込めません。代替フォントで続行します", error);
}

// 正式画像の入口はシリーズ2目録だけに固定する。欠落時は各描画側でコード版へ戻す。
const series2Images = await loadSeries2Images();
const storyCharacterLayer = new GeneratedStoryCharacterLayer(series2Images);
const storehouseBackground = series2Images[VILLAGE_STOREHOUSE_BACKGROUND_ID];
const villageRoadBackground = series2Images[VILLAGE_ROAD_BACKGROUND_ID];
const villageGateBackground = series2Images[VILLAGE_GATE_BACKGROUND_ID];
const forestBoundaryBackground = series2Images[FOREST_BOUNDARY_BACKGROUND_ID];
const hunterCampBackground = series2Images[HUNTER_CAMP_BACKGROUND_ID];
const guardianHollowBackground = series2Images[GUARDIAN_HOLLOW_BACKGROUND_ID];
const rootHollowEntryBackground = series2Images[ROOT_HOLLOW_ENTRY_BACKGROUND_ID];
const rootHeartBackground = series2Images[ROOT_HEART_BACKGROUND_ID];
const deepForestBackground = series2Images[DEEP_FOREST_BACKGROUND_ID];
const knotTreeBackground = series2Images[KNOT_TREE_BACKGROUND_ID];
const ruinApproachBackground = series2Images[RUIN_APPROACH_BACKGROUND_ID];

// 起動時の自己点検。canonical がハッシュとズレていたら即座に気づけるようにする
const errors = verifyCanonicals();
if (errors.length > 0) {
  console.error("呪文表の canonical が不整合です:\n" + errors.join("\n"));
}
const display = new Display(canvas);
const keyboard = new Keyboard();
const audio = new Audio(SERIES2_TRACKS);

let player = new Player();
const profilePlayer = new Player();
// 前回名乗った名。第2章・第3章へ直接飛ぶデバッグ経路でも空欄にならないようにする
player.name = loadName() || player.name;
setDialogueName(player.name);

let scene: Scene;
let legacyField: unknown = null;
let loadingLegacy = false;
let systemNotice = "";
let systemNoticeT = 0;

const validPanelPosition = (panelId: string, x: number): boolean => {
  try {
    const panel = panelById(panelId);
    return x >= panel.walk.min && x <= panel.walk.max;
  } catch {
    return false;
  }
};

const readRun = () => loadRun(validPanelPosition);

function saveFailed(message: string): void {
  console.warn(message);
  systemNotice = message;
  systemNoticeT = 3.2;
}

/**
 * タイトル。**起動して最初に出るのはここ**（設計書 7.5）。
 *
 * 以前は Phase 3 のデバッグメニューが入口だった。章の飛び込み口は
 * 開発中も要るので、タイトルの「ためす（開発）」から降りられるようにしてある。
 */
function goTitle(): void {
  audio.play("title");
  profilePlayerWords(profilePlayer, loadProfile());
  const canContinue = readRun() !== null;
  scene = new TitleScene(
    profilePlayer,
    startNewStory,
    canContinue ? continueStory : null,
    goCollection,
    goSeries2Debug,
  );
}

function goSeries2Debug(): void {
  if (!import.meta.env.DEV) return;
  scene = new Series2DebugScene(startSeries2DebugTarget, goTitle);
}

function goEnemyPreview(): void {
  if (!import.meta.env.DEV) return;
  scene = new EnemySilhouettePreviewScene(goSeries2Debug, startEnemyVisualBattle);
}

function goCharacterMotionPreview(): void {
  if (!import.meta.env.DEV) return;
  scene = new CharacterMotionPreviewScene(goSeries2Debug, () => {
    scene = new CharacterArtPreviewScene(goCharacterMotionPreview, series2Images);
  }, series2Images);
}

/** 保存を一切変更せず、比較板の敵を本物の戦闘レイアウトへ置く。 */
function startEnemyVisualBattle(enemyId: string, theme: "forest" | "ruin"): void {
  if (!import.meta.env.DEV) return;
  const previewPlayer = new Player();
  previewPlayer.name = loadName() || "TEST";
  previewPlayer.restore();
  previewPlayer.items = { ink: 3, drop: 1 };
  const enemy = series2EnemyById(enemyId);
  audio.play(enemy.boss ? "boss" : "battle");
  scene = new BattleScene(previewPlayer, enemy, series2Images, goEnemyPreview, {
    rule: encounterRuleById(enemyId) ?? undefined,
    theme,
    debugExit: goEnemyPreview,
  });
}

function startSeries2DebugTarget(target: Series2DebugTarget): void {
  if (target === "legacy") { void goLegacyDebug(); return; }
  if (target === "ending") {
    audio.play("ending");
    scene = new Series2EndingScene(
      loadName() || "TEST",
      goSeries2Debug,
      storyCharacterLayer,
      true,
      storehouseBackground,
      villageRoadBackground,
    );
    return;
  }
  if (target === "reveal") {
    player = new Player();
    player.name = loadName() || "TEST";
    player.restore();
    player.items = { ink: 3, drop: 1 };
    player.gainXp(210);
    player.acquireWeapon("white_root_staff");
    const panel = panelById("final_sanctum");
    const revealState: SideViewState = {
      panelId: panel.id,
      x: 310,
      facing: 1,
      flags: new Set([
        "chapter4_started", "hunter_chief_stands_down", "final_rest_taken",
        "final_call_started", "sena_called",
      ]),
      defeated: new Set(["sena_guardian"]),
      objective: "セナに話す",
    };
    audio.play("ruin");
    scene = new SenaRevealScene(
      () => goSideView(revealState),
      storyCharacterLayer,
      true,
    );
    return;
  }
  if (target === "motion") { goCharacterMotionPreview(); return; }
  if (target === "enemies") { goEnemyPreview(); return; }
  if (target === "backgrounds") {
    scene = new BackgroundComparisonPreviewScene(
      goSeries2Debug,
      storyCharacterLayer,
      villageRoadBackground,
      villageGateBackground,
      forestBoundaryBackground,
      series2Images[DRY_CREEK_BACKGROUND_ID],
      series2Images[SNARE_PATH_BACKGROUND_ID],
      series2Images[FALLEN_BRIDGE_BACKGROUND_ID],
      hunterCampBackground,
      guardianHollowBackground,
      rootHollowEntryBackground,
      series2Images[ECHO_GALLERY_BACKGROUND_ID],
      rootHeartBackground,
      deepForestBackground,
      knotTreeBackground,
      ruinApproachBackground,
    );
    return;
  }
  if (target === "storehouseArt") {
    scene = new StorehouseBackgroundPreviewScene(goSeries2Debug, storyCharacterLayer);
    return;
  }

  player = new Player();
  player.name = loadName() || "TEST";
  player.restore();
  player.items = { ink: 3, drop: 1 };
  const words = target === "final"
    ? ["SLANE", "ZIROR", "TORME", "ZHELEN", "DUSKA", "VISLE"]
    : target === "chapter4"
      ? ["SLANE", "ZIROR", "TORME", "ZHELEN", "DUSKA"]
        : target === "chapter3"
          ? ["SLANE", "ZIROR", "TORME"]
          : target === "rootDungeon"
            ? ["SLANE", "ZIROR", "TORME"]
        : ["SLANE"];
  for (const word of words) {
    const spell = spellFor(word);
    if (spell) player.grimoire.set(spell.id, word);
  }
  if (target === "rootDungeon") {
    player.gainXp(62);
  } else if (target === "chapter3") {
    player.gainXp(130);
    player.acquireWeapon("white_root_staff");
  } else if (target === "chapter4" || target === "final") {
    player.gainXp(210);
    player.acquireWeapon("white_root_staff");
  }

  const config = target === "final"
    ? {
        panelId: "final_sanctum",
        flags: ["chapter4_started", "hunter_chief_stands_down", "final_rest_taken"],
      }
    : target === "chapter4"
      ? { panelId: "inner_passage", flags: ["chapter3_complete"] }
      : target === "chapter3"
        ? { panelId: "deep_forest", flags: ["chapter2_complete", "chapter3_started"] }
        : target === "rootDungeon"
          ? {
              panelId: "root_hollow_entry",
              flags: ["intro_battle_won", "chapter2_started", "hunter_chief_trail", "root_hollow_opened"],
            }
        : target === "chapter1"
          ? {
              panelId: "village_road",
              flags: ["heard_errand", "sack_returned", "storehouse_reported"],
            }
          : {
              panelId: "village_gate",
              flags: [
                "heard_errand", "sack_returned", "storehouse_reported", "heard_forest_warning",
                "merchant_date_known", "intro_battle_won", "border_open",
              ],
            };
  const panel = panelById(config.panelId);
  goSideView({
    panelId: panel.id,
    x: panel.spawn,
    facing: 1,
    flags: new Set(config.flags),
    defeated: new Set(),
    objective: target === "chapter2" ? "村へ戻り、森へ入る支度を整える" : panel.objective,
  });
}

function goCollection(): void {
  scene = new CollectionScene(profilePlayer, goTitle);
}

/** 通常導線。シリーズ1の書庫フィールドへは入れない。 */
function startNewStory(): void {
  const cleared = clearRun();
  if (!cleared.ok) saveFailed(cleared.message);
  player = new Player();
  audio.play("prologue");
  scene = new OpeningScene(() => {
    scene = new NameInputScene((name) => {
      player.name = name;
      setDialogueName(name);
      const saved = saveRun(prologueRun(player));
      if (!saved.ok) saveFailed(saved.message);
      scene = new PrologueScene(keyboard, name, goVillagePrototype, goTitle, storehouseBackground);
    }, goTitle);
  }, villageRoadBackground);
}

/** 保存された安全地点から再開する。会話や演出の途中へは戻さない。 */
function continueStory(): void {
  const run = readRun();
  if (!run) {
    goTitle();
    return;
  }
  player = new Player();
  const sideViewState = applyRun(player, run);
  setDialogueName(player.name);
  if (run.position.kind === "prologue_start") {
    audio.play("prologue");
    scene = new PrologueScene(
      keyboard,
      player.name,
      goVillagePrototype,
      goTitle,
      storehouseBackground,
    );
  } else if (sideViewState) {
    goSideView(sideViewState);
  } else {
    goTitle();
  }
}

/** 正式な村マップができるまで、十年後の共同倉だけを一本遊べる状態にする。 */
function goVillagePrototype(): void {
  audio.play("village");
  scene = new VillagePlaceholderScene(player.name, goSideView, storehouseBackground);
}

/** 正式な第一章の共通固定画面基盤へ入る。 */
function goSideView(savedState?: SideViewState): void {
  audio.play("village");
  const state = savedState ?? newSideViewState();
  const chapter = panelById(state.panelId).chapter;
  const initialSave = saveRun(sideViewRun(player, state, chapter));
  if (!initialSave.ok) saveFailed(initialSave.message);
  scene = new SideViewScene(
    keyboard,
    player,
    audio,
    goTitle,
    (nextState) => saveRun(
      sideViewRun(player, nextState, panelById(nextState.panelId).chapter),
    ),
    startSeries2Encounter,
    state,
    goSeries2Ending,
    series2Images,
  );
}

function goSeries2Ending(): void {
  const profile = loadProfile();
  const result = saveProfile({ ...profile, cleared: true });
  if (!result.ok) saveFailed(result.message);
  audio.play("ending");
  scene = new Series2EndingScene(
    player.name,
    goTitle,
    storyCharacterLayer,
    false,
    storehouseBackground,
    villageRoadBackground,
  );
}

/** 戦闘中は安全地点を動かさず、発見した言葉だけを保存済みRunへ反映する。 */
function saveEncounterKnowledge(encounterId: string): void {
  const saved = readRun();
  if (!saved?.checkpoint || saved.checkpoint.activeEncounterId !== encounterId) return;
  const knowledgeOnly: RunSave = {
    ...saved,
    grimoire: [...player.grimoire],
    unspoken: [...player.unspoken],
    riddles: [...player.riddles],
  };
  const result = saveRun(knowledgeOnly);
  if (!result.ok) saveFailed(result.message);
}

/** SideViewのEncounterを、v2 Checkpoint付きのシリーズ2戦闘へ接続する。 */
function startSeries2Encounter(encounter: EncounterDef, state: SideViewState): void {
  let enemy;
  try {
    enemy = series2EnemyById(encounter.enemy);
  } catch (error) {
    console.error(error);
    saveFailed("戦闘データを読み込めませんでした");
    return;
  }

  const chapter = panelById(state.panelId).chapter;
  const before = withCheckpoint(sideViewRun(player, state, chapter), encounter.id);
  const checkpointResult = saveRun(before);
  if (!checkpointResult.ok) {
    saveFailed("戦闘前を保存できないため、開始できませんでした");
    return;
  }

  const rule = encounterRuleById(encounter.id) ?? {
    id: encounter.id,
    victoryLabel: "退かせた",
    victoryLines: [`${enemy.name}は戦意をほどき、森の奥へ退いた。`],
  };
  audio.play(enemy.boss ? "boss" : "battle");
  scene = new BattleScene(
    player,
    enemy,
    series2Images,
    (result) => finishSeries2Encounter(encounter, state, result),
    {
      rule,
      theme: panelById(state.panelId).theme,
      backdropVariant: encounter.id === "intro_boundary_beast" ? "boundary" : undefined,
      assist: rule?.id === "intro_boundary_beast"
        ? { memoryWord: "SLANE", memoryPlace: "十年前　白い木の境", memoryKind: "slane" }
        : rule?.id === "sena_guardian"
          ? {
              memoryWord: "SENA",
              memoryPlace: "十年前　共同倉",
              memoryKind: "sena",
              onlyWhenMemorySealed: true,
            }
          : undefined,
      onKnowledgeChange: () => saveEncounterKnowledge(encounter.id),
    },
  );
}

function finishSeries2Encounter(
  encounter: EncounterDef,
  state: SideViewState,
  result: "WIN" | "LOSE" | "FLED",
): void {
  const chapter = panelById(state.panelId).chapter;

  if (result === "WIN") {
    const enemy = series2EnemyById(encounter.enemy);
    state.defeated.add(encounter.id);
    for (const flag of encounter.winFlags ?? []) state.flags.add(flag);
    if (encounter.winObjective) state.objective = encounter.winObjective;
    const xp = enemy.xp ?? 0;
    const levelUps = player.gainXp(xp);
    const weapon = encounter.rewardWeapon ? player.acquireWeapon(encounter.rewardWeapon) : null;
    const saved = saveRun(sideViewRun(player, state, chapter));
    if (!saved.ok) saveFailed(saved.message);
    if (encounter.id === "sena_guardian") {
      // 「撃破」結果から素顔の会話へ瞬間移動させず、同じ最奥聖域で終戦を一度見届ける。
      audio.play("ruin");
      scene = new SenaRevealScene(() => goSideView(state), storyCharacterLayer);
      return;
    }
    if (xp > 0 || weapon) {
      const reward: BattleReward = {
        xp,
        level: player.level,
        currentXp: player.xp,
        xpToNext: player.xpToNext,
        hp: player.hp,
        maxHp: player.maxHp,
        mp: player.mp,
        maxMp: player.maxMp,
        attack: player.attack,
        levelUps,
        weapon,
      };
      sfx.play(levelUps.length > 0 || weapon ? "learn" : "page");
      scene = new BattleRewardScene(reward, () => goSideView(state));
    } else {
      goSideView(state);
    }
    return;
  }

  // 現在のHP、道具、世界状態は戻すが、戦闘中に得た知識はcurrentへ載せて
  // restoreCheckpointに渡す。Checkpoint自身は保存済みの安全地点から受け取る。
  const stored = readRun();
  const current: RunSave = sideViewRun(player, state, chapter);
  if (stored?.checkpoint?.activeEncounterId === encounter.id) {
    current.checkpoint = stored.checkpoint;
  }
  const restored = restoreCheckpoint(current, encounter.id);
  if (!restored) {
    saveFailed("戦闘前の安全地点へ戻れませんでした");
    goTitle();
    return;
  }

  player.statuses = [];
  const restoredState = applyRun(player, restored);
  if (!restoredState) {
    saveFailed("戦闘前の位置を復元できませんでした");
    goTitle();
    return;
  }
  const saved = saveRun(restored);
  if (!saved.ok) saveFailed(saved.message);
  goSideView(restoredState);
}

/** DEV専用。旧作資産はこの選択が行われるまで読み込まれない。 */
async function goLegacyDebug(): Promise<void> {
  if (!import.meta.env.DEV || loadingLegacy) return;
  loadingLegacy = true;
  try {
    const { startLegacyDev } = await import("./legacy/devRuntime.ts");
    const runtime = await startLegacyDev({
      keyboard,
      get player() { return player; },
      audio,
      setScene: (next) => { scene = next; },
      onExit: goTitle,
    });
    legacyField = runtime.field;
  } catch (error) {
    console.error("旧作検証環境の起動に失敗しました", error);
    goTitle();
  } finally {
    loadingLegacy = false;
  }
}

goTitle();

let last = performance.now();
let paused = false;

function frame(now: number): void {
  // dt は秒。タブ復帰時の巨大な跳躍を防ぐため上限を設ける
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  const keys = keyboard.poll();
  // ブラウザは操作があるまで音を鳴らさない。最初の1打で解禁する
  if (keys.length > 0) { audio.unlock(); sfx.unlock(); }
  // 音量は - と = 。**呪文は A-Z と 0-9 だけ**なので、詠唱中に押しても
  // 綴りには入らない（src/core/input.ts）
  for (const k of keys) {
    if (k !== "-" && k !== "=") continue;
    audio.nudge(k === "-" ? -1 : 1);
    // 動かした結果を耳で確かめられるようにする。
    // **数字だけ変わって何も鳴らないと、下げすぎたのか壊れたのか分からない**
    sfx.level = audio.level;
    sfx.play("move");
  }
  audio.update(dt);
  systemNoticeT = Math.max(0, systemNoticeT - dt);
  // 効果音はBGMと同じつまみに従う
  sfx.level = audio.level;
  if (!paused) {
    scene.update(dt, keys);
    scene.render(display);
    if (systemNoticeT > 0) {
      const width = Math.min(360, Math.ceil(display.measure(systemNotice, 10)) + 28);
      const x = Math.round((SCREEN_W - width) / 2);
      windowBox(display, x, 18, width, 31, PAL.danger);
      display.text(systemNotice, x + 14, 28, PAL.ink, 10);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// 開発時のみ。演出をコマ送りで確認するための足場。
if (import.meta.env.DEV) {
  Object.assign(window, {
    __dbg: {
      pause: () => { paused = true; },
      resume: () => { paused = false; last = performance.now(); },
      /** 指定秒だけ時間を進めて1コマ描く */
      step: (dt: number) => { scene.update(dt, keyboard.poll()); scene.render(display); },
      /** キーを流し込む */
      key: (...names: string[]) => {
        for (const n of names) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: n, bubbles: true, cancelable: true }));
          window.dispatchEvent(new KeyboardEvent("keyup", { key: n, bubbles: true, cancelable: true }));
        }
      },
      /** 押しっぱなしを再現する */
      hold: (name: string) => window.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
      ),
      release: (name: string) => window.dispatchEvent(
        new KeyboardEvent("keyup", { key: name, bubbles: true, cancelable: true }),
      ),
      player,
      get field() { return legacyField; },
      keyboard, audio,
      // 効果音の作り込み用。__dbg.sfx.play("type") のように単体で鳴らせる
      sfx,
      sceneName: () => scene.constructor.name,
      /** 今の場面そのもの。詰まったときに内部の旗を覗くため */
      current: () => scene,
    },
  });

}
