/**
 * 詠唱入力欄の中身。
 * 受け付けるのは半角英数字のみ（設計書 3.1）。
 *
 * 呪文帳に登録済みの呪文は前方一致でサジェストされる（設計書 3.2）。
 * 既知呪文を打ち間違えないようにするための仕組みであり、
 * これがあるから「未知の文字列を敢えて打つ」ことがリスクになる。
 */
export class TextField {
  value = "";
  /** サジェスト候補（前方一致した既知呪文の文字列） */
  suggestions: string[] = [];
  /** 選択中の候補。-1 なら未選択 */
  cursor = -1;

  private readonly maxLength: number;
  private dictionary: string[] = [];

  constructor(maxLength = 16) {
    this.maxLength = maxLength;
  }

  /** サジェストの元になる既知呪文の文字列を差し替える */
  setDictionary(words: string[]): void {
    this.dictionary = [...words].sort();
    this.refresh();
  }

  clear(): void {
    this.value = "";
    this.refresh();
  }

  /**
   * キーを1つ流し込む。
   * @returns Enterで確定したときだけ確定文字列を返す
   */
  feed(key: string): string | null {
    if (key === "Enter") {
      // 候補を選んでいる状態なら、それを確定値にする
      const chosen = this.cursor >= 0 ? this.suggestions[this.cursor] : undefined;
      const out = chosen ?? this.value;
      this.value = "";
      this.refresh();
      return out;
    }
    if (key === "Backspace") {
      this.value = this.value.slice(0, -1);
      this.refresh();
      return null;
    }
    if (key === "Escape") {
      this.clear();
      return null;
    }
    if (key === "Tab" || key === "ArrowDown") {
      if (this.suggestions.length > 0) {
        this.cursor = (this.cursor + 1) % this.suggestions.length;
      }
      return null;
    }
    if (key === "ArrowUp") {
      if (this.suggestions.length > 0) {
        this.cursor = this.cursor <= 0 ? this.suggestions.length - 1 : this.cursor - 1;
      }
      return null;
    }
    if (key.length === 1 && /[A-Z0-9]/.test(key)) {
      if (this.value.length < this.maxLength) {
        this.value += key;
        this.refresh();
      }
      return null;
    }
    return null;
  }

  private refresh(): void {
    this.cursor = -1;
    if (this.value.length === 0) {
      this.suggestions = [];
      return;
    }
    this.suggestions = this.dictionary
      .filter((w) => w.startsWith(this.value) && w !== this.value)
      .slice(0, 4);
  }
}
