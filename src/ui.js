import {evaluateHand,roleCardIndices} from './hand-evaluator.js';
import {GameState} from './game-state.js';
import {PAY_TABLE} from './pay-table.js';
import {Sound} from './sound.js';
import {PlaySession} from './session.js';
import {saveGame,restoreGame} from './storage.js';
const game=new GameState(),sound=new Sound(),$=id=>document.getElementById(id);
const suitPaths={S:'M50 3 C38 20 7 38 7 59 C7 82 34 89 46 72 C44 84 39 92 29 97 H71 C61 92 56 84 54 72 C66 89 93 82 93 59 C93 38 62 20 50 3Z',H:'M50 95 C39 81 5 56 5 30 C5 2 39 0 50 24 C61 0 95 2 95 30 C95 56 61 81 50 95Z',D:'M50 2 L94 50 L50 98 L6 50Z',C:'M45 66 C32 88 4 78 4 57 C4 38 23 28 37 39 C18 17 33 2 50 2 C67 2 82 17 63 39 C77 28 96 38 96 57 C96 78 68 88 55 66 C54 83 61 93 72 98 H28 C39 93 46 83 45 66Z'};
const symbols=Object.fromEntries(Object.entries(suitPaths).map(([s,path])=>[s,`<svg class="suit-mark" viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`]));
const suitNames={S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'},ranks={11:'J',12:'Q',13:'K',14:'A'};
let roleIndices=[],currentRole='';
let storage;
try{storage=globalThis.localStorage;}catch{}
let guideEnabled=true;try{guideEnabled=storage.getItem('amber-poker.guide')!=='off';}catch{}
const session=new PlaySession(storage);
let lockPending=!!globalThis.navigator?.locks,primaryUntil=0;
let restored=restoreGame(game,storage);
let recoveryBlocked=restored.status==='invalid'&&!restored.backedUp;
if(restored.status==='restored')sound.enabled=restored.soundEnabled;
function allowed(){return !lockPending&&!recoveryBlocked&&session.check();}
function persist(){
  if(!allowed()){$('save-status').textContent=!guideEnabled?(lockPending?'PREPARING':recoveryBlocked?'SAVE ERROR · DATA PROTECTED':'PLAY PAUSED · RELOAD'):lockPending?'プレイを準備中':recoveryBlocked?'保存を復元できません。元データを保護しています':'別タブでプレイ中、または保存が更新されました';return;}
  const saved=saveGame(game,sound.enabled,storage);if(saved)session.saved();
  $('save-status').textContent=!guideEnabled?(restored.status==='invalid'?'SAVE RECOVERED':saved?'AUTOSAVE ON':'AUTOSAVE UNAVAILABLE'):restored.status==='invalid'?'保存を復元できませんでした。元データを退避し、初期状態で再開しました':saved?'自動保存 ON · リロード後も続きから再開':'保存できません · この画面でプレイを続けられます';
}
function refreshAccess(){const active=allowed();$('play-area').inert=!active;$('session-warning').hidden=active;$('session-text').textContent=!guideEnabled?(recoveryBlocked?'SAVE ERROR · DATA PROTECTED':lockPending?'PREPARING':'PLAY PAUSED · CLOSE OTHER TAB AND RELOAD'):recoveryBlocked?'保存を復元できません。元データを保護したため操作を停止しています。':lockPending?'プレイを準備しています。':'別タブでプレイ中、または保存が更新されました。プレイ中のタブを閉じて、最新状態を読み込んでください。';}
function holdCard(index){if(!allowed()){refreshAccess();return;}game.toggleHold(index);sound.play('hold');persist();
  const button=$('cards').querySelector?.(`[data-index="${index}"]`);
  if(!button){render();return;}
  button.classList.toggle('held',game.held[index]);button.setAttribute('aria-pressed',String(game.held[index]));
  button.parentElement.querySelector('.hold-label').textContent=game.held[index]?'HOLD':'HOLD / RELEASE';
}

const pipLayouts={
  2:[[50,12],[50,88]],
  3:[[50,12],[50,50],[50,88]],
  4:[[22,12],[78,12],[22,88],[78,88]],
  5:[[22,12],[78,12],[50,50],[22,88],[78,88]],
  6:[[22,12],[78,12],[22,50],[78,50],[22,88],[78,88]],
  7:[[22,12],[78,12],[50,31],[22,50],[78,50],[22,88],[78,88]],
  8:[[22,12],[78,12],[50,31],[22,50],[78,50],[50,69],[22,88],[78,88]],
  9:[[22,12],[78,12],[22,37],[78,37],[50,50],[22,63],[78,63],[22,88],[78,88]],
  10:[[22,8],[78,8],[22,29],[78,29],[22,50],[78,50],[22,71],[78,71],[22,92],[78,92]]
};
function cardCenter(c){
  if(c.rank===14)return `<span class="suit ace" aria-hidden="true">${symbols[c.suit]}</span>`;
  if(c.rank>=11){
    const gold='#b28b45',ink='#43352b',paper='#eedbc0';
    const portraits={
      11:`<path d="M22 122 L28 84 L46 73 L68 81 L82 122Z" fill="currentColor"/><path d="M44 31 Q72 27 71 48 L82 57 L69 61 L65 78 L45 78 L36 61Z" fill="${paper}" stroke="${ink}" stroke-width="2"/><path d="M34 38 Q30 13 68 20 L75 36Z" fill="currentColor" stroke="${ink}" stroke-width="2"/><path d="M67 21 Q86 4 79 3 Q92 2 85 17" fill="${gold}"/><path d="M65 46 H70 M61 68 L69 68" stroke="${ink}" stroke-width="2"/><path d="M32 91 L49 108 L68 85 M48 108 L46 122" fill="none" stroke="${gold}" stroke-width="5"/>`,
      12:`<path d="M22 52 Q16 17 50 17 Q84 17 78 52 L83 96 L62 84 H38 L17 96Z" fill="${ink}"/><path d="M12 125 L24 90 L39 80 H61 L76 90 L88 125Z" fill="currentColor"/><path d="M33 36 Q50 25 67 36 V58 Q67 77 50 80 Q33 77 33 58Z" fill="${paper}"/><path d="M26 34 L29 15 L41 25 L50 9 L59 25 L71 15 L74 34Z" fill="${gold}" stroke="${ink}" stroke-width="2"/><path d="M39 49 H44 M56 49 H61 M43 67 Q50 72 57 67" fill="none" stroke="${ink}" stroke-width="2"/><path d="M37 86 Q50 103 63 86" fill="none" stroke="${gold}" stroke-width="4"/><circle cx="50" cy="101" r="4" fill="${gold}"/>`,
      13:`<path d="M9 125 L17 86 L38 77 H62 L83 86 L91 125Z" fill="currentColor"/><path d="M28 35 Q50 25 72 35 V64 Q70 87 50 94 Q30 87 28 64Z" fill="${ink}"/><path d="M32 34 H68 V59 Q68 74 50 80 Q32 74 32 59Z" fill="${paper}"/><path d="M24 34 L19 9 L36 20 L50 3 L64 20 L81 9 L76 34Z" fill="${gold}" stroke="${ink}" stroke-width="2"/><path d="M38 47 H44 M56 47 H62" stroke="${ink}" stroke-width="3"/><path d="M32 61 Q42 54 50 64 Q58 54 68 61 L64 77 L50 92 L36 77Z" fill="${ink}"/><path d="M19 91 L38 106 L50 97 L62 106 L81 91 M50 99 V124" fill="none" stroke="${gold}" stroke-width="5"/>`
    };
    return `<span class="face-center illustrated" aria-hidden="true"><svg class="court-art" viewBox="0 0 100 125"><path d="M6 5 H94 V120 H6Z" fill="none" stroke="${gold}" stroke-width="1"/>${portraits[c.rank]}</svg></span>`;
  }
  return `<span class="pips pips-${c.rank}" aria-hidden="true">${pipLayouts[c.rank].map(([x,y])=>`<span class="pip${y>50?' inverted':''}" style="left:${x}%;top:${y}%">${symbols[c.suit]}</span>`).join('')}</span>`;
}
$('payrows').innerHTML=PAY_TABLE.filter(p=>p.multiplier).map(p=>`<div class="payrow" data-hand="${p.id}"><span>${p.name}</span><span>${p.multiplier}</span><span>${p.id==='naturalRoyal'?'—':p.multiplier*2}</span></div>`).join('');
function cardHtml(c,i,interactive) {
  const held=interactive&&game.held[i];
  const face=!c?'<span>♠</span>':c.joker?'<div class="joker-center"><b>★</b>JOKER<br><small>WILD CARD</small></div>':`<span class="corner">${ranks[c.rank]||c.rank}<br>${symbols[c.suit]}</span>${cardCenter(c)}<span class="corner bottom">${ranks[c.rank]||c.rank}<br>${symbols[c.suit]}</span>`;
  const inRole=c&&roleIndices.includes(i);
  const label=!c?'Face-down card':c.joker?'JOKER':`${ranks[c.rank]||c.rank} ${suitNames[c.suit]}`;
  return `<div class="card-slot"><button class="card ${!c?'back':''} ${c&&['H','D'].includes(c.suit)?'red':''} ${held?'held':''} ${inRole?'in-role':''}" data-index="${i}" ${interactive?'':'disabled'} aria-label="${label}${inRole?' · '+currentRole+'のカード':''}${interactive?' Toggle HOLD':''}" aria-pressed="${held}">${face}</button><span class="hold-label">${held?'HOLD':interactive?'HOLD / RELEASE':' '}</span></div>`;
}
function render(){
  persist();refreshAccess();
  const editable=['ready','lost'].includes(game.phase),holding=game.phase==='hold';
  ['credit','bet','win'].forEach(id=>$(id).textContent=game[id].toLocaleString());
  const collected=game.phase==='ready'&&(game.doubleResult?.outcome==='draw'?game.doubleResult.win:game.collectedWin)||0;
  $('win-label').textContent=collected?'PAID':'WIN';
  if(collected)$('win').textContent=collected.toLocaleString();
  const showingDouble=game.doubleResult&&(['double','won','lost'].includes(game.phase)||game.doubleResult.outcome==='draw');
  roleIndices=[];currentRole='';

  $('cards').innerHTML=Array.from({length:5},(_,i)=>{
    const c=showingDouble?(i===1?game.doubleResult.referenceCard:i===3?game.doubleResult.card:null):game.hand[i];
    const html=cardHtml(c,i,holding);
    return showingDouble?html.replace('<span class="hold-label"> </span>',`<span class="hold-label">${i===1?'BASE':i===3?'NEXT':' '}</span>`):html;
  }).join('');
  $('deal').innerHTML=game.phase==='won'?'DOUBLE':holding?'DRAW':'DEAL';
  $('deal').disabled=!(holding||game.canDouble||(editable&&game.bet>0&&game.bet<=Math.floor((Number.MAX_SAFE_INTEGER-game.credit)/500)));
  const allIn=game.allIn;
  $('max').textContent=allIn?'RELEASE':'MAX';
  for(const id of ['min','minus','minus-ten','plus','plus-ten','max']){
    $(id).hidden=!editable;
    $(id).disabled=!editable||(allIn&&id!=='max')||(id==='max'?game.credit+game.bet===0:id==='min'?game.credit+game.bet===0||game.bet===1:id.startsWith('minus')?game.bet<=0:game.credit===0);
  }
  $('bet-lock').hidden=editable;$('max').setAttribute('aria-pressed',String(allIn));
  $('collect').disabled=game.phase!=='won';$('double-panel').hidden=game.phase!=='double';$('normal-controls').hidden=game.phase==='double';
  $('reset').hidden=!(game.credit===0&&game.bet===0&&editable);
  document.querySelectorAll('.payrow').forEach(el=>el.classList.toggle('active',game.result?.id===el.dataset.hand && game.result.multiplier>0));
  let title='BETを選んでください',detail='',next='DEALをタップ';
  if(holding){title='残すカードを選んでください';detail='カードをタップしてHOLD／解除';next='DRAWをタップして交換（1回のみ）';}
  if(game.phase==='won'){title=`未獲得WIN：${game.win.toLocaleString()}`;detail=`${game.result?.name||''}${game.result?.jokerUsed?' · JOKER ×2':''}`;next=game.canDouble?'DOUBLEでWIN全額を賭けて2倍に挑戦 ／ COLLECTで獲得':'上限に達しました。COLLECTで獲得してください';}
  if(game.phase==='lost'){title='獲得なし';next='BETを選び、DEALをタップ';}
  if(game.phase==='double'){title='HIGH / LOWを選んでください';detail='高いと思ったらHIGH、低いと思ったらLOWをタップ';next='同じ数字は引き分け・WINを自動回収';}
  const r=game.doubleResult;
  if(r?.card&&['ready','won','lost'].includes(game.phase)){
    detail=`${r.choice.toUpperCase()}を選択：基準${ranks[r.referenceCard.rank]||r.referenceCard.rank} → 次${ranks[r.card.rank]||r.card.rank}`;
    if(r.outcome==='win')title=`ダブル成功 — 未獲得WIN：${game.win.toLocaleString()}`;
    if(r.outcome==='lose')title='ダブル失敗 — 獲得なし';
    if(r.outcome==='draw'){title=`引き分け — ${r.win.toLocaleString()}を獲得しました`;next='BETを選び、DEALをタップ';}
  }else if(game.phase==='ready'&&game.collectedWin){title=`${game.collectedWin.toLocaleString()}を獲得しました`;next='BETを選び、DEALをタップ';}
  if(editable&&game.bet>Math.floor((Number.MAX_SAFE_INTEGER-game.credit)/500))next='表示できる金額の上限に達しました';
  if(editable&&game.credit+game.bet===0)next='NEW CREDITで再開できます';
    const keyHints={deal:'D / 6',collect:'A / 4',high:'W / 8',low:'S / 2',plus:'W / 8 / +',minus:'S / 2 / −',max:'＊',sound:'／',reset:'．'};
  for(const [id,keys] of Object.entries(keyHints)){
    const button=$(id);
    button.setAttribute('data-key-hint',guideEnabled?keys:'');
  }
  $('guide').textContent=guideEnabled?'GUIDE ON':'GUIDE OFF';$('guide').setAttribute('aria-pressed',String(guideEnabled));
  if(editable&&game.bet===0&&game.credit>0)next='BETを増やすか、MAXをタップしてください';
  let status=holding?'HOLD':game.phase==='won'?`WIN ${game.win.toLocaleString()}`:game.phase==='lost'?'NO WIN':game.phase==='double'?'HIGH / LOW':allIn?'ALL IN':'BET';
  if(r?.card&&['ready','won','lost'].includes(game.phase)){
    if(r.outcome==='win')status=`DOUBLE WIN ${game.win.toLocaleString()}`;
    if(r.outcome==='lose')status='NO WIN';
    if(r.outcome==='draw')status=`TIE · PAID ${r.win.toLocaleString()}`;
  }else if(collected)status=`PAID ${collected.toLocaleString()}`;
  if(editable&&game.credit+game.bet===0)status='NO CREDIT';
  if(editable&&game.bet>Math.floor((Number.MAX_SAFE_INTEGER-game.credit)/500))status='BET LIMIT';
  if(guideEnabled){detail=[title,detail].filter(Boolean).join(' · ');}
  else {detail='';next='';}
  title=status;
  $('controls-help').hidden=!guideEnabled;
  $('hint').hidden=!guideEnabled;
  const escape=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  $('message').innerHTML=`<strong>${escape(title)}</strong><span>${escape(detail)}</span><small>${escape(next)}</small>`;
}
function celebrate(doubled=false){
  const stage=$('cards');
  stage.classList?.remove('win-burst','double-burst');
  void stage.offsetWidth;
  stage.classList?.add(doubled?'double-burst':'win-burst');
}
function act(fn,tone){if(!allowed()){refreshAccess();return;}const result=fn();if(result!==false&&tone)sound.play(tone);render();}
$('minus').onclick=()=>act(()=>game.setBet(game.bet-1),'bet');$('plus').onclick=()=>act(()=>game.setBet(game.bet+1),'bet');$('max').onclick=()=>act(()=>game.setBet(game.allIn?0:game.credit+game.bet),'bet');
$('deal').onclick=()=>{if(!allowed()){refreshAccess();return;}if(Date.now()<primaryUntil)return;if(game.phase==='won'){act(()=>game.startDouble(),'deal');}else if(game.phase==='hold'){primaryUntil=Date.now()+100;act(()=>game.draw(),'draw');if(game.win){sound.play('win');celebrate();}}else act(()=>game.deal(),'deal');};
$('min').onclick=()=>act(()=>game.setBet(1),'bet');
$('minus-ten').onclick=()=>act(()=>game.setBet(game.bet-10),'bet');$('plus-ten').onclick=()=>act(()=>game.setBet(game.bet+10),'bet');
$('cards').onclick=e=>{const b=e.target.closest('[data-index]');if(b&&game.phase==='hold')holdCard(Number(b.dataset.index));};
$('collect').onclick=()=>act(()=>game.collect(),'win');
for(const choice of ['low','high'])$(choice).onclick=()=>{if(!allowed()){refreshAccess();return;}const r=game.guess(choice);if(!r)return;sound.play(r.outcome==='win'?'doubleWin':r.outcome==='draw'?'collect':'doubleLose');render();if(r.outcome==='win')celebrate(true);};
$('sound').onclick=()=>{if(!allowed()){refreshAccess();return;}sound.enabled=!sound.enabled;$('sound').textContent=`SOUND ${sound.enabled?'ON':'OFF'}`;$('sound').setAttribute('aria-pressed',String(sound.enabled));persist();};
$('reset').onclick=()=>act(()=>game.reset(),'collect');
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  if(['Space','Enter','NumpadEnter'].includes(e.code)||[' ','Enter'].includes(e.key)){if(e.target.closest('#deal'))e.preventDefault();return;}
  const index=/^[1-5]$/.test(e.key)?Number(e.key)-1:/^(Digit|Numpad)[1-5]$/.test(e.code||'')?Number(e.code.slice(-1))-1:null;
  let action={d:'double',a:'collect',w:'high',s:'low',c:'collect',h:'high',l:'low','6':'double','4':'collect','8':'high','2':'low','+':'plus','=':'plus','-':'minus','*':'max','/':'sound','.':'reset'}[(e.key||'').toLowerCase()]||{KeyD:'double',KeyA:'collect',KeyW:'high',KeyS:'low',KeyC:'collect',KeyH:'high',KeyL:'low',Numpad6:'double',Numpad4:'collect',Numpad8:'high',Numpad2:'low',NumpadAdd:'plus',NumpadSubtract:'minus',NumpadMultiply:'max',NumpadDivide:'sound',NumpadDecimal:'reset'}[e.code];
  const primary=['KeyD','Numpad6','Digit6'].includes(e.code)||['d','6'].includes((e.key||'').toLowerCase());
  if(primary)action='deal';
  if(['ready','lost'].includes(game.phase)){
    if((e.key||'').toLowerCase()==='w'||['KeyW','Numpad8','Digit8'].includes(e.code)||e.key==='8')action='plus';
    if((e.key||'').toLowerCase()==='s'||['KeyS','Numpad2','Digit2'].includes(e.code)||e.key==='2')action='minus';
  }
  if(index===null&&!action)return;
  // Main keys override native button activation and never skip HIGH/LOW.
  e.preventDefault();
  if(e.repeat||!allowed())return;
  if(game.phase==='hold'&&index!==null)holdCard(index);
  else if(action){
    const enabled=(action==='high'||action==='low')?game.phase==='double':action==='reset'?!$('reset').hidden:!$(action).disabled;
    if(enabled)$(action).click();
  }
  else if(game.phase==='hold')holdCard(index);
});
$('sound').textContent=`SOUND ${sound.enabled?'ON':'OFF'}`;
$('sound').setAttribute('aria-pressed',String(sound.enabled));
render();



$('reload-state').onclick=()=>globalThis.location.reload();
globalThis.addEventListener?.('storage',e=>{if(e.key==='amber-poker.state.v1'){session.check();refreshAccess();}});
if(globalThis.navigator?.locks){
  navigator.locks.request('amber-poker.play',{ifAvailable:true},async lock=>{
    lockPending=false;
    if(!lock){session.blocked=true;render();return;}
    // Reconcile updates made while the lock request was pending.
    const latest=restoreGame(game,storage);restored=latest;recoveryBlocked=latest.status==='invalid'&&!latest.backedUp;if(latest.status==='restored')sound.enabled=latest.soundEnabled;
    session.saved();$('sound').textContent=`SOUND ${sound.enabled?'ON':'OFF'}`;$('sound').setAttribute('aria-pressed',String(sound.enabled));render();
    await new Promise(resolve=>globalThis.addEventListener('pagehide',resolve,{once:true}));
  }).catch(()=>{lockPending=false;render();});
}

globalThis.addEventListener?.('pageshow',e=>{if(e.persisted)globalThis.location.reload();});

const compactViewport=globalThis.matchMedia?.('(max-width: 760px)');
if(compactViewport){
  const adaptPaytable=()=>{$('paytable-details').open=!compactViewport.matches;};
  adaptPaytable();compactViewport.addEventListener('change',adaptPaytable);
}

$('guide').onclick=()=>{guideEnabled=!guideEnabled;try{storage.setItem('amber-poker.guide',guideEnabled?'on':'off');}catch{}render();};

$('restart-game').onclick=()=>{
  if(!allowed()){refreshAccess();return;}
  if(!globalThis.confirm('CREDITを1,000に戻して最初からやり直しますか？現在の手札と未獲得WINは失われます。'))return;
  Object.assign(game,new GameState());game.deck=null;game.collectedWin=0;
  sound.enabled=true;guideEnabled=true;primaryUntil=0;
  try{storage.setItem('amber-poker.guide','on');}catch{}
  $('sound').textContent='SOUND ON';$('sound').setAttribute('aria-pressed','true');
  $('cards').classList?.remove('win-burst','double-burst');
  render();
};
