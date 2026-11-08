'use strict';
// TEST12 Hazards & Encounters:
// - Gate G3: Monatium Guards (`guard1`, `guard2`) have active collision (`a.danger = true`) across ALL states (`wait`, `warn`, `rush`, `rest`, `return`) with swept horizontal segment check + strict vertical separation (0 false hits underneath bridges).
// - Gate G3-6: The 2 special guards on `M-GRD-BR3` protecting `M-GUARD-03` (`x=15980`, `x=16210`) have a 1.5x speed multiplier (`speedMult: 1.5`, rush & return 1.5x faster); the other 6 guards keep 1.0x speed.
// - Gate G4-2: Mayo resumes `chase` 0.20s after firing (`attackTime >= 0.84s`), and actual shot-to-shot interval is shortened by ~0.5s to ~4.80s (strictly >= 3.0s).
// - Gate G4-3: Erpien City `fairy1` / `fairy2` responsiveness increased by ~1.20x while preserving warning telegraph.
// - Gate G5-1: Non-essential encounter toast popups removed while preserving Mayo speech bubbles, Marie bomb telegraphs, Bukgyeong event, and Temple retreat (`x = 14300`).
const npcImages={};
let actors=[],bombs=[],windDarts=[],hazardClock=0,hitCount=0,arena=null,bukgyeongEvent=null;
let erpienChaseCompleted=false,erpienRetreatEvent=null,mayoCatchCount=0;
const npcCanvas=document.createElement('canvas');npcCanvas.width=npcCanvas.height=256;const nx=npcCanvas.getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const MAYO_SPEECH_LINES=[
 '흐흐흐 희귀한 야광용족 발견임',
 '야광용족 잠깐만 이리 오도록 함',
 '수집 가치 높은 대상임 이리로 옴',
 '머리카락만 조금 잘라갈 거임 걱정하지 마임'
];

// Gate G3 (Section 5.1 ~ 5.5): Suin Village Friendly NPCs (Diana, Kommy, Butter) Single Source of Truth
const VILLAGE_FRIEND_DEFS=[
 {
  id:'diana',kind:'diana',houseId:'V-PROP-HOUSE-A',
  x:648,y:580,face:-1,
  idleClip:'idle',happyClip:'happy',
  greetingText:'두두야 몸 조심히 다녀오렴',
  happyText:'두두구나~',
  greetRadius:175,happyRadius:155,happyDur:2.4
 },
 {
  id:'kommy',kind:'kommy',houseId:'V-PROP-HOUSE-B',
  x:3005,y:580,face:-1,
  idleClip:'melong',happyClip:'happy',
  greetingText:'두두 잘 다녀와, 코미는 이만 자야겠어',
  happyText:'교주 보고싶어. 지금 연회장 가면 사료 주려나? 하암',
  greetRadius:175,happyRadius:155,happyDur:2.6
 },
 {
  id:'butter',kind:'butter',houseId:'V-PROP-HOUSE-C',
  x:4785,y:580,face:-1,
  idleClip:'idle',happyClip:'happy',
  greetingText:'두두! 다음에 또 놀아! 버터 기다릴께!',
  happyText:'버터도 교주님 보고싶어! 다음에 만나면 같이 산책갈꺼야!',
  greetRadius:175,happyRadius:155,happyDur:2.6
 }
];
const villageFriendHappyPlayed=new Set();
let villageFriends=[];
window.__villageFriends=()=>villageFriends;
window.__villageFriendHappyPlayed=villageFriendHappyPlayed;

function resetVillageFriendRunState(){
 villageFriendHappyPlayed.clear();
 for(const vf of villageFriends){
  vf.happyPlayedThisRun=false;
  vf.state='idle';
  vf.stateTime=0;
  vf.clip=vf.idleClip;
  vf.anim=0;
 }
}
window.resetVillageFriendRunState=resetVillageFriendRunState;

function initVillageFriends(){
 villageFriends=VILLAGE_FRIEND_DEFS.map(d=>({
  ...d,
  near:false,
  greetingVisible:false,
  reenterCooldown:0,
  happyPlayedThisRun:villageFriendHappyPlayed.has(d.id),
  state:'idle',
  stateTime:0,
  clip:d.idleClip,
  anim:0
 }));
}

function isNearUnplayedVillageFriend(){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return false;
 if(levels[levelIndex]?.id!=='village')return false;
 return villageFriends.some(vf=>!vf.happyPlayedThisRun&&Math.abs(p.x-vf.x)<=vf.happyRadius);
}
window.isNearUnplayedVillageFriend=isNearUnplayedVillageFriend;

function onDuduCallPlayerVoice(clipName){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return false;
 if(levels[levelIndex]?.id!=='village')return false;
 if(!p.ground||Math.abs(p.vx)>12)return false;
 for(const vf of villageFriends){
  if(!vf.happyPlayedThisRun&&Math.abs(p.x-vf.x)<=vf.happyRadius){
   villageFriendHappyPlayed.add(vf.id);
   vf.happyPlayedThisRun=true;
   vf.state='happy';
   vf.stateTime=0;
   vf.clip=vf.happyClip;
   vf.anim=0;
   vf.lastTriggerVoice=clipName;
   burst(vf.x,vf.y-92,'#ffe066',10);
   tone(780,0.10,'triangle',0.035);
   return true;
  }
 }
 return false;
}
window.onDuduCallPlayerVoice=onDuduCallPlayerVoice;

function updateVillageFriends(dt){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return;
 if(levels[levelIndex]?.id!=='village')return;
 for(const vf of villageFriends){
  vf.anim+=dt;
  if(vf.reenterCooldown>0)vf.reenterCooldown=Math.max(0,vf.reenterCooldown-dt);
  const dist=Math.abs(p.x-vf.x);
  const inRange=dist<=vf.greetRadius;
  // Face Dudu naturally when nearby
  if(inRange&&Math.abs(p.x-vf.x)>12){
   vf.face=(p.x<vf.x)?-1:1;
  }
  if(inRange){
   if(!vf.near&&vf.reenterCooldown<=0){
    vf.near=true;
    vf.greetingVisible=true;
   }else if(vf.near){
    vf.greetingVisible=true;
   }
  }else{
   if(vf.near){
    vf.near=false;
    vf.greetingVisible=false;
    vf.reenterCooldown=0.35;
   }else{
    vf.greetingVisible=false;
   }
  }

  if(vf.state==='happy'){
   vf.stateTime+=dt;
   if(vf.clip!==vf.happyClip){vf.clip=vf.happyClip;vf.anim=0;}
   if(vf.stateTime>=vf.happyDur){
    vf.state='idle';
    vf.stateTime=0;
    vf.clip=vf.idleClip;
    vf.anim=0;
   }
  }else{
   if(vf.clip!==vf.idleClip){vf.clip=vf.idleClip;vf.anim=0;}
  }
 }
}

function drawVillageFriends(){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return;
 if(levels[levelIndex]?.id!=='village')return;
 for(const vf of villageFriends){
  if(vf.x<rCam-200||vf.x>rCam+W+200)continue;
  ellipse(vf.x,vf.y+2,24,4,'#34463b28');
  const key=`${vf.kind}_${vf.clip}`;
  const m=npcMeta[key]||npcMeta[`${vf.kind}_idle`];
  const im=npcImages[key]||npcImages[`${vf.kind}_idle`];
  if(m&&im&&im.complete&&im.naturalWidth>0){
   const duration=m.frames/m.fps;
   const rawFrame=(vf.state==='happy')?Math.min(m.frames-1,vf.anim*m.fps):((vf.anim%duration)*m.fps);
   const f=Math.max(0,Math.min(m.frames-1,Math.floor(rawFrame)%m.frames));
   nx.clearRect(0,0,256,256);
   nx.save();
   nx.globalCompositeOperation='source-over';
   nx.globalAlpha=1;
   nx.drawImage(im,(f%m.cols)*256,Math.floor(f/m.cols)*256,256,256,0,0,256,256);
   nx.restore();
   ctx.save();
   ctx.translate(Math.round(vf.x),Math.round(vf.y));
   ctx.scale(-vf.face,1);
   const size=m.display||146;
   ctx.drawImage(npcCanvas,-Math.round((m.anchor/256)*size),-Math.round((m.foot/256)*size),size,size);
   ctx.restore();
  }
  // Priority: Happy > Normal Pass-By Greeting; hide if off-screen
  const onScreen=(vf.x>=rCam+40&&vf.x<=rCam+W-40);
  if(onScreen){
   if(vf.state==='happy'){
    bubble(vf.happyText,vf.x,vf.y-152,'#ffe8f0');
   }else if(vf.greetingVisible){
    bubble(vf.greetingText,vf.x,vf.y-152,'#fff8e7');
   }
  }
 }
}

const encounterPresets={
 tower:{levelId:'monatium',title:'상승 타워 입구',x:4180,y:580},
 skywalk:{levelId:'monatium',title:'모나티엄 옥상 입구',x:6160,y:-1785},
 descent:{levelId:'monatium',title:'옥상 하강 입구',x:12120,y:-1730},
 guards:{levelId:'monatium',title:'진압반 공중 교량',x:17120,y:580},
 bukgyeong:{levelId:'monatium',title:'북경성 앞 광장',x:25750,y:580},
 mayo:{levelId:'erpien',title:'에르피엔 도심 입구',x:5520,y:580},
 fairies:{levelId:'erpien',title:'빵집 처마 거리',x:8950,y:580},
 marie:{levelId:'erpien',title:'마리 광장 진입로',x:16370,y:540}
};

const BUKGYEONG_LANDMARK={
 get bldgX(){return (typeof STAGE_ANCHORS!=='undefined')?STAGE_ANCHORS.monatium.bukgyeongBldgX:23380;},
 bldgY:580,
 bldgScale:1.42,
 doorLocalX1:162,
 doorLocalMid:201,
 doorLocalX2:240,
 doorLocalY1:116,
 doorLocalY2:242,
 get doorCenterX(){return Math.round(this.bldgX+this.doorLocalMid*this.bldgScale);} // 23665
};

const BEHAVIOR_PROFILES={
 guard1:{patrol:185,speed:154,warnTime:1.12,waitTime:0.82,restTime:1.50,returnSpeed:110,hesitateAt:0.24,hesitateDur:0.16,style:'guard'},
 guard2:{patrol:170,speed:186,warnTime:1.08,waitTime:0.70,restTime:1.45,returnSpeed:116,hesitateAt:0.0,hesitateDur:0.0,style:'guard'},
 fairy1:{patrol:195,speed:178,warnTime:1.02,waitTime:0.66,restTime:1.35,returnSpeed:134,hesitateAt:0.20,hesitateDur:0.14,style:'fairy'},
 fairy2:{patrol:200,speed:212,warnTime:0.98,waitTime:0.60,restTime:1.25,returnSpeed:142,hesitateAt:0.16,hesitateDur:0.12,style:'fairy'}
};

function resetErpienEncounterState(){
 erpienChaseCompleted=false;
 erpienRetreatEvent=null;
 windDarts=[];
 bombs=[];
}

function npcSeedUnit(seed,step){
 let h=(seed^(step*0x9e3779b9))|0;
 h=Math.imul(h^(h>>>16),0x85ebca6b);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);
 return ((h^(h>>>16))>>>0)/4294967296;
}

function naturalMoveCurve(u,hesitateAt=0,hesitateDur=0){
 u=clamp(u,0,1);
 if(hesitateDur>0&&hesitateAt>0){
  const hEnd=hesitateAt+hesitateDur;
  if(u<hesitateAt){
   const t=u/hesitateAt;
   return hesitateAt*(t*t*(3-2*t));
  }else if(u<hEnd){
   const t=(u-hesitateAt)/hesitateDur;
   return hesitateAt+0.03*t;
  }else{
   const t=(u-hEnd)/(1-hEnd);
   const ease=t*t*(3-2*t);
   return (hesitateAt+0.03)+(1-(hesitateAt+0.03))*ease;
  }
 }
 return u*u*(3-2*u);
}

function actor(kind,x,y=580,extra={}){
 const prof=BEHAVIOR_PROFILES[kind]||{};
 const seed=Math.abs(((Math.round(x)*2654435761)^(kind.charCodeAt(0)*73856093))|0)||97;
 const anchorPlat=extra.platformId?platforms.find(pl=>pl.id===extra.platformId):null;
 const baseY=anchorPlat?anchorPlat.y:y;
 const minX=anchorPlat?(anchorPlat.x+32):(extra.minX??20);
 const maxX=anchorPlat?(anchorPlat.x+anchorPlat.w-32):(extra.maxX??(END-20));
 const clampedHome=clamp(x,minX,maxX);
 const speedMult=extra.speedMult||1.0;
 const baseSpeed=extra.baseSpeed||extra.speed||(prof.speed||160);
 const baseReturnSpeed=extra.baseReturnSpeed||extra.returnSpeed||(prof.returnSpeed||112);
 return {
  kind,home:clampedHome,x:clampedHome,y:baseY,prevX:clampedHome,prevY:baseY,from:clampedHome,to:clampedHome,face:extra.patrolDir||-1,
  patrolDir:extra.patrolDir||-1,
  platformId:extra.platformId||null,
  minX,maxX,
  phase:'idle',phaseTime:0,cycle:0,seed,
  active:false,danger:false,
  clip:'idle',anim:0,oldClip:null,oldAnim:0,blend:1,
  patrol:prof.patrol||180,
  speedMult,
  baseSpeed,
  speed:Math.round(baseSpeed*speedMult),
  ...extra,
  speedMult,
  baseSpeed,
  speed:Math.round(baseSpeed*speedMult),
  returnSpeed:Math.round(baseReturnSpeed*speedMult),
  profile:prof
 };
}

function initBukgyeongEvent(){
 const doorX=BUKGYEONG_LANDMARK.doorCenterX;
 return {doorX,y:580,state:'waiting',elapsed:0,doorOpen:0,doorShake:0,completedRuns:0};
}

function resetHazards(){
 hazardClock=0;bombs=[];windDarts=[];arena=null;bukgyeongEvent=null;erpienRetreatEvent=null;
 p.invulnerable=0;p.knock=0;p.knockVX=0;p.guardStun=0;p.guardKnock=0;
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  actors=[];
  if(typeof resetChallengeHazards==='function')resetChallengeHazards();
  return;
 }
 const curId=levels[levelIndex]?.id;
 if(curId==='monatium'){
  const doorX=BUKGYEONG_LANDMARK.doorCenterX;
  bukgyeongEvent=initBukgyeongEvent();
  actors=[
   // M5-G1 (Gate 8 de-crowded: M-G1-LOW1 [14500..14790, y=420] & M-G1-LOW2 [15790..16100, y=480])
   actor('guard1',14740,420,{id:'G-01',platformId:'M-G1-LOW1',patrol:195,baseSpeed:162,returnSpeed:132,speedMult:1.05,patrolDir:-1}),
   actor('guard2',16040,480,{id:'G-02',platformId:'M-G1-LOW2',patrol:215,baseSpeed:176,returnSpeed:142,speedMult:1.08,patrolDir:-1,delay:0.30}),
   // M5-G2 (Gate 8 de-crowded: M-GRD-BR1 [17650..17950, y=420], M-GRD-BR2 [19240..19530, y=460])
   actor('guard1',17905,420,{id:'G-03',platformId:'M-GRD-BR1',patrol:215,baseSpeed:172,returnSpeed:138,speedMult:1.15,patrolDir:-1}),
   actor('guard2',19285,460,{id:'G-04',platformId:'M-GRD-BR2',patrol:205,baseSpeed:182,returnSpeed:145,speedMult:1.15,patrolDir:1,delay:0.35}),
   // M5-G3 (Gate 8 de-crowded: M-G3-MID1 [21090..21375, y=500], M-G3-UPPER [21560..21855, y=345], M-G3-MID2 [22765..23010, y=515])
   actor('guard1',21330,500,{id:'G-05',platformId:'M-G3-MID1',patrol:195,baseSpeed:168,returnSpeed:138,speedMult:1.08,patrolDir:-1}),
   actor('guard2',21605,345,{id:'G-06',platformId:'M-G3-UPPER',patrol:205,baseSpeed:184,returnSpeed:146,speedMult:1.10,patrolDir:1,delay:0.40}),
   actor('guard1',22960,515,{id:'G-06B',platformId:'M-G3-MID2',patrol:165,baseSpeed:172,returnSpeed:140,speedMult:1.08,patrolDir:-1,delay:0.20}),
   // M5-G4 (Gate 8 de-crowded: M-GRD-BR3A [23780..24060, y=485] & M-GRD-BR3B [24470..24755, y=400])
   actor('guard1',24015,485,{id:'G-07-BR3',platformId:'M-GRD-BR3A',patrol:205,baseSpeed:168,returnSpeed:165,speedMult:1.5,specialGuard:true,patrolDir:-1,delay:0.0}),
   actor('guard2',24515,400,{id:'G-08-BR3',platformId:'M-GRD-BR3B',patrol:210,baseSpeed:182,returnSpeed:174,speedMult:1.5,specialGuard:true,patrolDir:1,delay:0.55}),
   // M6 (25060~26800): Beijing Castle Single-Door Easter Egg at doorCenterX = 26465
   actor('president',doorX,580,{photo:true,cutout:'president_cutout',patrol:390,speed:230,hiddenInDoor:true}),
   actor('vice',doorX,580,{photo:true,cutout:'vice_cutout',patrol:510,speed:305,hiddenInDoor:true})
  ];
  }else if(curId==='erpien'){
   const e=STAGE_ANCHORS.erpien;
   const exitWall=platforms.find(pl=>pl.id==='B-EXIT-WALL');
   if(p.x<e.templeStart){
    erpienChaseCompleted=false;
    if(exitWall){exitWall.hidden=false;exitWall.nonCollidable=false;exitWall.collidable=true;}
   }else{
    erpienChaseCompleted=true;
    if(exitWall){exitWall.hidden=true;exitWall.nonCollidable=true;exitWall.collidable=false;}
   }
   const inBossStart=(p.x>=e.marieStart&&p.x<e.templeStart&&!erpienChaseCompleted);
   actors=[
    actor('mayo',inBossStart?e.mayoBossX:5320,inBossStart?e.mayoBossY:580,{
     chaser:true,active:inBossStart,retreating:false,
     mode:inBossStart?'BOSS_SNIPER':'CHASE',currentSpeed:306,accel:520,
     vy:0,inAir:false,spawnGrace:1.4,
     fireCooldown:inBossStart?1.48:999,attackTime:0,
     firedInCycle:false,firedSecondInCycle:false,firedThirdInCycle:false,
     aimLocked:false,aimTargetX:e.centerSpawnX,aimTargetY:e.centerSpawnY-34,
     groggyTimer:0,groggyBubble:'',
     shotCount:0,burstCount:1,bossBurstCount:0,profileStage:'A',
     speechTimer:1.2,speechDuration:0,speechText:'',lastSpeechIdx:-1
    }),
    actor('fairy1',8920,580,{id:'F-01',platformId:'E-CITY-GND3',patrol:190,baseSpeed:178,speedMult:1.20}),
    actor('fairy2',10480,580,{id:'F-02',platformId:'E-CITY-GND4',patrol:190,baseSpeed:212,speedMult:1.20}),
    actor('fairy1',12220,580,{id:'F-03',platformId:'E-CITY-GND5',patrol:185,baseSpeed:192,speedMult:1.20}),
    actor('marie',e.mariePerchX,e.mariePerchY,{
     id:'MARIE',platformId:'B-MARIE-PODIUM',retreating:false,
     groggyTimer:0,invulnTimer:0,groggyBubble:''
    })
   ];
   arena={
    start:e.marieStart,end:e.marieEnd,
    entered:inBossStart,
    active:inBossStart,
    phase:inBossStart?'combat':'waiting',
    introTimer:0,
    bannerTimer:inBossStart?2.2:0,
    bannerText:'마요를 유도해 마리를 세 번 맞추세요!',
    marieHits:0,
    maxHits:3,
    marieInvulnTimer:0,
    groggyTimer:0,
    finaleTimer:0,
    finaleStep:0,
    counterBomb:null,
    stage:1,
    cooldown:1.65,
    casting:false,
    castTime:0,
    released:false,
    volleys:0,
    passed:false,
    resetCount:(arena?.resetCount||0)+(inBossStart?1:0)
   };
 }else if(curId==='village'){
  actors=[];
  initVillageFriends();
 }else{
  actors=[];
 }
 $('encounterStatus').textContent='';
}

function npcClip(a,name){if(a.clip===name)return;a.oldClip=a.clip;a.oldAnim=a.anim;a.clip=name;a.anim=0;a.blend=0;}

function applyStunHit(sourceX,sourceKind='generic',customMsg=null){
 if(state!=='playing'||p.invulnerable>0)return false;
 const isBukgyeong=sourceKind==='president'||sourceKind==='vice';
 const dir=p.x>=sourceX?1:-1;

 if(isBukgyeong){
  let force=180;
  if(p.ground&&p.on){const margin=dir<0?p.x-p.on.x-24:p.on.x+p.on.w-p.x-24;force=Math.min(force,Math.max(0,margin)/.22);}
  p.invulnerable=1.5;p.knock=.18;p.knockVX=dir*force;p.vx=p.knockVX;p.vy=-190;p.dash=0;p.buffer=0;p.jumpHeld=false;p.ground=false;p.on=null;p.coyote=0;p.jumps=Math.max(1,p.jumps);hitCount++;
  burst(p.x,p.y-30,'#ffe1a1',8);tone(220,.12,'triangle',.035);notify('앗! 북경성 돌출에 밀렸어요!');
  return true;
 }

 let force=320;
 if(p.ground&&p.on){
  const margin=dir<0?p.x-p.on.x-26:p.on.x+p.on.w-p.x-26;
  if(margin>0)force=Math.min(force,Math.max(175,margin/0.26));
 }
 p.invulnerable=2.15;
 p.guardStun=1.50;
 p.guardKnock=0.26;
 p.knock=0;
 p.knockVX=dir*force;
 p.vx=p.knockVX;
 p.vy=-230;
 p.dash=0;p.buffer=0;p.jumpHeld=false;dashRequest=false;
 p.ground=false;p.on=null;p.coyote=0;p.jumps=Math.max(1,p.jumps);
 hitCount++;
 burst(p.x,p.y-35,'#ff9e7d',12);
 tone(165,.18,'sawtooth',.045);
 if(typeof playDuduVoice==='function')playDuduVoice('hit_stun');
 if(customMsg)notify(customMsg);
 return true;
}

function hitPlayer(sourceX,sourceKind='generic'){
 return applyStunHit(sourceX,sourceKind);
}

// Gate G3: Swept horizontal overlap + strict vertical separation so passing underneath a bridge NEVER triggers an overhead guard hit
function touchesActor(a){
 if(a.hiddenInDoor||a.retreating)return false;
 // Require vertical foot-to-body overlap AND prevent hitting an actor standing on a platform above the player's head
 if(a.y<p.y-46)return false;
 if(!(p.y>a.y-64&&p.y-56<a.y-4))return false;

 const hitW=a.photo?42:34;
 const pMinX=Math.min(p.prevX??p.x,p.x);
 const pMaxX=Math.max(p.prevX??p.x,p.x);
 const aMinX=Math.min(a.prevX??a.x,a.x)-hitW;
 const aMaxX=Math.max(a.prevX??a.x,a.x)+hitW;
 return pMaxX>aMinX&&pMinX<aMaxX;
}

function updateBukgyeong(dt){
 if(!bukgyeongEvent)return;
 const ev=bukgyeongEvent;
 const pres=actors.find(a=>a.kind==='president');
 const vice=actors.find(a=>a.kind==='vice');
 if(!pres||!vice)return;
 const doorX=ev.doorX;

 if(ev.state==='waiting'){
  pres.hiddenInDoor=true;vice.hiddenInDoor=true;
  pres.danger=false;vice.danger=false;
  ev.doorOpen=0;ev.doorShake=0;
  if(p.x>=doorX-470&&p.x<=doorX+180){
   ev.state='prewarn';ev.elapsed=0;
   tone(540,.09,'triangle',.03);
  }
  return;
 }

 ev.elapsed+=dt;

 if(ev.state==='prewarn'){
  pres.hiddenInDoor=true;vice.hiddenInDoor=true;
  ev.doorShake=Math.sin(ev.elapsed*48)*3.5;
  ev.doorOpen=clamp((ev.elapsed-0.55)/0.30,0,1);
  if(ev.elapsed>=0.85){
   ev.state='active';ev.elapsed=0;ev.doorShake=0;ev.doorOpen=1;
   tone(680,.11,'sine',.035);
  }
  return;
 }

 if(ev.state==='active'){
  const t=ev.elapsed;
  if(t<7.4)ev.doorOpen=1;
  else ev.doorOpen=clamp(1-(t-7.4)/0.45,0,1);

  if(t<1.30){
   pres.hiddenInDoor=false;pres.active=true;pres.phase='rush';pres.danger=t>0.08&&t<1.22;pres.face=-1;
   pres.x=doorX-380*naturalMoveCurve(t/1.30);
  }else if(t<3.35){
   pres.hiddenInDoor=false;pres.active=true;pres.phase='rest';pres.danger=false;pres.face=-1;
   pres.x=doorX-380;
  }else if(t<5.60){
   pres.hiddenInDoor=false;pres.active=true;pres.phase='return';pres.danger=false;pres.face=1;
   pres.x=(doorX-380)+380*naturalMoveCurve((t-3.35)/2.25);
  }else{
   pres.hiddenInDoor=true;pres.active=false;pres.phase='idle';pres.danger=false;pres.x=doorX;
  }

  if(t<1.20){
   vice.hiddenInDoor=true;vice.active=false;vice.phase='idle';vice.danger=false;vice.x=doorX;
  }else if(t<1.85){
   vice.hiddenInDoor=true;vice.active=true;vice.phase='warn';vice.danger=false;vice.x=doorX;
  }else if(t<3.25){
   vice.hiddenInDoor=false;vice.active=true;vice.phase='rush';vice.danger=t>1.95&&t<3.15;vice.face=-1;
   vice.x=doorX-500*naturalMoveCurve((t-1.85)/1.40);
  }else if(t<5.20){
   vice.hiddenInDoor=false;vice.active=true;vice.phase='rest';vice.danger=false;vice.face=-1;
   vice.x=doorX-500;
  }else if(t<7.80){
   vice.hiddenInDoor=false;vice.active=true;vice.phase='return';vice.danger=false;vice.face=1;
   vice.x=(doorX-500)+500*naturalMoveCurve((t-5.20)/2.60);
  }else{
   vice.hiddenInDoor=true;vice.active=false;vice.phase='idle';vice.danger=false;vice.x=doorX;
  }

  if(pres.danger&&touchesActor(pres))applyStunHit(pres.x,'president');
  if(vice.danger&&touchesActor(vice))applyStunHit(vice.x,'vice');

  if(t>=10.0){
   ev.state='cooldown';ev.elapsed=0;ev.doorOpen=0;ev.doorShake=0;ev.completedRuns++;
  }
  return;
 }

 if(ev.state==='cooldown'){
  if(!eventMode&&ev.elapsed>=3.5){ev.state='waiting';ev.elapsed=0;}
 }
}

function updateWalker(a,dt){
 if(a.photo||a.chaser||a.retreating)return;
 if(a.platformId){
  const pl=platforms.find(x=>x.id===a.platformId);
  if(pl){
   a.y=pl.y;
   a.minX=pl.x+32;
   a.maxX=pl.x+pl.w-32;
   if(pl.dx)a.home=clamp(a.home+pl.dx,a.minX,a.maxX);
  }
 }
 const prof=a.profile||BEHAVIOR_PROFILES.guard1;
 const isGuard=a.kind.startsWith('guard');
 const dirSign=a.patrolDir||-1;
 const vVar=0.94+0.12*npcSeedUnit(a.seed,a.cycle*7+1);
 const pVar=0.95+0.10*npcSeedUnit(a.seed,a.cycle*7+2);
 const waitDur=prof.waitTime*vVar;
 const warnDur=Math.max(0.95,prof.warnTime);
 const rawPatrol=Math.round(a.patrol*pVar);
 const targetUnclamped=a.home+dirSign*rawPatrol;
 const clampedTo=clamp(targetUnclamped,a.minX,a.maxX);
 const patrolDist=Math.max(40,Math.abs(clampedTo-a.home));
 const effSpeed=a.speed||(prof.speed||160);
 const effReturnSpeed=a.returnSpeed||(prof.returnSpeed||112);
 const rushDur=patrolDist/(effSpeed*vVar);
 const restDur=prof.restTime*vVar;
 const returnDur=patrolDist/effReturnSpeed;

 if(!a.active&&Math.abs(p.x-a.home)<820){
  a.active=true;a.phase='wait';a.phaseTime=-(a.delay||0);
 }
 if(!a.active)return;

 a.phaseTime+=dt;
 // Gate G3: Guards have active contact hitbox in ALL visible states (wait, warn, rush, rest, return)!
 a.danger=isGuard?true:false;

 if(a.phase==='wait'){
  npcClip(a,'idle');
  if(a.phaseTime>waitDur*0.55&&prof.style==='guard')a.face=-dirSign;
  else a.face=dirSign;
  if(a.phaseTime>=waitDur){
   a.face=dirSign;a.phase='warn';a.phaseTime=0;npcClip(a,'warn');
   a.curTo=clampedTo;a.curPatrol=patrolDist;
   if(Math.abs(p.x-a.x)<600)tone(620,.08,'triangle',.02);
  }
 }else if(a.phase==='warn'){
  npcClip(a,'warn');a.face=dirSign;
  if(a.phaseTime>=warnDur){
   a.phase='rush';a.phaseTime=0;a.from=a.home;a.to=clampedTo;
   a.curPatrol=patrolDist;a.curRushDur=rushDur;a.face=dirSign;npcClip(a,'move');
  }
 }else if(a.phase==='rush'){
  const dur=a.curRushDur||rushDur;
  const rawU=clamp(a.phaseTime/dur,0,1);
  const curvedU=naturalMoveCurve(rawU,prof.hesitateAt,prof.hesitateDur);
  a.x=clamp(a.from+(a.to-a.from)*curvedU,a.minX,a.maxX);
  a.danger=isGuard?true:(rawU>=0.04&&rawU<=0.96);
  if(rawU>=1){
   a.x=a.to;a.phase='rest';a.phaseTime=0;a.danger=isGuard;npcClip(a,'idle');
  }
 }else if(a.phase==='rest'){
  npcClip(a,'idle');
  if(a.phaseTime>=restDur){
   a.phase='return';a.phaseTime=0;a.from=a.x;a.curReturnDur=returnDur;a.face=-dirSign;npcClip(a,'move');
  }
 }else if(a.phase==='return'){
  const dur=a.curReturnDur||returnDur;
  const rawU=clamp(a.phaseTime/dur,0,1);
  const curvedU=naturalMoveCurve(rawU,0,0);
  a.x=clamp(a.from+(a.home-a.from)*curvedU,a.minX,a.maxX);
  if(rawU>=1){
   a.x=a.home;a.face=dirSign;a.phase='wait';a.phaseTime=0;a.cycle++;npcClip(a,'idle');
  }
 }
 if(a.danger&&touchesActor(a))applyStunHit(a.x,a.kind);
}

// Gate 5 (P0): Mayo True Catch-Reset Pursuit AI!
// - Directly pursues `p.x` (no 220px standoff!)
// - Swept body contact in ANY active state (`chase`, `attack`, `jump`) triggers immediate checkpoint reset (`triggerMayoCatchReset`), preserving timer, candies, and SECURED crayons while rolling back PENDING crayons.
// - Wind-gun projectiles keep the 1.5s stun (`applyStunHit`), creating a lethal stun -> catch combo if the player fails to dodge!
// Section 6-3: Continuous Mayo firing interval acceleration from city entry (x=5500, cooldownBase=4.40s)
// all the way to Marie Plaza entry (x=15700, cooldownBase=2.65s), while preserving fair dodge windows!
// Gate G6-1 & TEST20A (Gates A ~ E):
// 1. E2 (x = 5500 -> 15700): Mayo continuous pursuit acceleration (`speedClose: 306 -> 418`, `speedCatchup: 338 -> 468`).
// 2. E3 Sketch Boss Arena (`x = 15700 .. 17200`):
//    - Upon entry, Dudu is placed on `B-CENTER-SPAWN` (`16370, 540`), checkpoint is locked to `B-CENTER-SPAWN`,
//      and a 1-time intro banner `"마요를 유도해 마리를 세 번 맞추세요!"` is shown while attacks pause.
//    - Mayo stands fixed on `B-EXIT-RIGHT` (`16890, 520`, muzzle `16848, 462`, facing left `-1`) and aims at Dudu,
//      locking `(aimTargetX, aimTargetY)` shortly before firing a straight-line wind dart (`620 px/s`, 0 homing).
//    - When Dudu lures Mayo's shot from the left upper platform (`B-LEFT-PAD-B` / jump arc) and evades, the straight-line
//      wind dart passes through Marie's hitbox (`x = 16342..16398, y = 210..303`) on `B-MARIE-PODIUM` (`16370, 305`),
//      consuming the dart on first contact, incrementing `arena.marieHits` (`0/3 -> 1/3 -> 2/3 -> 3/3`), and triggering
//      Marie's groggy state (`1.6s`).
//    - On the 3rd hit (`3/3`), Marie enters final groggy -> throws a counter-bomb onto Mayo (`16890, 520`) -> Mayo enters
//      groggy -> both NPCs retreat -> `B-EXIT-WALL` (`17010`) vanishes (both collision & sprite simultaneously) -> Dudu
//      walks across `B-EXIT-RIGHT` into E4 Temple (`17200`) with zero teleportation!

// Gate G5 (Section 7.1 & 7.2):
// - Mayo max pursuit speed in E2 is slightly below Dudu's 320 px/s run speed (ramping smoothly from 278 -> 304 px/s).
// - Zero close-range slowdown (`speedClose === speedCatchup === chaseSpeed`), so Mayo pursues all the way without hesitating.
// - Wind-gun firing is completely disabled during E2 `CHASE` (`fireEnabledInChase: false`), while E3 `BOSS_SNIPER` fires normally!
function getMayoProfile(px){
 const e=STAGE_ANCHORS.erpien;
 const prog=clamp((px-e.mayoActivateX)/Math.max(1,e.marieStart-e.mayoActivateX),0,1);
 // Gate 9 (P1): Initial speed ~279 px/s, late-stage top pursuit speed 314 px/s (strictly < Dudu's 320 px/s run speed, clear dash separation!)
 const chaseSpeed=Math.round(279+35*Math.pow(prog,0.85)); // 279 -> 314 px/s
 const smoothAccel=Math.round(550+210*prog);
 const stage=prog<0.35?'A':prog<0.70?'B':'C';
 return {
  stage,progress:Number(prog.toFixed(3)),
  speedClose:chaseSpeed,
  speedCatchup:chaseSpeed,
  chaseSpeed,
  accel:smoothAccel,
  fireEnabledInChase:false,
  cooldownBase:999,
  dartSpeed:0,
  burstCount:0
 };
}

function triggerMayoCatchReset(a){
 if(state!=='playing')return false;
 mayoCatchCount++;
 deaths++;
 burst(p.x,p.y-35,'#ff6b6b',16);
 tone(150,.22,'sawtooth',.055);
 if(typeof playDuduVoice==='function')playDuduVoice('hit_stun');
 reset(false);
 const mayoAfter=actors.find(x=>x.kind==='mayo');
 if(mayoAfter){
  mayoAfter.spawnGrace=1.50;
  if(p.x>=STAGE_ANCHORS.erpien.mayoActivateX&&p.x<STAGE_ANCHORS.erpien.marieStart){
   mayoAfter.active=true;
   mayoAfter.mode='CHASE';
   mayoAfter.x=Math.max(STAGE_ANCHORS.erpien.gateEnd+40,p.x-360);
   mayoAfter.prevX=mayoAfter.x;
   mayoAfter.y=p.y;
   mayoAfter.prevY=p.y;
   mayoAfter.phase='chase';
   mayoAfter.fireCooldown=2.2;
  }
 }
 notify('마요에게 붙잡혔어요! 체크포인트에서 다시 출발합니다.');
 return true;
}

function enterMarieBossArena(){
 const e=STAGE_ANCHORS.erpien;
 const spawnPlat=platforms.find(pl=>pl.id==='B-CENTER-SPAWN');
 const marieSecIdx=sections.findIndex(s=>Math.abs(s.x-e.centerSpawnX)<40);
 if(marieSecIdx>=0)checkpoint=marieSecIdx;
 p.x=e.centerSpawnX;
 p.y=e.centerSpawnY;
 p.prevX=p.x;
 p.prevY=p.y;
 p.vx=0;
 p.vy=0;
 p.ground=true;
 p.on=spawnPlat||p.on;
 p.jumps=0;
 p.airDashUsed=false;
 p.dash=0;
 p.guardStun=0;
 p.guardKnock=0;
 p.knock=0;
 p.invulnerable=1.2;
 keys.clear();

 windDarts=[];
 bombs=[];
 const exitWall=platforms.find(pl=>pl.id==='B-EXIT-WALL');
 if(exitWall){
  exitWall.hidden=false;
  exitWall.nonCollidable=false;
  exitWall.collidable=true;
 }

 const mayo=actors.find(a=>a.kind==='mayo');
 if(mayo){
  mayo.active=true;
  mayo.retreating=false;
  mayo.hiddenInDoor=false;
  mayo.mode='BOSS_SNIPER';
  mayo.x=e.mayoBossX;
  mayo.y=e.mayoBossY;
  mayo.prevX=mayo.x;
  mayo.prevY=mayo.y;
  mayo.face=-1;
  mayo.phase='idle';
  mayo.attackTime=0;
  mayo.fireCooldown=1.48;
  mayo.aimLocked=false;
  mayo.aimTargetX=e.centerSpawnX;
  mayo.aimTargetY=e.centerSpawnY-34;
  mayo.groggyTimer=0;
  mayo.groggyBubble='';
  npcClip(mayo,'idle');
 }

 const marie=actors.find(a=>a.kind==='marie');
 if(marie){
  marie.active=true;
  marie.retreating=false;
  marie.hiddenInDoor=false;
  marie.x=e.mariePerchX;
  marie.y=e.mariePerchY;
  marie.prevX=marie.x;
  marie.prevY=marie.y;
  marie.face=-1;
  marie.groggyTimer=0;
  marie.invulnTimer=0;
  marie.groggyBubble='';
  npcClip(marie,'idle');
 }

 arena.entered=true;
 arena.active=true;
 arena.phase='intro';
 arena.introTimer=1.35;
 arena.bannerTimer=2.8;
 arena.bannerText='마요를 유도해 마리를 세 번 맞추세요!';
 arena.marieHits=0;
 arena.marieInvulnTimer=0;
 arena.groggyTimer=0;
 arena.finaleTimer=0;
 arena.finaleStep=0;
 arena.counterBomb=null;
 arena.casting=false;
 arena.castTime=0;
 arena.cooldown=1.65;
 notify('마요를 유도해 마리를 세 번 맞추세요!');
 tone(660,0.12,'triangle',0.04);
}

function startBoss3HitFinale(){
 if(!arena||arena.phase==='finale'||erpienChaseCompleted)return;
 arena.phase='finale';
 arena.finaleTimer=0;
 arena.finaleStep=1;
 arena.casting=false;
 arena.castTime=0;
 arena.groggyTimer=0;
 windDarts=[];
 bombs=[];
 p.guardStun=0;
 p.guardKnock=0;
 p.knock=0;
 p.invulnerable=4.5;

 const marie=actors.find(a=>a.kind==='marie');
 const mayo=actors.find(a=>a.kind==='mayo');
 if(marie){
  marie.groggyTimer=1.0;
  marie.groggyBubble='으아앙! 세 번이나 맞았잖아! 마요 너 받아라~!';
  npcClip(marie,'idle');
 }
 if(mayo){
  mayo.phase='idle';
  mayo.groggyBubble='엇?! 마리님 왜 저한테 던지는 거임?!';
  npcClip(mayo,'idle');
 }
 tone(880,0.16,'sine',0.05);
}

function updateBossFinale(dt){
 if(!arena||arena.phase!=='finale')return;
 arena.finaleTimer+=dt;
 const t=arena.finaleTimer;
 const e=STAGE_ANCHORS.erpien;
 const marie=actors.find(a=>a.kind==='marie');
 const mayo=actors.find(a=>a.kind==='mayo');

 if(t>=0.85&&arena.finaleStep===1){
  arena.finaleStep=2;
  if(marie){
   marie.face=1;
   marie.groggyTimer=0;
   marie.groggyBubble='마요한테 폭탄 반격이다~!';
   npcClip(marie,'throw');
  }
  arena.counterBomb={
   x0:e.mariePerchX+20,
   y0:e.mariePerchY-72,
   tx:e.mayoBossX,
   ty:e.mayoBossY,
   bx:e.mariePerchX+20,
   by:e.mariePerchY-72,
   age:0,
   flight:0.95,
   exploded:false
  };
  tone(520,0.12,'triangle',0.045);
 }

 if(arena.counterBomb){
  const cb=arena.counterBomb;
  cb.age+=dt;
  const u=clamp(cb.age/cb.flight,0,1);
  cb.bx=cb.x0+(cb.tx-cb.x0)*u;
  cb.by=cb.y0+(cb.ty-18-cb.y0)*u-195*4*u*(1-u);
  if(cb.age>=cb.flight&&!cb.exploded){
   cb.exploded=true;
   arena.finaleStep=3;
   burst(cb.tx,cb.ty-36,'#ff922b',24);
   burst(cb.tx,cb.ty-52,'#ffd43b',18);
   tone(140,0.22,'sawtooth',0.055);
   if(mayo){
    mayo.groggyTimer=1.15;
    mayo.groggyBubble='으아악! 팀킬은 반칙임~!!';
    npcClip(mayo,'idle');
   }
   if(marie){
    npcClip(marie,'idle');
    marie.groggyBubble='흥! 난 교단 안으로 후퇴할 거야!';
   }
  }
 }

 if(t>=2.75&&arena.finaleStep===3){
  arena.finaleStep=4;
  // Open B-EXIT-WALL (simultaneously remove collision and visual)!
  const exitWall=platforms.find(pl=>pl.id==='B-EXIT-WALL');
  if(exitWall){
   exitWall.hidden=true;
   exitWall.nonCollidable=true;
   exitWall.collidable=false;
   for(let wy=60;wy<=480;wy+=70){
    burst(exitWall.x+32,wy,'#d0bfff',10);
   }
  }
  if(marie){
   marie.retreating=true;
   marie.face=-1;
   marie.groggyTimer=0;
   npcClip(marie,'move');
  }
  if(mayo){
   mayo.retreating=true;
   mayo.face=1;
   mayo.groggyTimer=0;
   npcClip(mayo,'move');
  }
  notify('출구 차단벽이 열렸어요! 오른쪽 지면을 따라 교단으로 이동하세요.');
  tone(920,0.18,'sine',0.05);
 }

 if(arena.finaleStep===4){
  if(marie&&marie.retreating){
   marie.y-=260*dt;
   marie.x-=120*dt;
  }
  if(mayo&&mayo.retreating){
   mayo.x+=320*dt;
  }
  if(t>=3.85){
   erpienChaseCompleted=true;
   arena.active=false;
   arena.passed=true;
   arena.phase='cleared';
   arena.counterBomb=null;
   if(marie){marie.active=false;marie.retreating=false;marie.hiddenInDoor=true;}
   if(mayo){mayo.active=false;mayo.retreating=false;mayo.hiddenInDoor=true;}
  }
 }
}

function updateMayo(a,dt){
 if(!a||levels[levelIndex]?.id!=='erpien')return;
 if(erpienChaseCompleted||a.retreating)return;
 if(a.spawnGrace>0)a.spawnGrace=Math.max(0,a.spawnGrace-dt);

 const e=STAGE_ANCHORS.erpien;

 // Check if in E3 Boss Arena (`BOSS_SNIPER` mode on `B-EXIT-RIGHT`)
 if(arena&&arena.entered&&p.x>=e.marieStart-40&&p.x<e.templeStart){
  a.mode='BOSS_SNIPER';
  a.active=true;
  a.x=e.mayoBossX;
  a.y=e.mayoBossY;
  a.face=-1; // Always faces left toward Marie & Dudu!

  if(arena.phase==='intro'||arena.phase==='finale'||arena.phase==='cleared'){
   npcClip(a,'idle');
   return;
  }

  if(a.groggyTimer>0){
   a.groggyTimer=Math.max(0,a.groggyTimer-dt);
   npcClip(a,'idle');
   return;
  }

  const muzzleX=a.x-42; // 16848
  const muzzleY=a.y-58; // 462

  if(a.phase==='warn'){
   a.attackTime+=dt;
   npcClip(a,'warn');
   // Track player during the first 0.48s of warn, then LOCK aim target for the final 0.27s so player can read & dodge!
   if(a.attackTime<0.48||!a.aimLocked){
    a.aimTargetX=p.x;
    a.aimTargetY=p.y-34;
    if(a.attackTime>=0.48)a.aimLocked=true;
   }
   if(a.attackTime>=0.75){
    a.phase='attack';
    a.attackTime=0;
    a.firedInCycle=false;
    npcClip(a,'attack');
   }
  }else if(a.phase==='attack'){
   a.attackTime+=dt;
   npcClip(a,'attack');
   if(!a.firedInCycle&&a.attackTime>=0.06){
    a.firedInCycle=true;
    a.shotCount=(a.shotCount||0)+1;
    const tx=a.aimTargetX??p.x;
    const ty=a.aimTargetY??(p.y-34);
    const ang=Math.atan2(ty-muzzleY,tx-muzzleX);
    const spd=620;
    windDarts.push({
     x:muzzleX,y:muzzleY,prevX:muzzleX,prevY:muzzleY,
     vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
     aimTargetX:tx,aimTargetY:ty,
     muzzleX,muzzleY,
     age:0,maxAge:3.0,radius:13,hit:false,
     bossLureDart:true,stage:'BOSS_LURE',dartIndex:a.shotCount
    });
    burst(muzzleX,muzzleY,'#63e6be',9);
    tone(720,0.09,'sine',0.038);
   }
   if(a.attackTime>=0.42){
    a.phase='idle';
    a.attackTime=0;
    a.aimLocked=false;
    a.fireCooldown=1.48;
    npcClip(a,'idle');
   }
  }else{
   npcClip(a,'idle');
   a.fireCooldown-=dt;
   if(a.fireCooldown<=0){
    a.phase='warn';
    a.attackTime=0;
    a.aimLocked=false;
    a.aimTargetX=p.x;
    a.aimTargetY=p.y-34;
    npcClip(a,'warn');
    tone(540,0.06,'triangle',0.028);
   }
  }
  return;
 }

 // --- E2 Mode: CHASE (x = 5500 .. 15700) ---
 const prof=getMayoProfile(p.x);
 a.profileStage=prof.stage;
 a.accel=prof.accel;
 a.currentChaseSpeed=prof.speedClose;
 a.currentDartSpeed=prof.dartSpeed;

 if(!a.active){
  if(p.x>=e.mayoActivateX&&p.x<e.marieStart){
   a.active=true;
   a.mode='CHASE';
   a.x=Math.max(e.gateEnd+60,p.x-340);
   a.prevX=a.x;
   a.y=580;a.prevY=580;a.vy=0;a.inAir=false;
   a.currentSpeed=prof.speedClose;
   a.spawnGrace=1.20;
   a.phase='chase';
   a.fireCooldown=2.0;
   a.speechTimer=0.8;
   npcClip(a,'move');
  }
  return;
 }

 a.mode='CHASE';
 a.burstCount=prof.burstCount;

 if(a.speechDuration>0){
  a.speechDuration=Math.max(0,a.speechDuration-dt);
 }else{
  a.speechTimer-=dt;
  if(a.speechTimer<=0){
   let nextIdx=Math.floor(npcSeedUnit(a.seed,++a.cycle*13+5)*MAYO_SPEECH_LINES.length)%MAYO_SPEECH_LINES.length;
   if(a.lastSpeechIdx===-1)nextIdx=0;
   else if(nextIdx===a.lastSpeechIdx)nextIdx=(nextIdx+1)%MAYO_SPEECH_LINES.length;
   a.lastSpeechIdx=nextIdx;
   a.speechText=MAYO_SPEECH_LINES[nextIdx];
   a.speechDuration=2.4;
   a.speechTimer=13.0+4.5*npcSeedUnit(a.seed,a.cycle*29+3);
  }
 }

 const dxToPlayer=p.x-a.x;
 a.face=dxToPlayer>=0?1:-1;

 const support=platforms.filter(pl=>!pl.wall&&!pl.ceiling&&pl.challenge!=='special'&&a.x>=pl.x-14&&a.x<=pl.x+pl.w+14).sort((u,v)=>{
  const du=Math.abs(u.y-p.y),dv=Math.abs(v.y-p.y);
  return du-dv;
 })[0];

 if(support){
  if(a.y>support.y+6||a.inAir){
   a.vy=(a.vy||0)+1900*dt;
   a.y+=a.vy*dt;
   if(a.y>=support.y){
    a.y=support.y;a.vy=0;a.inAir=false;
   }
  }else{
   a.y+=(support.y-a.y)*(1-Math.exp(-dt*16));
   a.vy=0;a.inAir=false;
   const nearRightEdge=a.face>0&&support.groundTile&&(a.x>support.x+support.w-38);
   const playerHigher=p.y<a.y-45&&Math.abs(dxToPlayer)<280;
   if(nearRightEdge||playerHigher){
    a.vy=-520;
    a.inAir=true;
   }
  }
 }else{
  if(!a.inAir){a.vy=-480;a.inAir=true;}
  a.vy=Math.min(620,(a.vy||0)+1650*dt);
  a.y=Math.min(565,a.y+a.vy*dt);
 }

 if(p.x-a.x>760&&a.x<rCam-50){
  const safeBehindX=Math.max(e.gateEnd+60,rCam-45);
  const groundAtBehind=platforms.find(pl=>!pl.wall&&!pl.ceiling&&safeBehindX>=pl.x&&safeBehindX<=pl.x+pl.w);
  a.x=safeBehindX;
  a.prevX=a.x;
  a.y=groundAtBehind?groundAtBehind.y:510;
  a.prevY=a.y;
 }

 if(a.phase==='attack'){
  a.attackTime+=dt;
  a.x=clamp(a.x+a.face*(prof.speedClose*0.45)*dt,e.gateEnd+40,e.marieStart-60);
  npcClip(a,'attack');
  const muzzleX=a.x+a.face*42;
  const muzzleY=a.y-62;
  if(a.attackTime>=0.50&&!a.firedInCycle){
   a.firedInCycle=true;
   a.shotCount=(a.shotCount||0)+1;
   const aimX=a.aimTargetX??p.x;
   const aimY=(a.aimTargetY??p.y)-34;
   const ang=Math.atan2(aimY-muzzleY,aimX-muzzleX);
   const speed=prof.dartSpeed;
   windDarts.push({
    x:muzzleX,y:muzzleY,prevX:muzzleX,prevY:muzzleY,
    vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,
    age:0,maxAge:2.4,radius:13,hit:false,stage:prof.stage,dartIndex:1
   });
   burst(muzzleX,muzzleY,'#b8f7e8',8);
   tone(680,.09,'sine',.035);
  }
  if(a.burstCount>=2&&a.attackTime>=0.68&&!a.firedSecondInCycle){
   a.firedSecondInCycle=true;
   a.shotCount=(a.shotCount||0)+1;
   const aimX2=(a.aimTargetX2??p.x);
   const aimY2=(a.aimTargetY2??(p.y-88))-34;
   const ang2=Math.atan2(aimY2-muzzleY,aimX2-muzzleX);
   const speed2=prof.dartSpeed;
   windDarts.push({
    x:muzzleX,y:muzzleY,prevX:muzzleX,prevY:muzzleY,
    vx:Math.cos(ang2)*speed2,vy:Math.sin(ang2)*speed2,
    age:0,maxAge:2.4,radius:13,hit:false,stage:prof.stage,dartIndex:2
   });
   burst(muzzleX,muzzleY,'#ffd8a8',9);
   tone(760,.09,'triangle',.038);
  }
  const endAttackTime=a.burstCount>=2?0.82:0.66;
  if(a.attackTime>=endAttackTime){
   a.phase='chase';
   a.attackTime=0;
   a.fireCooldown=prof.cooldownBase+0.18*npcSeedUnit(a.seed,(a.shotCount||1)*17+9);
   npcClip(a,'move');
  }
 }else{
  // Gate G5 (Section 7.1 & 7.2): Pure pursuit without close-range slowdown and ZERO wind-gun firing in E2!
  const absDx=Math.abs(dxToPlayer);
  const targetSpeed=prof.chaseSpeed;
  a.currentSpeed=(a.currentSpeed||targetSpeed)+Math.sign(targetSpeed-(a.currentSpeed||targetSpeed))*Math.min(Math.abs(targetSpeed-(a.currentSpeed||targetSpeed)),prof.accel*dt);
  if(absDx>3){
   a.x=clamp(a.x+Math.sign(dxToPlayer)*a.currentSpeed*dt,e.gateEnd+40,e.marieStart-60);
   npcClip(a,'move');
  }else{
   a.x=p.x;
   npcClip(a,'move');
  }
 }

 if(a.spawnGrace<=0&&touchesActor(a)){
  triggerMayoCatchReset(a);
 }
}

// Gate G6 (Section 8.3): Progressive 3 -> 4 -> 5 Marie Bomb Volleys based on `arena.marieHits`!
// - `arena.marieHits === 0`: 3 standard dispersed bombs (`bombKind: 'base'`)
// - `arena.marieHits === 1`: 3 base bombs + 4th fast alternating left/right flank bomb (`bombKind: 'fast_alt'`)
// - `arena.marieHits === 2`: 3 base bombs + 4th fast alternating bomb + 5th fast slightly-offset predictive sniper bomb (`bombKind: 'sniper_offset'`)
// - `arena.marieHits >= 3`: 0 bombs (finale)
function releaseBombs(a){
 if(!arena||arena.phase!=='combat')return;
 const hits=arena.marieHits||0;
 if(hits>=3)return;
 const e=STAGE_ANCHORS.erpien;
 const vIdx=arena.volleys||0;
 const handX=a.x+a.face*24,handY=a.y-82;

 // Gate 11 (P0): Arena-aware surface & pit/air corridor target resolver
 function pickArenaTarget(tx){
  const surf=platforms.filter(pl=>!pl.wall&&!pl.ceiling&&pl.id!=='B-MARIE-PODIUM'&&tx>=pl.x&&tx<=pl.x+pl.w).sort((u,v)=>u.y-v.y)[0];
  if(surf)return {ty:surf.y,overPit:false,surfaceId:surf.id};
  // Open chasm between platforms (x = 16010..16750): bomb arcs through mid-air combat corridor and falls into the chasm (ty=615) without a fake mid-air ground explosion at y=520!
  return {ty:615,overPit:true,surfaceId:'PIT-AIR-CORRIDOR'};
 }
 function pickSurfaceY(tx){
  return pickArenaTarget(tx).ty;
 }

 // 1. Gate 11 (P0): Base 3 Bombs cover the ENTIRE combat arena (`15750..16940`: Left Ground/Pads, Center Pit/Spawn/Air Corridors, Right Pads/Exit Ground) across 0/3, 1/3, and 2/3!
 const arenaZones=[
  {minX:15755,maxX:16155}, // Left sector: B-ENTRY-LEFT, B-LEFT-PAD-A/B/C, left pit gap
  {minX:16175,maxX:16555}, // Center sector: Left/Right pit air corridors, B-CENTER-SPAWN, B-RIGHT-PAD-A
  {minX:16575,maxX:16935}  // Right sector: B-RIGHT-PAD-B/C, right pit gap, B-EXIT-RIGHT
 ];
 const chosenBaseX=[];
 for(let i=0;i<3;i++){
  const z=arenaZones[i];
  const u=npcSeedUnit(911+hits*53,vIdx*19+i*11);
  let tx=Math.round(z.minX+u*(z.maxX-z.minX));
  if(chosenBaseX.length>0&&Math.abs(tx-chosenBaseX[chosenBaseX.length-1])<180){
   tx=clamp(chosenBaseX[chosenBaseX.length-1]+195,z.minX,z.maxX);
  }
  chosenBaseX.push(tx);
  const tgt=pickArenaTarget(tx);
  bombs.push({
   bombIndex:i+1,
   bombKind:'base',
   x0:handX,y0:handY,
   tx,ty:tgt.ty,overPit:tgt.overPit,surfaceId:tgt.surfaceId,
   arcHeight:210,
   bx:handX,by:handY,prevBx:handX,prevBy:handY,
   age:-i*0.20,flight:1.72,radius:46,bodyRadius:13,hitPlayerDone:false,sounded:false,finale:false
  });
 }

 // 2. 4th Bomb (when `arena.marieHits >= 1`): Fast trajectory alternating Left (-1) and Right (+1)
 if(hits>=1){
  const altDir=(vIdx%2===0)?-1:1;
  const tx4=altDir<0?16045:16555;
  const ty4=pickSurfaceY(tx4);
  bombs.push({
   bombIndex:4,
   bombKind:'fast_alt',
   altDir,
   x0:handX,y0:handY,
   tx:tx4,ty:ty4,
   arcHeight:145,
   bx:handX,by:handY,prevBx:handX,prevBy:handY,
   age:-0.48,flight:1.26,radius:46,bodyRadius:13,hitPlayerDone:false,sounded:false,finale:false
  });
 }

 // 3. 5th Bomb (when `arena.marieHits >= 2`): Fast non-homing predictive sniper with slight horizontal offset from Dudu's position at launch
 if(hits>=2){
  const offsetSign=(vIdx%2===0)?1:-1;
  const sniperOffset=offsetSign*68;
  const tx5=clamp(Math.round(p.x+sniperOffset),e.marieStart+90,e.exitWallX-130);
  const ty5=pickSurfaceY(tx5);
  bombs.push({
   bombIndex:5,
   bombKind:'sniper_offset',
   lockedPlayerX:Math.round(p.x),
   sniperOffset,
   x0:handX,y0:handY,
   tx:tx5,ty:ty5,
   arcHeight:155,
   bx:handX,by:handY,prevBx:handX,prevBy:handY,
   age:-0.62,flight:1.30,radius:46,bodyRadius:13,hitPlayerDone:false,sounded:false,finale:false
  });
 }

 arena.volleys++;
 arena.lastVolleyBombCount=hits===0?3:(hits===1?4:5);
 tone(440,.09,'triangle',.03);
}

function updateMarie(a,dt){
 if(!arena||erpienChaseCompleted||a.retreating)return;
 const e=STAGE_ANCHORS.erpien;
 a.x=e.mariePerchX;
 a.y=e.mariePerchY;
 a.face=p.x<a.x?-1:1;

 if(arena.phase==='intro'||arena.phase==='finale'||arena.phase==='cleared'){
  return;
 }

 if(arena.marieInvulnTimer>0){
  arena.marieInvulnTimer=Math.max(0,arena.marieInvulnTimer-dt);
 }
 a.invulnTimer=arena.marieInvulnTimer||0;
 if(arena.groggyTimer>0){
  arena.groggyTimer=Math.max(0,arena.groggyTimer-dt);
  a.groggyTimer=arena.groggyTimer;
  arena.casting=false;
  arena.castTime=0;
  npcClip(a,'idle');
  return;
 }
 a.groggyTimer=0;

 if(p.invulnerable<=0&&touchesActor(a)){
  applyStunHit(a.x,'marie_body');
 }

 if(!arena.active)return;

 if(arena.casting){
  arena.castTime+=dt;
  const dur=npcMeta.marie_throw.frames/npcMeta.marie_throw.fps;
  if(!arena.released&&arena.castTime>=.45){
   arena.released=true;
   releaseBombs(a);
  }
  if(arena.castTime>=dur){
   arena.casting=false;arena.castTime=0;npcClip(a,'idle');
   arena.cooldown=2.45;
  }
 }else{
  arena.cooldown-=dt;
  if(arena.cooldown<=0){arena.casting=true;arena.castTime=0;arena.released=false;npcClip(a,'throw');}
 }
}

function distPointToSegment(px,py,x1,y1,x2,y2){
 const vx=x2-x1,vy=y2-y1;
 const lenSq=vx*vx+vy*vy;
 if(lenSq<=0.0001)return Math.hypot(px-x1,py-y1);
 const t=clamp(((px-x1)*vx+(py-y1)*vy)/lenSq,0,1);
 const cx=x1+t*vx,cy=y1+t*vy;
 return Math.hypot(px-cx,py-cy);
}

function segmentIntersectsBox(x1,y1,x2,y2,bx1,by1,bx2,by2){
 const steps=12;
 for(let i=0;i<=steps;i++){
  const u=i/steps;
  const sx=x1+(x2-x1)*u;
  const sy=y1+(y2-y1)*u;
  if(sx>=bx1&&sx<=bx2&&sy>=by1&&sy<=by2)return {hit:true,x:sx,y:sy};
 }
 return {hit:false,x:x2,y:y2};
}

function updateHazards(dt){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  if(typeof updateChallengeHazards==='function')updateChallengeHazards(dt);
  return;
 }
 hazardClock+=dt;
 if(p.invulnerable>0)p.invulnerable=Math.max(0,p.invulnerable-dt);
 for(const a of actors){a.prevX=a.x;a.prevY=a.y;}
 const curId=levels[levelIndex]?.id;
 if(curId==='monatium')updateBukgyeong(dt);
 if(curId==='village')updateVillageFriends(dt);

 if(curId==='erpien'&&arena){
  const e=STAGE_ANCHORS.erpien;
  if(!erpienChaseCompleted&&!arena.entered&&p.x>=e.marieStart+15&&p.x<e.templeStart){
   enterMarieBossArena();
  }
  if(arena.bannerTimer>0){
   arena.bannerTimer=Math.max(0,arena.bannerTimer-dt);
  }
  if(arena.phase==='intro'){
   arena.introTimer-=dt;
   p.vx=0;p.vy=0;
   if(arena.introTimer<=0){
    arena.phase='combat';
   }
   return;
  }
  if(arena.phase==='finale'){
   updateBossFinale(dt);
  }
 }

 for(const a of actors){
  if(a.hiddenInDoor)continue;
  if(a.kind==='mayo')updateMayo(a,dt);
  else if(a.kind==='marie')updateMarie(a,dt);
  else if(!a.photo)updateWalker(a,dt);
  const instSpeed=Math.abs(a.x-a.prevX)/Math.max(dt,0.001);
  const animRate=a.clip==='move'?clamp(instSpeed/140,0.45,1.65):1.0;
  a.anim+=dt*animRate;
  a.blend=Math.min(1,a.blend+dt/.10);
 }

 const playerCenterX=p.x,playerCenterY=p.y-30;
 const marie=actors.find(a=>a.kind==='marie');
 const e=STAGE_ANCHORS.erpien;

 for(const wd of windDarts){
  wd.prevX=wd.x;wd.prevY=wd.y;
  wd.age+=dt;
  wd.x+=wd.vx*dt;
  wd.y+=wd.vy*dt;
  if(wd.hit||wd.age>wd.maxAge)continue;

  // 1. Gate 12 (P0): In E3 Boss Arena, check Marie's Hitbox (`x = 16342..16398, y = 210..303`) with strict 2.00s Invulnerability & Blink!
  if(wd.bossLureDart&&arena&&arena.phase==='combat'&&marie&&!marie.retreating){
   const mBox=segmentIntersectsBox(wd.prevX,wd.prevY,wd.x,wd.y,e.mariePerchX-28,e.mariePerchY-95,e.mariePerchX+28,e.mariePerchY-2);
   if(mBox.hit){
    wd.hit=true;
    if((arena.marieInvulnTimer||0)>0||(arena.groggyTimer||0)>0){
     // Complete immunity during the 2.00s invulnerability window: consume dart with 0 additional hit count!
     burst(mBox.x,mBox.y,'#ffe066',6);
     continue;
    }
    arena.marieHits=Math.min(3,(arena.marieHits||0)+1);
    burst(mBox.x,mBox.y,'#63e6be',18);
    burst(e.mariePerchX,e.mariePerchY-54,'#ffd43b',14);
    tone(820,0.14,'triangle',0.05);
    if(arena.marieHits>=3){
     arena.marieInvulnTimer=0;
     marie.invulnTimer=0;
     startBoss3HitFinale();
    }else{
     arena.marieInvulnTimer=2.00;
     arena.groggyTimer=2.00;
     marie.invulnTimer=2.00;
     marie.groggyTimer=2.00;
     bombs=[];
     marie.groggyBubble=arena.marieHits===1?'으앗! 마요야 어딜 쏘는 거야?! (1/3)':'아야야! 마요 눈 똑바로 안 떠?! (2/3)';
     notify(`마리에게 마요 바람총 명중! (${arena.marieHits}/3)`);
    }
    continue;
   }
  }

  // 2. Check Player Contact
  const d=distPointToSegment(playerCenterX,playerCenterY,wd.prevX,wd.prevY,wd.x,wd.y);
  if(d<wd.radius+18){
   wd.hit=true;
   applyStunHit(wd.prevX,'mayo_wind');
   continue;
  }

  // 3. Check Solid Wall / Ground Obstacle Contact (excluding thin platforms so lure shots pass cleanly above podiums)
  for(const pl of platforms){
   if(pl.collidable===false||pl.hidden||pl.thin)continue;
   const tHit=segmentIntersectsBox(wd.prevX,wd.prevY,wd.x,wd.y,pl.x,pl.y,pl.x+pl.w,pl.y+pl.h);
   if(tHit.hit){
    wd.hit=true;
    burst(tHit.x,tHit.y,'#b8f7e8',5);
    break;
   }
  }
 }
 windDarts=windDarts.filter(wd=>!wd.hit&&wd.age<wd.maxAge&&wd.x>e.marieStart-300&&wd.x<e.templeStart+100);

 for(const b of bombs){
  b.age+=dt;
  if(b.age<0)continue;
  const u=clamp(b.age/b.flight,0,1);
  b.prevBx=b.bx??b.x0;
  b.prevBy=b.by??b.y0;
  b.bx=b.x0+(b.tx-b.x0)*u;
  const arcH=b.arcHeight||210;
  b.by=b.y0+(b.ty-15-b.y0)*u-arcH*4*u*(1-u);

  if(b.age<b.flight){
   if(!b.hitPlayerDone){
    const dAir=distPointToSegment(playerCenterX,playerCenterY,b.prevBx,b.prevBy,b.bx,b.by);
    if(dAir<(b.bodyRadius||13)+18){
     b.hitPlayerDone=true;
     burst(b.bx,b.by,'#ffcf86',10);
     applyStunHit(b.bx,'marie_bomb_air');
    }
   }
  }else if(b.age>=b.flight&&b.age<b.flight+.35){
   if(b.overPit){
    b.sounded=true;
   }else{
    if(!b.sounded){b.sounded=true;burst(b.tx,b.ty-10,'#ffce8f',12);tone(110,.16,'triangle',.035);}
    if(!b.hitPlayerDone&&Math.abs(p.x-b.tx)<b.radius+14&&p.y>b.ty-56&&p.y-56<b.ty+10){
     b.hitPlayerDone=true;
     applyStunHit(b.tx,'marie_bomb');
    }
   }
  }
 }
 bombs=bombs.filter(b=>b.age<b.flight+.5);
}

function drawNpcFrame(a,clip,elapsed,alpha){
 const key=a.kind+'_'+clip,m=npcMeta[key],im=npcImages[key];if(!m||!im||alpha<=0)return;
 const duration=m.frames/m.fps;
 const frame=(clip==='throw'||clip==='warn'||clip==='attack')?Math.min(m.frames-1,elapsed*m.fps):(elapsed%duration)*m.fps;
 const f=Math.floor(frame)%m.frames;
 nx.save();
 nx.globalCompositeOperation='source-over';
 nx.globalAlpha=alpha;
 nx.drawImage(im,f%m.cols*256,Math.floor(f/m.cols)*256,256,256,0,0,256,256);
 nx.restore();
}

function bubble(text,x,y,color='#fff8e7'){
 ctx.save();ctx.font='16px "ONE Mobile POP", "Malgun Gothic", sans-serif';const w=ctx.measureText(text).width+24;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-w/2,y-25,w,32,10);ctx.fill();ctx.fillStyle='#514a42';ctx.textAlign='center';ctx.fillText(text,x,y-3);ctx.restore();
}

function drawBukgyeongLandmark(){
 if(levels[levelIndex]?.id!=='monatium'||!bukgyeongEvent)return;
 const bIm=npcImages['bukgyeong_building'],dlIm=npcImages['bukgyeong_door_l'],drIm=npcImages['bukgyeong_door_r'];
 if(!bIm)return;
 const lm=BUKGYEONG_LANDMARK,ev=bukgyeongEvent;
 const s=lm.bldgScale;
 const bw=Math.round(bIm.width*s),bh=Math.round(bIm.height*s);
 const bx=lm.bldgX,by=Math.round(lm.bldgY-242*s);
 if(bx+bw<rCam-160||bx>rCam+W+160)return;

 ctx.save();
 const shakeX=Math.round(ev.doorShake||0);
 ctx.drawImage(bIm,bx,by,bw,bh);

 const doorX=lm.doorCenterX;
 const doorTopY=Math.round(by+lm.doorLocalY1*s);
 const doorW=Math.round(39*s),doorH=Math.round(126*s);
 const slideOffset=Math.round(ev.doorOpen*doorW*0.78);

 if(dlIm&&drIm){
  if(ev.doorOpen>0.05||Math.abs(shakeX)>0){
   ctx.save();
   ctx.globalAlpha=Math.min(0.55,ev.doorOpen*0.45+0.15);
   ctx.fillStyle='#ffdf8e';
   ctx.fillRect(Math.round(bx+lm.doorLocalX1*s),doorTopY,doorW*2,doorH);
   ctx.restore();
  }
  ctx.drawImage(dlIm,Math.round(bx+lm.doorLocalX1*s-slideOffset+shakeX),doorTopY,Math.max(8,doorW-Math.round(slideOffset*0.35)),doorH);
  ctx.drawImage(drIm,Math.round(bx+lm.doorLocalMid*s+slideOffset+shakeX),doorTopY,Math.max(8,doorW-Math.round(slideOffset*0.35)),doorH);
 }

 const viceWarn=ev.state==='active'&&ev.elapsed>=1.20&&ev.elapsed<1.85;
 if(ev.state==='prewarn'||viceWarn){
  const warnDist=viceWarn?500:380;
  ctx.save();
  ctx.setLineDash([8,6]);
  line(doorX-warnDist,lm.bldgY-3,doorX,lm.bldgY-3,'#edac54',4);
  ctx.restore();
  const bounce=Math.sin(hazardClock*18)*4;
  bubble(viceWarn?'한 분 더 나오신다!':'문이 덜컹거려요!',doorX,doorTopY-18+bounce,'#ffe6b4');
 }
 ctx.restore();
}

// Section 5.2: Draw 3 Mayo Wind-Dart Silhouette Icons above Marie (`0/3 -> 3/3`) + Intro Banner + Counter-Bomb!
function drawMarieBossOverlay(marieX,marieY){
 if(!arena||levels[levelIndex]?.id!=='erpien'||!arena.entered||arena.phase==='cleared')return;
 const hits=arena.marieHits||0;
 const baseY=marieY-138;

 // 3 Wind-Dart Silhouette Badges above Marie
 for(let i=0;i<3;i++){
  const sx=marieX+(i-1)*42;
  const sy=baseY;
  const filled=i<hits;
  ctx.save();
  ctx.translate(sx,sy);
  ctx.rotate(-0.22);
  if(filled){
   ctx.fillStyle='#20c997';
   ctx.strokeStyle='#e6fcf5';
   ctx.lineWidth=2.5;
   ctx.beginPath();
   ctx.ellipse(0,0,16,7,0,0,Math.PI*2);
   ctx.fill();
   ctx.stroke();
   ctx.fillStyle='#ffffff';
   ctx.beginPath();
   ctx.roundRect(-11,-3,22,6,3);
   ctx.fill();
  }else{
   ctx.fillStyle='rgba(35, 42, 56, 0.68)';
   ctx.strokeStyle='rgba(255, 255, 255, 0.45)';
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.ellipse(0,0,16,7,0,0,Math.PI*2);
   ctx.fill();
   ctx.stroke();
  }
  ctx.restore();
 }

 // Draw spinning groggy stars above Marie when groggy
 if(arena.groggyTimer>0||(arena.phase==='finale'&&arena.finaleStep===1)){
  for(let i=0;i<3;i++){
   const ang=time*7+i*(Math.PI*2/3);
   ellipse(marieX+Math.cos(ang)*28,marieY-102+Math.sin(ang)*7,5.5,5.5,'#ffd43b');
  }
 }

 // Draw Marie's Counter-Bomb during 3rd-Hit Finale
 if(arena.counterBomb){
  const cb=arena.counterBomb;
  ctx.save();
  ctx.setLineDash([6,5]);
  ctx.strokeStyle='#ff6b6bcc';
  ctx.lineWidth=3;
  ctx.beginPath();
  for(let s=0;s<=16;s++){
   const su=s/16;
   const px=cb.x0+(cb.tx-cb.x0)*su;
   const py=cb.y0+(cb.ty-18-cb.y0)*su-195*4*su*(1-su);
   if(s===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.stroke();
  ctx.restore();
  if(!cb.exploded){
   ellipse(cb.bx,cb.by,15,16,'#ff4d38');
   ellipse(cb.bx+5,cb.by-18,5,5,'#ffe066');
  }
 }

 // 1-Time Entry Banner ("마요를 유도해 마리를 세 번 맞추세요!")
 if(arena.bannerTimer>0){
  const centerX=STAGE_ANCHORS.erpien.centerSpawnX;
  const bannerY=115;
  ctx.save();
  ctx.fillStyle='rgba(36, 42, 56, 0.88)';
  ctx.strokeStyle='#63e6be';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.roundRect(centerX-250,bannerY-28,500,52,14);
  ctx.fill();
  ctx.stroke();
  ctx.font='bold 22px "ONE Mobile POP", "Malgun Gothic", sans-serif';
  ctx.fillStyle='#fff9db';
  ctx.textAlign='center';
  ctx.fillText(arena.bannerText,centerX,bannerY+5);
  ctx.restore();
 }
}

function drawActors(){
 drawBukgyeongLandmark();
 drawVillageFriends();
 for(const a of actors){
  if(a.hiddenInDoor)continue;
  if(a.kind==='mayo'&&!a.active&&!a.retreating)continue;
  const ax=(a.prevX??a.x)+(a.x-(a.prevX??a.x))*renderAlpha;
  const ay=(a.prevY??a.y)+(a.y-(a.prevY??a.y))*renderAlpha;
  const actViewW=(typeof rCamZoom==='number'&&rCamZoom>0)?(W/rCamZoom):W;
  if(ax<rCam-260||ax>rCam+actViewW+260)continue;

  if(a.photo){
   const im=npcImages[a.cutout]||npcImages[a.kind];
   if(im){
    const isRush=a.phase==='rush',isRest=a.phase==='rest';
    const hop=isRush?Math.abs(Math.sin(hazardClock*14))*9:isRest?Math.sin(hazardClock*5)*2:0;
    const tilt=isRush?Math.sin(hazardClock*14)*0.045:a.phase==='return'?-0.03:0;
    const targetH=a.kind==='vice'?138:132;
    const scale=targetH/im.height;
    const dw=Math.round(im.width*scale),dh=Math.round(im.height*scale);

    ellipse(ax,ay+2,32,5,'#34463b33');
    if(a.danger)ellipse(ax,ay-2,44,6,'#ef876a99');

    ctx.save();
    ctx.translate(Math.round(ax),Math.round(ay-dh*0.5-hop));
    ctx.rotate(tilt);
    ctx.drawImage(im,-Math.round(dw*0.5),-Math.round(dh*0.5),dw,dh);
    ctx.restore();

    if(isRest){
     bubble(a.kind==='president'?'짬뽕 식기 전에 비켜봐유~!':'美味! 이 맛이야~!',ax,ay-dh-14,'#fff8e7');
    }
   }
  }else{
   const isGuard=a.kind.startsWith('guard');
   ellipse(ax,ay+2,24,4,'#34463b28');
   if(a.danger){
    ellipse(ax,ay-2,a.specialGuard?40:34,6,a.specialGuard?'#ff3b28cc':(isGuard?'#d9433099':'#ef876a99'));
   }
   nx.clearRect(0,0,256,256);
   if(a.oldClip&&a.blend<1)drawNpcFrame(a,a.oldClip,a.oldAnim,1-a.blend);
   drawNpcFrame(a,a.clip,a.anim,a.blend);
   ctx.save();
   ctx.translate(Math.round(ax),Math.round(ay));
   if(a.kind==='marie'&&arena&&(arena.marieInvulnTimer||0)>0&&arena.phase==='combat'){
    ctx.globalAlpha=(Math.floor(hazardClock*16)%2===0)?0.95:0.35;
   }
   ctx.scale(-a.face,1);
   const m=npcMeta[a.kind+'_idle'],size=m.display;
   ctx.drawImage(npcCanvas,-m.anchor/256*size,-m.foot/256*size,size,size);
   ctx.restore();

   if(a.kind==='mayo'){
    if(a.groggyTimer>0||(arena?.phase==='finale'&&arena.finaleStep>=3)){
     for(let i=0;i<3;i++){
      const ang=time*7+i*(Math.PI*2/3);
      ellipse(ax+Math.cos(ang)*26,ay-98+Math.sin(ang)*7,5,5,'#ffd43b');
     }
     if(a.groggyBubble)bubble(a.groggyBubble,ax,ay-155,'#ffe3e3');
    }else if(a.mode==='BOSS_SNIPER'&&(a.phase==='warn'||(a.phase==='attack'&&!a.firedInCycle))){
     const mx=ax-42,my=ay-58;
     const tx=a.aimTargetX??p.x,ty=a.aimTargetY??(p.y-34);
     const ang=Math.atan2(ty-my,tx-mx);
     const endX=mx+Math.cos(ang)*1150;
     const endY=my+Math.sin(ang)*1150;
     ctx.save();
     ctx.setLineDash(a.aimLocked?[12,5]:[6,6]);
     line(mx,my,endX,endY,a.aimLocked?'#ff6b6bee':'#63e6becc',a.aimLocked?3.8:2.6);
     ctx.restore();
     bubble(a.aimLocked?'⚡ 조준 고정! 발사!':'바람총 조준 중…',ax,ay-155,a.aimLocked?'#ffd8d8':'#d3f9d8');
    }else if(a.phase==='attack'&&(!a.firedInCycle||(a.burstCount>=2&&!a.firedSecondInCycle))){
     ctx.save();
     ctx.setLineDash([6,5]);
     if(!a.firedInCycle){
      line(ax+a.face*36,ay-62,a.aimTargetX??p.x,(a.aimTargetY??p.y)-34,'#63e6becc',3);
     }
     if(a.burstCount>=2&&!a.firedSecondInCycle){
      line(ax+a.face*36,ay-62,(a.aimTargetX??p.x)+a.face*45,(a.aimTargetY??p.y)-82,'#ffa94dcc',3);
     }
     ctx.restore();
     bubble(a.burstCount>=2?'⚡ 2연발 바람총 발사!':'바람총 발사!',ax,ay-162,a.burstCount>=2?'#ffe8cc':'#d3f9d8');
    }else if(a.speechDuration>0&&a.speechText){
     bubble(a.speechText,ax,ay-162,'#fff3db');
    }
   }else if(a.kind==='marie'){
    drawMarieBossOverlay(ax,ay);
    if(arena?.groggyTimer>0||arena?.phase==='finale'){
     if(a.groggyBubble)bubble(a.groggyBubble,ax,ay-172,'#ffe8cc');
    }else if(arena?.casting){
     bubble('폭탄 간다~!',ax,ay-172,'#fff8e7');
    }
   }else if(a.active){
    const warning=a.phase==='warn';
    if(warning){
     ctx.save();
     ctx.setLineDash([7,6]);
     const toX=a.curTo!==undefined?a.curTo:(a.home+(a.patrolDir||-1)*(a.curPatrol||a.patrol));
     line(toX,ay-3,a.home,ay-3,isGuard?'#e05a47':'#edac54',4);
     ctx.restore();
     bubble(a.specialGuard?'⚡ 고속 경비 돌진!':(isGuard?'경비 순찰!':'요정 돌진!'),ax,ay-155,isGuard?'#ffd8cf':'#ffe6b4');
    }
   }
  }
 }
}

function drawWindDarts(){
 for(const wd of windDarts){
  if(wd.hit)continue;
  const wx=(wd.prevX??wd.x)+(wd.x-(wd.prevX??wd.x))*renderAlpha;
  const wy=(wd.prevY??wd.y)+(wd.y-(wd.prevY??wd.y))*renderAlpha;
  const ang=Math.atan2(wd.vy,wd.vx);
  ctx.save();
  ctx.translate(wx,wy);
  ctx.rotate(ang);
  ctx.strokeStyle=wd.bossLureDart?'#20c997':'#63e6be';
  ctx.lineWidth=3.5;
  ctx.beginPath();
  ctx.ellipse(0,0,22,8,0,0,Math.PI*2);
  ctx.stroke();
  ctx.fillStyle='#e6fcf5';
  ctx.beginPath();
  ctx.roundRect(-17,-4,34,8,4);
  ctx.fill();
  ctx.restore();
 }
}

function drawBombs(){
 for(const b of bombs){
  if(b.age<0)continue;
  const u=clamp(b.age/b.flight,0,1);
  const exploding=b.age>=b.flight;
  const lateWarn=u>=0.68&&!exploding;
  ctx.save();
  ctx.fillStyle=exploding?'#ffbd65aa':(lateWarn?'#ff6b4a66':'#ffda8e66');
  ctx.strokeStyle=lateWarn?'#e03131':'#c87936';
  ctx.lineWidth=lateWarn?3.5:2.5;
  ctx.beginPath();
  ctx.ellipse(b.tx,b.ty-3,b.radius,exploding?24:11,0,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  if(!exploding){
   ctx.fillStyle=lateWarn?'#ff4d3888':'#f59f0055';
   ctx.beginPath();
   ctx.ellipse(b.tx,b.ty-3,Math.max(4,b.radius*u),Math.max(2,11*u),0,0,Math.PI*2);
   ctx.fill();
  }

  if(!exploding){
   ctx.save();
   ctx.setLineDash([5,6]);
   ctx.strokeStyle=b.finale?'#ff523888':'#f59f0077';
   ctx.lineWidth=2.2;
   ctx.beginPath();
   for(let s=0;s<=16;s++){
    const su=s/16;
    const px=b.x0+(b.tx-b.x0)*su;
    const arcH=b.arcHeight||210;
    const py=b.y0+(b.ty-15-b.y0)*su-arcH*4*su*(1-su);
    if(s===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.stroke();
   ctx.restore();

   const arcH=b.arcHeight||210;
   const x=b.x0+(b.tx-b.x0)*u,y=b.y0+(b.ty-15-b.y0)*u-arcH*4*u*(1-u);
   ellipse(x,b.ty-2,Math.max(6,18*(0.4+0.6*u)),4,'#2b252044');

   for(let ti=1;ti<=3;ti++){
    const tu=Math.max(0,u-ti*0.045);
    const txTrail=b.x0+(b.tx-b.x0)*tu;
    const tyTrail=b.y0+(b.ty-15-b.y0)*tu-(b.arcHeight||210)*4*tu*(1-tu);
    ellipse(txTrail,tyTrail,Math.max(3,11-ti*2.5),Math.max(3,11-ti*2.5),ti===1?'#ff922b88':'#ffd43b55');
   }

   ctx.font='bold 21px Arial';
   ctx.fillStyle=lateWarn?'#c92a2a':'#7b4323';
   ctx.textAlign='center';
   ctx.fillText(lateWarn?'!!':'!',b.tx,b.ty-17);
   ctx.strokeStyle=lateWarn?'#ff2b2bcc':'#ff6b6b99';
   ctx.lineWidth=lateWarn?3:2;
   ctx.beginPath();
   ctx.arc(x,y,16,0,Math.PI*2);
   ctx.stroke();
   ellipse(x,y,13,14,'#55515e');
   line(x,y-14,x+5,y-23,'#dba861',3);
   ellipse(x+5,y-23,4,4,'#ffdb84');
  }else{
   const grow=(b.age-b.flight)/.5;
   ctx.globalAlpha=1-grow;
   ellipse(b.tx,b.ty-28,b.radius*(.5+grow),28,'#ffe1ad');
   ctx.strokeStyle='#edac54';
   ctx.beginPath();
   ctx.arc(b.tx,b.ty-22,20+grow*55,Math.PI,Math.PI*2);
   ctx.stroke();
  }
  ctx.restore();
 }
}

function drawProtection(){
 if(p.invulnerable>0){
  ctx.save();
  ctx.strokeStyle=p.guardStun>0?'#ff8b6b':'#fff3ab';
  ctx.lineWidth=3;
  ctx.globalAlpha=Math.min(.9,p.invulnerable*2);
  ctx.beginPath();ctx.ellipse(rPx,rPy-43,37,53,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 if(p.guardStun>0){
  ctx.save();
  for(let i=0;i<3;i++){
   const ang=time*6+i*(Math.PI*2/3);
   const sx=rPx+Math.cos(ang)*26,sy=rPy-96+Math.sin(ang)*7;
   ellipse(sx,sy,5,5,'#ffd45b');
  }
  ctx.fillStyle='#3b231ecc';
  ctx.beginPath();ctx.roundRect(rPx-32,rPy-118,64,8,4);ctx.fill();
  ctx.fillStyle='#ff7a59';
  ctx.beginPath();ctx.roundRect(rPx-30,rPy-116,60*(p.guardStun/1.5),4,2);ctx.fill();
  ctx.restore();
 }
}

function practiceEncounter(key){
 if(state==='loading')return;
 const q=encounterPresets[key];if(!q)return;
 leaveEvent();
 if(typeof clearRegionTransitionLayer==='function')clearRegionTransitionLayer();
 if(typeof resetErpienEncounterState==='function')resetErpienEncounterState();
 const lvIdx=q.levelId?Math.max(0,levels.findIndex(lv=>lv.id===q.levelId)):(q.level??0);
 const secIdx=Math.max(0,levels[lvIdx].sections.findIndex(s=>s.title===q.title));
 loadLevel(lvIdx,{section:secIdx});
 if(q.x!==undefined)p.x=q.x;
 if(q.y!==undefined){
  p.y=q.y;
  p.on=platforms.find(a=>a.collidable!==false&&!a.ceiling&&!a.wall&&p.x>=a.x&&p.x<=a.x+a.w&&Math.abs(a.y-p.y)<8)||p.on;
  p.ground=!!p.on;
 }
 const initCam=typeof computeInitialCameraForPoint==='function'?computeInitialCameraForPoint(p.x,p.y):{cam:Math.max(0,Math.min(END-W,p.x-W*.42)),camY:0};
 cam=initCam.cam;
 camY=initCam.camY;
 if(key==='mayo'||key==='fairies'){
  const mayoAct=actors.find(a=>a.kind==='mayo');
  if(mayoAct){
   mayoAct.active=true;
   mayoAct.mode='CHASE';
   mayoAct.x=Math.max(5420,p.x-380);
   mayoAct.prevX=mayoAct.x;
   mayoAct.y=580;
   mayoAct.prevY=580;
   mayoAct.spawnGrace=0.8;
  }
 }else if(key==='marie'){
  if(typeof enterMarieBossArena==='function')enterMarieBossArena();
 }
 if(typeof syncRenderCoords==='function')syncRenderCoords();
 state='playing';updateRegionHud();keys.clear();canvas.focus();
}
async function loadNpcImages(){
 const extraAssets=['president','vice','president_cutout','vice_cutout','bukgyeong_building','bukgyeong_door_l','bukgyeong_door_r'];
 await Promise.all([...Object.keys(npcMeta),...extraAssets].map(n=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{npcImages[n]=im;ok();};im.onerror=no;im.src='assets/npc/'+n+'.webp?v=12';})));
}
for(const key of Object.keys(encounterPresets)){const btn=$('practice-'+key);if(btn)btn.onclick=()=>practiceEncounter(key);}
