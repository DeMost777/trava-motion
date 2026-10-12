/* Virtual Payments animation — implements animations/virtual-payments/motion.yaml (ADR 0033).
 * Scenes: background streams (ambientFlow) + two cards levitate (levitate) + the Activity number waits under a skeleton plate,
 * then appears while the bars of the chart grow one after another and go back again (skeleton, barGraph).
 * Infinite while visible (ADR 0007); the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0033). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    backAmp: 4, backTilt: 0.4, backPeriod: 4.6, frontAmp: 3, frontTilt: 0.3, frontPeriod: 3.4,
    round: 6, rest: 3, loadEnd: 1.6, numberIn: 0.25, holdEnd: 5, numberOut: 0.4, riseY: 2,
    barMin: 0.12, barStagger: 0.08, barGrow: 0.45, barOvershoot: 0.06, barShrink: 0.35,
    skeletonAlpha: 0.18, shineAlpha: 0.35, shinePeriod: 1.4,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('virtual-payments', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, util = TM.util, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"round":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var cards = role('card'), bars = role('bar'), number = role('number')[0], impulses = role('impulse');   // the back card comes first in the file, the front one second
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]'));

    var easeIn = gsap.parseEase(ease.enter), easeStd = gsap.parseEase(ease.standard);
    var backOut = gsap.parseEase('back.out(' + util.backFor(gsap, T.barOvershoot) + ')');   // a bar glides in, goes a little past its height and settles back
    var local = function (t) { return (t + T.rest) % T.round; };   // one round; the design is the held state (loadEnd … holdEnd)
    var shown = function (t) {   // 0 … 1, how much of the number is shown
      var u = local(t);
      if (u < T.loadEnd) return 0;
      if (u < T.loadEnd + T.numberIn) return easeIn((u - T.loadEnd) / T.numberIn);
      if (u < T.holdEnd) return 1;
      if (u < T.holdEnd + T.numberOut) return 1 - easeStd((u - T.holdEnd) / T.numberOut);
      return 0;
    };
    var height = function (t) {   // bar i of n: 0 = lowest strip, 1 = design; they grow left to right and sink right to left
      return function (i, n) {
        var u = local(t);
        if (u < T.loadEnd) return 0;
        if (u < T.holdEnd) return backOut(Math.max(0, Math.min(1, (u - T.loadEnd - i * T.barStagger) / T.barGrow)));
        var x = (u - T.holdEnd - (n - 1 - i) * T.barStagger) / T.barShrink;
        return x >= 1 ? 0 : 1 - easeStd(Math.max(0, x));
      };
    };

    var ambient = P.ambientFlow(svg, { gsap: gsap, impulses: impulses, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
    var hover = P.levitate(svg, { items: [
      { el: cards[0], amp: T.backAmp, tilt: T.backTilt, period: T.backPeriod, dir: 1 },
      { el: cards[1], amp: T.frontAmp, tilt: T.frontTilt, period: T.frontPeriod, dir: -1 },   // opposite first move: the cards never rise together at the start
    ] });
    var graph = P.barGraph(svg, { targets: bars, min: T.barMin });
    var plate = P.skeleton(svg, { target: number, alpha: T.skeletonAlpha, shine: T.shineAlpha, period: T.shinePeriod });
    var ready = false, t0 = 0, tick = null;

    function prepare() {
      if (ready) return;
      ready = true;
      ambient.prepare(); graph.prepare(); plate.prepare(); hover.prepare();
    }

    function seek(t) {
      ambient.update(t); hover.update(t); graph.update(height(t));
      var s = shown(t);
      plate.update(t, 1 - s);
      number.style.opacity = s >= 1 ? '' : String(s);
      if (s >= 1) number.removeAttribute('transform'); else number.setAttribute('transform', 'translate(0 ' + (1 - s) * T.riseY + ')');
    }

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
        ambient.reset(); hover.reset(); graph.reset(); plate.reset();
        number.style.opacity = ''; number.removeAttribute('transform');
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
