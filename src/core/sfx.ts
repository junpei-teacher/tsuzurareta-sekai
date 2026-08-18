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
   * @param opt locked=掘り当てたがMPが足りなかった（**炸裂しない**・設計書 3.6）／
   *            heal=回復呪文（`element: "HEAL"`）。**破裂ではなく和音にする**
   */
  cast(tier: Tier, dur: number, opt: { locked?: boolean; heal?: boolean } = {}): void {
    if (!this.ctx) return;

    // 届かなかった言葉。低い唸りが立ち上がり、**炸裂せずに引く**
    if (opt.locked) {
      this.noise({ dur: dur * 0.55, freq: 180, to: 90, q: 0.6, filter: "lowpass", gain: 0.22, attack: dur * 0.3 });
      this.tone({ freq: 70, to: 42, dur: dur * 0.6, type: "triangle", gain: 0.18, attack: dur * 0.3 });
      return;
    }

    // 傷が塞がる音。攻撃呪文とは**音の作りかたから変える**
    if (opt.heal) {
      this.heal(tier, dur);
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

      // 神話級。**1周に一度あるかないかの音**なので、他とは作りを変える。
      // castFx は 0.46 まで暗転を保って炸裂させる（castFx.ts）。
      case "MYTH":
        this.myth(dur);
        break;
    }
  }

  /**
   * 神話級の炸裂。凄みは音量では出ない。**出るのは4つの要素からである。**
   *
   * 1. **うなり**。溜めの低音を2本、わずかにずらして鳴らす。
   *    ぴたりと合った低音は「重い音」だが、ずれた低音は**不穏**になる
   * 2. **吸い込み**。炸裂の直前に音を上へ吸い上げ、そこで断ち切る。
   *    人は「大きい音」ではなく「音が無くなった直後」に身構える
   * 3. **鐘**。倍音が整数比から外れた高音を薄く重ねる。
   *    金属が鳴っているように聞こえ、火薬の音と区別がつく
   * 4. **二段で来る**。炸裂を一発で終わらせず、少し遅れてもう一度低音を置く
   *
   * どれも**大きくしない。** 大きくすると、ただうるさいものに戻る。
   */
  private myth(dur: number): void {
    const burst = dur * 0.46;

    // ── 溜め。ほとんど無音のまま、床が鳴りはじめる ──
    // 2本のわずかな差（1.5%）が「うなり」になる。合わせてはいけない
    this.tone({ freq: 55, to: 110, dur: burst, type: "triangle", gain: 0.16, attack: burst * 0.85 });
    this.tone({ freq: 55 * 1.015, to: 110, dur: burst, type: "triangle", gain: 0.16, attack: burst * 0.9 });
    this.noise({ dur: burst, freq: 300, to: 900, q: 0.5, filter: "lowpass", gain: 0.08, attack: burst * 0.9 });

    // ── 吸い込み。炸裂のちょうど手前で断ち切る ──
    const suck = Math.min(0.35, burst * 0.3);
    this.noise({ at: burst - suck, dur: suck, freq: 260, to: 4200, q: 1.2, gain: 0.20, attack: suck * 0.85 });

    // ── 炸裂 ──
    this.noise({ at: burst, dur: 1.10, freq: 5000, to: 240, q: 0.5, gain: 0.42 });
    this.tone({ at: burst, freq: 620, to: 60, dur: 1.20, type: "triangle", gain: 0.28 });
    // 腹に来る一発。これが無いと「ただ大きい音」で終わる
    this.tone({ at: burst, freq: 90, to: 30, dur: 1.00, type: "sine", gain: 0.36 });

    // 鐘。整数比から外した3本を薄く重ねる。**金属の軋みに聞こえる**
    for (const [mul, g] of [[1, 0.075], [2.76, 0.055], [5.4, 0.035]] as const) {
      this.tone({ at: burst + 0.01, freq: 262 * mul, dur: 1.6 - mul * 0.12, type: "sine", gain: g, attack: 0.006 });
    }

    // ── 二段目。少し遅れて、もう一度沈む ──
    this.tone({ at: burst + 0.16, freq: 62, to: 26, dur: 1.30, type: "triangle", gain: 0.24, attack: 0.02 });

    // ── 残響。長く引いて、静けさに戻す ──
    this.noise({ at: burst + 0.10, dur: 1.60, freq: 700, to: 170, q: 1.6, gain: 0.12, attack: 0.18 });
  }

  /**
   * 回復。**雑音を一切使わない。**
   *
   * このゲームの音はほとんど雑音でできている（＝物がぶつかる音）。
   * 傷が塞がるところにだけ雑音が無いので、**鳴った瞬間に何が起きたか分かる。**
   *
   * 上へ積む長三和音。攻撃呪文がどれも「下へ落ちる」音であるのに対して、
   * 回復だけが上へ昇り、**消えずにしばらく残る。**
   */
  private heal(tier: Tier, dur: number): void {
    // 完本（HP全回復＋全解除。神話級の回復）だけは別格に扱う
    const big = tier === "MYTH";
    const burst = big ? dur * 0.46 : tier === "RARE" ? dur * 0.12 : 0;

    /**
     * 帯ごとの深さ。**回復量が大きいほど、根音を下げて長く伸ばす。**
     * 高い音を足すのではなく低い音を足すほうが「深く効いた」感じになる。
     * 回復呪文は7本あり、うち3本がアンコモンなので、
     * ここを一段でも分けないと**ほとんどの回復が同じ音**になる。
     */
    const { root, hold, notes } =
      big                    ? { root: 261.63, hold: 1.9,  notes: 4 } : // C4
      tier === "RARE"        ? { root: 293.66, hold: 1.35, notes: 4 } : // D4
      tier === "UNCOMMON"    ? { root: 329.63, hold: 1.0,  notes: 4 } : // E4
                               { root: 392.00, hold: 0.7,  notes: 3 };  // G4

    // 溜めのあいだ、下から温かく満ちてくる（神話級は暗転が長いので、無音にしない）
    if (big) {
      this.tone({ freq: root / 4, to: root / 2, dur: burst, type: "sine", gain: 0.16, attack: burst * 0.8 });
    }

    // 支え。和音の下に敷く。これが無いと和音が宙に浮く
    this.tone({ at: burst, freq: root / 2, dur: hold * 1.15, type: "sine", gain: 0.22, attack: 0.18 });

    // 長三和音を下から順に積む。**同時に鳴らさない。** ずらすと「満ちていく」
    const chord = [1, 1.25, 1.5, 2].slice(0, notes);
    const step = big ? 0.10 : 0.075;
    chord.forEach((mul, i) => {
      this.tone({
        at: burst + i * step,
        freq: root * mul,
        dur: hold - i * 0.06,
        type: "sine",
        gain: 0.18 - i * 0.022,
        attack: 0.05,
      });
    });

    // 上の光。レア以上にだけ乗せる。**か細く、長く残る**
    if (big || tier === "RARE") {
      this.tone({ at: burst + 0.22, freq: root * 3, dur: hold, type: "sine", gain: 0.050, attack: 0.12 });
      this.tone({ at: burst + 0.30, freq: root * 4, dur: hold * 0.8, type: "sine", gain: 0.034, attack: 0.12 });
    }

    // 完本だけ、もう一度オクターブ上で咲かせる。**「すべて元に戻った」**
    if (big) {
      chord.forEach((mul, i) => {
        this.tone({
          at: burst + 0.55 + i * 0.09,
          freq: root * 2 * mul,
          dur: 1.5 - i * 0.1,
          type: "sine",
          gain: 0.085 - i * 0.013,
          attack: 0.06,
        });
      });
    }
  }
}

/**
 * 効果音は**画面の奥（TextField や CastFx）から鳴らしたい**。
 * そこまで引数で持ち回ると、音と関係のないクラスの引数が全部増える。
 * 音は1つしか無く、持つ状態も音量だけなので、ここは共有の1個にする。
 */
export const sfx = new Sfx();
