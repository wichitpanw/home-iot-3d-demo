const CAMERAS = [
  {id:'front',name:'หน้าบ้าน',image:'./assets/cameras/front.jpg',pin:{x:8.64,y:3.23,z:3.75}},
  {id:'carport',name:'โรงจอดรถ',image:'./assets/cameras/carport.jpg',pin:{x:-1.51,y:3.32,z:10.34}},
  {id:'side-1',name:'ข้างบ้าน 1',image:'./assets/cameras/side-1.jpg',pin:{x:-2.6,y:3.35,z:1.66}},
  {id:'rear',name:'หลังบ้าน',image:'./assets/cameras/rear.jpg',pin:{x:8.27,y:2.65,z:-11.03}},
  {id:'side-2',name:'ข้างบ้าน 2',image:'./assets/cameras/side-2.jpg',pin:{x:9.05,y:2.75,z:-.4}},
  {id:'kitchen',name:'ห้องครัว',image:'./assets/cameras/kitchen.jpg',pin:{x:8.7,y:3.01,z:-7.54}}
];

export function initCameras({THREE,scene,camera,renderer}) {
  const $=selector=>document.querySelector(selector),panel=$('#camera-panel'),list=$('#camera-list');
  const group=new THREE.Group();scene.add(group);const cards=new Map(),raycaster=new THREE.Raycaster();let pointer;
  function texture(){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#203b30';c.strokeStyle='#d5e6b7';c.lineWidth=5;c.beginPath();c.arc(64,64,54,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#fff';c.lineWidth=6;c.strokeRect(38,44,37,40);c.beginPath();c.moveTo(75,54);c.lineTo(94,43);c.lineTo(94,85);c.lineTo(75,74);c.stroke();const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
  const pinTexture=texture();
  for(const record of CAMERAS){const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:pinTexture,transparent:true,depthTest:false,depthWrite:false,sizeAttenuation:false}));marker.position.set(record.pin.x,record.pin.y,record.pin.z);marker.scale.set(.038,.038,1);marker.renderOrder=1000;marker.userData.cameraId=record.id;group.add(marker);}
  function close(record){const card=cards.get(record.id);if(card){card.remove();cards.delete(record.id);}}
  function watch(record){if(cards.has(record.id)){close(record);return;}const template=$('#camera-live-template').content.cloneNode(true),root=template.querySelector('.lab-live');root.dataset.cameraId=record.id;root.querySelector('[data-live-name]').textContent=record.name;root.querySelector('[data-live-image]').src=record.image;root.querySelector('[data-live-image]').alt=`ภาพตัวอย่างจากกล้อง ${record.name}`;root.querySelector('[data-live-status]').textContent='ภาพ Snapshot สำหรับสาธิต · ไม่เชื่อมต่อกล้องจริง';root.querySelector('[data-live-close]').addEventListener('click',()=>close(record));root.querySelector('[data-live-streams]')?.remove();root.querySelector('[data-live-ptz]')?.remove();$('#camera-live-layer').append(root);cards.set(record.id,root);}
  for(const record of CAMERAS){const card=document.createElement('article');card.className='lab-card';const title=document.createElement('strong');title.textContent=record.name;const meta=document.createElement('div');meta.className='meta';meta.textContent='DEMO · Snapshot\nตำแหน่งจำลองบนโมเดล';const actions=document.createElement('div');actions.className='lab-actions';const button=document.createElement('button');button.type='button';button.textContent='ดูภาพตัวอย่าง';button.addEventListener('click',()=>watch(record));actions.append(button);card.append(title,meta,actions);list.append(card);}
  $('#open-cameras').addEventListener('click',()=>panel.hidden=false);$('#close-cameras').addEventListener('click',()=>panel.hidden=true);
  $('#export-pins')?.remove();$('#cancel-pin')?.remove();
  renderer.domElement.addEventListener('pointerdown',e=>pointer={x:e.clientX,y:e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(!pointer||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7||e.button!==0)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const id=raycaster.intersectObjects(group.children,false)[0]?.object.userData.cameraId,record=CAMERAS.find(c=>c.id===id);if(record)watch(record);});
  window.addEventListener('hud-change',()=>{group.visible=true;});
  return {updateLabels(){const rect=renderer.domElement.getBoundingClientRect();for(const [id,card] of cards){const record=CAMERAS.find(c=>c.id===id),point=new THREE.Vector3(record.pin.x,record.pin.y+.35,record.pin.z).project(camera);if(point.z<-1||point.z>1){card.style.visibility='hidden';continue;}card.style.visibility='visible';const half=Math.min(card.offsetWidth/2,window.innerWidth*.46),x=Math.max(half+8,Math.min(window.innerWidth-half-8,rect.left+(point.x+1)*rect.width/2)),minY=Math.min(card.offsetHeight+8,window.innerHeight-12),y=Math.max(minY,Math.min(window.innerHeight-16,rect.top+(-point.y+1)*rect.height/2-24));card.style.left=`${x}px`;card.style.top=`${y}px`;}}};
}
