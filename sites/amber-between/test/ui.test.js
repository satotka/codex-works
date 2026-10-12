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
test('DEAL immediately settles three cards and reload does not settle twice',()=>{
  const h=setup();h.nodes.get('plus-ten').onclick();h.nodes.get('main').onclick();
  assert.ok(['won','lost'].includes(h.state().phase));assert.equal(h.state().choices.length,1);assert.equal(h.state().rounds,1);
  const loaded=setup(h.data.get(KEY));assert.deepEqual(loaded.state(),h.state());
});
test('one coin enables DEAL and remaining one or two coins do not show refill',()=>{
  const h=setup();assert.equal(h.nodes.get('main').disabled,true);h.nodes.get('plus').onclick();
  assert.equal(h.nodes.get('main').disabled,false);h.nodes.get('main').onclick();assert.ok(['won','lost'].includes(h.state().phase));
  for(const credit of [1,2]){const low=setup(JSON.stringify({...engine.initial(),credit}));assert.equal(low.nodes.get('refill').hidden,true);low.nodes.get('plus').onclick();assert.equal(low.nodes.get('main').disabled,false);}
  assert.equal(setup(JSON.stringify({...engine.initial(),credit:0})).nodes.get('refill').hidden,false);
});
test('storage conflicts pause before action and do not overwrite newer data',()=>{
  const h=setup();const foreign=JSON.stringify({...engine.initial(),credit:888});h.data.set(KEY,foreign);h.nodes.get('plus').onclick();assert.equal(h.data.get(KEY),foreign);assert.equal(h.nodes.get('warning').hidden,false);assert.equal(h.nodes.get('reload').hidden,false);
});
test('legacy DEAL save resumes at card selection without a second deduction or shuffle',()=>{
  let s=engine.transition(engine.transition(engine.initial(),{type:'bet',amount:5}),{type:'deal'},()=>.5);
  s.deck=[...s.choices,...s.deck];s.choices=[];s.phase='dealt';s.selected=null;s.result=null;s.win=0;s.rounds=0;s.wins=0;
  const expected=s.deck.slice(0,5),credit=s.credit,base=s.base;
  assert.equal(engine.validState(s),true);
  const h=setup(JSON.stringify(s));assert.ok(['won','lost'].includes(h.state().phase));assert.deepEqual(h.state().choices,expected);assert.deepEqual(h.state().base,base);assert.equal(h.state().credit+(h.state().phase==='lost'?h.state().bet:0),credit);assert.equal(h.state().selected,0);assert.equal(h.state().rounds,1);
});
test('state-specific COLLECT, DOUBLE, LEFT and RIGHT keys include numpad controls',()=>{
  let winner=engine.transition(engine.transition(engine.initial(),{type:'bet',amount:5}),{type:'deal'},()=>.5);
  winner.base=[2,4];winner.choices=[3,0,1,6,7];winner.deck=Array.from({length:52},(_,i)=>i).filter(c=>![...winner.base,...winner.choices].includes(c));winner.phase='choose';winner.win=0;winner.result=null;winner.selected=null;winner.rounds=0;winner.wins=0;winner=engine.transition(winner,{type:'pick',index:0});
  const key=(h,value,code='Key'+value.toUpperCase())=>h.events.keydown({key:value,code,target:{tagName:'BODY'},preventDefault(){}});
  for(const value of ['a','4']){const h=setup(JSON.stringify(winner));key(h,value,value==='4'?'Numpad4':'KeyA');assert.equal(h.state().phase,'ready');assert.equal(h.state().paid,25);}
  for(const value of ['d','6']){const h=setup(JSON.stringify(winner));key(h,value,value==='6'?'Numpad6':'KeyD');assert.equal(h.state().phase,'double');assert.equal(h.nodes.get('double-cards').children[0].children[1].children.at(-1).textContent,'Q/7');assert.equal(h.nodes.get('double-cards').children[1].children[1].children.at(-1).textContent,'E/9');}
  const double=engine.transition(winner,{type:'double'},()=>.5);double.double=[0,12];
  for(const value of ['q','7','e','9']){const h=setup(JSON.stringify(double));key(h,value,/\d/.test(value)?'Numpad'+value:'Key'+value.toUpperCase());assert.equal(h.state().phase,['q','7'].includes(value)?'lost':'won');}

});
test('corrupt save is backed up; unavailable storage still supports play',()=>{
  const broken=setup('{broken');assert.ok([...broken.data.keys()].some(k=>k.startsWith(`${KEY}.backup.`)));assert.equal(broken.state().credit,1000);
  const offline=setup(null,true);offline.nodes.get('plus-ten').onclick();offline.nodes.get('main').onclick();assert.equal(offline.nodes.get('base').children.length,3);assert.equal(offline.nodes.get('save-status').textContent,'SAVE UNAVAILABLE');
});
test('offline artifact contains embedded code and no module imports',()=>{
  const html=readFileSync(new URL('../PLAY.html',import.meta.url),'utf8');assert.ok(html.includes('<style>'));assert.ok(html.includes('<script type="module">'));assert.ok(!html.includes('src="app.js"'));assert.ok(!/^import /m.test(html));
});
