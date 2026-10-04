import {SUITS,card,joker,validateHand} from './card.js';
import {PAY_TABLE} from './pay-table.js';
const holdCache=new Map();
const straightMasks=[(1<<14)|60,...Array.from({length:9},(_,i)=>31<<(i+2))];
export function strategyMultiplier(hand){
  const counts=Array(15).fill(0);let wild=0,mask=0,suit=null,flush=true,distinct=0,max=0,pairs=0;
  for(const c of hand){if(c.joker){wild++;continue;}counts[c.rank]++;mask|=1<<c.rank;if(suit===null)suit=c.suit;else if(suit!==c.suit)flush=false;}
  for(let r=2;r<=14;r++){const n=counts[r];if(n)distinct++;if(n>max)max=n;if(n===2)pairs++;}
  const straight=distinct===5-wild&&straightMasks.some(m=>(mask&m)===mask);
  let id='highCard';
  if(!wild&&flush&&mask===(31<<10))id='naturalRoyal';
  else if(wild&&max===4)id='fiveKind';
  else if(flush&&straight)id='straightFlush';
  else if(max+wild>=4)id='fourKind';
  else if(wild?(pairs===2||max===3):(max===3&&pairs===1))id='fullHouse';
  else if(flush)id='flush';
  else if(straight)id='straight';
  else if(max+wild>=3)id='threeKind';
  else if(pairs===2)id='twoPair';
  else if(max+wild>=2)id='onePair';
  return PAY_TABLE.find(p=>p.id===id).multiplier*(wild?2:1);
}
export function holdCandidates(hand){
  validateHand(hand);const wildIndex=hand.findIndex(c=>c.joker),candidates=[];
  for(let bits=0;bits<32;bits++){
    if(wildIndex>=0&&!(bits&(1<<wildIndex)))continue;
    const indices=hand.flatMap((_,i)=>bits&(1<<i)?[i]:[]);
    // Two or more exchanges: retain only real pairs/sets (and the Joker).
    // Suited or consecutive singletons are eligible only with <=1 exchange.
    if(indices.length<4){const selected=indices.map(i=>hand[i]);if(selected.some(c=>!c.joker&&selected.filter(x=>!x.joker&&x.rank===c.rank).length<2))continue;}
    candidates.push(indices);
  }
  return candidates;
}
export function expectedHold(hand){
  const key=hand.map(c=>c.joker?'X':c.rank+c.suit).join(',');
  if(holdCache.has(key))return holdCache.get(key).slice();
  const seen=new Set(hand.map(c=>c.joker?'X':c.rank+c.suit));
  const unseen=[...SUITS.flatMap(s=>Array.from({length:13},(_,i)=>card(i+2,s))),joker()].filter(c=>!seen.has(c.joker?'X':c.rank+c.suit));
  let best=[],bestValue=-1;
  for(const indices of holdCandidates(hand)){
    const trial=indices.map(i=>hand[i]),keep=trial.length;let sum=0,total=0;
    function enumerate(start,depth){
      if(depth===5){sum+=strategyMultiplier(trial);total++;return;}
      for(let i=start;i<=unseen.length-(5-depth);i++){trial[depth]=unseen[i];enumerate(i+1,depth+1);}
    }
    enumerate(0,keep);const value=sum/total;
    if(value>bestValue+1e-12||(Math.abs(value-bestValue)<1e-12&&indices.length>best.length)){bestValue=value;best=indices;}
  }
  if(holdCache.size>128)holdCache.clear();holdCache.set(key,best);return best.slice();
}
