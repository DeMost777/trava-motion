/* Primitive: shimmer (new in Ticketing, ADR 0027).
 * Data bars shimmer like a loading skeleton: one soft white highlight sweeps over all the bars from left to right in one wave
 * (every bar lights up a little later than the one on its left), then a pause. The highlight is clipped to each bar's own shape
 * (rounded ends, turned bars too). It is not in the design: code draws it, only while the animation plays (principles §9).
 * Driven by an external clock: update(t). Geometry is read lazily in prepare().
 * opt: targets ([rect]), alpha (peak, token illustration.placeholder.skeleton-shine), sweep (s the wave takes), pause (s between waves),
 *      width (px, width of the highlight on the screen), color (default white)
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  TM.primitives.shimmer = function (svg, opt) {
    var uid = 'tm' + Math.random().toString(36).slice(2, 8), color = opt.color || '#ffffff', bars = null, x0 = 0, x1 = 0, cycle = opt.sweep + opt.pause;

    function prepare() {
      if (bars) return;
      var defs = el('defs', {}, svg), i, n = 8;
      var grad = el('linearGradient', { id: uid + '-g', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      for (i = 0; i <= n; i++) {   // a soft bell: smooth in and out
        el('stop', { offset: i / n, 'stop-color': color, 'stop-opacity': (opt.alpha * (1 - Math.cos(2 * Math.PI * i / n)) / 2).toFixed(4) }, grad);
      }
      var all = opt.targets.map(function (t, k) {
        var sb = TM.util.boxIn(svg, t), w = +t.getAttribute('width'), h = +t.getAttribute('height'), x = +t.getAttribute('x'), y = +t.getAttribute('y');
        var rx = t.getAttribute('rx') || 0, tf = t.getAttribute('transform');
        var clip = el('clipPath', { id: uid + '-' + k, clipPathUnits: 'userSpaceOnUse' }, defs);
        el('rect', { x: x, y: y, width: w, height: h, rx: rx }, clip);
        var outer = el('g', { 'pointer-events': 'none' });
        if (tf) outer.setAttribute('transform', tf);
        var inner = el('g', { 'clip-path': 'url(#' + uid + '-' + k + ')' }, outer);
        var bw = opt.width * (w / sb.w);   // the highlight is `width` px wide on the screen: in the bar's own units it is this wide
        var band = el('rect', { x: x - bw, y: y, width: bw, height: h, fill: 'url(#' + uid + '-g)', visibility: 'hidden' }, inner);
        t.parentNode.insertBefore(outer, t.nextSibling);
        return { sb: sb, x: x, w: w, bw: bw, band: band, shown: false, outer: outer };
      });
      x0 = Math.min.apply(null, all.map(function (b) { return b.sb.x; })) - opt.width;
      x1 = Math.max.apply(null, all.map(function (b) { return b.sb.x + b.sb.w; }));
      bars = all;
    }

    function update(t) {
      var u = t % cycle, front = u < opt.sweep ? x0 + (x1 - x0) * (u / opt.sweep) : x1 + 1;   // screen x of the left edge of the highlight
      bars.forEach(function (b) {
        var left = front - b.sb.x;   // how far the highlight's left edge is inside the bar, screen px
        var visible = left > -opt.width && left < b.sb.w;
        if (!visible) { if (b.shown) { b.band.setAttribute('visibility', 'hidden'); b.shown = false; } return; }
        b.band.setAttribute('transform', 'translate(' + ((left + opt.width) / b.sb.w * b.w).toFixed(3) + ' 0)');
        if (!b.shown) { b.band.setAttribute('visibility', 'visible'); b.shown = true; }
      });
    }

    function reset() {
      if (!bars) return;
      bars.forEach(function (b) { b.band.setAttribute('visibility', 'hidden'); b.band.removeAttribute('transform'); b.shown = false; });
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
