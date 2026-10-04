export const horses=[
{name:'アンバーキング',style:'先行',color:'#c25a43',weight:1.25},
{name:'ミッドナイト',style:'追込',color:'#657db1',weight:1.08},
{name:'ゴールドラッシュ',style:'逃げ',color:'#bf9640',weight:1.18},
{name:'ハルカゼ',style:'先行',color:'#649473',weight:1},
{name:'ネオンスター',style:'追込',color:'#9875ab',weight:.86},
{name:'コハクノユメ',style:'逃げ',color:'#bda687',weight:.78}];
export function makeRace(rng=Math.random){const field=horses.map((h,i)=>({...h,id:i,form:Math.floor(rng()*3),power:h.weight*(.85+rng()*.3)}));field.forEach(h=>h.power*=[1,1.12,.92][h.form]);const sum=field.reduce((a,h)=>a+h.power,0);field.forEach(h=>{h.win=Math.round(Math.max(1.5,.86*sum/h.power)*10)/10;h.place=Math.round(Math.max(1.1,h.win*.38)*10)/10;h.time=27+6*(1-Math.exp(-(-Math.log(Math.max(.000001,rng()))/h.power)*.5));h.wave=rng()*6.28});return field}
export function position(h,t){const q=Math.min(1,t/h.time);const bend=h.style==='逃げ'?.10:h.style==='追込'?-.11:.025;return Math.max(0,Math.min(1,q+bend*Math.sin(Math.PI*q)+.012*Math.sin(q*18+h.wave)*Math.sin(Math.PI*q)))}
export function settle(field,tickets){const order=[...field].sort((a,b)=>a.time-b.time||a.id-b.id);let payout=0;let hit=false;for(const ticket of tickets){const rank=order.findIndex(h=>h.id===ticket.id);if(ticket.type==='win'?rank===0:rank<2){hit=true;payout+=Math.floor(ticket.amount*field[ticket.id][ticket.type])}}return {order,payout,hit}}
