/* resonance/js/weather.js — Dynamic weather system */

var WEATHER = {
  current: 'clear',    // clear, rain, fog, storm, wind
  intensity: 0,        // 0-1
  transitioning: false,
  interval: null,
  lightningTimer: null,

  // Weather types and their effects
  types: {
    clear:  { label:'ЯСНО',   icon:'🌙', npcSpeed:1.0,  camVisibility:1.0,  powerDrain:1.0 },
    wind:   { label:'ВЕТЕР',  icon:'💨', npcSpeed:0.85, camVisibility:0.9,  powerDrain:1.05 },
    rain:   { label:'ДОЖДЬ',  icon:'🌧', npcSpeed:0.9,  camVisibility:0.7,  powerDrain:1.1 },
    fog:    { label:'ТУМАН',  icon:'🌫', npcSpeed:0.75, camVisibility:0.4,  powerDrain:1.0 },
    storm:  { label:'ГРОЗА',  icon:'⛈',  npcSpeed:1.15, camVisibility:0.5,  powerDrain:1.25 }
  },

  // Possible weathers per chapter
  pool: {
    chapter1: ['clear','clear','clear','wind','rain'],
    chapter2: ['clear','wind','rain','rain','fog'],
    chapter3: ['rain','fog','storm','storm','wind']
  },

  init: function(levelNum){
    this.stop();
    // Pick weather based on chapter
    var pool;
    if(levelNum <= 5) pool = this.pool.chapter1;
    else if(levelNum <= 10) pool = this.pool.chapter2;
    else pool = this.pool.chapter3;
    this.current = RNG.pick(pool);
    this.intensity = 0;
    this.applyVisuals();
    this.updateHUD();
    // Fade in
    var self = this;
    setTimeout(function(){ self.fadeIn(); }, 2000);
    // Schedule weather changes every 2-4 game hours
    this.interval = setInterval(function(){
      if(!G.gameActive) return;
      if(RNG.chance(35)){
        self.changeTo(RNG.pick(pool));
      }
    }, RNG.range(90000, 150000));
  },

  stop: function(){
    if(this.interval){ clearInterval(this.interval); this.interval=null; }
    if(this.lightningTimer){ clearInterval(this.lightningTimer); this.lightningTimer=null; }
    this.current = 'clear';
    this.intensity = 0;
    this.removeVisuals();
  },

  fadeIn: function(){
    var self = this;
    var target = 0.6 + RNG.roll(4) * 0.1;
    var step = 0;
    var anim = setInterval(function(){
      step += 0.02;
      self.intensity = Math.min(target, step);
      self.applyVisuals();
      if(step >= target) clearInterval(anim);
    }, 50);
  },

  changeTo: function(type){
    if(type === this.current) return;
    var self = this;
    this.transitioning = true;
    // Fade out old
    var fadeOut = setInterval(function(){
      self.intensity -= 0.03;
      if(self.intensity <= 0){
        self.intensity = 0;
        clearInterval(fadeOut);
        self.current = type;
        self.updateHUD();
        addLog(self.types[type].icon + ' Погода: ' + self.types[type].label, '');
        // Fade in new
        self.fadeIn();
        self.transitioning = false;
      }
      self.applyVisuals();
    }, 40);
  },

  // Get current NPC speed multiplier
  getNpcSpeedMult: function(){
    var t = this.types[this.current];
    return t ? 1.0 + (t.npcSpeed - 1.0) * this.intensity : 1.0;
  },

  // Get power drain multiplier
  getPowerDrainMult: function(){
    var t = this.types[this.current];
    return t ? 1.0 + (t.powerDrain - 1.0) * this.intensity : 1.0;
  },

  updateHUD: function(){
    var el = document.getElementById('weather-indicator');
    if(!el) return;
    var t = this.types[this.current];
    el.textContent = t.icon + ' ' + t.label;
    el.className = 'weather-indicator weather-' + this.current;
  },

  applyVisuals: function(){
    // Weather visual effects disabled — pending redesign
    // Only HUD indicator updates
    this.updateHUD();
  },

  startLightning: function(){
    if(this.lightningTimer) return;
    var self = this;
    this.lightningTimer = setInterval(function(){
      if(!G.gameActive || self.current !== 'storm') return;
      if(RNG.chance(40)){
        self.flashLightning();
      }
    }, RNG.range(3000, 8000));
  },

  stopLightning: function(){
    if(this.lightningTimer){
      clearInterval(this.lightningTimer);
      this.lightningTimer = null;
    }
  },

  flashLightning: function(){
    // Disabled — pending redesign
  },

  removeVisuals: function(){
    // Weather visual effects disabled — pending redesign
    this.updateHUD();
  }
};

// Helper: set opacity on fx element
function _fxOp(id, val){
  var el = document.getElementById(id);
  if(el) el.style.opacity = String(Math.min(1, Math.max(0, val)));
}

// ═══════════════════════════════════════════════════════
// AMBIENT PARTICLES — пыль, мусор, мотыльки
// ═══════════════════════════════════════════════════════
var AMBIENT = {
  container: null,
  particles: [],
  interval: null,
  maxParticles: 15,

  init: function(){
    this.stop();
    var view = document.getElementById('main-view');
    if(!view) return;
    var c = document.getElementById('fx-particles');
    if(!c){
      c = document.createElement('div');
      c.id = 'fx-particles';
      c.className = 'fx-particles';
      view.appendChild(c);
    }
    this.container = c;
    this.container.innerHTML = '';
    this.particles = [];
    var self = this;
    // Spawn particles periodically
    this.interval = setInterval(function(){
      if(!G.gameActive) return;
      if(self.particles.length < self.maxParticles){
        self.spawn();
      }
    }, 800);
  },

  spawn: function(){
    if(!this.container) return;
    var p = document.createElement('div');
    p.className = 'fx-particle';
    // Random position
    var x = RNG.roll(100);
    var y = RNG.range(80, 100);
    p.style.left = x + '%';
    p.style.top = y + '%';
    var px = RNG.range(-80, 80);
    var py = -(RNG.range(100, 400));
    p.style.setProperty('--px', px + 'px');
    p.style.setProperty('--py', py + 'px');
    var size = RNG.range(1, 4);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    var dur = RNG.range(4, 12);
    p.style.animationDuration = dur + 's';
    p.style.opacity = String(0.05 + RNG.roll(15) * 0.01);
    this.container.appendChild(p);
    this.particles.push(p);
    // Auto-remove
    var self = this;
    setTimeout(function(){
      if(p.parentNode) p.parentNode.removeChild(p);
      var idx = self.particles.indexOf(p);
      if(idx >= 0) self.particles.splice(idx, 1);
    }, dur * 1000);
  },

  stop: function(){
    if(this.interval){ clearInterval(this.interval); this.interval = null; }
    if(this.container){ this.container.innerHTML = ''; }
    this.particles = [];
  }
};
