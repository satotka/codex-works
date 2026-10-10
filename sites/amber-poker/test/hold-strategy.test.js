import test from 'node:test';
import assert from 'node:assert/strict';
import {card,joker} from '../src/card.js';
import {evaluateHand} from '../src/hand-evaluator.js';
import {strategyMultiplier,holdCandidates,expectedHold} from '../src/hold-strategy.js';
test('fast expected-return evaluator agrees with game payouts including Joker and low Ace',()=>{
 const deck=['S','H','D','C'].flatMap(s=>Array.from({length:13},(_,i)=>card(i+2,s)));
 let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<300;n++){const shuffled=deck.slice();for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const hand=shuffled.slice(0,5);if(n%2===0)hand[0]=joker();assert.equal(strategyMultiplier(hand),evaluateHand(hand).multiplier);}
 for(const hand of [[card(14,'S'),card(2,'H'),card(3,'D'),card(4,'C'),card(5,'S')],[joker(),card(14,'S'),card(2,'S'),card(3,'S'),card(4,'S')]])assert.equal(strategyMultiplier(hand),evaluateHand(hand).multiplier);
});
test('Joker stays held; two-card draws cannot retain suited/run singletons',()=>{
 const hand=[joker(),card(2,'S'),card(5,'H'),card(9,'D'),card(13,'C')];
 assert.deepEqual(expectedHold(hand),[0]);
 for(const indices of holdCandidates(hand)){assert.ok(indices.includes(0));assert.ok(indices.length===1||indices.length>=4);}
 const pair=[joker(),card(7,'S'),card(7,'H'),card(9,'D'),card(13,'C')];
 assert.ok(holdCandidates(pair).some(indices=>indices.join(',')==='0,1,2'));
 assert.deepEqual(expectedHold(pair),[0,1,2]);
});
