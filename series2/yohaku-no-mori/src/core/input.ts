/**
 * キーボード入力。
 *
 * 詠唱はゲームの主役操作なので、DOM の <input> は使わず keydown を直接拾う
 * （設計書 3.1）。IME は一切介さない。
 *
 * ここは「押されたキー名を溜めるだけ」に徹する。
 * 文字列としての組み立ては TextField（src/ui/textField.ts）が担当する。
 */

/**
 * ゲームが解釈するキー。それ以外は無視する。
 *
 * `-` と `=` は音量。**呪文に使われない記号でなければならない。**
 * 呪文は A-Z と 0-9 だけなので（src/ui/textField.ts）、
 * 記号なら詠唱中に押しても文字として入らず、音量だけが動く。
 */
const HANDLED = new Set([
  "Enter", "Escape", "Backspace", "Tab",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  " ", "-", "=",
]);

export class Keyboard {
  private queue: string[] = [];
  /** 押しっぱなしのキー。フィールドの連続移動に使う */
  private held = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.held.delete(this.norm(e.key)));
    // ウィンドウから外れたときに押しっぱなし状態が残らないようにする
    window.addEventListener("blur", () => this.held.clear());
  }

  private norm(key: string): string {
    return key.length === 1 && /[a-zA-Z0-9]/.test(key) ? key.toUpperCase() : key;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // F5 やDevToolsを邪魔しない
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const isChar = e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key);
    if (!isChar && !HANDLED.has(e.key)) return;

    const key = this.norm(e.key);
    if (!e.repeat) this.queue.push(key);
    this.held.add(key);
    e.preventDefault();
  }

  /** 溜まっているキーを取り出して空にする */
  poll(): string[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  isDown(key: string): boolean {
    return this.held.has(key);
  }
}
