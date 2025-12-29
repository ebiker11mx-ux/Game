// ===== SERVER =====
const http = require("http");
const WebSocket = require("ws");

const players = {};

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  const id = Math.random().toString(36).slice(2);
  players[id] = { x: 0, y: 5, z: 0 };

  ws.send(JSON.stringify({ type: "id", id }));

  ws.on("message", msg => {
    const data = JSON.parse(msg);
    if (data.type === "update") players[id] = data.pos;
  });

  ws.on("close", () => delete players[id]);
});

setInterval(() => {
  const msg = JSON.stringify({ type: "players", players });
  wss.clients.forEach(c => c.readyState === 1 && c.send(msg));
}, 50);

server.listen(8080, () =>
  console.log("Game running on http://localhost:8080")
);

// ===== CLIENT HTML =====
const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>3D Obby</title>
<style>
body { margin:0; overflow:hidden; background:black }
button {
  position:fixed; bottom:20px;
  width:70px; height:70px;
  border-radius:50%;
  font-size:18px;
}
#left{left:20px}
#right{left:110px}
#jump{right:20px}
</style>
</head>
<body>

<button id="left">◀</button>
<button id="right">▶</button>
<button id="jump">⬆</button>

<script src="https://cdn.jsdelivr.net/npm/three@0.158/build/three.min.js"></script>
<script>
let scene=new THREE.Scene();
let camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
let renderer=new THREE.WebGLRenderer();
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff,0x444444));

const platforms=[];
function platform(x,y,z,w=6){
  const p=new THREE.Mesh(
    new THREE.BoxGeometry(w,1,6),
    new THREE.MeshStandardMaterial({color:0x654321})
  );
  p.position.set(x,y,z);
  platforms.push(p);
  scene.add(p);
}
platform(0,0,0,20);
platform(8,3,0);
platform(16,6,0);
platform(24,9,0);

const checkpoint=new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0x00ff00})
);
checkpoint.position.set(24,10,0);
scene.add(checkpoint);

const player=new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0xff0000})
);
player.position.y=5;
scene.add(player);

camera.position.set(0,6,10);

let velY=0, grounded=false;
let checkpointPos={x:0,y:5,z:0};

let left=false,right=false;
left.onclick=()=>left=true;
right.onclick=()=>right=true;
jump.onclick=()=>{ if(grounded) velY=0.3 };

document.body.addEventListener("touchend",()=>{
  left=false; right=false;
});

const ws=new WebSocket("ws://"+location.host);
let myId=null;
const others={};

ws.onmessage=e=>{
  const d=JSON.parse(e.data);
  if(d.type==="id") myId=d.id;
  if(d.type==="players"){
    for(let id in d.players){
      if(id===myId) continue;
      if(!others[id]){
        const m=player.clone();
        m.material=new THREE.MeshStandardMaterial({color:0x0000ff});
        scene.add(m);
        others[id]=m;
      }
      others[id].position.set(
        d.players[id].x,
        d.players[id].y,
        d.players[id].z
      );
    }
  }
};

function loop(){
  requestAnimationFrame(loop);

  if(left) player.position.x-=0.1;
  if(right) player.position.x+=0.1;

  velY-=0.01;
  player.position.y+=velY;

  grounded=false;
  platforms.forEach(p=>{
    if(Math.abs(player.position.x-p.position.x)<3 &&
       player.position.y<=p.position.y+1 &&
       player.position.y>=p.position.y){
      velY=0;
      grounded=true;
      player.position.y=p.position.y+1;
    }
  });

  if(player.position.distanceTo(checkpoint.position)<1){
    checkpointPos={...player.position};
  }

  if(player.position.y<-10){
    player.position.set(
      checkpointPos.x,
      checkpointPos.y,
      checkpointPos.z
    );
  }

  camera.position.x=player.position.x;
  camera.lookAt(player.position);

  ws.send(JSON.stringify({
    type:"update",
    pos:{
      x:player.position.x,
      y:player.position.y,
      z:player.position.z
    }
  }));

  renderer.render(scene,camera);
}
loop();
</script>
</body>
</html>
`;
