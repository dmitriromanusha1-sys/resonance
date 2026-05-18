/* resonance/js/tutorial.js — Night 1: hide tutorial | Night 2: door tutorial */

// ═══════════════════════════════════════════════════════
//  NIGHT 1 TUTORIAL — учим ПРИТАИТЬСЯ
// ═══════════════════════════════════════════════════════
var TUTORIAL = {
  active: false,
  step: 0,
  completed: false,
  bonusGiven: false,

  steps: [
    { id:'intro_1', title:'ОБЪЕКТ «РЕЗОНАНС»',
      text:'Объект в 40 км от города. Бывший промышленный комплекс — так написано в документах.\n\nТебя наняли охранником. Наличные. 15 смен. Вопросов не задавать.\n\nПрошлый охранник не вышел на связь. Тебе об этом не сказали — ты узнаешь сам.',
      target:null, position:'center', arrowDir:null },

    { id:'intro_2', title:'ПЕРВАЯ СМЕНА',
      text:'Комната охраны маленькая. Один монитор, четырнадцать камер.\n\nДвери нет — только ты, темнота и камеры. Если кто-то придёт к зданию, единственный выход — спрятаться.',
      target:null, position:'center', arrowDir:null },

    { id:'sanity', title:'РАССУДОК',
      text:'Шкала SAN — главный ресурс. Когда кто-то подходит близко — она падает.\n\nДошла до нуля — конец смены. Следи за ней.',
      target:'#hud-sanity', position:'below', arrowDir:'up', noHighlight:true },

    { id:'power', title:'ПИТАНИЕ',
      text:'Шкала PWR — энергия объекта. Питает камеры.\n\nЕсли энергия кончится — останешься в темноте.',
      target:'#hud-power', position:'below', arrowDir:'up', noHighlight:true },

    { id:'cameras', title:'КАМЕРЫ',
      text:'Монитор — твои глаза.\n\n← → — переключение между камерами.\n\n[1] — открыть обзорную карту объекта.\n\nНа обзорной карте маркеры кликабельны — нажми на любой и попадёшь прямо на эту камеру.',
      target:'#monitor-click', position:'right', arrowDir:'left', noHighlight:true },

    { id:'hud_toggle', title:'СКРЫТЬ ИНТЕРФЕЙС',
      text:'Клавиша [Alt] — скрыть или показать весь интерфейс.\n\nПолезно когда хочешь видеть только камеры без лишнего. Нажми ещё раз — интерфейс вернётся.',
      target:null, position:'center', arrowDir:null },

    { id:'hide_intro', title:'ПРИТАИТЬСЯ [Q]',
      text:'У тебя нет двери. Если Сталкер подойдёт — единственный шанс выжить:\n\n🫥 Нажми кнопку ПРИТАИТЬСЯ или клавишу [Q].\n\nТы спрячешься в темноте. НПС может уйти... или найти тебя.',
      target:'#hide-btn', position:'right', arrowDir:'left' },

    { id:'hide_practice', title:'ПОПРОБУЙ',
      text:'Нажми [Q] или кнопку ПРИТАИТЬСЯ — войди в режим укрытия.\n\nЗатем нажми ещё раз чтобы выйти. Запомни — это твоя главная защита на первой смене.',
      target:'#hide-btn', position:'right', arrowDir:'left',
      waitForHide: true },

    { id:'flash', title:'ФОНАРИК [F]',
      text:'Отпугивает существо когда оно близко к зданию — замедлишь его.\n\nБатарея не бесконечная. Зря не жги.',
      target:'#flash-btn', position:'right', arrowDir:'left', noHighlight:true },

    { id:'map', title:'КАРТА [SHIFT]',
      text:'SHIFT — обзорная карта объекта. Три зоны: здание, периметр, задний двор.\n\nТыкни в зону — увидишь камеры этого участка.',
      target:null, position:'center', arrowDir:null },

    { id:'skills_open', title:'НАВЫКИ',
      text:'За каждую выжитую смену ты получаешь очки навыков.\n\nОткрой дерево навыков — одно очко уже начислено.',
      target:'.skill-tree-open-btn', position:'above', arrowDir:'down',
      actionLabel:'🌿 ОТКРЫТЬ НАВЫКИ', action:'openSkillsStep' },

    { id:'skills_personal', title:'ВКЛАДКА ЛИЧНЫЕ',
      text:'Перейди во вкладку ЛИЧНЫЕ.\n\nЗдесь — твои личные способности охранника.',
      target:null, position:'center', arrowDir:null,
      requiresSkillTree:true, waitForTab:'personal' },

    { id:'skills_coffee', title:'КУПИ КОФЕ',
      text:'Найди навык КОФЕ ☕ и купи его.\n\nКофе увеличивает эффект фонарика — существо будет оглушено дольше.',
      target:null, position:'center', arrowDir:null,
      requiresSkillTree:true, waitForSkill:'coffee' },

    { id:'skills_close', title:'ГОТОВО',
      text:'Навык куплен. Закрой дерево навыков.',
      target:null, position:'center', arrowDir:null,
      actionLabel:'✕ ЗАКРЫТЬ НАВЫКИ', action:'closeSkillsStep' },

    { id:'finale', title:'СМЕНА НАЧИНАЕТСЯ',
      text:'Камеры. Рассудок. Притаиться.\n\nУдачи.',
      target:null, position:'center', arrowDir:null },
  ],

  // ─── Сохранение ────────────────────────────────────────────────────────────
  load: function() {
    try { this.completed = !!localStorage.getItem('resonance_tutorial_done'); } catch(e) {}
  },
  markDone: function() {
    this.completed = true;
    try { localStorage.setItem('resonance_tutorial_done','1'); } catch(e) {}
  },
  reset: function() {
    this.completed = false; this.bonusGiven = false;
    try { localStorage.removeItem('resonance_tutorial_done'); } catch(e) {}
  },

  // ─── Стартовое очко ────────────────────────────────────────────────────────
  giveStartingBonus: function() {
    if (this.bonusGiven) return;
    this.bonusGiven = true;
    if (typeof LEVEL_SYSTEM !== 'undefined') {
      LEVEL_SYSTEM.skillPoints = (LEVEL_SYSTEM.skillPoints||0) + 1;
      LEVEL_SYSTEM.save();
      if (typeof ST !== 'undefined') ST.points = LEVEL_SYSTEM.skillPoints;
      if (typeof updateLevelUI === 'function') updateLevelUI();
    } else if (typeof ST !== 'undefined') {
      ST.points = (ST.points||0) + 1;
    }
  },

  // ─── Запуск / финиш ────────────────────────────────────────────────────────
  start: function() {
    this.active = true; this.step = 0;
    this.giveStartingBonus();
    this._render();
  },

  finish: function() {
    this.active = false;
    this.markDone();
    this._clearSpotlight();
    var overlay = document.getElementById('tutorial-overlay');
    if (overlay) { overlay.classList.remove('active'); overlay.innerHTML = ''; }
  },

  // ─── Навигация ─────────────────────────────────────────────────────────────
  next: function() {
    var s = this.steps[this.step];
    if (s.waitForHide && !this._hideUsed) { this._shake(); return; }
    if (s.waitForSkill) {
      var lvl = (typeof getSkillLevel === 'function') ? getSkillLevel(s.waitForSkill) : 0;
      if (lvl < 1) { this._shake(); return; }
    }
    if (s.waitForTab && !this._tabReached) { this._shake(); return; }
    this._clearSpotlight();
    this.step++;
    if (this.step >= this.steps.length) { this.finish(); return; }
    this._render();
  },

  prev: function() {
    var s = this.steps[this.step];
    if (this.step <= 0) return;
    this._clearSpotlight();
    this.step--;
    this._render();
  },

  skip: function() {
    if (!confirm('Пропустить обучение?')) return;
    this.finish();
  },

  // ─── Хук: игрок нажал притаиться ───────────────────────────────────────────
  _hideUsed: false,
  onHideToggled: function() {
    if (!this.active) return;
    var s = this.steps[this.step];
    if (s && s.waitForHide && !this._hideUsed) {
      this._hideUsed = true;
      // Обновляем карточку — разблокируем кнопку
      var card = document.getElementById('tut-card');
      if (card) {
        var btn = card.querySelector('.tut-btn-next');
        if (btn) {
          btn.style.opacity = '1';
          btn.style.pointerEvents = '';
          btn.textContent = 'ДАЛЕЕ →';
        }
      }
      addLog && addLog('🫥 Отлично! Ты притаился. Нажми ещё раз чтобы выйти, затем продолжи обучение.', '');
    }
  },

  // ─── Рендер ────────────────────────────────────────────────────────────────
  _render: function() {
    var s = this.steps[this.step];
    var overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    this._clearSpotlight();

    var targetEl = s.target ? document.querySelector(s.target) : null;

    if (targetEl && !s.noHighlight) {
      this._applySpotlight(targetEl, s.arrowDir);
    } else if (targetEl && s.arrowDir) {
      this._applyArrowOnly(targetEl, s.arrowDir);
    }

    var isFirst = this.step === 0;
    var isLast  = this.step === this.steps.length - 1;
    var prog    = Math.round(((this.step + 1) / this.steps.length) * 100);
    var needHide  = s.waitForHide && !this._hideUsed;
    var needSkill = s.waitForSkill && (typeof getSkillLevel==='function' ? getSkillLevel(s.waitForSkill) < 1 : true);
    var needTab   = s.waitForTab && !this._tabReached;
    var blocked   = needHide || needSkill || needTab;

    var btns = '';
    if (!isFirst && !s.requiresSkillTree && s.id !== 'skills_close') {
      btns += '<button class="tut-btn tut-btn-prev" onclick="TUTORIAL.prev()">← НАЗАД</button>';
    }
    if (s.action) {
      btns += '<button class="tut-btn tut-btn-action" onclick="TUTORIAL.' + s.action + '()">' + s.actionLabel + '</button>';
    } else if (!isLast) {
      btns += '<button class="tut-btn tut-btn-skip" onclick="TUTORIAL.skip()">ПРОПУСТИТЬ</button>';
      var nextStyle = blocked ? ' style="opacity:0.4;pointer-events:none"' : '';
      btns += '<button class="tut-btn tut-btn-next"' + nextStyle + ' onclick="TUTORIAL.next()">ДАЛЕЕ →</button>';
    }
    if (isLast) {
      btns += '<button class="tut-btn tut-btn-finish" onclick="TUTORIAL.finish()">НАЧАТЬ ИГРУ ▶</button>';
    }

    var cardPos = this._calcCardPos(targetEl, s.position, s.arrowDir);

    var html = '<div class="tut-card" id="tut-card" style="' + cardPos + '">'
      + '<div class="tut-progress-bar"><div class="tut-progress-fill" style="width:' + prog + '%"></div></div>'
      + '<div class="tut-step-num">ШАГ ' + (this.step + 1) + ' / ' + this.steps.length + '</div>'
      + '<div class="tut-title">' + s.title + '</div>'
      + '<div class="tut-text">' + s.text.replace(/\n/g, '<br>') + '</div>'
      + (needHide ? '<div class="tut-hint">👆 Сначала нажми кнопку ПРИТАИТЬСЯ</div>' : '')
      + '<div class="tut-buttons">' + btns + '</div>'
      + '</div>';

    overlay.innerHTML = html;
    overlay.classList.add('active');
    requestAnimationFrame(function() {
      var card = document.getElementById('tut-card');
      if (card) card.classList.add('tut-card-in');
    });
  },

  // ─── Spotlight ─────────────────────────────────────────────────────────────
  _applySpotlight: function(el, arrowDir) {
    el.classList.add('tut-highlighted');
    if (arrowDir) this._placeArrow(el, arrowDir);
  },
  _applyArrowOnly: function(el, arrowDir) {
    this._placeArrow(el, arrowDir);
  },
  _placeArrow: function(el, arrowDir) {
    var rect = el.getBoundingClientRect();
    var arrow = document.createElement('div');
    arrow.id = 'tut-arrow-el';
    arrow.className = 'tut-arrow tut-arrow-' + arrowDir;
    var aw = 40, ah = 40, top, left;
    if (arrowDir === 'down')       { top = rect.top - ah - 4; left = rect.left + rect.width/2 - aw/2; }
    else if (arrowDir === 'up')    { top = rect.bottom + 4;   left = rect.left + rect.width/2 - aw/2; }
    else if (arrowDir === 'left')  { top = rect.top + rect.height/2 - ah/2; left = rect.right + 4; }
    else if (arrowDir === 'right') { top = rect.top + rect.height/2 - ah/2; left = rect.left - aw - 4; }
    arrow.style.cssText = 'position:fixed;top:' + top + 'px;left:' + left + 'px;z-index:9996;pointer-events:none;';
    document.body.appendChild(arrow);
  },
  _clearSpotlight: function() {
    document.querySelectorAll('.tut-highlighted').forEach(function(el) {
      el.classList.remove('tut-highlighted');
    });
    var arrow = document.getElementById('tut-arrow-el');
    if (arrow) arrow.remove();
  },
  _calcCardPos: function(el, position, arrowDir) {
    if (!el || position === 'center') {
      return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);';
    }
    var rect = el.getBoundingClientRect();
    var margin = 16;
    var vw = window.innerWidth, vh = window.innerHeight;
    var cw = Math.min(360, vw * 0.88);
    if (position === 'above') {
      var left = Math.max(margin, Math.min(rect.left + rect.width/2 - cw/2, vw - cw - margin));
      return 'position:fixed;bottom:' + (vh - rect.top + 14) + 'px;left:' + left + 'px;width:' + cw + 'px;';
    }
    if (position === 'below') {
      var left2 = Math.max(margin, Math.min(rect.left + rect.width/2 - cw/2, vw - cw - margin));
      return 'position:fixed;top:' + (rect.bottom + 14) + 'px;left:' + left2 + 'px;width:' + cw + 'px;';
    }
    if (position === 'right') {
      var top = Math.max(margin, Math.min(rect.top, vh - 280 - margin));
      var l = rect.right + 14;
      if (l + cw > vw - margin) l = rect.left - cw - 14;
      return 'position:fixed;top:' + top + 'px;left:' + l + 'px;width:' + cw + 'px;';
    }
    if (position === 'left') {
      var top2 = Math.max(margin, Math.min(rect.top, vh - 280 - margin));
      return 'position:fixed;top:' + top2 + 'px;right:' + (vw - rect.left + 14) + 'px;width:' + cw + 'px;';
    }
    return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);';
  },
  _shake: function() {
    var card = document.getElementById('tut-card');
    if (!card) return;
    card.classList.add('tut-shake');
    setTimeout(function() { if (card) card.classList.remove('tut-shake'); }, 500);
  },

  // ─── Навыки ────────────────────────────────────────────────────────────────
  _tabReached: false,

  openSkillsStep: function() {
    if (typeof openSkillTree === 'function') openSkillTree();
    var self = TUTORIAL;
    self._clearSpotlight();
    self.step = self._findStep('skills_personal');
    setTimeout(function() { self._render(); }, 400);
  },

  closeSkillsStep: function() {
    if (typeof closeSkillTree === 'function') closeSkillTree();
    var self = TUTORIAL;
    self._clearSpotlight();
    self.step = self._findStep('finale');
    setTimeout(function() { self._render(); }, 350);
  },

  onTabSwitched: function(tabId) {
    if (!this.active) return;
    var s = this.steps[this.step];
    if (s && s.waitForTab === tabId && !this._tabReached) {
      this._tabReached = true;
      var self = this;
      setTimeout(function() {
        self._clearSpotlight();
        self.step = self._findStep('skills_coffee');
        self._render();
      }, 300);
    }
  },

  onSkillBought: function(skillId) {
    if (!this.active) return;
    var s = this.steps[this.step];
    if (s && s.waitForSkill === skillId) {
      var self = this;
      setTimeout(function() {
        self._clearSpotlight();
        self.step = self._findStep('skills_close');
        self._render();
      }, 500);
    }
  },

  _findStep: function(id) {
    for (var i = 0; i < this.steps.length; i++) {
      if (this.steps[i].id === id) return i;
    }
    return this.step;
  },

  showSkillNudge: function() {},
  closeSkillNudge: function() {},
  openSkillsFromNudge: function() {},
};


// ═══════════════════════════════════════════════════════
//  NIGHT 2 TUTORIAL — removed
// ═══════════════════════════════════════════════════════
var TUTORIAL_NIGHT2 = { active:false, completed:true, bonusGiven:false,
  load:function(){}, markDone:function(){}, reset:function(){}, start:function(){}, finish:function(){}, onSkillBought:function(){},
}; var _TUTORIAL_NIGHT2_UNUSED = {
  active: false,
  step: 0,
  completed: false,
  bonusGiven: false,

  steps: [
    { id:'n2_intro', title:'ВТОРАЯ СМЕНА',
      text:'Ты вернулся. Объект всё ещё активен.\n\nКаждую смену ты получаешь очки навыков — вкладывай их в развитие.',
      target:null, position:'center', arrowDir:null },

    { id:'n2_skills', title:'ДЕРЕВО НАВЫКОВ',
      text:'Открой дерево навыков и улучши что считаешь нужным.\n\nОдно очко навыка уже начислено.',
      target:'.skill-tree-open-btn', position:'above', arrowDir:'down',
      actionLabel:'🌿 ОТКРЫТЬ НАВЫКИ', action:'openSkillsStep' },

    { id:'n2_stalker_warn', title:'СТАЛКЕР ВЕРНЁТСЯ',
      text:'Сегодня он придёт снова.\n\nСмотри за камерами. Следи за рассудком.',
      target:null, position:'center', arrowDir:null },

    { id:'n2_finale', title:'СМЕНА НАЧИНАЕТСЯ',
      text:'Камеры. Навыки. Рассудок.\n\nТы готов.',
      target:null, position:'center', arrowDir:null },
  ],

  load: function() {
    try { this.completed = !!localStorage.getItem('resonance_tutorial_night2_done'); } catch(e) {}
  },
  markDone: function() {
    this.completed = true;
    try { localStorage.setItem('resonance_tutorial_night2_done','1'); } catch(e) {}
  },
  reset: function() {
    this.completed = false; this.bonusGiven = false;
    try { localStorage.removeItem('resonance_tutorial_night2_done'); } catch(e) {}
  },

  giveStartingBonus: function() {
    if (this.bonusGiven) return;
    this.bonusGiven = true;
    if (typeof LEVEL_SYSTEM !== 'undefined') {
      LEVEL_SYSTEM.skillPoints = (LEVEL_SYSTEM.skillPoints||0) + 1;
      LEVEL_SYSTEM.save();
      if (typeof ST !== 'undefined') ST.points = LEVEL_SYSTEM.skillPoints;
      if (typeof updateLevelUI === 'function') updateLevelUI();
    } else if (typeof ST !== 'undefined') {
      ST.points = (ST.points||0) + 1;
    }
  },

  start: function() {
    this.active = true; this.step = 0;
    this.giveStartingBonus();
    this._render();
  },

  finish: function() {
    this.active = false;
    this.markDone();
    this._clearSpotlight();
    if (typeof closeSkillTree === 'function') closeSkillTree();
    var overlay = document.getElementById('tutorial-overlay');
    if (overlay) { overlay.classList.remove('active'); overlay.innerHTML = ''; }
  },

  next: function() {
    var s = this.steps[this.step];
    if (s.waitForSkill) {
      var lvl = (typeof getSkillLevel === 'function') ? getSkillLevel(s.waitForSkill) : 0;
      if (lvl < 1) { this._shake(); return; }
    }
    this._clearSpotlight();
    this.step++;
    if (this.step >= this.steps.length) { this.finish(); return; }
    this._render();
  },

  prev: function() {
    var s = this.steps[this.step];
    if (this.step <= 0 || s.requiresSkillTree || s.id === 'n2_skills_close') return;
    this._clearSpotlight();
    this.step--;
    this._render();
  },

  skip: function() {
    if (!confirm('Пропустить обучение?')) return;
    this.finish();
  },

  openSkillsStep: function() {
    if (typeof openSkillTree === 'function') openSkillTree();
    var self = TUTORIAL_NIGHT2;
    self._clearSpotlight();
    self.step = self._findStep('n2_stalker_warn');
    setTimeout(function() { self._render(); }, 400);
  },

  closeSkillsStep: function() {
    var overlay = document.getElementById('tutorial-overlay');
    if (overlay) { overlay.classList.remove('active'); overlay.innerHTML = ''; }
    this._clearSpotlight();
    if (typeof closeSkillTree === 'function') closeSkillTree();
    var self = TUTORIAL_NIGHT2;
    self.step = self._findStep('n2_stalker_warn');
    setTimeout(function() { self._render(); }, 350);
  },

  onSkillBought: function(skillId) {
    if (!this.active) return;
    var s = this.steps[this.step];
    if (s && s.waitForSkill === skillId) {
      var self = this;
      setTimeout(function() {
        self._clearSpotlight();
        self.step = self._findStep('n2_skills_close');
        self._render();
      }, 500);
    }
  },

  _findStep: function(id) {
    for (var i = 0; i < this.steps.length; i++) {
      if (this.steps[i].id === id) return i;
    }
    return this.step;
  },

  _render: function() {
    var s = this.steps[this.step];
    var overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    this._clearSpotlight();

    var targetEl = null;
    if (s.target) {
      targetEl = document.querySelector(s.target);
    }

    if (targetEl && !s.noHighlight) {
      this._applySpotlight(targetEl, s.arrowDir);
    } else if (targetEl && s.arrowDir) {
      this._applyArrowOnly(targetEl, s.arrowDir);
    }

    var isFirst = this.step === 0;
    var isLast  = this.step === this.steps.length - 1;
    var prog    = Math.round(((this.step + 1) / this.steps.length) * 100);

    var btns = '';
    if (!isFirst && !s.requiresSkillTree && s.id !== 'n2_skills_close') {
      btns += '<button class="tut-btn tut-btn-prev" onclick="TUTORIAL_NIGHT2.prev()">← НАЗАД</button>';
    }
    if (!isLast && !s.action && !s.waitForSkill) {
      btns += '<button class="tut-btn tut-btn-skip" onclick="TUTORIAL_NIGHT2.skip()">ПРОПУСТИТЬ</button>';
      btns += '<button class="tut-btn tut-btn-next" onclick="TUTORIAL_NIGHT2.next()">ДАЛЕЕ →</button>';
    }
    if (s.action) {
      btns += '<button class="tut-btn tut-btn-action" onclick="TUTORIAL_NIGHT2.' + s.action + '()">' + s.actionLabel + '</button>';
    }
    if (s.waitForSkill) {
      btns += '<button class="tut-btn tut-btn-skip" onclick="TUTORIAL_NIGHT2.skip()">ПРОПУСТИТЬ</button>';
      btns += '<button class="tut-btn tut-btn-next" onclick="TUTORIAL_NIGHT2.next()">ПРОДОЛЖИТЬ →</button>';
    }
    if (isLast) {
      btns += '<button class="tut-btn tut-btn-finish" onclick="TUTORIAL_NIGHT2.finish()">НАЧАТЬ СМЕНУ ▶</button>';
    }

    var cardPos = this._calcCardPos(targetEl, s.position, s.arrowDir);

    var html = '<div class="tut-card" id="tut-card" style="' + cardPos + '">'
      + '<div class="tut-progress-bar"><div class="tut-progress-fill" style="width:' + prog + '%"></div></div>'
      + '<div class="tut-step-num">ШАГ ' + (this.step + 1) + ' / ' + this.steps.length + '</div>'
      + '<div class="tut-title">' + s.title + '</div>'
      + '<div class="tut-text">' + s.text.replace(/\n/g, '<br>') + '</div>'
      + '<div class="tut-buttons">' + btns + '</div>'
      + '</div>';

    overlay.innerHTML = html;
    overlay.classList.add('active');
    requestAnimationFrame(function() {
      var card = document.getElementById('tut-card');
      if (card) card.classList.add('tut-card-in');
    });
  },

  _applySpotlight: function(el, arrowDir) {
    el.classList.add('tut-highlighted');
    if (arrowDir) this._placeArrow(el, arrowDir);
  },
  _applyArrowOnly: function(el, arrowDir) {
    this._placeArrow(el, arrowDir);
  },
  _placeArrow: function(el, arrowDir) {
    var rect = el.getBoundingClientRect();
    var arrow = document.createElement('div');
    arrow.id = 'tut-arrow-el';
    arrow.className = 'tut-arrow tut-arrow-' + arrowDir;
    var aw = 40, ah = 40, top, left;
    if (arrowDir === 'down')       { top = rect.top - ah - 4; left = rect.left + rect.width/2 - aw/2; }
    else if (arrowDir === 'up')    { top = rect.bottom + 4;   left = rect.left + rect.width/2 - aw/2; }
    else if (arrowDir === 'left')  { top = rect.top + rect.height/2 - ah/2; left = rect.right + 4; }
    else if (arrowDir === 'right') { top = rect.top + rect.height/2 - ah/2; left = rect.left - aw - 4; }
    arrow.style.cssText = 'position:fixed;top:' + top + 'px;left:' + left + 'px;z-index:9996;pointer-events:none;';
    document.body.appendChild(arrow);
  },
  _clearSpotlight: function() {
    document.querySelectorAll('.tut-highlighted').forEach(function(el) {
      el.classList.remove('tut-highlighted');
    });
    var arrow = document.getElementById('tut-arrow-el');
    if (arrow) arrow.remove();
  },
  _calcCardPos: function(el, position, arrowDir) {
    if (!el || position === 'center') {
      return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);';
    }
    var rect = el.getBoundingClientRect();
    var margin = 16;
    var vw = window.innerWidth, vh = window.innerHeight;
    var cw = Math.min(360, vw * 0.88);
    if (position === 'above') {
      var left = Math.max(margin, Math.min(rect.left + rect.width/2 - cw/2, vw - cw - margin));
      return 'position:fixed;bottom:' + (vh - rect.top + 14) + 'px;left:' + left + 'px;width:' + cw + 'px;';
    }
    if (position === 'below') {
      var left2 = Math.max(margin, Math.min(rect.left + rect.width/2 - cw/2, vw - cw - margin));
      return 'position:fixed;top:' + (rect.bottom + 14) + 'px;left:' + left2 + 'px;width:' + cw + 'px;';
    }
    if (position === 'right') {
      var top = Math.max(margin, Math.min(rect.top, vh - 280 - margin));
      var l = rect.right + 14;
      if (l + cw > vw - margin) l = rect.left - cw - 14;
      return 'position:fixed;top:' + top + 'px;left:' + l + 'px;width:' + cw + 'px;';
    }
    if (position === 'left') {
      var top2 = Math.max(margin, Math.min(rect.top, vh - 280 - margin));
      return 'position:fixed;top:' + top2 + 'px;right:' + (vw - rect.left + 14) + 'px;width:' + cw + 'px;';
    }
    return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);';
  },
  _shake: function() {
    var card = document.getElementById('tut-card');
    if (!card) return;
    card.classList.add('tut-shake');
    setTimeout(function() { if (card) card.classList.remove('tut-shake'); }, 500);
  },
}; _TUTORIAL_NIGHT2_UNUSED = null;


// ═══════════════════════════════════════════════════════
//  Точки входа
// ═══════════════════════════════════════════════════════
function checkTutorial() {
  TUTORIAL.load();
  if (!TUTORIAL.completed) TUTORIAL.start();
}

function checkTutorialNight2() {
  TUTORIAL_NIGHT2.load();
  if (!TUTORIAL_NIGHT2.completed) TUTORIAL_NIGHT2.start();
}

function startTutorialFromLobby() {
  TUTORIAL.completed = false;
  TUTORIAL.bonusGiven = false;
  TUTORIAL_NIGHT2.completed = false;
  TUTORIAL_NIGHT2.bonusGiven = false;
  try {
    localStorage.removeItem('resonance_tutorial_done');
    localStorage.removeItem('resonance_tutorial_night2_done');
  } catch(e) {}
  startNight(1);
}
