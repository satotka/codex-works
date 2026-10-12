import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/engine.js';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
const KEY='amber-between.state.v1';
function setup(saved=null,fail=false){
  const nodes=new Map(),events={},windowEvents={},data=new Map(saved===null?[]:[[KEY,saved]]);
  function node(){return {children:[],hidden:false,disabled:false,tagName:'BUTTON',attrs:{},textContent:'',innerHTML:'',append(...x){this.children.push(...x);},replaceChildren(...x){this.children=[...x];},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this[k]=v;}};}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,addEventListener(k,v){events[k]=v;}};
  const localStorage={getItem:k=>{if(fail)throw Error('storage denied');return data.get(k)??null;},setItem:(k,v)=>{if(fail)throw Error('storage denied');data.set(k,v);},removeItem:k=>data.delete(k)};
  vm.runInNewContext(source,{...engine,document,localStorage,window:{addEventListener:(k,v)=>windowEvents[k]=v},location:{reload(){}},matchMedia:()=>({matches:false}),crypto:{getRandomValues:a=>{a[0]=2147483648;}},Uint32Array,console});
  return {nodes,data,events,windowEvents,localStorage,state:()=>JSON.parse(data.get(KEY))};
}
test('UI progresses through DEAL / DRAW / card selection and prevents duplicate selection',()=>{
  const h=setup();h.nodes.get('plus-ten').onclick();assert.equal(h.state().credit,990);h.nodes.get('main').onclick();assert.equal(h.state().phase,'dealt');h.nodes.get('main').onclick();assert.equal(h.state().phase,'choose');
  const chosen=h.nodes.get('choices').children[2].children[1];chosen.click();assert.equal(h.state().selected,2);assert.ok(['won','lost'].includes(h.state().phase));const once=h.data.get(KEY);chosen.click();assert.equal(h.data.get(KEY),once);
  assert.equal(h.nodes.get('choices').children.length,5);
});
test('one coin enables DEAL and remaining one or two coins do not show refill',()=>{
  const h=setup();assert.equal(h.nodes.get('main').disabled,true);h.nodes.get('plus').onclick();
  assert.equal(h.nodes.get('main').disabled,false);h.nodes.get('main').onclick();assert.equal(h.state().phase,'dealt');
  for(const credit of [1,2]){const low=setup(JSON.stringify({...engine.initial(),credit}));assert.equal(low.nodes.get('refill').hidden,true);low.nodes.get('plus').onclick();assert.equal(low.nodes.get('main').disabled,false);}
  assert.equal(setup(JSON.stringify({...engine.initial(),credit:0})).nodes.get('refill').hidden,false);
});
test('restored choices remain hidden until pick; restored WIN is collected once',()=>{
  const h=setup();h.nodes.get('plus-ten').onclick();h.nodes.get('main').onclick();h.nodes.get('main').onclick();const loaded=setup(h.data.get(KEY));assert.equal(loaded.state().phase,'choose');assert.ok(loaded.nodes.get('choices').children.every(slot=>slot.children[1].className.includes('back')));
  let s=engine.initial();s=engine.transition(s,{type:'bet',amount:5});s=engine.transition(s,{type:'deal'},()=>.5);s.base=[2,4];s.choices=[3,0,1,6,7];s.deck=Array.from({length:52},(_,i)=>i).filter(c=>![...s.base,...s.choices].includes(c));s.phase='choose';s=engine.transition(s,{type:'pick',index:0});
  const winner=setup(JSON.stringify(s));winner.nodes.get('collect').onclick();const balance=winner.state().credit;winner.nodes.get('collect').onclick();assert.equal(winner.state().credit,balance);
});
test('storage conflicts pause before action and do not overwrite newer data',()=>{
  const h=setup();const foreign=JSON.stringify({...engine.initial(),credit:888});h.data.set(KEY,foreign);h.nodes.get('plus').onclick();assert.equal(h.data.get(KEY),foreign);assert.equal(h.nodes.get('warning').hidden,false);assert.equal(h.nodes.get('reload').hidden,false);
});
test('corrupt save is backed up; unavailable storage still supports play',()=>{
  const broken=setup('{broken');assert.ok([...broken.data.keys()].some(k=>k.startsWith(`${KEY}.backup.`)));assert.equal(broken.state().credit,1000);
  const offline=setup(null,true);offline.nodes.get('plus-ten').onclick();offline.nodes.get('main').onclick();assert.equal(offline.nodes.get('main').textContent,'DRAW');assert.equal(offline.nodes.get('save-status').textContent,'SAVE UNAVAILABLE');
});
test('offline artifact contains embedded code and no module imports',()=>{
  const html=readFileSync(new URL('../PLAY.html',import.meta.url),'utf8');assert.ok(html.includes('<style>'));assert.ok(html.includes('<script type="module">'));assert.ok(!html.includes('src="app.js"'));assert.ok(!/^import /m.test(html));
});
