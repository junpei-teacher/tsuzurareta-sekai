/** 実際のSideViewSceneを、描画・音・入力のテストダブルで動かす。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { ImageMap } from "../src/core/imageLoader.ts";
import type { Keyboard } from "../src/core/input.ts";
import { FOREST_EDGE_BACKGROUND_ID } from "../src/core/series2Assets.ts";
import { renderForestEntranceScene } from "../src/fx/forestEntrance.ts";
import { Player } from "../src/game/player.ts";
import { panelById } from "../src/sideview/data.ts";
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
      return undefined;
    };
  },
});
const display = new Proxy({ ctx }, {
  get(target, key: string) {
    if (key === "ctx") return target.ctx;
    return (...args: unknown[]) => {
      calls.push({ name: key, args });
      if (key === "measure") return String(args[0]).length * 12;
      return undefined;
    };
  },
}) as unknown as Display;
const goodImage = { complete: true, naturalWidth: 960, naturalHeight: 540, width: 960, height: 540 } as HTMLImageElement;
const images: ImageMap = { [FOREST_EDGE_BACKGROUND_ID]: goodImage };
const spriteCount = () => calls.filter((call) => call.name === "sprite" && call.args[0] === goodImage).length;
const hasText = (text: string) => calls.some((call) => call.name.startsWith("text") && String(call.args[0]).includes(text));

renderForestEntranceScene(display, 0, images);
assert.equal(spriteCount(), 1, "採用画像を1回だけ描く");
assert.ok(calls.some((call) => call.name === "rect" && call.args[0] === 112 && call.args[1] === 162 && call.args[4] === "#473a2c"),
  "足跡は画像と独立した位置・色で描く");
assert.ok(calls.some((call) => call.name === "ctx.fill"), "光の層は画像と独立して描く");

for (const candidate of [undefined, { ...goodImage, complete: false }, { ...goodImage, naturalWidth: 0 },
  { ...goodImage, naturalWidth: 480 }, { ...goodImage, naturalHeight: 270 }]) {
  calls.length = 0;
  renderForestEntranceScene(display, 1, candidate ? { [FOREST_EDGE_BACKGROUND_ID]: candidate as HTMLImageElement } : {});
  assert.equal(calls.filter((call) => call.name === "sprite").length, 0, "欠落・未完了・不正寸法を描かない");
  assert.ok(calls.filter((call) => call.name === "rect").length > 100, "フォールバックの景観と足跡を描く");
}

const panel = panelById("forest_edge");
assert.equal(panel.groundY, 176);
assert.equal(panel.interactables[0]?.x, 132);
assert.equal(panel.encounters[0]?.x, 302);

// 素材あり／なしの両方で同じ歩行・会話・遭遇・通行処理を実行する。
for (const availableImages of [images, {}]) {
  const state: SideViewState = {
    panelId: panel.id, x: panel.spawn, facing: 1,
    flags: new Set(["intro_battle_won", "chapter2_started"]), defeated: new Set(), objective: panel.objective,
  };
  const saves: string[] = [];
  const encounters: string[] = [];
  const scene = new SideViewScene(
    { isDown: () => false } as unknown as Keyboard, new Player(), { play() {} } as unknown as Audio, () => {},
    (saved) => { saves.push(saved.panelId); return { ok: true }; },
    (encounter) => { encounters.push(encounter.id); }, state, () => {}, availableImages,
  );
  const press = (key: string, count = 1) => { for (let i = 0; i < count; i++) scene.update(1 / 60, [key]); };
  press("ArrowRight", 6);
  assert.equal(state.x, 114);
  const beforeRender = { x: state.x, flags: [...state.flags], defeated: [...state.defeated], saves: saves.length };
  calls.length = 0;
  scene.render(display);
  assert.equal(spriteCount(), availableImages === images ? 1 : 0);
  assert.ok(hasText("足跡を調べる"));
  assert.ok(calls.some((call) => call.name === "ctx.translate" && call.args[0] === 604), "狼は接地中心x302で反転する");
  assert.ok(calls.some((call) => call.name === "ctx.scale" && call.args[0] === -1), "探索の狼は村側を向く");
  assert.deepEqual({ x: state.x, flags: [...state.flags], defeated: [...state.defeated], saves: saves.length }, beforeRender,
    "背景の描画は進行と保存を変更しない");
  press("Enter");
  scene.update(2, []);
  calls.length = 0;
  scene.render(display);
  assert.ok(hasText("泥に残る靴跡は二人分。"));
  assert.ok(hasText("その周囲を、獣の足跡が囲んでいる。"));
  press("ArrowRight");
  assert.equal(state.x, 114, "会話中は移動しない");
  press("Enter");
  press("ArrowLeft");
  assert.equal(state.facing, -1);
  press("ArrowRight", 15);
  assert.equal(state.x, 282);
  assert.equal(state.facing, 1);
  calls.length = 0;
  scene.render(display);
  assert.ok(hasText("苔背の狼に近づく"));
  press("ArrowRight", 20);
  assert.equal(state.x, 326, "未勝利の狼を通り抜けない");
  assert.equal(state.panelId, "forest_edge");
  press("Enter");
  scene.update(2, []);
  calls.length = 0;
  scene.render(display);
  assert.ok(hasText("苔をまとった狼が道へ回り込んだ。"));
  press("Enter");
  assert.deepEqual(encounters, ["moss_wolf_edge"], "本編の遭遇コールバックを1回だけ呼ぶ");
  assert.equal(state.flags.has("forest_entry_seen"), false, "遭遇開始を勝利扱いしない");
  // 戦闘結果の反映はmain側の責務。ここでは勝利後の状態を与え、探索側の再開を確認する。
  state.flags.add("forest_entry_seen");
  state.defeated.add("moss_wolf_edge");
  press("ArrowRight", 10);
  assert.equal(state.panelId, "dry_creek");
  scene.update(1, []);
  scene.update(1 / 60, []); // 遷移終了後にキーを離し、端の連続遷移ラッチを戻す。
  calls.length = 0;
  scene.render(display);
  assert.equal(spriteCount(), 0, "隣の涸れ沢へ森入口の画像を流用しない");
  press("ArrowLeft", 2);
  assert.equal(state.panelId, "forest_edge");
  scene.update(1, []);
  calls.length = 0;
  scene.render(display);
  assert.equal(spriteCount(), availableImages === images ? 1 : 0, "戻った森も同じ素材で描く");
  assert.equal(calls.some((call) => call.name === "ctx.translate" && call.args[0] === 604), false, "勝利済みの狼は再出現しない");
  assert.ok(saves.includes("dry_creek") && saves.includes("forest_edge"));
}
console.log("森本編検証 OK: 正常画像／5種のfallback／動的層／左右歩行／調査会話／遭遇／通行制限／勝利後往復／保存の分離");
