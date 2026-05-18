/* resonance/js/settings.js */

// ═══ SETTINGS ═══

// ═══════════════════════════════════════════
// SETTINGS SYSTEM
// ═══════════════════════════════════════════

var CFG = {
  masterVol: 50,
  sfxEnabled: true,
  sfxVol: 60,
  jumpscare: true,
  menuMusic: true,
  musicTrack: 'music5',
  musicVol: 35,
  npcAlerts: true,
  difficulty: 1.0,
  nightSpeed: 45,
  powerDrain: 1.0,
  doorBreak: true,
  doorKnock: true,
  randomEvents: true,
  theme: 'crimson',
  crt: true,
  noise: true,
  npcAnim: true,
  brightness: 48,
  uiScale: 'normal',
  contrast: false,
  panicFx: true,
  // Класс игрока — сохраняется в localStorage. Стартовый = охранник.
  class: 'guard',
  unlockedClasses: ['guard'],
  // Активирована ли концовка в этой кампании ('arms' | 'lab' | null)
  usedFinale: null,
  keybinds: {
    office: 'tab', mapGlobal: '1',
    camPrev: 'arrowleft', camNext: 'arrowright',
    door: 'q', flash: 'f', hideUI: 'alt'
  }
};

var KEYBIND_LABELS = {
  office:    'Пост охраны',
  mapGlobal: 'Обзорная карта',
  camPrev:   '← Пред. камера',
  camNext:   '→ След. камера',
  door:      'Закрыть/открыть дверь',
  flash:     'Фонарик',
  hideUI:    'Скрыть / показать интерфейс'
};

var _listeningFor = null;

function loadCfg() {
  try {
    var raw = localStorage.getItem('resonance_cfg');
    if (raw) {
      var saved = JSON.parse(raw);
      Object.assign(CFG, saved);
    }
  } catch(e) {}
  applyCfgAll();
}

function saveCfg() {
  try { localStorage.setItem('resonance_cfg', JSON.stringify(CFG)); } catch(e) {}
  showSavedToast();
}

function showSavedToast() {
  var t = document.getElementById('cfg-saved-toast');
  if (!t) return;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 1500);
}

function applyCfgAll() {
  try {
    syncCfgUI();
    applyMasterVol(CFG.masterVol);
    applyDifficulty();
    applyNightSpeed(CFG.nightSpeed);
    applyCRT();
    applyNoise();
    applyNpcAnim();
    applyBrightness(CFG.brightness);
    applyUIScale();
    applyContrast();
    applyTheme(CFG.theme);
  } catch(e) { console.warn('applyCfgAll error:', e); }
}

function syncCfgUI() {
  var map = {
    'cfg-master-vol': CFG.masterVol,
    'cfg-music-vol':  CFG.musicVol,
    'cfg-sfx-vol':    CFG.sfxVol,
    'cfg-night-speed': CFG.nightSpeed,
    'cfg-brightness': CFG.brightness,
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = map[id];
  });
  var vals = {
    'cfg-master-vol-val': CFG.masterVol + '%',
    'cfg-music-vol-val':  CFG.musicVol  + '%',
    'cfg-sfx-vol-val':    CFG.sfxVol    + '%',
    'cfg-night-speed-val': CFG.nightSpeed + 'с',
    'cfg-brightness-val': CFG.brightness + '%',
  };
  Object.keys(vals).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = vals[id];
  });
  var checks = {
    'cfg-sfx': CFG.sfxEnabled, 'cfg-jumpscare': CFG.jumpscare,
    'cfg-menu-music': CFG.menuMusic, 'cfg-npc-alerts': CFG.npcAlerts,
    'cfg-door-break': CFG.doorBreak, 'cfg-door-knock': CFG.doorKnock,
    'cfg-random-events': CFG.randomEvents, 'cfg-crt': CFG.crt,
    'cfg-noise': CFG.noise, 'cfg-npc-anim': CFG.npcAnim,
    'cfg-contrast': CFG.contrast, 'cfg-panic-fx': CFG.panicFx,
  };
  Object.keys(checks).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.checked = checks[id];
  });
  var selects = {
    'cfg-difficulty': String(CFG.difficulty || 1.0),
    'cfg-power-drain': String(CFG.powerDrain || 1.0),
    'cfg-ui-scale': CFG.uiScale || 'normal',
    'cfg-music-track': CFG.musicTrack || 'music5',
  };
  Object.keys(selects).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = selects[id];
  });
  // Theme swatches
  document.querySelectorAll('.cfg-theme-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.dataset.theme === CFG.theme);
  });
}

// ── APPLY FUNCTIONS ──────────────────────────────────────────────────────────
function applyMasterVol(val) {
  CFG.masterVol = parseInt(val);
  if (typeof AUDIO !== 'undefined') {
    AUDIO.volume = CFG.masterVol / 100;
    Object.keys(AUDIO).forEach(function(k) {
      var a = AUDIO[k];
      if (a && a.volume !== undefined) a.volume = AUDIO.volume;
    });
    if (typeof setVolume === 'function') setVolume(AUDIO.volume);
  }
  // SFX модуль
  if (typeof SFX !== 'undefined' && SFX.masterGain) {
    SFX.masterGain.gain.value = CFG.masterVol / 100;
  }
  var el = document.getElementById('cfg-master-vol-val');
  if (el) el.textContent = CFG.masterVol + '%';
  saveCfg();
}

function applyMusicTrack() {
  var el = document.getElementById('cfg-music-track');
  if (!el) return;
  CFG.musicTrack = el.value;
  saveCfg();
  // В меню (включая экран настроек) — всегда играет music1, не переключаем сейчас.
  // Если игрок прямо сейчас на game-screen — применяем выбор немедленно.
  var activeScreen = document.querySelector('.screen.active');
  var isInGame = activeScreen && activeScreen.id === 'game-screen';
  if (isInGame) {
    if (CFG.musicTrack === 'silence') {
      if (typeof stopAllAudio === 'function') stopAllAudio();
    } else if (typeof playTrack === 'function') {
      playTrack(CFG.musicTrack, AUDIO.volume);
    }
  }
}

function applyMusicVol(val) {
  CFG.musicVol = parseInt(val);
  if (typeof AUDIO !== 'undefined' && AUDIO.current && AUDIO[AUDIO.current]){
    AUDIO[AUDIO.current].volume = CFG.musicVol / 100;
  }
  if (typeof setVolume === 'function') setVolume(CFG.musicVol / 100);
  var el = document.getElementById('cfg-music-vol-val');
  if (el) el.textContent = CFG.musicVol + '%';
  saveCfg();
}

function applySfxEnabled() {
  var el = document.getElementById('cfg-sfx');
  CFG.sfxEnabled = el ? el.checked : true;
  if (typeof SFX !== 'undefined') SFX.setSfxEnabled(CFG.sfxEnabled);
  saveCfg();
}

function applySfxVol(val) {
  CFG.sfxVol = parseInt(val);
  if (typeof SFX !== 'undefined' && SFX.sfxGain) {
    SFX.sfxGain.gain.value = CFG.sfxVol / 100;
  }
  var el = document.getElementById('cfg-sfx-vol-val');
  if (el) el.textContent = CFG.sfxVol + '%';
  saveCfg();
}

function applyMenuMusic() {
  CFG.menuMusic = document.getElementById('cfg-menu-music').checked;
  if (!CFG.menuMusic && typeof stopAllAudio === 'function') stopAllAudio();
  saveCfg();
}

function applyDifficulty() {
  var el = document.getElementById('cfg-difficulty');
  if (el) CFG.difficulty = parseFloat(el.value);
  // Applied at startNight via G._difficultyMult
  G._difficultyMult = CFG.difficulty;
  saveCfg();
}

function applyNightSpeed(val) {
  CFG.nightSpeed = parseInt(val);
  // G._nightSpeedTicks used in startTimers
  G._nightSpeedTicks = CFG.nightSpeed;
  var el = document.getElementById('cfg-night-speed-val');
  if (el) el.textContent = CFG.nightSpeed + 'с';
  saveCfg();
}

function applyCRT() {
  var el = document.getElementById('cfg-crt');
  if (el) CFG.crt = el.checked;
  document.body.classList.toggle('no-crt', !CFG.crt);
  saveCfg();
}

function applyNoise() {
  var el = document.getElementById('cfg-noise');
  if (el) CFG.noise = el.checked;
  document.body.classList.toggle('no-noise', !CFG.noise);
  saveCfg();
}

function applyNpcAnim() {
  var el = document.getElementById('cfg-npc-anim');
  if (el) CFG.npcAnim = el.checked;
  var style = document.getElementById('cfg-npc-anim-style');
  if (!style) { style = document.createElement('style'); style.id = 'cfg-npc-anim-style'; document.head.appendChild(style); }
  style.textContent = CFG.npcAnim ? '' : '.stalker-img { animation: none !important; } .stalker-wrap { transition: opacity 0.1s !important; }';
  saveCfg();
}

function applyBrightness(val) {
  CFG.brightness = parseInt(val);
  var pct = CFG.brightness / 100;
  var style = document.getElementById('cfg-brightness-style');
  if (!style) { style = document.createElement('style'); style.id = 'cfg-brightness-style'; document.head.appendChild(style); }
  style.textContent = '.cam-photo { filter: brightness(' + pct + ') contrast(1.3) saturate(0.12) sepia(0.18) !important; }';
  var el = document.getElementById('cfg-brightness-val');
  if (el) el.textContent = CFG.brightness + '%';
  saveCfg();
}

function applyUIScale() {
  var el = document.getElementById('cfg-ui-scale');
  if (el) CFG.uiScale = el.value;
  document.body.classList.remove('ui-small', 'ui-large');
  if (CFG.uiScale === 'small') document.body.classList.add('ui-small');
  else if (CFG.uiScale === 'large') document.body.classList.add('ui-large');
  saveCfg();
}

function applyContrast() {
  var el = document.getElementById('cfg-contrast');
  if (el) CFG.contrast = el.checked;
  document.body.classList.toggle('high-contrast', CFG.contrast);
  saveCfg();
}

function applyTheme(theme) {
  CFG.theme = theme;
  document.body.classList.remove('theme-green','theme-red','theme-blue','theme-amber','theme-purple','theme-grey');
  if (theme !== 'crimson') document.body.classList.add('theme-' + theme);
  document.querySelectorAll('.cfg-theme-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.dataset.theme === theme);
  });
  saveCfg();
}

// ── KEYBINDS ─────────────────────────────────────────────────────────────────
var KEY_DISPLAY = {
  'tab':'TAB','shift':'SHIFT','enter':'ENTER','escape':'ESC','alt':'ALT',
  'control':'CTRL','meta':'WIN',' ':'SPC','space':'SPC',
  'arrowleft':'←','arrowright':'→','arrowup':'↑','arrowdown':'↓',
  'backspace':'BKSP','delete':'DEL','insert':'INS','home':'HOME','end':'END',
  'pageup':'PGUP','pagedown':'PGDN'
};

function keyToLabel(key) {
  return KEY_DISPLAY[key.toLowerCase()] || key.toUpperCase();
}

function renderKeybinds() {
  var list = document.getElementById('keybind-list');
  if (!list) return;
  // Detect conflicts
  var used = {};
  Object.keys(CFG.keybinds).forEach(function(a) {
    var k = CFG.keybinds[a];
    if (!used[k]) used[k] = [];
    used[k].push(a);
  });
  var html = '';
  Object.keys(KEYBIND_LABELS).forEach(function(action) {
    var key = CFG.keybinds[action] || '?';
    var label = keyToLabel(key);
    var conflict = used[key] && used[key].length > 1;
    var listening = _listeningFor === action;
    html += '<div class="cfg-row kb-row' + (listening ? ' kb-listening-row' : '') + '">'
      + '<div class="cfg-label"><div class="cfg-label-name">' + KEYBIND_LABELS[action] + '</div></div>'
      + '<div class="cfg-control cfg-keybind">'
      + '<div class="cfg-key' + (listening ? ' listening' : '') + (conflict ? ' kb-conflict' : '') + '" id="kb-' + action + '" onclick="startListen(\'' + action + '\')" title="Нажми чтобы изменить">'
      + (listening ? '<span class="kb-waiting">...</span>' : label)
      + '</div>'
      + '</div></div>';
  });
  list.innerHTML = html;
}

function startListen(action) {
  if (_listeningFor) cancelListen();
  _listeningFor = action;
  var el = document.getElementById('kb-' + action);
  if (el) el.classList.add('listening');
  document.addEventListener('keydown', onKeyListen);
}

function onKeyListen(e) {
  e.preventDefault();
  if (e.key === 'Escape') { cancelListen(); return; }
  if (_listeningFor) {
    var rawKey = e.key === ' ' ? 'space' : e.key.toLowerCase();
    CFG.keybinds[_listeningFor] = rawKey;
    saveCfg();
  }
  cancelListen();
  renderKeybinds();
}

function cancelListen() {
  if (_listeningFor) {
    var el = document.getElementById('kb-' + _listeningFor);
    if (el) el.classList.remove('listening');
  }
  _listeningFor = null;
  document.removeEventListener('keydown', onKeyListen);
}

function resetKeybinds() {
  CFG.keybinds = {
    office: 'tab', mapGlobal: '1',
    camPrev: 'arrowleft', camNext: 'arrowright',
    door: 'q', flash: 'f', hideUI: 'alt'
  };
  saveCfg();
  renderKeybinds();
}

// ── KEYBIND HOOK (override keydown in game) ───────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (!G.gameActive || _listeningFor) return;
  var kb = CFG.keybinds;
  var k = e.key === 'Tab' ? 'tab' : e.key === 'Shift' ? 'shift' : e.key.toLowerCase();
  // Tab блокируем дефолтное поведение браузера
  if (k === 'tab') e.preventDefault();
  if (k === kb.office) switchRoom('office');
  else if (k === kb.mapGlobal) { if(typeof mapZoomReset==='function') mapZoomReset(); switchRoom('map-global'); }
  else if (k === kb.camPrev) camCycleStep(-1);
  else if (k === kb.camNext) camCycleStep(1);
  else if (k === kb.door) { if(typeof toggleHide==='function') toggleHide(); }
  else if (k === kb.flash) toggleFlash();
});

// ── DATA PANEL ───────────────────────────────────────────────────────────────
function refreshDataPanel() {
  var nights = [];
  try { nights = JSON.parse(localStorage.getItem('resonance_nights') || '[]'); } catch(e) {}
  var skills = 0;
  if (typeof ST !== 'undefined') {
    skills = Object.values(ST.unlockedSkills).reduce(function(a,b){return a+b;},0);
  }
  var pts = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.skillPoints : (typeof ST!=='undefined'?ST.points:0);
  var lvl = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.level : 1;
  var diaryCount = 0;
  if(typeof DIARY!=='undefined'){ DIARY.load(); diaryCount = DIARY.entries.length; }

  var el;
  el = document.getElementById('cfg-player-level'); if(el) el.textContent = lvl;
  el = document.getElementById('cfg-nights-count'); if(el) el.textContent = nights.length + ' / 15';
  el = document.getElementById('cfg-skill-pts'); if(el) el.textContent = pts + ' 💎';
  el = document.getElementById('cfg-skills-count'); if(el) el.textContent = skills;
  el = document.getElementById('cfg-diary-count'); if(el) el.textContent = diaryCount + ' / 15';
}

// ── DANGER ZONE ───────────────────────────────────────────────────────────────
function confirmAction(msg, fn) {
  if (confirm(msg)) fn();
}

function resetNights() {
  try { localStorage.removeItem('resonance_nights'); } catch(e) {}
  if (typeof G !== 'undefined') G.savedNights = [];
  if (typeof updateNightButtons === 'function') updateNightButtons();
  refreshDataPanel();
  showSavedToast();
}

function cheatUnlockDiary() {
  var all = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  // Разблокировать ночи
  try { localStorage.setItem('resonance_nights', JSON.stringify(all)); } catch(e) {}
  if (typeof G !== 'undefined') G.savedNights = all;
  // Добавить все записи в дневник
  if (typeof DIARY !== 'undefined') {
    DIARY.load();
    all.forEach(function(n){ DIARY.addEntry(n); });
  }
  if (typeof updateNightButtons === 'function') updateNightButtons();
  if (typeof updateLevelUI === 'function') updateLevelUI();
  refreshDataPanel();
  showSavedToast();
}

function resetSkills() {
  if (typeof ST !== 'undefined') {
    // Count spent points to refund
    var spent = 0;
    var allTrees = typeof SKILL_TREES !== 'undefined' ? SKILL_TREES : {};
    Object.keys(allTrees).forEach(function(treeKey){
      allTrees[treeKey].skills.forEach(function(sk){
        var lvl = ST.unlockedSkills[sk.id] || 0;
        for(var i=0;i<lvl;i++){ spent += sk.cost[i] || 0; }
      });
    });
    // Refund points
    ST.unlockedSkills = {};
    if(typeof LEVEL_SYSTEM !== 'undefined'){
      LEVEL_SYSTEM.skillPoints += spent;
      ST.points = LEVEL_SYSTEM.skillPoints;
      LEVEL_SYSTEM.save();
    } else {
      ST.points += spent;
    }
    if (typeof saveSkillData === 'function') saveSkillData();
    if (typeof recalcEffects === 'function') recalcEffects();
    if (typeof applyDayModeVisuals === 'function') applyDayModeVisuals();
    if (typeof updateOfficeVisuals === 'function') updateOfficeVisuals();
  }
  refreshDataPanel();
  showSavedToast();
}

function resetAll() {
  // Полное удаление ВСЕХ ключей resonance_* во всех классах.
  // Используем оригинальный removeItem чтобы шим не переписал ключи.
  try {
    var keysToRemove = [];
    for(var i=0; i<localStorage.length; i++){
      var k = localStorage.key(i);
      if(k && k.indexOf('resonance_') === 0){
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(function(k){
      try { localStorage.removeItem(k); } catch(e){}
    });
    // Также удалить ключи флагов классовых бонусов
    try { localStorage.removeItem('resonance_class_bonus_applied:military'); } catch(e){}
    try { localStorage.removeItem('resonance_class_bonus_applied:scientist'); } catch(e){}
  } catch(e){}

  // Сбросить класс на guard
  if(typeof CFG !== 'undefined'){
    CFG.class = 'guard';
    CFG.unlockedClasses = ['guard'];
  }

  // Reset nights / saved
  if (typeof G !== 'undefined') G.savedNights = [];
  // Reset skills (без refund — full wipe)
  if (typeof ST !== 'undefined') {
    ST.points = 0; ST.unlockedSkills = {}; ST.rebirths = 0; ST.nightsCompleted = 0;
    if (typeof saveSkillData === 'function') saveSkillData();
    if (typeof recalcEffects === 'function') recalcEffects();
  }
  // Reset level system
  if (typeof LEVEL_SYSTEM !== 'undefined') LEVEL_SYSTEM.reset();
  // Reset diary
  if (typeof DIARY !== 'undefined') DIARY.reset();
  // Reset visuals
  if (typeof applyDayModeVisuals === 'function') applyDayModeVisuals();
  if (typeof updateOfficeVisuals === 'function') updateOfficeVisuals();
  if (typeof updateNightButtons === 'function') updateNightButtons();
  refreshDataPanel();
  showSavedToast();
  // Перезагрузка через короткую паузу — чтобы все системы стартовали с чистым state
  setTimeout(function(){ location.reload(); }, 500);
}

function resetTutorial(){
  if(!confirm('Запустить туториал заново при следующей смене?')) return;
  try { localStorage.removeItem('resonance_tutorial_done'); } catch(e){}
  if(typeof TUTORIAL !== 'undefined') TUTORIAL.completed = false;
  showSavedToast();
}

function exportSave() {
  var data = {
    nights: null, skills: null, cfg: CFG
  };
  try { data.nights = JSON.parse(localStorage.getItem('resonance_nights') || 'null'); } catch(e){}
  try { data.skills = JSON.parse(localStorage.getItem('resonance_skills') || 'null'); } catch(e){}
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'resonance_save_' + Date.now() + '.json';
  a.click();
}

function importSave(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (data.nights) localStorage.setItem('resonance_nights', JSON.stringify(data.nights));
      if (data.skills) localStorage.setItem('resonance_skills', JSON.stringify(data.skills));
      if (data.cfg) Object.assign(CFG, data.cfg);
      applyCfgAll();
      if (typeof loadSkillData === 'function') loadSkillData();
      if (typeof updateNightButtons === 'function') updateNightButtons();
      refreshDataPanel();
      showSavedToast();
      alert('Сохранение загружено!');
    } catch(err) { alert('Ошибка импорта: ' + err.message); }
  };
  reader.readAsText(file);
}

// ── PANEL SWITCHER ────────────────────────────────────────────────────────────
function switchCfgPanel(panel) {
  document.querySelectorAll('.cfg-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.cfg-panel').forEach(function(p) { p.classList.remove('active'); });
  var nb = document.getElementById('cfgnav-' + panel);
  if (nb) nb.classList.add('active');
  var cp = document.getElementById('cfg-' + panel);
  if (cp) cp.classList.add('active');
  if (panel === 'controls') renderKeybinds();
  if (panel === 'data') refreshDataPanel();
}

function _isEndlessUnlocked(){
  // Бесконечный режим открывается после прохождения 15 ночей за охранника
  // (охранник разблокировал военного — значит кампания за охранника завершена)
  try {
    var nights = JSON.parse(localStorage.getItem('resonance_nights:guard') || '[]');
    if(Array.isArray(nights) && nights.indexOf(15) >= 0) return true;
  } catch(e){}
  // Запасная проверка через unlockedClasses
  if(typeof CFG !== 'undefined' && CFG.unlockedClasses &&
     CFG.unlockedClasses.indexOf('military') >= 0) return true;
  return false;
}

function _updateEndlessBtn(){
  var btn = document.getElementById('endless-mode-btn');
  if(!btn) return;
  var unlocked = _isEndlessUnlocked();
  btn.disabled = !unlocked;
  btn.classList.toggle('locked', !unlocked);
  var desc = btn.querySelector('.tm-mode-desc');
  if(desc) desc.textContent = unlocked
    ? 'выживание · все навыки · рекорд'
    : '🔒 пройди кампанию за ОХРАННИКА';
}

function toggleModeSelect() {
  var menu = document.getElementById('tm-mode-menu');
  if (!menu) return;
  menu.classList.toggle('open');
  if(menu.classList.contains('open')) _updateEndlessBtn();
}
function closeModeSelect() {
  var menu = document.getElementById('tm-mode-menu');
  if (menu) menu.classList.remove('open');
}

// Закрывать подменю при клике вне него
document.addEventListener('click', function(e) {
  var menu = document.getElementById('tm-mode-menu');
  if (!menu || !menu.classList.contains('open')) return;
  if (!e.target.closest('.tm-mode-menu') && !e.target.closest('.tm-btn')) {
    menu.classList.remove('open');
  }
});

function togglePauseMenu() {
  var menu = document.getElementById('hud-pause-menu');
  var btn  = document.getElementById('hud-pause-btn');
  if (!menu) return;
  var isOpen = menu.classList.contains('open');
  menu.classList.toggle('open', !isOpen);
  if (btn) btn.classList.toggle('active', !isOpen);
}

function openSettings() {
  loadCfg();
  syncCfgUI();
  // Don't use showScreen — overlay settings on top
  var screen = document.getElementById('settings-screen');
  if(screen) screen.classList.add('active');
  refreshDataPanel();
  if(typeof _syncMobileModeBtn === 'function') _syncMobileModeBtn();
}
// Close settings returns to previous screen
function closeSettings(){
  var screen = document.getElementById('settings-screen');
  if(screen) screen.classList.remove('active');
}

// Close pause menu on outside click
document.addEventListener('click', function(e) {
  var menu = document.getElementById('hud-pause-menu');
  var btn  = document.getElementById('hud-pause-btn');
  if (!menu || !menu.classList.contains('open')) return;
  if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    menu.classList.remove('open');
    btn.classList.remove('active');
  }
});

// ── DEV CONSOLE ──────────────────────────────────────────────────────────────
(function(){
  document.addEventListener('change', function(e){
    if(e.target && e.target.id === 'dev-code-input'){
      var code = e.target.value.trim();
      if(code === '111'){
        e.target.value = '';
        openDevConsole();
      }
    }
  });
  document.addEventListener('keydown', function(e){
    if(e.target && e.target.id === 'dev-code-input' && e.key === 'Enter'){
      var code = e.target.value.trim();
      if(code === '111'){
        e.target.value = '';
        openDevConsole();
      }
    }
  });
})();

function openDevConsole(){
  var modal = document.getElementById('dev-modal');
  var ls = typeof LEVEL_SYSTEM!=='undefined' ? LEVEL_SYSTEM : null;
  var pts = ls ? ls.skillPoints : 0;
  var lvl = ls ? ls.level : 1;
  var xp  = ls ? ls.xp : 0;
  var cls = (typeof CFG!=='undefined' && CFG.class) ? CFG.class : 'guard';
  var clsName = (typeof CLASS_DEFS!=='undefined' && CLASS_DEFS[cls]) ? CLASS_DEFS[cls].name : cls;
  var unlClasses = (typeof CLASS_SYSTEM!=='undefined') ? CLASS_SYSTEM.unlocked() : ['guard'];
  var usedFinale = (typeof CFG!=='undefined') ? CFG.usedFinale : null;
  var skillCount = 0;
  if(typeof ST!=='undefined' && ST.unlockedSkills){
    Object.keys(ST.unlockedSkills).forEach(function(k){ if(ST.unlockedSkills[k]>0) skillCount++; });
  }

  var html = '';
  html += '<div class="lm-backdrop" onclick="closeDevConsole()"></div>';
  html += '<div class="dev-box">';
  html += '<button class="sm-close" onclick="closeDevConsole()">✕</button>';
  html += '<div class="dev-title">🔧 КОНСОЛЬ РАЗРАБОТЧИКА</div>';

  // Текущее состояние
  html += '<div class="dev-info" style="margin-bottom:10px;line-height:1.6">';
  html += '<b>Класс:</b> ' + clsName + ' (' + cls + ')<br>';
  html += '<b>Уровень:</b> ' + lvl + ' &nbsp; <b>XP:</b> ' + xp + ' &nbsp; <b>Очки:</b> ' + pts + '<br>';
  html += '<b>Навыков куплено:</b> ' + skillCount + '<br>';
  html += '<b>Разблок. классы:</b> ' + unlClasses.join(', ') + '<br>';
  html += '<b>Концовка активирована:</b> ' + (usedFinale ? usedFinale : 'нет');
  html += '</div>';

  // ── XP / Уровни / Очки ──
  html += '<div class="dev-section-title">💎 ПРОГРЕСС</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devAddXP(100)">+100 XP</button>';
  html += '<button class="dev-btn" onclick="devAddXP(1000)">+1000 XP</button>';
  html += '<button class="dev-btn" onclick="devAddXP(10000)">+10000 XP</button>';
  html += '<button class="dev-btn" onclick="devAddPoints(5)">+5 очков</button>';
  html += '<button class="dev-btn" onclick="devAddPoints(50)">+50 очков</button>';
  html += '<button class="dev-btn" onclick="devAddPoints(500)">+500 очков</button>';
  html += '<button class="dev-btn" onclick="devSetLevel(50)">УР. 50</button>';
  html += '<button class="dev-btn" onclick="devSetLevel(100)">УР. 100</button>';
  html += '<button class="dev-btn" onclick="devSetLevel(999)">УР. 999</button>';
  html += '</div>';

  // ── Ночи ──
  html += '<div class="dev-section-title">📅 СМЕНЫ</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devUnlockAll()">🔓 Все 15 смен</button>';
  html += '<button class="dev-btn" onclick="devUnlockNights(5)">🔓 До 5 смены</button>';
  html += '<button class="dev-btn" onclick="devUnlockNights(10)">🔓 До 10 смены</button>';
  html += '<button class="dev-btn" onclick="cheatUnlockDiary()">📖 Весь дневник</button>';
  html += '</div>';

  // ── Классы ──
  html += '<div class="dev-section-title">🛡 КЛАССЫ</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devUnlockAllClasses()">🔓 Открыть все</button>';
  html += '<button class="dev-btn" onclick="devSwitchClass(\'guard\')">→ Охранник</button>';
  html += '<button class="dev-btn" onclick="devSwitchClass(\'military\')">→ Военный</button>';
  html += '<button class="dev-btn" onclick="devSwitchClass(\'scientist\')">→ Учёный</button>';
  html += '</div>';

  // ── Навыки ──
  html += '<div class="dev-section-title">🌿 НАВЫКИ</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devBuyAllSkills()">🛒 Купить ВСЕ навыки</button>';
  html += '<button class="dev-btn" onclick="devClearSkills()">🗑 Сбросить навыки</button>';
  html += '</div>';

  // ── Концовки ──
  html += '<div class="dev-section-title">⚔ КОНЦОВКИ</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devClearFinale()">🔄 Сбросить концовку</button>';
  html += '<button class="dev-btn" onclick="devUnlockArmsFinale()">☢ Купить ТЕРМОЯДЕРКУ</button>';
  html += '<button class="dev-btn" onclick="devUnlockLabFinale()">🔬 Купить НАУКУ</button>';
  html += '</div>';

  // ── Гейм ──
  html += '<div class="dev-section-title">🎮 В ИГРЕ</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn" onclick="devRefillResources()">💚 +100% рассудка/энергии</button>';
  html += '<button class="dev-btn" onclick="devKillAllNpc()">☠ Усмирить всех NPC</button>';
  html += '<button class="dev-btn" onclick="devSkipToMorning()">⏭ Скип до утра</button>';
  html += '</div>';

  // ── Макро ──
  html += '<div class="dev-section-title">⚡ БЫСТРО</div>';
  html += '<div class="dev-grid">';
  html += '<button class="dev-btn dev-btn-warn" onclick="devGodMode()">☢ GOD MODE</button>';
  html += '<button class="dev-btn dev-btn-warn" onclick="devReady4Finale()">🏁 Готов к финалу</button>';
  html += '</div>';

  html += '</div>';
  modal.innerHTML = html;
  modal.classList.add('active');
}

function closeDevConsole(){
  var m = document.getElementById('dev-modal');
  m.classList.remove('active');
  m.innerHTML = '';
}

function devAddXP(n){
  if(typeof LEVEL_SYSTEM!=='undefined') LEVEL_SYSTEM.addXp(n, 'dev');
  if(typeof updateLevelUI==='function') updateLevelUI();
  refreshDataPanel();
  openDevConsole();
}
function devAddPoints(n){
  if(typeof LEVEL_SYSTEM!=='undefined'){ LEVEL_SYSTEM.skillPoints+=n; LEVEL_SYSTEM.save(); }
  if(typeof ST!=='undefined') ST.points=(typeof LEVEL_SYSTEM!=='undefined'?LEVEL_SYSTEM.skillPoints:ST.points+n);
  if(typeof updateSTPointsDisplay==='function') updateSTPointsDisplay();
  if(typeof updateLevelUI==='function') updateLevelUI();
  refreshDataPanel();
  openDevConsole();
}
function devUnlockAll(){
  devUnlockNights(15);
}
function devUnlockNights(maxN){
  var saved=[];try{saved=JSON.parse(localStorage.getItem('resonance_nights')||'[]')}catch(e){}
  for(var i=1;i<=maxN;i++){
    if(saved.indexOf(i)<0)saved.push(i);
  }
  localStorage.setItem('resonance_nights',JSON.stringify(saved));
  if(typeof G!=='undefined') G.savedNights=JSON.parse(localStorage.getItem('resonance_nights')||'[]');
  if(typeof updateNightButtons==='function') updateNightButtons();
  refreshDataPanel();
  openDevConsole();
}
function devSetLevel(n){
  if(typeof LEVEL_SYSTEM!=='undefined'){
    LEVEL_SYSTEM.level=n; LEVEL_SYSTEM.xp=0; LEVEL_SYSTEM.save();
    if(typeof updateLevelUI==='function') updateLevelUI();
  }
  refreshDataPanel();
  openDevConsole();
}

// ── КЛАССЫ ──
function devUnlockAllClasses(){
  if(typeof CFG === 'undefined') return;
  CFG.unlockedClasses = ['guard', 'military', 'scientist'];
  if(typeof saveCfg === 'function') saveCfg();
  if(typeof addLog === 'function') addLog('🔓 Все классы разблокированы','w');
  openDevConsole();
}
function devSwitchClass(classId){
  if(typeof CLASS_SYSTEM === 'undefined') return;
  // Сначала открыть класс если ещё нет
  if(!CLASS_SYSTEM.isUnlocked(classId)){
    devUnlockAllClasses();
  }
  CLASS_SYSTEM.switchTo(classId);
  CLASS_SYSTEM.applyStartingBonus();
  if(typeof updateLevelUI === 'function') updateLevelUI();
  if(typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();
  if(typeof addLog === 'function') addLog('Переключено на класс: ' + classId,'w');
  openDevConsole();
}

// ── НАВЫКИ ──
function devBuyAllSkills(){
  if(typeof SKILL_TREES === 'undefined' || typeof ST === 'undefined') return;
  Object.keys(SKILL_TREES).forEach(function(treeKey){
    var tree = SKILL_TREES[treeKey];
    if(!tree.skills) return;
    tree.skills.forEach(function(sk){
      // Проверяем доступность по классу для arms/lab
      if(typeof isUnlockable === 'function'){
        var lvl = ST.unlockedSkills[sk.id] || 0;
        if(lvl < sk.maxLevel){
          ST.unlockedSkills[sk.id] = sk.maxLevel;
        }
      }
    });
  });
  if(typeof saveSkillData === 'function') saveSkillData();
  if(typeof recalcEffects === 'function') recalcEffects();
  if(typeof renderSkillTree === 'function') renderSkillTree(ST._activeTree||'office');
  if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  if(typeof addLog === 'function') addLog('🛒 Все навыки куплены (для текущего класса)','w');
  openDevConsole();
}
function devClearSkills(){
  if(typeof ST === 'undefined') return;
  ST.unlockedSkills = {};
  if(typeof saveSkillData === 'function') saveSkillData();
  if(typeof recalcEffects === 'function') recalcEffects();
  if(typeof renderSkillTree === 'function') renderSkillTree(ST._activeTree||'office');
  if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  openDevConsole();
}

// ── КОНЦОВКИ ──
function devClearFinale(){
  if(typeof CFG === 'undefined') return;
  CFG.usedFinale = null;
  if(typeof saveCfg === 'function') saveCfg();
  if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  if(typeof addLog === 'function') addLog('🔄 Концовка сброшена','w');
  openDevConsole();
}
function devUnlockArmsFinale(){
  if(typeof ST === 'undefined') return;
  // Покупаем всю цепочку Оружейника до термоядерки
  var armsChain = ['arms_unlock','arms_shotgun_ammo','arms_shotgun_speed','arms_shotgun_buckshot','arms_shotgun_pro',
                   'arms_tripwire','arms_mine','arms_flare',
                   'arms_radio','arms_thermal','arms_reflexes','arms_thermo'];
  armsChain.forEach(function(id){ ST.unlockedSkills[id] = 1; });
  if(typeof saveSkillData === 'function') saveSkillData();
  if(typeof recalcEffects === 'function') recalcEffects();
  if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  if(typeof addLog === 'function') addLog('☢ ТЕРМОЯДЕРКА разблокирована','w');
  openDevConsole();
}
function devUnlockLabFinale(){
  if(typeof ST === 'undefined') return;
  var labChain = ['lab_unlock','a_stalker_suppress','a_stalker_resist','a_stalker_cunning',
                  'a_crawler_collar','a_crawler_scent','a_crawler_poison',
                  'a_shade_eyes','a_shade_inhibit','a_shade_lighttrap','a_science_finale'];
  labChain.forEach(function(id){ ST.unlockedSkills[id] = 1; });
  if(typeof saveSkillData === 'function') saveSkillData();
  if(typeof recalcEffects === 'function') recalcEffects();
  if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  if(typeof addLog === 'function') addLog('🔬 НАУКА разблокирована','w');
  openDevConsole();
}

// ── В ИГРЕ ──
function devRefillResources(){
  if(typeof G === 'undefined') return;
  G.sanity = 115;
  G.power = 100;
  G.flashBattery = 100;
  if(typeof updateSanityUI === 'function') updateSanityUI();
  if(typeof updatePowerUI === 'function') updatePowerUI();
  if(typeof addLog === 'function') addLog('💚 Ресурсы восстановлены','w');
}
function devKillAllNpc(){
  if(typeof CREATURES === 'undefined') return;
  Object.values(CREATURES).forEach(function(c){
    c.active = false;
    c.loc = 0;
    if(typeof stopDoorTimers === 'function') stopDoorTimers(c);
  });
  G._shadeSoulDrainActive = false;
  if(typeof addLog === 'function') addLog('☠ Все NPC усмирены','w');
}
function devSkipToMorning(){
  if(typeof G === 'undefined' || !G.gameActive) return;
  G.hour = 8;  // финальный час
  G.minutes = 0;
  if(typeof winNight === 'function') setTimeout(winNight, 100);
}

// ── МАКРО ──
function devGodMode(){
  devUnlockAllClasses();
  devUnlockAll();
  devSetLevel(999);
  devAddPoints(500);
  if(typeof G!=='undefined'){G.power=999;G.flashBattery=999;G.sanity=115;}
  alert('GOD MODE активирован!\n\n• Все классы открыты\n• 999 уровень\n• +500 очков\n• Все смены открыты');
}
function devReady4Finale(){
  // Открыть всё нужное чтобы можно было активировать любую концовку
  devUnlockAllClasses();
  devSetLevel(100);
  devAddPoints(200);
  devUnlockAll();
  devClearFinale();
  // В зависимости от класса — открываем нужный финал
  var cls = (typeof CFG!=='undefined') ? CFG.class : 'guard';
  if(cls === 'military'){
    devUnlockArmsFinale();
  } else if(cls === 'scientist'){
    devUnlockLabFinale();
  } else {
    devUnlockArmsFinale();
    devUnlockLabFinale();
  }
  alert('Готов к финалу!\n\nКнопки концовок появятся в HUD при старте смены.');
}

// ═══════════════════════════════════════════
// CREDITS
// ═══════════════════════════════════════════
var _crdPaused = false;
var _crdOpen   = false;

function openCredits(){
  var m = document.getElementById('credits-modal');
  if(!m) return;
  _crdOpen = true;
  _crdPaused = false;

  // Calculate scroll duration based on content height (auto-adjust)
  var scroll = document.getElementById('crd-scroll');
  if(scroll){
    scroll.classList.remove('paused');
    // Reset animation so it restarts each open
    scroll.style.animation = 'none';
    scroll.offsetHeight; // reflow
    var contentH = scroll.scrollHeight;
    var boxH     = m.querySelector('.crd-box').offsetHeight || 680;
    var speed    = 27; // px per second
    var dur      = Math.round((contentH + boxH) / speed);
    scroll.style.animation = '';
    scroll.style.setProperty('--crd-duration', dur + 's');
    scroll.style.setProperty('--crd-delay',    '1.2s');

    // Auto-close when roll finishes
    scroll.addEventListener('animationend', function onEnd(){
      scroll.removeEventListener('animationend', onEnd);
      if(_crdOpen) closeCredits();
    });
  }

  m.classList.add('active');

  // Click anywhere on the box to pause/resume
  var box = m.querySelector('.crd-scroll-track');
  if(box){
    box.onclick = function(){
      _crdPaused = !_crdPaused;
      var s = document.getElementById('crd-scroll');
      if(s) s.classList.toggle('paused', _crdPaused);
      var hint = m.querySelector('.crd-skip');
      if(hint) hint.textContent = _crdPaused ? 'НАЖМИ ДЛЯ ПРОДОЛЖЕНИЯ' : 'НАЖМИ ДЛЯ ПАУЗЫ';
    };
  }
}

function closeCredits(){
  _crdOpen = false;
  var m = document.getElementById('credits-modal');
  if(!m) return;
  m.classList.remove('active');
  var scroll = document.getElementById('crd-scroll');
  if(scroll){ scroll.style.animation = 'none'; scroll.classList.remove('paused'); }
}

// ═══════════════════════════════════════════
// FULLSCREEN
// ═══════════════════════════════════════════
function toggleFullscreen(){
  var btn = document.getElementById('fullscreen-btn');
  if(!document.fullscreenElement){
    var el = document.documentElement;
    if(el.requestFullscreen)             el.requestFullscreen();
    else if(el.webkitRequestFullscreen)  el.webkitRequestFullscreen();
    else if(el.mozRequestFullScreen)     el.mozRequestFullScreen();
    if(btn) btn.textContent = '⛶ ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА';
    if(btn) btn.classList.add('fs-active');
  } else {
    if(document.exitFullscreen)          document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    if(btn) btn.textContent = '⛶ ПОЛНЫЙ ЭКРАН';
    if(btn) btn.classList.remove('fs-active');
  }
}
document.addEventListener('fullscreenchange', function(){
  var btn = document.getElementById('fullscreen-btn');
  if(!btn) return;
  if(document.fullscreenElement){
    btn.textContent = '⛶ ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА';
    btn.classList.add('fs-active');
  } else {
    btn.textContent = '⛶ ПОЛНЫЙ ЭКРАН';
    btn.classList.remove('fs-active');
  }
});

// ═══════════════════════════════════════════
// MOBILE MODE TOGGLE
// ═══════════════════════════════════════════
function _isMobileMode(){
  return document.body.classList.contains('mobile-mode');
}
function toggleMobileMode(){
  var active = _isMobileMode();
  document.body.classList.toggle('mobile-mode', !active);
  try { localStorage.setItem('resonance_mobile_mode', !active ? '1' : '0'); } catch(e){}
  _syncMobileModeBtn();
}
function _syncMobileModeBtn(){
  var btn = document.getElementById('mobile-mode-btn');
  if(!btn) return;
  if(_isMobileMode()){
    btn.textContent = '🖥 РЕЖИМ ПК';
    btn.classList.add('mob-active');
  } else {
    btn.textContent = '📱 МОБИЛЬНЫЙ РЕЖИМ';
    btn.classList.remove('mob-active');
  }
}
// Restore on load
(function(){
  try {
    if(localStorage.getItem('resonance_mobile_mode') === '1'){
      document.body.classList.add('mobile-mode');
    }
  } catch(e){}
  // Wait for DOM
  document.addEventListener('DOMContentLoaded', function(){
    _syncMobileModeBtn();
    _updateEndlessBtn();
  });
})();
