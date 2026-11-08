'use strict';
// TEST16 World Definition (Full Structural, Art, AI & Level Design Correction — 69,000px total):
// - Gate 1 (P0): Suin Village (0~7800) strict 3-type separation: BACKGROUND_PROP (cottages/stalls/gate with reserved decorFootprint), DECORATION (flowers/lamps/fences), and COLLIDABLE_PLATFORM (zero overlap with building footprints).
// - Gate 2 (P1): Monatium M2 (4300~5984) 17-step multi-column vertical ascent tower (3~4 columns, mandatory diagonal 2-jumps dY=-165..-185px, air-braking, 64~135px widths) + asymmetric C-branches M-UP-01 & M-UP-02.
// - Gate 3 (P1): Monatium M5-G2 (16000~19500) & M5-G4 (22400~24000) Guard Bridge + Blinking Exit Relay survival sequences (cliff -> guard bridge -> survive/evade while blink relay is OFF -> jump/dash when ON -> safe exit).
// - Gate 4 & 5 (P0/P1): Erpien E1 (0~5200) focused on 3 core challenges + E2 (5200~15700, 10,500px) 5-stage architectural Mayo pursuit + E3 (15700~19000) Marie Plaza + E4/E5 (19000~28000) Temple & Mom's Room.
// - Gate 6 (P0): Zero non-tutorial signs or checkpoint hint text outside Suin Forest.

const STAGE_ANCHORS={
 forest:{
  width:7400,
  exitX:7300
 },
 village:{
  width:7800,
  exitX:7700
 },
 monatium:{
  width:26800,
  skywalkShift:1000,
  m1End:4300,
  ascentStart:4300,
  ascentEnd:5984,
  ascentCenterX:5142,
  roofY:-1785,
  skywalkStart:5984,
  skywalkMidStart:7920,
  skywalkMidEnd:8440,
  skywalkStage2End:9930,
  skywalkStage3Start:10250,
  skywalkEnd:12320,
  descentStart:12320,
  descentEnd:13520,
  descentCenterX:12920,
  guardsStart:13520,
  g1End:17000,
  g2End:20500,
  g3End:23400,
  g4End:25000,
  bukgyeongStart:25000,
  bukgyeongBldgX:26180,
  bukgyeongDoorX:26465
 },
 erpien:{
  width:26200,
  gateEnd:5200,
  mayoActivateX:5500,
  cityStageBStart:8850,
  cityStageCStart:12400,
  cityEnd:15700,
  marieStart:15700,
  arenaOrigin:15700,
  arenaWidth:1455,
  pitLeftX:16010,
  pitRightX:16750,
  centerSpawnX:16370,
  centerSpawnY:540,
  mariePerchX:16370,
  mariePerchY:305,
  mayoBossX:16890,
  mayoBossY:520,
  exitWallX:17010,
  marieStage2X:16100,
  marieStage3X:16400,
  marieFinaleX:16700,
  marieEnd:17150,
  templeStart:17200,
  sacredTreeStart:22000,
  goalX:25750
 }
};
window.STAGE_ANCHORS=STAGE_ANCHORS;

const levels=[];let levelIndex=0,levelClock=0,transition=null,journeyResult=null;
const collectedByLevel=[new Set(),new Set(),new Set(),new Set()],visited=[true,false,false,false],routeDone=[false,false,false,false];
const worldImages={},worldFiles=['forest-bg','village-bg','city-bg','erpien-gate','erpien-city','erpien-home'];
const collectibleImages={};
const transitionFrames=[];const TRANSITION_FRAME_COUNT=20;let transitionSessionId=0;

const TOTAL_SPECIAL_COINS=9;
const securedSpecialEvent=new Set();
const securedSpecialPractice=new Set();
let specialCoins=[];

function getActiveLevel(){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'&&typeof challengeLevels!=='undefined'&&challengeLevels[challengeStageIndex]){
  return challengeLevels[challengeStageIndex];
 }
 return levels[levelIndex];
}
function currentLevelId(){const lv=getActiveLevel();return lv?lv.id:'';}
function activeSpecialSet(){return eventMode?securedSpecialEvent:securedSpecialPractice;}
function totalRegularCandyCount(){return levels.reduce((acc,lv)=>acc+(lv.regularDefs?lv.regularDefs.length:0),0);}
function collectedRegularCandyCount(){
 return levels.reduce((acc,lv,idx)=>{
  if(idx===levelIndex&&typeof coins!=='undefined'&&coins.length){
   return acc+coins.filter(c=>c.got).length;
  }
  return acc+(collectedByLevel[idx]?collectedByLevel[idx].size:0);
 },0);
}

function makeLevel(id,name,width,{minCamY=-650,maxCamY=140,backgroundRanges={}}={}){
 return {
  id,name,worldWidth:width,minCamY,maxCamY,backgroundRanges,
  platforms:[],sections:[],signs:[],segments:[],regularDefs:[],specialDefs:[],
  villageProps:[],decorFootprints:[],goal:null
 };
}
function makeVisualMeta(l,x,y,w,skin,extra){
 const ground=!!extra.groundTile;
 const variant=ground?'ground':extra.wall?'wall':extra.ceiling?'ceiling':w<=155?'single_small':w<=225?'single_medium':'modular';
 const seed=Math.abs(((Math.round(x)*73856093)^(Math.round(y)*19349663)^(Math.round(w)*83492791)^((l.platforms.length+1)*2654435761))|0)||17;
 return {material:skin,variant,seed,decorations:extra.decorations||null};
}

function surface(l,x,y,w,skin='grass',extra={}){
 const visual=extra.visual||makeVisualMeta(l,x,y,w,skin,extra);
 const id=extra.id||`${l.id.toUpperCase()}-P${String(l.platforms.length+1).padStart(2,'0')}`;
 const behavior=extra.behavior||(extra.blink?'blink':extra.motion?'moving':'static');
 const challenge=extra.challenge||(extra.specialBranch?'special':'main');
 const assetType=extra.wall?'STRUCTURAL_WALL':extra.ceiling?'STRUCTURAL_CEILING':extra.groundTile?'GROUND_SURFACE':'COLLIDABLE_PLATFORM';
 const a={
  id,assetType,x,y,w,h:20,thin:true,skin,visual,
  behavior,
  motion:extra.motion||null,
  blink:extra.blink||null,
  collidable:true,
  blinkState:'on',
  blinkAlpha:1,
  challenge,
  checkpointSafe:Boolean(extra.checkpointSafe),
  ...extra
 };
 l.platforms.push(a);return a;
}
function floor(l,x,w,skin='grass',y=580,extra={}){
 return surface(l,x,y,w,skin,{h:360,thin:false,groundTile:true,checkpointSafe:true,...extra});
}
function wall(l,x,y,w,h,skin='steel',extra={}){
 return surface(l,x,y,w,skin,{h,thin:false,wall:true,...extra});
}
// Gate 6 (P0): Only allow checkpoint hint text in Suin Forest (l.id === 'forest')!
function checkpointAt(l,x,title,hint='',y=580){
 const safeHint=(l.id==='forest')?hint:'';
 l.sections.push({x,y,title,hint:safeHint});
}
// Gate 6 (P0): Only allow tutorial signs in Suin Forest (l.id === 'forest')!
function sign(l,x,y,text){
 if(l.id!=='forest')return;
 l.signs.push({x,y,text});
}
function addCandy(l,id,x,y,category='main'){
 l.regularDefs.push({id,levelId:l.id,x:Math.round(x),y:Math.round(y),category});
}
function addSpecialCoinDef(l,id,x,y,label,returnZone,extra={}){
 l.specialDefs.push({id,levelId:l.id,x,y,label,returnZone,...extra});
}

// Gate 1 (P0): Explicit separation of BACKGROUND_PROP and DECORATION with reserved footprint tracking
function addStageProp(l,{id,assetType='BACKGROUND_PROP',layer='background',key,x,anchorBottom=580,walkOffset=180,scale=0.60,rawW=300,rawH=200,pad=24}){
 const dw=Math.round(rawW*scale);
 const dh=Math.round(rawH*scale);
 const fp={
  id,assetType,layer,key,x:Math.round(x),anchorBottom:Math.round(anchorBottom),
  walkOffset,scale,dw,dh,
  x1:Math.round(x-dw*0.5-pad),
  x2:Math.round(x+dw*0.5+pad),
  y1:Math.round(anchorBottom-walkOffset*scale),
  y2:Math.round(anchorBottom)
 };
 l.villageProps.push(fp);
 if(assetType==='BACKGROUND_PROP'){
  l.decorFootprints.push({id,x1:fp.x1,x2:fp.x2,y:anchorBottom,key});
 }
 return fp;
}

// ============================================================================
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
// V1 Background Props & Decorations (Strictly in x = 220..980; ZERO floating platforms in 0..1100!)
addStageProp(village,{id:'V-DEC-SIGN-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_signpost',x:260,anchorBottom:580,walkOffset:165,scale:0.52,rawW:183,rawH:169,pad:12});
addStageProp(village,{id:'V-PROP-HOUSE-A',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_a',x:560,anchorBottom:580,walkOffset:242,scale:0.66,rawW:419,rawH:246,pad:30});
addStageProp(village,{id:'V-DEC-LAMP-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:810,anchorBottom:580,walkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-DEC-FENCE-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_fence_short',x:950,anchorBottom:580,walkOffset:98,scale:0.54,rawW:185,rawH:102,pad:12});
// V1 Collidable Platforms (Strictly in x = 1140..1830 over open lawn & stream 1560..1920!)
surface(village,1160,505,190,'village',{id:'V-STEP-01'});
surface(village,1630,490,200,'village',{id:'V-BRIDGE-01'});

// --- V2 (1920 ~ 4160): 마을 장터 (1920..3180 가판대·오두막 전용 광장 / 3240..4160 시냇물 징검다리 도약) ---
floor(village,1920,1720,'village',580,{id:'V-GND-02',noAutoDecor:true});
checkpointAt(village,2040,'마을 장터 광장','',580);
// V2 Background Props & Decorations (Strictly in x = 2120..3120; ZERO floating platforms in 1920..3220!)
addStageProp(village,{id:'V-DEC-LAMP-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:2170,anchorBottom:580,walkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-PROP-STALL-01',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_stall',x:2400,anchorBottom:580,walkOffset:184,scale:0.60,rawW:311,rawH:188,pad:28});
addStageProp(village,{id:'V-DEC-BUSH-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_bush_flower',x:2620,anchorBottom:580,walkOffset:98,scale:0.50,rawW:207,rawH:102,pad:10});
addStageProp(village,{id:'V-PROP-HOUSE-B',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_b',x:2910,anchorBottom:580,walkOffset:288,scale:0.66,rawW:455,rawH:292,pad:30});
// V2 Collidable Platforms (Strictly in x = 3260..4110 after the market buildings & across stream 3640..4160!)
surface(village,3260,500,195,'village',{id:'V-MARKET-01'});
surface(village,3710,485,175,'village',{id:'V-STREAM-01'});
surface(village,3935,450,175,'village',{id:'V-STREAM-02'});

// --- V3 (4160 ~ 6220): 오두막 정원 (4160..5080 오두막·꽃밭 관람 산책로 / 5140..6220 얕은 단차·시냇물 도약) ---
floor(village,4160,1580,'village',580,{id:'V-GND-03',noAutoDecor:true});
checkpointAt(village,4280,'덩굴 오두막 정원','',580);
// V3 Background Props & Decorations (Strictly in x = 4380..5040; ZERO floating platforms in 4160..5120!)
addStageProp(village,{id:'V-DEC-LUPINE-01',assetType:'DECORATION',layer:'midground',key:'village/decoration_lupine',x:4410,anchorBottom:580,walkOffset:108,scale:0.52,rawW:177,rawH:112,pad:10});
addStageProp(village,{id:'V-PROP-HOUSE-C',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_house_c',x:4690,anchorBottom:580,walkOffset:286,scale:0.66,rawW:451,rawH:290,pad:30});
addStageProp(village,{id:'V-DEC-FENCE-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_fence_long',x:5000,anchorBottom:580,walkOffset:100,scale:0.52,rawW:344,rawH:103,pad:12});
// V3 Collidable Platforms (Strictly in x = 5160..6060 in the open clearing & over stream 5740..6220!)
surface(village,5160,495,195,'village',{id:'V-GARDEN-01'});
surface(village,5460,440,200,'village',{id:'V-GARDEN-02'});
surface(village,5860,485,200,'village',{id:'V-BRIDGE-02'});

// --- V4 (6220 ~ 7800): 마을 출구 대문 (6360..6555 단일 낮은 발판 / 6700..7600 출구 가판대·대문 평지) ---
floor(village,6220,1580,'village',580,{id:'V-GND-04',noAutoDecor:true});
checkpointAt(village,6300,'마을 출구 대문','',580);
surface(village,6400,505,190,'village',{id:'V-EXIT-01'});
// V4 Background Props & Decorations (Strictly in x = 6740..7620; ZERO floating platforms in 6600..7800!)
addStageProp(village,{id:'V-PROP-STALL-02',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_stall',x:6860,anchorBottom:580,walkOffset:184,scale:0.60,rawW:311,rawH:188,pad:28});
addStageProp(village,{id:'V-DEC-LAMP-03',assetType:'DECORATION',layer:'midground',key:'village/decoration_lamp',x:7110,anchorBottom:580,walkOffset:186,scale:0.56,rawW:140,rawH:190,pad:12});
addStageProp(village,{id:'V-PROP-GATE',assetType:'BACKGROUND_PROP',layer:'background',key:'village/decoration_gate',x:7360,anchorBottom:580,walkOffset:128,scale:0.64,rawW:271,rawH:131,pad:24});
addStageProp(village,{id:'V-DEC-SIGN-02',assetType:'DECORATION',layer:'midground',key:'village/decoration_signpost',x:7580,anchorBottom:580,walkOffset:165,scale:0.52,rawW:183,rawH:169,pad:12});

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
const city=makeLevel('monatium','모나티엄',STAGE_ANCHORS.monatium.width,{
 minCamY:-2250,maxCamY:160,
 backgroundRanges:{'city-bg':[0,26800]}
});
city.segments=[
 {start:0,end:4300,bg:'city-bg',skin:'road',name:'모나티엄',blockId:'M1',indoor:false},
 {start:4300,end:5984,bg:'city-bg',skin:'steel',name:'모나티엄',blockId:'M2',indoor:true},
 {start:5984,end:11320,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M3',indoor:false},
 {start:11320,end:12520,bg:'city-bg',skin:'steel',name:'모나티엄',blockId:'M4',indoor:true},
 {start:12520,end:24000,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M5',indoor:false},
 {start:24000,end:25800,bg:'city-bg',skin:'pavement',name:'모나티엄',blockId:'M6',indoor:false}
];

// --- M1. 도시 진입 (0 ~ 4300) ---
floor(city,0,1080,'road',580,{id:'M1-GND-A'});
checkpointAt(city,150,'모나티엄 진입로','',580);
surface(city,680,515,190,'steel',{id:'M1-STEP-01'});
surface(city,940,455,195,'steel',{id:'M1-STEP-02'});

floor(city,1240,1000,'pavement',580,{id:'M1-GND-B'});
surface(city,1260,395,340,'pavement',{id:'M1-OVERPASS-1',rooftop:true});
surface(city,1720,380,360,'pavement',{id:'M1-OVERPASS-2',rooftop:true});
surface(city,1520,495,180,'steel',{id:'M1-LOW-STEP'});
checkpointAt(city,2140,'고가 연결로','',580);

surface(city,2340,485,220,'steel',{id:'M1-BRIDGE-1'});
surface(city,2840,450,240,'steel',{id:'M1-BRIDGE-2'});
surface(city,3210,490,210,'steel',{id:'M1-BRIDGE-3'});
floor(city,2420,980,'road',580,{id:'M1-GND-C'});

floor(city,3560,2424,'pavement',580,{id:'M1-GND-D'});
surface(city,3680,510,185,'steel',{id:'M1-FORECOURT-1'});
checkpointAt(city,4140,'상승 타워 입구','',580);

// --- M2. 제1수직상승타워 (Gate 2 P1 전면 재설계: 다열(3~4열) 불규칙 스윕 + 대각선 2단 점프 필수 단차 165~185px + 제동·반전) ---
wall(city,4300,-1945,64,2305,'steel',{id:'M-WALL-ASC-L',wallSide:'left',wallRole:'ascent_left',portalBottom:true});
wall(city,5920,-1715,64,2295,'steel',{id:'M-WALL-ASC-R',wallSide:'right',wallRole:'ascent_right'});
wall(city,5920,-1995,64,80,'steel',{id:'M-WALL-ASC-RH',wallSide:'right',wallRole:'ascent_right_header',portalBottom:true});
wall(city,4300,-1995,1684,50,'steel',{id:'M-WALL-ASC-CAP',wallSide:'left',wallRole:'ascent_roof_cap'});

// Pattern 1 (1~5단, y = 495 .. -60): 3열 우측 스윕 워밍업 -> 좌측 반전 대각선 2단 점프(ΔY=-165px > 141.7px 1단 한계!)
surface(city,4680,495,135,'steel',{id:'M-ASC-01',towerStep:1});
surface(city,4970,380,125,'steel',{id:'M-ASC-02',towerStep:2});
surface(city,5280,250,120,'steel',{id:'M-ASC-03',towerStep:3});
surface(city,5010,105,115,'steel',{id:'M-ASC-04',towerStep:4});
surface(city,4710,-60,112,'steel',{id:'M-ASC-05',towerStep:5}); // ΔY=-165px: 1단 점프 불가, 대각선 2단 점프 필수!

// Pattern 2 (6~11단, y = -195 .. -970): 불규칙 가로폭·대각선 2단 점프(ΔY=-180~-185px) & 중층 체크포인트
surface(city,5030,-195,165,'pavement',{id:'M-ASC-06',towerStep:6,checkpointSafe:true});
checkpointAt(city,5112,'타워 상승 초중반','',-195);
surface(city,5370,-375,104,'steel',{id:'M-ASC-07',towerStep:7}); // ΔY=-180px: 대각선 2단 점프 필수!
surface(city,5110,-515,96,'steel',{id:'M-ASC-08',towerStep:8,useSmallVisual:true});
surface(city,4790,-700,90,'steel',{id:'M-ASC-09',towerStep:9,useSmallVisual:true}); // ΔY=-185px: 좌상향 대각선 2단 점프 필수!
surface(city,5070,-835,86,'steel',{id:'M-ASC-10',towerStep:10,useSmallVisual:true});
surface(city,5350,-970,150,'pavement',{id:'M-ASC-11',towerStep:11,checkpointSafe:true});
checkpointAt(city,5425,'타워 상승 상단 입구','',-970);

// Pattern 3 (12~17단, y = -1150 .. -1785): 정상부 고난도 연속 정밀 착지 (82->78->74->70->64->70px, 대각선 2단점프+공중제동, 실패 시 2~4단 재등반)
surface(city,5050,-1150,82,'steel',{id:'M-ASC-12',towerStep:12,useSmallVisual:true}); // ΔY=-180px: 대각선 2단 점프 필수!
surface(city,4750,-1295,78,'steel',{id:'M-ASC-13',towerStep:13,useSmallVisual:true});
surface(city,5030,-1480,74,'steel',{id:'M-ASC-14',towerStep:14,useSmallVisual:true}); // ΔY=-185px: 우상향 반전 2단 점프 + 제동!
surface(city,5310,-1610,70,'steel',{id:'M-ASC-15',towerStep:15,useSmallVisual:true});
surface(city,5020,-1755,64,'steel',{id:'M-ASC-16',towerStep:16,useSmallVisual:true}); // 64px 초소형 정밀 반전 착지!
surface(city,5290,-1785,70,'steel',{id:'M-ASC-17',towerStep:17,useSmallVisual:true});

// [Section 6-2: M2 황금 크레파스 #1: M-UP-01 — P1(4460,-115) -> P2(4385,-295) -> 2단점프+공중대시 필수 고립 도약 P3(4755,-430, gap=298px, dY=-135px) -> 정점 포켓 P4(4510,-575, w=64) -> 대시 없이 안전 복귀 가능한 징검발판 RET(4830,-310) 경유 M-ASC-06 복귀!]
surface(city,4460,-115,76,'steel',{id:'M-UP-01-P1',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(city,4385,-295,72,'steel',{id:'M-UP-01-P2',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
// From P2 (right edge 4457, y=-295) to P3 (left edge 4755, y=-430): dx=298px, dy=-135px -> 1-jump/2-jump alone maxes at ~245px; 2-jump + air-dash is mandatory!
surface(city,4755,-430,66,'steel',{id:'M-UP-01-P3',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(city,4510,-575,64,'steel',{id:'M-UP-01-P4',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
surface(city,4840,-310,74,'steel',{id:'M-UP-01-RET',specialBranch:'M-UP-01',challenge:'special',useSmallVisual:true});
addSpecialCoinDef(
 city,'M-UP-01',4542,-611,'상승 1 · 중층 2단점프+대시 고립 포켓',
 {x1:4650,x2:6440,yMin:-1820,yMax:120},
 {
  parentPlatformId:'M-UP-01-P4',localOffsetX:32,localOffsetY:-36,requireLanding:true,
  allowedReturnPlatforms:['M-ASC-04','M-ASC-05','M-ASC-06','M-ASC-07','M-ASC-08','M-ASC-09','M-ASC-10','M-ASC-11','M-ASC-12','M-ASC-13','M-ASC-14','M-ASC-15','M-ASC-16','M-ASC-17','M-SKY-ENTRY']
 }
);

// [M2 황금 크레파스 #2: M-UP-02 — M-ASC-15에서 우측 외곽 진입(74px) -> 고도 조절·방향 반전 소형 포켓(68px) -> 차양(M-UP-02-CEIL) 회피 복귀]
surface(city,5520,-1720,395,'steel',{id:'M-UP-02-CEIL',thin:false,h:26,ceiling:true,challenge:'special'});
surface(city,5565,-1545,74,'steel',{id:'M-UP-02-P1',specialBranch:'M-UP-02',challenge:'special',useSmallVisual:true});
surface(city,5785,-1620,68,'steel',{id:'M-UP-02-P2',specialBranch:'M-UP-02',challenge:'special',useSmallVisual:true});
addSpecialCoinDef(
 city,'M-UP-02',5819,-1656,'상승 2 · 정상 외곽 고도조절 포켓',
 {x1:4740,x2:5390,yMin:-1790,yMax:-1280},
 {parentPlatformId:'M-UP-02-P2',localOffsetX:34,localOffsetY:-36,requireLanding:true}
);

// --- M3. 총 3단계 점멸 스카이워크 (Gate G5 P1: +1,000px 수평 도약 간격 확장 · x = 5984 ~ 12320, y = -1830 ~ -1730) ---
surface(city,5520,-1785,920,'pavement',{id:'M-SKY-ENTRY',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,6160,'모나티엄 옥상 입구','',-1785);

// 제1구간 (6528~7760, 수평 빈 간격 162px -> 212~214px로 +30% 확장, 발판 폭 148px 유지)
surface(city,6528,-1780,148,'steel',{id:'M-SKY-01',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.00}});
surface(city,6888,-1780,148,'steel',{id:'M-SKY-02',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.85}});
surface(city,7250,-1775,148,'steel',{id:'M-SKY-03',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:1.70}});
surface(city,7612,-1775,148,'steel',{id:'M-SKY-04',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:2.55}});

// 제1전망 데크 (+280px 이동)
surface(city,7920,-1770,280,'pavement',{id:'M-SKY-SAFE1',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,8060,'스카이워크 제1전망교','',-1770);
surface(city,8220,-1820,220,'pavement',{id:'M-SKY-VISTA',thin:true,rooftop:true,checkpointSafe:true});

// 제2구간 (8532~9748, 수평 빈 간격 158px -> 216px로 +36% 확장, 엇박 위상 및 발판 폭 142px 유지) + M-SKY-C01 (LOCK-2 보존)
surface(city,8532,-1765,142,'steel',{id:'M-SKY-05',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:0.15}});
surface(city,8890,-1760,142,'steel',{id:'M-SKY-06',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:1.62}});
surface(city,9248,-1755,142,'steel',{id:'M-SKY-07',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:0.38}});
surface(city,9606,-1750,142,'steel',{id:'M-SKY-08',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.32,warning:0.46,off:0.82,phase:1.84}});

surface(city,9248,-1625,88,'steel',{
 id:'M-SKY-C01-P',specialBranch:'M-SKY-C01',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,ultraFastBlink:true,
 blink:{on:0.75,warning:0.15,off:0.45,phase:0.20}
});
addSpecialCoinDef(
 city,'M-SKY-C01',9292,-1661,'스카이워크 · 초고속 점멸(1.35s) 하부 착지 회수',
 {x1:7920,x2:12300,yMin:-1840,yMax:-1670},
 {parentPlatformId:'M-SKY-C01-P',localOffsetX:44,localOffsetY:-36,requireLanding:true}
);

// 제2전망 데크 (+600px 이동)
surface(city,9930,-1745,310,'pavement',{id:'M-SKY-SAFE2',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,10080,'스카이워크 제2전망교','',-1745);

// 제3구간 상하 교차 점멸 (10336~11725, 수평 빈 간격 104~117px -> 174~189px 확장, 엇박 위상 및 발판 폭 128~136px 유지)
surface(city,10336,-1740,136,'steel',{id:'M-SKY-09',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.10}});
surface(city,10646,-1830,132,'steel',{id:'M-SKY-10',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:1.72}});
surface(city,10963,-1735,132,'steel',{id:'M-SKY-11',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.42}});
surface(city,11280,-1825,128,'steel',{id:'M-SKY-12',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:1.95}});
surface(city,11597,-1735,128,'steel',{id:'M-SKY-13',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.45,warning:0.48,off:0.82,phase:0.68}});

surface(city,11870,-1730,514,'pavement',{id:'M-SKY-EXIT',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,12120,'옥상 하강 입구','',-1730);

// --- M4. 제2수직하강타워 (SKY_SHIFT = +1000 적용: x = 12320 ~ 13520, 내부 바닥 0px 무바닥 피트 + 최종 고속 이동발판 M-DSC-FINAL 필수) ---
wall(city,12320,-1985,64,80,'steel',{id:'M-WALL-DSC-LH',wallSide:'left',wallRole:'descent_left_header',portalBottom:true});
wall(city,12320,-1705,64,2285,'steel',{id:'M-WALL-DSC-L',wallSide:'left',wallRole:'descent_left'});
wall(city,13456,-1985,64,2341,'steel',{id:'M-WALL-DSC-R',wallSide:'right',wallRole:'descent_right',portalBottom:true});
wall(city,12320,-1985,1200,48,'steel',{id:'M-WALL-DSC-CAP',wallSide:'right',wallRole:'descent_roof_cap'});

surface(city,12420,-1560,165,'steel',{id:'M-DSC-01',descentStep:1,behavior:'static'});
surface(city,12920,-1305,155,'steel',{id:'M-DSC-02',descentStep:2,behavior:'moving',motion:{axis:'x',range:105,period:2.75,phase:0.00}});
surface(city,12540,-1050,150,'steel',{id:'M-DSC-03',descentStep:3,behavior:'moving',motion:{axis:'x',range:95,period:2.95,phase:1.57}});
surface(city,12890,-795,150,'steel',{id:'M-DSC-04',descentStep:4,behavior:'moving',motion:{axis:'x',range:95,period:2.60,phase:0.80}});
surface(city,12580,-540,185,'pavement',{id:'M-DSC-05',descentStep:5,behavior:'static',checkpointSafe:true});
checkpointAt(city,12672,'하강 타워 중상단','',-540);
surface(city,12930,-285,150,'steel',{id:'M-DSC-06',descentStep:6,behavior:'moving',motion:{axis:'x',range:100,period:2.55,phase:2.10}});
surface(city,12600,-30,180,'pavement',{id:'M-DSC-07',descentStep:7,behavior:'static',checkpointSafe:true});
checkpointAt(city,12690,'하강 타워 하단','',-30);
surface(city,12540,225,148,'steel',{id:'M-DSC-08',descentStep:8,behavior:'moving',motion:{axis:'x',range:95,period:2.45,phase:1.20}});

surface(city,12920,485,165,'steel',{
 id:'M-DSC-FINAL',descentStep:9,behavior:'moving',fastMoving:true,
 motion:{axis:'x',range:175,period:2.10,phase:0.00}
});

surface(city,13240,-920,92,'steel',{
 id:'M-DOWN-01-P',specialBranch:'M-DOWN-01',challenge:'special',useSmallVisual:true,
 behavior:'moving',fastMoving:true,motion:{axis:'x',range:85,period:1.85,phase:0.40}
});
addSpecialCoinDef(
 city,'M-DOWN-01',13286,-954,'하강 1 · 우측 외벽 고속 이동 발판 착지',
 {x1:12420,x2:13100,yMin:-810,yMax:-20},
 {parentPlatformId:'M-DOWN-01-P',localOffsetX:46,localOffsetY:-34,requireLanding:true}
);

surface(city,12480,355,88,'steel',{
 id:'M-DOWN-02-P',specialBranch:'M-DOWN-02',challenge:'special',useSmallVisual:true,
 behavior:'moving',fastMoving:true,motion:{axis:'x',range:80,period:1.75,phase:2.10}
});
addSpecialCoinDef(
 city,'M-DOWN-02',12524,321,'하강 2 · 좌측 피트 상공 고속 이동 발판 착지',
 {x1:12740,x2:14200,yMin:470,yMax:590},
 {parentPlatformId:'M-DOWN-02-P',localOffsetX:44,localOffsetY:-34,requireLanding:true}
);

// --- M5. 진압반 4종 전술 블록 (SKY_SHIFT = +1000 일괄 반영: 13456 ~ 25060) ---
floor(city,13456,624,'road',580,{id:'M-G1-GND1'});
checkpointAt(city,13720,'진압반 제1구역','',580);
surface(city,14240,500,145,'steel',{id:'M-G1-STEP1'});
surface(city,14520,455,290,'pavement',{id:'M-G1-LOW1'});
wall(city,14640,175,52,185,'steel',{id:'M-G1-BAFFLE1'});
surface(city,14940,495,135,'steel',{id:'M-G1-EXIT1'});
floor(city,15180,440,'road',580,{id:'M-G1-GND2'});
checkpointAt(city,15340,'진압반 제1교차점','',580);
surface(city,15790,480,310,'pavement',{id:'M-G1-LOW2'});
wall(city,15920,195,52,190,'steel',{id:'M-G1-BAFFLE2'});
surface(city,16280,385,165,'steel',{id:'M-G1-HIGH2'});
floor(city,16660,340,'road',580,{id:'M-G1-GND3',joinRight:true});

// M5-G2 (17000 ~ 20500)
floor(city,17000,420,'pavement',580,{id:'M-G2-ENTRY'});
checkpointAt(city,17120,'진압반 공중 교량','',580);
surface(city,17660,475,300,'steel',{id:'M-GRD-BR1',thin:true});
wall(city,18030,190,56,195,'steel',{id:'M-G2-BAFFLE1'});
surface(city,18190,435,155,'steel',{
 id:'M-G2-BLINK1',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.50,warning:0.45,off:1.15,phase:0.80}
});
surface(city,17700,555,115,'steel',{
 id:'M-G2-TRENCH-L',behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:0.00}
});
surface(city,17910,555,105,'steel',{
 id:'M-GUARD-01-P',specialBranch:'M-GUARD-01',challenge:'special',
 behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:0.55}
});
surface(city,18110,525,115,'steel',{
 id:'M-G2-TRENCH-R',behavior:'blink',fastBlink:true,
 blink:{on:1.60,warning:0.45,off:0.90,phase:1.10}
});
addSpecialCoinDef(
 city,'M-GUARD-01',17962,519,'경비 1 · 교량 하부 트렌치 잠입 회수',
 {x1:18680,x2:20500,yMin:420,yMax:585},
 {parentPlatformId:'M-GUARD-01-P',localOffsetX:52,localOffsetY:-36,requireLanding:true}
);

floor(city,18680,360,'pavement',580,{id:'M-G2-MID'});
checkpointAt(city,18780,'제2교량 입구','',580);
surface(city,19260,465,290,'steel',{id:'M-GRD-BR2',thin:true});
wall(city,19620,180,56,195,'steel',{id:'M-G2-BAFFLE2'});
surface(city,19760,425,150,'steel',{
 id:'M-G2-BLINK2',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.45,warning:0.45,off:1.10,phase:1.60}
});
floor(city,20160,440,'pavement',580,{id:'M-G2-EXIT'});

// M5-G3 (20600 ~ 23400)
floor(city,20600,360,'pavement',580,{id:'M-G3-GND1',joinLeft:true});
checkpointAt(city,20700,'진압반 다층 교차로','',580);
surface(city,21120,495,290,'steel',{id:'M-G3-MID1'});
wall(city,21435,340,52,220,'steel',{id:'M-G3-BAFFLE1'});
surface(city,21540,355,300,'steel',{id:'M-G3-UPPER'});
wall(city,21665,95,52,175,'steel',{id:'M-G3-BAFFLE2'});
floor(city,22040,380,'pavement',580,{id:'M-G3-GND2'});
checkpointAt(city,22160,'다층 교차로 후반','',580);
surface(city,22550,435,130,'steel',{id:'M-G3-STEP-HI'});
wall(city,22705,180,52,265,'steel',{id:'M-G3-BAFFLE3'});
surface(city,22760,515,250,'steel',{id:'M-G3-MID2'});
surface(city,23060,365,135,'steel',{id:'M-G3-HIGH-EXIT'});
floor(city,23220,180,'pavement',580,{id:'M-G3-GND3',joinRight:true});

// M5-G4 (23400 ~ 25060)
floor(city,23400,260,'pavement',580,{id:'M-G4-GND1'});
checkpointAt(city,23480,'특수 진압반 구역','',580);
surface(city,23830,485,280,'steel',{id:'M-GRD-BR3A',thin:true});
wall(city,24145,190,56,205,'steel',{id:'M-G4-BAFFLE1'});
surface(city,24240,445,135,'steel',{
 id:'M-G4-BLINK1',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.35,warning:0.40,off:1.05,phase:0.40}
});
surface(city,24510,410,290,'steel',{id:'M-GRD-BR3B',thin:true});
surface(city,24890,455,125,'steel',{
 id:'M-G4-BLINK2',thin:true,behavior:'blink',fastBlink:true,
 blink:{on:1.35,warning:0.40,off:1.00,phase:1.50}
});
surface(city,24710,285,86,'steel',{
 id:'M-GUARD-02-P1',specialBranch:'M-GUARD-02',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,blink:{on:1.50,warning:0.42,off:0.88,phase:0.45}
});
surface(city,24450,210,78,'steel',{
 id:'M-GUARD-02-P',specialBranch:'M-GUARD-02',challenge:'special',useSmallVisual:true,
 behavior:'blink',fastBlink:true,blink:{on:1.50,warning:0.42,off:0.88,phase:1.15}
});
addSpecialCoinDef(
 city,'M-GUARD-02',24489,174,'경비 2 · 이중 경비·점멸 교량 상공 왕복 돌파',
 {x1:25060,x2:26400,yMin:440,yMax:590},
 {parentPlatformId:'M-GUARD-02-P',localOffsetX:39,localOffsetY:-36,requireLanding:true}
);

// --- M6. 북경성 광장 (25060 ~ 26800, bldgX = 26180, doorCenterX = 26465 단일 출입문 대표·부대표 이벤트 보존) ---
floor(city,25060,1740,'pavement',580,{id:'M-GND-BUKGYEONG'});
checkpointAt(city,25160,'북경성 앞 광장','',580);

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
 addCandy(city,`M-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(city);

// ============================================================================
// REGION 3: ERPIEN (0 ~ 28,000px · Gate 4/5 Focused E1 [0~5200] + Expanded 5-Stage E2 Mayo City [5200~15700]
//                   + E3 Marie Arena [15700~19000] + E4/E5 Temple & Mom's Room [19000~28000])
// ============================================================================
const erpien=makeLevel('erpien','에르피엔',STAGE_ANCHORS.erpien.width,{
 minCamY:-650,maxCamY:140,
 backgroundRanges:{
  'erpien-gate':[0,5200],
  'erpien-city':[5200,17200],
  'erpien-home':[17200,26200]
 }
});
erpien.segments=[
 {start:0,end:5200,bg:'erpien-gate',skin:'gate',name:'에르피엔',blockId:'E1',indoor:false},
 {start:5200,end:15700,bg:'erpien-city',skin:'stone',name:'에르피엔',blockId:'E2',indoor:false},
 {start:15700,end:17200,bg:'erpien-city',skin:'stone',name:'에르피엔',blockId:'E3',indoor:false},
 {start:17200,end:22000,bg:'erpien-home',skin:'home',name:'에르피엔',blockId:'E4',indoor:true},
 {start:22000,end:26200,bg:'erpien-home',skin:'home',name:'에르피엔',blockId:'E5',indoor:true}
];

// --- E1. 외곽·성문 (Gate 4.2: 0 ~ 5200 — 무작위 반복 섬 발판 제거, 대표 과제 3개만 간결하게 배치!) ---
// E1-A (0~1850): 외곽 풍경과 기본 장거리 2단 점프 1회 (960..1400, 440px 폭포 협곡)
floor(erpien,0,960,'gate',580,{id:'E-GATE-GND1'});
checkpointAt(erpien,150,'에르피엔 숲길','',580);
floor(erpien,1400,650,'gate',580,{id:'E-GATE-GND2'});

// E1-B (2050~3350): 대표 협곡 1개 (1300px) — 인과관계가 명확한 무표지 자연 페이드 점멸 발판 2개 + 공중 대시
checkpointAt(erpien,1540,'성문 협곡 입구','',580);
surface(erpien,2280,465,165,'gate',{id:'E-GATE-BLINK-1',behavior:'blink',silentBlink:true,blink:{on:2.10,warning:0.70,off:0.90,phase:0.00}});
surface(erpien,2760,400,160,'gate',{id:'E-GATE-BLINK-2',behavior:'blink',silentBlink:true,blink:{on:2.10,warning:0.70,off:0.90,phase:0.95}});
floor(erpien,3350,600,'gate',580,{id:'E-GATE-GND3'});

// E1-C & E1-D (3950~5200): 대각선 고저차 도약(상부 쾌속 vs 하부 안전) + 도시 진입 전 평온한 성문 다리
checkpointAt(erpien,3500,'성문 갈림길','',580);
surface(erpien,4120,450,175,'gate',{id:'E-GATE-HIGH-1'});
surface(erpien,4480,355,170,'gate',{id:'E-GATE-HIGH-2'});
surface(erpien,4300,525,165,'gate',{id:'E-GATE-LOW-1'});
floor(erpien,4760,440,'gate',580,{id:'E-GATE-GND4',joinRight:true});
floor(erpien,5200,1050,'stone',580,{id:'E-CITY-GND1',joinLeft:true});

// --- E2. 도심·마요 포획 추격 (Gate 4.3 & Gate 5: 5200 ~ 15700, 총 10,500px · 5단계 추격 압박 공간!) ---
// Beat 1 (5200~7650, Stage A 초반): 마요 등장(x=5500) -> 광장 처마 & 첫 단절 교량 도약
checkpointAt(erpien,5360,'에르피엔 도심 입구','',580);
surface(erpien,5740,480,195,'stone',{id:'E-CITY-01'});
surface(erpien,6020,415,185,'stone',{id:'E-CITY-02'});
// Chasm E2-1 (6250..6720, 470px)
surface(erpien,6390,490,185,'stone',{id:'E-CITY-BRIDGE1'});
floor(erpien,6720,930,'stone',580,{id:'E-CITY-GND2'});
checkpointAt(erpien,6840,'도심 분수 광장','',580);
surface(erpien,7080,470,195,'stone',{id:'E-CITY-02B'});
surface(erpien,7380,400,190,'stone',{id:'E-CITY-02C'});

// Beat 2 (7650~9960, Stage A->B 전환): 추격 간격 압축 & 복층 빵집 처마 + 요정 #1 교차
// Chasm E2-2 (7650..8380, 730px)
surface(erpien,7800,475,180,'stone',{id:'E-CITY-03'});
surface(erpien,8090,405,180,'stone',{id:'E-CITY-04'});
floor(erpien,8380,940,'stone',580,{id:'E-CITY-GND3'});
checkpointAt(erpien,8500,'빵집 처마 거리','',580);
surface(erpien,8680,455,195,'stone',{id:'E-CITY-05'});
surface(erpien,9040,395,185,'stone',{id:'E-CITY-05B'});

// Beat 3 (9320~11680, Stage B 중반): 고가 연결통로 & 상층 처마 크레파스 E-CITY-C01 + 요정 #2
// Chasm E2-3 (9320..9960, 640px)
surface(erpien,9480,480,180,'stone',{id:'E-CITY-06'});
surface(erpien,9730,435,170,'stone',{id:'E-CITY-06B'});
// [E2 황금 크레파스 #8: E-CITY-C01 — 마요 포획 추격 중 상층 처마 3단(9040->9360->9720) 돌파 후 전방 복귀]
surface(erpien,9120,285,88,'stone',{id:'E-CITY-C01-P1',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true});
surface(erpien,9410,210,80,'stone',{id:'E-CITY-C01-P2',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true});
surface(erpien,9710,195,76,'stone',{id:'E-CITY-C01-P3',specialBranch:'E-CITY-C01',challenge:'special',useSmallVisual:true});
addSpecialCoinDef(
 erpien,'E-CITY-C01',9748,159,'도심 1 · 마요 추격 상층 처마 3단 돌파',
 {x1:9960,x2:10880,yMin:420,yMax:585},
 {parentPlatformId:'E-CITY-C01-P3',localOffsetX:38,localOffsetY:-36,requireLanding:true}
);

floor(erpien,9960,920,'stone',580,{id:'E-CITY-GND4'});
checkpointAt(erpien,10080,'도심 화단 골목','',580);
surface(erpien,10260,460,175,'stone',{id:'E-CITY-07'});
surface(erpien,10580,390,165,'stone',{id:'E-CITY-08'});
// Chasm E2-4 (10880..11680, 800px — 상·하 복층 교차 회피)
surface(erpien,11020,490,165,'stone',{id:'E-CITY-09A'});
surface(erpien,11180,380,155,'stone',{id:'E-CITY-09B'});
surface(erpien,11390,450,170,'stone',{id:'E-CITY-09C'});

// Beat 4 (11680~13360, Stage B->C 전환): 요정 #3 교차 & 고가 아치
floor(erpien,11680,940,'stone',580,{id:'E-CITY-GND5'});
checkpointAt(erpien,11800,'도심 고가 통로','',580);
surface(erpien,11980,460,185,'stone',{id:'E-CITY-10'});
surface(erpien,12320,390,180,'stone',{id:'E-CITY-10B'});
// Chasm E2-5 (12620..13360, 740px)
surface(erpien,12780,470,170,'stone',{id:'E-CITY-11'});
surface(erpien,13080,400,165,'stone',{id:'E-CITY-12'});

// Beat 5 (13360~15700, Stage C 최고 압박): 마요 고속 추격 + 2연발 바람총 + 마리 진입 직전 1,480px 다단 협곡 돌파
floor(erpien,13360,860,'stone',580,{id:'E-CITY-GND6'});
checkpointAt(erpien,13480,'마리 광장 접근로','',580);
surface(erpien,13680,465,175,'stone',{id:'E-CITY-12B'});
surface(erpien,13980,395,170,'stone',{id:'E-CITY-12C'});
// Chasm E2-6 (14220..15700, 1480px 연속 공중 회피 교량)
surface(erpien,14380,475,165,'stone',{id:'E-CITY-13'});
surface(erpien,14720,395,160,'stone',{id:'E-CITY-14'});
surface(erpien,15060,465,165,'stone',{id:'E-CITY-15'});
surface(erpien,15380,415,165,'stone',{id:'E-CITY-16'});

// --- E3. 마리 보스 아레나 (TEST20A 사용자 스케치 기준 한 화면 보스맵: 15700 ~ 17200, camZoom = 0.88, viewW = 1455) ---
// 1. 왼쪽 절벽 지면 (B-ENTRY-LEFT: x = 15700..16010, 상면 y = 520; x = 16010부터 넓은 낙사 구간 B-PIT 시작!)
floor(erpien,15700,310,'stone',520,{id:'B-ENTRY-LEFT',noAutoDecor:true,role:'좌측 진입 절벽 지면 (우측 x=16010부터 낙사 구간)'});
// 2. 중앙 하단 작은 시작·리셋 발판 (B-CENTER-SPAWN: x = 16305..16435, 상면 y = 540, 밑바닥 없는 낙사 구간 한가운데!)
surface(erpien,16305,540,130,'stone',{id:'B-CENTER-SPAWN',checkpointSafe:true,role:'전투 시작·리셋 안전 발판 (중앙 하단)'});
checkpointAt(erpien,16370,'마리 광장 진입로','',540);
// 3. 중앙 상단 마리 전용 높은 발판 (B-MARIE-PODIUM: x = 16295..16445, 상면 y = 305, 시작 발판 바로 위!)
surface(erpien,16295,305,150,'stone',{id:'B-MARIE-PODIUM',mariePodium:true,role:'마리 전용 중앙 상단 발판'});
// 4. 좌측 부유 유도·회피 발판 3개 (B-LEFT-PAD-A, B-LEFT-PAD-B, B-LEFT-PAD-C)
surface(erpien,16085,445,105,'stone',{id:'B-LEFT-PAD-C',useSmallVisual:true,role:'중앙->좌측 연결 부유 발판'});
surface(erpien,15855,345,105,'stone',{id:'B-LEFT-PAD-A',useSmallVisual:true,role:'좌측 중층 회피/접근 부유 발판'});
surface(erpien,16005,215,115,'stone',{id:'B-LEFT-PAD-B',useSmallVisual:true,role:'좌측 상층 마요 탄환 유도 핵심 발판'});
// 5. 우측 부유 회피·출구 연결 발판 3개 (B-RIGHT-PAD-A, B-RIGHT-PAD-B, B-RIGHT-PAD-C)
surface(erpien,16505,435,100,'stone',{id:'B-RIGHT-PAD-A',useSmallVisual:true,role:'중앙->우측 회피 부유 발판'});
surface(erpien,16625,325,100,'stone',{id:'B-RIGHT-PAD-B',useSmallVisual:true,specialBranch:'E-CITY-C02',challenge:'special',role:'우측 상층 이동 및 황금 크레파스 #9 발판'});
surface(erpien,16635,475,95,'stone',{id:'B-RIGHT-PAD-C',useSmallVisual:true,role:'우측 출구 지면 연결 부유 발판'});
// 6. 오른쪽 지면 (B-EXIT-RIGHT: x = 16750..17200, 상면 y = 520; 마요 배치x=16890 및 전투 종료 후 교단 출구!)
floor(erpien,16750,450,'stone',520,{id:'B-EXIT-RIGHT',joinRight:true,noAutoDecor:true,role:'우측 마요 사격 지면 및 교단 연결 출구'});
// 7. 오른쪽 높은 출구 차단 세로벽 (B-EXIT-WALL: x = 17010..17074, y = -140..520; 마요 총구x=16848보다 오른쪽에 위치, 상단 착지 불가!)
wall(erpien,17010,-140,64,660,'stone',{id:'B-EXIT-WALL',wallSide:'right',wallRole:'boss_exit_wall',noTopLand:true,bossExitWall:true,role:'전투 완료 전 출구 및 상공 스킵 완전 차단 세로벽'});

// [E3 황금 크레파스 #9: E-CITY-C02 (보스 아레나 우측 상층 B-RIGHT-PAD-B 연동)]
addSpecialCoinDef(
 erpien,'E-CITY-C02',16675,289,'광장 2 · 마리 아레나 우측 상공 발판',
 {x1:16750,x2:18200,yMin:480,yMax:590},
 {parentPlatformId:'B-RIGHT-PAD-B',localOffsetX:50,localOffsetY:-36,requireLanding:true}
);

// --- E4. 교단 화단·회랑 (17200 ~ 22000, 보스 아레나 우측 지면 B-EXIT-RIGHT에서 텔레포트 없이 바로 연결!) ---
floor(erpien,17200,1060,'home',580,{
 id:'E-HOME-GND1',joinLeft:true,
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:17580,walkOffset:114,scale:0.58},
  {key:'erpien/decoration_home_pedestal',x:18020,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien,17420,'교단 복도','',580);
checkpointAt(erpien,18140,'교단 화단 입구','',580);

surface(erpien,18410,510,145,'home',{id:'E-HOME-01'});
surface(erpien,18710,355,130,'home',{id:'E-HOME-02'});
surface(erpien,19015,455,135,'home',{id:'E-HOME-03'});

floor(erpien,19280,760,'home',580,{
 id:'E-HOME-GND2',
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:19660,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien,19400,'교단 중앙 회랑','',580);

surface(erpien,20190,485,135,'home',{
 id:'E-HOME-04',behavior:'blink',silentBlink:true,
 blink:{on:1.85,warning:0.60,off:0.85,phase:0.00}
});
surface(erpien,20510,395,130,'home',{
 id:'E-HOME-05',behavior:'blink',silentBlink:true,
 blink:{on:1.85,warning:0.60,off:0.85,phase:0.85}
});
surface(erpien,20825,470,135,'home',{id:'E-HOME-06'});

floor(erpien,21080,920,'home',580,{
 id:'E-HOME-GND3',joinRight:true,
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:21560,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien,21240,'교단 열주 회랑','',580);

// --- E5. 중앙 나무에서 엄마의 방 (22000 ~ 26200, goal.x = 25750) ---
floor(erpien,22000,4200,'home',580,{
 id:'E-HOME-GND4',joinLeft:true,
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:22550,walkOffset:114,scale:0.58},
  {key:'erpien/decoration_home_pedestal',x:23650,walkOffset:114,scale:0.58},
  {key:'erpien/decoration_home_pedestal',x:24650,walkOffset:114,scale:0.58},
  {key:'erpien/decoration_home_pedestal',x:25380,walkOffset:114,scale:0.58}
 ]
});
checkpointAt(erpien,22300,'중앙 나무','',580);
checkpointAt(erpien,24400,'엄마의 방 앞','',580);
erpien.goal={x:STAGE_ANCHORS.erpien.goalX,y:580,w:150,h:190};

// Erpien 36 Manual Forward-Path King Candies (E-C01 ~ E-C36)
for(const [idx,[cx,cy]] of [
 // E1 Gate (7)
 [560,542],[1180,465],[1720,542],[2360,427],[2840,362],[3650,542],[4565,317],
 // E2 Mayo City (15)
 [5835,442],[6480,452],[7175,432],[7890,437],[8180,367],[8775,417],[9570,442],[10345,422],
 [11100,452],[11475,412],[12070,422],[12865,432],[13765,427],[14460,437],[15140,427],
 // E3 Marie Boss Arena (6)
 [15860,482],[16137,407],[15907,307],[16062,177],[16555,397],[16830,482],
 // E4 & E5 Temple Sanctuary & Sacred Tree to Mom's Room (8)
 [17820,542],[18482,472],[18775,317],[19660,542],[20257,447],[20575,357],[23400,542],[25150,542]
].entries()){
 addCandy(erpien,`E-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(erpien);

function currentSegment(){const lv=getActiveLevel();return lv.segments.find(s=>p.x>=s.start&&p.x<s.end)||lv.segments.at(-1);}

function getKillY(x){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  const clv=getActiveLevel();
  return (clv&&clv.killY!==undefined)?clv.killY:820;
 }
 if(currentLevelId()==='monatium'){
  const m=STAGE_ANCHORS.monatium;
  if(x>m.skywalkStart+450&&x<m.skywalkEnd-450)return -1260;
  if(x>=m.descentStart+64&&x<m.descentEnd-64)return 595;
  return 830;
 }
 if(currentLevelId()==='erpien'){
  const e=STAGE_ANCHORS.erpien;
  if(x>=e.marieStart&&x<e.templeStart)return 720;
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
  state:secSet.has(d.id)?'secured':'available',
  pulse:0
 }));
 syncSpecialCoinPositions();
}

function resetPendingSpecialCoins(){
 const secSet=activeSpecialSet();
 for(const sc of specialCoins){
  sc.state=secSet.has(sc.id)?'secured':'available';
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
     secSet.add(sc.id);
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
function checkJourney(){
 if(state!=='playing')return;
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  if(typeof checkChallengeJourney==='function')checkChallengeJourney();
  return;
 }
 updateRegionHud();
 const l=levels[levelIndex];
 if(l.id==='erpien'&&p.x>=STAGE_ANCHORS.erpien.sacredTreeStart){
  p.guardStun=0;p.guardKnock=0;p.knock=0;
 }
 if(levelIndex<levels.length-1&&p.x>END-100&&p.ground){beginRegionTransition(levelIndex+1);return;}
 if(levelIndex>0&&p.x<55&&p.ground&&p.face<0&&visited[levelIndex-1]){beginRegionTransition(levelIndex-1,true);return;}
 const g=l.goal;
 if(g&&p.x+18>=g.x&&p.x-18<=g.x+g.w&&Math.abs(p.y-g.y)<12&&p.ground){
  p.guardStun=0;p.guardKnock=0;p.knock=0;p.invulnerable=0;
  routeDone[levelIndex]=true;
  if(eventMode)finishEvent(eventElapsed<LIMIT);
  else{
   state='practiceDone';
   modal('연습 완료','엄마의 방에 도착했어요',`연습 모드의 이동과 황금 크레파스(${securedSpecialPractice.size}/${TOTAL_SPECIAL_COINS})는 본편 기록에 포함되지 않습니다.`,'본편 시작하기 →');
  }
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
async function loadWorldImages(){
 const bgLoads=worldFiles.map(n=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{worldImages[n]=im;ok();};im.onerror=no;im.src='assets/world/'+n+'.webp?v=16';}));
 const terrainLoads=TERRAIN_ASSET_LIST.map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{terrainImages[k]=im;ok();};im.onerror=no;im.src='assets/terrain/'+k+'.webp?v=16';}));
 const structureLoads=STRUCTURE_ASSET_LIST.map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{structureImages[k]=im;ok();};im.onerror=no;im.src='assets/structure/'+k+'.webp?v=16';}));
 const colLoads=['king_candy','golden_crayon'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{collectibleImages[k]=im;ok();};im.onerror=no;im.src='assets/collectibles/'+k+'.png?v=16';}));
 const cloudLoads=Array.from({length:TRANSITION_FRAME_COUNT},(_,i)=>new Promise(ok=>{
  const im=new Image();
  im.onload=()=>{transitionFrames[i]=im;ok();};
  im.onerror=()=>ok();
  im.src=`assets/transition/cloud_${String(i).padStart(2,'0')}.webp?v=16`;
 }));
 await Promise.all([...bgLoads,...terrainLoads,...structureLoads,...colLoads,...cloudLoads]);
}
