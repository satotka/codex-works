import test from 'node:test';
import assert from 'node:assert/strict';
import {card,joker} from '../src/card.js';
import {GameState} from '../src/game-state.js';
import {roleCardIndices} from '../src/hand-evaluator.js';
test('only the cards forming pairs or sets are highlighted',()=>{
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),card(2,'D'),card(4,'C'),card(9,'S')]),[0,1]);
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),card(2,'D'),card(2,'C'),card(9,'S')]),[0,1,2,3]);
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),card(7,'D'),card(4,'C'),card(9,'S')]),[0,1,2]);
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),card(7,'D'),card(7,'C'),card(9,'S')]),[0,1,2,3]);
  assert.deepEqual(roleCardIndices([card(2,'S'),card(4,'H'),card(7,'D'),card(9,'C'),card(13,'S')]),[]);
});
test('straights, full houses and joker substitutions highlight contributing cards',()=>{
  assert.deepEqual(roleCardIndices([card(2,'S'),card(3,'H'),card(4,'D'),card(5,'C'),card(6,'S')]),[0,1,2,3,4]);
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),card(7,'D'),card(2,'C'),card(2,'S')]),[0,1,2,3,4]);
  assert.deepEqual(roleCardIndices([card(7,'S'),card(7,'H'),joker(),card(2,'C'),card(9,'S')]),[0,1,2]);
});

test("initial pair is held automatically and can be released",()=>{const cards=[card(7,"S"),card(7,"H"),card(2,"D"),card(4,"C"),card(9,"S")];const game=new GameState({deckFactory:()=>({draw:()=>cards.shift()})});game.deal();assert.deepEqual(game.held,[true,true,false,false,false]);game.toggleHold(0);assert.deepEqual(game.held,[false,true,false,false,false]);});
