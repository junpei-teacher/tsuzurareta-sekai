/** 作品に依存しない画像ローダー。画像目録は各シリーズ側から注入する。 */
export type ImageMap = Record<string, HTMLImageElement>;

export async function loadImages(
  manifest: Readonly<Record<string, string>>,
): Promise<ImageMap> {
  const loaded = await Promise.all(
    Object.entries(manifest).map(([key, src]) =>
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

  const images: ImageMap = {};
  for (const [key, img] of loaded) if (img) images[key] = img;
  return images;
}

/** `key.0` から連番で並ぶアニメーションフレームを返す。 */
export function frames(images: ImageMap, key: string): HTMLImageElement[] {
  const result: HTMLImageElement[] = [];
  for (let i = 0; ; i++) {
    const image = images[`${key}.${i}`];
    if (!image) break;
    result.push(image);
  }
  return result;
}
