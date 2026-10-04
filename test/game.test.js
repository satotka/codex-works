import test from 'node:test';
import assert from 'node:assert/strict';
import {card,joker} from '../src/card.js';
import {evaluateHand,payout} from '../src/hand-evaluator.js';
import {Deck} from '../src/deck.js';
import {DoubleDown} from '../src/double-down.js';
import {GameState} from '../src/game-state.js';
const hand=spec=>spec.split(' ').map(s=>s==='X'?joker():card(Number(s.slice(0,-1)),s.slice(-1)));
const cases=[
 ['naturalRoyal','10S 11S 12S 13S 14S',500],
 ['straightFlush','5H 6H 7H 8H 9H',40],
 ['fourKind','7S 7H 7D 7C 2S',14],
 ['fullHouse','7S 7H 7D 2C 2S',6],
 ['flush','2H 5H 7H 11H 13H',4],
 ['straight','2S 3H 4D 5C 6S',3],
 ['straight','14S 2H 3D 4C 5S',3],
 ['straight','10S 11H 12D 13C 14S',3],
 ['threeKind','7S 7H 7D 2C 4S',1],
 ['twoPair','7S 7H 2D 2C 4S',1],
 ['onePair','7S 7H 2D 3C 4S',0],
 ['highCard','2S 4H 7D 9C 13S',0],
 ['fiveKind','7S 7H 7D 7C X',200],
 ['straightFlush','10S 11S 12S 13S X',80],
 ['straightFlush','14S 2S 3S 4S X',80],
 ['straightFlush','5S 6S 8S 9S X',80],
 ['fourKind','7S 7H 7D 2C X',28],
 ['fullHouse','7S 7H 2D 2C X',12],
 ['flush','2H 5H 9H 13H X',8],
 ['straight','2S 3H 4D 5C X',6],
 ['straight','14S 2H 3D 4C X',6],
 ['straight','10S 11H 13D 14C X',6],
 ['threeKind','7S 7H 2D 4C X',2],
 ['onePair','2S 5H 9D 13C X',0],
 ['highCard','12S 13H 14D 2C 3S',0],
 ['onePair','2S 2H 3D 4C 5S',0],
 ['threeKind','14S 14H 2D 3C X',2]
];
for(const [id,spec,multiplier] of cases)test(`${id}: ${spec}`,()=>{const result=evaluateHand(hand(spec));assert.equal(result.id,id);assert.equal(result.multiplier,multiplier);assert.equal(result.jokerUsed,spec.includes('X'));assert.equal(payout(7,result),7*multiplier);});
test('invalid hands and bets rejected',()=>{for(const spec of ['2S 2S 3H 4H 5H','X X 2S 3H 4H','1S 2S 3H 4H 5H','2Z 3S 4H 5H 6H','2S 3S'])assert.throws(()=>evaluateHand(hand(spec)));for(const bet of [0,41,1.5])assert.throws(()=>payout(bet,evaluateHand(hand('10S 11S 12S 13S 14S'))));});
test('53 distinct cards, 1 joker, depletion',()=>{const deck=new Deck();const cards=Array.from({length:53},()=>deck.draw());assert.equal(new Set(cards.map(c=>JSON.stringify(c))).size,53);assert.equal(cards.filter(c=>c.joker).length,1);assert.throws(()=>deck.draw());});
test('joker two pair always upgrades to full house',()=>{assert.equal(evaluateHand(hand('2S 2H 3S 3H X')).id,'fullHouse');});
test('HIGH/LOW compares every pair; equal ranks lose',()=>{for(let reference=2;reference<=14;reference++)for(let rank=2;rank<=14;rank++)for(const choice of ['high','low']){const d=new DoubleDown(()=>{const cards=[card(reference,'S'),card(rank,'H')];return {draw:()=>cards.shift()};});assert.equal(d.start().rank,reference);const r=d.play(25,choice);assert.equal(r.win,(choice==='high'?rank>reference:rank<reference)?50:0);assert.equal(r.referenceCard.rank,reference);assert.throws(()=>d.play(25,choice));}assert.throws(()=>new DoubleDown().play(10,'bad'));});
function factory(spec){return ()=>{const cards=hand(spec).concat(hand('2C 3C 4C 5C 6C'));return {draw:()=>cards.shift()};};}
test('deal deducts once, held cards retained, draw once, collect once',()=>{const g=new GameState({deckFactory:factory('10S 11S 12S 13S 14S')});g.setBet(40);assert.equal(g.deal(),true);assert.equal(g.credit,960);assert.equal(g.deal(),false);for(let i=0;i<5;i++)g.toggleHold(i);g.setBet(2);assert.equal(g.bet,40);g.draw();assert.equal(g.win,20000);assert.equal(g.draw(),false);assert.equal(g.credit,960);g.collect();assert.equal(g.credit,20960);assert.equal(g.collect(),false);});
test('draw replaces only unheld using remaining deck',()=>{const g=new GameState({deckFactory:factory('10S 11S 12S 13S 14S')});g.deal();g.toggleHold(0);g.draw();assert.equal(g.hand[0].rank,10);assert.deepEqual(g.hand.slice(1).map(c=>c.rank),[2,3,4,5]);});
test('double reference, repeat, equal rank loss and collect protections',()=>{let rank=14;const g=new GameState({deckFactory:factory('10S 11S 12S 13S 14S'),doubleDown:new DoubleDown(()=>{const cards=[card(8,'S'),card(rank,'H')];return {draw:()=>cards.shift()};})});g.deal();for(let i=0;i<5;i++)g.toggleHold(i);g.draw();g.startDouble();assert.equal(g.doubleResult.referenceCard.rank,8);assert.equal(g.doubleResult.card,null);assert.equal(g.collect(),false);g.guess('high');assert.equal(g.win,1000);rank=2;g.startDouble();g.guess('low');assert.equal(g.win,2000);rank=8;g.startDouble();g.guess('high');assert.equal(g.win,0);assert.equal(g.phase,'lost');assert.equal(g.credit,999);assert.equal(g.collect(),false);assert.equal(g.guess('high'),false);});
test('insufficient credit, limits and safe integer doubling',()=>{const g=new GameState();g.setBet(100);assert.equal(g.bet,40);g.credit=20;assert.equal(g.deal(),false);g.setBet(-5);assert.equal(g.bet,1);g.phase='won';g.win=Number.MAX_SAFE_INTEGER;assert.equal(g.canDouble,false);assert.equal(g.startDouble(),false);g.phase='lost';g.credit=0;assert.equal(g.reset(),true);assert.equal(g.credit,1000);});

