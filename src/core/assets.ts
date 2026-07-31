/**
 * 画像アセットの読み込み（Phase 7）。
 *
 * 起動時にすべて読み終えてからゲームループを回す。
 * ドット絵なので枚数も容量も小さく、遅延読み込みの必要はない。
 *
 * パスは public/ からの絶対パス。実体は public/assets/... に置く。
 */

export type ImageMap = Record<string, HTMLImageElement>;

/** 読み込むアセットの一覧。ここが唯一の出典 */
export const MANIFEST: Record<string, string> = {
  "mira.south": "/assets/sprites/mira/south_pal.png",
  "mira.north": "/assets/sprites/mira/north_pal.png",
  "mira.east": "/assets/sprites/mira/east_pal.png",
  "mira.west": "/assets/sprites/mira/west_pal.png",
};

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
