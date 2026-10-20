import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const assets = read("src/core/series2Assets.ts");
const main = read("src/main.ts");
const art = read("src/fx/storyArt.ts");
const sideview = read("src/sideview/scene.ts");
const preview = read("src/scenes/backgroundComparisonPreview.ts");

assert.match(assets, /VILLAGE_GATE_BACKGROUND_ID = "background\.village_gate\.middle"/);
assert.match(assets, /backgrounds\/village_gate\/middle\.png/);
assert.match(main, /const villageGateBackground = series2Images\[VILLAGE_GATE_BACKGROUND_ID\]/);
assert.match(main, /new BackgroundComparisonPreviewScene\([\s\S]*?villageGateBackground,[\s\S]*?\)/);

assert.match(art, /export function isVillageGateBackgroundReady/);
assert.match(art, /isVillageGateBackgroundReady\(o\.background\)/);
assert.match(art, /export function drawVillageGateStoryState/);
assert.match(art, /drawVillageGateStoryState\(d, o\)/);
assert.match(art, /if \(o\.disturbed\) drawVillageGateDisturbance\(d\)/);
assert.match(art, /if \(o\.hunterDeparted\)/);
assert.match(art, /if \(o\.warningKnown\)/);
assert.match(art, /if \(o\.borderOpen\)/);
assert.match(art, /naturalWidth === 960 && image\.naturalHeight === 540/);

assert.match(sideview, /background: this\.images\[VILLAGE_GATE_BACKGROUND_ID\]/);

assert.match(preview, /const VILLAGE_GATE_STATES = \["初期", "警告後", "出発後"\]/);
assert.match(preview, /isVillageGateBackgroundReady\(this\.villageGateBackground\)/);
assert.match(preview, /renderVillageGate\(d, this\.clock, \{ \.\.\.options, background: this\.villageGateBackground \}\)/);
assert.doesNotMatch(preview, /\/docs\/concepts\/village-gate/, "正式採用後のDEV比較は資料PNGを直読しない");
assert.match(preview, /this\.villagePlace === "road" \? "gate" : "road"/);

console.log("village gate story integration ok");
console.log("- every production village-gate panel receives the adopted European rural gate");
console.log("- tracks, warning cloth, hunter equipment and barrier state remain dynamic");
console.log("- invalid images fall back to code art; DEV comparison uses the production compositor");
