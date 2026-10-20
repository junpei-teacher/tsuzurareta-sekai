import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const assets = read("src/core/series2Assets.ts");
const main = read("src/main.ts");
const art = read("src/fx/storyArt.ts");
const opening = read("src/scenes/opening.ts");
const sideview = read("src/sideview/scene.ts");
const ending = read("src/scenes/endingSeries2.ts");
const preview = read("src/scenes/backgroundComparisonPreview.ts");

assert.match(assets, /VILLAGE_ROAD_BACKGROUND_ID = "background\.village_road\.middle"/);
assert.match(main, /const villageRoadBackground = series2Images\[VILLAGE_ROAD_BACKGROUND_ID\]/);
assert.match(main, /new OpeningScene\([\s\S]*?\}, villageRoadBackground\)/);
assert.equal(
  [...main.matchAll(/new Series2EndingScene\(([\s\S]*?)\);/g)]
    .filter((match) => match[1]!.includes("villageRoadBackground")).length,
  2,
  "通常・DEVの終幕へ正式村道を渡す",
);

assert.match(opening, /renderVillageRoad\(d, this\.t \* 0\.22, \{ background: this\.villageRoadBackground \}\)/);
assert.match(sideview, /background: this\.images\[VILLAGE_ROAD_BACKGROUND_ID\]/);
assert.match(ending, /renderVillageRoad\(d, this\.clock, \{ background: this\.villageRoadBackground \}\)/);

assert.match(art, /export function isVillageRoadBackgroundReady/);
assert.match(art, /isVillageRoadBackgroundReady\(o\.background\)/);
assert.match(art, /drawVillageRoadStoryState\(d, o\)/);
assert.match(art, /if \(o\.merchantArrived\)/);
assert.match(art, /if \(o\.fireDateKnown\)/);
assert.match(art, /naturalWidth === 960 && image\.naturalHeight === 540/);

assert.match(preview, /renderVillageRoad\(d, this\.clock, \{ \.\.\.options, background: this\.villageRoadBackground \}\)/);
assert.doesNotMatch(preview, /\/docs\/concepts\/village-road/, "正式採用後のDEV比較は資料PNGを直読しない");

console.log("village road story integration ok");
console.log("- opening, chapter 1 and ending share the adopted European-roof village road");
console.log("- merchant wagon, record paper and dusk tint remain dynamic");
console.log("- invalid images fall back to code art; DEV comparison uses the production compositor");
