import {validateHand} from './card.js';
import {PAY_TABLE} from './pay-table.js';
import {bestJokerInterpretation} from './joker-rule.js';
function classify(hand,natural=true) {
  const ranks=hand.map(c=>c.rank).sort((a,b)=>a-b);
  const groups=[...new Set(ranks)].map(r=>ranks.filter(x=>x===r).length).sort((a,b)=>b-a);
  const flush=hand.every(c=>c.suit===hand[0].suit);
  const straight=groups.length===5 && (ranks[4]-ranks[0]===4 || ranks.join(',')==='2,3,4,5,14');
  let id='highCard';
  if(natural && flush && ranks.join(',')==='10,11,12,13,14') id='naturalRoyal';
  else if(groups[0]===5) id='fiveKind';
  else if(straight && flush) id='straightFlush';
  else if(groups[0]===4) id='fourKind';
  else if(groups[0]===3 && groups[1]===2) id='fullHouse';
  else if(flush) id='flush';
  else if(straight) id='straight';
  else if(groups[0]===3) id='threeKind';
  else if(groups[0]===2 && groups[1]===2) id='twoPair';
  else if(groups[0]===2) id='onePair';
  const order=PAY_TABLE.findIndex(p=>p.id===id);
  return {...PAY_TABLE[order],order,jokerUsed:false};
}
export function evaluateHand(hand) {validateHand(hand); return hand.some(c=>c.joker)?bestJokerInterpretation(hand,classify):classify(hand);}
export function payout(bet,result) {if(!Number.isInteger(bet)||bet<1||bet>40) throw new Error('Invalid bet'); return bet*result.multiplier;}
