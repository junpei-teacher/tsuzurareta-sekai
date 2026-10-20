# 狩人の野営地 背景試作 v42

> 日付：2026-09-15  
> 状態：内蔵ImageGen生成・森パレット変換・実Scene三状態比較済み／v43採用後、イラスト調整版v45に置換  
> 生成方式：Codex組込みImageGen

以下の未登録・未採用の記述はv42試作時点の履歴。現在の本編採用は `hunter-camp-background-adoption-v45.md` を参照。

## 景観と物語上の役割

第二章の `hunter_camp`。落ちた橋の先にある、貧しい狩人たちが実用本位で組んだ幕営である。左の橋の名残から右奥の守護樹へ連続する土道を保ち、補修布の低い幕、木箱、荷、干し台で生活の痕跡を作る。英雄的な遠征基地や豊かな商隊にはしない。人物足元は176、道の奥端は162。洞角猪、手帳、消えない熾火、人物、会話、UIは静景へ焼き込まず動的層で描く。

## 保存物

| ファイル | 寸法 | bytes | SHA-256 |
|---|---:|---:|---|
| `hunter-camp-imagegen-a-v42.png` | 1672×941 | 2,966,620 | `6ce7412473b29f4d36b529fc831d08506cb2454f7e19cb1c2b3a7134a6b9e0fc` |
| `hunter-camp-game-palette-v42-1x.png` | 480×270 | 271,674 | `45be37aae84c06de5b7cfb180db79562c7d136ec912ac19d18e2f7e0c2e6f40b` |
| `hunter-camp-game-palette-v42.png` | 960×540 | 324,470 | `f038c345fffc81ce54e3c6dd60ed8531ad9e08b02f68bcc150cd24ecc7f8459b` |

## 変換と比較

`tools/prepare-hunter-camp-v42.ts` は生成原本と正式森入口のハッシュ・寸法を確認し、原本の路面基準500をゲーム座標162へ対応させる。正式森背景の138色へ重み付きRGB距離で写像し、138色を使用。480×270から補間なしで整数2倍にする。`npm run verify:hunter-camp-trial` で旧v43候補を再生成できる。

DEV「背景　4地域比較」のKキーで、保存を変えない実SideViewScene比較へ入る。Gで画像／コード、Uで「猪との対峙」「手帳と熾火」「休息後」、Cで静景、Hで比較表示を切り替える。ブラウザで三状態と手帳会話を確認し、洞角猪と人物の接地、左右の通路、手帳と熾火の可読性を合格とした。

## 実送信プロンプト

```text
Use case: stylized-concept
Asset type: original side-scrolling RPG environment background for “Yohaku no Mori”, scene “Hunter Camp”; landscape 16:9.
Primary request: An abandoned but recently used hunters’ camp in a vivid old European woodland, just beyond a broken footbridge. It should feel practical, poor, and lived-in rather than heroic or luxurious.
Scene/backdrop: Temperate teal-green forest with pale birch trunks and layered cool mist. A patched canvas lean-to or low A-frame shelter sits in the back-right, made from muted ochre-brown cloth, rough poles, and rope. Nearby are a tied supply bundle, a rolled blanket, a small wooden crate, and a simple drying rack, all weathered and modest. Trampled earth and boot marks make the middle ground distinct. Leave the actual notebook and campfire embers absent because the game overlays them dynamically.
Style/medium: Original handmade colorful pixel-art environment, crisp square pixels, clustered shapes, richly nuanced but controlled palette, no smooth airbrushing or antialiasing. Match a finely crafted pastoral fantasy RPG with tangible bark, cloth, leather, stone, and moss textures.
Composition/framing: Strict side-view stage for a 480x270 game canvas. Continuous nearly horizontal open walking strip from left to right; far edge near y≈162/270 and character feet at y≈176/270. Keep the y=162–180 band clear of large props. Reserve x≈205 around the path for a large boar enemy drawn later, with supplies readable behind it. Reserve x≈350 near the shelter for a notebook and small ember overlay plus an interacting hero. Put the shelter and gear behind the walk line; traversable exits at both edges.
Lighting/mood: Filtered late-afternoon daylight, cool green forest air with a restrained warm amber touch around the camp area, suggesting warmth has only just left. Quiet, watchful, melancholy.
Color palette: Deep moss green, turquoise mist, pale birch ivory, warm worn ochre cloth, brown leather and timber, small muted amber accents; consistent with the existing vivid forest journey.
Constraints: scenery only; no people, creatures, boars, notebook, active fire, flames, smoke, magical glow, readable writing, UI, text, watermark, or border. No East Asian architecture, tents, or roof silhouettes.
```
