/** 正式景観とfallbackの両方で、白枝鹿の手掛かりから守護樹心部まで実Sceneを通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { ECHO_GALLERY_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderEchoGallery } from "../src/fx/echoGallery.ts";
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

assert.ok(SERIES2_MANIFEST[ECHO_GALLERY_BACKGROUND_ID]?.endsWith("backgrounds/echo_gallery/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalHeight: 270 }]) {
  calls.length = 0;
  renderEchoGallery(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "root_hollow_entry",
    x: 440,
    facing: 1,
    flags: new Set(["chapter2_started", "root_hollow_opened", "root_entry_clear"]),
    defeated: new Set(["snare_vine_root"]),
    objective: "根洞窟の反響回廊へ進む",
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
    available ? { [ECHO_GALLERY_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string) => { field.update(0.1, [key]); field.update(0.5, []); };
  const triggerNearestEncounter = () => {
    const before = encounters.length;
    press("Enter");
    for (let i = 0; i < 28 && encounters.length === before; i++) {
      field.update(10, []);
      press("Enter");
    }
    assert.equal(encounters.length, before + 1, "白枝鹿の導入会話が終わりません");
  };

  press("ArrowRight");
  assert.equal(state.panelId, "echo_gallery");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasMovingRect(229, 145, 42, 19), "白枝鹿が反響回廊に見えません");
  assert.ok(hasMovingRect(268, 119, 15, 5), "狩人の外套が鹿の角に見えません");

  for (let i = 0; i < 22 && Math.abs(state.x - 252) > 12; i++) press("ArrowRight");
  triggerNearestEncounter();
  assert.equal(encounters.at(-1)?.id, "white_antler_echo");
  for (let i = 0; i < 10; i++) press("ArrowRight");
  assert.equal(state.panelId, "echo_gallery", "白枝鹿を退かせる前に最深部へ抜けられます");
  assert.ok(state.x <= 286, "白枝鹿の通行止めを越えています");

  state.flags.add("echo_gallery_clear");
  state.defeated.add("white_antler_echo");
  state.objective = "根洞窟の最深部へ進む";
  calls.length = 0;
  field.render(d);
  assert.equal(hasMovingRect(229, 145, 42, 19), false, "攻略後も白枝鹿が残っています");
  assert.ok(hasRect(255, 168, 29, 8), "攻略後の無傷の外套が足元に残りません");

  for (let i = 0; i < 40 && state.panelId === "echo_gallery"; i++) press("ArrowRight");
  assert.equal(state.panelId, "root_heart");
}

console.log("反響回廊 OK: 正式画像・fallback・白枝鹿と外套・通行止め/解除・守護樹心部への遷移");
