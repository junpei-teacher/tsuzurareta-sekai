import { loadImages } from "./core/assets.ts";
import { Display } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
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
      scene = new BattleScene(player, enemy, () => { saveProgress(player); goSelect(); });
    },
    () => { scene = new CasterTestScene(goSelect); },
    (chapter) => { field.startChapter(chapter, player); goField(); },
    goVault,
  );
}

function goField(): void {
  scene = new FieldScene(
    keyboard,
    player,
    field,
    images,
    (enemyId, cellKey) => {
      const def = ENEMIES.find((e) => e.id === enemyId);
      if (!def) { console.warn(`敵 ${enemyId} が見つかりません`); return; }
      scene = new BattleScene(player, def, (result) => {
        if (result === "WIN") field.defeated.add(cellKey);
        saveProgress(player);
        goField();
      });
    },
    goVault,
    goSelect,
  );
}

function goVault(): void {
  scene = new VaultScene((words) => {
    const result = resolveEnding(words, player.name);
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
      player, field, keyboard,
      sceneName: () => scene.constructor.name,
    },
  });
}
