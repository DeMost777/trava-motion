/* Unused Tickets animation — implements animations/unused-tickets/motion.yaml (ADR 0036).
 * Scenes: background streams (ambientFlow) + the ticket and the wallet levitate (levitate); two banknotes come out from under the ticket
 * one after another, rest in the design position, then sink one after another behind the wallet; the wallet springs on every arrival.
 * Infinite while visible (ADR 0007); the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0036). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    cardAmp: 1.5, cardTilt: 0.15, cardPeriod: 4, walletAmp: 1, walletTilt: 0.1, walletPeriod: 3.4,
    round: 6, rest: 2, comeStart: 0.6, comeGap: 0.5, comeLowerDur: 0.9, comeUpperDur: 0.6, comeLowerPx: 75, comeUpperPx: 39,
    holdEnd: 3.8, goGap: 0.5, goLowerDur: 0.6, goUpperDur: 0.9, goLowerPx: 42, goUpperPx: 76,
    bumpScale: 1.03, bumpDur: 0.3, bumpLead: 0.1,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('unused-tickets', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"round":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var ticket = role('card')[0], wallet = role('wallet')[0], impulses = role('impulse');
    var bills = role('bill');   // the lower note comes first in the file, the upper one second
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]'));
    var easeStd = gsap.parseEase(ease.standard);

    var local = function (t) { return (t + T.rest) % T.round; };   // one round; the design is the held state (between the arrival and holdEnd)
    // vertical offset of one note, px: negative = hidden under the ticket, 0 = the design, positive = sunk behind the wallet
    var offset = function (u, comeAt, comeDur, comePx, goAt, goDur, goPx) {
      if (u < comeAt) return -comePx;
      if (u < comeAt + comeDur) return -comePx * (1 - easeStd((u - comeAt) / comeDur));
      if (u < goAt) return 0;
      if (u < goAt + goDur) return goPx * easeStd((u - goAt) / goDur);
      return goPx;
    };
    var lowerGo = T.holdEnd, upperGo = T.holdEnd + T.goGap;
    var bump = function (u) {   // wallet size: a short swell when a note has just disappeared behind it
      var s = 0, ends = [lowerGo + T.goLowerDur, upperGo + T.goUpperDur];
      ends.forEach(function (e) { var x = (u - (e - T.bumpLead)) / T.bumpDur; if (x > 0 && x < 1) s = Math.max(s, Math.sin(Math.PI * x)); });
      return 1 + (T.bumpScale - 1) * s;
    };

    var ambient = P.ambientFlow(svg, { gsap: gsap, impulses: impulses, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
    var hover = P.levitate(svg, { items: [
      { el: ticket, amp: T.cardAmp, tilt: T.cardTilt, period: T.cardPeriod, dir: 1 },
      { el: wallet, amp: T.walletAmp, tilt: T.walletTilt, period: T.walletPeriod, dir: -1 },   // opposite first move: they never rise together at the start
    ] });
    var ready = false, tick = null, wc = null;

    function prepare() {
      if (ready) return;
      ready = true;
      ambient.prepare(); hover.prepare();
      var b = TM.util.boxIn(svg, wallet); wc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    }

    function seek(t) {
      var u = local(t), c;
      ambient.update(t); hover.update(t);
      bills[0].setAttribute('transform', 'translate(0 ' + offset(u, T.comeStart, T.comeLowerDur, T.comeLowerPx, lowerGo, T.goLowerDur, T.goLowerPx).toFixed(3) + ')');
      bills[1].setAttribute('transform', 'translate(0 ' + offset(u, T.comeStart + T.comeGap, T.comeUpperDur, T.comeUpperPx, upperGo, T.goUpperDur, T.goUpperPx).toFixed(3) + ')');
      c = bump(u);
      if (c === 1) wallet.removeAttribute('transform');
      else wallet.setAttribute('transform', 'translate(' + wc.x.toFixed(2) + ' ' + wc.y.toFixed(2) + ') scale(' + c.toFixed(4) + ') translate(' + (-wc.x).toFixed(2) + ' ' + (-wc.y).toFixed(2) + ')');
    }

    return {
      start: function () {
        prepare();
        if (tick) gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        var t0 = gsap.ticker.time;
        tick = function () { seek(gsap.ticker.time - t0); };
        gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) gsap.ticker.remove(tick);
        tick = null;
        if (!ready) return;
        ambient.reset(); hover.reset();
        bills.forEach(function (b) { b.removeAttribute('transform'); });
        wallet.removeAttribute('transform');
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
