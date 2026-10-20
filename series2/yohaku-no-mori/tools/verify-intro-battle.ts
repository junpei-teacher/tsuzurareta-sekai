/** 第一章導入戦の「SLANEだけが勝利条件」契約を検査する。 */
import { Battle, spawn } from "../src/battle/model.ts";
import { encounterRuleById, series2EnemyById } from "../src/battle/series2.ts";
import { Player } from "../src/game/player.ts";
import { resolveSpell } from "../src/spell/resolver.ts";

const errors: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) errors.push(message);
};
const advanceMessages = (battle: Battle): void => {
  while (battle.phase === "MESSAGE") battle.advance();
};

const enemy = series2EnemyById("boundary_beast");
const rule = encounterRuleById("intro_boundary_beast");
if (!rule) throw new Error("intro_boundary_beastのEncounterRuleがありません");

const attackPlayer = new Player();
const attackBattle = new Battle(attackPlayer, spawn(enemy), rule);
check(rule.nonlethalVictory === true, "導入戦の非殺傷演出が指定されていません");
check(
  attackBattle.messages.join("\n") === rule.introLines?.join("\n"),
  "導入戦の開始文が専用の境界描写になっていません",
);
check(attackBattle.messages.some((line) => line.includes("枝角")), "開始文が道を守る枝角を描写していません");
advanceMessages(attackBattle);
attackBattle.cast("DIZO");
check(attackBattle.enemy.hp === 1, "SLANE以外の大技で導入戦の敵を倒せます");
check(attackBattle.phase !== "WIN", "SLANE以外で勝利状態へ入りました");

let collision = "";
for (let i = 0; i < 10000; i++) {
  const candidate = `TEST${i}`;
  if (candidate !== "SLANE" && resolveSpell(candidate).spellId === 24) {
    collision = candidate;
    break;
  }
}
check(collision.length > 0, "ID24へ着地する検査用の別綴りを見つけられません");
if (collision) {
  const collisionPlayer = new Player();
  const collisionBattle = new Battle(collisionPlayer, spawn(enemy), rule);
  advanceMessages(collisionBattle);
  const beforeMp = collisionPlayer.mp;
  const report = collisionBattle.cast(collision);
  check(report.kind === "DUD", "ID24への別綴りをDUD相当で捕捉していません");
  check(!collisionPlayer.grimoire.has(24), "ID24への別綴りからSLANEを登録しています");
  check(beforeMp - collisionPlayer.mp === 3, "ID24への別綴りが通常DUD相当のMPを使っていません");
  const beforeHp = collisionPlayer.hp;
  collisionBattle.advance();
  const damage = beforeHp - collisionPlayer.hp;
  check(damage > 0, "不発後に敵の押し戻しが発生しません");
  check(
    collisionBattle.messages[0] === "白樹の獣は、枝角で行く手を押し返した。",
    "導入戦の敵行動が専用の押し戻し文になっていません",
  );
  check(collisionBattle.messages[1] === `${damage} のダメージ。`, "押し戻し文のダメージ置換が実測値と一致しません");
}

const successPlayer = new Player();
const successBattle = new Battle(successPlayer, spawn(enemy), rule);
advanceMessages(successBattle);
const success = successBattle.cast("slane");
check(success.kind === "CAST", "SLANEが正常に詠唱されません");
check(success.resolution.word === "SLANE", "SLANEの正規化完全一致に失敗しています");
check(successBattle.enemy.hp === 0, "SLANE成功後に物語勝利が成立しません");
check(successPlayer.grimoire.get(24) === "SLANE", "SLANE成功時に呪文帳へ初登録されません");
check(
  successBattle.messages.includes("白樹の獣は爪を収め、森の奥へ道を譲った。"),
  "SLANE成功時の非殺傷決着文がありません",
);
advanceMessages(successBattle);
check(successBattle.phase === "WIN", "SLANE成功後にWINへ遷移しません");
check(successBattle.resultLabel === "道を譲った", "導入戦が通常の撃破表示になっています");

const fleePlayer = new Player();
const fleeBattle = new Battle(fleePlayer, spawn(enemy), rule);
fleeBattle.flee();
check(fleeBattle.phase !== "FLED", "逃走不可の導入戦から逃げられます");

// 専用文を持たない通常戦は、従来の開始文とダメージ表示を維持する。
const normalPlayer = new Player();
const normalEnemy = series2EnemyById("moss_wolf");
const normalBattle = new Battle(normalPlayer, spawn(normalEnemy));
check(normalBattle.messages[0] === `${normalEnemy.name} が あらわれた。`, "通常戦の開始文へ導入演出が漏れています");
advanceMessages(normalBattle);
normalBattle.useItem("ink");
const normalHp = normalPlayer.hp;
normalBattle.advance();
check(normalBattle.messages[0] === `${normalEnemy.name} の こうげき。`, "通常戦の敵行動文が変わっています");
check(normalBattle.messages[1] === `${normalHp - normalPlayer.hp} のダメージ。`, "通常戦のダメージ表示が変わっています");

if (errors.length > 0) {
  console.error(`導入戦検証: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("導入戦検証 OK: SLANE完全一致／衝突秘匿／HP下限／逃走不可／非殺傷描写／通常戦互換");
