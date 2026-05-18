/* resonance/js/main.js — entry point, runs after all modules load */
(function(){
  function init(){
    // 1. Settings (CFG defaults)
    if(typeof loadCfg==='function') loadCfg();

    // 2. Game state defaults
    G._difficultyMult  = 1.0;
    G._nightSpeedTicks = 45;
    G._powerDrainMult  = 1.0;

    // 3. Skill data
    if(typeof loadSkillData==='function') loadSkillData();
    // Инициализация зоны ружья для старых сохранений
    if(typeof updateWallGun==='function') updateWallGun();

    // 4. Level system
    if(typeof LEVEL_SYSTEM!=='undefined'){
      LEVEL_SYSTEM.load();
      if(typeof updateLevelUI==='function') updateLevelUI();
    }

    // 5. Audio
    if(typeof initAudio==='function') initAudio();

    // 6. Audio auto-start on first interaction
    var audioStarted = false;
    function tryStartAudio(){
      if(!audioStarted && typeof AUDIO!=='undefined' && !AUDIO.muted){
        audioStarted = true;
        if(typeof playTrack==='function') playTrack('menu', AUDIO.volume||0.5);
      }
      document.removeEventListener('click', tryStartAudio);
    }
    document.addEventListener('click', tryStartAudio);

    // 7. Keyboard controls (uses CFG.keybinds)
    document.addEventListener('keydown', function(e){
      // hideUI keybind — toggle HUD visibility
      var _hideKey = (typeof CFG !== 'undefined' && CFG.keybinds && CFG.keybinds.hideUI) ? CFG.keybinds.hideUI : 'alt';
      if(e.key.toLowerCase() === _hideKey || (e.key === 'Alt' && _hideKey === 'alt')){
        e.preventDefault();
        var gs = document.getElementById('game-screen');
        if(gs) gs.classList.toggle('hud-hidden');
        return;
      }
      // TAB toggles camera grid (works even outside game)
      if(e.key === 'Tab'){
        e.preventDefault();
        // Block camera grid if no PC
        var pcLvl = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.pc_level||0 : 0;
        if(pcLvl === 0){
          if(typeof addLog==='function') addLog('📵 Нет ПК — монитор недоступен.','d');
          return;
        }
        if(typeof toggleCamGrid==='function') toggleCamGrid();
        return;
      }
      if(typeof G==='undefined' || !G.gameActive) return;
      if(typeof _listeningFor!=='undefined' && _listeningFor) return;
      var kb = (typeof CFG!=='undefined' && CFG.keybinds) ? CFG.keybinds : {
        office:'1', mapGlobal:'2', mapFar:'3', mapPerimeter:'4', mapBuilding:'5',
        door:'q', flash:'f'
      };
      var k = e.key.toLowerCase();
      // '1' → обзорная карта (global)
      if(k==='1')                  { if(typeof switchMapView==='function') switchMapView('global'); }
      else if(k===kb.office && k!=='1') switchRoom('office');
      else if(k===kb.mapFar)      switchMapView('far');
      else if(k===kb.mapPerimeter) switchMapView('perimeter');
      else if(k===kb.mapBuilding) switchMapView('building');
      else if(k===kb.door){
        if(typeof toggleHide==='function') toggleHide();
      }
      else if(k===kb.flash)    toggleFlash();
      else if(k==='p'||k==='з')  { if(typeof toggleProjector==='function') toggleProjector(); }
      else if(k==='c'||k==='с')  { if(typeof snapCamera==='function') snapCamera(); }
      else if(k==='e'||k==='у')  { if(typeof togglePeek==='function') togglePeek('door'); }
      else if(k==='v'||k==='м')  { if(typeof toggleAbilitiesMenu==='function') toggleAbilitiesMenu(); }
      else if(k==='d'||k==='в')  { if(typeof toggleSensorPanel==='function') toggleSensorPanel(); }
      else if(k==='escape')    { closeCamGrid(); if(typeof closeSensorPanel==='function') closeSensorPanel(); }
    });

    // 8. Night select buttons
    if(typeof updateNightButtons==='function') updateNightButtons();
    // 8b. Diary
    if(typeof DIARY!=='undefined') DIARY.load();
    // Apply day mode camera visuals
    if(typeof applyDayModeVisuals==='function') applyDayModeVisuals();
    if(typeof updateOfficeVisuals==='function') updateOfficeVisuals();

    // 9. Passive power tick
    setInterval(function(){
      if(typeof G!=='undefined' && G.gameActive && typeof tickPassivePower==='function')
        tickPassivePower();
    }, 2000);

    console.log('[RESONANCE] Ready. All modules loaded.');
  }

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
