import {Deck} from './deck.js';
export class DoubleDown {
  constructor(deckFactory=()=>new Deck({includeJoker:false})) {this.deckFactory=deckFactory;}
  start() {
    this.deck=this.deckFactory();
    this.referenceCard=this.deck.draw();
    this.active=true;
    return this.referenceCard;
  }
  play(win,choice) {
    if(!['high','low'].includes(choice)||!Number.isSafeInteger(win)||win<=0) throw new Error('Invalid double');
    if(win>Math.floor(Number.MAX_SAFE_INTEGER/2)) throw new Error('Collect before doubling');
    if(!this.active)throw new Error('Start double before choosing');
    const card=this.deck.draw();
    this.active=false;
    const referenceCard=this.referenceCard;
    const outcome=(choice==='high'?card.rank>referenceCard.rank:card.rank<referenceCard.rank)?'win':'lose';
    return {referenceCard,card,choice,outcome,win:outcome==='win'?win*2:0};
  }
}
