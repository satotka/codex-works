import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const script=readFileSync(new URL('../PLAY.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
for(const reduced of [false,true])test(`NEXT to BASE transfer, reduced motion=${reduced}`,()=>{
  const nodes=new Map(),animations=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',setAttribute(){}});return nodes.get(id);};
  const cards={1:{left:100,top:50},3:{left:300,top:50}};
  node('cards').querySelector=selector=>{const index=selector.includes('"1"')?1:3;return {getBoundingClientRect:()=>cards[index],animate:(frames,options)=>{const animation={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;}};};
  const context=vm.createContext({crypto:webcrypto,matchMedia:query=>({matches:query.includes('reduced-motion')&&reduced,addEventListener(){}}),document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){}}});
  vm.runInContext(script,context);
  vm.runInContext("game.phase='won';game.win=20;game.doubleResult={outcome:'win',card:card(14,'S')};startDoubleWithTransfer();",context);
  assert.equal(vm.runInContext('game.phase',context),'double');
  assert.equal(vm.runInContext('game.doubleResult.referenceCard.rank',context),14);
  assert.equal(animations.length,reduced?0:2);
  if(!reduced){assert.equal(animations[0].frames[0].transform,'translate(200px, 0px)');assert.equal(animations[0].frames.at(-1).transform,'translate(0, 0)');vm.runInContext('render()',context);assert.ok(animations.every(a=>a.cancelled));}
});

test('status and result stay separate from optional guide text',()=>{
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',setAttribute(){}});return nodes.get(id);};
  const context=vm.createContext({crypto:webcrypto,document:{getElementById:node,querySelectorAll:()=>[],addEventListener(){}}});vm.runInContext(script,context);
  for(const [phase,status,result] of [['ready','PLEASE BET',''],['hold','SELECT CARDS',''],['won','DOUBLE UP?','WIN 123'],['double','HIGH/LOW',''],['lost','PLEASE BET','NO WIN']]){
    vm.runInContext(`game.phase='${phase}';game.win=123;game.doubleResult=null;render();`,context);
    assert.equal(node('message').innerHTML,`<strong>${status}</strong><span class="result-status">${result}</span>`);
    const before=node('message').innerHTML;vm.runInContext('guideEnabled=false;render()',context);assert.equal(node('message').innerHTML,before);assert.equal(node('guide-message').hidden,true);assert.equal(node('guide-message').innerHTML,'');vm.runInContext('guideEnabled=true;render()',context);assert.equal(node('guide-message').hidden,false);
  }
});
