import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import type { Player } from "../game/player.ts";
import { GrimoireView } from "../ui/grimoire.ts";

/**
 * シリーズ2で見つけた言葉を読む場所。
 *
 * 第一作の断章と複数結末は禁書への書き込みから生まれた収集物なので、
 * 正史エンディングが一つの本作には持ち込まない。森で拾う「痕跡」を採用する場合は、
 * 内容が決まった時点で第二の頁として追加する。
 */

export class CollectionScene implements Scene {
  // 読むための画面なので、説明のあとにフレーバーの一文も出す
  private readonly grimoire = new GrimoireView("read");

  constructor(
    private readonly player: Player,
    private readonly onExit: () => void,
  ) {}

  update(_dt: number, keys: string[]): void {
    for (const key of keys) {
      if (key === "Escape") {
        sfx.play("cancel");
        this.onExit();
        return;
      }
      this.grimoire.handle(key, this.player);
    }
  }

  render(d: Display): void {
    d.clear(PAL.bg);
    d.text("記憶の綴り", 24, 12, PAL.accent);
    d.text("言葉", 180, 12, PAL.ink);
    d.textRight("ESC もどる", SCREEN_W - 20, 12, PAL.hint);
    this.grimoire.render(d, 16, 30, SCREEN_W - 32, 180, this.player);
    d.textRight("↑↓ 選択", SCREEN_W - 20, 216, PAL.hint);
  }
}
