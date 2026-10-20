/** 正式景観でもfallbackでも、野営地の戦闘・手帳・休息・次画面への流れを実Sceneで確かめる。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { HUNTER_CAMP_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderHunterCamp } from "../src/fx/hunterCamp.ts";
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
const hasRectColor = (color: string) => calls.some((call) => call.name === "rect" && call.args[4] === color);

assert.ok(SERIES2_MANIFEST[HUNTER_CAMP_BACKGROUND_ID]?.endsWith("backgrounds/hunter_camp/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderHunterCamp(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "fallen_bridge",
    x: 440,
    facing: 1,
    flags: new Set(["chapter2_started", "short_forgetting_seen", "double_knot_clue"]),
    defeated: new Set(["hush_moth_bridge"]),
    objective: "狩人の野営地へ向かう",
  };
  const player = new Player();
  const encounters: string[] = [];
  let saves = 0;
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard,
    player,
    { play() {} } as unknown as Audio,
    () => {},
    () => { saves++; return { ok: true }; },
    (encounter) => {
      encounters.push(encounter.id);
      for (const flag of encounter.winFlags ?? []) state.flags.add(flag);
      state.defeated.add(encounter.id);
      if (encounter.winObjective) state.objective = encounter.winObjective;
    },
    state,
    () => {},
    available ? { [HUNTER_CAMP_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string) => { field.update(0.1, [key]); field.update(0.5, []); };

  press("ArrowRight");
  assert.equal(state.panelId, "hunter_camp");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasRectColor("#e2bd69"), "消えない熾火を動的に表示");
  assert.equal(hasRectColor("#c5ad76"), false, "戦闘前は手帳を表示しない");

  for (let i = 0; i < 40; i++) press("ArrowRight");
  assert.equal(state.x, 232, "洞角猪を倒すまでは荷の先へ通さない");
  press("Enter");
  field.update(10, []);
  calls.length = 0;
  field.render(d);
  assert.ok(hasText("空洞のような鳴き声が、野営地を震わせる"));
  for (let i = 0; i < 16 && encounters.length === 0; i++) {
    field.update(10, []);
    press("Enter");
  }
  assert.deepEqual(encounters, ["hollow_boar_camp"]);
  assert.ok(state.flags.has("hunter_camp_clear"));
  assert.equal(state.objective, "野営地に残された手帳を調べる");

  calls.length = 0;
  field.render(d);
  assert.ok(hasRectColor("#c5ad76"), "勝利後は開いた手帳を表示");
  for (let i = 0; i < 20 && state.x < 320; i++) press("ArrowRight");
  assert.ok(Math.abs(state.x - 350) <= 36, "手帳の調査距離へ到達");
  player.hp = 1;
  player.mp = 2;
  press("Enter");
  field.update(10, []);
  calls.length = 0;
  field.render(d);
  assert.ok(hasText("狩人頭の手帳には、遺跡の印がある"));
  for (let i = 0; i < 32 && !state.flags.has("hunter_chief_trail"); i++) {
    field.update(10, []);
    press("Enter");
  }
  assert.ok(state.flags.has("hunter_chief_trail"));
  assert.ok(state.flags.has("camp_rest_taken"));
  assert.ok(state.flags.has("knowledge:ring_sale_plan"));
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.mp, player.maxMp);
  assert.equal(state.objective, "守護樹の窪地へ向かう");

  calls.length = 0;
  field.render(d);
  assert.ok(hasRectColor("#88734f"), "読後は閉じた手帳を残す");
  assert.equal(hasRectColor("#c5ad76"), false);
  for (let i = 0; i < 80 && state.panelId === "hunter_camp"; i++) press("ArrowRight");
  assert.equal(state.panelId, "guardian_hollow");
  assert.ok(saves >= 3);
}

console.log("狩人の野営地 OK: 正式画像・fallback・橋から入場・猪戦・手帳・全回復・守護樹への開通");
