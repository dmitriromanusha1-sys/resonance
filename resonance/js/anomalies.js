/* resonance/js/anomalies.js — Anomaly system for Scientist class */

var ANOMALY_SYSTEM = {

  // 15 вариантов аномалий
  POOL: [
    { id:'shadow_hand',    label:'Тень руки',         icon:'🖐',  css:'anom-shadow-hand',    desc:'Чья-то рука в углу кадра.' },
    { id:'static_face',   label:'Лицо в помехах',     icon:'📺',  css:'anom-static-face',    desc:'Лицо проступает сквозь помехи.' },
    { id:'red_eye',       label:'Красный глаз',        icon:'👁',  css:'anom-red-eye',        desc:'Одиночный красный зрачок.' },
    { id:'wire_move',     label:'Провод двигается',    icon:'〰',  css:'anom-wire-move',      desc:'Кабель на стене живёт своей жизнью.' },
    { id:'door_ajar',     label:'Лишняя дверь',        icon:'🚪',  css:'anom-door-ajar',      desc:'Двери здесь быть не должно.' },
    { id:'mirror_offset', label:'Смещение зеркала',    icon:'🪞',  css:'anom-mirror-offset',  desc:'Отражение не совпадает с оригиналом.' },
    { id:'float_chair',   label:'Парящий стул',        icon:'🪑',  css:'anom-float-chair',    desc:'Стул висит в воздухе.' },
    { id:'writing_wall',  label:'Надпись на стене',    icon:'✍',  css:'anom-writing-wall',   desc:'Символы появились на стене.' },
    { id:'second_moon',   label:'Двойная луна',         icon:'🌕',  css:'anom-second-moon',    desc:'В окне два лунных диска.' },
    { id:'white_figure',  label:'Белая фигура',         icon:'👤',  css:'anom-white-figure',   desc:'Неподвижный силуэт там, где никого нет.' },
    { id:'inverted_room', label:'Перевёрнутый кадр',   icon:'🔄',  css:'anom-inverted-room',  desc:'Потолок внизу, пол вверху.' },
    { id:'blood_drip',    label:'Капли с потолка',      icon:'💧',  css:'anom-blood-drip',     desc:'Что-то капает сверху.' },
    { id:'clocks_stop',   label:'Часы стоят',           icon:'🕐',  css:'anom-clocks-stop',    desc:'Все часы в кадре показывают 3:00.' },
    { id:'extra_window',  label:'Лишнее окно',          icon:'⬛',  css:'anom-extra-window',   desc:'Окно в стене, которая снаружи — сплошная.' },
    { id:'eyes_ceiling',  label:'Глаза на потолке',     icon:'👀',  css:'anom-eyes-ceiling',   desc:'Пары глаз смотрят сверху.' },
  ],

  // Состояние смены
  active: [],        // [{id, el, found}] текущие активные аномалии
  found: 0,          // найдено за смену
  maxPerShift: 5,
  _spawnTimer: null,
  _spawnIntervalMin: 45000,  // мин 45 сек между появлениями
  _spawnIntervalMax: 90000,  // макс 90 сек

  // ─── Инициализация новой смены ───────────────────────────────────────────
  init: function() {
    this.cleanup();
    this.active    = [];
    this.found     = 0;
    this._shiftPool = [];
    var isScientist = typeof ST !== 'undefined' &&
                      ST.activeEffects &&
                      ST.activeEffects.class_id === 'scientist';
    if (!isScientist) return;

    // Перетасовываем пул, берём maxPerShift аномалий для этой смены
    this._shiftPool = this._shuffle(this.POOL.slice()).slice(0, this.maxPerShift);
    this._scheduleNext();
  },

  // ─── Расписание следующего появления ─────────────────────────────────────
  _scheduleNext: function() {
    if (this.found + this.active.length >= this.maxPerShift) return;
    var self = this;
    var delay = RNG.range(this._spawnIntervalMin, this._spawnIntervalMax);
    this._spawnTimer = setTimeout(function() {
      if (typeof G !== 'undefined' && G.gameActive) self._spawn();
    }, delay);
  },

  // ─── Появление аномалии ──────────────────────────────────────────────────
  _spawn: function() {
    var remaining = this._shiftPool.filter(function(a) {
      return !ANOMALY_SYSTEM.active.find(function(x){ return x.id===a.id; });
    });
    if (!remaining.length) return;

    var def = RNG.pick(remaining);

    // Выбираем случайную камеру из тех, что в DOM
    var camViews = document.querySelectorAll('.room-view[id^="room-cam-"]');
    if (!camViews.length) { this._scheduleNext(); return; }
    var camView = RNG.pick(Array.from(camViews));
    var camId   = camView.id.replace('room-', '');

    // Создаём элемент
    var el = document.createElement('div');
    el.className = 'anomaly-spot ' + def.css;
    el.id = 'anom-' + def.id;
    el.title = def.desc;
    el.innerHTML = '<span class="anom-icon">' + def.icon + '</span>';

    // Случайная позиция внутри кадра (20–80% чтобы не уходить за край)
    el.style.left = RNG.range(20, 80) + '%';
    el.style.top  = RNG.range(20, 75) + '%';

    var self = this;
    el.onclick = function(e) {
      e.stopPropagation();
      self._collect(def.id, el);
    };

    camView.appendChild(el);

    // Анимация появления
    requestAnimationFrame(function() { el.classList.add('anom-visible'); });

    this.active.push({ id: def.id, el: el, camId: camId });

    // Аномалия исчезает сама через 25–40 сек если не нашли
    var timeoutMs = RNG.range(25000, 40000);
    el._autoRemove = setTimeout(function() {
      self._expire(def.id);
    }, timeoutMs);

    addLog('📡 Зафиксирована аномалия в кадре. Изучи камеры.', 'w');
    this._scheduleNext();
  },

  // ─── Игрок нашёл аномалию ────────────────────────────────────────────────
  _collect: function(id, el) {
    var idx = this.active.findIndex(function(a){ return a.id === id; });
    if (idx === -1) return;
    var entry = this.active.splice(idx, 1)[0];

    clearTimeout(el._autoRemove);
    el.classList.add('anom-collected');
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 600);

    this.found++;

    if (typeof LEVEL_SYSTEM !== 'undefined') {
      LEVEL_SYSTEM.addXp(LEVEL_SYSTEM.XP_REWARDS.anomaly);
      if (typeof updateLevelUI === 'function') updateLevelUI();
    }

    // Найдена подсказка
    var def = this.POOL.find(function(a){ return a.id === id; });
    var label = def ? def.label : 'аномалия';
    addLog('🔬 Аномалия «' + label + '» задокументирована! +' + LEVEL_SYSTEM.XP_REWARDS.anomaly + ' XP (' + this.found + '/' + this.maxPerShift + ')', '');

    if (typeof SFX !== 'undefined' && SFX.skillBuy) SFX.skillBuy();
  },

  // ─── Аномалия истекла (не нашли) ─────────────────────────────────────────
  _expire: function(id) {
    var idx = this.active.findIndex(function(a){ return a.id === id; });
    if (idx === -1) return;
    var entry = this.active.splice(idx, 1)[0];
    if (entry.el) {
      entry.el.classList.remove('anom-visible');
      setTimeout(function() {
        if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
      }, 500);
    }
  },

  // ─── Очистка ─────────────────────────────────────────────────────────────
  cleanup: function() {
    clearTimeout(this._spawnTimer);
    this._spawnTimer = null;
    this.active.forEach(function(a) {
      if (a.el) {
        clearTimeout(a.el._autoRemove);
        a.el._autoRemove = null;
        if (a.el.parentNode) a.el.parentNode.removeChild(a.el);
      }
    });
    document.querySelectorAll('.anomaly-spot').forEach(function(el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  },

  // ─── Утилиты ─────────────────────────────────────────────────────────────
  _shuffle: function(arr) {
    return RNG.shuffle(arr);
  },
};
