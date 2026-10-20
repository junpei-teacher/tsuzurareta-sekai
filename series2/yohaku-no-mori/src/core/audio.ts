/**
 * BGMプレイヤー。
 *
 * 曲目は作品固有のTrack Manifestから注入する。シリーズ2の通常起動時に
 * 第一作のBGMパスを静的参照しないため、プレイヤー本体と曲表を分離している。
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
import { GAME_IDENTITY } from "./gameIdentity.ts";
import type { TrackManifest } from "./tracks.ts";

/** 切り替えにかける秒数。章の扉の暗転（約3秒）に収まる長さ */
const FADE = 1.5;
/** 音量の刻み。0〜1 を10段階で持つ */
const STEPS = 10;

const KEY = `${GAME_IDENTITY.storagePrefix}/audio`;

/** `src` は切り替えの判定に使う。同じファイルなら鳴らし直さない */
type Voice = { el: HTMLAudioElement; src: string };

export class Audio {
  private readonly tracks = new Map<string, string | null | false>();
  private current: Voice | null = null;
  private fading: Voice[] = [];
  /** unlock 前に指示された曲。解除された瞬間に鳴らす */
  private pending: string | null = null;
  private unlocked = false;

  /** 0〜1。0 で消音 */
  volume = 0.6;
  muted = false;

  constructor(manifest: TrackManifest) {
    this.registerTracks(manifest);
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

  /** DEV用の旧曲表などを、必要になった時だけ追加する。 */
  registerTracks(manifest: TrackManifest): void {
    for (const [id, src] of Object.entries(manifest)) this.tracks.set(id, src);
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      // 保存できなくても音は鳴る
    }
  }

  /** 実際に出す音量。効果音（src/core/sfx.ts）も同じつまみに従う */
  get level(): number {
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
  play(id: string): void {
    const src = this.tracks.get(id);
    if (src === undefined) {
      console.warn(`未登録のBGM IDです: ${id}`);
      return;
    }
    // 曲を持たない場面（雑魚戦）。今かかっているものを続ける
    if (src === null) return;
    // 明示的な無音。現在曲があれば通常のフェード時間で止める
    if (src === false) { this.stop(); return; }
    if (!this.unlocked) { this.pending = id; return; }
    if (this.current?.src === src) return;

    if (this.current) {
      this.fading.push(this.current);
      this.current = null;
    }

    const el = new window.Audio(src);
    el.loop = true;
    el.volume = 0;
    el.play().catch(() => {
      // ファイルがまだ無い／再生を拒まれた。無音で進める
    });
    this.current = { el, src };
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
