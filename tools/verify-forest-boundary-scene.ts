/** 景観の差し替えが、足跡・会話・出現条件・保存に影響しないことを実Sceneで確認する。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { FOREST_BOUNDARY_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderForestBoundary } from "../src/fx/storyArt.ts";
import { Player } from "../src/game/player.ts";
import { SideViewScene } from "../src/sideview/scene.ts";
import type { SideViewState } from "../src/sideview/types.ts";

type Call = { name: string; args: unknown[] };
const calls: Call[] = [];
const ctx = new Proxy<Record<string, unknown>>({ globalAlpha: 1 }, {
  get(target, key: string) {
    if (key in target) return target[key];
    return (...args: unknown[]) => {
      calls.push({ name: `ctx.${key}`, args });
      if (key.startsWith("create") && key.endsWith("Gradient")) return { addColorStop() {} };
    };
  },
});
const d = new Proxy({ ctx }, {
  get(target, key: string) {
    if (key === "ctx") return target.ctx;
    return (...args: unknown[]) => {
      calls.push({ name: key, args });
      if (key === "measure") return String(args[0]).length * 12;
    };
  },
}) as unknown as Display;
const image = { complete: true, naturalWidth: 960, naturalHeight: 540 } as HTMLImageElement;
const imageCalls = () => calls.filter((call) => call.name === "ctx.drawImage");
const hasText = (text: string) => calls.some((call) => call.name.startsWith("text") && String(call.args[0]).includes(text));

assert.ok(SERIES2_MANIFEST[FOREST_BOUNDARY_BACKGROUND_ID]?.endsWith("backgrounds/forest_boundary/middle.png"), "正式素材からロードする");
renderForestBoundary(d, 2, { background: image, disturbed: false, atmosphere: false });
assert.equal(imageCalls().length, 1);
assert.deepEqual(imageCalls()[0]!.args, [image, 0, 0, 480, 270]);
assert.equal(calls.filter((call) => call.name === "rect").length, 0, "静景へ足跡や胞子を焼き込まない");

calls.length = 0;
renderForestBoundary(d, 2, { background: image, disturbed: true, atmosphere: false });
const tracks = calls.filter((call) => call.name === "rect");
assert.equal(tracks.length, 22, "足跡5組と掻き跡2本");
assert.ok(tracks.every((call) => Number(call.args[1]) >= 162 && Number(call.args[1]) <= 178), "全ての足跡が土道に乗る");

for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalWidth: 0 },
  { ...image, naturalWidth: 480 }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderForestBoundary(d, 2, { background: invalid as HTMLImageElement | undefined, disturbed: true });
  assert.equal(imageCalls().length, 0, "不正画像は描かない");
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"), "コード景観へ戻る");
}

for (const available of [true, false]) for (const stage of [0, 1, 2]) {
  let saves = 0;
  const state: SideViewState = {
    panelId: "forest_boundary", x: 170, facing: 1,
    flags: new Set(stage === 0 ? ["border_open"] : stage === 1 ? ["border_open", "intro_battle_won"]
      : ["border_open", "intro_battle_won", "ring_left_with_sena"]),
    defeated: new Set(stage > 0 ? ["intro_boundary_beast"] : []), objective: "白い木の境を確かめる",
  };
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard, new Player(), { play() {} } as unknown as Audio,
    () => {}, () => { saves++; return { ok: true }; }, () => {}, state, () => {},
    available ? { [FOREST_BOUNDARY_BACKGROUND_ID]: image } : {},
  );
  const before = { x: state.x, flags: [...state.flags], defeated: [...state.defeated] };
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasText("足跡を調べる"));
  field.update(1 / 60, ["Enter"]);
  field.update(10, []);
  calls.length = 0;
  field.render(d);
  assert.ok(hasText("獣の足跡は、すべて村と反対を向いている。"), "本編の調査会話が読める");
  assert.deepEqual({ x: state.x, flags: [...state.flags], defeated: [...state.defeated] }, before);
  assert.equal(saves, 0, "描画と調査会話開始で保存を更新しない");
}
// 素材あり・なしの両方で、村門から入り、導入戦の呼出と勝利後の往復を確認する。
for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "village_gate", x: 420, facing: 1, flags: new Set(["border_open"]),
    defeated: new Set(), objective: "白い木の境を確かめる",
  };
  const saves: string[] = [];
  const encounters: string[] = [];
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard, new Player(), { play() {} } as unknown as Audio,
    () => {}, (s) => { saves.push(s.panelId); return { ok: true }; },
    (encounter) => {
      encounters.push(encounter.id);
      // 戦闘自体は別テスト。ここでは勝利から探索へ戻った状態を再現する。
      for (const flag of encounter.winFlags ?? []) state.flags.add(flag);
      state.defeated.add(encounter.id);
    }, state, () => {}, available ? { [FOREST_BOUNDARY_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string, count = 1) => {
    for (let i = 0; i < count; i++) { field.update(0.1, [key]); field.update(0.5, []); }
  };
  const reach = (panelId: string, key: string) => {
    for (let i = 0; i < 80 && state.panelId !== panelId; i++) press(key);
    assert.equal(state.panelId, panelId);
  };
  reach("forest_boundary", "ArrowRight");
  press("ArrowRight", 24);
  assert.equal(state.x, 330);
  press("Enter");
  for (let i = 0; i < 8 && encounters.length === 0; i++) { field.update(10, []); press("Enter"); }
  assert.deepEqual(encounters, ["intro_boundary_beast"]);
  press("ArrowRight", 15);
  assert.equal(state.panelId, "forest_boundary", "出発会話の前は森入口へ進めない");
  reach("village_gate", "ArrowLeft");
  state.flags.add("chapter2_started");
  reach("forest_boundary", "ArrowRight");
  reach("forest_edge", "ArrowRight");
  assert.ok(saves.includes("forest_boundary") && saves.includes("village_gate") && saves.includes("forest_edge"));
}
console.log("白い木の境 OK: 正式画像・fallback・動的層・3状態の会話・村門往復・導入戦呼出・出発後の森入口開通");
