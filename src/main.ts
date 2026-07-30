import { Display } from "./core/display.ts";
import { Keyboard } from "./core/input.ts";
import { CasterTestScene } from "./scenes/casterTest.ts";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen が見つかりません");

const display = new Display(canvas);
const keyboard = new Keyboard();
const scene = new CasterTestScene(keyboard);

let last = performance.now();

function frame(now: number): void {
  // dt は秒。タブ復帰時の巨大な跳躍を防ぐため上限を設ける
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  scene.update(dt);
  scene.render(display);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
