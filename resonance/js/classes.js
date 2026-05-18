/* resonance/js/classes.js
 * Система классов: Охранник / Военный / Учёный.
 *
 * Класс хранится в CFG.class (через saveCfg).
 * Каждый класс имеет ОТДЕЛЬНЫЙ прогресс: уровень, XP, навыки, очки, пройденные ночи.
 * Это реализовано через префикс ключей localStorage: resonance_levels:guard и т.п.
 *
 * Разблокировка: пройди 15 смен за охранника → разблокируется военный.
 *                 пройди 15 смен за военного → разблокируется учёный.
 */

var CLASS_DEFS = {
  guard: {
    id: 'guard',
    name: 'ОХРАННИК',
    icon: '🛡',
    short: 'Без бонусов и штрафов. Уникальные ветки открываются через прокачку.',
    desc: 'Пришёл на работу. Подписал бумагу. Никакого опыта, никаких связей. ' +
          'Обе уникальные ветки видны, но закрыты — откроются после полной прокачки ОХОТНИКА. ' +
          'Честный вариант без дополнительных козырей.',
    color: '#44aa33',
    requires: null
  },
  military: {
    id: 'military',
    name: 'ВОЕННЫЙ',
    icon: '🎖',
    short: 'Рассудок падает на 20% медленнее. ОРУЖЕЙНИК открыт с первой смены.',
    desc: 'Видел кое-что похуже. Паника накапливается медленнее — ' +
          'всё что давит на психику, работает на 20% слабее. ' +
          'Ветка ОРУЖЕЙНИКА доступна без условий. ' +
          'Лаборант недоступен без концовки Оружейника.',
    color: '#cc5500',
    requires: 'guard'
  },
  scientist: {
    id: 'scientist',
    name: 'УЧЁНЫЙ',
    icon: '🔬',
    short: 'Видит аномалии в кадрах: до 5 за смену, +25 XP. ЛАБОРАНТ открыт.',
    desc: 'Работал здесь раньше. Знает как выглядит норма — и замечает когда что-то не так. ' +
          'В кадрах камер прячутся аномалии: кликни пока не исчезла — +25 XP. ' +
          'До 5 за смену, 15 вариантов в ротации. ' +
          'Ветка ЛАБОРАНТА открыта со старта. ' +
          'Оружие не использует (ОБРЕЗ заблокирован). ' +
          'Оружейник недоступен без концовки Лаборанта.',
    color: '#88aaff',
    requires: 'military'
  }
};

var CLASS_SYSTEM = {
  // Текущий выбранный класс
  current: function(){
    return (typeof CFG !== 'undefined' && CFG.class) ? CFG.class : 'guard';
  },

  // Разблокированные классы
  unlocked: function(){
    if(typeof CFG === 'undefined' || !CFG.unlockedClasses) return ['guard'];
    return CFG.unlockedClasses.slice();
  },

  isUnlocked: function(classId){
    return this.unlocked().indexOf(classId) >= 0;
  },

  // Префикс ключей localStorage для текущего класса
  storageKey: function(base){
    return base + ':' + this.current();
  },

  // Переключиться на другой класс. Сначала сохранить текущий, потом загрузить новый.
  switchTo: function(classId){
    if(!this.isUnlocked(classId)) return false;
    if(this.current() === classId) return true;

    // 1) СОХРАНИТЬ прогресс ТЕКУЩЕГО класса (под старым CFG.class)
    if(typeof LEVEL_SYSTEM !== 'undefined') LEVEL_SYSTEM.save();
    if(typeof saveSkillData === 'function') saveSkillData();

    // 2) Поменять CFG.class — теперь шим localStorage будет адресовать новый класс
    CFG.class = classId;
    if(typeof saveCfg === 'function') saveCfg();

    // 3) ПРИНУДИТЕЛЬНО ОЧИСТИТЬ in-memory state, чтобы не было утечки из старого класса
    if(typeof ST !== 'undefined'){
      ST.unlockedSkills = {};
      ST.points = 0;
      ST.rebirths = 0;
      ST.nightsCompleted = 0;
      ST.activeEffects = {};
    }
    if(typeof LEVEL_SYSTEM !== 'undefined'){
      LEVEL_SYSTEM.level = 1;
      LEVEL_SYSTEM.xp = 0;
      LEVEL_SYSTEM.totalXp = 0;
      LEVEL_SYSTEM.skillPoints = 0;
    }

    // 4) ЗАГРУЗИТЬ прогресс НОВОГО класса (шим уже отдаёт ключи нового класса)
    if(typeof LEVEL_SYSTEM !== 'undefined') LEVEL_SYSTEM.load();
    if(typeof loadSkillData === 'function') loadSkillData();

    // 5) Перезагрузить пройденные ночи (per-класс через шим)
    if(typeof G !== 'undefined' && typeof loadSavedNights === 'function'){
      G.savedNights = loadSavedNights();
    }
    // 6) Sync ST.points с LEVEL_SYSTEM
    if(typeof ST !== 'undefined' && typeof LEVEL_SYSTEM !== 'undefined'){
      ST.points = LEVEL_SYSTEM.skillPoints;
    }

    // 7) ПРИНУДИТЕЛЬНО пересчитать UI (cam11, кнопки концовок, очки навыков, уровень)
    if(typeof recalcEffects === 'function') recalcEffects();
    if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
    if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
    if(typeof updateLevelUI === 'function') updateLevelUI();
    if(typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();

    return true;
  },

  // Применить разблокировку: вызывается когда пройдена 15-я ночь
  onNight15Won: function(){
    var cur = this.current();
    var unl = this.unlocked();
    var added = false;
    if(cur === 'guard' && unl.indexOf('military') < 0){
      unl.push('military');
      added = 'military';
    } else if(cur === 'military' && unl.indexOf('scientist') < 0){
      unl.push('scientist');
      added = 'scientist';
    }
    if(added){
      CFG.unlockedClasses = unl;
      if(typeof saveCfg === 'function') saveCfg();
      var def = CLASS_DEFS[added];
      if(typeof addLog === 'function')
        addLog('🔓 РАЗБЛОКИРОВАН КЛАСС: ' + def.name + '!', 'w');
      return added;
    }
    return null;
  },

  // Получить эффект класса (вызывается из applySkillEffects)
  applyEffects: function(fx){
    var c = this.current();
    fx.class_id = c;
    fx.class_office_discount_flat = 0;  // -1 за класс (плоское вычитание)
    fx.class_office_discount_pct = 0;
    fx.class_lab_discount = 0;
    fx.class_arms_discount_flat = 0;
    fx.class_block_shotgun = false;
    fx.class_lab_unlocked = false;       // у учёного Лаборант сразу куплен
    fx.class_arms_visible_always = false;  // у военного Оружейник виден всегда без условий
    fx.class_arms_unlock_cost = 10;        // стоимость самого узла Оружейника

    if(c === 'military'){
      fx.class_arms_visible_always = true;
      fx.class_arms_unlock_cost = 5;
      fx.class_sanity_resist = 0.20;
    } else if(c === 'scientist'){
      fx.class_lab_unlocked = true;
      fx.class_block_shotgun = true;
    }
  },

  // Применить стартовые очки. Вызывается ОДИН раз когда у класса 0 nightsCompleted.
  applyStartingBonus: function(){
    var c = this.current();
    var bonusPoints = 0;
    if(c === 'military')   bonusPoints = 3;
    else if(c === 'scientist') bonusPoints = 5;
    if(bonusPoints === 0) return;

    var key = 'resonance_class_bonus_applied:' + c;
    try {
      if(localStorage.getItem(key)) return;
      if(typeof LEVEL_SYSTEM !== 'undefined'){
        LEVEL_SYSTEM.skillPoints += bonusPoints;
        if(typeof ST !== 'undefined') ST.points = LEVEL_SYSTEM.skillPoints;
        LEVEL_SYSTEM.save();
      }
      // Учёному Лаборант разблокируется автоматически через getSkillLevel
      // (см. js/skills.js: getSkillLevel) — отдельной записи в ST.unlockedSkills не нужно
      localStorage.setItem(key, '1');
    } catch(e){}
  }
};

// ──────────────────────────────────────────────────────────────────────
// EXTEND existing systems to support per-class storage
// ──────────────────────────────────────────────────────────────────────

// Перехватываем резонанс-ключи, чтобы LEVEL_SYSTEM/skillData/savedNights
// работали с классом-префиксом БЕЗ изменения исходных функций.
(function(){
  if(typeof window === 'undefined') return;

  var origGetItem = localStorage.getItem.bind(localStorage);
  var origSetItem = localStorage.setItem.bind(localStorage);
  var origRemoveItem = localStorage.removeItem.bind(localStorage);

  // Ключи которые нужно переадресовать на per-класс варианты
  var PER_CLASS_KEYS = ['resonance_levels', 'resonance_skills', 'resonance_nights'];

  // ── Миграция: переносим старые сохранения (без префикса) на :guard ──
  // Делаем ОДИН раз, до того как шим начнёт перехватывать.
  // ВАЖНО: после миграции старый ключ удаляется, чтобы шим не перехватил его
  // повторно для другого класса (баг утечки lab_unlock между классами).
  PER_CLASS_KEYS.forEach(function(key){
    try {
      var oldVal = origGetItem(key);
      var newVal = origGetItem(key + ':guard');
      if(oldVal && !newVal){
        origSetItem(key + ':guard', oldVal);
        origRemoveItem(key);  // удаляем старый чтобы не утекал в другие классы
      } else if(oldVal && newVal){
        // если уже есть :guard — старый просто удаляем, он лишний
        origRemoveItem(key);
      }
    } catch(e){}
  });

  function rewriteKey(key){
    if(PER_CLASS_KEYS.indexOf(key) < 0) return key;
    var cls = (typeof CFG !== 'undefined' && CFG.class) ? CFG.class : 'guard';
    return key + ':' + cls;
  }

  localStorage.getItem = function(key){
    return origGetItem(rewriteKey(key));
  };
  localStorage.setItem = function(key, value){
    return origSetItem(rewriteKey(key), value);
  };
  localStorage.removeItem = function(key){
    return origRemoveItem(rewriteKey(key));
  };
})();

// ──────────────────────────────────────────────────────────────────────
// UI: экран выбора класса
// ──────────────────────────────────────────────────────────────────────
function openClassSelect(){
  renderClassSelect();
  showScreen('class-select-screen');
}

function renderClassSelect(){
  var box = document.getElementById('class-cards');
  if(!box) return;
  var cur = CLASS_SYSTEM.current();
  var unl = CLASS_SYSTEM.unlocked();

  // Стартовый фон — текущий класс
  var screen = document.getElementById('class-select-screen');
  if(screen) screen.setAttribute('data-preview', cur);

  var html = '';
  ['guard','military','scientist'].forEach(function(id, idx){
    var def = CLASS_DEFS[id];
    var isUnl = unl.indexOf(id) >= 0;
    var isCur = (cur === id);
    var cls = 'class-card' + (isUnl ? '' : ' locked') + (isCur ? ' current' : '');
    var onclick = isUnl ? (id === 'guard' ? 'openGuardBackstory()' : id === 'military' ? 'showInDevelopment()' : id === 'scientist' ? 'showScientistLore()' : 'selectClass(\''+id+'\'\')') : '';
    var onhover = 'previewClass(\''+id+'\')';
    html += '<div class="'+cls+'" style="--ci:'+idx+'" onclick="'+onclick+'" onmouseenter="'+onhover+'">';
    html += '<div class="class-card-inner">';
    if(isCur) html += '<div class="class-card-current-badge">ТЕКУЩИЙ</div>';
    html += '<div class="class-card-icon">'+def.icon+'</div>';
    html += '<div class="class-card-name">'+def.name+'</div>';
    html += '<div class="class-card-short">'+def.short+'</div>';
    if(isUnl){
      html += '<div class="class-card-desc">'+def.desc+'</div>';
    } else {
      var req = def.requires;
      var reqDef = CLASS_DEFS[req];
      var reqName = reqDef ? reqDef.name : req;
      html += '<div class="class-card-locked-msg">🔒 ПРОЙДИ ЗА ' + reqName + ' (15 СМЕН)</div>';
    }
    html += '</div>';
    html += '</div>';
  });
  box.innerHTML = html;
}

// Меняет фон экрана выбора класса при наведении на карточку
function previewClass(id){
  var screen = document.getElementById('class-select-screen');
  if(screen) screen.setAttribute('data-preview', id);
}

function selectClass(id){
  if(!CLASS_SYSTEM.isUnlocked(id)) return;
  try {
    if(CLASS_SYSTEM.current() !== id){
      CLASS_SYSTEM.switchTo(id);
      CLASS_SYSTEM.applyStartingBonus();
      if(typeof updateLevelUI === 'function') updateLevelUI();
      if(typeof updateSTPointsDisplay === 'function') updateSTPointsDisplay();
    }
    // Устанавливаем фон лобби под выбранный класс
    var lobby = document.getElementById('lobby-screen');
    if(lobby) lobby.setAttribute('data-class', id);
    showScreen('lobby-screen');
    if(typeof renderLobby === 'function') renderLobby();
  } catch(e){
    console.error('Class switch failed:', e);
    if(typeof addLog === 'function') addLog('Ошибка смены класса: '+e.message,'d');
    showScreen('title-screen');
  }
}

// ──────────────────────────────────────────────────────────────────────
// Guard backstory modal
// ──────────────────────────────────────────────────────────────────────
function openGuardBackstory() {
  var modal = document.getElementById('guard-backstory-modal');
  if (modal) {
    modal.classList.add('active');
    // Scroll to top each time
    var body = modal.querySelector('.guard-backstory-body');
    if (body) body.scrollTop = 0;
  }
}

function closeGuardBackstory() {
  var modal = document.getElementById('guard-backstory-modal');
  if (modal) modal.classList.remove('active');
}

function closeGuardBackstoryAndSelect() {
  closeGuardBackstory();
  selectClass('guard');
}

function showInDevelopment() {
  var modal = document.getElementById('in-dev-modal');
  if (modal) modal.classList.add('active');
}

function showScientistLore() {
  var modal = document.getElementById('scientist-lore-modal');
  if (modal) modal.classList.add('active');
}
