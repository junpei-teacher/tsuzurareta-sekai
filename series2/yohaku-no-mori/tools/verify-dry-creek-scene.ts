/** 景観の差し替えが、足跡・会話・出現条件・保存に影響しないことを実Sceneで確認する。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { DRY_CREEK_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderDryCreek } from "../src/fx/dryCreek.ts";
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


assert.ok(SERIES2_MANIFEST[DRY_CREEK_BACKGROUND_ID]?.endsWith("backgrounds/dry_creek/middle.png"));
for (const invalid of [undefined, {...image, complete: false}, {...image, naturalWidth: 480}]) {
  calls.length = 0;
  renderDryCreek(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some(c => c.name === "ctx.createLinearGradient"));
}
for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "dry_creek", x: 302, facing: 1,
    flags: new Set(["chapter2_started", "creek_wolf_cleared"]),
    defeated: new Set(["moss_wolf_creek"]), objective: "倒れている狩人を確かめる",
  };
  const player = new Player();
  let saves = 0;
  const field = new SideViewScene(
    {isDown: () => false} as unknown as Keyboard, player, {play() {}} as unknown as Audio,
    () => {}, () => {saves++; return {ok: true};}, () => {}, state, () => {},
    available ? {[DRY_CREEK_BACKGROUND_ID]: image} : {},
  );
  const press = (key: string) => {field.update(0.1, [key]); field.update(0.5, []);};
  const hunterRects = () => {
    calls.length = 0; field.render(d);
    const start = calls.findIndex(c => c.name === "ctx.translate" && c.args[0] === 330);
    const end = calls.findIndex((c, i) => i > start && c.name === "ctx.restore");
    assert.ok(start >= 0 && end > start);
    return calls.slice(start, end).filter(c => c.name === "rect");
  };
  const before = hunterRects();
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(Math.min(...before.map(c => Number(c.args[1]))) >= -36, "救出前は低い姿勢");
  assert.equal(saves, 0);
  // 会話前は右端へ進んでも次のパネルへ出られない。
  state.x = 440;
  for (let i = 0; i < 8; i++) press("ArrowRight");
  assert.equal(state.panelId, "dry_creek");
  state.x = 302;
  press("Enter"); field.update(10, []);
  calls.length = 0; field.render(d);
  assert.ok(hasText("罠を壊されて、ここまで転がされた"));
  for (let i = 0; i < 20 && !state.flags.has("young_hunter_found"); i++) {
    field.update(10, []); press("Enter");
  }
  assert.ok(state.flags.has("young_hunter_found"));
  assert.ok(state.flags.has("knowledge:beasts_drive_back"));
  assert.ok([...player.grimoire.values()].includes("TORME"));
  const after = hunterRects();
  assert.ok(Math.min(...after.map(c => Number(c.args[1]))) <= -44, "救出後は立ち姿");
  assert.equal(state.objective, "狩人頭の足跡を追う");
  for (let i = 0; i < 80 && state.panelId === "dry_creek"; i++) press("ArrowRight");
  assert.equal(state.panelId, "snare_path");
  assert.ok(saves > 0);
}
console.log("涸れ沢 OK: 正式素材・fallback・負傷姿勢・救出会話・TORME習得・立ち姿・次エリア開通");

