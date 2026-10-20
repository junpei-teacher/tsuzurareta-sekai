/** 正式景観とfallbackの両方で、名喰い蛭から十年前の校訂印、外庭までを実Sceneで通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { RUIN_APPROACH_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderRuinApproach } from "../src/fx/ruinApproach.ts";
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
const hasFrame = (x: number, y: number, w: number, h: number) => calls.some((call) =>
  call.name === "frame" && call.args[0] === x && call.args[1] === y
  && call.args[2] === w && call.args[3] === h
);
const hasMovingRect = (x: number, y: number, w: number, h: number) => calls.some((call) =>
  call.name === "rect" && call.args[0] === x && typeof call.args[1] === "number"
  && Math.abs((call.args[1] as number) - y) <= 2
  && call.args[2] === w && call.args[3] === h
);

assert.ok(SERIES2_MANIFEST[RUIN_APPROACH_BACKGROUND_ID]?.endsWith("backgrounds/ruin_approach/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalWidth: 480 }]) {
  calls.length = 0;
  renderRuinApproach(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "knot_tree",
    x: 440,
    facing: 1,
    flags: new Set([
      "chapter3_started", "hunter_chief_entered_ruin", "masked_guardian_warning",
      "knot_antler_clear", "guardian_handwriting_seen", "knowledge:left_falling_marks",
    ]),
    defeated: new Set(["white_antler_knot"]),
    objective: "王国印のある遺跡へ向かう",
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
    available ? { [RUIN_APPROACH_BACKGROUND_ID]: image } : {},
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
  assert.equal(state.panelId, "ruin_approach");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasMovingRect(150, 167, 11, 9), "名喰い蛭が遺跡前に見えません");
  assert.ok(hasFrame(353, 92, 20, 23), "王国の校訂印がコード層に見えません");

  while (state.x < 168) press("ArrowRight");
  press("Enter");
  finishDialogue(() => encounters.length === 1, "名喰い蛭の導入会話が終わりません");
  assert.equal(encounters[0]?.id, "name_leech_approach");
  for (let i = 0; i < 10; i++) press("ArrowRight");
  assert.ok(state.x <= 206, "名喰い蛭を退かせる前に通行止めを越えています");

  state.flags.add("approach_leech_clear");
  state.defeated.add("name_leech_approach");
  state.objective = "遺跡入口の印を調べる";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(150, 167, 11, 9), false, "攻略後も名喰い蛭が残っています");
  assert.ok(hasFrame(353, 92, 20, 23), "攻略後に校訂印が消えています");

  while (state.x < 348) press("ArrowRight");
  press("Enter");
  finishDialogue(() => state.flags.has("royal_revision_mark_found"), "校訂印の会話が終わりません");
  assert.ok(state.flags.has("knowledge:royal_revision_ten_years"));
  assert.equal(state.objective, "遺跡の外庭へ入る");

  for (let i = 0; i < 15 && state.panelId === "ruin_approach"; i++) press("ArrowRight");
  assert.equal(state.panelId, "ruin_courtyard");
}

console.log("遺跡前 OK: 正式画像・fallback・名喰い蛭の通行止め・校訂印と十年前の刻み・外庭への遷移");
