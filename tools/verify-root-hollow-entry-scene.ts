/** 正式景観とfallbackの両方で、反響標から蔓・反響回廊まで実Sceneを通す。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { ROOT_HOLLOW_ENTRY_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { Battle, spawn } from "../src/battle/model.ts";
import { series2EnemyById } from "../src/battle/series2.ts";
import { renderRootHollowEntry } from "../src/fx/rootHollowEntry.ts";
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
const hasEnemyRect = (x: number, y: number, w: number, h: number) => calls.some((call) =>
  call.name === "rect" && call.args[0] === x && typeof call.args[1] === "number"
  && Math.abs((call.args[1] as number) - y) <= 2
  && call.args[2] === w && call.args[3] === h
);
const drainMessages = (battle: Battle) => {
  while (battle.phase === "MESSAGE") battle.advance();
};

assert.ok(SERIES2_MANIFEST[ROOT_HOLLOW_ENTRY_BACKGROUND_ID]?.endsWith("backgrounds/root_hollow_entry/middle.png"));
for (const invalid of [undefined, { ...image, complete: false }, { ...image, naturalWidth: 480 }]) {
  calls.length = 0;
  renderRootHollowEntry(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some((call) => call.name === "ctx.createLinearGradient"));
}

// 稽古台は有効呪文だけでなく不発も無料で、倒れず、必ず離れられる。
const practicePlayer = new Player();
practicePlayer.mp = Math.min(17, practicePlayer.maxMp);
const practice = new Battle(practicePlayer, spawn(series2EnemyById("echo_target")));
drainMessages(practice);
const mpBeforeDud = practicePlayer.mp;
const dud = practice.cast("TEST2");
assert.equal(dud.kind, "DUD");
assert.equal(practicePlayer.mp, mpBeforeDud, "反響標の不発でMPを失っています");
assert.ok(practice.messages.includes("（反響標ではMPは減らない）"));
drainMessages(practice);
const hpBeforeCast = practice.enemy.hp;
const cast = practice.cast("SLANE");
assert.equal(cast.kind, "CAST");
assert.equal(practicePlayer.mp, mpBeforeDud, "反響標の有効呪文でMPを失っています");
assert.ok(practice.enemy.hp < hpBeforeCast && practice.enemy.hp >= 1, "反響標は威力を示しつつ倒れません");
drainMessages(practice);
practice.flee();
drainMessages(practice);
assert.equal(practice.phase, "FLED", "反響標から確実に離れられません");

for (const available of [true, false]) {
  const state: SideViewState = {
    panelId: "guardian_hollow",
    x: 440,
    facing: 1,
    flags: new Set(["chapter2_started", "hunter_chief_trail", "root_hollow_opened"]),
    defeated: new Set(),
    objective: "根洞窟へ入り、狩人頭を捜す",
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
    available ? { [ROOT_HOLLOW_ENTRY_BACKGROUND_ID]: image } : {},
  );
  const press = (key: string) => { field.update(0.1, [key]); field.update(0.5, []); };
  const triggerNearestEncounter = () => {
    const before = encounters.length;
    press("Enter");
    for (let i = 0; i < 24 && encounters.length === before; i++) {
      field.update(10, []);
      press("Enter");
    }
    assert.equal(encounters.length, before + 1, "接近したEncounterの導入会話が終わりません");
  };

  press("ArrowRight");
  assert.equal(state.panelId, "root_hollow_entry");
  calls.length = 0;
  field.render(d);
  assert.equal(imageCalls().length, available ? 1 : 0);
  assert.ok(hasEnemyRect(92, 120, 12, 50), "反響標が入口の試し打ち位置に見えません");
  assert.ok(hasEnemyRect(213, 159, 22, 16), "通路を塞ぐ罠喰い蔓が見えません");

  for (let i = 0; i < 8 && Math.abs(state.x - 98) > 12; i++) press("ArrowRight");
  triggerNearestEncounter();
  assert.equal(encounters.at(-1)?.id, "echo_target_practice");
  assert.equal(state.defeated.has("echo_target_practice"), false, "試し打ちが一度きりになっています");

  for (let i = 0; i < 14 && Math.abs(state.x - 224) > 12; i++) press("ArrowRight");
  triggerNearestEncounter();
  assert.equal(encounters.at(-1)?.id, "snare_vine_root");

  state.flags.add("root_entry_clear");
  state.defeated.add("snare_vine_root");
  state.objective = "根洞窟の反響回廊へ進む";
  calls.length = 0;
  field.render(d);
  assert.ok(hasEnemyRect(92, 120, 12, 50), "攻略後も反響標は残す必要があります");
  assert.equal(hasEnemyRect(213, 159, 22, 16), false, "攻略後も罠喰い蔓が残っています");
  assert.ok(hasRect(205, 171, 31, 3) || hasRect(205, 172, 31, 3), "攻略後のほどけた蔓が見えません");

  for (let i = 0; i < 40 && state.panelId === "root_hollow_entry"; i++) press("ArrowRight");
  assert.equal(state.panelId, "echo_gallery");
}

console.log("根洞窟入口 OK: 正式画像・fallback・反響標無料/反復・蔓の通行止め/解除・反響回廊への遷移");
