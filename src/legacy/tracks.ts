import type { TrackManifest } from "../core/tracks.ts";

/** シリーズ1検証画面でだけ登録する旧BGM。通常ビルドには含めない。 */
export const LEGACY_TRACKS = {
  "legacy.opening": "/assets/audio/bgm/opening.mp3",
  "legacy.ch1": "/assets/audio/bgm/ch1.mp3",
  "legacy.ch2": "/assets/audio/bgm/ch2.mp3",
  "legacy.ch3": "/assets/audio/bgm/ch3.mp3",
  "legacy.battle": "/assets/audio/bgm/battle.mp3",
  "legacy.boss": "/assets/audio/bgm/boss.mp3",
  "legacy.ending": "/assets/audio/bgm/ending.mp3",
} as const satisfies TrackManifest;
