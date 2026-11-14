// DUDU'S LITTLE ADVENTURE - TEST24_FIX5_DEV 6-SCENE INDEPENDENT ARCHITECTURE
// - 6 Independent Scenes: forest (0), village (1), monatium_a (2), monatium_b (3), erpien_a (4), erpien_b (5)
// - Local X = 0 for each independent scene
// - Seamless fade transitions between scenes
// - Only erpien_b (Mom's Room) has goal to trigger game ending
// - Challenge mode 100% frozen & tournament identical

const FAIRY_SECTION_OFFSET = 6800; // Pure background transition buffer (5200..6800) completes before fairy course starts!

const STAGE_ANCHORS = {
 forest: {
  width: 7400,
  exitX: 7300
 },
 village: {
  width: 7800,
  exitX: 7700
 },
 monatium_a: {
  width: 26800,
  exitX: 26600,
  skywalkShift: 1000,
  m1End: 4300,
  ascentStart: 4300,
  ascentEnd: 5984,
  ascentCenterX: 5142,
  roofY: -1785,
  skywalkStart: 5984,
  skywalkMidStart: 7920,
  skywalkMidEnd: 8440,
  skywalkStage2End: 9930,
  skywalkStage3Start: 10250,
  skywalkEnd: 12320,
  descentStart: 12320,
  descentEnd: 13520,
  descentCenterX: 12920,
  guardsStart: 13520,
  g1End: 17000,
  g2End: 20500,
  g3End: 23400,
  g4End: 25000,
  bukgyeongStart: 25000,
  bukgyeongBldgX: 26180,
  bukgyeongDoorX: 26465
 },
 monatium_b: {
  width: 8850, // FIX6: Arch 1->2 expanded to 1,300px (1700..3000), Summit Arch 2->3 shortened to 1,350px (4100..5450)
  exitX: 8650,
  tower1Start: 600,
  tower1End: 1700,
  arch1Start: 1700,
  arch1End: 3000,
  tower2Start: 3000,
  tower2End: 4100,
  summitStart: 4100,
  summitEnd: 5450, // 1,350px wide Summit Arch (all 3 MVB platforms visible in camera sequence)
  tower3Start: 5450,
  tower3End: 6550,
  plazaStart: 6550,
  plazaEnd: 8850
 },
 erpien_a: {
  width: 11200,
  exitX: 11050,
  gateEnd: 5200,
  bgTransitionBoundary: 5800,
  bgTransitionComplete: 6200,
  fairyCourseStart: 6800,
  climbStart: 6800,
  climbEnd: 10600
 },
 erpien_b: {
  width: 21000,
  exitX: 20800,
  gateEnd: 0,
  mayoActivateX: 1650,
  mayoSpawnX: 820,
  mayoMinChaseX: 80,
  cityStageBStart: 3650,
  cityStageCStart: 7200,
  cityEnd: 10500,
  marieStart: 10500,
  arenaOrigin: 10500,
  arenaWidth: 1455,
  pitLeftX: 10810,
  pitRightX: 11550,
  centerSpawnX: 11170,
  centerSpawnY: 540,
  mariePerchX: 11170,
  mariePerchY: 305,
  mayoBossX: 11690,
  mayoBossY: 520,
  exitWallX: 11810,
  marieStage2X: 10900,
  marieStage3X: 11200,
  marieFinaleX: 11500,
  marieEnd: 11950,
  templeStart: 12000,
  sacredTreeStart: 16800,
  goalX: 20550
 }
};
STAGE_ANCHORS.monatium = STAGE_ANCHORS.monatium_a;
STAGE_ANCHORS.erpien = STAGE_ANCHORS.erpien_b;
window.STAGE_ANCHORS = STAGE_ANCHORS;

const levels = [];
let levelIndex = 0, levelClock = 0, transition = null, journeyResult = null;
const collectedByLevel = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set()];
const visited = [true, false, false, false, false, false];
const routeDone = [false, false, false, false, false, false];
const worldImages = {}, worldFiles = ['forest-bg', 'village-bg', 'city-bg', 'erpien-gate', 'erpien-city', 'erpien-home', 'w1-meadow-bg', 'w1-forest-bg', 'w1-deep-forest-bg', 'w1-tree-interior-placeholder', 'w1-forest-exit-bg'];
const collectibleImages = {};
const transitionFrames = []; const TRANSITION_FRAME_COUNT = 20; let transitionSessionId = 0;

let TOTAL_SPECIAL_COINS = 0; // Computed from all six scenes after level construction (TEST28).
const securedSpecialEvent = new Set();
const securedSpecialPractice = new Set();
// All 12 golden crayons, including MB-SPEC-01/02 and EA-SPECIAL-01, are official collectibles.
let specialCoins = [];

function getActiveLevel(){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  if(typeof getActiveChallengeStage==='function')return getActiveChallengeStage();
  if(typeof challengeLevels!=='undefined')return challengeLevels[challengeStageIndex];
 }
 if(typeof gameMode!=='undefined'&&gameMode==='world'&&typeof world1Stages!=='undefined'){
  return world1Stages[activeWorldStageIndex]||world1Stages[0];
 }
 return levels[levelIndex];
}
function currentLevelId() { const lv = getActiveLevel(); return lv ? lv.id : ''; }
function activeSpecialSet() { return eventMode ? securedSpecialEvent : securedSpecialPractice; }
function setForCoin(sc) { return activeSpecialSet(); } // Unified official collection; no uncounted trial coins.
function totalRegularCandyCount() { return levels.reduce((acc, lv) => acc + (lv.regularDefs ? lv.regularDefs.length : 0), 0); }
function collectedRegularCandyCount() {
 return levels.reduce((acc, lv, idx) => {
  if (idx === levelIndex && typeof coins !== 'undefined' && coins.length) {
   return acc + coins.filter(c => c.got).length;
  }
  return acc + (collectedByLevel[idx] ? collectedByLevel[idx].size : 0);
 }, 0);
}

function makeLevel(id, name, width, { minCamY = -650, maxCamY = 140, backgroundRanges = {} } = {}) {
 return {
  id, name, worldWidth: width, minCamY, maxCamY, backgroundRanges,
  platforms: [], sections: [], signs: [], segments: [], regularDefs: [], specialDefs: [],
  villageProps: [], decorFootprints: [], goal: null
 };
}
function makeVisualMeta(l, x, y, w, skin, extra) {
 const ground = !!extra.groundTile;
 const variant = ground ? 'ground' : extra.wall ? 'wall' : extra.ceiling ? 'ceiling' : w <= 155 ? 'single_small' : w <= 225 ? 'single_medium' : 'modular';
 const seed = Math.abs(((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (Math.round(w) * 83492791) ^ ((l.platforms.length + 1) * 2654435761)) | 0) || 17;
 return { material: skin, variant, seed, decorations: extra.decorations || null };
}

function surface(l, x, y, w, skin = 'grass', extra = {}) {
 const visual = extra.visual || makeVisualMeta(l, x, y, w, skin, extra);
 const id = extra.id || `${l.id.toUpperCase()}-P${String(l.platforms.length + 1).padStart(2, '0')}`;
 const behavior = extra.behavior || (extra.blink ? 'blink' : extra.motion ? 'moving' : 'static');
 const challenge = extra.challenge || (extra.specialBranch ? 'special' : 'main');
 const assetType = extra.wall ? 'STRUCTURAL_WALL' : extra.ceiling ? 'STRUCTURAL_CEILING' : extra.groundTile ? 'GROUND_SURFACE' : 'COLLIDABLE_PLATFORM';
 const a = {
  id, assetType, x, y, w, h: 20, thin: true, skin, visual,
  behavior,
  motion: extra.motion || null,
  blink: extra.blink || null,
  collidable: true,
  blinkState: 'on',
  blinkAlpha: 1,
  challenge,
  checkpointSafe: Boolean(extra.checkpointSafe),
  ...extra
 };
 l.platforms.push(a); return a;
}
function floor(l, x, w, skin = 'grass', y = 580, extra = {}) {
 return surface(l, x, y, w, skin, { h: 360, thin: false, groundTile: true, checkpointSafe: true, ...extra });
}
function wall(l, x, y, w, h, skin = 'steel', extra = {}) {
 return surface(l, x, y, w, skin, { h, thin: false, wall: true, ...extra });
}
function checkpointAt(l, x, title, hint = '', y = 580) {
 const safeHint = (l.id === 'forest') ? hint : '';
 l.sections.push({ x, y, title, hint: safeHint });
}
function sign(l, x, y, text) {
 if (l.id !== 'forest') return;
 l.signs.push({ x, y, text });
}
function addCandy(l, id, x, y, category = 'main') {
 l.regularDefs.push({ id, levelId: l.id, x: Math.round(x), y: Math.round(y), category });
}
function addSpecialCoinDef(l, id, x, y, label, returnZone, extra = {}) {
 l.specialDefs.push({ id, levelId: l.id, x, y, label, returnZone, ...extra });
}

function addStageProp(l, { id, assetType = 'BACKGROUND_PROP', layer = 'background', key, x, anchorBottom = 580, walkOffset = 180, scale = 0.60, rawW = 300, rawH = 200, pad = 24 }) {
 const dw = Math.round(rawW * scale);
 const dh = Math.round(rawH * scale);
 const fp = {
  id, assetType, layer, key, x: Math.round(x), anchorBottom: Math.round(anchorBottom),
  walkOffset, scale, dw, dh,
  x1: Math.round(x - dw * 0.5 - pad),
  x2: Math.round(x + dw * 0.5 + pad),
  y1: Math.round(anchorBottom - walkOffset * scale),
  y2: Math.round(anchorBottom)
 };
 l.villageProps.push(fp);
 if (assetType === 'BACKGROUND_PROP') {
  l.decorFootprints.push({ id, x1: fp.x1, x2: fp.x2, y: anchorBottom, key });
 }
 return fp;
}

// REGION 0: SUIN FOREST (0 ~ 7400px · 6 Minimal Essential Tutorials, 24 Candies)
// ============================================================================
const forest=makeLevel('forest','수인숲',STAGE_ANCHORS.forest.width,{
 minCamY:-450,maxCamY:140,
 backgroundRanges:{'forest-bg':[0,7400]}
});
forest.segments=[{start:0,end:7400,bg:'forest-bg',skin:'grass',name:'수인숲',blockId:'F1-F6',indoor:false}];

// F1 (0~1200)
floor(forest,0,1200,'grass',580,{id:'F-GND-01',joinRight:true});
checkpointAt(forest,150,'햇살 산책길','← → 이동 · SPACE를 짧게 / 길게 눌러 점프 높이를 조절해요');
surface(forest,520,525,90,'grass',{id:'F-OBS-01',h:55,thin:false,wall:true});
surface(forest,820,450,210,'grass',{id:'F-STEP-01'});
sign(forest,680,375,'짧게 폴짝(장애물) vs 길게 폴짝(높은 발판)');

// F2 (1200~2450)
floor(forest,1200,840,'grass',580,{id:'F-GND-02A',joinLeft:true});
checkpointAt(forest,1340,'두 번 폴짝','1단 점프만으로는 넘을 수 없어요! 공중에서 SPACE를 한 번 더!');
sign(forest,1620,350,'공중에서 SPACE 한 번 더 · 2단 점프 필수');
surface(forest,1800,380,230,'grass',{id:'F-STEP-02'});
wall(forest,2040,420,80,480,'grass',{id:'F-CLIFF-02'});
floor(forest,2120,330,'grass',580,{id:'F-GND-02B',joinRight:true});

// F3 (2450~3550)
floor(forest,2450,1100,'grass',580,{id:'F-GND-03',joinLeft:true,joinRight:true});
checkpointAt(forest,2580,'아래로 폴짝','상단 발판 위에서 ↓ + SPACE를 한 번 눌러 아래 발판으로 내려가요');
surface(forest,2760,370,340,'grass',{id:'F-DROP-01'});
surface(forest,2840,475,360,'grass',{id:'F-DROP-02'});
wall(forest,3080,180,54,205,'grass',{id:'F-DROP-BARRIER'});
sign(forest,2930,305,'↓ + SPACE · 얇은 발판 내려가기');

// F4 (3550~4800)
floor(forest,3550,1550,'grass',580,{id:'F-GND-04',joinLeft:true});
checkpointAt(forest,3620,'징검다리 조준','넓은 발판에서 좁은 발판으로! 정확히 착지해요');
surface(forest,3780,485,165,'grass',{id:'F-BRIDGE-01'});
surface(forest,4080,435,125,'grass',{id:'F-BRIDGE-02'});
surface(forest,4360,390,92,'grass',{id:'F-BRIDGE-03',useSmallVisual:true});

// F5 (4800~6250)
checkpointAt(forest,4940,'바람처럼 대시','앞의 긴 절벽은 점프만으론 못 건너요! 2단 점프 후 L SHIFT 공중 대시!');
sign(forest,5010,415,'⚠ 긴 절벽 · 2단 점프 + L SHIFT 공중 대시 필수');
floor(forest,5585,815,'grass',580,{id:'F-GND-05'});

// F6 (6250~7400)
checkpointAt(forest,6260,'숲의 출구','점프와 대시를 연결해 수인마을로 출발해요!');
surface(forest,6580,485,180,'grass',{id:'F-FINAL-01'});
floor(forest,6920,480,'grass',580,{id:'F-GND-06'});

for(const [idx,[cx,cy]] of [
 [340,542],[565,485],[880,412],[970,412],
 [1520,542],[1860,342],[1970,342],[2260,542],
 [2660,542],[2860,332],[2980,332],[2980,437],[3240,542],
 [3862,447],[4142,397],[4406,352],[4680,542],
 [5040,542],[5340,435],[5760,542],[6020,542],
 [6670,447],[7040,542],[7220,542]
].entries()){
 addCandy(forest,`F-C${String(idx+1).padStart(2,'0')}`,cx,cy,'tutorial');
}
levels.push(forest);

// ============================================================================

// REGION 1: SUIN VILLAGE (0 ~ 7800px · Gate 1 P0 Strict Separation of BACKGROUND_PROP,
//                         DECORATION, and COLLIDABLE_PLATFORM with Zero Overlap!)
// ============================================================================
const village=makeLevel('village','수인마을',STAGE_ANCHORS.village.width,{
 minCamY:-450,maxCamY:140,
 backgroundRanges:{'village-bg':[0,7800]}
});
village.segments=[{start:0,end:7800,bg:'village-bg',skin:'village',name:'수인마을',blockId:'V1-V4',indoor:false}];

// --- V1 (0 ~ 1920): 마을 어귀 광장 (0..1050 건물·장식 전용 평지 / 1120..1920 그루터기·시냇물 도약 구간) ---
floor(village,0,1560,'village',580,{id:'V-GND-01',noAutoDecor:true});
checkpointAt(village,160,'수인마을 어귀','',580);
// Gate 6 (P0): Suin Village Props & Decorations calibrated to true solid base contact row (`groundAnchorPx` / `walkOffset`)
// so that every cottage wall base, stall leg, wooden gate door, fence post, lamp base, and bush beds firmly into the solid lawn surface (`y = 584..591`) with ZERO floating gaps!
addStageProp(village,{id:'V-DEC-SIGN-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_signpost',x:260,anchorBottom:580,walkOffset:153,groundAnchorPx:153,prevWalkOffset:165,scale:0.52,rawW:183,rawH:169,pad:12});
addStageProp(village,{id:'V-PROP-HOUSE-A',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_a',x:560,anchorBottom:580,walkOffset:228,groundAnchorPx:228,prevWalkOffset:242,scale:0.66,rawW:419,rawH:246,pad:30});
addStageProp(village,{id:'V-DEC-LAMP-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:810,anchorBottom:580,walkOffset:175,groundAnchorPx:175,prevWalkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-DEC-FENCE-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_fence_short',x:950,anchorBottom:580,walkOffset:86,groundAnchorPx:86,prevWalkOffset:98,scale:0.54,rawW:185,rawH:102,pad:12});
// V1 Collidable Platforms (Strictly in x = 1140..1830 over open lawn & stream 1560..1920!)
surface(village,1160,505,190,'village',{id:'V-STEP-01'});
surface(village,1630,490,200,'village',{id:'V-BRIDGE-01'});

// --- V2 (1920 ~ 4160): 마을 장터 (1920..3180 가판대·오두막 전용 광장 / 3240..4160 시냇물 징검다리 도약) ---
floor(village,1920,1720,'village',580,{id:'V-GND-02',noAutoDecor:true});
checkpointAt(village,2040,'마을 장터 광장','',580);
// V2 Background Props & Decorations (Strictly in x = 2120..3120; ZERO floating platforms in 1920..3220!)
addStageProp(village,{id:'V-DEC-LAMP-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:2170,anchorBottom:580,walkOffset:175,groundAnchorPx:175,prevWalkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-PROP-STALL-01',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_stall',x:2400,anchorBottom:580,walkOffset:173,groundAnchorPx:173,prevWalkOffset:184,scale:0.60,rawW:311,rawH:188,pad:28});
addStageProp(village,{id:'V-DEC-BUSH-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_bush_flower',x:2620,anchorBottom:580,walkOffset:86,groundAnchorPx:86,prevWalkOffset:98,scale:0.50,rawW:207,rawH:102,pad:10});
addStageProp(village,{id:'V-PROP-HOUSE-B',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_b',x:2910,anchorBottom:580,walkOffset:274,groundAnchorPx:274,prevWalkOffset:288,scale:0.66,rawW:455,rawH:292,pad:30});
// V2 Collidable Platforms (Strictly in x = 3260..4110 after the market buildings & across stream 3640..4160!)
surface(village,3260,500,195,'village',{id:'V-MARKET-01'});
surface(village,3710,485,175,'village',{id:'V-STREAM-01'});
surface(village,3935,450,175,'village',{id:'V-STREAM-02'});

// --- V3 (4160 ~ 6220): 오두막 정원 (4160..5080 오두막·꽃밭 관람 산책로 / 5140..6220 얕은 단차·시냇물 도약) ---
floor(village,4160,1580,'village',580,{id:'V-GND-03',noAutoDecor:true});
checkpointAt(village,4280,'덩굴 오두막 정원','',580);
// V3 Background Props & Decorations (Strictly in x = 4380..5040; ZERO floating platforms in 4160..5120!)
addStageProp(village,{id:'V-DEC-LUPINE-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_lupine',x:4410,anchorBottom:580,walkOffset:96,groundAnchorPx:96,prevWalkOffset:108,scale:0.52,rawW:177,rawH:112,pad:10});
addStageProp(village,{id:'V-PROP-HOUSE-C',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_c',x:4690,anchorBottom:580,walkOffset:270,groundAnchorPx:270,prevWalkOffset:286,scale:0.66,rawW:451,rawH:290,pad:30});
addStageProp(village,{id:'V-DEC-FENCE-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_fence_long',x:5000,anchorBottom:580,walkOffset:89,groundAnchorPx:89,prevWalkOffset:100,scale:0.52,rawW:344,rawH:103,pad:12});
// V3 Collidable Platforms (Strictly in x = 5160..6060 in the open clearing & over stream 5740..6220!)
surface(village,5160,495,195,'village',{id:'V-GARDEN-01'});
surface(village,5460,440,200,'village',{id:'V-GARDEN-02'});
surface(village,5860,485,200,'village',{id:'V-BRIDGE-02'});

// --- V4 (6220 ~ 7800): 마을 출구 대문 (6360..6555 단일 낮은 발판 / 6700..7600 출구 가판대·대문 평지) ---
floor(village,6220,1580,'village',580,{id:'V-GND-04',noAutoDecor:true});
checkpointAt(village,6300,'마을 출구 대문','',580);
surface(village,6400,505,190,'village',{id:'V-EXIT-01'});
// V4 Background Props & Decorations (Strictly in x = 6740..7620; ZERO floating platforms in 6600..7800!)
addStageProp(village,{id:'V-PROP-STALL-02',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_stall',x:6860,anchorBottom:580,walkOffset:173,groundAnchorPx:173,prevWalkOffset:184,scale:0.60,rawW:311,rawH:188,pad:28});
addStageProp(village,{id:'V-DEC-LAMP-03',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:7110,anchorBottom:580,walkOffset:175,groundAnchorPx:175,prevWalkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-PROP-GATE',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_gate',x:7360,anchorBottom:580,walkOffset:116,groundAnchorPx:116,prevWalkOffset:128,scale:0.64,rawW:271,rawH:131,pad:24});
addStageProp(village,{id:'V-DEC-SIGN-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_signpost',x:7580,anchorBottom:580,walkOffset:153,groundAnchorPx:153,prevWalkOffset:165,scale:0.52,rawW:183,rawH:169,pad:12});

// Suin Village 24 Forward-Path King Candies (placed along clean ground & platform arcs, avoiding building centers)
for(const [idx,[cx,cy]] of [
 [360,542],[760,542],[1060,542],[1255,467],[1480,542],[1730,452],
 [2100,542],[2620,542],[3140,542],[3355,462],[3560,542],[3795,447],
 [4020,412],[4360,542],[4960,542],[5255,457],[5560,402],[5960,447],
 [6260,542],[6495,467],[6680,542],[7080,542],[7220,542],[7480,542]
].entries()){
 addCandy(village,`V-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(village);

// ============================================================================

// REGION 2: MONATIUM (0 ~ 25,800px · Gate 2 Multi-Column 17-Step Tower + Asymmetric M-UP-01/02,
//                     Gate 3 Guard Bridge + Blinking Relay Survival in M5-G2 & M5-G4)
// ============================================================================
const monatium_a=makeLevel('monatium_a','모나티엄 A',STAGE_ANCHORS.monatium_a.width,{
 minCamY:-2250,maxCamY:160,
 backgroundRanges:{'city-bg':[0,26800]}
});
monatium_a.segments=[
 {start:0,end:4300,bg:'city-bg',skin:'road',name:'모나티엄',blockId:'M1',indoor:false},
 {start:4300,end:5984,bg:'city-bg',skin:'steel',name:'모나티엄',blockId:'M2',indoor:true},
 {start:5984,end:11320,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M3',indoor:false},
 {start:11320,end:12520,bg:'city-bg',skin:'steel',name:'모나티엄',blockId:'M4',indoor:true},
 {start:12520,end:24000,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M5',indoor:false},
 {start:24000,end:25800,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M6',indoor:false}
];

// --- M1. 도시 진입 (0 ~ 4300) ---
floor(monatium_a,0,1080,'road',580,{id:'M1-GND-A'});
checkpointAt(monatium_a,150,'모나티엄 진입로','',580);
surface(monatium_a,680,515,190,'steel',{id:'M1-STEP-01'});
surface(monatium_a,940,455,195,'steel',{id:'M1-STEP-02'});

floor(monatium_a,1240,1000,'pavement',580,{id:'M1-GND-B'});
surface(monatium_a,1260,395,340,'pavement',{id:'M1-OVERPASS-1',rooftop:true});
surface(monatium_a,1720,380,360,'pavement',{id:'M1-OVERPASS-2',rooftop:true});
surface(monatium_a,1520,495,180,'steel',{id:'M1-LOW-STEP'});
checkpointAt(monatium_a,2140,'고가 연결로','',580);

surface(monatium_a,2340,485,220,'steel',{id:'M1-BRIDGE-1'});
surface(monatium_a,2840,450,240,'steel',{id:'M1-BRIDGE-2'});
surface(monatium_a,3210,490,210,'steel',{id:'M1-BRIDGE-3'});
floor(monatium_a,2420,980,'road',580,{id:'M1-GND-C'});

floor(monatium_a,3560,2424,'pavement',580,{id:'M1-GND-D'});
surface(monatium_a,3680,510,185,'steel',{id:'M1-FORECOURT-1'});
checkpointAt(monatium_a,4140,'상승 타워 입구','',580);

// --- M2. 제1수직상승타워 (Gate 2 P1 전면 재설계: 다열(3~4열) 불규칙 스윕 + 대각선 2단 점프 필수 단차 165~185px + 제동·반전) ---
wall(monatium_a,4300,-1945,64,2305,'steel',{id:'M-WALL-ASC-L',wallSide:'left',wallRole:'ascent_left',portalBottom:true});
wall(monatium_a,5920,-1715,64,2295,'steel',{id:'M-WALL-ASC-R',wallSide:'right',wallRole:'ascent_right'});
wall(monatium_a,5920,-1995,64,80,'steel',{id:'M-WALL-ASC-RH',wallSide:'right',wallRole:'ascent_right_header',portalBottom:true});
wall(monatium_a,4300,-1995,1684,50,'steel',{id:'M-WALL-ASC-CAP',wallSide:'left',wallRole:'ascent_roof_cap'});

// Pattern 1 (1~5단, y = 495 .. -60): 3열 우측 스윕 워밍업 -> 좌측 반전 대각선 2단 점프(ΔY=-165px > 141.7px 1단 한계!)
surface(monatium_a,4680,495,135,'steel',{id:'M-ASC-01',towerStep:1});
surface(monatium_a,4970,380,125,'steel',{id:'M-ASC-02',towerStep:2});
surface(monatium_a,5280,250,120,'steel',{id:'M-ASC-03',towerStep:3});
surface(monatium_a,5010,105,115,'steel',{id:'M-ASC-04',towerStep:4});
surface(monatium_a,4710,-60,112,'steel',{id:'M-ASC-05',towerStep:5}); // ΔY=-165px: 1단 점프 불가, 대각선 2단 점프 필수!

// Pattern 2 (6~11단, y = -195 .. -970): 불규칙 가로폭·대각선 2단 점프(ΔY=-180~-185px) & 중층 체크포인트
surface(monatium_a,5030,-195,165,'pavement',{id:'M-ASC-06',towerStep:6,checkpointSafe:true});
checkpointAt(monatium_a,5112,'타워 상승 초중반','',-195);
surface(monatium_a,5370,-375,104,'steel',{id:'M-ASC-07',towerStep:7}); // ΔY=-180px: 대각선 2단 점프 필수!
surface(monatium_a,5110,-515,96,'steel',{id:'M-ASC-08',towerStep:8,useSmallVisual:true});
surface(monatium_a,4790,-700,90,'steel',{id:'M-ASC-09',towerStep:9,useSmallVisual:true}); // ΔY=-185px: 좌상향 대각선 2단 점프 필수!
surface(monatium_a,5070,-835,86,'steel',{id:'M-ASC-10',towerStep:10,useSmallVisual:true});
surface(monatium_a,5350,-970,150,'pavement',{id:'M-ASC-11',towerStep:11,checkpointSafe:true});
checkpointAt(monatium_a,5425,'타워 상승 상단 입구','',-970);

// Pattern 3 (12~17단, y = -1150 .. -1785): 정상부 고난도 연속 정밀 착지 (82->78->74->70->64->70px, 대각선 2단점프+공중제동, 실패 시 2~4단 재등반)
surface(monatium_a,5050,-1150,82,'steel',{id:'M-ASC-12',towerStep:12,useSmallVisual:true}); // ΔY=-180px: 대각선 2단 점프 필수!
surface(monatium_a,4750,-1295,78,'steel',{id:'M-ASC-13',towerStep:13,useSmallVisual:true});
surface(monatium_a,5030,-1480,74,'steel',{id:'M-ASC-14',towerStep:14,useSmallVisual:true}); // ΔY=-185px: 우상향 반전 2단 점프 + 제동!
surface(monatium_a,5310,-1610,70,'steel',{id:'M-ASC-15',towerStep:15,useSmallVisual:true});
surface(monatium_a,5020,-1755,64,'steel',{id:'M-ASC-16',towerStep:16,useSmallVisual:true}); // 64px 초소형 정밀 반전 착지!
surface(monatium_a,5290,-1785,70,'steel',{id:'M-ASC-17',towerStep:17,useSmallVisual:true});

// [Section 6-2: M2 황금 크레파스 #1: M-UP-01 — P1(4460,-115) -> P2(4385,-295) -> 2단점프+공중대시 필수 고립 도약 P3(4755,-430, gap=298px, dY=-135px) -> 정점 포켓 P4(4510,-575, w=64) -> 대시 없이 안전 복귀 가능한 징검발판 RET(4830,-310) 경유 M-ASC-06 복귀!]
surface(monatium_a,4460,-115,76,'steel',{id:'M-UP-01-P1',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(monatium_a,4385,-295,72,'steel',{id:'M-UP-01-P2',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
// From P2 (right edge 4457, y=-295) to P3 (left edge 4755, y=-430): dx=298px, dy=-135px -> 1-jump/2-jump alone maxes at ~245px; 2-jump + air-dash is mandatory!
surface(monatium_a,4755,-430,66,'steel',{id:'M-UP-01-P3',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(monatium_a,4510,-575,64,'steel',{id:'M-UP-01-P4',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(monatium_a,4840,-310,74,'steel',{id:'M-UP-01-RET',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
addSpecialCoinDef(
 monatium_a,'M-UP-01',4542,-611,'상승 1 · 중층 2단점프+대시 고립 포켓',
 {x1:4650,x2:6440,yMin:-1820,yMax:120},
 {
  parentPlatformId:'M-UP-01-P4',localOffsetX:32,localOffsetY:-36,requireLanding:true,
  allowedReturnPlatforms:['M-ASC-04','M-ASC-05','M-ASC-06','M-ASC-07','M-ASC-08','M-ASC-09','M-ASC-10','M-ASC-11','M-ASC-12','M-ASC-13','M-ASC-14','M-ASC-15','M-ASC-16','M-ASC-17','M-SKY-ENTRY']
 }
);

// [M2 황금 크레파스 #2: M-UP-02 — M-ASC-15에서 우측 외곽 진입(74px) -> 고도 조절·방향 반전 소형 포켓(68px) -> 차양(M-UP-02-CEIL) 회피 복귀]
surface(monatium_a,5520,-1720,395,'steel',{id:'M-UP-02-CEIL',thin:false,h:26,ceiling:true,challenge:'special'});
surface(monatium_a,5565,-1545,74,'steel',{id:'M-UP-02-P1',specialBranch:'M-UP-02',challenge:'special',useSmallVisual:true});
surface(monatium_a,5785,-1620,68,'steel',{id:'M-UP-02-P2',specialBranch:'M-UP-02',challenge:'special',useSmallVisual:true});
addSpecialCoinDef(
 monatium_a,'M-UP-02',5819,-1656,'상승 2 · 정상 외곽 고도조절 포켓',
 {x1:4740,x2:5390,yMin:-1790,yMax:-1280},
 {parentPlatformId:'M-UP-02-P2',localOffsetX:34,localOffsetY:-36,requireLanding:true}
);

// --- M3. 총 3단계 점멸 스카이워크 (Gate G5 P1: +1,000px 수평 도약 간격 확장 · x = 5984 ~ 12320, y = -1830 ~ -1730) ---
surface(monatium_a,5520,-1785,920,'pavement',{id:'M-SKY-ENTRY',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(monatium_a,6160,'모나티엄 옥상 입구','',-1785);

// 제1구간 (6528~7760, 수평 빈 간격 162px -> 212~214px로 +30% 확장, 발판 폭 148px 유지)
surface(monatium_a,6528,-1780,148,'steel',{id:'M-SKY-01',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.00}});
surface(monatium_a,6888,-1780,148,'steel',{id:'M-SKY-02',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.85}});
surface(monatium_a,7250,-1775,148,'steel',{id:'M-SKY-03',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:1.70}});
surface(monatium_a,7612,-1775,148,'steel',{id:'M-SKY-04',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:2.55}});

// 제1전망 데크 (+280px 이동)
surface(monatium_a,7920,-1770,280,'pavement',{id:'M-SKY-SAFE1',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(monatium_a,8060,'스카이워크 제1전망교','',-1770);
surface(monatium_a,8220,-1820,220,'pavement',{id:'M-SKY-VISTA',thin:true,rooftop:true,checkpointSafe:true});

// 제2구간 (8532~9748, 수평 빈 간격 158px -> 216px로 +36% 확장, 엇박 위상 및 발판 폭 142px 유지) + M-SKY-C01 (LOCK-2 보존)
surface(monatium_a,8532,-1765,142,'steel',{id:'M-SKY-05',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:0.15}});
surface(monatium_a,8890,-1760,142,'steel',{id:'M-SKY-06',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:1.62}});
surface(monatium_a,9248,-1755,142,'steel',{id:'M-SKY-07',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:0.38}});
surface(monatium_a,9606,-1750,142,'steel',{id:'M-SKY-08',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:1.84}});

surface(monatium_a,9248,-1625,88,'steel',{
 id:'M-SKY-C01-P',specialBranch:'M-SKY-C01',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,ultraFastBlink:true,
 blink:{on:0.75,warning:0.15,off:0.45,phase:0.20}
});
addSpecialCoinDef(
 monatium_a,'M-SKY-C01',9292,-1661,'스카이워크 · 초고속 점멸(1.35s) 하부 착지 회수',
 {x1:7920,x2:12300,yMin:-1840,yMax:-1670},
 {parentPlatformId:'M-SKY-C01-P',localOffsetX:44,localOffsetY:-36,requireLanding:true}
);

// 제2전망 데크 (+600px 이동)
surface(monatium_a,9930,-1745,310,'pavement',{id:'M-SKY-SAFE2',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(monatium_a,10080,'스카이워크 제2전망교','',-1745);

// 제3구간 상하 교차 점멸 (10336~11725, 수평 빈 간격 104~117px -> 174~189px 확장, 엇박 위상 및 발판 폭 128~136px 유지)
surface(monatium_a,10336,-1740,136,'steel',{id:'M-SKY-09',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.10}});
surface(monatium_a,10646,-1830,132,'steel',{id:'M-SKY-10',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:1.72}});
surface(monatium_a,10963,-1735,132,'steel',{id:'M-SKY-11',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.42}});
surface(monatium_a,11280,-1825,128,'steel',{id:'M-SKY-12',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:1.95}});
surface(monatium_a,11597,-1735,128,'steel',{id:'M-SKY-13',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.68}});

surface(monatium_a,11870,-1730,514,'pavement',{id:'M-SKY-EXIT',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(monatium_a,12120,'옥상 하강 입구','',-1730);

// --- M4. 제2수직하강타워 (SKY_SHIFT = +1000 적용: x = 12320 ~ 13520, 내부 바닥 0px 무바닥 피트 + 최종 고속 이동발판 M-DSC-FINAL 필수) ---
wall(monatium_a,12320,-1985,64,80,'steel',{id:'M-WALL-DSC-LH',wallSide:'left',wallRole:'descent_left_header',portalBottom:true});
wall(monatium_a,12320,-1705,64,2285,'steel',{id:'M-WALL-DSC-L',wallSide:'left',wallRole:'descent_left'});
wall(monatium_a,13456,-1985,64,2341,'steel',{id:'M-WALL-DSC-R',wallSide:'right',wallRole:'descent_right',portalBottom:true});
wall(monatium_a,12320,-1985,1200,48,'steel',{id:'M-WALL-DSC-CAP',wallSide:'right',wallRole:'descent_roof_cap'});

surface(monatium_a,12420,-1560,165,'steel',{id:'M-DSC-01',descentStep:1,behavior:'static'});
surface(monatium_a,12920,-1305,155,'steel',{id:'M-DSC-02',descentStep:2,behavior:'moving',motion:{axis:'x',range:105,period:2.75,phase:0.00}});
surface(monatium_a,12540,-1050,150,'steel',{id:'M-DSC-03',descentStep:3,behavior:'moving',motion:{axis:'x',range:95,period:2.95,phase:1.57}});
surface(monatium_a,12890,-795,150,'steel',{id:'M-DSC-04',descentStep:4,behavior:'moving',motion:{axis:'x',range:95,period:2.60,phase:0.80}});
surface(monatium_a,12580,-540,185,'pavement',{id:'M-DSC-05',descentStep:5,behavior:'static',checkpointSafe:true});
checkpointAt(monatium_a,12672,'하강 타워 중상단','',-540);
surface(monatium_a,12930,-285,150,'steel',{id:'M-DSC-06',descentStep:6,behavior:'moving',motion:{axis:'x',range:100,period:2.55,phase:2.10}});
surface(monatium_a,12600,-30,180,'pavement',{id:'M-DSC-07',descentStep:7,behavior:'static',checkpointSafe:true});
checkpointAt(monatium_a,12690,'하강 타워 하단','',-30);
surface(monatium_a,12540,225,148,'steel',{id:'M-DSC-08',descentStep:8,behavior:'moving',motion:{axis:'x',range:95,period:2.45,phase:1.20}});

surface(monatium_a,12920,485,165,'steel',{
 id:'M-DSC-FINAL',descentStep:9,behavior:'moving',fastMoving:true,
 motion:{axis:'x',range:175,period:2.10,phase:0.00}
});

surface(monatium_a,13240,-920,92,'steel',{
 id:'M-DOWN-01-P',specialBranch:'M-DOWN-01',challenge:'special',useSmallVisual:true,
 behavior:'moving',fastMoving:true,motion:{axis:'x',range:85,period:1.85,phase:0.40}
});
addSpecialCoinDef(
 monatium_a,'M-DOWN-01',13286,-954,'하강 1 · 우측 외벽 고속 이동 발판 착지',
 {x1:12420,x2:13100,yMin:-810,yMax:-20},
 {parentPlatformId:'M-DOWN-01-P',localOffsetX:46,localOffsetY:-34,requireLanding:true}
);

surface(monatium_a,12480,355,88,'steel',{
 id:'M-DOWN-02-P',specialBranch:'M-DOWN-02',challenge:'special',useSmallVisual:true,
 behavior:'moving',fastMoving:true,motion:{axis:'x',range:80,period:1.75,phase:2.10}
});
addSpecialCoinDef(
 monatium_a,'M-DOWN-02',12524,321,'하강 2 · 좌측 피트 상공 고속 이동 발판 착지',
 {x1:12740,x2:14200,yMin:470,yMax:590},
 {parentPlatformId:'M-DOWN-02-P',localOffsetX:44,localOffsetY:-34,requireLanding:true}
);

// --- M5. 진압반 4종 전술 블록 (Gate 8: 상·하 및 좌·우 과밀 플랫폼 시각 이격 정돈 · 13456 ~ 25060) ---
floor(monatium_a,13456,624,'road',580,{id:'M-G1-GND1'});
checkpointAt(monatium_a,13720,'진압반 제1구역','',580);
surface(monatium_a,14200,515,130,'steel',{id:'M-G1-STEP1',useSmallVisual:true});
surface(monatium_a,14500,420,290,'pavement',{id:'M-G1-LOW1'});
wall(monatium_a,14630,130,52,190,'steel',{id:'M-G1-BAFFLE1',noTopLand:true});
surface(monatium_a,14930,495,130,'steel',{id:'M-G1-EXIT1',useSmallVisual:true});
floor(monatium_a,15180,440,'road',580,{id:'M-G1-GND2'});
checkpointAt(monatium_a,15340,'진압반 제1교차점','',580);
surface(monatium_a,15790,480,310,'pavement',{id:'M-G1-LOW2'});
wall(monatium_a,15920,190,52,190,'steel',{id:'M-G1-BAFFLE2',noTopLand:true});
surface(monatium_a,16280,375,160,'steel',{id:'M-G1-HIGH2'});
floor(monatium_a,16660,340,'road',580,{id:'M-G1-GND3',joinRight:true});

// M5-G2 (17000 ~ 20500 — Gate 8: 상부 교량 y=420과 하부 트렌치 y=565를 145px 수직 분리하여 철골 겹침 완전 해소!)
floor(monatium_a,17000,380,'pavement',580,{id:'M-G2-ENTRY'});
checkpointAt(monatium_a,17120,'진압반 공중 교량','',580);
surface(monatium_a,17440,500,110,'steel',{id:'M-G2-STEP1',useSmallVisual:true});
surface(monatium_a,17650,420,300,'steel',{id:'M-GRD-BR1',thin:true});
wall(monatium_a,18035,125,56,200,'steel',{id:'M-G2-BAFFLE1',noTopLand:true});
surface(monatium_a,18220,385,150,'steel',{
 id:'M-G2-BLINK1',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.50,warning:0.45,off:1.15,phase:0.80}
});
// Lower Trench Blink Route for M-GUARD-01 (145~160px below upper bridge/blink relay, with useSmallVisual:true for crisp separation)
surface(monatium_a,17620,565,110,'steel',{
 id:'M-G2-TRENCH-L',useSmallVisual:true,behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:0.00}
});
surface(monatium_a,17885,565,105,'steel',{
 id:'M-GUARD-01-P',specialBranch:'M-GUARD-01',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:0.55}
});
surface(monatium_a,18150,540,110,'steel',{
 id:'M-G2-TRENCH-R',useSmallVisual:true,behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:1.10}
});
addSpecialCoinDef(
 monatium_a,'M-GUARD-01',17937,529,'경비 1 · 교량 하부 트렌치 잠입 회수',
 {x1:18680,x2:20500,yMin:420,yMax:585},
 {parentPlatformId:'M-GUARD-01-P',localOffsetX:52,localOffsetY:-36,requireLanding:true,
  allowedReturnPlatforms:['M-G2-MID','M-GRD-BR2','M-G2-BLINK2','M-G2-EXIT']}
);

floor(monatium_a,18680,360,'pavement',580,{id:'M-G2-MID'});
checkpointAt(monatium_a,18780,'제2교량 입구','',580);
surface(monatium_a,19240,460,290,'steel',{id:'M-GRD-BR2',thin:true});
wall(monatium_a,19615,170,56,195,'steel',{id:'M-G2-BAFFLE2',noTopLand:true});
surface(monatium_a,19770,415,150,'steel',{
 id:'M-G2-BLINK2',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.45,warning:0.45,off:1.10,phase:1.60}
});
floor(monatium_a,20160,440,'pavement',580,{id:'M-G2-EXIT'});

// M5-G3 (20600 ~ 23400 — Gate 8: 다층 교차로 수평·수직 간격 확대)
floor(monatium_a,20600,360,'pavement',580,{id:'M-G3-GND1',joinLeft:true});
checkpointAt(monatium_a,20700,'진압반 다층 교차로','',580);
surface(monatium_a,21090,500,285,'steel',{id:'M-G3-MID1'});
wall(monatium_a,21435,330,50,220,'steel',{id:'M-G3-BAFFLE1',noTopLand:true});
surface(monatium_a,21560,345,295,'steel',{id:'M-G3-UPPER'});
wall(monatium_a,21685,80,50,175,'steel',{id:'M-G3-BAFFLE2',noTopLand:true});
floor(monatium_a,22040,360,'pavement',580,{id:'M-G3-GND2'});
checkpointAt(monatium_a,22160,'다층 교차로 후반','',580);
surface(monatium_a,22500,425,125,'steel',{id:'M-G3-STEP-HI',useSmallVisual:true});
wall(monatium_a,22675,170,50,265,'steel',{id:'M-G3-BAFFLE3',noTopLand:true});
surface(monatium_a,22765,515,245,'steel',{id:'M-G3-MID2'});
surface(monatium_a,23065,360,125,'steel',{id:'M-G3-HIGH-EXIT',useSmallVisual:true});
floor(monatium_a,23240,160,'pavement',580,{id:'M-G3-GND3',joinRight:true});

// M5-G4 (23400 ~ 25060 — Gate 8: 상공 황금 크레파스 분기 M-GUARD-02와 하부 경비교량 간 수직 이격 145~245px 확보!)
floor(monatium_a,23400,260,'pavement',580,{id:'M-G4-GND1'});
checkpointAt(monatium_a,23480,'특수 진압반 구역','',580);
surface(monatium_a,23780,485,280,'steel',{id:'M-GRD-BR3A',thin:true});
wall(monatium_a,24110,185,52,205,'steel',{id:'M-G4-BAFFLE1',noTopLand:true});
surface(monatium_a,24220,440,130,'steel',{
 id:'M-G4-BLINK1',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.35,warning:0.40,off:1.05,phase:0.40}
});
surface(monatium_a,24470,400,285,'steel',{id:'M-GRD-BR3B',thin:true});
surface(monatium_a,24860,455,125,'steel',{
 id:'M-G4-BLINK2',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.35,warning:0.40,off:1.00,phase:1.50}
});
surface(monatium_a,24695,255,86,'steel',{
 id:'M-GUARD-02-P1',specialBranch:'M-GUARD-02',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,blink:{on:1.50,warning:0.42,off:0.88,phase:0.45}
});
surface(monatium_a,24415,155,78,'steel',{
 id:'M-GUARD-02-P',specialBranch:'M-GUARD-02',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,blink:{on:1.50,warning:0.42,off:0.88,phase:1.15}
});
addSpecialCoinDef(
 monatium_a,'M-GUARD-02',24454,119,'경비 2 · 이중 경비·점멸 교량 상공 왕복 돌파',
 {x1:25060,x2:26400,yMin:440,yMax:590},
 {parentPlatformId:'M-GUARD-02-P',localOffsetX:39,localOffsetY:-36,requireLanding:true,
  allowedReturnPlatforms:['M-GND-BUKGYEONG','M-GRD-BR3B','M-G4-BLINK2']}
);

// --- M6. 북경성 광장 (25060 ~ 26800, bldgX = 26180, doorCenterX = 26465 단일 출입문 대표·부대표 이벤트 보존) ---
floor(monatium_a,25060,1740,'pavement',580,{id:'M-GND-BUKGYEONG'});
checkpointAt(monatium_a,25160,'북경성 앞 광장','',580);

// Monatium 36 Manual Forward-Path King Candies (M-C01 ~ M-C36, Skywalk & M4~M6 migrated)
for(const [idx,[cx,cy]] of [
 // M1 Urban Entry (5)
 [480,542],[775,477],[1035,417],[1430,357],[2960,412],
 // M2 17-Step Multi-Column Ascent (14)
 [4747,457],[5032,342],[5340,212],[5067,67],[4766,-98],[5112,-233],
 [5422,-413],[5158,-553],[4835,-738],[5113,-873],[5425,-1008],[5091,-1188],[4789,-1333],[5052,-1793],
 // M3 3-Stage Skywalk (7)
 [6060,-1823],[6602,-1818],[7324,-1813],[8060,-1808],[8961,-1798],[10712,-1868],[11661,-1773],
 // M4 9-Step Descent + M-DSC-FINAL (4)
 [12502,-1598],[12672,-578],[12690,-68],[12995,447],
 // M5 Tactical Guards G1~G4 & M6 Beijing Castle (6)
 [14665,417],[17810,437],[18267,397],[21265,457],[24307,407],[25600,542]
].entries()){
 addCandy(monatium_a,`M-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(monatium_a);

// ============================================================================


// ============================================================================
// SCENE 4: MONATIUM B (index 3) - TEST24_FIX6_DEV
// - P0-MB1: Exact red-trajectory Tower 1 route (P01 -> P02 -> B01 ==[Left 2-Jump+Dash]==> P03 -> P04 -> B02 -> B03 -> B04 -> P05 ==[Right 2-Jump+Dash]==> STEP-R1 -> EXIT)
//           Zero decorative blink islands, physical >280px vertical barriers against skipping B01 or P05, optional MB-SPEC-01 branch preserved.
// - P0-MB2: Arch 1->2 expanded to 1,300px (x=1700..3000); Summit Arch 2->3 shortened to 1,350px (x=4100..5450) with 3 vertical moving+blinking platforms (MB-TOP-MVB-1..3) visible in camera.
// - P0-MB3: Forward-wave blink phase ordering (`blink.phase = -step * delta`) matching player climb/crossing direction.
// - P0-MB4: Tower 3 exterior right wall contact & any exterior bypass fall (even 150px+ far right) immediately resets to checkpoint; only bottom M06 exit allowed.
// ============================================================================
const monatium_b = makeLevel('monatium_b', '모나티엄 B', STAGE_ANCHORS.monatium_b.width, {
 minCamY: -2650,
 maxCamY: 140,
 backgroundRanges: {
  'city-bg': [0, STAGE_ANCHORS.monatium_b.width]
 }
});
monatium_b.segments = [
 { start: 0, end: 1700, bg: 'city-bg', skin: 'steel', name: '모나티엄 B', blockId: 'MB1', indoor: false, title: '제1타워 · 교차 점멸과 대시 도약', hint: '우측 점멸 발판에서 이단점프 후 왼쪽 공중 대시(L SHIFT)로 상단 발판에 오르세요!' },
 { start: 1700, end: 3000, bg: 'city-bg', skin: 'steel', name: '모나티엄 B', blockId: 'MB2', indoor: false, title: '제1→2타워 연결교', hint: '확장된 고공 연결교의 점멸 타이밍을 읽고 제2타워로 건너가세요!' },
 { start: 3000, end: 4100, bg: 'city-bg', skin: 'steel', name: '모나티엄 B', blockId: 'MB3', indoor: false, title: '제2타워 · 순차 점멸 슬라이더 등반', hint: '아래에서 위로 순차 점멸하는 수평 이동 발판을 타고 정상으로 오르세요!' },
 { start: 4100, end: 5450, bg: 'city-bg', skin: 'steel', name: '모나티엄 B', blockId: 'MB4', indoor: false, title: '제2→3타워 상단 아치 · 상하 점멸 3연속', hint: '좌에서 우로 순차 점멸하며 상하로 움직이는 3개의 복합 발판을 건너세요!' },
 { start: 5450, end: 6550, bg: 'city-bg', skin: 'steel', name: '모나티엄 B', blockId: 'MB5', indoor: false, title: '제3타워 · 정밀 하강 샤프트', hint: '↓ 키로 아래 발판을 확인하며 하강하세요! 내부 벽면 2초 접촉 또는 외벽 이탈 시 리셋됩니다.' },
 { start: 6550, end: 8850, bg: 'city-bg', skin: 'pavement', name: '모나티엄 B', blockId: 'MB6', indoor: false, title: '모나티엄 시민 광장', hint: '타워 하단 정상 출구를 통과해 광장의 디아나·코미·버터와 인사하세요!' }
];

checkpointAt(monatium_b, 150, '제1타워 입구', '붉은 동선을 따라 우측 점멸 발판에서 좌측 대시 도약으로 등반하세요!', 580);
checkpointAt(monatium_b, 1530, '제1→2타워 연결교 입구', '확장된 1,300px 고공 연결교를 건너 제2타워로 진입하세요!', -745);
checkpointAt(monatium_b, 3220, '제2타워 진입 베이스', '아래에서 위로 이어지는 순차 점멸·이동 발판을 타고 정상까지 등반하세요!', -745);
checkpointAt(monatium_b, 4190, '상단 아치 · 상하 점멸 3연속', '시야 안에 들어오는 3개의 상하 이동·점멸 복합 발판을 차례로 건너세요!', -1720);
checkpointAt(monatium_b, 5720, '제3타워 최상단 진입부', '좌·우 벽면에 닿으면 즉시 리셋됩니다! 중앙 발판을 이용해 정밀 하강하세요.', -1600);
checkpointAt(monatium_b, 6720, '모나티엄 시민 광장', '타워 3개를 모두 돌파했습니다! 친구들과 인사하고 에르피엔으로 향하세요.', 580);

// --- 1. TOWER 1 (x = 600 .. 1700, y = 580 .. -1120) ---
floor(monatium_b, 0, 1700, 'pavement', 580, { id: 'MB-T1-GND', routeOrder: 0, checkpointSafe: true });
wall(monatium_b, 600, -1120, 64, 1480, 'steel', { id: 'MB-T1-WALL-L', wallSide: 'left', noTopLand: true, portalBottom: true });
wall(monatium_b, 600, -1120, 1100, 36, 'steel', { id: 'MB-T1-ROOF', ceiling: true, noTopLand: true });
wall(monatium_b, 1636, -1120, 64, 190, 'steel', { id: 'MB-T1-WALL-R-TOP', wallSide: 'right', noTopLand: true, portalBottom: true });
wall(monatium_b, 1636, -725, 64, 1305, 'steel', { id: 'MB-T1-WALL-R-BOT', wallSide: 'right', noTopLand: true });

// P0-MB1 & P0-MB3: Exact Red-Trajectory Route with Forward-Wave Blink Phases (phase = -step * 0.75)
surface(monatium_b, 730, 450, 155, 'steel', { id: 'MB-T1-P01', routeOrder: 1, nextId: 'MB-T1-P02' });
surface(monatium_b, 980, 345, 145, 'steel', { id: 'MB-T1-P02', routeOrder: 2, prevId: 'MB-T1-P01', nextId: 'MB-T1-B01' });
surface(monatium_b, 1190, 155, 140, 'steel', {
 id: 'MB-T1-B01', routeOrder: 3, prevId: 'MB-T1-P02', nextId: 'MB-T1-P03', requiresDashToNext: true,
 behavior: 'blink', blink: { on: 2.20, warning: 0.60, off: 0.80, phase: 0.00 }
});
// P03 is at y=60 (Δy=-285px from P02 -> impossible without B01; 310px horizontal gap from B01 -> mandatory Left 2-Jump + Air-Dash!)
surface(monatium_b, 730, 60, 150, 'steel', { id: 'MB-T1-P03', routeOrder: 4, prevId: 'MB-T1-B01', nextId: 'MB-T1-P04' });
surface(monatium_b, 730, -105, 150, 'steel', { id: 'MB-T1-P04', routeOrder: 5, prevId: 'MB-T1-P03', nextId: 'MB-T1-B02' });
surface(monatium_b, 965, -200, 135, 'steel', {
 id: 'MB-T1-B02', routeOrder: 6, prevId: 'MB-T1-P04', nextId: 'MB-T1-B03',
 behavior: 'blink', blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -0.75 }
});
surface(monatium_b, 1190, -305, 135, 'steel', {
 id: 'MB-T1-B03', routeOrder: 7, prevId: 'MB-T1-B02', nextId: 'MB-T1-B04',
 behavior: 'blink', blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -1.50 }
});
surface(monatium_b, 965, -405, 135, 'steel', {
 id: 'MB-T1-B04', routeOrder: 8, prevId: 'MB-T1-B03', nextId: 'MB-T1-P05',
 behavior: 'blink', blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -2.25 }
});
// P05 is at y=-660 (Δy=-195px from B04; Δy=-310px from B03 -> cannot skip B04!)
surface(monatium_b, 730, -615, 155, 'steel', {
 id: 'MB-T1-P05', routeOrder: 9, prevId: 'MB-T1-B04', nextId: 'MB-T1-STEP-R1', requiresDashToNext: true,
 role: '제1타워 정규 상승 최상단 좌측 발판'
});
// STEP-R1 is at x=1190, y=-745 (305px horizontal gap from P05 -> mandatory Right 2-Jump + Air-Dash `=>`; Δy=-280px from B04 -> cannot skip P05!)
surface(monatium_b, 1165, -690, 100, 'steel', {
 id: 'MB-T1-STEP-R1', routeOrder: 10, prevId: 'MB-T1-P05', nextId: 'MB-T1-EXIT',
 useSmallVisual: true
});
// Optional Special #1 Challenge Branch: STEP-R1 -> STEP-R2 (y=-910) ==[Left 2-Jump+Dash]==> SPEC-PAD (x=795, y=-950, Δy=-290px above P05 so P05 cannot jump straight up!)
surface(monatium_b, 1175, -860, 85, 'steel', {
 id: 'MB-T1-STEP-R2', specialBranch: 'MB-SPEC-01', challenge: 'special', useSmallVisual: true
});
surface(monatium_b, 795, -905, 90, 'steel', {
 id: 'MB-T1-SPEC-PAD', behavior: 'blink', specialBranch: 'MB-SPEC-01', challenge: 'special', useSmallVisual: true,
 blink: { on: 2.30, warning: 0.60, off: 0.80, phase: 0.00 }
});
surface(monatium_b, 1470, -745, 165, 'steel', { id: 'MB-T1-EXIT', routeOrder: 11, prevId: 'MB-T1-STEP-R1', nextId: 'MB-ARCH1-P01', checkpointSafe: true });

// --- 2. ARCH 1->2 BRIDGE (Expanded to 1,300px: x = 1700 .. 3000, y = -940 .. -560) ---
wall(monatium_b, 1700, -940, 1300, 32, 'steel', { id: 'MB-ARCH1-ROOF', ceiling: true, noTopLand: true });
wall(monatium_b, 1700, -560, 1300, 36, 'steel', { id: 'MB-ARCH1-BEAM', ceiling: true, noTopLand: true });
surface(monatium_b, 1840, -745, 165, 'steel', { id: 'MB-ARCH1-P01', routeOrder: 12, prevId: 'MB-T1-EXIT', nextId: 'MB-ARCH1-B01' });
surface(monatium_b, 2235, -780, 165, 'steel', {
 id: 'MB-ARCH1-B01', routeOrder: 13, prevId: 'MB-ARCH1-P01', nextId: 'MB-ARCH1-P02',
 behavior: 'blink', blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -0.50 }
});
surface(monatium_b, 2630, -745, 175, 'steel', { id: 'MB-ARCH1-P02', routeOrder: 14, prevId: 'MB-ARCH1-B01', nextId: 'MB-T2-BASE' });

// --- 3. TOWER 2 (x = 3000 .. 4100, y = 580 .. -2180) ---
// [REG-002]: MB-T2-GND removed so falling in Monatium B Tower 2 resets cleanly instead of trapping the player at y=580.
wall(monatium_b, 3000, -2180, 64, 1240, 'steel', { id: 'MB-T2-WALL-L-TOP', wallSide: 'left', noTopLand: true, portalBottom: true });
wall(monatium_b, 3000, -660, 64, 1240, 'steel', { id: 'MB-T2-WALL-L-BOT', wallSide: 'left', noTopLand: true });
wall(monatium_b, 3000, -2180, 1100, 36, 'steel', { id: 'MB-T2-ROOF', ceiling: true, noTopLand: true });
wall(monatium_b, 4036, -2180, 64, 240, 'steel', { id: 'MB-T2-WALL-R-TOP', wallSide: 'right', noTopLand: true, portalBottom: true });
wall(monatium_b, 4036, -1700, 64, 2280, 'steel', { id: 'MB-T2-WALL-R-BOT', wallSide: 'right', noTopLand: true });

surface(monatium_b, 3100, -745, 880, 'steel', { id: 'MB-T2-BASE', routeOrder: 15, prevId: 'MB-ARCH1-P02', nextId: 'MB-T2-M01', checkpointSafe: true });
surface(monatium_b, 3440, -905, 185, 'steel', { id: 'MB-T2-M01', routeOrder: 16, behavior: 'moving', motion: { axis: 'x', range: 200, period: 2.80, phase: 0.00 }, trackX1: 3240, trackX2: 3825 });
surface(monatium_b, 3440, -1065, 185, 'steel', { id: 'MB-T2-M02', routeOrder: 17, behavior: 'moving', motion: { axis: 'x', range: 200, period: 2.75, phase: 3.14 }, trackX1: 3240, trackX2: 3825 });
// P0-MB3: Forward-wave blink phases for MB-T2-MB01 -> MB02 -> MB03 (0.00 -> -0.85 -> -1.70)
surface(monatium_b, 3440, -1225, 180, 'steel', {
 id: 'MB-T2-MB01', routeOrder: 18, behavior: 'blink', moving: true,
 motion: { axis: 'x', range: 195, period: 2.85, phase: 0.00 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: 0.00 },
 trackX1: 3245, trackX2: 3815
});
surface(monatium_b, 3440, -1385, 180, 'steel', {
 id: 'MB-T2-MB02', routeOrder: 19, behavior: 'blink', moving: true,
 motion: { axis: 'x', range: 195, period: 2.85, phase: -1.10 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: -0.85 },
 trackX1: 3245, trackX2: 3815
});
surface(monatium_b, 3440, -1545, 185, 'steel', { id: 'MB-T2-M03', routeOrder: 20, behavior: 'moving', motion: { axis: 'x', range: 200, period: 2.65, phase: 1.00 }, trackX1: 3240, trackX2: 3825 });
surface(monatium_b, 3440, -1705, 185, 'steel', { id: 'MB-T2-M04', routeOrder: 21, behavior: 'moving', motion: { axis: 'x', range: 200, period: 2.60, phase: 3.80 }, trackX1: 3240, trackX2: 3825 });
surface(monatium_b, 3440, -1865, 180, 'steel', {
 id: 'MB-T2-MB03', routeOrder: 22, behavior: 'blink', moving: true,
 motion: { axis: 'x', range: 195, period: 2.70, phase: -2.20 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: -1.70 },
 trackX1: 3245, trackX2: 3815
});
surface(monatium_b, 3790, -1720, 240, 'steel', { id: 'MB-T2-SUMMIT-EXIT', routeOrder: 23, checkpointSafe: true });

// --- 4. SUMMIT ARCH 2->3 (Shortened to 1,350px: x = 4100 .. 5450, 3 Vertical Moving+Blinking Platforms in Camera View) ---
wall(monatium_b, 4100, -2120, 1350, 32, 'steel', { id: 'MB-SUMMIT-ROOF', ceiling: true, noTopLand: true });
wall(monatium_b, 4100, -1480, 1350, 42, 'steel', { id: 'MB-SUMMIT-ARCH-BEAM', ceiling: true, noTopLand: true });
surface(monatium_b, 4150, -1720, 125, 'steel', { id: 'MB-SUMMIT-STEP', routeOrder: 24, checkpointSafe: true });
surface(monatium_b, 4430, -1760, 135, 'steel', {
 id: 'MB-TOP-MVB-1', routeOrder: 25, behavior: 'blink', moving: true,
 motion: { axis: 'y', range: 125, period: 3.80, phase: 0.00 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: 0.00 },
 trackY1: -1885, trackY2: -1635
});
surface(monatium_b, 4745, -1760, 135, 'steel', {
 id: 'MB-TOP-MVB-2', routeOrder: 26, behavior: 'blink', moving: true,
 motion: { axis: 'y', range: 125, period: 3.80, phase: -0.90 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: -0.90 },
 trackY1: -1885, trackY2: -1635
});
surface(monatium_b, 5060, -1760, 135, 'steel', {
 id: 'MB-TOP-MVB-3', routeOrder: 27, behavior: 'blink', moving: true,
 motion: { axis: 'y', range: 125, period: 3.80, phase: -1.80 },
 blink: { on: 2.35, warning: 0.60, off: 0.85, phase: -1.80 },
 trackY1: -1885, trackY2: -1635
});

// --- 5. TOWER 3 (x = 5450 .. 6550, y = -2420 .. 580, Bottomless Pit under shaft, Exterior Right Skip Blocked) ---
wall(monatium_b, 5450, -2420, 64, 480, 'steel', { id: 'MB-T3-WALL-L-TOP', wallSide: 'left', noTopLand: true, portalBottom: true });
wall(monatium_b, 5450, -1700, 64, 2450, 'steel', { id: 'MB-T3-WALL-L-BOT', wallSide: 'left', noTopLand: true });
wall(monatium_b, 5450, -2420, 1100, 36, 'steel', { id: 'MB-T3-ROOF', ceiling: true, noTopLand: true });
wall(monatium_b, 6486, -2420, 64, 2760, 'steel', {
 id: 'MB-T3-WALL-R-TOP', wallSide: 'right', noTopLand: true, portalBottom: true,
 hazardExteriorRight: true,
 role: '제3타워 우측 외벽 (외벽 접촉 및 외벽 바깥 우회 낙하 시 즉시 체크포인트 리셋)'
});

surface(monatium_b, 5375, -1720, 185, 'steel', { id: 'MB-T3-ENTRY', routeOrder: 28, checkpointSafe: true });
// Optional Special #2 Challenge Branch: 3 forward-wave blinking steps (phase: 0.00 -> -0.75 -> -1.50)
surface(monatium_b, 5760, -1890, 92, 'steel', {
 id: 'MB-T3-B-SPEC1', behavior: 'blink', specialBranch: 'MB-SPEC-02', challenge: 'special', useSmallVisual: true,
 blink: { on: 2.20, warning: 0.60, off: 0.80, phase: 0.00 }
});
surface(monatium_b, 6010, -2060, 86, 'steel', {
 id: 'MB-T3-B-SPEC2', behavior: 'blink', specialBranch: 'MB-SPEC-02', challenge: 'special', useSmallVisual: true,
 blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -0.75 }
});
surface(monatium_b, 6260, -2230, 82, 'steel', {
 id: 'MB-T3-B-SPEC3', behavior: 'blink', specialBranch: 'MB-SPEC-02', challenge: 'special', useSmallVisual: true,
 blink: { on: 2.20, warning: 0.60, off: 0.80, phase: -1.50 }
});

surface(monatium_b, 5610, -1600, 720, 'steel', { id: 'MB-T3-TOP-BAR', routeOrder: 29, dropThroughDisabled: true, checkpointSafe: true });
surface(monatium_b, 5570, -1420, 180, 'steel', { id: 'MB-T3-P01-L', routeOrder: 30 });
surface(monatium_b, 6230, -1420, 180, 'steel', { id: 'MB-T3-P01-R', routeOrder: 30 });
surface(monatium_b, 5910, -1230, 175, 'steel', { id: 'MB-T3-M01', routeOrder: 31, behavior: 'moving', motion: { axis: 'x', range: 170, period: 2.65, phase: 0.00 }, trackX1: 5740, trackX2: 6255 });
surface(monatium_b, 5910, -1040, 175, 'steel', { id: 'MB-T3-M02', routeOrder: 32, behavior: 'moving', motion: { axis: 'x', range: 170, period: 2.65, phase: 3.14 }, trackX1: 5740, trackX2: 6255 });
surface(monatium_b, 5910, -850, 165, 'steel', { id: 'MB-T3-B01', routeOrder: 33, behavior: 'blink', blink: { on: 2.10, warning: 0.60, off: 0.85, phase: 0.00 } });
surface(monatium_b, 5590, -660, 155, 'steel', { id: 'MB-T3-B02-L', routeOrder: 34, behavior: 'blink', blink: { on: 2.10, warning: 0.60, off: 0.85, phase: -0.75 } });
surface(monatium_b, 6230, -660, 155, 'steel', { id: 'MB-T3-B02-R', routeOrder: 34, behavior: 'blink', blink: { on: 2.10, warning: 0.60, off: 0.85, phase: -0.75 } });
surface(monatium_b, 5910, -470, 175, 'steel', { id: 'MB-T3-M03', routeOrder: 35, behavior: 'moving', motion: { axis: 'x', range: 165, period: 2.55, phase: 0.50 }, trackX1: 5745, trackX2: 6250 });
surface(monatium_b, 5910, -285, 175, 'steel', { id: 'MB-T3-M04', routeOrder: 36, behavior: 'moving', motion: { axis: 'x', range: 165, period: 2.55, phase: 3.64 }, trackX1: 5745, trackX2: 6250 });
surface(monatium_b, 5910, -100, 175, 'steel', { id: 'MB-T3-M05', routeOrder: 37, behavior: 'moving', motion: { axis: 'x', range: 165, period: 2.55, phase: 1.20 }, trackX1: 5745, trackX2: 6250 });
surface(monatium_b, 5910, 80, 165, 'steel', { id: 'MB-T3-B03', routeOrder: 38, behavior: 'blink', blink: { on: 2.10, warning: 0.60, off: 0.85, phase: -1.50 } });
surface(monatium_b, 5660, 250, 140, 'steel', {
 id: 'MB-T3-MVB1', routeOrder: 39, behavior: 'blink', moving: true,
 motion: { axis: 'y', range: 90, period: 2.90, phase: 0.00 },
 blink: { on: 2.20, warning: 0.55, off: 0.80, phase: -2.25 },
 trackY1: 160, trackY2: 340
});
surface(monatium_b, 6190, 240, 140, 'steel', {
 id: 'MB-T3-MVB2', routeOrder: 40, behavior: 'blink', moving: true,
 motion: { axis: 'y', range: 90, period: 2.90, phase: 1.50 },
 blink: { on: 2.20, warning: 0.55, off: 0.80, phase: -2.75 },
 trackY1: 150, trackY2: 330
});
surface(monatium_b, 6020, 450, 220, 'steel', {
 id: 'MB-T3-M06', routeOrder: 41, behavior: 'moving',
 motion: { axis: 'x', range: 220, period: 2.80, phase: 0.30 },
 trackX1: 5800, trackX2: 6460
});

// --- 6. CITIZEN PLAZA (Starts at doorway threshold x = 6480 .. 8850; shaft 5514..6480 is bottomless pit!) ---
floor(monatium_b, 6480, 2370, 'pavement', 580, { id: 'MB-GND-PLAZA', routeOrder: 42, checkpointSafe: true });

// --- 7. MONATIUM B OFFICIAL GOLDEN CRAYONS (MB-SPEC-01 & MB-SPEC-02) ---
addSpecialCoinDef(
 monatium_b,
 'MB-SPEC-01',
 840,
 -941,
 '모나티엄 B 황금 크레파스 1 · 제1타워 좌상단 대시 포켓',
 { x1: 730, x2: 1640, maxY: 585, requireGround: true },
 {
  parentPlatformId: 'MB-T1-SPEC-PAD',
  localOffsetX: 45,
  localOffsetY: -36,
  requireLanding: true,
  allowedReturnPlatformIds: ['MB-T1-P05', 'MB-T1-STEP-R1', 'MB-T1-EXIT', 'MB-T1-GND']
 }
);

addSpecialCoinDef(
 monatium_b,
 'MB-SPEC-02',
 6301,
 -2266,
 '모나티엄 B 황금 크레파스 2 · 제3타워 최상단 3연속 점멸 포켓',
 { x1: 5375, x2: 6350, maxY: -1580, requireGround: true },
 {
  parentPlatformId: 'MB-T3-B-SPEC3',
  localOffsetX: 41,
  localOffsetY: -36,
  requireLanding: true,
  allowedReturnPlatformIds: ['MB-T3-ENTRY', 'MB-T3-TOP-BAR']
 }
);

addCandy(monatium_b, 'MB-C01', 805, 410, 'main');
addCandy(monatium_b, 'MB-C02', 1050, 305, 'main');
addCandy(monatium_b, 'MB-C03', 805, 20, 'main');
addCandy(monatium_b, 'MB-C04', 805, -700, 'main');
addCandy(monatium_b, 'MB-C05', 2315, -820, 'main');
addCandy(monatium_b, 'MB-C06', 3530, -945, 'main');
addCandy(monatium_b, 'MB-C07', 3530, -1585, 'main');
addCandy(monatium_b, 'MB-C08', 4495, -1810, 'main');
addCandy(monatium_b, 'MB-C09', 4810, -1810, 'main');
addCandy(monatium_b, 'MB-C10', 5125, -1810, 'main');
addCandy(monatium_b, 'MB-C11', 5970, -1640, 'main');
addCandy(monatium_b, 'MB-C12', 5990, -890, 'main');
addCandy(monatium_b, 'MB-C13', 6020, 410, 'main');
addCandy(monatium_b, 'MB-C14', 7050, 540, 'main');
addCandy(monatium_b, 'MB-C15', 7850, 540, 'main');
levels.push(monatium_b);

// ============================================================================
// SCENE 4: ERPIEN A (0 ~ 11,200px · 성문 0..5200 + 순수 배경 전환 5200..6800 + P0-E 1,300px 고도 확장 요정 구간 + P0-F 특수요정 머리 위 스치기 복구)
// ============================================================================
const erpien_a = makeLevel('erpien_a', '에르피엔 A', STAGE_ANCHORS.erpien_a.width, {
 minCamY: -1250, maxCamY: 140,
 backgroundRanges: {
  'erpien-gate': [0, 6400],
  'erpien-city': [5200, 20200]
 }
});
erpien_a.segments = [
 { start: 0, end: 5200, bg: 'erpien-gate', skin: 'gate', name: '외곽 성문', blockId: 'EA-1', indoor: false },
 { start: 5200, end: 5800, bg: 'erpien-gate', skin: 'gate', name: '성문 산책로', blockId: 'EA-BUF-1', indoor: false },
 { start: 5800, end: 6800, bg: 'erpien-city', skin: 'stone', name: '도심 진입 광장', blockId: 'EA-BUF-2', indoor: false },
 { start: 6800, end: 11200, bg: 'erpien-city', skin: 'stone', name: '에르피엔 A 요정 구간', blockId: 'EA-MAIN', indoor: false }
];

// --- E1. 외곽·성문 (0 ~ 5200, TEST23 원본 100% 보존) ---
floor(erpien_a, 0, 960, 'gate', 580, { id: 'E-GATE-GND1' });
checkpointAt(erpien_a, 150, '에르피엔 숲길', '', 580);
floor(erpien_a, 1400, 650, 'gate', 580, { id: 'E-GATE-GND2' });

checkpointAt(erpien_a, 1540, '성문 협곡 입구', '', 580);
surface(erpien_a, 2280, 465, 165, 'gate', { id: 'E-GATE-BLINK-1', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.70, off: 0.90, phase: 0.00 } });
surface(erpien_a, 2760, 400, 160, 'gate', { id: 'E-GATE-BLINK-2', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.70, off: 0.90, phase: 0.95 } });
floor(erpien_a, 3350, 600, 'gate', 580, { id: 'E-GATE-GND3' });

checkpointAt(erpien_a, 3500, '성문 갈림길', '', 580);
surface(erpien_a, 4120, 450, 175, 'gate', { id: 'E-GATE-HIGH-1' });
surface(erpien_a, 4480, 355, 170, 'gate', { id: 'E-GATE-HIGH-2' });
surface(erpien_a, 4300, 525, 165, 'gate', { id: 'E-GATE-LOW-1' });
floor(erpien_a, 4760, 440, 'gate', 580, { id: 'E-GATE-GND4', joinRight: true });

// --- 순수 배경 전환 완충 구간 (5200 ~ 6800, 요정·점멸·장애물 0개!) ---
floor(erpien_a, 5200, 600, 'gate', 580, { id: 'EA-BUFFER-GATE', joinLeft: true, joinRight: true });
floor(erpien_a, 5800, 1000, 'stone', 580, { id: 'EA-BUFFER-CITY', joinLeft: true, joinRight: true });
checkpointAt(erpien_a, 6350, '도심 외곽 진입로 (배경 전환 완료)', '', 580);

// --- [P0-E.3 & P0-F 해결]: 에르피엔 A 본격 요정 코스 (x = 6800 ~ 10800, 수직 고도 y = 580 ~ -720 총 1,300px 대확장!) ---
// 1. 좌측 하단 진입 지면 (x=6800..7210, y=580)
floor(erpien_a, 6800, 410, 'stone', 580, { id: 'EA-GND-ENTRY', checkpointSafe: true, joinLeft: true });
checkpointAt(erpien_a, 6920, '에르피엔 A · 요정 입구', '', 580);

// 2. 좌측 수직·지그재그 상승부 일반 발판 4개 (EA-P01 ~ EA-P04, 층간 약 260~280px로 확연한 수직 분리!)
// EA-P01 (y = 350, EA-F01 담당)
surface(erpien_a, 7240, 350, 410, 'stone', { id: 'EA-P01', role: '왼쪽 1층 상승 발판 (EA-F01 담당)' });
// EA-P02 (y = 70, EA-F02 담당)
surface(erpien_a, 7920, 70, 270, 'stone', { id: 'EA-P02', role: '왼쪽 2층 발판 (EA-F02 담당)' });
// EA-P03 (y = -280, EA-F03 담당) + 하부 차단 구조벽
surface(erpien_a, 7780, -280, 420, 'stone', { id: 'EA-P03', dropThroughDisabled: true, role: '왼쪽 3층 발판 (EA-F03 담당)' });
wall(erpien_a, 7785, -260, 410, 28, 'stone', { id: 'EA-WALL-P03-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true });
// EA-P04 (y = -620, EA-F04 담당) + 하부 차단 구조벽
surface(erpien_a, 7380, -620, 350, 'stone', { id: 'EA-P04', dropThroughDisabled: true, role: '왼쪽 4층 상단 발판 (EA-F04 담당)' });
wall(erpien_a, 7385, -600, 340, 26, 'stone', { id: 'EA-WALL-P04-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true });

// 3. [P0-F 해결]: 좌측 최상단 특수요정 분기 발판 (`EA-P-SPEC`, x=6820..7160, y=-640) 및 노란 특수자원 (`EA-SPECIAL-01`)
// - 기존 102px 천장 결함을 유발하던 낮은 천장을 제거하고, 상부 경계 구조물을 `y=-980` (발판 상면에서 340px 위!)에 배치하여
//   플레이어가 `EA-B01` (x=7180, y=-440) 또는 `EA-P-SPEC` 우측 끝에서 이단점프로 특수요정 `EA-FS01` (y=-640)의 머리 바로 위(`p.y <= -706`)를
//   아슬아슬하게 스치듯 뛰어넘어 좌측 자원 지점(`x=6865, y=-640`)에 무피격으로 착지할 수 있도록 기하학적으로 완벽히 복구!
surface(erpien_a, 6820, -640, 340, 'stone', { id: 'EA-P-SPEC', specialBranch: 'EA-SPECIAL-01', challenge: 'special', dropThroughDisabled: true });
wall(erpien_a, 6820, -980, 320, 28, 'stone', { id: 'EA-WALL-SPEC-ROOF', ceiling: true, noTopLand: true, horizontalBeam: true, role: '특수요정 상공 340px 충분한 점프 헤드룸이 확보된 상단 경계 보' });
addSpecialCoinDef(
 erpien_a, 'EA-SPECIAL-01', 6865, -676, '에르피엔 A · 특수요정 머리 위 이단점프 돌파 특수자원',
 { x1: 6800, x2: 8250, yMin: -730, yMax: 590 },
 {
  parentPlatformId: 'EA-P-SPEC', localOffsetX: 45, localOffsetY: -36, requireLanding: true,
  allowedReturnPlatforms: ['EA-P04', 'EA-P03', 'EA-P-CP', 'EA-P01', 'EA-GND-ENTRY']
 }
);

// 4. 회색 점멸 발판 정확히 10개 (EA-B01 ~ EA-B10, 1,300px 수직 스케일에 맞춰 고도차 정렬!)
// 좌측 상단~하단 4개 (EA-B01 ~ EA-B04)
surface(erpien_a, 7180, -440, 140, 'stone', { id: 'EA-B01', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.90, phase: 0.00 } });
surface(erpien_a, 7360, -260, 130, 'stone', { id: 'EA-B02', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.90, phase: 0.55 } });
surface(erpien_a, 7560, -100, 130, 'stone', { id: 'EA-B03', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.90, phase: 1.10 } });
surface(erpien_a, 7710, 210, 145, 'stone', { id: 'EA-B04', behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.90, phase: 1.65 } });
// 중앙 기둥 좌·우 중층 2개 (EA-B05, EA-B06)
surface(erpien_a, 8250, -140, 150, 'stone', { id: 'EA-B05', behavior: 'blink', silentBlink: true, blink: { on: 2.15, warning: 0.60, off: 0.90, phase: 0.30 } });
// [FIX8 Gate 4]: EA-B06 removed as Tier 3 (EA-P09) now extends flush to the central vertical pillar (x=8614..9820) per user's updated descent sketch!
// 우측 하단 장거리 점멸 연결 4개 (EA-B07 ~ EA-B10, y=540)
surface(erpien_a, 8730, 540, 380, 'stone', { id: 'EA-B07', routeOrder: 13, behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.80, phase: 0.00 } });
surface(erpien_a, 9260, 540, 130, 'stone', { id: 'EA-B08', routeOrder: 14, behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.80, phase: -0.45 } });
surface(erpien_a, 9510, 540, 130, 'stone', { id: 'EA-B09', routeOrder: 15, behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.80, phase: -0.90 } });
surface(erpien_a, 9760, 540, 130, 'stone', { id: 'EA-B10', routeOrder: 16, behavior: 'blink', silentBlink: true, blink: { on: 2.10, warning: 0.55, off: 0.80, phase: -1.35 } });

// 5. 중상부 초록 깃발 세이브 포인트 (`EA-P-CP`, x=7900..8160, y=-720)
surface(erpien_a, 7900, -720, 260, 'stone', { id: 'EA-P-CP', checkpointSafe: true, dropThroughDisabled: true });
wall(erpien_a, 7905, -700, 250, 24, 'stone', { id: 'EA-WALL-CP-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true });
checkpointAt(erpien_a, 8030, '에르피엔 A · 중상부 세이브 깃발', '', -720);

// 6. 중앙 최상단 긴 브릿지 (2요정 공유, `EA-P-TOP-C`, x=8330..9020, y=-680) 및 중앙 거대 수직 기둥 (`h=1212px`)
surface(erpien_a, 8330, -680, 690, 'stone', { id: 'EA-P-TOP-C', dropThroughDisabled: true, role: '중앙 최상단 긴 플랫폼 (EA-F05, EA-F06 2요정 공유)' });
wall(erpien_a, 8335, -660, 680, 28, 'stone', { id: 'EA-WALL-TOP-C', ceiling: true, noTopLand: true, underPlatformBeam: true });
wall(erpien_a, 8530, -632, 84, 1212, 'stone', { id: 'EA-WALL-COL-C', wallSide: 'both', noTopLand: true, role: '중앙 거대 수직 석조 기둥 (하부 무단 우회 차단)' });

// P0-EA1: Right 4-Tier ㄹ/S-Shaped Descent Route matching the red user trajectory sketch!
// Route: EA-P-TOP-C -> EA-P07 (right) -> drop through opening (9520..9680) -> EA-P08 (traverse left 9640->9160)
//        -> jump left to EA-B06 (8720..9020, y=-170) -> jump right over EA-F09 onto EA-P09 (9140..9520, y=20)
//        -> drop through opening (9520..9680) -> EA-P10 (traverse left 9640->9180) -> drop left onto EA-B07 -> hop right across EA-B08..B10 -> EXIT!
// [FIX8 Gate 4]: Complete 4-Tier Alternating ㄹ-Descent Structure matching 02_에르피엔A_하강부_사용자수정스케치.png!
// - Every tier has dropThroughDisabled: true + an inset underPlatformBeam (Down+Space drop-through is 100% blocked on all 4 tiers).
// - Tier 1 (EA-P07, x=9010..9820, y=-620): sealed on left with EA-P-TOP-C (x=9020), open ONLY at Right End (x=9820..10040, 220px wide).
// - Tier 2 (EA-P08, x=9010..10040, y=-300): sealed flush against Right Barrier Wall (x=10040), open ONLY at Left End (x=8614..9010, 396px wide).
// - Tier 3 (EA-P09, x=8614..9820, y=20): sealed flush against Central Pillar right face (x=8614) so dropping from Tier 2's left opening lands 100% on Tier 3! Open ONLY at Right End (x=9820..10040, 220px wide).
// - Tier 4 (EA-P10, x=8920..10040, y=350): sealed flush against Right Barrier Wall (x=10040), open ONLY at Left End (x=8614..8920, 306px wide) -> drops onto EA-B07..B10 (y=540) -> EA-GND-EXIT!
surface(erpien_a, 9010, -620, 810, 'stone', { id: 'EA-P07', routeOrder: 8, prevId: 'EA-P-TOP-C', nextId: 'EA-P08', dropThroughDisabled: true, role: '1단 상층 발판 (좌->우 끝까지 횡단 후 우측 개구부 x=9820..10040으로만 하강)' });
wall(erpien_a, 9010, -600, 810, 26, 'stone', { id: 'EA-WALL-P07-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true, role: '1단 하부 직하강 및 역점프 차단 석조 보' });

surface(erpien_a, 9010, -300, 1030, 'stone', { id: 'EA-P08', routeOrder: 9, prevId: 'EA-P07', nextId: 'EA-P09', dropThroughDisabled: true, role: '2단 상중층 발판 (우측 장벽 밀착, 우->좌 끝 x=9010까지 횡단 후 좌측 개구부로만 하강)' });
wall(erpien_a, 9010, -280, 1030, 26, 'stone', { id: 'EA-WALL-P08-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true, role: '2단 하부 직하강 및 우측 벽 틈새 우회 차단 석조 보' });

surface(erpien_a, 8614, 20, 1206, 'stone', { id: 'EA-P09', routeOrder: 10, prevId: 'EA-P08', nextId: 'EA-P10', dropThroughDisabled: true, role: '3단 중하층 발판 (중앙 기둥 우측면 x=8614 밀착, 좌->우 끝 x=9820까지 횡단 후 우측 개구부로만 하강)' });
wall(erpien_a, 8614, 40, 1206, 26, 'stone', { id: 'EA-WALL-P09-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true, role: '3단 하부 직하강 및 중앙 기둥 옆 수직 스킵 완전 차단 석조 보' });

surface(erpien_a, 8920, 350, 1120, 'stone', { id: 'EA-P10', routeOrder: 11, prevId: 'EA-P09', nextId: 'EA-B07', dropThroughDisabled: true, role: '4단 하층 발판 (우측 장벽 밀착, 2요정 돌파하며 우->좌 끝 x=8920까지 횡단 후 좌측 개구부로만 하강)' });
wall(erpien_a, 8920, 370, 1120, 26, 'stone', { id: 'EA-WALL-P10-UNDER', ceiling: true, noTopLand: true, underPlatformBeam: true, role: '4단 하부 직하강 및 우측 벽 틈새 우회 완전 차단 석조 보' });

// 8. 우측 끝 긴 수직 석조 차단벽 (x=10040, y=-950..465, h=1415px) 및 도심 연결 출구 지면
wall(erpien_a, 10040, -950, 76, 1415, 'stone', { id: 'EA-WALL-BARRIER-R', wallSide: 'both', noTopLand: true, role: '우측 상공 스킵 차단 수직 석조 장벽 (하단 통과 유도)' });
floor(erpien_a, 10200, 1000, 'stone', 580, { id: 'EA-GND-EXIT', checkpointSafe: true, joinRight: true });

levels.push(erpien_a);


// ============================================================================
// SCENE 5: ERPIEN B (0 ~ 21,000px · 기존 도심 마요 추격·마리 보스전·교단·엄마의 방 독립 씬)
// ============================================================================
const erpien_b = makeLevel('erpien_b', '에르피엔 B', STAGE_ANCHORS.erpien_b.width, {
 minCamY: -650, maxCamY: 140,
 backgroundRanges: {
  'erpien-city': [-4800, 12000],
  'erpien-home': [12000, 21000]
 }
});
erpien_b.segments = [
 { start: 0, end: 10500, bg: 'erpien-city', skin: 'stone', name: '도심 마요 추격', blockId: 'EB-1', indoor: false },
 { start: 10500, end: 12000, bg: 'erpien-city', skin: 'stone', name: '마리 보스 아레나', blockId: 'EB-2', indoor: false },
 { start: 12000, end: 16800, bg: 'erpien-home', skin: 'home', name: '교단 회랑', blockId: 'EB-3', indoor: true },
 { start: 16800, end: 21000, bg: 'erpien-home', skin: 'home', name: '엄마의 방', blockId: 'EB-4', indoor: true }
];

floor(erpien_b,0,1050,'stone',580,{id:'E-CITY-GND1',joinLeft:true});

// --- E2. 도심·마요 포획 추격 (Gate 4.3 & Gate 5: 5200 ~ 15700, 총 10,500px · 5단계 추격 압박 공간!) ---
// Beat 1 (5200~7650, Stage A 초반): 마요 등장(x=5500) -> 광장 처마 & 첫 단절 교량 도약
checkpointAt(erpien_b,160,'에르피엔 도심 입구','',580);
surface(erpien_b,540,480,195,'stone',{id:'E-CITY-01'});
surface(erpien_b,820,415,185,'stone',{id:'E-CITY-02'});
// Chasm E2-1 (6250..6720, 470px)
surface(erpien_b,1190,490,185,'stone',{id:'E-CITY-BRIDGE1'});
floor(erpien_b,1520,930,'stone',580,{id:'E-CITY-GND2'});
checkpointAt(erpien_b,1640,'도심 분수 광장','',580);
surface(erpien_b,1880,470,195,'stone',{id:'E-CITY-02B'});
surface(erpien_b,2180,400,190,'stone',{id:'E-CITY-02C'});

// Beat 2 (7650~9960, Stage A->B 전환): 추격 간격 압축 & 복층 빵집 처마 + 요정 #1 교차
// Chasm E2-2 (7650..8380, 730px)
surface(erpien_b,2600,475,180,'stone',{id:'E-CITY-03'});
surface(erpien_b,2890,405,180,'stone',{id:'E-CITY-04'});
floor(erpien_b,3180,940,'stone',580,{id:'E-CITY-GND3'});
checkpointAt(erpien_b,3300,'빵집 처마 거리','',580);
surface(erpien_b,3480,455,195,'stone',{id:'E-CITY-05'});
surface(erpien_b,3840,395,185,'stone',{id:'E-CITY-05B'});

// Beat 3 (9320~11680, Stage B 중반): 고가 연결통로 & 상층 처마 크레파스 E-CITY-C01 + 요정 #2
// Chasm E2-3 (9320..9960, 640px)
surface(erpien_b,4280,480,180,'stone',{id:'E-CITY-06'});
surface(erpien_b,4530,435,170,'stone',{id:'E-CITY-06B'});
// [Gate 10 (P0): E2 황금 크레파스 #8 `E-CITY-C01` — 전방 세로 차단벽 + 하향 통과 금지 + 좌향 역방향 후퇴 강제!]
// - `dropThroughDisabled: true` prevents `↓+SPACE` drop-through on `E-CITY-C01-P1..P3`.
// - `E-CITY-C01-WALL` (x=9802, y=-90..340, noTopLand:true) blocks jumping forward from P3 to E-CITY-GND4.
// - `E-CITY-C01-EAVES` (x=9345..9854, y=306..340, noTopLand:true) blocks dropping straight down from P2/P3 onto E-CITY-06/06B
//   and blocks climbing directly from the right, while leaving 95~140px clear headroom above main-route E-CITY-06 (y=480) & E-CITY-06B (y=435).
// - After acquiring `E-CITY-C01` on P3 (`PENDING`), Dudu MUST retreat leftward (`P3 -> P2 -> P1 -> E-CITY-05B / E-CITY-GND3`) while Mayo pursues!
surface(erpien_b,3920,285,88,'stone',{id:'E-CITY-C01-P1',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true,dropThroughDisabled:true});
surface(erpien_b,4210,210,80,'stone',{id:'E-CITY-C01-P2',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true,dropThroughDisabled:true});
surface(erpien_b,4510,195,76,'stone',{id:'E-CITY-C01-P3',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true,dropThroughDisabled:true});
wall(erpien_b,4602,-90,52,430,'stone',{id:'E-CITY-C01-WALL',wallSide:'right',noTopLand:true,role:'E-CITY-C01 전방 탈출 차단 세로벽(상단 착지 불가)'});
wall(erpien_b,4145,306,509,34,'stone',{id:'E-CITY-C01-EAVES',ceiling:true,noTopLand:true,role:'E-CITY-C01 직하강 탈출 및 우측 역진입 차단 처마(상단 착지 불가)'});
addSpecialCoinDef(
 erpien_b,'E-CITY-C01',4548,159,'도심 1 · 마요 추격 상층 처마 돌파 후 좌향 역방향 후퇴',
 {x1:3480,x2:5680,yMin:380,yMax:585},
 {parentPlatformId:'E-CITY-C01-P3',localOffsetX:38,localOffsetY:-36,requireLanding:true,
  allowedReturnPlatforms:['E-CITY-05B','E-CITY-05','E-CITY-GND3','E-CITY-06','E-CITY-06B','E-CITY-GND4','E-CITY-07']}
);

floor(erpien_b,4760,920,'stone',580,{id:'E-CITY-GND4'});
checkpointAt(erpien_b,4880,'도심 화단 골목','',580);
surface(erpien_b,5060,460,175,'stone',{id:'E-CITY-07'});
surface(erpien_b,5380,390,165,'stone',{id:'E-CITY-08'});
// Chasm E2-4 (10880..11680, 800px — 상·하 복층 교차 회피)
surface(erpien_b,5820,490,165,'stone',{id:'E-CITY-09A'});
surface(erpien_b,5980,380,155,'stone',{id:'E-CITY-09B'});
surface(erpien_b,6190,450,170,'stone',{id:'E-CITY-09C'});

// Beat 4 (11680~13360, Stage B->C 전환): 요정 #3 교차 & 고가 아치
floor(erpien_b,6480,940,'stone',580,{id:'E-CITY-GND5'});
checkpointAt(erpien_b,6600,'도심 고가 통로','',580);
surface(erpien_b,6780,460,185,'stone',{id:'E-CITY-10'});
surface(erpien_b,7120,390,180,'stone',{id:'E-CITY-10B'});
// Chasm E2-5 (12620..13360, 740px)
surface(erpien_b,7580,470,170,'stone',{id:'E-CITY-11'});
surface(erpien_b,7880,400,165,'stone',{id:'E-CITY-12'});

// Beat 5 (13360~15700, Stage C 최고 압박): 마요 고속 추격 + 2연발 바람총 + 마리 진입 직전 1,480px 다단 협곡 돌파
floor(erpien_b,8160,860,'stone',580,{id:'E-CITY-GND6'});
checkpointAt(erpien_b,8280,'마리 광장 접근로','',580);
surface(erpien_b,8480,465,175,'stone',{id:'E-CITY-12B'});
surface(erpien_b,8780,395,170,'stone',{id:'E-CITY-12C'});
// Chasm E2-6 (14220..15700, 1480px 연속 공중 회피 교량)
surface(erpien_b,9180,475,165,'stone',{id:'E-CITY-13'});
surface(erpien_b,9520,395,160,'stone',{id:'E-CITY-14'});
surface(erpien_b,9860,465,165,'stone',{id:'E-CITY-15'});
surface(erpien_b,10180,415,165,'stone',{id:'E-CITY-16'});

// --- E3. 마리 보스 아레나 (TEST20A 사용자 스케치 기준 한 화면 보스맵: 15700 ~ 17200, camZoom = 0.88, viewW = 1455) ---
// 1. 왼쪽 절벽 지면 (B-ENTRY-LEFT: x = 15700..16010, 상면 y = 520; x = 16010부터 넓은 낙사 구간 B-PIT 시작!)
floor(erpien_b,10500,310,'stone',520,{id:'B-ENTRY-LEFT',noAutoDecor:true,role:'좌측 진입 절벽 지면 (우측 x=16010부터 낙사 구간)'});
// 2. 중앙 하단 작은 시작·리셋 발판 (B-CENTER-SPAWN: x = 16305..16435, 상면 y = 540, 밑바닥 없는 낙사 구간 한가운데!)
surface(erpien_b,11105,540,130,'stone',{id:'B-CENTER-SPAWN',checkpointSafe:true,role:'전투 시작·리셋 안전 발판 (중앙 하단)'});
checkpointAt(erpien_b,11170,'마리 광장 진입로','',540);
// 3. 중앙 상단 마리 전용 높은 발판 (B-MARIE-PODIUM: x = 16295..16445, 상면 y = 305, 시작 발판 바로 위!)
surface(erpien_b,11095,305,150,'stone',{id:'B-MARIE-PODIUM',mariePodium:true,role:'마리 전용 중앙 상단 발판'});
// 4. 좌측 부유 유도·회피 발판 3개 (B-LEFT-PAD-A, B-LEFT-PAD-B, B-LEFT-PAD-C)
surface(erpien_b,10885,445,105,'stone',{id:'B-LEFT-PAD-C',useSmallVisual:true,role:'중앙->좌측 연결 부유 발판'});
surface(erpien_b,10655,345,105,'stone',{id:'B-LEFT-PAD-A',useSmallVisual:true,role:'좌측 중층 회피/접근 부유 발판'});
surface(erpien_b,10805,215,115,'stone',{id:'B-LEFT-PAD-B',useSmallVisual:true,role:'좌측 상층 마요 탄환 유도 핵심 발판'});
// 5. 우측 부유 회피·출구 연결 발판 3개 (B-RIGHT-PAD-A, B-RIGHT-PAD-B, B-RIGHT-PAD-C)
surface(erpien_b,11305,435,100,'stone',{id:'B-RIGHT-PAD-A',useSmallVisual:true,role:'중앙->우측 회피 부유 발판'});
surface(erpien_b,11425,325,100,'stone',{id:'B-RIGHT-PAD-B',useSmallVisual:true,specialBranch:'E-CITY-C02',challenge:'special',role:'우측 상층 이동 및 황금 크레파스 #9 발판'});
surface(erpien_b,11435,475,95,'stone',{id:'B-RIGHT-PAD-C',useSmallVisual:true,role:'우측 출구 지면 연결 부유 발판'});
// 6. 오른쪽 지면 (B-EXIT-RIGHT: x = 16750..17200, 상면 y = 520; 마요 배치x=16890 및 전투 종료 후 교단 출구!)
floor(erpien_b,11550,450,'stone',520,{id:'B-EXIT-RIGHT',joinRight:true,noAutoDecor:true,role:'우측 마요 사격 지면 및 교단 연결 출구'});
// 7. 오른쪽 높은 출구 차단 세로벽 (B-EXIT-WALL: x = 17010..17074, y = -140..520; 마요 총구x=16848보다 오른쪽에 위치, 상단 착지 불가!)
wall(erpien_b,11810,-140,64,660,'stone',{id:'B-EXIT-WALL',wallSide:'right',wallRole:'boss_exit_wall',noTopLand:true,bossExitWall:true,role:'전투 완료 전 출구 및 상공 스킵 완전 차단 세로벽'});

// [E3 황금 크레파스 #9: E-CITY-C02 (보스 아레나 우측 상층 B-RIGHT-PAD-B 연동)]
addSpecialCoinDef(
 erpien_b,'E-CITY-C02',11475,289,'광장 2 · 마리 아레나 우측 상공 발판',
 {x1:11550,x2:13000,yMin:480,yMax:590},
 {parentPlatformId:'B-RIGHT-PAD-B',localOffsetX:50,localOffsetY:-36,requireLanding:true}
);

// --- E4. 교단 화단·회랑 (17200 ~ 22000, 보스 아레나 우측 지면 B-EXIT-RIGHT에서 텔레포트 없이 바로 연결!) ---
floor(erpien_b,12000,1060,'home',580,{
 id:'E-HOME-GND1',joinLeft:true,
 customDecorations:[
  {key:'erpien_b/decoration_home_pedestal',x:12380,walkOffset:114,scale:0.58},
  {key:'erpien_b/decoration_home_pedestal',x:12820,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien_b,12220,'교단 복도','',580);
checkpointAt(erpien_b,12940,'교단 화단 입구','',580);

surface(erpien_b,13210,510,145,'home',{id:'E-HOME-01'});
surface(erpien_b,13510,355,130,'home',{id:'E-HOME-02'});
surface(erpien_b,13815,455,135,'home',{id:'E-HOME-03'});

floor(erpien_b,14080,760,'home',580,{
 id:'E-HOME-GND2',
 customDecorations:[
  {key:'erpien_b/decoration_home_pedestal',x:14460,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien_b,14200,'교단 중앙 회랑','',580);

surface(erpien_b,14990,485,135,'home',{
 id:'E-HOME-04',behavior:'blink',silentBlink:true,
 blink:{on:1.85,warning:0.60,off:0.85,phase:0.00}
});
surface(erpien_b,15310,395,130,'home',{
 id:'E-HOME-05',behavior:'blink',silentBlink:true,
 blink:{on:1.85,warning:0.60,off:0.85,phase:0.85}
});
surface(erpien_b,15625,470,135,'home',{id:'E-HOME-06'});

floor(erpien_b,15880,920,'home',580,{
 id:'E-HOME-GND3',joinRight:true,
 customDecorations:[
  {key:'erpien_b/decoration_home_pedestal',x:16360,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien_b,16040,'교단 열주 회랑','',580);

// --- E5. 중앙 나무에서 엄마의 방 (22000 ~ 26200, goal.x = 25750) ---
floor(erpien_b,16800,4200,'home',580,{
 id:'E-HOME-GND4',joinLeft:true,
 customDecorations:[
  {key:'erpien_b/decoration_home_pedestal',x:17350,walkOffset:114,scale:0.58},
  {key:'erpien_b/decoration_home_pedestal',x:18450,walkOffset:114,scale:0.58},
  {key:'erpien_b/decoration_home_pedestal',x:19450,walkOffset:114,scale:0.58},
  {key:'erpien_b/decoration_home_pedestal',x:20180,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien_b,17100,'중앙 나무','',580);
checkpointAt(erpien_b,19200,'엄마의 방 앞','',580);
erpien_b.goal={x:STAGE_ANCHORS.erpien_b.goalX,y:580,w:150,h:190};

// Erpien 36 Manual Forward-Path King Candies (E-C01 ~ E-C36)
for(const [idx,[cx,cy]] of [
 // E1 Gate (7)
 [560,542],[1180,465],[1720,542],[2360,427],[2840,362],[3650,542],[4667,398],
 // E2 Mayo City (15)
 [635,442],[1280,452],[1975,432],[2690,437],[2980,367],[3575,417],[4370,442],[5145,422],
 [5900,452],[6275,412],[6870,422],[7665,432],[8565,427],[9260,437],[9940,427],
 // E3 Marie Boss Arena (6)
 [10660,482],[10937,407],[10707,307],[10862,177],[11355,397],[11630,482],
 // E4 & E5 Temple Sanctuary & Sacred Tree to Mom's Room (8)
 [12620,542],[13282,472],[13575,317],[14460,542],[15057,447],[15375,357],[18200,542],[19950,542]
].entries()){
 addCandy(erpien_b,`E-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(erpien_b);
// TEST28: Single source of truth for official gold crayon HUD and the priority ending.
const _allSpecialDefs = levels.flatMap(lv => lv.specialDefs);
const _specialIdSet = new Set(_allSpecialDefs.map(d => d.id));
if (_specialIdSet.size !== _allSpecialDefs.length) {
 throw new Error('[TEST28] Duplicate golden-crayon ID detected across scenes.');
}
TOTAL_SPECIAL_COINS = _specialIdSet.size; // 7 (Monatium A) + 2 (Monatium B) + 1 (Erpien A) + 2 (Erpien B) = 12

function currentSegment(){const lv=getActiveLevel();return lv.segments.find(s=>p.x>=s.start&&p.x<s.end)||lv.segments.at(-1);}

function getKillY(x){
 const curId = currentLevelId();
 if (curId === 'monatium_a' || curId === 'monatium') {
  if (x >= STAGE_ANCHORS.monatium_a.skywalkStart && x <= STAGE_ANCHORS.monatium_a.skywalkEnd) return -1200;
  return 850;
 }
 if (curId === 'monatium_b') {
  const mb = STAGE_ANCHORS.monatium_b;
  if (x >= mb.summitStart && x < mb.summitEnd) return -1350;
  return 780;
 }
 if (curId === 'erpien_b' || curId === 'erpien') {
  const e = STAGE_ANCHORS.erpien_b;
  if (x >= e.arenaOrigin && x <= (e.arenaOrigin + e.arenaWidth)) return 720;
  return 850;
 }
 return 850;
}

const specialCoinTransitionLog=[];
window.__specialCoinTransitionLog=specialCoinTransitionLog;

function isSpecialCoinReturnSafe(sc){
 if(!p.ground||!p.on||p.on.collidable===false||p.on.blinkState==='off')return false;
 if(p.on.specialBranch===sc.id||p.on.challenge==='special')return false;
 if(sc.parentPlatformId&&p.on.id===sc.parentPlatformId)return false;
 if(Array.isArray(sc.allowedReturnPlatforms)&&sc.allowedReturnPlatforms.includes(p.on.id)){
  return true;
 }
 const z=sc.returnZone;
 if(!z)return true;
 if(p.x<z.x1||p.x>z.x2)return false;
 if(p.y<z.yMin||p.y>z.yMax)return false;
 if(z.excludeX1!==undefined&&p.x>=z.excludeX1&&p.x<=z.excludeX2)return false;
 return true;
}

function syncSpecialCoinPositions(){
 if(typeof specialCoins==='undefined'||!specialCoins.length)return;
 for(const sc of specialCoins){
  if(sc.parentPlatformId){
   const pl=platforms.find(a=>a.id===sc.parentPlatformId);
   if(pl){
    sc.x=Math.round(pl.x+(sc.localOffsetX||0));
    sc.y=Math.round(pl.y+(sc.localOffsetY||0));
   }
  }
 }
}

function syncSpecialCoinsForLevel(index){
 const l=levels[index];
 const secSet=activeSpecialSet();
 specialCoins=(l.specialDefs||[]).map(d=>({
  ...d,
  state:setForCoin(d).has(d.id)?'secured':'available',
  pulse:0
 }));
 syncSpecialCoinPositions();
}

function resetPendingSpecialCoins(){
 const secSet=activeSpecialSet();
 for(const sc of specialCoins){
  sc.state=setForCoin(sc).has(sc.id)?'secured':'available';
  sc.pulse=0;
 }
 syncSpecialCoinPositions();
 updateHud();
}

function updateSpecialCoins(dt){
 const secSet=activeSpecialSet();
 let changed=false;
 syncSpecialCoinPositions();
 for(const sc of specialCoins){
  sc.pulse+=dt;
  if(sc.state==='available'){
   let canAcquire=false;
   if(sc.parentPlatformId||sc.requireLanding){
    const pl=platforms.find(a=>a.id===sc.parentPlatformId);
    if(pl&&pl.collidable!==false&&pl.blinkState!=='off'&&p.ground&&p.on&&p.on.id===sc.parentPlatformId&&Math.abs(p.x-sc.x)<36&&Math.abs(p.y-pl.y)<8){
     canAcquire=true;
    }
   }else{
    if(Math.abs(p.x-sc.x)<34&&Math.abs((p.y-34)-sc.y)<44){
     canAcquire=true;
    }
   }
    if(canAcquire){
     sc.state='pending';
     specialCoinTransitionLog.push({id:sc.id,from:'available',to:'pending',platformId:p.on?.id||'air',px:Math.round(p.x),py:Math.round(p.y),t:Number((typeof time==='number'?time:0).toFixed(2))});
     burst(sc.x,sc.y,'#ffcf56',12);
     tone(740,.08,'triangle',.045);
     if(typeof playDuduVoice==='function')playDuduVoice('special_coin');
     changed=true;
    }
   }else if(sc.state==='pending'){
    if(isSpecialCoinReturnSafe(sc)){
     sc.state='secured';
     setForCoin(sc).add(sc.id);
     specialCoinTransitionLog.push({id:sc.id,from:'pending',to:'secured',platformId:p.on?.id||'ground',px:Math.round(p.x),py:Math.round(p.y),t:Number((typeof time==='number'?time:0).toFixed(2))});
     burst(p.x,p.y-45,'#ffae2b',16);
     tone(980,.14,'sine',.05);
     changed=true;
    }
   }
 }
 if(changed)updateHud();
}

function loadLevel(index,{atEnd=false,section=0}={}){
 if(levels[levelIndex]&&coins.length){
  coins.forEach(c=>{if(c.got)collectedByLevel[levelIndex].add(c.id);});
 }
 levelIndex=index;visited[index]=true;const l=levels[index];END=l.worldWidth;platforms.length=0;
 for(const a of l.platforms){
  add(a.x,a.y,a.w,a.h,a.thin,{
   ...a,
   motion:a.motion?{...a.motion}:null,
   blink:a.blink?{...a.blink}:null,
   visual:a.visual?{...a.visual}:makeVisualMeta(l,a.x,a.y,a.w,a.skin,a)
  });
 }
 for(const a of platforms){
  if(!a.groundTile)continue;
  a.joinLeft=a.joinLeft||platforms.some(b=>b!==a&&b.groundTile&&Math.abs(b.y-a.y)<4&&Math.abs((b.x+b.w)-a.x)<=2);
  a.joinRight=a.joinRight||platforms.some(b=>b!==a&&b.groundTile&&Math.abs(b.y-a.y)<4&&Math.abs(b.x-(a.x+a.w))<=2);
 }
 sections.splice(0,sections.length,...l.sections.map(s=>({...s})));
 flags.splice(0,flags.length,...sections.slice(1).map(s=>({x:s.x,y:s.y})));
 saved=new Set(collectedByLevel[index]);
 coins=(l.regularDefs||[]).map(d=>({
  id:d.id,
  levelId:d.levelId,
  x:d.x,
  y:d.y,
  category:d.category||'main',
  got:saved.has(d.id)
 }));
 syncSpecialCoinsForLevel(index);
 checkpoint=atEnd?sections.length-1:section;levelClock=0;reset();
 if(atEnd){
  p.x=END-240;p.y=580;p.on=platforms.find(a=>!a.wall&&!a.ceiling&&p.x>=a.x&&p.x<=a.x+a.w&&Math.abs(a.y-580)<6);
  p.ground=!!p.on;cam=Math.max(0,END-W);p.face=-1;
  if(typeof syncRenderCoords==='function')syncRenderCoords();
 }
 updateHud();updateRegionHud();
}

function resetJourney(){
 if(typeof resetVillageFriendRunState==='function')resetVillageFriendRunState();
 for(const s of collectedByLevel)s.clear();
 securedSpecialEvent.clear();
 if(typeof resetErpienEncounterState==='function')resetErpienEncounterState();
 visited.fill(false);routeDone.fill(false);journeyResult=null;coins=[];loadLevel(0);
}

function resetPlatforms(){
 levelClock=0;
 for(const a of platforms){
  if(a.motion){
   const offset=Math.sin(a.motion.phase||0)*a.motion.range;
   if(a.motion.axis==='x'){
    a.x=a.baseX+offset;
    a.y=a.baseY;
   }else{
    a.x=a.baseX;
    a.y=a.baseY+offset;
   }
  }else{
   a.x=a.baseX;
   a.y=a.baseY;
  }
  a.prevX=a.x;
  a.prevY=a.y;
  a.dx=0;
  a.dy=0;
  if(a.blink){
   const b=a.blink;
   const onDur=b.on??2.0,warnDur=b.warning??0.55,offDur=b.off??0.95;
   const cycle=onDur+warnDur+offDur;
   const t=((b.phase||0)%cycle+cycle)%cycle;
   if(t<onDur){a.collidable=true;a.blinkState='on';a.blinkAlpha=1;}
   else if(t<onDur+warnDur){a.collidable=true;a.blinkState='warning';a.blinkAlpha=a.silentBlink?0.48:0.65;}
   else{a.collidable=false;a.blinkState='off';a.blinkAlpha=a.silentBlink?0.03:0.12;}
  }else{
   a.collidable=true;
   a.blinkState='on';
   a.blinkAlpha=1;
  }
 }
 syncSpecialCoinPositions();
}

function clearRegionTransitionLayer(){
 transition=null;
 const rt=$('regionTransition'),tc=$('transitionCanvas'),cap=$('transitionCaption');
 if(rt)rt.hidden=true;
 if(cap)cap.classList.remove('visible');
 if(tc){const tctx=tc.getContext('2d');tctx.clearRect(0,0,tc.width,tc.height);}
}
function drawCloudTransitionFrame(progress,phase){
 const tc=$('transitionCanvas'),cap=$('transitionCaption');
 if(!tc)return;
 const tctx=tc.getContext('2d');
 tctx.clearRect(0,0,tc.width,tc.height);
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const readyFrames=transitionFrames.filter(Boolean);
 if(!reduced&&readyFrames.length===TRANSITION_FRAME_COUNT){
  const idx=Math.max(0,Math.min(TRANSITION_FRAME_COUNT-1,Math.round(progress*(TRANSITION_FRAME_COUNT-1))));
  const im=transitionFrames[idx];
  if(im)tctx.drawImage(im,0,0,tc.width,tc.height);
 }else{
  tctx.save();tctx.fillStyle='#f8fbff';tctx.globalAlpha=Math.max(0,Math.min(1,progress));tctx.fillRect(0,0,tc.width,tc.height);tctx.restore();
 }
 if(cap){
  if(progress>=0.72||phase==='hold')cap.classList.add('visible');
  else cap.classList.remove('visible');
 }
}
function beginRegionTransition(target,back=false){
 if (levels[target] && typeof ensureWorldRegionAssets === 'function') {
  ensureWorldRegionAssets(levels[target].id);
 }
 if(state!=='playing'||transition||journeyResult)return;
 resetPendingSpecialCoins();
 routeDone[levelIndex]=!back||routeDone[levelIndex];
 const session=++transitionSessionId;
 transition={
  session,target,back,
  phase:'closing',phaseTime:0,
  closeDur:0.65,holdDur:0.18,openDur:0.65,
  loaded:false
 };
 state='regionTransition';
 keys.clear();
 p.vx=0;p.vy=0;
 $('regionTransition').hidden=false;
 $('transitionName').textContent=levels[target].name;
 const secCount=activeSpecialSet().size;
 $('transitionHint').textContent=back?'잠시 돌아가는 길':(currentLevelId()==='monatium'?`황금 크레파스 ${secCount}/${TOTAL_SPECIAL_COINS} · 엄마에게 한 걸음 더 가까이`:'엄마에게 한 걸음 더 가까이');
 drawCloudTransitionFrame(0,'closing');
}
function regionTick(dt){
 if(state!=='regionTransition'||scenePaused||!transition)return;
 const tr=transition;
 if(tr.session!==transitionSessionId){clearRegionTransitionLayer();return;}
 const stepDt=Math.min(dt,0.08);
 tr.phaseTime+=stepDt;
 if(tr.phase==='closing'){
  const u=Math.min(1,tr.phaseTime/tr.closeDur);
  drawCloudTransitionFrame(u,'closing');
  if(u>=1){
   if(!tr.loaded){
    loadLevel(tr.target,{atEnd:tr.back});
    tr.loaded=true;
    draw();
   }
   tr.phase='hold';
   tr.phaseTime=0;
  }
 }else if(tr.phase==='hold'){
  drawCloudTransitionFrame(1,'hold');
  if(tr.phaseTime>=tr.holdDur){
   tr.phase='opening';
   tr.phaseTime=0;
  }
 }else if(tr.phase==='opening'){
  const u=1-Math.min(1,tr.phaseTime/tr.openDur);
  drawCloudTransitionFrame(u,'opening');
  if(tr.phaseTime>=tr.openDur){
   clearRegionTransitionLayer();
   state='playing';
   keys.clear();
   last=performance.now();
   acc=0;
   if(typeof syncRenderCoords==='function')syncRenderCoords();
   canvas.focus();
  }
 }
}
function updateRegionHud(){
 const l=levels[levelIndex];
 $('zoneTitle').textContent=l.name;
 $('routeLabel').textContent=(eventMode||state==='ready'||state==='loading'?'본편':'연습 · 기록 제외')+'  '+(levelIndex+1)+' / '+levels.length;
 for(let i=0;i<levels.length;i++){
  const b=$('badge'+i);
  if(b)b.textContent=(routeDone[i]?'✓ ':levelIndex===i?'● ':'○ ')+levels[i].name;
 }
}
function checkJourney() {
 if (state !== 'playing') return;
 // TEST24 FIX8.2: preserve TEST23 tournament challenge goal dispatch.
 // Challenge mode has its own level goals and must not use story scene transitions.
 if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
  if (typeof checkChallengeJourney === 'function') checkChallengeJourney();
  return;
 }
 if (typeof gameMode !== 'undefined' && gameMode === 'world') {
  if (typeof checkWorld1Journey === 'function') checkWorld1Journey();
  return;
 }
 if (transition || journeyResult) return;
 const lv = getActiveLevel();
 if (!lv) return;

 // Final ending check: ONLY erpien_b has goal!
 if (lv.id === 'erpien_b' && lv.goal) {
  if (Math.abs(p.x - lv.goal.x) < 48 && Math.abs(p.y - lv.goal.y) < 64) {
   if (eventMode) {
    if (typeof finishEvent === 'function') finishEvent('cleared');
   } else {
    state = 'practiceDone';
    if (typeof modal === 'function') modal('모험 완성!', '두두가 사메리 마마의 품에 안겼어요!', '무사히 집으로 돌아왔습니다!<br>수고했어요, 두두!', '다시 모험하기');
   }
   return;
  }
 }

 // Forward transition to next scene
 if (p.x >= (lv.worldWidth - 140) && p.ground && levelIndex < (levels.length - 1)) {
  beginRegionTransition(levelIndex + 1, false);
  return;
 }

 // Backward transition to previous scene
 if (p.x <= 75 && p.ground && levelIndex > 0) {
  beginRegionTransition(levelIndex - 1, true);
  return;
 }
}
function practiceRegion(n){
 if(state==='loading')return;
 leaveEvent();
 clearRegionTransitionLayer();
 securedSpecialPractice.clear();
 if(typeof resetErpienEncounterState==='function')resetErpienEncounterState();
 const erpIdx=levels.findIndex(lv=>lv.id==='erpien');
 if(n===4&&erpIdx>=0){
  loadLevel(erpIdx,{section:Math.max(0,levels[erpIdx].sections.findIndex(s=>s.title==='교단 복도'))});
 }else{
  loadLevel(Math.min(n,levels.length-1),{section:0});
 }
 state='playing';updateRegionHud();keys.clear();canvas.focus();
}
const _worldAssetPromises = new Map();
function _loadSingleWorldImg(store, key, url, failSoft = true) {
 if (store[key]) return Promise.resolve(store[key]);
 if (_worldAssetPromises.has(url)) return _worldAssetPromises.get(url);
 const p = new Promise((ok, no) => {
  const im = new Image();
  im.onload = async () => {
   try { if (im.decode) await im.decode(); } catch (e) {}
   store[key] = im;
   ok(im);
  };
  im.onerror = (err) => {
   if (failSoft) { console.warn('[AssetLoader] Soft-fail on:', url); ok(null); }
   else no(err);
  };
  im.src = url;
 });
 _worldAssetPromises.set(url, p);
 return p;
}

const REGION_WORLD_BG_MAP = {
 forest: ['forest-bg'],
 village: ['village-bg'],
 monatium_a: ['city-bg'],
 monatium_b: ['city-bg'],
 erpien_a: ['erpien-gate', 'erpien-city'],
 erpien_b: ['erpien-city', 'erpien-home'],
 world1: ['w1-meadow-bg', 'w1-forest-bg', 'w1-tree-interior-placeholder', 'w1-deep-forest-bg', 'w1-forest-exit-bg', 'village-bg']
};

const REGION_TERRAIN_PREFIX_MAP = {
 forest: ['forest/'],
 village: ['village/', 'forest/'],
 monatium_a: ['monatium/'],
 monatium_b: ['monatium/'],
 erpien_a: ['erpien/'],
 erpien_b: ['erpien/'],
 world1: ['forest/', 'village/']
};

function ensureWorldRegionAssets(regionId) {
 const bgs = REGION_WORLD_BG_MAP[regionId] || worldFiles;
 const prefixes = REGION_TERRAIN_PREFIX_MAP[regionId] || ['forest/', 'village/', 'monatium/', 'erpien/'];
 const tasks = [];
 for (const bg of bgs) {
  tasks.push(_loadSingleWorldImg(worldImages, bg, 'assets/world/' + bg + '.webp?v=30', true));
 }
 for (const k of TERRAIN_ASSET_LIST) {
  if (prefixes.some(pf => k.startsWith(pf))) {
   tasks.push(_loadSingleWorldImg(terrainImages, k, 'assets/terrain/' + k + '.webp?v=30', true));
  }
 }
 if (regionId === 'monatium_a' || regionId === 'monatium_b') {
  for (const s of STRUCTURE_ASSET_LIST) {
   tasks.push(_loadSingleWorldImg(structureImages, s, 'assets/structure/' + s + '.webp?v=30', true));
  }
 }
 if (typeof ensureNpcRegionAssets === 'function') {
  tasks.push(ensureNpcRegionAssets(regionId));
 }
 return Promise.all(tasks);
}
window.ensureWorldRegionAssets = ensureWorldRegionAssets;

function preloadRemainingWorldAssetsInBackground() {
 const schedule = ['village', 'monatium_a', 'erpien_a', 'erpien_b', 'world1'];
 schedule.forEach((reg, idx) => {
  setTimeout(() => { ensureWorldRegionAssets(reg); }, 180 + idx * 220);
 });
 setTimeout(() => {
  for (let i = 0; i < TRANSITION_FRAME_COUNT; i++) {
   _loadSingleWorldImg(transitionFrames, i, `assets/transition/cloud_${String(i).padStart(2,'0')}.webp?v=16`, true);
  }
  for (const s of STRUCTURE_ASSET_LIST) {
   _loadSingleWorldImg(structureImages, s, 'assets/structure/' + s + '.webp?v=30', true);
  }
  for (const bg of worldFiles) {
   _loadSingleWorldImg(worldImages, bg, 'assets/world/' + bg + '.webp?v=30', true);
  }
  for (const k of TERRAIN_ASSET_LIST) {
   _loadSingleWorldImg(terrainImages, k, 'assets/terrain/' + k + '.webp?v=30', true);
  }
 }, 400);
}
window.preloadRemainingWorldAssetsInBackground = preloadRemainingWorldAssetsInBackground;

async function loadWorldImages(){
 // Tier 1 (Boot): Load collectibles + Stage 1 (forest) background & forest terrain tiles first
 const colLoads = ['king_candy','golden_crayon'].map(k => _loadSingleWorldImg(collectibleImages, k, 'assets/collectibles/' + k + '.png?v=16', false));
 await Promise.all([...colLoads, ensureWorldRegionAssets('forest')]);
}
