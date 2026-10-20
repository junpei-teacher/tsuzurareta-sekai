# 狩人の野営地 イラスト調整 v44

> 日付：2026-09-15  
> 状態：内蔵ImageGen編集・森パレット変換・旧版との実画面比較済み／v45として正式採用  
> 生成方式：Codex組込みImageGen編集

## 調整理由

v43は構図、色、歩行帯には問題がなかったが、葉・樹皮・土の微細な粒と高周波の明暗が多く、白い木の境など先行背景より写真加工に近く見えた。ユーザー指摘を受け、構図を作り直さず、描画密度だけを一段イラスト寄りへ整理した。

Image 1をv43の正式背景、Image 2を白い木の境の密度参照として編集した。Image 2から地形や物体を移さず、大きな色面、明確な輪郭、限定した段階陰影だけを参照した。編集により幕や橋の細部は再描画されているため、単純なフィルタ処理とは区別する。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `hunter-camp-illustrated-imagegen-b-v44.png` | 1672×941 | 2,274,409 | `79800854dadfd276caf9f79903b6c72d4f78ad6d99abe6284f9e3d715fab5ccf` |
| `hunter-camp-illustrated-game-v44-1x.png` | 480×270 | 210,458 | `cb8e6a33c6558e891d58878833f48e33c55407cd3d12850f38bb11704bfac650` |
| `hunter-camp-illustrated-game-v44.png` | 960×540 | 252,417 | `66361a4aa9b3835623324110a2d80db6e62685950bfea831ad92412ae20d85a4` |

`tools/prepare-hunter-camp-v44.ts` は原本の路面基準550をゲーム座標162へ合わせ、正式森背景の138色へ写像し、480×270から補間なしで整数2倍にする。`npm run verify:hunter-camp-illustrated-trial` で原本・パレット・整数倍・v45正式画像との一致を検査する。

DEV背景比較ではKをv45、Lを旧v43として同じ人物、猪、UI条件で比較できる。v44派生は微細な粒を抑えながら、猪の輪郭、x350の手帳と熾火、左右の通路、白樺と幕の識別を保ったため採用とした。

## 実送信プロンプト

```text
Use case: style-transfer
Asset type: edited side-scrolling RPG environment background for “Yohaku no Mori”, scene “Hunter Camp”, 16:9.
Input images: Image 1 is the edit target and its composition must be preserved. Image 2 is a style-density reference only: match its clearer illustrated pixel-art simplification and broad color grouping, but do not copy its landscape or objects.
Primary request: Make Image 1 modestly more illustrative and less needlessly realistic. Change only the rendering treatment: simplify micro-texture in foliage, bark, canvas, rocks, and soil into larger deliberate pixel clusters; use cleaner readable silhouettes, slightly broader color shapes, and restrained two-to-four-tone shading. Reduce photographic grain, stippling, noisy dithering, tiny high-frequency highlights, and hyper-detailed surface rendering.
Invariants: Preserve Image 1’s exact side-view composition, camera, geometry, perspective, object placement, old bridge remnant on the left, open horizontal walking strip, birch forest, supply bundles, drying rack, crate, and patched ochre A-frame shelter on the right. Preserve the road height and the empty gameplay spaces near x≈205 and x≈350. Preserve the teal-green, birch-ivory, worn-ochre palette and late-afternoon lighting. Do not add, remove, resize, or relocate scene elements.
Style/medium: Original handmade colorful pixel-art illustration with crisp square pixels, clean shape language, limited clustered shading, gently storybook-like rather than photographic. The result should feel painted by the same game art team as Image 2 while retaining Image 1’s identity.
Constraints: scenery only; no people, creatures, boars, notebook, active fire, flames, smoke, magical glow, readable writing, UI, text, watermark, or border. No smooth gradients, antialiasing, photographic detail, film grain, or dense speckled dithering. No East Asian architecture.
Output intent: one careful revision, not a redesign.
```

