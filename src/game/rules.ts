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

/** 各メッセージを丸ごとコピーしても実行できるよう、見出しもJSのコメントにする。 */
export function printRuleHelp(): void {
  console.log(
    "// 焚書の夜：世界のルールを書き換える\n"
    + "// 下の使いたいプログラムをコピーして、Consoleの入力欄に貼り付けてEnter。\n"
    + "// 保存・再読み込みは不要です。次の詠唱から反映されます。\n"
    + "// 再読み込みすると、index.htmlに書かれた設定へ戻ります。",
  );
  const programs = [
    ["攻撃力最大化のプログラム（呪文ダメージ100万倍）", "window.GAME_RULES.damageMultiplier = 1000000"],
    ["攻撃力100倍のプログラム", "window.GAME_RULES.damageMultiplier = 100"],
    ["MPを無限にするプログラム", "window.GAME_RULES.infiniteMp = true"],
    ["攻撃力を元に戻すプログラム", "window.GAME_RULES.damageMultiplier = 1"],
    ["MPの消費を元に戻すプログラム", "window.GAME_RULES.infiniteMp = false"],
    ["両方まとめて元に戻すプログラム", "window.GAME_RULES = { damageMultiplier: 1, infiniteMp: false }"],
  ];
  for (const [label, code] of programs) console.log(`// ${label}\n${code}`);
}
