import {Deck} from './deck.js';
import {evaluateHand,payout} from './hand-evaluator.js';
import {DoubleDown} from './double-down.js';
export class GameState {
  constructor({deckFactory=()=>new Deck(),doubleDown=new DoubleDown()}={}) {
    this.deckFactory=deckFactory; this.doubleDown=doubleDown; this.credit=1000; this.bet=1; this.win=0; this.phase='ready'; this.hand=[]; this.held=Array(5).fill(false); this.result=null; this.doubleResult=null;
  }
  setBet(value) {if(!['ready','lost'].includes(this.phase)||!Number.isFinite(value)) return; this.bet=Math.max(1,Math.min(40,Math.trunc(value)));}
  deal() {
    if(!['ready','lost'].includes(this.phase)||this.credit<this.bet) return false;
    this.credit-=this.bet; this.win=0; this.deck=this.deckFactory(); this.hand=Array.from({length:5},()=>this.deck.draw()); this.held.fill(false); this.phase='hold'; this.result=null; this.doubleResult=null; return true;
  }
  toggleHold(i) {if(this.phase==='hold'&&Number.isInteger(i)&&i>=0&&i<5) this.held[i]=!this.held[i];}
  draw() {if(this.phase!=='hold') return false; this.hand=this.hand.map((c,i)=>this.held[i]?c:this.deck.draw()); this.result=evaluateHand(this.hand); this.win=payout(this.bet,this.result); this.phase=this.win?'won':'lost'; return true;}
  get canDouble() {return this.phase==='won'&&this.win<=Math.floor((Number.MAX_SAFE_INTEGER-this.credit)/2);}
  startDouble() {if(!this.canDouble)return false; this.doubleResult={referenceCard:this.doubleDown.start(),card:null}; this.phase='double'; return true;}
  guess(choice) {if(this.phase!=='double')return false; this.doubleResult=this.doubleDown.play(this.win,choice); this.win=this.doubleResult.win; this.phase=this.win?'won':'lost'; return this.doubleResult;}
  collect() {if(this.phase!=='won')return false; this.credit+=this.win; this.win=0; this.phase='ready'; return true;}
  reset() {if(this.credit===0&&['ready','lost'].includes(this.phase)){this.credit=1000;this.phase='ready';this.hand=[];this.result=null;this.doubleResult=null;return true;}return false;}
}
