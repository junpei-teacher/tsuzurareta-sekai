import { loadImages } from "./core/assets.ts";
import { Display } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
import { Audio, type TrackId } from "./core/audio.ts";
import { sfx } from "./core/sfx.ts";
import type { Scene } from "./core/scene.ts";
import { Player } from "./game/player.ts";
import { FieldState } from "./field/state.ts";
import { ENEMIES } from "./battle/model.ts";
import { loadProgress, saveProgress } from "./game/save.ts";
import { clearRun, hasRun, loadRun, saveRun } from "./game/checkpoint.ts";
import { printRuleHelp } from "./game/rules.ts";
import { getMap } from "./field/mapFormat.ts";
import { missingWangIndices } from "./field/tileset.ts";
import { verifyCanonicals } from "./spell/book.ts";
import { BattleScene } from "./scenes/battle.ts";
import { CasterTestScene } from "./scenes/casterTest.ts";
import { FieldScene } from "./scenes/field.ts";
import { NameInputScene, loadName } from "./scenes/nameInput.ts";
import { OpeningScene } from "./scenes/opening.ts";
import { CollectionScene } from "./scenes/collection.ts";
import { SelectScene } from "./scenes/select.ts";
import { TitleScene } from "./scenes/title.ts";
import { VaultScene } from "./scenes/vault.ts";
import { EndingScene } from "./scenes/ending.ts";
import { resolveEnding } from "./ending/resolve.ts";
import { setDialogueName } from "./ui/dialogue.ts";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen が見つかりません");
printRuleHelp();

// 起動時の自己点検。canonical がハッシュとズレていたら即座に気づけるようにする
const errors = verifyCanonicals();
if (errors.length > 0) {
  console.error("呪文表の canonical が不整合です:\n" + errors.join("\n"));
}
const missingWang = missingWangIndices();
if (missingWang.length > 0) {
  console.error(`Wangタイルに欠番があります: ${missingWang.join(", ")}`);
}

const display = new Display(canvas);
const keyboard = new Keyboard();
const audio = new Audio();

/** 章に対応する曲。フィールドへ入るたびに指示する（同じ曲なら何も起きない） */
const CHAPTER_BGM: Record<number, TrackId> = { 1: "ch1", 2: "ch2", 3: "ch3" };

// ドット絵を読み終えてからループを回す。未配置のアセットは矩形のまま表示される
const images = await loadImages();

const player = new Player();
loadProgress(player); // 呪文帳は周回を跨いで残る（設計書 5.4）
// 前回名乗った名。第2章・第3章へ直接飛ぶデバッグ経路でも空欄にならないようにする
player.name = loadName() || player.name;
setDialogueName(player.name);
player.grimoire.set(20, "ROZHA"); // 残り火。ミラが最初に教えてくれた言葉

const field = new FieldState();

let scene: Scene;
let runActive = false;

function validSavedField(saved: Pick<FieldState, "mapId" | "x" | "y">): boolean {
  const map = getMap(saved.mapId);
  return saved.x < map.w && saved.y < map.h;
}

function continueRun(): void {
  const target = loadRun(player, field, validSavedField);
  if (!target) { goTitle(); return; }
  runActive = true;
  setDialogueName(player.name);
  if (target === "vault") goVault();
  else goField();
}

function checkpointField(): void {
  if (runActive && scene instanceof FieldScene && scene.canCheckpoint) {
    saveProgress(player);
    saveRun(player, field);
  }
}

// 閉じるイベントだけには頼らず、プレイ中も安全な区切りで保存する。
window.addEventListener("pagehide", checkpointField);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") checkpointField();
});

/**
 * タイトル。**起動して最初に出るのはここ**（設計書 7.5）。
 *
 * 以前は Phase 3 のデバッグメニューが入口だった。章の飛び込み口は
 * 開発中も要るので、タイトルの「ためす（開発）」から降りられるようにしてある。
 */
function goTitle(): void {
  checkpointField();
  runActive = false;
  audio.play("opening");
  scene = new TitleScene(player, () => startChapter(1), goVault, goCollection, goSelect,
    hasRun(validSavedField) ? continueRun : undefined);
}

function goCollection(): void {
  scene = new CollectionScene(player, goTitle);
}

/**
 * 章を始める。第1章だけ、世界の前提と名乗りを先に置く（設計書 2.1 / 2.2）。
 *
 * **順番は オープニング → 署名 → 書庫。**
 * 逆にすると、まだ何も知らないうちに当番表へ署名させることになる。
 * オープニングの最後の一行は「今日も、いつもと同じ夜になるはずだった」で、
 * その直後に**明日ぶんの署名を書かせる**のがいちばん効く。
 * 第2章・第3章はデバッグ用の飛び込み口なので、どちらも挟まない。
 */
function startChapter(chapter: number): void {
  runActive = true;
  field.startChapter(chapter, player);
  audio.play(chapter === 1 ? "opening" : CHAPTER_BGM[chapter]!);
  if (chapter !== 1) { goField(); return; }
  scene = new OpeningScene(() => {
    scene = new NameInputScene((name) => {
      player.name = name;
      setDialogueName(name);
      goField();
    });
  });
}

function goSelect(): void {
  runActive = false;
  scene = new SelectScene(
    player,
    (enemy) => {
      scene = new BattleScene(player, enemy, images, () => { saveProgress(player); goSelect(); });
    },
    () => { scene = new CasterTestScene(goSelect); },
    startChapter,
    goVault,
    goTitle,
  );
}

function goField(): void {
  // 章頭の文章と戦利品を消化する前に保存しておくと、閉じても読み直せる。
  saveProgress(player);
  saveRun(player, field);
  audio.play(CHAPTER_BGM[field.chapter] ?? "ch1");
  scene = new FieldScene(
    keyboard,
    player,
    field,
    images,
    (enemyId, cellKey) => {
      const def = ENEMIES.find((e) => e.id === enemyId);
      if (!def) { console.warn(`敵 ${enemyId} が見つかりません`); return; }
      // 戦いが終われば goField がフィールドの曲へ戻す
      audio.play(def.boss ? "boss" : "battle");
      scene = new BattleScene(player, def, images, (result) => {
        // 勝っても強くはならない。倒したことを覚えるだけ（設計書 4.5）
        if (result === "WIN") field.defeated.add(cellKey);
        // 勝ち取るものは勝ったときだけ。逃げても負けても手には入らない
        if (result !== "WIN") field.pendingReward = null;
        // 負けたらHP0のままフィールドに戻っていた。次の一戦も必ず負けるので詰む
        if (result === "LOSE") field.restartChapter(player);
        saveProgress(player);
        goField();
      });
    },
    goVault,
    // フィールドで ESC。デバッグメニューではなくタイトルへ戻す
    goTitle,
  );
}

function goVault(): void {
  if (runActive) saveRun(player, field, "vault");
  // 禁書の前は無音。**打鍵の音だけが残る**
  audio.stop();
  scene = new VaultScene((words) => {
    const result = resolveEnding(words, player.name);
    audio.play("ending");
    if (runActive) clearRun();
    runActive = false;
    // 結末を見終えたらタイトルへ戻る。**集めた数が増えているのが見える**
    scene = new EndingScene(result, player, goTitle);
  });
}

goTitle();

let last = performance.now();
let paused = false;
let checkpointTime = 0;

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
  // 効果音はBGMと同じつまみに従う
  sfx.level = audio.level;
  if (!paused) {
    scene.update(dt, keys);
    checkpointTime += dt;
    if (checkpointTime >= 0.25) {
      checkpointField();
      checkpointTime = 0;
    }
    scene.render(display);
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
      player, field, keyboard, audio,
      // 効果音の作り込み用。__dbg.sfx.play("type") のように単体で鳴らせる
      sfx,
      sceneName: () => scene.constructor.name,
      /** 今の場面そのもの。詰まったときに内部の旗を覗くため */
      current: () => scene,
    },
  });
}
