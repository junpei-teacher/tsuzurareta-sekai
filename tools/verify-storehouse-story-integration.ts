import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const main = read("src/main.ts");
const art = read("src/fx/storyArt.ts");
const prologue = read("src/scenes/prologue.ts");
const village = read("src/scenes/villagePlaceholder.ts");
const ending = read("src/scenes/endingSeries2.ts");
const preview = read("src/scenes/storehouseBackgroundPreview.ts");

assert.match(main, /const storehouseBackground = series2Images\[VILLAGE_STOREHOUSE_BACKGROUND_ID\]/);
assert.match(main, /new PrologueScene\([\s\S]*?storehouseBackground\s*\)/);
assert.match(main, /new VillagePlaceholderScene\(player\.name, goSideView, storehouseBackground\)/);
assert.match(
  main,
  /new Series2EndingScene\(\s*player\.name,\s*goTitle,\s*storyCharacterLayer,\s*false,\s*storehouseBackground/s,
);

for (const [name, source] of [["prologue", prologue], ["village", village], ["ending", ending]] as const) {
  assert.match(source, /background: this\.storehouseBackground/, `${name}: 正式背景を共通描画へ渡す`);
}
assert.match(art, /naturalWidth === 960 && image\.naturalHeight === 540/);
assert.match(art, /const stock = depleted \? 3 : 8/);
assert.match(art, /if \(showSena\)[\s\S]*?"SENA"/);
assert.match(art, /if \(playerName\) drawWoodTag/);
assert.match(prologue, /const adopted = isStorehouseBackgroundReady\(this\.storehouseBackground\)/);
assert.match(preview, /background: this\.candidate \? this\.image : undefined/);
assert.doesNotMatch(preview, /renderCandidateState/, "DEV比較も本番と同じ動的層を使う");

console.log("storehouse story integration ok");
console.log("- prologue, present village and ending share the adopted background");
console.log("- stock, tags and night remain dynamic; invalid image falls back to code art");
console.log("- DEV comparison exercises the production compositing path");
