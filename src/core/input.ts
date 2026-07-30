/**
 * キーボード入力。
 *
 * 詠唱はゲームの主役操作なので、DOM の <input> は使わず keydown を直接拾う
 * （設計書 3.1）。IME は一切介さない。
 *
 * ここは「押されたキー名を溜めるだけ」に徹する。
 * 文字列としての組み立ては TextField（src/ui/textField.ts）が担当する。
 */

/** ゲームが解釈するキー。それ以外は無視する */
const HANDLED = new Set([
  "Enter", "Escape", "Backspace", "Tab",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  " ",
]);

export class Keyboard {
  private queue: string[] = [];

  constructor() {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    // F5 やDevToolsを邪魔しない
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const isChar = e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key);
    if (!isChar && !HANDLED.has(e.key)) return;

    this.queue.push(isChar ? e.key.toUpperCase() : e.key);
    e.preventDefault();
  }

  /** 溜まっているキーを取り出して空にする */
  poll(): string[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }
}
