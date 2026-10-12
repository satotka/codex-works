import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,transition,evaluate,rank,spread,possibleHands,shuffled,validState} from '../dist/engine.js';
const card=(rank,suit=0)=>suit*13+rank-2;
test('all special payouts and priority over spread / pair',()=>{
  for(const suit of [0,1,2,3])assert.equal(evaluate([card(11,suit),card(12,suit)],card(13,suit)).multiplier,suit===0?500:100);
  for(let r=2;r<=14;r++)assert.equal(evaluate([card(r),card(r,1)],card(r,2)).multiplier,[7,14].includes(r)?50:r>=11?20:10);
  assert.equal(evaluate([card(11),card(13,1)],card(12,2)).multiplier,5);
});
test('all ranks: strict between, endpoints lose, paired base returns wager',()=>{
  for(let a=2;a<=14;a++)for(let b=2;b<=14;b++)for(let c=2;c<=14;c++){
    const actual=evaluate([card(a,0),card(b,1)],card(c,2));
    const gap=Math.max(0,Math.abs(a-b)-1);
    const expected=a===b?(a===c?([7,14].includes(a)?50:a>=11?20:10):1):c>Math.min(a,b)&&c<Math.max(a,b)?gap===1?5:gap===2?4:gap===3?3:2:0;
    assert.equal(actual.multiplier,expected,`${a}/${b}/${c}`);
  }
  assert.equal(spread([card(2),card(14)]),11);
});
test('possible hands exactly match remaining physical cards',()=>{
  for(let a=0;a<52;a++)for(let b=a+1;b<52;b++){
    const expected=new Set(Array.from({length:52},(_,i)=>i).filter(i=>i!==a&&i!==b).map(c=>evaluate([a,b],c).key).filter(k=>k!=='none'));
    assert.deepEqual(new Set(possibleHands([a,b]).map(p=>p[0])),expected);
  }
});
function chosenRound(base,choices,bet=5){let s=transition(initial(),{type:'bet',amount:bet});s=transition(s,{type:'deal'},()=>.5);s.base=base;s.choices=choices;s.deck=Array.from({length:52},(_,i)=>i).filter(c=>!base.includes(c)&&!choices.includes(c));s.phase='choose';return s;}
test('BET reserved once, locked through DEAL and DRAW, restored state is valid',()=>{
  let s=transition(initial(),{type:'bet',amount:10});assert.equal(s.credit,990);
  s=transition(s,{type:'deal'},()=>.5);assert.equal(s.credit,990);assert.equal(validState(s),true);
  assert.equal(transition(s,{type:'bet',amount:0}),s);
  s=transition(s,{type:'draw'});assert.equal(s.choices.length,5);assert.equal(validState(JSON.parse(JSON.stringify(s))),true);
  assert.equal(transition(s,{type:'pick',index:9}),s);
});
test('win, reload, collect once, next bet reservation conserves balance',()=>{
  let s=chosenRound([card(4),card(6)],[card(5),card(2),card(3),card(8),card(9)]);
  s=transition(s,{type:'pick',index:0});assert.equal(s.win,25);assert.equal(validState(s),true);
  s=JSON.parse(JSON.stringify(s));s=transition(s,{type:'collect'});assert.equal(s.credit+s.bet,1020);assert.equal(s.paid,25);assert.equal(s.bet,5);assert.equal(validState(s),true);
  assert.equal(transition(s,{type:'collect'}),s);
});
test('double high / low choice, tie preserves WIN and deals again, COLLECT during double',()=>{
  let s=transition(chosenRound([card(4),card(6)],[card(5),card(2),card(3),card(8),card(9)]),{type:'pick',index:0});
  s=transition(s,{type:'double'},()=>.5);s.double=[card(7),card(7,1)];
  s=transition(s,{type:'side',index:0},()=>.4);assert.equal(s.phase,'double');assert.equal(s.win,25);assert.equal(s.doubleOutcome,'tie');assert.equal(validState(s),true);
  s.double=[card(2),card(14)];s=transition(s,{type:'side',index:1});assert.equal(s.win,50);assert.equal(s.phase,'won');assert.equal(validState(s),true);
  s=transition(s,{type:'double'},()=>.5);s=transition(s,{type:'collect'});assert.equal(s.credit+s.bet,1045);assert.equal(s.paid,50);
});
test('loss and double loss do not refund consumed BET or WIN',()=>{
  let s=chosenRound([card(4),card(6)],[card(9),card(2),card(3),card(8),card(5)]);s=transition(s,{type:'pick',index:0});assert.equal(s.credit+s.bet,995);assert.equal(s.win,0);assert.equal(validState(s),true);
  s=transition(chosenRound([card(4),card(6)],[card(5),card(2),card(3),card(8),card(9)]),{type:'pick',index:0});s=transition(s,{type:'double'},()=>.5);s.double=[card(2),card(14)];s=transition(s,{type:'side',index:0});assert.equal(s.credit+s.bet,995);assert.equal(s.phase,'lost');assert.equal(validState(s),true);
});
test('limits, insufficient credit, overflow, corrupted state rejection',()=>{
  assert.equal(transition(initial(),{type:'deal'}).phase,'ready');
  let s=initial();s.credit=2;s=transition(s,{type:'bet',amount:10});assert.equal(s.bet,2);assert.equal(transition(s,{type:'deal'}),s);assert.equal(transition(s,{type:'refill'}).credit,1000);
  assert.equal(validState({...initial(),credit:-1}),false);assert.equal(validState({...initial(),bet:11}),false);
  s=transition(transition(initial(),{type:'bet',amount:3}),{type:'deal'},()=>.5);assert.equal(validState({...s,deck:[...s.deck,s.base[0]]}),false);
  s=transition(chosenRound([card(4),card(6)],[card(5),card(2),card(3),card(8),card(9)]),{type:'pick',index:0});s.win=Number.MAX_SAFE_INTEGER-1000;assert.equal(transition(s,{type:'double'}),s);
});
test('shuffle produces 52 unique physical cards',()=>{for(let i=0;i<100;i++){const deck=shuffled();assert.equal(deck.length,52);assert.equal(new Set(deck).size,52);assert.equal(deck.every(c=>rank(c)>=2&&rank(c)<=14),true);}});
