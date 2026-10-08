/* Quality Control animation — implements animations/quality-control/motion.yaml (ADR 0024).
 * Scenes: background streams (ambientFlow) + service icons pulse in turn (pulse) + loading bar and number
 * (progressFill, skeleton) + lens zoom-in with a small bounce (pulse). Infinite while visible (ADR 0007);
 * the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0024). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    step: 0.7, nodeScale: 1.08, nodeUp: 0.22, nodeDown: 0.3,
    round: 7, fillEnd: 0.7, fillPower: 2.2, fillOvershoot: 0.06, numberIn: 0.25, holdEnd: 5, numberOut: 0.4, backEnd: 5.8, rest: 3, riseY: 2,
    lensScale: 1.2, lensUp: 0.25, lensHold: 0, lensDown: 0.6, lensOvershoot: 0.3, lensRoom: 12,
    skeletonAlpha: 0.18, shineAlpha: 0.35, shinePeriod: 1.4,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('quality-control', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, util = TM.util, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"round":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var nodes = role('node'), fill = role('progress')[0], knob = role('knob')[0], number = role('number')[0], lens = role('lens')[0];
    var impulses = role('impulse');   // the horizontal ones run; the vertical bar under the card (turned by a transform) stays as drawn (ADR 0024)
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]'));

    var easeIn = gsap.parseEase(ease.enter), easeStd = gsap.parseEase(ease.standard);
    // x^fillPower slows the start; back.out lets the end glide in, overshoot a little (fillOvershoot of the way) and settle back
    var backOut = gsap.parseEase('back.out(' + util.backFor(gsap, T.fillOvershoot) + ')');
    var fillCurve = function (x) { return backOut(Math.pow(x, T.fillPower)); };
    // one round, local time u: the design is the bar held at its place with the number shown (rest … holdEnd)
    var local = function (t) { return (t + T.rest) % T.round; };
    var progress = function (t) {
      var u = local(t);
      if (u < T.fillEnd) return fillCurve(u / T.fillEnd);   // slow start, quick middle, glides in, goes a little past its place and settles back
      if (u < T.holdEnd) return 1;
      if (u < T.backEnd) return 1 - easeStd((u - T.holdEnd) / (T.backEnd - T.holdEnd));
      return 0;
    };
    var shown = function (t) {                        // 0 … 1, how much of the number is shown
      var u = local(t);
      if (u < T.fillEnd) return 0;
      if (u < T.fillEnd + T.numberIn) return easeIn((u - T.fillEnd) / T.numberIn);
      if (u < T.holdEnd) return 1;
      if (u < T.holdEnd + T.numberOut) return 1 - easeStd((u - T.holdEnd) / T.numberOut);
      return 0;
    };

    var ambient = null;
    var bar = P.progressFill(svg, { fill: fill, knob: knob, progress: progress, max: 1 + T.fillOvershoot * 3 });
    var plate = P.skeleton(svg, { target: number, after: number.closest('[filter]'), alpha: T.skeletonAlpha, shine: T.shineAlpha, period: T.shinePeriod });
    var nodePulse = null, lensPulse = null, t0 = 0, tick = null, ready = false;

    // The card is drawn with a drop-shadow filter whose region ends right at the lens: a zoomed-in lens would be cut there.
    // When the animation is first played the region is made a little wider.
    var cardFilter = null, filterOrig = null, widened = false;
    function widenCardFilter(px) {
      if (widened) return;   // writing the attributes again would make the browser redo the blur of the whole card on every frame
      widened = true;
      var host = lens.parentNode && lens.parentNode.closest ? lens.parentNode.closest('[filter]') : null;
      var m = host && /url\(#([^)]+)\)/.exec(host.getAttribute('filter') || '');
      cardFilter = cardFilter || (m ? svg.querySelector('[id="' + m[1] + '"]') : null);
      if (!cardFilter) return;
      filterOrig = filterOrig || ['x', 'y', 'width', 'height'].map(function (a) { return +cardFilter.getAttribute(a); });
      cardFilter.setAttribute('x', filterOrig[0] - px); cardFilter.setAttribute('y', filterOrig[1] - px);
      cardFilter.setAttribute('width', filterOrig[2] + 2 * px); cardFilter.setAttribute('height', filterOrig[3] + 2 * px);
    }
    // The wider region draws exactly the same picture (the shadow is not cut any more, nothing else changes), so reset() leaves it:
    // writing the attributes back would make the browser redo the blur of the whole card in one heavy frame while the card is leaving.

    function prepare() {
      if (ready) return;
      // icons in clockwise order from the top left: by the angle around the middle of the icons
      var boxes = nodes.map(function (n) { var b = util.boxIn(svg, n); return { el: n, cx: b.x + b.w / 2, cy: b.y + b.h / 2 }; });
      var mx = boxes.reduce(function (s, b) { return s + b.cx; }, 0) / boxes.length, my = boxes.reduce(function (s, b) { return s + b.cy; }, 0) / boxes.length;
      boxes.forEach(function (b) { b.ang = Math.atan2(b.cy - my, b.cx - mx); });
      boxes.sort(function (a, b) { return a.ang - b.ang; });
      nodePulse = P.pulse(svg, {
        gsap: gsap, targets: boxes.map(function (b) { return b.el; }), events: boxes.map(function (b, i) { return [i * T.step]; }), cycle: boxes.length * T.step,
        scale: T.nodeScale, up: T.nodeUp, down: T.nodeDown, easeUp: ease.enter, easeDown: ease.standard,
      });
      // the lens grows when the number appears; the first time that is in the next round, the beginning shows the design
      var first = (T.fillEnd - T.rest + T.round) % T.round;
      lensPulse = P.pulse(svg, {
        gsap: gsap, targets: [lens], events: [[first]], cycle: T.round,
        scale: T.lensScale, up: T.lensUp, hold: T.lensHold, down: T.lensDown, overshoot: T.lensOvershoot, easeDown: ease.standard,
      });
      var bars = impulses.filter(function (r) { var b = util.boxIn(svg, r); return b.w > b.h; });
      ambient = P.ambientFlow(svg, { gsap: gsap, impulses: bars, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
      ambient.prepare(); bar.prepare(); plate.prepare(); nodePulse.prepare(); lensPulse.prepare();
      ready = true;
    }

    function seek(t) {
      widenCardFilter(T.lensRoom);   // idempotent; again after every reset
      ambient.update(t); bar.update(t); nodePulse.update(t); lensPulse.update(t);
      var n = shown(t);
      plate.update(t, 1 - n);
      number.style.opacity = n >= 1 ? '' : String(n);
      if (n >= 1) number.removeAttribute('transform'); else number.setAttribute('transform', 'translate(0 ' + ((1 - n) * T.riseY) + ')');
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
        ambient.reset(); bar.reset(); plate.reset(); nodePulse.reset(); lensPulse.reset();
        number.style.opacity = ''; number.removeAttribute('transform');
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
