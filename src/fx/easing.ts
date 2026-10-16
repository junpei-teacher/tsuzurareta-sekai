export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** 時刻 t が区間 [a,b] のどこにいるかを 0..1 で返す。区間外は 0 か 1 に丸める */
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
export const easeInCubic = (t: number): number => t * t * t;

/** 0で始まり0で終わる山なりの曲線。閃光の減衰に使う */
export const pulse = (t: number): number => Math.sin(clamp01(t) * Math.PI);

/**
 * 決定論的な乱数生成器（xorshift32）。
 * 呪文のハッシュを種に使うので、同じ言葉は必ず同じ光を放つ。
 */
export function makeRng(seed: number): () => number {
  let s = (seed || 1) >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
