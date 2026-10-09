/* Primitive: levitate (new in Ticketing, ADR 0027).
 * A flat object hovers: it drifts up and down and tilts a little, as a slow sine (the same curve as sine.inOut played back and forth).
 * Everything inside the object moves with it except the child marked data-m="shadow" (opt.keep): the big drop shadow stays where it is,
 * so the browser does not redo its blur on every frame (principles §9). Frame 0 = design (zero offset).
 * Driven by an external clock: update(t). Geometry is read lazily in prepare().
 * opt.items: [{ el, amp (px), tilt (deg), period (s), dir (+1 goes up first, -1 goes down first) }]
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};
  var NS = 'http://www.w3.org/2000/svg';

  TM.primitives.levitate = function (svg, opt) {
    var movers = null;

    function wrap(parent, skip) {   // one group around every child of parent except skip (document order kept)
      var g = document.createElementNS(NS, 'g');
      Array.prototype.slice.call(parent.childNodes).forEach(function (n) { if (n !== skip) g.appendChild(n); });
      parent.appendChild(g);
      return g;
    }

    function prepare() {
      if (movers) return;
      movers = opt.items.map(function (it) {
        var keep = it.el.querySelector('[data-m="shadow"]'), groups = [];
        if (keep) {
          var home = keep.parentNode, node = home;
          while (node.parentNode !== it.el) node = node.parentNode;                     // `node` is the child of the object that holds the shadow
          groups.push(wrap(home, keep));                                                 // the body next to the shadow
          Array.prototype.slice.call(it.el.childNodes).forEach(function (n) { if (n !== node && n.nodeType === 1) groups.push(wrap(n, null)); });   // the rest of the object (barcode…)
        } else groups.push(wrap(it.el, null));
        var box = TM.util.boxIn(svg, it.el);
        return { groups: groups, cx: box.x + box.w / 2, cy: box.y + box.h / 2, it: it };
      });
    }

    function update(t) {
      movers.forEach(function (m) {
        var s = Math.sin(2 * Math.PI * t / m.it.period) * m.it.dir;
        var tf = 'translate(0 ' + (-s * m.it.amp).toFixed(3) + ') rotate(' + (-s * m.it.tilt).toFixed(3) + ' ' + m.cx.toFixed(2) + ' ' + m.cy.toFixed(2) + ')';
        m.groups.forEach(function (g) { g.setAttribute('transform', tf); });
      });
    }

    function reset() {
      if (!movers) return;
      movers.forEach(function (m) { m.groups.forEach(function (g) { g.removeAttribute('transform'); }); });
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
