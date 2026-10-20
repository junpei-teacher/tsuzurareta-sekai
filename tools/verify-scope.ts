/** 制作上限と、Phase 7実装が凍結済み計画台帳と一致することを検査する。 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;

type Scope = {
  limits: Record<string, number>;
  panels: string[];
  portraits: string[];
  namedNpcs: string[];
  enemies: Array<{ id: string; boss: boolean; intro?: boolean }>;
  encounterPlacements: string[];
  newSpells: Array<{ id: number; canonical: string }>;
  enterableBuildings: string[];
  endings: string[];
  dialogueFiles: string[];
  permanentPartyMembers: string[];
};

const scope = read<Scope>("data/scope.json");
const panelDefs = read<Array<{
  id: string;
  actors: Array<{ id: string; ending?: boolean }>;
  interactables: Array<{ id: string; ending?: boolean }>;
  encounters: Array<{ id: string }>;
}>>("data/series2/panels.json");
const enemyDefs = read<{ enemies: Array<{ id: string; boss?: boolean }> }>("data/series2/enemies.json").enemies;
const spells = read<{ spells: Array<{ id: number; canonical: string }> }>("data/spells.json").spells;
const errors: string[] = [];

const entries: Array<[keyof Scope, keyof Scope["limits"]]> = [
  ["panels", "panels"],
  ["portraits", "portraits"],
  ["namedNpcs", "namedNpcs"],
  ["enemies", "enemies"],
  ["encounterPlacements", "encounterPlacements"],
  ["newSpells", "newSpells"],
  ["enterableBuildings", "enterableBuildings"],
  ["endings", "endings"],
  ["dialogueFiles", "dialogueFiles"],
  ["permanentPartyMembers", "permanentPartyMembers"],
];

for (const [field, limitName] of entries) {
  const count = (scope[field] as unknown[]).length;
  const limit = scope.limits[String(limitName)];
  if (limit === undefined) errors.push(`${String(limitName)}の上限がありません`);
  else if (count > limit) errors.push(`${String(field)}: ${count} > 上限${limit}`);
}

const bosses = scope.enemies.filter((enemy) => enemy.boss);
const bossLimit = scope.limits.bosses;
if (bossLimit === undefined) errors.push("bossesの上限がありません");
else if (bosses.length > bossLimit) errors.push(`bosses: ${bosses.length} > 上限${bossLimit}`);
if (scope.enemies.filter((enemy) => enemy.intro).some((enemy) => enemy.boss)) {
  errors.push("導入戦の敵をボス3体へ数えています");
}

function unique(values: string[], label: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) errors.push(`${label}に重複: ${[...new Set(duplicates)].join(", ")}`);
}
unique(scope.panels, "panels");
unique(scope.portraits, "portraits");
unique(scope.namedNpcs, "namedNpcs");
unique(scope.enemies.map((enemy) => enemy.id), "enemies");
unique(scope.encounterPlacements, "encounterPlacements");
unique(scope.newSpells.map((spell) => String(spell.id)), "newSpells.id");

const plannedPanels = new Set(scope.panels);
for (const panel of panelDefs) if (!plannedPanels.has(panel.id)) errors.push(`未計画の実装パネル: ${panel.id}`);
const actualPanels = new Set(panelDefs.map((panel) => panel.id));
for (const planned of scope.panels) if (!actualPanels.has(planned)) errors.push(`未実装の計画パネル: ${planned}`);
const plannedEnemies = new Set(scope.enemies.map((enemy) => enemy.id));
for (const enemy of enemyDefs) if (!plannedEnemies.has(enemy.id)) errors.push(`未計画の実装敵: ${enemy.id}`);
const actualEnemies = new Map(enemyDefs.map((enemy) => [enemy.id, enemy]));
for (const planned of scope.enemies) {
  const actual = actualEnemies.get(planned.id);
  if (!actual) errors.push(`未実装の計画敵: ${planned.id}`);
  else if (Boolean(actual.boss) !== planned.boss) {
    errors.push(`${planned.id}: boss=${Boolean(actual.boss)} != 計画${planned.boss}`);
  }
}

const actualEncounterIds = panelDefs.flatMap((panel) => panel.encounters.map((encounter) => encounter.id));
const plannedEncounters = new Set(scope.encounterPlacements);
const actualEncounters = new Set(actualEncounterIds);
for (const actual of actualEncounterIds) {
  if (!plannedEncounters.has(actual)) errors.push(`未計画の戦闘配置: ${actual}`);
}
for (const planned of scope.encounterPlacements) {
  if (!actualEncounters.has(planned)) errors.push(`未実装の戦闘配置: ${planned}`);
}

const endingActions = panelDefs.flatMap((panel) => [...panel.actors, ...panel.interactables])
  .filter((action) => action.ending);
if (endingActions.length !== scope.endings.length) {
  errors.push(`エンディング導線: 実装${endingActions.length} != 計画${scope.endings.length}`);
}

for (const file of scope.dialogueFiles) {
  const path = join(ROOT, `data/series2/dialogue/${file}.json`);
  if (!existsSync(path)) errors.push(`未実装の会話ファイル: ${file}.json`);
}

for (const planned of scope.newSpells) {
  const actual = spells.find((spell) => spell.id === planned.id);
  if (!actual) errors.push(`新語spellId ${planned.id}が呪文表にありません`);
  else if (actual.canonical !== planned.canonical) {
    errors.push(`spellId ${planned.id}: canonical ${actual.canonical} != 計画${planned.canonical}`);
  }
}

if (errors.length > 0) {
  console.error(`制作上限検査: ${errors.length}件の不整合`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `制作上限検査 OK: ${scope.panels.length}/${scope.limits.panels}画面、` +
  `${scope.enemies.length}/${scope.limits.enemies}敵（ボス${bosses.length}/${bossLimit ?? "?"}）、` +
  `${scope.encounterPlacements.length}/${scope.limits.encounterPlacements}戦、` +
  `${scope.newSpells.length}/${scope.limits.newSpells}新語、ED ${scope.endings.length}`,
);
