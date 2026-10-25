const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require(process.cwd() + '/node_modules/typescript');
const source = fs.readFileSync('src/app/page.tsx', 'utf8') + '\nexports.testApi = {getUpgradeOptions, PLAYER_SPEED, MAX_PLAYER_SPEED, ACHIEVEMENTS_STORAGE_KEY, DEVELOPER_CODE, DEVELOPER_DAMAGE, DEVELOPER_SPEED, soundManager, APPEARANCE_STORAGE_KEY, SKIN_COST, PLAYER_SKINS, ACHIEVEMENTS};';
const instrumented = source.replace('  const achievementNotice =', '  exports.controls = {restart, handleMathSubmit, mathInput, mathAnswer, wrongQuestions, setMathInput, setAttackSpeedMultiplier, attackSpeedMultiplierRef, attackMultiplierRef, isSpecialModeRef, showUpgradeRef, setGameOver, setShowScratchPad}; const achievementNotice =').replace("    let animId: number;", "    exports.runtime = {player, stats, calcDamage, spawnResources, update, resources: () => resources, monsters: () => monsters, onMonsterKill, droppedCoins: () => droppedCoins, projectiles: () => projectiles, triggerUpgrade, bossSummon, keys}; let animId: number;");
const code = ts.transpileModule(instrumented, {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const storage = new Map();
let randomValue = 0.49;const controlledMath=Object.create(Math);controlledMath.random=()=>randomValue;
function session() {
  let hooks = [], index = 0, effects = [];
  const listeners = new Map();
  const document={activeElement:null};
  const timers=new Map();let timerId=0;
  const react = {
    useState(initial) {const i=index++; hooks[i] ??= {value:initial}; return [hooks[i].value, value => {hooks[i].value = typeof value === 'function' ? value(hooks[i].value) : value;}];},
    useRef(initial) {const i=index++; hooks[i] ??= {current:initial}; return hooks[i];},
    useCallback(fn,deps) {const i=index++;if(!hooks[i] || deps.some((v,n)=>v!==hooks[i].deps[n]))hooks[i]={deps,callback:fn};return hooks[i].callback;},
    useEffect(fn,deps) {const i=index++; const old=hooks[i]; if (!old || deps.some((v,n)=>v!==old.deps[n])) {effects.push(()=>{old?.cleanup?.();hooks[i]={deps,cleanup:fn()};});}},
  };
  const exports = {};
  vm.runInNewContext(code, {Math:controlledMath,exports, require(name){if(name==='react') return react; if(name==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}; throw Error(name);}, performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},document,window:{setTimeout:(fn)=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),innerWidth:1000,innerHeight:800,addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn)}, HTMLElement:class {},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}, setTimeout, clearTimeout, console});
  function render(){index=0; const tree=exports.default();effects.splice(0).forEach(fn=>fn()); return tree;}
  Object.getOwnPropertyNames(Object.getPrototypeOf(exports.testApi.soundManager)).filter(k=>k!=="constructor").forEach(k=>exports.testApi.soundManager[k]=()=>{});render(); effects.splice(0).forEach(fn=>fn());
  return {render,hooks,api:exports.testApi,runtime:()=>exports.runtime,controls:()=>exports.controls,document,listeners,timers,key(key,extra={}){let prevented=false;const e={key,repeat:false,target:null,preventDefault(){prevented=true;},...extra};[...(listeners.get("keydown")??[])].forEach(fn=>fn(e)); render();return prevented;}};
}
function nodes(tree){if(!tree || typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes); return [tree,...nodes(tree.props?.children)];}
function text(tree){if(tree==null || typeof tree==='boolean')return '';if(typeof tree!=='object')return String(tree);if(Array.isArray(tree))return tree.map(text).join('');return text(tree.props?.children);}
function button(tree,label){const b=nodes(tree).find(n=>n.type==='button' && text(n).includes(label));assert.ok(b,`Missing button ${label}`);return b;}



let count=0, failures=[];
function test(name,fn){try{storage.clear();fn();count++;console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,e.message);}}
function start(mode='geometry',special=false){const app=session();app.hooks[0].current={getContext:()=>({})};if(mode==='geometry')button(app.render(),'几何图形大战').props.onClick();else{button(app.render(),'数学大战').props.onClick();button(app.render(),special?'特殊模式':'普通模式').props.onClick();}app.render();return app;}
function monster(p,extra={}){return {tier:1,x:p.x+1,y:p.y,vx:0,vy:0,hp:1e6,maxHp:1e6,attack:1000,attackCooldown:0,speed:0,mass:1,radius:14,dying:false,deathTimer:0,hitFlash:0,...extra};}
test('return during upgrade then start a fresh game',()=>{const a=start();a.runtime().triggerUpgrade();a.render();button(a.render(),'返回首页').props.onClick();a.render();button(a.render(),'几何图形大战').props.onClick();a.render();assert.equal(a.controls().showUpgradeRef.current,false);assert.ok(!text(a.render()).includes('选择强化'));});
test('game-over overlay cannot leak into next game',()=>{const a=start();a.controls().setGameOver(true);a.render();button(a.render(),'返回菜单').props.onClick();a.render();button(a.render(),'几何图形大战').props.onClick();a.render();assert.ok(!text(a.render()).includes('游戏结束'));});
test('restart resets attack speed',()=>{const a=start('math');a.controls().attackSpeedMultiplierRef.current=9;a.controls().setAttackSpeedMultiplier(9);a.controls().restart();a.render();assert.equal(a.controls().attackSpeedMultiplierRef.current,1);});
test('restart preserves special math difficulty',()=>{const a=start('math',true);a.controls().restart();a.render();assert.equal(a.controls().isSpecialModeRef.current,true);});
test('malformed math answer rejected without rewards or penalties',()=>{const a=start('math');a.controls().setMathInput('12abc');a.render();a.controls().handleMathSubmit();a.render();assert.ok(!text(a.render()).includes('12abc ='));assert.equal(a.controls().attackMultiplierRef.current,1);assert.ok(!text(a.render()).includes('12abc ='));assert.equal(a.controls().mathInput,'12abc');});
test('upgrade pauses enemy damage in the same frame',()=>{const a=start(),g=a.runtime();g.stats.resourceCount=19;g.resources().push({x:g.player.x,y:g.player.y,life:10,bobPhase:0});g.player.attackCooldown=100;g.player.rangedCooldown=100;g.monsters().push(monster(g.player));g.update(0.01);assert.equal(g.player.hp,1000);assert.equal(a.controls().showUpgradeRef.current,true);});
test('expired projectiles cannot deal damage',()=>{const a=start(),g=a.runtime();g.player.attackCooldown=100;g.player.rangedCooldown=100;const m=monster(g.player,{x:g.player.x+100,attackCooldown:100});g.monsters().push(m);g.projectiles().push({x:m.x,y:m.y,vx:0,vy:0,damage:50,life:0.001,radius:5,pierceLeft:0,hitSet:new Set(),isCrit:false});g.update(0.02);assert.equal(m.hp,1e6);});
test('expired coins cannot be picked up',()=>{const a=start(),g=a.runtime();g.droppedCoins().push({x:g.player.x,y:g.player.y,life:0.001,bobPhase:0});g.update(0.02);assert.equal(storage.has('ybh-appearance'),false);});
test('boss summons obey 200% speed limit',()=>{const a=start(),g=a.runtime();for(let i=0;i<25;i++)g.triggerUpgrade();g.bossSummon({x:0,y:0,radius:40});assert.ok(g.monsters().every(m=>m.speed<=60));});
test('enemy scaling stops after 1000% (x10)',()=>{const a=start(),g=a.runtime();const m=monster(g.player,{attack:5,maxHp:50,hp:50});g.monsters().push(m);for(let i=0;i<100;i++)g.triggerUpgrade();assert.ok(Math.abs(m.attack-50)<0.00001);assert.ok(Math.abs(m.maxHp-500)<0.00001);});

test('focus loss clears held movement keys',()=>{const a=start();a.key('w');assert.ok(a.runtime().keys.has('w'));for(const fn of a.listeners.get('blur')??[])fn();assert.equal(a.runtime().keys.size,0);});
test('coin balance remains safely serializable at upper boundary',()=>{storage.set('ybh-appearance',JSON.stringify({coins:Number.MAX_SAFE_INTEGER,skinIndex:0}));const a=start(),g=a.runtime();g.droppedCoins().push({x:g.player.x,y:g.player.y,life:10,bobPhase:0});g.update(0.01);assert.equal(JSON.parse(storage.get('ybh-appearance')).coins,Number.MAX_SAFE_INTEGER);});
test('corrupt storage cannot crash the menu',()=>{for(const bad of ['null','{}','true','1','"bad"','[null]','not json']){storage.set('ybh-appearance',bad);storage.set('ybh-achievements',bad);assert.ok(text(session().render()).includes('选择游戏模式'));}});
test('critical probability caps at 100%, then damage increases 5 points',()=>{const a=session(),p={maxHp:1000,speed:120},s={critRate:0,critMultiplier:1.5};for(let i=0;i<10;i++)a.api.getUpgradeOptions(s,p).find(o=>o.id==='crit').apply(s,p);assert.equal(s.critRate,100);assert.equal(s.critMultiplier,1.5);a.api.getUpgradeOptions(s,p).find(o=>o.id==='crit').apply(s,p);assert.equal(s.critMultiplier,1.55);});
test('low-health tier-five kill achievements use exact boundary',()=>{for(const hp of [0,1,10,11])for(const tier of [4,5,6]){storage.clear();const a=start(),g=a.runtime();g.player.hp=hp;g.onMonsterKill(monster(g.player,{tier}));const unlocked=JSON.parse(storage.get('ybh-achievements')??'[]');assert.equal(unlocked.includes('last-stand'),hp>0&&hp<=10&&tier===5);}});
test('purchases charge exactly once and reset preserves appearance',()=>{storage.set('ybh-appearance',JSON.stringify({coins:10,skinIndex:0}));const a=session();button(a.render(),'换肤').props.onClick();const buy=button(a.render(),'花费10金币换肤');buy.props.onClick();buy.props.onClick();assert.equal(JSON.parse(storage.get('ybh-appearance')).coins,0);assert.equal(JSON.parse(storage.get('ybh-appearance')).skinIndex,1);button(a.render(),'知道了').props.onClick();button(a.render(),'返回主页').props.onClick();button(a.render(),'重置金币与成就').props.onClick();assert.deepEqual(JSON.parse(storage.get('ybh-achievements')),['play-again']);assert.equal(JSON.parse(storage.get('ybh-appearance')).skinIndex,1);});
test('all achievement combinations and completion timeout',()=>{const ids=session().api.ACHIEVEMENTS.map(a=>a.id);for(let mask=0;mask<2**ids.length;mask++){storage.set('ybh-achievements',JSON.stringify(ids.filter((_,i)=>mask&(1<<i))));const a=session();a.render();assert.equal(text(a.render()).includes('你已经集齐所有成就啦'),mask===2**ids.length-1);if(mask===2**ids.length-1){for(const fn of a.timers.values())fn();assert.ok(!text(a.render()).includes('你已经集齐所有成就啦'));}}});

test('space toggles melee and firing without stopping movement',()=>{
 const a=start(),g=a.runtime();const close=monster(g.player,{hp:100,maxHp:100,attackCooldown:100,attack:0});const far=monster(g.player,{x:g.player.x+100,hp:100,maxHp:100,attackCooldown:100,attack:0});g.monsters().push(close,far);
 a.key(' ');a.key(' ',{repeat:true});a.key('w');const y=g.player.y;g.update(0.01);assert.equal(close.hp,100);assert.equal(g.projectiles().length,0);assert.ok(g.player.y<y);
 a.key(' ');g.update(0.01);assert.ok(close.hp<100);assert.ok(g.projectiles().length>0);
});
test('new game resets attack pause',()=>{const a=start();a.key(' ');a.controls().restart();a.render();const g=a.runtime(),m=monster(g.player,{hp:100,maxHp:100,attackCooldown:100,attack:0});g.monsters().push(m);g.update(0.01);assert.ok(m.hp<100);});
test('1 pauses simulation, ignores key repeat and resumes',()=>{const a=start(),g=a.runtime();const m=monster(g.player,{hp:100,maxHp:100,attackCooldown:100});g.monsters().push(m);g.droppedCoins().push({x:g.player.x,y:g.player.y,life:10,bobPhase:0});a.key('w');a.key('1');a.key('1',{repeat:true});const y=g.player.y;g.update(0.05);assert.equal(g.player.y,y);assert.equal(m.hp,100);assert.equal(g.droppedCoins().length,1);assert.ok(text(a.render()).includes('游戏已暂停'));a.key('1');g.update(0.01);assert.ok(m.hp<100);assert.equal(g.droppedCoins().length,0);assert.ok(!text(a.render()).includes('游戏已暂停'));});
test('math input retains digit 1 and restart clears pause',()=>{const a=start('math');a.document.activeElement={tagName:'INPUT'};a.key('1');assert.ok(!text(a.render()).includes('游戏已暂停'));a.document.activeElement=null;a.key('1');assert.ok(text(a.render()).includes('游戏已暂停'));a.controls().restart();a.render();assert.ok(!text(a.render()).includes('游戏已暂停'));});
test('paused math disables input and confirmation, resume restores both',()=>{const a=start('math');a.controls().setMathInput('99');a.render();a.key('1');let tree=a.render();assert.equal(nodes(tree).find(n=>n.type==='input').props.disabled,true);assert.equal(button(tree,'确认').props.disabled,true);a.controls().handleMathSubmit();a.render();assert.equal(a.controls().mathInput,'99');assert.equal(a.controls().attackMultiplierRef.current,1);a.key('1');tree=a.render();assert.equal(nodes(tree).find(n=>n.type==='input').props.disabled,false);assert.equal(button(tree,'确认').props.disabled,false);});
test('atlas lists all locked achievements even with zero unlocks',()=>{const a=session();button(a.render(),'成就图鉴').props.onClick();let tree=a.render();assert.ok(text(tree).includes('已解锁 0 / 7'));assert.equal(nodes(tree).filter(n=>n.type==='p'&&text(n)==='未解锁').length,7);for(const name of ['你的晶核被我吃了','焕然一新',"LET'S PLAY AGAIN ",'秒天秒地','残血反杀','博尔特','风浪越大鱼越贵'])assert.ok(text(tree).includes(name));});
test('boss cannot summon beyond the global monster limit',()=>{const a=start(),g=a.runtime();for(let i=0;i<20;i++)g.bossSummon({x:0,y:0,radius:40});assert.ok(g.monsters().length<=30);});
test('browser shortcut Ctrl+1 must not pause game',()=>{const a=start();a.key('1',{ctrlKey:true});assert.ok(!text(a.render()).includes('游戏已暂停'));});
test('one math question is processed only once in a rapid burst',()=>{const a=start('math');a.controls().setMathInput(String(a.controls().mathAnswer+1));a.render();const submit=a.controls().handleMathSubmit;for(let i=0;i<20;i++)submit();a.render();assert.equal(a.controls().wrongQuestions.length,1);});
test('lethal damage blocks math submission before the next render',()=>{const a=start('math'),g=a.runtime();a.controls().setMathInput(String(a.controls().mathAnswer));a.render();g.player.hp=0;a.controls().handleMathSubmit();a.render();assert.equal(a.controls().attackMultiplierRef.current,1);});
test('critical achievement follows the 100% probability then 1000% damage rule',()=>{const a=start(),g=a.runtime();g.stats.critRate=100;g.stats.critMultiplier=9.9;g.triggerUpgrade();a.render();button(a.render(),'暴击精通').props.onClick();a.render();assert.equal(g.stats.critMultiplier,9.95);assert.ok(!JSON.parse(storage.get('ybh-achievements')??'[]').includes('critical-overlord'));g.triggerUpgrade();a.render();button(a.render(),'暴击精通').props.onClick();a.render();assert.equal(g.stats.critMultiplier,10);assert.ok(JSON.parse(storage.get('ybh-achievements')).includes('critical-overlord'));});
test('upstream special-mode achievement preserved',()=>{start('math',true);assert.ok(JSON.parse(storage.get('ybh-achievements')).includes('wind_and_waves'));});
test('three consecutive speed upgrades unlock upstream Bolt achievement',()=>{const a=start(),g=a.runtime();for(let i=0;i<3;i++){g.triggerUpgrade();a.render();button(a.render(),'速度强化').props.onClick();a.render();}assert.ok(JSON.parse(storage.get('ybh-achievements')).includes('bolt'));});
test('developer math kills drop no crystals',()=>{const a=session();a.hooks[0].current={getContext:()=>({})};for(const key of a.api.DEVELOPER_CODE)a.key(key);button(a.render(),'数学大战').props.onClick();button(a.render(),'普通模式').props.onClick();a.render();const g=a.runtime();randomValue=0;g.onMonsterKill(monster(g.player));assert.equal(g.resources().length,0);assert.equal(g.droppedCoins().length,1);});
// Reproducible state-machine monkey test. All storage is isolated in memory.
for(const seed of [1,17,233,991])test(`seed ${seed}: 1000 random UI/input actions`,()=>{
 let value=seed;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const a=session();a.hooks[0].current={getContext:()=>({})};
 for(let i=0;i<1000;i++){
  let tree=a.render();const choices=nodes(tree).filter(n=>n.type==='button'&&!n.props.disabled);
  if(random()<0.25){a.key(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','o','K','Enter','x','1',' '][Math.floor(random()*10)]);}
  else if(choices.length){const b=choices[Math.floor(random()*choices.length)];b.props.onClick?.();}
  tree=a.render();
  const saved=storage.get('ybh-appearance');if(saved){const data=JSON.parse(saved);assert.ok(Number.isSafeInteger(data.coins)&&data.coins>=0);assert.ok(data.skinIndex>=0&&data.skinIndex<5);}
  assert.ok((a.listeners.get('keydown')?.size??0)<=2,'Keyboard listeners leaked');
  assert.ok(a.timers.size<=1,'Completion timers leaked');
 }
});
for(const mode of ['geometry','math'])for(const developer of [false,true])test(`1000 randomized game frames: ${mode}, developer=${developer}`,()=>{
 const a=session();a.hooks[0].current={getContext:()=>({})};
 if(developer)for(const key of a.api.DEVELOPER_CODE)a.key(key);
 if(mode==='geometry')button(a.render(),'几何图形大战').props.onClick();else{button(a.render(),'数学大战').props.onClick();button(a.render(),'特殊模式').props.onClick();}a.render();
 let seed=mode==='geometry'?73:109;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<1000;i++){
  randomValue=random();const g=a.runtime();
  if(a.controls().showUpgradeRef.current){const options=nodes(a.render()).filter(n=>n.type==='button'&&!n.props.disabled&&/强化|精通|射击|弹头/.test(text(n)));assert.ok(options.length);options[Math.floor(random()*options.length)].props.onClick();a.render();}
  if(random()<0.15)g.resources().push({x:g.player.x,y:g.player.y,life:10,bobPhase:0});
  if(random()<0.15)g.droppedCoins().push({x:g.player.x,y:g.player.y,life:10,bobPhase:0});
  a.key(['w','a','s','d','1',' '][Math.floor(random()*6)]);
  if(mode==='math' && random()<0.2){a.controls().setMathInput([String(a.controls().mathAnswer),String(a.controls().mathAnswer+1),'12abc','1e9',''][Math.floor(random()*5)]);a.render();const submit=a.controls().handleMathSubmit;for(let burst=0;burst<10;burst++)submit();a.render();}
  if(random()<0.3)for(const fn of a.listeners.get('blur')??[])fn();
  g.update(0.05);const tree=a.render();
  for(const v of [g.player.x,g.player.y,g.player.hp,g.player.speed,g.stats.critMultiplier])assert.ok(Number.isFinite(v));
  assert.ok(g.player.hp>=0);
  if(developer){assert.equal(g.player.speed,600);assert.equal(g.player.hp,g.player.maxHp);}
  if(text(tree).includes('游戏结束')){button(tree,'重新开始').props.onClick();a.render();}
 }
});
console.log(JSON.stringify({passed:count,failed:failures.length,failures}));if(failures.length)process.exitCode=1;
