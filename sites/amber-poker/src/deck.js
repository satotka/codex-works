import {SUITS,card,joker} from './card.js';
export function secureRandom() { return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296; }
export class Deck {
  constructor({includeJoker=true,random=secureRandom}={}) {
    this.cards=SUITS.flatMap(s=>Array.from({length:13},(_,i)=>card(i+2,s)));
    if(includeJoker) this.cards.push(joker());
    for(let i=this.cards.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [this.cards[i],this.cards[j]]=[this.cards[j],this.cards[i]];}
  }
  draw() {if(!this.cards.length) throw new Error('Empty deck'); return this.cards.pop();}
}
