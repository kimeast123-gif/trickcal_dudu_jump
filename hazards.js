
const MONATIUM_B_FRIEND_DEFS = [
 {
  id: 'monatium_elena', kind: 'elena', name: '엘레나', levelId: 'monatium_b',
  x: 7100, y: 580, face: -1,
  idleClip: 'idle', happyClip: 'idle', disableHappy: true,
  greetingText: '어 그래 두두인지 뭔지... 여론이 아직 않좋으니 빨리 가라구',
  happyText: '',
  greetRadius: 175, happyRadius: 0, happyDur: 0, bubbleColor: '#eef6ff'
 },
 {
  id: 'monatium_amelia', kind: 'amelia', name: '아멜리아', levelId: 'monatium_b',
  x: 7380, y: 580, face: -1,
  idleClip: 'idle', happyClip: 'idle', disableHappy: true,
  greetingText: '저는 아망이 아니라 아멜리아 입니다! 아.멜.리.아',
  happyText: '',
  greetRadius: 175, happyRadius: 0, happyDur: 0, bubbleColor: '#fff5eb'
 },
 {
  id: 'monatium_canna', kind: 'canna', name: '칸나', levelId: 'monatium_b',
  x: 7900, y: 580, face: -1,
  idleClip: 'idle', happyClip: 'idle', disableHappy: true,
  greetingText: '캬~ 볼케니카 휴가는 참 좋았는데! 별일 없었겠죠? 이 귀여운 꼬마용족 친구는 누구?',
  happyText: '',
  greetRadius: 175, happyRadius: 0, happyDur: 0, bubbleColor: '#f3f9ee'
 }
];

'use strict';
// TEST12 Hazards & Encounters:
// - Gate G3: Monatium Guards (`guard1`, `guard2`) have active collision (`a.danger = true`) across ALL states (`wait`, `warn`, `rush`, `rest`, `return`) with swept horizontal segment check + strict vertical separation (0 false hits underneath bridges).
// - Gate G3-6: The 2 special guards on `M-GRD-BR3` protecting `M-GUARD-03` (`x=15980`, `x=16210`) have a 1.5x speed multiplier (`speedMult: 1.5`, rush & return 1.5x faster); the other 6 guards keep 1.0x speed.
// - Gate G4-2: Mayo resumes `chase` 0.20s after firing (`attackTime >= 0.84s`), and actual shot-to-shot interval is shortened by ~0.5s to ~4.80s (strictly >= 3.0s).
// - Gate G4-3: Erpien City `fairy1` / `fairy2` responsiveness increased by ~1.20x while preserving warning telegraph.
// - Gate G5-1: Non-essential encounter toast popups removed while preserving Mayo speech bubbles, Marie bomb telegraphs, Bukgyeong event, and Temple retreat (`x = 14300`).
const npcImages={};
let actors=[],bombs=[],windDarts=[],hazardClock=0,hitCount=0,arena=null,bukgyeongEvent=null;
let erpienChaseCompleted=false,erpienRetreatEvent=null,mayoCatchCount=0,erpienMayoTriggeredInScene=false;
const mayoTriggerLog=[];
window.__mayoTriggerLog=mayoTriggerLog;
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
  id:'diana',kind:'diana',name:'디아나',houseId:'V-PROP-HOUSE-A',
  x:648,y:580,face:-1,
  idleClip:'idle',happyClip:'happy',
  greetingText:'두두야 몸 조심히 다녀오렴',
  happyText:'두두구나~',
  greetRadius:175,happyRadius:155,happyDur:2.4,bubbleColor:'#fff8e7'
 },
 {
  id:'kommy',kind:'kommy',name:'코미',houseId:'V-PROP-HOUSE-B',
  x:3005,y:580,face:-1,
  idleClip:'melong',happyClip:'happy',
  greetingText:'두두 잘 다녀와, 코미는 이만 자야겠어',
  happyText:'교주 보고싶어. 지금 연회장 가면 사료 주려나? 하암',
  greetRadius:175,happyRadius:155,happyDur:2.6,bubbleColor:'#fff8e7'
 },
 {
  id:'butter',kind:'butter',name:'버터',houseId:'V-PROP-HOUSE-C',
  x:4785,y:580,face:-1,
  idleClip:'idle',happyClip:'happy',
  greetingText:'두두! 다음에 또 놀아! 버터 기다릴께!',
  happyText:'버터도 교주님 보고싶어! 다음에 만나면 같이 산책갈꺼야!',
  greetRadius:175,happyRadius:155,happyDur:2.6,bubbleColor:'#fff8e7'
 }
];
const villageFriendHappyPlayed=new Set();
let villageFriends=[];
window.__villageFriends=()=>villageFriends;
window.__villageFriendHappyPlayed=villageFriendHappyPlayed;

function resetVillageFriendRunState(){
 villageFriendHappyPlayed.clear();
 if(typeof resetTempleFriendRunState==='function')resetTempleFriendRunState();
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
 const curId = levels[levelIndex]?.id;
 if (curId !== 'erpien_b') templeFriends = [];
 const defs = (curId === 'monatium_b') ? MONATIUM_B_FRIEND_DEFS : VILLAGE_FRIEND_DEFS;
 villageFriends = defs.map(d => ({
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
 if(levels[levelIndex]?.id!=='village'&&levels[levelIndex]?.id!=='monatium_b')return false;
 return villageFriends.some(vf=>!vf.disableHappy&&!vf.happyPlayedThisRun&&Math.abs(p.x-vf.x)<=vf.happyRadius);
}
window.isNearUnplayedVillageFriend=isNearUnplayedVillageFriend;

function onDuduCallPlayerVoice(clipName){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return false;
 if(levels[levelIndex]?.id!=='village'&&levels[levelIndex]?.id!=='monatium_b')return false;
 if(!p.ground||Math.abs(p.vx)>12)return false;
 for(const vf of villageFriends){
  if(!vf.disableHappy&&!vf.happyPlayedThisRun&&Math.abs(p.x-vf.x)<=vf.happyRadius){
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
 if(levels[levelIndex]?.id!=='village'&&levels[levelIndex]?.id!=='monatium_b')return;
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

// Unified Speech Bubble with Speaker Name Badge (`디아나`, `코미`, `버터`, `엘레나`, `아멜리아`, `칸나`, `네르`, `죠안`, `스키아`, `크레페`, `스피키(메이드)`)
const _friendlyBubbleLayoutCache = new Map();
function drawFriendlySpeechBubble(text, x, y, color = '#fff8e7', speaker = '') {
 if (!text) return;
 ctx.save();
 const lineH = 21;
 const cacheKey = speaker + '\0' + text;
 let layout = _friendlyBubbleLayoutCache.get(cacheKey);
 if (!layout) {
  ctx.font = '16px "ONE Mobile POP", "Malgun Gothic", sans-serif';
  const maxTextW = 330;
  const words = text.split(' ');
  const lines = [];
  let curLine = '';
  for (const w of words) {
   const testLine = curLine ? (curLine + ' ' + w) : w;
   if (ctx.measureText(testLine).width > maxTextW && curLine) {
    lines.push(curLine);
    curLine = w;
   } else {
    curLine = testLine;
   }
  }
  if (curLine) lines.push(curLine);
  let textW = 0;
  for (const ln of lines) {
   textW = Math.max(textW, ctx.measureText(ln).width);
  }
  ctx.font = 'bold 12px "ONE Mobile POP", "Malgun Gothic", sans-serif';
  const speakerW = speaker ? (ctx.measureText(speaker).width + 18) : 0;
  const boxW = Math.ceil(Math.max(textW + 28, speakerW + 24, 76));
  const boxH = lines.length * lineH + 16;
  layout = { lines, speakerW, boxW, boxH };
  _friendlyBubbleLayoutCache.set(cacheKey, layout);
 }
 const { lines, speakerW, boxW, boxH } = layout;

 const zoomNow = (typeof rCamZoom === 'number' && rCamZoom > 0) ? rCamZoom : 1;
 const viewW = W / zoomNow;
 const minCenterX = rCam + boxW * 0.5 + 14;
 const maxCenterX = rCam + viewW - boxW * 0.5 - 14;
 const clampedX = clamp(x, minCenterX, maxCenterX);
 const boxX = Math.round(clampedX - boxW * 0.5);
 const boxY = Math.round(y - boxH);

 // Main speech bubble box
 ctx.fillStyle = color;
 ctx.strokeStyle = 'rgba(81, 74, 66, 0.28)';
 ctx.lineWidth = 2;
 ctx.beginPath();
 ctx.roundRect(boxX, boxY, boxW, boxH, 11);
 ctx.fill();
 ctx.stroke();

 // Pointer tail toward NPC head
 const tailX = clamp(x, boxX + 16, boxX + boxW - 16);
 ctx.beginPath();
 ctx.moveTo(tailX - 7, boxY + boxH - 1);
 ctx.lineTo(tailX, boxY + boxH + 7);
 ctx.lineTo(tailX + 7, boxY + boxH - 1);
 ctx.closePath();
 ctx.fillStyle = color;
 ctx.fill();

 // Speaker name tag badge on top-left of bubble
 if (speaker) {
  const badgeH = 19;
  const badgeW = speakerW;
  const badgeX = boxX + 10;
  const badgeY = boxY - Math.round(badgeH * 0.68);
  ctx.fillStyle = '#5c4b41';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 7);
  ctx.fill();
  ctx.font = 'bold 11.5px "ONE Mobile POP", "Malgun Gothic", sans-serif';
  ctx.fillStyle = '#fffdf8';
  ctx.textAlign = 'center';
  ctx.fillText(speaker, Math.round(badgeX + badgeW * 0.5), badgeY + 13.5);
 }

 // Verbatim dialogue text lines
 ctx.font = '16px "ONE Mobile POP", "Malgun Gothic", sans-serif';
 ctx.fillStyle = '#4a423b';
 ctx.textAlign = 'center';
 for (let i = 0; i < lines.length; i++) {
  const ly = boxY + 22 + i * lineH;
  ctx.fillText(lines[i], Math.round(clampedX), ly);
 }
 ctx.restore();
}

function drawVillageFriends(){
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return;
 if(levels[levelIndex]?.id!=='village'&&levels[levelIndex]?.id!=='monatium_b')return;
 const viewW=(typeof rCamZoom==='number'&&rCamZoom>0)?(W/rCamZoom):W;
 // Pass 1: Draw NPC sprites
 for(const vf of villageFriends){
  if(vf.x<rCam-200||vf.x>rCam+viewW+200)continue;
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
 }
 // Pass 2: Draw speech bubbles with speaker name tags on top of sprites (closest active speaker priority to prevent overlap)
 let activeBubbleTarget = null;
 let bestDist = Infinity;
 for (const vf of villageFriends) {
  const onScreen = (vf.x >= rCam + 40 && vf.x <= rCam + viewW - 40);
  if (!onScreen) continue;
  if (vf.state === 'happy') {
   activeBubbleTarget = vf;
   break;
  }
  if (vf.greetingVisible) {
   const d = Math.abs(p.x - vf.x);
   if (d < bestDist) {
    bestDist = d;
    activeBubbleTarget = vf;
   }
  }
 }
 if (activeBubbleTarget) {
  if (activeBubbleTarget.state === 'happy') {
   drawFriendlySpeechBubble(activeBubbleTarget.happyText, activeBubbleTarget.x, activeBubbleTarget.y - 152, '#ffe8f0', activeBubbleTarget.name || '');
  } else {
   drawFriendlySpeechBubble(activeBubbleTarget.greetingText, activeBubbleTarget.x, activeBubbleTarget.y - 152, activeBubbleTarget.bubbleColor || '#fff8e7', activeBubbleTarget.name || '');
  }
 }
}

// ============================================================================
// TEST28: Erpien B Temple Corridor Friendly NPCs (Ner -> Joanne -> Skea -> Crepe & Speaki(Maid))
// ============================================================================
const ERP_B_TEMPLE_FRIEND_DEFS = [
 {
  id: 'ner', kind: 'ner', name: '네르', levelId: 'erpien_b',
  x: 17200, y: 580, face: -1,
  defaultClip: 'idle', reactClip: 'happy',
  dialogue: '어머, 고생많으셨어요! 어서 방으로 들어가 쉬세요',
  triggerRadius: 175, exitRadius: 210, maxYDiff: 115,
  bubbleDur: 3.10, reactHoldDur: 2.90,
  pairGroup: null, pairOrder: 0, bubbleColor: '#fff8e7'
 },
 {
  id: 'joanne', kind: 'joanne', name: '죠안', levelId: 'erpien_b',
  x: 17930, y: 580, face: -1,
  defaultClip: 'idle', reactClip: 'happy',
  dialogue: '늦지않게 잘 왔구나 두두. 참으로 기특하도다.',
  triggerRadius: 175, exitRadius: 210, maxYDiff: 115,
  bubbleDur: 3.10, reactHoldDur: 2.90,
  pairGroup: null, pairOrder: 0, bubbleColor: '#eef8ee'
 },
 {
  id: 'skea', kind: 'skea', name: '스키아', levelId: 'erpien_b',
  x: 18770, y: 580, face: -1,
  defaultClip: 'eat2', reactClip: 'panic',
  dialogue: '...!',
  triggerRadius: 175, exitRadius: 210, maxYDiff: 115,
  bubbleDur: 2.60, reactHoldDur: 2.40,
  pairGroup: null, pairOrder: 0, bubbleColor: '#f3f0ff'
 },
 {
  id: 'crepe', kind: 'crepe', name: '크레페', levelId: 'erpien_b',
  x: 19620, y: 580, face: -1,
  defaultClip: 'idle', reactClip: 'happy',
  dialogue: '크레페와 크레페는!',
  triggerRadius: 185, exitRadius: 225, maxYDiff: 115,
  bubbleDur: 1.50, reactHoldDur: 3.00,
  pairGroup: 'crepe_speaki', pairOrder: 1, bubbleColor: '#ffeef4'
 },
 {
  id: 'speaki_maid', kind: 'speaki_maid', name: '스피키(메이드)', levelId: 'erpien_b',
  x: 19810, y: 580, face: -1,
  defaultClip: 'idle', reactClip: 'happy',
  dialogue: '일 심 동 체!',
  triggerRadius: 185, exitRadius: 225, maxYDiff: 115,
  bubbleDur: 1.50, reactHoldDur: 3.00,
  pairGroup: 'crepe_speaki', pairOrder: 2, bubbleColor: '#fff4e6'
 }
];

let templeFriends = [];
const templePairState = {
 groupCenterX: 19715,
 groupY: 580,
 enterHalfSpan: 270,
 exitHalfSpan: 310,
 step1Dur: 1.50,
 totalDur: 3.00,
 active: false,
 seqTime: 0,
 activeStep: 0,
 reenterCooldown: 0
};
window.__templeFriends = () => templeFriends;
window.__templePairState = templePairState;

function resetTemplePairState() {
 templePairState.active = false;
 templePairState.seqTime = 0;
 templePairState.activeStep = 0;
 templePairState.reenterCooldown = 0;
}

function initTempleFriends() {
 const curId = levels[levelIndex]?.id;
 resetTemplePairState();
 if (curId !== 'erpien_b') {
  templeFriends = [];
  return;
 }
 templeFriends = ERP_B_TEMPLE_FRIEND_DEFS.map(d => ({
  ...d,
  near: false,
  bubbleVisible: false,
  bubbleTimer: 0,
  reenterCooldown: 0,
  triggeredInVisit: false,
  state: 'idle',
  stateTime: 0,
  clip: d.defaultClip,
  anim: 0
 }));
}
window.initTempleFriends = initTempleFriends;

function resetTempleFriendRunState() {
 resetTemplePairState();
 for (const tf of templeFriends) {
  tf.near = false;
  tf.bubbleVisible = false;
  tf.bubbleTimer = 0;
  tf.reenterCooldown = 0;
  tf.triggeredInVisit = false;
  tf.state = 'idle';
  tf.stateTime = 0;
  tf.clip = tf.defaultClip;
  tf.anim = 0;
 }
}
window.resetTempleFriendRunState = resetTempleFriendRunState;

function updateTempleFriends(dt) {
 if (typeof gameMode !== 'undefined' && gameMode === 'challenge') return;
 if (levels[levelIndex]?.id !== 'erpien_b') return;
 if (!templeFriends.length) initTempleFriends();

 for (const tf of templeFriends) {
  if (tf.pairGroup) continue;
  tf.anim += dt;
  if (tf.reenterCooldown > 0) tf.reenterCooldown = Math.max(0, tf.reenterCooldown - dt);

  const dx = Math.abs(p.x - tf.x);
  const dy = Math.abs(p.y - tf.y);
  const inEnterRange = (dx <= tf.triggerRadius && dy <= tf.maxYDiff);
  const outExitRange = (dx > tf.exitRadius || dy > tf.maxYDiff + 50);

  if (inEnterRange && Math.abs(p.x - tf.x) > 12) {
   tf.face = (p.x < tf.x) ? -1 : 1;
  }

  if (!tf.near) {
   if (inEnterRange && tf.reenterCooldown <= 0) {
    tf.near = true;
    tf.triggeredInVisit = true;
    tf.state = 'react';
    tf.stateTime = 0;
    tf.clip = tf.reactClip;
    tf.anim = 0;
    tf.bubbleVisible = true;
    tf.bubbleTimer = tf.bubbleDur;
   }
  } else {
   if (outExitRange) {
    tf.near = false;
    tf.triggeredInVisit = false;
    tf.bubbleVisible = false;
    tf.bubbleTimer = 0;
    tf.state = 'idle';
    tf.stateTime = 0;
    tf.clip = tf.defaultClip;
    tf.anim = 0;
    tf.face = -1;
    tf.reenterCooldown = 0.40;
   } else {
    if (tf.bubbleTimer > 0) {
     tf.bubbleTimer = Math.max(0, tf.bubbleTimer - dt);
     if (tf.bubbleTimer <= 0) tf.bubbleVisible = false;
    }
    if (tf.state === 'react') {
     tf.stateTime += dt;
     if (tf.stateTime >= tf.reactHoldDur) {
      tf.state = 'idle';
      tf.stateTime = 0;
      tf.clip = tf.defaultClip;
      tf.anim = 0;
     }
    }
   }
  }
 }

 const crepe = templeFriends.find(t => t.id === 'crepe');
 const speaki = templeFriends.find(t => t.id === 'speaki_maid');
 if (!crepe || !speaki) return;

 crepe.anim += dt;
 speaki.anim += dt;
 if (templePairState.reenterCooldown > 0) {
  templePairState.reenterCooldown = Math.max(0, templePairState.reenterCooldown - dt);
 }

 const pairDx = Math.abs(p.x - templePairState.groupCenterX);
 const pairDy = Math.abs(p.y - templePairState.groupY);
 const inPairEnter = (pairDx <= templePairState.enterHalfSpan && pairDy <= 115);
 const outPairExit = (pairDx > templePairState.exitHalfSpan || pairDy > 165);

 if (!templePairState.active) {
  if (inPairEnter && templePairState.reenterCooldown <= 0) {
   templePairState.active = true;
   templePairState.seqTime = 0;
   templePairState.activeStep = 1;
   for (const member of [crepe, speaki]) {
    member.near = true;
    member.triggeredInVisit = true;
    member.state = 'react';
    member.stateTime = 0;
    member.clip = member.reactClip;
    member.anim = 0;
   }
   crepe.bubbleVisible = true;
   speaki.bubbleVisible = false;
  }
 } else {
  if (outPairExit) {
   templePairState.active = false;
   templePairState.seqTime = 0;
   templePairState.activeStep = 0;
   templePairState.reenterCooldown = 0.40;
   for (const member of [crepe, speaki]) {
    member.near = false;
    member.triggeredInVisit = false;
    member.bubbleVisible = false;
    member.bubbleTimer = 0;
    member.state = 'idle';
    member.stateTime = 0;
    member.clip = member.defaultClip;
    member.anim = 0;
    member.face = -1;
   }
  } else {
   for (const member of [crepe, speaki]) {
    if (Math.abs(p.x - member.x) > 12) {
     member.face = (p.x < member.x) ? -1 : 1;
    }
    member.stateTime += dt;
   }
   templePairState.seqTime += dt;
   if (templePairState.seqTime >= 0.65 && templePairState.seqTime < templePairState.step1Dur && p.x >= 19745 && p.vx > 80) {
    templePairState.seqTime = templePairState.step1Dur;
   }

   if (templePairState.seqTime < templePairState.step1Dur) {
    templePairState.activeStep = 1;
    crepe.bubbleVisible = true;
    speaki.bubbleVisible = false;
   } else if (templePairState.seqTime < templePairState.totalDur) {
    if (templePairState.activeStep !== 2) {
     templePairState.activeStep = 2;
     speaki.anim = 0;
    }
    crepe.bubbleVisible = false;
    speaki.bubbleVisible = true;
   } else {
    templePairState.activeStep = 3;
    crepe.bubbleVisible = false;
    speaki.bubbleVisible = false;
    for (const member of [crepe, speaki]) {
     if (member.state === 'react') {
      member.state = 'idle';
      member.stateTime = 0;
      member.clip = member.defaultClip;
      member.anim = 0;
     }
    }
   }
  }
 }
}

function drawTempleFriends() {
 if (typeof gameMode !== 'undefined' && gameMode === 'challenge') return;
 if (levels[levelIndex]?.id !== 'erpien_b') return;
 const viewW = (typeof rCamZoom === 'number' && rCamZoom > 0) ? (W / rCamZoom) : W;

 for (const tf of templeFriends) {
  if (tf.x < rCam - 220 || tf.x > rCam + viewW + 220) continue;
  ellipse(tf.x, tf.y + 2, 24, 4, '#34463b28');
  const key = `${tf.kind}_${tf.clip}`;
  const m = npcMeta[key] || npcMeta[`${tf.kind}_${tf.defaultClip}`];
  const im = npcImages[key] || npcImages[`${tf.kind}_${tf.defaultClip}`];
  if (m && im && im.complete && im.naturalWidth > 0) {
   const duration = m.frames / m.fps;
   const rawFrame = (tf.state === 'react')
    ? Math.min(m.frames - 1, tf.anim * m.fps)
    : ((tf.anim % duration) * m.fps);
   const f = Math.max(0, Math.min(m.frames - 1, Math.floor(rawFrame) % m.frames));
   nx.clearRect(0, 0, 256, 256);
   nx.save();
   nx.globalCompositeOperation = 'source-over';
   nx.globalAlpha = 1;
   nx.drawImage(im, (f % m.cols) * 256, Math.floor(f / m.cols) * 256, 256, 256, 0, 0, 256, 256);
   nx.restore();
   ctx.save();
   ctx.translate(Math.round(tf.x), Math.round(tf.y));
   ctx.scale(-tf.face, 1);
   const size = m.display || 148;
   ctx.drawImage(npcCanvas, -Math.round((m.anchor / 256) * size), -Math.round((m.foot / 256) * size), size, size);
   ctx.restore();
  }
 }

 for (const tf of templeFriends) {
  if (!tf.bubbleVisible) continue;
  if (tf.x < rCam - 80 || tf.x > rCam + viewW + 80) continue;
  drawFriendlySpeechBubble(tf.dialogue, tf.x, tf.y - 156, tf.bubbleColor || '#fff8e7', tf.name || '');
 }
}

const encounterPresets = {
 forest: { levelId: 'forest', title: '수인숲 출발', x: 150, y: 580 },
 village: { levelId: 'village', title: '수인마을 광장', x: 520, y: 580 },
 kommy: { levelId: 'village', title: '수인마을 광장', x: 2880, y: 580 },
 butter: { levelId: 'village', title: '수인마을 광장', x: 4660, y: 580 },
 monatiuma: { levelId: 'monatium_a', title: '모나티엄 진입로', x: 150, y: 580 },
 tower: { levelId: 'monatium_a', title: '상승 타워 입구', x: 4180, y: 580 },
 skywalk: { levelId: 'monatium_a', title: '모나티엄 옥상 입구', x: 6160, y: -1785 },
 descent: { levelId: 'monatium_a', title: '옥상 하강 입구', x: 12120, y: -1730 },
 guards: { levelId: 'monatium_a', title: '진압반 공중 교량', x: 17120, y: 580 },
 bukgyeong: { levelId: 'monatium_a', title: '북경성 앞 광장', x: 25750, y: 580 },
 monatiumb: { levelId: 'monatium_b', title: '모나티엄 B · 서측 타워', x: 150, y: 580 },
 monatiumb_npc: { levelId: 'monatium_b', title: '모나티엄 B · 서측 타워', x: 6970, y: 580 },
 erpiena: { levelId: 'erpien_a', title: '에르피엔 A · 요정 입구', x: 6920, y: 580 },
 erpienb: { levelId: 'erpien_b', title: '에르피엔 B · 도심 마요 추격', x: 150, y: 580 },
 mayo: { levelId: 'erpien_b', title: '에르피엔 도심 입구', x: 150, y: 580 },
 fairies: { levelId: 'erpien_b', title: '빵집 처마 거리', x: 3300, y: 580 },
 marie: { levelId: 'erpien_b', title: '마리 광장 아레나', x: 11170, y: 540 },
 temple: { levelId: 'erpien_b', title: '교단 회랑 및 엄마의 방', x: 12200, y: 580 },
 temple_npc: { levelId: 'erpien_b', title: '교단 회랑 및 엄마의 방', x: 17050, y: 580 }
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
 const minX=(typeof extra.patrolX1==='number')?extra.patrolX1:(anchorPlat?(anchorPlat.x+28):(extra.minX??20));
 const maxX=(typeof extra.patrolX2==='number')?extra.patrolX2:(anchorPlat?(anchorPlat.x+anchorPlat.w-28):(extra.maxX??(END-20)));
 const pDir=extra.patrolDir||-1;
 const clampedHome=extra.fullSpanPatrol?(pDir>0?minX:maxX):clamp(x,minX,maxX);
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
 hazardClock = 0; bombs = []; windDarts = []; arena = null; bukgyeongEvent = null; erpienRetreatEvent = null;
 p.invulnerable = 0; p.knock = 0; p.knockVX = 0; p.guardStun = 0; p.guardKnock = 0;
 if (typeof gameMode !== 'undefined' && gameMode === 'challenge') {
  actors = [];
  if (typeof resetChallengeHazards === 'function') resetChallengeHazards();
  return;
 }
 const curId = levels[levelIndex]?.id;

 if (curId === 'village') {
  actors = [];
  initVillageFriends();
 } else if (curId === 'monatium_a') {
  const doorX = BUKGYEONG_LANDMARK.doorCenterX;
  bukgyeongEvent = initBukgyeongEvent();
  actors = [
   actor('guard1', 14740, 420, { id: 'G-01', platformId: 'M-G1-LOW1', patrol: 195, baseSpeed: 162, returnSpeed: 132, speedMult: 1.05, patrolDir: -1 }),
   actor('guard2', 16040, 480, { id: 'G-02', platformId: 'M-G1-LOW2', patrol: 215, baseSpeed: 176, returnSpeed: 142, speedMult: 1.08, patrolDir: -1, delay: 0.30 }),
   actor('guard1', 17905, 420, { id: 'G-03', platformId: 'M-GRD-BR1', patrol: 215, baseSpeed: 172, returnSpeed: 138, speedMult: 1.15, patrolDir: -1 }),
   actor('guard2', 19285, 460, { id: 'G-04', platformId: 'M-GRD-BR2', patrol: 205, baseSpeed: 182, returnSpeed: 145, speedMult: 1.15, patrolDir: 1, delay: 0.35 }),
   actor('guard1', 21330, 500, { id: 'G-05', platformId: 'M-G3-MID1', patrol: 195, baseSpeed: 168, returnSpeed: 138, speedMult: 1.08, patrolDir: -1 }),
   actor('guard2', 21605, 345, { id: 'G-06', platformId: 'M-G3-UPPER', patrol: 205, baseSpeed: 184, returnSpeed: 146, speedMult: 1.10, patrolDir: 1, delay: 0.40 }),
   actor('guard1', 22960, 515, { id: 'G-06B', platformId: 'M-G3-MID2', patrol: 165, baseSpeed: 172, returnSpeed: 140, speedMult: 1.08, patrolDir: -1, delay: 0.20 }),
   actor('guard1', 24015, 485, { id: 'G-07-BR3', platformId: 'M-GRD-BR3A', patrol: 205, baseSpeed: 168, returnSpeed: 165, speedMult: 1.5, specialGuard: true, patrolDir: -1, delay: 0.0 }),
   actor('guard2', 24515, 400, { id: 'G-08-BR3', platformId: 'M-GRD-BR3B', patrol: 210, baseSpeed: 182, returnSpeed: 174, speedMult: 1.5, specialGuard: true, patrolDir: 1, delay: 0.55 }),
   actor('president', doorX, 580, { photo: true, cutout: 'president_cutout', patrol: 390, speed: 230, hiddenInDoor: true }),
   actor('vice', doorX, 580, { photo: true, cutout: 'vice_cutout', patrol: 510, speed: 305, hiddenInDoor: true })
  ];
 } else if (curId === 'monatium_b') {
  actors = [];
  initVillageFriends();
 } else if (curId === 'erpien_a') {
  // P0-4 & P0-5: All Erpien A fairies patrol end-to-end across their assigned platform (fullSpanPatrol: true)
  // and have active body contact collision across ALL states (wait, warn, rush, rest, return)!
  // Right-side 4 descent fairies (EA-F07..F10) are accelerated (1.22x ~ 1.30x) to match the long S-curve shelves.
  actors = [
   // Left Ascent Fairies (EA-F01 ~ EA-F04): full platform end-to-end patrol (margin 28px)
   actor('fairy1', 7268, 350, { id: 'EA-F01', platformId: 'EA-P01', fullSpanPatrol: true, patrolX1: 7268, patrolX2: 7622, patrolDir: 1, baseSpeed: 168, baseReturnSpeed: 132, speedMult: 1.0 }),
   actor('fairy2', 8162, 70,  { id: 'EA-F02', platformId: 'EA-P02', fullSpanPatrol: true, patrolX1: 7948, patrolX2: 8162, patrolDir: -1, baseSpeed: 175, baseReturnSpeed: 136, speedMult: 1.0 }),
   actor('fairy1', 7808, -280, { id: 'EA-F03', platformId: 'EA-P03', fullSpanPatrol: true, patrolX1: 7808, patrolX2: 8172, patrolDir: 1, baseSpeed: 170, baseReturnSpeed: 134, speedMult: 1.0 }),
   actor('fairy2', 7702, -620, { id: 'EA-F04', platformId: 'EA-P04', fullSpanPatrol: true, patrolX1: 7408, patrolX2: 7702, patrolDir: -1, baseSpeed: 175, baseReturnSpeed: 136, speedMult: 1.0 }),
   // Special Fairy (EA-FS01) on EA-P-SPEC (x=6820..7160, y=-640): guards EA-SPECIAL-01 (x=6865) across x=6910..7132 with 1.5x knockback
   actor('fairy2', 7132, -640, { id: 'EA-FS01', platformId: 'EA-P-SPEC', fullSpanPatrol: true, patrolX1: 6910, patrolX2: 7132, patrolDir: -1, baseSpeed: 175, baseReturnSpeed: 140, speedMult: 1.05, isSpecialFairy: true, knockbackScale: 1.50 }),
   // Central Long Bridge (EA-P-TOP-C: x=8330..9020, midpoint=8675): split cleanly into Left Half (EA-F05: 8358..8648) & Right Half (EA-F06: 8702..8992)
   actor('fairy1', 8358, -680, { id: 'EA-F05', platformId: 'EA-P-TOP-C', fullSpanPatrol: true, patrolX1: 8358, patrolX2: 8648, patrolDir: 1, baseSpeed: 168, baseReturnSpeed: 134, speedMult: 1.0 }),
   actor('fairy2', 8992, -680, { id: 'EA-F06', platformId: 'EA-P-TOP-C', fullSpanPatrol: true, patrolX1: 8702, patrolX2: 8992, patrolDir: -1, baseSpeed: 174, baseReturnSpeed: 138, speedMult: 1.0 }),
   // [FIX8 Gate 4]: Right-side 4-Tier Forced ㄹ-Descent Fairies (1 · 1 · 1 · 2 = 5 fairies total):
   // - Tier 1 (EA-P07: 9010..9820): EA-F07 (1 fairy, standard 1.0x speed: 170 / 134 px/s)
   // - Tier 2 (EA-P08: 9010..10040): EA-F08 (1 fairy, 1.5x standard speed: baseSpeed 175 * 1.50 = 263 px/s rush, baseReturnSpeed 136 * 1.50 = 204 px/s return!)
   // - Tier 3 (EA-P09: 8614..9820): EA-F09 (1 fairy, standard 1.0x speed: 172 / 134 px/s)
   // - Tier 4 (EA-P10: 8920..10040): EA-F10 (left half 8948..9450, 1.0x) + EA-F11 (right half 9500..10012, 1.0x)
   actor('fairy1', 9792, -620, { id: 'EA-F07', platformId: 'EA-P07', fullSpanPatrol: true, patrolX1: 9038, patrolX2: 9792, patrolDir: -1, baseSpeed: 170, baseReturnSpeed: 134, speedMult: 1.0 }),
   actor('fairy2', 9038, -300, { id: 'EA-F08', platformId: 'EA-P08', fullSpanPatrol: true, patrolX1: 9038, patrolX2: 10012, patrolDir: 1,  baseSpeed: 175, baseReturnSpeed: 136, speedMult: 1.50 }),
   actor('fairy1', 9792, 20,   { id: 'EA-F09', platformId: 'EA-P09', fullSpanPatrol: true, patrolX1: 8642, patrolX2: 9792, patrolDir: -1, baseSpeed: 172, baseReturnSpeed: 134, speedMult: 1.0 }),
   actor('fairy1', 8948, 350,  { id: 'EA-F10', platformId: 'EA-P10', fullSpanPatrol: true, patrolX1: 8948, patrolX2: 9450, patrolDir: 1,  baseSpeed: 172, baseReturnSpeed: 134, speedMult: 1.0 }),
   actor('fairy2', 10012, 350, { id: 'EA-F11', platformId: 'EA-P10', fullSpanPatrol: true, patrolX1: 9500, patrolX2: 10012, patrolDir: -1, baseSpeed: 175, baseReturnSpeed: 136, speedMult: 1.0 })
  ];
 } else if (curId === 'erpien_b') {
  initTempleFriends();
  const e = STAGE_ANCHORS.erpien_b;
  const exitWall = platforms.find(pl => pl.id === 'B-EXIT-WALL');
  if (p.x < e.templeStart) {
   erpienChaseCompleted = false;
   if (exitWall) { exitWall.hidden = false; exitWall.nonCollidable = false; exitWall.collidable = true; }
  } else {
   erpienChaseCompleted = true;
   if (exitWall) { exitWall.hidden = true; exitWall.nonCollidable = true; exitWall.collidable = false; }
  }
  const inBossStart = (p.x >= e.marieStart && p.x < e.templeStart && !erpienChaseCompleted);
  const inMidChaseSpawn = (!inBossStart && p.x >= e.mayoActivateX && p.x < e.marieStart && !erpienChaseCompleted);
  const minChaseX = e.mayoMinChaseX ?? 80;
  const initialMayoX = inBossStart
   ? e.mayoBossX
   : (inMidChaseSpawn ? Math.max(minChaseX, p.x - 480) : (e.mayoSpawnX ?? 820));
  erpienMayoTriggeredInScene = (inBossStart || inMidChaseSpawn);
  actors = [
   actor('mayo', initialMayoX, inBossStart ? e.mayoBossY : 580, {
    chaser: true, active: (inBossStart || inMidChaseSpawn), retreating: false,
    mode: inBossStart ? 'BOSS_SNIPER' : 'CHASE', currentSpeed: 279, accel: 550,
    vy: 0, inAir: false, spawnGrace: 1.50,
    fireCooldown: inBossStart ? 1.48 : 999, attackTime: 0,
    firedInCycle: false, firedSecondInCycle: false, firedThirdInCycle: false,
    aimLocked: false, aimTargetX: e.centerSpawnX, aimTargetY: e.centerSpawnY - 34,
    groggyTimer: 0, groggyBubble: '',
    shotCount: 0, burstCount: 1, bossBurstCount: 0, profileStage: 'A',
    speechTimer: 1.2, speechDuration: 0, speechText: '', lastSpeechIdx: -1
   }),
   actor('fairy1', 3720, 580, { id: 'F-01', platformId: 'E-CITY-GND3', patrol: 190, baseSpeed: 178, speedMult: 1.20 }),
   actor('fairy2', 5280, 580, { id: 'F-02', platformId: 'E-CITY-GND4', patrol: 190, baseSpeed: 212, speedMult: 1.20 }),
   actor('fairy1', 7020, 580, { id: 'F-03', platformId: 'E-CITY-GND5', patrol: 185, baseSpeed: 192, speedMult: 1.20 }),
   actor('marie', e.mariePerchX, e.mariePerchY, {
    id: 'MARIE', platformId: 'B-MARIE-PODIUM', retreating: false,
    groggyTimer: 0, invulnTimer: 0, groggyBubble: ''
   })
  ];
  if (inBossStart) {
   arena = {
    originX: e.arenaOrigin, width: e.arenaWidth,
    phase: 'intro', phaseTime: 0, hits: 0, maxHits: 3,
    castTime: 0, released: false, volleys: 0, passed: false,
    casting: false, cooldown: 1.65, groggyTimer: 0,
    marieHits: 0, marieInvulnTimer: 0,
    resetCount: (arena?.resetCount || 0) + 1
   };
  }
 } else {
  actors = [];
 }
 $('encounterStatus').textContent = '';
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

 let force = (sourceKind === 'special_fairy' || (typeof customMsg === 'object' && customMsg?.knockbackScale)) ? 480 : 320;
 if(p.ground&&p.on&&sourceKind!=='special_fairy'){
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
 if (typeof gameMode === 'undefined' || gameMode !== 'challenge') {
  p.hp = Math.max(0, (typeof p.hp === 'number' ? p.hp : 5) - 1);
 }
 if (typeof gameMode !== 'undefined' && gameMode === 'world' && typeof worldStageHitsThisRun !== 'undefined') {
  worldStageHitsThisRun++;
  const save = typeof loadWorldMapSave === 'function' ? loadWorldMapSave() : null;
  const stg = (typeof world1Stages !== 'undefined') ? world1Stages[activeWorldStageIndex] : null;
  if (save && stg && save.worlds.world1_beastforest.stages[stg.stageCode]) {
   save.worlds.world1_beastforest.stages[stg.stageCode].hits++;
   saveWorldMapData(save);
  }
 }
 if (typeof updateHud === 'function') updateHud();
 burst(p.x,p.y-35,'#ff9e7d',12);
 tone(165,.18,'sawtooth',.045);
 if(typeof playDuduVoice==='function')playDuduVoice('hit_stun');
 if ((typeof gameMode === 'undefined' || gameMode !== 'challenge') && p.hp <= 0) {
  deaths++;
  notify('체력이 모두 소진되어 체크포인트로 돌아왔어요!');
  if (typeof gameMode !== 'undefined' && gameMode === 'world' && typeof retryWorld1StageCheckpoint === 'function') {
   retryWorld1StageCheckpoint();
  } else {
   reset(false);
  }
  p.invulnerable = Math.max(p.invulnerable, 1.2);
  return true;
 }
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
  if(!a._cachedPlat||a._cachedPlat.id!==a.platformId||a._cachedPlatLen!==platforms.length){
   a._cachedPlat=platforms.find(x=>x.id===a.platformId)||null;
   a._cachedPlatLen=platforms.length;
  }
  const pl=a._cachedPlat;
  if(pl){
   a.y=pl.y;
   if(typeof a.patrolX1==='number')a.minX=a.patrolX1;
   else if(typeof a.customMinX==='number')a.minX=a.customMinX;
   else a.minX=pl.x+28;
   if(typeof a.patrolX2==='number')a.maxX=a.patrolX2;
   else if(typeof a.customMaxX==='number')a.maxX=a.customMaxX;
   else a.maxX=pl.x+pl.w-28;
   if(pl.dx)a.home=clamp(a.home+pl.dx,a.minX,a.maxX);
  }
 }
 const prof=a.profile||BEHAVIOR_PROFILES.guard1;
 const isErpienAFairy=(typeof currentLevelId==='function'&&currentLevelId()==='erpien_a'&&(a.kind==='fairy1'||a.kind==='fairy2'));
 const isGuard=a.kind.startsWith('guard')||!!a.isSpecialFairy||isErpienAFairy;
 const dirSign=a.patrolDir||-1;
 if(a.fullSpanPatrol){
  a.home=dirSign>0?a.minX:a.maxX;
  a.patrol=Math.max(40,a.maxX-a.minX);
 }
 const vVar=0.94+0.12*npcSeedUnit(a.seed,a.cycle*7+1);
 const pVar=a.fullSpanPatrol?1.0:(0.95+0.10*npcSeedUnit(a.seed,a.cycle*7+2));
 const waitDur=prof.waitTime*vVar;
 const warnDur=Math.max(0.95,prof.warnTime);
 const rawPatrol=Math.round(a.patrol*pVar);
 const targetUnclamped=a.fullSpanPatrol?(dirSign>0?a.maxX:a.minX):(a.home+dirSign*rawPatrol);
 const clampedTo=clamp(targetUnclamped,a.minX,a.maxX);
 const patrolDist=Math.max(40,Math.abs(clampedTo-a.home));
 const effSpeed=a.speed||(prof.speed||160);
 const effReturnSpeed=a.returnSpeed||(prof.returnSpeed||112);
 const rushDur=patrolDist/(effSpeed*vVar);
 const restDur=prof.restTime*vVar;
 const returnDur=patrolDist/effReturnSpeed;

 const activateDist=a.fullSpanPatrol?1400:820;
 if(!a.active&&Math.abs(p.x-a.home)<activateDist){
  a.active=true;a.phase='wait';a.phaseTime=-(a.delay||0);
 }
 if(!a.active)return;

 a.phaseTime+=dt;
 // Gate G3 & P0-4: Guards and Erpien A fairies have active contact hitbox in ALL visible states (wait, warn, rush, rest, return)!
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
 a.reachedMinX=Math.min(a.reachedMinX??a.x,a.x);
 a.reachedMaxX=Math.max(a.reachedMaxX??a.x,a.x);
 if(a.danger&&touchesActor(a))applyStunHit(a.x,a.isSpecialFairy?'special_fairy':a.kind);
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
 const e = STAGE_ANCHORS.erpien_b || STAGE_ANCHORS.erpien;
 const minChaseX = e.mayoMinChaseX ?? 80;
 const mayoAfter=actors.find(x=>x.kind==='mayo');
 if(mayoAfter){
  mayoAfter.spawnGrace=1.50;
  if(p.x>=e.mayoActivateX&&p.x<e.marieStart){
   erpienMayoTriggeredInScene=true;
   mayoAfter.active=true;
   mayoAfter.mode='CHASE';
   mayoAfter.x=Math.max(minChaseX,p.x-480);
   mayoAfter.prevX=mayoAfter.x;
   mayoAfter.y=580;
   mayoAfter.prevY=580;
   mayoAfter.phase='chase';
   mayoAfter.fireCooldown=2.2;
  }else if(p.x<e.mayoActivateX){
   erpienMayoTriggeredInScene=false;
   mayoAfter.active=false;
   mayoAfter.x=e.mayoSpawnX??820;
   mayoAfter.prevX=mayoAfter.x;
   mayoAfter.y=580;
   mayoAfter.prevY=580;
  }
 }
 notify('마요에게 붙잡혔어요! 체크포인트에서 다시 출발합니다.');
 return true;
}

function enterMarieBossArena(){
 const e = STAGE_ANCHORS.erpien_b || STAGE_ANCHORS.erpien;
 const spawnPlat = platforms.find(pl => pl.id === 'B-CENTER-SPAWN');
 const marieSecIdx = sections.findIndex(s => Math.abs(s.x - e.centerSpawnX) < 40);
 if (marieSecIdx >= 0) checkpoint = marieSecIdx;
 p.x = e.centerSpawnX;
 p.y = e.centerSpawnY;
 p.prevX = p.x; p.prevY = p.y;
 p.vx = 0; p.vy = 0;
 p.ground = true;
 p.on = spawnPlat || p.on;
 p.jumps = 0; p.airDashUsed = false; p.dash = 0;
 p.guardStun = 0; p.guardKnock = 0; p.knock = 0;
 p.invulnerable = 1.2;
 keys.clear();

 windDarts = [];
 bombs = [];
 const exitWall = platforms.find(pl => pl.id === 'B-EXIT-WALL');
 if (exitWall) {
  exitWall.hidden = false;
  exitWall.nonCollidable = false;
  exitWall.collidable = true;
 }

 const mayo = actors.find(a => a.kind === 'mayo');
 if (mayo) {
  mayo.active = true;
  mayo.retreating = false;
  mayo.hiddenInDoor = false;
  mayo.mode = 'BOSS_SNIPER';
  mayo.x = e.mayoBossX;
  mayo.y = e.mayoBossY;
  mayo.prevX = mayo.x;
  mayo.prevY = mayo.y;
  mayo.face = -1;
  mayo.phase = 'idle';
  mayo.attackTime = 0;
  mayo.fireCooldown = 1.48;
  mayo.aimLocked = false;
  mayo.aimTargetX = e.centerSpawnX;
  mayo.aimTargetY = e.centerSpawnY - 34;
  mayo.groggyTimer = 0;
  mayo.groggyBubble = '';
  npcClip(mayo, 'idle');
 }

 const marie = actors.find(a => a.kind === 'marie');
 if (marie) {
  marie.active = true;
  marie.retreating = false;
  marie.hiddenInDoor = false;
  marie.x = e.mariePerchX;
  marie.y = e.mariePerchY;
  marie.prevX = marie.x;
  marie.prevY = marie.y;
  marie.face = -1;
  marie.groggyTimer = 0;
  marie.invulnTimer = 0;
  marie.groggyBubble = '';
  npcClip(marie, 'idle');
 }

 if (!arena) {
  arena = {
   originX: e.arenaOrigin, width: e.arenaWidth,
   phase: 'intro', phaseTime: 0, hits: 0, maxHits: 3,
   castTime: 0, released: false, volleys: 0, passed: false,
   resetCount: 1
  };
 }
 arena.entered = true;
 arena.active = true;
 arena.phase = 'intro';
 arena.introTimer = 1.35;
 arena.bannerTimer = 2.8;
 arena.bannerText = '마요를 유도해 마리를 세 번 맞추세요!';
 arena.marieHits = 0;
 arena.marieInvulnTimer = 0;
 // FIX8.1: restore the boss's casting cycle on every arena entry/reset.
 arena.groggyTimer = 0;
 arena.finaleTimer = 0;
 arena.finaleStep = 0;
 arena.counterBomb = null;
 arena.casting = false;
 arena.castTime = 0;
 arena.released = false;
 arena.cooldown = 1.65;
 arena.volleys = 0;
 arena.desperationCount = 0;
 arena.finalBurstTimer = 0;
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
 if(!a||(levels[levelIndex]?.id!=='erpien'&&levels[levelIndex]?.id!=='erpien_b'))return;
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

 const minChaseX = e.mayoMinChaseX ?? 80;
 if(!a.active){
  if(!erpienMayoTriggeredInScene && p.x>=e.mayoActivateX && p.x<e.marieStart){
   erpienMayoTriggeredInScene=true;
   a.active=true;
   a.mode='CHASE';
   const safeSpawnX = Math.max(minChaseX, Math.min(e.mayoSpawnX ?? 820, p.x - 650));
   a.x=safeSpawnX;
   a.prevX=a.x;
   a.y=580;a.prevY=580;a.vy=0;a.inAir=false;
   a.currentSpeed=prof.speedClose;
   a.spawnGrace=1.40;
   a.phase='chase';
   a.fireCooldown=2.0;
   a.speechTimer=0.8;
   npcClip(a,'move');
   const isFin = Number.isFinite(a.x) && Number.isFinite(a.y);
   if(!isFin) console.error('[Mayo QA Error] Non-finite Mayo spawn coordinates:', a.x, a.y);
   mayoTriggerLog.push({
    sceneId: levels[levelIndex]?.id || 'erpien_b',
    playerX: Math.round(p.x),
    mayoX: Math.round(a.x),
    separation: Math.round(p.x - a.x),
    spawnGrace: a.spawnGrace,
    finitePosition: isFin,
    t: Number((typeof time==='number'?time:0).toFixed(2))
   });
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

 let support=null,bestDistY=Infinity;
 for(let i=0,len=platforms.length;i<len;i++){
  const pl=platforms[i];
  if(!pl.wall&&!pl.ceiling&&pl.challenge!=='special'&&a.x>=pl.x-14&&a.x<=pl.x+pl.w+14){
   const dY=Math.abs(pl.y-p.y);
   if(dY<bestDistY){bestDistY=dY;support=pl;}
  }
 }

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
  const safeBehindX=Math.max(minChaseX,rCam-45);
  const groundAtBehind=platforms.find(pl=>!pl.wall&&!pl.ceiling&&safeBehindX>=pl.x&&safeBehindX<=pl.x+pl.w);
  a.x=safeBehindX;
  a.prevX=a.x;
  a.y=groundAtBehind?groundAtBehind.y:510;
  a.prevY=a.y;
 }

 if(a.phase==='attack'){
  a.attackTime+=dt;
  a.x=clamp(a.x+a.face*(prof.speedClose*0.45)*dt,minChaseX,e.marieStart-60);
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
   a.x=clamp(a.x+Math.sign(dxToPlayer)*a.currentSpeed*dt,minChaseX,e.marieStart-60);
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

// TEST28 Marie boss rebalance: 5 -> 6 -> 7 ordinary bombs, accelerating at 2 hits.
// Every incoming Mayo hit also generates an independently targeted eight-bomb desperation barrage.
// Deliberately keep boss arena/physics/challenge hazards unchanged.
function resolveMarieBombTarget(tx){
 const surfaces=platforms.filter(pl=>!pl.wall&&!pl.ceiling&&pl.id!=='B-MARIE-PODIUM'&&pl.collidable!==false&&tx>=pl.x&&tx<=pl.x+pl.w);
 surfaces.sort((u,v)=>u.y-v.y);
 return surfaces.length?{ty:surfaces[0].y,overPit:false,surfaceId:surfaces[0].id}:{ty:615,overPit:true,surfaceId:'PIT-AIR-CORRIDOR'};
}
function makeMarieBomb(a,tx,kind,order,age,flight,arcHeight=200){
 const e=STAGE_ANCHORS.erpien_b;
 const bx=clamp(Math.round(tx),e.arenaOrigin+28,e.exitWallX-22);
 const tgt=resolveMarieBombTarget(bx);
 return {
  bombIndex:order,bombKind:kind,x0:a.x+a.face*24,y0:a.y-82,
  tx:bx,ty:tgt.ty,overPit:tgt.overPit,surfaceId:tgt.surfaceId,
  arcHeight,bx:a.x+a.face*24,by:a.y-82,prevBx:a.x+a.face*24,prevBy:a.y-82,
  age,flight,radius:46,bodyRadius:13,hitPlayerDone:false,sounded:false,finale:false
 };
}
function releaseBombs(a){
 if(!arena||arena.phase!=='combat'||arena.marieHits>=3)return;
 const e=STAGE_ANCHORS.erpien_b;
 const hits=arena.marieHits||0;
 const volley=arena.volleys||0;
 const count=hits===0?5:(hits===1?6:7);
 const boosted=hits>=2;
 const minX=e.arenaOrigin+60,maxX=e.exitWallX-55;
 const span=maxX-minX;
 for(let i=0;i<count;i++){
  const u=npcSeedUnit(411+hits*113,volley*83+i*17);
  // Two bombs specifically threaten stationary lure platforms / the player's current perch.
  const tx=i===0?p.x-44+u*88:
   i===1?p.x-115+u*230:
   minX+span*((i-2+u*0.65)/Math.max(1,count-2));
  const flight=boosted?(1.08+u*0.16):(hits===1?1.42+u*0.18:1.65+u*0.14);
  bombs.push(makeMarieBomb(a,tx,'base',i+1,-i*0.14,flight,195+u*36));
 }
 arena.volleys=volley+1;
 arena.lastVolleyBombCount=count;
 tone(440,.09,'triangle',.03);
}
// 8 separate bombs per Mayo hit; coverage includes the player's last known position and both sides of the arena.
// The later delayed bombs can land after Marie's temporary immunity expires, so staying on B-LEFT-PAD-B is no longer a safe strategy.
function releaseMarieDesperationBombs(a,hitNo){
 if(!arena||arena.phase!=='combat')return;
 const e=STAGE_ANCHORS.erpien_b;
 const seed=7103+hitNo*107+(arena.volleys||0)*19+Math.floor(hazardClock*13);
 const minX=e.arenaOrigin+55,maxX=e.exitWallX-55;
 const span=maxX-minX;
 const targetAtHit=clamp(p.x,minX,maxX);
 for(let i=0;i<8;i++){
  const u=npcSeedUnit(seed,i*29+13);
  let tx;
  if(i===0||i===4||i===7){
   // Repeated pressure near the player's position with deterministic but different offsets.
   tx=targetAtHit+(u-0.5)*(i===7?165:120);
  }else{
   const sector=(i===1||i===5)?0:(i===2||i===6)?1:2;
   tx=minX+span*((sector+0.13+u*0.74)/3);
  }
  const flight=Math.max(0.98,1.41-0.075*(hitNo-1)+u*0.22);
  bombs.push(makeMarieBomb(a,tx,'desperation',i+1,-0.16*i,flight,160+u*70));
 }
 arena.desperationCount=(arena.desperationCount||0)+1;
 arena.lastDesperationBombCount=8;
 tone(240,0.16,'sawtooth',0.046);
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
 // The third hit queues the final counterattack only after the final 8-bomb desperation wave.
 if(arena.marieHits>=3)return;

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
   arena.cooldown=(arena.marieHits>=2?1.95:2.30);
  }
 }else{
  // Recover from an invalid cooldown without changing the established attack cadence.
  if(!Number.isFinite(arena.cooldown)) arena.cooldown=1.65;
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
 if(typeof gameMode!=='undefined'&&gameMode==='world'){
  if(p.invulnerable>0)p.invulnerable=Math.max(0,p.invulnerable-dt);
  if(typeof syncWorld1Tentacles==='function')syncWorld1Tentacles(dt);
  if(typeof updateWorld1Collectibles==='function')updateWorld1Collectibles();
  if(typeof updateWorld1Friends==='function')updateWorld1Friends(dt);
  return;
 }
 hazardClock+=dt;
 if(p.invulnerable>0)p.invulnerable=Math.max(0,p.invulnerable-dt);
 for(const a of actors){a.prevX=a.x;a.prevY=a.y;}
 const curId=levels[levelIndex]?.id;
 if(curId==='monatium_a'||curId==='monatium')updateBukgyeong(dt);
 if(curId==='village'||curId==='monatium_b')updateVillageFriends(dt);
 if(curId==='erpien_b')updateTempleFriends(dt);

 if(curId==='erpien'||curId==='erpien_b'){
  const e=STAGE_ANCHORS.erpien_b||STAGE_ANCHORS.erpien;
  if(!erpienChaseCompleted&&(!arena||!arena.entered)&&p.x>=e.marieStart+15&&p.x<e.templeStart){
   enterMarieBossArena();
  }
 }
 if((curId==='erpien'||curId==='erpien_b')&&arena){
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
  if(arena.phase==='combat'&&arena.finalBurstTimer>0){
   arena.finalBurstTimer=Math.max(0,arena.finalBurstTimer-dt);
   if(arena.finalBurstTimer===0)startBoss3HitFinale();
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
    // Immediate immunity and rage. Do not erase in-flight bombs when Marie is hit.
    arena.marieInvulnTimer=2.15;
    arena.groggyTimer=1.12;
    arena.casting=false;
    arena.castTime=0;
    arena.released=false;
    arena.cooldown=1.40;
    marie.invulnTimer=2.15;
    marie.groggyTimer=1.12;
    releaseMarieDesperationBombs(marie,arena.marieHits);
    if(arena.marieHits>=3){
     arena.finalBurstTimer=2.95;
     marie.groggyBubble='마지막 발악이다! 이 폭탄도 피해 보라고!';
     notify('마리 최후의 발악! 8발을 피하면 반격 연출이 시작됩니다.');
    }else{
     marie.groggyBubble=arena.marieHits===1?'으앗! 마요야 어딜 쏘는 거야?! (1/3)':'아야야! 마요 눈 똑바로 안 떠?! (2/3)';
     notify(`마리에게 마요 바람총 명중! (${arena.marieHits}/3) · 발악 폭탄 8발!`);
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
 if((levels[levelIndex]?.id!=='monatium_a'&&levels[levelIndex]?.id!=='monatium')||!bukgyeongEvent)return;
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
 if(!arena||(levels[levelIndex]?.id!=='erpien'&&levels[levelIndex]?.id!=='erpien_b')||!arena.entered||arena.phase==='cleared')return;
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
 drawTempleFriends();
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
   const isGuard=a.kind.startsWith('guard')||!!a.isSpecialFairy;
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
 if(key==='mayo'||key==='erpienb'){
  const e=STAGE_ANCHORS.erpien_b||STAGE_ANCHORS.erpien;
  const mayoAct=actors.find(a=>a.kind==='mayo');
  if(mayoAct){
   erpienMayoTriggeredInScene=false;
   mayoAct.active=false;
   mayoAct.mode='CHASE';
   mayoAct.x=e.mayoSpawnX??820;
   mayoAct.prevX=mayoAct.x;
   mayoAct.y=580;
   mayoAct.prevY=580;
   mayoAct.spawnGrace=1.40;
  }
 }else if(key==='fairies'){
  const e=STAGE_ANCHORS.erpien_b||STAGE_ANCHORS.erpien;
  const mayoAct=actors.find(a=>a.kind==='mayo');
  if(mayoAct){
   erpienMayoTriggeredInScene=true;
   mayoAct.active=true;
   mayoAct.mode='CHASE';
   mayoAct.x=Math.max(e.mayoMinChaseX??80,p.x-480);
   mayoAct.prevX=mayoAct.x;
   mayoAct.y=580;
   mayoAct.prevY=580;
   mayoAct.spawnGrace=1.40;
  }
 }else if(key==='marie'){
  if(typeof enterMarieBossArena==='function')enterMarieBossArena();
 }else if(key==='monatiumb_npc'){
  monatiumBTower3ExitAuthorized=true;
  monatiumBTower3Cleared=true;
 }
 if(typeof syncRenderCoords==='function')syncRenderCoords();
 state='playing';updateRegionHud();keys.clear();canvas.focus();
}
const _npcAssetPromises = new Map();
function _loadSingleNpcImg(name) {
 if (npcImages[name]) return Promise.resolve(npcImages[name]);
 if (_npcAssetPromises.has(name)) return _npcAssetPromises.get(name);
 const p = new Promise((ok) => {
  const im = new Image();
  im.onload = async () => {
   try { if (im.decode) await im.decode(); } catch (e) {}
   npcImages[name] = im;
   ok(im);
  };
  im.onerror = () => { console.warn('[NPC] Failed to load asset:', name); ok(null); };
  im.src = 'assets/npc/' + name + '.webp?v=30';
 });
 _npcAssetPromises.set(name, p);
 return p;
}

const REGION_NPC_MAP = {
 forest: ['tentacle_idle'],
 village: ['diana_idle', 'diana_happy', 'kommy_melong', 'kommy_happy', 'kommy_idle', 'butter_idle', 'butter_happy'],
 monatium_a: ['guard1_idle', 'guard1_move', 'guard1_warn', 'guard2_idle', 'guard2_move', 'guard2_warn', 'president', 'vice', 'president_cutout', 'vice_cutout', 'bukgyeong_building', 'bukgyeong_door_l', 'bukgyeong_door_r'],
 monatium_b: ['guard1_idle', 'guard1_move', 'guard1_warn', 'guard2_idle', 'guard2_move', 'guard2_warn', 'elena_idle', 'amelia_idle', 'canna_idle'],
 erpien_a: ['fairy1_idle', 'fairy1_move', 'fairy1_warn', 'fairy2_idle', 'fairy2_move', 'fairy2_warn', 'mayo_idle', 'mayo_move', 'mayo_warn', 'mayo_attack'],
 erpien_b: ['marie_idle', 'marie_move', 'marie_throw', 'ner_idle', 'ner_happy', 'joanne_idle', 'joanne_happy', 'skea_eat2', 'skea_panic', 'crepe_idle', 'crepe_happy', 'speaki_maid_idle', 'speaki_maid_happy'],
 world1: ['tentacle_idle', 'diana_idle', 'diana_happy', 'kommy_idle', 'kommy_happy', 'butter_idle', 'butter_happy', 'rufo_idle', 'rufo_happy', 'tig_hero_idle', 'tig_hero_happy', 'beni_idle', 'beni_happy', 'momo_idle', 'momo_happy', 'bana_idle', 'bana_happy', 'ran_idle', 'ran_happy']
};

function ensureNpcRegionAssets(regionId) {
 const list = REGION_NPC_MAP[regionId];
 if (!list) {
  const extraAssets = ['president','vice','president_cutout','vice_cutout','bukgyeong_building','bukgyeong_door_l','bukgyeong_door_r','tentacle_idle'];
  return Promise.all([...Object.keys(npcMeta), ...extraAssets].map(_loadSingleNpcImg));
 }
 return Promise.all(list.map(_loadSingleNpcImg));
}
window.ensureNpcRegionAssets = ensureNpcRegionAssets;

async function loadNpcImages(){
 // Tier 1 (Boot): Only load Stage 1 (forest) NPC/hazard sheet first; preload remaining NPCs in Tier 2 background
 await ensureNpcRegionAssets('forest');
 setTimeout(() => {
  const extraAssets = ['president','vice','president_cutout','vice_cutout','bukgyeong_building','bukgyeong_door_l','bukgyeong_door_r','tentacle_idle'];
  for (const n of [...Object.keys(npcMeta), ...extraAssets]) {
   _loadSingleNpcImg(n);
  }
 }, 550);
}
for(const key of Object.keys(encounterPresets)){const btn=$('practice-'+key);if(btn)btn.onclick=()=>practiceEncounter(key);}
