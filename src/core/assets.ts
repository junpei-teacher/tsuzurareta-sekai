/**
 * 画像アセットの読み込み（Phase 7）。
 *
 * 起動時にすべて読み終えてからゲームループを回す。
 * ドット絵なので枚数も容量も小さく、遅延読み込みの必要はない。
 *
 * パスは public/ からの絶対パス。実体は public/assets/... に置く。
 */

export type ImageMap = Record<string, HTMLImageElement>;

/** `key.0` `key.1` … の連番エントリを作る。テンプレートの {i} が番号に変わる */
function seq(key: string, template: string, count: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) out[`${key}.${i}`] = template.replace("{i}", String(i));
  return out;
}

/**
 * 読み込むアセットの一覧。ここが唯一の出典。
 *
 * NPCは画面内を歩かないので、必要なのは待機モーションだけ。
 * 4方向の歩行が要るのは主人公のみ（docs/アートバイブル.md 第6節）。
 */
export const MANIFEST: Record<string, string> = {
  // 主人公。画面内を歩く唯一のキャラなので4方向の歩行を持つ
  // v3。フードを常に下ろした形にして、4方向で装備が食い違わないようにした
  "hero.south": "/assets/sprites/hero3/south.png",
  "hero.north": "/assets/sprites/hero3/north.png",
  "hero.east": "/assets/sprites/hero3/east.png",
  "hero.west": "/assets/sprites/hero3/west.png",
  ...seq("hero.walk.south", "/assets/sprites/hero3/walk/south_{i}.png", 4),
  ...seq("hero.walk.north", "/assets/sprites/hero3/walk/north_{i}.png", 4),
  ...seq("hero.walk.east", "/assets/sprites/hero3/walk/east_{i}.png", 4),
  ...seq("hero.walk.west", "/assets/sprites/hero3/walk/west_{i}.png", 4),

  // Wang タイルセット（各16タイル・4x4シート・32px）
  // 減色はかけない。生成そのままの色をそのまま使う
  "tiles.stone": "/assets/tiles2/stone.png",
  "tiles.shelf": "/assets/tiles2/shelf.png",

  // 家具。マスに乗せるスプライト（32pxタイル用に2倍サイズ）
  "prop.desk": "/assets/props2/desk.png",
  "prop.candle": "/assets/props2/candle.png",
  "prop.door": "/assets/props2/door.png",
  // 階段は絵を持たない。src/scenes/field.ts の renderStairs で組む
  "prop.rubble": "/assets/props2/rubble.png",

  // NPC。画面内を歩かないので待機の4方向だけ。キーの頭は .room の !npc の ref と揃える
  // ミラ v5。立ち絵と同じ人物から起こしてある（顔と服が食い違わない）。
  // **裾が床まである服は避ける。** v3 は膝下まである長衣で、
  // 足が描かれないまま裾が切れ、足首から下を切断されたように見えていた
  ...facing("mira", "/assets/sprites/mira_v5"),
  ...facing("librarian", "/assets/sprites/librarian"),
  ...facing("halven", "/assets/sprites/halven"),
  // 会話する相手のうち、以前は色付きの矩形で代用していたもの
  ...facing("soldier", "/assets/sprites/soldier"),
  ...facing("erased_one", "/assets/sprites/erased_one"),
  // 灰の中の声は人ではないので向きを持たない。南だけ置く
  "ashvoice.south": "/assets/mobs/ashvoice.png",

  // 立ち絵。素材は128pxで、64デザイン単位の枠にちょうど収まる。
  // 全て character_to_portrait で**フィールドの姿から起こしている**ので、
  // 顔と服がマップ上のドット絵と食い違わない
  "portrait.hero": "/assets/portraits/hero.png",
  "portrait.mira": "/assets/portraits/mira.png",
  "portrait.librarian": "/assets/portraits/librarian.png",
  "portrait.halven": "/assets/portraits/halven.png",
  "portrait.soldier": "/assets/portraits/soldier.png",
  // 灰の中の声だけは変換ではなく描き起こし。本の山はキャラではないため
  "portrait.ashvoice": "/assets/portraits/ashvoice.png",
  // 抹消された名前の者は、顔が白紙なのでバストにする意味がない。
  // 戦闘の立ち姿をそのまま枠に入れる。全身が枠に収まって、かえって不気味になる
  "portrait.erased": "/assets/enemies/erased.png",

  // 敵。戦闘は正面から見るだけなので、回転もアニメも持たない1枚絵。
  // そのぶんの予算を1枚の質に寄せてある（create_image_pro・候補から選抜）。
  // キーは data/enemies.json の id と対応させること
  ...enemySprites(
    "bookworm", "inkslime", "sootbat", "emberfiend",
    "soldier", "erased", "ashvoice", "archdemon",
  ),
  // 「名を失くした頁」は抹消された名前の者の弱い同類。絵は共用する
  "enemy.unnamed": "/assets/enemies/erased.png",

  // フィールドに置く敵シンボル。**戦闘の1枚絵とは別に描き起こす。**
  // 戦闘絵は大きさがまちまち（煤蝙蝠は128px＝4マス幅）で、
  // そのままマップに置くと壁を突き抜ける。ここは2マスに収まる小さな姿にする
  ...mobSprites(
    "bookworm", "inkslime", "sootbat", "emberfiend", "unnamed", "archdemon",
  ),
};

/** フィールドの敵シンボル。キーは data/enemies.json の id */
function mobSprites(...ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) out[`mob.${id}`] = `/assets/mobs/${id}.png`;
  return out;
}

/** 敵スプライトのエントリを id から作る */
function enemySprites(...ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) out[`enemy.${id}`] = `/assets/enemies/${id}.png`;
  return out;
}

/** 4方向の待機エントリをまとめて作る */
function facing(key: string, dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of ["south", "north", "east", "west"]) out[`${key}.${d}`] = `${dir}/${d}.png`;
  return out;
}

/**
 * 1枚でも欠けたら握り潰さずログに出す。
 * 差し替え途中でファイル名を間違えたときに黙って矩形へ戻るのが一番困る。
 */
export async function loadImages(manifest = MANIFEST): Promise<ImageMap> {
  const entries = Object.entries(manifest);
  const loaded = await Promise.all(
    entries.map(([key, src]) =>
      new Promise<[string, HTMLImageElement | null]>((resolve) => {
        const img = new Image();
        img.onload = () => resolve([key, img]);
        img.onerror = () => {
          console.error(`アセットを読み込めません: ${key} → ${src}`);
          resolve([key, null]);
        };
        img.src = src;
      }),
    ),
  );

  const out: ImageMap = {};
  for (const [key, img] of loaded) if (img) out[key] = img;
  return out;
}

/** `key.0` から連番で並んでいるフレームを集める。無ければ空配列 */
export function frames(images: ImageMap, key: string): HTMLImageElement[] {
  const out: HTMLImageElement[] = [];
  for (let i = 0; ; i++) {
    const img = images[`${key}.${i}`];
    if (!img) break;
    out.push(img);
  }
  return out;
}
