import { riddleMatches, type Riddle } from "../game/player.ts";
import { sfx } from "../core/sfx.ts";

/**
 * 詠唱入力欄の中身。
 * 受け付けるのは半角英数字のみ（設計書 3.1）。
 *
 * 呪文帳に登録済みの呪文は前方一致でサジェストされる（設計書 3.2）。
 * 既知呪文を打ち間違えないようにするための仕組みであり、
 * これがあるから「未知の文字列を敢えて打つ」ことがリスクになる。
 */
/**
 * 候補として持つ上限。**画面に出る数ではない。**
 * 出せるのは一度に6件で、それを超えるぶんは TAB で頁が送られる（`src/scenes/battle.ts`）。
 */
export const SUGGEST_LIMIT = 12;

/** 一度に画面へ出す候補の数（3列 × 2段） */
export const SUGGEST_PER_PAGE = 6;

export class TextField {
  value = "";
  /** サジェスト候補（前方一致した既知呪文の文字列） */
  suggestions: string[] = [];
  /** 選択中の候補。-1 なら未選択 */
  cursor = -1;
  /**
   * まだ埋まる見込みのある欠けた綴り（設計書 3.8）。
   *
   * **候補（`suggestions`）とは別に持つ。TAB では確定できない。**
   * 穴は自分で埋めるものなので、確定できてしまうと巻物を拾ったのと同じになる。
   * 出すのは控えの見た目だけで、あとはプレイヤーが打つ。
   */
  riddleHints: Riddle[] = [];

  private readonly maxLength: number;
  private dictionary: string[] = [];
  private riddles: Riddle[] = [];

  constructor(maxLength = 16) {
    this.maxLength = maxLength;
  }

  /** サジェストの元になる既知呪文の文字列を差し替える */
  setDictionary(words: string[]): void {
    this.dictionary = [...words].sort();
    this.refresh();
  }

  /** まだ埋まっていない控えを差し替える。記憶を封じられているあいだは空にする */
  setRiddles(list: Riddle[]): void {
    this.riddles = [...list];
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

  /** 打ち終わった文字列が、そのまま既知の呪文か */
  get exact(): boolean {
    return this.value.length > 0 && this.dictionary.includes(this.value);
  }

  private refresh(): void {
    this.cursor = -1;
    // 控えは**何も打っていないうちから出す。**
    // 「手元に埋めかけの語がある」ことは、コマンドを選んだ時点で見えていてよい。
    // 打つほど合わない控えが落ちていき、最後に一つ残る
    this.riddleHints = this.riddles
      .filter((r) => riddleMatches(r.mask, this.value))
      .slice(0, 2);

    if (this.value.length === 0) {
      this.suggestions = [];
      return;
    }
    // **打ち切った語も候補に残す。**
    //
    // 以前は `w !== this.value` で完全一致を外していた。
    // すると ROZH まではミラの ROZHA が出るのに、最後の A を打った瞬間に
    // 候補が消える。**打ち上がった瞬間に手応えが無くなる**ので、
    // 綴りを間違えたのかと思わせてしまう。
    // **4件で切ると、呪文帳が育つほど当てが外れる。**
    // 頭文字1字では同じ字で始まる語が5つ6つあって、
    // 覚えている語が候補に出てこない、ということが起きていた。
    // ここは多めに持ち、**見せ方（頁送り）は描画側で面倒を見る**
    this.suggestions = this.dictionary
      .filter((w) => w.startsWith(this.value))
      .slice(0, SUGGEST_LIMIT);
  }
}
