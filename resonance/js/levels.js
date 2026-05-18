/* resonance/js/levels.js — level & XP system */

// ═══════════════════════════════════════════════════
// СИСТЕМА УРОВНЕЙ — РЕЗОНАНС v2
//
// Каждый уровень = 100 XP (100/100 → +1 уровень)
// Остаток XP переносится на следующий уровень
// Каждый уровень даёт +1 очко навыков
//
// Источники XP:
//   Ночь 1 = 50 XP
//   Ночь 2 = 60 XP
//   Ночь 3 = 70 XP
//   Ночь 4 = 80 XP
//   Ночь 5 = 100 XP
// ═══════════════════════════════════════════════════

var LEVEL_SYSTEM = {
  MAX_LEVEL: 999,

  // XP порог для перехода: BASE_XP + (level-1) * XP_STEP
  BASE_XP_THRESHOLD: 100,
  XP_STEP: 10,

  // Награды XP за события
  XP_REWARDS: {
    anomaly:    25,
    close_call: 10,
  },

  // Состояние (грузится из localStorage)
  level: 1,
  xp: 0,
  totalXp: 0,
  skillPoints: 0,

  load: function() {
    // Сначала сбросить в дефолты — на случай переключения на класс без прогресса
    this.level = 1;
    this.xp = 0;
    this.totalXp = 0;
    this.skillPoints = 0;
    try {
      var raw = localStorage.getItem('resonance_levels');
      if (raw) {
        var d = JSON.parse(raw);
        this.level       = parseInt(d.level) || 1;
        this.xp          = parseInt(d.xp) || 0;
        this.totalXp     = parseInt(d.totalXp) || 0;
        this.skillPoints = parseInt(d.skillPoints) || 0;
        // Защита от NaN из старых сохранений
        if (isNaN(this.xp)) this.xp = 0;
        if (isNaN(this.totalXp)) this.totalXp = 0;
        if (isNaN(this.level) || this.level < 1) this.level = 1;
        if (isNaN(this.skillPoints)) this.skillPoints = 0;
      }
    } catch(e) { this.level = 1; this.xp = 0; this.totalXp = 0; this.skillPoints = 0; }
  },

  save: function() {
    try {
      localStorage.setItem('resonance_levels', JSON.stringify({
        level:       this.level,
        xp:          this.xp,
        totalXp:     this.totalXp,
        skillPoints: this.skillPoints,
      }));
    } catch(e) {}
  },

  xpForCurrentLevel: function() {
    return this.BASE_XP_THRESHOLD + (this.level - 1) * this.XP_STEP;
  },

  progressPercent: function() {
    var req = this.xpForCurrentLevel();
    return Math.min(100, Math.floor(this.xp / req * 100));
  },

  addXp: function(amount, reason) {
    amount = parseInt(amount) || 0;
    if (amount <= 0) return;
    if (this.level >= this.MAX_LEVEL) return;
    // ОПЫТНЫЙ — бонус к получаемому опыту в текущей кампании
    var xpBonus = (typeof ST !== 'undefined' && ST.activeEffects && ST.activeEffects.xp_bonus) || 0;
    if (xpBonus > 0) {
      amount = Math.round(amount * (1 + xpBonus));
    }
    this.xp += amount;
    this.totalXp += amount;
    if (typeof addLog === 'function') {
      addLog('+' + amount + ' XP — ' + reason + (xpBonus>0 ? ' (+' + Math.round(xpBonus*100) + '% Опытный)' : ''), '');
    }
    // Считаем уровни — если получили много XP сразу, обрабатываем все, но логируем суммарно
    var levelsGained = 0;
    while (this.xp >= this.xpForCurrentLevel() && this.level < this.MAX_LEVEL) {
      this.xp -= this.xpForCurrentLevel();
      this.level++;
      this.skillPoints++;
      levelsGained++;
      // Синхронизация с деревом навыков
      if (typeof ST !== 'undefined') ST.points = this.skillPoints;
    }
    if (levelsGained > 0) {
      if (typeof addLog === 'function') {
        if (levelsGained === 1) {
          addLog('🆙 УРОВЕНЬ ' + this.level + '! +1 очко навыков', 'w');
        } else {
          addLog('🆙 +' + levelsGained + ' УРОВНЕЙ! Текущий: ' + this.level + ' (+' + levelsGained + ' очков навыков)', 'w');
        }
      }
      if (typeof updateLevelUI === 'function') updateLevelUI();
      if (typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();
    }
    this.save();
    if (typeof updateLevelUI === 'function') updateLevelUI();
  },

  // Вызывается в конце ночи — единственный источник XP
  // Формула: 100 + (n-1)*50, 15-я ночь = 1000 (бонус за финал)
  // Ночь 1=100, 2=150, 3=200, ..., 14=750, 15=1000
  awardNightXp: function(nightNum) {
    var total;
    if (nightNum >= 15) {
      total = 1000;
    } else {
      total = 100 + (nightNum - 1) * 50;
    }
    if (typeof addLog === 'function') {
      addLog('+' + total + ' XP за смену ' + nightNum, '');
    }
    this.addXp(total, 'смену ' + nightNum);
  },

  reset: function() {
    this.level = 1; this.xp = 0; this.totalXp = 0;
    this.skillPoints = 0;
    this.save();
    if (typeof updateLevelUI === 'function') updateLevelUI();
  }
};

// ── UI UPDATE ────────────────────────────────────────────────────────────────
function updateLevelUI() {
  var ls = LEVEL_SYSTEM;
  var pct = ls.progressPercent();
  var xpReq = ls.xpForCurrentLevel();

  // HUD level badge
  var lvlEl = document.getElementById('hud-level');
  if (lvlEl) lvlEl.textContent = 'УР.' + ls.level;

  // XP bar fill (HUD)
  var barEl = document.getElementById('xp-bar-fill');
  if (barEl) barEl.style.width = pct + '%';

  // XP text (HUD)
  var xpTxt = document.getElementById('xp-bar-txt');
  if (xpTxt) xpTxt.textContent = ls.xp + '/' + xpReq + ' XP';

  // Skill tree screen — level number
  var lvlBig = document.getElementById('ls-level-num');
  if (lvlBig) lvlBig.textContent = ls.level;

  // Skill tree screen — XP progress percent
  var lvlPct = document.getElementById('ls-xp-pct');
  if (lvlPct) lvlPct.textContent = pct + '/100';

  // Skill tree screen — XP bar
  var lvlBar = document.getElementById('ls-xp-bar');
  if (lvlBar) lvlBar.style.width = pct + '%';

  // Skill tree screen — XP numbers
  var lvlXp = document.getElementById('ls-xp-nums');
  if (lvlXp) lvlXp.textContent = ls.xp + ' / ' + xpReq + ' XP';

  // Skill tree screen — total XP
  var lvlTotal = document.getElementById('ls-total-xp');
  if (lvlTotal) lvlTotal.textContent = ls.totalXp + ' XP всего';

  // Skill tree screen — skill points
  var lvlSP = document.getElementById('ls-skill-pts');
  if (lvlSP) lvlSP.textContent = ls.skillPoints;

  // Stats screen — XP bar & text
  var statLevel = document.getElementById('stat-level');
  if (statLevel) statLevel.textContent = 'УР.' + ls.level;

  var statBar = document.getElementById('stat-xp-bar');
  if (statBar) statBar.style.width = pct + '%';

  var statXpTxt = document.getElementById('stat-xp-txt');
  if (statXpTxt) statXpTxt.textContent = ls.xp + '/' + xpReq + ' XP';

  // Sync skill tree points display
  if (typeof ST !== 'undefined') {
    ST.points = ls.skillPoints;
    if (typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();
  }

  // Max level indicator
  if (lvlEl && ls.level >= ls.MAX_LEVEL) {
    lvlEl.textContent = 'МАX';
    lvlEl.style.color = '#88cc44';
  }
}

// ── HOOK XP INTO GAME EVENTS ─────────────────────────────────────────────────
function awardXpForNight(nightNum) {
  LEVEL_SYSTEM.awardNightXp(nightNum);
}
