import { loadImages } from "./imageLoader.ts";

/**
 * 『余白の森』専用の画像目録。
 *
 * 採用画像だけを登録し、寸法と透過規格も同じ入口で管理する。
 * 原本・DEV比較資料とシリーズ1の目録は参照しない。
 */
export const FOREST_EDGE_BACKGROUND_ID = "background.forest_edge.middle";
export const VILLAGE_STOREHOUSE_BACKGROUND_ID = "background.village_storehouse.middle";
export const VILLAGE_ROAD_BACKGROUND_ID = "background.village_road.middle";
export const VILLAGE_GATE_BACKGROUND_ID = "background.village_gate.middle";
export const FOREST_BOUNDARY_BACKGROUND_ID = "background.forest_boundary.middle";
export const DRY_CREEK_BACKGROUND_ID = "background.dry_creek.middle";
export const SNARE_PATH_BACKGROUND_ID = "background.snare_path.middle";
export const FALLEN_BRIDGE_BACKGROUND_ID = "background.fallen_bridge.middle";
export const HUNTER_CAMP_BACKGROUND_ID = "background.hunter_camp.middle";
export const GUARDIAN_HOLLOW_BACKGROUND_ID = "background.guardian_hollow.middle";
export const ROOT_HOLLOW_ENTRY_BACKGROUND_ID = "background.root_hollow_entry.middle";
export const ECHO_GALLERY_BACKGROUND_ID = "background.echo_gallery.middle";
export const ROOT_HEART_BACKGROUND_ID = "background.root_heart.middle";
export const DEEP_FOREST_BACKGROUND_ID = "background.deep_forest.middle";
export const KNOT_TREE_BACKGROUND_ID = "background.knot_tree.middle";
export const RUIN_APPROACH_BACKGROUND_ID = "background.ruin_approach.middle";

const CHARACTER_HASHES = {
  hero: {
    idle: [
      "61b6664dd8f0b156f3ed2feadd2dd36ce753d0e85b1696ecedd89483771007e0",
      "148613d28583701db5eb63e6a924db85b1ced6b98f20b7ef73e2d37a089b2dd5",
    ],
    walk: [
      "e8b5db693d7e1ba1733f9dd320d3ae6c768ac1e8517a0fea232e142e26579900",
      "5cf74eebe6273be2e43ab0110444f3d7071e6847164cbbd87c3353172fa6b23b",
      "e9646daea53cc0ae410f76b0de07a33902db291c8c05ee8e57cc3de6087c1f32",
      "1527cdc1af3b72d920763da4d062e5f57b68eb1423eae2bb8c55f736360c5ea5",
    ],
  },
  sena: {
    idle: [
      "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e",
      "e3ebc172d2e9e5f0955fd31506adfe5c29216342cc90f0ae80ffd655bf587b7b",
    ],
    walk: [
      "606a36f50446a9a21746fb035ae9eddd0190c7e6c71eeb906a4e44691481ff52",
      "12168b01b1f3ea1f17a5cbfaee9fce6369c5c27cc544519747c17fc9ec34eff3",
      "42fa9a1fa79a7913b0fd6762f8ea42c90d8bfc886c9f50388f4c3640a7ec87bf",
      "e278dabc4ad306373569c8d85aafe8983b75b3a57b8a12d7d12d67e1f244d59e",
    ],
  },
} as const;

function characterFrames(
  subject: "hero" | "sena",
  motion: "idle" | "walk",
  count: number,
): Record<string, { src: string; width: 32; height: 48; alpha: "binary"; sha256: string }> {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `character.${subject}.${motion}.${index}`,
    {
      src: new URL(
        `../assets/series2/characters/${subject}/${motion}_${index}.png`,
        import.meta.url,
      ).href,
      width: 32 as const,
      height: 48 as const,
      alpha: "binary" as const,
      sha256: CHARACTER_HASHES[subject][motion][index]!,
    },
  ]));
}

export const SERIES2_ASSETS = {
  [RUIN_APPROACH_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/ruin_approach/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "43bbcefac8399e502765828eb0015b134e30505b7ec894af58b015871e130c35",
  },
  [KNOT_TREE_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/knot_tree/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "80fe665348fb07d7c8c3d55d71e1d918f6fe41024eb93a0662ad54ecbcdaf3ce",
  },
  [DEEP_FOREST_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/deep_forest/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "2bddae0c96323eba9a6385782dfa5de5f69089bd6d9ee9de18454ddb37eded53",
  },
  [ROOT_HEART_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/root_heart/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "59c3d3757d30ca355adde6cc1423ecb39cd910458ea702b1b94659f05123b92f",
  },
  [ECHO_GALLERY_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/echo_gallery/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "a7a0b8d4281b856b6cccbb1cbc76c71c2f81a5ba048bdff3fa94bf66b605aa43",
  },
  [ROOT_HOLLOW_ENTRY_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/root_hollow_entry/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "6587471458a1fc64212c64f09c0fef8ee5debde10c9c348618d2855b102b9dfa",
  },
  [GUARDIAN_HOLLOW_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/guardian_hollow/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "32935d8908c8731925dbcf202550f700216307c7a7763b4b6e40de73cdd09fc8",
  },
  [HUNTER_CAMP_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/hunter_camp/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "66361a4aa9b3835623324110a2d80db6e62685950bfea831ad92412ae20d85a4",
  },
  [FALLEN_BRIDGE_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/fallen_bridge/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "86a5a63a96ae8ae123ef07cde75b53961ed9e17f041ad8c32ade35509d1d44e6",
  },
  [SNARE_PATH_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/snare_path/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "3b413ecce398081ed8587368facee3aa4d62f5916f2eb75e43eace6533cac682",
  },
  [DRY_CREEK_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/dry_creek/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "b2b322413e3fff88594bab9f755e8f9e6504ba24783971e7e40c6a7934eb0cda",
  },
  [FOREST_BOUNDARY_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/forest_boundary/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "5028a70a04e242deaf1f2003a5060a05330400e801c0d0c3e82193db6a66342f",
  },
  [FOREST_EDGE_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/forest_edge/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "3716953b189661a78e67f9d5d204e42b68b8870a07519c6b6a786490fd165a39",
  },
  [VILLAGE_STOREHOUSE_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/village_storehouse/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "47a127bb62e17edef260b53c775d23eae4b54dad10c21487d72b979983a7d7c4",
  },
  [VILLAGE_ROAD_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/village_road/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "ac363c7fd3abe775a59997b9e0f294d36eb6a27a2982a08dfe4caf43155b7515",
  },
  [VILLAGE_GATE_BACKGROUND_ID]: {
    src: new URL("../assets/series2/backgrounds/village_gate/middle.png", import.meta.url).href,
    width: 960,
    height: 540,
    alpha: "opaque",
    sha256: "faf750f7db48583045c2b3b95d9b18dd64a9293a5d8cbea5d3eb8141ead4270f",
  },
  ...characterFrames("hero", "idle", 2),
  ...characterFrames("hero", "walk", 4),
  ...characterFrames("sena", "idle", 2),
  ...characterFrames("sena", "walk", 4),
} as const;

export const SERIES2_MANIFEST: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SERIES2_ASSETS).map(([id, asset]) => [id, asset.src]),
);

export const loadSeries2Images = () => loadImages(SERIES2_MANIFEST);
