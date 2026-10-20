/** index.html に書いた値が、そのまま戦闘のルールになる。セーブには含めない。 */
export type GameRules = {
  damageMultiplier: number;
  infiniteMp: boolean;
};

declare global {
  interface Window {
    GAME_RULES?: Partial<GameRules>;
  }
}

export function getGameRules(): GameRules {
  const rules = typeof window === "undefined" ? undefined : window.GAME_RULES;
  const multiplier = rules?.damageMultiplier;
  return {
    damageMultiplier:
      typeof multiplier === "number" && Number.isFinite(multiplier)
      && multiplier >= 1 && multiplier <= 1_000_000 ? multiplier : 1,
    infiniteMp: rules?.infiniteMp === true,
  };
}
