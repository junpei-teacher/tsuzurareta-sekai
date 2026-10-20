/** 景観の差し替えが、足跡・会話・出現条件・保存に影響しないことを実Sceneで確認する。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { SNARE_PATH_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderSnarePath } from "../src/fx/snarePath.ts";
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


assert.ok(SERIES2_MANIFEST[SNARE_PATH_BACKGROUND_ID]?.endsWith("backgrounds/snare_path/middle.png"));
for (const invalid of [undefined, {...image, complete:false}, {...image, naturalWidth:480}]) {
  calls.length=0;
  renderSnarePath(d, 0, invalid as HTMLImageElement | undefined);
  assert.equal(imageCalls().length, 0);
  assert.ok(calls.some(c => c.name === "ctx.createLinearGradient"));
}
for (const available of [true, false]) {
  const state: SideViewState = {
    panelId:"dry_creek", x:440, facing:1,
    flags:new Set(["chapter2_started","creek_wolf_cleared","young_hunter_found"]),
    defeated:new Set(["moss_wolf_creek"]), objective:"狩人頭の足跡を追う",
  };
  const encounters: string[]=[];
  let saves=0;
  const field=new SideViewScene(
    {isDown:()=>false} as unknown as Keyboard, new Player(), {play(){}} as unknown as Audio,
    ()=>{}, ()=>{saves++; return {ok:true};},
    encounter=>{
      encounters.push(encounter.id);
      for(const flag of encounter.winFlags??[]) state.flags.add(flag);
      state.defeated.add(encounter.id);
      if(encounter.winObjective) state.objective=encounter.winObjective;
    },
    state, ()=>{}, available ? {[SNARE_PATH_BACKGROUND_ID]:image} : {},
  );
  const press=(key:string)=>{field.update(.1,[key]);field.update(.5,[]);};
  const advanceUntil=(flag:string)=>{
    for(let i=0;i<20&&!state.flags.has(flag);i++){field.update(10,[]);press("Enter");}
    assert.ok(state.flags.has(flag), flag);
  };
  press("ArrowRight");
  assert.equal(state.panelId,"snare_path");
  calls.length=0; field.render(d);
  assert.equal(imageCalls().length,available?1:0);
  assert.ok(saves>=1,"エリア移動を保存");
  for(let i=0;i<20;i++)press("ArrowRight");
  assert.equal(state.x,196,"勝利前は蔓で塞がれる");
  press("Enter");
  field.update(10,[]);
  calls.length=0;field.render(d);
  assert.ok(hasText("切れた罠から蔓が伸び"));
  for(let i=0;i<12&&encounters.length===0;i++){field.update(10,[]);press("Enter");}
  assert.deepEqual(encounters,["snare_vine_path"]);
  assert.ok(state.flags.has("snare_path_clear"));
  for(let i=0;i<12&&state.x<326;i++)press("ArrowRight");
  assert.ok(Math.abs(state.x-350)<=36);
  press("Enter");
  field.update(10,[]);
  calls.length=0;field.render(d);
  assert.ok(hasText("その罠は、森の子を傷つける"));
  advanceUntil("masked_guardian_left_hand");
  assert.ok(state.flags.has("knowledge:guardian_protects_forest"));
  assert.equal(state.objective,"仮面の人物を追い、橋へ向かう");
  for(let i=0;i<80&&state.panelId==="snare_path";i++)press("ArrowRight");
  assert.equal(state.panelId,"fallen_bridge");
  assert.ok(saves>=3,"出入口と会話を保存");
}
console.log("罠の道 OK: 正式画像・fallback・涸れ沢から入場・蔓で通行停止・戦闘呼出・守人会話・橋への開通");
