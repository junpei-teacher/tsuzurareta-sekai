import { sfx } from "../core/sfx.ts";

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
      // 空欄で押しても音は鳴らさない。**消えていないのに消えた音がするのは嘘になる**
      if (this.value.length > 0) sfx.play("erase");
      this.value = this.value.slice(0, -1);
      this.refresh();
      return null;
    }
    if (key === "Escape") {
      if (this.value.length > 0) sfx.play("cancel");
      this.clear();
      return null;
    }
    if (key === "Tab" || key === "ArrowDown") {
      if (this.suggestions.length > 0) {
        this.cursor = (this.cursor + 1) % this.suggestions.length;
        sfx.play("move");
      }
      return null;
    }
    if (key === "ArrowUp") {
      if (this.suggestions.length > 0) {
        this.cursor = this.cursor <= 0 ? this.suggestions.length - 1 : this.cursor - 1;
        sfx.play("move");
      }
      return null;
    }
    if (key.length === 1 && /[A-Z0-9]/.test(key)) {
      // 上限に達したら鳴らさない。打鍵音は「文字が入った」ことの合図なので、
      // 入っていないのに鳴ると、入ったと思って打ち続けてしまう
      if (this.value.length < this.maxLength) {
        this.value += key;
        this.refresh();
        sfx.play("type");
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
