/* Primitive: impulseFlow (draft name, audit 1.1; confirmed in 5.1).
 * A continuous stream of impulses along their tracks toward a hub (Queue Manager, ADR 0013).
 * - Every impulse moves only inside its track and disappears under the avatar / hub edge (clip).
 * - Constant speed on every track; time per typical segment = segmentTime.
 * - Frame 0 = design: impulses drawn in the design continue from their places; new ones are emitted
 *   from the start of each track, deeper tracks first, so the stream fills the network toward the hub.
 * Driven by an external clock: update(t) with t in seconds. Geometry is read lazily on prepare(),
 * when the SVG is rendered (getScreenCTM needs layout).
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};
  var NS = 'http://www.w3.org/2000/svg';

  function boxIn(svg, el) {
    var b = el.getBBox();
    var m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    var xs = [], ys = [];
    [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].forEach(function (p) {
      xs.push(m.a * p[0] + m.c * p[1] + m.e); ys.push(m.b * p[0] + m.d * p[1] + m.f);
    });
    var x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
    return { x: x, y: y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
  }
  function median(a) { var s = a.slice().sort(function (p, q) { return p - q; }); return s[Math.floor(s.length / 2)]; }

  TM.primitives.impulseFlow = function (svg, opt) {
    var gsap = opt.gsap, uid = 'tm' + Math.random().toString(36).slice(2, 8);
    var lanes = null, speed = 0, interval = 0, level = 0, maxDepth = 0, ease = gsap.parseEase(opt.ease || 'none');

    function prepare() {
      if (lanes) return;
      var hub = boxIn(svg, opt.hub);
      var hubC = { x: hub.x + hub.w / 2, y: hub.y + hub.h / 2 };
      var tracks = opt.tracks.map(function (t) { return boxIn(svg, t); });
      var defs = document.createElementNS(NS, 'defs');
      svg.appendChild(defs);

      lanes = opt.impulses.map(function (rect, i) {
        var r = boxIn(svg, rect), horizontal = r.w > r.h;
        var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        var track = tracks.filter(function (t) {
          return horizontal ? (t.h < 2 && Math.abs(t.y + t.h / 2 - cy) < 2 && cx >= t.x - 1 && cx <= t.x + t.w + 1)
                            : (t.w < 2 && Math.abs(t.x + t.w / 2 - cx) < 2 && cy >= t.y - 1 && cy <= t.y + t.h + 1);
        })[0];
        if (!track) throw new Error('impulseFlow: no track for impulse ' + i);
        var dir = horizontal ? (cx < hubC.x ? 1 : -1) : (cy < hubC.y ? 1 : -1);
        var a = horizontal ? track.x : track.y, b = horizontal ? track.x + track.w : track.y + track.h;
        // tracks pass under the hub: stop at its edge
        if (horizontal && cy > hub.y && cy < hub.y + hub.h) { if (dir > 0) b = Math.min(b, hub.x); else a = Math.max(a, hub.x + hub.w); }
        if (!horizontal && cx > hub.x && cx < hub.x + hub.w) { if (dir > 0) b = Math.min(b, hub.y); else a = Math.max(a, hub.y + hub.h); }
        var p = horizontal ? r.x : r.y, len = horizontal ? r.w : r.h;

        // clip = the track; mover carries the translate, the original rect stays untouched inside
        var clip = document.createElementNS(NS, 'clipPath');
        clip.setAttribute('id', uid + '-clip' + i);
        clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
        var cr = document.createElementNS(NS, 'rect');
        if (horizontal) { cr.setAttribute('x', a); cr.setAttribute('y', cy - 3); cr.setAttribute('width', b - a); cr.setAttribute('height', 6); }
        else { cr.setAttribute('x', cx - 3); cr.setAttribute('y', a); cr.setAttribute('width', 6); cr.setAttribute('height', b - a); }
        clip.appendChild(cr); defs.appendChild(clip);
        var outer = document.createElementNS(NS, 'g'), mover = document.createElementNS(NS, 'g');
        outer.setAttribute('clip-path', 'url(#' + uid + '-clip' + i + ')');
        rect.parentNode.insertBefore(outer, rect);
        outer.appendChild(mover); mover.appendChild(rect);

        var startPt = dir > 0 ? a : b, endPt = dir > 0 ? b : a;
        return {
          horizontal: horizontal, dir: dir, a: a, b: b, len: len, outer: outer, mover: mover, clones: [],
          P: b - a + len,
          from: dir > 0 ? a - len - p : b - p,          // translate when the bar is hidden behind the start edge
          s0: dir > 0 ? p - (a - len) : b - p,           // design position on the path
          up: horizontal ? { x: startPt, y: cy } : { x: cx, y: startPt },
          down: horizontal ? { x: endPt, y: cy } : { x: cx, y: endPt },
        };
      });

      // depth: 1 = enters the hub, n = n segments away (fill-from-edges order)
      function nearHub(pt) { return pt.x >= hub.x - 6 && pt.x <= hub.x + hub.w + 6 && pt.y >= hub.y - 6 && pt.y <= hub.y + hub.h + 6; }
      function depthOf(l, seen) {
        if (l.depth) return l.depth;
        if (nearHub(l.down) || seen.indexOf(l) >= 0) return (l.depth = 1);
        var next = null, best = 60;
        lanes.forEach(function (m) {
          if (m === l) return;
          var d = Math.hypot(m.up.x - l.down.x, m.up.y - l.down.y);
          if (d < best) { best = d; next = m; }
        });
        return (l.depth = next ? 1 + depthOf(next, seen.concat([l])) : 1);
      }
      lanes.forEach(function (l) { depthOf(l, []); });

      var refPath = median(lanes.map(function (l) { return l.P; }));
      speed = refPath / opt.segmentTime;
      interval = opt.segmentTime / opt.perSegment;
      level = median(lanes.map(function (l) { return l.b - l.a; })) / speed;
      maxDepth = Math.max.apply(null, lanes.map(function (l) { return l.depth; }));
      lanes.forEach(function (l) {
        l.dur = l.P / speed;
        l.start = (maxDepth - l.depth) * level;
        var count = Math.ceil(l.dur / interval) + 1;
        for (var k = 0; k < count; k++) {
          var c = l.mover.cloneNode(true);
          c.style.visibility = 'hidden';
          l.outer.appendChild(c); l.clones.push(c);
        }
      });
    }

    function place(l, node, s) {
      var d = l.from + l.dir * s;
      node.setAttribute('transform', l.horizontal ? 'translate(' + d + ' 0)' : 'translate(0 ' + d + ')');
      node.style.visibility = '';
    }

    function update(t) {
      lanes.forEach(function (l) {
        var sd = l.s0 + speed * t;                       // design impulse keeps going, then leaves
        if (sd <= l.P) place(l, l.mover, sd); else l.mover.style.visibility = 'hidden';
        l.clones.forEach(function (c) { c.style.visibility = 'hidden'; });
        if (t < l.start) return;
        var last = Math.floor((t - l.start) / interval);
        var first = Math.max(0, Math.ceil((t - l.start - l.dur) / interval));
        for (var j = first; j <= last; j++) {
          var u = (t - l.start - j * interval) / l.dur;
          if (u < 0 || u > 1) continue;
          place(l, l.clones[j % l.clones.length], l.P * ease(u));
        }
      });
    }

    function reset() {
      if (!lanes) return;
      lanes.forEach(function (l) {
        l.mover.removeAttribute('transform'); l.mover.style.visibility = '';
        l.clones.forEach(function (c) { c.style.visibility = 'hidden'; c.removeAttribute('transform'); });
      });
    }

    return {
      prepare: prepare, update: update, reset: reset,
      arrivalTime: function () { prepare(); return maxDepth * level; },
    };
  };
})(window);
