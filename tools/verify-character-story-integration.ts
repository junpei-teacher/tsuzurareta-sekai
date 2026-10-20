import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SERIES2_ENDING_PAGE_HOLD,
  villageWalkStateAt,
} from "../src/scenes/endingMotion.ts";
import { GeneratedStoryCharacterLayer } from "../src/fx/generatedStoryCharacters.ts";

const root = resolve(import.meta.dirname, "..");
const main = readFileSync(resolve(root, "src/main.ts"), "utf8");
const reveal = readFileSync(resolve(root, "src/scenes/senaReveal.ts"), "utf8");
const ending = readFileSync(resolve(root, "src/scenes/endingSeries2.ts"), "utf8");

const unloadedLayer = new GeneratedStoryCharacterLayer({});
assert.equal(unloadedLayer.frames("hero", "idle").length, 2, "読込失敗時も待機枠を保持");
assert.equal(unloadedLayer.frames("sena", "walk").length, 4, "読込失敗時も歩行枠を保持");

assert.equal(SERIES2_ENDING_PAGE_HOLD[1], 3.4, "村道は中立足まで入力を待つ");

const start = villageWalkStateAt(0);
assert.deepEqual([start.heroX, start.senaX], [390, 438], "開始位置");

const movementEnd = villageWalkStateAt(0.18 + 2.9);
assert.equal(movementEnd.progress, 1, "2.9秒で移動を完了");
assert.deepEqual([movementEnd.heroX, movementEnd.senaX], [270, 318], "停止位置");

const inputReady = villageWalkStateAt(SERIES2_ENDING_PAGE_HOLD[1]);
assert.equal(inputReady.progress, 1, "入力解禁時には移動済み");
assert.deepEqual(inputReady.motion, { mode: "walk", frame: 3 }, "入力解禁は両足の揃う4コマ目");

const settled = villageWalkStateAt(3.52);
assert.deepEqual(settled.motion, { mode: "idle", frame: 0 }, "停止後は待機1コマ目へ戻る");

assert.match(main, /const storyCharacterLayer = new GeneratedStoryCharacterLayer\(series2Images\)/);
assert.match(
  main,
  /new Series2EndingScene\(\s*loadName\(\) \|\| "TEST",\s*goSeries2Debug,\s*storyCharacterLayer,\s*true,\s*storehouseBackground/s,
);
assert.match(
  main,
  /new SenaRevealScene\(\s*\(\) => goSideView\(revealState\),\s*storyCharacterLayer,\s*true/s,
);
assert.match(
  main,
  /new Series2EndingScene\(\s*player\.name,\s*goTitle,\s*storyCharacterLayer,\s*false,\s*storehouseBackground/s,
);
assert.match(main, /new SenaRevealScene\(\(\) => goSideView\(state\), storyCharacterLayer\)/);
assert.match(reveal, /private readonly characterLayer\?: StoryCharacterLayer/);
assert.match(ending, /private readonly characterLayer\?: StoryCharacterLayer/);
assert.match(ending, /P 比較　T 停止　←→ 時刻　R 再生/);

console.log("character story integration ok");
console.log("- production reveal and ending receive the adopted image layer");
console.log("- debug routes alone enable comparison and time controls");
console.log("- village walk reaches frame 4 at 3.40s and settles to idle");
