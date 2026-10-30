// Model and input event tests with renderer stubs; actual browser/device testing remains required.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));
const noop=()=>{};function eventTarget(o){const listeners={};o.addEventListener=(name,fn)=>(listeners[name]??=[]).push(fn);o.fire=(name,event={})=>(listeners[name]||[]).forEach(fn=>fn({preventDefault:noop,...event}));return o;}const ctx=new Proxy({measureText:()=>({width:100}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();function elem(){return eventTarget({style:{},dataset:{},children:[],classList:{add:noop,remove:noop},append:noop,appendChild:noop,before:noop,after:noop,addEventListener:noop,setAttribute:noop,getAttribute:()=> 'false',getContext:()=>ctx,clientWidth:900,clientHeight:600,setPointerCapture:noop});}const document={createElement:elem,createElementNS:elem,head:elem(),documentElement:elem(),getElementById:id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},querySelectorAll:()=>[],addEventListener:noop};
eventTarget(document);const c={console,document,window:{devicePixelRatio:1,addEventListener:noop},matchMedia:()=>({matches:false,addEventListener:noop}),getComputedStyle:()=>({getPropertyValue:()=> '#eeeeee'}),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop};eventTarget(c.window);c.__sunKey="pm";vm.createContext(c);vm.runInContext(scripts.find(s=>s.includes('const e="147"')),c);c.THREE.WebGLRenderer=class{constructor(){this.domElement=elem();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}setPixelRatio(){}setSize(){}render(){}};
for(const s of scripts.filter(s=>s.includes('class OrbitControls')||s.includes('// This set of controls')||s.includes('class CSS2DObject')))vm.runInContext(s,c);
let app=scripts[scripts.length-1].replace('requestAnimationFrame(loop);\n})();','window.test={rs,tourDoors,tourBounds,nearestTourDoor,toggleTourDoor,doorHitsBody,applyTourDoor,doorButton,help,movePad,lookPad,renderer,turnWalk,walk,enterWalk,exitWalk,canStand,supportedHeight,updateWalk,scene,camera,controls};\n})();');vm.runInContext(app,c);const t=c.window.test;assert(t);
const key=(extra={})=>c.window.fire('keydown',{code:'KeyE',target:{tagName:'CANVAS'},...extra});
// Breadth-first walk over the floor with the game's own collision; `r` widens the body (ring of probe points) to model a comfortable aisle.
function reachable(y,start,goal,box,r){
  const ring=(x,z)=>t.canStand(x,z,y)&&[0,1,2,3,4,5,6,7].every(k=>t.canStand(x+r*Math.cos(k*Math.PI/4),z+r*Math.sin(k*Math.PI/4),y));
  const step=.05,id=(x,z)=>Math.round(x/step)+','+Math.round(z/step),seen=new Set([id(...start)]),q=[start];
  while(q.length){const [x,z]=q.shift();if(Math.hypot(x-goal[0],z-goal[1])<.2)return true;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx*step,nz=z+dz*step;
      if(nx<box[0]||nx>box[1]||nz<box[2]||nz>box[3]||seen.has(id(nx,nz)))continue;seen.add(id(nx,nz));if(ring(nx,nz))q.push([nx,nz]);}}
  return false;
}
// 2F terrace: the two middle leaves of the 4-leaf glass sliding door open together with E.
t.enterWalk();
const leaves=t.tourDoors.filter(d=>d.anchor.y>4);
assert.equal(leaves.length,2,'two operable terrace leaves');assert(leaves[0].set===leaves[1].set&&leaves[0].set.length===2,'leaves open as one set');
const Y=4.715,inside=[-7.3,12.7],terrace=[-7.3,11.2],box=[-9.3,-5.5,10.6,13.2];
assert(t.canStand(...inside,Y),'standing spot inside the stair room is valid');assert(t.canStand(...terrace,Y),'standing spot on the terrace is valid');
assert(!reachable(Y,inside,terrace,box,0),'closed glass doors block the terrace');
Object.assign(t.walk,{x:inside[0],z:inside[1],y:Y});
assert(leaves.includes(t.nearestTourDoor()),'terrace leaf selected from inside');
key({repeat:true});assert(leaves.every(d=>!d.open),'holding E does not repeat');
key();assert(leaves.every(d=>d.open),'E opens both leaves');
assert.equal(t.doorButton.textContent,'E 關門');
// Leaves slide along x by 0.85 m in opposite directions; z and rotation unchanged.
const [a,b]=leaves.slice().sort((p,q)=>q.slide-p.slide);
assert(Math.abs(a.group.position.x-.85)<1e-9&&Math.abs(b.group.position.x+.85)<1e-9,'leaves slide in opposite directions');
assert(leaves.every(d=>d.group.position.z===0&&d.group.rotation.y===0));
assert(reachable(Y,inside,terrace,box,0),'open doors let the visitor out to the terrace');
assert(reachable(Y,inside,terrace,box,.17),'0.70 m wide body fits through the opening');
for(const d of leaves)for(const e of t.tourBounds)if(d.meshes.includes(e.m))assert(e.b.equals(new c.THREE.Box3().setFromObject(e.m)),'bounds refreshed');
// Standing in the doorway prevents closing onto the visitor.
Object.assign(t.walk,{x:-7.3,z:12.0,y:Y});key();assert(leaves.every(d=>d.open),'close onto body rejected');
Object.assign(t.walk,{x:inside[0],z:inside[1],y:Y});key();assert(leaves.every(d=>!d.open),'second E closes both');
assert(!reachable(Y,inside,terrace,box,0),'closed again blocks the terrace');
// Leaves move with the 2F structure group (rs): hiding it hides them and removes the prompt.
t.rs.visible=false;assert.equal(t.nearestTourDoor(),null,'hidden leaves cannot be operated');t.rs.visible=true;
// Leaving the tour closes them.
key();t.exitWalk();assert(leaves.every(d=>!d.open),'overview restores closed leaves');
console.log('PASS terrace sliding doors: pair registered, E toggles both, opposite 0.85 m slide, blocks when closed, passable (0.70 m body) when open, close-on-body rejection, 2F-structure visibility, overview reset');
