/** 導入戦と、全25戦の確定語ルート・補給区間が詰まないことを検査する。 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Battle, spawn } from "../src/battle/model.ts";
import { encounterRuleById, series2EnemyById } from "../src/battle/series2.ts";
import { ITEM_MP, Player } from "../src/game/player.ts";
import { spellFor } from "../src/spell/book.ts";

const errors: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) errors.push(message);
};

const rule = encounterRuleById("intro_boundary_beast");
if (!rule) throw new Error("intro_boundary_beastのEncounterRuleがありません");
const enemy = series2EnemyById("boundary_beast");
const slane = spellFor("SLANE");
if (!slane) throw new Error("SLANEの呪文データがありません");
const ziror = spellFor("ZIROR");
const torme = spellFor("TORME");
if (!ziror || !torme) throw new Error("第二章の確定語が呪文データにありません");

const player = new Player();
check(player.mp >= slane.mp, `初期MP ${player.mp}ではSLANEのMP ${slane.mp}を払えません`);
check(slane.id === rule.requiredSpellId, "SLANEのspellIdと導入戦の必須IDが一致しません");
check(slane.mp === 9, `SLANEの正典MPが9から変わっています（現在${slane.mp}）`);
check(enemy.atk > 0, "誤入力を続けても敗北せず、再試行へ到達できません");

const battle = new Battle(player, spawn(enemy), rule);
const report = battle.cast("SLANE");
check(report.kind === "CAST", "初期状態でSLANEを詠唱できません");
check(player.mp === player.maxMp - slane.mp, "SLANE詠唱時のMP消費が呪文データと一致しません");
check(battle.enemy.hp === 0, "SLANE一回で物語決着になりません");

const wrongPlayer = new Player();
const wrongBattle = new Battle(wrongPlayer, spawn(enemy), rule);
wrongBattle.cast("DIZO");
check(wrongBattle.enemy.hp === 1, "別の大技だけで導入戦を終えられます");
check(wrongPlayer.mp >= slane.mp, "別の一語を試すだけでSLANE用MPを失います");

// 第二章はランダム発掘なしでも進める。確定攻撃SLANEで必要な手数とMPを数える。
const chapter2Encounters = [
  ["moss_wolf_edge", "moss_wolf"],
  ["moss_wolf_creek", "moss_wolf"],
  ["snare_vine_path", "snare_vine"],
  ["hush_moth_bridge", "hush_moth"],
  ["hollow_boar_camp", "hollow_boar"],
  ["snare_vine_root", "snare_vine"],
  ["white_antler_echo", "white_antler"],
  ["root_warden", "root_warden"],
] as const;

let chapter2OffenseMp = 0;
let rootHits = 0;
for (const [encounterId, enemyId] of chapter2Encounters) {
  const testPlayer = new Player();
  testPlayer.mp = 999;
  testPlayer.grimoire.set(slane.id, slane.canonical);
  const testBattle = new Battle(
    testPlayer,
    spawn(series2EnemyById(enemyId)),
    encounterRuleById(encounterId),
  );
  let hits = 0;
  while (testBattle.enemy.hp > 0 && hits < 20) {
    const beforeMp = testPlayer.mp;
    const cast = testBattle.cast(slane.canonical);
    check(cast.kind === "CAST", `${enemyId}: SLANEを詠唱できません`);
    chapter2OffenseMp += beforeMp - testPlayer.mp;
    hits++;
  }
  check(testBattle.enemy.hp === 0, `${enemyId}: SLANE 20回以内で戦闘を終えられません`);
  if (enemyId === "root_warden") rootHits = hits;
}

const hushMoth = series2EnemyById("hush_moth");
check(hushMoth.skill?.kind === "SILENCE", "ささやき蛾が短い忘却を持っていません");
check(hushMoth.skill?.turns === 2, "ささやき蛾の忘却が2ターンではありません");
check(torme.power > series2EnemyById("root_warden").atk + 2,
  "TORMEの回復量が根の番人の最大通常攻撃を上回りません");
check(rootHits <= 4, `根の番人がSLANE ${rootHits}回必要で長すぎます`);

// 固定戦だけを進めたときの成長曲線。洞窟の途中でLv3、番人戦後にLv4へ届く。
const growthPlayer = new Player();
for (const enemyId of ["moss_wolf", "moss_wolf", "snare_vine", "hush_moth", "hollow_boar"]) {
  growthPlayer.gainXp(series2EnemyById(enemyId).xp ?? 0);
}
check(growthPlayer.xp === 62 && growthPlayer.level === 2,
  `根洞窟入口がLv2・経験値62ではありません（Lv${growthPlayer.level} / ${growthPlayer.xp}）`);
growthPlayer.gainXp(series2EnemyById("snare_vine").xp ?? 0);
check(growthPlayer.xp === 74 && growthPlayer.level === 2, "根洞窟入口の一戦だけでLv3になっています");
growthPlayer.gainXp(series2EnemyById("white_antler").xp ?? 0);
check(growthPlayer.xp === 90 && growthPlayer.level === 3, "反響回廊を越えてもLv3になりません");
growthPlayer.gainXp(series2EnemyById("root_warden").xp ?? 0);
check(growthPlayer.xp === 130 && growthPlayer.level === 4, "根の番人戦後にLv4になりません");
const beforeStaff = growthPlayer.attack;
const staff = growthPlayer.acquireWeapon("white_root_staff");
check(staff?.attack === 20, "白根の杖が攻撃+20ではありません");
check(growthPlayer.attack === beforeStaff + 20, "杖の攻撃力が加算になっていません");
check(Math.abs(growthPlayer.attackMultiplier - 1.29) < 0.0001,
  `Lv4＋白根の杖の呪文倍率が1.29ではありません（${growthPlayer.attackMultiplier}）`);

const postIntroMp = player.maxMp - slane.mp;
const itemMp = 3 * 30 + 90;
const healingAllowance = torme.mp * 6;
check(
  postIntroMp + itemMp >= chapter2OffenseMp + ziror.mp + healingAllowance,
  `第二章の確定語ルートにMP余裕がありません（必要${chapter2OffenseMp + ziror.mp + healingAllowance}）`,
);

// 全編の戦闘配置をパネル順に読み、ランダム発掘なしの確定語だけで決着できるかを検査する。
type PanelData = {
  id: string;
  encounters: Array<{ id: string; enemy: string }>;
};
const panels = JSON.parse(
  readFileSync(join(import.meta.dirname, "../data/series2/panels.json"), "utf8"),
) as PanelData[];
const fullRoute = panels.flatMap((panel) =>
  panel.encounters.map((encounter) => ({ ...encounter, panelId: panel.id }))
);
check(fullRoute.length === 25, `全編戦闘配置が25件ではありません（現在${fullRoute.length}件）`);

const zhelen = spellFor("ZHELEN");
const duska = spellFor("DUSKA");
const visle = spellFor("VISLE");
if (!zhelen || !duska || !visle) throw new Error("第三・四章の確定語が呪文データにありません");

const segmentEnds = new Set([
  "hollow_boar_camp",      // 狩人の熾火
  "root_warden",           // 第三章出発時の休息
  "name_leech_archive",    // 外縁記録庫の小さな火
  "duska_seal_trial",      // 守護核前の休息
  "white_antler_overlook", // 最終戦前の休息
  "sena_guardian",
]);
const segmentMp: number[] = [];
let currentSegmentMp = 0;
let zhelenAvailable = false;
let maxRouteHits = 0;

for (const encounter of fullRoute) {
  if (series2EnemyById(encounter.enemy).dummy) continue;
  const routePlayer = new Player();
  routePlayer.maxHp = 999;
  routePlayer.hp = 999;
  routePlayer.maxMp = 999;
  routePlayer.mp = 999;
  for (const word of ["SLANE", "ZIROR", "TORME", "ZHELEN", "DUSKA", "VISLE"]) {
    const known = spellFor(word);
    if (known) routePlayer.grimoire.set(known.id, word);
  }

  const routeRule = encounterRuleById(encounter.id);
  const routeBattle = new Battle(
    routePlayer,
    spawn(series2EnemyById(encounter.enemy)),
    routeRule,
  );
  const routeWord = routeRule?.requiredNormalizedWord
    ?? (encounter.id === "sena_guardian" || !zhelenAvailable ? "SLANE" : "ZHELEN");
  let hits = 0;
  const beforeBattleMp = routePlayer.mp;

  while (routeBattle.enemy.hp > 0 && !routeBattle.finalCallActive && hits < 10) {
    const report = routeBattle.cast(routeWord);
    check(report.kind === "CAST", `${encounter.id}: 確定語${routeWord}を詠唱できません`);
    hits++;
  }

  if (encounter.id === "sena_guardian") {
    check(routeBattle.finalCallActive, "最終戦が確定攻撃からCALLへ移行しません");
    const beforeCallMp = routePlayer.mp;
    const call = routeBattle.cast("SENA");
    check(call.kind === "CALL" && routeBattle.finalCallComplete, "最終戦をSENAで終えられません");
    check(routePlayer.mp === beforeCallMp, "SENA呼びかけがMPを消費しています");
  } else {
    check(routeBattle.enemy.hp === 0, `${encounter.id}: ${routeWord} 10回以内で決着できません`);
  }

  maxRouteHits = Math.max(maxRouteHits, hits);
  currentSegmentMp += beforeBattleMp - routePlayer.mp;
  if (segmentEnds.has(encounter.id)) {
    segmentMp.push(currentSegmentMp);
    currentSegmentMp = 0;
  }
  if (encounter.id === "seal_sentinel_courtyard") zhelenAvailable = true;
}

// 明示休息の間で使う固定の補給割当。余りはTORMEやVISLEの操作余裕になる。
const segmentBudgets = [
  player.maxMp + ITEM_MP.ink,
  player.maxMp,
  player.maxMp + ITEM_MP.ink * 2,
  player.maxMp,
  player.maxMp + ITEM_MP.drop,
  player.maxMp,
];
const utilityAllowance = [torme.mp, torme.mp * 2, torme.mp, torme.mp * 2, torme.mp * 4, visle.mp];
check(segmentMp.length === segmentBudgets.length, `補給区間が${segmentBudgets.length}区間ではありません`);
for (let i = 0; i < segmentBudgets.length; i++) {
  const spent = segmentMp[i] ?? Infinity;
  const allowance = utilityAllowance[i] ?? Infinity;
  const budget = segmentBudgets[i] ?? -Infinity;
  check(
    spent + allowance <= budget,
    `補給区間${i + 1}: 確定攻撃${spent}MP + 操作余裕${allowance}MP > 予算${budget}MP`,
  );
}
check(maxRouteHits <= 6, `一戦の確定攻撃が最大${maxRouteHits}手で長すぎます`);

if (errors.length > 0) {
  console.error(`シリーズ2バランス検査: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `シリーズ2バランス検査 OK: 初期MP ${player.maxMp} / SLANE MP ${slane.mp} / ` +
  `白樹の獣 HP ${enemy.hp}・攻撃 ${enemy.atk} / ` +
  `第二章SLANE ${chapter2OffenseMp}MP・根の番人${rootHits}手 / ` +
  `全${fullRoute.length}戦・最大${maxRouteHits}手・区間MP ${segmentMp.join("/")}`,
);
