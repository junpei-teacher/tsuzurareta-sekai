import { Display } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
import { CasterTestScene } from "./scenes/casterTest.ts";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen が見つかりません");

const display = new Display(canvas);
const keyboard = new Keyboard();
const scene = new CasterTestScene(keyboard);

let last = performance.now();
let paused = false;

function frame(now: number): void {
  // dt は秒。タブ復帰時の巨大な跳躍を防ぐため上限を設ける
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (!paused) {
    scene.update(dt);
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
      step: (dt: number) => { scene.update(dt); scene.render(display); },
    },
  });
}
