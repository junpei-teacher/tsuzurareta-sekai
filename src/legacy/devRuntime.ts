import { MANIFEST } from "../core/assets.ts";
import type { Audio } from "../core/audio.ts";
import { loadImages } from "../core/imageLoader.ts";
import type { Keyboard } from "../core/input.ts";
import type { Scene } from "../core/scene.ts";
import { resolveEnding } from "../ending/resolve.ts";
import { FieldState } from "../field/state.ts";
import type { Player } from "../game/player.ts";
import { saveProgress } from "../game/save.ts";
import { BattleScene } from "../scenes/battle.ts";
import { CasterTestScene } from "../scenes/casterTest.ts";
import { EndingScene } from "../scenes/ending.ts";
import { FieldScene } from "../scenes/field.ts";
import { SelectScene } from "../scenes/select.ts";
import { VaultScene } from "../scenes/vault.ts";
import { missingWangIndices } from "../field/tileset.ts";
import { LEGACY_TRACKS } from "./tracks.ts";
import { LEGACY_ENEMIES } from "./enemies.ts";

type Context = {
  keyboard: Keyboard;
  player: Player;
  audio: Audio;
  setScene: (scene: Scene) => void;
  onExit: () => void;
};

/**
 * シリーズ1由来の戦闘・呪文検証環境。
 * DEVで「ためす」を選んだ時だけ動的 import され、画像もその時初めて読む。
 */
export async function startLegacyDev(ctx: Context): Promise<{ field: FieldState }> {
  const missing = missingWangIndices();
  if (missing.length > 0) console.error(`Wangタイルに欠番があります: ${missing.join(", ")}`);

  ctx.audio.registerTracks(LEGACY_TRACKS);
  const images = await loadImages(MANIFEST);
  const field = new FieldState();
  const chapterMusic: Record<number, string> = {
    1: "legacy.ch1", 2: "legacy.ch2", 3: "legacy.ch3",
  };

  const goVault = (): void => {
    ctx.audio.stop();
    ctx.setScene(new VaultScene((words) => {
      const result = resolveEnding(words, ctx.player.name);
      ctx.audio.play("legacy.ending");
      ctx.setScene(new EndingScene(result, ctx.player, ctx.onExit));
    }));
  };

  const goField = (): void => {
    ctx.audio.play(chapterMusic[field.chapter] ?? "legacy.ch1");
    ctx.setScene(new FieldScene(
      ctx.keyboard,
      ctx.player,
      field,
      images,
      (enemyId, cellKey) => {
        const def = LEGACY_ENEMIES.find((enemy) => enemy.id === enemyId);
        if (!def) {
          console.warn(`敵 ${enemyId} が見つかりません`);
          return;
        }
        ctx.audio.play(def.boss ? "legacy.boss" : "legacy.battle");
        ctx.setScene(new BattleScene(ctx.player, def, images, (result) => {
          if (result === "WIN") field.defeated.add(cellKey);
          if (result !== "WIN") field.pendingReward = null;
          if (result === "LOSE") field.restartChapter(ctx.player);
          saveProgress(ctx.player);
          goField();
        }, { onKnowledgeChange: () => saveProgress(ctx.player) }));
      },
      goVault,
      ctx.onExit,
    ));
  };

  const startChapter = (chapter: number): void => {
    if (ctx.player.grimoire.size === 0) ctx.player.grimoire.set(20, "ROZHA");
    field.startChapter(chapter, ctx.player);
    goField();
  };

  const goSelect = (): void => {
    ctx.audio.play("legacy.opening");
    ctx.setScene(new SelectScene(
      ctx.player,
      (enemy) => {
        ctx.audio.play(enemy.boss ? "legacy.boss" : "legacy.battle");
        ctx.setScene(new BattleScene(ctx.player, enemy, images, () => {
          saveProgress(ctx.player);
          goSelect();
        }, { onKnowledgeChange: () => saveProgress(ctx.player) }));
      },
      () => ctx.setScene(new CasterTestScene(goSelect)),
      startChapter,
      goVault,
      ctx.onExit,
    ));
  };

  goSelect();
  return { field };
}
