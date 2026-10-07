/* Primitive: pulse (new in Client Interaction, ADR 0019).
 * An element grows about its own centre and returns: up (ease), hold, down (ease). With `overshoot` the way up
 * overshoots a little and settles (the "filled up" effect of the hub icon, an exception to principles §1, ADR 0019).
 * Several overlapping pulses on one element do not add up or jump: the largest one wins.
 * Driven by an external clock: update(t). Events are first-occurrence times (s), repeated every `cycle`.
 * opt: gsap, targets ([el]), events ([[t, …] per target]), cycle (s),
 *      scale (peak, e.g. 1.2), up (s), hold (s), down (s), easeUp / easeDown (GSAP ease names),
 *      overshoot: fraction of the growth the way up overshoots, 0 = none (0.3 with scale 1.2 → reaches 1.26 and settles at 1.2)
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};

  // the strength of GSAP's back.out that overshoots by `frac` of the travel (found by bisection)
  function backFor(gsap, frac) {
    var lo = 0.05, hi = 30, i, mid, e, x, max;
    for (i = 0; i < 40; i++) {
      mid = (lo + hi) / 2; e = gsap.parseEase('back.out(' + mid + ')'); max = 1;
      for (x = 0.3; x <= 0.9; x += 0.01) max = Math.max(max, e(x));
      if (max - 1 < frac) lo = mid; else hi = mid;
    }
    return +((lo + hi) / 2).toFixed(3);
  }

  TM.primitives.pulse = function (svg, opt) {
    var gsap = opt.gsap, items = null;
    var up = gsap.parseEase(opt.overshoot > 0 ? 'back.out(' + backFor(gsap, opt.overshoot) + ')' : (opt.easeUp || 'sine.out'));
    var down = gsap.parseEase(opt.easeDown || 'power1.inOut');
    var peak = opt.scale - 1, hold = opt.hold || 0, total = opt.up + hold + opt.down;

    function delta(local) {
      if (local < 0 || local > total) return 0;
      if (local <= opt.up) return peak * up(local / opt.up);
      if (local <= opt.up + hold) return peak;
      return peak * (1 - down((local - opt.up - hold) / opt.down));
    }

    function prepare() {
      if (items) return;
      items = opt.targets.map(function (el, i) {
        var b = el.getBBox();
        return { el: el, cx: b.x + b.width / 2, cy: b.y + b.height / 2, orig: el.getAttribute('transform'), events: opt.events[i] || [], last: 0 };
      });
    }

    function apply(it, k) {
      var s = 1 + k;
      var tf = 'translate(' + it.cx + ' ' + it.cy + ') scale(' + s + ') translate(' + (-it.cx) + ' ' + (-it.cy) + ')';
      it.el.setAttribute('transform', (it.orig ? it.orig + ' ' : '') + tf);
    }

    function update(t) {
      items.forEach(function (it) {
        var k = 0;
        it.events.forEach(function (e) {
          if (t < e) return;
          var local = (t - e) % opt.cycle;
          k = Math.max(k, delta(local));
        });
        if (Math.abs(k - it.last) < 1e-5) return;
        it.last = k;
        if (k === 0) { if (it.orig === null) it.el.removeAttribute('transform'); else it.el.setAttribute('transform', it.orig); }
        else apply(it, k);
      });
    }

    function reset() {
      if (!items) return;
      items.forEach(function (it) {
        it.last = 0;
        if (it.orig === null) it.el.removeAttribute('transform'); else it.el.setAttribute('transform', it.orig);
      });
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
