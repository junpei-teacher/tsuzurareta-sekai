/** 生成原本を変更せず、寸法・透過・画像端の画素を検査する。輪郭の品質は別途目視する。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const trials = [
  { file: "hero-pixen-v20.png", width: 32, height: 48, hash: "b2c1d944382596247453721c1a8832c4e822cf32aa1fe721076ac0b13a9eda62", clean: false },
  { file: "boundary-beast-pixen-v20.png", width: 80, height: 64, hash: "76a1bd47844d48643973c21208e9c15a9d994e6b7c5de4d934d4fc7cbf8def26", clean: false },
  { file: "hero-pixen-clean-v20.png", width: 32, height: 48, hash: "61b6664dd8f0b156f3ed2feadd2dd36ce753d0e85b1696ecedd89483771007e0", clean: true },
  { file: "boundary-beast-pixen-clean-v20.png", width: 80, height: 64, hash: "a5d43fe3436526000e4b769e8f7f05a8e68c61e3f0b22bed224061e6f0a4b8ee", clean: true },
  { file: "hero-pixen-sky-v21.png", width: 32, height: 48, hash: "3e200d57973e9a36dcd967af6945357eb4114ecdeedbd0e15ca07b1337b6ec9a", clean: true },
  { file: "sena-pixen-unmasked-v22.png", width: 32, height: 48, hash: "196518714b59437a78d7770e68e54920ca5d4c646433d4dbcabc52c85800b42b", clean: true },
  { file: "sena-pixen-clean-v22.png", width: 32, height: 48, hash: "117cc3f7fd1b03fd4b85b872a9dae61957a01339aa84692b12b41daefb6d8fb6", clean: true },
  { file: "sena-pixen-masked-v22.png", width: 32, height: 48, hash: "86e66581c7ebfb5278a1090554fc7029ec344f8f15ab4d973be3822a8dcf2844", clean: true },
  { file: "sena-pixen-groundless-v22.png", width: 32, height: 48, hash: "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e", clean: true },
  { file: "boundary-beast-pixen-yield-v22.png", width: 80, height: 64, hash: "1513ce84c081e32607ca5bfed38c0fd1997dd1d47689524b174dfeeab5430a45", clean: true },
  { file: "boundary-beast-pixen-kneel-v22.png", width: 80, height: 64, hash: "b3006c23589d5d4e9b4f34ffa17272457e8b1398c53c542ff6b4103cd5dd28f9", clean: true },
  { file: "hero-pixen-idle-v23-f1.png", width: 32, height: 48, hash: "148613d28583701db5eb63e6a924db85b1ced6b98f20b7ef73e2d37a089b2dd5", clean: true },
  { file: "hero-pixen-idle-v23-f2.png", width: 32, height: 48, hash: "74ab9c14360497f61d6a30a24d3ca812988c1aace47ffd8cf1f8930d0f9d7fea", clean: true },
  { file: "hero-pixen-idle-v23-f3.png", width: 32, height: 48, hash: "ea8f143367bb4ef8fa6295ede7cbc55656e6526b423764b99ce01760d5d0e2b9", clean: true },
  { file: "hero-pixen-idle-v23-f4.png", width: 32, height: 48, hash: "deb10dc9bcb95c9d15fe963e7356ed00f9fb1c518226dc5c0cdf5c8d2ec44cd9", clean: true },
  { file: "hero-pixen-walk-v23-f1.png", width: 32, height: 48, hash: "2d52e8a84eb0839108bb553f59ad46878bb2d3e7509d39c2cc91eebe0f6088ca", clean: true },
  { file: "hero-pixen-walk-v23-f2.png", width: 32, height: 48, hash: "00e03633df388acb74cb161a62988c082802f11b9822fda086b9532ce3cb6d83", clean: true },
  { file: "hero-pixen-walk-v23-f3.png", width: 32, height: 48, hash: "b6d1a33bf66cfa5f0e24791190895ee8a8e76169e9c533bfae4ca0b855083c2c", clean: true },
  { file: "hero-pixen-walk-v23-f4.png", width: 32, height: 48, hash: "21e130f8688acc7076904d15e7c9e607e11135c50be2f0490309b89eb0883214", clean: true },
  { file: "hero-pixen-walk-short-v23-f1.png", width: 32, height: 48, hash: "a82004eb2f999bd43026a9e44997391d2fc4a2532bb178d65eb9f73f9bda9117", clean: true },
  { file: "hero-pixen-walk-short-v23-f2.png", width: 32, height: 48, hash: "b8965952daddc4967cfdedec01cbbd127c597c8f242ac38f6da307c674040a9d", clean: true },
  { file: "hero-pixen-walk-short-v23-f3.png", width: 32, height: 48, hash: "2bc147462136c3b2f3dae070d03df151637b1e828d9a09e3115d203bad75f145", clean: true },
  { file: "hero-pixen-walk-short-v23-f4.png", width: 32, height: 48, hash: "1527cdc1af3b72d920763da4d062e5f57b68eb1423eae2bb8c55f736360c5ea5", clean: true },
  { file: "sena-pixen-idle-v23-f1.png", width: 32, height: 48, hash: "e3ebc172d2e9e5f0955fd31506adfe5c29216342cc90f0ae80ffd655bf587b7b", clean: true },
  { file: "sena-pixen-idle-v23-f2.png", width: 32, height: 48, hash: "f7af19815e9083d5df967aa5aef18ba8a5416fedeb1a1ee4c669ca93ef61d309", clean: true },
  { file: "sena-pixen-idle-v23-f3.png", width: 32, height: 48, hash: "3a4eadd72665d526f444c6c5a640f8d2f6cf1a005a91af7416204c71ce64177e", clean: true },
  { file: "sena-pixen-idle-v23-f4.png", width: 32, height: 48, hash: "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e", clean: true },
  { file: "sena-pixen-walk-v23-f1.png", width: 32, height: 48, hash: "650a84dd8a51ba2225418f56049b15987538659a41c7c68e94626b2c421e49a9", clean: true },
  { file: "sena-pixen-walk-v23-f2.png", width: 32, height: 48, hash: "12168b01b1f3ea1f17a5cbfaee9fce6369c5c27cc544519747c17fc9ec34eff3", clean: true },
  { file: "sena-pixen-walk-v23-f3.png", width: 32, height: 48, hash: "0d831246a0af07dd07275f7764e720058ab799b40fc056c9b46fe950de88d985", clean: true },
  { file: "sena-pixen-walk-v23-f4.png", width: 32, height: 48, hash: "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e", clean: true },
  { file: "sena-pixen-walk-clear-v23-f1.png", width: 32, height: 48, hash: "606a36f50446a9a21746fb035ae9eddd0190c7e6c71eeb906a4e44691481ff52", clean: true },
  { file: "sena-pixen-walk-clear-v23-f2.png", width: 32, height: 48, hash: "a68f2c2e74609f763e34c6be94c626cb9296ad542e803bae5bac5939679a8fe9", clean: true },
  { file: "sena-pixen-walk-clear-v23-f3.png", width: 32, height: 48, hash: "42fa9a1fa79a7913b0fd6762f8ea42c90d8bfc886c9f50388f4c3640a7ec87bf", clean: true },
  { file: "sena-pixen-walk-clear-v23-f4.png", width: 32, height: 48, hash: "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e", clean: true },
];

for (const trial of trials) {
  const bytes = readFileSync(join(import.meta.dirname, "../docs/concepts", trial.file));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), trial.hash, `${trial.file}: 原本変更`);
  const png = PNG.sync.read(bytes);
  assert.equal(png.width, trial.width);
  assert.equal(png.height, trial.height);
  let clear = 0, solid = 0, partial = 0, border = 0;
  let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const alpha = png.data[(y * png.width + x) * 4 + 3]!;
    if (alpha === 0) { clear++; continue; }
    if (alpha === 255) solid++; else partial++;
    if (x === 0 || y === 0 || x === png.width - 1 || y === png.height - 1) border++;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  assert.ok(clear > 0 && solid > 0, `${trial.file}: 実際の透過と不透明な本体が必要`);
  assert.equal(partial, 0, `${trial.file}: 輪郭の半透明混入`);
  if (trial.clean) assert.equal(border, 0, `${trial.file}: 原本端へ届く不要な画素`);
  const person = /^(hero|sena)-/.test(trial.file);
  assert.ok(png.width * 2 <= (person ? 64 : 170));
  assert.ok(png.height * 2 <= (person ? 96 : 170));
  console.log(JSON.stringify({ file: trial.file, bounds: { minX, minY, maxX, maxY }, clear, solid, partial, border }));
}
console.log("キャラ原本検証 OK。透過のある原本でも、台座・格子模様の目視検査は別途必要。本番採用を意味しない。");
