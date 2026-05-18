/* resonance/js/shared.js */

function loadSavedNights(){try{var s=localStorage.getItem('resonance_nights');return s?JSON.parse(s):[]}catch(e){return[];}}
function saveNight(n){try{if(G.savedNights.indexOf(n)<0){G.savedNights.push(n);localStorage.setItem('resonance_nights',JSON.stringify(G.savedNights));}}catch(e){}}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  var el=document.getElementById(id);if(el)el.classList.add('active');

  // Инициализируем SFX-модуль (для звуков событий) — без музыки, музыку играет AUDIO
  if(typeof SFX !== 'undefined'){
    SFX.init();
  }

  if(typeof AUDIO!=='undefined'&&!AUDIO.muted){
    var trackToPlay = null;

    // МЕНЮ — всегда MUSIC 5, независимо от настроек игрока
    var menuScreens = ['title-screen','lobby-screen','story-screen','notes-screen','stats-screen','class-select-screen','settings-screen'];
    if(menuScreens.indexOf(id) >= 0){
      trackToPlay = 'music5';
    }
    // ИГРА — пользовательский выбор, иначе MUSIC 2 по умолчанию (офисный трек)
    else if(id === 'game-screen'){
      var picked = (typeof CFG !== 'undefined' && CFG.musicTrack) ? CFG.musicTrack : null;
      if(picked === 'silence'){
        if(typeof stopAllAudio === 'function') stopAllAudio();
        return;
      }
      trackToPlay = picked || 'music2';
    }
    // Победа / поражение
    else if(id === 'win-screen')      trackToPlay = 'music3';
    else if(id === 'gameover-screen' || id === 'powerout-screen') trackToPlay = 'music4';

    if(trackToPlay && typeof playTrack === 'function'){
      if(AUDIO.current !== trackToPlay) playTrack(trackToPlay, AUDIO.volume);
    }
  }

  // Принудительно пересчитать UI зависящий от класса при входе в игру
  if(id === 'game-screen'){
    if(typeof recalcEffects === 'function') recalcEffects();
    if(typeof updateNearOfficeRoom === 'function') updateNearOfficeRoom();
    if(typeof updateFinaleButtons === 'function') updateFinaleButtons();
  }
}


/*
 ╔══════════════════════════════════════════════════════════════════╗
 ║  РЕЗОНАНС v6.2 — ПОЛНАЯ ЛОГИКА NPC                               ║
 ║                                                                  ║
 ║  ДВИЖЕНИЕ:                                                       ║
 ║  • Фиксированный маршрут для каждого NPC                        ║
 ║  • Случайные отклонения (смена маршрута в пути)                  ║
 ║  • Ускорение с каждым часом ночи                                 ║
 ║  • Реакция на действия игрока                                    ║
 ║                                                                  ║
 ║  STALKER — агрессивный, прямолинейный                           ║
 ║  • Двигается каждые ~3с на ночи 1, ~1.5с на ночи 5             ║
 ║  • Видит фонарик — останавливается на 1 камеру                  ║
 ║  • Дверь: стучит → ждёт N сек → на ночи 4-5 ломает             ║
 ║                                                                  ║
 ║  CRAWLER — ползёт по потолку, виден только внизу кадра          ║
 ║  • Виден только как тень внизу кадра (CSS позиция)              ║
 ║  • Более медленный, но почти не реагирует на фонарик            ║
 ║  • Дверь: ломает быстрее чем Stalker (поздние ночи)             ║
 ║                                                                  ║
 ║  SHADE — невидима на дальних камерах, только на B3/B4           ║
 ║  • На камерах F1-F4 и P1-P4 — не отображается вообще           ║
 ║  • На B1-B2 — полупрозрачна (30% opacity)                      ║
 ║  • На B3-B4 — видна полностью                                   ║
 ║  • Активируется только после 2:00 (ночь 5) или 3:00 (ночь 3-4) ║
 ║  • Дверь: проходит сквозь при батарее фонарика < 20%           ║
 ╚══════════════════════════════════════════════════════════════════╝
*/

// ─── CAMERA GRID OVERLAY ────────────────────────────────────────────────────
function toggleCamGrid(){
  var el = document.getElementById('cam-grid-overlay');
  if(el) el.classList.toggle('active');
}
function closeCamGrid(){
  var el = document.getElementById('cam-grid-overlay');
  if(el) el.classList.remove('active');
}
function openCamGrid(){
  var el = document.getElementById('cam-grid-overlay');
  if(el) el.classList.add('active');
}
