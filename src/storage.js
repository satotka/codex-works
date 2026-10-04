import {Deck} from './deck.js';
import {DoubleDown} from './double-down.js';
import {validateHand,SUITS} from './card.js';
import {evaluateHand} from './hand-evaluator.js';
export const SAVE_KEY='amber-poker.state.v1';
function checkedCards(cards,allowJoker=true){
  if(!Array.isArray(cards)||cards.length>53)throw new Error('Invalid deck');
  const ids=new Set();
  return cards.map(c=>{
    if(!c||typeof c.joker!=='boolean'||(c.joker? !allowJoker||c.rank!==0||c.suit!==null : !Number.isInteger(c.rank)||c.rank<2||c.rank>14||!SUITS.includes(c.suit)))throw new Error('Invalid card');
    const id=c.joker?'joker':`${c.rank}${c.suit}`;
    if(ids.has(id))throw new Error('Duplicate card');
    ids.add(id);return {rank:c.rank,suit:c.suit,joker:c.joker};
  });
}
function restoredDeck(cards){const deck=Object.create(Deck.prototype);deck.cards=cards;return deck;}
export function saveGame(game,soundEnabled,storage){
  try{
    storage.setItem(SAVE_KEY,JSON.stringify({version:1,collectedWin:game.collectedWin||0,credit:game.credit,bet:game.bet,win:game.win,phase:game.phase,hand:game.hand,held:game.held,deck:game.phase==='hold'?game.deck.cards:[],doubleResult:game.doubleResult,doubleDeck:game.phase==='double'?game.doubleDown.deck.cards:[],soundEnabled}));
    return true;
  }catch{return false;}
}
export function restoreGame(game,storage){
  let raw;
  try{
    raw=storage.getItem(SAVE_KEY);if(raw===null)return {status:'empty'};
    const s=JSON.parse(raw);
    if(s.version!==1||!['ready','hold','won','double','lost'].includes(s.phase)||![s.credit,s.win].every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isSafeInteger(s.credit+s.win)||!Number.isSafeInteger(s.bet)||s.bet<1||typeof s.soundEnabled!=='boolean')throw new Error('Invalid state');
    if(s.collectedWin!==undefined&&(!Number.isSafeInteger(s.collectedWin)||s.collectedWin<0))throw new Error('Invalid collected win');
    const hand=checkedCards(s.hand);
    if(hand.length)validateHand(hand);else if(s.phase!=='ready')throw new Error('Missing hand');
    if(!Array.isArray(s.held)||s.held.length!==5||s.held.some(v=>typeof v!=='boolean'))throw new Error('Invalid holds');
    if(['won','double'].includes(s.phase)?s.win<=0:s.win!==0)throw new Error('Invalid win');
    const deck=checkedCards(s.deck);
    if(s.phase==='hold'){if(deck.length!==48)throw new Error('Missing deck');checkedCards([...hand,...deck]);}
    else if(deck.length)throw new Error('Unexpected deck');
    const doubleDeck=checkedCards(s.doubleDeck,false);
    let doubleResult=null;
    if(s.doubleResult!==null){
      const d=s.doubleResult;const referenceCard=checkedCards([d.referenceCard],false)[0];
      if(d.card===null){
        if(s.phase!=='double')throw new Error('Unexpected active double');
        doubleResult={referenceCard,card:null};
      }else{
        const card=checkedCards([referenceCard,d.card],false)[1];
        if(!['high','low'].includes(d.choice)||!['win','lose','draw'].includes(d.outcome)||!Number.isSafeInteger(d.win)||d.win<0)throw new Error('Invalid double result');
        const won=d.choice==='high'?card.rank>referenceCard.rank:card.rank<referenceCard.rank;
        if(d.outcome==='draw'){
          if(card.rank!==referenceCard.rank||d.win<=0||s.phase!=='ready'||s.win!==0)throw new Error('Invalid draw');
        }else if(d.outcome!==(won?'win':'lose')||(won?d.win<=0:d.win!==0))throw new Error('Invalid outcome');
        doubleResult={referenceCard,card,choice:d.choice,outcome:d.outcome,win:d.win};
      }
    }
    const doubleDown=new DoubleDown();
    if(s.phase==='double'){
      if(!doubleResult||doubleResult.card!==null||doubleDeck.length!==51||s.win>Math.floor((Number.MAX_SAFE_INTEGER-s.credit)/2))throw new Error('Missing double deck');
      checkedCards([doubleResult.referenceCard,...doubleDeck],false);
      doubleDown.deck=restoredDeck(doubleDeck);doubleDown.referenceCard=doubleResult.referenceCard;doubleDown.active=true;
    }else if(doubleDeck.length)throw new Error('Unexpected double deck');
    const result=hand.length&&s.phase!=='hold'?evaluateHand(hand):null;
    Object.assign(game,{collectedWin:s.collectedWin||0,credit:s.credit,bet:s.bet,win:s.win,phase:s.phase,hand,held:s.held.slice(),deck:restoredDeck(deck),doubleDown,doubleResult,result});
    return {status:'restored',soundEnabled:s.soundEnabled};
  }catch{
    if(raw!=null){try{storage.setItem(SAVE_KEY+'.backup.'+Date.now(),raw);return {status:'invalid',backedUp:true};}catch{return {status:'invalid',backedUp:false};}}
    return {status:'unavailable'};
  }
}
