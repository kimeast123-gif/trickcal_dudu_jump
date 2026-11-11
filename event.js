'use strict';
// TEST12 Event & BGM Loop Controller:
// - Gate G1-3: Updates special ending text from `별동전/특수코인` to `황금 크레파스` while preserving official dynamic `TOTAL_SPECIAL_COINS` and all ending conditions.
// - Gate G6-2: Eliminates 1.6~2.2s trailing silence gaps in BGM MP3 loops using measured `BGM_LOOP_BOUNDS` (`loopStartSec` / `loopEndSec` verified via ffmpeg silencedetect).
let eventMode=false,eventElapsed=0,eventLast=0,sceneElapsed=0,typed=0,storyLine='',scenePaused=false,musicStage=-1;
let storySessionId=0,activeStoryKind=null;
const LIMIT=1500,EVENT_ROOT='assets/event/';
const eventImages={};
const musicNames=['day','afternoon','sunset','opening','ending'];
const BGM_LOOP_BOUNDS={
 day:{start:0.05,end:88.85},
 afternoon:{start:0.05,end:73.75},
 sunset:{start:0.05,end:93.35},
 opening:{start:0.05,end:67.60},
 ending:{start:0.05,end:102.75}
};
window.__bgmLoopBounds=BGM_LOOP_BOUNDS;

const tracks=musicNames.map(n=>{
 const a=new Audio(EVENT_ROOT+n+'.mp3');
 a.preload='auto';
 a.loop=true;
 a.volume=0;
 const bounds=BGM_LOOP_BOUNDS[n];
 if(bounds){
  a.loopStartSec=bounds.start;
  a.loopEndSec=bounds.end;
  a.addEventListener('timeupdate',()=>{
   if(a.currentTime>=bounds.end){
    a.currentTime=bounds.start;
    if(a.paused&&!muted&&state!=='paused'&&!scenePaused)a.play().catch(()=>{});
   }
  });
 }
 return a;
});
let musicSelected=-1;const gains=[0,0,0,0,0];
function playTrack(n,restart=false){
 if(n===musicSelected&&!restart)return;
 musicSelected=n;
 const a=tracks[n];
 if(restart)a.currentTime=a.loopStartSec||0;
 if(!muted)a.play().catch(()=>notify('음악 버튼을 눌러 소리를 켜 주세요.'));
}
function stopMusic(){musicSelected=-1;tracks.forEach(a=>a.pause());gains.fill(0);}
function musicTick(dt){
 const halted=state==='paused'||scenePaused;
 if(halted){tracks.forEach(a=>a.pause());return;}
 tracks.forEach((a,i)=>{
  if(i===musicSelected&&a.loopEndSec&&a.currentTime>=a.loopEndSec){
   a.currentTime=a.loopStartSec||0;
  }
  const target=i===musicSelected&&!muted&&!halted?.38:0;
  gains[i]+=Math.sign(target-gains[i])*Math.min(Math.abs(target-gains[i]),dt*.22);
  a.volume=gains[i];
  if((muted||halted||i!==musicSelected)&&gains[i]<.001)a.pause();
  else if(i===musicSelected&&!muted&&!halted&&a.paused)a.play().catch(()=>{});
 });
}
function setSound(){muted=!muted;$('sound').textContent=muted?'♪ OFF':'♪ ON';$('sound').setAttribute('aria-label',muted?'음악과 효과음 켜기':'음악과 효과음 끄기');if(!muted&&musicSelected>=0)tracks[musicSelected].play().catch(()=>{});}
$('sound').onclick=setSound;

const lines={
 opening:'두두~ 오늘 저녁 맛있는 거 해 줄 테니 너무 늦게까지 놀지 말고 일찍 돌아오렴',
 success:'신나게 놀고 왔니 두두? 이제 코~ 잘 시간이로구나.',
 special:'신나게 놀고 왔니 두두? 반짝이는 황금 크레파스 12개를 전부 모아왔구나! 이제 코~ 잘 시간이로구나.',
 late:'두두~ 요 개구쟁이 녀석. 늦은 시간까지 그렇게 돌아다니면 못써요. 얼른 씻고 자야지.'
};

// TEST27 Story Cinematics — original opening, success and late lines above are preserved verbatim.
// Official gold crayons (securedSpecialEvent) take priority over a complete king-candy collection.
const storyCinemaRoot='assets/cinematics/';
const storyCinemaByKind={opening:'opening.mp4',success:'normal.mp4',candy:'candy.mp4',special:'gold.mp4'};
const storyMultiLine={
 candy:[
  {speaker:'amelia',text:'두두, 오면서 사탕을 많이도 먹었구나'},
  {speaker:'dudu',text:'응! 하나도 않노치고 다~ 머겄두!'},
  {speaker:'amelia',text:'후훗, 그럼 자기전에 꼼꼼히 치카치카 해야겠지?'},
  {speaker:'dudu',text:'치카치카 좋아! 사망은 더 좋아! 히히'}
 ],
 special:[
  {speaker:'amelia',text:'세상에 두두! 황금 크레파스를 다 모았구나'},
  {speaker:'dudu',text:'응! 두두 열시미 했두! 교준니가 좋아하는거 마니 모았두!'},
  {speaker:'amelia',text:'후훗 교주님이 아시면 깜짝 놀라겠는걸? 마마랑 같이 보러 갈까?'},
  {speaker:'dudu',text:'쪼아! 두두가 모은 황금 크레파스 교준니에게 선물할꺼야!'}
 ]
};
let storyScript=[],storyScriptStep=0,storyRewardShowing=false;
function syncStoryScriptStep(){
 const step=storyScript[storyScriptStep];if(!step)return;
 typed=0;storyLine=step.text;
 const tmpl=$('storyDialogueTemplate');
 tmpl.src=storyCinemaRoot+(step.speaker==='dudu'?'dudu-dialogue.png':'amelia-dialogue.png');
 tmpl.hidden=false;
 $('storyText').textContent='';
 $('story').classList.add('withDialogueTemplate');
}
function setStoryCinemaVideo(kind,session){
 const v=$('storyVideo'),story=$('story');
 if(!v||!story)return;
 const filename=storyCinemaByKind[kind];
 if(!filename)return;
 v.onloadeddata=()=>{
  if(storySessionId!==session||activeStoryKind!==kind)return;
  story.classList.add('hasVideo');
 };
 v.onerror=()=>{if(storySessionId===session){story.classList.remove('hasVideo');}};
 v.muted=true;v.playsInline=true;v.loop=false;v.preload='auto';
 v.src=storyCinemaRoot+filename+'?v=27_ending';
 v.load();
 // Keep original event.png visible until the movie has a decoded first frame.
 // After the last video frame, leave it on screen (do not restart with a visible jump).
 v.play().catch(()=>{story.classList.remove('hasVideo');});
}
function showGoldRewardArtwork(){
 storyRewardShowing=true;
 const v=$('storyVideo');if(v)v.pause();
 $('story').classList.add('rewardArtwork');
 $('storyRewardArt').hidden=false;
 $('storyDialogueTemplate').hidden=true;
 $('storyText').hidden=true;
 $('storyHint').textContent='클릭 · 엔딩 결과 보기';
}
function endingStoryHint(){
 if(storyRewardShowing)return '클릭 · 엔딩 결과 보기';
 if(storyScript.length&&storyScriptStep<storyScript.length-1)return '클릭 · 다음 대사';
 if(activeStoryKind==='special'&&storyScript.length)return '클릭 · 황금 크레파스 엔딩 일러스트';
 return state==='opening'?'클릭 · 산책 준비':'클릭 · 이야기 마치기';
}


async function preloadEventImages(){
 const kinds=['opening','success','late','popup'];
 await Promise.all(kinds.map(k=>new Promise(ok=>{
  const im=new Image();
  im.onload=async()=>{try{if(im.decode)await im.decode();}catch{}eventImages[k]=im;ok();};
  im.onerror=()=>ok();
  im.src=EVENT_ROOT+k+'.png?v=12';
 })));
}

function hideAllCutsceneLayers(){
 storySessionId++;
 activeStoryKind=null;
 storyScript=[];storyScriptStep=0;storyRewardShowing=false;
 const storyEl=$('story'),baseEl=$('storyBase'),motionEl=$('storyMotion'),launchEl=$('launchScene'),overlayEl=$('overlay');
 if(storyEl){storyEl.hidden=true;storyEl.className='story';}
 if(baseEl)baseEl.removeAttribute('src');
 if(motionEl)motionEl.removeAttribute('src');
 const v=$('storyVideo');
 if(v){v.pause();v.onloadeddata=null;v.onerror=null;v.removeAttribute('src');v.load();}
 if($('storyDialogueTemplate')){$('storyDialogueTemplate').hidden=true;$('storyDialogueTemplate').removeAttribute('src');}
 if($('storyRewardArt'))$('storyRewardArt').hidden=true;
 if($('storyText')){$('storyText').hidden=false;$('storyText').textContent='';}
 if(launchEl){launchEl.hidden=true;launchEl.classList.remove('starting');}
 if($('launchWord'))$('launchWord').textContent='';
 if(overlayEl)overlayEl.hidden=true;
 if(typeof clearRegionTransitionLayer==='function')clearRegionTransitionLayer();
 else if($('regionTransition'))$('regionTransition').hidden=true;
}

function showStory(kind){
 if(kind==='opening'&&journeyResult!==null)return;
 if(['success','special','candy','late'].includes(kind)&&journeyResult!==kind)return;
 hideAllCutsceneLayers();
 const session=++storySessionId;
 activeStoryKind=kind;
 state=kind==='opening'?'opening':'ending';
 sceneElapsed=0;
 typed=0;
 storyScript=storyMultiLine[kind]||[];
 storyScriptStep=0;
 storyLine=storyScript.length?storyScript[0].text:(lines[kind]||lines.success);
 const imgKind=(kind==='special'||kind==='candy')?'success':kind;
 const src=eventImages[imgKind]?.src||(EVENT_ROOT+imgKind+'.png?v=12');
 const baseEl=$('storyBase'),motionEl=$('storyMotion'),storyEl=$('story');
 $('storyText').textContent='';
 $('storyHint').textContent='클릭 · 대사 완성 / 다음';
 const reveal=()=>{
  if(session!==storySessionId||activeStoryKind!==kind)return;
  $('launchScene').hidden=true;
  $('launchScene').classList.remove('starting');
  $('overlay').hidden=true;
  storyEl.className='story '+kind;
  storyEl.hidden=false;
  storyEl.focus();
  if(storyScript.length)syncStoryScriptStep();
  // Video is always muted; preserve the existing opening/ending BGM tracks.
  setStoryCinemaVideo(kind,session);
  if(kind==='special'){
   const reward=$('storyRewardArt');
   if(reward&&!reward.getAttribute('src'))reward.src=reward.dataset.src;
   notify(`황금 크레파스 ${TOTAL_SPECIAL_COINS}/${TOTAL_SPECIAL_COINS} 올 컬렉션 달성! 전용 엔딩 연출로 연결됩니다.`);
  }
 };
 baseEl.src=src;
 motionEl.src=src;
 if(baseEl.complete&&motionEl.complete){
  reveal();
 }else{
  let done=false;
  const check=()=>{if(!done&&baseEl.complete&&motionEl.complete){done=true;reveal();}};
  baseEl.onload=check;motionEl.onload=check;
  setTimeout(()=>{if(!done){done=true;reveal();}},120);
 }
}

function finishStoryModal(){
 const wasLate=journeyResult==='late'||eventElapsed>=LIMIT;
 const wasSpecial=journeyResult==='special';
 const wasCandy=journeyResult==='candy';
 const secCount=securedSpecialEvent.size;
 const candyCount=typeof collectedRegularCandyCount==='function'?collectedRegularCandyCount():0;
 const candyTotal=typeof totalRegularCandyCount==='function'?totalRegularCandyCount():0;
 hideAllCutsceneLayers();
 state='eventDone';
 modal(
  wasSpecial?'황금 크레파스 올 컬렉션 달성!':wasCandy?'왕사탕 올 컬렉션 달성!':'산책 이야기 끝',
  wasLate?'조금 늦어버렸어요':wasSpecial?'두두, 모든 황금 크레파스를 선물하러 가요!':wasCandy?'두두, 왕사탕을 하나도 놓치지 않았어요!':'두두, 무사히 집에 도착!',
  `남은 시간 <b>${clockText(wasLate?0:LIMIT-eventElapsed)}</b> · 황금 크레파스 <b>${secCount}/${TOTAL_SPECIAL_COINS}</b> · 왕사탕 <b>${candyCount}/${candyTotal}</b><br>다시 시작하면 새로운 25분 산책이 시작됩니다.`,
  '다시 산책하기 →'
 );
}

function storyAdvance(){
 if(scenePaused){
  scenePaused=false;eventLast=performance.now();
  const v=$('storyVideo');if(v&&!v.ended&&v.paused)v.play().catch(()=>{});
  $('storyHint').textContent='클릭 · 대사 완성 / 다음';return;
 }
 if(state!=='opening'&&state!=='ending')return;
 if(storyRewardShowing){finishStoryModal();return;}
 if(typed<storyLine.length){typed=storyLine.length;$('storyText').textContent=storyLine;return;}
 if(state==='opening'&&journeyResult===null){
  hideAllCutsceneLayers();
  state='popup';sceneElapsed=0;
  $('launchScene').hidden=false;
  $('launchWord').textContent='';
 }else if(state==='ending'){
  if(storyScript.length&&storyScriptStep<storyScript.length-1){
   storyScriptStep++;syncStoryScriptStep();return;
  }
  if(activeStoryKind==='special'&&storyScript.length){showGoldRewardArtwork();return;}
  finishStoryModal();
 }
}
$('story').onclick=storyAdvance;$('story').onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();if(!e.repeat)storyAdvance();}};

function beginEvent(){
 if(state==='loading')return;
 if(typeof gameMode!=='undefined'&&gameMode==='challenge')return;
 hideAllCutsceneLayers();
 reset(true);
 journeyResult=null;
 eventMode=true;
 eventElapsed=0;
 sceneElapsed=0;
 eventLast=performance.now();
 scenePaused=false;
 musicStage=-1;
 keys.clear();
 muted=false;
 $('sound').textContent='♪ ON';
 $('sound').setAttribute('aria-label','음악과 효과음 끄기');
 stopMusic();
 playTrack(3,true);
 showStory('opening');
}

function leaveEvent(){
 eventMode=false;
 journeyResult=null;
 scenePaused=false;
 hideAllCutsceneLayers();
 stopMusic();
}

const normalStart=start,normalChoose=chooseSection;
start=function(){if(state==='paused'){normalStart();return;}beginEvent();};
$('start').onclick=()=>start();
$('restart').onclick=beginEvent;
$('eventRestart').onclick=beginEvent;
for(let n=0;n<5;n++){if($('section'+n))$('section'+n).onclick=()=>practiceRegion(n);}
$('retry').onclick=()=>{
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  if(typeof retryChallengeStage==='function')retryChallengeStage();
  return;
 }
 if(state==='playing'||state==='paused')normalChoose(checkpoint);
};

function finishEvent(success){
 if(!eventMode||journeyResult!==null)return;
 if(state!=='playing'&&state!=='regionTransition')return;
 hideAllCutsceneLayers();
 const onTime=Boolean(success)&&eventElapsed<LIMIT;
 const allSpecialSecured=securedSpecialEvent.size>=TOTAL_SPECIAL_COINS;
 const totalCandy=typeof totalRegularCandyCount==='function'?totalRegularCandyCount():0;
 const allCandy=totalCandy>0&&typeof collectedRegularCandyCount==='function'&&collectedRegularCandyCount()===totalCandy;
 journeyResult=!onTime?'late':allSpecialSecured?'special':allCandy?'candy':'success';
 keys.clear();
 p.vx=p.vy=0;
 sceneElapsed=0;
 typed=0;
 playTrack(4,true);
 if(journeyResult==='success'||journeyResult==='special'||journeyResult==='candy'){
  showStory(journeyResult);
 }else{
  eventElapsed=LIMIT;
  state='night';
  $('toast').textContent='해가 졌어요… 집으로 돌아갈 시간!';
  $('toast').style.opacity=1;
 }
}

function clockText(t){const s=Math.max(0,Math.ceil(t));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

function eventTick(now){
 const dt=eventLast?Math.max(0,(now-eventLast)/1000):0;
 eventLast=now;
 if(typeof gameMode!=='undefined'&&gameMode==='challenge'){
  if(typeof challengeTick==='function')challengeTick(dt);
  musicTick(Math.min(dt,.1));
  return;
 }
 if(state==='regionTransition'){
  regionTick(dt);
  musicTick(Math.min(dt,.1));
  return;
 }
 if(!scenePaused){
  if(state==='opening'||state==='ending'){
   if(!$('launchScene').hidden)$('launchScene').hidden=true;
   typed=Math.min(storyLine.length,typed+dt*22);
   if(!storyRewardShowing){
    $('storyText').textContent=storyLine.slice(0,Math.floor(typed));
    $('storyHint').textContent=typed>=storyLine.length?endingStoryHint():'클릭 · 대사 바로 보기';
   }
  }else if(state==='popup'&&journeyResult===null){
   sceneElapsed+=dt;
   if(sceneElapsed>=1.6){$('launchWord').textContent='GAME START!';$('launchScene').classList.add('starting');}
   if(sceneElapsed>=2.5){
    $('launchScene').hidden=true;
    $('launchScene').classList.remove('starting');
    state='playing';
    last=now;acc=0;keys.clear();
    if(typeof syncRenderCoords==='function')syncRenderCoords();
    canvas.focus();
    playTrack(0,true);
    musicStage=0;
    if(typeof playDuduVoice==='function'){
     if(playDuduVoice('depart'))duduVoiceState.departedInRun=true;
    }
   }
  }else if(state==='playing'&&eventMode){
   eventElapsed=Math.min(LIMIT,eventElapsed+dt);
   if(eventElapsed>=LIMIT){
    finishEvent(false);
   }else{
    const stage=Math.floor(eventElapsed/500);
    if(stage!==musicStage){musicStage=stage;playTrack(stage,true);}
   }
  }else if(state==='night'){
   sceneElapsed+=dt;
   if(sceneElapsed>=1.5){
    $('toast').style.opacity=0;
    showStory('late');
   }
  }
 }
 musicTick(Math.min(dt,.1));
 $('eventClock').textContent=eventMode?clockText(LIMIT-eventElapsed):(state==='ready'||state==='loading'?'25:00':'연습');
 $('eventClock').classList.toggle('urgent',eventMode&&eventElapsed>=1350);
}
window.addEventListener('blur',()=>{if(['opening','popup','night','ending','regionTransition'].includes(state)){scenePaused=true;$('storyHint').textContent='클릭 · 계속 보기';}tracks.forEach(a=>a.pause());if($('storyVideo'))$('storyVideo').pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['opening','popup','night','ending','regionTransition'].includes(state)){scenePaused=true;tracks.forEach(a=>a.pause());if($('storyVideo'))$('storyVideo').pause();}});
$('launchScene').onclick=()=>{scenePaused=false;eventLast=performance.now();};
window.addEventListener('focus',()=>{if(state==='night'||state==='regionTransition'){scenePaused=false;eventLast=performance.now();}});
function mixColor(a,b,t){const c=a.map((v,i)=>Math.round(v+(b[i]-v)*t));return `rgb(${c.join(',')})`;}
const timeStops=[
 {t:0,c:[180,220,255],opacity:.02},{t:300,c:[255,244,210],opacity:.025},
 {t:700,c:[255,219,166],opacity:.12},{t:1100,c:[237,164,108],opacity:.23},
 {t:1350,c:[151,99,155],opacity:.36},{t:1500,c:[20,35,80],opacity:.67}
];
function dayPhase(){const t=eventMode?eventElapsed:0;let i=0;while(i<timeStops.length-2&&t>timeStops[i+1].t)i++;const a=timeStops[i],b=timeStops[i+1],u=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));return {tint:mixColor(a.c,b.c,u),opacity:a.opacity+(b.opacity-a.opacity)*u,night:Math.max(0,(t-1100)/400)};}
load();requestAnimationFrame(frame);
