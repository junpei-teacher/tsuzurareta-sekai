// ============================================================
// 【凍結】この関数を変更してはならない。
//
// 巻物の呪文名は、この関数からの逆引き（tools/spell-forge.ts）で
// 決定されている。1文字でも変更すると全呪文名が別物になり、
// シナリオ・巻物・会話テキストが全て壊れる。
//
// 変更が必要になった場合は、必ず docs/設計書.md 3.5 を読むこと。
// ============================================================

/**
 * 入力文字列の正規化。
 * 前後の空白を除去し、大文字化し、A-Z0-9 以外を捨てる。
 * 詠唱・禁書の書き込み・逆引きスクリプトで必ず共通に使う。
 */
export function normalizeWord(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * 呪文文字列を 32bit 整数へ変換する（FNV-1a）。
 * Math.imul で 32bit 乗算を保ち、>>> 0 で符号なしに戻す。
 */
export function spellHash(input: string): number {
  const s = normalizeWord(input);
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime
  }
  return h >>> 0;
}
