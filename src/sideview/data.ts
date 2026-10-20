import rawDialogueCh1 from "../../data/series2/dialogue/ch1.json";
import rawDialogueCh2 from "../../data/series2/dialogue/ch2.json";
import rawDialogueCh3 from "../../data/series2/dialogue/ch3.json";
import rawDialogueCh4 from "../../data/series2/dialogue/ch4.json";
import rawPanels from "../../data/series2/panels.json";
import type { DialogueTable, PanelDef, SideViewState } from "./types.ts";

const panelList = rawPanels as unknown as PanelDef[];
export const PANELS = new Map(panelList.map((panel) => [panel.id, panel]));
export const DIALOGUE = {
  ...(rawDialogueCh1 as DialogueTable),
  ...(rawDialogueCh2 as DialogueTable),
  ...(rawDialogueCh3 as DialogueTable),
  ...(rawDialogueCh4 as DialogueTable),
};

export const START_PANEL_ID = "village_storehouse";

export function panelById(id: string): PanelDef {
  const panel = PANELS.get(id);
  if (!panel) throw new Error(`不明なサイドビューパネルです: ${id}`);
  return panel;
}

export function newSideViewState(): SideViewState {
  const panel = panelById(START_PANEL_ID);
  return {
    panelId: panel.id,
    x: panel.spawn,
    facing: 1,
    flags: new Set<string>(),
    defeated: new Set<string>(),
    objective: panel.objective,
  };
}
