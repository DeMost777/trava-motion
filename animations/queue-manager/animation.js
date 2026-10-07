/* Queue Manager animation — implements animations/queue-manager/motion.yaml (approved, task 3.1).
 * Scenes: flow (impulseFlow) → gear-reaction (hubAccent). Infinite while visible (ADR 0007);
 * the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0013). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = { segmentTime: 1.2, impulsesPerSegment: 1, gearDuration: 1.3, gearZoom: 1.2, gearEvery: 3 };

  TM.register('queue-manager', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };
    var hub = role('hub')[0], gear = role('gear')[0];

    var flow = env.primitives.impulseFlow(svg, {
      gsap: gsap,
      impulses: role('impulse'),
      // dotted connection lines: the tracks impulses run on (no role in Figma yet, see audit 2.4 notes)
      tracks: Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]')),
      hub: hub,
      segmentTime: TEMPO.segmentTime,
      perSegment: TEMPO.impulsesPerSegment,
      ease: ease.flow,
    });
    var accent = env.primitives.hubAccent(svg, {
      gsap: gsap, target: gear,
      rotate: 360, zoom: TEMPO.gearZoom, duration: TEMPO.gearDuration, every: TEMPO.gearEvery,
      ease: { rotate: ease.standard, zoomIn: ease.enter, zoomOut: ease.standard },
    });

    var t0 = 0, tick = null;
    function seek(t) { flow.update(t); accent.update(t); }
    function prepare() { flow.prepare(); accent.prepare(flow.arrivalTime()); }

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
        flow.reset(); accent.reset();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
