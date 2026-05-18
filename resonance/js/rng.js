/* resonance/js/rng.js — Centralized randomizer system
 *
 * Все игровые шансы (кроме поведения NPC) идут через этот модуль.
 *
 * Кубики:
 *   RNG.d2()        → 1 или 2          (шаг 50%)
 *   RNG.d4()        → 1, 2, 3, 4       (шаг 25%)
 *   RNG.d10()       → 1..10            (шаг 10%)
 *   RNG.roll(n)     → 1..n             (целое)
 *   RNG.range(a,b)  → a..b включительно
 *   RNG.chance(p)   → true с вероятностью p%  (p: 0..100)
 *   RNG.pick(arr)   → случайный элемент массива
 *   RNG.shuffle(arr)→ перемешанная копия массива
 */

var RNG = {

  // Базовый кубик: целое от 1 до n включительно
  roll: function(n) {
    return Math.floor(Math.random() * n) + 1;
  },

  // d2 — монета (50/50)
  d2: function() {
    return this.roll(2);
  },

  // d4 — четыре грани (25% каждая)
  d4: function() {
    return this.roll(4);
  },

  // d10 — десять граней (10% каждая)
  d10: function() {
    return this.roll(10);
  },

  // Диапазон: целое от min до max включительно
  range: function(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  // Шанс: true если бросок d100 <= p (p в процентах, 0..100)
  chance: function(p) {
    return this.roll(100) <= p;
  },

  // Случайный элемент массива
  pick: function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Перемешанная копия массива (Fisher-Yates)
  shuffle: function(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

};
