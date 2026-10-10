import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const script=()=>readFileSync(new URL('../PLAY.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(storage,navigator){
  const nodes=new Map(),listeners={};let now=1000;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',disabled:false,hidden:false,attrs:{},setAttribute(key,value){this.attrs[key]=value;}});return nodes.get(id);};
  const context=vm.createContext({crypto:webcrypto,localStorage:storage,navigator,Date:{now:()=>now},document:{getElementById:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn}});
  vm.runInContext(script(),context);return {node,context,listeners,advance:ms=>now+=ms};
}
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('stale tab cannot overwrite credit through sound or game input',()=>{
  const storage=memory(),a=setup(storage),b=setup(storage);
  vm.runInContext('game.credit=1400;render();',a.context);
  const saved=storage.getItem('amber-poker.state.v1');b.node('sound').onclick();b.node('deal').onclick();
  assert.equal(storage.getItem('amber-poker.state.v1'),saved);assert.equal(b.node('play-area').inert,true);assert.equal(b.node('session-warning').hidden,false);
});
test('DRAW blocks immediate mouse and keyboard DOUBLE but accepts a later input',()=>{
  const tab=setup();
  vm.runInContext("game.bet=1;game.phase='hold';game.hand=[10,11,12,13,14].map(rank=>card(rank,'S'));game.held.fill(true);",tab.context);
  tab.node('deal').onclick();assert.equal(vm.runInContext('game.phase',tab.context),'won');
  tab.node('deal').onclick();assert.equal(vm.runInContext('game.phase',tab.context),'won');
  tab.node('deal').click=()=>tab.node('deal').onclick();
  tab.listeners.keydown({key:'d',code:'KeyD',target:{closest:()=>null},preventDefault(){}});
  assert.equal(vm.runInContext('game.phase',tab.context),'won');
  tab.advance(651);tab.node('deal').onclick();assert.equal(vm.runInContext('game.phase',tab.context),'double');
});
test('corrupt save is backed up and recovery is disclosed; failed backup preserves original',()=>{
  const storage=memory();storage.setItem('amber-poker.state.v1','{broken');const tab=setup(storage);
  assert.equal(storage.getItem('amber-poker.state.v1.backup.1000'),'{broken');assert.match(tab.node('save-status').textContent,/退避/);
  const denied={getItem:()=>'{broken',setItem(){throw Error('quota');}};const protectedTab=setup(denied);
  assert.equal(protectedTab.node('play-area').inert,true);assert.match(protectedTab.node('session-text').textContent,/元データを保護/);
});
test('HOLD updates the same button without replacing focused card DOM',()=>{
  const tab=setup();tab.node('plus').onclick();tab.node('deal').onclick();vm.runInContext('game.held.fill(false);render();',tab.context);
  const button={classList:{toggle(){}},setAttribute(){},parentElement:{querySelector:()=>({textContent:''})}};
  const cards=tab.node('cards'),original=cards.innerHTML;cards.querySelector=()=>button;
  tab.listeners.keydown({key:'2',code:'Numpad2',target:{closest:()=>null},preventDefault(){}});
  assert.equal(cards.innerHTML,original);assert.equal(cards.querySelector(),button);assert.equal(vm.runInContext('game.held[1]',tab.context),true);
});
test('web lock owner plays while another tab is paused',async()=>{
  let held=false;
  const navigator={locks:{async request(name,options,callback){if(held)return callback(null);held=true;return callback({name});}}};
  const storage=memory(),a=setup(storage,navigator),b=setup(storage,navigator);
  await Promise.resolve();
  assert.equal(a.node('play-area').inert,false);assert.equal(b.node('play-area').inert,true);
  const saved=storage.getItem('amber-poker.state.v1');b.node('sound').onclick();assert.equal(storage.getItem('amber-poker.state.v1'),saved);
});
test('only D and 6 are main shortcuts; guide preference survives reload',()=>{
  const storage=memory(),tab=setup(storage);
  for(const [key,code] of [[' ','Space'],['Enter','Enter'],['Enter','NumpadEnter']]){
    tab.listeners.keydown({key,code,target:{closest:()=>null},preventDefault(){}});
    assert.equal(vm.runInContext('game.phase',tab.context),'ready');
  }
  assert.equal(tab.node('deal').attrs['data-key-hint'],'D / 6');
  assert.equal(tab.node('high').attrs['data-key-hint'],'W / 8');
  tab.node('guide').onclick();assert.equal(tab.node('deal').attrs['data-key-hint'],'');assert.equal(storage.getItem('amber-poker.guide'),'off');
  const reopened=setup(storage);assert.match(reopened.node('guide').innerHTML,/guide-off/);
  assert.doesNotMatch(reopened.node('message').innerHTML,/主操作キー/);
  reopened.node('plus').onclick();
  reopened.node('deal').click=()=>reopened.node('deal').onclick();
  reopened.listeners.keydown({key:'Unidentified',code:'Numpad6',target:{closest:()=>null},preventDefault(){}});
  assert.equal(vm.runInContext('game.phase',reopened.context),'hold');
  assert.equal(reopened.node('deal').innerHTML,'DRAW');
});
test('full restart requires confirmation and persists clean initial state',()=>{
 const storage=memory(),tab=setup(storage);
 vm.runInContext("game.credit=300;game.bet=20;game.win=80;game.phase='won';sound.enabled=false;guideEnabled=false;render();globalThis.confirm=()=>false;",tab.context);
 tab.node('restart-game').onclick();assert.equal(vm.runInContext('game.credit',tab.context),300);
 vm.runInContext('globalThis.confirm=()=>true;',tab.context);tab.node('restart-game').onclick();
 const saved=JSON.parse(storage.getItem('amber-poker.state.v1'));
 assert.equal(saved.credit,1000);assert.equal(saved.bet,0);assert.equal(saved.win,0);assert.equal(saved.phase,'ready');assert.deepEqual(saved.hand,[]);assert.deepEqual(saved.held,[false,false,false,false,false]);assert.equal(saved.doubleResult,null);assert.equal(saved.soundEnabled,true);assert.equal(storage.getItem('amber-poker.guide'),'on');
 const restored=setup(storage);assert.equal(restored.node('credit').textContent,'1,000');assert.equal(restored.node('bet').textContent,'0');
});

test('guide off uses concise English in every game state',()=>{
  const {node,context}=setup();node('guide').onclick();
  for(const phase of ['ready','hold','won','lost','double']){
    vm.runInContext(`game.phase='${phase}';game.win=${phase==='won'||phase==='double'?15:0};game.doubleResult=${phase==='double'?"{referenceCard:card(8,'S'),card:null}":'null'};render();`,context);
    assert.doesNotMatch(node('message').innerHTML,/[ぁ-んァ-ヶ一-龯]/);
    assert.equal(node('controls-help').hidden,true);
    assert.equal(node('hint').hidden,true);
    assert.doesNotMatch(node('save-status').textContent,/[ぁ-んァ-ヶ一-龯]/);
  }
  assert.match(node('message').innerHTML,/HIGH \/ LOW/);
  node('guide').onclick();assert.match(node('message').innerHTML,/高いと思ったら/);assert.equal(node('controls-help').hidden,false);
});
