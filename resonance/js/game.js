/* resonance/js/game.js */

// ─── STALKER STAGE SYSTEM ─────────────────────────────────────────────────────
// 10 стадий агрессии сталкера. Стадия определяется уровнем ночи.
var STALKER_STAGES = {
  //  stage: { nights, speed, sanOutside, sanBuilding, sanDoor, sanBreaking,
  //           snapRetreat, snapPause, snapChance, maxCamBreaks }
  1:  { nights:[1,2],    speed:0.84, sanOut:0.03, sanBld:0.07, sanDoor:0.12, sanBreak:0.30, snapRetreat:4, snapPause:15000, snapChance:1.00, maxCamBreaks:0 },
  2:  { nights:[3,4],    speed:0.96, sanOut:0.04, sanBld:0.09, sanDoor:0.15, sanBreak:0.35, snapRetreat:3, snapPause:15000, snapChance:1.00, maxCamBreaks:0 },
  3:  { nights:[5,6],    speed:1.08, sanOut:0.05, sanBld:0.11, sanDoor:0.18, sanBreak:0.40, snapRetreat:3, snapPause:12000, snapChance:1.00, maxCamBreaks:0 },
  4:  { nights:[7,8],    speed:1.20, sanOut:0.06, sanBld:0.13, sanDoor:0.22, sanBreak:0.45, snapRetreat:2, snapPause:8000,  snapChance:0.85, maxCamBreaks:1 },
  5:  { nights:[9,10],   speed:1.32, sanOut:0.07, sanBld:0.15, sanDoor:0.26, sanBreak:0.50, snapRetreat:2, snapPause:8000,  snapChance:0.70, maxCamBreaks:1 },
  6:  { nights:[11],     speed:1.44, sanOut:0.08, sanBld:0.18, sanDoor:0.30, sanBreak:0.55, snapRetreat:1, snapPause:4000,  snapChance:0.50, maxCamBreaks:2 },
  7:  { nights:[12],     speed:1.56, sanOut:0.09, sanBld:0.20, sanDoor:0.34, sanBreak:0.60, snapRetreat:1, snapPause:4000,  snapChance:0.25, maxCamBreaks:2 },
  8:  { nights:[13],     speed:1.68, sanOut:0.10, sanBld:0.23, sanDoor:0.38, sanBreak:0.65, snapRetreat:0, snapPause:3000,  snapChance:0.10, maxCamBreaks:3 },
  9:  { nights:[14],     speed:1.80, sanOut:0.11, sanBld:0.26, sanDoor:0.42, sanBreak:0.70, snapRetreat:0, snapPause:3000,  snapChance:0.05, maxCamBreaks:3 },
  10: { nights:[15],     speed:1.92, sanOut:0.12, sanBld:0.30, sanDoor:0.50, sanBreak:0.80, snapRetreat:0, snapPause:0,     snapChance:0.00, maxCamBreaks:3 },
};

function getStalkerStage(night){
  for(var s=1; s<=10; s++){
    if(STALKER_STAGES[s].nights.indexOf(night) !== -1) return s;
  }
  return 10; // night > 15 → max
}

// ─── NIGHT START ──────────────────────────────────────────────────────────────

// Снижение рассудка с учётом класса военного (−20% resist)
function drainSanity(amount) {
  var resist = (typeof ST !== 'undefined' && ST.activeEffects && ST.activeEffects.class_sanity_resist) || 0;
  var actual = amount * (1 - resist);
  G.sanity = Math.max(0, G.sanity - actual);
  // Неуязвимость Выжившего: не даём рассудку упасть ниже 1
  if(G._invincibleUntil && Date.now() < G._invincibleUntil){
    G.sanity = Math.max(1, G.sanity);
  }
}
function startNight(n){
  G.night=n; G.hour=0; G.minutes=0; G.power=100; G.flashBattery=100;
  G.projectorOn = true;
  G.powerOut = false;
  // РАССУДОК — главный ресурс проигрыша. 0% = проигрыш.
  G.sanity = 100;
  // СТАЛЬНЫЕ НЕРВЫ — +15% к старт. рассудку (потолок 115%)
  if(typeof ST!=='undefined' && ST.activeEffects && getSkillLevel('calm_nerves')>0){
    G.sanity = 115;
  }
  G._shadeDoorAttacks = 0; // сколько раз тень нападала у Двери3+Укрепление-режима за ночь
  // Сброс флагов специальных режимов тени
  G._shadeSoulDrainActive = false;
  G._shadeSoulDrainStart = 0;
  G._shadeDoorEMP = false;
  G._shadeEMP = false;
  // Сброс _empTriggered у двери у всех NPC (на случай если осталось с прошлой ночи)
  Object.values(CREATURES).forEach(function(c){
    if(c.doorBehavior){
      c.doorBehavior._empTriggered = false;
      if(c.doorBehavior._empCheckTimer){
        clearInterval(c.doorBehavior._empCheckTimer);
        c.doorBehavior._empCheckTimer = null;
      }
    }
  });
  G.doorClosed=true; G.flashOn=false; G.currentRoom='office';
  G.gameActive=false; G.gameOver=false; G.gameWon=false; G.panicMode=false;
  G.intervals.forEach(clearInterval); G.intervals=[];
  if(G._peekDrain){ clearInterval(G._peekDrain); G._peekDrain=null; }
  G.stats={camSwitches:0,doorClosings:0,flashUses:0,closeCalls:0};
  G._brokenCams = {};
  G._autoProjectorUsed = false;
  var _sensorFeed = document.getElementById('sensor-feed');
  if(_sensorFeed) _sensorFeed.innerHTML = '';
  G._snapUsesLeft = 1 + ((typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.snap_extra_uses||0 : 0);

  // Ночь 13+: проверка аккумулятора
  if(n >= 13){
    var _hasBat = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.has_battery : false;
    if(!_hasBat){
      // Выдать +1 очко если ещё не выдавали за это предупреждение
      if(!G._batteryWarningGiven){
        G._batteryWarningGiven = true;
        if(typeof LEVEL_SYSTEM!=='undefined'){ LEVEL_SYSTEM.skillPoints += 1; LEVEL_SYSTEM.save(); }
        else if(typeof ST!=='undefined'){ ST.points += 1; }
        if(typeof updateSkillTreeUI==='function') updateSkillTreeUI();
      }
      // Показать экран "НЕТ СИГНАЛА" — блокирует игру пока не изучат
      showBatteryWarning(true);
      return; // не запускать ночь
    } else {
      hideBatteryWarning();
    }
  }

  var agg=NIGHT_AGG[Math.min(n,15)]||NIGHT_AGG[15];
  var activeIds=NIGHT_CREATURES[Math.min(n,15)]||['stalker','crawler','shade'];

  Object.keys(CREATURES).forEach(function(k){
    var c=CREATURES[k];
    c.active=activeIds.indexOf(k)>=0;
    c.paused=false;
    c.flashlightStunLeft=0;
    c._locHistory=[];
    var lvlSpeedBoost = getLvlSpeedBoost(n);
    var baseSpeed = CREATURE_BASE_SPEEDS[k] || 1.0;
    c.agg = agg * baseSpeed * (G._difficultyMult || 1);
    c.speedMultiplier = baseSpeed * lvlSpeedBoost;
    c._shadeBoostApplied = false;
    if(k==='shade'){
      var shadeBoost = 1 + SHADE_SPEED_EXTRA * Math.min(14, n-1) / 14;
      c.speedMultiplier *= shadeBoost;
      c._shadeBoostApplied = true;
    }

    // АНТИ-СТАЛКЕР: ПОДАВЛЕНИЕ снижает скорость сталкера на -2%/уровень
    if(k==='stalker' && typeof ST!=='undefined' && ST.activeEffects){
      var supLvl = ST.activeEffects.as_suppress_lvl || 0;
      if(supLvl > 0) c.speedMultiplier *= (1 - 0.02*supLvl);
    }

    // Shade и Crawler: не активны сразу
    if(k==='shade'){
      c.activated=false;
      c.paused=false;
      c.shadeBehavior = { phase: 'patrol', active: false };
    }
    // Сталкер: инициализация по стадиям
    if(k==='stalker'){
      c._stage = getStalkerStage(n);
      c._camBreaksThisShift = 0;        // сколько камер сломал за смену
      c._snapCooldownUntil = 0;         // timestamp окончания кулдауна снимка
      c._snapStunLeft = 0;              // ходов заморозки после снимка
      c._shotgunScared = false;
      c._night3ShotgunBarrier = false;
      c._night7StalkLoc = null;
      c._night7WaitUntilHour = null;
      if(n===1){
        c.activated=false; c.activateAtHour=2; c.loc=0;
        c._invisibleUntilHour=2;
        c._restrictLocs=[0,1,2,3,4,5,6,7];
      } else if(n===2){
        c.activated=true; c.activateAtHour=null; c.loc=0;
        c._invisibleUntilHour=null;
        c._restrictLocs=null;
        c._night2TeleportAfterKnock=true;
      } else if(n===3){
        c.activated=true; c.activateAtHour=null; c.loc=0;
        c._invisibleUntilHour=null;
        c._restrictLocs=null;
        c._night3ShotgunBarrier=false;
      } else if(n===7){
        c.activated=true; c.activateAtHour=null; c.loc=0;
        c._invisibleUntilHour=null; c._restrictLocs=null;
        c._night7StalkLoc=8;
        c._night7WaitUntilHour=null;
      } else {
        c.activated=true; c.activateAtHour=null;
        c._invisibleUntilHour=null; c._restrictLocs=null;
      }
    }
    if(k==='crawler'&&c.activationHour){
      var ah=c.activationHour[Math.min(n,15)];
      c.activateAtHour = (ah != null) ? ah : 99;
    }
    if(k==='shade'&&c.activationHour){
      var ah=c.activationHour[Math.min(n,15)];
      c.activateAtHour = (ah != null) ? ah : 99;
    }

    // Выбрать начальную локацию из графа или маршрута
    if(c.moveGraph){
      // Ползун всегда стартует на loc 5 (cam-c6, колодец)
      if(k === 'crawler'){
        c.loc = 5;
      } else {
        // Начальная точка = первый ключ графа (минимальный номер)
        var graphKeys = Object.keys(c.moveGraph).map(Number).sort(function(a,b){return a-b;});
        c.loc = graphKeys[0] || 0;
      }
    } else {
      c.route=c.routeOptions[Math.floor(Math.random()*c.routeOptions.length)].slice();
      c.loc=c.route[0];
    }

    // Сбросить door behavior
    var db=c.doorBehavior;
    db.canBreakDoor=false;
    db.arrivedAt=0;
    if(db.breakTimer){clearTimeout(db.breakTimer);db.breakTimer=null;}
    if(db.knockTimer){clearInterval(db.knockTimer);db.knockTimer=null;}
  });

  // === CRAWLER BEHAVIOR INIT ===
  if(CREATURES.crawler && CREATURES.crawler.crawlerBehavior){
    var cb = CREATURES.crawler.crawlerBehavior;
    cb.fedCount = 0;
    cb.active = true;
    // Шумоизоляция офиса (из ОФИС-ветки) — снижает шанс учуять офис
    var smellMult = (typeof ST!=='undefined' && ST.activeEffects && ST.activeEffects.crawler_smell_mult)
                    ? ST.activeEffects.crawler_smell_mult : 1.0;
    // Level-based behavior. Агрессия и скорость смягчены, чтобы вписаться в общий +50% потолок.
    if(n >= 12){
      cb.mode = 'frenzy';
      cb.fedNeeded = 3;
      cb.officeSmellChance = 0.25 * smellMult;
      cb.canBreakMetal = true;
      cb.immuneToWeapons = true;
      // Раньше было 1.8/2.0 — снижаю, NIGHT_AGG[12..15]≈1.42-1.5 уже даёт нужный темп
      CREATURES.crawler.speedMultiplier = 1.10;
    } else if(n >= 8){
      cb.mode = 'hungry';
      cb.fedNeeded = 2;
      cb.officeSmellChance = 0.15 * smellMult;
      cb.canBreakMetal = false;
      cb.immuneToWeapons = false;
      CREATURES.crawler.speedMultiplier = 0.95;
    } else {
      cb.mode = 'wander';
      cb.fedNeeded = 1;
      cb.officeSmellChance = 0.05 * smellMult;
      cb.canBreakMetal = false;
      cb.immuneToWeapons = false;
      CREATURES.crawler.speedMultiplier = 0.85;
    }
  }

  setDoorUI(false);
  var fb=document.getElementById('flash-btn');if(fb){fb.textContent='ВКЛЮЧИТЬ [F]';fb.classList.remove('on');}
  var flo=document.getElementById('fl-office');if(flo)flo.style.background='';
  var hn=document.getElementById('hud-night');if(hn)hn.textContent='УРОВЕНЬ '+n;
  var _htInit=document.getElementById('hud-time');if(_htInit)_htInit.textContent=HOURS[0];
  var pwrWrap = document.getElementById('hud-power-wrap');
  var projBtn = document.getElementById('projector-btn');
  if(n >= 13){
    if(pwrWrap) pwrWrap.style.display='flex';
    if(projBtn){ projBtn.style.display=''; projBtn.classList.add('on'); projBtn.textContent='🔆 ПРОЖЕКТОР [P]'; }
    document.getElementById('hud-power').textContent='100%';
  } else {
    if(pwrWrap) pwrWrap.style.display='none';
    if(projBtn) projBtn.style.display='none';
    document.getElementById('hud-power').textContent='∞';
  }
  document.getElementById('hud-power').className='pval';
  var hudSan = document.getElementById('hud-sanity');
  if(hudSan){ hudSan.textContent='100%'; hudSan.className='pval'; hudSan.style.color='#bb66ff'; }
  var sanBar = document.getElementById('sanity-bar-fill');
  if(sanBar){ sanBar.style.width='100%'; sanBar.style.background=''; }
  var pwrBar = document.getElementById('power-bar-fill');
  if(pwrBar){ pwrBar.style.width='100%'; pwrBar.style.background='#00aa22'; }
  updateFlashBatteryUI();
  updateCreaturePanel();
  switchRoom('office');
  if(typeof _peeking!=='undefined'){ _peeking=false; _peekType=null; var pb=document.getElementById('peek-door-btn'); if(pb){pb.classList.remove('peeking');pb.textContent='👁 ВЫГЛЯНУТЬ ЗА ДВЕРЬ [E]';} }
  if(typeof HATCH!=='undefined'){ HATCH.stop(); }
  if(typeof SHADE_HATCH!=='undefined'){ SHADE_HATCH.stop(); SHADE_HATCH.attackCount=0; if(typeof SHADE_HATCH._updateShadeSpeed==='function') SHADE_HATCH._updateShadeSpeed(); }
  G._shadeEMP = false;
  var gs2=document.getElementById('game-screen'); if(gs2) gs2.classList.remove('shade-emp');
  var _htReset=document.getElementById('hud-time');if(_htReset)_htReset.textContent=HOURS[0];
  // Apply settings
  if(typeof CFG!=='undefined'){
    G._difficultyMult=CFG.difficulty||1;
    G._nightSpeedTicks=CFG.nightSpeed||45;
    G._powerDrainMult=parseFloat(document.getElementById('cfg-power-drain')&&document.getElementById('cfg-power-drain').value||1);
  }
addLog('Смена №'+n+' началась. 12 камер активны.','');
  if(n === 13){ setTimeout(showPowerSystemTutorial, 1200); }
  applySkillEffects();
  // Пересчёт после применения скиллов
  if(ST.activeEffects){
    var _fx = ST.activeEffects;
    var _lvlSpeedBoost = getLvlSpeedBoost(n);

    if(CREATURES.stalker){
      var _stStage = getStalkerStage(n);
      var _stageData = STALKER_STAGES[_stStage];
      var _supLvl = _fx.as_suppress_lvl || 0;
      CREATURES.stalker.speedMultiplier = _stageData.speed * (1 - 0.02*_supLvl);
    }

    // Ползун — Яд (-10%/уровень в frenzy) поверх уровневого буста
    if(CREATURES.crawler && CREATURES.crawler.crawlerBehavior){
      var _cb = CREATURES.crawler.crawlerBehavior;
      // Базовая скорость по режиму
      var _baseCrawl = CREATURE_BASE_SPEEDS.crawler;
      if(_cb.mode === 'frenzy')      _baseCrawl = 1.10;
      else if(_cb.mode === 'hungry') _baseCrawl = 0.95;
      _baseCrawl *= _lvlSpeedBoost;
      // Яд режет скорость ТОЛЬКО в frenzy
      if(_cb.mode === 'frenzy'){
        var _poisonLvl = _fx.ac_poison_lvl || 0;
        _baseCrawl *= (1 - 0.10*_poisonLvl);
      }
      CREATURES.crawler.speedMultiplier = _baseCrawl;

      // Анти-запах (-5%/уровень)
      var _smellMult = _fx.crawler_smell_mult || 1.0;
      var _scentLvl = _fx.ac_scent_lvl || 0;
      if(_scentLvl > 0) _smellMult *= (1 - 0.05*_scentLvl);
      var _baseSmell = (n>=12)?0.25 : (n>=8)?0.15 : 0.05;
      _cb.officeSmellChance = _baseSmell * _smellMult;
    }

    // Тень — буст скорости на 15 ночи
    if(CREATURES.shade && CREATURES.shade.active){
      // Тень дополнительно +25% к 15 ночи (поверх уровневого буста)
      var _shadeBoost = 1 + 0.25 * Math.min(14, n-1) / 14;
      // Уровневый буст уже применён к speedMultiplier в первом проходе.
      // Здесь домножаем на shadeBoost ОДИН раз — но защищаем от двойного применения через флаг.
      if(!CREATURES.shade._shadeBoostApplied){
        CREATURES.shade.speedMultiplier *= _shadeBoost;
        CREATURES.shade._shadeBoostApplied = true;
      }
    }
  }
  if(typeof updatePhoneMode==='function') updatePhoneMode();
  if(typeof updateDoorHideButtons==='function') updateDoorHideButtons();
  if(typeof updateFinaleButtons==='function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom==='function') updateNearOfficeRoom();
  if(typeof _stopHiding==='function') _stopHiding();
  // Init weather
  if(typeof WEATHER!=='undefined') WEATHER.init(n);
  if(typeof AMBIENT!=='undefined') AMBIENT.init();
  showScreen('game-screen');
  // Story skills: grant free skills and show hint panel
  if(typeof grantStorySkillsForNight==='function'){
    grantStorySkillsForNight(n);
    // Re-apply skill effects so story skills (e.g. shotgun) appear in abilities immediately
    if(typeof applySkillEffects==='function') applySkillEffects();
    if(typeof updatePhoneMode==='function') updatePhoneMode();
    // Init bait cam AFTER skills are applied
    if(typeof BAIT_CAM!=='undefined') BAIT_CAM.init();
    if(typeof BAIT_CAM2!=='undefined') BAIT_CAM2.init();
    if(typeof BAIT_CAM3!=='undefined') BAIT_CAM3.init();
    // Init snare cam (КАМ 09) — reset to ready state
    if(typeof SNARE_CAM!=='undefined') SNARE_CAM.init();
  }
  if(typeof showStoryHintPanel==='function'){
    var fx2 = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    if(fx2.class_id === 'guard' || !fx2.class_id){
      setTimeout(function(){ showStoryHintPanel(n); }, 1800);
    }
  }

  // Tutorial on first play
  if(typeof TUTORIAL!=='undefined' && n===1){
    if(typeof checkTutorial==='function') checkTutorial();
  }
  // Сброс одноразовых флагов смены
  G._survivorUsed = false;
  G._invincibleUntil = 0;
  G._adrenalineUsed = false;
  G._decoyUsed = {};  // reset per-camera decoy usage each night
  if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.reset(); // unlock all bait chain locks

  setTimeout(function(){
    G.gameActive=true;
    startTimers();
    startRandomEvents();
    if(typeof ANOMALY_SYSTEM!=='undefined') ANOMALY_SYSTEM.init();
  },700);
}

// ─── TIMERS ───────────────────────────────────────────────────────────────────
function startTimers(){
  // Часы
  G.intervals.push(setInterval(function(){
    if(!G.gameActive)return;
    G.minutes++;
    updateClockAnim(G.hour,G.minutes/48);
    var _ticks=G._nightSpeedTicks||45;
    var _min=Math.floor(G.minutes*60/_ticks);
    var _mm=(_min<10?'0':'')+_min;
    var _h=HOURS[G.hour].split(':')[0];
    var _ht=document.getElementById('hud-time');if(_ht)_ht.textContent=_h+':'+_mm;
    if(G.minutes>=_ticks){
      G.minutes=0; G.hour++;
      var ts=HOURS[G.hour];
      var _ht2=document.getElementById('hud-time');if(_ht2)_ht2.textContent=ts;
      if(G.hour>=(typeof WIN_HOUR!=='undefined'?WIN_HOUR:8)){winNight();return;}
      onHourChange(G.hour);
      if(G.endlessMode && typeof ENDLESS!=='undefined') ENDLESS.onHour(G.hour);
      addLog('Время: '+ts+(G.hour>=7?' — рассвет близко!':''),'');
    }
  },1000));

  // Питание / РАССУДОК — главный тик ресурсов
  G.intervals.push(setInterval(function(){
    if(!G.gameActive)return;
    // Защитная синхронизация кнопок концовок (на случай если updateFinaleButtons не вызвалась)
    if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
    if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
    if(typeof updateCamMovementHighlight === 'function') updateCamMovementHighlight();

    // ── ЭЛЕКТРИЧЕСТВО ──
    if(G.night >= 13){
      var pRegen = (typeof ST!=='undefined' && ST.activeEffects) ? (ST.activeEffects.solar_regen||0) : 0;
      if(!G.powerOut){
        // Нормальный режим — считаем расход
        var pDrain = 0.15;
        if(G.projectorOn)                                        pDrain += 0.35;
        if(G.currentRoom && G.currentRoom.indexOf('cam')===0)   pDrain += 0.20;
        if(G.flashOn)                                           pDrain += 0.25;
        pDrain *= (G._powerDrainMult || 1.0);
        G.power = Math.max(0, Math.min(100, G.power - pDrain + pRegen));
        if(G.power <= 0){
          G.powerOut = true;
          // Отключаем всё
          G.projectorOn = false;
          if(G.flashOn){ G.flashOn = false; setFlashUI(false); }
          var pb = document.getElementById('projector-btn');
          if(pb){ pb.classList.remove('on'); pb.textContent='🔅 ПРОЖЕКТОР [P]'; }
          if(G.currentRoom && G.currentRoom.indexOf('cam')===0) switchRoom('office');
          addLog('⚡ ПЕРЕГРУЗКА! Электричество отключено!','d');
          showPowerOutOverlay(true);
        }
      } else {
        // Режим перегрузки — только регенерация от панелей
        G.power = Math.min(100, G.power + pRegen);
        if(G.power >= 5){
          G.powerOut = false;
          addLog('☀ Питание восстановлено — оборудование доступно.','w');
          showPowerOutOverlay(false);
        }
      }
      updatePowerUI();
    } else {
      G.power = 100;
      G.powerOut = false;
    }
    if(typeof updateSnapButton==='function') updateSnapButton();

    // ── ФОНАРЬ: батарея независимая, тратится при включении ──
    // ФОНАРЬ ур.1 (-20% расход) и ур.3 (бесконечная батарея от сети)
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    if(G.flashOn && !fx.flash_grid_power){
      var drainMult = fx.flash_drain_mult || 1.0;
      G.flashBattery=Math.max(0,G.flashBattery-G.flashDrainRate*drainMult);
      updateFlashBatteryUI();
      if(G.flashBattery<=0){G.flashOn=false;setFlashUI(false);addLog('Батарея фонарика разряжена!','d');}
    } else if(G.flashOn && fx.flash_grid_power){
      // Питание от сети — батарея не тратится, держим её на 100% для UI
      if(G.flashBattery < 100){ G.flashBattery = 100; updateFlashBatteryUI(); }
    }

    // ── РАССУДОК: тик каждые 500мс (т.е. /сек = удвоить) ──
    var sanDrop = 0;
    // Базовый пассивный дрейф вниз (только когда NPC активны рядом — иначе ноль)
    Object.values(CREATURES).forEach(function(c){
      if(!c.active) return;
      var zone = LOC_ZONE[c.loc] || '';
      var inBuilding = (zone === 'building');
      var atDoor = (c.loc === 11);

      if(c.id === 'stalker'){
        var _ss = STALKER_STAGES[c._stage || getStalkerStage(G.night)];
        var stalkerDrop = 0;
        if(!inBuilding && !atDoor) stalkerDrop = _ss.sanOut;
        else if(inBuilding && !atDoor) stalkerDrop = _ss.sanBld;
        else if(atDoor){
          var db = c.doorBehavior;
          stalkerDrop = (db && db.canBreakDoor) ? _ss.sanBreak : _ss.sanDoor;
        }
        // АНТИ-СТАЛКЕР: Стрессоустойчивость -10%/уровень
        var resistLvl = fx.as_resist_lvl || 0;
        if(resistLvl > 0) stalkerDrop *= (1 - 0.10*resistLvl);
        sanDrop += stalkerDrop;
      } else if(c.id === 'crawler'){
        if(!inBuilding && !atDoor) sanDrop += 0.05;       // -0.05/сек снаружи
        else if(inBuilding && !atDoor) sanDrop += 0.10;   // -0.10/сек в здании
        else if(atDoor){
          var db = c.doorBehavior;
          // У ползуна нет «стука» — либо он сразу ломает, либо просто стоит
          if(db && db.canBreakDoor) sanDrop += 0.65;     // -0.65/сек когда грызёт
          else                       sanDrop += 0.10;    // просто у двери
        }
      } else if(c.id === 'shade'){
        // Тень: базово ничего, но при определённых фазах добавляется (см. updateShadeSanityDrain)
      }
    });

    // Расход рассудка от тени — отдельный модуль
    if(typeof shadeSanityDrainPerTick === 'function'){
      sanDrop += shadeSanityDrainPerTick();
    }

    // Защита: если тень ушла с двери, но soulDrain остался активным — сбрасываем
    if(G._shadeSoulDrainActive && CREATURES.shade && CREATURES.shade.loc !== 11){
      G._shadeSoulDrainActive = false;
    }

    // Тик в 500мс — делим заявленный «/сек» расход на 2
    // ENDURANCE снижает расход (G._sanityDrainMult: 1.0 - 5%*уровень)
    var drainMult = (typeof G._sanityDrainMult === 'number') ? G._sanityDrainMult : 1.0;
    if(G.powerOut) drainMult *= 1.5; // перегрузка: рассудок тает на 50% быстрее
    var _sanResist = (typeof ST!=='undefined'&&ST.activeEffects&&ST.activeEffects.class_sanity_resist)||0;
    G.sanity = Math.max(0, G.sanity - (sanDrop/2) * drainMult * (1 - _sanResist));

    if(typeof updateSanityUI === 'function') updateSanityUI();
    if(typeof updatePowerUI === 'function')  updatePowerUI();

    // Паника на низком рассудке
    var wasPanic=G.panicMode;
    G.panicMode = G.sanity < 25;
    if(G.panicMode&&!wasPanic){
      if(typeof CFG==='undefined'||CFG.panicFx) document.body.classList.add('panic');
      addLog('!! РАССУДОК НА ИСХОДЕ !!','d');

      // АДРЕНАЛИН — автомат при <25% sanity
      var fx2 = ST.activeEffects || {};
      if(fx2.adrenaline && !G._adrenalineUsed){
        G._adrenalineUsed = true;
        Object.keys(ST.abilities).forEach(function(k){
          ST.abilities[k].uses = 0;
        });
        if(typeof updateAbilityBar==='function') updateAbilityBar();
        addLog('💉 АДРЕНАЛИН! Все способности перезаряжены!','w');
      }
    } else if(!G.panicMode&&wasPanic) document.body.classList.remove('panic');

    if(G.sanity<=0) sanityOut();
  },500));

  // Батарея (медленная зарядка когда выкл)
  G.intervals.push(setInterval(function(){
    if(!G.gameActive||G.flashOn)return;
    if(G.flashBattery<100){G.flashBattery=Math.min(100,G.flashBattery+0.06*(1+(G._flashRegenBonus||0)));updateFlashBatteryUI();}
  },500));

  // Случайный гул здания — один из 4 вариантов с равным шансом 25%
  (function scheduleRumble(){
    if(!G.gameActive) return;
    var delay = RNG.range(45000, 90000);
    var t = setTimeout(function(){
      if(!G.gameActive) return;
      if(typeof AUDIO !== 'undefined' && AUDIO.muted) { scheduleRumble(); return; }
      var idx = RNG.d4();
      var el = document.getElementById('sfx-rumble-' + idx);
      if(el){ el.currentTime = 0; el.play().catch(function(){}); }
      scheduleRumble();
    }, delay);
    G.intervals.push(t);
  })();

  // NPC движение — динамический интервал
  scheduleNextMove();

  // NPC проверка двери — отдельный быстрый таймер
  G.intervals.push(setInterval(function(){
    if(!G.gameActive)return;
    checkAllDoors();
    updateCreatureVisuals();
    updateCreaturePanel();
  },400));
}

// Динамическое планирование следующего хода NPC
function scheduleNextMove(){
  if(!G.gameActive)return;
  var baseMs=getMoveInterval(G.night);
  var hourMult=getHourMultiplier(G.hour);
  var weatherMult = (typeof WEATHER!=='undefined') ? (1.0 / WEATHER.getNpcSpeedMult()) : 1.0;
  var ms=Math.round(baseMs*hourMult*weatherMult);
  var tid=setTimeout(function(){
    if(!G.gameActive)return;
    moveAllCreatures();
    scheduleNextMove();
  },ms);
  G.intervals.push(tid);
}

// Событие смены часа
function onHourChange(hour){
  // Активация Crawler и Shade по часам
  Object.values(CREATURES).forEach(function(c){
    if(!c.active)return;
    if(c.activateAtHour != null && hour>=c.activateAtHour && !c.activated){
      c.activated=true;
      if(c.id==='stalker'){
        addLog('👁 На Камере №1 появилась фигура...','d');
      } else {
        addLog(c.name+' проснулся!','d');
      }
    }
    // Накопительная агрессия по часам — +3% в час, потолок 2.5 (было 1.6, поднял под новые скорости)
    c.agg=Math.min(c.agg*1.03, 2.5);
  });
  // Автоснятие блокировки приманок через 3 игровых часа
  if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.hourCheck(hour);
}

// ─── NPC ДВИЖЕНИЕ ─────────────────────────────────────────────────────────────
function moveAllCreatures(){
  Object.values(CREATURES).forEach(function(c){
    if(!c.active||c.loc===11)return;
    // Crawler, Shade и Stalker (ночь 1) ждут своего часа
    if((c.id==='crawler'||c.id==='shade'||(c.id==='stalker'&&c.activateAtHour!=null))&&!c.activated){
      // ВАЖНО: c.activateAtHour может быть 0 (мгновенная активация) — это falsy в JS,
      // поэтому проверяем через "!= null" вместо просто truthy.
      if(c.activateAtHour != null && G.hour>=c.activateAtHour){
        c.activated=true; addLog(c.name+' активен!','d');
      } else return;
    }
    // Stunned (снимком)?
    if(c.id==='stalker' && c._snapStunLeft>0){c._snapStunLeft--;return;}
    if(c.paused)return;
    // Feeding (ночи 4-7: ползун ест приманку)
    if(c.id==='crawler' && c._feedingAtLoc != null){ c.loc = c._feedingAtLoc; return; }

    // Night 7 stalker: freeze at loc 8 for 1 game hour
    if(c.id==='stalker' && c._night7StalkLoc!=null && c._night7WaitUntilHour!=null){
      if(G.hour < c._night7WaitUntilHour){ c.loc=c._night7StalkLoc; return; }
      else { c._night7StalkLoc=null; c._night7WaitUntilHour=null; }
    }

    // Night 1 stalker — restrict to external locs only (0-7)
    if(c.id==='stalker' && c._restrictLocs){
      // Will be enforced in movement options below
    }

    // Night 3 stalker — if shotgun scared, never go to loc 9,10,11
    // (enforced in movement options below)

    // Базовый шанс двинуться. Множитель 0.09 откалиброван под новую шкалу NIGHT_AGG (1.0→1.5):
    // на 1й ночи итоговый шанс ≈ старому уровню, на 15й — выше на +50%.
    var chance=c.agg*c.speedMultiplier*0.09;

    // Shade невидима на дальних камерах — двигается быстрее
    if(c.id==='shade'){
      var zone=LOC_ZONE[c.loc]||'';
      if(zone==='far'||zone==='perimeter') chance*=1.5;
    }

    if(Math.random()<chance){
      // === CRAWLER SPECIAL MOVEMENT ===
      if(c.id === 'crawler' && c.crawlerBehavior && c.crawlerBehavior.active){
        var cb = c.crawlerBehavior;
        var graph = c.moveGraph;
        if(!graph || !graph[c.loc]) return;
        var options = graph[c.loc].slice();

        // Smell chance — bias toward office (loc 10, 11)
        if(Math.random() < cb.officeSmellChance){
          // Prioritize paths toward office
          var officeAdj = options.filter(function(o){ return o >= 9; });
          if(officeAdj.length > 0) options = officeAdj;
        }

        // Frenzy mode — double speed already set, also can go to any adjacent
        var next = options[Math.floor(Math.random()*options.length)];
        var oldLoc = c.loc;
        c.loc = next;
        onCreatureMove(c, oldLoc);

        // Fed enough? Retreat to well
        if(cb.fedCount >= cb.fedNeeded && c.loc !== 11){
          c.loc = cb.retreatLoc;
          cb.fedCount = 0;
          addLog('Ползун наелся и уполз обратно в колодец.','');
        }
        return;
      }

      // Используем граф перемещений если есть
      var graph = c.moveGraph;
      if(graph && graph[c.loc]){
        var options = graph[c.loc].slice();

        // СТАЛКЕР — «интеллект» и сюжетные ограничения
        if(c.id === 'stalker' && options.length > 1){
          // Night 1: restrict to locs 0-7 (external only)
          if(c._restrictLocs){
            var restricted = options.filter(function(o){ return c._restrictLocs.indexOf(o) >= 0; });
            if(restricted.length > 0) options = restricted;
          }
          // Night 3: if shotgun scared, never go to loc 9,10,11
          if(c._night3ShotgunBarrier){
            var safe = options.filter(function(o){ return o < 9; });
            if(safe.length > 0) options = safe;
            else { return; } // can't move, stay
          }
          // Normal directBias (nights 2+)
          if(!c._restrictLocs){
            var directBias = 0.80 * Math.min(14, G.night-1) / 14;
            if(Math.random() < directBias){
              var forward = options.filter(function(o){ return o > c.loc; });
              if(forward.length > 0) options = forward;
            }
          }
        }

        var next = options[Math.floor(Math.random()*options.length)];
        var oldLoc = c.loc;
        c.loc = next;
        onCreatureMove(c, oldLoc);
      } else {
        // Fallback на старую систему маршрутов
        var idx = c.route.indexOf(c.loc);
        if(idx !== -1 && idx < c.route.length-1){
          var oldLoc = c.loc;
          c.loc = c.route[idx+1];
          onCreatureMove(c, oldLoc);
        }
      }
    }
  });
}

function onCreatureMove(c, fromLoc){
  // PATTERN_MEMORY — сохраняем историю последних 3 локаций
  if(!c._locHistory) c._locHistory = [];
  c._locHistory.push(fromLoc);
  if(c._locHistory.length > 3) c._locHistory.shift();

  // Passive snare check — NPC enters loc 8 (cam-c9, building entry)
  if(c.loc === 8 && typeof SNARE_CAM !== 'undefined') SNARE_CAM.tryPassiveSnare(c);

  // SFX: cam04 NPC ambient sound when NPC enters loc 3 (cam-c4, backyard)
  if(c.loc === 3 && typeof CAM04_AMB !== 'undefined' && G.currentRoom === 'cam-c4'){
    CAM04_AMB.playNpcSound();
  }

  // SFX: cam-c10 stairs sounds
  if(c.loc === 9 && typeof AUDIO !== 'undefined' && !AUDIO.muted){
    if(c.id === 'stalker' && Math.random() < 0.60){
      // Сталкер: шаги на лестнице — 50/50 между двумя вариантами
      var stalkerId = Math.random() < 0.5 ? 'sfx-stalker-steps-1' : 'sfx-stalker-steps-2';
      var stalkerSfx = document.getElementById(stalkerId);
      if(stalkerSfx){ stalkerSfx.currentTime = 0; stalkerSfx.volume = 0.55; stalkerSfx.play().catch(function(){}); }
    } else if(c.id !== 'stalker' && Math.random() < 0.50){
      // Остальные NPC: старый атмосферный звук
      var sfx10 = document.getElementById('sfx-cam10-stairs');
      if(sfx10){ sfx10.currentTime = 0; sfx10.volume = 0.40; sfx10.play().catch(function(){}); }
    }
  }

  // SFX: random sound when NPC enters loc 7 (cam-c8a / cam-c8b, first floor)
  if(c.loc === 7 && Math.random() < 0.55){
    var sfx8 = document.getElementById('sfx-cam8-npc');
    if(sfx8 && typeof AUDIO !== 'undefined' && !AUDIO.muted){
      sfx8.currentTime = 0;
      sfx8.volume = 0.45;
      sfx8.play().catch(function(){});
    }
  }

  // Night 7 stalker: freeze at loc 8 for 1 game hour then continue normally
  if(c.id === 'stalker' && c._night7StalkLoc != null && c.loc === c._night7StalkLoc && c._night7WaitUntilHour == null){
    c._night7WaitUntilHour = G.hour + 1;
    addLog('Сталкер замер у входа. Смотрит в камеру, не мигая...', 'w');
  }

  // Сталкер: ломка камеры при прохождении (стадии 4-10)
  if(c.id === 'stalker' && c._stage >= 4){
    var camAtLoc = LOC_CAM[c.loc];
    if(camAtLoc && c._camBreaksThisShift < (STALKER_STAGES[c._stage].maxCamBreaks || 0)){
      // Шанс сломать камеру зависит от стадии: 5% стадия 4, +5% за стадию
      var breakChance = 0.03 * (c._stage - 3);
      if(RNG.chance(Math.round(breakChance * 100))){
        stalkerBreakCamera(c, camAtLoc);
      }
    }
  }

  // Motion alert
  if(typeof triggerMotionAlert==='function'&&LOC_CAM[c.loc]){
    triggerMotionAlert(c, LOC_CAM[c.loc]);
  }
  // Premonition check
  if(typeof checkPremonition==='function') checkPremonition(c);
  var name=c.shortName;
  var locName=LOC_NAMES[c.loc];
  if(c.loc===11){
    return;
  }
  if(c.loc===10) addLog('!! '+name+' у офиса !!','d');
  else if(c.loc===9){
    addLog(name+' на лестнице/в проходе...','w');
    // Shade at stairs = activate hatch mechanic
    if(c.id==='shade' && typeof SHADE_HATCH!=='undefined' && !SHADE_HATCH.active){
      SHADE_HATCH.start();
    }
    // Авто-прожектор (РЕФЛЕКСЫ): включается 1 раз за смену когда тень на loc 9 или 10
    if(c.id==='shade' && !G._autoProjectorUsed && !G.projectorOn){
      var _fx = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects : {};
      if(_fx.auto_projector){
        G._autoProjectorUsed = true;
        G.projectorOn = true;
        var _pBtn = document.getElementById('projector-btn');
        if(_pBtn){ _pBtn.classList.add('on'); _pBtn.textContent='🔆 ПРОЖЕКТОР [P]'; }
        addLog('⚡ Рефлексы: прожектор включился автоматически!','w');
      }
    }
  }
  
  else if(c.loc===7) addLog(name+' на 1м этаже!','w');
  else if(c.loc===8) addLog(name+' вошёл в здание!','w');
  else if(Math.random()<0.35) addLog(name+': '+locName,'');
}

// ─── ЛОГИКА ДВЕРИ ─────────────────────────────────────────────────────────────
function checkAllDoors(){
  Object.values(CREATURES).forEach(function(c){
    if(!c.active)return;

    if(c.loc===11){
      handleCreatureAtDoor(c);
    } else {
      // Сбросить таймеры если отошёл
      stopDoorTimers(c);
    }
  });

  // Shade: особый случай — может просочиться при разряженном фонарике
  var shade=CREATURES.shade;
  if(shade.active&&shade.loc===10&&G.flashBattery<20&&RNG.chance(1)&&RNG.d10()<=4){
    addLog('ТЕНЬ ПРОСОЧИЛАСЬ ЧЕРЕЗ ДВЕРЬ!','d');
    var fxSeep = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    var solarActive = fxSeep.solar_panels && !(G._solarDisabledUntil && Date.now() < G._solarDisabledUntil);
    if(solarActive){
      G._solarDisabledUntil = Date.now() + 30000;
      addLog('⚡ ТЕНЬ ВЫВЕЛА СОЛНЕЧНУЮ ПАНЕЛЬ ИЗ СТРОЯ! Защита отключена на 30 сек.','d');
      setTimeout(function(){ addLog('☀ Солнечная панель восстановлена.','w'); }, 30000);
      shade.loc = 7;
    } else if(fxSeep.door_reinforce){
      addLog('⛓ УКРЕПЛЕНИЕ СДЕРЖАЛО ТЕНЬ! Рассудок -35%','d');
      drainSanity(35);
      if(typeof updateSanityUI==='function') updateSanityUI();
      if(G.sanity <= 0){ sanityOut(); }
      shade.loc = 7;
    } else {
      if(!G.gameOver&&!G.gameWon){G.gameOver=true;setTimeout(function(){kill(shade);},100);}
    }
  }

}

// ─── СТАЛКЕР: ЛОМКА КАМЕР ────────────────────────────────────────────────────
function stalkerBreakCamera(stalker, camId){
  if(!G._brokenCams) G._brokenCams = {};
  if(G._brokenCams[camId]) return; // уже сломана
  G._brokenCams[camId] = true;
  stalker._camBreaksThisShift = (stalker._camBreaksThisShift||0) + 1;
  // Визуально: добавляем класс broken на room-view
  var roomEl = document.getElementById('room-' + camId);
  if(roomEl) roomEl.classList.add('cam-broken');
  addLog('📷 Сталкер разбил камеру ' + camId.replace('cam-','КАМ ').toUpperCase() + '!', 'd');
  drainSanity(10);
  if(typeof updateSanityUI==='function') updateSanityUI();
  if(G.sanity<=0){ sanityOut(); return; }
  // Вспышка на экране если игрок сейчас смотрит эту камеру
  if(G.currentRoom === camId){
    var flash = document.getElementById('cam-flash');
    if(flash){ flash.classList.add('active'); setTimeout(function(){ flash.classList.remove('active'); }, 400); }
    addLog('!! КАМЕРА ВЫШЛА ИЗ СТРОЯ — ПЕРЕКЛЮЧИСЬ НА ДРУГУЮ !!','d');
  }
}

function isCamBroken(camId){
  return !!(G._brokenCams && G._brokenCams[camId]);
}

function handleCreatureAtDoor(c){
  var db=c.doorBehavior;
  var now=Date.now();

  // ─── ОСОБАЯ ЛОГИКА ТЕНИ У ДВЕРИ ───────────────────────────
  if(c.id === 'shade'){
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};

    // ПЕРЕГРУЗКА: тень убивает мгновенно
    if(G.powerOut){
      addLog('⚡ БЕЗ ЭЛЕКТРИЧЕСТВА — ТЕНЬ ПОГЛОТИЛА ТЕБЯ!','d');
      loseNight('shade');
      return;
    }
    // СОЛНЕЧНАЯ ПАНЕЛЬ: тень не снижает рассудок и не убивает,
    // но при атаке выводит панель из строя на 30 секунд
    if(fx.solar_panels){
      var now = Date.now();
      var solarDisabled = G._solarDisabledUntil && now < G._solarDisabledUntil;
      if(!solarDisabled){
        c.loc = 7;
        stopDoorTimers(c);
        G._solarDisabledUntil = now + 30000;
        addLog('⚡ ТЕНЬ ВЫВЕЛА СОЛНЕЧНУЮ ПАНЕЛЬ ИЗ СТРОЯ! Защита отключена на 30 сек.','d');
        flashAlert();
        setTimeout(function(){ addLog('☀ Солнечная панель восстановлена — защита от тени активна.','w'); }, 30000);
        return;
      }
      // Панель выведена из строя — тень действует как обычно
    }
    // 1) Шумоизоляция + Укрепление = тень не подойдёт к двери
    if(fx.shade_blocked){
      // Разворачиваем обратно
      c.loc = 7;
      stopDoorTimers(c);
      addLog('Тень не выносит шумоизоляции и отступает...', '');
      return;
    }
    // 2) Только Укрепление (без Шумоизоляции) = ест рассудок
    if(fx.shade_soul_drain){
      // АВТОМАТИЧЕСКИЙ ПРОЖЕКТОР — Солнечные панели или Прожектор
      // мгновенно отгоняют тень без потери рассудка
      var projectorActive = G.projectorOn && !G.powerOut;
      if((fx.solar_panels && !(G._solarDisabledUntil && Date.now() < G._solarDisabledUntil)) || projectorActive){
        c.loc = 7;
        stopDoorTimers(c);
        addLog('💡 Прожектор отогнал тень! Без потерь рассудка.','');
        return;
      }
      if(!G._shadeSoulDrainActive){
        G._shadeSoulDrainActive = true;
        G._shadeSoulDrainStart = Date.now();
        flashAlert();
        addLog('!! ТЕНЬ СНАРУЖИ — РАССУДОК ТАЕТ !!','d');
        if(typeof G._shadeDoorAttacks !== 'number') G._shadeDoorAttacks = 0;
        // Звук появления тени — 25% на каждый из 4 вариантов
        if(typeof AUDIO !== 'undefined' && !AUDIO.muted){
          var shadeIdx = RNG.d4();
          var shadeSfx = document.getElementById('sfx-shade-appear-' + shadeIdx);
          if(shadeSfx){ shadeSfx.currentTime = 0; shadeSfx.volume = 0.7; shadeSfx.play().catch(function(){}); }
        }
        // Фонарик уже включён — сразу применяем попытку отгона
        if(G.flashOn && typeof tryScareSoulDrainShade === 'function'){
          setTimeout(function(){ tryScareSoulDrainShade(); }, 80);
        }
      }
      return;
    }
    // 3) Дверь3 без Укрепления = тень обесточивает дверь, 10 сек на фонарь
    if(fx.shade_can_emp){
      if(!db._empTriggered){
        db._empTriggered = true;
        triggerShadeEmpAtDoor(c);
      }
      return;
    }
    // 4) Иначе — обычный взлом (если matrix позволила)
  }

  if(db.arrivedAt===0){
    // Только что пришёл
    db.arrivedAt=now;
    G.stats.closeCalls++;
    flashAlert();
    addLog('!! '+c.shortName.toUpperCase()+' У ДВЕРИ !!','d');
    // Ползун не стучит — он либо сразу ломает, либо просто стоит
    if(c.id !== 'crawler') startKnocking(c);
    // Night 2 stalker: knock for 20 real seconds then teleport back to spawn
    if(c.id === 'stalker' && G.night === 2 && c._night2TeleportAfterKnock){
      db._teleportTimer = setTimeout(function(){
        if(!G.gameActive || c.loc !== 11) return;
        stopDoorTimers(c);
        c.loc = 0;  // teleport back to gate
        addLog('Сталкер отступил во тьму...','w');
      }, 20000);
    }
    scheduleBreakAttempt(c);
    if(G.stats.closeCalls<=5&&typeof LEVEL_SYSTEM!=='undefined')
      LEVEL_SYSTEM.addXp(LEVEL_SYSTEM.XP_REWARDS.close_call,'вызов');
  }

  if(!G.doorClosed){
    // Дверь открыта — 1 сек задержка перед входом (время среагировать / умная дверь)
    if(!db._enterTimer){
      addLog('!! '+c.shortName+' ВХОДИТ! ЗАКРОЙ ДВЕРЬ! !!','d');
      // Smart door auto-close
      var fx = (typeof ST!=='undefined') ? ST.activeEffects : {};
      if(fx && fx.smart_door){
        setTimeout(function(){
          if(G.gameActive && !G.doorClosed){
            G.doorClosed = true;
            setDoorUI(true);
            addLog('🤖 Умная дверь закрылась автоматически!','w');
          }
        }, 300);
      }
      db._enterTimer = setTimeout(function(){
        db._enterTimer = null;
        if(!G.gameActive || G.gameOver || G.gameWon) return;
        // Re-check door — player or smart door may have closed it
        if(!G.doorClosed){
          stopDoorTimers(c);
          G.gameOver = true;
          kill(c);
        } else {
          // Door is now closed — NPC starts knocking instead
          addLog(c.shortName+' стучит в дверь...','w');
        }
      }, 1000);
    }
    return;
  } else {
    // Door closed — cancel enter timer if it was running
    if(db._enterTimer){ clearTimeout(db._enterTimer); db._enterTimer = null; }
  }

  // Дверь закрыта — ждёт или ломает
  if(db.canBreakDoor){
    stopDoorTimers(c);
    var isCrawlerFrenzy = c.id==='crawler' && c.crawlerBehavior && c.crawlerBehavior.canBreakMetal;
    var isCrawlerHungry = c.id==='crawler' && c.crawlerBehavior && !c.crawlerBehavior.canBreakMetal
                          && G.night >= 6 && G.night <= 11;

    // Ползун 6-11: срывает засов, дебафает рассудок, отступает — не убивает
    if(isCrawlerHungry){
      addLog('🪲 ПОЛЗУН СРЫВАЕТ ЗАСОВ! Рассудок -30%','d');
      var frame=document.getElementById('door-frame');
      if(frame){frame.classList.add('breaking');setTimeout(function(){frame.classList.remove('breaking');},500);}
      drainSanity(30);
      if(typeof updateSanityUI==='function') updateSanityUI();
      if(G.sanity <= 0){ sanityOut(); return; }
      c.loc = 7;
      db.canBreakDoor = false;
      return;
    }

    // Ползун 12+: прогрызает насквозь, убивает
    if(isCrawlerFrenzy){
      addLog('🪲 ПОЛЗУН ПРОРВАЛСЯ! Он прогрыз путь насквозь!','d');
    } else {
      addLog('!! '+c.shortName+' ЛОМАЕТ ДВЕРЬ !!','d');
    }
    // Анимация двери
    var frame2=document.getElementById('door-frame');
    if(frame2){frame2.classList.add('breaking');setTimeout(function(){frame2.classList.remove('breaking');},500);}
    // Засов: останавливает только не-ползуна
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    if(fx.reinforced_lock && !isCrawlerFrenzy){
      var doorLvl = fx.door_level || 0;
      if(c.id === 'stalker' && doorLvl >= 2){
        // Дверь 2+ и засов — сталкер не может сломать вообще, уходит без урона
        addLog('⛓ Дверь выдержала! Сталкер отступил.','w');
        c.loc = 7;
        db.canBreakDoor = false;
        return;
      }
      addLog('⛓ ЗАСОВ ВЫДЕРЖАЛ! Рассудок -30%','d');
      drainSanity(30);
      if(typeof updateSanityUI==='function') updateSanityUI();
      if(G.sanity <= 0){ sanityOut(); }
      c.loc = 7;
      db.canBreakDoor = false;
      return;
    }
    setTimeout(function(){
      if(!G.gameOver&&!G.gameWon){G.gameOver=true;kill(c);}
    },800);
    return;
  }

  // Иногда отступает сам
  if(RNG.roll(1000) === 1){  // 0.1% шанс самостоятельного отступления
    stopDoorTimers(c);
    c.loc = 10; // отступает к "у офиса"
    addLog(c.shortName+' отступил от двери.','');
  }
}

function startKnocking(c){
  var db=c.doorBehavior;
  if(db.knockTimer)return;
  if(typeof CFG!=='undefined'&&!CFG.doorKnock)return;
  db.knockTimer=setInterval(function(){
    if(c.loc!==11){clearInterval(db.knockTimer);db.knockTimer=null;return;}
    // Визуальный стук — мигание alert
    flashAlert();
    // Звуковой сигнал через UI
    addLog('БУМ — '+c.shortName+' стучит в дверь!','d');
    if(typeof SFX!=='undefined') SFX.doorKnock();
    // Metal scrape sfx on nights 2-3 with random chance
    if(G.night >= 2 && G.night <= 3 && RNG.chance(60)){
      var sfxBang = document.getElementById('sfx-door-bang');
      if(sfxBang && typeof AUDIO !== 'undefined' && !AUDIO.muted){
        sfxBang.currentTime = 0;
        sfxBang.volume = 0.35;
        sfxBang.play().catch(function(){});
      }
    }
    // Потряхивание двери
    var frame=document.getElementById('door-frame');
    if(frame){frame.classList.add('knocking');setTimeout(function(){frame.classList.remove('knocking');},200);}
  },db.knockInterval);
}

function scheduleBreakAttempt(c){
  var db=c.doorBehavior;
  var waitMs=( db.waitBeforeBreak[Math.min(G.night,15)] || Infinity ) * 1000;

  // Crawler in frenzy can break metal doors
  if(c.id==='crawler' && c.crawlerBehavior && c.crawlerBehavior.canBreakMetal){
    var crawlerBreakMs = 5000; // base
    // УКРЕПЛЕНИЕ (ОФИС) — ползун грызёт дверь в 2× дольше
    if(typeof ST!=='undefined' && ST.activeEffects && ST.activeEffects.door_reinforce){
      crawlerBreakMs *= 2;
    }
    // АНТИ-ПОЛЗУН: СТАЛЬНОЙ ОШЕЙНИК +1 сек/уровень
    if(typeof ST!=='undefined' && ST.activeEffects){
      var collarLvl = ST.activeEffects.ac_collar_lvl || 0;
      if(collarLvl > 0) crawlerBreakMs += 1000 * collarLvl;
    }
    waitMs = Math.min(waitMs, crawlerBreakMs);
  }

  if(waitMs===Infinity)return;
  if(db.breakTimer)clearTimeout(db.breakTimer);
  db.breakTimer=setTimeout(function(){
    if(c.loc===11){
      // Ползун с 12 уровня прогрызает дверь независимо от её состояния
      var crawlerFrenzy = c.id==='crawler' && c.crawlerBehavior && c.crawlerBehavior.canBreakMetal;
      if(crawlerFrenzy || G.doorClosed){
        if(typeof CFG==='undefined'||CFG.doorBreak){
          db.canBreakDoor=true;
          if(crawlerFrenzy){
            addLog('🪲 ПОЛЗУН ПРОГРЫЗАЕТ СТЕНУ! Он не остановится!','d');
          } else {
            addLog('!! '+c.shortName+' НАЧИНАЕТ ЛОМАТЬ ДВЕРЬ !!','d');
          }
        }
      }
    }
  },waitMs);
}

function stopDoorTimers(c){
  var db=c.doorBehavior;
  if(db.knockTimer){clearInterval(db.knockTimer);db.knockTimer=null;}
  if(db.breakTimer){clearTimeout(db.breakTimer);db.breakTimer=null;}
  if(db._enterTimer){clearTimeout(db._enterTimer);db._enterTimer=null;}
  if(db._teleportTimer){clearTimeout(db._teleportTimer);db._teleportTimer=null;}
  db.canBreakDoor=false;
  db.arrivedAt=0;
}

// ─── ВИЗУАЛЫ NPC ──────────────────────────────────────────────────────────────
function updateCreatureVisuals(){
  // Скрыть все
  document.querySelectorAll('.stalker-wrap').forEach(function(e){
    e.classList.remove('visible','near','shade-mode','crawler-mode');
    e.style.opacity='';
  });
  // Night 1 stalker invisible until hour 2 (10:00)
  var _stalkerHidden = false;
  if(CREATURES.stalker && CREATURES.stalker._invisibleUntilHour != null){
    if(G.hour < CREATURES.stalker._invisibleUntilHour) _stalkerHidden = true;
  }

  Object.values(CREATURES).forEach(function(c){
    if(!c.active)return;

    if(c.loc===11){
      // У двери — в офисе показываем ТОЛЬКО если дверь ОТКРЫТА
      if(!G.doorClosed){
        var swOff=document.getElementById('sw-'+c.id+'-office');
        if(swOff){swOff.classList.add('visible','near');}
      }
      // В peek view — всегда видно
      var swPeek=document.getElementById('sw-'+c.id+'-peek');
      if(swPeek){swPeek.classList.add('visible','near');}
      flashAlert();
      return;
    }

    // Stairs (10) / near office (11) — also visible in peek view
    if(c.loc===9 || c.loc===10){
      var swPeek=document.getElementById('sw-'+c.id+'-peek');
      if(swPeek){
        swPeek.classList.add('visible');
        if(c.loc===10) swPeek.classList.add('near');
      }
    }

    // Stalker invisible check — skip ALL camera rendering including sync
    if(c.id === 'stalker' && _stalkerHidden) return;

    var camId=LOC_CAM[c.loc];
    if(!camId)return;
    var sw=document.getElementById('sw-'+c.id+'-'+camId);
    if(!sw)return;

    // Camera sync — show NPC on all synced cameras
    var syncCams = (typeof CAM_SYNC!=='undefined' && camId) ? CAM_SYNC[camId] : null;
    if(syncCams){
      syncCams.forEach(function(sc){
        var swS = document.getElementById('sw-'+c.id+'-'+sc);
        if(swS) swS.classList.add('visible');
      });
    }

    // Crawler: виден только внизу кадра
    if(c.id==='crawler'){
      sw.classList.add('visible','crawler-mode');
      
      return;
    }

    // Shade: видима только в здании; на периметре — только с тактическим чутьём;
    // на дальних камерах — только со всеведением; в вентиляции — невидима всегда.
    if(c.id==='shade'){
      var _sfx = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects:{};
      var _zone = LOC_ZONE[c.loc] || 'vent';
      if(_zone === 'vent') return;
      if(_zone === 'far' && !_sfx.omniscience) return;
      if(_zone === 'perimeter' && !_sfx.omniscience && !_sfx.shade_vision) return;
      // Видима — показываем с прозрачностью по зоне
      var _sb = c.shadeBehavior;
      if(c.loc === 11){
        if(_sb && _sb.phase === 'attack' && !G.doorClosed){
          sw.classList.add('visible','shade-mode','near');
          sw.style.opacity = '1';
        }
      } else if(c.loc === 7){
        sw.classList.add('visible','shade-mode');
        sw.style.opacity = '0.15';
      } else if(c.loc === 8){
        sw.classList.add('visible','shade-mode');
        sw.style.opacity = '0.25';
      } else if(c.loc >= 9){
        sw.classList.add('visible','shade-mode');
        sw.style.opacity = '0.45';
      } else {
        // периметр/дальние с навыком
        sw.classList.add('visible','shade-mode');
        sw.style.opacity = '0.2';
      }
      return;
    }

    // Stalker: обычно
    sw.classList.add('visible');
    if(c.loc===10)sw.classList.add('near');
    
  });

  // Shade hatch UI — force show when shade at loc 9
  if(CREATURES.shade && CREATURES.shade.active && CREATURES.shade.loc === 9){
    if(typeof SHADE_HATCH!=='undefined' && !SHADE_HATCH.active) SHADE_HATCH.start();
  }

  // Карты
  updateMapStalker('global',LOC_MAP_GLOBAL);
  updateMapStalker('far',LOC_MAP_FAR);
  updateMapStalker('perimeter',LOC_MAP_PERIMETER);
  updateMapStalker('building',LOC_MAP_BUILDING);

  // Camera button danger highlighting — requires motion sensor
  var motionLvl = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects.motion_level||0:0;
  document.querySelectorAll('.cbtn').forEach(function(b){b.classList.remove('danger');});
  document.querySelectorAll('.cam-marker').forEach(function(m){m.classList.remove('danger');});
  document.querySelectorAll('.cgo-btn').forEach(function(b){b.classList.remove('danger');});
  if(motionLvl > 0){
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=11)return;
      var locZone = LOC_ZONE[c.loc] || 'far';
      var canSee = false;
      if(motionLvl>=3) canSee=true;
      else if(motionLvl>=2 && locZone!=='far') canSee=true;
      else if(motionLvl>=1 && locZone==='building') canSee=true;
      if(!canSee) return;
      var cid=LOC_CAM[c.loc];
      if(cid){
        var b=document.getElementById('cbtn-'+cid);if(b)b.classList.add('danger');
        document.querySelectorAll('[data-cam="'+cid+'"]').forEach(function(m){m.classList.add('danger');});
        // Sync cameras danger highlight
        var syncs = (typeof CAM_SYNC!=='undefined') ? CAM_SYNC[cid] : null;
        if(syncs) syncs.forEach(function(sc){
          var sb=document.getElementById('cbtn-'+sc);if(sb)sb.classList.add('danger');
        });
      }
    });
  }
}

function updateMapStalker(terr,posArr){
  var motionLevel = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects.motion_level||0:0;
  // Обновляем мигание пинов на обзорной карте (только для global)
  if(terr === 'global' && motionLevel > 0 && typeof LOC_CAM !== 'undefined'){
    // Сбросить все пины
    document.querySelectorAll('.map-pin-motion').forEach(function(p){ p.classList.remove('map-pin-motion'); });
    // Зажечь пины где сейчас есть активные NPC
    Object.keys(CREATURES).forEach(function(k){
      var c = CREATURES[k];
      if(!c.active || c.loc >= 11) return;
      var camId = LOC_CAM[c.loc];
      if(!camId) return;
      var pin = document.getElementById('map-pin-'+camId);
      if(pin) pin.classList.add('map-pin-motion');
    });
  }
  Object.keys(CREATURES).forEach(function(k){
    var c=CREATURES[k];
    var ms=document.getElementById('map-stalker-'+terr+'-'+k);
    if(!ms){return;}
    if(!c.active||c.loc>=11){ms.style.display='none';return;}
    // Night 1: stalker invisible on map until 10:00
    if(c.id==='stalker' && c._invisibleUntilHour!=null && G.hour<c._invisibleUntilHour){ms.style.display='none';return;}
    // Motion sensor controls visibility

    var locZone = c.loc>=8?'building':c.loc>=4?'perimeter':'far';
    var visible = false;
    if(motionLevel>=3) visible=true;                         // all zones
    else if(motionLevel>=2 && locZone!=='far') visible=true; // building+perimeter
    else if(motionLevel>=1 && locZone==='building') visible=true; // building only
    if(!visible){ms.style.display='none';return;}
    // Shade: на карте видима только в здании; периметр — с тактическим чутьём; дальние — со всеведением
    if(c.id==='shade'){
      var _mzone = LOC_ZONE[c.loc]||'vent';
      var _mfx = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects:{};
      if(_mzone==='vent'){ms.style.display='none';return;}
      if(_mzone==='far'&&!_mfx.omniscience){ms.style.display='none';return;}
      if(_mzone==='perimeter'&&!_mfx.omniscience&&!_mfx.shade_vision){ms.style.display='none';return;}
    }
    var pos=posArr[c.loc];
    if(pos){ms.style.display='block';ms.style.left=pos[0]+'%';ms.style.top=pos[1]+'%';}
    else ms.style.display='none';
  });
}

function updateCreaturePanel(){
  var motionLvl = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects.motion_level||0:0;
  var omniscience = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects.omniscience:false;

  Object.keys(CREATURES).forEach(function(k){
    var c=CREATURES[k];
    var el=document.getElementById('cs-'+k);
    if(!el)return;
    if(!c.active){el.textContent='НЕАКТИВЕН';el.className='stalker-loc lc-off';return;}
    if((c.id==='crawler'||c.id==='shade')&&!c.activated){
      el.textContent='СПИТ...';el.className='stalker-loc lc-off';return;
    }

    // Without motion sensor or omniscience — location unknown
    if(!omniscience && motionLvl === 0){
      el.textContent='???';el.className='stalker-loc lc-off';return;
    }

    // Check if motion sensor can see this zone
    var locZone = c.loc>=8?'building':c.loc>=4?'perimeter':'far';
    var canSee = omniscience;
    if(!canSee){
      if(motionLvl>=3) canSee=true;
      else if(motionLvl>=2 && locZone!=='far') canSee=true;
      else if(motionLvl>=1 && locZone==='building') canSee=true;
    }

    // Тень: видима в здании; периметр — с тактическим чутьём; дальние — со всеведением
    if(c.id==='shade'){
      var _cpzone = LOC_ZONE[c.loc]||'vent';
      var _shadeVis = (typeof ST!=='undefined'&&ST.activeEffects)?ST.activeEffects.shade_vision:false;
      if(_cpzone==='vent'){el.textContent='В ВЕНТИЛЯЦИИ';el.className='stalker-loc lc-off';return;}
      if(_cpzone==='far'&&!omniscience){el.textContent='???';el.className='stalker-loc lc-off';return;}
      if(_cpzone==='perimeter'&&!omniscience&&!_shadeVis){el.textContent='???';el.className='stalker-loc lc-off';return;}
    }

    if(!canSee){el.textContent='???';el.className='stalker-loc lc-off';return;}

    // NPC at door — always visible
    if(c.loc===11){el.textContent=LOC_NAMES[c.loc];el.className='stalker-loc lc-door';return;}

    el.textContent=LOC_NAMES[c.loc];
    el.className='stalker-loc '+LOC_CSS[c.loc];

    // АНАЛИЗ ДВИЖЕНИЙ — история последних 3 точек в tooltip
    if((typeof ST!=='undefined' && ST.activeEffects && ST.activeEffects.pattern_memory) && c._locHistory && c._locHistory.length){
      var trail = c._locHistory.map(function(l){ return LOC_NAMES[l] || '?'; }).join(' → ');
      el.title = 'След: ' + trail + ' → ' + LOC_NAMES[c.loc];
    } else {
      el.title = '';
    }

    // ПРЕДСКАЗАНИЕ — добавляем стрелку → следующая локация
    var fxPredict = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    if((fxPredict.predict || fxPredict.foresight) && c.moveGraph && c.moveGraph[c.loc]){
      var depth = fxPredict.foresight ? 3 : 1;
      var simLoc = c.loc;
      var futureChain = [];
      for(var step=0; step<depth; step++){
        var simOpts = c.moveGraph[simLoc];
        if(!simOpts || simOpts.length === 0) break;
        var simNext;
        if(c.id === 'stalker'){
          var fwd = simOpts.filter(function(o){ return o > simLoc; });
          simNext = fwd.length > 0 ? fwd[0] : simOpts[0];
        } else {
          simNext = simOpts[0];
        }
        if(simNext == null || simNext === simLoc) break;
        futureChain.push(simNext);
        simLoc = simNext;
        if(simLoc >= 11) break; // у двери — дальше не предсказываем
      }
      if(futureChain.length){
        el.textContent += ' → ' + futureChain.map(function(l){ return LOC_NAMES[l] || '?'; }).join(' → ');
      }
    }
  });
}

// ─── KILL / WIN / POWEROUT ────────────────────────────────────────────────────
function kill(creature){
  if(!G.gameActive)return;

  // 3 сек неуязвимости после Выжившего
  if(G._invincibleUntil && Date.now() < G._invincibleUntil){
    if(creature && creature.loc >= 11){
      creature.loc = 0;
      if(typeof stopDoorTimers === 'function') stopDoorTimers(creature);
    }
    addLog('🛡 Неуязвимость! Атака отбита.','w');
    return;
  }

  // ВЫЖИВШИЙ — однократное спасение от смертельного удара за смену
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  if(fx.survivor && !G._survivorUsed){
    G._survivorUsed = true;
    G.sanity = Math.max(G.sanity, 1);
    G.power = Math.max(G.power, 1);
    G._invincibleUntil = Date.now() + 3000;
    // Откинуть нападающего обратно в loc 0, очистить таймеры всех NPC у двери
    Object.values(CREATURES).forEach(function(c){
      if(c.loc >= 11){
        c.loc = 0;
        if(typeof stopDoorTimers === 'function') stopDoorTimers(c);
      }
    });
    // Сбросить soul drain если был
    G._shadeSoulDrainActive = false;
    addLog('🛡 ВЫЖИВШИЙ! Ты остался жив с 1%! 3 сек неуязвимости.','w');
    if(typeof updateSanityUI==='function') updateSanityUI();
    if(typeof updatePowerUI==='function') updatePowerUI();
    return;
  }

  G.gameActive=false;
  G.intervals.forEach(clearInterval);G.intervals=[];
  if(typeof WEATHER!=='undefined') WEATHER.stop();
  if(typeof AMBIENT!=='undefined') AMBIENT.stop();
  if(typeof SFX!=='undefined') SFX.gameOver();
  // Очистить все door timers
  Object.values(CREATURES).forEach(function(c){stopDoorTimers(c);});
  document.body.classList.remove('panic');
  var js=document.getElementById('jumpscare');
  var msgs=creature.scare;
  document.getElementById('sc-text').textContent=RNG.pick(msgs);
  var srcEl=document.getElementById('img-src-'+creature.id);
  var scImg=document.getElementById('sc-stalker-img');var goImg=document.getElementById('go-stalker-img');
  if(srcEl&&scImg)scImg.src=srcEl.src;if(srcEl&&goImg)goImg.src=srcEl.src;
  document.getElementById('main-view').classList.add('shake');
  js.style.background=creature.id==='crawler'?'#1a0500':creature.id==='shade'?'#0a0015':'#081808';
  if(typeof CFG!=='undefined'&&!CFG.jumpscare){buildDeathScreen(creature);showDeathScreen(creature);return;}

  // Stalker / Crawler: video screamer
  var stalkerVid=document.getElementById('sc-stalker-video');
  var crawlerVid=document.getElementById('sc-crawler-video');
  var shadeVid=document.getElementById('sc-shade-video');
  var isStalker=(creature.id==='stalker');
  var isCrawler=(creature.id==='crawler');
  var isShade=(creature.id==='shade');
  var activeVid=isStalker?stalkerVid:isCrawler?crawlerVid:isShade?shadeVid:null;

  if(stalkerVid) stalkerVid.style.display='none';
  if(crawlerVid) crawlerVid.style.display='none';
  if(shadeVid)   shadeVid.style.display='none';
  if(scImg) scImg.style.display=(activeVid)?'none':'block';

  if(activeVid){
    activeVid.style.display='block';
    activeVid.currentTime=0;
    activeVid.muted=false;
    activeVid.play().catch(function(){activeVid.muted=true;activeVid.play();});
  }

  js.classList.add('active');
  var scareDur=(isStalker||isCrawler||isShade)?4200:2000;

  function _endScreamer(){
    js.classList.remove('active');
    if(activeVid){activeVid.pause();activeVid.currentTime=0;activeVid.style.display='none';}
    if(scImg) scImg.style.display='block';
    document.getElementById('main-view').classList.remove('shake');
    buildDeathScreen(creature);showDeathScreen(creature);
  }

  if(activeVid){
    activeVid.onended=function(){ clearTimeout(_scTimer); _endScreamer(); activeVid.onended=null; };
  }
  var _scTimer=setTimeout(function(){
    if(activeVid) activeVid.onended=null;
    _endScreamer();
  },scareDur||2000);
}

function showDeathScreen(creature){
  if(G.endlessMode && typeof ENDLESS !== 'undefined'){
    ENDLESS.onGameOver();
    return;
  }
  if(G.night === 1){
    // Night 1: simple loss screen
    var h = document.getElementById('go1-hour');
    if(h) h.textContent = (typeof HOURS!=='undefined' ? HOURS[G.hour] : '');
    var cr = document.getElementById('go1-creature');
    if(cr){ cr.textContent = creature ? creature.name : ''; cr.style.color = creature ? (creature.color||'#cc3322') : '#cc3322'; }
    var msg = document.getElementById('go1-msg');
    if(msg) msg.textContent = creature ? (creature.killMsg||'') : '';
    showScreen('gameover-night1-screen');
  } else {
    showScreen('gameover-screen');
  }
}

function buildDeathScreen(c){
  document.getElementById('go-creature-name').textContent=c.name;
  document.getElementById('go-creature-name').style.color=c.color;
  document.getElementById('go-msg').textContent=c.killMsg;
  document.getElementById('go-night').textContent='УРОВЕНЬ '+G.night+' · '+HOURS[G.hour];
  document.getElementById('go-stats').textContent='КАМ: '+G.stats.camSwitches+' · ДВЕР: '+G.stats.doorClosings+' · СПАС: '+G.stats.closeCalls;
}

function powerOut(){
  // legacy: больше не используется (электричество бесконечно), но оставим как алиас на случай вызова
  sanityOut('!! ЭНЕРГИЯ ВЫРУБИЛАСЬ !!');
}

// ── ТЕНЬ ОБЕСТОЧИЛА ДВЕРЬ (Дверь3 без Укрепления) ──
// Окно 10 сек на нажатие фонаря. Если успел — тень отступает на loc 7.
// Если нет — дверь открывается, смерть.
function triggerShadeEmpAtDoor(c){
  if(G._shadeDoorEMP) return;
  G._shadeDoorEMP = true;
  G._shadeEMP = true;
  var gs = document.getElementById('game-screen');
  if(gs) gs.classList.add('shade-emp');
  flashAlert();
  addLog('!! ТЕНЬ ОБЕСТОЧИЛА ДВЕРЬ — СВЕТИ ФОНАРЁМ !!','d');

  var deadline = Date.now() + 10000;
  var consumed = false;
  if(c.doorBehavior._empCheckTimer) clearInterval(c.doorBehavior._empCheckTimer);
  c.doorBehavior._empCheckTimer = setInterval(function(){
    if(!G.gameActive || G.gameOver || G.gameWon){
      clearInterval(c.doorBehavior._empCheckTimer);
      c.doorBehavior._empCheckTimer = null;
      return;
    }
    if(c.loc !== 11){
      // Тень ушла
      clearInterval(c.doorBehavior._empCheckTimer);
      c.doorBehavior._empCheckTimer = null;
      G._shadeDoorEMP = false; G._shadeEMP = false;
      if(gs) gs.classList.remove('shade-emp');
      c.doorBehavior._empTriggered = false;
      return;
    }
    if(G.flashOn && !consumed){
      consumed = true;
      clearInterval(c.doorBehavior._empCheckTimer);
      c.doorBehavior._empCheckTimer = null;
      G._shadeDoorEMP = false; G._shadeEMP = false;
      if(gs) gs.classList.remove('shade-emp');
      c.loc = 7;
      c.doorBehavior._empTriggered = false;
      addLog('🔦 Фонарь отогнал тень от двери!','');
      stopDoorTimers(c);
      return;
    }
    if(Date.now() >= deadline){
      clearInterval(c.doorBehavior._empCheckTimer);
      c.doorBehavior._empCheckTimer = null;
      if(G.gameOver || G.gameWon) return;
      addLog('!! ТЕНЬ ВОШЛА ЧЕРЕЗ ОБЕСТОЧЕННУЮ ДВЕРЬ !!','d');
      var fxEmp = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
      var solarEmpActive = fxEmp.solar_panels && !(G._solarDisabledUntil && Date.now() < G._solarDisabledUntil);
      if(solarEmpActive){
        G._solarDisabledUntil = Date.now() + 30000;
        addLog('⚡ ТЕНЬ ВЫВЕЛА СОЛНЕЧНУЮ ПАНЕЛЬ ИЗ СТРОЯ! Защита отключена на 30 сек.','d');
        setTimeout(function(){ addLog('☀ Солнечная панель восстановлена.','w'); }, 30000);
        c.loc = 7;
        G._shadeSoulDrainActive = false;
        return;
      } else if(fxEmp.door_reinforce){
        addLog('⛓ УКРЕПЛЕНИЕ СДЕРЖАЛО ТЕНЬ! Рассудок -40%','d');
        drainSanity(40);
        if(typeof updateSanityUI==='function') updateSanityUI();
        if(G.sanity <= 0){ sanityOut(); return; }
        c.loc = 7;
        G._shadeSoulDrainActive = false;
        return;
      }
      G.gameOver = true;
      setTimeout(function(){ kill(c); }, 200);
    }
  }, 100);
}

// ── ОТГОН ТЕНИ ФОНАРЁМ В РЕЖИМЕ SOUL DRAIN ──
// Атаки эскалируют: -25%/-15%/-5%/смерть.
// Прожектор отгоняет неограниченно.
function tryScareSoulDrainShade(){
  if(!G._shadeSoulDrainActive) return;
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};

  // Прожектор / Солнечные панели / Фонарь ур.3 — бесконечный отгон без штрафа
  var projOn = (typeof G!=='undefined') && G.projectorOn && !G.powerOut;
  if((fx.projector && projOn) || fx.solar_panels || fx.flash_grid_power){
    G._shadeSoulDrainActive = false;
    var shade = CREATURES.shade;
    shade.loc = 7;
    addLog('💡 Прожектор отогнал тень. Без потерь рассудка.','');
    return;
  }

  G._shadeDoorAttacks = (G._shadeDoorAttacks||0) + 1;
  var n = G._shadeDoorAttacks;
  var penalties = [25, 15, 5];
  if(n >= 4){
    addLog('!! ТЕНЬ СГУСТИЛАСЬ — СВЕТ БОЛЬШЕ НЕ ПУГАЕТ !!','d');
    var fxShade = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    // СОЛНЕЧНАЯ ПАНЕЛЬ: тень не убивает, но выводит панель из строя на 30 сек
    var solarShadeActive = fxShade.solar_panels && !(G._solarDisabledUntil && Date.now() < G._solarDisabledUntil);
    if(solarShadeActive){
      G._solarDisabledUntil = Date.now() + 30000;
      addLog('⚡ ТЕНЬ ВЫВЕЛА СОЛНЕЧНУЮ ПАНЕЛЬ ИЗ СТРОЯ! Защита отключена на 30 сек.','d');
      setTimeout(function(){ addLog('☀ Солнечная панель восстановлена.','w'); }, 30000);
      G._shadeDoorAttacks = 0;
      var shade3 = CREATURES.shade;
      shade3.loc = 7;
      G._shadeSoulDrainActive = false;
      return;
    }
    // Укрепление: тень не может убить — только сильный урон рассудку
    if(fxShade.door_reinforce){
      addLog('⛓ УКРЕПЛЕНИЕ СДЕРЖАЛО ТЕНЬ! Рассудок -50%','d');
      drainSanity(50);
      if(typeof updateSanityUI==='function') updateSanityUI();
      if(G.sanity <= 0){ sanityOut(); return; }
      G._shadeDoorAttacks = 0; // сбрасываем счётчик атак тени
      var shade2 = CREATURES.shade;
      shade2.loc = 7;
      G._shadeSoulDrainActive = false;
      return;
    }
    if(!G.gameOver && !G.gameWon){
      G.gameOver = true;
      setTimeout(function(){ kill(CREATURES.shade); }, 200);
    }
    return;
  }
  var pen = penalties[n-1];
  drainSanity(pen);
  if(typeof updateSanityUI==='function') updateSanityUI();

  var scareChance = 0.80 + (fx.flash_shade_bonus || 0);
  if(RNG.chance(Math.round(scareChance * 100))){
    G._shadeSoulDrainActive = false;
    var shade = CREATURES.shade;
    shade.loc = 7;
    addLog('🔦 Тень отогнана. Рассудок -'+pen+'% (попытка '+n+'/3)','d');
  } else {
    addLog('🔦 Свет коснулся, но не выгнал тень. Рассудок -'+pen+'%','d');
  }
}

// Проигрыш по рассудку: игрок не умер, но сошёл с ума
function sanityOut(customMsg){
  if(!G.gameActive)return;
  // Во время неуязвимости Выжившего рассудок не может упасть до 0
  if(G._invincibleUntil && Date.now() < G._invincibleUntil){
    G.sanity = Math.max(G.sanity, 1);
    if(typeof updateSanityUI==='function') updateSanityUI();
    return;
  }
  G.gameActive=false;
  G.gameOver=true;
  G.intervals.forEach(clearInterval);G.intervals=[];
  if(typeof WEATHER!=='undefined') WEATHER.stop();
  if(typeof AMBIENT!=='undefined') AMBIENT.stop();
  Object.values(CREATURES).forEach(function(c){stopDoorTimers(c);});
  document.body.classList.remove('panic');
  addLog(customMsg || '!! РАССУДОК ИССЯК — ТЫ СОШЁЛ С УМА !!', 'd');

  var quotes = [
    'Они были здесь всё время. Я просто не видел.',
    'Стены смеются. Потолок дышит.',
    'Я слышал шёпот ещё до того, как пришёл сюда.',
    'Темнота — это не отсутствие света. Это присутствие чего-то другого.',
    'На камерах никого не было. А потом я понял — камеры врут.'
  ];
  var el = document.getElementById('insane-night');
  if(el) el.textContent = 'УРОВЕНЬ ' + G.night + ' · ' + (typeof HOURS!=='undefined' ? HOURS[G.hour] : '');
  var qEl = document.getElementById('insane-quote');
  if(qEl) qEl.textContent = '"' + quotes[Math.floor(Math.random()*quotes.length)] + '"';

  // Короткий эффект перед экраном
  document.getElementById('main-view').classList.add('shake');
  setTimeout(function(){
    document.getElementById('main-view').classList.remove('shake');
    if(G.endlessMode && typeof ENDLESS !== 'undefined'){
      ENDLESS.onGameOver();
    } else {
      showScreen('insane-screen');
    }
  }, 600);
}

// Расход рассудка от тени за тик 500мс — возвращает значение «/сек»
function shadeSanityDrainPerTick(){
  var shade = CREATURES.shade;
  if(!shade || !shade.active) return 0;
  var drop = 0;
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  // СОЛНЕЧНАЯ ПАНЕЛЬ: полная блокировка дрейна рассудка от тени (если не выведена из строя)
  var solarWorking = fx.solar_panels && !(G._solarDisabledUntil && Date.now() < G._solarDisabledUntil);
  if(solarWorking) return 0;
  // Фаза пробития люка (cam10) — небольшое давление
  if(typeof SHADE_HATCH !== 'undefined' && SHADE_HATCH.active && SHADE_HATCH.phase === 'hatch'){
    drop += 0.05;
  }
  // Тень в режиме "ест рассудок у Двери3+Укрепление+Шумоизоляция"
  if(G._shadeSoulDrainActive){
    // Эскалация: чем дольше стоит, тем выше расход (от 0.5 до 1.0/сек)
    var elapsedSec = (Date.now() - (G._shadeSoulDrainStart||Date.now())) / 1000;
    var rate = Math.min(1.0, 0.5 + elapsedSec * 0.025);
    var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
    // АНТИ-ТЕНЬ: ИНГИБИТОР -5%/уровень
    var inhibitLvl = fx.at_inhibit_lvl || 0;
    if(inhibitLvl > 0) rate *= (1 - 0.05*inhibitLvl);
    // ЖЕЛЕЗНАЯ ВОЛЯ — -50% к soul drain
    if(fx.iron_will) rate *= 0.5;
    drop += rate;
  }
  return drop;
}

// HUD рассудка
function updateSanityUI(){
  var el = document.getElementById('hud-sanity');
  var bar = document.getElementById('sanity-bar-fill');
  var p = Math.floor(G.sanity);
  if(el){
    el.textContent = p + '%';
    el.className = 'pval' + (p<=20?' plow':'');
    if(p<=20)      el.style.color = '';
    else if(p<=50) el.style.color = '#ff8800';
    else           el.style.color = '#bb66ff';
  }
  if(bar){
    bar.style.width = p + '%';
    bar.style.background = p<=20 ? '#cc2200' : p<=50 ? '#ff8800' : '';
  }
}

function winNight(){
  // Stop cam04 ambient
  if(typeof CAM04_AMB !== 'undefined') CAM04_AMB.stop();
  // Clear crawler feed timer if active
  if(typeof CREATURES!=='undefined' && CREATURES.crawler && CREATURES.crawler._feedTimer){
    clearInterval(CREATURES.crawler._feedTimer);
    CREATURES.crawler._feedTimer = null;
    CREATURES.crawler._feedingAtLoc = null;
  }
  if(!G.gameActive)return;
  G.gameActive=false;G.gameWon=true;
  if(typeof ANOMALY_SYSTEM!=='undefined') ANOMALY_SYSTEM.cleanup();
  if(typeof SFX!=='undefined') SFX.nightWin();
  G.intervals.forEach(clearInterval);G.intervals=[];
  Object.values(CREATURES).forEach(function(c){stopDoorTimers(c);});
  document.body.classList.remove('panic');
  if(typeof WEATHER!=='undefined') WEATHER.stop();
  if(typeof AMBIENT!=='undefined') AMBIENT.stop();
  // Бесконечный режим — не сохраняем кампанию, переходим на следующую волну
  if(G.endlessMode && typeof ENDLESS!=='undefined'){
    if(typeof LEVEL_SYSTEM!=='undefined') LEVEL_SYSTEM.save();
    ENDLESS.onWaveWin();
    return;
  }
  saveNight(G.night);
  if(typeof ST!=='undefined'){ ST.nightsCompleted=(ST.nightsCompleted||0)+1; saveSkillData(); }
  // Разблокировка следующего класса при прохождении 15-й ночи
  if(G.night >= 15 && typeof CLASS_SYSTEM !== 'undefined'){
    CLASS_SYSTEM.onNight15Won();
  }
  // Award XP for completing night
  if(typeof awardXpForNight==='function') awardXpForNight(G.night);
  // Add diary entry
  if(typeof DIARY!=='undefined'){ DIARY.load(); DIARY.addEntry(G.night); }
  // Track achievements
  if(typeof trackSpecialAchievements==='function') trackSpecialAchievements();
  if(typeof ACHIEVEMENTS!=='undefined') ACHIEVEMENTS.checkAll();
  if(G.night === 15){
    var _cls = (typeof CFG !== 'undefined' && CFG.class) ? CFG.class : 'guard';
    if(_cls === 'military'){
      if(typeof triggerFinale === 'function') triggerFinale('arms');
      return;
    } else if(_cls === 'scientist'){
      if(typeof triggerFinale === 'function') triggerFinale('lab');
      return;
    }
    var endingChoice = null;
    try{ endingChoice = localStorage.getItem('resonance_ending_choice'); }catch(e){}
    triggerStoryEnding(endingChoice || 'stay');
    return;
  }
  buildStatsScreen();showScreen('stats-screen');
}

function buildStatsScreen(){
  document.getElementById('stat-night').textContent='УРОВЕНЬ '+G.night+' ЗАВЕРШЁН';
  document.getElementById('stat-cam').textContent=G.stats.camSwitches;
  document.getElementById('stat-door').textContent=G.stats.doorClosings;
  document.getElementById('stat-flash').textContent=G.stats.flashUses;
  document.getElementById('stat-close').textContent=G.stats.closeCalls;
  document.getElementById('stat-power').textContent=Math.floor(G.power)+'%';
  document.getElementById('stat-battery').textContent=Math.floor(G.flashBattery)+'%';
  var nb=document.getElementById('stat-next-btn');
  if(G.night>=15){nb.textContent='🏆 КАМПАНИЯ ПРОЙДЕНА';nb.onclick=function(){showScreen('lobby-screen');};}
  else{nb.textContent='УРОВЕНЬ '+(G.night+1)+' ▶';nb.onclick=function(){showNotes(G.night+1);};}
  if(typeof updateLevelUI==='function') updateLevelUI();
  if(typeof updateNightButtons==='function') updateNightButtons();

  // Night 1 & 2: show narrative instead of plain stats
  var NARRATIVES = {
    1: {
      html: document.getElementById('narrative-night1-content') ? document.getElementById('narrative-night1-content').innerHTML : '',
      next: 2
    },
    2: {
      html: '<div class=\"narrative-chapter\">СМЕНА 2: ИСПЫТАНИЕ ПРОЧНОСТИ</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">02:00</span>'
          + '<p>Камеры показывают Сталкера. Сегодня он не просто стоит. Он идет целенаправленно к твоему зданию. Ты видишь на мониторе, как он поднимается по лестнице на первый этаж.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">03:15</span>'
          + '<p>Нападение. Тяжелые удары сотрясают твою новую дверь. Сталкер бьет по ней кулаками и обухом мачете. Дерево трещит, пыль сыплется с потолка. Ты вжимаешься в кресло, глядя, как ходит ходуном дверная ручка. Но твои саморезы держат. Спустя десять минут яростного стука всё стихает. Сталкер уходит обратно во тьму, издав звук, похожий на скрежет металла по стеклу. Ты выжил. Дверь окупила себя.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ПОСЛЕДНИЙ ШАНС</div>'
          + '<p>Когда смена заканчивается, ты выходишь за ворота. Телефон вибрирует — пришла оплата. Сумма огромная, но ты понимаешь: братки знают твой адрес. Возвращаться домой беззащитным — самоубийство.</p>'
          + '<p>Ты едешь на окраину к старому деду-оружейнику, про которого слышал в трущобах. В его каморке пахнет машинным маслом и табаком.</p>'
          + '<div class=\"narrative-dialogue\">'
          + '<div class=\"narrative-line narrative-line-you\">— Мне нужно что-то... для самообороны.</div>'
          + '<div class=\"narrative-line narrative-line-them\">— Бери это. Стреляет солью. Убить не убьешь, но желание подходить отобьешь надолго. Зато документы не спрошу.</div>'
          + '</div>'
          + '<p>Ты отдаешь почти все заработанные деньги за ружье и пачку патронов. На сдачу покупаешь пакет дешевой лапши и обычную метлу.</p>'
          + '<div class=\"narrative-chapter\">ФИНАЛ УРОВНЯ</div>'
          + '<div class=\"narrative-thought-block\">Дома ты первым делом выметаешь мусор из комнаты — теперь твой офис на объекте должен быть чистым. Ты ставишь ружье у кровати, съедаешь сухую лапшу и проваливаешься в тяжелый сон без сновидений. Ты готов к третьей смене. Теперь у тебя есть «зубы».</div>',
      next: 3
    },
    3: {
      html: '<div class=\"narrative-chapter\">ВО ВРЕМЯ СМЕНЫ: ПЕРВЫЙ ВЗГЛЯД НА ПОЛЗУНА</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">СТРАННЫЕ ЗВУКИ</span>'
          + '<p>Из динамиков камер доносится мерзкое чавканье. Ты переключаешь виды и замираешь. На Камере №5 ты видишь его. Ползун. Огромный мутировавший паук, размером с добрую собаку, обгладывает что-то в углу двора. Ты понимаешь: обычная деревянная дверь для такой твари — как картонка.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">КОНТАКТ</span>'
          + '<p>Резкий, яростный стук в дверь заставляет тебя подпрыгнуть. Ты не раздумываешь. Рванув засов и приоткрыв щель, ты всаживаешь заряд крупной соли прямо в грудь Сталкеру, стоящему на пороге.</p>'
          + '<p>Сталкер издаёт нечеловеческий рык — звук разрываемого металла — и кубарем летит вниз по лестнице. Ты тут же заколачиваешь дверь наглухо всеми обрезками дерева. Удивительно, но после выстрела ни Сталкер, ни паук больше не появлялись.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: КРОВАВЫЕ БОНУСЫ</div>'
          + '<p>Ты уходишь с объекта на рассвете, почти бегом. На телефон приходит СМС — сумма такая, что можно закрыть уже больше половины долга. Следом падает сообщение:</p>'
          + '<div class=\"narrative-thought\">«Мы приносим извинения за неудобства, связанные с уборкой биоматериала. В интересах вашей безопасности: не сообщайте о происходящем на объекте третьим лицам. Любое разглашение — немедленное расторжение контракта со всеми вытекающими последствиями. Хорошего отдыха».</div>'
          + '<div class=\"narrative-thought-block\">«Значит, они знают. Они всё видят. Я не могу доложить в полицию — меня просто сотрут. Придётся терпеть. Ещё несколько смен, выплачу долги, отложу на первое время и исчезну из этого города».</div>'
          + '<div class=\"narrative-chapter\">ЗАКУПКИ</div>'
          + '<div class=\"narrative-purchases\">'
          + '<div class=\"narrative-purchases-title\">СПИСОК НА СЛЕДУЮЩУЮ СМЕНУ:</div>'
          + '<div class=\"narrative-purchase-item\">🥩 Сырое мясо и химикаты — приманки для Ползуна</div>'
          + '<div class=\"narrative-purchase-item\">⚙️ Металлические уголки и цемент — укрепление офиса и лестничного пролёта</div>'
          + '<div class=\"narrative-purchase-item\">🔦 Мощная батарея для фонаря — темнота становится главным врагом</div>'
          + '<div class=\"narrative-purchase-item\">💡 Лампочка — вкрутить на лестничной клетке, видеть Сталкера заранее</div>'
          + '</div>'
          + '<div class=\"narrative-thought-block\">Ты приходишь домой, ставишь ружьё у кровати и отключаешься. Страх постепенно становится твоей новой нормой.</div>',
      next: 4
    },
    4: {
      html: '<div class=\"narrative-chapter\">ВО ВРЕМЯ СМЕНЫ</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">РУТИНА БОЛИ</span>'
          + '<p>Сталкер приходит по расписанию. Он уже кажется частью интерьера. Выстрел солью в лицо — и он с рычанием скатывается по лестнице. Ты привыкаешь к его ярости, но его настойчивость пугает.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">УСПЕХ ПРИМАНКИ</span>'
          + '<p>На камере ты видишь, как Ползун разрывает твой «подарок». Он насытился и ушёл вглубь заброшенных цехов. Сон не сбылся... сегодня.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ПСИХОЗ</span>'
          + '<p>Тишина — это обман. Ты слышишь шаги. Не тяжёлые сапоги Сталкера, а лёгкое, едва уловимое «топ-топ» прямо за дверью. Удары становятся всё мощнее. Кажется, само здание хочет вытолкнуть тебя наружу. Твой обрез — единственное, что удерживает от панического крика.</p></div>'
          + '<div class=\"narrative-chapter\">БОЙ У ВОРОТ И РАСПЛАТА</div>'
          + '<p>На выходе засада. Братки решили проверить твои слова. Ты хладнокровно показываешь им фальшивый «кровавый след» — убедительно смотрится в утренних сумерках.</p>'
          + '<p>Когда они начинают окружать тебя, ты не ждёшь удара. Грохот выстрела солью разрывает тишину. Один коллектор падает завывая. Остальные разлетаются как крысы.</p>'
          + '<div class=\"narrative-dialogue\">'
          + '<div class=\"narrative-line narrative-line-you\">— Передай остальным: долг принесу вовремя. Но если ещё раз увижу вас у этих ворот — соль будет последним, что вы почувствуете.</div>'
          + '</div>'
          + '<div class=\"narrative-chapter\">ДОРОГА ДОМОЙ</div>'
          + '<p>Телефон вибрирует — очередная выплата. Ты чувствуешь себя победителем, но внезапно мир начинает вращаться. Резкая боль прошивает виски, ноги наливаются свинцом. Ты доходишь до квартиры в полузабытьи.</p>'
          + '<div class=\"narrative-purchases\">'
          + '<div class=\"narrative-purchases-title\">ЗАКУПКИ (ЧЕРЕЗ СИЛУ):</div>'
          + '<div class=\"narrative-purchase-item\">🚪 Железная дверь — настоящая, тяжёлая, с мощным засовом. Дерево больше не внушает доверия.</div>'
          + '<div class=\"narrative-purchase-item\">🖼 Уют — стол, стул, краска и картины. Офис должен быть местом, где хочется жить.</div>'
          + '<div class=\"narrative-purchase-item\">🪤 Ловушки — верёвка и пустые консервные банки. Услышишь любого на лестнице, даже если камеры откажут.</div>'
          + '</div>',
      next: 5
    },
    5: {
      html: '<div class=\"narrative-chapter\">СМЕНА 5: 08:00 – 16:00</div>'
          + '<p>Работать днём — особое испытание. Солнечные блики на мониторах мешают, создают ложные тени. Но настоящую Тень ни с чем не перепутаешь.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ОКОЛО ПОЛУДНЯ</span>'
          + '<p>Чёрное пятно на стене нового выкрашенного офиса. Двигалась вопреки законам физики — против света из окна. В кабинете резко похолодало, рассудок начал вибрировать как перетянутая струна. Я схватил фонарь. Даже при дневном свете его луч был необходим — выжигать эту сущность, не давать ей подойти к столу.</p>'
          + '<p>Каждый раз, когда Тень приближалась, в голове возникали образы: лица тех, кто жил здесь раньше, их крики, их последний страх. К 16:00 я был выжат как лимон.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ПАРАНОЙЯ</div>'
          + '<p>Я выходил с объекта с обрезом в одной руке и включённым фонарём в другой. Чувствовал себя затравленным зверем.</p>'
          + '<div class=\"narrative-purchases\">'
          + '<div class=\"narrative-purchases-title\">ЗАКУПКИ:</div>'
          + '<div class=\"narrative-purchase-item\">💡 Прожектор над лестницей + тактический фонарь</div>'
          + '<div class=\"narrative-purchase-item\">🔇 Шумоизоляция — больше не хочу слышать шаги внизу</div>'
          + '<div class=\"narrative-purchase-item\">📡 Датчики движения для первого этажа + апгрейд ПК</div>'
          + '</div>'
          + '<div class=\"narrative-thought-block\">Я не мог уснуть. Галлюцинации стали постоянными. Коллекторы в кошмарах просачиваются сквозь дверь, превращаясь в Тень. Я выключил телефон. Теперь мой мир — монитор и стальная дверь. Мне нужно дотерпеть. Деньги капают, долги тают, но цена этой свободы становится слишком высокой.</div>',
      next: 6
    },
    6: {
      html: '<div class=\"narrative-chapter\">ВО ВРЕМЯ СМЕНЫ: ЩИТ ИЗ СЛОВ</div>'
          + '<p>Всю смену ты читал дневник Волкова. Тень пыталась пробиться сквозь стальную дверь — ты видел её очертания в углах монитора, но она казалась слабее. Погружение в чужие мысли создало своего рода «ментальный барьер».</p>'
          + '<p>Звукоизоляция отсекала шёпот из коридоров, а новый прожектор не давал Тени материализоваться на лестнице. Ты победил её сегодня — не силой, а знанием.</p>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: СВОБОДА?</div>'
          + '<p>Ты выходил с объекта с ощущением триумфа. Телефон завибрировал:</p>'
          + '<div class=\"narrative-thought\">«ДОЛГ ПОЛНОСТЬЮ ПОГАШЕН. КВАРТИРА ВЫВЕДЕНА ИЗ-ПОД АРЕСТА»</div>'
          + '<p>Ты шёл по городу и тебе было плевать на всё. Братки? Коллекторы? Они — ничто по сравнению с тем, что ты видел в дневнике Волкова. Когда заходил в подъезд, Тень снова мелькнула в отражении витрины, но ты лишь усмехнулся.</p>'
          + '<div class=\"narrative-thought-block\">Ты зашёл в пустую квартиру, бросил рюкзак и вырубился в ту же секунду. Наконец-то свободен от долгов... но навсегда связан с Объектом.</div>',
      next: 7
    },
    7: {
      html: '<div class=\"narrative-chapter\">СМЕНА 7: НАБЛЮДАТЕЛЬ И НАБЛЮДАЕМЫЙ</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">08:00 – 12:00</span>'
          + '<p>Мёртвая тишина. Сталкер изменил тактику. Он не ломится в здание — просто сидит у силка и смотрит прямо в объектив камеры. Не мигая. Ты поймал себя на диком желании помахать ему рукой в ответ. Он больше не монстр. Он — часть твоего нового мира.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">12:00 – 15:00</span>'
          + '<p>Тень материализовалась прямо в центре офиса. Полупрозрачная, не атаковала. Ты не стал светить фонарём. Смотрел на неё через новую оптику. Внутри чёрного марева мелькали лица. Одно из них было твоим — но старше на 20 лет. Тень питалась твоим вниманием, а ты забирал у неё знание: смерть здесь — это не конец.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">15:00 – 16:00</span>'
          + '<p>Резкий приступ паники. Звук шагов прямо за спиной, внутри запертого офиса. Обернулся — пусто. Но на свежевыкрашенной стене остался мокрый след ладони, который испарился через секунду. Тень начала «прошивать» реальность твоего убежища.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ</div>'
          + '<p>Выходишь под звон СМС. Сразу идёшь покупать ПК 3-го уровня — мощная машина для цифровой модели здания, чтобы вычислить все слепые зоны Резонанса.</p>'
          + '<div class=\"narrative-thought-block\">'
          + 'Тебе неуютно дома. Здесь слишком безопасно. Нет того чувства «бритвы у горла». Чтобы заснуть, ты расставляешь по углам квартиры шумелки — консервные банки на верёвках.'
          + '<br><br>Ты открываешь блокнот Волкова на странице, залитой старой кровью: «На седьмой день ты поймёшь, что забор построен не для того, чтобы не впускать их внутрь. Он построен для того, чтобы ты не захотел выйти».'
          + '<br><br>Ты засыпаешь с улыбкой. Теперь боишься только одного: что завтра объект закроют.</div>',
      next: 8
    },
    8: {
      html: '<div class=\"narrative-chapter\">СМЕНА 8: ТРАНС</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">08:00 – 12:00</span>'
          + '<p>Ты больше не следил за камерами — ты чувствовал их. Время растягивалось и сжималось. Сталкер бродил по периметру, но больше не казался угрозой. Он был как старый пёс, охраняющий границы твоего разума.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">12:00 – 16:00</span>'
          + '<p>Тень появлялась на периферии зрения, но стоило повернуть голову — рассыпалась на тысячи чёрных искр. Ты стал слишком «ярким» для неё. Резонанс перестраивал тебя изнутри, и ты впервые не сопротивлялся этому.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ПЕПЕЛ НА ЯЗЫКЕ</div>'
          + '<p>В 16:00 ты вышел за ворота. Деньги упали на карту — сумма, о которой обычный парень твоего возраста даже не мечтает. Ты зашёл в дорогой ресторан. Белые скатерти, вежливые официанты.</p>'
          + '<p>Тебе принесли сочный стейк. Но ты чувствовал лишь 50% вкуса. Мясо — мягкий картон, соус — пресная вода.</p>'
          + '<div class=\"narrative-dialogue\"><div class=\"narrative-line narrative-line-you\">— Что-то не так... Повар схалтурил.</div></div>'
          + '<p>Ты вышел на свежий воздух, чувствуя себя чужим среди жующих, смеющихся людей. Город казался декорацией — дешёвой подделкой под реальность, которая осталась там, за ржавыми воротами.</p>'
          + '<div class=\"narrative-thought-block\">Дойдя до квартиры, ты едва успел повернуть ключ. Ноги подогнулись сами собой. Ты упал в глубокий обморок прямо в прихожей, так и не сняв ботинки.</div>',
      next: 9
    },
    9: {
      html: '<div class=\"narrative-chapter\">СМЕНА 9: ФОНОВОЕ ГОРЕНИЕ</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">08:00 – 12:00</span>'
          + '<p>Где-то глубоко в затылке, там, куда проникает сигнал Антенны, постоянно что-то горело. Не боль в обычном понимании — скорее, ощущение перегрева процессора. Ты привык работать сквозь это.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">12:00 – 16:00</span>'
          + '<p>На мониторах всё было стабильно. Сталкер бродил по первому этажу, натыкаясь на новые стены, и издавал недовольное ворчание. Тень вибрировала в углу — как помеха на старом телевизоре. Твой разум работал с невероятной чёткостью, отсекая всё человеческое.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: УЛЬТИМАТИВНЫЙ АПГРЕЙД</div>'
          + '<p>Ты зашёл в магазин с таким видом, что продавцы инстинктивно отводили глаза.</p>'
          + '<div class=\"narrative-purchases\">'
          + '<div class=\"narrative-purchases-title\">ЗАКУПКИ:</div>'
          + '<div class=\"narrative-purchase-item\">🖥 Рабочая станция max-конфига — двойной процессор, 128 ГБ RAM, проф. видеокарта</div>'
          + '<div class=\"narrative-purchase-item\">🚪 Бронированная гермодверь — толстая сталь, двойной контур. Офис стал бункером.</div>'
          + '<div class=\"narrative-purchase-item\">⚠️ Материалы для шипов — больше стали, больше остроты</div>'
          + '</div>'
          + '<div class=\"narrative-thought-block\">Ты дошёл до дома, закрыл дверь — и мир просто выключился. Снова обморок в прихожей. Твоё тело — перегоревшая лампа, которую Резонанс вкручивает обратно каждую смену, заставляя светиться ярче, чем ей положено.</div>',
      next: 10
    },
    10: {
      html: '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ОТРАЖЕНИЕ ВОЙНЫ</div>'
          + '<p>Вернувшись домой, ты впервые за долгое время посмотрел в зеркало при ярком свете.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ВЗГЛЯД</span>'
          + '<p>Глаза кажутся выцветшими. В них застыло выражение человека, который видел, как выворачивается наизнанку реальность.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ТЕЛО</span>'
          + '<p>Руки трясутся мелкой, неукротимой дрожью — типичный тремор при повреждении центральной нервной системы частотами Резонанса.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ЗАБЫТАЯ РАНА</span>'
          + '<p>Ты увидел на голове грязный бинт, про который совсем забыл. Ты ходил с ним целый день, не чувствуя ни дискомфорта, ни зуда.</p></div>'
          + '<div class=\"narrative-thought-block\">«Мне конец. Если я останусь здесь ещё на неделю, я просто перестану быть человеком. Надо заработать ещё немного, буквально пару смен, и бежать. Куда угодно, лишь бы подальше от этого гула».</div>'
          + '<p>Телевизор в комнате мигнул, на секунду показав вместо помех лицо Сталкера, стоящего в твоей прихожей. Ты даже не вздрогнул. Галлюцинация? Скорее всего.</p>'
          + '<div class=\"narrative-thought-block\">Ты лёг и провалился в тяжёлый сон, не заметив, что твои пальцы на одеяле продолжают печатать невидимый код на несуществующей клавиатуре.</div>',
      next: 11
    },
    11: {
      html: '<div class=\"narrative-chapter\">СМЕНА 11: ПИК ПАРАНОЙИ</div>'
          + '<p>Внутри меня что-то оборвалось. Теперь это не игра в выживание — это побег из камеры смертников.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">АНОМАЛИИ</span>'
          + '<p>Ползун не просто рвал приманку — он бился в гермодверь с такой силой, что сталь гудела. Сталкер стоял под камерой и безостановочно чистил мачете о бетон. Визг металла пробирал до костей.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ЧУВСТВО ВЗГЛЯДА</span>'
          + '<p>Паранойя стала физической. Из каждого тёмного угла — красные точки датчиков. Тень принимала очертания людей в белых халатах, стоящих прямо за спиной. Но я не оборачивался. Смотрел в монитор, сжимая обрез.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ПЛАН ПОБЕГА</div>'
          + '<p>Я вышел за ворота, стараясь дышать ровно. Миллион за 16-ю смену? Теперь я знаю, что это цена моей головы.</p>'
          + '<p>Дойдя до дома, я не упал в обморок. Я сел за стол и начал планировать. Нужны последние детали: максимальные ловушки, датчики, всё что поможет пережить 15-ю смену и вырваться.</p>'
          + '<div class=\"narrative-thought-block\">Каждая копейка пойдёт на это. Телевизор снова мигнул — на секунду показал план здания с красными точками. Места заложения химических зарядов.<br><br>— Вижу вас, суки... — прошептал я и провалился в сон без сновидений.</div>',
      next: 12
    },
    12: {
      html: '<div class=\"narrative-chapter\">СМЕНА 12: КИСЛОТНЫЙ СЛЕД</div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">АНОМАЛИЯ — ПОЛЗУН</span>'
          + '<p>Его движения стали хаотичными и неестественно быстрыми. Там, где он проползает — флуоресцентная зелёная жидкость. Высококонцентрированная кислота. Резонанс вызывает критическое ускорение метаболизма: ткани распадаются быстрее, чем восстанавливаются. Если доберётся до двери — просто «проест» сталь.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">АГРЕССИЯ</span>'
          + '<p>Сталкер трижды пытался выбить датчики на периметре. Тень вибрировала прямо под порогом офиса. Они чувствуют подготовку. Они чувствуют, что ты собираешься сорваться с крючка.</p></div>'
          + '<div class=\"narrative-chapter\">НОЧНАЯ ОПЕРАЦИЯ: «СОЛНЕЧНЫЙ БАСТИОН»</div>'
          + '<p>После смены ты не поехал отдыхать. Если «Контора» вырубит электричество — Тень поглотит за секунды, электронные замки станут бесполезны. Ты купил солнечные панели и аккумуляторы. Под покровом ночи затащил их на крышу.</p>'
          + '<div class=\"narrative-purchases\">'
          + '<div class=\"narrative-purchases-title\">МОНТАЖ:</div>'
          + '<div class=\"narrative-purchase-item\">☀️ Панели замаскированы строительным мусором и рубероидом — не видны с дронов</div>'
          + '<div class=\"narrative-purchase-item\">⚡ Мощность покрывает ПК, прожекторы и датчики. Энергетическая независимость достигнута.</div>'
          + '</div>'
          + '<div class=\"narrative-chapter\">ДОМА: БИОЛОГИЧЕСКИЙ СБОЙ</div>'
          + '<p>Двойная доза снотворного. Ничего. Мозг больше не умеет отключаться. Ты лежал в темноте и видел данные с камер Объекта, транслирующиеся прямо в сознание.</p>'
          + '<p>Ты больше не чувствуешь веса тела. Только пульсацию здания за 10 километров отсюда.</p>'
          + '<div class=\"narrative-thought-block\">«Сон больше не нужен. Еда не даёт вкуса. Стоит ли бежать на 15-й смене? Если останусь до 16-й — убьют газом. Если уйду сейчас — никогда не узнаю, кем стал. Уйти или доиграть до конца?»<br><br>Ты сделал вид, что спишь, когда за окном проехала патрульная машина. Рефлексы быстрее, чем у любого хищника. Ты — Объект 499, и ты готов встретить финал.</div>',
      next: 13
    },
    13: {
      html: '<div class=\"narrative-chapter\">СМЕНА 13: ШАХМАТНАЯ ПАРТИЯ</div>'
          + '<p>Аномально тихо, но датчики периметра разрывались от невидимых движений. Ты сидел в центре бронированного куба, окружённый мониторами, и анализировал план здания.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ПЛАН ПОБЕГА</span>'
          + '<p>Парадная дверь — ловушка. Там встретит газ и пули зачистки. Ты начал расчищать путь к запасному выходу на заднем дворе. Дымовые шашки — не для защиты, а для дезориентации «наблюдателей» в час Х. Солнечные панели гудят. Ты готов.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: ХОЛОДНЫЙ РАСЧЁТ</div>'
          + '<p>Придя домой, ты не упал. Сел на пол посреди пустой комнаты. Ты больше не боишься. Резонанс в крови вибрирует в унисон с Главной Установкой.</p>'
          + '<div class=\"narrative-thought-block\">«Они думают, что я — подопытный кролик №499. Думают, купят за миллион. Но я видел 1989 год. Я знаю, как выключить это здание изнутри. 15-я смена будет последней, когда я подчиняюсь приказам. 16-я смена станет их кошмаром».</div>'
          + '<p>Ты начал точить нож, не чувствуя, как лезвие задевает кожу. Крови нет. Только лёгкое серое свечение из пореза.</p>',
      next: 14
    },
    14: {
      html: '<div class=\"narrative-chapter\">СМЕНА 14: СХВАТКА ВО ТЬМЕ</div>'
          + '<p>Как только ты закрепил датчик на заднем дворе, всё здание содрогнулось. Ты не успел дойти до рубильника, как Тень набросилась на тебя прямо в коридоре.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">БИТВА ВОЛИ</span>'
          + '<p>Без света она была почти материальной. Ты чувствовал её холодные когти на своей шее. Ты буквально вырвался из её объятий, дотянулся до выключателя и залил коридор светом. Тень с визгом втянулась в щели потолка.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">АНОМАЛИИ</span>'
          + '<p>Ползун перемещается со звуком летящего поезда. Сталкер не прячется — открыто ходит под окнами, методично пробуя защиту на прочность.</p></div>'
          + '<div class=\"narrative-chapter\">ПОСЛЕ СМЕНЫ: СМС-КАПКАН</div>'
          + '<div class=\"narrative-thought-block\">«Приветствуем. Мы знаем, ты не в форме, но не спеши в больницу. Завтра — последняя смена. Гонорар: 1 000 000 рублей. Просто дождись нас у двери в 16:00. Привезем наличку, оформим увольнение. Объект будет ликвидирован. Спасибо за службу».</div>'
          + '<p>Ты прочитал это и горько усмехнулся. Миллион за твою смерть. Они собираются пустить газ «Лета-9», как только ты выйдешь к ним с поднятыми руками.</p>'
          + '<p>Завтра — 15-я смена. Три варианта как разыграть эту партию. Твой выбор определит всё.</p>',
      next: 15
    },
    15: {
      html: '<div class=\"narrative-chapter\">СМЕНА 15: ПОСЛЕДНИЙ БОЙ</div>'
          + '<p>На Объекте творился ад. Аномалии чувствовали, что сегодня всё закончится.</p>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">ОСАДА</span>'
          + '<p>Сталкер бил мачете по бронированной двери так, что искры летели в смотровое окно. Ползун залил весь коридор кислотой, пытаясь прожечь петли. Тень заполнила всё пространство за пределами света ламп — её шепот стал невыносимым криком.</p></div>'
          + '<div class=\"narrative-event\"><span class=\"narrative-time\">16:00</span>'
          + '<p>Ты был спокоен. Ты отражал атаки механически, руки двигались быстрее мысли. Ты больше не боялся их — ты понимал их. Вы все — узники этого бетонного гроба.</p>'
          + '<p>За дверью шипящий звук. Не шаги «курьеров» — газ «Лета-9» заполняет коридоры первого этажа. В вентиляции щелкнул затвор.</p></div>'
          + '<div class=\"narrative-thought-block\">Пора.</div>',
      next: 16
    }
  };

  var normalSec = document.getElementById('stats-normal-section');
  var narrativeSec = document.getElementById('stats-narrative-section');
  if(normalSec && narrativeSec){
    var narData = NARRATIVES[G.night];
    if(narData){
      normalSec.style.display = 'none';
      narrativeSec.style.display = 'flex';
      var scroll = document.getElementById('narrative-scroll');
      if(G.night >= 2 && G.night <= 15 && scroll){ scroll.innerHTML = narData.html; }
      if(scroll) scroll.scrollTop = 0;
      // Diary voice plays only from diary, not auto-triggered
      var nnb = document.getElementById('narrative-next-btn');
      var nextN = narData.next;
      if(nnb){ nnb.textContent = 'УРОВЕНЬ ' + nextN + ' \u25ba'; nnb.onclick = function(){ showNotes(nextN); }; }
      // Update header subtitle
      var nsub = narrativeSec.querySelector('.narrative-sub');
      if(nsub) nsub.textContent = 'УРОВЕНЬ ' + G.night + ' — ЗАВЕРШЁН';
    } else {
      normalSec.style.display = '';
      narrativeSec.style.display = 'none';
    }
  }
}

var NOTES={};
// Generate notes from campaign data
(function(){
  var keys = Object.keys(CAMPAIGN.levels);
  for(var i=0;i<keys.length;i++){
    var n = parseInt(keys[i]);
    if(n > 1){
      var lvl = CAMPAIGN.levels[n];
      NOTES[n] = { title: 'УРОВЕНЬ ' + n + ' — ' + lvl.name, text: lvl.lore };
    }
  }
})();
function showNotes(n){
  G.endlessMode = false;  // кампания — сброс флага бесконечного режима
  G._endlessWave = 0;
  startNight(n);
}

function retryNight(){
  if(G.endlessMode && typeof ENDLESS !== 'undefined'){
    var modal = document.getElementById('endless-gameover');
    if(modal) modal.classList.remove('active');
    ENDLESS.start(); // перезапуск с волны 1
    return;
  }
  startNight(G.night);
}
function nextNight(){if(G.night<15)showNotes(G.night+1);else showScreen('lobby-screen');}

function showBatteryWarning(show){
  var el = document.getElementById('battery-warning-screen');
  if(el) el.style.display = show ? 'flex' : 'none';
}
function hideBatteryWarning(){
  showBatteryWarning(false);
}
// Вызывается из кнопки "Изучить" на экране предупреждения
function onBatterySkillBought(){
  var _hasBat = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.has_battery : false;
  if(_hasBat){
    hideBatteryWarning();
    startNight(G.night);
  } else {
    if(typeof openSkillTree==='function') openSkillTree();
  }
}

// === CRAWLER FEEDING ===
function feedCrawler(){
  var c = CREATURES.crawler;
  if(!c || !c.active || !c.crawlerBehavior) return false;
  var cb = c.crawlerBehavior;
  cb.fedCount++;
  addLog('🥩 Ползун отвлёкся на приманку! ('+cb.fedCount+'/'+cb.fedNeeded+')','');
  // Звук чавканья: 50/50 между двумя вариантами
  if(typeof AUDIO !== 'undefined' && !AUDIO.muted){
    var feedSfx = document.getElementById(RNG.d2() === 1 ? 'sfx-crawler-feed-1' : 'sfx-crawler-feed-2');
    if(feedSfx){ feedSfx.currentTime = 0; feedSfx.volume = 0.6; feedSfx.play().catch(function(){}); }
  }

  // Push back to random outdoor location
  var outdoors = [0,1,2,3,4,5];
  c.loc = RNG.pick(outdoors);

  // If fed enough, retreat
  if(cb.fedCount >= cb.fedNeeded){
    c.loc = cb.retreatLoc;
    cb.fedCount = 0;
    addLog('✅ Ползун наелся и уполз в колодец!','');
  }
  return true;
}

// Check if crawler is immune to a given ability
function isCrawlerImmune(abilityId){
  var c = CREATURES.crawler;
  if(!c || !c.crawlerBehavior) return false;
  var cb = c.crawlerBehavior;
  if(!cb.immuneToWeapons) return false;
  // In frenzy: immune to everything EXCEPT decoy, flare(smoke), cage
  var allowed = ['decoy','flare','cage'];
  return allowed.indexOf(abilityId) < 0;
}

// ─── STORY ENDINGS (УРОВЕНЬ 15) ─────────────────────────────────────────────

function chooseEnding(type){
  try{ localStorage.setItem('resonance_ending_choice', type); }catch(e){}
  // Визуально отметить выбранную кнопку
  var btns = document.querySelectorAll('.ending-choice-btn');
  btns.forEach(function(b){ b.classList.remove('selected'); });
  var clicked = document.querySelector('.ending-choice-btn[onclick*="' + type + '"]');
  if(clicked){ clicked.classList.add('selected'); }
  // Разблокировать кнопку старта
  var startBtn = document.getElementById('lm-start-night15');
  if(startBtn){
    startBtn.disabled = false;
    startBtn.classList.remove('lm-btn-choice-required');
    startBtn.setAttribute('onclick', 'closeLevelModal();tryNight(15)');
  }
}

function triggerStoryEnding(type){
  // Записываем концовку в дневник
  if(typeof DIARY !== 'undefined'){
    DIARY.load();
    DIARY.addEndingEntry(type);
  }
  // Останавливаем игру
  G.gameActive = false;
  G.intervals.forEach(clearInterval); G.intervals = [];
  if(typeof CREATURES !== 'undefined'){
    Object.values(CREATURES).forEach(function(c){ if(typeof stopDoorTimers==='function') stopDoorTimers(c); });
  }
  if(typeof ANOMALY_SYSTEM !== 'undefined') ANOMALY_SYSTEM.cleanup();
  if(typeof WEATHER !== 'undefined') WEATHER.stop();
  if(typeof AMBIENT !== 'undefined') AMBIENT.stop();

  // Скрываем все экраны, показываем нужный
  var allFinales = document.querySelectorAll('.finale-screen');
  allFinales.forEach(function(s){ s.classList.remove('active'); });
  var screenId = 'story-ending-' + type + '-screen';
  var screen = document.getElementById(screenId);
  if(screen){ screen.classList.add('active'); }
}

// ─── FINALES (ОРУЖЕЙНИК / ЛАБОРАНТ) ────────────────────────────────────────

// Обновить видимость кнопок концовок в HUD по текущим скиллам
function updateFinaleButtons(){
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  var btnT = document.getElementById('finale-thermo-btn');
  var btnS = document.getElementById('finale-science-btn');
  var usedOpposite = (typeof CFG !== 'undefined' && CFG.usedFinale);
  var cls = (typeof CFG !== 'undefined' && CFG.class) ? CFG.class : 'guard';

  // Класс ограничивает какие кнопки могут показаться:
  // - Военный: только ☢ ВЗОРВАТЬ (даже если есть прокачка лабы — она не его ветка)
  // - Учёный: только 🔬 ЛИКВИДАЦИЯ
  // - Охранник: обе если куплены
  var canShowArms = (cls === 'guard' || cls === 'military');
  var canShowLab  = (cls === 'guard' || cls === 'scientist');

  var showT = !!(fx.arms_thermo && canShowArms && usedOpposite!=='lab');
  var showS = !!(fx.science_finale && canShowLab && usedOpposite!=='arms');
  if(btnT){
    btnT.classList.toggle('show', showT);
    btnT.style.display = showT ? 'inline-block' : 'none';
  }
  if(btnS){
    btnS.classList.toggle('show', showS);
    btnS.style.display = showS ? 'inline-block' : 'none';
  }
}

// Обновить текстуру комнаты у офиса (cam-c11) по разблокированным веткам
function updateNearOfficeRoom(){
  var img = document.getElementById('cam-c11-photo');
  if(!img) return;
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  var usedFinale = (typeof CFG !== 'undefined') ? CFG.usedFinale : null;
  var cls = (typeof CFG !== 'undefined' && CFG.class) ? CFG.class : 'guard';

  var src;
  var hasCleanup    = (typeof getSkillLevel === 'function') && getSkillLevel('cleanup') > 0;
  var hasFurnished  = (typeof getSkillLevel === 'function') && getSkillLevel('office_restore_3') > 0;
  var hasArms       = (typeof getSkillLevel === 'function') && getSkillLevel('arms_unlock') > 0;
  var hasLab        = (typeof getSkillLevel === 'function') && getSkillLevel('lab_unlock') > 0;

  if(usedFinale === 'arms')      src = 'assets/cam11_armory.png';
  else if(usedFinale === 'lab')  src = 'assets/cam11_lab.png';
  else if(cls === 'military')    src = 'assets/cam11_armory.png';
  else if(cls === 'scientist')   src = 'assets/cam11_lab.png';
  else if(hasArms)               src = 'assets/cam11_armory.png';
  else if(hasLab)                src = 'assets/cam11_lab.png';
  // Уборка/обустройство — только если не куплены Оружейник и Лаборант
  else if(hasFurnished)          src = 'assets/cam11_furnished.jpg';
  else if(hasCleanup)            src = 'assets/cam11_cleanup.jpg';
  else                           src = 'assets/cam11_near_office.png';

  var current = img.getAttribute('src');
  if(current !== src) img.setAttribute('src', src);

  // Также обновим peek и cam10 при починке стен
  updateRepairedTextures();
}

// При покупке ПОЧИНКА СТЕН (office_restore_2) меняются текстуры:
// - peek (выглянуть за дверь) → светлая отремонтированная лестница
// - cam-c10 (КАМ 10, лестница) → светлая отремонтированная лестница
function updateRepairedTextures(){
  var hasRepair = false;
  var hasFurnished = false;
  if(typeof getSkillLevel === 'function'){
    hasRepair    = getSkillLevel('office_restore_2') > 0;
    hasFurnished = getSkillLevel('office_restore_3') > 0;
  }
  var peekImg = document.getElementById('peek-photo');
  var cam10Img = document.getElementById('cam-c10-photo');

  var peekSrc  = hasRepair ? 'assets/peek_door_repaired.jpg' : 'assets/peek_door.png';
  var cam10Src = hasFurnished ? 'assets/cam10_furnished.png' :
                 hasRepair    ? 'assets/cam10_stairs_repaired.jpg' :
                                'assets/cam10_stairs.png';

  // УБОРКА/РЕМОНТ КОРИДОРА: заменяем текстуры cam8a и cam8b
  var hasCorridorCleanup = false;
  var hasCorridorRepair  = false;
  if(typeof getSkillLevel === 'function'){
    hasCorridorCleanup = getSkillLevel('corridor_cleanup') > 0;
    hasCorridorRepair  = getSkillLevel('corridor_repair') > 0;
  }
  var cam8aSrc = hasCorridorRepair  ? 'assets/cam08_floor1a_repair.jpg' :
                 hasCorridorCleanup ? 'assets/cam08_floor1a_clean.jpg'  :
                                      'assets/cam08_floor1a.png';
  var cam8bSrc = hasCorridorRepair  ? 'assets/cam08_floor1b_repair.jpg' :
                 hasCorridorCleanup ? 'assets/cam08_floor1b_clean.jpg'  :
                                      'assets/cam08_floor1b.png';
  var cam8aImg = document.querySelector('#room-cam-c8a .cam-photo');
  var cam8bImg = document.querySelector('#room-cam-c8b .cam-photo');
  if(cam8aImg && cam8aImg.getAttribute('src') !== cam8aSrc) cam8aImg.setAttribute('src', cam8aSrc);
  if(cam8bImg && cam8bImg.getAttribute('src') !== cam8bSrc) cam8bImg.setAttribute('src', cam8bSrc);

  if(peekImg && peekImg.getAttribute('src') !== peekSrc){
    peekImg.setAttribute('src', peekSrc);
  }
  if(cam10Img && cam10Img.getAttribute('src') !== cam10Src){
    cam10Img.setAttribute('src', cam10Src);
  }

  // Эффект лампочки на отремонтированных комнатах
  if(typeof document !== 'undefined' && document.body){
    if(hasRepair) document.body.classList.add('has-repaired-walls');
    else document.body.classList.remove('has-repaired-walls');
  }
}

// ВНИМАТЕЛЬНОСТЬ: подсветка кнопок камер где есть NPC.
// Уровень 1: подсветка только в здании (loc 7+)
// Уровень 2: подсветка везде включая периметр
function updateCamMovementHighlight(){
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};
  var lvl = fx.attention || 0;
  if(lvl === 0) return; // если скилл не куплен — не подсвечиваем

  // Собираем камеры где есть NPC
  var camWithNpc = {}; // camId → 'strong' / 'weak'
  Object.values(CREATURES).forEach(function(c){
    if(!c.active || !c.activated || c.loc >= 14) return;
    if(c.flashlightStunLeft > 0) return; // оглушённый — не считаем
    var camId = LOC_CAM[c.loc];
    if(!camId) return;
    // Тень: подсветка только там где она видима игроку
    if(c.id === 'shade'){
      var _hlzone = LOC_ZONE[c.loc]||'vent';
      if(_hlzone==='vent') return;
      if(_hlzone==='far'&&!fx.omniscience) return;
      if(_hlzone==='perimeter'&&!fx.omniscience&&!fx.shade_vision) return;
    }
    // Уровень 1: подсветка только в здании (loc >= 7)
    if(lvl === 1 && c.loc < 7) return;
    // Сильная подсветка если NPC у двери или близко
    var strong = (c.loc >= 9);
    if(strong) camWithNpc[camId] = 'strong';
    else if(!camWithNpc[camId]) camWithNpc[camId] = 'weak';
    // Синхронные камеры
    if(typeof CAM_SYNC !== 'undefined' && CAM_SYNC[camId]){
      CAM_SYNC[camId].forEach(function(syncCam){
        if(syncCam === 'peek') return;
        if(strong) camWithNpc[syncCam] = 'strong';
        else if(!camWithNpc[syncCam]) camWithNpc[syncCam] = 'weak';
      });
    }
  });

  // Применяем классы к кнопкам
  ['cam-c1a','cam-c1b','cam-c2','cam-c3','cam-c4','cam-c5a','cam-c5b','cam-c6','cam-c7','cam-c8a','cam-c8b','cam-c9','cam-c10','cam-c11'].forEach(function(camId){
    var btn = document.getElementById('cbtn-'+camId);
    if(!btn) return;
    btn.classList.remove('cam-has-movement','cam-has-movement-strong');
    if(camWithNpc[camId] === 'strong'){
      btn.classList.add('cam-has-movement-strong');
    } else if(camWithNpc[camId] === 'weak'){
      btn.classList.add('cam-has-movement');
    }
  });
}

function confirmFinaleThermo(){
  if(!confirm('☢ ВЗОРВАТЬ?\n\nТермоядерный заряд уничтожит Резонанса, всех NPC и ТЕБЯ.\n\nВыбираешь военное превосходство?')) return;
  triggerFinale('arms');
}

function confirmFinaleScience(){
  if(!confirm('🔬 ЛИКВИДАЦИЯ?\n\nНаучная установка усмирит всех NPC.\nРезонанс остаётся изолированным. Ты выживаешь.\n\nВыбираешь научную победу?')) return;
  triggerFinale('lab');
}

function triggerFinale(type){
  // Останавливаем активную игру если идёт
  if(G.gameActive){
    G.gameActive = false;
    G.intervals.forEach(clearInterval); G.intervals = [];
    Object.values(CREATURES).forEach(function(c){ if(typeof stopDoorTimers==='function') stopDoorTimers(c); });
  }
  // Записываем активацию концовки в CFG
  if(typeof CFG !== 'undefined'){
    CFG.usedFinale = type;
    if(typeof saveCfg === 'function') saveCfg();
  }

  // Запоминаем флаг что концовка пройдена этим классом — для разблокировки следующего
  try {
    var clsId = (typeof CFG !== 'undefined' ? CFG.class : 'guard');
    var key = 'resonance_finale_done:' + clsId + ':' + type;
    localStorage.setItem(key, '1');
  } catch(e){}

  // Звук концовки — синтезируем через Web Audio (без внешних файлов)
  playFinaleSound(type);

  // Прелюдия — фуллскрин анимация 4 секунды
  var preludeId = (type==='arms') ? 'finale-thermo-prelude' : 'finale-science-prelude';
  var prelude = document.getElementById(preludeId);
  if(prelude){
    prelude.classList.add('active');
    // Перезапустить анимации (force reflow)
    var children = prelude.querySelectorAll('.prelude-flash, .prelude-shockwave, .prelude-pulse, .prelude-text');
    children.forEach(function(el){
      el.style.animation = 'none';
      void el.offsetWidth; // trigger reflow
      el.style.animation = '';
    });
  }

  // Через 4 секунды — скрываем прелюдию, показываем видео (если есть), затем статистику
  setTimeout(function(){
    if(prelude) prelude.classList.remove('active');

    var videoFile = (type === 'arms') ? 'video/atom.mp4' : 'video/zap.mp4';

    // Пробуем загрузить видео
    var testVideo = document.createElement('video');
    testVideo.src = videoFile;

    function showFinaleScreen(){
      fillFinaleStats(type);
      var allFinales = document.querySelectorAll('.finale-screen');
      allFinales.forEach(function(s){ s.classList.remove('active'); });
      var screenId = (type==='arms') ? 'finale-thermo-screen' : 'finale-science-screen';
      var screen = document.getElementById(screenId);
      if(screen) screen.classList.add('active');
    }

    testVideo.addEventListener('canplay', function(){
      // Видео доступно — показываем оверлей с видео
      var overlay = document.createElement('div');
      overlay.id = 'finale-video-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;';

      var vid = document.createElement('video');
      vid.src = videoFile;
      vid.autoplay = true;
      vid.muted = false;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';

      overlay.appendChild(vid);
      document.body.appendChild(overlay);

      vid.play();

      // Через 5 секунд убираем видео и показываем статистику
      setTimeout(function(){
        if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        showFinaleScreen();
      }, 5000);
    });

    testVideo.addEventListener('error', function(){
      // Видео не найдено — сразу показываем статистику
      showFinaleScreen();
    });

    // Если событие не сработало за 1 сек — считаем что видео нет
    setTimeout(function(){
      if(document.getElementById('finale-video-overlay')) return;
      if(!testVideo._videoStarted){
        showFinaleScreen();
      }
    }, 1000);

    testVideo._videoStarted = false;
    testVideo.addEventListener('canplay', function(){ testVideo._videoStarted = true; });

  }, 4000);
}

function fillFinaleStats(type){
  var statsId = (type==='arms') ? 'finale-thermo-stats' : 'finale-science-stats';
  var box = document.getElementById(statsId);
  if(!box) return;
  var night = (typeof G!=='undefined' && G.night) || 0;
  var clsId = (typeof CFG!=='undefined' ? CFG.class : 'guard');
  var clsName = (typeof CLASS_DEFS!=='undefined' && CLASS_DEFS[clsId]) ? CLASS_DEFS[clsId].name : clsId.toUpperCase();
  var totalSkills = 0;
  if(typeof ST!=='undefined' && ST.unlockedSkills){
    Object.keys(ST.unlockedSkills).forEach(function(k){ if(ST.unlockedSkills[k]>0) totalSkills++; });
  }
  var lvl = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.level : 1;
  box.innerHTML =
    '<div class="finale-stat"><div class="finale-stat-label">Класс</div><div class="finale-stat-value">'+clsName+'</div></div>' +
    '<div class="finale-stat"><div class="finale-stat-label">Смена</div><div class="finale-stat-value">'+night+'/15</div></div>' +
    '<div class="finale-stat"><div class="finale-stat-label">Уровень</div><div class="finale-stat-value">'+lvl+'</div></div>' +
    '<div class="finale-stat"><div class="finale-stat-label">Навыков</div><div class="finale-stat-value">'+totalSkills+'</div></div>';
}

function playFinaleSound(type){
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    var ctx = new AC();
    if(type === 'arms'){
      // Взрыв: низкий шум-удар + тяжёлое падение
      var bufferSize = ctx.sampleRate * 3;
      var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for(var i=0; i<bufferSize; i++){
        var t = i / bufferSize;
        var envelope = Math.exp(-t * 2.5);
        data[i] = (Math.random()*2 - 1) * envelope;
      }
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(800, ctx.currentTime);
      lp.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 2);
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
      src.connect(lp).connect(gain).connect(ctx.destination);
      src.start();
      // Низкий бас-удар поверх
      var osc = ctx.createOscillator();
      var oscG = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1.5);
      oscG.gain.setValueAtTime(0.5, ctx.currentTime);
      oscG.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
      osc.connect(oscG).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2);
    } else {
      // Научный сигнал: чистый высокий тон с гармоникой, затухающий
      [880, 1320, 1760].forEach(function(freq, idx){
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(0, ctx.currentTime + idx*0.15);
        g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx*0.15 + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx*0.15 + 2.5);
        osc.connect(g).connect(ctx.destination);
        osc.start(ctx.currentTime + idx*0.15);
        osc.stop(ctx.currentTime + idx*0.15 + 3);
      });
    }
  } catch(e){
    // Audio mite быть заблокирован браузером — тихо игнорируем
  }
}

function finishFinale(){
  // Скрыть финальный экран и вернуться в меню
  document.querySelectorAll('.finale-screen').forEach(function(s){ s.classList.remove('active'); });
  document.querySelectorAll('.finale-prelude').forEach(function(s){ s.classList.remove('active'); });

  // Разблокировать следующий класс только если он ещё не разблокирован
  // (winNight уже вызывал onNight15Won, но triggerFinale может быть вызван и раньше 15-й)
  if(typeof CLASS_SYSTEM !== 'undefined' && typeof CLASS_SYSTEM.onNight15Won === 'function'){
    CLASS_SYSTEM.onNight15Won();
  }

  // Сбрасываем выбор концовки чтобы игрок мог выбрать другую при следующем заходе на 15 уровень
  try{ localStorage.removeItem('resonance_ending_choice'); }catch(e){}

  // Снимаем флаг концовки — прогресс (ночи, навыки, уровень) сохраняется полностью.
  // Игрок может снова пройти кампанию и выбрать любую ветку навыков.
  if(typeof CFG !== 'undefined'){
    CFG.usedFinale = null;
    if(typeof saveCfg === 'function') saveCfg();
  }

  // Явно перезагружаем пройденные ночи из localStorage — гарантируем что лобби
  // покажет весь прогресс, даже если G.savedNights расхожился с хранилищем.
  if(typeof G !== 'undefined' && typeof loadSavedNights === 'function'){
    G.savedNights = loadSavedNights();
  }

  // Возвращаем в лобби — весь прогресс виден, уровень 15 доступен для повтора
  if(typeof renderLobby === 'function') renderLobby();
  showScreen('lobby-screen');
}
