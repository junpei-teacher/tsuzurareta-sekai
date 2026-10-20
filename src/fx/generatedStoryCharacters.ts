import { Display } from "../core/display.ts";
import type { ImageMap } from "../core/imageLoader.ts";
import { PAL } from "../core/palette.ts";
import type { StoryCharacterLayer } from "./storyCharacterLayer.ts";
import type { StoryPersonMotion } from "./storyArt.ts";

const HERO_MOTION = {
  idle: ["character.hero.idle.0", "character.hero.idle.1"],
  walk: [
    "character.hero.walk.0", "character.hero.walk.1",
    "character.hero.walk.2", "character.hero.walk.3",
  ],
} as const;

const SENA_MOTION = {
  idle: ["character.sena.idle.0", "character.sena.idle.1"],
  walk: [
    "character.sena.walk.0", "character.sena.walk.1",
    "character.sena.walk.2", "character.sena.walk.3",
  ],
} as const;

type Subject = "hero" | "sena";
type HandPose = { x: number; y: number; w: number; h: number };
type FrameSet = {
  idle: readonly (HTMLImageElement | undefined)[];
  walk: readonly (HTMLImageElement | undefined)[];
};

const SENA_IDLE_HANDS: readonly HandPose[] = [
  { x: 21, y: 28, w: 2, h: 4 },
  { x: 21, y: 28, w: 3, h: 3 },
];

const SENA_WALK_HANDS: readonly HandPose[] = [
  { x: 22, y: 28, w: 3, h: 4 },
  { x: 22, y: 29, w: 3, h: 5 },
  { x: 21, y: 28, w: 3, h: 4 },
  { x: 21, y: 28, w: 2, h: 4 },
];

/**
 * 採用したv24人物PNGへ、仮面・左手・指輪の動的コード層を重ねる。
 * セナは原本の左手領域をclipで描かず、同じ位置へコード手を戻すことで終戦時の3px下降を可能にする。
 */
export class GeneratedStoryCharacterLayer implements StoryCharacterLayer {
  readonly senaMaskCenterOffset = -2;
  private readonly hero: FrameSet;
  private readonly sena: FrameSet;

  constructor(images: ImageMap) {
    this.hero = {
      idle: HERO_MOTION.idle.map((id) => images[id]),
      walk: HERO_MOTION.walk.map((id) => images[id]),
    };
    this.sena = {
      idle: SENA_MOTION.idle.map((id) => images[id]),
      walk: SENA_MOTION.walk.map((id) => images[id]),
    };
  }

  frames(
    subject: Subject,
    mode: StoryPersonMotion["mode"],
  ): readonly (HTMLImageElement | undefined)[] {
    return (subject === "hero" ? this.hero : this.sena)[mode];
  }

  ready(image?: HTMLImageElement): image is HTMLImageElement {
    return Boolean(image?.complete && image.naturalWidth === 32 && image.naturalHeight === 48);
  }

  drawSprite(
    d: Display, image: HTMLImageElement | undefined, x: number, bottom: number,
    facing: -1 | 1, center: number, foot: number, scale = 1, cutout?: HandPose,
  ): boolean {
    if (!this.ready(image)) return false;
    d.ctx.save();
    d.ctx.translate(x, bottom);
    d.ctx.scale(facing * scale, scale);
    if (cutout) {
      d.ctx.beginPath();
      d.ctx.rect(-center, -foot, 32, 48);
      d.ctx.rect(cutout.x - center, cutout.y - foot, cutout.w, cutout.h);
      d.ctx.clip("evenodd");
    }
    d.ctx.drawImage(image, -center, -foot, 32, 48);
    d.ctx.restore();
    return true;
  }

  drawHero(
    d: Display, x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): boolean {
    const image = this.selectedFrame("hero", motion);
    return this.drawSprite(d, image, x, bottom, facing, 14, 44);
  }

  drawSena(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    masked: boolean, motion: StoryPersonMotion,
  ): boolean {
    const image = this.selectedFrame("sena", motion);
    const hand = this.senaHandPose(motion);
    const ready = this.drawSprite(d, image, x, bottom, facing, 15, 46, 1, hand);
    if (!ready) return false;
    this.drawSenaHand(d, x, bottom, facing, motion, hand);
    if (masked) this.drawSenaMask(d, x, bottom, facing, motion, 0, 1);
    return true;
  }

  drawLeavingSenaMask(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    motion: StoryPersonMotion, drop: number, alpha: number,
  ): void {
    this.drawSenaMask(d, x, bottom, facing, motion, drop, alpha, true);
  }

  senaRingAnchor(
    x: number, bottom: number, facing: -1 | 1, motion: StoryPersonMotion,
  ): { x: number; y: number } {
    const hand = this.senaHandPose(motion);
    const lower = this.handLower(motion);
    const handX = facing > 0
      ? x + hand.x - 15
      : x - (hand.x - 15) - hand.w;
    const handY = bottom + hand.y - 46 + lower;
    return {
      x: facing > 0 ? handX + hand.w : handX - 1,
      y: handY + Math.min(2, hand.h - 1),
    };
  }

  private selectedFrame(subject: Subject, motion: StoryPersonMotion): HTMLImageElement | undefined {
    const frames = this.frames(subject, motion.mode);
    const index = motion.mode === "idle" ? Math.abs(motion.frame) % 2 : Math.abs(motion.frame) % 4;
    return frames[index];
  }

  private senaHandPose(motion: StoryPersonMotion): HandPose {
    return motion.mode === "idle"
      ? SENA_IDLE_HANDS[Math.abs(motion.frame) % 2]!
      : SENA_WALK_HANDS[Math.abs(motion.frame) % 4]!;
  }

  private handLower(motion: StoryPersonMotion): number {
    return Math.round(Math.max(0, Math.min(1, motion.ringHandLower ?? 0)) * 3);
  }

  private drawSenaHand(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    motion: StoryPersonMotion, hand: HandPose,
  ): void {
    const lower = this.handLower(motion);
    const handX = facing > 0
      ? Math.round(x + hand.x - 15)
      : Math.round(x - (hand.x - 15) - hand.w);
    const originalY = Math.round(bottom + hand.y - 46);
    if (lower > 0) {
      // 袖口から手までを青緑2pxでつなぎ、下降時だけ透明な切れ目が出るのを防ぐ。
      const sleeveX = facing > 0 ? handX : handX + hand.w - 2;
      d.rect(sleeveX, originalY, Math.min(2, hand.w), lower + 1, "#3f746b");
    }
    const handY = originalY + lower;
    d.rect(handX, handY, hand.w, hand.h, "#d56d3e");
    const lightX = facing > 0 ? handX + 1 : handX;
    d.rect(lightX, handY + 1, Math.max(1, hand.w - 1), Math.max(1, hand.h - 1), "#ebab79");
    const ring = this.senaRingAnchor(x, bottom, facing, motion);
    d.rect(ring.x - facing, ring.y, 1, 1, "#8d7452");
    d.rect(ring.x, ring.y, 1, 1, PAL.accentCool);
  }

  private maskPose(motion: StoryPersonMotion): { x: number; y: number } {
    return motion.mode === "idle"
      ? [{ x: 0, y: 0 }, { x: 0, y: 1 }][Math.abs(motion.frame) % 2]!
      : [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }][Math.abs(motion.frame) % 4]!;
  }

  private drawSenaMask(
    d: Display, x: number, bottom: number, facing: -1 | 1,
    motion: StoryPersonMotion, drop: number, alpha: number, cracked = false,
  ): void {
    if (alpha <= 0) return;
    const pose = this.maskPose(motion);
    const maskX = 1 + pose.x;
    const maskY = -39 + pose.y + drop;
    d.ctx.save();
    d.ctx.globalAlpha = alpha;
    d.ctx.translate(x, bottom);
    d.ctx.scale(facing, 1);
    d.rect(maskX + 1, maskY, 3, 1, "#e6dfc2");
    d.rect(maskX, maskY + 1, 5, 5, "#c9c9ad");
    d.rect(maskX + 1, maskY + 6, 4, 1, "#869687");
    d.rect(maskX + 3, maskY + 2, 2, 1, "#18302b");
    d.rect(maskX + 4, maskY + 4, 1, 2, "#8d9b88");
    if (cracked) {
      d.rect(maskX + 2, maskY + 5, 1, 2, "#6f7e73");
      d.rect(maskX + 3, maskY + 6, 1, 1, "#6f7e73");
    }
    d.ctx.restore();
  }
}
