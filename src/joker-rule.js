import {SUITS,card} from './card.js';
export function bestJokerInterpretation(hand,classify) {
  const index=hand.findIndex(c=>c.joker);
  let best=null;
  // Duplicate rank/suit substitutions are intentional: a wild card can make five of a kind.
  for(const suit of SUITS) for(let rank=2;rank<=14;rank++) {
    const candidate=hand.slice(); candidate[index]=card(rank,suit);
    const result=classify(candidate,false);
    if(!best || result.order<best.order) best={...result,substitution:card(rank,suit)};
  }
  return {...best,jokerUsed:true,multiplier:best.multiplier*2};
}
