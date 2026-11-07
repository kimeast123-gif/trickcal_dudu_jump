'use strict';
// TEST12 Hazards & Encounters:
// - Gate G3: Monatium Guards (`guard1`, `guard2`) have active collision (`a.danger = true`) across ALL states (`wait`, `warn`, `rush`, `rest`, `return`) with swept horizontal segment check + strict vertical separation (0 false hits underneath bridges).
// - Gate G3-6: The 2 special guards on `M-GRD-BR3` protecting `M-GUARD-03` (`x=15980`, `x=16210`) have a 1.5x speed multiplier (`speedMult: 1.5`, rush & return 1.5x faster); the other 6 guards keep 1.0x speed.
// - Gate G4-2: Mayo resumes `chase` 0.20s after firing (`attackTime >= 0.84s`), and actual shot-to-shot interval is shortened by ~0.5s to ~4.80s (strictly >= 3.0s).
// - Gate G4-3: Erpien City `fairy1` / `fairy2` responsiveness increased by ~1.20x while preserving warning telegraph.
// - Gate G5-1: Non-essential encounter toast popups removed while preserving Mayo speech bubbles, Marie bomb telegraphs, Bukgyeong event, and Temple retreat (`x = 14300`).
const npcImages={};
let actors=[],bombs=[],windDarts=[],hazardClock=0,hitCount=0,arena=null,bukgyeongEvent=null;
let erpienChaseCompleted=false,erpienRetreatEvent=null;
const npcCanvas=document.createElement('canvas');npcCanvas.width=npcCanvas.height=256;const nx=npcCanvas.getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const MAYO_SPEECH_LINES=[
 '흐흐흐 희귀한 야광욕족 발견임',
 '야광용족 잠깐만 이리 오도록 함',
 '수집 가치 높은 대상임 이리로 옴',
 '머리카락 만 조금 잘라갈거임 걱정하지 마임'
];

const encounterPresets={
 tower:{level:1,title:'상승 타워 입구',x:3340,y:580},
 skywalk:{level:1,title:'모나티엄 옥상 입구',x:4360,y:-1095},
 descent:{level:1,title:'옥상 하강 입구',x:8040,y:-1055},
 guards:{level:1,title:'지상 경비 구역 입구',x:10780,y:580},
 bukgyeong:{level:1,title:'북경성 앞 광장',x:18150,y:580},
 mayo:{level:2,title:'에르피엔 도시 입구',x:7080,y:580},
 fairies:{level:2,title:'빵집 앞 거리',x:8160,y:580},
 marie:{level:2,title:'마리 광장 진입로',x:11750,y:580}
};

const BUKGYEONG_LANDMARK={
 bldgX:18580,
 bldgY:580,
 bldgScale:1.42,
 doorLocalX1:162,
 doorLocalMid:201,
 doorLocalX2:240,
 doorLocalY1:116,
 doorLocalY2:242,
 get doorCenterX(){return Math.round(this.bldgX+this.doorLocalMid*this.bldgScale);} // 18865
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
 if(levelIndex===1){
  const doorX=BUKGYEONG_LANDMARK.doorCenterX;
  bukgyeongEvent=initBukgyeongEvent();
  // Gate G3: 8 Guards in Monatium; ONLY the 2 guards on M-GRD-BR3 protecting M-GUARD-03 have speedMult: 1.5 (252px/s and 273px/s)
  actors=[
   actor('guard1',11080,580,{id:'G-01',platformId:'M-GRD-FLOOR1',patrol:190,baseSpeed:155,speedMult:1.0}),
   actor('guard1',11680,465,{id:'G-02',platformId:'M-GRD-BR1',patrol:220,baseSpeed:160,speedMult:1.0}),
   actor('guard2',12160,465,{id:'G-03',platformId:'M-GRD-BR1',patrol:210,baseSpeed:185,speedMult:1.0,delay:0.45}),
   actor('guard2',13240,580,{id:'G-04',platformId:'M-GRD-FLOOR2',patrol:200,baseSpeed:178,speedMult:1.0}),
   actor('guard1',14040,470,{id:'G-05',platformId:'M-GRD-BR2A',patrol:220,baseSpeed:165,speedMult:1.0}),
   actor('guard2',14690,440,{id:'G-06',platformId:'M-GRD-BR2B',patrol:220,baseSpeed:188,speedMult:1.0,delay:0.35}),
   // Gate G3-6: Special 1.5x speed guards on M-GRD-BR3 guarding M-GUARD-03 (168*1.5=252, 182*1.5=273)
   actor('guard1',15980,455,{id:'G-07-BR3',platformId:'M-GRD-BR3',patrol:230,baseSpeed:168,returnSpeed:165,speedMult:1.5,specialGuard:true,patrolDir:-1,delay:0.0}),
   actor('guard2',16210,455,{id:'G-08-BR3',platformId:'M-GRD-BR3',patrol:230,baseSpeed:182,returnSpeed:174,speedMult:1.5,specialGuard:true,patrolDir:1,delay:0.90}),
   actor('president',doorX,580,{photo:true,cutout:'president_cutout',patrol:390,speed:230,hiddenInDoor:true}),
   actor('vice',doorX,580,{photo:true,cutout:'vice_cutout',patrol:510,speed:305,hiddenInDoor:true})
  ];
 }else if(levelIndex===2){
  if(p.x<14300){
   erpienChaseCompleted=false;
  }
  // Gate G4-2 & G4-3: Mayo + ~1.20x faster Erpien City Fairies + Marie
  actors=[
   actor('mayo',6920,580,{
    chaser:true,active:false,retreating:false,
    fireCooldown:2.1,attackTime:0,firedInCycle:false,shotCount:0,
    speechTimer:1.2,speechDuration:0,speechText:'',lastSpeechIdx:-1
   }),
   actor('fairy1',8620,580,{id:'F-01',platformId:'E-CITY-GND2',patrol:205,baseSpeed:178,speedMult:1.20}),
   actor('fairy2',10520,580,{id:'F-02',platformId:'E-CITY-GND3',patrol:210,baseSpeed:212,speedMult:1.20}),
   actor('fairy1',11120,580,{id:'F-03',platformId:'E-CITY-GND3',patrol:195,baseSpeed:192,speedMult:1.20}),
   actor('marie',13600,430,{id:'MARIE',platformId:'E-CITY-MARIE-PERCH',retreating:false})
  ];
  arena={start:11600,end:14250,active:false,stage:0,cooldown:0.95,casting:false,castTime:0,released:false,volleys:0,passed:false};
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
 if(typeof DuduAnalytics!=='undefined')DuduAnalytics.hit(levelIndex);
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

// Gate G4-2: Mayo Chaser & Wind-Gun Update (0.20s post-shot recovery, ~4.80s fire interval)
function updateMayo(a,dt){
 if(!a||levelIndex!==2)return;
 if(erpienChaseCompleted||a.retreating)return;

 if(!a.active){
  if(p.x>=7000&&p.x<14300){
   a.active=true;
   a.x=Math.max(6680,p.x-320);
   a.prevX=a.x;
   a.y=580;a.prevY=580;
   a.phase='chase';
   a.fireCooldown=2.6;
   a.speechTimer=0.8;
   npcClip(a,'move');
  }
  return;
 }

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

 const support=platforms.filter(pl=>!pl.wall&&!pl.ceiling&&a.x>=pl.x&&a.x<=pl.x+pl.w&&pl.y>=p.y-90).sort((u,v)=>u.y-v.y)[0];
 const targetY=support?support.y:580;
 a.y+=(targetY-a.y)*(1-Math.exp(-dt*12));

 if(p.x-a.x>820&&a.x<rCam-60){
  a.x=rCam-55;
  a.prevX=a.x;
 }

 const dxToPlayer=p.x-a.x;
 a.face=dxToPlayer>=0?1:-1;

 if(a.phase==='attack'){
  a.attackTime+=dt;
  npcClip(a,'attack');
  // Pre-fire telegraph is 0.64s; fire wind dart at 0.64s!
  if(a.attackTime>=0.64&&!a.firedInCycle){
   a.firedInCycle=true;
   a.shotCount=(a.shotCount||0)+1;
   const muzzleX=a.x+a.face*42;
   const muzzleY=a.y-62;
   const aimX=a.aimTargetX??p.x;
   const aimY=(a.aimTargetY??p.y)-34;
   const ang=Math.atan2(aimY-muzzleY,aimX-muzzleX);
   const speed=450;
   windDarts.push({
    x:muzzleX,y:muzzleY,prevX:muzzleX,prevY:muzzleY,
    vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,
    age:0,maxAge:2.4,radius:13,hit:false
   });
   burst(muzzleX,muzzleY,'#b8f7e8',8);
   tone(680,.09,'sine',.035);
  }
  // Gate G4-2: Shorten post-shot recovery to 0.20s (0.64 + 0.20 = 0.84s) and resume chase immediately!
  // With fireCooldown = 3.92 ~ 4.18s, total shot-to-shot interval is ~4.76 ~ 5.02s (~0.5s shorter than TEST11's 5.33s, strictly >= 3.0s)
  if(a.attackTime>=0.84){
   a.phase='chase';
   a.attackTime=0;
   a.fireCooldown=3.92+0.26*npcSeedUnit(a.seed,(a.shotCount||1)*17+9);
   npcClip(a,'move');
  }
 }else{
  const desiredX=p.x-(dxToPlayer>=0?220:-220);
  const diff=desiredX-a.x;
  if(Math.abs(diff)>16){
   const moveSpeed=Math.abs(dxToPlayer)>420?345:285;
   a.x=clamp(a.x+Math.sign(diff)*moveSpeed*dt,6650,14220);
   npcClip(a,'move');
  }else{
   npcClip(a,'idle');
  }

  a.fireCooldown-=dt;
  if(a.fireCooldown<=0&&Math.abs(dxToPlayer)<680&&Math.abs(dxToPlayer)>70&&p.x<14180){
   a.phase='attack';
   a.attackTime=0;
   a.firedInCycle=false;
   a.aimTargetX=p.x;
   a.aimTargetY=p.y;
   npcClip(a,'attack');
   tone(520,.07,'triangle',.025);
  }
 }

 if(a.phase==='attack'&&touchesActor(a)){
  applyStunHit(a.x,'mayo');
 }
}

function releaseBombs(a){
 const n=arena.stage,dir=p.vx<-20?-1:1,center=clamp(p.x+dir*135,arena.start+120,arena.end-120);
 const offsets=n===1?[0]:n===2?[-155,155]:[-240,0,240];
 const handX=a.x+a.face*24,handY=a.y-82;
 offsets.forEach((offset,i)=>{
  const tx=clamp(center+offset,arena.start+90,arena.end-90);
  const dist=Math.abs(tx-handX);
  const flight=clamp(1.32+dist/1450,1.40,2.30);
  bombs.push({
   x0:handX,y0:handY,
   tx,ty:580,
   bx:handX,by:handY,prevBx:handX,prevBy:handY,
   age:-i*.22,flight,radius:60,bodyRadius:14,hitPlayerDone:false,sounded:false
  });
 });
 arena.volleys++;tone(440,.09,'triangle',.025);
}

function updateMarie(a,dt){
 if(!arena||erpienChaseCompleted||a.retreating)return;
 a.face=p.x<a.x?-1:1;
 const inZone=p.x>=arena.start&&p.x<=arena.end;
 if(inZone&&!arena.active){
  arena.active=true;arena.stage=1;arena.cooldown=0.45;
 }
 if(!arena.active)return;
 if(p.x>arena.end){
  arena.active=false;arena.passed=true;bombs=[];npcClip(a,'idle');$('encounterStatus').textContent='';return;
 }
 arena.stage=p.x<12450?1:p.x<13350?2:3;

 if(arena.casting){
  arena.castTime+=dt;
  const dur=npcMeta.marie_throw.frames/npcMeta.marie_throw.fps;
  if(!arena.released&&arena.castTime>=.45){arena.released=true;releaseBombs(a);}
  if(arena.castTime>=dur){
   arena.casting=false;arena.castTime=0;npcClip(a,'idle');
   arena.cooldown=arena.stage===1?1.85:arena.stage===2?1.55:1.35;
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

function triggerErpienJointRetreat(){
 erpienChaseCompleted=true;
 windDarts=[];
 bombs=[];
 if(arena){arena.active=false;arena.passed=true;arena.casting=false;}
 $('encounterStatus').textContent='';
 const mayo=actors.find(a=>a.kind==='mayo');
 const marie=actors.find(a=>a.kind==='marie');
 erpienRetreatEvent={
  elapsed:0,
  duration:3.2,
  mayoLine:'칫 야광 공룡 다음에 두고봄',
  marieLine:'교단 안쪽까지는 못 들어가겠어!'
 };
 if(mayo){
  mayo.active=true;
  mayo.retreating=true;
  mayo.phase='retreat';
  mayo.x=clamp(mayo.x,13820,14240);
  mayo.prevX=mayo.x;
  mayo.face=-1;
  npcClip(mayo,'move');
 }
 if(marie){
  marie.active=true;
  marie.retreating=true;
  marie.phase='retreat';
  marie.face=-1;
  npcClip(marie,'move');
 }
 tone(780,.12,'sine',.04);
}

function updateHazards(dt){
 hazardClock+=dt;
 if(p.invulnerable>0)p.invulnerable=Math.max(0,p.invulnerable-dt);
 for(const a of actors){a.prevX=a.x;a.prevY=a.y;}
 if(levelIndex===1)updateBukgyeong(dt);

 if(levelIndex===2&&!erpienChaseCompleted&&p.x>=14300){
  triggerErpienJointRetreat();
 }

 if(erpienRetreatEvent){
  erpienRetreatEvent.elapsed+=dt;
  const mayo=actors.find(a=>a.kind==='mayo');
  const marie=actors.find(a=>a.kind==='marie');
  if(mayo&&mayo.retreating){
   mayo.face=-1;
   mayo.x-=280*dt;
   npcClip(mayo,'move');
  }
  if(marie&&marie.retreating){
   marie.face=-1;
   marie.x-=240*dt;
   npcClip(marie,'move');
  }
  if(erpienRetreatEvent.elapsed>=erpienRetreatEvent.duration){
   if(mayo){mayo.active=false;mayo.retreating=false;mayo.hiddenInDoor=true;}
   if(marie){marie.active=false;marie.retreating=false;marie.hiddenInDoor=true;}
   erpienRetreatEvent=null;
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
 for(const wd of windDarts){
  wd.prevX=wd.x;wd.prevY=wd.y;
  wd.age+=dt;
  wd.x+=wd.vx*dt;
  wd.y+=wd.vy*dt;
  if(!wd.hit&&wd.age<=wd.maxAge){
   const d=distPointToSegment(playerCenterX,playerCenterY,wd.prevX,wd.prevY,wd.x,wd.y);
   if(d<wd.radius+20){
    wd.hit=true;
    applyStunHit(wd.prevX,'mayo_wind');
   }
  }
 }
 windDarts=windDarts.filter(wd=>!wd.hit&&wd.age<wd.maxAge&&wd.x<14290);

 for(const b of bombs){
  b.age+=dt;
  if(b.age<0)continue;
  const u=clamp(b.age/b.flight,0,1);
  b.prevBx=b.bx??b.x0;
  b.prevBy=b.by??b.y0;
  b.bx=b.x0+(b.tx-b.x0)*u;
  b.by=b.y0+(b.ty-15-b.y0)*u-210*4*u*(1-u);

  if(b.age<b.flight){
   if(!b.hitPlayerDone){
    const dAir=distPointToSegment(playerCenterX,playerCenterY,b.prevBx,b.prevBy,b.bx,b.by);
    if(dAir<(b.bodyRadius||14)+20){
     b.hitPlayerDone=true;
     burst(b.bx,b.by,'#ffcf86',10);
     applyStunHit(b.bx,'marie_bomb_air');
    }
   }
  }else if(b.age>=b.flight&&b.age<b.flight+.35){
   if(!b.sounded){b.sounded=true;burst(b.tx,b.ty-10,'#ffce8f',12);tone(110,.16,'triangle',.035);}
   if(!b.hitPlayerDone&&Math.abs(p.x-b.tx)<b.radius+16&&p.y>b.ty-58&&p.y-58<b.ty+10){
    b.hitPlayerDone=true;
    applyStunHit(b.tx,'marie_bomb');
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
 ctx.save();ctx.font='16px "Malgun Gothic", sans-serif';const w=ctx.measureText(text).width+24;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-w/2,y-25,w,32,10);ctx.fill();ctx.fillStyle='#514a42';ctx.textAlign='center';ctx.fillText(text,x,y-3);ctx.restore();
}

function drawBukgyeongLandmark(){
 if(levelIndex!==1||!bukgyeongEvent)return;
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
  bubble(viceWarn?'! 한 분 더 나오신다!':'! 문이 덜컹거려요!',doorX,doorTopY-18+bounce,'#ffe6b4');
 }
 ctx.restore();
}

function drawActors(){
 drawBukgyeongLandmark();
 for(const a of actors){
  if(a.hiddenInDoor)continue;
  if(a.kind==='mayo'&&!a.active&&!a.retreating)continue;
  const ax=(a.prevX??a.x)+(a.x-(a.prevX??a.x))*renderAlpha;
  const ay=(a.prevY??a.y)+(a.y-(a.prevY??a.y))*renderAlpha;
  if(ax<rCam-260||ax>rCam+W+260)continue;

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
   // Gate G3: Always show active contact danger ring under guards in all states!
   if(a.danger){
    ellipse(ax,ay-2,a.specialGuard?40:34,6,a.specialGuard?'#ff3b28cc':(isGuard?'#d9433099':'#ef876a99'));
   }
   nx.clearRect(0,0,256,256);
   if(a.oldClip&&a.blend<1)drawNpcFrame(a,a.oldClip,a.oldAnim,1-a.blend);
   drawNpcFrame(a,a.clip,a.anim,a.blend);
   ctx.save();
   ctx.translate(Math.round(ax),Math.round(ay));
   ctx.scale(-a.face,1);
   const m=npcMeta[a.kind+'_idle'],size=m.display;
   ctx.drawImage(npcCanvas,-m.anchor/256*size,-m.foot/256*size,size,size);
   ctx.restore();

   if(a.kind==='mayo'){
    if(a.retreating&&erpienRetreatEvent){
     bubble(erpienRetreatEvent.mayoLine,ax,ay-162,'#ffe4ec');
    }else if(a.phase==='attack'&&!a.firedInCycle){
     ctx.save();
     ctx.setLineDash([6,5]);
     line(ax+a.face*36,ay-62,a.aimTargetX??p.x,(a.aimTargetY??p.y)-34,'#63e6becc',3);
     ctx.restore();
     bubble('! 바람총 발사!',ax,ay-162,'#d3f9d8');
    }else if(a.speechDuration>0&&a.speechText){
     bubble(a.speechText,ax,ay-162,'#fff3db');
    }
   }else if(a.kind==='marie'){
    if(a.retreating&&erpienRetreatEvent){
     bubble(erpienRetreatEvent.marieLine,ax,ay-138,'#fff8e7');
    }else if(arena?.casting){
     bubble('폭탄 간다~!',ax,ay-150);
    }
   }else if(a.active){
    const warning=a.phase==='warn';
    if(warning){
     ctx.save();
     ctx.setLineDash([7,6]);
     const toX=a.curTo!==undefined?a.curTo:(a.home+(a.patrolDir||-1)*(a.curPatrol||a.patrol));
     line(toX,ay-3,a.home,ay-3,isGuard?'#e05a47':'#edac54',4);
     ctx.restore();
     bubble(a.specialGuard?'⚡ 고속 경비 돌진!':(isGuard?'! 경비 순찰!':'! 요정 돌진!'),ax,ay-155,isGuard?'#ffd8cf':'#ffe6b4');
    }else if(a.specialGuard){
     ctx.save();
     ctx.font='bold 12px "Malgun Gothic", sans-serif';
     ctx.fillStyle='#ff4d38';
     ctx.textAlign='center';
     ctx.fillText('⚡ 1.5x 고속 경비',ax,ay-132);
     ctx.restore();
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
  ctx.strokeStyle='#63e6be';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.ellipse(0,0,20,8,0,0,Math.PI*2);
  ctx.stroke();
  ctx.fillStyle='#e6fcf5';
  ctx.beginPath();
  ctx.roundRect(-16,-4,32,8,4);
  ctx.fill();
  ctx.restore();
 }
}

function drawBombs(){
 for(const b of bombs){
  if(b.age<0)continue;
  const u=clamp(b.age/b.flight,0,1);
  const exploding=b.age>=b.flight;
  ctx.save();
  ctx.fillStyle=exploding?'#ffbd6599':'#ffda8e88';
  ctx.strokeStyle='#c87936';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.ellipse(b.tx,b.ty-3,b.radius,exploding?24:10,0,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();

  if(!exploding){
   ctx.save();
   ctx.setLineDash([5,7]);
   ctx.strokeStyle='#f59f0066';
   ctx.lineWidth=2;
   ctx.beginPath();
   for(let s=0;s<=12;s++){
    const su=s/12;
    const px=b.x0+(b.tx-b.x0)*su;
    const py=b.y0+(b.ty-15-b.y0)*su-210*4*su*(1-su);
    if(s===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
   }
   ctx.stroke();
   ctx.restore();

   ctx.font='bold 21px Arial';
   ctx.fillStyle='#7b4323';
   ctx.textAlign='center';
   ctx.fillText('!',b.tx,b.ty-17);
   const x=b.x0+(b.tx-b.x0)*u,y=b.y0+(b.ty-15-b.y0)*u-210*4*u*(1-u);
   ctx.strokeStyle='#ff6b6b99';
   ctx.lineWidth=2;
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
 const secIdx=Math.max(0,levels[q.level].sections.findIndex(s=>s.title===q.title));
 loadLevel(q.level,{section:secIdx});
 if(q.x!==undefined)p.x=q.x;
 if(q.y!==undefined){
  p.y=q.y;
  p.on=platforms.find(a=>a.collidable!==false&&!a.ceiling&&!a.wall&&p.x>=a.x&&p.x<=a.x+a.w&&Math.abs(a.y-p.y)<8)||p.on;
  p.ground=!!p.on;
 }
 const initCam=typeof computeInitialCameraForPoint==='function'?computeInitialCameraForPoint(p.x,p.y):{cam:Math.max(0,Math.min(END-W,p.x-W*.42)),camY:0};
 cam=initCam.cam;
 camY=initCam.camY;
 if(typeof syncRenderCoords==='function')syncRenderCoords();
 state='playing';updateRegionHud();keys.clear();canvas.focus();
}
async function loadNpcImages(){
 const extraAssets=['president','vice','president_cutout','vice_cutout','bukgyeong_building','bukgyeong_door_l','bukgyeong_door_r'];
 await Promise.all([...Object.keys(npcMeta),...extraAssets].map(n=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{npcImages[n]=im;ok();};im.onerror=no;im.src='assets/npc/'+n+'.webp?v=12';})));
}
for(const key of Object.keys(encounterPresets)){const btn=$('practice-'+key);if(btn)btn.onclick=()=>practiceEncounter(key);}
