/** 景観の差し替えが、足跡・会話・出現条件・保存に影響しないことを実Sceneで確認する。 */
import assert from "node:assert/strict";
import type { Audio } from "../src/core/audio.ts";
import type { Display } from "../src/core/display.ts";
import type { Keyboard } from "../src/core/input.ts";
import { FALLEN_BRIDGE_BACKGROUND_ID, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";
import { renderFallenBridge } from "../src/fx/fallenBridge.ts";
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


assert.ok(SERIES2_MANIFEST[FALLEN_BRIDGE_BACKGROUND_ID]?.endsWith("backgrounds/fallen_bridge/middle.png"));
for(const invalid of [undefined,{...image,complete:false},{...image,naturalWidth:480}]){
  calls.length=0;renderFallenBridge(d,0,invalid as HTMLImageElement|undefined);
  assert.equal(imageCalls().length,0);
  assert.ok(calls.some(c=>c.name==="ctx.createLinearGradient"));
}
for(const available of [true,false]){
  const state:SideViewState={
    panelId:"snare_path",x:440,facing:1,
    flags:new Set(["chapter2_started","snare_path_clear","masked_guardian_left_hand"]),
    defeated:new Set(["snare_vine_path"]),objective:"仮面の人物を追い、橋へ向かう",
  };
  const encounters:string[]=[];let saves=0;
  const field=new SideViewScene(
    {isDown:()=>false} as unknown as Keyboard,new Player(),{play(){}} as unknown as Audio,
    ()=>{},()=>{saves++;return {ok:true};},
    encounter=>{
      encounters.push(encounter.id);
      for(const flag of encounter.winFlags??[])state.flags.add(flag);
      state.defeated.add(encounter.id);
      if(encounter.winObjective)state.objective=encounter.winObjective;
    },
    state,()=>{},available?{[FALLEN_BRIDGE_BACKGROUND_ID]:image}:{},
  );
  const press=(key:string)=>{field.update(.1,[key]);field.update(.5,[]);};
  press("ArrowRight");
  assert.equal(state.panelId,"fallen_bridge");
  calls.length=0;field.render(d);
  assert.equal(imageCalls().length,available?1:0);
  assert.ok(saves>=1);
  for(let i=0;i<20;i++)press("ArrowRight");
  assert.equal(state.x,196,"蛾戦の前は通行できない");
  press("Enter");field.update(10,[]);
  calls.length=0;field.render(d);
  assert.ok(hasText("灰色の蛾が、橋の上へ粉を落とす"));
  for(let i=0;i<12&&encounters.length===0;i++){field.update(10,[]);press("Enter");}
  assert.deepEqual(encounters,["hush_moth_bridge"]);
  assert.ok(state.flags.has("short_forgetting_seen"));
  calls.length=0;field.render(d);
  assert.ok(calls.some(c=>c.name==="ctx.bezierCurveTo"),"二重結びを動的に表示");
  for(let i=0;i<12&&state.x<320;i++)press("ArrowRight");
  assert.ok(Math.abs(state.x-344)<=36);
  press("Enter");field.update(10,[]);
  calls.length=0;field.render(d);
  assert.ok(hasText("切れた橋綱に、二つの輪を残す結び目がある"));
  for(let i=0;i<20&&!state.flags.has("double_knot_clue");i++){field.update(10,[]);press("Enter");}
  assert.ok(state.flags.has("double_knot_clue"));
  assert.ok(state.flags.has("knowledge:sena_crossed_forest"));
  assert.equal(state.objective,"狩人の野営地へ向かう");
  calls.length=0;field.render(d);
  assert.equal(calls.filter(c=>c.name==="ctx.bezierCurveTo").length,0,"調査後の結び目表示は消える");
  for(let i=0;i<80&&state.panelId==="fallen_bridge";i++)press("ArrowRight");
  assert.equal(state.panelId,"hunter_camp");
  assert.ok(saves>=3);
}
console.log("落ちた橋 OK: 正式画像・fallback・罠の道から入場・蛾で通行停止・戦闘呼出・結び目調査・野営地開通");
