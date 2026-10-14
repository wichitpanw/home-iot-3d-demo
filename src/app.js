import { initCameras } from './cameras.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HOME, VIEWS } from './config.js';
import { createHome } from './model.js';

const viewer = document.querySelector('#viewer');
const loading = document.querySelector('#loading');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = { mode: 'day', zones: { house: true, carport: true, fence: true } };
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  loading.hidden = true;
  loading.style.display = 'none';
  document.querySelector('#error').hidden = false;
  console.error(error);
}
if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  viewer.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'แบบจำลองบ้าน 3 มิติ ใช้ปุ่มลูกศรเพื่อหมุน ปุ่มบวกและลบเพื่อซูม และปุ่ม Home เพื่อคืนมุม');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e9df');
  scene.fog = new THREE.Fog('#e8e9df', 140, 250);
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.minDistance = 10;
  controls.maxDistance = 130;
  controls.maxPolarAngle = Math.PI / 2 - .06;
  controls.minPolarAngle = .001;
  controls.zoomSpeed = .8;
  controls.panSpeed = .7;
  controls.screenSpacePanning = false;

  const hemi = new THREE.HemisphereLight('#f7f8ed', '#8b947d', 2.5);scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d5', 3.8);sun.position.set(-17,29,17);sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:85});
  sun.shadow.bias = -.0005;sun.shadow.normalBias = .04;scene.add(sun);
  const fill = new THREE.DirectionalLight('#d9e7ed', .6);fill.position.set(14,12,-15);scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshStandardMaterial({color:'#e3e5d7',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-1.0;ground.receiveShadow=true;scene.add(ground);
  const home = createHome(scene);
  const zones = home.createLights();
  const cameraLab = initCameras({ THREE, scene, camera, controls, renderer });
  const dayColor = new THREE.Color('#e8e9df'), nightColor = new THREE.Color('#132331');
  const dayGround = new THREE.Color('#e3e5d7'), nightGround = new THREE.Color('#243545');
  let nightAmount = 0;
  let cameraAnimation = null;
  let activeView = 'overview';
  let didLoad = false;
  const clock = new THREE.Clock();

  // Keep the house within the unobstructed area, away from the control panel.
  function updateFraming() {
    if (document.body.dataset.hudHidden === 'true') {
      camera.clearViewOffset();
      return;
    }
    const width=window.innerWidth,height=window.innerHeight;
    if(width>760){
      const panel=width>1500?365:width>1000?334:287;
      camera.setViewOffset(width,height,panel*.43,0,width,height);
    }else{
      camera.setViewOffset(width,height,0,height*.055,width,height);
    }
  }
  window.addEventListener('hud-change', updateFraming);
  function targetView(name) {
    const view=VIEWS[name];
    const position=new THREE.Vector3(...view.position);
    if(window.innerWidth<=760) position.multiplyScalar(1.65);
    return { position, target: new THREE.Vector3(...view.target) };
  }
  const initial=targetView('overview');camera.position.copy(initial.position);controls.target.copy(initial.target);controls.update();updateFraming();
  let startingDistance = initial.position.distanceTo(initial.target);

  function selectView(name, animate=true) {
    const view=targetView(name);
    activeView=name;
    document.querySelectorAll('[data-view]').forEach(button=>{
      const selected=button.dataset.view===name;
      button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
    });
    if(animate&&!reducedMotion.matches){
      cameraAnimation={from:camera.position.clone(),to:view.position,fromTarget:controls.target.clone(),toTarget:view.target,start:performance.now()};
    }else{camera.position.copy(view.position);controls.target.copy(view.target);cameraAnimation=null;controls.update();}
    announce(`มุมมอง${VIEWS[name].label}`);
  }
  function markFreeView() {
    cameraAnimation=null;activeView=null;
    document.querySelectorAll('[data-view]').forEach(button=>{button.classList.remove('selected');button.setAttribute('aria-pressed','false');});
  }
  controls.addEventListener('start',markFreeView);

  function setMode(mode) {
    state.mode=mode;document.body.dataset.mode=mode;
    document.querySelectorAll('[data-mode-button]').forEach(button=>{
      const selected=button.dataset.modeButton===mode;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
    });
    document.querySelector('#mode-status').textContent=mode==='day'?'แสงกลางวัน':'แสงกลางคืน';
    if(reducedMotion.matches)nightAmount=mode==='night'?1:0;
    announce(mode==='day'?'เปลี่ยนเป็นกลางวัน':'เปลี่ยนเป็นกลางคืน');
  }
  document.querySelectorAll('[data-mode-button]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.modeButton)));
  document.querySelectorAll('[data-zone]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.zone;state.zones[id]=!state.zones[id];button.setAttribute('aria-checked',String(state.zones[id]));
    document.querySelector('#light-count').textContent=`${Object.values(state.zones).filter(Boolean).length} / 3 โซน`;
    announce(`${state.zones[id]?'เปิด':'ปิด'}ไฟ${HOME.lights[id].label}`);
  }));
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>selectView(button.dataset.view)));
  document.querySelector('#reset-view').addEventListener('click',()=>selectView('overview'));
  function zoom(factor) {
    markFreeView();const offset=camera.position.clone().sub(controls.target);
    const distance=THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance));controls.update();
  }
  document.querySelector('#zoom-in').addEventListener('click',()=>zoom(.86));
  document.querySelector('#zoom-out').addEventListener('click',()=>zoom(1/.86));
  renderer.domElement.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home'){selectView('overview');return;}
    if(['+','=','-'].includes(event.key)){zoom(event.key==='-'?1/.86:.86);return;}
    markFreeView();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(event.key==='ArrowLeft')spherical.theta-=.1;
    if(event.key==='ArrowRight')spherical.theta+=.1;
    if(event.key==='ArrowUp')spherical.phi-=.1;
    if(event.key==='ArrowDown')spherical.phi+=.1;
    spherical.phi=THREE.MathUtils.clamp(spherical.phi,controls.minPolarAngle,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
  });
  window.addEventListener('resize',()=>{
    camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(window.innerWidth,window.innerHeight);updateFraming();
    const reference=targetView('overview');startingDistance=reference.position.distanceTo(reference.target);
    if(activeView)selectView(activeView,false);
  });
  // Don't allow panning so far that the site becomes impossible to find.
  const panLimit=new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.05);
    if(document.hidden)return;
    const targetNight=state.mode==='night'?1:0;
    nightAmount=THREE.MathUtils.damp(nightAmount,targetNight,5,dt);
    if(Math.abs(nightAmount-targetNight)<.001)nightAmount=targetNight;
    scene.background.copy(dayColor).lerp(nightColor,nightAmount);scene.fog.color.copy(scene.background);
    ground.material.color.copy(dayGround).lerp(nightGround,nightAmount);
    hemi.intensity=THREE.MathUtils.lerp(1.8,.75,nightAmount);
    hemi.color.set('#f7f8ed').lerp(new THREE.Color('#8ba8cd'),nightAmount);
    sun.intensity=THREE.MathUtils.lerp(2.8,.75,nightAmount);
    sun.color.set('#fff0d5').lerp(new THREE.Color('#9bb5de'),nightAmount);
    fill.intensity=THREE.MathUtils.lerp(.6,.3,nightAmount);
    for(const [id,group] of Object.entries(zones)){
      const enabled=state.zones[id];
      for(const light of group.lights)light.intensity=enabled?HOME.lights[id].intensity*THREE.MathUtils.lerp(.10,1,nightAmount):0;
      for(const mat of group.glass){mat.emissiveIntensity=enabled?THREE.MathUtils.lerp(.4,2.8,nightAmount):0;mat.color.set(enabled?'#f7e5b9':'#b5b7ac');}
      for(const glow of group.glows)glow.material.opacity=enabled?nightAmount*.48:0;
      for(const pool of group.pools)pool.material.opacity=enabled?nightAmount*.27:0;
    }
    if(cameraAnimation){
      const t=Math.min((performance.now()-cameraAnimation.start)/900,1),ease=t*t*(3-2*t);
      camera.position.lerpVectors(cameraAnimation.from,cameraAnimation.to,ease);
      controls.target.lerpVectors(cameraAnimation.fromTarget,cameraAnimation.toTarget,ease);
      if(t===1)cameraAnimation=null;
    }
    controls.update();
    panLimit.copy(controls.target);controls.target.x=THREE.MathUtils.clamp(controls.target.x,-18,18);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-18,18);
    panLimit.sub(controls.target);camera.position.sub(panLimit);
    document.querySelector('#zoom-value').textContent=`${(startingDistance/camera.position.distanceTo(controls.target)).toFixed(1)}×`;
    cameraLab.updateLabels();
    renderer.render(scene,camera);
    if(!didLoad){didLoad=true;loading.remove();document.body.dataset.ready='true';}
  }
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();document.querySelector('#error').hidden=false;});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{document.querySelector('#error').hidden=true;});
  animate();
}
function announce(message) { document.querySelector('#live-status').textContent=message; }
