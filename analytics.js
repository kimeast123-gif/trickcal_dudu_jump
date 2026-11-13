/* TEST12_RELEASE - privacy-first manual event telemetry.
   No analytics SDK, cookies, or automatic page capture. No network requests
   unless a public PostHog project token is configured AND a player opts in.
   Browser-generated per-consent anonymous ID is stored locally; no names or emails.
*/
'use strict';
const DuduAnalytics = (() => {
  const conf = window.DUDU_RELEASE || window.DUDU_RELEASE_CONFIG || {};
  if (conf.analyticsEnabled !== true) return Object.freeze({prepareRun(){},runStart(){},stageComplete(){},stageEnter(){},fall(){},retry(){},hit(){},special(){},end(){}});
  const token = String(conf.posthogProjectToken || '').trim();
  const host = String(conf.posthogHost || 'https://us.i.posthog.com').replace(/\/+$/, '');
  const active = token.startsWith('phc_') && /^https:\/\/(us|eu)\.i\.posthog\.com$/.test(host);
  const kConsent = 'dudu_analytics_consent_v1';
  const kId = 'dudu_analytics_anonymous_id_v1';
  const getStore = (key) => {try{return localStorage.getItem(key)}catch(_){return null}};
  const setStore = (key,value) => {try{localStorage.setItem(key,value)}catch(_){}};
  const removeStore = key => {try{localStorage.removeItem(key)}catch(_){}};
  const genId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('r'+Math.random().toString(36).slice(2)+Date.now().toString(36));
  let consent = active && getStore(kConsent)==='yes';
  let playerId = consent ? getStore(kId) : null;
  if(consent && !playerId){playerId=genId();setStore(kId,playerId)}
  let run = null;
  let stageStart = null;
  let stageIndex = 0;
  const stages = ['forest','monatium','erpien'];
  const counters = {falls:0,retries:0,hits:0};
  const stageTimes = {};

  function emit(event, props={}){
    if(!active || !consent || !run || !playerId)return;
    // Public PostHog events endpoint: only non-sensitive numeric/game-event properties.
    const payload={api_key:token,event,distinct_id:playerId,
      timestamp:new Date().toISOString(),
      properties:{...props,game_version:conf.version||'TEST12_RELEASE_1',run_id:run,
        $process_person_profile:false,$geoip_disable:true}};
    try{
      fetch(host+'/i/v0/e/',{method:'POST',mode:'cors',keepalive:true,
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
        .catch(()=>{});
    }catch(_){/* telemetry never blocks gameplay */}
  }
  function prepareRun(){run=null;stageStart=null;stageIndex=0;Object.keys(stageTimes).forEach(k=>delete stageTimes[k]);counters.falls=0;counters.retries=0;counters.hits=0;}
  function runStart(){
    run=genId(); stageIndex=0; stageStart=(typeof eventElapsed!=='undefined'?eventElapsed:0);
    emit('game_started',{limit_seconds:1500});
    emit('stage_entered',{stage:stages[0],stage_index:0});
  }
  function stageComplete(index){
    if(!run || !eventMode || index<0 || index>=stages.length)return;
    const now=typeof eventElapsed!=='undefined'?eventElapsed:0;
    const duration=Math.max(0,Math.round(now-(stageStart??now)));
    stageTimes[stages[index]]=(stageTimes[stages[index]]||0)+duration;
    emit('stage_completed',{stage:stages[index],stage_index:index,stage_time_sec:duration,
      elapsed_sec:Math.round(now),special_secured:typeof securedSpecialEvent!=='undefined'?securedSpecialEvent.size:0,
      candy_count:typeof collectedRegularCandyCount==='function'?collectedRegularCandyCount():0,
      falls:counters.falls,retries:counters.retries,hits:counters.hits});
    stageStart=now;
  }
  function stageEnter(index){
    if(!run||!eventMode)return;
    stageIndex=index;
    stageStart=typeof eventElapsed!=='undefined'?eventElapsed:0;
    emit('stage_entered',{stage:stages[index]||'unknown',stage_index:index});
  }
  function fall(index, checkpoint){
    if(!run||!eventMode)return;
    counters.falls++;
    emit('player_fell',{stage:stages[index]||'unknown',checkpoint_index:checkpoint});
  }
  function retry(index,checkpoint){
    if(!run||!eventMode)return;
    counters.retries++;
    emit('checkpoint_retried',{stage:stages[index]||'unknown',checkpoint_index:checkpoint});
  }
  function hit(index){
    if(!run||!eventMode)return;
    counters.hits++;
    // Aggregate hit count only; no high-frequency events.
  }
  function special(id,levelId){
    if(!run||!eventMode)return;
    emit('special_item_secured',{item_id:id,stage:levelId||'monatium',
      special_secured:typeof securedSpecialEvent!=='undefined'?securedSpecialEvent.size:0});
  }
  function end(result){
    if(!run||!eventMode)return;
    const now=typeof eventElapsed!=='undefined'?eventElapsed:0;
    const finalStage=stages[typeof levelIndex!=='undefined'?levelIndex:stageIndex]||'unknown';
    const dt=Math.max(0,Math.round(now-(stageStart??now)));
    if(!stageTimes[finalStage])stageTimes[finalStage]=0;
    stageTimes[finalStage]+=dt;
    emit('game_ended',{ending:result,elapsed_sec:Math.round(now),
      special_secured:typeof securedSpecialEvent!=='undefined'?securedSpecialEvent.size:0,
      candy_collected:typeof collectedRegularCandyCount==='function'?collectedRegularCandyCount():0,
      candy_total:typeof totalRegularCandyCount==='function'?totalRegularCandyCount():0,
      falls:counters.falls,retries:counters.retries,hits:counters.hits,
      forest_time_sec:stageTimes.forest??null,monatium_time_sec:stageTimes.monatium??null,erpien_time_sec:stageTimes.erpien??null});
    run=null;
  }
  function initUI(){
    const link=document.getElementById('feedbackLink');
    if(link){
      const url=String(conf.feedbackUrl||'').trim();
      if(/^https:\/\//.test(url))link.href=url;
      else link.hidden=true;
    }
    const toggle=document.getElementById('privacyToggle');
    const panel=document.getElementById('privacyPanel');
    if(!active||!toggle||!panel)return;
    toggle.hidden=false;
    const updateLabel=()=>toggle.textContent='플레이 통계: '+(consent?'동의함':getStore(kConsent)==='no'?'동의 안 함':'선택하기');
    updateLabel();
    toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;});
    document.getElementById('analyticsAllow')?.addEventListener('click',()=>{
      consent=true;setStore(kConsent,'yes');playerId=getStore(kId)||genId();setStore(kId,playerId);
      updateLabel();panel.hidden=true;
    });
    document.getElementById('analyticsDeny')?.addEventListener('click',()=>{
      consent=false;setStore(kConsent,'no');removeStore(kId);playerId=null;
      updateLabel();panel.hidden=true;
    });
    if(getStore(kConsent)===null)panel.hidden=false;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initUI);
  else initUI();
  return Object.freeze({prepareRun,runStart,stageComplete,stageEnter,fall,retry,hit,special,end});
})();
