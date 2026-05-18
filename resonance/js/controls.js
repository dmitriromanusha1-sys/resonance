/* resonance/js/controls.js */

// ─── КОНТРОЛЫ ─────────────────────────────────────────────────────────────────
function switchRoom(r){
  // Сбросить зум карты если уходим с карты
  if(r !== 'map-global' && typeof _mapCurrentZone !== 'undefined' && _mapCurrentZone) {
    mapZoomReset();
  }
  // Block while hiding
  if(typeof _hiding!=='undefined' && _hiding && r!=='office') return;
  // PC1 required to use cameras (not office/peek/maps)
  if(r.indexOf('cam-')===0){
    var pcLvl = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.pc_level||0 : 0;
    if(pcLvl === 0){ addLog('📵 Нет ПК — камеры недоступны. Прокачай ПК ур.1!','d'); return; }
    if(typeof G!=='undefined' && G.powerOut){ addLog('⚡ ПЕРЕГРУЗКА — камеры недоступны!','d'); return; }
    var _camIsBroken = (typeof isCamBroken==='function' && isCamBroken(r));
  }

  document.querySelectorAll('.room-view').forEach(function(v){v.classList.remove('visible');});
  var rv=document.getElementById('room-'+r);
  if(rv){
    rv.classList.add('visible');
    if(_camIsBroken) rv.classList.add('cam-broken');
    else rv.classList.remove('cam-broken');
  }
  document.querySelectorAll('.cbtn').forEach(function(b){b.classList.remove('active');});
  var cb=document.getElementById('cbtn-'+r);if(cb)cb.classList.add('active');
  G.currentRoom=r;G.stats.camSwitches++;
  // Статика при переключении камеры (если нет навыка УМЕЛЫЙ)
  if(r.indexOf('cam-')===0 && !_camIsBroken){
    var _noStatic = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.quick_door : false;
    if(!_noStatic) triggerCamStatic(r);
  }
  var tabHint = document.getElementById('cam-tab-hint');
  if(tabHint) tabHint.style.display = (r.indexOf('cam-')===0) ? 'block' : 'none';
  updatePowerMeter();
  if(typeof updateSnapButton === 'function') updateSnapButton();
  // Инициализация обзорной карты
  if(r === 'map-global' && typeof initMapOverview === 'function') initMapOverview();
  // Cam04 ambient
  if(typeof CAM04_AMB !== 'undefined'){
    if(r === 'cam-c4'){ CAM04_AMB.start(); } else { CAM04_AMB.stop(); }
  }
  var labels={'office':'ОХРАННАЯ КОМНАТА',
    'peek':'ВЫГЛЯДЫВАНИЕ ИЗ-ЗА ДВЕРИ',
    'map-global':'РЕЗОНАНС — ОБЗОР','map-far':'ДАЛЬНЯЯ ТЕРРИТОРИЯ','map-perimeter':'ПЕРИМЕТР ЗДАНИЯ','map-building':'ПЛАН ЗДАНИЯ',
    'cam-c1a':'КАМ 01А','cam-c1b':'КАМ 01Б',
    'cam-c2':'КАМ 02','cam-c3':'КАМ 03','cam-c4':'КАМ 04',
    'cam-c5a':'КАМ 05А','cam-c5b':'КАМ 05Б',
    'cam-c6':'КАМ 06','cam-c7':'КАМ 07',
    'cam-c8a':'КАМ 08А','cam-c8b':'КАМ 08Б',
    'cam-c9':'КАМ 09','cam-c10':'КАМ 10','cam-c11':'КАМ 11'};
  var rl=document.getElementById('room-label');if(rl)rl.textContent=labels[r]||'';
  var mc=document.getElementById('map-clock');if(mc)mc.textContent=HOURS[G.hour]||'12:00';

  // Show monitor click zone only in office
  var monClick = document.getElementById('monitor-click');
  if(monClick) monClick.style.display = (r==='office') ? 'block' : 'none';

  // Camera mode — hide HUD when viewing cameras
  var gs = document.getElementById('game-screen');
  var isCam = r.indexOf('cam-') === 0 || r.indexOf('map-') === 0;
  if(gs) gs.classList.toggle('cam-mode', isCam);
}
function switchMapView(t){
  switchRoom('map-global');
  if(typeof initMapOverview === 'function') initMapOverview();
}
function toggleDoor(){}
function setDoorUI(closed){}
function isUltimateOffice(){ return false; }
function updateDoorImage(){}
function toggleFlash(){
  if(!G.gameActive||_hiding)return;
  if(G.powerOut){ addLog('⚡ ПЕРЕГРУЗКА — фонарик недоступен!','d'); return; }
  if(G._shadeEMP && G.flashBattery <= 0){ addLog('Фонарик разряжен!','d'); return; }
  if(!G.flashOn&&G.flashBattery<=0){addLog('Фонарик разряжен!','d');return;}
  G.flashOn=!G.flashOn;setFlashUI(G.flashOn);
  if(G.flashOn){
    G.stats.flashUses++;
    // Включение фонаря в режиме soul-drain тени = попытка отгона
    if(G._shadeSoulDrainActive && typeof tryScareSoulDrainShade==='function'){
      tryScareSoulDrainShade();
    }
  }
}
function setFlashUI(on){
  var btn=document.getElementById('flash-btn');
  if(btn){btn.textContent=on?'🔦 ВКЛ [F]':'🔦 [F]';btn.classList.toggle('on',on);}
  var fl=document.getElementById('fl-office');
  if(fl)fl.style.background=on?'radial-gradient(circle at 50% 50%,transparent 22%,rgba(0,0,0,0.97) 56%)':'';
  updatePowerMeter();
}
document.getElementById('main-view').addEventListener('mousemove',function(e){
  if(G.currentRoom!=='office'||!G.flashOn)return;
  var rect=e.currentTarget.getBoundingClientRect();
  var x=((e.clientX-rect.left)/rect.width*100).toFixed(1),y=((e.clientY-rect.top)/rect.height*100).toFixed(1);
  var fl=document.getElementById('fl-office');
  if(fl)fl.style.background='radial-gradient(circle at '+x+'% '+y+'%, transparent 22%, rgba(0,0,0,0.97) 56%)';
});
// Keydown handled by settings keybind system below

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function updateClockAnim(h,pct){
  var hand=document.getElementById('clock-hand');if(!hand)return;
  hand.style.transform='rotate('+(h*60+pct*60)/360*360+'deg)';
}
function updatePowerUI(){
  var el=document.getElementById('hud-power'),bar=document.getElementById('power-bar-fill');
  if(typeof G==='undefined') return;
  var _hasBat = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.has_battery : false;
  if(G.night >= 13 && _hasBat){
    var p=Math.floor(G.power);
    var col=p>50?'#00cc44':p>20?'#ffaa00':'#cc2200';
    if(el){ el.textContent=p+'%'; el.className='pval'; el.style.color=col; }
    if(bar){ bar.style.width=p+'%'; bar.style.background=col; }
    var pctEl=document.getElementById('power-out-pct');
    if(pctEl) pctEl.textContent=p+'%';
    updatePowerMeter();
  } else {
    if(el){ el.textContent='∞'; el.className='pval'; el.style.color='#00cc44'; }
    if(bar){ bar.style.width='100%'; bar.style.background='#00aa22'; }
  }
}
var _powerMeterCollapsed = false;
function togglePowerMeter(){
  _powerMeterCollapsed = !_powerMeterCollapsed;
  var body = document.getElementById('power-meter');
  var arrow = document.getElementById('pm-toggle-arrow');
  if(body) body.style.display = _powerMeterCollapsed ? 'none' : 'block';
  if(arrow) arrow.textContent = _powerMeterCollapsed ? '▶' : '▼';
}
function updatePowerMeter(){
  if(typeof G==='undefined') return;
  var wrap = document.getElementById('power-meter-wrap');
  if(!wrap) return;
  var _hasBatM = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.has_battery : false;
  if(G.night < 13 || !_hasBatM){ wrap.style.display='none'; return; }
  wrap.style.display='block';
  var meter = document.getElementById('power-meter');

  var p = Math.floor(G.power);
  var col = p>50?'#33ff66':p>20?'#ffaa00':'#ff3300';
  var pmPow = document.getElementById('pm-power');
  var pmBar = document.getElementById('pm-power-bar');
  if(pmPow){ pmPow.textContent=p+'%'; pmPow.style.color=col; }
  if(pmBar){ pmBar.style.width=p+'%'; pmBar.style.background=col; }

  var onCam = G.currentRoom && G.currentRoom.indexOf('cam')===0;
  var fx = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects:{};
  var hasSolar = fx.solar_regen > 0;

  // Подсветка активных строк
  function setRow(labelId, valId, active, offVal){
    var lbl=document.getElementById(labelId), val=document.getElementById(valId);
    if(lbl) lbl.style.color = active?'#ccffcc':'#668866';
    if(val) val.style.color = active?'#ffffff':'#668866';
    if(val && offVal && !active) val.textContent = offVal;
  }
  setRow('pm-proj-label','pm-proj-val', G.projectorOn, '−0.35% (выкл)');
  if(document.getElementById('pm-proj-val') && G.projectorOn) document.getElementById('pm-proj-val').textContent='−0.35%';
  setRow('pm-cam-label','pm-cam-val', onCam, '−0.20% (не смотрю)');
  if(document.getElementById('pm-cam-val') && onCam) document.getElementById('pm-cam-val').textContent='−0.20%';
  setRow('pm-flash-label','pm-flash-val', G.flashOn, '−0.25% (выкл)');
  if(document.getElementById('pm-flash-val') && G.flashOn) document.getElementById('pm-flash-val').textContent='−0.25%';

  var solarRow = document.getElementById('pm-row-solar');
  if(solarRow) solarRow.style.display = hasSolar?'flex':'none';

  // Итого
  var drain = 0.15;
  if(G.projectorOn) drain += 0.35;
  if(onCam)         drain += 0.20;
  if(G.flashOn)     drain += 0.25;
  var regen = hasSolar ? 0.20 : 0;
  var net = drain - regen;
  var totalEl = document.getElementById('pm-total');
  if(totalEl){
    totalEl.textContent = (net>0?'−':'+') + Math.abs(net).toFixed(2)+'%';
    totalEl.style.color = net>0?'#ffcc44':'#aacc66';
  }

  // Перегрузка — красная рамка
  var toggleBtn = document.getElementById('power-meter-toggle');
  var borderCol = G.powerOut?'#ff2200':'#33ff66';
  var shadowCol = G.powerOut?'0 0 12px rgba(255,0,0,0.4)':'0 0 10px rgba(0,255,80,0.2)';
  if(meter){ meter.style.borderColor=borderCol; meter.style.boxShadow=shadowCol; }
  if(toggleBtn){ toggleBtn.style.borderColor=borderCol; toggleBtn.style.color=borderCol; toggleBtn.style.boxShadow=shadowCol; }
}
function showPowerSystemTutorial(){
  var overlay = document.getElementById('tutorial-overlay');
  if(!overlay) return;

  var steps = [
    {
      title: '⚡ ЭЛЕКТРОСЕТЬ АКТИВНА',
      text: 'С этой смены объект перешёл на автономное питание.\n\nШкала <b>PWR</b> в верхней панели — уровень электричества. Когда она опустеет — всё оборудование отключится.'
    },
    {
      title: '🔆 ПРОЖЕКТОР [P]',
      text: 'Прожектор освещает лестницу и отгоняет Тень.\n\nНо он потребляет много энергии. Если Тень не активна — <b>выключай его клавишей [P]</b> чтобы экономить питание.'
    },
    {
      title: '📹 КАМЕРЫ И ФОНАРИК',
      text: 'Просмотр камер и фонарик тоже тратят энергию.\n\nПри активном использовании питание кончится около <b>11:00</b>.'
    },
    {
      title: '☀ СОЛНЕЧНЫЕ ПАНЕЛИ',
      text: 'Скилл <b>Солн. панели</b> (ветка ОФИС) даёт постоянную регенерацию +0.20%/сек.\n\nБез них при перегрузке придётся ждать пока панели не накопят 5% — в это время оборудование не работает и рассудок тает быстрее.'
    },
    {
      title: '⚠ ПЕРЕГРУЗКА',
      text: 'Если PWR = 0%:\n\n— Камеры, фонарик, прожектор отключены\n— Датчики не работают\n— Рассудок тает в 1.5× быстрее\n— <b>Тень у двери = мгновенная гибель</b>\n\nСледи за шкалой PWR!'
    },
  ];

  var step = 0;
  function render(){
    var s = steps[step];
    var isLast = step === steps.length - 1;
    var prog = Math.round(((step+1)/steps.length)*100);
    overlay.innerHTML = '<div class="tut-card tut-card-in" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)">'
      + '<div class="tut-progress-bar"><div class="tut-progress-fill" style="width:'+prog+'%"></div></div>'
      + '<div class="tut-step-num">ШАГ '+(step+1)+' / '+steps.length+'</div>'
      + '<div class="tut-title">'+s.title+'</div>'
      + '<div class="tut-text">'+s.text.replace(/\n/g,'<br>')+'</div>'
      + '<div class="tut-buttons">'
      + (step>0 ? '<button class="tut-btn tut-btn-prev" id="pwr-tut-prev">← НАЗАД</button>' : '')
      + (!isLast ? '<button class="tut-btn tut-btn-next" id="pwr-tut-next">ДАЛЕЕ →</button>' : '<button class="tut-btn tut-btn-finish" id="pwr-tut-done">ПОНЯЛ ▶</button>')
      + '</div></div>';
    overlay.classList.add('active');
    var nextBtn = document.getElementById('pwr-tut-next');
    var prevBtn = document.getElementById('pwr-tut-prev');
    var doneBtn = document.getElementById('pwr-tut-done');
    if(nextBtn) nextBtn.onclick = function(){ step++; render(); };
    if(prevBtn) prevBtn.onclick = function(){ step--; render(); };
    if(doneBtn) doneBtn.onclick = function(){ overlay.classList.remove('active'); overlay.innerHTML=''; };
  }
  render();
}
function showPowerOutOverlay(show){
  var el = document.getElementById('power-out-overlay');
  if(el) el.style.display = show ? 'flex' : 'none';
}
function toggleProjector(){
  if(!G.gameActive) return;
  if(G.night < 13) return;
  if(G.powerOut){ addLog('⚡ ПЕРЕГРУЗКА — оборудование недоступно!','d'); return; }
  G.projectorOn = !G.projectorOn;
  var btn = document.getElementById('projector-btn');
  if(btn){
    btn.classList.toggle('on', G.projectorOn);
    btn.textContent = G.projectorOn ? '🔆 ПРОЖЕКТОР [P]' : '🔅 ПРОЖЕКТОР [P]';
  }
  addLog(G.projectorOn ? '🔆 Прожектор включён' : '🔅 Прожектор выключен', '');
  updatePowerMeter();
}
function updateFlashBatteryUI(){
  var bar=document.getElementById('flash-bar-fill'),txt=document.getElementById('flash-bar-txt');
  var p=Math.floor(G.flashBattery);
  if(bar){bar.style.width=p+'%';bar.style.background=p>30?'#aaaa00':p>10?'#ff8800':'#cc0000';}
  if(txt)txt.textContent=p+'%';
}
var logQ=[];
function addLog(msg,t){
  logQ.unshift({msg:msg,t:t});if(logQ.length>4)logQ.pop();
  var log=document.getElementById('event-log');if(!log)return;
  log.innerHTML='';
  for(var i=0;i<logQ.length;i++){
    var sp=document.createElement('span');
    sp.className='log-e'+(logQ[i].t?' log-'+logQ[i].t:'');
    sp.textContent='> '+logQ[i].msg;log.appendChild(sp);
  }
}
var alertT;
function flashAlert(){
  var el=document.getElementById('alert-flash');if(!el)return;
  el.classList.add('flash');clearTimeout(alertT);alertT=setTimeout(function(){el.classList.remove('flash');},220);
}

// ─── СЛУЧАЙНЫЕ СОБЫТИЯ ────────────────────────────────────────────────────────
function startRandomEvents(){
  G.intervals.push(setInterval(function(){
    if(!G.gameActive)return;
    var msgs=[['Шорох на южной дороге...','w'],['Металлический скрежет...','w'],['Шаги на лестнице...','d'],
      ['Тишина...',''],['Помехи на камере...',''],['Движение у ворот...','w'],
      ['Он слышит тебя...','d'],['Клацанье когтей...','w'],['Что-то на востоке...','w'],
      ['Ветки трещат в поле...','w'],['Скрип у входа...','d'],['Западный сектор — тихо.','']];
    if(RNG.chance(3)&&(typeof CFG==='undefined'||CFG.randomEvents)){var m=RNG.pick(msgs);if(typeof CFG==='undefined'||CFG.npcAlerts||m[1]==='')addLog(m[0],m[1]);}
  },1200));
  G.intervals.push(setInterval(function(){
    if(!G.gameActive)return;
    if(RNG.chance(6)){
      var cams=['cam-c1a','cam-c1b','cam-c2','cam-c3','cam-c4','cam-c5a','cam-c5b','cam-c6','cam-c7','cam-c8a','cam-c8b','cam-c9','cam-c10','cam-c11'];
      triggerCamStatic(RNG.pick(cams));
    }
    if(RNG.chance(3)){
      var btns=Array.from(document.querySelectorAll('.cbtn:not(.active)'));
      if(btns.length){var b=RNG.pick(btns);b.style.opacity='0.1';setTimeout(function(){b.style.opacity='';},150);}
    }
  },1500));
  if(G.night>=3){
    G.intervals.push(setInterval(function(){
      if(!G.gameActive)return;
      if(RNG.chance(4)){
        var drop=RNG.range(2,7);G.power=Math.max(1,G.power-drop);
        addLog('Скачок напряжения! -'+Math.floor(drop)+'%','w');updatePowerUI();
        document.body.classList.add('power-flicker');
        setTimeout(function(){document.body.classList.remove('power-flicker');},300);
      }
    },4000));
  }
}
function triggerCamStatic(camId){
  var el=document.getElementById('static-'+camId);
  if(el){el.classList.add('on');setTimeout(function(){el.classList.remove('on');},350+RNG.roll(400));}
}

// ─── АУДИО ────────────────────────────────────────────────────────────────────
var AUDIO={menu:null,game:null,win:null,despair:null,music1:null,music2:null,music3:null,music4:null,music5:null,current:null,muted:false,volume:0.5};
function initAudio(){
  AUDIO.menu=document.getElementById('audio-menu');
  AUDIO.game=document.getElementById('audio-game');
  AUDIO.win=document.getElementById('audio-win');
  AUDIO.despair=document.getElementById('audio-despair');
  // music1-5 — отдельные mp3-треки (music2 = новый офисный, music5 = старый game.mp3)
  AUDIO.music1=AUDIO.menu;
  AUDIO.music2=document.getElementById('audio-music5');  // новый авторский трек
  AUDIO.music3=AUDIO.win;
  AUDIO.music4=AUDIO.despair;
  AUDIO.music5=AUDIO.game;
}
function playTrack(name,vol){
  // Block menu track while game is active
  if(name==='menu' && typeof G!=='undefined' && G.gameActive) return;
  Object.keys(TRACK_META).forEach(function(k){var a=AUDIO[k];if(a&&a.pause){a.pause();a.currentTime=0;}});
  var t=AUDIO[name];if(!t||AUDIO.muted)return;
  t.volume=vol!==undefined?vol:AUDIO.volume;t.currentTime=0;var p=t.play();if(p)p.catch(function(){});
  AUDIO.current=name;updateTrackUI();
}
function stopAllAudio(){Object.keys(TRACK_META).forEach(function(k){var a=AUDIO[k];if(a&&a.pause){a.pause();a.currentTime=0;}});AUDIO.current=null;updateTrackUI();}
function setVolume(val){
  AUDIO.volume=Math.max(0,Math.min(1,parseFloat(val)));
  if(AUDIO.current&&AUDIO[AUDIO.current])AUDIO[AUDIO.current].volume=AUDIO.volume;
  var sl=document.getElementById('vol-slider');if(sl)sl.value=Math.round(AUDIO.volume*100);
  var vt=document.getElementById('vol-txt');if(vt)vt.textContent=Math.round(AUDIO.volume*100)+'%';
}
function setContextTrack(ctx,name){
  TRACK_OVERRIDES[ctx]=name;
  if(AUDIO.current&&TRACK_META[AUDIO.current]&&TRACK_META[AUDIO.current].role===ctx)playTrack(name,AUDIO.volume);
  var s=document.getElementById('sel-'+ctx);if(s)s.value=name;updateTrackUI();
}
function cycleTrack(){var t=Object.keys(TRACK_META);playTrack(t[(t.indexOf(AUDIO.current)+1)%t.length],AUDIO.volume);}
function updateTrackUI(){
  var cur=AUDIO.current,meta=cur&&TRACK_META[cur]?TRACK_META[cur]:{label:'—',icon:'🔇'};
  var tn=document.getElementById('track-name');if(tn)tn.textContent=meta.icon+' '+meta.label;
  var tnH=document.getElementById('track-name-hud');if(tnH)tnH.textContent=meta.icon;
}
function toggleMute(){
  AUDIO.muted=!AUDIO.muted;
  ['mute-btn','mute-btn-hud','mute-btn-panel'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=(AUDIO.muted?'🔇':'🔊')+(id==='mute-btn-hud'?'':AUDIO.muted?' ВЫКЛ':' ВКЛ');});
  if(AUDIO.muted)stopAllAudio();
  else{var s=document.querySelector('.screen.active');var sid=s?s.id:'';
    var ctx='menu';if(sid==='game-screen')ctx='game';else if(sid==='win-screen')ctx='win';else if(sid==='gameover-screen'||sid==='powerout-screen')ctx='despair';
    playTrack(TRACK_OVERRIDES[ctx]||ctx,AUDIO.volume);}
}
setInterval(function(){if(AUDIO.current&&AUDIO[AUDIO.current])updateTrackUI();},3000);
if(typeof audioStarted === 'undefined') var audioStarted = false;
function tryStartAudio(){if(!audioStarted&&!AUDIO.muted){audioStarted=true;playTrack('menu',AUDIO.volume);}
  document.removeEventListener('click',tryStartAudio);}// keydown removed — caused menu music during gameplay
function tryNight(n){var saved=loadSavedNights();if(n===1||saved.indexOf(n-1)>=0){showNotes(n);}else{return;}}
function updateNightButtons(){
  var saved=loadSavedNights();
  // Lobby night cards
  for(var i=1;i<=15;i++){
    var el=document.getElementById('ln-'+i);
    if(el){
      var unlocked=(i===1||saved.indexOf(i-1)>=0);
      var completed=saved.indexOf(i)>=0;
      el.classList.toggle('locked',!unlocked);
      el.classList.toggle('completed',completed);
    }
  }
  // Lobby level display
  var lvl=document.getElementById('lobby-level');
  if(lvl&&typeof LEVEL_SYSTEM!=='undefined') lvl.textContent='УР.'+LEVEL_SYSTEM.level;
}

function exitToLobby(){
  if(typeof G!=='undefined'&&G.gameActive){
    if(!confirm('Выйти в меню? Прогресс текущей смены будет потерян.')) return;
    G.gameActive=false;
    G.intervals.forEach(clearInterval);G.intervals=[];
    Object.values(CREATURES).forEach(function(c){if(typeof stopDoorTimers==='function')stopDoorTimers(c);});
    document.body.classList.remove('panic');
    if(typeof WEATHER!=='undefined') WEATHER.stop();
    if(typeof AMBIENT!=='undefined') AMBIENT.stop();
  }
  if(typeof updateNightButtons==='function') updateNightButtons();
  showScreen('lobby-screen');
}

// ─── PEEK MECHANIC ──────────────────────────────────────────────────────────
var _peeking = false;
var _peekType = null; // 'door' or 'window'

function togglePeek(type){
  if(!G.gameActive||_hiding) return;
  type = type || 'door';
  
  if(_peeking && _peekType === type){
    // Stop peeking
    _peeking = false; _peekType = null;
    switchRoom('office');
    _updatePeekButtons();
    if(G._peekDrain){ clearInterval(G._peekDrain); G._peekDrain=null; }
    return;
  }

  _peeking = true;
  _peekType = type;
  switchRoom(type === 'window' ? 'peek-window' : 'peek');
  _updatePeekButtons();
  addLog('⚠ Ты выглянул '+(type==='window'?'из окна':'из-за двери')+'! Опасно!','w');

  // Drain power while peeking
  if(G._peekDrain) clearInterval(G._peekDrain);
  G._peekDrain = setInterval(function(){
    if(!G.gameActive||!_peeking){ clearInterval(G._peekDrain); G._peekDrain=null; return; }
    G.power = Math.max(0, G.power - 0.08);
    updatePowerUI();
  }, 500);

  // Check if NPC nearby can kill player
  _peekDangerCheck(type);
}

function _updatePeekButtons(){
  var db = document.getElementById('peek-door-btn');
  var wb = document.getElementById('peek-window-btn');
  if(db){
    if(_peeking && _peekType==='door'){ db.classList.add('peeking'); db.textContent='👁 СПРЯТАТЬСЯ [E]'; }
    else { db.classList.remove('peeking'); db.textContent='👁 ВЫГЛЯНУТЬ ЗА ДВЕРЬ [E]'; }
  }
  if(wb){
    if(_peeking && _peekType==='window'){ wb.classList.add('peeking'); wb.textContent='🪟 СПРЯТАТЬСЯ [R]'; }
    else { wb.classList.remove('peeking'); wb.textContent='🪟 ВЫГЛЯНУТЬ ИЗ ОКНА [R]'; }
  }
}

// NPC kills you while peeking — stalker/shade at stairs or near office
function _peekDangerCheck(type){
  if(!G.gameActive) return;
  var dangerLocs = [9, 10, 11];
  var interval = setInterval(function(){
    if(!G.gameActive || !_peeking || _peekType !== type){ clearInterval(interval); return; }
    Object.values(CREATURES).forEach(function(c){
      if(!c.active || G.gameOver || G.gameWon) return;
      // Crawler uses hatch mechanic, doesn't instant-kill from peek
      if(c.id === 'crawler') return;
      if(dangerLocs.indexOf(c.loc) >= 0){
        clearInterval(interval);
        _peeking = false; _peekType = null;
        _updatePeekButtons();
        if(G._peekDrain){ clearInterval(G._peekDrain); G._peekDrain=null; }
        addLog('!! '+c.shortName+' УВИДЕЛ ТЕБЯ !!','d');
        G.gameOver = true;
        setTimeout(function(){ kill(c); }, 500);
      }
    });
  }, 800);
}

// ─── PHONE MODE (no PC upgrade) ─────────────────────────────────────────────
function updatePhoneMode(){
  var pcLvl = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.pc_level||0 : 0;
  var mainView = document.getElementById('main-view');
  if(!mainView) return;
  if(pcLvl === 0){
    mainView.classList.add('phone-mode');
  } else {
    mainView.classList.remove('phone-mode');
  }
  // Update camera button
  var camBtn = document.getElementById('cam-grid-toggle');
  if(camBtn){
    if(pcLvl === 0){
      camBtn.innerHTML = '<span class="cicon">📵</span>НЕТ ПК';
      camBtn.classList.add('cam-btn-locked');
    } else {
      camBtn.innerHTML = '<span class="cicon">🖥</span>МОНИТОР [TAB]';
      camBtn.classList.remove('cam-btn-locked');
    }
  }
}

// ─── MONITOR CLICK — open overview map ──────────────────────────────────────
function onMonitorClick(){
  if(!G.gameActive) return;
  var pcLvl = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.pc_level||0 : 0;
  if(pcLvl === 0){
    addLog('📵 Монитор не работает — прокачай ПК ур.1','d');
    return;
  }
  if(typeof switchMapView==='function') switchMapView('global');
}

// ─── SHADE HATCH / ЛЮК ТЕНИ ─────────────────────────────────────────────────
// Двухфазная механика:
//   Фаза 1 (hatch): тень над cam10 ломится в люк, шкала сама падает 100→0 за ~12 сек.
//                   Игрок ничего не может сделать — только наблюдать.
//   Фаза 2 (emp):   люк пробит, тень под дверью, всё электричество вырубается.
//                   Окно 3 сек на нажатие кнопки фонаря.
//                   Каждое включение фонаря во время EMP:
//                     - тратит 25% батареи
//                     - бросает шанс отпугивания: 1й=80%, 2й=50%, 3й=20%, 4й=0% (смерть)
//                   Не успел нажать за 3 сек → смерть.
var SHADE_HATCH = {
  active: false, phase: 'idle',           // 'idle' | 'hatch' | 'emp'
  timer: null, empTimer: null, empDeadline: 0,
  hatchPct: 100, attackCount: 0,
  // Базовый шанс отпугнуть по номеру попытки (attackCount = сколько раз уже отогнали)
  scareChances: [0.90, 0.70, 0.50, 0.30, 0.10, 0.00],
  // Сколько нажатий фонаря уже было сделано в текущем EMP-окне (для лога)
  empAttemptsThisRound: 0,
  // Флаг "фонарь уже учли в текущем включении" — чтобы одно нажатие = одна попытка,
  // даже если фонарь продолжает гореть. Сбрасывается при выключении фонаря.
  empConsumed: false,

  // Длительность фазы пробития по стадии: стадия 0 = 20сек, стадия 9 = 2сек
  getHatchDurationMs: function(){
    var stage = Math.min(9, this.attackCount);
    var base = Math.round(20000 - 18000 * stage / 9);
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    if(fx.soundproof) base += 5000;
    return base;
  },

  // Кулдаун отступления по стадии: стадия 0 = 120сек, стадия 9 = 15сек
  getReturnCooldownMs: function(){
    var stage = Math.min(9, this.attackCount);
    return Math.round(120000 - 105000 * stage / 9);
  },

  // Обновить скорость тени на основе текущей стадии
  _updateShadeSpeed: function(){
    var shade = CREATURES.shade;
    if(!shade) return;
    var stage = Math.min(9, this.attackCount);
    var stageBoost = 1.0 + 0.5 * stage / 9; // стадия 0 = 1.0x, стадия 9 = 1.5x
    var nightBoost = (typeof getLvlSpeedBoost==='function') ? getLvlSpeedBoost(G.night||1) : 1;
    shade.speedMultiplier = (CREATURE_BASE_SPEEDS.shade || 0.7) * nightBoost * stageBoost;
  },

  start: function(){
    if(this.active) return;

    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};

    // ПРОЖЕКТОР — автоматически освещает люк, тень не может пробить
    if(fx.projector){
      this.attackCount++;
      this._updateShadeSpeed();
      var stage0 = Math.min(9, this.attackCount);
      var retMs0 = this.getReturnCooldownMs();
      addLog('💡 Прожектор залил лестницу светом — тень отступила! (стадия ' + (stage0+1) + ', след. через ' + Math.round(retMs0/1000) + 'с)', '');
      var shade0 = CREATURES.shade;
      if(shade0){
        shade0.loc = 2;
        shade0.paused = true;
        if(shade0.shadeBehavior) shade0.shadeBehavior.phase = 'cooldown';
      }
      setTimeout(function(){
        if(G.gameActive && shade0 && shade0.active && !G.gameOver && !G.gameWon){
          shade0.paused = false;
          if(shade0.shadeBehavior) shade0.shadeBehavior.phase = 'moving';
          addLog('⚠ Тень снова вышла на маршрут...', 'w');
        }
      }, retMs0);
      return;
    }

    // АНТИ-ТЕНЬ: СВЕТОВАЯ ЛОВУШКА — шанс прогнать тень при появлении
    var ltLvl = fx.at_lighttrap_lvl || 0;
    if(ltLvl > 0 && RNG.chance(ltLvl * 10)){
      addLog('💡 СВЕТОВАЯ ЛОВУШКА сработала! Тень прогнана и в эту смену не вернётся.','');
      var shade = CREATURES.shade;
      if(shade){ shade.active = false; shade.loc = 0; }
      return;
    }

    this.active = true; this.phase = 'hatch'; this.hatchPct = 100;
    this.empAttemptsThisRound = 0; this.empConsumed = false;
    var shade = CREATURES.shade;
    var sb = shade.shadeBehavior = shade.shadeBehavior || {};
    sb.phase = 'hatch'; sb.active = true;

    addLog('⚠ ТЕНЬ ЛОМИТСЯ В ЛЮК НАД КАМ 10!', 'w');
    if(typeof SFX!=='undefined') SFX.shadeAppear();

    var el = document.getElementById('shade-timer');
    if(el) el.style.display = 'flex';

    var self = this;
    var startTime = Date.now();
    var duration = this.getHatchDurationMs();
    var lastWarn50 = false, lastWarn25 = false;

    if(this.timer) clearInterval(this.timer);
    this.timer = setInterval(function(){
      if(!G.gameActive){ self.stop(); return; }
      if(self.phase !== 'hatch') return; // на всякий случай

      var elapsed = Date.now() - startTime;
      self.hatchPct = Math.max(0, 100 * (1 - elapsed/duration));

      // Предупреждения по достижению порогов
      if(!lastWarn50 && self.hatchPct <= 50){
        lastWarn50 = true;
        addLog('Люк трещит... металл гнётся.', 'w');
      }
      if(!lastWarn25 && self.hatchPct <= 25){
        lastWarn25 = true;
        addLog('!! ЛЮК НЕ ВЫДЕРЖИТ !!', 'd');
      }

      self.renderHatchUI();

      if(self.hatchPct <= 0){
        clearInterval(self.timer); self.timer = null;
        self.shadeBreaksThrough();
      }
    }, 100);
  },

  renderHatchUI: function(){
    var ring = document.getElementById('shade-ring-progress');
    var icon = document.getElementById('shade-timer-icon');
    var pctEl = document.getElementById('shade-timer-pct');
    var hint = document.getElementById('shade-timer-hint');
    var inner = document.getElementById('shade-timer-inner');
    var ringWrap = document.getElementById('shade-timer-ring');

    var pct = this.hatchPct / 100;
    var offset = 565.5 * (1 - pct);
    if(ring){
      ring.style.strokeDashoffset = offset;
      ring.classList.remove('holding');
    }
    if(inner) inner.classList.remove('holding');
    if(ringWrap) ringWrap.classList.toggle('critical', this.hatchPct < 25);

    if(icon) icon.textContent = this.hatchPct > 50 ? '🔓' : (this.hatchPct > 20 ? '⚠' : '💀');
    if(pctEl){
      pctEl.textContent = Math.round(this.hatchPct) + '%';
      pctEl.classList.remove('safe');
    }
    if(hint){
      hint.classList.remove('holding');
      hint.textContent = 'ЛЮК: КАМ 10';
    }
  },

  renderEmpUI: function(){
    var ring = document.getElementById('shade-ring-progress');
    var icon = document.getElementById('shade-timer-icon');
    var pctEl = document.getElementById('shade-timer-pct');
    var hint = document.getElementById('shade-timer-hint');
    var ringWrap = document.getElementById('shade-timer-ring');

    var msLeft = Math.max(0, this.empDeadline - Date.now());
    var pct = msLeft / 3000;
    var offset = 565.5 * (1 - pct);
    if(ring){
      ring.style.strokeDashoffset = offset;
      ring.classList.add('holding'); // подсветим жёлтым/зелёным как «активная» фаза
    }
    if(ringWrap) ringWrap.classList.add('critical');
    if(icon) icon.textContent = '🔦';
    if(pctEl){
      pctEl.textContent = (msLeft/1000).toFixed(1) + 'с';
      pctEl.classList.remove('safe');
    }
    if(hint) hint.textContent = 'ЖМИ ФОНАРЬ!';
  },

  // Тень пробила люк → фаза EMP
  shadeBreaksThrough: function(){
    var shade = CREATURES.shade; var sb = shade.shadeBehavior;
    this.phase = 'emp';
    sb.phase = 'attack';
    shade.loc = 11; // под дверью
    this.empAttemptsThisRound = 0;
    this.empConsumed = false;

    addLog('!! ТЕНЬ ПРОБИЛА ЛЮК — ВСЁ ПОГАСЛО !!','d');
    G._shadeEMP = true;
    var gs = document.getElementById('game-screen');
    if(gs) gs.classList.add('shade-emp');

    this.empDeadline = Date.now() + 3000;
    var self = this;

    if(this.empTimer) clearInterval(this.empTimer);
    this.empTimer = setInterval(function(){
      if(!G.gameActive){ self.stop(); return; }
      if(self.phase !== 'emp'){ clearInterval(self.empTimer); self.empTimer=null; return; }

      // Прожектор — авто-атака без нажатия фонаря
      var _fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
      if(_fx.projector && !self.empConsumed){
        self.empConsumed = true;
        self.tryScareWithFlash();
        return;
      }
      // Пользователь только что включил фонарь и мы ещё не учли это нажатие
      if(G.flashOn && !self.empConsumed){
        self.empConsumed = true;
        self.tryScareWithFlash();
        return;
      }
      // Пользователь выключил фонарь → разрешаем следующее нажатие как новую попытку
      if(!G.flashOn && self.empConsumed){
        self.empConsumed = false;
      }

      self.renderEmpUI();

      if(Date.now() >= self.empDeadline){
        clearInterval(self.empTimer); self.empTimer = null;
        self.shadeKills('!! НЕ УСПЕЛ ВКЛЮЧИТЬ ФОНАРЬ !!');
      }
    }, 80);
  },

  // Игрок включил фонарь во время EMP — одна попытка отпугивания
  tryScareWithFlash: function(){
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    var flashLvl = fx.flash_lvl || 0;
    var isLevel3Flash = flashLvl >= 3;

    // Батарея: -10% за попытку, кроме фонаря ур.3 (бесконечная энергия)
    if(!isLevel3Flash){
      G.flashBattery = Math.max(0, G.flashBattery - 10);
      if(typeof updateFlashBatteryUI === 'function') updateFlashBatteryUI();
    }

    this.empAttemptsThisRound++;
    var idx = this.attackCount; // сколько раз тень уже отогнали в эту ночь

    // Базовый шанс по попытке: 90/70/50/30/10/0%
    var base = this.scareChances[Math.min(idx, this.scareChances.length - 1)];

    // Бонус фонаря: ур.1=+10%, ур.2=+25%, ур.3=+50%
    var flashBonus = [0, 0.10, 0.25, 0.50][Math.min(flashLvl, 3)];

    // Прожектор: +60% к базовому
    var projBonus = fx.projector ? 0.60 : 0;

    var totalChance = Math.min(1.0, base + flashBonus + projBonus);
    var totalPct = Math.round(totalChance * 100);

    var parts = [];
    parts.push('база ' + Math.round(base*100) + '%');
    if(flashBonus > 0) parts.push('фонарь +' + Math.round(flashBonus*100) + '%');
    if(projBonus > 0)  parts.push('прожектор +' + Math.round(projBonus*100) + '%');
    var drainStr = isLevel3Flash ? '' : ' (-10% батареи)';
    addLog('🔦 Попытка ' + (idx+1) + ': ' + parts.join(', ') + ' → ' + totalPct + '%' + drainStr, '');

    var success = RNG.chance(totalPct);

    if(success){
      this.attackCount++;
      this.shadeRetreats();
    } else {
      if(totalChance <= 0){
        this.shadeKills('!! ТЕНЬ НЕПОБЕДИМА — СВЕТ ЕЁ БОЛЬШЕ НЕ БЕРЁТ !!');
      } else {
        addLog('Тень не отступает... попробуй снова.', 'w');
      }
    }
  },

  shadeRetreats: function(){
    var shade = CREATURES.shade;
    var sb = shade.shadeBehavior || {};
    if(this.empTimer){ clearInterval(this.empTimer); this.empTimer = null; }
    this.phase = 'idle'; this.active = false;

    G._shadeEMP = false;
    var gs = document.getElementById('game-screen');
    if(gs) gs.classList.remove('shade-emp');
    var el = document.getElementById('shade-timer');
    if(el) el.style.display = 'none';

    addLog('✅ Тень отступила! (отогнана ' + this.attackCount + ' раз)', '');

    // Обновить скорость для следующей стадии
    this._updateShadeSpeed();

    // Стадийный кулдаун: стадия 0 = 120с, стадия 9 = 15с
    var returnMs = this.getReturnCooldownMs();
    var stage = Math.min(9, this.attackCount);
    addLog('💨 Тень ушла в вентиляцию. Стадия ' + (stage+1) + '/10. Вернётся через ' + Math.round(returnMs/1000) + 'с.', 'w');

    // Тень возвращается на точку спавна и ждёт кулдаун
    shade.loc = 2;
    shade.paused = true;
    sb.phase = 'cooldown';
    shade.shadeBehavior = sb;

    setTimeout(function(){
      if(G.gameActive && shade.active && !G.gameOver && !G.gameWon){
        shade.paused = false;
        sb.phase = 'moving';
        addLog('⚠ Тень снова вышла на маршрут...', 'w');
      }
    }, returnMs);
  },

  shadeKills: function(msg){
    var shade = CREATURES.shade;
    if(this.empTimer){ clearInterval(this.empTimer); this.empTimer = null; }
    if(this.timer){ clearInterval(this.timer); this.timer = null; }
    this.phase = 'idle'; this.active = false;
    G._shadeEMP = false;
    var gs = document.getElementById('game-screen');
    if(gs) gs.classList.remove('shade-emp');
    var el = document.getElementById('shade-timer');
    if(el) el.style.display = 'none';

    if(G.gameOver || G.gameWon) return;
    G.gameOver = true;
    addLog(msg, 'd');
    setTimeout(function(){ kill(shade); }, 300);
  },

  stop: function(){
    this.active = false; this.phase = 'idle';
    this.empConsumed = false; this.empAttemptsThisRound = 0;
    if(this.timer){ clearInterval(this.timer); this.timer = null; }
    if(this.empTimer){ clearInterval(this.empTimer); this.empTimer = null; }
    G._shadeEMP = false;
    var gs = document.getElementById('game-screen');
    if(gs) gs.classList.remove('shade-emp');
    var el = document.getElementById('shade-timer');
    if(el) el.style.display = 'none';
  }
};


// ─── HUD TOGGLE ─────────────────────────────────────────────────────────────
var _hudHidden = false;
function toggleHUD(){
  _hudHidden = !_hudHidden;
  var gs = document.getElementById('game-screen');
  if(gs) gs.classList.toggle('hud-hidden', _hudHidden);
  var btn = document.getElementById('ui-toggle-btn');
  if(btn) btn.textContent = _hudHidden ? '👁‍🗨' : '👁';
}

// ─── ABILITIES MENU ─────────────────────────────────────────────────────────
var _abilitiesOpen = false;
function toggleAbilitiesMenu(){
  _abilitiesOpen = !_abilitiesOpen;
  var menu = document.getElementById('abilities-menu');
  if(!menu) return;
  if(_abilitiesOpen){
    renderAbilitiesMenu();
    menu.style.display = 'block';
  } else {
    menu.style.display = 'none';
  }
}

function renderAbilitiesMenu(){
  var grid = document.getElementById('abm-grid');
  if(!grid || typeof ST==='undefined') return;
  grid.innerHTML = '';

  var abilityInfo = {
    emp:      {icon:'⚡', name:'ЭМИ', desc:'Оглушает всех NPC'},
    shotgun:  {icon:'🔫', name:'ВЫСТРЕЛ', desc:'Отбрасывает NPC'},
    flare:    {icon:'🚀', name:'РАКЕТА', desc:'Освещает территорию'},
    alarm:    {icon:'🔔', name:'СИРЕНА', desc:'Отвлекает NPC'},
    decoy:    {icon:'🎭', name:'ПРИМАНКА', desc:'Ложная цель'},
    trap:     {icon:'🪤', name:'ЛОВУШКА', desc:'Замедляет NPC'},
    mine:     {icon:'💣', name:'МИНА', desc:'Останавливает NPC'},
    napalm:   {icon:'🔥', name:'НАПАЛМ', desc:'Блокирует зону'},
    cage:     {icon:'🏗', name:'КЛЕТКА', desc:'Запирает NPC'},
    breath:   {icon:'💨', name:'ВДОХ', desc:'Замедляет время'},
    meditate: {icon:'🧘', name:'МЕДИТАЦИЯ', desc:'+энергия'},
    timestop: {icon:'⏱', name:'СТОП', desc:'Пауза NPC'},
    adrenaline:{icon:'💉', name:'АДРЕНАЛИН', desc:'Ускорение действий'}
  };

  var abilities = ST.abilities || {};
  var keys = Object.keys(abilities);
  if(keys.length === 0){
    grid.innerHTML = '<div class="abm-empty">Нет доступных способностей.<br>Прокачай навыки!</div>';
    return;
  }

  keys.forEach(function(k){
    var ab = abilities[k];
    var info = abilityInfo[k] || {icon:'❓', name:k.toUpperCase(), desc:''};
    var usesLeft = ab.maxUses - ab.uses;
    var isUsed = usesLeft <= 0;

    var div = document.createElement('div');
    div.className = 'abm-skill' + (isUsed ? ' used' : '') + (ab.cooldown ? ' cooldown' : '');
    div.innerHTML = '<span class="abm-skill-icon">' + info.icon + '</span>' +
      '<div class="abm-skill-info"><span class="abm-skill-name">' + info.name + '</span>' +
      '<span class="abm-skill-uses">' + usesLeft + '/' + ab.maxUses + ' · ' + info.desc + '</span></div>';

    if(!isUsed && !ab.cooldown){
      div.onclick = function(){
        if(typeof useAbility==='function') useAbility(k);
        renderAbilitiesMenu(); // refresh
      };
    }
    grid.appendChild(div);
  });
}

// ─── HIDE / ПРИТАИТЬСЯ ─────────────────────────────────────────────────────
// Available when player has NO door (door_level === 0).
// ─── HIDE / ПРИТАИТЬСЯ ─────────────────────────────────────────────────
// Toggle-механика: первое нажатие включает, второе выключает.
// Эффекты пока активна:
//   - камеры заблокированы (см. _hiding во всех switchRoom/peek)
//   - если NPC доходит до loc 11 (у двери) → проверка по правилам уровня и типа NPC
//
// Правила (G.night и c.id):
//   ночи 1-3:           любой NPC уходит 100% в случайную камеру, стан 10 сек
//   ночи 4+ сталкер:    50% уходит / 50% смерть
//   ночи 4-6 ползун:    50% уходит / 50% смерть
//   ночи 7+ ползун:     10% уходит / 90% смерть
//   ночи 4+ тень:        1% уходит НАВСЕГДА (победил выдержкой) / 99% смерть
//
// Если у двери несколько NPC — самая худшая судьба перевешивает.
var _hiding = false;
var _hideCheckTimer = null;
var _hideResolvedThisVisit = {}; // c.id → true (уже проверили на текущем визите к двери)

function toggleHide(){
  if(!G.gameActive) return;
  if(_hiding){
    // Второе нажатие — выходим из режима
    _stopHiding();
    addLog('🫥 Ты вышел из укрытия.','');
    return;
  }
  // Первое нажатие — включаем
  _hiding = true;
  // Tutorial hook
  if(typeof TUTORIAL!=='undefined' && TUTORIAL.active) TUTORIAL.onHideToggled();
  _hideResolvedThisVisit = {};
  var btn = document.getElementById('hide-btn');
  if(btn){ btn.classList.add('hiding'); btn.textContent = '🫥 ПРИТАИЛСЯ — ЕЩЁ РАЗ ЧТОБЫ ВЫЙТИ'; }
  var overlay = document.getElementById('hide-overlay');
  if(overlay) overlay.classList.add('active');
  var gs = document.getElementById('game-screen');
  if(gs) gs.classList.add('player-hiding');
  if(typeof _peeking !== 'undefined' && _peeking){ togglePeek('door'); }
  if(G.currentRoom !== 'office') switchRoom('office');
  if(G.flashOn){ G.flashOn = false; setFlashUI(false); }
  addLog('🫥 Ты притаился в темноте...','');

  // Проверяем "у двери" каждые 500 мс
  if(_hideCheckTimer) clearInterval(_hideCheckTimer);
  _hideCheckTimer = setInterval(_hideTick, 500);
}

function _hideTick(){
  if(!_hiding || !G.gameActive){
    if(_hideCheckTimer){ clearInterval(_hideCheckTimer); _hideCheckTimer = null; }
    return;
  }
  // Собрать всех NPC у двери которых ещё не проверяли на этом визите
  var atDoor = [];
  Object.values(CREATURES).forEach(function(c){
    if(!c.active) return;
    if(c.loc !== 11) {
      // Если NPC ушёл сам — сбросить флаг "уже проверили", чтобы при возврате проверить заново
      _hideResolvedThisVisit[c.id] = false;
      return;
    }
    if(_hideResolvedThisVisit[c.id]) return;
    atDoor.push(c);
  });
  if(atDoor.length === 0) return;

  // Решить судьбу для каждого. Если кто-то проваливает — смерть.
  var killer = null;
  var leavers = [];
  atDoor.forEach(function(c){
    if(killer) return; // уже мёртв
    var verdict = _hideVerdictFor(c);
    _hideResolvedThisVisit[c.id] = true;
    if(verdict === 'kill'){ killer = c; }
    else { leavers.push({c:c, verdict:verdict}); }
  });

  if(killer){
    addLog('!! '+killer.shortName+' НАШЁЛ ТЕБЯ В УКРЫТИИ !!','d');
    G.gameOver = true;
    _stopHiding();
    setTimeout(function(){ kill(killer); }, 300);
    return;
  }
  // Никого не убило — все ушли
  leavers.forEach(function(L){
    var c = L.c;
    if(L.verdict === 'shade_defeated'){
      // Тень сдалась навсегда
      c.active = false;
      c.loc = 0;
      stopDoorTimers(c);
      addLog('✨ Твоя выдержка победила ТЕНЬ. На этой смене она больше не появится.','');
    } else {
      // Уходит в случайную камеру + стан 10 сек
      _sendNpcAwayRandom(c);
      addLog('✅ '+c.shortName+' не заметил тебя и ушёл.','');
    }
  });
}

// Вердикт для одного NPC на текущей ночи
function _hideVerdictFor(c){
  var n = G.night || 1;
  // 1-3 ночи: всегда уходит
  if(n <= 3) return 'leave';
  // Тень: 1% уходит навсегда / 99% смерть
  if(c.id === 'shade'){
    return RNG.chance(1) ? 'shade_defeated' : 'kill';
  }
  // Ползун: 4-6 — 50%, 7+ — 10%
  if(c.id === 'crawler'){
    var p = (n >= 7) ? 0.10 : 0.50;
    return RNG.chance(Math.round(p * 100)) ? 'leave' : 'kill';
  }
  // Сталкер: 4+ — 50%
  if(c.id === 'stalker'){
    return RNG.d2() === 1 ? 'leave' : 'kill';
  }
  return 'leave';
}

// Отправить NPC в случайную локацию из его графа + стан 10 сек
function _sendNpcAwayRandom(c){
  stopDoorTimers(c);
  var graph = c.moveGraph;
  if(!graph){
    // Запасной путь — на стартовую (как в startNight)
    c.loc = 0;
  } else {
    var keys = Object.keys(graph).map(Number).filter(function(k){ return k !== 11; });
    if(keys.length){
      c.loc = RNG.pick(keys);
    } else {
      c.loc = 0;
    }
  }
  // Стан на 10 сек. flashlightStunLeft уменьшается в moveAllCreatures (раз в 3 сек),
  // так что 4 тика ≈ 12 сек — хорошее приближение.
  c.flashlightStunLeft = (c.flashlightStunLeft || 0) + 4;
  // Ползуну также мягко сбросить fedCount чтобы не атаковал сразу снова
  if(c.id === 'crawler' && c.crawlerBehavior){
    c.crawlerBehavior.fedCount = 0;
  }
}

function _stopHiding(){
  _hiding = false;
  _hideResolvedThisVisit = {};
  if(_hideCheckTimer){ clearInterval(_hideCheckTimer); _hideCheckTimer = null; }
  var btn = document.getElementById('hide-btn');
  if(btn){ btn.classList.remove('hiding'); btn.textContent = '🫥 ПРИТАИТЬСЯ [Q]'; }
  var overlay = document.getElementById('hide-overlay');
  if(overlay) overlay.classList.remove('active');
  var gs = document.getElementById('game-screen');
  if(gs) gs.classList.remove('player-hiding');
}

// Update door/hide button visibility based on door level
function updateDoorHideButtons(){
  var doorLvl = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects.door_level||0 : 0;
  var doorBtn = document.getElementById('door-left');
  var hideBtn = document.getElementById('hide-btn');
  if(doorBtn) doorBtn.style.display = 'none';
  if(hideBtn) hideBtn.style.display = doorLvl >= 1 ? 'none' : '';
}

// ═══ СНИМОК КАМЕРОЙ (отпугивание сталкера) ═══
var SNAP_COOLDOWN_MS = 20000; // 20 сек

function snapCamera(){
  if(!G.gameActive) return;
  var stalker = (typeof CREATURES !== 'undefined') ? CREATURES.stalker : null;
  if(!stalker || !stalker.active) return;

  var btn = document.getElementById('snap-btn');
  var now = Date.now();

  // Лимит использований
  var maxSnaps = 1 + ((typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.snap_extra_uses||0 : 0);
  if(typeof G._snapUsesLeft === 'undefined') G._snapUsesLeft = maxSnaps;
  if(G._snapUsesLeft <= 0){
    addLog('📷 Снимки закончились на эту ночь', 'd');
    return;
  }

  // Кулдаун
  if(stalker._snapCooldownUntil && now < stalker._snapCooldownUntil){
    var left = Math.ceil((stalker._snapCooldownUntil - now) / 1000);
    addLog('📷 Перезарядка камеры... ещё ' + left + ' сек', '');
    return;
  }

  // Сталкер должен быть на текущей камере
  var camId = G.currentRoom;
  if(!camId || camId.indexOf('cam-') !== 0){ addLog('📷 Нет цели — сталкер не на этой камере', ''); return; }
  var stalkerCam = (typeof LOC_CAM !== 'undefined') ? LOC_CAM[stalker.loc] : null;
  if(stalkerCam !== camId){ addLog('📷 Сталкер не виден — нет цели для снимка', ''); return; }

  // Вспышка на экране
  var flash = document.getElementById('cam-flash');
  if(flash){ flash.classList.add('active'); setTimeout(function(){ flash.classList.remove('active'); }, 350); }

  // Звук щелчка затвора
  var sfxSnap = document.getElementById('sfx-snap');
  if(sfxSnap && typeof AUDIO !== 'undefined' && !AUDIO.muted){
    sfxSnap.currentTime = 0; sfxSnap.volume = 0.8; sfxSnap.play().catch(function(){});
  }

  // Списать использование
  G._snapUsesLeft--;

  // Поставить кулдаун
  stalker._snapCooldownUntil = now + SNAP_COOLDOWN_MS;
  if(btn){ btn.disabled = true; btn.textContent = '📷 ФОТО [C]'; }
  setTimeout(function(){
    if(btn){ btn.disabled = false; }
    updateSnapButton();
  }, SNAP_COOLDOWN_MS);

  // Реакция по стадии
  var stage = stalker._stage || (typeof getStalkerStage === 'function' ? getStalkerStage(G.night) : 1);
  var sd = (typeof STALKER_STAGES !== 'undefined') ? STALKER_STAGES[stage] : null;
  if(!sd){ return; }

  var snapBonus = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.snap_bonus||0 : 0;
  if(!RNG.chance(Math.round(sd.snapChance * 100) + snapBonus)){
    addLog('📷 Вспышка! Сталкер не реагирует...', 'd');
    return;
  }

  if(sd.snapRetreat > 0){
    // Отступает на snapRetreat зон
    stalker.loc = Math.max(0, stalker.loc - sd.snapRetreat);
    if(typeof stopDoorTimers === 'function') stopDoorTimers(stalker);
    addLog('📷 ВСПЫШКА! Сталкер отступил на ' + sd.snapRetreat + ' зон!', 'w');
  } else {
    // Замирает на месте (стадии 8-9)
    var stunTicks = Math.ceil(sd.snapPause / 500);
    stalker._snapStunLeft = stunTicks;
    addLog('📷 Вспышка! Сталкер на секунду замер...', 'w');
  }

  updateSnapButton();
}

function updateSnapButton(){
  var btn = document.getElementById('snap-btn');
  if(!btn) return;
  var stalker = (typeof CREATURES !== 'undefined') ? CREATURES.stalker : null;
  var camId = G.currentRoom;
  var isCam = camId && camId.indexOf('cam-') === 0;

  // Показываем кнопку только на камерах и когда игра идёт
  if(!isCam || !G.gameActive){
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';

  var now = Date.now();
  var onCooldown = stalker && stalker._snapCooldownUntil && now < stalker._snapCooldownUntil;
  var stalkerHere = stalker && stalker.active && (typeof LOC_CAM !== 'undefined') && LOC_CAM[stalker.loc] === camId;

  btn.disabled = onCooldown;
  btn.classList.toggle('snap-ready', !!stalkerHere && !onCooldown);
  btn.classList.toggle('snap-cooldown', !!onCooldown);

  if(onCooldown){
    var left = Math.ceil((stalker._snapCooldownUntil - now) / 1000);
    btn.textContent = '📷 ' + left + 'с';
  } else if(stalkerHere){
    btn.textContent = '📷 ФОТО [C]';
  } else {
    btn.textContent = '📷 ФОТО [C]';
  }
}

// ═══ РУЖЬЁ НА СТЕНЕ ═══
function updateWallGun(){
  var wrap = document.getElementById('wall-gun-wrap');
  if(!wrap) return;
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  // Показываем ружьё если навык куплен (в т.ч. при загрузке старого сохранения до старта ночи)
  var hasShotgun = fx.shotgun_levels > 0;
  if(!hasShotgun){
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  var ab = (typeof ST!=='undefined' && ST.abilities) ? ST.abilities.shotgun : null;
  var ammoEl = document.getElementById('wall-gun-ammo');
  var zone = document.getElementById('wall-gun-zone');
  if(!ab){
    // Вне ночи — просто показываем ружьё без счётчика
    if(ammoEl) ammoEl.textContent = '—';
    if(zone) zone.style.opacity = '0.7';
    return;
  }
  var left = ab.maxUses - ab.uses;
  var dots = '';
  for(var i=0;i<ab.maxUses;i++) dots += (i<left ? '●' : '○') + (i<ab.maxUses-1?' ':'');
  if(ammoEl){
    ammoEl.textContent = dots;
    ammoEl.style.color = left > 0 ? '#cc9933' : '#553300';
  }
  if(zone) zone.style.opacity = left > 0 ? '1' : '0.35';
}

// ═══ ПАНЕЛЬ ДАТЧИКИ ═══
var _sensorPanelOpen = false;

function toggleSensorPanel(){
  _sensorPanelOpen = !_sensorPanelOpen;
  var panel = document.getElementById('sensor-panel');
  if(!panel) return;
  if(_sensorPanelOpen){
    updateSensorPositions();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function closeSensorPanel(){
  _sensorPanelOpen = false;
  var panel = document.getElementById('sensor-panel');
  if(panel) panel.style.display = 'none';
}

function updateSensorPositions(){
  if(!_sensorPanelOpen) return;
  var ids = ['stalker','crawler','shade'];
  var elIds = ['sp-stalker','sp-crawler','sp-shade'];
  ids.forEach(function(id, i){
    var el = document.getElementById(elIds[i]);
    if(!el) return;
    var c = (typeof CREATURES!=='undefined') ? CREATURES[id] : null;
    if(!c || !c.active){ el.textContent = '—'; el.style.color='#444'; return; }
    var locName = (typeof LOC_NAMES!=='undefined') ? LOC_NAMES[c.loc] : ('ЛОК '+c.loc);
    var camId = (typeof LOC_CAM!=='undefined') ? LOC_CAM[c.loc] : null;
    var motionLevel = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.motion_level||0 : 0;
    if(motionLevel === 0){ el.textContent = 'НЕТ СИГНАЛА'; el.style.color='#443333'; return; }
    el.textContent = locName || '—';
    el.style.color = '#00cc44';
  });
}

function addSensorAlert(creature, camId){
  var feed = document.getElementById('sensor-feed');
  if(!feed) return;
  var label = camId.replace('cam-c','КАМ ').toUpperCase();
  var now = new Date();
  var time = ('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2)+':'+('0'+now.getSeconds()).slice(-2);
  var row = document.createElement('div');
  row.style.cssText = 'font-size:9px;color:#ffaa00;letter-spacing:1px;padding:2px 0;border-bottom:1px solid #111';
  row.innerHTML = '<span style="color:#444;margin-right:6px">'+time+'</span>'+creature.shortName+' → '+label;
  feed.insertBefore(row, feed.firstChild);
  while(feed.children.length > 8) feed.removeChild(feed.lastChild);
}

function wallGunShoot(){
  if(!G.gameActive){ addLog('Ночь не началась!',''); return; }
  var ab = (typeof ST!=='undefined' && ST.abilities) ? ST.abilities.shotgun : null;
  if(!ab || ab.uses >= ab.maxUses){ addLog('🔫 Патроны закончились.',''); return; }
  // Анимация отдачи
  var zone = document.getElementById('wall-gun-zone');
  if(zone){
    zone.style.transform = 'scale(0.85) rotate(-8deg)';
    setTimeout(function(){ zone.style.transform = ''; }, 180);
  }
  if(typeof useAbility === 'function') useAbility('shotgun');
  setTimeout(updateWallGun, 100);
}

// ═══ MAP ZOOM ═══
// Зоны: target — точка на карте (0..1) для центрирования, scale — множитель зума
var _mapZones = {
  building:  { cx:0.38, cy:0.42, scale:3.2, label:'ЗДАНИЕ',       cams:'building' },
  perimeter: { cx:0.32, cy:0.40, scale:2.0, label:'ПЕРИМЕТР',     cams:'perimeter' },
  backyard:  { cx:0.62, cy:0.58, scale:3.0, label:'ЗАДНИЙ ДВОР',  cams:'backyard'  }
};
var _mapCurrentZone = null;

function mapZoomToZone(zone) {
  var z = _mapZones[zone];
  if (!z) return;
  _mapCurrentZone = zone;

  var container = document.getElementById('map-zoom-container');
  var wrap = container && container.parentElement;
  if (!container || !wrap) return;

  var ww = wrap.offsetWidth  || 600;
  var wh = wrap.offsetHeight || 400;

  // Вычисляем смещение: точка (cx,cy) должна оказаться в центре экрана
  var tx = (0.5 - z.cx) * ww * z.scale;
  var ty = (0.5 - z.cy) * wh * z.scale;

  container.style.transform = 'scale(' + z.scale + ') translate(' + (tx/z.scale) + 'px,' + (ty/z.scale) + 'px)';

  // Показать маркеры камер для зоны
  ['building','perimeter','backyard'].forEach(function(k) {
    var el = document.getElementById('map-cams-' + k);
    if (el) el.style.display = (k === zone) ? 'block' : 'none';
  });

  // Скрыть зоны-кружочки
  var zonesEl = document.getElementById('map-zones-overlay');
  if (zonesEl) zonesEl.classList.add('zoomed');

  // Показать кнопку назад
  var backBtn = document.getElementById('map-zoom-back');
  if (backBtn) backBtn.style.display = 'block';

  // Обновить подпись
  var lbl = document.getElementById('map-zone-label');
  if (lbl) lbl.textContent = 'РЕЗОНАНС — ' + z.label;
}

function mapZoomReset() {
  _mapCurrentZone = null;
  // Обзорная карта теперь плоская — зум не используется
}

function initMapOverview() {
  _mapCurrentZone = null;
  // Сбросить подпись если осталась
  var lbl = document.getElementById('map-zone-label');
  if (lbl) lbl.textContent = 'РЕЗОНАНС — ОБЗОР';
  // Обновить маркеры NPC
  if (typeof updateMapStalker === 'function') {
    if (typeof LOC_MAP_GLOBAL !== 'undefined') updateMapStalker('global', LOC_MAP_GLOBAL);
  }
}

// Зум сбрасывается через mapZoomReset() при вызове из интерфейса

// ═══ CAMERA CYCLE (1 = назад, 2 = вперёд) ═══
var CAM_CYCLE_LIST = [
  'cam-c1a','cam-c1b','cam-c2','cam-c3','cam-c4',
  'cam-c5a','cam-c5b','cam-c6','cam-c7',
  'cam-c8a','cam-c8b','cam-c9','cam-c10','cam-c11'
];

function camCycleStep(dir) {
  var cur = G.currentRoom;
  var idx = CAM_CYCLE_LIST.indexOf(cur);
  var next;
  if (idx === -1) {
    // Не на камере — переходим на первую или последнюю
    next = dir > 0 ? CAM_CYCLE_LIST[0] : CAM_CYCLE_LIST[CAM_CYCLE_LIST.length - 1];
  } else {
    next = CAM_CYCLE_LIST[(idx + dir + CAM_CYCLE_LIST.length) % CAM_CYCLE_LIST.length];
  }
  switchRoom(next);
}

// ═══════════════════════════════════════════════════════
// CAM04 AMBIENT SYSTEM
// ═══════════════════════════════════════════════════════
var CAM04_AMB = {
  _playing: false,
  _idx: 0,
  _sequence: [0, 1, 3],  // tracks 1,2,4 in order (0-based); track 3 reserved for NPC
  _npcSoundId: 'cam04-amb-3',

  start: function(){
    if(this._playing) return;
    if(typeof AUDIO !== 'undefined' && AUDIO.muted) return;
    this._playing = true;
    this._idx = 0;
    this._playNext();
  },

  stop: function(){
    this._playing = false;
    ['cam04-amb-1','cam04-amb-2','cam04-amb-3','cam04-amb-4'].forEach(function(id){
      var el = document.getElementById(id);
      if(el){ el.pause(); el.currentTime = 0; el.onended = null; }
    });
  },

  _playNext: function(){
    if(!this._playing) return;
    if(typeof AUDIO !== 'undefined' && AUDIO.muted){ this._playing = false; return; }
    var ids = ['cam04-amb-1','cam04-amb-2','cam04-amb-4'];
    var id = ids[this._idx % ids.length];
    var el = document.getElementById(id);
    if(!el){ this._playing = false; return; }
    var self = this;
    el.currentTime = 0;
    el.volume = 0.38;
    el.onended = function(){
      self._idx++;
      self._playNext();
    };
    el.play().catch(function(){ self._playing = false; });
  },

  // Call when NPC is visible on cam-c4
  playNpcSound: function(){
    if(typeof AUDIO !== 'undefined' && AUDIO.muted) return;
    var el = document.getElementById(this._npcSoundId);
    if(!el) return;
    if(!el.paused) return; // already playing
    el.currentTime = 0;
    el.volume = 0.5;
    el.play().catch(function(){});
  },

  stopNpcSound: function(){
    var el = document.getElementById(this._npcSoundId);
    if(el){ el.pause(); el.currentTime = 0; }
  }
};
