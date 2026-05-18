/* resonance/js/room3d.js — 3D Guard Room with player body & collision */

var ROOM3D = {
  active: false,
  player: { x:0, z:80, eyeHeight:55, radius:20, headBob:0, bobSpeed:0.12, bobAmount:2, isMoving:false },
  rot: { x:5, y:0 },
  keys: {},
  mouseDown: false,
  lastMouse: {x:0,y:0},
  moveSpeed: 2.2,
  lookSpeed: 0.25,
  animFrame: null,
  roomW: 175, roomD: 215,
  // Furniture [centerX, centerZ, halfW, halfD]
  furniture: [
    [-130, -50, 45, 30],  // desk
    [-130,  10, 20, 20],  // chair
    [ 135, -70, 35, 55],  // bed
    [ -20,  55, 40, 25],  // table
  ],

  open: function(){
    this.active = true;
    this.player.x = 0; this.player.z = 80;
    this.player.headBob = 0;
    this.rot = {x:5, y:0};
    this.keys = {};
    document.getElementById('room3d-screen').classList.add('active');
    this.buildRoom();
    this.bindEvents();
    this._startDust();
    this.loop();
  },

  close: function(){
    this.active = false;
    document.getElementById('room3d-screen').classList.remove('active');
    if(this.animFrame) cancelAnimationFrame(this.animFrame);
    this.unbindEvents();
    this._stopDust();
    showScreen('lobby-screen');
  },

  canMoveTo: function(nx, nz){
    var r = this.player.radius;
    if(nx-r < -this.roomW || nx+r > this.roomW) return false;
    if(nz-r < -this.roomD || nz+r > this.roomD) return false;
    for(var i=0;i<this.furniture.length;i++){
      var f=this.furniture[i];
      var cx=Math.max(f[0]-f[2], Math.min(f[0]+f[2], nx));
      var cz=Math.max(f[1]-f[3], Math.min(f[1]+f[3], nz));
      var dx=nx-cx, dz=nz-cz;
      if(dx*dx+dz*dz < r*r) return false;
    }
    return true;
  },

  buildRoom: function(){
    var scene = document.getElementById('room3d-scene');
    if(!scene) return;
    var W=400, H=300, D=500;
    scene.innerHTML =
     '<div class="r3d-face r3d-floor" style="width:'+W+'px;height:'+D+'px;transform:rotateX(90deg) translateZ(-'+H/2+'px)"><div class="r3d-floor-tiles"></div><div class="r3d-floor-debris"></div></div>'
    +'<div class="r3d-face r3d-ceiling" style="width:'+W+'px;height:'+D+'px;transform:rotateX(-90deg) translateZ(-'+H/2+'px)"><div class="r3d-ceiling-lamp"></div><div class="r3d-ceiling-cracks"></div></div>'
    +'<div class="r3d-face r3d-wall-back" style="width:'+W+'px;height:'+H+'px;transform:translateZ(-'+D/2+'px)"><div class="r3d-window"><div class="r3d-window-glass"></div><div class="r3d-window-bars"></div></div><div class="r3d-graffiti">ХОЙ</div><div class="r3d-crack r3d-crack-1"></div><div class="r3d-crack r3d-crack-2"></div><div class="r3d-wall-texture"></div></div>'
    +'<div class="r3d-face r3d-wall-front" style="width:'+W+'px;height:'+H+'px;transform:rotateY(180deg) translateZ(-'+D/2+'px)"><div class="r3d-door"><div class="r3d-door-handle"></div><div class="r3d-door-frame"></div></div><div class="r3d-wall-texture"></div></div>'
    +'<div class="r3d-face r3d-wall-left" style="width:'+D+'px;height:'+H+'px;transform:rotateY(90deg) translateZ(-'+W/2+'px)"><div class="r3d-monitors"><div class="r3d-monitor r3d-m1"></div><div class="r3d-monitor r3d-m2"></div><div class="r3d-monitor r3d-m3"></div></div><div class="r3d-desk"></div><div class="r3d-chair"></div><div class="r3d-wall-texture"></div></div>'
    +'<div class="r3d-face r3d-wall-right" style="width:'+D+'px;height:'+H+'px;transform:rotateY(-90deg) translateZ(-'+W/2+'px)"><div class="r3d-bed"><div class="r3d-bed-frame"></div><div class="r3d-bed-mattress"></div></div><div class="r3d-shelf"></div><div class="r3d-poster"></div><div class="r3d-wall-texture"></div></div>'
    +'<div class="r3d-obj r3d-table" style="transform:translate3d(-20px,-'+H/2+'px,55px) rotateX(90deg)"></div>'
    +'<div class="r3d-obj r3d-cup" style="transform:translate3d(0px,-65px,55px)"></div>'
    +'<div class="r3d-obj r3d-papers" style="transform:translate3d(-40px,-62px,45px) rotateY(15deg)"></div>'
    +'<div class="r3d-obj r3d-flashlight-obj" style="transform:translate3d(30px,-62px,65px) rotateY(-10deg)"></div>';
    this.updateCamera();
  },

  updateCamera: function(){
    var cam = document.getElementById('room3d-camera');
    if(!cam) return;
    var p = this.player;
    var bobY = Math.sin(p.headBob) * p.bobAmount * (p.isMoving?1:0.1);
    var py = -(150 - p.eyeHeight + bobY);
    cam.style.transform = 'rotateX('+this.rot.x+'deg) rotateY('+this.rot.y+'deg) translate3d('+(-p.x)+'px,'+py+'px,'+(-p.z)+'px)';
    // Player body overlay
    var body = document.getElementById('r3d-player-body');
    if(body){
      var armBob = Math.sin(p.headBob*0.7) * 4 * (p.isMoving?1:0.2);
      body.style.transform = 'translateY('+armBob+'px)';
    }
  },

  loop: function(){
    if(!this.active) return;
    var self = this;
    var speed = this.moveSpeed;
    var rad = this.rot.y * Math.PI / 180;
    var dx=0, dz=0, moving=false;

    if(this.keys['w']||this.keys['ц']){ dz-=Math.cos(rad)*speed; dx-=Math.sin(rad)*speed; moving=true; }
    if(this.keys['s']||this.keys['ы']){ dz+=Math.cos(rad)*speed; dx+=Math.sin(rad)*speed; moving=true; }
    if(this.keys['a']||this.keys['ф']){ dx+=Math.cos(rad)*speed; dz-=Math.sin(rad)*speed; moving=true; }
    if(this.keys['d']||this.keys['в']){ dx-=Math.cos(rad)*speed; dz+=Math.sin(rad)*speed; moving=true; }

    // Collision with wall sliding
    var nx=this.player.x+dx, nz=this.player.z+dz;
    if(this.canMoveTo(nx,nz)){ this.player.x=nx; this.player.z=nz; }
    else if(this.canMoveTo(nx,this.player.z)){ this.player.x=nx; }
    else if(this.canMoveTo(this.player.x,nz)){ this.player.z=nz; }

    this.player.isMoving = moving;
    if(moving) this.player.headBob += this.player.bobSpeed;
    else this.player.headBob *= 0.92;

    if(this.keys['arrowleft'])  this.rot.y += 1.8;
    if(this.keys['arrowright']) this.rot.y -= 1.8;
    if(this.keys['arrowup'])   this.rot.x = Math.min(50, this.rot.x+1.2);
    if(this.keys['arrowdown']) this.rot.x = Math.max(-50, this.rot.x-1.2);
    this.rot.y = ((this.rot.y%360)+360)%360;

    this.updateCamera();
    this.animFrame = requestAnimationFrame(function(){ self.loop(); });
  },

  _onKeyDown:null, _onKeyUp:null, _onMouseDown:null, _onMouseMove:null, _onMouseUp:null,
  bindEvents: function(){
    var self = this;
    this._onKeyDown = function(e){
      if(e.key==='Escape'){self.close();return;}
      self.keys[e.key.toLowerCase()]=true;
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(e.key.toLowerCase())>=0) e.preventDefault();
    };
    this._onKeyUp = function(e){self.keys[e.key.toLowerCase()]=false;};
    this._onMouseDown = function(e){
      if(e.target.closest('.r3d-back-btn'))return;
      self.mouseDown=true; self.lastMouse={x:e.clientX,y:e.clientY};
    };
    this._onMouseMove = function(e){
      if(!self.mouseDown)return;
      var dx=e.clientX-self.lastMouse.x, dy=e.clientY-self.lastMouse.y;
      self.rot.y -= dx*self.lookSpeed;
      self.rot.x = Math.max(-50, Math.min(50, self.rot.x+dy*self.lookSpeed));
      self.lastMouse={x:e.clientX,y:e.clientY};
    };
    this._onMouseUp = function(){self.mouseDown=false;};
    document.addEventListener('keydown',this._onKeyDown);
    document.addEventListener('keyup',this._onKeyUp);
    document.addEventListener('mousedown',this._onMouseDown);
    document.addEventListener('mousemove',this._onMouseMove);
    document.addEventListener('mouseup',this._onMouseUp);
  },
  unbindEvents: function(){
    if(this._onKeyDown)document.removeEventListener('keydown',this._onKeyDown);
    if(this._onKeyUp)document.removeEventListener('keyup',this._onKeyUp);
    if(this._onMouseDown)document.removeEventListener('mousedown',this._onMouseDown);
    if(this._onMouseMove)document.removeEventListener('mousemove',this._onMouseMove);
    if(this._onMouseUp)document.removeEventListener('mouseup',this._onMouseUp);
  },

  _dustInterval:null,
  _startDust: function(){
    var c=document.getElementById('r3d-dust'); if(!c)return; c.innerHTML='';
    var self=this;
    this._dustInterval=setInterval(function(){
      if(!self.active||c.children.length>20)return;
      var p=document.createElement('div'); p.className='r3d-dust-p';
      p.style.left=Math.random()*100+'%'; p.style.top=50+Math.random()*50+'%';
      p.style.setProperty('--dx',((Math.random()-0.5)*80)+'px');
      p.style.setProperty('--dy',(-(50+Math.random()*150))+'px');
      var d=5+Math.random()*8; p.style.animationDuration=d+'s';
      var sz=1+Math.random()*2; p.style.width=sz+'px'; p.style.height=sz+'px';
      c.appendChild(p);
      setTimeout(function(){if(p.parentNode)p.parentNode.removeChild(p);},d*1000);
    },600);
  },
  _stopDust: function(){ if(this._dustInterval){clearInterval(this._dustInterval);this._dustInterval=null;} }
};
