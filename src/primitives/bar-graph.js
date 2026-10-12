/* Primitive: barGraph (new in Virtual Payments, ADR 0033).
 * A small bar chart whose bars stand on one baseline and change their height from that line (scale around the bottom edge),
 * so a bar can grow from a low strip to its height in the design, with a soft overshoot, and come back. Bars are ordered from left to right.
 * Frame 0 = design: no transform. Driven by an external clock: the caller says how high each bar is (update(value)).
 * opt: targets ([rect]), flat (px: the same height of every bar in the lowest state, so the chart rests as an even strip, whatever the design heights are)
 * update(value): value(i, n) → 0…1(+overshoot) is the height of bar i of n between the flat strip and its design height
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};

  TM.primitives.barGraph = function (svg, opt) {
    var bars = null, base = 0;

    function prepare() {
      if (bars) return;
      bars = opt.targets.map(function (el) { var b = TM.util.boxIn(svg, el); return { el: el, x: b.x, bottom: b.y + b.h, h: b.h, orig: el.getAttribute('transform'), last: 1 }; })
        .sort(function (a, b) { return a.x - b.x; });
      base = Math.max.apply(null, bars.map(function (b) { return b.bottom; }));   // the common baseline of the chart
    }

    function update(value) {
      var n = bars.length;
      bars.forEach(function (b, i) {
        var v = value(i, n), s = (opt.flat + (b.h - opt.flat) * v) / b.h;   // equal strip when v = 0, design height when v = 1
        if (Math.abs(s - b.last) < 1e-5) return;
        b.last = s;
        if (Math.abs(s - 1) < 1e-5) { if (b.orig === null) b.el.removeAttribute('transform'); else b.el.setAttribute('transform', b.orig); return; }
        b.el.setAttribute('transform', (b.orig ? b.orig + ' ' : '') + 'translate(0 ' + base + ') scale(1 ' + s + ') translate(0 ' + (-base) + ')');
      });
    }

    function reset() {
      if (!bars) return;
      bars.forEach(function (b) { b.last = 1; if (b.orig === null) b.el.removeAttribute('transform'); else b.el.setAttribute('transform', b.orig); });
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
