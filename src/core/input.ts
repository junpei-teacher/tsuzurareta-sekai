/**
 * キーボード入力。
 * 詠唱はゲームの主役操作なので、DOM の <input> は使わず keydown を直接拾う
 * （設計書 3.1）。IME は一切介さない。
 */
export class Keyboard {
  private buffer = "";
  private submissions: string[] = [];
  private readonly maxLength: number;

  constructor(maxLength = 16) {
    this.maxLength = maxLength;
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.altKey || e.metaKey) return; // F5 やDevToolsを邪魔しない

    if (e.key === "Enter") {
      this.submissions.push(this.buffer);
      this.buffer = "";
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      this.buffer = this.buffer.slice(0, -1);
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      this.buffer = "";
      e.preventDefault();
      return;
    }
    // 半角英数字のみ受理する
    if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      if (this.buffer.length < this.maxLength) {
        this.buffer += e.key.toUpperCase();
      }
      e.preventDefault();
    }
  }

  /** 現在の入力中文字列 */
  get text(): string {
    return this.buffer;
  }

  /** 確定済みの入力を1件取り出す。無ければ null */
  takeSubmission(): string | null {
    return this.submissions.shift() ?? null;
  }
}
