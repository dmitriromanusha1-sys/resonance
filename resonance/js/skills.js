/* resonance/js/skills.js */

// ═══ SKILL TREE ═══
/* ═══════════════════════════════════════════════════════
   SKILL TREE SYSTEM — v6.3
   ═══════════════════════════════════════════════════════

   3 ВЕТКИ:
   1. ЭЛЕКТРОНИКА  — камеры, свет, питание
   2. ОХОТНИК      — оружие, ловушки, сигнализация
   3. ОФИС         — личные навыки, обустройство комнаты

   Система:
   - 1 ребирт = 1 очко навыков
   - Очки накапливаются
   - Навыки сохраняются между ребиртами (если не сбросить)
   - Ребирт сбрасывает ночи но НЕ навыки (навыки — перманентно)
*/

// ─── SKILL DEFINITIONS ───────────────────────────────────────────────────────
var SKILL_TREES = {

  // ══════════════════════════════════════════════════════
  // 1. ОФИС — 4 ветки: основная, антенна, датчик, дверь
  // ══════════════════════════════════════════════════════
  //
  //  col 0: Антенна 1→2→3
  //  col 1: ПК1 → Уборка → Починка → Обустройство → ПК2 → ПК3 → Солн.панели
  //  col 2: Датчик 1→2→3
  //  col 3: Дверь 1→2→3
  //
  // ══════════════════════════════════════════════════════
  // 1. ОФИС — 4 ветки от ПК1
  // ══════════════════════════════════════════════════════
  //
  //  col 0:  Антенна 1→2→3 (от ПК1)
  //  col 1:  ПК1 → Уборка → Починка → ОБУСТРОЙСТВО → ПК2 → Шумоизоляция → ПК3 → Солн.панели
  //  col 2:  Датчик 1→2→3 (от Обустройства)
  //  col 3:  ПК1 → Дверь1 → Барикада → Дверь2 → Засов → Дверь3 → Укрепление
  //
  office: {
    label: 'ОФИС',
    icon: '🏠',
    color: '#44aa33',
    skills: [

      // ═══ ОСНОВНАЯ ЛИНИЯ (col 1) ══════════════════════
      { id:'pc_1', name:'ПК ур.1', icon:'🖥',
        desc:'Найти и запустить старый компьютер. Открывает камеры наблюдения.',
        maxLevel:1, cost:[1], effect:'pc_1',
        row:0, col:1, requires:[] },

      { id:'cleanup', name:'УБОРКА', icon:'🧹',
        desc:'Убрать мусор из комнаты. Меняет вид офиса и камеры 11 — коридор перед офисом становится чище.',
        maxLevel:1, cost:[1], effect:'office_stage_1',
        row:1, col:1, requires:['pc_1','door_1'] },

      { id:'corridor_cleanup', name:'УБОРКА КОРИДОРА', icon:'🪣',
        desc:'Убрать мусор и хлам в коридоре. Меняет вид камер 8А и 8Б — чище, лучше видно NPC.',
        maxLevel:1, cost:[1], effect:'corridor_cleanup',
        row:1, col:2, requires:['cleanup'] },

      { id:'corridor_repair', name:'РЕМОНТ КОРИДОРА', icon:'🪟',
        desc:'Побелка стен и заделка трещин в коридоре. Камеры 8А и 8Б — светлые чистые стены.',
        maxLevel:1, cost:[1], effect:'corridor_repair',
        row:2, col:2, requires:['corridor_cleanup'] },

      { id:'office_restore_2', name:'ПОЧИНКА СТЕН', icon:'🔨',
        desc:'Ремонт стен и пола. Офис пригоден для работы.',
        maxLevel:1, cost:[1], effect:'office_stage_2',
        row:2, col:1, requires:['cleanup','door_1'] },

      // Центральный навык — меняет вид офиса и от него отходят боковые ветки
      { id:'office_restore_3', name:'ОБУСТРОЙСТВО', icon:'🛋',
        desc:'Стол, стул, свет, плакаты. +1 заряд всех способностей. Открывает прокачку антенн и датчиков.',
        maxLevel:1, cost:[1], effect:'office_stage_3',
        row:3, col:1, requires:['office_restore_2','door_2'] },

      { id:'pc_2', name:'ПК ур.2', icon:'🖥',
        desc:'Модернизация ПК. Камеры +30% качество, частичный цвет.',
        maxLevel:1, cost:[1], effect:'pc_2',
        row:4, col:1, requires:['office_restore_3'] },

      // Шумоизоляция — против ползуна (-нюх) и эффект "дверь всегда закрыта"
      { id:'soundproof', name:'ШУМОИЗОЛЯЦИЯ', icon:'🔇',
        desc:'Звукоизоляция стен и плотные двери. Ползун учует офис в 3× реже. Главная дверь автозакрыта без расхода энергии.',
        maxLevel:1, cost:[1], effect:'soundproof',
        row:5, col:1, requires:['pc_2','door_2'] },

      { id:'pc_3', name:'ПК ур.3', icon:'🖥',
        desc:'Полная замена. Камеры HD — полный цвет без затемнений.',
        maxLevel:1, cost:[1], effect:'pc_3',
        row:6, col:1, requires:['soundproof','door_2'] },

      { id:'solar_panels', name:'СОЛН. ПАНЕЛИ', icon:'☀',
        desc:'Солнечные панели на крыше. +0.20% энергии в секунду. Тень при появлении у двери мгновенно отгоняется без потери рассудка.',
        maxLevel:1, cost:[1], effect:'solar_panels',
        row:7, col:1, requires:['pc_3'] },

      // ═══ ВЕТКА АНТЕННА (col 0) ═══════════════════════
      { id:'antenna_1', name:'АНТЕННА ур.1', icon:'📡',
        desc:'Самодельная антенна. −50% помех на камерах.',
        maxLevel:1, cost:[1], effect:'antenna_1',
        row:3, col:0, requires:['office_restore_3'] },

      { id:'antenna_2', name:'АНТЕННА ур.2', icon:'📡',
        desc:'Настроенная антенна. −80% помех.',
        maxLevel:1, cost:[1], effect:'antenna_2',
        row:4, col:0, requires:['antenna_1'] },

      { id:'antenna_3', name:'АНТЕННА ур.3', icon:'📡',
        desc:'Спутниковая антенна. Помехи убраны полностью.',
        maxLevel:1, cost:[1], effect:'antenna_3',
        row:5, col:0, requires:['antenna_2'] },

      // ═══ ВЕТКА ДАТЧИК (col 2) ═════════════════════════
      { id:'motion_1', name:'ДАТЧИК ур.1', icon:'🎯',
        desc:'Датчик движения. NPC виден в зоне ЗДАНИЯ.',
        maxLevel:1, cost:[1], effect:'motion_1',
        row:3, col:2, requires:['office_restore_3'] },

      { id:'motion_2', name:'ДАТЧИК ур.2', icon:'🎯',
        desc:'ИК-датчик. NPC виден в ЗДАНИИ и ПЕРИМЕТРЕ.',
        maxLevel:1, cost:[1], effect:'motion_2',
        row:4, col:2, requires:['motion_1'] },

      { id:'motion_3', name:'ДАТЧИК ур.3', icon:'🎯',
        desc:'Сеть сенсоров. NPC виден ВЕЗДЕ.',
        maxLevel:1, cost:[1], effect:'motion_3',
        row:5, col:2, requires:['motion_2'] },

      // ═══ ВЕТКА ДВЕРЬ (col 3) ══════════════════════════
      // Чередование: Дверь N → Усиление двери N → Дверь N+1
      { id:'door_1', name:'ДВЕРЬ ур.1', icon:'🚪',
        desc:'Деревянная дверь с засовом. Базовая защита. NPC ломает за 15 сек.',
        maxLevel:1, cost:[1], effect:'door_1',
        row:0, col:3, requires:['pc_1'] },

      { id:'o_barricade', name:'БАРРИКАДА', icon:'🪵',
        desc:'Доски и хлам у двери. NPC стучит на 5 сек дольше перед взломом.',
        maxLevel:1, cost:[1], effect:'barricade',
        row:1, col:3, requires:['door_1'] },

      { id:'door_2', name:'ДВЕРЬ ур.2', icon:'🛡',
        desc:'Стальная дверь с заклёпками. NPC ломает в 2× дольше. −20% расхода энергии двери. Требует починку стен.',
        maxLevel:1, cost:[1], effect:'door_2',
        row:2, col:3, requires:['o_barricade','office_restore_2'] },

      { id:'o_lock', name:'ЗАСОВ', icon:'🔩',
        desc:'Металлический засов на дверь. NPC ломает дверь на 10 сек дольше.',
        maxLevel:1, cost:[1], effect:'reinforced_lock',
        row:3, col:3, requires:['door_2'] },

      { id:'door_3', name:'ДВЕРЬ ур.3', icon:'🤖',
        desc:'Умная дверь с биометрией. Не тратит энергию. Автозакрытие при NPC. Требует ПК ур.3.',
        maxLevel:1, cost:[1], effect:'door_3',
        row:4, col:3, requires:['o_lock','pc_3'] },

      // Финальный навык дверной ветки — против ползуна
      { id:'o_reinforce', name:'УКРЕПЛЕНИЕ', icon:'⛓',
        desc:'Стальные пластины на двери. Ползун в режиме ярости грызёт дверь в 2× дольше.',
        maxLevel:1, cost:[1], effect:'door_reinforce',
        row:5, col:3, requires:['door_3'] },

      // ПРОЖЕКТОР — финальный антитень-навык. Требует Шумоизоляцию, Укрепление и Фонарь ур.3.
      { id:'o_projector', name:'ПРОЖЕКТОР', icon:'💡',
        desc:'Мощный прожектор на cam10. Прогоняет тень неограниченно, без штрафа к рассудку. Работает только на cam10. Требует ФОНАРЬ ур.3.',
        maxLevel:1, cost:[1], effect:'projector',
        row:6, col:3, requires:['o_reinforce','soundproof','h_flash_3'] },
    ]
  },

  // ══════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════
  // 2. ОХОТНИК — базовая ветка (для всех классов)
  // ══════════════════════════════════════════════════════
  //
  //  Базовый набор пассивных ловушек, расходников и улучшений.
  //  ОХРАННИК (стартовый класс) видит только эту ветку.
  //  ВОЕННЫЙ — открывает дополнительно ОРУЖЕЙНИКА после базы.
  //  УЧЁНЫЙ  — открывает дополнительно ЛАБОРАНТА после базы.
  //
  //  Структура:
  //    col 0..1: пассивные ловушки и расходники зон (ставятся на камере)
  //    col 2:    прокачка ФОНАРЯ (3 уровня) — улучшение игрока
  //    col 3:    ОБРЕЗ → ветка приманки (только против ползуна)
  //    col 4:    ОПЫТНЫЙ — бонус к получению XP (3 уровня)
  //
  //  Удалены отсюда (переедут в Оружейника / Лаборанта):
  //    h_electric_fence, h_alarm_system, h_flare_gun, h_mine,
  //    h_napalm, h_motion_turret, h_emp, h_cage, h_ai_defense,
  //    h_perimeter_grid, h_annihilator (этот ИМБА — удалён насовсем)
  //
  hunter: {
    label: 'ОХОТНИК',
    icon: '🎯',
    color: '#cc5500',
    skills: [

      // ═══ ПАССИВНЫЕ ЛОВУШКИ И РАСХОДНИКИ ЗОН ═══════════
      // Каждая ставится на камеру и срабатывает 1 раз за смену.
      // Прокачивается ТОЛЬКО мощь (не количество — 1 экземпляр каждой).
      { id:'h_snare', name:'СИЛОК', icon:'🪢',
        desc:'Верёвочная петля на камере. NPC задерживается на 10 сек. 1 раз за смену.',
        maxLevel:1, cost:[1], effect:'snare',
        row:0, col:0, requires:[] },

      { id:'h_noisemaker', name:'ШУМЕЛКА', icon:'🔔',
        desc:'Банки на верёвке. Звуковое оповещение при прохождении NPC через зону. Пассивно.',
        maxLevel:1, cost:[1], effect:'noisemaker',
        row:0, col:1, requires:[] },

      { id:'h_spike_trap', name:'САМОДЕЛЬНЫЕ ШИПЫ', icon:'📌',
        desc:'Шипы на полу камеры. NPC задерживается на 15 сек и отступает на 1 зону. 1 раз за смену.',
        maxLevel:1, cost:[1], effect:'spike_trap',
        row:1, col:0, requires:['h_snare'] },

      { id:'h_tripwire', name:'РАСТЯЖКА', icon:'🧵',
        desc:'Сигнальная проволока. Мгновенное оповещение + NPC замедляется на 8 сек. 2 зоны.',
        maxLevel:1, cost:[1], effect:'tripwire',
        row:1, col:1, requires:['h_noisemaker'] },

      { id:'h_bear_trap', name:'КАПКАН', icon:'⚙️',
        desc:'Стальные челюсти у двери. NPC застревает на 20 сек. Автоматически сбрасывается.',
        maxLevel:1, cost:[1], effect:'bear_trap',
        row:2, col:0, requires:['h_spike_trap'] },

      { id:'h_smoke_bomb', name:'ДЫМОВАЯ ШАШКА', icon:'💨',
        desc:'Расходник. Ослепляет NPC на камерах 9/10/11 на 12 сек. 2 раза за смену.',
        maxLevel:1, cost:[1], effect:'smoke_bomb',
        row:2, col:1, requires:['h_tripwire'] },

      // ═══ ПРОКАЧКА ФОНАРЯ (col 2) ═══════════════════════
      { id:'h_flash_1', name:'ФОНАРЬ ур.1', icon:'🔦',
        desc:'Литий-ионная батарея. −20% к расходу батареи фонаря всегда.',
        maxLevel:1, cost:[1], effect:'flash_1',
        row:0, col:2, requires:[] },

      { id:'h_flash_2', name:'ФОНАРЬ ур.2', icon:'🔦',
        desc:'Усиленный световой поток. +20% к шансу отгонять тень фонарём.',
        maxLevel:1, cost:[1], effect:'flash_2',
        row:1, col:2, requires:['h_flash_1'] },

      { id:'h_flash_3', name:'ФОНАРЬ ур.3', icon:'🔦',
        desc:'Питание от сети. Батарея фонаря бесконечная — расход не учитывается. Открывает ПРОЖЕКТОР в ОФИСЕ.',
        maxLevel:1, cost:[1], effect:'flash_3',
        row:2, col:2, requires:['h_flash_2'] },

      // ═══ ПРИМАНКА + ОБРЕЗ (col 3) ══════════════════════
      // ПРИМАНКА сверху — доступна сразу, против ползуна.
      { id:'h_decoy_1', name:'ПРИМАНКА ур.1', icon:'📦',
        desc:'Кусок мяса в банке. Отвлекает ПОЛЗУНА от пути на офис. 1 заряд для камеры 2.',
        maxLevel:1, cost:[1], effect:'decoy_1',
        row:0, col:3, requires:[] },

      { id:'h_decoy_2', name:'ПРИМАНКА ур.2', icon:'📦',
        desc:'Усиленная приманка. +1 заряд для камеры 3 (всего 2).',
        maxLevel:1, cost:[1], effect:'decoy_2',
        row:1, col:3, requires:['h_decoy_1'] },

      { id:'h_decoy_3', name:'ПРИМАНКА ур.3', icon:'📦',
        desc:'Свежая туша. +1 заряд для камеры 4 (всего 3). Снимает голод ползуна полностью при срабатывании.',
        maxLevel:1, cost:[1], effect:'decoy_3',
        row:2, col:3, requires:['h_decoy_2'] },

      // ОБРЕЗ — расходник, доступен сразу. У УЧЁНОГО заблокирован классом.
      // В будущем в ветке ОРУЖЕЙНИКА можно будет улучшить до дробовика.
      { id:'h_shotgun', name:'РУЖЬЁ', icon:'🔫',
        desc:'Самодельное огнестрельное. Отбрасывает NPC у двери на 3 зоны назад. 1 раз за смену. ⚠ Учёный не использует огнестрельное оружие.',
        maxLevel:1, cost:[1], effect:'shotgun',
        row:3, col:3, requires:[] },

      // ═══ ОПЫТНЫЙ — XP-бонус (col 4) ═════════════════════
      { id:'h_veteran_1', name:'ОПЫТНЫЙ ур.1', icon:'🎓',
        desc:'+15% к получаемому опыту в текущей кампании. Сбрасывается при ребиле.',
        maxLevel:1, cost:[1], effect:'veteran_1',
        row:0, col:4, requires:[] },

      { id:'h_veteran_2', name:'ОПЫТНЫЙ ур.2', icon:'🎓',
        desc:'+30% к получаемому опыту в текущей кампании.',
        maxLevel:1, cost:[1], effect:'veteran_2',
        row:1, col:4, requires:['h_veteran_1'] },

      { id:'h_veteran_3', name:'ОПЫТНЫЙ ур.3', icon:'🎓',
        desc:'+50% к получаемому опыту в текущей кампании.',
        maxLevel:1, cost:[1], effect:'veteran_3',
        row:2, col:4, requires:['h_veteran_2'] },
    ]
  },

  // ══════════════════════════════════════════════════════
  // 3. ЛИЧНЫЕ НАВЫКИ — способности охранника
  // ══════════════════════════════════════════════════════
  //
  //  Прогрессия: новичок → опытный → профессионал → сверхчеловек
  //
  //  Ряд 0: НОВИЧОК — базовые привычки, кофе, внимательность
  //  Ряд 1-2: ОПЫТНЫЙ — рефлексы, выносливость, стрессоустойчивость
  //  Ряд 3-4: ПРОФЕССИОНАЛ — тактика, ночное зрение, предчувствие
  //  Ряд 5-6: СВЕРХЧЕЛОВЕК — адреналин, сверхчувства, бессмертие
  //
  personal: {
    label: 'ЛИЧНЫЕ',
    icon: '🧠',
    color: '#8a6a30',
    skills: [

      // ═══ РЯД 0 — НОВИЧОК (мелкие пассивы, по 1 очку) ═══════════════════
      { id:'p_attention', name:'ВНИМАТЕЛЬНОСТЬ', icon:'👀',
        desc:'Заметнее индикаторы NPC на камерах. NPC подсвечиваются ярче и зелёная рамка вокруг камеры с движением.',
        maxLevel:2, cost:[1,1], effect:'attention',
        row:0, col:0, requires:[] },

      { id:'coffee', name:'ФОТОАППАРАТ', icon:'📷',
        desc:'Дополнительное использование снимка за смену. +1 раз за уровень (базово 1 раз).',
        maxLevel:2, cost:[1,1], effect:'snap_extra_uses',
        row:0, col:1, requires:[] },

      { id:'p_steady_hands', name:'АККУМУЛЯТОР', icon:'🔋',
        desc:'Установка резервного аккумулятора. Даёт 100% энергии с ночи 13. Без него оборудование не работает.',
        maxLevel:1, cost:[1], effect:'has_battery',
        row:0, col:2, requires:[] },

      // ═══ РЯД 1 — ОПЫТНЫЙ ═══════════════════════════════════════════════
      { id:'focus', name:'КОНЦЕНТРАЦИЯ', icon:'🧠',
        desc:'+5/15/25% к шансу что сталкер отреагирует на снимок фотоаппарата.',
        maxLevel:3, cost:[1,1,1], effect:'snap_bonus',
        row:1, col:0, requires:['p_attention'] },

      { id:'endurance', name:'ВЫНОСЛИВОСТЬ', icon:'🏃',
        desc:'Расход рассудка снижен на 7% за уровень (макс −21%).',
        maxLevel:3, cost:[1,1,1], effect:'energy_save',
        row:1, col:1, requires:['coffee'] },

      { id:'quick_hands', name:'УМЕЛЫЙ', icon:'⚡',
        desc:'Камеры переключаются без статики и помех.',
        maxLevel:1, cost:[1], effect:'quick_door',
        row:1, col:2, requires:['p_steady_hands'] },

      // ═══ РЯД 2 — ПРОФЕССИОНАЛ (уникальные пассивы) ═════════════════════
      { id:'calm_nerves', name:'СТАЛЬНЫЕ НЕРВЫ', icon:'💪',
        desc:'+15% стартовый рассудок. После близкого вызова рассудок не падает 3 сек.',
        maxLevel:1, cost:[1], effect:'scare_bonus',
        row:2, col:0, requires:['focus'] },

      { id:'p_deep_breath', name:'ГЛУБОКИЙ ВДОХ', icon:'💨',
        desc:'Активная способность: восстановить 25% рассудка. 2 раза за смену.',
        maxLevel:1, cost:[1], effect:'deep_breath',
        row:2, col:1, requires:['endurance'] },

      { id:'situational', name:'ТАКТИЧЕСКОЕ ЧУТЬЁ', icon:'👁',
        desc:'Тень видна с зоны периметра, а не только в здании. Видишь куда тень идёт после отступления.',
        maxLevel:1, cost:[1], effect:'shade_vision',
        row:2, col:2, requires:['quick_hands'] },

      // ═══ РЯД 3 — ЭКСПЕРТ (заметные механики) ═══════════════════════════
      { id:'night_vision', name:'НОЧНОЕ ЗРЕНИЕ', icon:'🌙',
        desc:'Камеры базово светлее на 25%. Чёрные камеры (без подсветки) теперь различимы. Не зависит от прокачки ПК.',
        maxLevel:1, cost:[1], effect:'night_vision',
        row:3, col:0, requires:['calm_nerves'] },

      { id:'p_pattern_memory', name:'АНАЛИЗ ДВИЖЕНИЙ', icon:'📊',
        desc:'На карте отображается «след» NPC за последние 3 хода. Видишь куда сталкер шёл.',
        maxLevel:1, cost:[1], effect:'pattern_memory',
        row:3, col:1, requires:['p_deep_breath'] },

      { id:'premonition', name:'ШЕСТОЕ ЧУВСТВО', icon:'🔮',
        desc:'Звуковое предупреждение за 1 ход до прихода NPC к двери. Достаточно времени закрыть/спрятаться.',
        maxLevel:1, cost:[1], effect:'premonition',
        row:3, col:2, requires:['situational'] },

      // ═══ РЯД 4 — МАСТЕР (мощные пассивы) ═══════════════════════════════
      { id:'p_iron_will', name:'ЖЕЛЕЗНАЯ ВОЛЯ', icon:'🏋',
        desc:'Иммунитет к панике: фон не мигает, рассудок не падает быстрее на низких уровнях. Soul drain действует на 50% медленнее.',
        maxLevel:1, cost:[1], effect:'iron_will',
        row:4, col:0, requires:['night_vision'] },

      { id:'p_predict', name:'ПРЕДСКАЗАНИЕ', icon:'🎱',
        desc:'На карте видишь следующую точку каждого NPC (стрелочка). Знаешь куда он пойдёт.',
        maxLevel:1, cost:[1], effect:'predict',
        row:4, col:1, requires:['p_pattern_memory'] },

      { id:'p_fast_switch', name:'РЕФЛЕКСЫ', icon:'🔄',
        desc:'1 раз за смену прожектор включится автоматически когда тень приближается к офису и отгонит её.',
        maxLevel:1, cost:[1], effect:'auto_projector',
        row:4, col:2, requires:['premonition'] },

      // ═══ РЯД 5 — СВЕРХЧЕЛОВЕК (активные сверхспособности) ═════════════
      { id:'adrenaline', name:'АДРЕНАЛИН', icon:'💉',
        desc:'При <25% рассудка все способности перезаряжаются мгновенно один раз. И +50% скорости отгона до конца смены.',
        maxLevel:1, cost:[1], effect:'adrenaline',
        row:5, col:0, requires:['p_iron_will'] },

      { id:'p_meditation', name:'МЕДИТАЦИЯ', icon:'🧘',
        desc:'Активная способность: замедляет всех NPC на 50% на 20 сек. Кулдаун 60 сек. 2 раза за смену.',
        maxLevel:1, cost:[1], effect:'meditation',
        row:5, col:1, requires:['p_predict'] },

      { id:'survivor', name:'ВЫЖИВШИЙ', icon:'🛡',
        desc:'Один раз за смену: при смертельном ударе остаёшься с 1% рассудка/энергии. Полная неуязвимость 3 сек.',
        maxLevel:1, cost:[1], effect:'survivor',
        row:5, col:2, requires:['p_fast_switch'] },

      // ═══ РЯД 6 — БОЖЕСТВЕННЫЕ (по 1 финальному навыку) ════════════════
      { id:'p_time_stop', name:'ОСТАНОВКА ВРЕМЕНИ', icon:'⏸',
        desc:'Активная способность: все NPC замирают на 30 сек. Энергия не тратится. Можно использовать любую способность мгновенно. 1 раз за смену.',
        maxLevel:1, cost:[1], effect:'time_stop',
        row:6, col:0, requires:['adrenaline','p_meditation'] },

      { id:'p_foresight', name:'ЯСНОВИДЕНИЕ', icon:'🔭',
        desc:'Видишь все ходы NPC на 3 хода вперёд. Полное знание планов противника. Включается автоматически на каждой смене.',
        maxLevel:1, cost:[1], effect:'foresight',
        row:6, col:1, requires:['p_meditation','survivor'] },

      { id:'p_omniscience', name:'ВСЕВЕДЕНИЕ', icon:'👁‍🗨',
        desc:'Все NPC всегда видны на всех камерах и карте без условий. Не нужны Радио/Тепло/Датчики. Видишь даже невидимых.',
        maxLevel:1, cost:[1], effect:'omniscience',
        row:6, col:2, requires:['p_time_stop','p_foresight'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. ОРУЖЕЙНИК — путь военного. Концовка через термоядерный взрыв (плохая).
  // ═══════════════════════════════════════════════════════════════════════
  arms: {
    label: 'ОРУЖЕЙНИК',
    icon: '☠',
    color: '#cc5500',
    skills: [
      // ── ВХОД В ВЕТКУ (узел разблокировки) ──
      { id:'arms_unlock', name:'ОРУЖЕЙНИК', icon:'☠',
        desc:'Разблокирует ветку оружейника. Военный получает скидку: 5 очков вместо 10 + −1 на каждый узел ветки. Охранник может купить только после прокачки всех навыков ОХОТНИКА. Учёному недоступно (выбран путь Лаборанта).',
        maxLevel:1, cost:[1], effect:'arms_unlock',
        row:0, col:1, requires:[] },

      // ── КОЛОНКА 1: ПРОКАЧКА ДРОБОВИКА (4 узла) ──
      { id:'arms_shotgun_ammo', name:'БОЕЗАПАС', icon:'🟠',
        desc:'+1 заряд РУЖЬЯ за смену (всего 2). Эффект применяется когда у тебя есть Ружьё.',
        maxLevel:1, cost:[1], effect:'arms_shotgun_ammo',
        row:1, col:0, requires:['arms_unlock'] },

      { id:'arms_shotgun_speed', name:'СКОРОСТРЕЛ', icon:'⏱',
        desc:'Кулдаун ружья снижен. Можешь использовать чаще.',
        maxLevel:1, cost:[1], effect:'arms_shotgun_speed',
        row:2, col:0, requires:['arms_shotgun_ammo'] },

      { id:'arms_shotgun_buckshot', name:'КАРТЕЧЬ', icon:'💥',
        desc:'Ружьё отбрасывает NPC у двери на 5 зон вместо 3.',
        maxLevel:1, cost:[1], effect:'arms_shotgun_buckshot',
        row:3, col:0, requires:['arms_shotgun_speed'] },

      { id:'arms_shotgun_pro', name:'ПРОФ. ДРОБОВИК', icon:'🔫',
        desc:'Полная прокачка ружья в дробовик: 3 заряда, +50% к отбросу, можно стрелять прямо у двери.',
        maxLevel:1, cost:[1], effect:'arms_shotgun_pro',
        row:4, col:0, requires:['arms_shotgun_buckshot'] },

      // ── КОЛОНКА 2: ВЗРЫВЧАТКА (3 узла) ──
      { id:'arms_tripwire', name:'РАСТЯЖКА', icon:'⚡',
        desc:'Активный расходник: ставится на текущую камеру, NPC проходит → стан 12 сек. 1 заряд за смену.',
        maxLevel:1, cost:[1], effect:'arms_tripwire',
        row:1, col:1, requires:['arms_unlock'] },

      { id:'arms_mine', name:'ПРОТИВОПЕХ. МИНА', icon:'💣',
        desc:'Активный расходник: мина на камере. Если NPC проходит — выводится из боя на эту смену. 1 заряд.',
        maxLevel:1, cost:[1], effect:'arms_mine',
        row:2, col:1, requires:['arms_tripwire'] },

      { id:'arms_flare', name:'РАКЕТНИЦА', icon:'🚨',
        desc:'Активный расходник: фаер на любую камеру. Все NPC рядом бегут от неё 20 сек. 1 заряд.',
        maxLevel:1, cost:[1], effect:'arms_flare',
        row:3, col:1, requires:['arms_mine'] },

      // ── КОЛОНКА 3: ТАКТИКА (3 узла) ──
      { id:'arms_radio', name:'РАДИОСВЯЗЬ', icon:'📡',
        desc:'Все NPC всегда видны на карте. Постоянное знание позиций.',
        maxLevel:1, cost:[1], effect:'arms_radio',
        row:1, col:2, requires:['arms_unlock'] },

      { id:'arms_thermal', name:'ТЕПЛОВИЗОР', icon:'🌡',
        desc:'Видишь NPC даже в темноте без камер (силуэты на peek-режиме).',
        maxLevel:1, cost:[1], effect:'arms_thermal',
        row:2, col:2, requires:['arms_radio'] },

      { id:'arms_reflexes', name:'РЕФЛЕКСЫ', icon:'⚡',
        desc:'Переключение камер на 1 сек быстрее. Фонарь включается мгновенно.',
        maxLevel:1, cost:[1], effect:'arms_reflexes',
        row:3, col:2, requires:['arms_thermal'] },

      // ── ФИНАЛ: ТЕРМОЯДЕРКА ──
      { id:'arms_thermo', name:'ТЕРМОЯДЕРКА', icon:'☢',
        desc:'Военная концовка: активирует термоядерный заряд под объектом. Уничтожает Резонанса, всех NPC и тебя. КНОПКА «ВЗОРВАТЬ» появляется в офисе.',
        maxLevel:1, cost:[1], effect:'arms_thermo',
        row:5, col:1, requires:['arms_shotgun_pro','arms_flare','arms_reflexes'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. ЛАБОРАНТ — путь учёного. Концовка через ликвидацию (хорошая).
  // ═══════════════════════════════════════════════════════════════════════
  // Цена: 1,2,3,4,5 по уровням + глубина (row) добавляет +1 к каждому уровню.
  // Учёному скидка −50% применяется в getActualCost.
  // Префиксы: lab_unlock — точка входа, a_* — анти-NPC, a_science_finale — финал.
  lab: {
    label: 'ЛАБОРАНТ',
    icon: '🔬',
    color: '#88aaff',
    skills: [
      // ── ВХОД В ВЕТКУ ──
      { id:'lab_unlock', name:'ЛАБОРАНТ', icon:'🔬',
        desc:'Разблокирует ветку Лаборанта. Учёному она открыта со старта (бесплатно). Охранник может купить только после прокачки всех навыков ОХОТНИКА. Военному недоступно (выбран путь Оружейника).',
        maxLevel:1, cost:[1], effect:'lab_unlock',
        row:0, col:1, requires:[] },

      // ── АНТИ-СТАЛКЕР (col 0) — каждый навык даёт сразу максимальный бонус ──
      { id:'a_stalker_suppress', name:'ПОДАВЛЕНИЕ', icon:'🎯',
        desc:'Снижение скорости сталкера −10%.',
        maxLevel:1, cost:[1], effect:'as_suppress',
        row:1, col:0, requires:['lab_unlock'] },

      { id:'a_stalker_resist', name:'СТРЕССОУСТОЙЧИВОСТЬ', icon:'🧠',
        desc:'Расход рассудка от сталкера −50%.',
        maxLevel:1, cost:[1], effect:'as_resist',
        row:2, col:0, requires:['a_stalker_suppress'] },

      { id:'a_stalker_cunning', name:'ХИТРОСТЬ', icon:'♟',
        desc:'Шанс срабатывания ловушки на сталкера 100%.',
        maxLevel:1, cost:[1], effect:'as_cunning',
        row:3, col:0, requires:['a_stalker_resist'] },

      // ── АНТИ-ПОЛЗУН (col 1) ──
      { id:'a_crawler_collar', name:'СТАЛЬНОЙ ОШЕЙНИК', icon:'⛓',
        desc:'+5 сек ко времени взлома двери ползуном в ярости.',
        maxLevel:1, cost:[1], effect:'ac_collar',
        row:1, col:1, requires:['lab_unlock'] },

      { id:'a_crawler_scent', name:'АНТИ-ЗАПАХ', icon:'🌿',
        desc:'Снижение шанса учуять офис −25%.',
        maxLevel:1, cost:[1], effect:'ac_scent',
        row:2, col:1, requires:['a_crawler_collar'] },

      { id:'a_crawler_poison', name:'ЯД', icon:'🧪',
        desc:'Скорость ползуна в ярости −50%.',
        maxLevel:1, cost:[1], effect:'ac_poison',
        row:3, col:1, requires:['a_crawler_scent'] },

      // ── АНТИ-ТЕНЬ (col 2) ──
      { id:'a_shade_eyes', name:'ОЧКИ ТЕНИ', icon:'👁',
        desc:'Тень видна на ВСЕХ камерах.',
        maxLevel:1, cost:[1], effect:'at_eyes',
        row:1, col:2, requires:['lab_unlock'] },

      { id:'a_shade_inhibit', name:'ИНГИБИТОР', icon:'💊',
        desc:'Расход рассудка от soul drain −25%.',
        maxLevel:1, cost:[1], effect:'at_inhibit',
        row:2, col:2, requires:['a_shade_eyes'] },

      { id:'a_shade_lighttrap', name:'СВЕТОВАЯ ЛОВУШКА', icon:'💡',
        desc:'Шанс прогнать тень при её появлении на уровне 50%.',
        maxLevel:1, cost:[1], effect:'at_lighttrap',
        row:3, col:2, requires:['a_shade_inhibit'] },

      // ── ФИНАЛ — НАУКА ──
      { id:'a_science_finale', name:'НАУКА', icon:'🏆',
        desc:'Научная концовка: усмиряет всех NPC. Резонанс изолирован. Ты выживаешь. Кнопка «ЛИКВИДАЦИЯ» появляется в офисе.',
        maxLevel:1, cost:[1], effect:'science_finale',
        row:5, col:1, requires:['a_stalker_cunning','a_crawler_poison','a_shade_lighttrap'] },
    ]
  }
};

;

// ─── SKILL SAVE STATE ─────────────────────────────────────────────────────────
var ST = {
  points: 0,
  rebirths: 0,
  nightsCompleted: 0,   // накопленные ночи (не сброшены ребиртом)
  unlockedSkills: {},   // {skill_id: currentLevel}
  activeEffects: {},    // вычисленные эффекты
  // Активируемые способности (с кулдауном)
  abilities: {
    emp:     { uses:0, maxUses:1, cooldown:false },
    shotgun: { uses:0, maxUses:1, cooldown:false },
    flare:   { uses:0, maxUses:1, cooldown:false },
    alarm:   { uses:0, maxUses:1, cooldown:false },
    decoy:   { uses:0, maxUses:2, cooldown:false },
    trap:    { uses:0, maxUses:1, cooldown:false },
  }
};

function loadSkillData(){
  // Сначала сброс — иначе переключение на класс без прогресса оставит прокачку
  ST.points = 0;
  ST.rebirths = 0;
  ST.nightsCompleted = 0;
  ST.unlockedSkills = {};
  try {
    var raw = localStorage.getItem('resonance_skills');
    if(raw){
      var d = JSON.parse(raw);
      ST.points = d.points||0;
      ST.rebirths = d.rebirths||0;
      ST.nightsCompleted = d.nightsCompleted||0;
      ST.unlockedSkills = d.unlockedSkills||{};
    }
  } catch(e){}
  recalcEffects();
}

function saveSkillData(){
  try {
    localStorage.setItem('resonance_skills', JSON.stringify({
      points: ST.points,
      rebirths: ST.rebirths,
      nightsCompleted: ST.nightsCompleted,
      unlockedSkills: ST.unlockedSkills
    }));
  } catch(e){}
}

function getSkillLevel(id){
  // Учёному lab_unlock всегда виртуально куплен (его врождённая способность)
  if(id === 'lab_unlock' && typeof CFG !== 'undefined' && CFG.class === 'scientist'){
    return 1;
  }
  // Военному arms_unlock всегда виртуально куплен (его врождённая способность)
  if(id === 'arms_unlock' && typeof CFG !== 'undefined' && CFG.class === 'military'){
    return 1;
  }
  return ST.unlockedSkills[id]||0;
}
function getSkillDef(id){
  var treeKeys=Object.keys(SKILL_TREES);
  for(var ti=0;ti<treeKeys.length;ti++){
    var sk_list=SKILL_TREES[treeKeys[ti]].skills;
    for(var si=0;si<sk_list.length;si++){
      if(sk_list[si].id===id)return sk_list[si];
    }
  }
  return null;
}

function canUnlock(skill){
  var lvl = getSkillLevel(skill.id);
  if(lvl >= skill.maxLevel) return false;
  for(var _i=0;_i<skill.requires.length;_i++){var req=skill.requires[_i];
    if(!getSkillLevel(req)) return false;
  }
  var cost = (typeof getActualCost==='function') ? getActualCost(skill, lvl) : skill.cost[lvl];
  if(ST.points < cost) return false;
  return true;
}

function isUnlockable(skill){
  // Базовые проверки
  var lvl = getSkillLevel(skill.id);
  if(lvl >= skill.maxLevel) return false;
  for(var _i=0;_i<skill.requires.length;_i++){
    var req = skill.requires[_i];
    if(!getSkillLevel(req)) return false;
  }

  var fx = (ST && ST.activeEffects) ? ST.activeEffects : {};
  var cls = fx.class_id || 'guard';
  var id = skill.id || '';

  // Определяем к какой ветке принадлежит навык
  var isArms = id.indexOf('arms_') === 0;
  var isLab  = !isArms && (id.indexOf('lab_') === 0 || id === 'a_science_finale' ||
               (id.indexOf('a_') === 0));

  // ── Военный ──
  // Может всё в Оружейнике без условий. Лаборант запрещён.
  if(cls === 'military'){
    if(isLab) return false;
    if(isArms) return true; // ВСЕ arms_* доступны военному
    // Базовые ветки (office/hunter/personal) — проверка концовки ниже
  }

  // ── Учёный ──
  // Может всё в Лаборанте без условий. Оружейник запрещён.
  if(cls === 'scientist'){
    if(isArms) return false;
    if(isLab) return true;  // ВСЕ lab_/a_* доступны учёному
  }

  // ── Охранник ──
  // arms_unlock и lab_unlock — только если прокачан весь Охотник
  if(cls === 'guard'){
    if(id === 'arms_unlock'){
      if(!isHunterFullyMaxed()) return false;
      if(typeof CFG !== 'undefined' && CFG.usedFinale === 'lab') return false;
      return true;
    }
    if(id === 'lab_unlock'){
      if(!isHunterFullyMaxed()) return false;
      if(typeof CFG !== 'undefined' && CFG.usedFinale === 'arms') return false;
      return true;
    }
    // Дочерние навыки веток требуют чтобы ветка была разблокирована (через requires выше)
    if(isArms || isLab){
      // Уже прошло проверку requires выше — значит arms_unlock/lab_unlock куплен
      return true;
    }
  }

  // Активированная концовка блокирует противоположную ветку
  if(typeof CFG !== 'undefined' && CFG.usedFinale){
    if(isArms && CFG.usedFinale === 'lab') return false;
    if(isLab && CFG.usedFinale === 'arms') return false;
  }

  return true;
}

// Проверка: все базовые навыки ОХОТНИКА на максимуме
// (исключая анти-NPC ветки a_*, финал НАУКА и сам arms_unlock)
function isHunterFullyMaxed(){
  if(!SKILL_TREES.hunter || !SKILL_TREES.hunter.skills) return false;
  var skills = SKILL_TREES.hunter.skills;
  for(var i=0;i<skills.length;i++){
    var s = skills[i];
    // Пропускаем анти-NPC и финал — они НЕ часть условия (хотя сейчас они уже в lab-дереве)
    if(s.id.indexOf('a_') === 0 && s.id.indexOf('arms_') !== 0) continue;
    if(s.id.indexOf('arms_') === 0) continue;
    if(getSkillLevel(s.id) < s.maxLevel) return false;
  }
  return true;
}

// ─── COST CALCULATION (с учётом класса и веток) ──────────────────────────
// Возвращает актуальную стоимость навыка для текущего класса.
function getActualCost(skill, lvl){
  if(lvl == null) lvl = getSkillLevel(skill.id);
  if(lvl >= skill.maxLevel) return 0;
  var baseCost = skill.cost[lvl];
  var fx = (typeof ST!=='undefined' && ST.activeEffects) ? ST.activeEffects : {};

  // ОФИС: учёный имеет −1 очко (плоское)
  var isOffice = false;
  if(SKILL_TREES.office && SKILL_TREES.office.skills){
    for(var oi=0; oi<SKILL_TREES.office.skills.length; oi++){
      if(SKILL_TREES.office.skills[oi].id === skill.id){ isOffice = true; break; }
    }
  }
  if(isOffice && fx.class_office_discount_flat){
    baseCost = Math.max(1, baseCost - fx.class_office_discount_flat);
  }

  // ОРУЖЕЙНИК: военный имеет −1 очко на ветку (префикс arms_)
  var isArms = (skill.id && skill.id.indexOf('arms_') === 0);
  if(isArms && fx.class_arms_discount_flat){
    baseCost = Math.max(1, baseCost - fx.class_arms_discount_flat);
  }
  // Сам узел разблокировки Оружейника
  if(skill.id === 'arms_unlock' && fx.class_arms_unlock_cost != null){
    baseCost = fx.class_arms_unlock_cost;
  }

  // ЛАБОРАНТ: учёный имеет −50% (мультипликативно).
  // Учитываем ветку Лаборанта (lab_*) И анти-NPC (a_*).
  // ВАЖНО: 'a_' также матчит 'arms_*' — поэтому исключаем arms_ явно.
  var isLab = (skill.id && skill.id.indexOf('arms_') !== 0 &&
               (skill.id.indexOf('lab_') === 0 || skill.id.indexOf('a_') === 0));
  if(isLab && fx.class_lab_discount > 0){
    baseCost = Math.max(1, Math.ceil(baseCost * (1 - fx.class_lab_discount)));
  }

  return baseCost;
}

function unlockSkill(id){
  var skill = getSkillDef(id);
  if(!skill) return;
  var lvl = getSkillLevel(id);
  if(lvl >= skill.maxLevel) return;
  var cost = getActualCost(skill, lvl);

  // Учёный не может покупать обрез
  var fx = ST.activeEffects || {};
  if(fx.class_block_shotgun && id === 'h_shotgun'){
    addLog('Учёный не пользуется огнестрельным оружием.', 'd');
    return;
  }

  var availPoints = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.skillPoints : ST.points;
  if(availPoints < cost){ addLog('Недостаточно очков навыков!','d'); return; }
  if(!isUnlockable(skill)){ addLog('Требования не выполнены.','d'); return; }
  // Deduct from both
  if(typeof LEVEL_SYSTEM!=='undefined'){ LEVEL_SYSTEM.skillPoints -= cost; LEVEL_SYSTEM.save(); }
  ST.points = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.skillPoints : ST.points - cost;
  ST.unlockedSkills[id] = lvl + 1;
  saveSkillData();
  recalcEffects();
  renderSkillTree(ST._activeTree||'office');
  updateSTPointsDisplay();
  if(typeof updateLevelUI==='function') updateLevelUI();
  // Apply visual effects immediately
  if(typeof applyDayModeVisuals==='function') applyDayModeVisuals();
  if(typeof updateOfficeVisuals==='function') updateOfficeVisuals();
  if(typeof updateFinaleButtons==='function') updateFinaleButtons();
  if(typeof updateNearOfficeRoom==='function') updateNearOfficeRoom();
  addLog('Навык «'+skill.name+'» улучшен до ур. '+(lvl+1)+'!','');
  if(typeof SFX!=='undefined') SFX.skillBuy();
  // Tutorial hook
  if(typeof TUTORIAL!=='undefined' && TUTORIAL.active) TUTORIAL.onSkillBought(id);
  // Night 2 tutorial hook
  if(typeof TUTORIAL_NIGHT2!=='undefined' && TUTORIAL_NIGHT2.active) TUTORIAL_NIGHT2.onSkillBought(id);

  // Финальный навык НАУКА — заглушка концовки (полная сцена будет в этапе Лаборанта)
  if(id === 'a_science_finale'){
    addLog('🏆 НАУЧНАЯ ПОБЕДА! (Концовка будет в следующем обновлении.)','w');
    setTimeout(function(){
      alert('НАУЧНАЯ ПОБЕДА\n\nВсе NPC усмирены через противодействие.\nРезонанс изучен, не сбежал.\n\n(Полная концовка будет добавлена с веткой ЛАБОРАНТ.)');
    }, 100);
  }
}

// ─── RECALC EFFECTS ───────────────────────────────────────────────────────────
function recalcEffects(){
  var fx = {};

  // ── OFFICE TREE ──
  fx.cable_level      = (getSkillLevel('cable_1')>0?1:0)+(getSkillLevel('cable_2')>0?1:0)+(getSkillLevel('cable_3')>0?1:0);
  fx.antenna_level    = (getSkillLevel('antenna_3')>0?3:getSkillLevel('antenna_2')>0?2:getSkillLevel('antenna_1')>0?1:0);
  fx.pc_level         = (getSkillLevel('pc_3')>0?3:getSkillLevel('pc_2')>0?2:getSkillLevel('pc_1')>0?1:0);
  // ── OFFICE TREE ──
  fx.cable_level      = 0;
  fx.antenna_level    = (getSkillLevel('antenna_3')>0?3:getSkillLevel('antenna_2')>0?2:getSkillLevel('antenna_1')>0?1:0);
  fx.pc_level         = (getSkillLevel('pc_3')>0?3:getSkillLevel('pc_2')>0?2:getSkillLevel('pc_1')>0?1:0);
  fx.motion_level     = (getSkillLevel('motion_3')>0?3:getSkillLevel('motion_2')>0?2:getSkillLevel('motion_1')>0?1:0);
  fx.office_stage     = (getSkillLevel('office_restore_3')>0?3:getSkillLevel('office_restore_2')>0?2:getSkillLevel('cleanup')>0?1:0);
  fx.corridor_cleanup = getSkillLevel('corridor_cleanup') > 0;
  fx.corridor_repair  = getSkillLevel('corridor_repair') > 0;
  fx.cam_range        = fx.motion_level;
  fx.motion_alert     = fx.motion_level>0;
  // Door branch
  fx.door_level       = (getSkillLevel('door_3')>0?3:getSkillLevel('door_2')>0?2:getSkillLevel('door_1')>0?1:0);
  // Базовый множитель времени взлома: ур.2 даёт ×2.
  fx.door_hp_mult     = fx.door_level>=2 ? 2.0 : 1.0;
  fx.door_energy_save = fx.door_level>=2 ? 0.2 : 0;  // -20% door energy at lvl 2
  fx.smart_door       = fx.door_level>=3;
  fx.free_door        = fx.door_level>=3;  // lvl 3 = no energy cost
  // Невзламываемость теперь даёт ТОЛЬКО шумоизоляция (см. ниже после OFFICE-вычислений).
  fx.door_unbreakable = false;
  // Solar panels
  fx.solar_panels     = getSkillLevel('solar_panels')>0;
  fx.solar_regen      = fx.solar_panels ? 0.20 : 0; // +0.20% per tick
  // Legacy
  fx.room_fortify     = getSkillLevel('office_restore_3')>0;
  fx.passive_power    = 0;
  fx.sweep_bonus      = 0;
  fx.workbench        = fx.room_fortify;

  // ── HUNTER TREE ──
  fx.snare_levels     = getSkillLevel('h_snare');
  fx.snare_passive    = fx.snare_levels > 0;  // силок — пассивный, не в меню способностей
  fx.trap_levels      = getSkillLevel('h_spike_trap');  // силок убран из активных
  fx.trap_duration    = 10000 + fx.snare_levels*5000 + getSkillLevel('h_spike_trap')*5000;
  fx.bear_trap        = getSkillLevel('h_bear_trap');
  fx.bear_trap_time   = 20000 + fx.bear_trap*10000;
  fx.shotgun_levels   = getSkillLevel('h_shotgun');
  fx.shotgun_pushback = 3 + fx.shotgun_levels;
  // ОРУЖЕЙНИК-улучшения дробовика применяются позже (после регистрации arms_*)
  fx.tripwire         = getSkillLevel('h_tripwire')>0;
  fx.noisemaker       = getSkillLevel('h_noisemaker')>0;
  fx.barricade        = getSkillLevel('o_barricade');
  fx.reinforced_lock  = getSkillLevel('o_lock');
  fx.door_reinforce   = getSkillLevel('o_reinforce')>0;
  fx.soundproof       = getSkillLevel('soundproof')>0;
  fx.projector        = getSkillLevel('o_projector')>0;

  // ── СВОДНЫЕ ЭФФЕКТЫ ОФИС-ВЕТКИ ──
  // УКРЕПЛЕНИЕ — удваивает время взлома поверх текущего множителя двери
  if(fx.door_reinforce){
    fx.door_hp_mult = fx.door_hp_mult * 2.0;
  }
  // ШУМОИЗОЛЯЦИЯ — невзламываемая дверь + бесплатная (всегда закрыта без энергии)
  if(fx.soundproof){
    fx.door_unbreakable = true;
    fx.free_door = true;
  }
  // Шумоизоляция против ползуна: ×3 реже учует офис
  fx.crawler_smell_mult = fx.soundproof ? (1/3) : 1.0;

  fx.smoke_bomb       = getSkillLevel('h_smoke_bomb');
  // Удалённые из ОХОТНИКА скиллы — переедут в Лаборанта/Оружейника позже.
  // Возвращают 0/false чтобы handler'ы и checks не падали.
  fx.electric_fence   = 0;
  fx.alarm_available  = 0;
  fx.flare_available  = false;
  fx.mine_available   = false;
  fx.napalm           = false;
  fx.turret           = 0;
  fx.emp_available    = false;
  fx.cage             = false;
  fx.ai_defense       = false;
  fx.perimeter_grid   = false;
  fx.annihilator      = false;

  // Новая ПРИМАНКА: 3 ступени, каждая открывает заряд для своей камеры (cam-c2/c3/c4)
  fx.decoy_1_avail    = getSkillLevel('h_decoy_1')>0;
  fx.decoy_2_avail    = getSkillLevel('h_decoy_2')>0;
  fx.decoy_3_avail    = getSkillLevel('h_decoy_3')>0;
  fx.decoy_levels     = (fx.decoy_1_avail?1:0) + (fx.decoy_2_avail?1:0) + (fx.decoy_3_avail?1:0);

  // ФОНАРЬ — прокачка в 3 ступени
  fx.flash_lvl        = (getSkillLevel('h_flash_3')>0?3 : getSkillLevel('h_flash_2')>0?2 : getSkillLevel('h_flash_1')>0?1 : 0);
  fx.flash_drain_mult = fx.flash_lvl >= 1 ? 0.80 : 1.0;        // -20% расхода при движении
  // flash_shade_bonus больше не используется — бонус считается в SHADE_HATCH.tryScareWithFlash() по flash_lvl
  fx.flash_shade_bonus= 0;
  fx.flash_grid_power = fx.flash_lvl >= 3;                     // питание от сети, бесконечная батарея

  // ОПЫТНЫЙ — XP-бонус (хранится в G на текущую кампанию)
  fx.veteran_lvl      = (getSkillLevel('h_veteran_3')>0?3 : getSkillLevel('h_veteran_2')>0?2 : getSkillLevel('h_veteran_1')>0?1 : 0);
  fx.xp_bonus         = [0, 0.15, 0.30, 0.50][fx.veteran_lvl] || 0;

  // ── АНТИ-NPC ВЕТКИ ──
  // Каждый навык покупается ОДИН раз и сразу даёт максимальный бонус.
  // Внутренне храним как "виртуальный 5й уровень" — формулы 0.10*lvl и т.п. остаются как были.
  // АНТИ-СТАЛКЕР
  fx.as_suppress_lvl  = getSkillLevel('a_stalker_suppress')>0 ? 5 : 0;   // -10% скорости
  fx.as_resist_lvl    = getSkillLevel('a_stalker_resist')>0 ? 5 : 0;     // -50% урона по рассудку
  fx.as_cunning_lvl   = getSkillLevel('a_stalker_cunning')>0 ? 5 : 0;    // 100% шанс ловушки
  fx.as_cunning_chance = fx.as_cunning_lvl > 0 ? 1.00 : 0;

  // АНТИ-ПОЛЗУН
  fx.ac_collar_lvl    = getSkillLevel('a_crawler_collar')>0 ? 5 : 0;     // +5сек время взлома frenzy
  fx.ac_scent_lvl     = getSkillLevel('a_crawler_scent')>0 ? 5 : 0;      // -25% officeSmellChance
  fx.ac_poison_lvl    = getSkillLevel('a_crawler_poison')>0 ? 5 : 0;     // -50% скорость в frenzy

  // АНТИ-ТЕНЬ
  fx.at_eyes          = getSkillLevel('a_shade_eyes')>0;                 // тень видна везде
  fx.at_inhibit_lvl   = getSkillLevel('a_shade_inhibit')>0 ? 5 : 0;      // -25% рассудок soul drain
  fx.at_lighttrap_lvl = getSkillLevel('a_shade_lighttrap')>0 ? 5 : 0;    // 50% шанс прогнать тень

  // НАУКА (финал)
  fx.science_finale   = getSkillLevel('a_science_finale')>0;

  // ── ОРУЖЕЙНИК (ветка) ──
  fx.arms_unlocked          = getSkillLevel('arms_unlock')>0;
  // Дробовик
  fx.arms_shotgun_ammo      = getSkillLevel('arms_shotgun_ammo')>0;
  fx.arms_shotgun_speed     = getSkillLevel('arms_shotgun_speed')>0;
  fx.arms_shotgun_buckshot  = getSkillLevel('arms_shotgun_buckshot')>0;
  fx.arms_shotgun_pro       = getSkillLevel('arms_shotgun_pro')>0;
  // Расходники
  fx.arms_tripwire          = getSkillLevel('arms_tripwire')>0;
  fx.arms_mine              = getSkillLevel('arms_mine')>0;
  fx.arms_flare             = getSkillLevel('arms_flare')>0;
  // Тактика
  fx.arms_radio             = getSkillLevel('arms_radio')>0;
  fx.arms_thermal           = getSkillLevel('arms_thermal')>0;
  fx.arms_reflexes          = getSkillLevel('arms_reflexes')>0;
  // Финал
  fx.arms_thermo            = getSkillLevel('arms_thermo')>0;

  // ── Применение апгрейдов дробовика на сам обрез ──
  if(fx.arms_shotgun_buckshot){ fx.shotgun_pushback = 5; }   // КАРТЕЧЬ: 5 зон
  if(fx.arms_shotgun_pro)    { fx.shotgun_pushback = Math.round(fx.shotgun_pushback * 1.5); } // +50%

  // ── PERSONAL TREE ──
  fx.attention        = getSkillLevel('p_attention');
  fx.has_battery      = getSkillLevel('p_steady_hands') > 0;
  fx.snap_extra_uses  = getSkillLevel('coffee') || 0;
  fx.snap_bonus       = [0,5,15,25][getSkillLevel('focus')] || 0;
  fx.energy_save      = (getSkillLevel('endurance')||0)*5; // -5% за уровень
  fx.quick_door       = getSkillLevel('quick_hands')>0;
  fx.scare_bonus      = (getSkillLevel('calm_nerves')||0)*10;
  fx.deep_breath      = getSkillLevel('p_deep_breath');
  fx.auto_projector   = getSkillLevel('p_fast_switch') > 0;
  fx.fast_switch      = getSkillLevel('arms_reflexes') > 0;
  // ОЧКИ ТЕНИ (анти-тень) ИЛИ situational из ЛИЧНЫХ — оба дают видимость тени
  fx.shade_vision     = getSkillLevel('situational')>0 || fx.at_eyes;
  fx.night_vision     = getSkillLevel('night_vision');
  // NIGHT VISION — навешиваем класс на body
  if(typeof document !== 'undefined' && document.body){
    if(fx.night_vision > 0) document.body.classList.add('has-night-vision');
    else document.body.classList.remove('has-night-vision');
  }
  fx.pattern_memory   = getSkillLevel('p_pattern_memory')>0;
  fx.premonition      = getSkillLevel('premonition')>0;
  fx.iron_will        = getSkillLevel('p_iron_will')>0;
  fx.predict          = getSkillLevel('p_predict')>0;
  fx.adrenaline       = getSkillLevel('adrenaline')>0;
  fx.meditation       = getSkillLevel('p_meditation')>0;
  fx.foresight        = getSkillLevel('p_foresight')>0;
  fx.time_stop        = getSkillLevel('p_time_stop')>0;
  fx.survivor         = getSkillLevel('survivor')>0;
  fx.omniscience      = getSkillLevel('p_omniscience')>0;
  // ОРУЖЕЙНИК — РАДИОСВЯЗЬ и ТЕПЛОВИЗОР тоже дают полную видимость
  if(typeof getSkillLevel==='function' && (getSkillLevel('arms_radio')>0 || getSkillLevel('arms_thermal')>0)){
    fx.omniscience = true;
  }

  // Legacy compat
  fx.flash_regen_bonus = (fx.sweep_bonus||0)/100;
  fx.power_efficiency  = 1.0 - (fx.energy_save||0)/100;
  fx.ui_speed          = getSkillLevel('office_restore_2')>0;

  // ── ЭФФЕКТЫ КЛАССА ──
  if(typeof CLASS_SYSTEM !== 'undefined'){
    CLASS_SYSTEM.applyEffects(fx);
  }
  // Учёный не может пользоваться огнестрелом — блокируем обрез
  if(fx.class_block_shotgun){
    fx.shotgun_levels = 0;
  }

  ST.activeEffects = fx;
}

// ─── APPLY EFFECTS IN GAME ────────────────────────────────────────────────────
// Вызывается при старте ночи
function applySkillEffects(){
  var fx = ST.activeEffects;

  // Reset abilities
  ST.abilities = {};
  // Register available abilities from hunter tree
  if(fx.emp_available)    ST.abilities.emp     = {uses:0, maxUses:1, cooldown:false};
  if(fx.shotgun_levels){
    var shotgunUses = 1;
    if(fx.arms_shotgun_ammo)  shotgunUses++;     // БОЕЗАПАС: +1
    if(fx.arms_shotgun_speed) shotgunUses++;     // СКОРОСТРЕЛ: +1
    if(fx.arms_shotgun_pro)   shotgunUses++;     // ПРОФ.ДРОБОВИК: +1
    // Сюжетный обрез (уровень 3+): всегда 3 заряда
    if(typeof STORY_SKILL_IDS!=='undefined' && STORY_SKILL_IDS['h_shotgun']){
      var night = (typeof G!=='undefined') ? G.night : 0;
      if(night >= 3) shotgunUses = Math.max(3, shotgunUses);
    }
    ST.abilities.shotgun = {uses:0, maxUses:shotgunUses, cooldown:false};
  }
  if(fx.flare_available || fx.arms_flare) ST.abilities.flare = {uses:0, maxUses:1, cooldown:false};
  if(fx.alarm_available)  ST.abilities.alarm   = {uses:0, maxUses:1+(fx.alarm_available>1?1:0), cooldown:false};
  // decoy is camera-button only — not registered as hotkey ability
  if(fx.trap_levels)      ST.abilities.trap    = {uses:0, maxUses:Math.max(1,fx.trap_levels), cooldown:false};
  if(fx.mine_available || fx.arms_mine)   ST.abilities.mine = {uses:0, maxUses:1, cooldown:false};
  if(fx.arms_tripwire)    ST.abilities.tripwire = {uses:0, maxUses:1, cooldown:false};
  if(fx.napalm)           ST.abilities.napalm  = {uses:0, maxUses:1, cooldown:false};
  if(fx.cage)             ST.abilities.cage    = {uses:0, maxUses:1, cooldown:false};
  // Personal abilities
  if(fx.deep_breath)      ST.abilities.breath  = {uses:0, maxUses:fx.deep_breath*2, cooldown:false};
  if(fx.meditation)       ST.abilities.meditate= {uses:0, maxUses:1, cooldown:false};
  if(fx.time_stop)        ST.abilities.timestop= {uses:0, maxUses:1, cooldown:false};
  if(fx.adrenaline)       ST.abilities.adrenaline={uses:0, maxUses:1, cooldown:false};

  // Office restore bonus — +1 charge to all abilities
  if(fx.room_fortify){
    Object.keys(ST.abilities).forEach(function(k){
      ST.abilities[k].maxUses += 1;
    });
  }
  // Workbench — +1 ability slot
  if(fx.workbench){
    Object.keys(ST.abilities).forEach(function(k){
      ST.abilities[k].maxUses += 1;
    });
  }

  // ── ПРИМЕНЕНИЕ ВСЕХ ДВЕРНЫХ МОДОВ (per-NPC матрица) ──
  // Уровень защиты двери:
  //   doorTier: 1=Дверь1, 1.5=+Барикада, 2=Дверь2, 2.5=+Засов, 3=Дверь3, 3.5=+Укрепление
  //   soundproof — отдельный флаг (Дверь3+Шумоизоляция = тень не ест, не обесточивает)
  // Кто может пробить (см. матрицу из ТЗ):
  //   Сталкер: до 2.5 (Засов) — НЕ может, Дверь2 — может, Дверь1+Барикада — может
  //   Тень:    до 3.0 (Дверь3 включительно) физически не пробьёт, но обесточит и откроет (EMP);
  //            на 3.5 (Дверь3+Укрепление) физически не пробьёт и не обесточит;
  //            но если 3.5 БЕЗ Шумоизоляции → начинает "есть рассудок" (см. shadeSoulDrain);
  //            если 3.5 + Шумоизоляция → тень вообще не подходит к двери.
  //   Ползун (вне ярости 1-11): до Дверь3 не может; на Дверь3 не может (раздражает электричество);
  //                              на 3.5 — не может.
  //   Ползун в ярости (12-15): кислотой пробивает любую дверь, время удваивается на Укреплении.

  var doorTier = 1.0;
  if(fx.door_level >= 1)         doorTier = 1.0;
  if(fx.barricade > 0)           doorTier = 1.5;
  if(fx.door_level >= 2)         doorTier = 2.0;
  if(fx.reinforced_lock > 0)     doorTier = 2.5;
  if(fx.door_level >= 3)         doorTier = 3.0;
  if(fx.door_reinforce)          doorTier = 3.5;

  // Флэт-бонус секунд (барикада/засов добавляют ко времени взлома там где взлом возможен)
  var flatBonusSec = 0;
  if(fx.barricade>0)       flatBonusSec += 5;
  if(fx.reinforced_lock>0) flatBonusSec += 10;

  // Множитель времени взлома (Дверь2 даёт ×2, Укрепление ещё ×2)
  var hpMult = (fx.door_level >= 2 ? 2.0 : 1.0) * (fx.door_reinforce ? 2.0 : 1.0);

  fx.door_tier   = doorTier;
  fx.has_soundproof = !!fx.soundproof;
  // Может ли тень обесточить дверь при подходе (вместо физического взлома)
  fx.shade_can_emp = (doorTier >= 3.0 && doorTier < 3.5); // только на чистой Дверь3 без Укрепления
  // Активируется ли «пожирание рассудка» при подходе тени
  fx.shade_soul_drain = (doorTier >= 3.5 && !fx.soundproof);
  // Полная неуязвимость двери от тени (нет пробития, нет EMP, нет атак)
  fx.shade_blocked    = (doorTier >= 3.5 && fx.soundproof);

  Object.values(CREATURES).forEach(function(c){
    var db = c.doorBehavior;
    if(!db || !db.waitBeforeBreak) return;
    db._originalWBB = db._originalWBB || JSON.parse(JSON.stringify(db.waitBeforeBreak));
    var orig = db._originalWBB;

    // Решаем "может ли c пробить" (если нет — Infinity на всех ночах)
    var canBreak = true;
    if(c.id === 'stalker'){
      // Сталкер не может с Засова и выше
      if(doorTier >= 2.5) canBreak = false;
    } else if(c.id === 'shade'){
      // Тень: до 3.0 пробивает физически; на 3.0 (Дверь3) — не пробивает (EMP вместо);
      // на 3.5 — не пробивает (или ест рассудок).
      if(doorTier >= 3.0) canBreak = false;
    } else if(c.id === 'crawler'){
      var inFrenzy = c.crawlerBehavior && c.crawlerBehavior.canBreakMetal;
      if(inFrenzy){
        // В ярости — кислотой ломает всё (включая 3.5)
        canBreak = true;
      } else {
        // Вне ярости: не может с Дверь3 и выше (электричество раздражает)
        if(doorTier >= 3.0) canBreak = false;
      }
    }

    var newWBB = {};
    Object.keys(orig).forEach(function(n){
      var v = orig[n];
      if(!canBreak || v === Infinity){ newWBB[n] = Infinity; return; }
      v = v + flatBonusSec;
      if(hpMult > 1) v = v * hpMult;
      newWBB[n] = Math.round(v);
    });
    db.waitBeforeBreak = newWBB;
  });

  // Shade visibility
  if(fx.shade_vision && CREATURES.shade){
    CREATURES.shade.visibilityByZone['perimeter'] = 0.3;
  }
  if(fx.omniscience && CREATURES.shade){
    CREATURES.shade.visibilityByZone['far'] = 0.5;
    CREATURES.shade.visibilityByZone['perimeter'] = 0.7;
  }

  // Survivor — bonus start resources
  if(fx.survivor){
    G.flashBattery = 110;
    G.sanity = Math.min(120, G.sanity + 10); // +10% стартового рассудка
  }
  // Endurance (бывший «-5% энергии за уровень») теперь снижает расход рассудка
  // через множитель G._sanityDrainMult, который применяется в тике.
  G._sanityDrainMult = 1.0 - (fx.energy_save||0)/100;

  // Power efficiency больше не имеет смысла (энергия ∞), но оставляем поле для legacy
  G._powerEfficiencyMult = 1.0;
  G._flashRegenBonus = fx.flash_regen_bonus||0;

  updateAbilityBar();
  updateOfficeVisuals();
  applyDayModeVisuals();
}

// Пассивная генерация энергии
function tickPassivePower(){
  if(!G.gameActive) return;
  var fx = ST.activeEffects;
  if(fx.passive_power > 0){
    G.power = Math.min(100, G.power + fx.passive_power);
    updatePowerUI();
  }
}

// Замедление NPC в здании (освещение)
function getLightSlowdown(loc){
  var fx = ST.activeEffects;
  if(!fx.building_light || loc < 8) return 1.0;
  // loc 8-11 = здание
  return 1.0 + fx.building_light * 0.3; // +30% к интервалу за уровень
}

// Детектор движения — оповещение
function triggerMotionAlert(creature, camId){
  if(!ST.activeEffects.motion_alert) return;
  if(typeof G!=='undefined' && G.powerOut) return;
  // Подсветка кнопки камеры
  var el = document.getElementById('cbtn-'+camId);
  if(el){ el.style.boxShadow='0 0 8px #00ff41'; setTimeout(function(){el.style.boxShadow='';},600); }
  // Мигание пина — добавляем класс; снимается через updateMapStalker когда NPC уйдёт
  var pin = document.getElementById('map-pin-'+camId);
  if(pin) pin.classList.add('map-pin-motion');
  // Запись в панель ДАТЧИКИ
  if(typeof addSensorAlert==='function') addSensorAlert(creature, camId);
  if(typeof updateSensorPositions==='function') updateSensorPositions();
}

// Предчувствие (sixth sense) — предупреждение за 1 ход до двери
function checkPremonition(creature){
  if(!ST.activeEffects.premonition) return;
  var route = creature.route;
  var idx = route.indexOf(creature.loc);
  if(idx === route.length - 2){ // следующий шаг = дверь
    flashAlert();
    addLog('🔮 Предчувствие: '+creature.shortName+' у двери!','d');
  }
}

// ─── АКТИВИРУЕМЫЕ СПОСОБНОСТИ ─────────────────────────────────────────────────
function useAbility(key){
  if(!G.gameActive){ addLog('Ночь не началась!',''); return; }
  var ab = ST.abilities[key];
  // Decoy is camera-button only — bypass standard ability registration check
  if(key !== 'decoy'){
    if(!ab){ addLog('Способность не разблокирована.',''); return; }
    if(ab.uses >= ab.maxUses){ addLog('Способность исчерпана!','d'); return; }
    ab.uses++;
  }
  var fx = ST.activeEffects;

  if(key==='emp'){
    // ЭМИ: все NPC откатываются на 2 лок
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      var newLoc = Math.max(c.route[0], c.loc-2);
      c.loc = newLoc;
      stopDoorTimers(c);
    });
    addLog('⚡ ЭМИ-ИМПУЛЬС! Все существа откатились!','');
    if(typeof SFX!=='undefined') SFX.emp();
    // Вспышка экрана
    document.body.style.animation='empFlash 0.3s';
    setTimeout(function(){document.body.style.animation='';},300);
  }
  else if(key==='shotgun'){
    // Дробовик: NPC у двери или на cam11 откатывается
    var pushed=false;
    Object.values(CREATURES).forEach(function(c){
      if(!c.active)return;
      if(c.loc===14||c.loc===11||c.loc===10){
        var push = fx.shotgun_pushback||3;
        // ПРОФ.ДРОБОВИК: NPC прямо у двери (loc 11/14) выводится из боя на смену
        if(fx.arms_shotgun_pro && c.loc >= 11){
          c.active = false;
          c.loc = 0;
          stopDoorTimers(c);
          addLog('🔫 ПРОФ.ДРОБОВИК! '+c.shortName+' уничтожен!','w');
        } else {
          // Night 3: shotgun scares stalker away from locs 9-11 forever this shift
          if(c.id === 'stalker' && G.night === 3 && !c._night3ShotgunBarrier){
            c._night3ShotgunBarrier = true;
            stopDoorTimers(c);
            c.loc = 4;  // retreat to perimeter
            addLog('🔫 Выстрел! Сталкер рычит и отступает. Он больше не подойдёт к офису!','w');
          } else {
            var newIdx = Math.max(0, c.route.indexOf(c.loc)-push);
            c.loc = c.route[newIdx]||c.route[0];
            stopDoorTimers(c);
          }
        }
        pushed=true;
      }
    });
    if(!fx.arms_shotgun_pro || !pushed){
      addLog(pushed?'🔫 ВЫСТРЕЛ! Существо отброшено!':'🔫 Никого у двери.',pushed?'':'');
    }
    if(typeof SFX!=='undefined') SFX.shotgun();
  }
  else if(key==='flare'){
    // Ракета: NPC на периметре и дальше — стоп 20 сек
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=8)return;
      c.flashlightStunLeft += 8; // ~8 ходов ≈ 20 сек
    });
    addLog('🚀 РАКЕТА! Существа на периметре остановлены!','');
    if(typeof SFX!=='undefined') SFX.flareLaunch();
  }
  else if(key==='alarm'){
    // Сирена: NPC в здании стоп 10 сек + -15% питания
    G.power = Math.max(5, G.power-15);
    updatePowerUI();
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc<8||c.loc>11)return;
      c.flashlightStunLeft += 4;
    });
    addLog('🚨 СИРЕНА! Существа в здании остановлены! (-15% энергии)','w');
  }
  else if(key==='decoy'){
    // ПРИМАНКА — только против ПОЛЗУНА. 1 раз на каждой камере за смену.
    var camId = G.currentRoom;

    // Check 1-use per camera flag
    if(!G._decoyUsed) G._decoyUsed = {};
    if(G._decoyUsed[camId]){
      addLog('📦 Приманка на этой камере уже использована.','');
      return;
    }
    G._decoyUsed[camId] = true;

    // Update bait photos
    if(camId === 'cam-c2' && typeof BAIT_CAM !== 'undefined') BAIT_CAM.onUsed();
    if(camId === 'cam-c3' && typeof BAIT_CAM2 !== 'undefined') BAIT_CAM2.onUsed();
    if(camId === 'cam-c4' && typeof BAIT_CAM3 !== 'undefined') BAIT_CAM3.onUsed();
    if(camId.indexOf('cam-')<0){ addLog('📦 Приманку надо ставить на камере!',''); ab.uses--; return; }

    var camRequired = { 'cam-c2':1, 'cam-c3':2, 'cam-c4':3 };
    var minLvl = camRequired[camId];
    if(typeof minLvl === 'undefined'){
      addLog('📦 Приманку можно ставить только на cam-c2/c3/c4.','');
      ab.uses--; return;
    }
    if(fx.decoy_levels < minLvl){
      addLog('📦 Прокачай ПРИМАНКУ ур.'+minLvl+' чтобы ставить на этой камере.','');
      ab.uses--; return;
    }

    var crawler = CREATURES.crawler;
    if(!crawler || !crawler.active){
      addLog('📦 Ползун не активен, приманка пропадает зря.','');
      return;
    }

    // Найти loc для этой камеры (обратное от LOC_CAM)
    var targetLoc = LOC_CAM.indexOf(camId);
    if(targetLoc < 0){ addLog('📦 Камера не найдена.',''); ab.uses--; return; }

    // Перенаправляем ползуна к приманке
    stopDoorTimers(crawler);
    crawler.loc = targetLoc;
    crawler.flashlightStunLeft = 0;
    if(crawler.crawlerBehavior) crawler.crawlerBehavior.fedCount = 0;

    // Фиксируем ползуна на месте на 2 игровых часа, после — продолжает ходить
    crawler._feedingAtLoc = targetLoc;
    crawler._feedingUntilHour = G.hour + 2;
    addLog('📦 Ползун учуял приманку и набросился на неё! Занят на 2 часа...', '');

    if(crawler._feedTimer) clearInterval(crawler._feedTimer);
    var _feedTickCount = 0;
    crawler._feedTimer = setInterval(function(){
      if(!G.gameActive){ clearInterval(crawler._feedTimer); crawler._feedTimer = null; return; }
      if(G.hour >= crawler._feedingUntilHour){
        clearInterval(crawler._feedTimer);
        crawler._feedTimer = null;
        var usedLoc = crawler._feedingAtLoc;
        crawler._feedingAtLoc = null;
        crawler._feedingUntilHour = null;
        addLog('📦 Ползун доел и продолжает патрулировать.', '');
        // Разблокируем цепочку приманок
        if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.unlockAll();
        if(usedLoc === 1 && typeof BAIT_CAM  !== 'undefined') BAIT_CAM.onCrawlerDone();
        if(usedLoc === 2 && typeof BAIT_CAM2 !== 'undefined') BAIT_CAM2.onCrawlerDone();
        if(usedLoc === 3 && typeof BAIT_CAM3 !== 'undefined') BAIT_CAM3.onCrawlerDone();
      } else {
        // Держим на месте пока ест
        crawler.loc = crawler._feedingAtLoc;
        crawler.flashlightStunLeft = 2;
        // Звук чавканья каждые 10 тиков (~8 сек), только если игрок смотрит на эту камеру
        _feedTickCount++;
        if(_feedTickCount % 10 === 1){
          var feedingCamId = (typeof LOC_CAM !== 'undefined') ? LOC_CAM[crawler._feedingAtLoc] : null;
          if(feedingCamId && G.currentRoom === feedingCamId){
            if(typeof AUDIO === 'undefined' || !AUDIO.muted){
              var sfxId = (Math.random() < 0.5) ? 'sfx-crawler-feed-1' : 'sfx-crawler-feed-2';
              var feedSfx = document.getElementById(sfxId);
              if(feedSfx){ feedSfx.currentTime = 0; feedSfx.volume = 0.6; feedSfx.play().catch(function(){}); }
            }
          }
        }
      }
    }, 800);
  }
  else if(key==='trap'){
    // Ловушка: на текущей камере
    var camId=G.currentRoom;
    if(camId.indexOf('cam-')<0){ addLog('🪤 Ловушку надо ставить на камере!',''); ab.uses--; return; }
    // Найти NPC на этой камере и задержать
    var caught=false;
    var stalkerSlippedAway=false;
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      if(LOC_CAM[c.loc]===camId){
        // АНТИ-СТАЛКЕР: ХИТРОСТЬ — отдельный шанс срабатывания на сталкера.
        // Без скилла шанс 100%, со скиллом: 15/35/55/75/100% за уровни 1-5.
        // Игнорируем для других NPC — на них ловушка работает как раньше.
        if(c.id === 'stalker'){
          var cunningChance = (fx.as_cunning_chance!=null) ? fx.as_cunning_chance : 1.0;
          // Если скилл не прокачан — шанс по умолчанию был 100%, но это нелогично:
          // вы хотели чтобы сталкер мог обойти ловушку без скилла. Делаем по таблице:
          //   ур.0 = шанс 0% (всегда обходит)
          //   ур.1-5 = 15/35/55/75/100%
          var stalkerLvl = fx.as_cunning_lvl || 0;
          var chance = stalkerLvl > 0 ? cunningChance : 0;
          if(!RNG.chance(Math.round(chance * 100))){
            stalkerSlippedAway = true;
            return; // сталкер обошёл ловушку
          }
        }
        c.flashlightStunLeft += Math.round((fx.trap_duration||20000)/2300);
        caught=true;
      }
    });
    if(stalkerSlippedAway && !caught){
      addLog('🪤 Сталкер обошёл ловушку. Прокачай ХИТРОСТЬ.','d');
    } else {
      // Snare photo: if trap used on cam-c9 (КАМ 09), switch to triggered image
      if(camId === 'cam-c9' && typeof SNARE_CAM !== 'undefined') SNARE_CAM.onTriggered();
      addLog(caught?'🪤 ЛОВУШКА! Существо поймано!':'🪤 Ловушка установлена на '+camId, caught?'w':'');
    }
  }
  else if(key==='tripwire'){
    // Растяжка: стан NPC на текущей камере на 12 сек
    var camId=G.currentRoom;
    if(camId.indexOf('cam-')<0){ addLog('⚡ Растяжку надо ставить на камере!',''); ab.uses--; return; }
    var hit=false;
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      if(LOC_CAM[c.loc]===camId){
        c.flashlightStunLeft += 4; // ~12 сек
        hit=true;
      }
    });
    addLog(hit?'⚡ РАСТЯЖКА! '+ 'Стан 12 сек.':'⚡ Растяжка установлена на '+camId+'.','');
  }
  else if(key==='mine'){
    // ОРУЖЕЙНИК-мина: выводит NPC из боя на всю смену
    var camId=G.currentRoom;
    if(camId.indexOf('cam-')<0){ addLog('💣 Мину надо ставить на камере!',''); ab.uses--; return; }
    var hit=false;
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      if(LOC_CAM[c.loc]===camId){
        c.active = false;
        c.loc = 0;
        if(typeof stopDoorTimers === 'function') stopDoorTimers(c);
        addLog('💣 МИНА! '+c.shortName+' уничтожен на эту смену!','w');
        hit=true;
      }
    });
    if(hit && typeof SFX!=='undefined') SFX.mineBlast();
    if(!hit) addLog('💣 Мина установлена на '+camId+'. Ждёт прохода.','');
  }
  else if(key==='napalm'){
    // Блокирует зону текущей камеры на 30 сек + кормит ползуна (снимает голод как приманка)
    addLog('🍾 КОКТЕЙЛЬ МОЛОТОВА! Зона заблокирована на 30 сек.','w');
    var camId=G.currentRoom;
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      if(LOC_CAM[c.loc]===camId){
        c.flashlightStunLeft+=12;
        // Огонь отвлекает ползуна (кормит как приманка)
        if(c.id==='crawler' && c.crawlerBehavior){
          var cb = c.crawlerBehavior;
          cb.fedCount = (cb.fedCount||0) + 1;
          addLog('🔥 Ползун отвлёкся на пожар! ('+cb.fedCount+'/'+cb.fedNeeded+')','');
          if(cb.fedCount >= cb.fedNeeded && c.loc !== 11){
            cb.fedCount = 0;
            c.loc = 5; // отступ в колодец
            addLog('Ползун уползает...','');
          }
        }
      }
    });
  }
  else if(key==='cage'){
    // Ловушка-клетка: полный блок NPC на 40 сек
    var camId=G.currentRoom;
    if(camId.indexOf('cam-')<0){ addLog('🏗 Клетку надо ставить на камере!',''); ab.uses--; return; }
    Object.values(CREATURES).forEach(function(c){
      if(!c.active||c.loc>=14)return;
      if(LOC_CAM[c.loc]===camId){ c.flashlightStunLeft+=16; }
    });
    addLog('🏗 СИЛОВАЯ КЛЕТКА! Существо заблокировано!','w');
  }
  else if(key==='breath'){
    // Восстановить 15% рассудка (раньше было 10% батареи, но энергия теперь ∞)
    G.sanity = Math.min(100, G.sanity + 15);
    if(typeof updateSanityUI==='function') updateSanityUI();
    addLog('💨 Глубокий вдох. Рассудок +15%.','');
  }
  else if(key==='meditate'){
    // Замедляет всех NPC на 50% на 20 сек + 7 тиков stun
    Object.values(CREATURES).forEach(function(c){
      if(!c.active)return;
      c.flashlightStunLeft+=7;
    });
    G._meditationUntil = Date.now() + 20000;
    addLog('🧘 МЕДИТАЦИЯ! Все существа замедлены на 20 сек.','w');
  }
  else if(key==='timestop'){
    // Все NPC замирают на 30 сек + сброс таймеров взлома
    Object.values(CREATURES).forEach(function(c){
      if(!c.active)return;
      c.flashlightStunLeft+=12;
      stopDoorTimers(c);
    });
    // Бонус timestop: все способности перезаряжаются
    Object.keys(ST.abilities).forEach(function(k){
      if(k!=='timestop') ST.abilities[k].uses = 0;
    });
    if(typeof updateAbilityBar==='function') updateAbilityBar();
    addLog('⏸ ОСТАНОВКА ВРЕМЕНИ! Всё замерло. Способности перезаряжены.','w');
  }
  else if(key==='adrenaline'){
    // Перезарядка всех способностей
    Object.keys(ST.abilities).forEach(function(k){
      if(k!=='adrenaline') ST.abilities[k].uses=0;
    });
    addLog('💉 АДРЕНАЛИН! Все способности перезаряжены!','w');
  }

  updateAbilityBar();
}

// ─── ABILITY BAR (в игровом HUD) ─────────────────────────────────────────────
function updateAbilityBar(){
  var bar = document.getElementById('ability-bar');
  if(!bar) return;
  bar.innerHTML='';
  var fx = ST.activeEffects;

  var defs=[
    {key:'emp',      icon:'⚡', label:'ЭМИ',      avail:fx.emp_available},
    {key:'shotgun',  icon:'🔫', label:'ВЫСТРЕЛ',   avail:fx.shotgun_levels>0},
    {key:'flare',    icon:'🚀', label:'РАКЕТА',    avail:fx.flare_available || fx.arms_flare},
    {key:'alarm',    icon:'🚨', label:'СИРЕНА',    avail:fx.alarm_available},
    // decoy removed from abilities panel — use camera buttons only
    {key:'trap',     icon:'🪤', label:'ЛОВУШКА',   avail:fx.trap_levels>0},
    {key:'tripwire', icon:'⚡', label:'РАСТЯЖ.',   avail:fx.arms_tripwire},
    {key:'mine',     icon:'💣', label:'МИНА',      avail:fx.mine_available || fx.arms_mine},
    {key:'napalm',   icon:'🍾', label:'КОКТЕЙЛЬ',  avail:fx.napalm},
    {key:'cage',     icon:'🏗', label:'КЛЕТКА',    avail:fx.cage},
    {key:'breath',   icon:'💨', label:'ВДОХ',      avail:fx.deep_breath>0},
    {key:'meditate', icon:'🧘', label:'МЕДИТ.',    avail:fx.meditation},
    {key:'timestop', icon:'⏸', label:'СТОП',      avail:fx.time_stop},
    {key:'adrenaline',icon:'💉',label:'АДРЕНАЛ.',  avail:fx.adrenaline},
  ];

  defs.forEach(function(d){
    if(!d.avail) return;
    var ab = ST.abilities[d.key];
    var used = ab.uses >= ab.maxUses;
    var btn=document.createElement('button');
    btn.className='ability-btn'+(used?' used':'');
    btn.innerHTML='<span class="ab-icon">'+d.icon+'</span><span class="ab-label">'+d.label+'</span>'
      +'<span class="ab-uses">'+(ab.maxUses-ab.uses)+'/'+ab.maxUses+'</span>';
    btn.onclick=function(){useAbility(d.key);};
    btn.title=d.label;
    bar.appendChild(btn);
  });
  if(typeof updateWallGun === 'function') updateWallGun();
}

// ─── OFFICE VISUAL UPGRADES ───────────────────────────────────────────────────
function updateOfficeVisuals(){
  var fx = ST.activeEffects || {};
  var stage = fx.office_stage || 0;
  var pcLvl = fx.pc_level || 0;

  // Pick office background image based on upgrades
  // Priority: PC level > office stage
  // Ultimate upgrade: ПК ур.3 + Дверь ур.3 = особый вид офиса
  var doorLvl = fx.door_level || 0;
  if(pcLvl >= 3 && doorLvl >= 3){
    var photo = document.querySelector('#room-office .cam-photo');
    if(photo) photo.src = 'assets/office_ultimate.png';
    var officeRoom = document.getElementById('room-office');
    if(officeRoom){
      officeRoom.className = officeRoom.className.replace(/office-stage-\d/g,'').trim();
      officeRoom.classList.add('office-stage-3','office-ultimate');
    }
    var labelEl = document.querySelector('#room-office .cam-label');
    if(labelEl) labelEl.textContent = 'ОХРАННАЯ КОМНАТА — МАКСИМАЛЬНЫЙ УРОВЕНЬ';
    // Дверь намертво закрыта, текстура скрыта
    if(typeof G !== 'undefined' && !G.doorClosed){
      G.doorClosed = true;
    }
    if(typeof setDoorUI === 'function') setDoorUI(true);
    if(typeof updateDoorImage === 'function') updateDoorImage();
    return;
  }

  // ПК ур.3 + Дверь ур.2 = мощный ПК со стальной дверью
  if(pcLvl >= 3 && doorLvl >= 2 && doorLvl < 3){
    var photo8 = document.querySelector('#room-office .cam-photo');
    if(photo8) photo8.src = 'assets/office_pc3_door2.png';
    var officeRoom8 = document.getElementById('room-office');
    if(officeRoom8){
      officeRoom8.className = officeRoom8.className.replace(/office-stage-\d/g,'').trim();
      officeRoom8.classList.add('office-stage-3');
    }
    var labelEl8 = document.querySelector('#room-office .cam-label');
    if(labelEl8) labelEl8.textContent = 'ОХРАННАЯ КОМНАТА — ПК УР.3';
    return;
  }

  // ПК ур.2 + Дверь ур.2 = современный ПК со стальной ржавой дверью
  if(pcLvl >= 2 && doorLvl >= 2){
    var photo7 = document.querySelector('#room-office .cam-photo');
    if(photo7) photo7.src = 'assets/office_pc2_door2.png';
    var officeRoom7 = document.getElementById('room-office');
    if(officeRoom7){
      officeRoom7.className = officeRoom7.className.replace(/office-stage-\d/g,'').trim();
      officeRoom7.classList.add('office-stage-3');
    }
    var labelEl7 = document.querySelector('#room-office .cam-label');
    if(labelEl7) labelEl7.textContent = 'ОХРАННАЯ КОМНАТА — ПК УР.2';
    return;
  }

  // ПК ур.1 + Дверь ур.2 + Обустройство = стальная дверь в обустроенной красной комнате
  if(pcLvl === 1 && doorLvl >= 2 && stage >= 3){
    var photo6 = document.querySelector('#room-office .cam-photo');
    if(photo6) photo6.src = 'assets/office_pc1_door2_furnish.png';
    var officeRoom6 = document.getElementById('room-office');
    if(officeRoom6){
      officeRoom6.className = officeRoom6.className.replace(/office-stage-\d/g,'').trim();
      officeRoom6.classList.add('office-stage-3');
    }
    var labelEl6 = document.querySelector('#room-office .cam-label');
    if(labelEl6) labelEl6.textContent = 'ОХРАННАЯ КОМНАТА — ОБОРУДОВАНА';
    return;
  }

  // ПК ур.1 + Дверь ур.2 + Починка стен = стальная ржавая дверь в отремонтированной комнате
  if(pcLvl === 1 && doorLvl >= 2 && stage >= 2){
    var photo5 = document.querySelector('#room-office .cam-photo');
    if(photo5) photo5.src = 'assets/office_pc1_door2_repair.png';
    var officeRoom5 = document.getElementById('room-office');
    if(officeRoom5){
      officeRoom5.className = officeRoom5.className.replace(/office-stage-\d/g,'').trim();
      officeRoom5.classList.add('office-stage-2');
    }
    var labelEl5 = document.querySelector('#room-office .cam-label');
    if(labelEl5) labelEl5.textContent = 'ОХРАННАЯ КОМНАТА — СТАЛЬНАЯ ДВЕРЬ';
    return;
  }

  // ПК ур.1 + Дверь ур.1 + Починка стен = отремонтированная комната с деревянной дверью
  if(pcLvl === 1 && doorLvl >= 1 && stage >= 2){
    var photo4 = document.querySelector('#room-office .cam-photo');
    if(photo4) photo4.src = 'assets/office_pc1_door1_repair.png';
    var officeRoom4 = document.getElementById('room-office');
    if(officeRoom4){
      officeRoom4.className = officeRoom4.className.replace(/office-stage-\d/g,'').trim();
      officeRoom4.classList.add('office-stage-2');
    }
    var labelEl4 = document.querySelector('#room-office .cam-label');
    if(labelEl4) labelEl4.textContent = 'ОХРАННАЯ КОМНАТА — ОТРЕМОНТИРОВАНО';
    return;
  }

  // ПК ур.1 + Дверь ур.1 + Уборка = чистая комната с деревянной дверью
  if(pcLvl === 1 && doorLvl >= 1 && stage >= 1){
    var photo3 = document.querySelector('#room-office .cam-photo');
    if(photo3) photo3.src = 'assets/office_pc1_door1_clean.png';
    var officeRoom3 = document.getElementById('room-office');
    if(officeRoom3){
      officeRoom3.className = officeRoom3.className.replace(/office-stage-\d/g,'').trim();
      officeRoom3.classList.add('office-stage-1');
    }
    var labelEl3 = document.querySelector('#room-office .cam-label');
    if(labelEl3) labelEl3.textContent = 'ОХРАННАЯ КОМНАТА — УБРАНО';
    return;
  }

  // ПК ур.1 + Дверь ур.1 (но не выше combо) = особый вид с деревянной дверью
  if(pcLvl === 1 && doorLvl >= 1){
    var photo2 = document.querySelector('#room-office .cam-photo');
    if(photo2) photo2.src = 'assets/office_pc1_door1.png';
    var officeRoom2 = document.getElementById('room-office');
    if(officeRoom2){
      officeRoom2.className = officeRoom2.className.replace(/office-stage-\d/g,'').trim();
      officeRoom2.classList.add('office-stage-0');
    }
    var labelEl2 = document.querySelector('#room-office .cam-label');
    if(labelEl2) labelEl2.textContent = 'ОХРАННАЯ КОМНАТА — ДВЕРЬ УСТАНОВЛЕНА';
    return;
  }

  var imgMap = {
    'pc0_s0': 'assets/office.png',      // базовый — без ПК, заброшен
    'pc1_s0': 'assets/office_pc1.png',   // ПК ур.1, не убрано
    'pc1_s1': 'assets/office_clean.png', // ПК ур.1, убрано
    'pc1_s2': 'assets/office_repair.png',// ПК ур.1, стены починены
    'pc1_s3': 'assets/office_furnish.png',// ПК ур.1, обустроено
    'pc2_s3': 'assets/office_pc2.png',   // ПК ур.2, обустроено
    'pc3_s3': 'assets/office_pc3.png',   // ПК ур.3, обустроено
  };

  var key = 'pc'+pcLvl+'_s'+stage;
  // Fallback: try pc level with current stage, then lower
  var img = imgMap[key];
  if(!img){
    // Try lower stages with same PC
    for(var s=stage;s>=0;s--){
      var k='pc'+pcLvl+'_s'+s;
      if(imgMap[k]){ img=imgMap[k]; break; }
    }
    // Try lower PC with same stage
    if(!img){
      for(var p=pcLvl;p>=0;p--){
        var k2='pc'+p+'_s'+stage;
        if(imgMap[k2]){ img=imgMap[k2]; break; }
      }
    }
    if(!img) img = imgMap['pc0_s0'];
  }

  // Update office photo
  var photo = document.querySelector('#room-office .cam-photo');
  if(photo && img) photo.src = img;

  // Update room class
  var officeRoom = document.getElementById('room-office');
  if(officeRoom){
    officeRoom.className = officeRoom.className.replace(/office-stage-\d/g,'').trim();
    officeRoom.classList.add('office-stage-'+stage);
  }

  // Update label
  var labels = [
    'ОХРАННАЯ КОМНАТА',
    'ОХРАННАЯ КОМНАТА — УБРАНО',
    'ОХРАННАЯ КОМНАТА — ОТРЕМОНТИРОВАНО',
    'ОХРАННАЯ КОМНАТА — ОБОРУДОВАНА'
  ];
  var labelEl = document.querySelector('#room-office .cam-label');
  if(labelEl) labelEl.textContent = labels[stage] || labels[0];
}

// Apply day-mode camera filters based on skill levels
function applyDayModeVisuals(){
  var fx = ST.activeEffects || {};
  var pcLvl  = fx.pc_level  || 0;
  var antLvl = fx.antenna_level || 0;

  // PC upgrade: grayscale → color + overlay tint removal
  document.querySelectorAll('.cam-photo').forEach(function(el){
    el.classList.remove('color-lvl1','color-lvl2','color-lvl3');
    if(pcLvl > 0) el.classList.add('color-lvl'+pcLvl);
  });
  // Apply color-active to cam-rooms for overlay/aberration removal
  document.querySelectorAll('.cam-room').forEach(function(el){
    el.classList.remove('color-active-1','color-active-2','color-active-3');
    if(pcLvl > 0) el.classList.add('color-active-'+pcLvl);
  });

  // Antenna upgrade: reduce static/noise/glitch/flicker
  document.querySelectorAll('.cam-room').forEach(function(el){
    el.classList.remove('antenna-lvl1','antenna-lvl2','antenna-lvl3');
    if(antLvl > 0) el.classList.add('antenna-lvl'+antLvl);
  });

  // PC лвл 2+: КАМ 07 и КАМ 06 — кнопка переключения фото/видео
  ['c6','c7'].forEach(function(cam){
    var img  = document.getElementById('cam-'+cam+'-photo');
    var vid  = document.getElementById('cam-'+cam+'-video');
    var btn  = document.getElementById('cam-'+cam+'-vtoggle');
    if(!img || !vid) return;
    if(pcLvl >= 2){
      if(btn) btn.style.display = 'flex';
      var showVideo = (CAM_VIDEO_STATE[cam] !== 'photo');
      img.style.display  = showVideo ? 'none' : '';
      vid.style.display  = showVideo ? 'block' : 'none';
      if(showVideo){ vid.playbackRate = 1.0; if(vid.paused) vid.play().catch(function(){}); }
      else          { vid.pause(); }
      if(btn) btn.textContent = showVideo ? '🖼' : '📹';
      if(btn) btn.title = showVideo ? 'Переключить на фото' : 'Переключить на видео';
    } else {
      if(btn) btn.style.display = 'none';
      img.style.display = '';
      vid.style.display = 'none';
      vid.pause();
    }
  });

  // Snare (силок): delegate to SNARE_CAM system
  if(typeof SNARE_CAM!=='undefined') SNARE_CAM.update();
}


// ─── CAM VIDEO TOGGLE ─────────────────────────────────────────────────────────
var CAM_VIDEO_STATE = { c6: 'video', c7: 'video' };

function toggleCamVideo(cam){
  CAM_VIDEO_STATE[cam] = (CAM_VIDEO_STATE[cam] === 'video') ? 'photo' : 'video';
  if(typeof applySkillEffects === 'function') applySkillEffects();
}

// ─── SKILL TREE UI ────────────────────────────────────────────────────────────
ST._activeTree = 'electronics';

function openSkillTree(){
  loadSkillData();
  if(typeof LEVEL_SYSTEM!=='undefined'){ ST.points=LEVEL_SYSTEM.skillPoints; ST.rebirths=LEVEL_SYSTEM.rebirths; }
  renderAllTrees();
  updateSTPointsDisplay();
  var screen = document.getElementById('skilltree-screen');
  if(screen) screen.classList.add('active');
  _applyClassTabVisibility();
  switchSTTab('office');
  if(typeof updateLevelUI==='function') updateLevelUI();
  // Сбросить текст кнопки (мог быть изменён бесконечным режимом)
  var btn = document.querySelector('#skilltree-screen .st-back-btn');
  if(btn) btn.textContent = '← НАЗАД';
}

function _applyClassTabVisibility(){
  // В бесконечном режиме все ветки открыты
  if(typeof G !== 'undefined' && G.endlessMode){
    var tabArms = document.getElementById('st-tab-arms');
    var tabLab  = document.getElementById('st-tab-lab');
    if(tabArms) tabArms.style.display = '';
    if(tabLab)  tabLab.style.display  = '';
    return;
  }
  var cls = (typeof CLASS_SYSTEM!=='undefined') ? CLASS_SYSTEM.current() : 'guard';
  var hideArms = (cls === 'guard' || cls === 'scientist');
  var hideLab  = (cls === 'guard' || cls === 'military');
  var tabArms = document.getElementById('st-tab-arms');
  var tabLab  = document.getElementById('st-tab-lab');
  var cntArms = document.getElementById('st-content-arms');
  var cntLab  = document.getElementById('st-content-lab');
  if(tabArms) tabArms.style.display = hideArms ? 'none' : '';
  if(tabLab)  tabLab.style.display  = hideLab  ? 'none' : '';
  if(cntArms && hideArms) cntArms.classList.remove('active');
  if(cntLab  && hideLab)  cntLab.classList.remove('active');
}
function closeSkillTree(){
  var screen = document.getElementById('skilltree-screen');
  if(screen) screen.classList.remove('active');
  // Бесконечный режим: кнопка закрытия = запуск следующей волны
  if(typeof G !== 'undefined' && G._endlessPendingWave){
    G._endlessPendingWave = false;
    if(typeof ENDLESS !== 'undefined') ENDLESS.launchWave();
    return;
  }
  // Кампания: аккумулятор изучен — запустить ночь
  if(typeof G!=='undefined' && G.night >= 13 && !G.gameActive){
    var _hasBat = (typeof ST!=='undefined'&&ST.activeEffects) ? ST.activeEffects.has_battery : false;
    if(_hasBat){
      if(typeof hideBatteryWarning==='function') hideBatteryWarning();
      if(typeof startNight==='function') startNight(G.night);
    }
  }
}

function switchSTTab(tree){
  ST._activeTree = tree;
  document.querySelectorAll('.st-tab').forEach(function(t){t.classList.remove('active');});
  var tb=document.getElementById('st-tab-'+tree);if(tb)tb.classList.add('active');
  document.querySelectorAll('.st-content').forEach(function(c){c.classList.remove('active');});
  var ct=document.getElementById('st-content-'+tree);if(ct)ct.classList.add('active');
  if(typeof TUTORIAL!=='undefined' && TUTORIAL.onTabSwitched) TUTORIAL.onTabSwitched(tree);
}

function updateSTPointsDisplay(){
  var pts = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.skillPoints : ST.points;
  var el=document.getElementById('st-points-val');if(el)el.textContent=pts;
  var hsp=document.getElementById('hud-skill-pts');if(hsp)hsp.textContent=pts+' 💎';
}

function renderAllTrees(){
  Object.keys(SKILL_TREES).forEach(function(tree){ renderSkillTree(tree); });
}

function renderSkillTree(treeKey){
  var tree=SKILL_TREES[treeKey];
  var container=document.getElementById('st-content-'+treeKey);
  if(!container)return;
  var rows={};
  tree.skills.forEach(function(sk){
    if(!rows[sk.row])rows[sk.row]=[];
    rows[sk.row].push(sk);
  });
  var html='<div class="skill-tree">';
  var rowKeys=Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
  rowKeys.forEach(function(r){
    var rowSkills=rows[r].slice().sort(function(a,b){return a.col-b.col;});
    html+='<div class="skill-row">';
    rowSkills.forEach(function(sk,i){
      if(i>0)html+='<div class="skill-connector-h"></div>';
      var lvl=getSkillLevel(sk.id);
      var unlockable=isUnlockable(sk);
      var maxed=lvl>=sk.maxLevel;
      var cost=!maxed?getActualCost(sk, lvl):0;
      var cls='skill-node';
      // Class block (УЧЁНЫЙ не может обрез)
      var classBlocked = (typeof ST!=='undefined' && ST.activeEffects
                          && ST.activeEffects.class_block_shotgun
                          && sk.id === 'h_shotgun');
      // Story lock (охранник — сюжетная линейность)
      var storyLocked = (typeof isStoryLocked==='function') && isStoryLocked(sk.id);
      if(maxed)cls+=' maxed';
      else if(classBlocked) cls+=' locked';
      else if(storyLocked) cls+=' locked story-locked';
      else if(unlockable)cls+=' unlockable';
      else cls+=' locked';
      // All nodes are clickable — open modal
      var onclick='onclick="showSkillModal(\''+sk.id+'\')"';
      var dots='';
      for(var d=0;d<sk.maxLevel;d++){
        dots+='<div class="skill-lvl-dot'+(d<lvl?' filled':'')+'"></div>';
      }
      var costHtml='';
      if(!maxed){
        if(classBlocked){
          costHtml='<div class="skill-cost" style="color:#ff6644">⛔ КЛАСС</div>';
        } else if(storyLocked){
          costHtml='<div class="skill-cost story-lock-label">📖 ПО СЮЖЕТУ</div>';
        } else {
          var cantAfford=ST.points<cost;
          costHtml='<div class="skill-cost'+(cantAfford?' cant-afford':'')+'">'+(unlockable?'💎 '+cost:'🔒')+'</div>';
        }
      }
      html+='<div class="'+cls+'" data-id="'+sk.id+'" '+onclick+'>'
        +'<div class="skill-node-header">'
        +'<span class="skill-icon">'+sk.icon+'</span>'
        +'<span class="skill-name">'+sk.name+'</span>'
        +'</div>'
        +(sk.maxLevel>1?'<div class="skill-levels">'+dots+'</div>':'')
        +costHtml
        +(maxed?'<span class="skill-status">✓</span>':'')
        +'</div>';
    });
    html+='</div>';
  });
  html+='</div>';
  container.innerHTML=html;
}

// ─── SKILL MODAL ─────────────────────────────────────────────────────────────
function showSkillModal(id){
  var skill = getSkillDef(id);
  if(!skill) return;
  // Story-locked: show friendly message instead of modal
  if(typeof isStoryLocked==='function' && isStoryLocked(id)){
    var modal = document.getElementById('skill-modal');
    if(modal){
      modal.innerHTML = '<div class="sm-backdrop" onclick="closeSkillModal()"></div>'
        + '<div class="sm-box story-lock-box">'
        + '<button class="sm-close" onclick="closeSkillModal()">✕</button>'
        + '<div class="sm-story-icon">📖</div>'
        + '<div class="sm-story-title">ОТКРОЕТСЯ ПО СЮЖЕТУ</div>'
        + '<div class="sm-story-text">Этот навык станет доступен в ходе прохождения кампании.<br>Продолжай играть — он откроется на нужном уровне.</div>'
        + '<button class="btn sm-story-btn" onclick="closeSkillModal()">ПОНЯЛ</button>'
        + '</div>';
      modal.classList.add('active');
    }
    return;
  }
  var lvl = getSkillLevel(id);
  var maxed = lvl >= skill.maxLevel;
  var unlockable = isUnlockable(skill);
  var canBuy = canUnlock(skill);
  var cost = !maxed ? getActualCost(skill, lvl) : 0;
  var pts = (typeof LEVEL_SYSTEM!=='undefined') ? LEVEL_SYSTEM.skillPoints : ST.points;

  // Requirements text
  var reqText = '';
  if(skill.requires.length > 0){
    var reqNames = skill.requires.map(function(rid){
      var rsk = getSkillDef(rid);
      var rDone = getSkillLevel(rid) > 0;
      return (rDone ? '✅ ' : '❌ ') + (rsk ? rsk.name : rid);
    });
    reqText = reqNames.join(', ');
  } else {
    reqText = 'Нет';
  }

  // Level dots
  var dots = '';
  for(var d=0;d<skill.maxLevel;d++){
    dots += '<div class="skill-lvl-dot'+(d<lvl?' filled':'')+'"></div>';
  }

  // Tier label based on row
  var tierLabels = ['КУСТАРНОЕ','КУСТАРНОЕ','САМОДЕЛЬНОЕ','САМОДЕЛЬНОЕ','ПРОМЫШЛЕННОЕ','ПРОМЫШЛЕННОЕ','ПЕРЕДОВОЕ','ПЕРЕДОВОЕ'];
  var tier = tierLabels[skill.row] || 'ПЕРЕДОВОЕ';

  // Class restrictions (e.g. УЧЁНЫЙ не может покупать обрез)
  var fxClassBlock = (typeof ST!=='undefined' && ST.activeEffects && ST.activeEffects.class_block_shotgun);
  var blockedByClass = fxClassBlock && id === 'h_shotgun';

  // Button
  var btnHtml = '';
  if(maxed){
    btnHtml = '<div class="sm-maxed">✓ МАКСИМАЛЬНЫЙ УРОВЕНЬ</div>';
  } else if(blockedByClass){
    btnHtml = '<button class="sm-btn sm-btn-locked" disabled style="color:#ff6644;border-color:#ff6644">🔒 НЕДОСТУПНО ДЛЯ КЛАССА УЧЁНЫЙ</button>';
  } else if(!unlockable){
    btnHtml = '<button class="sm-btn sm-btn-locked" disabled>🔒 ЗАБЛОКИРОВАНО</button>';
  } else if(!canBuy){
    btnHtml = '<button class="sm-btn sm-btn-locked" disabled>💎 НЕДОСТАТОЧНО ОЧКОВ ('+cost+')</button>';
  } else {
    btnHtml = '<button class="sm-btn sm-btn-buy" onclick="unlockSkill(\''+id+'\');showSkillModal(\''+id+'\')">💎 УЛУЧШИТЬ — '+cost+' очк.</button>';
  }

  var modal = document.getElementById('skill-modal');
  modal.innerHTML = ''
    +'<div class="sm-backdrop" onclick="closeSkillModal()"></div>'
    +'<div class="sm-box">'
    +  '<button class="sm-close" onclick="closeSkillModal()">✕</button>'
    +  '<div class="sm-header">'
    +    '<span class="sm-icon">'+skill.icon+'</span>'
    +    '<div class="sm-titles">'
    +      '<div class="sm-name">'+skill.name+'</div>'
    +      '<div class="sm-tier">'+tier+'</div>'
    +    '</div>'
    +  '</div>'
    +  (skill.maxLevel>1 ? '<div class="sm-levels">'+dots+'<span class="sm-lvl-text">ур. '+lvl+' / '+skill.maxLevel+'</span></div>' : '')
    +  '<div class="sm-desc">'+skill.desc+'</div>'
    +  '<div class="sm-info-grid">'
    +    '<div class="sm-info-item"><span class="sm-info-label">ТРЕБОВАНИЯ</span><span class="sm-info-val">'+reqText+'</span></div>'
    +    (!maxed ? '<div class="sm-info-item"><span class="sm-info-label">СТОИМОСТЬ</span><span class="sm-info-val">💎 '+cost+' очк.</span></div>' : '')
    +    '<div class="sm-info-item"><span class="sm-info-label">ВАШИ ОЧКИ</span><span class="sm-info-val">💎 '+pts+'</span></div>'
    +  '</div>'
    +  btnHtml
    +'</div>';
  modal.classList.add('active');
}

function closeSkillModal(){
  var modal = document.getElementById('skill-modal');
  modal.classList.remove('active');
  modal.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  СЮЖЕТНАЯ ЛИНЕЙНОСТЬ (охранник) — story linearity system
// ═══════════════════════════════════════════════════════════════════════════════

// Какие навыки выдаются бесплатно на каком уровне (ночи)
var STORY_SKILLS = {
  1: [{ id:'pc_1',      label:'🖥 ПК ур.1',    hint:'Найти и запустить старый компьютер. Открывает камеры наблюдения.' }],
  2: [{ id:'door_1',    label:'🚪 Дверь ур.1',  hint:'Деревянная дверь с засовом. Базовая защита от вторжения.' }],
  3: [
    { id:'cleanup',     label:'🧹 Уборка офиса',  hint:'Убрать мусор из комнаты. Офис становится пригодным для работы.' },
    { id:'o_barricade', label:'🪵 Баррикада',      hint:'Доски и хлам у двери. NPC стучит дольше перед взломом.' },
    { id:'h_shotgun',   label:'🔫 Ружьё',          hint:'Самодельное огнестрельное. Отбрасывает NPC у двери. 3 раза за смену.' },
  ],
  4: [
    { id:'office_restore_2', label:'🔨 Починка стен',  hint:'Шпаклёвка и зачистка. Офис становится жилым помещением.' },
    { id:'antenna_1',        label:'📡 Антенна ур.1',  hint:'Собрана из банок и медной проволоки. Меньше помех на камерах, +3 дБ.' },
    { id:'h_flash_1',        label:'🔦 Фонарь ур.1',   hint:'Портативный фонарик. Замедляет NPC при вспышке. Батарея 60%.' },
    { id:'h_decoy_1',        label:'🪤 Приманка ур.1', hint:'Мясо в банке на Камере 3. Отвлекает Ползуна. 1 заряд за смену.' },
    { id:'h_veteran_1',      label:'🎓 Опытный ур.1',  hint:'+15% к получаемому опыту в текущей кампании.' },
  ],
  5: [
    { id:'office_restore_3', label:'🛋 Обустройство',   hint:'Краска, мебель, порядок. Офис становится жилым — рассудок падает медленнее.' },
    { id:'door_2',           label:'🛡 Дверь ур.2',     hint:'Тяжёлая стальная дверь. NPC ломает вдвое дольше.' },
    { id:'o_lock',           label:'🔩 Засов',           hint:'Металлический засов. +10 сек ко времени взлома двери.' },
    { id:'h_snare',          label:'🪢 Силок',           hint:'Стальной трос на лестнице. 40% шанс пассивно поймать NPC.' },
    { id:'h_noisemaker',     label:'🔔 Шумелка',         hint:'Жестяные банки на входе. Предупреждает звуком о вторжении.' },
  ],
  7: [
    { id:'antenna_2', label:'📡 Антенна ур.2', hint:'Решётка с медным контуром. Фильтрует шум Тени. Камеры чище, больше деталей.' },
  ],
  8: [
    { id:'corridor_cleanup', label:'🪣 Уборка коридора', hint:'Убрать мусор и хлам в коридоре. Меняет вид камер 8А и 8Б — чище, лучше видно NPC.' },
    { id:'h_veteran_2',      label:'🎓 Опытный ур.2',   hint:'+30% к получаемому опыту в текущей кампании.' },
  ],
  9: [
    { id:'corridor_repair', label:'🪟 Ремонт коридора', hint:'Побелка стен и заделка трещин. Камеры 8А и 8Б — светлые чистые стены.' },
    { id:'h_spike_trap',    label:'📌 Самодельные шипы', hint:'Шипы на полу камеры. NPC задерживается на 15 сек и отступает на 1 зону. 1 раз за смену.' },
  ],
  10: [
    { id:'pc_3',   label:'🖥 ПК ур.3',    hint:'Рабочая станция max-конфига. Камеры 100% качество, полный цвет, нет помех. Открывает Дверь ур.3.' },
    { id:'door_3', label:'🤖 Дверь ур.3', hint:'Умная дверь с биометрией. Не тратит энергию. Автозакрытие при NPC. Требует ПК ур.3.' },
  ],
  11: [
    { id:'antenna_3', label:'📡 Антенна ур.3', hint:'«Сигма-Макс» — военная разработка. Максимальный сигнал, видны все NPC на карте. Открывает полную запись Волкова.' },
  ],
  13: [
    { id:'solar_panels', label:'☀ Солн. панели', hint:'Панели на крыше + автопрожектор. +0.3% энергии в сек. Тень у двери отгоняется автоматически.' },
  ],
  14: [
    { id:'motion_3',    label:'🎯 Датчик ур.3',  hint:'Сеть сенсоров. NPC виден везде на карте.' },
    { id:'o_reinforce', label:'⛓ Укрепление',    hint:'Стальные пластины на двери. Ползун в режиме ярости грызёт дверь в 2× дольше.' },
  ],
  12: [
    { id:'h_tripwire',  label:'🧵 Растяжка',        hint:'Сигнальная проволока. Мгновенное оповещение + NPC замедляется на 8 сек. 2 зоны.' },
    { id:'h_bear_trap', label:'⚙️ Капкан',           hint:'Стальные челюсти у двери. NPC застревает на 20 сек. Автоматически сбрасывается.' },
    { id:'h_smoke_bomb',label:'💨 Дымовая шашка',    hint:'Ослепляет NPC на камерах 9/10/11 на 12 сек. 2 раза за смену.' },
    { id:'motion_2',    label:'🎯 Датчик ур.2',      hint:'ИК-датчик. NPC виден в здании и на периметре.' },
    { id:'h_decoy_3',   label:'📦 Приманка ур.3',    hint:'Свежая туша. Всего 3 заряда на 3 камерах. Полностью снимает голод Ползуна.' },
    { id:'h_veteran_3', label:'🎓 Опытный ур.3',     hint:'+50% к получаемому опыту в текущей кампании.' },
  ],
  6: [
    { id:'pc_2',          label:'🖥 ПК ур.2',         hint:'Мощный ПК + видеокарта. Чёткая картинка, меньше шума на камерах.' },
    { id:'soundproof',    label:'🔇 Шумоизоляция',    hint:'Поглощает эхо и шёпот. Тень слабее. Рассудок падает медленнее.' },
    { id:'motion_1',      label:'🎯 Датчик ур.1',      hint:'Датчик движения на 1-м этаже. Предупреждает о приближении NPC.' },
    { id:'h_flash_2',     label:'🔦 Фонарь ур.2',      hint:'Улучшенный фонарик. Дольше оглушает, батарея 80%.' },
    { id:'h_flash_3',     label:'🔦 Фонарь ур.3',      hint:'Тактический фонарь. Максимальное оглушение, батарея 100%.' },
    { id:'o_projector',   label:'💡 Прожектор',        hint:'Заливает лестницу светом. Тень не может материализоваться на cam10.' },
    { id:'h_decoy_2',     label:'🪤 Приманка ур.2',    hint:'Приманка на Камере 4. Дополнительный заряд для Ползуна.' },
  ]
};

// Все сюжетные ID (для проверки «уже в системе»)
var STORY_SKILL_IDS = (function(){
  var ids = {};
  Object.values(STORY_SKILLS).forEach(function(arr){ arr.forEach(function(s){ ids[s.id] = true; }); });
  return ids;
})();

// Навык заблокирован по сюжету для охранника?
function isStoryLocked(skillId){
  if(typeof G !== 'undefined' && G.endlessMode) return false; // в бесконечном режиме нет сюжетных замков
  var fx = (typeof ST !== 'undefined' && ST.activeEffects) ? ST.activeEffects : {};
  if(fx.class_id !== 'guard') return false;          // только охранник

  // Личные навыки всегда открыты
  if(typeof SKILL_TREES !== 'undefined' && SKILL_TREES.personal){
    var persIds = {};
    SKILL_TREES.personal.skills.forEach(function(s){ persIds[s.id] = true; });
    if(persIds[skillId]) return false;
  }

  // Во время игры используем текущую ночь; в лобби — максимум из пройденных ночей
  var night = 0;
  if(typeof G !== 'undefined' && G.gameActive) {
    night = G.night;
  } else {
    var _saved = (typeof loadSavedNights === 'function') ? loadSavedNights() : [];
    night = _saved.length > 0 ? Math.max.apply(null, _saved) : 0;
  }

  // Сюжетный навык: открыт если его уровень <= текущей ночи
  if(STORY_SKILL_IDS[skillId]){
    for(var n in STORY_SKILLS){
      var arr = STORY_SKILLS[n];
      for(var i = 0; i < arr.length; i++){
        if(arr[i].id === skillId){
          return parseInt(n) > night; // заблокирован если его уровень ещё не наступил
        }
      }
    }
  }

  // Все остальные не-личные навыки — заблокированы по сюжету
  return true;
}

// Выдать сюжетный навык бесплатно (без трат очков)
function grantStorySkill(id){
  if(!ST || !ST.unlockedSkills) return;
  if(ST.unlockedSkills[id]) return; // уже есть
  var skill = getSkillDef(id);
  if(!skill) return;
  ST.unlockedSkills[id] = 1;
  saveSkillData();
  recalcEffects();
  if(typeof applyDayModeVisuals === 'function') applyDayModeVisuals();
  if(typeof updateOfficeVisuals === 'function') updateOfficeVisuals();
  if(typeof updateDoorHideButtons === 'function') updateDoorHideButtons();
  if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
  if(typeof renderSkillTree === 'function'){
    ['office','hunter','personal'].forEach(function(t){ renderSkillTree(t); });
  }
}

// Выдать все сюжетные навыки текущей ночи
function grantStorySkillsForNight(night){
  var arr = STORY_SKILLS[night];
  if(!arr) return;
  arr.forEach(function(s){ grantStorySkill(s.id); });
}

// ─── ПОДСКАЗКА СЛЕВА (story hint panel) ───────────────────────────────────────
function showStoryHintPanel(night){
  var arr = STORY_SKILLS[night];
  if(!arr || !arr.length) return;

  var existing = document.getElementById('story-hint-panel');
  if(existing) existing.remove();

  var items = arr.map(function(s){
    return '<div class="shp-item"><div class="shp-item-label">' + s.label + '</div>'
         + '<div class="shp-item-hint">' + s.hint + '</div></div>';
  }).join('');

  var panel = document.createElement('div');
  panel.id = 'story-hint-panel';
  panel.className = 'story-hint-panel';
  panel.innerHTML = '<div class="shp-header">📋 СЮЖЕТНЫЙ ПРОГРЕСС</div>'
    + '<div class="shp-sub">УРОВЕНЬ ' + night + ' — ПОЛУЧЕНО БЕСПЛАТНО:</div>'
    + '<div class="shp-items">' + items + '</div>'
    + '<div class="shp-divider"></div>'
    + '<div class="shp-personal">💡 Очки навыков трать на ЛИЧНЫЕ навыки</div>'
    + '<button class="shp-close" onclick="closeStoryHintPanel()">✕</button>';

  document.body.appendChild(panel);

  // Анимация появления
  requestAnimationFrame(function(){
    panel.classList.add('shp-in');
  });

  // Автоскрытие через 12 секунд
  panel._autoHide = setTimeout(function(){ closeStoryHintPanel(); }, 12000);
}

function closeStoryHintPanel(){
  var panel = document.getElementById('story-hint-panel');
  if(!panel) return;
  if(panel._autoHide) clearTimeout(panel._autoHide);
  panel.classList.remove('shp-in');
  panel.classList.add('shp-out');
  setTimeout(function(){ if(panel.parentNode) panel.remove(); }, 400);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BAIT CHAIN LOCK SYSTEM
//  Blocks next bait while crawler is eating current one
// ═══════════════════════════════════════════════════════════════════════════════
var BAIT_CHAIN = {
  // When any bait is used, all OTHERS are locked for 3 game hours
  _lockSource: null,   // cam level (2/3/4) that triggered the lock
  _lockedAtHour: null, // game hour when lock was applied

  lockAll: function(fromLevel){
    this._lockSource = fromLevel;
    this._lockedAtHour = (typeof G !== 'undefined' ? G.hour : 0);
    this._updateButtons();
  },

  unlockAll: function(){
    this._lockSource = null;
    this._lockedAtHour = null;
    this._updateButtons();
  },

  // Kept for backward-compat (called from onCrawlerDone)
  lock:   function(from){ this.lockAll(from); },
  unlock: function(from){ this.unlockAll(); },

  // Auto-unlock after 3 game hours — called from onHourChange()
  hourCheck: function(hour){
    if(this._lockedAtHour !== null && hour >= this._lockedAtHour + 3){
      this.unlockAll();
    }
  },

  isLocked: function(camLevel){
    return this._lockSource !== null && this._lockSource !== camLevel;
  },

  reset: function(){
    this._lockSource = null;
    this._lockedAtHour = null;
    this._updateButtons();
  },

  _updateButtons: function(){
    var self = this;
    var entries = [
      { id: 'bait-toggle-btn',  bait: (typeof BAIT_CAM  !== 'undefined' ? BAIT_CAM  : null), level: 2 },
      { id: 'bait2-toggle-btn', bait: (typeof BAIT_CAM2 !== 'undefined' ? BAIT_CAM2 : null), level: 3 },
      { id: 'bait3-toggle-btn', bait: (typeof BAIT_CAM3 !== 'undefined' ? BAIT_CAM3 : null), level: 4 },
    ];
    entries.forEach(function(e){
      var btn = document.getElementById(e.id);
      if(!btn) return;
      var state = e.bait ? e.bait.state : 'none';
      if(state === 'none'){
        btn.style.display = 'none';
        return;
      }
      btn.style.display = 'flex';
      if(state === 'used'){
        btn.style.opacity = '0.35';
        btn.style.pointerEvents = 'none';
        btn.title = 'Приманка уже использована';
      } else if(self.isLocked(e.level)){
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
        btn.title = 'Другая приманка активна — подожди 3 часа';
      } else {
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        btn.title = 'Использовать приманку';
      }
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BAIT2 CAM-C4 PHOTO SYSTEM (КАМ 04) — Приманка ур.2
// ═══════════════════════════════════════════════════════════════════════════════
var BAIT_CAM2 = {
  state: 'none',  // 'none' | 'ready' | 'used'

  init: function(){
    var hasBait2 = (typeof getSkillLevel==='function') && getSkillLevel('h_decoy_2') > 0;
    this.state = hasBait2 ? 'ready' : 'none';
    this.update();
  },

  onUsed: function(){
    if(this.state !== 'ready') return;
    this.state = 'used';
    this.update();
    if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.lockAll(3);
  },

  onCrawlerDone: function(){
    BAIT_CHAIN.unlock(3);
  },

  update: function(){
    var photo = document.getElementById('cam-c3-photo');
    var btn   = document.getElementById('bait2-toggle-btn');
    if(!photo) return;
    if(this.state === 'ready'){
      photo.src = 'assets/cam03_bait_ready.png';
      if(btn){
        btn.style.display = 'flex'; btn.textContent = '🪤';
        if(typeof BAIT_CHAIN !== 'undefined' && BAIT_CHAIN.isLocked(3)){
          btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; btn.title = 'Другая приманка активна — подожди 3 часа';
        } else {
          btn.style.opacity = ''; btn.style.pointerEvents = ''; btn.title = 'Использовать приманку';
        }
      }
    } else if(this.state === 'used'){
      photo.src = 'assets/cam03_bait_used.png';
      if(btn){ btn.style.display = 'flex'; btn.style.opacity = '0.35'; btn.style.pointerEvents = 'none'; btn.title = 'Приманка уже использована'; btn.textContent = '✓'; }
    } else {
      photo.src = 'assets/cam03_north.png';
      if(btn) btn.style.display = 'none';
    }
  }
};

function toggleBait2Photo(){
  if(BAIT_CAM2.state !== 'ready') return;
  // Force cam-c4 as current room and call useAbility
  var prevRoom = (typeof G !== 'undefined') ? G.currentRoom : null;
  if(typeof G !== 'undefined') G.currentRoom = 'cam-c3';
  if(typeof useAbility === 'function'){
    useAbility('decoy');
  } else {
    BAIT_CAM2.onUsed();
  }
  if(prevRoom !== null && typeof G !== 'undefined') G.currentRoom = prevRoom;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BAIT3 CAM-C4 PHOTO SYSTEM (КАМ 04) — Приманка ур.3
// ═══════════════════════════════════════════════════════════════════════════════
var BAIT_CAM3 = {
  state: 'none',  // 'none' | 'ready' | 'used'

  init: function(){
    var hasBait3 = (typeof getSkillLevel==='function') && getSkillLevel('h_decoy_3') > 0;
    this.state = hasBait3 ? 'ready' : 'none';
    this.update();
  },

  onUsed: function(){
    if(this.state !== 'ready') return;
    this.state = 'used';
    this.update();
    if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.lockAll(4);
  },

  onCrawlerDone: function(){
    if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.unlockAll();
  },

  update: function(){
    var photo = document.getElementById('cam-c4-photo');
    var btn   = document.getElementById('bait3-toggle-btn');
    if(!photo) return;
    if(this.state === 'ready'){
      photo.src = 'assets/cam04_bait_ready.png';
      if(btn){
        btn.style.display = 'flex'; btn.textContent = '🪤';
        if(typeof BAIT_CHAIN !== 'undefined' && BAIT_CHAIN.isLocked(4)){
          btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; btn.title = 'Другая приманка активна — подожди 3 часа';
        } else {
          btn.style.opacity = ''; btn.style.pointerEvents = ''; btn.title = 'Использовать приманку';
        }
      }
    } else if(this.state === 'used'){
      photo.src = 'assets/cam04_bait_used.png';
      if(btn){ btn.style.display = 'flex'; btn.style.opacity = '0.35'; btn.style.pointerEvents = 'none'; btn.title = 'Приманка уже использована'; btn.textContent = '✓'; }
    } else {
      photo.src = 'assets/cam04_backyard.png';
      if(btn) btn.style.display = 'none';
    }
  }
};

function toggleBait3Photo(){
  if(BAIT_CAM3.state !== 'ready') return;
  var prevRoom = (typeof G !== 'undefined') ? G.currentRoom : null;
  if(typeof G !== 'undefined') G.currentRoom = 'cam-c4';
  if(typeof useAbility === 'function'){
    useAbility('decoy');
  } else {
    BAIT_CAM3.onUsed();
  }
  if(prevRoom !== null && typeof G !== 'undefined') G.currentRoom = prevRoom;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SNARE CAM-C9 PHOTO SYSTEM (КАМ 09)
// ═══════════════════════════════════════════════════════════════════════════════
var SNARE_CAM = {
  triggered: false,

  init: function(){
    this.triggered = false;
    this.update();
  },

  // Called from moveAllCreatures when NPC passes through loc 8 (cam-c9)
  tryPassiveSnare: function(creature){
    if(this.triggered) return;  // already sprung
    var hasSnare = (typeof getSkillLevel==='function') && getSkillLevel('h_snare') > 0;
    if(!hasSnare) return;
    if(creature.id !== 'stalker' && creature.id !== 'crawler') return;
    if(!RNG.chance(40)) return;  // 40% шанс сработать
    // Snare triggered!
    this.onTriggered();
    creature.flashlightStunLeft += 8;  // ~24 real seconds stunned
    if(typeof stopDoorTimers==='function') stopDoorTimers(creature);
    if(typeof addLog==='function') addLog('🪢 СИЛОК! ' + creature.shortName + ' попал в ловушку на лестнице! (~24 сек)', 'w');
  },

  onTriggered: function(){
    this.triggered = true;
    this.update();
  },

  update: function(){
    var hasSnare = (typeof getSkillLevel==='function') && getSkillLevel('h_snare') > 0;
    var photo = document.getElementById('cam-c9-photo');
    if(!photo) return;
    if(!hasSnare){
      photo.src = 'assets/cam09_building_entry.png';
    } else if(this.triggered){
      photo.src = 'assets/cam09_snare_triggered.png';
    } else {
      photo.src = 'assets/cam09_snare.png';
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BAIT CAM-C2 PHOTO SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

var BAIT_CAM = {
  // 'none' | 'ready' | 'used'
  state: 'none',

  // Call at night start — reset to 'ready' if bait skill present, else 'none'
  init: function(){
    var hasBait = (typeof getSkillLevel==='function' && getSkillLevel('h_decoy_1') > 0);
    this.state = hasBait ? 'ready' : 'none';
    this.update();
  },

  // Called when decoy ability is used (from useAbility 'decoy')
  onUsed: function(){
    if(this.state === 'ready') this.state = 'used';
    this.update();
    if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.lockAll(2);
  },

  onCrawlerDone: function(){
    if(typeof BAIT_CHAIN !== 'undefined') BAIT_CHAIN.unlock(2);
  },

  // Manual toggle button on cam-c2
  toggle: function(){
    if(this.state === 'none') return;
    this.state = (this.state === 'ready') ? 'used' : 'ready';
    this.update();
  },

  update: function(){
    var photo = document.getElementById('cam-c2-photo');
    var btn   = document.getElementById('bait-toggle-btn');
    if(!photo) return;

    if(this.state === 'ready'){
      photo.src = 'assets/cam02_bait_ready.png';
      if(btn){
        btn.style.display = 'flex'; btn.textContent = '🪤';
        if(typeof BAIT_CHAIN !== 'undefined' && BAIT_CHAIN.isLocked(2)){
          btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; btn.title = 'Другая приманка активна — подожди 3 часа';
        } else {
          btn.style.opacity = ''; btn.style.pointerEvents = ''; btn.title = 'Использовать приманку';
        }
      }
    } else if(this.state === 'used'){
      photo.src = 'assets/cam02_bait_used.png';
      if(btn){ btn.style.display = 'flex'; btn.style.opacity = '0.35'; btn.style.pointerEvents = 'none'; btn.title = 'Приманка уже использована'; btn.textContent = '✓'; }
    } else {
      photo.src = 'assets/cam02_west.png';
      if(btn) btn.style.display = 'none';
    }
  }
};

function toggleBaitPhoto(){
  // Force current room to cam-c2 so useAbility places decoy there
  var prevRoom = (typeof G !== 'undefined') ? G.currentRoom : null;
  if(typeof G !== 'undefined') G.currentRoom = 'cam-c2';
  if(typeof useAbility === 'function'){
    useAbility('decoy');
  } else {
    BAIT_CAM.toggle();
  }
  // Restore room
  if(prevRoom !== null && typeof G !== 'undefined') G.currentRoom = prevRoom;
}
