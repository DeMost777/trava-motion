/* Primitive: routeFlow (new in Client Interaction, ADR 0019).
 * A bar (a copy of a bar drawn in the design) travels along a route made of straight runs joined by rounded
 * right-angle corners, like the dashed lines of the design. The bar bends around corners: it is cut into thin
 * slices of the same gradient, each slice follows its own point of the route. On straight runs it is one piece.
 * Bars exist only while the animation plays; at rest nothing is added to the design (principles §9).
 * Driven by an external clock: update(t), t in seconds. Geometry is read lazily in prepare() (needs layout).
 *
 * opt.routes[i] = { points: [{x, y}, …] in root coordinates, at: first departure (s), emerge: route length hidden
 *                   under the start node (px), before: element the copies of this route are inserted before }
 * opt.bar    — the <rect> to copy: unflipped, head (opaque end) on the right
 * The copies go right before the route's own node: above the dashed lines, under the nodes and the hub card.
 * opt.speed (px/s), opt.cycle (s between departures on one route), opt.radius (corner radius, px)
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};
  var NS = 'http://www.w3.org/2000/svg', HALF_PI = Math.PI / 2;

  function dir(a, b) { var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d, d: d }; }

  // straight runs + quarter-circle corners; positions outside [0, length] continue the first / last run
  function buildRoute(points, radius) {
    var segs = [], total = 0, start = points[0], i;
    function line(a, b) {
      var d = dir(a, b); if (d.d < 1e-6) return;
      segs.push({ kind: 'line', x: a.x, y: a.y, dx: d.x, dy: d.y, len: d.d, a: Math.atan2(d.y, d.x), from: total }); total += d.d;
    }
    for (i = 1; i < points.length; i++) {
      var v = points[i];
      if (i === points.length - 1) { line(start, v); break; }
      var d1 = dir(points[i - 1], v), d2 = dir(v, points[i + 1]);
      var right = Math.abs(d1.x * d2.x + d1.y * d2.y) < 1e-6, cross = d1.x * d2.y - d1.y * d2.x;
      var r = right ? Math.min(radius, dir(start, v).d, d2.d / 2) : 0;
      var p1 = { x: v.x - d1.x * r, y: v.y - d1.y * r }, p2 = { x: v.x + d2.x * r, y: v.y + d2.y * r };
      line(start, p1);
      if (r > 0) {
        var c = { x: p1.x + d2.x * r, y: p1.y + d2.y * r };
        segs.push({ kind: 'arc', cx: c.x, cy: c.y, r: r, a0: Math.atan2(p1.y - c.y, p1.x - c.x), sweep: cross > 0 ? HALF_PI : -HALF_PI, len: r * HALF_PI, from: total });
        total += r * HALF_PI;
      }
      start = p2;
    }
    function indexAt(s) { if (s <= 0) return 0; for (var k = 0; k < segs.length; k++) if (s < segs[k].from + segs[k].len) return k; return segs.length - 1; }
    function pointAt(s) {
      var g = segs[indexAt(s)], u = s - g.from;
      if (g.kind === 'line') return { x: g.x + g.dx * u, y: g.y + g.dy * u, a: g.a };
      var ang = g.a0 + g.sweep * (u / g.len);
      return { x: g.cx + g.r * Math.cos(ang), y: g.cy + g.r * Math.sin(ang), a: ang + (g.sweep > 0 ? HALF_PI : -HALF_PI) };
    }
    return { length: total, indexAt: indexAt, pointAt: pointAt, segs: segs };
  }

  function matrix(px, py, ang, ax, ay) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return 'matrix(' + c + ' ' + s + ' ' + (-s) + ' ' + c + ' ' + (px - (c * ax - s * ay)) + ' ' + (py - (s * ax + c * ay)) + ')';
  }

  TM.util = TM.util || {};
  TM.util.buildRoute = buildRoute;   // length of a route is needed to plan departures before the bars exist

  TM.primitives.routeFlow = function (svg, opt) {
    var uid = 'tm' + Math.random().toString(36).slice(2, 8), lanes = null;
    var SLICE = 2;   // px of bar per slice while it bends

    function prepare() {
      if (lanes) return;
      var tpl = opt.bar, parent = tpl.parentNode;
      var bx = +tpl.getAttribute('x'), by = +tpl.getAttribute('y'), bw = +tpl.getAttribute('width'), bh = +tpl.getAttribute('height');
      var n = Math.max(2, Math.round(bw / SLICE)), sw = bw / n, ax0 = bx, ay = by + bh / 2;
      var defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
      function copy(ref) {
        var c = tpl.cloneNode(true); c.removeAttribute('data-m'); c.removeAttribute('id'); c.removeAttribute('transform');
        c.style.visibility = 'hidden'; (ref ? ref.parentNode : parent).insertBefore(c, ref || null); return c;
      }
      lanes = opt.routes.map(function (r, ri) {
        var route = buildRoute(r.points, opt.radius), slices = [], i;
        var full = copy(r.before);
        for (i = 0; i < n; i++) {
          var cp = document.createElementNS(NS, 'clipPath'), cr = document.createElementNS(NS, 'rect'), id = uid + '-' + ri + '-' + i;
          cp.setAttribute('id', id); cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
          cr.setAttribute('x', bx + i * sw); cr.setAttribute('y', by - 1); cr.setAttribute('width', sw); cr.setAttribute('height', bh + 2);
          cp.appendChild(cr); defs.appendChild(cp);
          var sl = copy(r.before); sl.setAttribute('clip-path', 'url(#' + id + ')'); slices.push(sl);
        }
        return { route: route, at: r.at, emerge: r.emerge || 0, full: full, slices: slices, mode: 'hidden' };
      });
      lanes.sw = sw; lanes.n = n; lanes.ax0 = ax0; lanes.ay = ay; lanes.bw = bw; lanes.bx = bx; lanes.by = by; lanes.bh = bh;
    }

    function show(l, mode) {
      if (l.mode === mode) return;
      l.full.style.visibility = mode === 'rigid' ? '' : 'hidden';
      l.slices.forEach(function (s) { s.style.visibility = mode === 'sliced' ? '' : 'hidden'; });
      l.mode = mode;
    }

    function place(l, head) {
      var tail = head - lanes.bw, rt = l.route;
      var iT = rt.indexAt(tail), iH = rt.indexAt(head);
      if (iT === iH && rt.segs[iT].kind === 'line') {
        show(l, 'rigid');
        var p = rt.pointAt(head);
        l.full.setAttribute('transform', matrix(p.x, p.y, p.a, lanes.bx + lanes.bw, lanes.ay));
      } else {
        show(l, 'sliced');
        for (var i = 0; i < lanes.n; i++) {
          var q = rt.pointAt(tail + (i + 0.5) * lanes.sw);
          l.slices[i].setAttribute('transform', matrix(q.x, q.y, q.a, lanes.bx + (i + 0.5) * lanes.sw, lanes.ay));
        }
      }
    }

    function update(t) {
      lanes.forEach(function (l) {
        if (t < l.at) { show(l, 'hidden'); return; }
        var k = Math.floor((t - l.at) / opt.cycle), head = l.emerge + (t - l.at - k * opt.cycle) * opt.speed;
        if (head - lanes.bw > l.route.length) show(l, 'hidden'); else place(l, head);
      });
    }

    function reset() {
      if (!lanes) return;
      lanes.forEach(function (l) { show(l, 'hidden'); });
    }

    return {
      prepare: prepare, update: update, reset: reset,
      length: function (i) { prepare(); return lanes[i].route.length; },
    };
  };
})(window);
