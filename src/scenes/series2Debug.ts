import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { windowBox } from "../ui/hud.ts";

export type Series2DebugTarget =
  | "chapter1" | "chapter2" | "rootDungeon" | "chapter3" | "chapter4" | "final" | "reveal" | "ending" | "motion" | "enemies" | "backgrounds" | "storehouseArt" | "legacy";

const ROWS: Array<{ label: string; target: Series2DebugTarget }> = [
  { label: "第一章　村道と村門", target: "chapter1" },
  { label: "第二章　村門", target: "chapter2" },
  { label: "第二章　根洞窟", target: "rootDungeon" },
  { label: "第三章　深い森", target: "chapter3" },
  { label: "第四章　内環路", target: "chapter4" },
  { label: "最終戦　最奥聖域", target: "final" },
  { label: "終戦　仮面を外す", target: "reveal" },
  { label: "単一エンディング", target: "ending" },
  { label: "人物　歩行比較", target: "motion" },
  { label: "敵　シルエット比較", target: "enemies" },
  { label: "背景　4地域比較", target: "backgrounds" },
  { label: "背景　共同倉v27", target: "storehouseArt" },
  { label: "シリーズ1資産の検証", target: "legacy" },
];

/** 開発ビルドだけの章ワープ。通常導線と本番bundleには出さない。 */
export class Series2DebugScene implements Scene {
  private index = 0;

  constructor(
    private readonly onChoose: (target: Series2DebugTarget) => void,
    private readonly onBack: () => void,
  ) {}

  update(_dt: number, keys: string[]): void {
    for (const key of keys) {
      if (key === "Escape") { sfx.play("cancel"); this.onBack(); return; }
      if (key === "ArrowUp") { this.index = (this.index + ROWS.length - 1) % ROWS.length; sfx.play("move"); }
      if (key === "ArrowDown") { this.index = (this.index + 1) % ROWS.length; sfx.play("move"); }
      if (key === "Enter" || key === " ") {
        sfx.play("confirm");
        this.onChoose(ROWS[this.index]!.target);
        return;
      }
    }
  }

  render(d: Display): void {
    d.clear("#071411");
    d.text("ためす（シリーズ2開発）", 24, 20, PAL.accentCool, 13);
    d.textRight("ENTER 決定　ESC もどる", SCREEN_W - 24, 22, PAL.hint);
    windowBox(d, 54, 36, 372, 208);
    ROWS.forEach((row, index) => {
      const y = 46 + index * 16;
      if (index === this.index) {
        d.rect(72, y - 3, 336, 17, PAL.selection);
        d.rect(72, y - 3, 2, 17, PAL.accentCool);
      }
      d.text(index === this.index ? "◆" : "　", 84, y, PAL.accentCool);
      d.text(row.label, 112, y, index === this.index ? PAL.ink : PAL.dim);
    });
    d.text("※ 物語地点を選ぶと開発用の進行保存を上書きします", 70, 250, PAL.danger, 10);
  }
}
