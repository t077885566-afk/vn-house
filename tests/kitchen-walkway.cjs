// Model and input event tests with renderer stubs; actual browser/device testing remains required.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));
const noop=()=>{};function eventTarget(o){const listeners={};o.addEventListener=(name,fn)=>(listeners[name]??=[]).push(fn);o.fire=(name,event={})=>(listeners[name]||[]).forEach(fn=>fn({preventDefault:noop,...event}));return o;}const ctx=new Proxy({measureText:()=>({width:100}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();function elem(){return eventTarget({style:{},dataset:{},children:[],classList:{add:noop,remove:noop},append:noop,appendChild:noop,before:noop,after:noop,addEventListener:noop,setAttribute:noop,getAttribute:()=> 'false',getContext:()=>ctx,clientWidth:900,clientHeight:600,setPointerCapture:noop});}const document={createElement:elem,createElementNS:elem,head:elem(),documentElement:elem(),getElementById:id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},querySelectorAll:()=>[],addEventListener:noop};
eventTarget(document);const c={console,document,window:{devicePixelRatio:1,addEventListener:noop},matchMedia:()=>({matches:false,addEventListener:noop}),getComputedStyle:()=>({getPropertyValue:()=> '#eeeeee'}),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop};eventTarget(c.window);c.__sunKey="pm";vm.createContext(c);vm.runInContext(scripts.find(s=>s.includes('const e="147"')),c);c.THREE.WebGLRenderer=class{constructor(){this.domElement=elem();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}setPixelRatio(){}setSize(){}render(){}};
for(const s of scripts.filter(s=>s.includes('class OrbitControls')||s.includes('// This set of controls')||s.includes('class CSS2DObject')))vm.runInContext(s,c);
let app=scripts[scripts.length-1].replace('requestAnimationFrame(loop);\n})();','window.test={tourDoors,tourBounds,nearestTourDoor,toggleTourDoor,doorHitsBody,applyTourDoor,doorButton,help,movePad,lookPad,renderer,turnWalk,walk,enterWalk,exitWalk,canStand,supportedHeight,updateWalk,scene,camera,controls};\n})();');vm.runInContext(app,c);const t=c.window.test;assert(t);
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
// Living/dining -> kitchen: the former 0.9 m door is now a door-less 1.17 m (0.9 x 1.3) opening at z=17, x 8.13-9.30.
// A 0.70 m wide visitor must walk straight through it and reach every part of the kitchen; nothing is registered as a door there.
t.enterWalk();
assert(!t.tourDoors.some(d=>Math.abs(d.anchor.x+8.7)<.6&&Math.abs(d.anchor.z-17)<.15),'no door leaf in the kitchen opening');
const Y=.815,box=[-9.45,-4.7,16.0,22.4],start=[-8.7,16.3];
const goals={backDoor:[-9.0,21.45],cabinetAisle:[-8.33,19.7],dinnerTable:[-6.9,18.3],westOfTable:[-5.55,19.7]};
for(const [name,goal] of Object.entries(goals)){
  assert(reachable(Y,start,goal,box,.17),'0.70 m wide visitor reaches '+name+' through the opening');
}
t.exitWalk();
console.log('PASS kitchen opening has no door; 0.70 m body reaches back door, cabinet aisle, dining table and west side');
