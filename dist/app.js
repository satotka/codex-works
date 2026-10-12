import {PAYTABLE,rank,suit,spread,possibleHands,initial,transition,validState} from './engine.js';
const $=id=>document.getElementById(id),KEY='amber-between.state.v1',SUITS=['♠','♥','♦','♣'];
let state=initial(),snapshot=null,storageOK=true,blocked=false,audio=null;
function warn(text,reload=false){$('warning').hidden=false;$('warning-text').textContent=text;$('reload').hidden=!reload;}
function load(){
  try{snapshot=localStorage.getItem(KEY);if(snapshot!==null){const parsed=JSON.parse(snapshot);if(!validState(parsed))throw new Error('Invalid saved state');state=parsed;}}
  catch{try{if(snapshot!==null){localStorage.setItem(`${KEY}.backup.${Date.now()}`,snapshot);localStorage.removeItem(KEY);snapshot=null;warn('保存データを退避しました。新しいゲームを開始します。');}else{storageOK=false;warn('保存を利用できません。この画面を閉じると進行状態が失われます。');}}catch{blocked=true;warn('保存データを保護するため操作を停止しました。ブラウザーの保存設定を確認してください。');}}
}
function save(next){
  if(blocked)return false;
  if(storageOK){try{if(localStorage.getItem(KEY)!==snapshot){blocked=true;warn('別タブでゲームが更新されました。RELOADで最新状態を読み込んでください。',true);return false;}
    const value=JSON.stringify(next);localStorage.setItem(KEY,value);snapshot=value;
  }catch{storageOK=false;warn('保存できません。現在のゲームは続けられますが、再読み込みで失われる可能性があります。');}}
  state=next;return true;
}
function beep(win=false){if(!state.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=win?660:330;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.14);}catch{}}
function random(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function act(action){if(blocked)return;const next=transition(state,action,random);if(next===state)return;const gained=next.win>state.win;if(save(next)){beep(gained);render();}}
function label(card){const r=rank(card);return r===14?'A':r===13?'K':r===12?'Q':r===11?'J':String(r);}
function cardElement(card,{button=false,onClick=null,name='',selected=false}={}){
  const el=document.createElement(button?'button':'div');el.className=`card${card===null?' back':suit(card)===1||suit(card)===2?' red':''}${selected?' selected':''}`;
  if(button){el.type='button';el.disabled=blocked;el.addEventListener('click',onClick);}
  el.setAttribute('aria-label',card===null?name||'裏向きカード':`${name} ${SUITS[suit(card)]}${label(card)}`);
  if(card===null)el.innerHTML='<span aria-hidden="true">♠</span>';
  else{const corner=`${label(card)}<br>${SUITS[suit(card)]}`;el.innerHTML=`<span class="corner" aria-hidden="true">${corner}</span><span class="suit" aria-hidden="true">${SUITS[suit(card)]}</span><span class="corner bottom" aria-hidden="true">${corner}</span>`;}
  return el;
}
function slot(card,name,options={}){const el=document.createElement('div');el.className='card-slot';const title=document.createElement('span');title.className='card-label';title.textContent=name;el.append(title,cardElement(card,{name,...options}));return el;}
function render(){
  const s=state,ready=['ready','lost'].includes(s.phase),doubling=s.phase==='double'||s.doubleLast.length>0;
  $('credit').textContent=s.credit.toLocaleString();$('bet').textContent=s.bet.toLocaleString();$('win').textContent=s.win.toLocaleString();$('paid').textContent=s.paid.toLocaleString();$('round').textContent=`ROUND ${String(s.rounds+(['dealt','choose'].includes(s.phase)?1:0)||1).padStart(3,'0')}`;
  $('stats').textContent=`${s.rounds} PLAYS · ${s.wins} WINS`;
  for(const key of ['guide','sound']){$(key).textContent=`${key.toUpperCase()} ${s[key]?'ON':'OFF'}`;$(key).setAttribute('aria-pressed',String(s[key]));}
  $('help').hidden=!s.guide;$('hint').hidden=!s.guide;
  const messages={ready:[s.paid?`PAID ${s.paid.toLocaleString()}`:'BET','BETを1〜10枚に設定して、DEAL。'],choose:['CHOOSE ONE','5枚の裏向きカードから1枚を選んでください。'],won:[s.doubleOutcome==='win'?`DOUBLE WIN ${s.win.toLocaleString()}`:`WIN ${s.win.toLocaleString()}`,'COLLECTで回収、DOUBLEで倍増に挑戦。'],lost:[s.doubleOutcome==='loss'?'DOUBLE LOST':'NO WIN','次のBETを選んで、もう一度DEAL。'],double:[s.doubleOutcome==='tie'?'TIE · TRY AGAIN':'LEFT OR RIGHT','数字が大きい方を選んでください。同値は配り直し。']};
  const [title,guide]=messages[s.phase];$('message').replaceChildren();const strong=document.createElement('strong');strong.textContent=title;$('message').append(strong);
  if(s.result&&!doubling){const result=document.createElement('span');result.textContent=s.result.multiplier?`${s.result.label} ×${s.result.multiplier}`:s.result.label;$('message').append(result);}
  if(s.guide){const text=document.createElement('span');text.textContent=guide;$('message').append(text);}
  $('base').hidden=doubling;$('base').replaceChildren(slot(s.base[0]??null,'LEFT BASE'),slot(s.selected===null?null:s.choices[s.selected],'YOUR CARD',{selected:s.selected!==null}),slot(s.base[1]??null,'RIGHT BASE'));
  $('spread').hidden=doubling||s.base.length===0;$('spread').textContent=s.base.length?`SPREAD ${spread(s.base)}${rank(s.base[0])===rank(s.base[1])?' · PAIR':''}`:'';
  $('possible').hidden=doubling||!['dealt','choose'].includes(s.phase);$('possible').textContent=s.base.length?`POSSIBLE HAND · ${possibleHands(s.base).map(p=>`${p[1]} ×${p[2]}`).join(' / ')||'NO WIN'}`:'';
  $('choices-panel').hidden=doubling||!['choose','won','lost'].includes(s.phase)||s.choices.length===0;$('choices').replaceChildren();
  s.choices.forEach((card,i)=>{$('choices').append(slot(s.phase==='choose'?null:card,`${i+1}${s.selected===i?' · SELECTED':''}`,{button:s.phase==='choose',onClick:()=>act({type:'pick',index:i}),selected:s.selected===i}));});
  $('double-panel').hidden=!doubling;$('double-cards').replaceChildren();
  if(doubling){const cards=s.phase==='double'?[null,null]:s.doubleLast;cards.forEach((c,i)=>$('double-cards').append(slot(c,i===0?'LEFT':'RIGHT',{button:s.phase==='double',onClick:()=>act({type:'side',index:i})})));
    if(s.phase==='double')for(const [i,slot] of [...$('double-cards').children].entries()){const shortcut=document.createElement('small');shortcut.textContent=i===0?'A/4':'D/6';slot.children[1].append(shortcut);}}
  $('tie-note').textContent=s.doubleOutcome==='tie'?(s.guide?'同値のためWINを維持し、新しい2枚を配りました。':'TIE · WIN KEPT · NEW CARDS'):'';
  const total=s.credit+s.bet;for(const id of ['min','minus-ten','minus','plus','plus-ten','max'])$(id).disabled=blocked||!ready;
  $('min').disabled||=s.bet===0;$('minus').disabled||=s.bet===0;$('minus-ten').disabled||=s.bet===0;$('plus').disabled||=s.bet>=Math.min(10,total);$('plus-ten').disabled=$('plus').disabled;$('max').disabled=$('plus').disabled;
  const mainType=ready?'deal':s.phase==='won'?'double':null;
  $('main').hidden=['choose','double'].includes(s.phase);$('main').textContent=mainType?.toUpperCase()??'DEAL';if(mainType==='double'){const shortcut=document.createElement('small');shortcut.textContent='W/8';$('main').append(shortcut)};$('main').disabled=blocked||!mainType||(ready&&s.bet<1)||(mainType==='double'&&s.win>Math.floor((Number.MAX_SAFE_INTEGER-s.credit)/2));
  $('collect').hidden=!['won','double'].includes(s.phase);$('collect').disabled=blocked;$('refill').hidden=!(ready&&total<1);$('refill').disabled=blocked;
  $('hint').textContent=s.phase==='choose'?'1〜5でカードを選択':s.phase==='double'?'A・4 LEFT ／ D・6 RIGHT ／ S・2 COLLECT':ready?'D・6 DEAL ／ W・8 ＋1 ／ S・2 −1':'W・8 DOUBLE ／ S・2 COLLECT';
  $('save-status').textContent=blocked?'PLAY PAUSED':storageOK?'AUTO SAVE':'SAVE UNAVAILABLE';
  $('payrows').replaceChildren();const possible=new Set(s.base.length?possibleHands(s.base).map(p=>p[0]):[]);
  PAYTABLE.forEach(([key,text,multiplier])=>{const row=document.createElement('div');row.className=`payrow${s.result?.key===key?' active':possible.has(key)&&['dealt','choose'].includes(s.phase)?' possible-row':''}`;const name=document.createElement('span'),value=document.createElement('b');name.textContent=text;value.textContent=`×${multiplier}`;row.append(name,value);$('payrows').append(row);});
}
$('min').onclick=()=>act({type:'bet',amount:0});$('max').onclick=()=>act({type:'bet',amount:10});
for(const [id,delta] of [['minus-ten',-10],['minus',-1],['plus',1],['plus-ten',10]])$(id).onclick=()=>act({type:'bet',amount:state.bet+delta});
$('main').onclick=()=>act({type:['ready','lost'].includes(state.phase)?'deal':'double'});
$('collect').onclick=()=>act({type:'collect'});$('refill').onclick=()=>act({type:'refill'});$('guide').onclick=()=>act({type:'guide'});$('sound').onclick=()=>act({type:'sound'});$('reload').onclick=()=>location.reload();
document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  let key=event.key.toLowerCase();if(event.code.startsWith('Numpad')){const number=event.code.slice(6);if(/^\d$/.test(number))key=number;}
  let action=null;
  if(state.phase==='choose'&&/^[1-5]$/.test(key))action={type:'pick',index:Number(key)-1};
  else if(state.phase==='double'&&['arrowleft','arrowright'].includes(key))action={type:'side',index:key==='arrowleft'?0:1};
  else if(state.phase==='double'&&['a','4','d','6'].includes(key))action={type:'side',index:['a','4'].includes(key)?0:1};
  else if(['won','double'].includes(state.phase)&&['s','2'].includes(key))action={type:'collect'};
  else if(state.phase==='won'&&['w','8'].includes(key))action={type:'double'};
  else if(['d','6'].includes(key)&&['ready','lost'].includes(state.phase))action={type:'deal'};
  else if(['w','8','+'].includes(key))action={type:'bet',amount:state.bet+1};
  else if(['s','2','-'].includes(key))action={type:'bet',amount:state.bet-1};
  else if(key==='*')action={type:'bet',amount:10};
  if(action){event.preventDefault();act(action);}
});
window.addEventListener('storage',e=>{if(storageOK&&e.storageArea===localStorage&&(e.key===KEY||e.key===null)&&localStorage.getItem(KEY)!==snapshot){blocked=true;warn('別タブでゲームが更新されました。RELOADしてください。',true);render();}});
load();if(!blocked&&state.phase==='dealt')save(transition(state,{type:'draw'}));if(storageOK&&!blocked&&snapshot===null)save(state);if(matchMedia('(max-width:760px)').matches)$('paytable').open=false;render();
