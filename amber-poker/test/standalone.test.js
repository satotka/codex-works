import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
test('standalone HTML runs without server: deal, hold, draw, collect and next game',async()=>{
  const html=await readFile(new URL('../PLAY.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.doesNotMatch(html,/<link[^>]+stylesheet/);
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',disabled:false,hidden:false,setAttribute(){}});return nodes.get(id);};
  const listeners={};
  const context={crypto:webcrypto,document:{getElementById:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn}};
  vm.runInNewContext(script,context);
  for(const suit of ['S','H','D','C'])for(let rank=2;rank<=10;rank++){
    const center=vm.runInContext(`cardCenter({rank:${rank},suit:'${suit}',joker:false});`,context);
    assert.equal((center.match(/class="pip(?: inverted)?"/g)||[]).length,rank);
  }
  for(const [rank,label] of [[11,'J'],[12,'Q'],[13,'K']]){
    const center=vm.runInContext(`cardCenter({rank:${rank},suit:'S',joker:false});`,context);
    assert.match(center,new RegExp(`<b>${label}</b>`));
  }
  assert.match(vm.runInContext(`cardCenter({rank:14,suit:'S',joker:false});`,context),/class="suit ace"/);
  node('sound').onclick(); // No audio API required when muted.
  for(const id of ['double','collect','high','low','deal','plus','minus','max','sound','reset'])node(id).click=()=>node(id).onclick();
  const keypad=code=>listeners.keydown({key:'Unidentified',code,target:{closest:()=>null},preventDefault(){}});
  keypad('NumpadAdd');assert.equal(node('bet').textContent,'2');keypad('NumpadSubtract');assert.equal(node('bet').textContent,'1');
  keypad('NumpadMultiply');assert.equal(node('bet').textContent,'40');
  vm.runInContext('game.setBet(1);render();',context);
  const press=(key,repeat=false)=>listeners.keydown({key,repeat,target:{closest:()=>null},preventDefault(){}});
  press('w');assert.equal(node('bet').textContent,'2');
  press('s');assert.equal(node('bet').textContent,'1');
  press('S');assert.equal(node('bet').textContent,'1');
  press('d');assert.equal(node('bet').textContent,'1');assert.match(node('deal').innerHTML,/DRAW/);
  vm.runInContext("game.phase='ready';game.credit=1000;render();",context);
  vm.runInContext('game.setBet(40);render();',context);
  press('W');assert.equal(node('bet').textContent,'40');
  vm.runInContext('game.setBet(1);render();',context);
  // Exercise the real evaluator through each HIGH input path, not a stubbed result.
  for(const input of ['w','W','h','Numpad8','mouse']){
    vm.runInContext("game.phase='won';game.win=25;game.doubleDown=new DoubleDown(()=>{const cards=[{rank:8,suit:'H',joker:false},{rank:14,suit:'S',joker:false}];return {draw:()=>cards.shift()};});render();",context);
    node('double').onclick();
    assert.match(node('cards').innerHTML,/基準カード/);
    if(input==='mouse')node('high').onclick();else if(input==='Numpad8')keypad(input);else press(input);
    assert.equal(node('win').textContent,'50');
    assert.match(node('message').textContent,/選択: HIGH · 基準 8 → 次 A.*DOUBLE WIN/);
    assert.doesNotMatch(node('message').textContent,/DOUBLE LOST/);
  }
  vm.runInContext("game.phase='won';game.win=25;game.doubleDown={start:()=>({rank:8,suit:'H',joker:false}),play:(win,choice)=>({referenceCard:{rank:8,suit:'H',joker:false},card:{rank:14,suit:'S',joker:false},outcome:choice==='high'?'win':'lose',win:choice==='high'?win*2:0})};render();",context);
  keypad('Numpad6');assert.equal(node('double-panel').hidden,false);
  keypad('Numpad8');assert.equal(node('win').textContent,'50');
  press('d',true);assert.equal(node('double-panel').hidden,true);
  keypad('Numpad4');assert.equal(node('credit').textContent,'1,050');assert.equal(node('win').textContent,'0');
  press('c');assert.equal(node('credit').textContent,'1,050');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('D');press('W');assert.equal(node('win').textContent,'50');
  press('A');assert.equal(node('credit').textContent,'1,100');assert.equal(node('win').textContent,'0');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('d');press('S');assert.equal(node('win').textContent,'0');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('6');press('2');assert.equal(node('win').textContent,'0');assert.equal(node('double').disabled,true);
  vm.runInContext('game.credit=1000;render();',context);
  keypad('Numpad0');assert.equal(node('credit').textContent,'999');assert.match(node('deal').innerHTML,/DRAW/);
  node('cards').onclick({target:{closest:()=>({dataset:{index:'0'}})}});assert.match(node('cards').innerHTML,/held/);
  keypad('NumpadEnter');assert.match(node('deal').innerHTML,/DEAL/);
  if(!node('collect').disabled)node('collect').onclick();
  assert.equal(node('deal').disabled,false);
  vm.runInContext("game.credit=0;game.phase='lost';render();",context);
  keypad('NumpadDecimal');assert.equal(node('credit').textContent,'1,000');
  for(const key of ['d','D',' ']){
    vm.runInContext("game.phase='ready';game.credit=1000;game.setBet(1);render();",context);
    press(key);assert.match(node('deal').innerHTML,/DRAW/);assert.equal(node('credit').textContent,'999');
    press(key);assert.match(node('deal').innerHTML,/DEAL/);
    vm.runInContext("game.phase='won';game.win=25;render();",context);
    press(key);assert.equal(node('double-panel').hidden,false);
    press(key);assert.equal(node('double-panel').hidden,false); // Cannot skip HIGH/LOW.
    press(key,true);assert.equal(node('double-panel').hidden,false);
  }
});



