import type { StoryPersonMotion } from "../fx/storyArt.ts";

export const SERIES2_ENDING_PAGE_HOLD = [1.5, 3.4, 2.0] as const;

const VILLAGE_WALK_DELAY = 0.18;
const VILLAGE_WALK_DURATION = 2.9;
const VILLAGE_WALK_FPS = 6;
// 移動を終えても、両足が揃う歩行4コマ目まではアニメーションを続ける。
const VILLAGE_WALK_LAST_TICK = 19;

export interface VillageWalkState {
  progress: number;
  heroX: number;
  senaX: number;
  motion: StoryPersonMotion;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** エンディングの村道で、移動と足運びを同じ時計から再現する。 */
export function villageWalkStateAt(pageClock: number): VillageWalkState {
  const walkTime = Math.max(0, pageClock - VILLAGE_WALK_DELAY);
  const progress = clamp01(walkTime / VILLAGE_WALK_DURATION);
  const eased = 1 - (1 - progress) * (1 - progress);
  const walkTick = Math.floor(walkTime * VILLAGE_WALK_FPS);
  const walking = walkTick <= VILLAGE_WALK_LAST_TICK;
  const idleTime = Math.max(
    0,
    walkTime - (VILLAGE_WALK_LAST_TICK + 1) / VILLAGE_WALK_FPS,
  );

  return {
    progress,
    heroX: Math.round(390 - eased * 120),
    senaX: Math.round(438 - eased * 120),
    motion: {
      mode: walking ? "walk" : "idle",
      frame: walking ? walkTick % 4 : Math.floor(idleTime / 0.72) % 2,
    },
  };
}
