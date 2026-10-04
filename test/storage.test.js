import test from 'node:test';
import assert from 'node:assert/strict';
import {GameState} from '../src/game-state.js';
import {Deck} from '../src/deck.js';
import {DoubleDown} from '../src/double-down.js';
import {saveGame,restoreGame,SAVE_KEY} from '../src/storage.js';
const memory=()=>({value:null,getItem(){return this.value;},setItem(key,value){if(key===SAVE_KEY)this.value=value;}});
const reload=(game,storage)=>{assert.equal(saveGame(game,false,storage),true);const next=new GameState();assert.deepEqual(restoreGame(next,storage),{status:'restored',soundEnabled:false});return next;};
test('reload preserves bet, deducted credit, holds, and exact next draw',()=>{
  const storage=memory(),game=new GameState({deckFactory:()=>new Deck({random:()=>0.5})});
  game.setBet(17);let next=reload(game,storage);assert.equal(next.bet,17);
  if(game.bet===0)game.setBet(1);game.deal();game.toggleHold(1);game.toggleHold(4);
  next=reload(game,storage);assert.equal(next.credit,983);assert.deepEqual(next.held,game.held);
  next.draw();game.draw();assert.deepEqual(next.hand,game.hand);assert.equal(next.win,game.win);
  next=reload(game,storage);assert.equal(next.phase,game.phase);assert.deepEqual(next.result,game.result);
});
test('reload during double keeps reference, next card and uncollected win; collect only once',()=>{
  const storage=memory(),game=new GameState({deckFactory:()=>new Deck({random:()=>0.5}),doubleDown:new DoubleDown(()=>new Deck({includeJoker:false,random:()=>0.5}))});
  if(game.bet===0)game.setBet(1);game.deal();game.draw();game.phase='won';game.win=25;
  let next=reload(game,storage);assert.equal(next.win,25);assert.equal(next.credit,999);
  game.startDouble();next=reload(game,storage);
  assert.deepEqual(next.doubleResult,game.doubleResult);
  const choice=game.doubleDown.deck.cards.at(-1).rank>game.doubleDown.referenceCard.rank?'high':'low';
  assert.deepEqual(next.guess(choice),game.guess(choice));assert.equal(next.credit,999);assert.equal(next.phase,'won');
  next=reload(game,storage);assert.deepEqual(next.doubleResult,game.doubleResult);
  if(next.phase==='won'){
    const win=next.win;next.collect();next=reload(next,storage);assert.equal(next.credit,999+win);assert.equal(next.collect(),false);assert.equal(next.win,0);
  }
});
test('bad data or unavailable storage leaves a fresh game usable',()=>{
  const storage=memory();
  for(const value of ['{','null',JSON.stringify({version:99})]){
    storage.value=value;const game=new GameState();assert.equal(restoreGame(game,storage).status,'invalid');assert.equal(game.credit,1000);assert.equal(game.phase,'ready');
  }
  const game=new GameState({deckFactory:()=>new Deck({random:()=>0.5})});if(game.bet===0)game.setBet(1);game.deal();saveGame(game,true,storage);
  const valid=storage.value;
  for(const change of [s=>s.credit=-1,s=>s.deck[0]=s.hand[0],s=>s.deck=[],s=>s.held=[true],s=>s.win=1]){
    const s=JSON.parse(valid);change(s);storage.value=JSON.stringify(s);const fresh=new GameState();assert.equal(restoreGame(fresh,storage).status,'invalid');assert.equal(fresh.phase,'ready');
  }
  const denied={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.equal(saveGame(game,true,denied),false);assert.equal(restoreGame(new GameState(),denied).status,'unavailable');
});

test('legacy editable saves migrate credit without double charging',()=>{const storage=memory();const game=new GameState();game.setBet(17);saveGame(game,true,storage);const old=JSON.parse(storage.value);old.version=1;old.credit=1000;storage.value=JSON.stringify(old);const next=new GameState();assert.equal(restoreGame(next,storage).status,'restored');assert.equal(next.credit,983);assert.equal(next.bet,17);assert.equal(next.deal(),true);assert.equal(next.credit,983);saveGame(next,true,storage);const active=JSON.parse(storage.value);active.version=1;storage.value=JSON.stringify(active);const resumed=new GameState();assert.equal(restoreGame(resumed,storage).status,'restored');assert.equal(resumed.credit,983);assert.equal(resumed.phase,'hold');assert.equal(resumed.deal(),false);});
