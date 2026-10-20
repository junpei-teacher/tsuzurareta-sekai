/** 正式目録と採用PNGを突き合わせる。原本・DEV資料の採用を防ぐ。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { SERIES2_ASSETS, SERIES2_MANIFEST } from "../src/core/series2Assets.ts";

const root = resolve(import.meta.dirname, "../src/assets/series2");
const registered = new Set<string>();
for (const [id, spec] of Object.entries(SERIES2_ASSETS)) {
  const path = fileURLToPath(spec.src);
  assert.ok(path.startsWith(root + sep), `${id}: 採用素材の領域外`);
  assert.ok(!registered.has(path), `${id}: 同じPNGの二重登録`);
  registered.add(path);
  const name = relative(root, path).split(sep).join("/");
  const background = /^backgrounds\/([a-z0-9_]+)\/(far|middle|foreground)\.png$/.exec(name);
  const character = /^characters\/(hero|sena)\/(idle|walk)_(\d+)\.png$/.exec(name);
  assert.ok(background || character, `${id}: 未定義の素材命名規格（新カテゴリ採用時に規格を追加）`);
  if (background) {
    assert.equal(id, `background.${background[1]}.${background[2]}`, `${id}: パスとIDの不一致`);
    assert.equal(spec.width, 960);
    assert.equal(spec.height, 540);
  } else if (character) {
    assert.equal(
      id,
      `character.${character[1]}.${character[2]}.${character[3]}`,
      `${id}: パスとIDの不一致`,
    );
    assert.equal(spec.width, 32);
    assert.equal(spec.height, 48);
  }
  assert.equal(SERIES2_MANIFEST[id], spec.src, `${id}: ロード目録の参照漏れ`);
  const bytes = readFileSync(path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), spec.sha256, `${id}: ハッシュ`);
  const png = PNG.sync.read(bytes);
  assert.equal(png.width, spec.width, `${id}: 幅`);
  assert.equal(png.height, spec.height, `${id}: 高さ`);
  if (spec.alpha === "opaque") {
    for (let i = 3; i < png.data.length; i += 4) assert.equal(png.data[i], 255, `${id}: 透過の混入`);
  } else {
    let clear = 0;
    for (let i = 3; i < png.data.length; i += 4) {
      assert.ok(png.data[i] === 0 || png.data[i] === 255, `${id}: 半透明の混入`);
      if (png.data[i] === 0) clear++;
    }
    assert.ok(clear > 0, `${id}: 透明背景がない`);
  }
}
assert.deepEqual(Object.keys(SERIES2_MANIFEST).sort(), Object.keys(SERIES2_ASSETS).sort());
function filesBelow(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}
const files = filesBelow(root);
assert.deepEqual(files.sort(), [...registered].sort(), "未登録・余分・欠落した採用ファイル");
console.log(`採用素材検証 OK: ${registered.size}点／命名・ID・寸法・透過・参照・欠落・余分なファイル`);
