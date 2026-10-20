import type { Display } from "../core/display.ts";
import type { StoryPersonMotion } from "./storyArt.ts";

/** 物語Sceneへ人物画像を注入する。未指定・読込失敗時はコード人物を使う。 */
export interface StoryCharacterLayer {
  drawHero(
    d: Display, x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): boolean;
  drawSena(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    masked: boolean, motion: StoryPersonMotion,
  ): boolean;
  drawLeavingSenaMask(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    motion: StoryPersonMotion, drop: number, alpha: number,
  ): void;
  senaRingAnchor(
    x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): { x: number; y: number };
  readonly senaMaskCenterOffset?: number;
}
