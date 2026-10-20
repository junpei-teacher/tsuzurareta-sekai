/** v2保存形式とCheckpointの「世界は戻す／知識は残す」契約を検査する。 */
import {
  decodeProfile,
  decodeRun,
  restoreCheckpoint,
  withCheckpoint,
  type RunSave,
} from "../src/game/saveV2.ts";

const errors: string[] = [];
const check = (condition: boolean, message: string): void => {
  if (!condition) errors.push(message);
};

const base: RunSave = {
  version: 2,
  name: "YUTO",
  chapter: 1,
  position: { kind: "sideview", panelId: "village_road", x: 120, facing: 1 },
  flags: ["storehouse_reported"],
  knowledgeFlags: ["knowledge:merchant_date"],
  defeated: ["old_enemy"],
  grimoire: [[24, "SLANE"]],
  unspoken: [],
  riddles: [],
  hp: 21,
  maxHp: 30,
  mp: 52,
  maxMp: 90,
  level: 1,
  xp: 0,
  weapons: [],
  equippedWeapon: null,
  items: { ink: 2, drop: 1 },
  objective: "村門へ向かう",
};

const panelValidator = (id: string, x: number): boolean =>
  id === "village_road" && x >= 24 && x <= 456;

check(decodeRun(null, panelValidator) === null, "保存なしを新規開始として扱えません");
check(decodeRun("{broken", panelValidator) === null, "壊れたJSONを拒否できません");
check(decodeRun(JSON.stringify({ version: 1 }), panelValidator) === null, "試作v1を読み捨てていません");
check(decodeRun(JSON.stringify(base), panelValidator) !== null, "正常なv2を読めません");
const legacyGrowth = { ...base } as Partial<RunSave>;
delete legacyGrowth.level;
delete legacyGrowth.xp;
delete legacyGrowth.weapons;
delete legacyGrowth.equippedWeapon;
const migrated = decodeRun(JSON.stringify(legacyGrowth), panelValidator);
check(migrated?.level === 1 && migrated.xp === 0, "成長実装前のv2をLv1へ移行できません");
check(
  decodeRun(JSON.stringify({ ...base, position: { ...base.position, panelId: "missing" } }), panelValidator) === null,
  "存在しないパネルを拒否できません",
);
check(
  decodeRun(JSON.stringify({ ...base, items: { ink: -1, drop: 1 } }), panelValidator) === null,
  "負の道具数を拒否できません",
);
check(decodeProfile("{broken").discoveredWords.length === 0, "壊れたプロフィールを安全な初期値へ戻せません");

const checkpointed = withCheckpoint(base, "intro_beast");
const afterFailure: RunSave = {
  ...checkpointed,
  flags: [...checkpointed.flags, "battle_only_story_flag"],
  knowledgeFlags: [...checkpointed.knowledgeFlags, "knowledge:beast_avoids_killing"],
  defeated: [...checkpointed.defeated, "intro_beast"],
  grimoire: [...checkpointed.grimoire, [31, "FOUNDWORD"]],
  unspoken: [31],
  riddles: [[32, { mask: "A _ C", place: "導入戦" }]],
  hp: 0,
  mp: 3,
  items: { ink: 0, drop: 0 },
  level: 4,
  xp: 130,
  weapons: ["white_root_staff"],
  equippedWeapon: "white_root_staff",
  objective: "戦闘中に変わった目的",
};
const restored = restoreCheckpoint(afterFailure, "intro_beast");
check(restored !== null, "一致するCheckpointへ復帰できません");
if (restored) {
  check(restored.hp === base.hp && restored.mp === base.mp, "HP/MPがCheckpointへ戻りません");
  check(restored.items.ink === 2 && restored.items.drop === 1, "道具がCheckpointへ戻りません");
  check(restored.level === 1 && restored.xp === 0, "経験値とレベルがCheckpointへ戻りません");
  check(restored.weapons.length === 0 && restored.equippedWeapon === null, "装備がCheckpointへ戻りません");
  check(!restored.flags.includes("battle_only_story_flag"), "戦闘中の世界フラグが巻き戻っていません");
  check(!restored.defeated.includes("intro_beast"), "敗北した敵を撃破済みにしています");
  check(restored.grimoire.some(([id]) => id === 31), "敗北までに発見した言葉を失っています");
  check(restored.unspoken.includes(31), "未詠唱の知識を失っています");
  check(restored.riddles.some(([id]) => id === 32), "欠けた綴りを失っています");
  check(restored.knowledgeFlags.includes("knowledge:beast_avoids_killing"), "知識フラグを失っています");
  check(restored.checkpoint === undefined, "復帰後に古いCheckpointが残っています");
}
check(restoreCheckpoint(afterFailure, "other_enemy") === null, "不一致のactiveEncounterIdを受理しています");

if (errors.length > 0) {
  console.error(`v2セーブ検証: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("v2セーブ検証 OK: 正常／v1／破損／不正パネル／Checkpoint知識マージ");
