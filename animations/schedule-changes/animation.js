/* Schedule Changes animation — implements animations/schedule-changes/motion.yaml (ADR 0030).
 * Scenes: background streams (ambientFlow) + table rows zoom in one after another from top to bottom (pulse), then a pause.
 * Infinite while visible (ADR 0007); the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0030). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    step: 0.4, rowScale: 1.06, rowUp: 0.3, rowDown: 0.45, round: 4,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('schedule-changes', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, util = TM.util, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"rowScale":1.1}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var rows = role('row'), impulses = role('impulse');
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]'));

    var ambient = P.ambientFlow(svg, { gsap: gsap, impulses: impulses, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
    var wave = null, t0 = 0, tick = null;

    function prepare() {
      if (wave) return;
      // top to bottom as seen on the screen (the order of the layers in the file does not matter)
      var ordered = rows.map(function (el) { return { el: el, y: util.boxIn(svg, el).y }; })
        .sort(function (a, b) { return a.y - b.y; });
      wave = P.pulse(svg, {
        gsap: gsap, targets: ordered.map(function (r) { return r.el; }), events: ordered.map(function (r, i) { return [i * T.step]; }), cycle: T.round,
        scale: T.rowScale, up: T.rowUp, down: T.rowDown, easeUp: ease.enter, easeDown: ease.standard,
      });
      ambient.prepare(); wave.prepare();
    }

    function seek(t) { ambient.update(t); wave.update(t); }

    return {
      start: function () {
        prepare();
        if (tick) gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        t0 = gsap.ticker.time;
        tick = function () { seek(gsap.ticker.time - t0); };
        gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) gsap.ticker.remove(tick);
        tick = null;
        if (!wave) return;
        ambient.reset(); wave.reset();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
