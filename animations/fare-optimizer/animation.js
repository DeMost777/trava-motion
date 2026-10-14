/* Fare Optimizer animation — implements animations/fare-optimizer/motion.yaml (ADR 0039).
 * The motion is the Figma prototype of the Optimization frame carried over as it is (team: "the mechanics stay the same"):
 * 4 s round; five points and five badges appear one after another, the notification panel springs in, the bell rings
 * three times, the three "Saved" rows spring in. The price line and the axes do not move (as in Figma).
 * Curves are the Figma ones (cubic-bezier and springs from get_motion_context), not the motion tokens (ADR 0039, item 3).
 * Frame 0 = design: the animation starts at the finished state; at the end of the round everything is cut away and the round starts over (as in Figma).
 * Infinite while visible (ADR 0007); the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0039). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    round: 4, rest: 3.62,
    step: 0.8, pointDur: 0.4, badgeFade: 0.2, fromBelow: 42.366, fromAbove: -49.75, fromBelowDeparture: 50.67,
    panelStart: 0.8, panelDur: 0.498, titleDur: 0.5315,
    ring1: 0.898, ring2: 1.598, ring3: 2.299, ringUp: 0.102, ringSettle: 0.5, ringAngle: 30, ringScale: 1.12, bellStiffness: 600, bellDamping: 12.247,
    saving1: 1.2, saving2: 1.898, saving3: 2.697, savingDur: 0.4, savingFrom: 0.9, savingFadeLead: 0.2, savingFadeDur: 0.4,
  };

  // cubic-bezier(x1, y1, x2, y2) as an easing function of progress 0 … 1 (CSS definition)
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var X = function (t) { return ((ax * t + bx) * t + cx) * t; }, Y = function (t) { return ((ay * t + by) * t + cy) * t; };
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x, i;
      for (i = 0; i < 40; i++) { var d = X(t) - x; if (Math.abs(d) < 1e-6) break; if (d > 0) hi = t; else lo = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  // Figma spring over a segment of normalised time 0 … 1: 1 - e^(-a t)(cos(b t) + c sin(b t))
  function spring(a, b, c) {
    return function (x) { if (x <= 0) return 0; if (x >= 1) x = 1; return 1 - Math.exp(-a * x) * (Math.cos(b * x) + c * Math.sin(b * x)); };
  }
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };

  TM.register('fare-optimizer', function (svg, env) {
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"round":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var easeDot = bezier(0.7, -0.4, 0.4, 1.4), easeSoft = bezier(0.5, 0, 0.5, 1), easeMove = bezier(0, 0, 0, 1);
    var springPanel = spring(7.6657, 6.7605, 1.1339), springRow = spring(7.328, 14.0296, 0.5223);
    var w = Math.sqrt(T.bellStiffness - Math.pow(T.bellDamping / 2, 2)), zw = T.bellDamping / 2;
    var springBell = spring(zw * T.ringSettle, w * T.ringSettle, zw / w);
    var local = function (t) { return (t + T.rest) % T.round; };

    var points = role('point'), badges = role('badge'), panel = role('panel')[0], title = role('title')[0], bell = role('bell')[0], savings = role('saving');
    var items = null, ready = false, tick = null;

    function item(el) {   // remembers the own transform of an element and the centre it scales about
      var b = TM.util.boxIn(svg, el);
      return { el: el, cx: b.x + b.w / 2, cy: b.y + b.h / 2, orig: el.getAttribute('transform') };
    }
    function put(it, dx, dy, s, deg) {
      var tf = (it.orig ? it.orig + ' ' : '') + 'translate(' + (+dx).toFixed(3) + ' ' + (+dy).toFixed(3) + ') translate(' + it.cx.toFixed(2) + ' ' + it.cy.toFixed(2) + ') ' +
        (deg ? 'rotate(' + deg.toFixed(3) + ') ' : '') + 'scale(' + Math.max(s, 0.0001).toFixed(4) + ') translate(' + (-it.cx).toFixed(2) + ' ' + (-it.cy).toFixed(2) + ')';
      it.el.setAttribute('transform', tf);
    }
    function clear(it) {
      if (it.orig === null) it.el.removeAttribute('transform'); else it.el.setAttribute('transform', it.orig);
      it.el.style.opacity = '';
    }

    function prepare() {
      if (ready) return;
      ready = true;
      var byX = function (a, b) { return a.cx - b.cx; };
      items = {
        points: points.map(item).sort(byX),
        badges: badges.map(item).sort(byX),
        panel: item(panel), title: item(title), bell: item(bell),
        savings: savings.map(item).sort(function (a, b) { return a.cy - b.cy; }),
      };
    }

    function seek(t) {
      var u = local(t), i, p, s, e, from, start, ring, r, tt;
      // points and badges: the i-th starts at i * step
      for (i = 0; i < 5; i++) {
        start = i * T.step;
        put(items.points[i], 0, 0, easeDot(clamp01((u - start) / T.pointDur)));
        from = i === 0 ? T.fromBelow : i === 4 ? T.fromBelowDeparture : T.fromAbove;
        p = clamp01((u - start) / T.pointDur);
        e = items.badges[i];
        put(e, 0, from * (1 - easeMove(p)), easeSoft(p));
        e.el.style.opacity = String(easeSoft(clamp01((u - start) / T.badgeFade)));
      }
      // panel and title
      put(items.panel, 0, 0, springPanel(clamp01((u - T.panelStart) / T.panelDur)));
      items.title.el.style.opacity = String(easeSoft(clamp01((u - T.panelStart) / T.titleDur)));
      // bell rings three times: up in ringUp, settles with a spring in ringSettle
      s = 0; e = 1;
      [T.ring1, T.ring2, T.ring3].forEach(function (r0) {
        if (u >= r0 && u < r0 + T.ringUp) { tt = easeSoft((u - r0) / T.ringUp); s = tt; e = 1 + (T.ringScale - 1) * tt; }
        else if (u >= r0 + T.ringUp && u < r0 + T.ringUp + T.ringSettle) {
          tt = (u - r0 - T.ringUp) / T.ringSettle;
          s = 1 - springBell(tt); e = 1 + (T.ringScale - 1) * (1 - easeSoft(tt));
        }
      });
      put(items.bell, 0, 0, e, -T.ringAngle * s);   // Figma turns the bell counter-clockwise, SVG rotate() clockwise
      // saved rows: fade in first, then spring from 0.9 to 1
      [T.saving1, T.saving2, T.saving3].forEach(function (s0, j) {
        var row = items.savings[j];
        put(row, 0, 0, T.savingFrom + (1 - T.savingFrom) * springRow(clamp01((u - s0) / T.savingDur)));
        row.el.style.opacity = String(easeSoft(clamp01((u - (s0 - T.savingFadeLead)) / T.savingFadeDur)));
      });
    }

    function clearAll() {
      items.points.concat(items.badges, [items.panel, items.title, items.bell], items.savings).forEach(clear);
    }

    return {
      start: function () {
        prepare();
        if (tick) env.gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        var t0 = env.gsap.ticker.time;
        tick = function () { seek(env.gsap.ticker.time - t0); };
        env.gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) env.gsap.ticker.remove(tick);
        tick = null;
        if (ready) clearAll();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
