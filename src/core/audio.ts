/**
 * BGM（設計書 10）。
 *
 * 曲は7本。**第1章と第2章は同じ曲の変奏**にする。
 * 第1章と第2章は同じマップの炎上版なので、音も同じ曲の炎上版にする。
 * プレイヤーは第2章で「この曲、知っている」と気づく。
 * 同じ夜の続きであることが、説明せずに伝わる。
 *
 * 第3章で旋律を取り上げるのも同じ理屈で、地下は言葉が失われた場所だからである。
 *
 * 【ブラウザの自動再生制限】
 * 音は**利用者が何か操作するまで鳴らせない**。読み込み時に play() を呼んでも
 * 例外で落ちるだけなので、最初のキー入力まで再生を保留する。
 * `unlock()` を入力処理から一度だけ呼ぶこと。
 *
 * 【ファイルが無くても落とさない】
 * 曲を入れる前でもゲームは動く必要がある（アセットは後から差し替える）。
 * 読み込みに失敗した曲は黙って無音として扱う。
 */

export type TrackId =
  | "opening"
  | "ch1"
  | "ch2"
  | "ch3"
  | "battle"
  | "boss"
  | "ending";

/**
 * 曲の置き場所。**ファイルは後から入れる。**
 * 尺とループの指定は docs/assets-license.md に書いてある。
 */
const TRACKS: Record<TrackId, string> = {
  opening: "/assets/bgm/opening.ogg",
  ch1: "/assets/bgm/ch1_quiet.ogg",
  ch2: "/assets/bgm/ch2_burning.ogg",
  ch3: "/assets/bgm/ch3_depths.ogg",
  battle: "/assets/bgm/battle.ogg",
  boss: "/assets/bgm/boss.ogg",
  ending: "/assets/bgm/ending.ogg",
};

/** 切り替えにかける秒数。章の扉の暗転（約3秒）に収まる長さ */
const FADE = 1.5;
/** 音量の刻み。0〜1 を10段階で持つ */
const STEPS = 10;

const KEY = "funsho-no-yoru/audio";

type Voice = { el: HTMLAudioElement; id: TrackId };

export class Audio {
  private current: Voice | null = null;
  private fading: Voice[] = [];
  /** unlock 前に指示された曲。解除された瞬間に鳴らす */
  private pending: TrackId | null = null;
  private unlocked = false;

  /** 0〜1。0 で消音 */
  volume = 0.6;
  muted = false;

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as { volume?: number; muted?: boolean };
        if (typeof d.volume === "number") this.volume = Math.min(1, Math.max(0, d.volume));
        if (typeof d.muted === "boolean") this.muted = d.muted;
      }
    } catch {
      // 壊れていたら既定値のままでよい
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      // 保存できなくても音は鳴る
    }
  }

  /** 実際に出す音量 */
  private get level(): number {
    return this.muted ? 0 : this.volume;
  }

  /**
   * 最初のキー入力から一度だけ呼ぶ。
   * ここまではブラウザが再生を拒むので、指示された曲を溜めておく。
   */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pending) {
      const id = this.pending;
      this.pending = null;
      this.play(id);
    }
  }

  /** 曲を切り替える。同じ曲なら何もしない */
  play(id: TrackId): void {
    if (!this.unlocked) { this.pending = id; return; }
    if (this.current?.id === id) return;

    if (this.current) {
      this.fading.push(this.current);
      this.current = null;
    }

    const el = new window.Audio(TRACKS[id]);
    el.loop = true;
    el.volume = 0;
    el.play().catch(() => {
      // ファイルがまだ無い／再生を拒まれた。無音で進める
    });
    this.current = { el, id };
  }

  /** 全部止める。終章の無音など */
  stop(): void {
    this.pending = null;
    if (this.current) { this.fading.push(this.current); this.current = null; }
  }

  /** 毎フレーム呼ぶ。フェードを進める */
  update(dt: number): void {
    const step = dt / FADE;

    if (this.current) {
      const el = this.current.el;
      el.volume = Math.min(this.level, el.volume + step * this.level);
    }

    for (const v of this.fading) {
      v.el.volume = Math.max(0, v.el.volume - step);
      if (v.el.volume <= 0.001) v.el.pause();
    }
    this.fading = this.fading.filter((v) => !v.el.paused);
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.muted = false;
    if (this.current) this.current.el.volume = this.level;
    this.save();
  }

  /** 音量を1段動かす。0 まで下げれば実質の消音になる */
  nudge(dir: -1 | 1): void {
    this.setVolume(Math.round(this.volume * STEPS + dir) / STEPS);
  }

  /** 画面に出す文字。教室で触るので、状態が見えているほうがいい */
  get label(): string {
    const n = Math.round(this.volume * STEPS);
    return this.muted || n === 0 ? "消音　- = 音量" : `音量 ${n}　- = 音量`;
  }
}
