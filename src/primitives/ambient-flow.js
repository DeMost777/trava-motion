/* Primitive: ambientFlow (new in Client Interaction, ADR 0019).
 * Quiet background streams: every bar drawn in the design keeps running along its own short line, one bar per line,
 * with a pause before it comes back, so the lines are never in step. The direction is the one the designer drew
 * (a bar mirrored by `transform="matrix(-1 …)"` runs to the left, otherwise to the right). A bar leaves the line
 * at its end (clipped to the line). Frame 0 = design: every bar continues from where it is drawn.
 * Driven by an external clock: update(t). Geometry is read lazily in prepare().
 * opt: impulses ([rect]), tracks ([path], thin horizontal dashed lines), speed (px/s), gapMin / gapMax (s)
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};
  var NS = 'http://www.w3.org/2000/svg';

  TM.primitives.ambientFlow = function (svg, opt) {
    var uid = 'tm' + Math.random().toString(36).slice(2, 8), lanes = null;

    function prepare() {
      if (lanes) return;
      var boxIn = TM.util.boxIn;
      var tracks = opt.tracks.map(function (t) { return boxIn(svg, t); });
      var defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
      lanes = opt.impulses.map(function (rect, i) {
        var r = boxIn(svg, rect), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        var tr = tracks.filter(function (t) { return t.h < 2 && Math.abs(t.y + t.h / 2 - cy) < 2 && cx >= t.x - 1 && cx <= t.x + t.w + 1; })[0];
        if (!tr) throw new Error('ambientFlow: no line for bar ' + i);
        var dir = /^matrix\(\s*-/.test(rect.getAttribute('transform') || '') ? -1 : 1;
        var a = tr.x, b = tr.x + tr.w, p = r.x, len = r.w;
        var clip = document.createElementNS(NS, 'clipPath'), cr = document.createElementNS(NS, 'rect'), id = uid + '-' + i;
        clip.setAttribute('id', id); clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
        cr.setAttribute('x', a); cr.setAttribute('y', cy - 3); cr.setAttribute('width', b - a); cr.setAttribute('height', 6);
        clip.appendChild(cr); defs.appendChild(clip);
        var outer = document.createElementNS(NS, 'g'), mover = document.createElementNS(NS, 'g');
        outer.setAttribute('clip-path', 'url(#' + id + ')');
        rect.parentNode.insertBefore(outer, rect); outer.appendChild(mover); mover.appendChild(rect);
        var P = b - a + len;
        var gap = opt.gapMin + (opt.gapMax - opt.gapMin) * ((i * 0.618034) % 1);   // fixed, different on every line
        return { dir: dir, mover: mover, P: P, from: dir > 0 ? a - len - p : b - p, s0: dir > 0 ? p - (a - len) : b - p, cycle: P / opt.speed + gap };
      });
    }

    function update(t) {
      lanes.forEach(function (l) {
        var u = (l.s0 / opt.speed + t) % l.cycle, s = u * opt.speed;
        if (s > l.P) { l.mover.style.visibility = 'hidden'; return; }
        l.mover.setAttribute('transform', 'translate(' + (l.from + l.dir * s) + ' 0)'); l.mover.style.visibility = '';
      });
    }

    function reset() {
      if (!lanes) return;
      lanes.forEach(function (l) { l.mover.removeAttribute('transform'); l.mover.style.visibility = ''; });
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);
