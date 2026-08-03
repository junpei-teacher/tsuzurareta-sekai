import { loadImages } from "./core/assets.ts";
import { Display } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
import { Audio, type TrackId } from "./core/audio.ts";
import type { Scene } from "./core/scene.ts";
import { Player } from "./game/player.ts";
import { FieldState } from "./field/state.ts";
import { ENEMIES } from "./battle/model.ts";
import { loadProgress, saveProgress } from "./game/save.ts";
import { missingWangIndices } from "./field/tileset.ts";
import { verifyCanonicals } from "./spell/book.ts";
import { BattleScene } from "./scenes/battle.ts";
import { CasterTestScene } from "./scenes/casterTest.ts";
import { FieldScene } from "./scenes/field.ts";
import { OpeningScene } from "./scenes/opening.ts";
import { SelectScene } from "./scenes/select.ts";
import { VaultScene } from "./scenes/vault.ts";
import { EndingScene } from "./scenes/ending.ts";
import { resolveEnding } from "./ending/resolve.ts";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen が見つかりません");

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
player.grimoire.set(20, "ROZHA"); // 熾火。ミラが最初に教えてくれた言葉

const field = new FieldState();

let scene: Scene;

function goSelect(): void {
  scene = new SelectScene(
    player,
    (enemy) => {
      scene = new BattleScene(player, enemy, images, () => { saveProgress(player); goSelect(); });
    },
    () => { scene = new CasterTestScene(goSelect); },
    (chapter) => {
      field.startChapter(chapter, player);
      audio.play(chapter === 1 ? "opening" : CHAPTER_BGM[chapter]!);
      // 第1章だけ、世界の前提を先に置く（設計書 2.1）。
      // 第2章・第3章はデバッグ用の飛び込み口なので挟まない
      if (chapter === 1) scene = new OpeningScene(goField);
      else goField();
    },
    goVault,
  );
}

function goField(): void {
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
    goSelect,
  );
}

function goVault(): void {
  // 禁書の前は無音。**打鍵の音だけが残る**
  audio.stop();
  scene = new VaultScene((words) => {
    const result = resolveEnding(words, player.name);
    audio.play("ending");
    scene = new EndingScene(result, player, goSelect);
  });
}

goSelect();

let last = performance.now();
let paused = false;

function frame(now: number): void {
  // dt は秒。タブ復帰時の巨大な跳躍を防ぐため上限を設ける
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  const keys = keyboard.poll();
  // ブラウザは操作があるまで音を鳴らさない。最初の1打で解禁する
  if (keys.length > 0) audio.unlock();
  // 音量は - と = 。**呪文は A-Z と 0-9 だけ**なので、詠唱中に押しても
  // 綴りには入らない（src/core/input.ts）
  for (const k of keys) {
    if (k === "-") audio.nudge(-1);
    if (k === "=") audio.nudge(1);
  }
  audio.update(dt);
  if (!paused) {
    scene.update(dt, keys);
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
      sceneName: () => scene.constructor.name,
    },
  });
}
