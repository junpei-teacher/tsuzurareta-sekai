import rawEnemies from "../../data/series2/enemies.json" with { type: "json" };
import type { EncounterRule, EnemyDef } from "./model.ts";

const enemies = (rawEnemies as unknown as { enemies: EnemyDef[] }).enemies;
const byId = new Map(enemies.map((enemy) => [enemy.id, enemy]));

export const SERIES2_ENEMIES: readonly EnemyDef[] = enemies;

export function series2EnemyById(id: string): EnemyDef {
  const enemy = byId.get(id);
  if (!enemy) throw new Error(`シリーズ2の敵が見つかりません: ${id}`);
  return enemy;
}

const RULES: Readonly<Record<string, EncounterRule>> = {
  intro_boundary_beast: {
    id: "intro_boundary_beast",
    canEscape: false,
    introLines: [
      "白樹の獣が、白い木の前へ立った。",
      "牙ではなく、白い枝角で道を塞いでいる。",
    ],
    nonlethalVictory: true,
    enemyActionLines: [
      "白樹の獣は、枝角で行く手を押し返した。",
      "{damage} のダメージ。",
    ],
    requiredNormalizedWord: "SLANE",
    requiredSpellId: 24,
    cannotKillBeforeRequiredSpell: true,
    victoryLabel: "道を譲った",
    victoryLines: [
      "淡い文字が、獣の額に一瞬だけ残った。",
      "白樹の獣は爪を収め、森の奥へ道を譲った。",
    ],
  },
  root_warden: {
    id: "root_warden",
    canEscape: false,
    victoryLabel: "縄張りを抜けた",
    victoryLines: [
      "根の番人は枝を伏せ、絡めていた道をほどいた。",
      "倒れたのではない。こちらが退かないと知り、境を譲った。",
      "ほどけた白い根が一本、杖となって手の内へ収まった。",
    ],
  },
  duska_seal_trial: {
    id: "duska_seal_trial",
    canEscape: false,
    requiredNormalizedWord: "DUSKA",
    requiredSpellId: 46,
    cannotKillBeforeRequiredSpell: true,
    victoryLabel: "封印を止めた",
    victoryLines: [
      "命令を読み上げていた封印衛の声が、静かに途切れた。",
      "欠けた綴りは埋まった。沈黙が、次の扉を開いた。",
    ],
  },
  nameless_choir: {
    id: "nameless_choir",
    canEscape: false,
    requiredNormalizedWord: "DUSKA",
    requiredSpellId: 46,
    cannotKillBeforeRequiredSpell: true,
    victoryLabel: "唱和を鎮めた",
    victoryLines: [
      "DUSKAの静けさが、重なっていた声を一つずつほどいた。",
      "唱和は消えず、ようやく自分の沈黙を取り戻した。",
    ],
  },
  sena_guardian: {
    id: "sena_guardian",
    canEscape: false,
    finalCallWord: "SENA",
    victoryLabel: "名前を呼んだ",
    preCallResponseLines: [
      "その名に、守人の左手が一瞬だけ止まった。",
      "けれど仮面は、まだ森を守るために立っている。",
    ],
    callTransitionLines: [
      "仮面に細いひびが入り、攻撃の言葉が遠のいた。",
      "記憶は白いまま。それでも、呼びたい名前が残っている。",
    ],
    wrongCallLines: [
      "その呼びかけではない。",
      "守人は攻撃せず、次の言葉を待っている。",
    ],
    callVictoryLines: [
      "「セナ」",
      "その名前だけが、忘却の向こうへ届いた。",
      "仮面の守人は左手を下ろした。",
    ],
  },
};

export function encounterRuleById(id: string): EncounterRule | null {
  return RULES[id] ?? null;
}
