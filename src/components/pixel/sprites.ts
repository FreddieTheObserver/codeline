// Original pixel art for CodeLine, drawn as character grids.
// Each character maps to a palette colour; "." is transparent.

export const PALETTE: Record<string, string> = {
  k: "#3b2a1e",
  w: "#fffaf0",
  y: "#f6c445",
  Y: "#e2a72e",
  o: "#e8913a",
  g: "#5aa469",
  G: "#3d7a46",
  l: "#9fd36b",
  b: "#8a5a3b",
  B: "#5e3b26",
  t: "#e6c07b",
  s: "#f1c9a0",
  r: "#d9534f",
  p: "#f29bb6",
  u: "#5b8fd6",
  U: "#3c63a3",
  m: "#9aa3a8",
  M: "#6d767b",
  v: "#9a7bd1",
  V: "#6c4f8f",
  c: "#e9b949",
};

export type SpriteGrid = readonly string[];

export const SUN: SpriteGrid = [
  ".....yy.....",
  "..y..yy..y..",
  "...yyyyyy...",
  "..yyyyyyyy..",
  ".yyywwyyyyy.",
  "yyyywyyyyyyy",
  "yyyyyyyyyyyy",
  ".yyyyyyyyYy.",
  "..yyyyyyYy..",
  "...yyyyyy...",
  "..y..yy..y..",
  ".....yy.....",
];

export const SEED: SpriteGrid = [
  "........",
  "...BB...",
  "..BbtB..",
  "..BbbB..",
  ".BbbbbB.",
  ".BbbbbB.",
  "..BbbB..",
  "...BB...",
];

export const SPROUT: SpriteGrid = [
  "............",
  "............",
  "............",
  "..gg....gg..",
  ".glgg..gglg.",
  ".ggggg.gggg.",
  "..gggg.ggg..",
  "....gG.G....",
  ".....GG.....",
  ".....G......",
  "....BBB.....",
  "...BBBBB....",
];

export const BLOOM: SpriteGrid = [
  "....pp.pp...",
  "...pppppp...",
  "..pppyyppp..",
  "..ppyyyypp..",
  "...ppyyppp..",
  "....pppp....",
  ".....G......",
  "..gg.G.gg...",
  ".glggGgglg..",
  "..gggGggg...",
  ".....G......",
  "....BBBB....",
];

export const WILT: SpriteGrid = [
  "............",
  "............",
  ".......bb...",
  "......b..b..",
  ".....b....b.",
  ".....b......",
  "....b.......",
  "....b.......",
  "....b.......",
  "....b.......",
  "...BBB......",
  "..BBBBB.....",
];

export const TREE: SpriteGrid = [
  ".....GGGGGG.....",
  "...GGgggggGGG...",
  "..GgggglggggG...",
  ".GgglgggggglgG..",
  ".GggggggglgggG..",
  "GgglggggggggggG.",
  "GggggglgggglggG.",
  ".GgggggggggggG..",
  "..GGgggglgggGG..",
  "...GGGgggGGGG...",
  "......BbB.......",
  "......BbB.......",
  "......BbB.......",
  ".....BbbbB......",
  "....BBBBBBB.....",
  "................",
];

export const CLOUD: SpriteGrid = [
  "................",
  ".....wwww.......",
  "...wwwwwwww.....",
  "..wwwwwwwwwww...",
  ".wwwwwwwwwwwwww.",
  "wwwwwwwwwwwwwwww",
  ".mwwwwwwwwwwwwm.",
  "..mmmmmmmmmmmm..",
];

export const BASKET: SpriteGrid = [
  "............",
  "...bbbbbb...",
  "..b......b..",
  ".b........b.",
  "bbbbbbbbbbbb",
  "btbtbtbtbtbt",
  ".tbtbtbtbtb.",
  ".btbtbtbtbt.",
  "..bbbbbbbb..",
  "............",
];

export const STAR: SpriteGrid = [
  "...yy...",
  "...yy...",
  "yyyyyyyy",
  ".yyyyyy.",
  "..yyyy..",
  ".yy..yy.",
  "yy....yy",
  "........",
];

export const SIGN: SpriteGrid = [
  "bbbbbbbbbb",
  "btttttttbb",
  "btkkktktbb",
  "bttttttttb",
  "btkktkkttb",
  "bbbbbbbbbb",
  "....bB....",
  "....bB....",
  "....bB....",
  "...BBBB...",
];

export const FENCE: SpriteGrid = [
  ".t......t.",
  "tbt....tbt",
  "tbtttttttb",
  "tbbbbbbbbt",
  "tbt....tbt",
  "tbtttttttb",
  "tbbbbbbbbt",
  "tbt....tbt",
];

export const FARMER: SpriteGrid = [
  "............",
  "............",
  "...kkkkkk...",
  "..kBBBBBBk..",
  "..kssssssk..",
  "..kskssksk..",
  "..kpsssspk..",
  "...kssssk...",
  "..kcccccck..",
  ".kcccccccck.",
  ".ksccccccsk.",
  "..kcccccck..",
  "..kUUUUUUk..",
  "..kUUkkUUk..",
  "..kBBkkBBk..",
  "...kk..kk...",
];

export const HATS: Record<string, SpriteGrid> = {
  "straw-hat": ["....tttt....", "...tttttt...", "...tbbbbt...", ".tttttttttt."],
  "flower-crown": ["............", "............", "............", "..pgpgygpg.."],
  "sunflower-hat": ["....y..y....", "...yyooyy...", "....yooy....", "..GGGGGGGG.."],
  "wizard-hat": [".....vv.....", "....vvvv....", "...vvyvvv...", ".vvvvvvvvvv."],
};

export const PETS: Record<string, SpriteGrid> = {
  cat: [
    ".o...o....",
    ".oo.oo....",
    ".oooooo...",
    ".okooko...",
    ".oooooo..o",
    "..oooooooo",
    "..oooooooo",
    "..o.o..o.o",
  ],
  dog: [
    "..........",
    ".bb.......",
    ".bbbb.....",
    ".bkbbb....",
    ".bbbbbbbbb",
    "...bbbbbbb",
    "...bbbbbbb",
    "...b.b.b.b",
  ],
};

export const TOOLS: Record<string, SpriteGrid> = {
  "watering-can": ["........", "...uuu..", "..u...u.", ".uuuuuuu", "uuuuuuu.", ".uuuuu..", ".uuuuu..", "........"],
  "golden-hoe": [".....yy.", "....y..y", "...b....", "..b.....", ".b......", "b.......", "........", "........"],
};

export const BADGE_ICONS: Record<string, SpriteGrid> = {
  wheat: ["....y.....", "...yoy....", "....y.....", "...yoy....", "....y.....", "...yoy....", "....g.....", "....g.....", "....g.....", "....g....."],
  clover: ["..gg..gg..", ".glgg.gglg", ".ggggggggg", "..gggggg..", ".ggggggggg", ".glgg.gglg", "..gg..gg..", "....G.....", ".....G....", "......G..."],
  eye: ["..........", "...kkkk...", "..kwwwwk..", ".kwwuuwwk.", "kwwuUUuwwk", "kwwuUUuwwk", ".kwwuuwwk.", "..kwwwwk..", "...kkkk...", ".........."],
  pin: ["...rrrr...", "..rrwrrr..", "..rrrrrr..", "...rrrr...", "....kk....", "....kk....", "....kk....", ".....k....", "..........", ".........."],
  bird: ["..........", "....uu....", "...uuuu.o.", "..uuwkuuoo", "..uuuuuuu.", ".uuuuuuu..", "uuuuuuu...", "...uuu....", "...o.o....", ".........."],
  loop: ["...gggg...", "..g....g..", ".g......g.", ".g.....ggg", ".g......g.", "ggg.....g.", ".g......g.", "..g....g..", "...gggg...", ".........."],
  globe: ["...uuuu...", "..uggguu..", ".uugggguu.", ".ugggguuu.", ".uuggguuu.", ".uuuuggguu", ".uuuggguu.", "..uugguu..", "...uuuu...", ".........."],
  bulb: ["...yyyy...", "..yywyyy..", ".yywyyyyy.", ".yyyyyyyy.", ".yyyyyyyy.", "..yyyyyy..", "...yyyy...", "...mmmm...", "...mmmm...", "....mm...."],
};
