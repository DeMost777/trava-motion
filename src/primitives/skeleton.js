/* Primitive: skeleton (new in Quality Control, ADR 0024).
 * A waiting plate in the place of an element (the number on the card) with a soft highlight that runs over it.
 * The plate is not in the design: code draws it, only while the animation plays, and removes it on reset (principles §9).
 * Driven by an external clock: update(t, level) — level 0…1 is how visible the plate is (the caller crossfades it with the real element).
 * opt: target (element the plate covers; the plate goes right before it, or right after opt.after when given), alpha (plate), shine (highlight), period (s per pass),
 *      color (default white; tokens illustration.placeholder.skeleton / skeleton-shine)
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

  TM.primitives.skeleton = function (svg, opt) {
    var uid = 'tm' + Math.random().toString(36).slice(2, 8), color = opt.color || '#ffffff';
    var box = null, group = null, band = null, last = -1;

    function prepare() {
      if (group) return;
      box = TM.util.boxIn(svg, opt.target);
      var defs = el('defs', {}, svg);
      var clip = el('clipPath', { id: uid + '-c', clipPathUnits: 'userSpaceOnUse' }, defs);
      var r = box.h / 2;
      el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: r }, clip);
      var grad = el('linearGradient', { id: uid + '-g', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0 }, grad);
      el('stop', { offset: 0.5, 'stop-color': color, 'stop-opacity': opt.shine }, grad);
      el('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, grad);
      group = el('g', { opacity: 0, 'pointer-events': 'none' });
      el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: r, fill: color, 'fill-opacity': opt.alpha }, group);
      var inner = el('g', { 'clip-path': 'url(#' + uid + '-c)' }, group);
      band = el('rect', { x: box.x - box.w * 0.6, y: box.y, width: box.w * 0.6, height: box.h, fill: 'url(#' + uid + '-g)' }, inner);
      if (opt.after && opt.after.parentNode) opt.after.parentNode.insertBefore(group, opt.after.nextSibling);   // outside a filtered group: its moving highlight would make the browser redo that group's blur on every frame
      else opt.target.parentNode.insertBefore(group, opt.target);
    }

    function update(t, level) {
      var k = Math.max(0, Math.min(1, level));
      if (k !== last) { group.setAttribute('opacity', k); last = k; }
      if (k === 0) return;
      var u = (t / opt.period) % 1;                                 // one pass of the highlight, then it starts again
      band.setAttribute('transform', 'translate(' + (u * (box.w * 1.6)) + ' 0)');
    }

    function reset() {
      if (!group) return;
      last = -1; group.setAttribute('opacity', 0); band.removeAttribute('transform');
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
