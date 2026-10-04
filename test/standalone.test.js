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
  let testNow=1000;
  const testDate={now:()=>testNow+=1000};
  const context={Date:testDate,crypto:webcrypto,document:{getElementById:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn}};
  vm.runInNewContext(script,context);
  for(const suit of ['S','H','D','C'])for(let rank=2;rank<=10;rank++){
    const center=vm.runInContext(`cardCenter({rank:${rank},suit:'${suit}',joker:false});`,context);
    assert.equal((center.match(/class="pip(?: inverted)?"/g)||[]).length,rank);
  }
  for(const [rank,label] of [[11,'J'],[12,'Q'],[13,'K']]){
    const center=vm.runInContext(`cardCenter({rank:${rank},suit:'S',joker:false});`,context);
    assert.match(center,/class="court-art"/);assert.doesNotMatch(center,/<b>/);
  }
  assert.match(vm.runInContext(`cardCenter({rank:14,suit:'S',joker:false});`,context),/class="suit ace"/);
  node('sound').onclick(); // No audio API required when muted.
  for(const id of ['double','collect','high','low','deal','plus','minus','max','sound','reset'])node(id).click=()=>node(id).onclick();
  const keypad=code=>listeners.keydown({key:'Unidentified',code,target:{closest:()=>null},preventDefault(){}});
  keypad('NumpadAdd');assert.equal(node('bet').textContent,'1');keypad('NumpadSubtract');assert.equal(node('bet').textContent,'0');
  keypad('NumpadMultiply');assert.equal(node('bet').textContent,'1,000');
  assert.equal(node('max').textContent,'RELEASE');
  for(const id of ['plus','minus','plus-ten','minus-ten'])assert.equal(node(id).disabled,true);
  keypad('NumpadAdd');assert.equal(node('bet').textContent,'1,000');
  keypad('NumpadSubtract');assert.equal(node('bet').textContent,'1,000');
  keypad('NumpadMultiply');assert.equal(node('bet').textContent,'0');
  assert.equal(node('max').textContent,'MAX');
  vm.runInContext('game.setBet(1);render();',context);
  const press=(key,repeat=false)=>listeners.keydown({key,repeat,target:{closest:()=>null},preventDefault(){}});
  for(const phase of ['ready','lost']){
    vm.runInContext(`game.phase='${phase}';game.setBet(1);render();`,context);
    keypad('Numpad8');assert.equal(node('bet').textContent,'2');
    keypad('Numpad2');assert.equal(node('bet').textContent,'1');
    press('8');assert.equal(node('bet').textContent,'2');
    press('2');assert.equal(node('bet').textContent,'1');
  }
  press('w');assert.equal(node('bet').textContent,'2');
  press('s');assert.equal(node('bet').textContent,'1');
  press('S');assert.equal(node('bet').textContent,'0');vm.runInContext('game.setBet(1);render();',context);
  press('d');assert.equal(node('bet').textContent,'1');assert.match(node('deal').innerHTML,/DRAW/);
  vm.runInContext("game.phase='ready';game.credit=1000;render();",context);
  vm.runInContext('game.setBet(40);render();',context);
  press('W');assert.equal(node('bet').textContent,'41');
  vm.runInContext('game.setBet(1);render();',context);
  // Exercise the real evaluator through each HIGH input path, not a stubbed result.
  for(const input of ['w','W','h','Numpad8','mouse']){
    vm.runInContext("game.phase='won';game.win=25;game.doubleDown=new DoubleDown(()=>{const cards=[{rank:8,suit:'H',joker:false},{rank:14,suit:'S',joker:false}];return {draw:()=>cards.shift()};});render();",context);
    node('deal').onclick();
    assert.match(node('cards').innerHTML,/BASE/);
    if(input==='mouse')node('high').onclick();else if(input==='Numpad8')keypad(input);else press(input);
    assert.equal(node('win').textContent,'50');
    assert.match(node('message').innerHTML,/ダブル成功.*HIGHを選択：基準8 → 次A/);
    assert.doesNotMatch(node('message').innerHTML,/ダブル失敗/);
  }
  vm.runInContext("game.phase='won';game.win=25;game.doubleDown={start:()=>({rank:8,suit:'H',joker:false}),play:(win,choice)=>({choice,referenceCard:{rank:8,suit:'H',joker:false},card:{rank:14,suit:'S',joker:false},outcome:choice==='high'?'win':'lose',win:choice==='high'?win*2:0})};render();",context);
  keypad('Numpad6');assert.equal(node('double-panel').hidden,false);
  keypad('Numpad8');assert.equal(node('win').textContent,'50');
  press('d',true);assert.equal(node('double-panel').hidden,true);
  keypad('Numpad4');assert.equal(node('credit').textContent,'1,050');assert.equal(node('win').textContent,node('win-label').textContent==='PAID'?'50':'0');
  assert.equal((node('cards').innerHTML.match(/class="card back/g)||[]).length,5);
  assert.equal(vm.runInContext('game.result',context),null);
  assert.equal(vm.runInContext('game.held.some(Boolean)',context),false);
  assert.match(node('message').innerHTML,/50を獲得しました/);
  assert.match(node('deal').innerHTML,/DEAL/);
  press('c');assert.equal(node('credit').textContent,'1,050');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('D');press('W');assert.equal(node('win').textContent,'50');
  press('A');assert.equal(node('credit').textContent,'1,100');assert.equal(node('win').textContent,'50');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('d');press('S');assert.equal(node('win').textContent,'0');
  vm.runInContext("game.phase='won';game.win=25;render();",context);
  press('6');press('2');assert.equal(node('win').textContent,'0');assert.equal(node('deal').disabled,true);
  vm.runInContext('game.credit=1000;game.setBet(1);render();',context);
  keypad('Numpad0');press('0');assert.equal(node('credit').textContent,'999');
  keypad('Numpad6');assert.equal(node('credit').textContent,'999');assert.match(node('deal').innerHTML,/DRAW/);
  vm.runInContext('game.held.fill(false);render();',context);
  node('cards').onclick({target:{closest:()=>({dataset:{index:'0'}})}});assert.match(node('cards').innerHTML,/held/);
  keypad('Numpad6');assert.match(node('deal').innerHTML,/DEAL|DOUBLE/);
  if(!node('collect').disabled)node('collect').onclick();
  assert.equal(node('deal').disabled,true);
  vm.runInContext("game.credit=0;game.bet=0;game.phase='lost';render();",context);
  keypad('NumpadDecimal');assert.equal(node('credit').textContent,'1,000');
  for(const [key,code] of [['d','KeyD'],['D','KeyD'],['6','Digit6'],['Unidentified','Numpad6']]){
    const main=(repeat=false)=>listeners.keydown({key,code,repeat,target:{closest:()=>null},preventDefault(){this.prevented=true;}});
    vm.runInContext("game.phase='ready';game.credit=1000;game.bet=0;game.setBet(1);render();",context);
    main();assert.match(node('deal').innerHTML,/DRAW/);assert.equal(node('credit').textContent,'999');
    const holdingCards=node('cards').innerHTML;main(true);assert.equal(node('cards').innerHTML,holdingCards);
    main();assert.match(node('deal').innerHTML,/DEAL|DOUBLE/);
    vm.runInContext("game.phase='won';game.win=25;render();",context);
    assert.match(node('deal').innerHTML,/DOUBLE/);
    main();assert.equal(node('double-panel').hidden,false);
    main();assert.equal(node('double-panel').hidden,false); // Cannot skip HIGH/LOW.
    main(true);assert.equal(node('double-panel').hidden,false);
  }
  const storage={value:null,getItem(){return this.value;},setItem(key,value){this.value=value;}};
  context.localStorage=storage;
  vm.runInContext("storage=globalThis.localStorage;game.phase='ready';game.credit=321;game.bet=0;game.setBet(1);game.win=0;game.doubleResult=null;render();",context);
  node('deal').onclick();keypad('Numpad3');
  const previousCards=node('cards').innerHTML;
  const reopenedNodes=new Map();
  const reopenedNode=id=>{if(!reopenedNodes.has(id))reopenedNodes.set(id,{innerHTML:'',textContent:'',disabled:false,hidden:false,setAttribute(){}});return reopenedNodes.get(id);};
  const reopened={Date:testDate,crypto:webcrypto,localStorage:storage,document:{getElementById:reopenedNode,querySelectorAll:()=>[],addEventListener(){}}};
  vm.runInNewContext(script,reopened);
  assert.equal(reopenedNode('credit').textContent,'320');
  assert.equal(reopenedNode('cards').innerHTML,previousCards);
  assert.match(reopenedNode('deal').innerHTML,/DRAW/);
  assert.equal(reopenedNode('sound').textContent,'SOUND OFF');
  assert.match(reopenedNode('save-status').textContent,/自動保存 ON/);
  reopenedNode('deal').onclick();vm.runInContext('storage=undefined;session.storage=undefined;',context);node('deal').onclick();
  assert.equal(reopenedNode('cards').innerHTML,node('cards').innerHTML);
  assert.equal(reopenedNode('win').textContent,node('win').textContent);
  vm.runInContext("game.phase='won';game.win=25;game.doubleDown=new DoubleDown(()=>{const deck=new Deck({includeJoker:false,random:()=>0.5});deck.cards=deck.cards.filter(c=>!(c.rank===8&&['S','H'].includes(c.suit)));deck.cards.push(card(8,'H'),card(8,'S'));return deck;});render();",reopened);
  const beforeTie=Number(reopenedNode('credit').textContent.replaceAll(',',''));
  reopenedNode('deal').onclick();reopenedNode('high').onclick();
  assert.equal(Number(reopenedNode('credit').textContent.replaceAll(',','')),beforeTie+25);
  assert.equal(reopenedNode('win').textContent,'25');
  assert.equal(reopenedNode('win-label').textContent,'PAID');
  assert.match(reopenedNode('message').innerHTML,/TIE.*引き分け.*獲得しました/);
  assert.match(reopenedNode('cards').innerHTML,/BASE/);
  vm.runInNewContext(script,{Date:testDate,crypto:webcrypto,localStorage:storage,document:{getElementById:reopenedNode,querySelectorAll:()=>[],addEventListener(){}}});
  assert.equal(Number(reopenedNode('credit').textContent.replaceAll(',','')),beforeTie+25);
  assert.match(reopenedNode('message').innerHTML,/TIE.*引き分け.*獲得しました/);
  assert.match(reopenedNode('cards').innerHTML,/BASE/);
  assert.equal(reopenedNode('collect').disabled,true);
});

