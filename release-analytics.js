/* 선택적 익명 이벤트 집계 (별도 동의·PostHog 공개 프로젝트 토큰 모두 있을 때만 활성화) */
(function(){
  'use strict';
  const cfg=window.DUDU_RELEASE||{};
  const enabled=cfg.analyticsEnabled===true && !!cfg.posthogProjectToken;
  if(!enabled)return;
  const consentKey='dudu_analytics_consent_v1';
  let optedIn=false;
  try{optedIn=localStorage.getItem(consentKey)==='yes';}catch{}
  // 기본 거부. 배포자는 개인정보 안내 및 동의 UI를 먼저 준비한 뒤 동의값을 설정해야 한다.
  if(!optedIn)return;
  const sessionId=(()=>{
    try{let id=sessionStorage.getItem('dudu_analytics_session');if(!id){id='s_'+crypto.randomUUID();sessionStorage.setItem('dudu_analytics_session',id)}return id;}catch{return 's_'+Math.random().toString(36).slice(2)}
  })();
  const runId=()=> 'r_'+Math.random().toString(36).slice(2)+'_'+Date.now();
  let activeRun=runId(),wasPlaying=false,lastStage='',lastMode='',startStageAt=0,lastCrayons=0,lastEnd='';
  function capture(event,properties={}){
    if(!event||!optedIn)return;
    const host=String(cfg.posthogHost||'https://us.i.posthog.com').replace(/\/$/,'');
    const payload={api_key:cfg.posthogProjectToken,event,distinct_id:sessionId,properties:{$lib:'dudu_release',game_version:cfg.version,run_id:activeRun,...properties},timestamp:new Date().toISOString()};
    try{fetch(host+'/capture/',{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});}catch{}
  }
  function tick(){
    try{
      const mode=typeof gameMode==='string'?gameMode:'story';
      const playing=typeof state==='string'&&state==='playing';
      const stage=mode==='challenge' ? 'challenge_'+(challengeStageIndex+1) : (levels[levelIndex]?.id||'unknown');
      if(playing&&(!wasPlaying || mode!==lastMode)){
        activeRun=runId();capture('game_started',{mode,stage});startStageAt=performance.now();lastCrayons=0;
      }
      if(playing&&(lastStage!==stage||lastMode!==mode)){
        if(lastStage&&lastMode===mode&&startStageAt)capture('stage_completed',{mode,stage:lastStage,elapsed_sec:Math.round((performance.now()-startStageAt)/1000)});
        capture('stage_entered',{mode,stage});startStageAt=performance.now();
      }
      if(mode==='story'&&playing&&typeof securedSpecialEvent!=='undefined'){
        const count=securedSpecialEvent.size;
        if(count>lastCrayons)capture('special_items_secured',{count,total:9});
        lastCrayons=count;
      }
      if(mode==='story'&&typeof journeyResult==='string'&&journeyResult&&journeyResult!==lastEnd){
        capture('game_ended',{mode,ending:journeyResult,elapsed_sec:Math.round(Number(eventElapsed)||0),special_count:typeof securedSpecialEvent!=='undefined'?securedSpecialEvent.size:0});
        lastEnd=journeyResult;
      }
      if(mode==='challenge'&&typeof challengeState==='object'&&challengeState&&typeof challengeState.records==='object'&&challengeState.records.clears && state!=='playing'){
        // completed event intentionally not inferred here: completion handler changes state more than once.
      }
      wasPlaying=playing;lastMode=mode;lastStage=stage;
    }catch{}
  }
  setInterval(tick,500);
})();
