/** 第二章以降の物語戦と、最終CALLの例外境界を検査する。 */
import { Battle, spawn } from "../src/battle/model.ts";
import { encounterRuleById, series2EnemyById } from "../src/battle/series2.ts";
import { Player } from "../src/game/player.ts";
import { spellFor } from "../src/spell/book.ts";

const errors: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) errors.push(message);
};

const duska = spellFor("DUSKA");
const slane = spellFor("SLANE");
if (!duska || !slane) throw new Error("物語戦の確定語が見つかりません");

for (const [encounterId, enemyId] of [
  ["duska_seal_trial", "seal_sentinel"],
  ["nameless_choir", "nameless_choir"],
] as const) {
  const rule = encounterRuleById(encounterId);
  if (!rule) throw new Error(`${encounterId}のEncounterRuleがありません`);
  const player = new Player();
  const battle = new Battle(player, spawn(series2EnemyById(enemyId)), rule);
  const report = battle.cast("DUSKA");
  check(report.kind === "CAST", `${encounterId}: DUSKAを詠唱できません`);
  check(battle.enemy.hp === 0, `${encounterId}: DUSKAで物語決着しません`);

  const wrongPlayer = new Player();
  const wrong = new Battle(wrongPlayer, spawn(series2EnemyById(enemyId)), rule);
  wrong.cast("DIZO");
  check(wrong.enemy.hp === 1, `${encounterId}: DUSKA以外でHP下限を越えます`);
}

const finalRule = encounterRuleById("sena_guardian");
if (!finalRule) throw new Error("sena_guardianのEncounterRuleがありません");
const finalPlayer = new Player();
finalPlayer.grimoire.set(slane.id, slane.canonical);
const finalBattle = new Battle(finalPlayer, spawn(series2EnemyById("sena_guardian")), finalRule);

const preCallMp = finalPlayer.mp;
const preCallHp = finalBattle.enemy.hp;
const early = finalBattle.cast("SENA");
check(early.kind === "CALL", "GUARDIAN中のSENAが通常呪文として処理されます");
check(finalPlayer.mp === preCallMp, "GUARDIAN中のSENAがMPを消費します");
check(finalBattle.enemy.hp === preCallHp, "GUARDIAN中のSENAがダメージを与えます");

let guardCasts = 0;
while (!finalBattle.finalCallActive && guardCasts < 10) {
  finalBattle.cast("SLANE");
  guardCasts++;
}
check(finalBattle.finalCallActive, "致死ダメージでCALLへ移行しません");
check(finalBattle.enemy.hp === 1, "CALL移行時に敵HPが1で止まりません");
check(finalBattle.memorySealed, "CALLで呪文帳が封じられません");

const callMp = finalPlayer.mp;
const callWords = finalPlayer.grimoire.size;
const wrongCall = finalBattle.cast("MIRA");
check(wrongCall.kind === "CALL", "CALL中の不一致がResolverへ流れます");
check(finalPlayer.mp === callMp, "CALL中の不一致がMPを消費します");
check(finalBattle.enemy.hp === 1, "CALL中の不一致で戦闘が終了します");

const call = finalBattle.cast("SENA");
check(call.kind === "CALL", "SENAが攻撃呪文として処理されます");
check(finalBattle.finalCallComplete, "SENA完全一致でCALLが完了しません");
check(finalBattle.enemy.hp === 0, "SENA完全一致後も敵HPが1のままです");
check(finalPlayer.mp === callMp, "SENAがMPを消費します");
check(finalPlayer.grimoire.size === callWords, "SENAが呪文帳へ登録されます");
check(![...finalPlayer.grimoire.values()].includes("SENA"), "SENAが呪文として残ります");

while (finalBattle.phase === "MESSAGE") finalBattle.advance();
check(finalBattle.phase === "WIN", "SENA完全一致後に戦闘がWINへ閉じません");

if (errors.length > 0) {
  console.error(`物語戦検証: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `物語戦検証 OK: DUSKA 2戦／最終GUARDIAN ${guardCasts}詠唱／CALL完全一致・無消費`,
);
