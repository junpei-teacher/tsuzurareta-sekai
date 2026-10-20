/** 『余白の森』固定画面データの静的検査。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Gate = { allFlags?: string[]; noneFlags?: string[] };
type Exit = Gate & { to: string; spawn: number };
type Action = Gate & {
  id: string;
  x: number;
  dialogue: string;
  setFlags?: string[];
  objective?: string;
  enemy?: string;
  rewardWeapon?: string;
  winFlags?: string[];
  winObjective?: string;
  learnWords?: string[];
  restore?: boolean;
  riddles?: Array<{ spellId: number; mask: string; place: string }>;
  ending?: boolean;
};
type Panel = {
  id: string;
  chapter: number;
  theme: string;
  music: string;
  groundY: number;
  background: { renderer: string; far: string; middle: string; foreground: string };
  walk: { min: number; max: number };
  spawn: number;
  blocks: Array<Gate & { min: number; max: number }>;
  leftExit?: Exit;
  rightExit?: Exit;
  actors: Action[];
  interactables: Action[];
  encounters: Action[];
  objective: string;
};

const root = join(import.meta.dirname, "..");
const read = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;
const panels = read<Panel[]>("data/series2/panels.json");
const scope = read<{ dialogueFiles: string[] }>("data/scope.json");
const dialogue: Record<string, unknown> = {};
const dialogueOwners = new Map<string, string>();
const duplicateDialogue: string[] = [];
for (const name of scope.dialogueFiles) {
  const path = `data/series2/dialogue/${name}.json`;
  if (!existsSync(join(root, path))) continue;
  const table = read<Record<string, unknown>>(path);
  for (const [id, value] of Object.entries(table)) {
    const previous = dialogueOwners.get(id);
    if (previous) duplicateDialogue.push(`${id} (${previous} / ${path})`);
    dialogueOwners.set(id, path);
    dialogue[id] = value;
  }
}
const enemyData = read<{ enemies: Array<{ id: string; xp?: number; dummy?: boolean }> }>("data/series2/enemies.json");
const weaponData = read<{ weapons: Array<{ id: string }> }>("data/series2/weapons.json");
const spellData = read<{ spells: Array<{ id: number; canonical: string }> }>("data/spells.json");
const tracks = new Set(["title", "prologue", "village", "forest", "ruin", "battle", "boss", "ending", "silence"]);
const themes = new Set(["village", "forest", "ruin"]);
const enemyIds = new Set(enemyData.enemies.map((enemy) => enemy.id));
const weaponIds = new Set(weaponData.weapons.map((weapon) => weapon.id));
const canonicalWords = new Set(spellData.spells.map((spell) => spell.canonical).filter(Boolean));
const spellById = new Map(spellData.spells.map((spell) => [spell.id, spell]));
const externalFlags = new Set<string>();
const errors: string[] = [];
const globalActionIds = new Set<string>();
let encounterCount = 0;
let endingCount = 0;

for (const duplicate of duplicateDialogue) errors.push(`会話ID重複: ${duplicate}`);

const byId = new Map<string, Panel>();
for (const panel of panels) {
  if (byId.has(panel.id)) errors.push(`パネルID重複: ${panel.id}`);
  byId.set(panel.id, panel);
}

const declaredFlags = new Set(externalFlags);
for (const panel of panels) {
  for (const action of [...panel.actors, ...panel.interactables, ...panel.encounters]) {
    for (const flag of action.setFlags ?? []) declaredFlags.add(flag);
    for (const flag of action.winFlags ?? []) declaredFlags.add(flag);
  }
}

const checkGate = (owner: string, gate: Gate): void => {
  for (const flag of [...(gate.allFlags ?? []), ...(gate.noneFlags ?? [])]) {
    if (!declaredFlags.has(flag)) errors.push(`${owner}: 未定義フラグ ${flag}`);
  }
};

for (const panel of panels) {
  const owner = `panel:${panel.id}`;
  if (!themes.has(panel.theme)) errors.push(`${owner}: 不明なtheme ${panel.theme}`);
  if (!tracks.has(panel.music)) errors.push(`${owner}: 不明なmusic ${panel.music}`);
  if (!panel.objective.trim()) errors.push(`${owner}: objectiveが空です`);
  if (!(panel.walk.min <= panel.spawn && panel.spawn <= panel.walk.max)) {
    errors.push(`${owner}: spawn ${panel.spawn} が歩行範囲外です`);
  }
  if (!panel.background.far || !panel.background.middle || !panel.background.foreground) {
    errors.push(`${owner}: 背景の遠景・中景・前景が揃っていません`);
  }

  const localIds = new Set<string>();
  for (const action of [...panel.actors, ...panel.interactables, ...panel.encounters]) {
    const actionOwner = `${owner}/${action.id}`;
    if (localIds.has(action.id)) errors.push(`${owner}: action ID重複 ${action.id}`);
    localIds.add(action.id);
    if (globalActionIds.has(action.id)) errors.push(`全パネルでaction ID重複: ${action.id}`);
    globalActionIds.add(action.id);
    if (action.enemy) encounterCount++;
    if (action.ending) endingCount++;
    if (action.x < panel.walk.min || action.x > panel.walk.max) {
      errors.push(`${actionOwner}: x=${action.x} が歩行範囲外です`);
    }
    if (!(action.dialogue in dialogue)) errors.push(`${actionOwner}: 不明な会話 ${action.dialogue}`);
    if (action.enemy && !enemyIds.has(action.enemy)) errors.push(`${actionOwner}: 不明な敵 ${action.enemy}`);
    if (action.rewardWeapon && !weaponIds.has(action.rewardWeapon)) {
      errors.push(`${actionOwner}: 不明な武器報酬 ${action.rewardWeapon}`);
    }
    for (const word of action.learnWords ?? []) {
      if (!canonicalWords.has(word)) errors.push(`${actionOwner}: 不明な固定綴り ${word}`);
    }
    for (const riddle of action.riddles ?? []) {
      const spell = spellById.get(riddle.spellId);
      const pattern = riddle.mask.replaceAll(" ", "");
      if (!spell?.canonical) {
        errors.push(`${actionOwner}: 欠けた綴りのspellId ${riddle.spellId}にcanonicalがありません`);
      } else if (
        pattern.length !== spell.canonical.length
        || [...pattern].some((char, index) => char !== "_" && char !== spell.canonical[index])
      ) {
        errors.push(`${actionOwner}: 欠けた綴り ${riddle.mask} が ${spell.canonical} と一致しません`);
      }
      if (!riddle.place.trim()) errors.push(`${actionOwner}: 欠けた綴りの場所が空です`);
    }
    checkGate(actionOwner, action);
  }

  for (const [side, exit] of [["left", panel.leftExit], ["right", panel.rightExit]] as const) {
    if (!exit) continue;
    const exitOwner = `${owner}/${side}Exit`;
    const target = byId.get(exit.to);
    if (!target) {
      errors.push(`${exitOwner}: 出口先 ${exit.to} がありません`);
      continue;
    }
    if (exit.spawn < target.walk.min || exit.spawn > target.walk.max) {
      errors.push(`${exitOwner}: 出現位置 ${exit.spawn} が ${target.id} の歩行範囲外です`);
    }
    const reverse = side === "left" ? target.rightExit : target.leftExit;
    if (reverse?.to !== panel.id) errors.push(`${exitOwner}: ${target.id} からの反対側接続がありません`);
    checkGate(exitOwner, exit);
  }

  for (const block of panel.blocks) {
    if (block.min > block.max || block.min < panel.walk.min || block.max > panel.walk.max) {
      errors.push(`${owner}: 遮蔽物 ${block.min}..${block.max} が不正です`);
    }
    checkGate(`${owner}/block`, block);
  }
}

for (const enemy of enemyData.enemies) {
  if (!Number.isFinite(enemy.xp) || (enemy.xp ?? -1) < 0) errors.push(`enemy:${enemy.id}: 経験値が不正です`);
  if (enemy.dummy && enemy.xp !== 0) errors.push(`enemy:${enemy.id}: 稽古台に経験値があります`);
}

if (encounterCount !== 25) errors.push(`戦闘配置が25件ではありません（現在${encounterCount}件）`);
if (endingCount !== 1) errors.push(`単一エンディング導線が1件ではありません（現在${endingCount}件）`);

const start = "village_storehouse";
const required = "final_sanctum";
const reached = new Set<string>();
const queue = [start];
while (queue.length > 0) {
  const id = queue.shift()!;
  if (reached.has(id)) continue;
  reached.add(id);
  const panel = byId.get(id);
  if (!panel) continue;
  for (const exit of [panel.leftExit, panel.rightExit]) {
    if (exit && !reached.has(exit.to)) queue.push(exit.to);
  }
}
if (!reached.has(required)) errors.push(`開始地点 ${start} から必須地点 ${required} へ到達不能です`);

// 条件フラグを実際に積み上げ、最初の依頼から単一EDまで因果が閉じているか確認する。
const routeFlags = new Set<string>();
const routePanels = new Set<string>([start]);
const completedActions = new Set<string>();
const completedEncounters = new Set<string>();
let routeChanged = true;
let routePasses = 0;
const gateSatisfied = (gate: Gate): boolean =>
  (gate.allFlags ?? []).every((flag) => routeFlags.has(flag))
  && (gate.noneFlags ?? []).every((flag) => !routeFlags.has(flag));

while (routeChanged && routePasses++ < 200) {
  routeChanged = false;
  for (const panelId of [...routePanels]) {
    const panel = byId.get(panelId);
    if (!panel) continue;
    for (const exit of [panel.leftExit, panel.rightExit]) {
      if (exit && gateSatisfied(exit) && !routePanels.has(exit.to)) {
        routePanels.add(exit.to);
        routeChanged = true;
      }
    }
    for (const action of [...panel.actors, ...panel.interactables, ...panel.encounters]) {
      if (completedActions.has(action.id) || !gateSatisfied(action)) continue;
      completedActions.add(action.id);
      if (action.enemy) completedEncounters.add(action.id);
      for (const flag of [...(action.setFlags ?? []), ...(action.winFlags ?? [])]) {
        if (!routeFlags.has(flag)) {
          routeFlags.add(flag);
          routeChanged = true;
        }
      }
    }
  }
}
if (!routeFlags.has("ending_seen")) errors.push("開始状態からending_seenまで進行フラグが接続していません");
if (completedEncounters.size !== encounterCount) {
  errors.push(`因果経路で戦闘が全件開きません（${completedEncounters.size}/${encounterCount}件）`);
}
if (routePanels.size !== panels.length) {
  errors.push(`因果経路で全画面へ到達できません（${routePanels.size}/${panels.length}画面）`);
}

if (errors.length > 0) {
  console.error(`パネル検証: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `パネル検証 OK: ${panels.length}画面 / ${encounterCount}戦 / ED ${endingCount} / `
  + `${declaredFlags.size}フラグ / ${Object.keys(dialogue).length}会話`,
);
console.log(`到達確認: ${[...reached].join(" → ")}`);
console.log(`因果到達: ${completedEncounters.size}/${encounterCount}戦 → ending_seen`);
