/* resonance/js/config.js */

// ─── LOCATION MAP ────────────────────────────────────────────────────────────
// 15 cameras mapped to 11 logical locations + door (12)
// Loc 1: Ворота/юг (cam-c1a, cam-c1b) — SYNC
// Loc 2: Запад территории (cam-c2)
// Loc 3: Север территории (cam-c3)
// Loc 4: Задний двор (cam-c4)
// Loc 5: Северный подступ (cam-c5a, cam-c5b) — SYNC
// Loc 6: Обход юг→север / окно (cam-c6) — SYNC with loc 1
// Loc 7: Вход с востока (cam-c7)
// Loc 8: 1й этаж (cam-c8a, cam-c8b) — SYNC
// Loc 9: Вход в здание / север (cam-c9)
// Loc 10: Лестница (cam-c10) — SYNC with peek
// Loc 11: Комната у офиса (cam-c11)
// Loc 12: У ДВЕРИ
var LOC_NAMES=[
  'ВОРОТА','ЗАПАД','СЕВЕР','ЗАДНИЙ ДВОР',
  'СЕВ. ПОДСТУП','ОБХОД ЮГ-СЕВ','ВХОД ВОСТОК',
  '1 ЭТАЖ','ВХОД ЗДАНИЯ','ЛЕСТНИЦА','У ОФИСА',
  'У ДВЕРИ!','В ВЕНТИЛЯЦИИ'
];
// Зоны: территория(far)=КАМ2,3,4; периметр(perimeter)=КАМ1а/б,5а/б,6,7,9; здание(building)=КАМ8а/б,10,11
var LOC_CSS=['lc-p','lc-f','lc-f','lc-f','lc-p','lc-p','lc-p','lc-b','lc-p','lc-b','lc-b','lc-door','lc-off'];
// First camera for each location
var LOC_CAM=['cam-c1a','cam-c2','cam-c3','cam-c4','cam-c5a','cam-c6','cam-c7','cam-c8a','cam-c9','cam-c10','cam-c11',null,null];
var LOC_ZONE=['perimeter','far','far','far','perimeter','perimeter','perimeter','building','perimeter','building','building','door','vent'];

// Camera-to-camera sync: if NPC is visible on one cam, also show on these
var CAM_SYNC = {
  'cam-c1a': ['cam-c1b'],            // ворота + здание юг (синхрон между собой)
  'cam-c1b': ['cam-c1a'],
  // cam-c6 теперь независимая
  'cam-c5a': ['cam-c5b'],            // северный подступ
  'cam-c5b': ['cam-c5a'],
  'cam-c8a': ['cam-c8b'],            // 1й этаж
  'cam-c8b': ['cam-c8a'],
  'cam-c10': ['peek'],               // лестница = peek
};

// Map positions (12 locs incl door)
// LOC_MAP_GLOBAL: [left%, top%] для каждой локации (0-11) + loc12=vent
var LOC_MAP_GLOBAL=[[45,77],[80,23],[68,5],[55,9],[25,34],[22,42],[16,57],[19,50],[14,20],[15,43],[23,40],[18,52],null];
var LOC_MAP_FAR=[[30,80],[10,50],[55,12],[75,30],null,null,null,null,null,null,null,null];
var LOC_MAP_PERIMETER=[null,null,null,null,[42,22],[22,70],[68,45],null,null,null,null,null];
var LOC_MAP_BUILDING=[null,null,null,null,null,null,null,[42,72],[48,45],[45,30],[42,18],null];

// ─── NPC DEFINITIONS ─────────────────────────────────────────────────────────
var CREATURES = {

  stalker: {
    id:'stalker', name:'GRASS STALKER', shortName:'СТАЛКЕР',
    loc:0, active:true, agg:1,
    color:'#44aa22', dotColor:'#88ff44',
    scare:['ОН НАШЁЛ ТЕБЯ','НЕТ ВЫХОДА','РЕЗОНАНС ТВОЙ','ТЫ ЕГО ЗЕМЛЯ'],
    killMsg:'Grass Stalker прошёл через ворота и поднялся на второй этаж.',

    // Граф перемещений: из каждой локации — массив возможных следующих
    moveGraph: {
      0: [1,2,5,6],    // №1 → №2/№3/№6/№7
      1: [2],           // №2 → №3
      2: [3],           // №3 → №4
      3: [4],           // №4 → №5
      4: [5,8],         // №5 → №6 или №9
      5: [6,8],         // №6 → №7 или →№9
      6: [7,8],         // №7 → №8 или №9
      7: [8],           // №8 → №9
      8: [9],           // №9 → №10
      9: [10,11],       // №10 → №11 или офис(дверь)
      10:[11],          // №11 → офис(дверь)
    },
    routeOptions:[[0,11]], // legacy compat
    route:[0,11],

    // Поведение у двери
    doorBehavior: {
      knockInterval: 4000,    // стучит каждые 4 сек
      waitBeforeBreak: {
        1: Infinity, 2: Infinity, 3: Infinity, 4: 25, 5: 15,
        6:12, 7:10, 8:8, 9:6, 10:5, 11:4, 12:4, 13:3, 14:3, 15:2
      },
      canBreakDoor: false,    // становится true если waitBeforeBreak истёк
      breakTimer: null,
      knockTimer: null,
      arrivedAt: 0,           // timestamp прихода к двери
    },

    // Реакция на фонарик
    flashlightScare: true,    // останавливается на 1 ход если видит фонарь на своей камере
    flashlightStunDuration: 1, // пропускает N ходов
    flashlightStunLeft: 0,

    // Особое поведение
    paused: false,            // временно заморожен
    speedMultiplier: 1.0,     // ускорение с ночью
  },

  crawler: {
    id:'crawler', name:'THE CRAWLER', shortName:'ПОЛЗУН',
    loc:5, active:false, agg:0.7,
    color:'#cc4400', dotColor:'#ff6600',
    scare:['СВЕРХУ...','ТЫ НЕ ОДИН БЫЛ','ОН ПОЛЗ ВЕСЬ ДЕНЬ','ЗАПАХ КРОВИ'],
    killMsg:'Crawler выполз из колодца и нашёл тебя по запаху.',

    // Ползун — слепой, глухой, ходит по запаху. Может ходить кругами.
    // Стартует из №6 (колодец). Может пойти куда угодно.
    moveGraph: {
      5: [0,1,2,3,4,6,8],       // №6 → любая внешняя или №7,№9
      0: [1,2,3,4,5,6,10],      // может ходить кругами + залезть в окно→№11
      1: [0,2,3,4,5,10],        // кругами + окно→№11
      2: [0,1,3,4,5,10],        // кругами + окно→№11
      3: [0,1,2,4,5,10],        // кругами + окно→№11
      4: [0,1,2,3,5,8,10],      // кругами + №9 + окно→№11
      6: [7,8],                  // №7 → №8 или №9
      7: [8,9],                  // №8 → №9 или №10
      8: [7,9],                  // №9 → №8 или №10
      9: [8,10,11],              // №10 → №9(кругами) или №11 или офис
      10:[9,11],                 // №11 → №10(кругами) или офис
    },
    routeOptions:[[5,11]],
    route:[5,11],

    // === НОВАЯ СИСТЕМА ПОВЕДЕНИЯ ПОЛЗУНА ===
    crawlerBehavior: {
      fedCount: 0,         // сколько раз покормлен
      fedNeeded: 1,        // сколько нужно покормить чтобы ушёл (зависит от уровня)
      mode: 'wander',      // wander | hungry | frenzy
      officeSmellChance: 0.05, // шанс учуять офис при каждом ходе
      canBreakMetal: false,    // может ли прогрызть метал. дверь
      immuneToWeapons: false,  // иммунитет к оружию (кроме приманки/дыма/клетки)
      retreatLoc: 5,           // куда уходит после кормёжки (колодец)
      active: false,
    },

    doorBehavior: {
      knockInterval: 5000,
      waitBeforeBreak: { 1:Infinity, 2:Infinity, 3:20, 4:15, 5:12, 6:10, 7:8, 8:6, 9:5, 10:4, 11:3, 12:2, 13:1, 14:1, 15:1 },
      canBreakDoor: false,
      breakTimer: null,
      knockTimer: null,
      arrivedAt: 0,
    },

    flashlightScare: false,
    flashlightStunDuration: 0,
    flashlightStunLeft: 0,

    paused: false,
    speedMultiplier: 0.85,
    // Ползун выходит: ур.3 после 4 полных часов, к ур.10 — сразу с часа 0.
    activationHour: { 3:4, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0 },
  },

  shade: {
    id:'shade', name:'THE SHADE', shortName:'ТЕНЬ',
    loc:2, active:false, agg:0.5,
    color:'#6644cc', dotColor:'#9966ff',
    scare:['ТЫ ВСЕГДА БЫЛ ОДИН?','ТЕНЬ НЕ ТВОЯ','ОНА ЖДАЛА'],
    killMsg:'The Shade скользнула с севера — её почти не было видно на камерах.',

    // Маршрут: КАМ-03(loc2) → КАМ-05(loc4) → КАМ-08(loc7) → Вентиляция(loc12) → Люк(loc9)
    moveGraph: {
      2: [4],           // КАМ-03 → КАМ-05
      4: [7],           // КАМ-05 → КАМ-08
      7: [12],          // КАМ-08 → вентиляция (невидима)
      12: [9],          // вентиляция → люк
      9: [10,11],       // лестница → у офиса или дверь
      10:[11],          // у офиса → дверь
    },
    routeOptions:[[2,11]],
    route:[2,11],

    doorBehavior: {
      knockInterval: 8000,
      waitBeforeBreak: { 1:Infinity, 2:Infinity, 3:Infinity, 4:Infinity, 5:8, 6:7, 7:6, 8:5, 9:4, 10:3, 11:3, 12:2, 13:2, 14:1, 15:1 },
      canBreakDoor: false,
      breakTimer: null,
      knockTimer: null,
      arrivedAt: 0,
    },

    flashlightScare: true,
    flashlightStunDuration: 2,  // shade пугается сильнее
    flashlightStunLeft: 0,

    // Shade видима по-разному в зависимости от зоны:
    // far (F1-F4): невидима вообще (opacity: 0)
    // perimeter (P1-P4): невидима (opacity: 0)
    // building entry B1-B2: полупрозрачна (opacity: 0.25)
    // B3-B4: видна нормально (opacity: 0.85)
    // office: видна полностью
    visibilityByZone: {
      far: 0, perimeter: 0,
      'cam-b1': 0.25, 'cam-b2': 0.25,
      'cam-b3': 0.85, 'cam-b4': 0.95,
      office: 1.0
    },

    paused: false,
    speedMultiplier: 0.7,

    // Тень выходит: ур.5 после 6 полных часов, к ур.15 — сразу с часа 0.
    activationHour: { 5:6, 6:5, 7:5, 8:4, 9:3, 10:3, 11:2, 12:2, 13:1, 14:1, 15:0 },
    activated: false,
  }
};

// ─── GAME STATE ───────────────────────────────────────────────────────────────
var G = {
  night:1, hour:0, minutes:0, power:100,
  doorClosed:false, flashOn:false,
  flashBattery:100, flashDrainRate:0.15,
  currentRoom:'office', gameActive:false, gameOver:false, gameWon:false,
  intervals:[], panicMode:false,
  stats:{ camSwitches:0, doorClosings:0, flashUses:0, closeCalls:0 },
  savedNights: loadSavedNights(),
  endlessMode: false,
  _endlessWave: 0,
  _endlessExhaustion: false,
  _endlessPendingWave: false
};

// Ночь = 8 часов: 8:00 → 16:00 (9 значений, 8 переходов)
var HOURS=['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
// Длительность одного часа в реальных секундах
var HOUR_DURATION_SEC = 45;
// Условие победы — индекс часа, на котором ночь заканчивается
var WIN_HOUR = 8;

// Aggression per level (1-15). Цель: рост скорости NPC от 1й к 15й ночи +45%.
var NIGHT_AGG=[0, 1.00, 1.03, 1.06, 1.10, 1.13, 1.16, 1.20, 1.23, 1.26, 1.30, 1.33, 1.36, 1.40, 1.43, 1.45];

// Базовые скорости существ (множитель)
var CREATURE_BASE_SPEEDS = { stalker: 1.0, crawler: 0.85, shade: 0.7 };

// Максимальный прирост скорости за 15 ночей (+45%)
var SPEED_BOOST_MAX = 0.45;
// Доп. буст тени поверх общего (+25%)
var SHADE_SPEED_EXTRA = 0.25;

// Вычислить уровневый множитель скорости для ночи n (1..15)
function getLvlSpeedBoost(n) {
  return 1 + SPEED_BOOST_MAX * Math.min(14, n - 1) / 14;
}

var BASE_MOVE_INTERVAL = 3000;
// Интервал движения NPC одинаковый на всех ночах. Скорость растёт только через NIGHT_AGG.
function getMoveInterval(night) {
  return BASE_MOVE_INTERVAL;
}
// Внутри ночи NPC слегка ускоряются к утру. Раньше было до ×1.82 на 10м часу.
// Теперь: на 8м часу ускорение ×1.18 максимум (множитель 0.85).
function getHourMultiplier(hour) {
  return Math.max(0.85, 1.0 - hour*0.019);
}

var TRACK_META={
  music1:{label:'MUSIC 1',icon:'🎵',file:'assets/menu.mp3'},
  music2:{label:'MUSIC 2',icon:'🎵',file:'assets/music5.mp3'},
  music3:{label:'MUSIC 3',icon:'🎵',file:'assets/win.mp3'},
  music4:{label:'MUSIC 4',icon:'🎵',file:'assets/despair.mp3'},
  music5:{label:'MUSIC 5',icon:'🎵',file:'assets/game.mp3'},
  // legacy для совместимости со старым кодом
  menu:{label:'МЕНЮ',icon:'🌙',file:'assets/menu.mp3'},
  game:{label:'ИГРА',icon:'😨',file:'assets/game.mp3'},
  win:{label:'ПОБЕДА',icon:'🌅',file:'assets/win.mp3'},
  despair:{label:'ОТЧАЯНИЕ',icon:'💀',file:'assets/despair.mp3'}
};
var TRACK_OVERRIDES={menu:'music1',game:'music2',win:'music3',despair:'music4'};

var NIGHT_CREATURES={
  1:['stalker'],2:['stalker'],3:['stalker','crawler'],4:['stalker','crawler'],
  5:['stalker','crawler','shade'],6:['stalker','crawler','shade'],
  7:['stalker','crawler','shade'],8:['stalker','crawler','shade'],
  9:['stalker','crawler','shade'],10:['stalker','crawler','shade'],
  11:['stalker','crawler','shade'],12:['stalker','crawler','shade'],
  13:['stalker','crawler','shade'],14:['stalker','crawler','shade'],
  15:['stalker','crawler','shade']
};
