/* Ticketing animation — implements animations/ticketing/motion.yaml (ADR 0027).
 * Scenes: background streams (ambientFlow) + the two tickets levitate (levitate) + the data bars shimmer like a skeleton (shimmer).
 * Infinite while visible (ADR 0007); the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0027). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    backAmp: 4, backTilt: 0.6, backPeriod: 4.6,
    frontAmp: 3, frontTilt: 0.4, frontPeriod: 3.4,
    shimmerAlpha: 0.35, shimmerSweep: 2.2, shimmerPause: 0.6, shimmerWidth: 60,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('ticketing', function (svg, env) {
    var gsap = env.gsap, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"backPeriod":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var tickets = role('ticket'), data = role('data'), impulses = role('impulse');   // the back ticket comes first in the file, the front one second
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]:not([data-m])'));

    var ambient = P.ambientFlow(svg, { gsap: gsap, impulses: impulses, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
    var hover = P.levitate(svg, { items: [
      { el: tickets[0], amp: T.backAmp, tilt: T.backTilt, period: T.backPeriod, dir: 1 },
      { el: tickets[1], amp: T.frontAmp, tilt: T.frontTilt, period: T.frontPeriod, dir: -1 },   // opposite first move: the tickets never rise together at the start
    ] });
    var shine = P.shimmer(svg, { targets: data, alpha: T.shimmerAlpha, sweep: T.shimmerSweep, pause: T.shimmerPause, width: T.shimmerWidth });
    var ready = false, t0 = 0, tick = null;

    function prepare() {
      if (ready) return;
      ready = true;
      ambient.prepare(); shine.prepare(); hover.prepare();   // the highlight is added before the tickets are wrapped, so it moves with them
    }

    function seek(t) { ambient.update(t); hover.update(t); shine.update(t); }

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
        if (!ready) return;
        ambient.reset(); hover.reset(); shine.reset();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
