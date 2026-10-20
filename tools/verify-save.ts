import assert from "node:assert/strict";
import { createServer } from "vite";

// Vite経由で実際のマップと会話を読み、タブを開き直す状態を再現する。
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
} });
Object.defineProperty(globalThis, "document", { configurable: true, value: {
  createElement: () => ({ getContext: () => ({}) }),
} });
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
try {
  const { Player } = await server.ssrLoadModule("/src/game/player.ts") as typeof import("../src/game/player.ts");
  const { FieldState } = await server.ssrLoadModule("/src/field/state.ts") as typeof import("../src/field/state.ts");
  const { saveRun, loadRun, hasRun, clearRun } = await server.ssrLoadModule("/src/game/checkpoint.ts") as typeof import("../src/game/checkpoint.ts");
  const { saveProgress, loadProgress, clearProgress } = await server.ssrLoadModule("/src/game/save.ts") as typeof import("../src/game/save.ts");
  const { TitleScene } = await server.ssrLoadModule("/src/scenes/title.ts") as typeof import("../src/scenes/title.ts");
  const { FieldScene } = await server.ssrLoadModule("/src/scenes/field.ts") as typeof import("../src/scenes/field.ts");
  const { getMap, allMapIds } = await server.ssrLoadModule("/src/field/mapFormat.ts") as typeof import("../src/field/mapFormat.ts");
  const { speaker } = await server.ssrLoadModule("/src/ui/dialogue.ts") as typeof import("../src/ui/dialogue.ts");
  const kb = { isDown: () => false } as unknown as import("../src/core/input.ts").Keyboard;
  const noop = () => {};
  const player = new Player(), field = new FieldState();
  assert.equal(hasRun(), false);
  player.name = "TEST";
  player.grimoire.set(20, "ROZHA");
  player.seenFragments.add(3);
  saveProgress(player);
  assert.equal(loadProgress(new Player()), true, "旧セーブの知識も読み込める");
  assert.equal(hasRun(), false, "旧セーブだけなら再開は表示しない");
  field.startChapter(2, player);
  field.x = 12;
  field.facing = "left";
  field.defeated.add("ch1_reading:2,3");
  field.talkIndex.set("librarian", 2);
  player.hp = 41;
  player.mp = 17;
  player.items.ink = 1;
  assert.equal(saveRun(player, field), true);
  const restored = new Player(), restoredField = new FieldState();
  loadProgress(restored);
  assert.equal(loadRun(restored, restoredField), "field");
  assert.equal(restored.name, "TEST");
  assert.equal(restored.hp, 41);
  assert.equal(restored.mp, 17);
  assert.equal(restored.maxHp, 70);
  assert.equal(restored.items.ink, 1);
  assert.equal(restoredField.x, 12);
  assert.equal(restoredField.chapter, 2);
  assert.equal(restoredField.facing, "left");
  assert.ok(restoredField.defeated.has("ch1_reading:2,3"));
  assert.equal(restoredField.talkIndex.get("librarian"), 2);
  assert.equal(restored.grimoire.get(20), "ROZHA");
  assert.ok(restored.seenFragments.has(3));
  assert.deepEqual(restoredField.intro, field.intro, "章の文章も再開できる");
  assert.equal(hasRun(() => false), false, "存在しないマップ等は再開候補から外せる");
  assert.equal(hasRun(() => { throw new Error("マップなし"); }), false);

  let choice = "";
  const title = new TitleScene(restored, () => { choice = "start"; }, noop, noop, noop,
    () => { choice = "continue"; });
  title.update(0, ["Enter"]);
  assert.equal(choice, "continue", "再開が最初の選択肢");
  title.update(0, ["ArrowDown", "Enter"]);
  assert.equal(choice, "start", "新しく始める選択肢も残る");

  // 会話中の中断で、ミラの巡回や章の切り替えを飛ばさない。
  field.startChapter(1, player);
  field.intro = [];
  field.titleCard = null;
  const mira = getMap(field.mapId).entities.find((e) => e.ref === "mira")!;
  field.x = mira.x;
  field.y = mira.y + 1;
  field.facing = "up";
  saveRun(player, field);
  const scene = new FieldScene(kb, player, field, {}, noop, noop, noop);
  assert.equal(scene.canCheckpoint, true);
  scene.update(0, ["Enter"]);
  assert.equal(scene.canCheckpoint, false);
  loadRun(restored, restoredField);
  assert.equal(restoredField.talkIndex.has("mira"), false, "会話中は直前の区切りから再開");
  for (let i = 0; i < 100 && !scene.canCheckpoint; i++) scene.update(0, ["Enter"]);
  assert.equal(scene.canCheckpoint, true);
  saveRun(player, field);
  loadRun(restored, restoredField);
  assert.equal(restoredField.talkIndex.get("mira"), 1);
  assert.equal(restoredField.miraRoom, field.miraRoom);
  assert.deepEqual(restoredField.miraSeen, field.miraSeen);

  // ボスの台詞中に閉じても再戦でき、勝つ前に戦利品を渡さない。
  field.startChapter(3, player);
  field.intro = [];
  field.titleCard = null;
  const bossMap = allMapIds().map(getMap).find((map) => map.entities.some((e) => speaker(e.ref, 3)?.onEnter))!;
  const bossNpc = bossMap.entities.find((e) => speaker(e.ref, 3)?.onEnter)!;
  field.mapId = bossMap.id;
  saveRun(player, field);
  const bossScene = new FieldScene(kb, player, field, {}, noop, noop, noop);
  assert.equal(bossScene.canCheckpoint, false);
  loadRun(restored, restoredField);
  assert.equal(restoredField.pendingReward, null, "まだ勝っていない戦利品は復元しない");
  let battled = false;
  const replay = new FieldScene(kb, restored, restoredField, {}, () => { battled = true; }, noop, noop);
  for (let i = 0; i < 100 && !battled; i++) replay.update(0, ["Enter"]);
  assert.equal(battled, true);
  assert.equal(restoredField.pendingReward, null);
  restoredField.defeated.add(`${bossMap.id}:npc:${bossNpc.ref}`);
  saveRun(restored, restoredField);
  loadRun(player, field);
  assert.ok(field.defeated.has(`${bossMap.id}:npc:${bossNpc.ref}`), "倒したボスは復活しない");

  // 第2章の戦利品を、勝利直後に閉じた場合も受け取る。
  restoredField.startChapter(2, restored);
  restoredField.intro = [];
  restoredField.titleCard = null;
  const reward = speaker("soldier_stairs", 2)!.reward!;
  restoredField.pendingReward = reward;
  saveRun(restored, restoredField);
  loadRun(player, field);
  new FieldScene(kb, player, field, {}, noop, noop, noop);
  assert.equal(player.grimoire.get(reward.id), reward.word, "勝利直後に閉じても戦利品を受け取れる");
  assert.equal(field.pendingReward, null);

  saveRun(player, field, "vault");
  assert.equal(loadRun(restored, restoredField), "vault");
  clearRun();
  assert.equal(hasRun(), false);
  assert.equal(loadProgress(new Player()), true, "クリア後も知識は残る");
  storage.set("funsho-no-yoru/run/v1", "{");
  assert.equal(hasRun(), false, "壊れたJSONで起動を止めない");
  storage.set("funsho-no-yoru/run/v1", JSON.stringify({ version: 1, target: "field", player: {}, field: {} }));
  assert.equal(hasRun(), false, "内容が欠けたセーブも無視する");
  saveRun(player, field);
  clearProgress();
  assert.equal(hasRun(), false, "初期化は途中経過も消す");
  console.log("中断再開の検証OK：状態復元・旧セーブ・タイトル・会話・ボス・戦利品・破損データ");
} finally {
  await server.close();
  Reflect.deleteProperty(globalThis, "document");
  Reflect.deleteProperty(globalThis, "localStorage");
}
