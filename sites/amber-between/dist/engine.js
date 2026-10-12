export const PAYTABLE = [
  ['spade','J-Q-K OF SPADE',500],['flush','J-Q-K WITH FLUSH',100],
  ['aces-sevens','THREE A’s OR 7’s',50],['faces','THREE J’s, Q’s, K’s',20],
  ['triple','THREE OF A KIND',10],['spread1','1 CARD SPREAD',5],
  ['spread2','2 CARDS SPREAD',4],['spread3','3 CARDS SPREAD',3],
  ['spread4','4–11 CARDS SPREAD',2],['pair','PAIR W/O SPREAD',1]
];
export const rank = c => c % 13 + 2;
export const suit = c => Math.floor(c / 13);
export const spread = base => Math.max(0, Math.abs(rank(base[0])-rank(base[1]))-1);
export function evaluate(base, card) {
  const cards=[...base,card], ranks=cards.map(rank).sort((a,b)=>a-b);
  let key=null;
  if(ranks.join(',')==='11,12,13' && cards.every(c=>suit(c)===suit(cards[0]))) key=suit(cards[0])===0?'spade':'flush';
  else if(ranks[0]===ranks[2]) key=[14,7].includes(ranks[0])?'aces-sevens':ranks[0]>=11?'faces':'triple';
  else if(spread(base)===0 && base.some(c=>rank(c)===rank(card))) key='pair';
  else if(rank(card)>Math.min(...base.map(rank)) && rank(card)<Math.max(...base.map(rank))) {
    const n=spread(base);key=n<=3?`spread${n}`:'spread4';
  }
  const row=PAYTABLE.find(p=>p[0]===key);
  return {key:row?.[0]??'none',label:row?.[1]??'NO WIN',multiplier:row?.[2]??0};
}
export function possibleHands(base) {
  const keys=new Set(Array.from({length:52},(_,i)=>i).filter(c=>!base.includes(c)).map(c=>evaluate(base,c).key));
  return PAYTABLE.filter(p=>keys.has(p[0]));
}
export function shuffled(random=Math.random) {
  const cards=Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
export function initial() {return {version:1,phase:'ready',credit:1000,bet:0,win:0,paid:0,base:[],choices:[],selected:null,deck:[],double:[],doubleLast:[],result:null,doubleOutcome:null,rounds:0,wins:0,guide:true,sound:false};}
const reservable=s=>['ready','lost'].includes(s.phase);
function reserve(s, amount){const total=s.credit+s.bet;s.bet=Math.max(0,Math.min(10,total,amount));s.credit=total-s.bet;}
function nextBet(s){const amount=s.bet;s.bet=0;reserve(s,s.credit>=1?amount:0);}
export function transition(previous,action,random=Math.random){
  const s=structuredClone(previous);
  if(action.type==='bet' && reservable(s)){reserve(s,action.amount);return s;}
  if(action.type==='guide'||action.type==='sound'){s[action.type]=!s[action.type];return s;}
  if(action.type==='refill' && reservable(s) && s.credit+s.bet<1){return {...initial(),guide:s.guide,sound:s.sound};}
  if(action.type==='deal' && reservable(s) && s.bet>=1 && s.bet<=10){
    s.deck=shuffled(random);s.base=s.deck.splice(0,2).sort((a,b)=>rank(a)-rank(b));s.choices=s.deck.splice(0,5);s.selected=null;s.double=[];s.doubleLast=[];s.doubleOutcome=null;s.result=null;s.paid=0;s.phase='choose';return s;
  }
  if(action.type==='draw' && s.phase==='dealt'){s.choices=s.deck.splice(0,5);s.phase='choose';return s;}
  if(action.type==='pick' && s.phase==='choose' && Number.isInteger(action.index) && action.index>=0 && action.index<5){
    s.selected=action.index;s.result=evaluate(s.base,s.choices[s.selected]);s.win=s.bet*s.result.multiplier;s.rounds++;if(s.win)s.wins++;
    s.phase=s.win?'won':'lost';if(!s.win)nextBet(s);return s;
  }
  if(action.type==='double' && s.phase==='won' && s.win<=Math.floor((Number.MAX_SAFE_INTEGER-s.credit)/2)){
    s.double=shuffled(random).slice(0,2);s.doubleLast=[];s.doubleOutcome=null;s.phase='double';return s;
  }
  if(action.type==='side' && s.phase==='double' && [0,1].includes(action.index)){
    const chosen=rank(s.double[action.index]),other=rank(s.double[1-action.index]);s.doubleLast=s.double;s.doubleOutcome=chosen===other?'tie':chosen>other?'win':'loss';
    if(chosen===other){s.double=shuffled(random).slice(0,2);return s;}
    s.double=[];if(chosen>other){s.win*=2;s.phase='won';}else{s.win=0;s.phase='lost';nextBet(s);}return s;
  }
  if(action.type==='collect' && ['won','double'].includes(s.phase)){
    if(!Number.isSafeInteger(s.credit+s.win))return previous;
    s.paid=s.win;s.credit+=s.win;s.win=0;s.phase='ready';s.base=[];s.choices=[];s.deck=[];s.double=[];s.doubleLast=[];s.selected=null;s.result=null;s.doubleOutcome=null;nextBet(s);return s;
  }
  return previous;
}
export function validState(s){
  if(!s||s.version!==1||!['ready','dealt','choose','won','double','lost'].includes(s.phase))return false;
  if(!['credit','bet','win','paid','rounds','wins'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.bet>10||s.wins>s.rounds||!Number.isSafeInteger(s.credit+s.bet+s.win))return false;
  if(typeof s.guide!=='boolean'||typeof s.sound!=='boolean'||![null,'win','loss','tie'].includes(s.doubleOutcome))return false;
  if(!['base','choices','deck','double','doubleLast'].every(k=>Array.isArray(s[k])&&s[k].every(c=>Number.isInteger(c)&&c>=0&&c<52)))return false;
  const all=[...s.base,...s.choices,...s.deck];if(new Set(all).size!==all.length)return false;
  if(s.double.length>0&&(s.double.length!==2||new Set(s.double).size!==2))return false;
  if(s.doubleLast.length>0&&(s.doubleLast.length!==2||new Set(s.doubleLast).size!==2))return false;
  if(s.selected!==null&&(!Number.isInteger(s.selected)||s.selected<0||s.selected>4))return false;
  if(s.phase==='ready')return s.win===0&&s.base.length===0&&s.choices.length===0&&s.deck.length===0&&s.double.length===0&&s.selected===null&&s.result===null;
  if(s.base.length!==2||all.length!==52)return false;
  if(['dealt','choose','won','double'].includes(s.phase)&&s.bet<1)return false;
  if(s.phase==='dealt')return s.choices.length===0&&s.deck.length===50&&s.selected===null&&s.win===0&&s.result===null&&s.double.length===0;
  if(s.choices.length!==5||s.deck.length!==45)return false;
  if(s.phase==='choose')return s.selected===null&&s.win===0&&s.result===null&&s.double.length===0;
  if(s.selected===null||!s.result)return false;
  const r=evaluate(s.base,s.choices[s.selected]);if(s.result.key!==r.key||s.result.label!==r.label||s.result.multiplier!==r.multiplier)return false;
  if(s.phase==='lost')return s.win===0&&s.double.length===0;
  return s.win>0&&r.multiplier>0&&(s.phase==='double'?s.double.length===2:s.double.length===0);
}
