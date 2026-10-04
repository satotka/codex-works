import {GameState} from './game-state.js';
import {PAY_TABLE} from './pay-table.js';
import {Sound} from './sound.js';
const game=new GameState(),sound=new Sound(),$=id=>document.getElementById(id);
const symbols={S:'♠',H:'♥',D:'♦',C:'♣'},ranks={11:'J',12:'Q',13:'K',14:'A'};
let notice='';
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
  const label=!c?'伏せたカード':c.joker?'JOKER':`${ranks[c.rank]||c.rank} ${symbols[c.suit]}`;
  return `<div class="card-slot"><button class="card ${!c?'back':''} ${c&&['H','D'].includes(c.suit)?'red':''} ${held?'held':''}" data-index="${i}" ${interactive?'':'disabled'} aria-label="${label}${interactive?' HOLD切替':''}" aria-pressed="${held}">${face}</button><span class="hold-label">${held?'HOLD':interactive?'HOLD / RELEASE':' '}</span></div>`;
}
function render(){
  const editable=['ready','lost'].includes(game.phase),holding=game.phase==='hold';
  ['credit','bet','win'].forEach(id=>$(id).textContent=game[id].toLocaleString());
  const showingDouble=game.doubleResult&&['double','won','lost'].includes(game.phase);
  $('cards').innerHTML=Array.from({length:5},(_,i)=>{
    const c=showingDouble?(i===1?game.doubleResult.referenceCard:i===3?game.doubleResult.card:null):game.hand[i];
    const html=cardHtml(c,i,holding);
    return showingDouble?html.replace('<span class="hold-label"> </span>',`<span class="hold-label">${i===1?'基準カード':i===3?'次のカード':' '}</span>`):html;
  }).join('');
  $('deal').innerHTML=holding?'DRAW <small>交換 · D / Space / 0</small>':'DEAL <small>配る · D / Space / 0</small>';
  $('deal').disabled=!(holding||(editable&&game.credit>=game.bet));
  $('minus').disabled=!editable||game.bet===1;$('plus').disabled=!editable||game.bet===40;$('max').disabled=!editable||game.bet===40;
  $('double').disabled=!game.canDouble;$('collect').disabled=game.phase!=='won';$('double-panel').hidden=game.phase!=='double';
  $('reset').hidden=!(game.credit===0&&editable);
  document.querySelectorAll('.payrow').forEach(el=>el.classList.toggle('active',game.result?.id===el.dataset.hand && game.result.multiplier>0));
  const messages={ready:'BETを決めて DEAL を押してください',hold:'残したいカードを HOLD → DRAW で1回交換',won:`${game.result?.name||''}${game.result?.jokerUsed?' · JOKER ×2':''} — COLLECT または DOUBLE`,lost:'NO WIN — 次のゲームは DEAL',double:'次のカードは基準より高い？低い？ W / S または 8 / 2で選択（同じ数字は負け）'};
  $('message').textContent=notice||messages[game.phase];
  if(game.phase==='won'&&!game.canDouble)$('message').textContent='上限に達しました — COLLECTで獲得してください';
  if(editable&&game.credit<game.bet)$('message').textContent=game.credit===0?'CREDITがなくなりました。NEW CREDITで再開できます':'CREDIT不足 — BETを減らしてください';
}
function act(fn,tone){notice='';const result=fn();if(result!==false&&tone)sound.play(tone);render();}
$('minus').onclick=()=>act(()=>game.setBet(game.bet-1),'bet');$('plus').onclick=()=>act(()=>game.setBet(game.bet+1),'bet');$('max').onclick=()=>act(()=>game.setBet(40),'bet');
$('deal').onclick=()=>{if(game.phase==='hold'){act(()=>game.draw(),'draw');if(game.win)sound.play('win');}else act(()=>game.deal(),'deal');};
$('cards').onclick=e=>{const b=e.target.closest('[data-index]');if(b&&game.phase==='hold')act(()=>game.toggleHold(Number(b.dataset.index)),'hold');};
$('double').onclick=()=>act(()=>game.startDouble(),'deal');$('collect').onclick=()=>act(()=>game.collect(),'collect');
for(const choice of ['low','high'])$(choice).onclick=()=>{const r=game.guess(choice);if(!r)return;notice=`選択: ${choice.toUpperCase()} · 基準 ${ranks[r.referenceCard.rank]||r.referenceCard.rank} → 次 ${ranks[r.card.rank]||r.card.rank} — ${r.outcome==='win'?'DOUBLE WIN! 再挑戦またはCOLLECT':r.card.rank===r.referenceCard.rank?'同じ数字 · DOUBLE LOST · 次はDEAL':'DOUBLE LOST · 次はDEAL'}`;sound.play(r.outcome==='win'?'doubleWin':'doubleLose');render();};
$('sound').onclick=()=>{sound.enabled=!sound.enabled;$('sound').textContent=`SOUND ${sound.enabled?'ON':'OFF'}`;$('sound').setAttribute('aria-pressed',String(sound.enabled));};
$('reset').onclick=()=>act(()=>game.reset(),'collect');
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  const space=e.code==='Space'||e.key===' '||e.code==='NumpadEnter'||e.code==='Numpad0'||e.code==='Digit0'||e.key==='0';
  const index=/^[1-5]$/.test(e.key)?Number(e.key)-1:/^(Digit|Numpad)[1-5]$/.test(e.code||'')?Number(e.code.slice(-1))-1:null;
  let action={d:'double',a:'collect',w:'high',s:'low',c:'collect',h:'high',l:'low','6':'double','4':'collect','8':'high','2':'low','+':'plus','=':'plus','-':'minus','*':'max','/':'sound','.':'reset'}[(e.key||'').toLowerCase()]||{KeyD:'double',KeyA:'collect',KeyW:'high',KeyS:'low',KeyC:'collect',KeyH:'high',KeyL:'low',Numpad6:'double',Numpad4:'collect',Numpad8:'high',Numpad2:'low',NumpadAdd:'plus',NumpadSubtract:'minus',NumpadMultiply:'max',NumpadDivide:'sound',NumpadDecimal:'reset'}[e.code];
  const primary=e.code==='Space'||e.key===' '||e.code==='KeyD'||(e.key||'').toLowerCase()==='d';
  if(primary)action=game.phase==='won'?'double':'deal';
  if(['ready','lost'].includes(game.phase)){
    if((e.key||'').toLowerCase()==='w'||e.code==='KeyW')action='plus';
    if((e.key||'').toLowerCase()==='s'||e.code==='KeyS')action='minus';
  }
  if(!space&&index===null&&!action)return;
  // Prevent native Space from activating a previously focused HOLD/BET button.
  e.preventDefault();
  if(e.repeat)return;
  if(game.phase==='hold'&&index!==null)act(()=>game.toggleHold(index),'hold');
  else if(action){
    const enabled=(action==='high'||action==='low')?game.phase==='double':action==='reset'?!$('reset').hidden:!$(action).disabled;
    if(enabled)$(action).click();
  }
  else if(space){if(!$('deal').disabled)$('deal').click();}
  else if(game.phase==='hold')act(()=>game.toggleHold(index),'hold');
});
render();


