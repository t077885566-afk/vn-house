// Uses renderer/DOM stubs; visual daylight quality must be checked on device.
const fs=require('fs'),vm=require('vm'),assert=require('assert');const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));
const noop=()=>{};function eventTarget(o){const listeners={};o.addEventListener=(name,fn)=>(listeners[name]??=[]).push(fn);o.fire=(name,event={})=>(listeners[name]||[]).forEach(fn=>fn({preventDefault:noop,...event}));return o;}const ctx=new Proxy({measureText:()=>({width:100}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const elements=new Map();function elem(){return eventTarget({style:{},dataset:{},children:[],classList:{add:noop,remove:noop},append:noop,appendChild:noop,before:noop,after:noop,addEventListener:noop,setAttribute:noop,getAttribute:()=> 'false',getContext:()=>ctx,clientWidth:900,clientHeight:600,setPointerCapture:noop});}const document={createElement:elem,createElementNS:elem,head:elem(),documentElement:elem(),getElementById:id=>{if(!elements.has(id))elements.set(id,elem());return elements.get(id)},querySelectorAll:()=>[],addEventListener:noop};
eventTarget(document);const c={console,document,window:{devicePixelRatio:1,addEventListener:noop},matchMedia:()=>({matches:false,addEventListener:noop}),getComputedStyle:()=>({getPropertyValue:()=> '#eeeeee'}),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},requestAnimationFrame:noop,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem:noop},setTimeout:noop};eventTarget(c.window);c.__sunKey="pm";vm.createContext(c);vm.runInContext(scripts.find(s=>s.includes('const e="147"')),c);c.THREE.WebGLRenderer=class{constructor(){this.domElement=elem();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};}setPixelRatio(){}setSize(){}render(){}};
for(const s of scripts.filter(s=>s.includes('class OrbitControls')||s.includes('// This set of controls')||s.includes('class CSS2DObject')))vm.runInContext(s,c);
let app=scripts[scripts.length-1].replace('requestAnimationFrame(loop);\n})();','window.test={atriumDaylight,atriumSky,atriumDown,atriumBounce,syncAtriumDaylight,setNight,setSun,movePad,lookPad,renderer,turnWalk,walk,enterWalk,exitWalk,canStand,supportedHeight,updateWalk,scene,camera,controls};\n})();');vm.runInContext(app,c);const t=c.window.test;assert(t);assert(t.atriumDaylight.visible);t.setSun('am');const morning=t.atriumSky.intensity;t.setSun('pm');assert(t.atriumSky.intensity>morning);t.setNight(true);assert(!t.atriumDaylight.visible);t.setNight(false);assert(t.atriumDaylight.visible);t.enterWalk();assert(t.canStand(t.walk.x,t.walk.z,t.walk.y),'entrance clear');assert.equal(t.camera.position.y,2.415);assert(!t.canStand(-4.5,14,.815),'wall blocked');const initial=t.walk.z;t.walk.keys.add('KeyW');for(let n=1;n<60;n++)t.updateWalk(n*16);assert(t.walk.z>initial,'forward goes into house');t.walk.keys.clear();
// Walk both flights using their real model tread heights.
let y=.815;for(let x=4.3;x>=1.3;x-=.02){const h=t.supportedHeight(-x,10.5,y);assert(h!==null,'first flight support '+x);assert(t.canStand(-x,10.5,h),'first flight body '+x);y=h;}
for(let z=10.5;z<=11.5;z+=.02){const h=t.supportedHeight(-1.4,z,y);assert(h!==null);assert(t.canStand(-1.4,z,h));y=h;}
for(let x=1.4;x<=4.7;x+=.02){const h=t.supportedHeight(-x,11.5,y);assert(h!==null,'upper flight support '+x);assert(t.canStand(-x,11.5,h),'upper flight body '+x);y=h;}assert(y>4.6);for(let x=4.7;x>=1.4;x-=.02){const h=t.supportedHeight(-x,11.5,y);assert(h!==null);assert(t.canStand(-x,11.5,h));y=h;}
for(let z=11.5;z>=10.5;z-=.02){const h=t.supportedHeight(-1.4,z,y);assert(h!==null);assert(t.canStand(-1.4,z,h));y=h;}
for(let x=1.4;x<=4.3;x+=.02){const h=t.supportedHeight(-x,10.5,y);assert(h!==null);assert(t.canStand(-x,10.5,h));y=h;}assert(y<1.1);assert(!t.canStand(-7,14.3,4.7),'void blocked');
// Mouse look requires a held left button and permits repeated large turns.
let yaw=t.walk.yaw;t.renderer.domElement.fire('pointermove',{pointerType:'mouse',pointerId:3,clientX:400,clientY:50});assert.equal(t.walk.yaw,yaw);
t.renderer.domElement.fire('pointerdown',{pointerType:'mouse',pointerId:3,button:0,clientX:0,clientY:50});
t.renderer.domElement.fire('pointermove',{pointerType:'mouse',pointerId:3,clientX:350,clientY:50});assert(Math.abs((yaw-t.walk.yaw)-3.15)<1e-9);
t.renderer.domElement.fire('pointerup',{pointerId:3});yaw=t.walk.yaw;
t.renderer.domElement.fire('pointermove',{pointerType:'mouse',pointerId:3,clientX:400,clientY:50});assert.equal(t.walk.yaw,yaw);
t.renderer.domElement.fire('pointerdown',{pointerType:'mouse',pointerId:3,button:2,clientX:0,clientY:50});
t.renderer.domElement.fire('pointermove',{pointerType:'mouse',pointerId:3,clientX:350,clientY:50});assert.equal(t.walk.yaw,yaw);
// Independent fingers: releasing look must not release movement.
t.movePad.fire('pointerdown',{pointerType:'touch',pointerId:1,button:0,clientX:50,clientY:50});
t.movePad.fire('pointermove',{pointerType:'touch',pointerId:1,clientX:50,clientY:15});assert.equal(t.walk.stick.y,-1);
yaw=t.walk.yaw;t.lookPad.fire('pointerdown',{pointerType:'touch',pointerId:2,button:0,clientX:100,clientY:50});
t.lookPad.fire('pointermove',{pointerType:'touch',pointerId:2,clientX:130,clientY:50});assert(t.walk.yaw<yaw);assert.equal(t.walk.stick.y,-1);
t.lookPad.fire('pointerup',{pointerId:2});assert.equal(t.walk.stick.y,-1);
t.movePad.fire('pointercancel',{pointerId:1});assert.equal(t.walk.stick.y,0);
t.exitWalk();assert(t.controls.enabled);
console.log('PASS left-button look, 180 degree drag, release and right-button ignored, simultaneous touch movement/look, cancellation, syntax, scene, entrance, wall, movement, 21-step U stair ascent, orbit restore');
