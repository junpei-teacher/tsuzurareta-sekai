/** 正式景観でもfallbackでも、野営地から根の裂け目を調べて根洞窟へ入れることを実Sceneで確かめる。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { GUARDIAN_HOLLOW_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderGuardianHollow } from "../src/fx/guardianHollow.ts";
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
const hasHangingRoot = () => calls.some((call) => call.name === "rect"
  && (call.args[0] === 360 || call.args[0] === 361) && call.args[1] === 135 && call.args[4] === "#756340");

assert.ok(SERIES2_MANIFEST[GUARDIAN_HOLLOW_BACKGROUND_ID]?.endsWith("backgrounds/guardian_hollow/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalWidth: 480 }]) {
  calls.length = 0;
  renderGuardianHollow(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "hunter_camp",
    x: 440,
    facing: 1,
    flags: new Set([
      "chapter2_started", "double_knot_clue", "hunter_camp_clear",
      "hunter_chief_trail", "camp_rest_taken", "knowledge:ring_sale_plan",
    ]),
    defeated: new Set(["hollow_boar_camp"]),
    objective: "守護樹の窪地へ向かう",
  };
  let saves = 0;
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard,
    new Player(),
    { play() {} } as unknown as Audio,
    () => {},
    () => { saves++; return { ok: true }; },
    () => {},
    state,
    () => {},
    available ? { [GUARDIAN_HOLLOW_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string) => { field.update(0.1, [key]); field.update(0.5, []); };

  press("ArrowRight");
  assert.equal(state.panelId, "guardian_hollow");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasHangingRoot(), "調査前は入口を横切る細根を表示");
  assert.ok(calls.some((call) => call.name === "rect" && call.args[0] === 296 && call.args[4] === "#66533b"), "狩人の靴跡を表示");

  for (let i = 0; i < 50 && state.x < 354; i++) press("ArrowRight");
  assert.ok(Math.abs(state.x - 390) <= 36, "根の裂け目の調査距離へ到達");
  press("Enter");
  field.update(10, []);
  calls.length = 0;
  field.render(d);
  assert.ok(hasText("古木の根のあいだに、人ひとり通れる裂け目がある"));
  for (let i = 0; i < 28 && !state.flags.has("root_hollow_opened"); i++) {
    field.update(10, []);
    press("Enter");
  }
  assert.ok(state.flags.has("root_hollow_opened"));
  assert.equal(state.objective, "根洞窟へ入り、狩人頭を捜す");

  calls.length = 0;
  field.render(d);
  assert.equal(hasHangingRoot(), false, "調査後は入口の細根が退く");
  assert.ok(calls.some((call) => call.name === "rect" && call.args[0] === 355 && call.args[4] === "#746341"), "退けた根を足元へ残す");
  for (let i = 0; i < 80 && state.panelId === "guardian_hollow"; i++) press("ArrowRight");
  assert.equal(state.panelId, "root_hollow_entry");
  assert.ok(saves >= 3);
}

console.log("守護樹の窪地 OK: 正式画像・fallback・野営地から入場・足跡・裂け目調査・根洞窟開通");
