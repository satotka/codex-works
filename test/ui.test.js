import test from 'node:test';
import assert from 'node:assert/strict';
test('UI wiring: bet, deal, hold/release, draw, sound and next game',async()=>{
  const nodes=new Map(),listeners={};
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',disabled:false,hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;}});return nodes.get(id);};
  globalThis.document={getElementById:node,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn};
  await import('../src/ui.js');
  node('sound').onclick();assert.equal(node('sound').textContent,'SOUND OFF');
  node('max').onclick();assert.equal(node('bet').textContent,'40');
  node('minus').onclick();assert.equal(node('bet').textContent,'39');
  node('plus').onclick();assert.equal(node('bet').textContent,'40');
  assert.equal(node('double').disabled,true);assert.equal(node('collect').disabled,true);
  node('deal').onclick();assert.equal(node('credit').textContent,'960');assert.match(node('deal').innerHTML,/DRAW/);assert.equal(node('plus').disabled,true);
  const hold=()=>node('cards').onclick({target:{closest:()=>({dataset:{index:'0'}})}});
  hold();assert.match(node('cards').innerHTML,/held/);hold();assert.doesNotMatch(node('cards').innerHTML,/class="card [^"]*held/);
  const event=(key,code,repeat=false)=>({key,code,repeat,target:{closest:selector=>selector.includes('button')?{}:null},preventDefault(){this.prevented=true;}});
  for(let i=1;i<=5;i++){
    const on=event(String(i),`Digit${i}`);listeners.keydown(on);assert.equal(on.prevented,true);
    assert.equal((node('cards').innerHTML.match(/class="card [^"]*held/g)||[]).length,1);
    const heldHtml=node('cards').innerHTML;listeners.keydown(event(String(i),`Digit${i}`,true));assert.equal(node('cards').innerHTML,heldHtml);
    listeners.keydown(event(String(i),`Numpad${i}`));assert.doesNotMatch(node('cards').innerHTML,/class="card [^"]*held/);
  }
  listeners.keydown(event('2','Digit2'));assert.match(node('cards').innerHTML,/held/);
  node('deal').click=()=>node('deal').onclick();
  const space=event(' ','Space');listeners.keydown(space);assert.equal(space.prevented,true);assert.match(node('deal').innerHTML,/DEAL/);
  const afterDraw=node('cards').innerHTML;listeners.keydown(event(' ','Space',true));assert.equal(node('cards').innerHTML,afterDraw);
  if(!node('collect').disabled)node('collect').onclick();
  assert.equal(node('deal').disabled,false);assert.equal(node('plus').disabled,true); // MAX remains selected.
  assert.equal(node('minus').disabled,false);
  node('deal').onclick();assert.match(node('deal').innerHTML,/DRAW/);
  delete globalThis.document;
});
