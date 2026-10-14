import * as THREE from 'three';
import { HOME } from './config.js';

const C = HOME.colors;
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const mats = {
  wall: material(C.wall), trim: material(C.trim), metal: material(C.fence, { metalness: .35, roughness: .55 }),
  concrete: material(C.concrete), wood: material(C.timber), glass: material('#294443', { metalness: .2, roughness: .22 }),
  stone: material('#65716b'), roofEdge: material(C.roofEdge), soil: material('#8c795a'),
};
let seed = 42;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

function box(parent, x, y, z, w, h, d, mat, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, x, y, z, radius, height, mat, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function beam(parent, a, b, radius, mat) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 6), mat);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  mesh.castShadow = true;
  parent.add(mesh);
}
function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
function roofTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#79695e'; ctx.fillRect(0, 0, s, s);
    const row = s / 8, col = s / 8;
    for (let j = 0; j < 8; j++) {
      for (let i = -1; i < 9; i++) {
        const x = i * col + (j % 2) * col / 2, y = j * row;
        ctx.fillStyle = `rgba(240,219,190,${.02 + random() * .07})`;
        ctx.fillRect(x + 1, y + 1, col - 2, row - 3);
        ctx.fillStyle = '#514a422e'; ctx.fillRect(x, y + row - 3, col, 3);
        ctx.fillStyle = '#dfc6ab35'; ctx.fillRect(x, y + 1, col, 1.3);
        ctx.fillStyle = '#423e383d'; ctx.fillRect(x, y, 1, row);
      }
    }
  });
}
function hipRoof(parent, x, z, width, depth, eaveY, rise, roofMat) {
  const w = width / 2, d = depth / 2, ridge = Math.max(.2, (width - depth) / 2);
  const p = [[-w,0,-d],[w,0,-d],[w,0,d],[-w,0,d],[-ridge,rise,0],[ridge,rise,0]];
  const faces = [[0,4,5,1],[3,2,5,4],[0,3,4],[1,5,2]];
  const positions = [], uvs = [];
  for (const indices of faces) {
    const triangles = indices.length === 4 ? [[0,1,2],[0,2,3]] : [[0,1,2]];
    const first = new THREE.Vector3(...p[indices[0]]);
    const edge = new THREE.Vector3(...p[indices[indices.length - 1]]).sub(first).normalize();
    for (const tri of triangles) for (const j of tri) {
      const point = p[indices[j]];
      positions.push(...point);
      const relative = new THREE.Vector3(...point).sub(first);
      const u = relative.dot(edge), v = Math.sqrt(Math.max(0, relative.lengthSq() - u*u));
      uvs.push(u / 2.7, v / 2.7);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, roofMat);
  roof.position.set(x, eaveY, z);
  roof.castShadow = true; roof.receiveShadow = true; parent.add(roof);
  box(parent, x, eaveY - .10, z, width, .20, depth, mats.roofEdge);
  box(parent, x, eaveY - .24, z, width - .10, .10, depth - .10, mats.trim);
  for (const [a,b] of [[0,4],[1,5],[2,5],[3,4],[4,5]]) {
    beam(parent, [x+p[a][0],eaveY+p[a][1]+.035,z+p[a][2]], [x+p[b][0],eaveY+p[b][1]+.035,z+p[b][2]], .045, mats.roofEdge);
  }
  return roof;
}
function windowFront(parent, x, y, z, width, height, { door = false } = {}) {
  box(parent, x, y, z, width+.14, height+.14, .13, mats.trim);
  box(parent, x, y, z+.075, width, height, .04, mats.glass);
  box(parent, x, y, z+.11, .045, height, .035, mats.trim);
  if (!door) box(parent, x, y-.32, z+.11, width, .035, .035, mats.trim);
  else {
    box(parent, x-.15, y-.15, z+.16, .025, .35, .055, mats.metal);
    box(parent, x+.15, y-.15, z+.16, .025, .35, .055, mats.metal);
  }
}
function tree(parent, x, z, height, radius) {
  const trunk = material('#76634b');
  const greens = ['#648554','#739362','#4d744f','#87a574'].map(c => material(c));
  cylinder(parent, x, height*.31, z, .15, height*.62, trunk, 7);
  for (let i=0;i<9;i++) {
    const angle = i * 2.39996;
    const spread = i === 0 ? 0 : radius*.57;
    const xx=x+Math.cos(angle)*spread, zz=z+Math.sin(angle)*spread;
    const yy=height*.63+(i%3)*height*.1;
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius*(.54+random()*.18), 1), greens[i%4]);
    mesh.position.set(xx,yy,zz);mesh.scale.set(1,.85+random()*.3,1);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(i<4)beam(parent,[x,height*.35,z],[xx,yy-.3,zz],.07,trunk);
  }
}
function shrub(parent, x, z, scale=.5, color='#6e8b54') {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(scale, 1), material(color));
  mesh.position.set(x,.17+scale*.6,z);mesh.scale.set(1,.72,.9);mesh.castShadow=true;parent.add(mesh);
  return mesh;
}
function palm(parent, x, z) {
  cylinder(parent,x,1.6,z,.09,3.2,material('#8d785b'),7);
  const leafMat = material('#638556',{side:THREE.DoubleSide});
  for(let i=0;i<8;i++) {
    const angle=i*Math.PI/4;
    const geo=new THREE.BufferGeometry();
    const points=[0,3.2,0, .8,3.55,-.20, 1.8,3.1,0, .8,3.55,.20];
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    const leaf=new THREE.Mesh(geo,leafMat);leaf.position.set(x,0,z);leaf.rotation.y=angle;leaf.castShadow=true;parent.add(leaf);
  }
}
function vehicle(parent, x, z, color, pickup=false) {
  const car=new THREE.Group();car.position.set(x,.08,z);parent.add(car);
  const paint=material(color,{roughness:.35,metalness:.3}),glass=material('#27363b',{roughness:.16,metalness:.3});
  const rubber=material('#252b29'),chrome=material('#78827e',{metalness:.65,roughness:.3});
  box(car,0,.65,0,1.85,.55,4.35,paint);
  box(car,0,1.15,pickup?.25:-.10,1.66,.65,pickup?1.85:2.65,paint);
  box(car,0,1.2,1.23,1.5,.44,.04,glass);
  box(car,-.842,1.2,pickup?.25:-.1,.035,.42,pickup?1.65:2.4,glass);
  box(car,.842,1.2,pickup?.25:-.1,.035,.42,pickup?1.65:2.4,glass);
  box(car,0,.75,2.19,1.7,.14,.05,chrome);
  if(pickup)box(car,0,.91,-1.38,1.55,.06,1.25,rubber);
  for(const xx of [-.91,.91])for(const zz of [-1.32,1.32]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.23,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(xx,.36,zz);wheel.castShadow=true;car.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.24,12),chrome);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);car.add(hub);
  }
  for(const xx of [-.62,.62])box(car,xx,.82,2.23,.36,.14,.035,material('#ded9b8'));
  return car;
}

function createKitchen(parent) {
  const k=HOME.kitchen;
  const kitchen=new THREE.Group();kitchen.name='Rear kitchen extension';
  kitchen.position.set(k.x,0,k.z);parent.add(kitchen);
  const lowerWall=material('#8e9fa6'),frame=material('#767f7c');
  const meshPanel=material('#b5c3bb',{transparent:true,opacity:.25,side:THREE.DoubleSide});
  box(kitchen,0,.16,0,k.width,.24,k.depth,mats.concrete);
  box(kitchen,k.width/2,1.35,0,.12,2.45,k.depth,lowerWall);
  box(kitchen,0,.72,-k.depth/2,k.width,1.2,.10,lowerWall);
  // Rear ventilation band, mesh and framing visible from the rear camera.
  box(kitchen,0,1.99,-k.depth/2,k.width,1.25,.035,meshPanel,false);
  for(let x=-k.width/2;x<=k.width/2+.01;x+=k.width/6)box(kitchen,x,1.46,-k.depth/2,.055,2.65,.055,frame);
  for(const y of [1.3,2.62])box(kitchen,0,y,-k.depth/2,k.width,.055,.07,frame);
  const points=[];
  for(let x=-k.width/2;x<k.width/2;x+=.16)points.push(x,1.35,-k.depth/2-.025,x,2.59,-k.depth/2-.025);
  for(let y=1.35;y<2.6;y+=.16)points.push(-k.width/2,y,-k.depth/2-.025,k.width/2,y,-k.depth/2-.025);
  const wireGeometry=new THREE.BufferGeometry();wireGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  kitchen.add(new THREE.LineSegments(wireGeometry,new THREE.LineBasicMaterial({color:'#71877c',transparent:true,opacity:.4})));
  // A narrow exit in the left end of the kitchen leads to the rear passage.
  const doorWidth=.85,doorCenter=-.55,doorL=doorCenter-doorWidth/2,doorR=doorCenter+doorWidth/2;
  for(const [a,b] of [[-k.depth/2,doorL],[doorR,k.depth/2]]){
    box(kitchen,-k.width/2-.075,1.3,(a+b)/2,.10,2.35,b-a,lowerWall);
  }
  box(kitchen,-k.width/2-.10,2.50,doorCenter,.13,.22,doorWidth,mats.trim);
  for(const z of [doorL,doorR])box(kitchen,-k.width/2-.10,1.25,z,.13,2.50,.08,mats.trim);
  const kitchenDoor=new THREE.Group();kitchenDoor.position.set(-k.width/2-.1,0,doorL);kitchenDoor.rotation.y=-Math.PI/3;kitchen.add(kitchenDoor);
  box(kitchenDoor,0,1.22,doorWidth/2,.055,2.1,doorWidth,lowerWall);
  // Utility counter and washing machine, without reproducing people from CCTV.
  box(kitchen,.5,.91,-1.14,k.width-1.6,.09,.65,mats.concrete);
  for(const x of [-2,1,4])box(kitchen,x,.50,-1.14,.09,.8,.55,frame);
  box(kitchen,-4,.75,.9,.72,1.08,.72,material('#d9dfdb'));
  box(kitchen,-4,1.30,.9,.60,.035,.60,mats.metal);
  const roofing=material('#9aa9a5',{metalness:.4,roughness:.6});
  const slope=THREE.MathUtils.degToRad(k.roofSlopeDegrees);
  const roof=box(kitchen,0,k.height+.14,0,k.width+.45,.10,k.depth+.5,roofing);roof.rotation.x=slope;
  for(let x=-k.width/2-.2;x<k.width/2+.2;x+=.25){
    const rib=box(kitchen,x,k.height+.205,0,.027,.025,k.depth+.5,roofing,false);rib.rotation.x=slope;
  }
  return kitchen;
}

export function createHome(scene) {
  seed = 42;
  const world = new THREE.Group(); scene.add(world);
  const model = new THREE.Group(); world.add(model);
  const roofMat=material('#ffffff',{map:roofTexture(),side:THREE.DoubleSide});
  const grassMap=canvasTexture((ctx,s)=>{
    ctx.fillStyle='#7f936c';ctx.fillRect(0,0,s,s);
    for(let i=0;i<2600;i++){ctx.fillStyle=i%2?'#d8d3a018':'#3658361c';ctx.fillRect(random()*s,random()*s,1+random()*2,1+random()*4);}
  });grassMap.repeat.set(7,7);
  const grass=material('#ffffff',{map:grassMap});
  // A freestanding architectural site slab and simple neighbourhood context.
  box(world,0,-.51,5,38,.9,47,material('#b9bca8'),false);
  box(world,0,-.045,5,38,.08,47,grass,false);
  box(model,HOME.lot.x,.01,HOME.lot.z,HOME.lot.width,.08,HOME.lot.depth,mats.concrete,false);
  const fenceZ=HOME.fence.frontZ;
  // The front courtyard is continuous poured concrete; no lawn or stepping stones.
  // Street in front, narrow lane behind, and drainage edge.
  const streetMat=material('#bbb8a7');
  const streetZ=fenceZ+3.9;
  box(world,0,.01,streetZ,38,.1,6.6,streetMat,false);
  box(world,0,.04,fenceZ+.7,38,.1,.38,material('#a4a799'),false);
  box(world,0,.01,HOME.fence.backZ-2.0,38,.1,3.3,streetMat,false);
  const seam=material('#aaa998');
  for(let x=-18;x<19;x+=3.5)box(world,x,.07,streetZ,.022,.015,6.4,seam,false);
  for(let x=HOME.fence.leftX+1;x<HOME.fence.rightX;x+=3)box(model,x,.069,8,.012,.012,16.5,mats.stone,false);
  for(let z=-2;z<fenceZ;z+=3)box(model,HOME.lot.x,.069,z,HOME.lot.width-.3,.012,.012,material('#c1bfae'),false);
  for(let x=-17;x<18;x+=1.2)box(world,x,.10,fenceZ+.73,.10,.015,.18,mats.stone,false);
  // The main house and overlapping hip roofs.
  const h=HOME.house;
  box(model,h.x,.22,h.z,h.width+.35,.34,h.depth+.35,mats.trim);
  box(model,h.x,1.94,h.z,h.width,h.wallHeight,h.depth,mats.wall);
  hipRoof(model,h.x,h.z,h.width+1.2,h.depth+1.2,3.64,h.roofHeight,roofMat);
  const p=HOME.porch;
  box(model,p.x,.38,p.z,p.width+.4,.38,p.depth+.6,mats.trim);
  // Front room on the right; the left half remains an open porch.
  box(model,7.45,1.97,1.62,2.3,3.1,3.3,mats.wall);
  box(model,2.75,1.97,1.9,.32,3.1,3.7,mats.trim);
  box(model,8.65,1.97,1.9,.32,3.1,3.7,mats.trim);
  hipRoof(model,p.x,p.z,p.width+1.2,p.depth+1.2,3.66,p.roofHeight,roofMat);
  hipRoof(model,-.5,-.8,4.5,5.7,3.64,1.35,roofMat);
  windowFront(model,.35,1.9,1.65,1.15,2.30);
  windowFront(model,4.8,1.75,1.67,2.65,2.35,{door:true});
  windowFront(model,7.45,1.92,3.3,1.28,1.95);
  windowFront(model,-1.7,1.93,1.65,.45,2.25);
  // Side windows, visible from the first camera angle.
  for(const zz of [-5.6,-2.0]){
    box(model,8.76,1.94,zz,.1,1.55,1.55,mats.trim);
    box(model,8.82,1.94,zz,.035,1.42,1.42,mats.glass);
    box(model,8.85,1.94,zz,.03,1.42,.04,mats.trim);
  }
  // Side 1 is -X (left when looking into the house from the street).
  const leftPassage=HOME.sidePassages.left,rightPassage=HOME.sidePassages.right;
  box(model,leftPassage.x,.115,HOME.lot.z,leftPassage.width,.12,HOME.lot.depth-.2,mats.concrete,false);
  box(model,rightPassage.x,.115,-4.35,rightPassage.width,.12,12.1,mats.concrete,false);
  box(model,10.9,.09,-4.8,1.2,.12,13.3,mats.soil,false);
  for(let z=-11;z<0;z+=1.7){
    cylinder(model,10.9,.21,z,.27,.28,mats.stone);
    shrub(model,10.9,z,.33,'#799453');
  }
  for(const zz of [-5.4,-2.4]){
    box(model,-1.75,1.95,zz,.10,1.66,1.45,mats.trim);
    box(model,-1.82,1.95,zz,.025,1.52,1.31,mats.glass);
    box(model,-1.85,1.95,zz,.025,1.52,.045,mats.trim);
    box(model,8.99,1.37,zz,.42,.85,.95,material('#d8dbd5'));
    const fan=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.025,20),mats.stone);
    fan.rotation.z=Math.PI/2;fan.position.set(9.215,1.37,zz);model.add(fan);
    beam(model,[9.04,.22,zz+.5],[9.04,1.55,zz+.5],.025,mats.trim);
  }
  const sideAwning=box(model,leftPassage.x,2.95,-3.3,1.7,.06,7.3,material('#a9b4ae',{transparent:true,opacity:.62,metalness:.15}));
  sideAwning.rotation.z=.05;
  for(const z of [-6.6,-3.3,.2])box(model,-3.46,1.46,z,.055,2.85,.055,mats.metal);
  for(const z of [-1.0,-1.7])box(model,-1.99,.78,z,.47,1.3,.53,material('#c2b392'));
  // Simple drying rack, kept separate from the permanent house geometry.
  for(const x of [-2.98,-2.34])for(const z of [-4.9,-3.8])box(model,x,.87,z,.024,1.5,.024,mats.trim);
  for(const x of [-2.98,-2.66,-2.34])box(model,x,1.64,-4.35,.02,.025,1.1,mats.trim);
  createKitchen(model);
  const rearPathFront=HOME.kitchen.z-HOME.kitchen.depth/2;
  const rearPathDepth=rearPathFront-HOME.fence.backZ;
  box(model,(HOME.fence.leftX+HOME.fence.rightX)/2,.115,(rearPathFront+HOME.fence.backZ)/2,HOME.fence.rightX-HOME.fence.leftX-.18,.12,rearPathDepth-.12,mats.concrete,false);
  // Stone-clad columns and small orange bench at the front.
  for(const xx of [2.75,8.65]){
    box(model,xx,1.74,3.7,.48,2.8,.48,mats.stone);
    for(let y=.5;y<3.1;y+=.24)box(model,xx,y,3.95,.49,.018,.015,mats.trim,false);
  }
  for(let i=0;i<3;i++)box(model,6.35,.94+i*.16,3.74,2.3,.11,.12,mats.wood);
  box(model,6.35,.58,3.50,2.4,.13,.65,mats.wood);
  for(const xx of [5.3,7.4])box(model,xx,.73,3.75,.045,1.35,.06,mats.metal);
  box(model,5.25,.14,4.27,5.9,.18,.52,mats.concrete);
  box(model,5.25,.07,4.67,6.1,.10,.4,mats.concrete);
  // Detached carport in front of the house. Everything moves/rotates together.
  const cp=HOME.carport;
  const carport=new THREE.Group();carport.name='Detached carport';
  carport.position.set(cp.x,0,cp.z);
  carport.rotation.y=THREE.MathUtils.degToRad(cp.rotationDegrees);model.add(carport);
  // Shares the courtyard slab rather than creating a raised parking platform.
  const roofMetal=material('#a6b5b2',{metalness:.5,roughness:.48});
  const cpRoof=box(carport,0,cp.height,0,cp.width+.6,.13,cp.depth+.4,roofMetal);
  cpRoof.rotation.z=-.035;
  for(let x=-cp.width/2;x<=cp.width/2;x+=.28){
    const y=cp.height-x*.035+.09;
    box(carport,x,y,0,.038,.025,cp.depth+.45,roofMetal,false);
  }
  const supportXs=[-cp.width/2+.25,cp.width/2-.25];
  const supportZs=[-cp.depth/2+.25,cp.depth/2-.25];
  for(const xx of supportXs)for(const zz of supportZs){
    const top=cp.height-xx*.035-.10;
    box(carport,xx,top/2,zz,.12,top,.12,mats.metal);
  }
  for(const zz of supportZs){
    const crossbeam=box(carport,0,cp.height-.16,zz,cp.width,.16,.12,mats.metal);
    crossbeam.rotation.z=-.035;
    for(const xx of supportXs){
      const direction=xx>0?-1:1;
      beam(carport,[xx,cp.height-xx*.035-.85,zz],[xx+direction*.7,cp.height-(xx+direction*.7)*.035-.15,zz],.04,mats.metal);
    }
  }
  for(const xx of [-cp.width/2+.25,cp.width/2-.25]){
    box(carport,xx,cp.height-xx*.035-.16,0,.12,.16,cp.depth,mats.metal);
  }
  // CCTV shows two actual cars. Capacity does not imply four visible vehicles.
  for(const parked of cp.vehicles){
    const car=vehicle(carport,parked.x,parked.z,parked.color,parked.pickup);
    car.position.y=.03;
    car.rotation.y=THREE.MathUtils.degToRad(parked.rotationDegrees);
    car.scale.y=parked.heightScale??1;
  }
  // Solid side/rear boundaries; front steel pickets and sliding gate.
  const fenceDepth=fenceZ-HOME.fence.backZ,fenceCenter=(fenceZ+HOME.fence.backZ)/2;
  box(model,HOME.fence.leftX,1.05,fenceCenter,.18,2.0,fenceDepth,mats.trim);
  box(model,HOME.fence.rightX,1.05,fenceCenter,.18,2.0,fenceDepth,mats.trim);
  const rg=HOME.rearGate,gateRearL=rg.x-rg.width/2,gateRearR=rg.x+rg.width/2;
  // Split the rear wall so the pedestrian gate is a real opening, not a panel over a wall.
  for(const [a,b] of [[HOME.fence.leftX,gateRearL],[gateRearR,HOME.fence.rightX]]){
    box(model,(a+b)/2,1.05,HOME.fence.backZ,b-a,2.0,.18,mats.trim);
  }
  for(const x of [gateRearL,gateRearR])box(model,x,1.04,HOME.fence.backZ,.13,2.06,.22,mats.wall);
  const rearGate=new THREE.Group();rearGate.name='Rear pedestrian gate';
  rearGate.position.set(gateRearL,0,HOME.fence.backZ);
  rearGate.rotation.y=-THREE.MathUtils.degToRad(rg.openingDegrees);model.add(rearGate);
  box(rearGate,rg.width/2,rg.height/2+.08,0,rg.width,rg.height,.055,material('#7d8580'));
  for(let x=.12;x<rg.width;x+=.16)box(rearGate,x,rg.height/2+.08,.035,.015,rg.height-.12,.02,mats.metal,false);
  box(rearGate,rg.width-.13,.96,.065,.055,.15,.035,mats.metal);
  for(let x=-.5;x<10;x+=1.2)shrub(model,x,HOME.fence.backZ+.23,.18,'#6b845d');
  const gateL=HOME.gate.center-HOME.gate.width/2,gateR=HOME.gate.center+HOME.gate.width/2;
  const frontLeft=HOME.fence.leftX+.08,frontRight=HOME.fence.rightX-.08;
  const pillars=[frontLeft,gateL,gateR,frontRight];
  for(const [a,b] of [[frontLeft,gateL],[gateR,frontRight]]){
    const sections=Math.ceil((b-a)/3);
    for(let i=1;i<sections;i++)pillars.push(a+(b-a)*i/sections);
  }
  for(const xx of pillars){
    box(model,xx,1.1,fenceZ,.4,2.1,.4,mats.wall);
    box(model,xx,2.18,fenceZ,.48,.12,.48,mats.trim);
  }
  for(const [a,b] of [[frontLeft,gateL],[gateR,frontRight]]){
    box(model,(a+b)/2,.36,fenceZ,b-a,.65,.18,mats.trim);
    box(model,(a+b)/2,.73,fenceZ,b-a,.15,.26,mats.wall);
    for(const y of [.9,1.94])box(model,(a+b)/2,y,fenceZ,b-a,.055,.07,mats.metal);
    for(let xx=a+.15;xx<b;xx+=.16)box(model,xx,1.37,fenceZ,.045,1.17,.045,mats.metal);
  }
  box(model,HOME.gate.center,.34,fenceZ,HOME.gate.width,.55,.085,mats.metal);
  for(const y of [.65,1.99])box(model,HOME.gate.center,y,fenceZ,HOME.gate.width,.085,.085,mats.metal);
  for(let xx=gateL+.12;xx<gateR;xx+=.14)box(model,xx,1.34,fenceZ,.045,1.30,.055,mats.metal);
  for(const xx of [gateL+.22,gateR-.22])cylinder(model,xx,.14,fenceZ,.09,.05,mats.metal);
  // Driveway ramp and flower border outside the fence.
  box(model,HOME.gate.center,.06,fenceZ+.75,HOME.gate.width,.10,1.5,mats.concrete,false);
  for(const [a,b] of [[frontLeft+.2,gateL-.4],[gateR+.4,frontRight-.2]]){
    box(model,(a+b)/2,.10,fenceZ+.43,b-a,.13,.45,mats.soil,false);
    for(let xx=a;xx<b;xx+=.48){
      shrub(model,xx,fenceZ+.43,.25,'#7c925e');
      for(let i=0;i<2;i++){
        const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.045,0),material(i?'#ecd1b4':'#c3878b'));
        flower.position.set(xx+(random()-.5)*.2,.46+random()*.16,fenceZ+.43+(random()-.5)*.2);model.add(flower);
      }
    }
  }
  for(const t of HOME.trees)tree(model,t.x,t.z,t.height,t.radius);
  palm(model,9.9,7.0);
  for(let z=5.2;z<fenceZ-.65;z+=1.05){
    const plant=shrub(model,10.3,z,.52);plant.position.y-=.1;
  }
  for(const xx of [1.7,8.5]){
    cylinder(model,xx,.30,4.4,.3,.5,material('#8a7560'));
    shrub(model,xx,4.4,.4,'#4d7454');
  }
  // Context is intentionally less detailed than the user's own property.
  const context=new THREE.Group();world.add(context);
  const contextWall=material('#c0c5b7'),contextRoof=material('#8a9384');
  // The neighbouring structure forms the other side of the narrow side-1 passage.
  box(context,-7.95,1.2,-5.7,7.3,2.35,12.2,contextWall);
  box(context,-7.95,2.43,-5.7,7.55,.10,12.45,material('#9bacad',{metalness:.35}));
  palm(context,13.2,-6.5);palm(context,13.0,-9.6);
  for(const x of [-16,16.5]){
    box(context,x,1.28,-5,5,2.5,8,contextWall);
    hipRoof(context,x,-5,5.8,8.8,2.65,1.2,contextRoof);
    box(context,x,.7,3.0,4.6,1.3,.15,contextWall);
  }
  for(const x of [-15.5,15.8])tree(context,x,6.8,3.8,1.5);
  for(let i=0;i<12;i++)shrub(context,-16.5+random()*33,-15+random()*1.3,.25+random()*.3,'#889777');
  return { world, model, createLights: () => createLights(model) };
}

function radialTexture() {
  return canvasTexture((ctx,s)=>{
    const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    g.addColorStop(0,'rgba(255,227,173,1)');g.addColorStop(.15,'rgba(255,214,145,.6)');g.addColorStop(.5,'rgba(255,201,121,.13)');g.addColorStop(1,'rgba(255,193,105,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,s,s);
  },128);
}
function createLights(parent) {
  const groups={};const glowTexture=radialTexture();
  for(const [id,zone] of Object.entries(HOME.lights)){
    const group={ lights:[], glass:[], glows:[], pools:[] };
    let lightParent=parent;
    if(zone.space==='carport'){
      lightParent=new THREE.Group();
      lightParent.position.set(HOME.carport.x,0,HOME.carport.z);
      lightParent.rotation.y=THREE.MathUtils.degToRad(HOME.carport.rotationDegrees);
      parent.add(lightParent);
    }
    for(const [x,y,z] of zone.positions){
      const light=new THREE.PointLight('#ffd7a0',zone.intensity,11,2);light.position.set(x,y,z);lightParent.add(light);group.lights.push(light);
      const fixtureMat=material('#f7e5b9',{emissive:'#ffcc88',emissiveIntensity:.7});
      if(id==='fence'){
        box(lightParent,x,y-.03,z,.28,.36,.28,fixtureMat);
        box(lightParent,x,y+.19,z,.35,.07,.35,mats.trim);
        box(lightParent,x,y-.24,z,.20,.08,.20,mats.trim);
      }else{
        box(lightParent,x,y+.055,z,.31,.06,.31,mats.metal);
        box(lightParent,x,y-.015,z,.24,.07,.24,fixtureMat);
      }
      group.glass.push(fixtureMat);
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:'#ffce88',transparent:true,depthWrite:false,opacity:.3,blending:THREE.AdditiveBlending}));
      glow.position.copy(light.position);glow.scale.set(1.6,1.6,1.6);lightParent.add(glow);group.glows.push(glow);
      const pool=new THREE.Mesh(new THREE.PlaneGeometry(id==='carport'?6:4.5,id==='carport'?6:4.5),new THREE.MeshBasicMaterial({map:glowTexture,color:'#ffe5b9',transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending}));
      pool.rotation.x=-Math.PI/2;pool.position.set(x,.095,z);lightParent.add(pool);group.pools.push(pool);
    }
    groups[id]=group;
  }
  return groups;
}
