import { Display, SCREEN_W } from "../core/display.ts";
import { PAL } from "../core/palette.ts";
import type { Scene } from "../core/scene.ts";
import { sfx } from "../core/sfx.ts";
import { drawForestEnemy, renderForestBoundary } from "../fx/storyArt.ts";
import { windowBox } from "../ui/hud.ts";

type EnemyGroup = "outer" | "deep" | "ruin" | "boss";
type PreviewEntry = { id: string; name: string; role: string; theme: "forest" | "ruin" };

const GROUPS: readonly EnemyGroup[] = ["outer", "deep", "ruin", "boss"];
const ENTRIES: Readonly<Record<EnemyGroup, readonly PreviewEntry[]>> = {
  outer: [
    { id: "moss_wolf", name: "苔背の狼", role: "獣", theme: "forest" },
    { id: "snare_vine", name: "罠喰い蔓", role: "植物", theme: "forest" },
    { id: "hush_moth", name: "ささやき蛾", role: "発光虫", theme: "forest" },
  ],
  deep: [
    { id: "hollow_boar", name: "洞角猪", role: "樹洞", theme: "forest" },
    { id: "white_antler", name: "白枝鹿", role: "枝角", theme: "forest" },
    { id: "name_leech", name: "名喰い蛭", role: "欠損", theme: "forest" },
  ],
  ruin: [
    { id: "seal_sentinel", name: "封印衛", role: "校訂印", theme: "ruin" },
    { id: "blank_scribe", name: "空筆の像", role: "白紙", theme: "ruin" },
    { id: "echo_target", name: "反響標", role: "稽古台", theme: "ruin" },
  ],
  boss: [
    { id: "root_warden", name: "根の番人", role: "門", theme: "forest" },
    { id: "nameless_choir", name: "名のない唱和", role: "記録群", theme: "ruin" },
    { id: "sena_guardian", name: "仮面の守人", role: "人物", theme: "ruin" },
  ],
};

/**
 * 開発時だけ使う敵シルエット比較画面。
 * 保存を変更せず、通常敵3体／ボス3体を同じ背景と下辺アンカーで確認する。
 */
export class EnemySilhouettePreviewScene implements Scene {
  private clock = 0;
  private groupIndex = 0;
  private breathing = true;

  constructor(
    private readonly onBack: () => void,
    private readonly onFight?: (enemyId: string, theme: "forest" | "ruin") => void,
  ) {}

  update(dt: number, keys: string[]): void {
    if (this.breathing) this.clock += dt;
    for (const key of keys) {
      if (key === "Escape") { sfx.play("cancel"); this.onBack(); return; }
      if (key === "Tab" || key === "ArrowRight") {
        this.groupIndex = (this.groupIndex + 1) % GROUPS.length;
        sfx.play("page");
      }
      if (key === "ArrowLeft") {
        this.groupIndex = (this.groupIndex + GROUPS.length - 1) % GROUPS.length;
        sfx.play("page");
      }
      if (key === "Enter" || key === " ") {
        this.breathing = !this.breathing;
        sfx.play("confirm");
      }
      const number = Number.parseInt(key, 10);
      if (number >= 1 && number <= 3 && this.onFight) {
        const entry = ENTRIES[this.group][number - 1];
        if (entry) { sfx.play("confirm"); this.onFight(entry.id, entry.theme); return; }
      }
    }
  }

  render(d: Display): void {
    renderForestBoundary(d, this.clock);
    const groundY = 180;
    d.rect(42, groundY, SCREEN_W - 84, 1, "#d7c67a");

    const entries = ENTRIES[this.group];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const x = 96 + i * 144;
      drawForestEnemy(d, x, groundY, this.clock, entry.id);
      this.label(d, x, entry.name, entry.role, i + 1);
    }

    windowBox(d, 18, 12, 444, 43);
    d.text("敵シルエット比較", 30, 19, PAL.accentCool, 11);
    d.textRight(
      `${this.groupLabel}　呼吸 ${this.breathing ? "ON" : "OFF"}`,
      448, 19, PAL.accent, 10,
    );

    windowBox(d, 18, 205, 444, 50);
    d.text("TAB / ←→　4群切替　1/2/3 実戦画面", 34, 215, PAL.hint, 10);
    d.text("ENTER 呼吸ON/OFF　ESC もどる", 34, 233, PAL.hint, 10);
  }

  private get group(): EnemyGroup { return GROUPS[this.groupIndex]!; }

  private get groupLabel(): string {
    return ({ outer: "浅い森3", deep: "深い森3", ruin: "遺跡3", boss: "ボス3" } as const)[this.group];
  }

  private label(d: Display, cx: number, name: string, role: string, number: number): void {
    const w = 104;
    const x = Math.round(cx - w / 2);
    d.rect(x, 69, w, 31, PAL.panel);
    d.frame(x, 69, w, 31, PAL.line);
    d.text(String(number), x + 5, 73, PAL.accent, 8);
    d.text(name, Math.round(cx - d.measure(name, 9) / 2), 73, PAL.ink, 9);
    d.text(role, Math.round(cx - d.measure(role, 8) / 2), 87, PAL.dim, 8);
  }
}
