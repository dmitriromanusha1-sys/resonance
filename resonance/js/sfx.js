/* resonance/js/sfx.js — Synthesized sound effects via Web Audio API */

var SFX = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  musicGain: null,
  enabled: true,
  musicEnabled: true,
  currentTrack: 'ambient1',
  currentTrackNodes: [],

  // Lazy-init audio context (must be after first user gesture)
  init: function(){
    if(this.ctx) return this.ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.masterGain);

      // Применяем сохранённую громкость
      this.applySavedVolume();
    } catch(e){
      this.ctx = null;
    }
    return this.ctx;
  },

  applySavedVolume: function(){
    if(typeof CFG === 'undefined') return;
    if(this.masterGain && CFG.masterVol != null){
      this.masterGain.gain.value = (CFG.masterVol / 100) || 0.5;
    }
    if(CFG.sfxEnabled === false) this.enabled = false;
    if(CFG.menuMusic === false) this.musicEnabled = false;
  },

  setMaster: function(v){
    if(!this.ctx) this.init();
    if(this.masterGain){
      this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  },

  setSfxEnabled: function(b){
    this.enabled = !!b;
  },

  setMusicEnabled: function(b){
    this.musicEnabled = !!b;
    if(!b) this.stopMusic();
    else this.playMusic(this.currentTrack);
  },

  // ─── SFX HELPERS ──────────────────────────────────────────────────────────
  _envelope: function(gainNode, attack, hold, release, peak){
    var t = this.ctx.currentTime;
    peak = peak || 1.0;
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(peak, t + attack);
    gainNode.gain.setValueAtTime(peak, t + attack + hold);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + attack + hold + release);
  },

  _noise: function(durSec){
    var ctx = this.ctx;
    var len = Math.floor(ctx.sampleRate * durSec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for(var i=0; i<len; i++) data[i] = Math.random()*2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },

  // ─── INDIVIDUAL SFX ───────────────────────────────────────────────────────

  // Стук в дверь — глухой удар низкой частоты, повторяется
  doorKnock: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    for(var k=0; k<3; k++){
      var t0 = ctx.currentTime + k*0.18;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t0);
      osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.15);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.5, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.18);
    }
  },

  // Выстрел обреза — короткий удар + взрывной шум
  shotgun: function(){
    // Play real shotgun audio
    var el = document.getElementById('sfx-shotgun');
    if(el && typeof AUDIO !== 'undefined' && !AUDIO.muted){
      el.currentTime = 0;
      el.volume = 0.75;
      el.play().catch(function(){});
    }
  },

  // Мина — взрыв (мощнее обреза)
  mineBlast: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    // Низкий бас-удар
    var osc = ctx.createOscillator();
    var oscG = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.6);
    oscG.gain.setValueAtTime(0.7, t);
    oscG.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(oscG).connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.8);
    // Шумовая взрывная волна
    var n = this._noise(0.8);
    var nG = ctx.createGain();
    var nF = ctx.createBiquadFilter();
    nF.type = 'lowpass';
    nF.frequency.setValueAtTime(1500, t);
    nF.frequency.exponentialRampToValueAtTime(80, t + 0.7);
    nG.gain.setValueAtTime(0.6, t);
    nG.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    n.connect(nF).connect(nG).connect(this.sfxGain);
    n.start(t); n.stop(t + 0.85);
  },

  // Ракета/ракетница — свистящий взлёт + взрыв
  flareLaunch: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.55);
  },

  // EMP-импульс — высокочастотный ZAP с быстрым затуханием
  emp: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    // Высокий тон скользит вверх
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(3000, t + 0.15);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.25);
    // "Электрический" шум
    var n = this._noise(0.2);
    var nG = ctx.createGain();
    var nF = ctx.createBiquadFilter();
    nF.type = 'highpass';
    nF.frequency.value = 2000;
    nG.gain.setValueAtTime(0.3, t);
    nG.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(nF).connect(nG).connect(this.sfxGain);
    n.start(t); n.stop(t + 0.25);
  },

  // Появление тени — низкий рёв + дрожь
  shadeAppear: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    [60, 90, 120].forEach(function(freq, idx){
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq*0.7, t + 1.5);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.3);
      g.gain.linearRampToValueAtTime(0.1, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(g).connect(SFX.sfxGain);
      osc.start(t); osc.stop(t + 1.7);
    });
  },

  // Тревога — резкий пик-пик-пик
  alarm: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    for(var i=0; i<4; i++){
      var t0 = ctx.currentTime + i*0.2;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.setValueAtTime(0.25, t0 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
      osc.connect(g).connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.15);
    }
  },

  // Победа ночи — мажорный аккорд возрастающий
  nightWin: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    [392, 494, 587].forEach(function(freq, idx){
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx*0.12);
      g.gain.setValueAtTime(0, t + idx*0.12);
      g.gain.linearRampToValueAtTime(0.2, t + idx*0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx*0.12 + 1.5);
      osc.connect(g).connect(SFX.sfxGain);
      osc.start(t + idx*0.12); osc.stop(t + idx*0.12 + 1.6);
    });
  },

  // Поражение — нисходящий минор
  gameOver: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    [440, 370, 277, 220].forEach(function(freq, idx){
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx*0.25);
      g.gain.setValueAtTime(0, t + idx*0.25);
      g.gain.linearRampToValueAtTime(0.25, t + idx*0.25 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx*0.25 + 1.0);
      osc.connect(g).connect(SFX.sfxGain);
      osc.start(t + idx*0.25); osc.stop(t + idx*0.25 + 1.1);
    });
  },

  // Покупка скилла — короткий клик + всплеск
  skillBuy: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    [659, 880].forEach(function(freq, idx){
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx*0.08);
      g.gain.setValueAtTime(0, t + idx*0.08);
      g.gain.linearRampToValueAtTime(0.18, t + idx*0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx*0.08 + 0.3);
      osc.connect(g).connect(SFX.sfxGain);
      osc.start(t + idx*0.08); osc.stop(t + idx*0.08 + 0.35);
    });
  },

  // Клик кнопки UI — короткий тик
  uiClick: function(){
    if(!this.enabled || !this.init()) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.06);
  }
};
