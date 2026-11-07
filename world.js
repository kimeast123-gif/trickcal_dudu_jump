'use strict';
// TEST12 World Definition:
// - Gate G1: Manual forward-path King Candies (`regularDefs` + `addCandy`) with stable string IDs (`F-C01..24`, `M-C01..36`, `E-C01..36`) & Golden Crayons (`specialDefs`, 9 total).
// - Gate G2: Monatium 12-step Ascent Tower raised by +475px (`M-ASC-01` y=495 -> `M-ASC-12` y=-1070, w=75px), Skywalk shifted to y=-1095..-1055 with faster Section 2 (`M-SKY-05..08`: on=1.40s, warning=0.50s, off=0.68s), and 6-step Descent Tower (`M-DSC-01..06`) with `M-DOWN-01/02` directly bound to fast X-moving platforms (`parentPlatformId`).
// - Gate G4 & G5: Refined Erpien Gate (`0~6600`), smooth Gate->City transition ground alignment (`x=6600`), expanded Temple Flowerbed spacing (`E-HOME-01..06`), and cleaned non-essential signs/toasts.
const levels=[];let levelIndex=0,levelClock=0,transition=null,journeyResult=null;
const collectedByLevel=[new Set(),new Set(),new Set()],visited=[true,false,false],routeDone=[false,false,false];
const worldImages={},worldFiles=['forest-bg','city-bg','erpien-gate','erpien-city','erpien-home'];
const collectibleImages={};
const transitionFrames=[];const TRANSITION_FRAME_COUNT=20;let transitionSessionId=0;

const TOTAL_SPECIAL_COINS=9;
const securedSpecialEvent=new Set();
const securedSpecialPractice=new Set();
let specialCoins=[];

function activeSpecialSet(){return eventMode?securedSpecialEvent:securedSpecialPractice;}
function totalRegularCandyCount(){return levels.reduce((acc,lv)=>acc+(lv.regularDefs?lv.regularDefs.length:0),0);}
function collectedRegularCandyCount(){
 return levels.reduce((acc,lv,idx)=>{
  if(idx===levelIndex&&typeof coins!=='undefined'&&coins.length){
   return acc+coins.filter(c=>c.got).length;
  }
  return acc+collectedByLevel[idx].size;
 },0);
}

function makeLevel(id,name,width,{minCamY=-650,maxCamY=140}={}){
 return {id,name,worldWidth:width,minCamY,maxCamY,platforms:[],sections:[],signs:[],segments:[],regularDefs:[],specialDefs:[],goal:null};
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
 const a={
  id,x,y,w,h:20,thin:true,skin,visual,
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
function checkpointAt(l,x,title,hint='',y=580){l.sections.push({x,y,title,hint});}
function sign(l,x,y,text){l.signs.push({x,y,text});}
function addCandy(l,id,x,y,category='main'){
 l.regularDefs.push({id,levelId:l.id,x:Math.round(x),y:Math.round(y),category});
}
function addSpecialCoinDef(l,id,x,y,label,returnZone,extra={}){
 l.specialDefs.push({id,levelId:l.id,x,y,label,returnZone,...extra});
}
function stepping(l,start,count,skin,{gap=130,width=110,base=510,rise=70,moving=false,idPrefix='STEP'}={}){
 for(let i=0;i<count;i++){
  surface(l,start+i*(gap+width),base-(i%3)*rise,width,skin,{
   id:`${idPrefix}-${String(i+1).padStart(2,'0')}`,
   ...(moving&&i%4===2?{motion:{range:45,period:4.5,phase:0,axis:'y'}}:{})
  });
 }
}

// ============================================================================
// REGION 0: SUIN FOREST (Tutorial — 7400px, 24 Forward-Path King Candies)
// ============================================================================
const forest=makeLevel('forest','수인숲',7400,{minCamY:-450,maxCamY:140});
forest.segments=[{start:0,end:7400,bg:'forest-bg',skin:'grass',name:'수인숲',indoor:false}];
floor(forest,0,1750,'grass',580,{id:'F-GND-01'});
checkpointAt(forest,150,'햇살 산책길','← → 이동 · SPACE를 짧게 / 길게 눌러 점프 높이를 조절해요');
for(const [idx,[x,y]] of [[600,535],[840,485],[1110,435]].entries())surface(forest,x,y,155,'grass',{id:`F-STEP-0${idx+1}`});
sign(forest,720,375,'SPACE · 누르는 시간만큼 높이 점프');
sign(forest,1350,350,'공중에서 SPACE 한 번 더 · 2단 점프');

checkpointAt(forest,1520,'떨어지다 한 번 더','발판 끝에서 걸어 떨어진 뒤 공중에서 SPACE!');
surface(forest,1720,490,170,'grass',{id:'F-STEP-04'});
surface(forest,1920,415,155,'grass',{id:'F-STEP-05'});
surface(forest,2220,530,220,'grass',{id:'F-STEP-06'});
floor(forest,2520,1080,'grass',580,{id:'F-GND-02'});

checkpointAt(forest,2700,'아래로 내려가기','얇은 발판 위에서 ↓ + SPACE로 내려갈 수 있어요');
surface(forest,2920,470,360,'grass',{id:'F-DROP-01'});
surface(forest,3040,365,190,'grass',{id:'F-DROP-02'});
sign(forest,3100,300,'↓ + SPACE · 얇은 발판 통과');

checkpointAt(forest,3380,'작은 징검다리','속도를 조절해 좁은 발판 한가운데에 착지해요');
stepping(forest,3720,4,'grass',{width:135,gap:110,base:520,rise:40,idPrefix:'F-BRIDGE'});
floor(forest,4740,860,'grass',580,{id:'F-GND-03'});

checkpointAt(forest,5000,'바람처럼 슝','L SHIFT · 지상과 공중에서 짧고 빠르게 대시!');
surface(forest,5720,510,200,'grass',{id:'F-DASH-01'});
surface(forest,6080,490,220,'grass',{id:'F-DASH-02'});
floor(forest,6400,1000,'grass',580,{id:'F-DASH-04'});
sign(forest,5800,360,'L SHIFT · 공중 대시 1회');

// Suin Forest Manual Forward-Path King Candies (24)
for(const [idx,[cx,cy]] of [
 [360,542],[510,542],[678,497],[918,447],[1188,397],[1440,542],
 [1640,542],[1805,452],[1998,377],[2330,492],[2620,542],
 [2840,542],[3010,432],[3135,327],[3245,432],[3480,542],
 [3788,482],[4033,442],[4278,402],[4523,482],[4880,542],
 [5340,542],[5820,472],[6190,452]
].entries()){
 addCandy(forest,`F-C${String(idx+1).padStart(2,'0')}`,cx,cy,'tutorial');
}
levels.push(forest);

// ============================================================================
// REGION 1: MONATIUM (TEST12 High-Rise +475px, 6-Step Descent, Guard Bridges — 19500px)
// ============================================================================
const city=makeLevel('monatium','모나티엄',19500,{minCamY:-1520,maxCamY:160});
city.segments=[
 {start:0,end:3400,bg:'city-bg',skin:'road',name:'모나티엄',indoor:false},
 {start:3400,end:4484,bg:'city-bg',skin:'steel',name:'모나티엄',indoor:true},
 {start:4484,end:8220,bg:'city-bg',skin:'pavement',name:'모나티엄',indoor:false},
 {start:8220,end:9420,bg:'city-bg',skin:'steel',name:'모나티엄',indoor:true},
 {start:9420,end:17400,bg:'city-bg',skin:'pavement',name:'모나티엄',indoor:false},
 {start:17400,end:19500,bg:'city-bg',skin:'pavement',name:'모나티엄',indoor:false}
];

// --- 1. 도시 진입 및 타워 접근 광장 (0 ~ 3400) ---
floor(city,0,2200,'road',580,{id:'M-GND-ENTRY'});
checkpointAt(city,150,'도시 입구','',580);
surface(city,1180,515,190,'steel',{id:'M-WARM-01'});
surface(city,1520,455,190,'steel',{id:'M-WARM-02'});

floor(city,2200,2284,'pavement',580,{id:'M-GND-TOWER'});
surface(city,2620,510,185,'steel',{id:'M-WARM-03'});
checkpointAt(city,3260,'상승 타워 입구','',580);

// --- 2. Gate G2-1 & G2-2: 제1수직상승타워 (x = 3400 ~ 4484, 12단 유지 + 정상 고도 +475px 상승: y = 495 -> -1070) ---
// 외벽 구조물 (고도 +475px 신장, 옥상 출구 y=-1225..-1025 개방)
wall(city,3400,-1255,64,1615,'steel',{id:'M-WALL-ASC-L',wallSide:'left',wallRole:'ascent_left',portalBottom:true});
wall(city,4420,-1025,64,1605,'steel',{id:'M-WALL-ASC-R',wallSide:'right',wallRole:'ascent_right'});
wall(city,4420,-1305,64,80,'steel',{id:'M-WALL-ASC-RH',wallSide:'right',wallRole:'ascent_right_header',portalBottom:true});
wall(city,3400,-1305,1084,50,'steel',{id:'M-WALL-ASC-CAP',wallSide:'left',wallRole:'ascent_roof_cap'});

// 12개 주 경로 수직 상승 발판 (발판 추가 금지! 12개 그대로 유지하며 Δy=130~155px로 고층화, M-ASC-12 폭 75px 축소!)
surface(city,3585,495,155,'steel',{id:'M-ASC-01',towerStep:1});   // Step 1 (좌: y=495)
surface(city,3855,365,150,'steel',{id:'M-ASC-02',towerStep:2});   // Step 2 (우: y=365, Δy=-130)
surface(city,3585,235,145,'steel',{id:'M-ASC-03',towerStep:3});   // Step 3 (좌: y=235, Δy=-130)
surface(city,3860,95,145,'steel',{id:'M-ASC-04',towerStep:4});    // Step 4 (우: y=95, Δy=-140)
surface(city,3585,-40,140,'steel',{id:'M-ASC-05',towerStep:5});   // Step 5 (좌: y=-40, Δy=-135)
surface(city,3850,-180,195,'pavement',{id:'M-ASC-06',towerStep:6,checkpointSafe:true}); // Step 6 (우: y=-180, 중반 안전 테라스 & 체크포인트)
checkpointAt(city,3948,'타워 상승 중반','',-180);
surface(city,3580,-325,135,'steel',{id:'M-ASC-07',towerStep:7});  // Step 7 (좌: y=-325, Δy=-145)
surface(city,3865,-470,135,'steel',{id:'M-ASC-08',towerStep:8});  // Step 8 (우: y=-470, Δy=-145)
surface(city,3575,-615,130,'steel',{id:'M-ASC-09',towerStep:9});  // Step 9 (좌: y=-615, Δy=-145)
surface(city,3875,-765,130,'steel',{id:'M-ASC-10',towerStep:10}); // Step 10 (우: y=-765, Δy=-150)
surface(city,3575,-920,130,'steel',{id:'M-ASC-11',towerStep:11}); // Step 11 (좌: y=-920, Δy=-155)
surface(city,3910,-1070,75,'steel',{id:'M-ASC-12',towerStep:12,useSmallVisual:true}); // Step 12 (우: y=-1070, Δy=-150, 폭 75px 단독형!)

// [Gate G2-3: 상승 타워 황금 크레파스 4개 (M-UP-01 ~ M-UP-04) — 주경로 우회 불가, 획득 후 역방향 복귀 필수]
// M-UP-01: Step 3/4 구간 우측 측면 소형 발판 (w=84) 정밀 도약 후 좌측 주경로로 복귀
surface(city,4255,215,84,'steel',{id:'M-UP-01-P',specialBranch:'M-UP-01',challenge:'special'});
addSpecialCoinDef(city,'M-UP-01',4297,175,'상승 1 · 측면 소형 발판 정밀 착지',{x1:3530,x2:4050,yMin:-55,yMax:375});

// M-UP-02: Step 6(y=-180) 우측 알코브 징검다리 도약 후 좌측 복귀
surface(city,4155,-165,92,'steel',{id:'M-UP-02-P1',specialBranch:'M-UP-02',challenge:'special'});
surface(city,4285,-190,96,'steel',{id:'M-UP-02-P2',specialBranch:'M-UP-02',challenge:'special'});
addSpecialCoinDef(city,'M-UP-02',4333,-230,'상승 2 · 중층 측면 징검다리',{x1:3530,x2:4050,yMin:-340,yMax:105});

// M-UP-03: Step 8(y=-470) 우측 원거리 소형 발판 (w=80) 2단 점프+대시 도약 후 좌측 복귀
surface(city,4270,-545,80,'steel',{id:'M-UP-03-P',specialBranch:'M-UP-03',challenge:'special'});
addSpecialCoinDef(city,'M-UP-03',4310,-585,'상승 3 · 상층 원거리 고립 발판',{x1:3530,x2:4040,yMin:-780,yMax:-315});

// M-UP-04: Step 10/11 구간 우측 최상층 고립 포켓 (w=82, 옥상 진입로보다 아래에 격리되어 역방향 복귀 필수)
surface(city,4265,-945,82,'steel',{id:'M-UP-04-P',specialBranch:'M-UP-04',challenge:'special'});
addSpecialCoinDef(city,'M-UP-04',4306,-985,'상승 4 · 최상층 고립 대시 분기',{x1:3530,x2:4030,yMin:-1085,yMax:-750});

// --- 3. Gate G2-2 & G2-4: 옥상 점멸 스카이워크 (x = 4180 ~ 8284, y = -1095 ~ -1055) ---
surface(city,4180,-1095,440,'pavement',{id:'M-SKY-ENTRY',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,4360,'모나티엄 옥상 입구','',-1095);
sign(city,4480,-1155,'⚠ 점멸 스카이워크 · 노란 경고 후 발판 소멸');

// 제1 점멸 구간 (M-SKY-01 ~ M-SKY-04: 기존 주기 유지 on=2.0, warning=0.55, off=0.80)
surface(city,4720,-1090,165,'steel',{id:'M-SKY-01',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.00}});
surface(city,4995,-1090,165,'steel',{id:'M-SKY-02',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:0.85}});
surface(city,5270,-1085,165,'steel',{id:'M-SKY-03',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:1.70}});
surface(city,5545,-1085,165,'steel',{id:'M-SKY-04',thin:true,behavior:'blink',blink:{on:2.0,warning:0.55,off:0.80,phase:2.55}});

// 스카이워크 중간 고정 안전 데크 (체크포인트)
surface(city,5820,-1080,310,'pavement',{id:'M-SKY-SAFE1',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,5975,'스카이워크 중간 쉼터','',-1080);

// 제2 점멸 구간 (M-SKY-05 ~ M-SKY-08: 주기 약 21% 단축 -> on=1.40, warning=0.50, off=0.68, 합 2.58s, fastBlink:true)
surface(city,6240,-1075,160,'steel',{id:'M-SKY-05',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.40,warning:0.50,off:0.68,phase:0.00}});
surface(city,6515,-1070,160,'steel',{id:'M-SKY-06',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.40,warning:0.50,off:0.68,phase:0.72}});
surface(city,6790,-1065,160,'steel',{id:'M-SKY-07',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.40,warning:0.50,off:0.68,phase:1.38}});
surface(city,7065,-1060,160,'steel',{id:'M-SKY-08',thin:true,behavior:'blink',fastBlink:true,blink:{on:1.40,warning:0.50,off:0.68,phase:2.02}});

// 옥상 동측 하강 타워 진입 안전 데크
surface(city,7335,-1055,949,'pavement',{id:'M-SKY-EXIT',thin:true,rooftop:true,checkpointSafe:true});
checkpointAt(city,8040,'옥상 하강 입구','',-1055);

// --- 4. Gate G2-5 & G2-6: 제2수직하강타워 (x = 8220 ~ 9420, 8단 -> 6단 M-DSC-01~06 + 고속 이동 발판 상면 착지형 크레파스 2개) ---
wall(city,8220,-1295,64,80,'steel',{id:'M-WALL-DSC-LH',wallSide:'left',wallRole:'descent_left_header',portalBottom:true});
wall(city,8220,-1015,64,1595,'steel',{id:'M-WALL-DSC-L',wallSide:'left',wallRole:'descent_left'});
wall(city,9356,-1295,64,1655,'steel',{id:'M-WALL-DSC-R',wallSide:'right',wallRole:'descent_right',portalBottom:true});
wall(city,8220,-1295,1200,48,'steel',{id:'M-WALL-DSC-CAP',wallSide:'right',wallRole:'descent_roof_cap'});

// 6단 수직 하강 발판 (y = -900, -625, -345, -75, 205, 475; 별도 정지형 보조 발판 M-DOWN-01-P / M-DOWN-02-P 완전 삭제!)
surface(city,8320,-900,195,'steel',{id:'M-DSC-01',descentStep:1,behavior:'static',descendHint:'right'});
surface(city,8640,-625,185,'steel',{id:'M-DSC-02',descentStep:2,behavior:'moving',fastMoving:true,motion:{axis:'x',range:110,period:2.35,phase:0.00},descendHint:'left'});
surface(city,8450,-345,190,'steel',{id:'M-DSC-03',descentStep:3,behavior:'moving',motion:{axis:'x',range:70,period:3.50,phase:3.14},descendHint:'right'});
surface(city,8620,-75,250,'pavement',{id:'M-DSC-04',descentStep:4,behavior:'static',checkpointSafe:true,descendHint:'left'});
checkpointAt(city,8730,'하강 타워 중반','',-75);
surface(city,8660,205,185,'steel',{id:'M-DSC-05',descentStep:5,behavior:'moving',fastMoving:true,motion:{axis:'x',range:115,period:2.25,phase:1.57},descendHint:'left'});
surface(city,8580,475,265,'pavement',{id:'M-DSC-06',descentStep:6,behavior:'static',descendHint:'right'});

// [하강 타워 고속 이동 발판 종속 황금 크레파스 2개: M-DOWN-01 (M-DSC-02 귀속), M-DOWN-02 (M-DSC-05 귀속)]
addSpecialCoinDef(
 city,'M-DOWN-01',8732,-653,'하강 1 · 상부 고속 이동 발판 착지',
 {x1:8300,x2:8990,yMin:-360,yMax:490},
 {parentPlatformId:'M-DSC-02',localOffsetX:92,localOffsetY:-28,requireLanding:true}
);
addSpecialCoinDef(
 city,'M-DOWN-02',8752,177,'하강 2 · 하부 고속 이동 발판 착지',
 {x1:8550,x2:10500,yMin:460,yMax:590},
 {parentPlatformId:'M-DSC-05',localOffsetX:92,localOffsetY:-28,requireLanding:true}
);

// --- 5. Gate G3: 지상 경비대 구간 (9420 ~ 17400) ---
floor(city,8980,2320,'road',580,{id:'M-GRD-FLOOR1'});
checkpointAt(city,10780,'지상 경비 구역 입구','',580);

// 구덩이 #1 (11300 ~ 12350) & M-GRD-BR1
surface(city,11260,465,1130,'steel',{id:'M-GRD-BR1',thin:true});
surface(city,11620,340,380,'steel',{id:'M-GRD-HIGH1',thin:true});
surface(city,11520,550,130,'steel',{id:'M-GUARD-01-P',specialBranch:'M-GUARD-01',challenge:'special'});
addSpecialCoinDef(city,'M-GUARD-01',11825,555,'경비 1 · 다리 아래 낙하 후 점프 복귀',{x1:11260,x2:13200,yMin:330,yMax:585,excludeX1:11500,excludeX2:11660});

// 중간 안전 지면 (12350 ~ 13650)
floor(city,12350,1300,'pavement',580,{id:'M-GRD-FLOOR2'});
checkpointAt(city,12520,'경비 구역 중반','',580);
surface(city,12980,450,360,'steel',{id:'M-GRD-OVER1',thin:true});

// 구덩이 #2 (13650 ~ 14850) & M-GRD-BR2A / M-GRD-BR2B
surface(city,13610,470,620,'steel',{id:'M-GRD-BR2A',thin:true});
surface(city,14270,440,620,'steel',{id:'M-GRD-BR2B',thin:true});
surface(city,14080,335,340,'steel',{id:'M-GRD-HIGH2',thin:true});
surface(city,14560,545,145,'steel',{id:'M-GUARD-02-REC',specialBranch:'M-GUARD-02',challenge:'special'});
addSpecialCoinDef(city,'M-GUARD-02',14250,545,'경비 2 · 심층 낙하 후 2단 점프+대시 복귀',{x1:14270,x2:15800,yMin:330,yMax:585});

// 후반 지면 및 1.5배속 특수 경비 2명 구간 (14850 ~ 17400)
floor(city,14850,2550,'pavement',580,{id:'M-GRD-FLOOR3'});
checkpointAt(city,15020,'경비 구역 후반','',580);
surface(city,15650,455,860,'steel',{id:'M-GRD-BR3',thin:true});
surface(city,16045,340,110,'steel',{id:'M-GUARD-03-P',specialBranch:'M-GUARD-03',challenge:'special'});
addSpecialCoinDef(city,'M-GUARD-03',16100,295,'경비 3 · 1.5배속 교차 경비 상단 돌파',{x1:16520,x2:17600,yMin:440,yMax:585});

// --- 6. 북경성 광장 (17400 ~ 19500) ---
floor(city,17400,2100,'pavement',580,{id:'M-GND-BUKGYEONG'});
checkpointAt(city,17600,'북경성 앞 광장','',580);

// Monatium Manual Forward-Path King Candies (36 — zero on special detours!)
for(const [idx,[cx,cy]] of [
 // Entry & Tower Approach (5)
 [680,542],[1275,477],[1615,417],[2712,472],[3140,542],
 // 12-Step Ascent Main Route (12)
 [3662,457],[3930,327],[3658,197],[3932,57],[3655,-78],[3948,-218],
 [3648,-363],[3932,-508],[3640,-653],[3940,-803],[3640,-958],[3948,-1108],
 // Skywalk Safe & Blink Main Path (7)
 [4420,-1133],[4802,-1128],[5352,-1123],[5975,-1118],[6320,-1113],[6870,-1103],[7680,-1093],
 // 6-Step Descent Main Path (4)
 [8418,-938],[8545,-383],[8745,-113],[8712,437],
 // Guard Bridges & Beijing Castle Approach (8)
 [10240,542],[11540,427],[12080,427],[12880,542],[13920,432],[14580,402],[15340,542],[17950,542]
].entries()){
 addCandy(city,`M-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(city);

// ============================================================================
// REGION 2: ERPIEN (TEST12 Gate Re-Layout, Smooth Fade, Faster Mayo/Fairies, Wider Temple — 21900px)
// ============================================================================
const erpien=makeLevel('erpien','에르피엔',21900,{minCamY:-650,maxCamY:140});
erpien.segments=[
 {start:0,end:6600,bg:'erpien-gate',skin:'gate',name:'에르피엔',indoor:false},
 {start:6600,end:14300,bg:'erpien-city',skin:'stone',name:'에르피엔',indoor:false},
 {start:14300,end:21900,bg:'erpien-home',skin:'home',name:'에르피엔',indoor:true}
];

// --- Gate G4-1: 에르피엔 숲과 성문 (0 ~ 6600, 2단 점프·공중 대시 리듬 강화, 비전투) ---
// 구간 1 (0 ~ 1860): 고저차 2단 점프 상승 테라스
floor(erpien,0,980,'gate',580,{id:'E-GATE-GND1'});
checkpointAt(erpien,150,'에르피엔 숲길','',580);
surface(erpien,1150,500,185,'gate',{id:'E-GATE-01'});
surface(erpien,1520,405,180,'gate',{id:'E-GATE-02'});
floor(erpien,1880,660,'gate',580,{id:'E-GATE-GND2'});

// 구간 2 (1880 ~ 3620): 상하 복층 2단 점프 & 대시 협곡
checkpointAt(erpien,2020,'성문 오솔길','',580);
surface(erpien,2720,455,185,'gate',{id:'E-GATE-03A'});
surface(erpien,3130,365,185,'gate',{id:'E-GATE-03B'});
surface(erpien,2820,535,190,'gate',{id:'E-GATE-04A'});
surface(erpien,3250,505,185,'gate',{id:'E-GATE-04B'});
floor(erpien,3620,640,'gate',580,{id:'E-GATE-GND3'});

// 구간 3 (3620 ~ 5420): 성문 정자 장거리 2단 점프·대시 아치
checkpointAt(erpien,3760,'숲속 정자길','',580);
surface(erpien,4440,485,180,'gate',{id:'E-GATE-05'});
surface(erpien,4830,390,180,'gate',{id:'E-GATE-06'});
surface(erpien,5220,465,185,'gate',{id:'E-GATE-07'});
floor(erpien,5560,460,'gate',580,{id:'E-GATE-GND4'});

// 구간 4 (5560 ~ 6600): 성문 앞 도약 및 외곽->도시 경계(x=6600) 지면 동기화
surface(erpien,6180,465,190,'gate',{id:'E-GATE-08'});
floor(erpien,6460,140,'gate',580,{id:'E-GATE-GND5',joinRight:true});
floor(erpien,6600,660,'stone',580,{id:'E-CITY-GND1',joinLeft:true});

// --- Gate G4-2, G4-3, G4-4: 에르피엔 도시 (6600 ~ 14300, 마요 추격 + 1.2배 요정 + 마리 조기 폭탄) ---
checkpointAt(erpien,6780,'에르피엔 도시 입구','',580);

// 도시 전반부: 마요 추격 & 빵집 앞 거리 (7260 ~ 9950)
surface(erpien,7380,495,205,'stone',{id:'E-CITY-01'});
surface(erpien,7710,430,205,'stone',{id:'E-CITY-02'});
floor(erpien,8020,1180,'stone',580,{id:'E-CITY-GND2'});
checkpointAt(erpien,8160,'빵집 앞 거리','',580);
surface(erpien,8420,465,220,'stone',{id:'E-CITY-03'});
surface(erpien,8820,420,220,'stone',{id:'E-CITY-04'});
surface(erpien,9320,495,195,'stone',{id:'E-CITY-05'});
surface(erpien,9650,440,195,'stone',{id:'E-CITY-06'});

// 도시 중반부: 화단 거리 (9950 ~ 11600)
floor(erpien,9950,1250,'stone',580,{id:'E-CITY-GND3'});
checkpointAt(erpien,10100,'도시의 화단길','',580);
surface(erpien,10360,465,220,'stone',{id:'E-CITY-07'});
surface(erpien,10780,425,220,'stone',{id:'E-CITY-08'});
surface(erpien,11320,490,205,'stone',{id:'E-CITY-09'});

// 도시 후반부: 마리 조기 원거리 폭탄 투척 & 마리의 광장 (11600 ~ 14300)
floor(erpien,11620,2680,'stone',580,{id:'E-CITY-MARIE-PLAZA',joinRight:true});
checkpointAt(erpien,11720,'마리 광장 진입로','',580);
sign(erpien,11920,420,'⚠ 마리 폭탄 구간 · 공중 폭탄과 바닥 폭발 주의');
surface(erpien,12180,460,210,'stone',{id:'E-CITY-10'});
surface(erpien,12680,435,210,'stone',{id:'E-CITY-11'});
checkpointAt(erpien,12820,'마리 광장 중심','',580);
surface(erpien,13505,430,190,'stone',{id:'E-CITY-MARIE-PERCH'});
surface(erpien,13920,475,200,'stone',{id:'E-CITY-12'});

// --- Gate G4-5: 에르피엔 교단 성소 (14300 ~ 21900, 공격/적 0개, 화단 6단 발판 간격 ~22% 확대) ---
floor(erpien,14300,1220,'home',580,{
 id:'E-HOME-GND1',joinLeft:true,
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:14660,walkOffset:171,scale:0.62},
  {key:'erpien/decoration_home_pedestal',x:15160,walkOffset:171,scale:0.62}
 ]
});
checkpointAt(erpien,14500,'교단 복도','',580);
checkpointAt(erpien,15380,'교단 화단','',580);

// 교단 화단 6개 건축 발판 (E-HOME-01 ~ E-HOME-06: 좌우 간격 약 22% 확대, 2단 점프·대시 정밀 주행)
surface(erpien,15680,500,185,'home',{id:'E-HOME-01'});
surface(erpien,16110,425,180,'home',{id:'E-HOME-02'});
floor(erpien,16560,180,'home',580,{
 id:'E-HOME-GND2',
 customDecorations:[{key:'erpien/decoration_home_pedestal',x:16650,walkOffset:171,scale:0.62}]
});
surface(erpien,16550,360,195,'home',{id:'E-HOME-03'});
surface(erpien,17000,425,180,'home',{id:'E-HOME-04'});
surface(erpien,17440,485,185,'home',{id:'E-HOME-05'});
surface(erpien,17870,520,185,'home',{id:'E-HOME-06'});

// 중앙 나무 ~ 엄마의 방 (18200 ~ 21900, 완전 평화 구간)
floor(erpien,18200,3700,'home',580,{
 id:'E-HOME-GND3',
 customDecorations:[
  {key:'erpien/decoration_home_pedestal',x:18420,walkOffset:171,scale:0.62},
  {key:'erpien/decoration_home_pedestal',x:19520,walkOffset:171,scale:0.62},
  {key:'erpien/decoration_home_pedestal',x:20380,walkOffset:171,scale:0.62},
  {key:'erpien/decoration_home_pedestal',x:21080,walkOffset:171,scale:0.62}
 ]
});
checkpointAt(erpien,18460,'중앙 나무','',580);
erpien.goal={x:21450,y:580,w:150,h:190};

// Erpien Manual Forward-Path King Candies (36)
for(const [idx,[cx,cy]] of [
 // Gate (12)
 [540,542],[1242,462],[1610,367],[2210,542],[2812,417],[3222,327],
 [3940,542],[4530,447],[4920,352],[5312,427],[5790,542],[6275,427],
 // City (12)
 [6920,542],[7482,457],[7812,392],[8530,427],[8930,382],[9418,457],
 [10470,427],[10890,387],[11422,452],[12285,422],[12785,397],[14020,437],
 // Temple Sanctuary & Flowerbed (12)
 [14880,542],[15772,462],[16200,387],[16648,322],[17090,387],[17532,447],
 [17962,482],[18680,542],[19320,542],[19960,542],[20620,542],[21220,542]
].entries()){
 addCandy(erpien,`E-C${String(idx+1).padStart(2,'0')}`,cx,cy,'main');
}
levels.push(erpien);

function currentSegment(){return levels[levelIndex].segments.find(s=>p.x>=s.start&&p.x<s.end)||levels[levelIndex].segments.at(-1);}

function getKillY(x){
 if(levelIndex===1){
  // High-altitude blinking skywalk (4620..7335 at y=-1090..-1060): reset at y > -595
  if(x>4620&&x<7335)return -595;
  return 830;
 }
 return 850;
}

function isSpecialCoinReturnSafe(sc){
 if(!p.ground||!p.on||p.on.collidable===false)return false;
 const z=sc.returnZone;
 if(!z)return true;
 if(p.x<z.x1||p.x>z.x2)return false;
 if(p.y<z.yMin||p.y>z.yMax)return false;
 if(z.excludeX1!==undefined&&p.x>=z.excludeX1&&p.x<=z.excludeX2)return false;
 if(p.on.specialBranch===sc.id||p.on.challenge==='special')return false;
 if(sc.parentPlatformId&&p.on.id===sc.parentPlatformId)return false;
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
    // Gate G2-6: Moving-platform special crayons strictly require landing on parentPlatformId!
    const pl=platforms.find(a=>a.id===sc.parentPlatformId);
    if(pl&&p.ground&&p.on&&p.on.id===sc.parentPlatformId&&Math.abs(p.x-sc.x)<36&&Math.abs(p.y-pl.y)<8){
     canAcquire=true;
    }
   }else{
    if(Math.abs(p.x-sc.x)<34&&Math.abs((p.y-34)-sc.y)<44){
     canAcquire=true;
    }
   }
   if(canAcquire){
    sc.state='pending';
    burst(sc.x,sc.y,'#ffcf56',12);
    tone(740,.08,'triangle',.045);
    if(typeof playDuduVoice==='function')playDuduVoice('special_coin');
    notify(`황금 크레파스 [${sc.id}] 임시 획득 · 안전 지면 착지 시 확정`);
    changed=true;
   }
  }else if(sc.state==='pending'){
   if(isSpecialCoinReturnSafe(sc)){
    sc.state='secured';
    secSet.add(sc.id);
    if(typeof DuduAnalytics!=='undefined')DuduAnalytics.special(sc.id,sc.levelId);
    burst(p.x,p.y-45,'#ffae2b',16);
    tone(980,.14,'sine',.05);
    notify(`황금 크레파스 [${sc.id}] 확보 완료 (${secSet.size} / ${TOTAL_SPECIAL_COINS})`);
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
 // Gate G1-2: Populate regular King Candies strictly from manual regularDefs with stable string IDs
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
   const cycle=(b.on||2.0)+(b.warning||0.55)+(b.off||0.95);
   const t=((b.phase||0)%cycle+cycle)%cycle;
   if(t<b.on){a.collidable=true;a.blinkState='on';a.blinkAlpha=1;}
   else if(t<b.on+b.warning){a.collidable=true;a.blinkState='warning';a.blinkAlpha=0.65;}
   else{a.collidable=false;a.blinkState='off';a.blinkAlpha=0.16;}
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
 if(typeof DuduAnalytics!=='undefined' && !back && target>levelIndex)DuduAnalytics.stageComplete(levelIndex);
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
 $('transitionHint').textContent=back?'잠시 돌아가는 길':(levelIndex===1?`황금 크레파스 ${secCount}/${TOTAL_SPECIAL_COINS} · 엄마에게 한 걸음 더 가까이`:'엄마에게 한 걸음 더 가까이');
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
    if(typeof DuduAnalytics!=='undefined')DuduAnalytics.stageEnter(tr.target);
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
 $('routeLabel').textContent=(eventMode||state==='ready'||state==='loading'?'본편':'연습 · 기록 제외')+'  '+(levelIndex+1)+' / 3';
 for(let i=0;i<3;i++)$('badge'+i).textContent=(routeDone[i]?'✓ ':levelIndex===i?'● ':'○ ')+levels[i].name;
}
function checkJourney(){
 if(state!=='playing')return;
 updateRegionHud();
 const l=levels[levelIndex];
 if(levelIndex===2&&p.x>=18000){
  p.guardStun=0;p.guardKnock=0;p.knock=0;
 }
 if(levelIndex<2&&p.x>END-100&&p.ground){beginRegionTransition(levelIndex+1);return;}
 if(levelIndex>0&&p.x<55&&p.ground&&p.face<0&&visited[levelIndex-1]){beginRegionTransition(levelIndex-1,true);return;}
 const g=l.goal;
 if(g&&p.x+18>=g.x&&p.x-18<=g.x+g.w&&Math.abs(p.y-g.y)<12&&p.ground){
  p.guardStun=0;p.guardKnock=0;p.knock=0;p.invulnerable=0;
  routeDone[2]=true;
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
 loadLevel(Math.min(n,2),{section:n===3?levels[2].sections.findIndex(s=>s.title==='교단 복도'):0});
 state='playing';updateRegionHud();keys.clear();canvas.focus();
}
async function loadWorldImages(){
 const bgLoads=worldFiles.map(n=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{worldImages[n]=im;if(typeof buildPreScaledPanorama==='function')buildPreScaledPanorama(n,im);ok();};im.onerror=no;im.src='assets/world/'+n+'.webp?v=12';}));
 const terrainLoads=TERRAIN_ASSET_LIST.map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{terrainImages[k]=im;ok();};im.onerror=no;im.src='assets/terrain/'+k+'.webp?v=12';}));
 const structureLoads=STRUCTURE_ASSET_LIST.map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{structureImages[k]=im;ok();};im.onerror=no;im.src='assets/structure/'+k+'.webp?v=12';}));
 const colLoads=['king_candy','golden_crayon'].map(k=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{collectibleImages[k]=im;ok();};im.onerror=no;im.src='assets/collectibles/'+k+'.png?v=12';}));
 const cloudLoads=Array.from({length:TRANSITION_FRAME_COUNT},(_,i)=>new Promise(ok=>{
  const im=new Image();
  im.onload=()=>{transitionFrames[i]=im;ok();};
  im.onerror=()=>ok();
  im.src=`assets/transition/cloud_${String(i).padStart(2,'0')}.webp?v=12`;
 }));
 await Promise.all([...bgLoads,...terrainLoads,...structureLoads,...colLoads,...cloudLoads]);
}
