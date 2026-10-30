// Model and input event tests with renderer stubs; actual browser/device testing remains required.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));
const noop=()=>{};function eventTarget(o){const listeners={};o.addEventListener=(name,fn)=>(listeners[name]??=[]).push(fn);o.fire=(name,event={})=>(listeners[name]||[]).forEach(fn=>fn({preventDefault:noop,...event}));return o;}const ctx=new Proxy({measureText:()=>({width:100}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();function elem(){return eventTarget({style:{},dataset:{},children:[],classList:{add:noop,remove:noop},append:noop,appendChild:noop,before:noop,after:noop,addEventListener:noop,setAttribute:noop,getAttribute:()=> 'false',getContext:()=>ctx,clientWidth:900,clientHeight:600,setPointerCapture:noop});}const document={createElement:elem,createElementNS:elem,head:elem(),documentElement:elem(),getElementById:id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},querySelectorAll:()=>[],addEventListener:noop};
eventTarget(document);const c={console,document,window:{devicePixelRatio:1,addEventListener:noop},matchMedia:()=>({matches:false,addEventListener:noop}),getComputedStyle:()=>({getPropertyValue:()=> '#eeeeee'}),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop};eventTarget(c.window);c.__sunKey="pm";vm.createContext(c);vm.runInContext(scripts.find(s=>s.includes('const e="147"')),c);c.THREE.WebGLRenderer=class{constructor(){this.domElement=elem();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}setPixelRatio(){}setSize(){}render(){}};
for(const s of scripts.filter(s=>s.includes('class OrbitControls')||s.includes('// This set of controls')||s.includes('class CSS2DObject')))vm.runInContext(s,c);
let app=scripts[scripts.length-1].replace('requestAnimationFrame(loop);\n})();','window.test={tourDoors,tourBounds,nearestTourDoor,toggleTourDoor,doorHitsBody,applyTourDoor,doorButton,help,movePad,lookPad,renderer,turnWalk,walk,enterWalk,exitWalk,canStand,supportedHeight,updateWalk,scene,camera,controls};\n})();');vm.runInContext(app,c);const t=c.window.test;assert(t);assert.equal(t.tourDoors.length,13,'11 ground-floor doors + 2 terrace sliding leaves');
const key=(extra={})=>c.window.fire('keydown',{code:'KeyE',target:{tagName:'CANVAS'},...extra});
key();assert(t.tourDoors.every(d=>!d.open),'E outside tour ignored');
t.enterWalk();
Object.assign(t.walk,{x:t.tourDoors[1].anchor.x,z:t.tourDoors[1].anchor.z,y:4.7});
assert.equal(t.nearestTourDoor(),null,'cannot operate downstairs doors from upstairs');
for(const door of t.tourDoors.filter(d=>d.anchor.y<2)){
  const m=door.meshes[0];assert(m.visible,'doors stay visible during tour');
  Object.assign(t.walk,{x:door.anchor.x,z:door.anchor.z+.6,y:.815});
  // Use the free side of each door (axis z leaves need x offset).
  if(door.slide||m.geometry.parameters.depth>m.geometry.parameters.width){t.walk.x+=.6;t.walk.z=door.anchor.z;}
  assert.equal(t.nearestTourDoor(),door,'nearest leaf selected');
  const safe={x:t.walk.x,z:t.walk.z};
  key({repeat:true});assert(!door.open,'holding E does not repeat');
  key({target:{tagName:'INPUT'}});assert(!door.open,'typing ignored');
  key();assert(door.open,'E opens leaf');
  assert(!t.doorHitsBody(m,door.anchor.x,door.anchor.z,.815),'open doorway clear');
  assert(t.canStand(door.anchor.x,door.anchor.z,.815),'visitor can cross open doorway');
  assert(t.tourBounds.find(e=>e.m===m).b.equals(new c.THREE.Box3().setFromObject(m)),'bounds refreshed');
  // Standing in the doorway prevents closing onto the visitor.
  Object.assign(t.walk,{x:door.anchor.x,z:door.anchor.z});key();assert(door.open,'close onto body rejected');
  Object.assign(t.walk,safe);key();assert(!door.open,'second E closes leaf');
  assert(t.doorHitsBody(m,door.anchor.x,door.anchor.z,.815),'closed door blocks');
  assert(!t.canStand(door.anchor.x,door.anchor.z,.815),'visitor cannot cross closed doorway');
}
Object.assign(t.walk,{x:-6,z:6,y:.02});key();assert(t.tourDoors.every(d=>!d.open),'remote E ignored');
// Third-person uses the same player-based interaction range.
t.exitWalk();t.enterWalk('third');const door=t.tourDoors[1];
Object.assign(t.walk,{x:door.anchor.x,z:door.anchor.z+.6,y:.815});key();assert(door.open);
t.exitWalk();assert(t.tourDoors.every(d=>!d.open),'overview restores closed doors');assert(t.doorButton.hidden);
console.log('PASS 11 ground-floor doors (+2 terrace leaves counted), nearest/range/height selection, E toggle, repeat and input guards, open passage, closed collision, close-on-body rejection, refreshed bounds, third-person, overview reset');
