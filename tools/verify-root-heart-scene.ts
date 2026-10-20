/** 正式景観とfallbackの両方で、根の番人・白根の杖・狩人頭救出を実Sceneで通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { ROOT_HEART_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderRootHeart } from "../src/fx/rootHeart.ts";
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

assert.ok(SERIES2_MANIFEST[ROOT_HEART_BACKGROUND_ID]?.endsWith("backgrounds/root_heart/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderRootHeart(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "echo_gallery",
    x: 440,
    facing: 1,
    flags: new Set(["chapter2_started", "root_hollow_opened", "root_entry_clear", "echo_gallery_clear"]),
    defeated: new Set(["snare_vine_root", "white_antler_echo"]),
    objective: "根洞窟の最深部へ進む",
  };
  const encounters: EncounterDef[] = [];
  const player = new Player();
  const field = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard,
    player,
    { play() {} } as unknown as Audio,
    () => {},
    () => ({ ok: true }),
    (encounter) => encounters.push(encounter),
    state,
    () => {},
    available ? { [ROOT_HEART_BACKGROUND_ID]: image } : {},
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
  assert.equal(state.panelId, "root_heart");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasMovingRect(274, 118, 56, 49), "根の番人が心部に見えません");

  for (let i = 0; i < 24 && Math.abs(state.x - 302) > 12; i++) press("ArrowRight");
  press("Enter");
  finishDialogue(() => encounters.length > 0, "根の番人の導入会話が終わりません");
  const encounter = encounters.at(-1);
  assert.equal(encounter?.id, "root_warden");
  assert.equal(encounter?.rewardWeapon, "white_root_staff");
  for (let i = 0; i < 14; i++) press("ArrowRight");
  assert.equal(state.panelId, "root_heart", "根の番人が退く前に心部を抜けられます");
  assert.ok(state.x <= 330, "根の番人の通行止めを越えています");

  const attackBefore = player.attack;
  const staff = player.acquireWeapon("white_root_staff");
  assert.equal(staff?.name, "白根の杖");
  assert.equal(player.attack, attackBefore + 20, "白根の杖が攻撃力を20上げません");
  state.flags.add("root_warden_yielded");
  state.defeated.add("root_warden");
  state.objective = "倒れている狩人頭を確かめる";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(274, 118, 56, 49), false, "攻略後も根の番人が立っています");
  assert.ok(hasRect(286, 171, 32, 3), "道を譲った枝先が残りません");
  assert.ok(hasRect(-9, -25, 15, 16), "倒れている狩人頭が見えません");

  while (state.x < 376) press("ArrowRight");
  press("Enter");
  finishDialogue(() => state.flags.has("hunter_chief_found"), "狩人頭の救出会話が終わりません");
  assert.ok(state.flags.has("hunter_chief_found"));
  assert.ok(state.flags.has("chapter2_complete"));
  assert.equal(state.objective, "狩人頭と村へ戻る");

  for (let i = 0; i < 20; i++) press("ArrowRight");
  assert.equal(state.panelId, "root_heart", "第三章開始前に深い森へ入れます");
  state.flags.add("chapter3_started");
  for (let i = 0; i < 10 && state.panelId === "root_heart"; i++) press("ArrowRight");
  assert.equal(state.panelId, "deep_forest");
}

console.log("守護樹心部 OK: 正式画像・fallback・根の番人・白根の杖・狩人頭救出・第三章への遷移");
