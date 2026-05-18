/* resonance/js/endless.js — БЕСКОНЕЧНЫЙ РЕЖИМ */

var ENDLESS = (function(){

  // ─── STATE ────────────────────────────────────────────────────────────────
  var _wave      = 1;
  var _totalHours= 0;
  var _active    = false;
  var SAVE_KEY   = 'resonance_endless_record';

  // ─── STAGE / DIFFICULTY MAP ───────────────────────────────────────────────
  // 1 стадия = 1 этап. Стадии 1–10, после 10-й идёт истощение (+multiplier).
  function _getStage(stage){
    return Math.min(10, stage);
  }

  // Виртуальный номер ночи = первая ночь нужной стадии.
  var _STAGE_TO_NIGHT = {1:1,2:3,3:5,4:7,5:9,6:11,7:12,8:13,9:14,10:15};
  function _getVirtualNight(stage){
    return _STAGE_TO_NIGHT[_getStage(stage)] || 15;
  }

  // Дополнительный множитель сложности: на стадиях 11+ враги становятся быстрее
  function _getExtraMult(stage){
    if(stage <= 10) return 1.0;
    return 1.0 + (stage - 10) * 0.08;
  }

  // XP за пройденную стадию
  var _STAGE_XP = {1:250,2:300,3:350,4:400,5:500,6:550,7:600,8:650,9:750,10:1000};
  function _stageXp(stage){
    return _STAGE_XP[_getStage(stage)] || 1000;
  }

  // ─── RECORD ───────────────────────────────────────────────────────────────
  function _loadRecord(){
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function _saveRecord(wave, totalHours){
    var prev = _loadRecord();
    if(wave > (prev.wave||0) || (wave === (prev.wave||0) && totalHours > (prev.hours||0))){
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ wave:wave, hours:totalHours })); } catch(e){}
    }
  }

  // ─── STARTING BONUS ──────────────────────────────────────────────────────
  function _giveStartingPoints(){
    // Даём 5 стартовых очков только если у игрока 0 суммарного XP (свежий старт)
    if(typeof LEVEL_SYSTEM === 'undefined') return;
    if(LEVEL_SYSTEM.totalXp > 0) return;
    LEVEL_SYSTEM.skillPoints += 5;
    if(typeof ST !== 'undefined') ST.points = LEVEL_SYSTEM.skillPoints;
    LEVEL_SYSTEM.save();
  }

  // ─── PRE-STAGE SKILL TREE ────────────────────────────────────────────────
  function _openPreWaveSkillTree(){
    G._endlessPendingWave = true;
    if(typeof openSkillTree === 'function') openSkillTree();
    var btn = document.querySelector('#skilltree-screen .st-back-btn');
    if(btn) btn.textContent = '🌀 НАЧАТЬ СТАДИЮ ' + _wave;
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  function start(){
    _wave       = 1;
    _totalHours = 0;
    _active     = true;
    G.endlessMode = true;
    G._endlessExhaustion = false;

    _giveStartingPoints();
    // Открыть дерево навыков перед первой волной
    _openPreWaveSkillTree();
  }

  function launchWave(){
    var vNight = _getVirtualNight(_wave);
    G.endlessMode  = true;
    G._endlessWave = _wave;

    // Истощение начинается с 10-й стадии
    if(_wave >= 10 && !G._endlessExhaustion){
      G._endlessExhaustion = true;
      addLog('💀 ИСТОЩЕНИЕ — обновление расходников заблокировано!', 'd');
    }

    startNight(vNight);

    // Повышенный multiplier для стадий 11+
    var extra = _getExtraMult(_wave);
    if(extra > 1.0){
      G._difficultyMult = (G._difficultyMult || 1.0) * extra;
      if(typeof CREATURES !== 'undefined'){
        Object.values(CREATURES).forEach(function(c){ c.agg = Math.min(c.agg * extra, 3.5); });
      }
    }

    _updateWaveHUD();
    addLog('🌀 СТАДИЯ ' + _wave + ' — НАЧАЛАСЬ!', 'w');
  }

  // Вызывается из winNight() когда G.endlessMode = true
  function onWaveWin(){
    var xp = _stageXp(_wave);
    if(typeof LEVEL_SYSTEM !== 'undefined') LEVEL_SYSTEM.addXp(xp, 'endless_stage');
    if(typeof updateLevelUI === 'function') updateLevelUI();
    addLog('⭐ +' + xp + ' XP (стадия ' + _wave + ')', 'w');

    _wave++;
    _showWaveTransition(function(){
      // Если есть нераспределённые очки — открыть дерево навыков
      var pts = (typeof LEVEL_SYSTEM !== 'undefined') ? LEVEL_SYSTEM.skillPoints : 0;
      if(pts > 0){
        _openPreWaveSkillTree();
      } else {
        launchWave();
      }
    });
  }

  // Вызывается из onHourChange() в game.js каждый новый час
  function onHour(hour){
    if(!_active || !G.endlessMode) return;
    _totalHours++;
    _updateWaveHUD();
  }

  // Вызывается при проигрыше (sanityOut / creatureWin)
  function onGameOver(){
    if(!_active) return;
    _active = false;
    _saveRecord(_wave, _totalHours);
    if(typeof updateEndlessRecordBadge === 'function') updateEndlessRecordBadge();
    _showEndlessGameOver();
  }

  function isActive(){ return _active; }

  // ─── UI ───────────────────────────────────────────────────────────────────
  function _updateWaveHUD(){
    var el = document.getElementById('endless-wave-hud');
    if(!el) return;
    var rec = _loadRecord();
    var exhausted = G._endlessExhaustion;
    el.style.display = 'flex';
    el.innerHTML =
      '<span class="ewh-wave">СТАДИЯ ' + _wave + '</span>' +
      '<span class="ewh-hours">⏱ ' + _totalHours + 'ч</span>' +
      (rec.wave ? '<span class="ewh-rec">🏆 ' + rec.wave + '</span>' : '') +
      '<button class="ewh-renew' + (exhausted ? ' exhausted' : '') + '" ' +
        'onclick="endlessRenewConsumables()" ' +
        (exhausted ? 'title="ИСТОЩЕНИЕ — недоступно"' : 'title="Обновить расходники (-100 XP)"') +
      '>🔋</button>';
  }

  function _showWaveTransition(cb){
    var overlay = document.getElementById('endless-transition');
    if(!overlay){
      cb(); return;
    }
    var stageEl  = overlay.querySelector('.et-stage');
    var waveEl   = overlay.querySelector('.et-wave');
    var extraEl  = overlay.querySelector('.et-extra');
    if(waveEl)  waveEl.textContent  = 'СТАДИЯ ' + _wave;
    if(stageEl) stageEl.style.display = 'none';
    if(extraEl){
      var extra = _getExtraMult(_wave);
      extraEl.textContent = extra > 1.0 ? ('×' + extra.toFixed(1) + ' СКОРОСТЬ') : '';
    }
    overlay.classList.add('active');
    setTimeout(function(){
      overlay.classList.remove('active');
      cb();
    }, 2800);
  }

  function _showEndlessGameOver(){
    var rec = _loadRecord();
    var modal = document.getElementById('endless-gameover');
    if(!modal){ showScreen('insane-screen'); return; }

    var waveEl   = modal.querySelector('.ego-wave');
    var hoursEl  = modal.querySelector('.ego-hours');
    var recEl    = modal.querySelector('.ego-record');
    var newRecEl = modal.querySelector('.ego-newrec');

    if(waveEl)  waveEl.textContent  = 'СТАДИЯ ' + _wave;
    if(hoursEl) hoursEl.textContent = 'ПЕРЕЖИТО ЧАСОВ: ' + _totalHours;

    var isNewRec = (rec.wave === _wave && rec.hours === _totalHours);
    if(recEl)    recEl.textContent    = rec.wave ? ('РЕКОРД: СТАДИЯ ' + rec.wave + ' · ' + rec.hours + ' ч') : 'ПЕРВЫЙ РЕКОРД!';
    if(newRecEl) newRecEl.style.display = isNewRec ? 'block' : 'none';

    modal.classList.add('active');
  }

  return {
    start        : start,
    launchWave   : launchWave,
    onWaveWin    : onWaveWin,
    onHour       : onHour,
    onGameOver   : onGameOver,
    isActive     : isActive,
    getWave      : function(){ return _wave; },
    getTotalHours: function(){ return _totalHours; }
  };
})();

// ─── RECORD BADGE ON TITLE SCREEN ────────────────────────────────────────────
function updateEndlessRecordBadge(){
  var badge = document.getElementById('endless-record-badge');
  if(!badge) return;
  try {
    var rec = JSON.parse(localStorage.getItem('resonance_endless_record') || '{}');
    if(rec.wave){
      badge.style.display = 'flex';
      badge.textContent = 'РЕКОРД: СТАДИЯ ' + rec.wave + ' · ' + rec.hours + ' ч';
    } else {
      badge.style.display = 'none';
    }
  } catch(e){ badge.style.display = 'none'; }
}
document.addEventListener('DOMContentLoaded', updateEndlessRecordBadge);

// ─── ГЛОБАЛЬНЫЕ ОБЁРТКИ для кнопок в HTML ────────────────────────────────────

// ─── ОТДЕЛЬНЫЕ КЛЮЧИ БЕСКОНЕЧНОГО РЕЖИМА ─────────────────────────────────────
// Эти ключи НИКОГДА не проходят через шим CFG.class — они жёстко заданы
// и полностью изолированы от сохранений кампании.
var _EL_KEY = 'resonance_endless_levels';   // уровень / XP / очки навыков
var _ES_KEY = 'resonance_endless_skills';   // прокачанные навыки

// Оригинальные функции LEVEL_SYSTEM и skillData (заменяются патчем)
var _origLevelSave = null;
var _origLevelLoad = null;
var _origSaveSkills = null;
var _origLoadSkills = null;

function _saveEndlessLevels(){
  try {
    localStorage.setItem(_EL_KEY, JSON.stringify({
      level:       LEVEL_SYSTEM.level,
      xp:          LEVEL_SYSTEM.xp,
      totalXp:     LEVEL_SYSTEM.totalXp,
      skillPoints: LEVEL_SYSTEM.skillPoints
    }));
  } catch(e){}
}

function _loadEndlessLevels(){
  LEVEL_SYSTEM.level = 1; LEVEL_SYSTEM.xp = 0;
  LEVEL_SYSTEM.totalXp = 0; LEVEL_SYSTEM.skillPoints = 0;
  try {
    var raw = localStorage.getItem(_EL_KEY);
    if(raw){
      var d = JSON.parse(raw);
      LEVEL_SYSTEM.level       = parseInt(d.level)       || 1;
      LEVEL_SYSTEM.xp          = parseInt(d.xp)          || 0;
      LEVEL_SYSTEM.totalXp     = parseInt(d.totalXp)     || 0;
      LEVEL_SYSTEM.skillPoints = parseInt(d.skillPoints) || 0;
    }
  } catch(e){}
}

function _saveEndlessSkillData(){
  try {
    localStorage.setItem(_ES_KEY, JSON.stringify({
      points:         ST.points         || 0,
      rebirths:       ST.rebirths       || 0,
      nightsCompleted:ST.nightsCompleted|| 0,
      unlockedSkills: ST.unlockedSkills || {}
    }));
  } catch(e){}
}

function _loadEndlessSkillData(){
  ST.points = 0; ST.rebirths = 0; ST.nightsCompleted = 0; ST.unlockedSkills = {};
  try {
    var raw = localStorage.getItem(_ES_KEY);
    if(raw){
      var d = JSON.parse(raw);
      ST.points          = d.points          || 0;
      ST.rebirths        = d.rebirths        || 0;
      ST.nightsCompleted = d.nightsCompleted || 0;
      ST.unlockedSkills  = d.unlockedSkills  || {};
    }
  } catch(e){}
  if(typeof recalcEffects === 'function') recalcEffects();
}

function _patchForEndless(){
  // Заменяем LEVEL_SYSTEM.save/load и saveSkillData/loadSkillData
  // чтобы любой код внутри бесконечного режима писал только в endless-ключи
  _origLevelSave  = LEVEL_SYSTEM.save;
  _origLevelLoad  = LEVEL_SYSTEM.load;
  _origSaveSkills = saveSkillData;
  _origLoadSkills = loadSkillData;

  LEVEL_SYSTEM.save = _saveEndlessLevels;
  LEVEL_SYSTEM.load = _loadEndlessLevels;
  saveSkillData     = _saveEndlessSkillData;
  loadSkillData     = _loadEndlessSkillData;
}

function _unpatchForEndless(){
  if(_origLevelSave)  LEVEL_SYSTEM.save = _origLevelSave;
  if(_origLevelLoad)  LEVEL_SYSTEM.load = _origLevelLoad;
  if(_origSaveSkills) saveSkillData      = _origSaveSkills;
  if(_origLoadSkills) loadSkillData      = _origLoadSkills;
  _origLevelSave = _origLevelLoad = _origSaveSkills = _origLoadSkills = null;
}

function _enterEndlessNamespace(){
  // 1) Сохранить кампанию через оригинальные функции (до патча)
  LEVEL_SYSTEM.save();
  saveSkillData();

  // 2) Сбросить in-memory state
  LEVEL_SYSTEM.level = 1; LEVEL_SYSTEM.xp = 0;
  LEVEL_SYSTEM.totalXp = 0; LEVEL_SYSTEM.skillPoints = 0;
  ST.unlockedSkills = {}; ST.points = 0;
  ST.rebirths = 0; ST.nightsCompleted = 0; ST.activeEffects = {};

  // 3) Патчим — теперь все save/load идут в endless-ключи
  _patchForEndless();

  // 4) Загрузить прогресс бесконечного режима
  _loadEndlessLevels();
  _loadEndlessSkillData();
  ST.points = LEVEL_SYSTEM.skillPoints;

  if(typeof recalcEffects === 'function') recalcEffects();
}

function _exitEndlessNamespace(){
  // 1) Сохранить endless через патченые функции
  _saveEndlessLevels();
  _saveEndlessSkillData();

  // 2) Снять патч — возвращаем оригинальные функции
  _unpatchForEndless();

  // 3) Сбросить in-memory state
  LEVEL_SYSTEM.level = 1; LEVEL_SYSTEM.xp = 0;
  LEVEL_SYSTEM.totalXp = 0; LEVEL_SYSTEM.skillPoints = 0;
  ST.unlockedSkills = {}; ST.points = 0;
  ST.rebirths = 0; ST.nightsCompleted = 0; ST.activeEffects = {};

  // 4) Загрузить кампанию через восстановленные оригинальные функции
  LEVEL_SYSTEM.load();
  loadSkillData();
  if(typeof loadSavedNights === 'function') G.savedNights = loadSavedNights();
  ST.points = LEVEL_SYSTEM.skillPoints;

  if(typeof recalcEffects === 'function') recalcEffects();
  if(typeof updateLevelUI === 'function') updateLevelUI();
  if(typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();
}

// Отдельный ключ для состояния обновлений — не входит в PER_CLASS_KEYS,
// поэтому шим localStorage его не трогает и конфликтов со сменой класса нет.
var _ENDLESS_STATE_KEY = 'resonance_endless_state';
var RENEW_COST = 100;

function _loadEndlessState(){
  try { return JSON.parse(localStorage.getItem(_ENDLESS_STATE_KEY) || '{}'); } catch(e){ return {}; }
}
function _saveEndlessState(data){
  try { localStorage.setItem(_ENDLESS_STATE_KEY, JSON.stringify(data)); } catch(e){}
}

function endlessRenewConsumables(){
  if(!G.gameActive) return;
  if(G._endlessExhaustion){
    if(typeof addLog === 'function') addLog('💀 ИСТОЩЕНИЕ — обновление расходников недоступно!', 'd');
    return;
  }
  // Проверить достаточно ли XP на текущем уровне
  if(typeof LEVEL_SYSTEM === 'undefined' || LEVEL_SYSTEM.xp < RENEW_COST){
    var have = (typeof LEVEL_SYSTEM !== 'undefined') ? LEVEL_SYSTEM.xp : 0;
    if(typeof addLog === 'function') addLog('⚠ Нужно ' + RENEW_COST + ' XP для обновления. Есть: ' + have, 'd');
    return;
  }
  // Списать XP из текущего прогресса уровня
  LEVEL_SYSTEM.xp -= RENEW_COST;
  LEVEL_SYSTEM.save();
  if(typeof updateLevelUI === 'function') updateLevelUI();
  // Записать в отдельное хранилище (не проходит через шим класса)
  var state = _loadEndlessState();
  state.xpSpent  = (state.xpSpent  || 0) + RENEW_COST;
  state.renewals = (state.renewals || 0) + 1;
  _saveEndlessState(state);
  // Восстановить батарею фонарика
  G.flashBattery = 100;
  if(typeof updateFlashBatteryUI === 'function') updateFlashBatteryUI();
  // Восстановить заряды всех способностей
  if(typeof ST !== 'undefined' && ST.abilities){
    Object.keys(ST.abilities).forEach(function(k){ ST.abilities[k].uses = 0; });
    if(typeof renderAbilities === 'function') renderAbilities();
  }
  if(typeof addLog === 'function') addLog('🔋 Расходники обновлены! (-' + RENEW_COST + ' XP)', 'w');
}

function startEndlessMode(){
  _enterEndlessNamespace();
  ENDLESS.start();
}

function restartEndlessMode(){
  var modal = document.getElementById('endless-gameover');
  if(modal) modal.classList.remove('active');
  G.endlessMode = false;
  G._endlessExhaustion = false;
  // Сброс счётчика обновлений для нового забега
  _saveEndlessState({ xpSpent: 0, renewals: 0 });
  // Остаёмся в endless namespace — просто перезапускаем
  ENDLESS.start();
}

function exitEndlessMode(){
  var modal = document.getElementById('endless-gameover');
  if(modal) modal.classList.remove('active');
  var hud = document.getElementById('endless-wave-hud');
  if(hud) hud.style.display = 'none';
  G.endlessMode = false;
  _exitEndlessNamespace();
  if(typeof showScreen === 'function') showScreen('title-screen');
}
