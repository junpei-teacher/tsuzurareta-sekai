/** 正式景観とfallbackの両方で、第三章の二戦と守人の警告を実Sceneで通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { DEEP_FOREST_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderDeepForestPath } from "../src/fx/deepForestPath.ts";
import { Player } from "../src/game/player.ts";
import { SideViewScene } from "../src/sideview/scene.ts";
import type { EncounterDef, SideViewState } from "../src/sideview/types.ts";

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
const hasRect = (x: number, y: number, w: number, h: number) => calls.some((call) =>
  call.name === "rect" && call.args[0] === x && call.args[1] === y
  && call.args[2] === w && call.args[3] === h
);
const hasMovingRect = (x: number, y: number, w: number, h: number) => calls.some((call) =>
  call.name === "rect" && call.args[0] === x && typeof call.args[1] === "number"
  && Math.abs((call.args[1] as number) - y) <= 2
  && call.args[2] === w && call.args[3] === h
);

assert.ok(SERIES2_MANIFEST[DEEP_FOREST_BACKGROUND_ID]?.endsWith("backgrounds/deep_forest/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderDeepForestPath(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "root_heart",
    x: 440,
    facing: 1,
    flags: new Set([
      "chapter2_complete", "chapter3_started", "hunter_chief_entered_ruin",
      "root_warden_yielded", "hunter_chief_found",
    ]),
    defeated: new Set(["root_warden"]),
    objective: "守護樹の先へ進み、狩人頭を追う",
  };
  const encounters: EncounterDef[] = [];
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard,
    new Player(),
    { play() {} } as unknown as Audio,
    () => {},
    () => ({ ok: true }),
    (encounter) => encounters.push(encounter),
    state,
    () => {},
    available ? { [DEEP_FOREST_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string) => { field.update(0.1, [key]); field.update(0.5, []); };
  const finishDialogue = (done: () => boolean, message: string) => {
    for (let i = 0; i < 40; i++) {
      field.update(10, []);
      press("Enter");
      if (done()) return;
    }
    assert.fail(message);
  };

  press("ArrowRight");
  assert.equal(state.panelId, "deep_forest");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasMovingRect(133, 152, 10, 5), "苔背の狼が深い森に見えません");

  while (state.x < 148) press("ArrowRight");
  press("Enter");
  finishDialogue(() => encounters.length === 1, "苔背の狼の導入会話が終わりません");
  assert.equal(encounters[0]?.id, "moss_wolf_deep");
  for (let i = 0; i < 10; i++) press("ArrowRight");
  assert.ok(state.x <= 186, "狼を退かせる前に第一通行止めを越えています");

  state.flags.add("deep_wolf_clear");
  state.defeated.add("moss_wolf_deep");
  state.objective = "白い枝角の魔物を退かせる";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(133, 152, 10, 5), false, "攻略後も狼が残っています");
  assert.ok(hasMovingRect(307, 145, 42, 19), "白枝鹿が次の通行止めに見えません");

  while (state.x < 318) press("ArrowRight");
  press("Enter");
  finishDialogue(() => encounters.length === 2, "白枝鹿の導入会話が終わりません");
  assert.equal(encounters[1]?.id, "white_antler_deep");
  for (let i = 0; i < 10; i++) press("ArrowRight");
  assert.ok(state.x <= 356, "鹿を退かせる前に第二通行止めを越えています");

  state.flags.add("deep_forest_clear");
  state.defeated.add("white_antler_deep");
  state.objective = "道の奥にいる守人を追う";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(307, 145, 42, 19), false, "攻略後も白枝鹿が残っています");
  assert.ok(hasRect(-5, -45, 11, 12), "仮面の守人が道の奥に見えません");

  while (state.x < 393) press("ArrowRight");
  press("Enter");
  finishDialogue(() => state.flags.has("masked_guardian_warning"), "守人の警告会話が終わりません");
  assert.equal(state.objective, "結び目の残る古木へ進む");
  calls.length = 0;
  field.render(d);
  assert.equal(hasRect(-5, -45, 11, 12), false, "警告後も守人が残っています");

  for (let i = 0; i < 10 && state.panelId === "deep_forest"; i++) press("ArrowRight");
  assert.equal(state.panelId, "knot_tree");
}

console.log("深い森 OK: 正式画像・fallback・狼/白枝鹿の二段通行止め・守人の警告・結び木への遷移");
