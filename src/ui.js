import {evaluateHand,roleCardIndices} from './hand-evaluator.js';
import {GameState} from './game-state.js';
import {PAY_TABLE} from './pay-table.js';
import {Sound} from './sound.js';
import {PlaySession} from './session.js';
import {saveGame,restoreGame} from './storage.js';
const game=new GameState(),sound=new Sound(),$=id=>document.getElementById(id);
const symbols={S:'♠',H:'♥',D:'♦',C:'♣'},ranks={11:'J',12:'Q',13:'K',14:'A'};
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
  if(!allowed()){$('save-status').textContent=lockPending?'プレイを準備中':recoveryBlocked?'保存を復元できません。元データを保護しています':'別タブでプレイ中、または保存が更新されました';return;}
  const saved=saveGame(game,sound.enabled,storage);if(saved)session.saved();
  $('save-status').textContent=restored.status==='invalid'?'保存を復元できませんでした。元データを退避し、初期状態で再開しました':saved?'自動保存 ON · リロード後も続きから再開':'保存できません · この画面でプレイを続けられます';
}
function refreshAccess(){const active=allowed();$('play-area').inert=!active;$('session-warning').hidden=active;$('session-text').textContent=recoveryBlocked?'保存を復元できません。元データを保護したため操作を停止しています。':lockPending?'プレイを準備しています。':'別タブでプレイ中、または保存が更新されました。プレイ中のタブを閉じて、最新状態を読み込んでください。';}
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
  10:[[22,12],[78,12],[50,25],[22,37],[78,37],[22,63],[78,63],[50,75],[22,88],[78,88]]
};
function cardCenter(c){
  if(c.rank===14)return `<span class="suit ace" aria-hidden="true">${symbols[c.suit]}</span>`;
  if(c.rank>=11)return `<span class="face-center" aria-hidden="true"><b>${ranks[c.rank]}</b><span>${symbols[c.suit]}</span></span>`;
  return `<span class="pips" aria-hidden="true">${pipLayouts[c.rank].map(([x,y])=>`<span class="pip${y>50?' inverted':''}" style="left:${x}%;top:${y}%">${symbols[c.suit]}</span>`).join('')}</span>`;
}
$('payrows').innerHTML=PAY_TABLE.filter(p=>p.multiplier).map(p=>`<div class="payrow" data-hand="${p.id}"><span>${p.name}</span><span>${p.multiplier}</span><span>${p.id==='naturalRoyal'?'—':p.multiplier*2}</span></div>`).join('');
function cardHtml(c,i,interactive) {
  const held=interactive&&game.held[i];
  const face=!c?'<span>♠</span>':c.joker?'<div class="joker-center"><b>★</b>JOKER<br><small>WILD CARD</small></div>':`<span class="corner">${ranks[c.rank]||c.rank}<br>${symbols[c.suit]}</span>${cardCenter(c)}<span class="corner bottom">${ranks[c.rank]||c.rank}<br>${symbols[c.suit]}</span>`;
  const inRole=c&&roleIndices.includes(i);
  const label=!c?'伏せたカード':c.joker?'JOKER':`${ranks[c.rank]||c.rank} ${symbols[c.suit]}`;
  return `<div class="card-slot"><button class="card ${!c?'back':''} ${c&&['H','D'].includes(c.suit)?'red':''} ${held?'held':''} ${inRole?'in-role':''}" data-index="${i}" ${interactive?'':'disabled'} aria-label="${label}${inRole?' · '+currentRole+'のカード':''}${interactive?' HOLD切替':''}" aria-pressed="${held}">${face}</button><span class="hold-label">${held?'HOLD':interactive?'HOLD / RELEASE':' '}</span></div>`;
}
function render(){
  persist();refreshAccess();
  const editable=['ready','lost'].includes(game.phase),holding=game.phase==='hold';
  ['credit','bet','win'].forEach(id=>$(id).textContent=game[id].toLocaleString());
  const collected=game.phase==='ready'&&(game.doubleResult?.outcome==='draw'?game.doubleResult.win:game.collectedWin)||0;
  $('win-label').textContent=collected?'獲得額':'WIN';
  if(collected)$('win').textContent=collected.toLocaleString();
  const showingDouble=game.doubleResult&&(['double','won','lost'].includes(game.phase)||game.doubleResult.outcome==='draw');
  roleIndices=[];currentRole='';
  if(!showingDouble&&game.hand.length===5){const evaluated=evaluateHand(game.hand);roleIndices=roleCardIndices(game.hand,evaluated);currentRole=evaluated.name;}
  $('cards').innerHTML=Array.from({length:5},(_,i)=>{
    const c=showingDouble?(i===1?game.doubleResult.referenceCard:i===3?game.doubleResult.card:null):game.hand[i];
    const html=cardHtml(c,i,holding);
    return showingDouble?html.replace('<span class="hold-label"> </span>',`<span class="hold-label">${i===1?'基準カード':i===3?'次のカード':' '}</span>`):html;
  }).join('');
  $('deal').innerHTML=game.phase==='won'?'DOUBLE':holding?'DRAW':'DEAL';
  $('deal').disabled=!(holding||game.canDouble||(editable&&game.credit>=game.bet));
  $('minus').disabled=!editable||game.bet===1;$('plus').disabled=!editable||game.bet===40;$('max').disabled=!editable||game.bet===40;
  $('collect').disabled=game.phase!=='won';$('double-panel').hidden=game.phase!=='double';$('normal-controls').hidden=game.phase==='double';
  $('reset').hidden=!(game.credit===0&&editable);
  document.querySelectorAll('.payrow').forEach(el=>el.classList.toggle('active',game.result?.id===el.dataset.hand && game.result.multiplier>0));
  let title='BETを選んでください',detail='',next='主操作キーでDEAL';
  if(holding){title='残すカードを選んでください';detail='カードをタップ、または1〜5でHOLD / RELEASE';next='主操作キーでDRAW（交換は1回）';}
  if(game.phase==='won'){title=`未獲得WIN：${game.win.toLocaleString()}`;detail=`${game.result?.name||''}${game.result?.jokerUsed?' · JOKER ×2':''}`;next=game.canDouble?'DOUBLEでWIN全額を賭けて2倍に挑戦 ／ COLLECTで獲得':'上限に達しました。COLLECTで獲得してください';}
  if(game.phase==='lost'){title='獲得なし';next='BETを選び、主操作キーで次のDEAL';}
  if(game.phase==='double'){title='HIGH / LOWを選んでください';detail='基準より高い：W / 8　低い：S / 2';next='同じ数字は引き分け・WINを自動回収';}
  const r=game.doubleResult;
  if(r?.card&&['ready','won','lost'].includes(game.phase)){
    detail=`${r.choice.toUpperCase()}を選択：基準${ranks[r.referenceCard.rank]||r.referenceCard.rank} → 次${ranks[r.card.rank]||r.card.rank}`;
    if(r.outcome==='win')title=`ダブル成功 — 未獲得WIN：${game.win.toLocaleString()}`;
    if(r.outcome==='lose')title='ダブル失敗 — 獲得なし';
    if(r.outcome==='draw'){title=`引き分け — ${r.win.toLocaleString()}を獲得しました`;next='BETを選び、主操作キーで次のDEAL';}
  }else if(game.phase==='ready'&&game.collectedWin){title=`${game.collectedWin.toLocaleString()}を獲得しました`;next='BETを選び、主操作キーで次のDEAL';}
  if(editable&&game.credit<game.bet){next=game.credit===0?'NEW CREDITで再開できます':'CREDIT不足：BETを減らしてください';}
  if(!guideEnabled){
    if(game.phase==='hold')title='HOLDするカードを選択';
    if(game.phase==='ready'&&!game.collectedWin&&!game.doubleResult)title='BET';
    if(game.phase==='won')title=`WIN ${game.win.toLocaleString()}`;
    if(game.phase==='double')title='HIGH / LOW';
    detail='';next=editable&&game.credit<game.bet?(game.credit===0?'NEW CREDITで再開':'BETを減らしてください'):game.phase==='won'&&!game.canDouble?'COLLECTしてください':'';
  }
    const keyHints={deal:'D / 6',collect:'A / 4',high:'W / 8',low:'S / 2',plus:'W / 8 / +',minus:'S / 2 / −',max:'＊',sound:'／',reset:'．'};
  for(const [id,keys] of Object.entries(keyHints)){
    const button=$(id);
    button.setAttribute('data-key-hint',guideEnabled?keys:'');
  }
  $('guide').textContent=guideEnabled?'ガイド ON':'ガイド OFF';$('guide').setAttribute('aria-pressed',String(guideEnabled));
  const escape=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  $('message').innerHTML=`<strong>${escape(title)}</strong><span>${escape(detail)}</span><small>${escape(next)}</small>`;
}
function act(fn,tone){if(!allowed()){refreshAccess();return;}const result=fn();if(result!==false&&tone)sound.play(tone);render();}
$('minus').onclick=()=>act(()=>game.setBet(game.bet-1),'bet');$('plus').onclick=()=>act(()=>game.setBet(game.bet+1),'bet');$('max').onclick=()=>act(()=>game.setBet(40),'bet');
$('deal').onclick=()=>{if(!allowed()){refreshAccess();return;}if(Date.now()<primaryUntil)return;if(game.phase==='won'){act(()=>game.startDouble(),'deal');}else if(game.phase==='hold'){primaryUntil=Date.now()+(guideEnabled?650:400);act(()=>game.draw(),'draw');if(game.win)sound.play('win');}else act(()=>game.deal(),'deal');};
$('cards').onclick=e=>{const b=e.target.closest('[data-index]');if(b&&game.phase==='hold')holdCard(Number(b.dataset.index));};
$('collect').onclick=()=>act(()=>game.collect(),'win');
for(const choice of ['low','high'])$(choice).onclick=()=>{if(!allowed()){refreshAccess();return;}const r=game.guess(choice);if(!r)return;sound.play(r.outcome==='win'?'doubleWin':r.outcome==='draw'?'collect':'doubleLose');render();};
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
