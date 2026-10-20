/** 正式景観とfallbackの両方で、白枝鹿から刻みの記憶、遺跡前までを実Sceneで通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { KNOT_TREE_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderKnotTree } from "../src/fx/knotTree.ts";
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

assert.ok(SERIES2_MANIFEST[KNOT_TREE_BACKGROUND_ID]?.endsWith("backgrounds/knot_tree/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderKnotTree(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "deep_forest",
    x: 440,
    facing: 1,
    flags: new Set([
      "chapter3_started", "hunter_chief_entered_ruin", "deep_wolf_clear",
      "deep_forest_clear", "masked_guardian_warning",
    ]),
    defeated: new Set(["moss_wolf_deep", "white_antler_deep"]),
    objective: "結び目の残る古木へ進む",
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
    available ? { [KNOT_TREE_BACKGROUND_ID]: image } : {},
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
  assert.equal(state.panelId, "knot_tree");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasMovingRect(157, 145, 42, 19), "白枝鹿が結び木の前に見えません");
  assert.ok(hasRect(316, 112, 22, 2), "古木の二重結びの下地が見えません");

  while (state.x < 168) press("ArrowRight");
  press("Enter");
  finishDialogue(() => encounters.length === 1, "白枝鹿の導入会話が終わりません");
  assert.equal(encounters[0]?.id, "white_antler_knot");
  for (let i = 0; i < 10; i++) press("ArrowRight");
  assert.ok(state.x <= 206, "鹿を退かせる前に通行止めを越えています");

  state.flags.add("knot_antler_clear");
  state.defeated.add("white_antler_knot");
  state.objective = "印のある古木を調べる";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(157, 145, 42, 19), false, "攻略後も白枝鹿が残っています");
  assert.ok(hasRect(316, 112, 22, 2), "攻略後に古木の手掛かりが消えています");

  while (state.x < 338) press("ArrowRight");
  press("Enter");
  finishDialogue(() => state.flags.has("guardian_handwriting_seen"), "古木の刻みの会話が終わりません");
  assert.ok(state.flags.has("knowledge:left_falling_marks"));
  assert.equal(state.objective, "王国印のある遺跡へ向かう");

  for (let i = 0; i < 15 && state.panelId === "knot_tree"; i++) press("ArrowRight");
  assert.equal(state.panelId, "ruin_approach");
}

console.log("結び木 OK: 正式画像・fallback・白枝鹿の通行止め・左下がりの刻みと二重結び・遺跡前への遷移");

