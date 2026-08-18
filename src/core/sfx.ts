import type { Tier } from "../spell/resolver.ts";

/**
 * 効果音（設計書 10）。
 *
 * **音声ファイルを1つも持たない。** すべて WebAudio の発振器と雑音から
 * その場で合成する。理由は3つある。
 *
 * - 探す時間もライセンス管理も要らない。曲と違いSEは数十本になる
 * - 短い音なので、合成でも粗が出にくい
 * - **音の質感を1か所で揃えられる。** 寄せ集めのSEは鳴らすたびに出所が違って聞こえる
 *
 * 音色の方針：**古い書庫の音にする。電子音にしない。**
 * 打鍵は木と紙、呪文は空気の破裂、被弾は鈍い打撃。
 * 高い倍音を伸ばさず、必ず短い減衰で切る。
 * 静かなゲームなので、**残る音は必ず邪魔になる。**
 *
 * 【自動再生制限】BGMと同じで、利用者が触るまで音は出せない。
 * AudioContext は unlock() まで作らない（先に作ると suspended のまま警告が出る）。
 * 鳴らせない状態で play() を呼ばれたら黙って捨てる。**溜めない。**
 * SEは「今その瞬間」の音なので、後から鳴っても意味がない。
 */

export type SfxId =
  /** 打鍵。詠唱と書き込みの主役。**禁書の前ではこれだけが残る**（設計書 6.1） */
  | "type"
  /** 一文字消す */
  | "erase"
  /** 決定 */
  | "confirm"
  /** 取り消し */
  | "cancel"
  /** カーソル移動・候補送り */
  | "move"
  /** 一歩。**いちばん多く鳴るので、いちばん小さい** */
  | "step"
  /** 敵に当たった */
  | "hit"
  /** こちらが受けた */
  | "hurt"
  /** 敵が倒れた */
  | "defeat"
  /** 逃げ出した */
  | "flee"
  /** 扉 */
  | "door"
  /** 階段を降りる */
  | "stairs"
  /** 呪文帳に言葉が書き加わった */
  | "learn"
  /** 頁を送る */
  | "page"
  /** できない。MPが足りない、封じられている */
  | "denied";

/**
 * 全体の音量比。BGMより一段下に置く。
 * SEはBGMと違って**不意に鳴る**ので、同じ音量だと必ず大きく感じる。
 */
const MIX = 0.5;

type ToneOpt = {
  /** 何秒後に鳴らすか */
  at?: number;
  freq: number;
  /** 終わりの高さ。省略すると変化しない */
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain: number;
  /** 立ち上がり。省略すると即座（打撃音になる） */
  attack?: number;
};

type NoiseOpt = {
  at?: number;
  dur: number;
  /** 通す帯の中心 */
  freq: number;
  /** 終わりの中心。省略すると動かない */
  to?: number;
  /** 帯の狭さ。大きいほど「ピー」に近づく */
  q?: number;
  filter?: BiquadFilterType;
  gain: number;
  attack?: number;
};

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  /** 0〜1。BGMと同じつまみで動かす。main.ts が毎フレーム入れる */
  level = 0.6;

  /**
   * 最初のキー入力から呼ぶ。何度呼んでもよい。
   * ここで初めて AudioContext を作る。
   */
  unlock(): void {
    if (this.ctx) {
      // タブを離れて戻ると止まっていることがある
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    if (typeof window.AudioContext !== "function") return;

    try {
      const ctx = new window.AudioContext();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);

      // 雑音の種。1秒ぶん作って使い回す（毎回作ると詠唱のたびに固まる）
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.master = master;
      this.noiseBuf = buf;
    } catch {
      // 音が出せない環境。無音で進める
    }
  }

  /** 実際に出す大きさ。0 なら鳴らす意味がない */
  private amp(gain: number): number {
    return gain * this.level * MIX;
  }

  // ── 音の部品 ──────────────────────────────
  // すべての効果音を、この2つだけで組み立てる。
  // 部品を増やさないことが、音色が揃っている理由になる。

  /** 減衰する単音。低い方へ滑らせると打撃、上へ滑らせると気配になる */
  private tone(o: ToneOpt): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const peak = this.amp(o.gain);
    if (peak <= 0.0005) return;

    const t = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur);
    }

    const g = ctx.createGain();
    this.envelope(g, t, o.dur, peak, o.attack ?? 0.004);

    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  }

  /** 帯を絞った雑音。打撃・破裂・紙・炎は全部これ */
  private noise(o: NoiseOpt): void {
    const ctx = this.ctx;
    const master = this.master;
    const buf = this.noiseBuf;
    if (!ctx || !master || !buf) return;
    const peak = this.amp(o.gain);
    if (peak <= 0.0005) return;

    const t = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // 1秒を超える音のために繰り返す。帯が動いているので継ぎ目は聞こえない
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? "bandpass";
    filter.frequency.setValueAtTime(o.freq, t);
    if (o.to !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
    }
    filter.Q.value = o.q ?? 1;

    const g = ctx.createGain();
    this.envelope(g, t, o.dur, peak, o.attack ?? 0.002);

    src.connect(filter).connect(g).connect(master);
    // 読み出す位置をずらす。同じ音が連続しても「同じ雑音」に聞こえない
    src.start(t, Math.random() * 0.8);
    src.stop(t + o.dur + 0.02);
  }

  /**
   * 音量の形。**立ち上がって、指数で消える。**
   * 直線で消すと終わりが不自然に途切れるので、必ず指数で落とす。
   */
  private envelope(g: GainNode, t: number, dur: number, peak: number, attack: number): void {
    const a = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  /** 高さを少し散らす。連打しても機械のように聞こえないようにする */
  private jitter(spread = 0.12): number {
    return 1 + (Math.random() - 0.5) * spread * 2;
  }

  // ── 効果音 ────────────────────────────────

  /** @param at 何秒後に鳴らすか。演出と合わせるときに使う */
  play(id: SfxId, at = 0): void {
    if (!this.ctx) return;

    switch (id) {
      // 打鍵。木の鍵と、紙に触れる音を重ねる。
      // **これが全編でいちばん多く鳴る音なので、いちばん丁寧に作る**
      case "type": {
        const j = this.jitter(0.16);
        this.noise({ at, dur: 0.030, freq: 2400 * j, q: 1.1, gain: 0.30 });
        this.tone({ at, freq: 190 * j, to: 90, dur: 0.045, type: "triangle", gain: 0.16 });
        break;
      }

      // 消す。打鍵を裏返した音。低くて、少し擦れる
      case "erase":
        this.noise({ at, dur: 0.060, freq: 1200, to: 500, q: 0.9, gain: 0.45 });
        break;

      // 決定。木を軽く叩いた音
      case "confirm":
        this.noise({ at, dur: 0.025, freq: 1800, q: 1.2, gain: 0.18 });
        this.tone({ at, freq: 330, to: 240, dur: 0.10, type: "triangle", gain: 0.20 });
        break;

      // 取り消し。決定より低く、下へ落とす
      case "cancel":
        this.tone({ at, freq: 220, to: 130, dur: 0.13, type: "triangle", gain: 0.18 });
        break;

      // カーソル。聞こえるか聞こえないかでいい
      case "move":
        this.noise({ at, dur: 0.022, freq: 1500 * this.jitter(0.1), q: 1.4, gain: 0.30 });
        break;

      // 一歩。石の床を布靴で踏む。**小さすぎるくらいでちょうどいい**
      case "step":
        this.noise({ at, dur: 0.055, freq: 420 * this.jitter(0.22), q: 0.7, filter: "lowpass", gain: 0.40 });
        break;

      // 当たった。乾いた打撃
      case "hit":
        this.noise({ at, dur: 0.11, freq: 900, to: 300, q: 0.8, gain: 0.30 });
        this.tone({ at, freq: 210, to: 110, dur: 0.13, type: "square", gain: 0.13 });
        break;

      // 受けた。当たった音より鈍く、低く、長い。**痛みは低音でしか出ない**
      case "hurt":
        this.noise({ at, dur: 0.22, freq: 300, to: 120, filter: "lowpass", gain: 0.34 });
        this.tone({ at, freq: 110, to: 48, dur: 0.26, type: "triangle", gain: 0.26 });
        break;

      // 倒れた。崩れ落ちる。尾を長めに引く
      case "defeat":
        this.tone({ at, freq: 300, to: 60, dur: 0.55, type: "triangle", gain: 0.24 });
        this.noise({ at: at + 0.04, dur: 0.45, freq: 700, to: 160, q: 0.6, gain: 0.20 });
        break;

      // 逃げた。息を切らして遠ざかる
      case "flee":
        this.noise({ at, dur: 0.30, freq: 500, to: 2400, q: 0.8, gain: 0.40, attack: 0.05 });
        break;

      // 扉。重い木が動いて、閉まる
      case "door":
        this.noise({ at, dur: 0.28, freq: 260, to: 130, filter: "lowpass", gain: 0.26, attack: 0.05 });
        this.tone({ at: at + 0.20, freq: 130, to: 70, dur: 0.16, type: "triangle", gain: 0.20 });
        break;

      // 階段。石の段を3つ降りる。**降りたことを音の数で分からせる**
      case "stairs":
        for (let i = 0; i < 3; i++) {
          const t = at + i * 0.14;
          this.noise({ at: t, dur: 0.10, freq: 340 - i * 60, filter: "lowpass", gain: 0.22 });
          this.tone({ at: t, freq: 150 - i * 30, to: 60, dur: 0.14, type: "triangle", gain: 0.16 });
        }
        break;

      // 言葉を教わった。**このゲームで唯一、澄んだ音を鳴らしていい場所。**
      // 5度を重ねる。得点の音ではなく、書架の鈴のように鳴らす
      case "learn":
        this.tone({ at, freq: 660, dur: 0.70, type: "sine", gain: 0.20, attack: 0.02 });
        this.tone({ at: at + 0.06, freq: 990, dur: 0.60, type: "sine", gain: 0.12, attack: 0.02 });
        break;

      // 頁を送る。紙が擦れて、離れる
      case "page":
        this.noise({ at, dur: 0.13, freq: 3000, to: 1100, q: 0.7, gain: 0.16, attack: 0.02 });
        break;

      // できない。低く、2度、突き放す
      case "denied":
        this.tone({ at, freq: 160, to: 120, dur: 0.09, type: "square", gain: 0.16 });
        this.tone({ at: at + 0.10, freq: 120, to: 90, dur: 0.14, type: "square", gain: 0.16 });
        break;
    }
  }

  /**
   * 詠唱。**帯ごとに音を変え、CastFx の炸裂の瞬間に合わせる**（src/fx/castFx.ts）。
   *
   * 目で見る演出と音がズレると、演出そのものが安っぽくなる。
   * 炸裂の時刻は castFx.ts が持っている割合と同じものをここに書いてある。
   * あちらを触ったら、ここも触ること。
   *
   * @param dur 演出の総尺（秒）。短縮版なら短い値が来る
   * @param locked 掘り当てたがMPが足りなかったとき。**炸裂しない**（設計書 3.6）
   */
  cast(tier: Tier, dur: number, locked = false): void {
    if (!this.ctx) return;

    // 届かなかった言葉。低い唸りが立ち上がり、**炸裂せずに引く**
    if (locked) {
      this.noise({ dur: dur * 0.55, freq: 180, to: 90, q: 0.6, filter: "lowpass", gain: 0.22, attack: dur * 0.3 });
      this.tone({ freq: 70, to: 42, dur: dur * 0.6, type: "triangle", gain: 0.18, attack: dur * 0.3 });
      return;
    }

    switch (tier) {
      // 不発。**鳴りきらない。** 湿った音で、すぐ終わる
      case "DUD":
        this.noise({ dur: 0.13, freq: 380, to: 180, filter: "lowpass", gain: 0.50 });
        break;

      case "COMMON":
        this.noise({ dur: 0.20, freq: 1400, to: 400, q: 0.7, gain: 0.26 });
        this.tone({ freq: 300, to: 130, dur: 0.22, type: "triangle", gain: 0.18 });
        break;

      case "UNCOMMON":
        this.noise({ dur: 0.30, freq: 1900, to: 380, q: 0.7, gain: 0.30 });
        this.tone({ freq: 380, to: 120, dur: 0.34, type: "triangle", gain: 0.22 });
        break;

      // レアは溜めがある。castFx は 0.12 で炸裂させる
      case "RARE": {
        const burst = dur * 0.12;
        this.tone({ freq: 120, to: 260, dur: burst, type: "triangle", gain: 0.14, attack: burst * 0.8 });
        this.noise({ at: burst, dur: 0.45, freq: 2600, to: 300, q: 0.6, gain: 0.34 });
        this.tone({ at: burst, freq: 420, to: 90, dur: 0.50, type: "triangle", gain: 0.26 });
        break;
      }

      // 神話級。castFx は 0.46 まで暗転を保って炸裂させる。
      // **溜めのあいだは、ほとんど無音にする。** 低い唸りだけを置いて耳を空ける
      case "MYTH": {
        const burst = dur * 0.46;
        this.tone({ freq: 55, to: 110, dur: burst, type: "triangle", gain: 0.18, attack: burst * 0.85 });
        this.noise({ dur: burst, freq: 300, to: 900, q: 0.5, filter: "lowpass", gain: 0.10, attack: burst * 0.9 });

        this.noise({ at: burst, dur: 1.10, freq: 4000, to: 260, q: 0.5, gain: 0.40 });
        this.tone({ at: burst, freq: 520, to: 60, dur: 1.20, type: "triangle", gain: 0.30 });
        // 腹に来る一発。これが無いと「ただ大きい音」で終わる
        this.tone({ at: burst, freq: 90, to: 34, dur: 0.90, type: "sine", gain: 0.34 });
        // 残響がわりの尾
        this.noise({ at: burst + 0.10, dur: 1.30, freq: 700, to: 180, q: 1.4, gain: 0.12, attack: 0.15 });
        break;
      }
    }
  }
}

/**
 * 効果音は**画面の奥（TextField や CastFx）から鳴らしたい**。
 * そこまで引数で持ち回ると、音と関係のないクラスの引数が全部増える。
 * 音は1つしか無く、持つ状態も音量だけなので、ここは共有の1個にする。
 */
export const sfx = new Sfx();
