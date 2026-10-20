/** 主人公の子供・成人・肖像を元の茶髪へ戻し、水色が残らないことを検査する。 */
import assert from "node:assert/strict";
import type { Display } from "../src/core/display.ts";
import { HERO_HAIR, PAL } from "../src/core/palette.ts";
import { drawStoryPerson, drawStoryPortrait, type StoryPersonKind, type StoryPortraitId } from "../src/fx/storyArt.ts";

const colors = new Set<string>();
const rects: unknown[][] = [];
const ctx = new Proxy<Record<string, unknown>>({}, {
  get: (target, key: string) => key in target ? target[key] : () => {},
});
const display = {
  ctx,
  rect(...args: unknown[]) { colors.add(String(args[4])); rects.push(args); },
  frame(...args: unknown[]) { colors.add(String(args[4])); },
} as unknown as Display;
const reset = () => { colors.clear(); rects.length = 0; };

assert.deepEqual(HERO_HAIR, { outline: "#3b2d25", shadow: "#2a241f", shade: "#5e402f", base: "#4b3529", highlight: "#765039", child: "#3c3026" }, "v20以前の茶髪の色面を保持する");
assert.ok(!Object.values(HERO_HAIR).some(color => String(color) === PAL.accentCool), "指輪の色を髪色へ流用しない");
for (const kind of ["heroChild", "heroAdult"] as const) {
  for (const facing of [-1, 1] as const) for (const mode of ["idle", "walk"] as const) {
    for (let frame = 0; frame < (mode === "walk" ? 4 : 2); frame++) {
      reset();
      drawStoryPerson(display, 100, 176, kind, facing, false, { mode, frame });
      assert.ok(colors.has(kind === "heroChild" ? HERO_HAIR.child : HERO_HAIR.base), `${kind}/${mode}/${frame}: 元の茶髪`);
      assert.ok(!colors.has("#3bdbec") && !colors.has("#9aebf4"), "水色試作の色を残さない");
      assert.ok(colors.has("#d9b184"), "肌の暖色を維持する");
      if (kind === "heroAdult") {
        assert.ok(colors.has(HERO_HAIR.shadow) && colors.has(HERO_HAIR.highlight));
        assert.ok(colors.has("#a99b75") && colors.has("#527760"), "生成りの服と苔色の襟巻きを維持する");
      }
    }
  }
}
for (const kind of ["senaChild", "sena", "guardian", "keeper", "villager", "hunter", "merchant"] satisfies StoryPersonKind[]) {
  reset();
  drawStoryPerson(display, 100, 176, kind);
  assert.ok(!colors.has(HERO_HAIR.base), `${kind}: 主人公の髪色へ変えない`);
}
reset();
drawStoryPortrait(display, 0, 0, "hero");
for (const [key, color] of Object.entries(HERO_HAIR)) if (key !== "child") assert.ok(colors.has(color), "肖像は従来の5段パレットを使用する");
assert.ok(!colors.has("#3bdbec") && !colors.has("#9aebf4"), "肖像に水色を残さない");
assert.ok(rects.some(([x, y, width, height, color]) => x === 17 && y === 7 && width === 27 && height === 6 && color === HERO_HAIR.base),
  "肖像の髪の房の位置と大きさは維持する");
for (const id of ["sena", "sena_masked", "hunter_chief", "merchant"] satisfies StoryPortraitId[]) {
  reset();
  drawStoryPortrait(display, 0, 0, id);
  assert.ok(!colors.has(HERO_HAIR.base), `${id}: 他の肖像を巻き込まない`);
}
console.log("人物色検証 OK: 主人公の子供・成人／待機2・歩行4／左右／肖像／他人物の色維持");
