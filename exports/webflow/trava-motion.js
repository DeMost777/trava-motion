/*! Trava Motion — built 2026-10-08 from github repo trava-motion. Animations: client-interaction, quality-control, queue-manager. */
window.TravaMotion = window.TravaMotion || {}; window.TravaMotion.tokens = {"ease":{"enter":"sine.out","standard":"power1.inOut","exit":"sine.in","draw":"power1.inOut","flow":"none"},"trigger":{"threshold":0.35,"delay":0}};
/* Site settings for trava.co (Webflow). The runtime itself knows nothing about the site's markup.
 * Solutions block: desktop shows all cards stacked and toggles `is-active` on [data-solution-state]
 * (the site's own script does this; Trava Motion only reads the class). Tablet/mobile cards have no such
 * element, so the gate does not apply there.
 * releaseDelay: the switched-off card fades out for 300 ms (site CSS); reset to the design waits for it.
 */
window.TravaMotion = window.TravaMotion || {};
window.TravaMotion.config = window.TravaMotion.config || {};
window.TravaMotion.config.gate = { selector: '[data-solution-state]', activeClass: 'is-active', releaseDelay: 350 };

/* Trava Motion runtime (task 6.1–6.3, short path for Queue Manager).
 * Finds elements with data-trava-animation, turns an <img> of the prepared SVG into inline SVG,
 * and plays the registered animation while the illustration is visible.
 * Animation is an enhancement: no GSAP, reduced motion, a failed fetch or any error leave the
 * illustration exactly as designed (principles §9, ADR 0014).
 * Plain browser script, no modules: tools/build-webflow.mjs concatenates it with primitives and animations.
 *
 * Site-specific settings live outside this file (src/site/trava-co.js):
 *   TravaMotion.config.gate = { selector, activeClass, releaseDelay }
 *     — an illustration inside an element matching `selector` plays only while that element has `activeClass`
 *       (the site stacks all solution cards on top of each other and toggles the class). The class is only read.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.animations = TM.animations || {};
  TM.primitives = TM.primitives || {};
  TM.config = TM.config || {};
  TM.tokens = TM.tokens || { trigger: { threshold: 0.35, delay: 0 } };
  TM.register = function (name, factory) { TM.animations[name] = factory; };
  TM.controllers = [];

  var loads = {}, instance = 0;

  function warn(msg, err) { if (root.console) root.console.warn('[trava-motion] ' + msg, err || ''); }
  function reducedMotion() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function list(nodes) { return Array.prototype.slice.call(nodes); }

  // one request per file, even if the same illustration is on the page twice (desktop + tablet/mobile markup)
  function loadSvg(src) {
    if (!loads[src]) {
      loads[src] = fetch(src, { mode: 'cors', credentials: 'omit' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + src);
        return res.text();
      });
      loads[src].catch(function () { delete loads[src]; });
    }
    return loads[src];
  }

  // Two copies of one SVG on a page would share gradient / clip ids and the second would render with the
  // first one's definitions. Every inlined copy gets its own id prefix; references are rewritten with it.
  function prefixIds(svg, prefix) {
    var all = [svg].concat(list(svg.querySelectorAll('*'))), known = {}, any = false;
    all.forEach(function (n) { var id = n.getAttribute('id'); if (id) { known[id] = true; any = true; } });
    if (!any) return;
    function rewrite(v) {
      return v.replace(/url\((['"]?)#([^)'"]+)\1\)/g, function (m, q, id) {
        return known[id] ? 'url(' + q + '#' + prefix + id + q + ')' : m;
      });
    }
    all.forEach(function (n) {
      list(n.attributes).forEach(function (a) {
        if (a.name === 'id') { n.setAttribute('id', prefix + a.value); return; }
        if ((a.name === 'href' || a.name === 'xlink:href') && a.value.charAt(0) === '#' && known[a.value.slice(1)]) {
          n.setAttributeNS(a.namespaceURI, a.name, '#' + prefix + a.value.slice(1)); return;
        }
        if (a.value.indexOf('url(#') >= 0) n.setAttribute(a.name, rewrite(a.value));
      });
    });
  }

  // <img src="….svg" data-trava-animation> → the same SVG inline, so its layers can move.
  function inlineSvg(el) {
    if (el.tagName.toLowerCase() === 'svg') return Promise.resolve(el);
    return loadSvg(el.currentSrc || el.src).then(function (text) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('not an SVG: ' + el.src);
      var node = document.importNode(svg, true);
      prefixIds(node, 'tm' + (++instance) + '-');
      if (el.getAttribute('class')) node.setAttribute('class', el.getAttribute('class'));
      if (el.getAttribute('style')) node.setAttribute('style', el.getAttribute('style'));
      // size comes from the site's own classes (the <img> had them); only what an <img> did by itself is kept
      node.style.height = 'auto';
      node.style.display = node.style.display || 'block';
      list(el.attributes).forEach(function (a) { if (a.name.indexOf('data-trava-') === 0) node.setAttribute(a.name, a.value); });   // data-trava-animation and any other data-trava-* setting
      // the text alternative of the <img> moves to the SVG; without alt the illustration stays decorative
      var alt = el.getAttribute('alt');
      if (alt) { node.setAttribute('role', 'img'); node.setAttribute('aria-label', alt); node.removeAttribute('aria-hidden'); }
      el.parentNode.replaceChild(node, el);
      return node;
    });
  }

  function run(name, factory, svg) {
    var threshold = TM.tokens.trigger.threshold, delay = TM.tokens.trigger.delay || 0;
    var gate = TM.config.gate, host = gate ? svg.closest(gate.selector) : null;
    var ctrl = factory(svg, { gsap: root.gsap, tokens: TM.tokens, primitives: TM.primitives });
    var inView = false, running = false, startTimer = null, stopTimer = null;

    function safe(fn) { try { fn(); } catch (e) { warn('animation error, back to design', e); try { ctrl.reset(); } catch (_) { /* ignore */ } running = false; } }
    function active() { return !host || host.classList.contains(gate.activeClass); }
    function stop() { stopTimer = null; root.clearTimeout(startTimer); safe(function () { ctrl.reset(); }); running = false; } // interrupt: jump to design; replays on next activation

    function sync() {
      var wanted = inView && active();
      if (wanted) {
        root.clearTimeout(stopTimer); stopTimer = null;
        if (!running) { running = true; startTimer = root.setTimeout(function () { safe(function () { ctrl.start(); }); }, delay); }
      } else if (running && stopTimer === null) {
        // a card that is switched off fades out; the jump to the design waits until it is gone
        var wait = inView && host ? (gate.releaseDelay || 0) : 0;
        if (wait) stopTimer = root.setTimeout(stop, wait); else stop();
      }
    }

    TM.controllers.push({ name: name, svg: svg, controller: ctrl });
    new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      inView = e.isIntersecting && e.intersectionRatio >= threshold;
      sync();
    }, { threshold: [0, threshold] }).observe(svg);
    if (host && root.MutationObserver) new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ['class'] });
  }

  function mount(el) {
    var name = el.getAttribute('data-trava-animation');
    var factory = TM.animations[name];
    if (!factory) return warn('no animation registered for "' + name + '"');
    if (!root.gsap) return warn('GSAP is not loaded; illustration stays static');
    if (reducedMotion() || !root.IntersectionObserver) return; // static design, as approved

    var go = function () { inlineSvg(el).then(function (svg) { run(name, factory, svg); }).catch(function (e) { warn('could not inline "' + name + '", illustration stays static', e); }); };
    if (el.tagName.toLowerCase() === 'svg') return go();
    // Only the copy that is on screen (or about to be) is turned into SVG. The site has separate markup for
    // desktop and tablet/mobile: the hidden one has no box, never intersects and stays an untouched <img>.
    var pre = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { pre.disconnect(); go(); }
    }, { rootMargin: '200px 0px' });
    pre.observe(el);
  }

  TM.mountAll = function (scope) {
    var found = (scope || document).querySelectorAll('[data-trava-animation]');
    for (var i = 0; i < found.length; i++) mount(found[i]);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { TM.mountAll(); });
  else root.setTimeout(function () { TM.mountAll(); }, 0);
})(window);

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

/* Shared geometry helpers for primitives (read from the rendered SVG, so call them after layout). */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.util = TM.util || {};

  // bounding box of an element in the coordinates of the root <svg>
  TM.util.boxIn = function (svg, el) {
    var b = el.getBBox();
    var m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    var xs = [], ys = [];
    [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].forEach(function (p) {
      xs.push(m.a * p[0] + m.c * p[1] + m.e); ys.push(m.b * p[0] + m.d * p[1] + m.f);
    });
    var x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
    return { x: x, y: y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
  };

  // a point of a <path> (at arc length `at`, or its end when at < 0) in the coordinates of the root <svg>
  TM.util.pointOn = function (svg, path, at) {
    var p = path.getPointAtLength(at < 0 ? path.getTotalLength() : at);
    var m = svg.getScreenCTM().inverse().multiply(path.getScreenCTM());
    return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
  };
})(window);

/* Primitive: hubAccent (draft name, audit 1.1; confirmed in 5.1).
 * A central element turns and zooms in/out around its own centre, without overshoot (principles §1),
 * first at `firstAt`, then every `every` seconds. Driven by an external clock: update(t).
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};

  TM.primitives.hubAccent = function (svg, opt) {
    var gsap = opt.gsap, el = opt.target, tl = null, firstAt = 0;
    var originalTransform = el.getAttribute('transform');

    function prepare(at) {
      firstAt = at;
      if (tl) return;
      var b = el.getBBox();
      var origin = (b.x + b.width / 2) + ' ' + (b.y + b.height / 2);
      var d = opt.duration;
      tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: Math.max(0, opt.every - d) });
      tl.fromTo(el, { rotation: 0, svgOrigin: origin }, { rotation: opt.rotate, duration: d, ease: opt.ease.rotate, svgOrigin: origin }, 0)
        .fromTo(el, { scale: 1, svgOrigin: origin }, { scale: opt.zoom, duration: d / 2, ease: opt.ease.zoomIn, svgOrigin: origin }, 0)
        .to(el, { scale: 1, duration: d / 2, ease: opt.ease.zoomOut, svgOrigin: origin }, d / 2);
    }

    function update(t) { tl.totalTime(Math.max(0, t - firstAt)); }

    function reset() {
      if (!tl) return;
      tl.totalTime(0);
      if (originalTransform === null) el.removeAttribute('transform'); else el.setAttribute('transform', originalTransform);
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);

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

/* Primitive: progressFill (new in Quality Control, ADR 0024).
 * A loading bar: the fill grows from the left end of its track and the knob rides with it.
 * Progress p = 0 … 1; p = 1 is the bar as drawn in the design (fill width and knob position are read from it),
 * p = 0 is an empty bar with the knob at the start of the track.
 * Driven by an external clock: update(t) asks opt.progress(t) for p. Geometry is read lazily in prepare().
 * opt: fill ([rect], grows by its width), knob ([rect], moves by a translate), progress (function t → p), max (largest p, default 1; > 1 allows a bounce past the design)
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.primitives = TM.primitives || {};

  TM.primitives.progressFill = function (svg, opt) {
    var fill = opt.fill, knob = opt.knob, w = 0, span = 0, last = -1, knobOrig = null, ready = false;

    function prepare() {
      if (ready) return;
      var x0 = +fill.getAttribute('x'), kx = +knob.getAttribute('x');
      w = +fill.getAttribute('width');
      span = kx - x0;                       // how far the knob travels: from the track start to its place in the design
      knobOrig = knob.getAttribute('transform');
      ready = true;
    }

    function set(p) {
      p = Math.max(0, Math.min(opt.max || 1, p));   // may go a little past 1: the bar's small bounce at the end
      if (Math.abs(p - last) < 1e-5) return;
      last = p;
      fill.setAttribute('width', w * p);
      fill.style.visibility = p < 0.001 ? 'hidden' : '';
      knob.setAttribute('transform', (knobOrig ? knobOrig + ' ' : '') + 'translate(' + ((p - 1) * span) + ' 0)');
    }

    function update(t) { set(opt.progress(t)); }

    function reset() {
      if (!ready) return;
      last = -1;
      fill.setAttribute('width', w); fill.style.visibility = '';
      if (knobOrig === null) knob.removeAttribute('transform'); else knob.setAttribute('transform', knobOrig);
    }

    return { prepare: prepare, update: update, reset: reset };
  };
})(window);

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

  TM.util = TM.util || {};
  TM.util.backFor = backFor;   // also needed by animations that settle with a small bounce (Quality Control loading bar)

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

/* Primitive: skeleton (new in Quality Control, ADR 0024).
 * A waiting plate in the place of an element (the number on the card) with a soft highlight that runs over it.
 * The plate is not in the design: code draws it, only while the animation plays, and removes it on reset (principles §9).
 * Driven by an external clock: update(t, level) — level 0…1 is how visible the plate is (the caller crossfades it with the real element).
 * opt: target (element the plate covers; the plate goes right before it), alpha (plate), shine (highlight), period (s per pass),
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
      opt.target.parentNode.insertBefore(group, opt.target);
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

/* Client Interaction animation — implements animations/client-interaction/motion.yaml (ADR 0019).
 * Scenes: background streams (ambientFlow) + service stream to the hub (routeFlow, a service pulses as its bar leaves)
 * + hub core reaction (pulse with a small bounce). Infinite while visible (ADR 0007);
 * the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0019). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    speed: 60, step: 0.7, round: 3.5, alignArrival: 1,
    nodeScale: 1.08, nodeUp: 0.22, nodeDown: 0.3,
    coreScale: 1.2, coreUp: 0.4, coreHold: 0, coreDown: 0.9, coreOvershoot: 0.3, coreArrival: 0,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('client-interaction', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, util = TM.util, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"coreOvershoot":3}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var hub = role('hub')[0], core = role('core')[0], nodes = role('node'), connections = role('connection'), impulses = role('impulse');
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]:not([data-m])'));
    // the bar copied for the service stream: the longest bar of the design that is not mirrored (head on the right)
    var bar = impulses.filter(function (r) { return !/^matrix\(\s*-/.test(r.getAttribute('transform') || ''); })
      .sort(function (a, b) { return b.getAttribute('width') - a.getAttribute('width'); })[0];

    var ambient = P.ambientFlow(svg, { gsap: gsap, impulses: impulses, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
    var flow = null, nodePulse = null, corePulse = null, t0 = 0, tick = null;

    // radius of the rounded corner of a dashed line that starts sideways at the hub: where it leaves the bus, measured to its vertical run
    function cornerRadius(c, busY) {
      var end = util.pointOn(svg, c, -1), prev = util.pointOn(svg, c, 0), len = c.getTotalLength(), s, p;
      for (s = 0; s <= len; s += 0.25) { p = util.pointOn(svg, c, s); if (Math.abs(p.y - busY) > 0.05) return Math.abs(prev.x - end.x); prev = p; }
      return 10;
    }

    function plan() {
      var hb = util.boxIn(svg, hub), hc = { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2 }, bus = {}, radius = 10;
      // the buses: dashed lines that start at the hub and run sideways (one on each side)
      connections.forEach(function (c) {
        var a = util.pointOn(svg, c, 0), b = util.pointOn(svg, c, 4);
        if (Math.abs(b.x - a.x) > 3) { var side = a.x < hc.x ? 'left' : 'right'; bus[side] = a; radius = cornerRadius(c, a.y); }
      });
      // services in clockwise order from the top left; each one runs along the vertical dashed line that ends under it
      var list = nodes.map(function (n) {
        var nb = util.boxIn(svg, n), c = { x: nb.x + nb.w / 2, y: nb.y + nb.h / 2 }, r = nb.w / 2;
        var ends = [];
        connections.forEach(function (el) { ends.push(util.pointOn(svg, el, 0), util.pointOn(svg, el, -1)); });
        var line = ends.filter(function (p) { return Math.hypot(p.x - c.x, p.y - c.y) < r; })[0] || c;
        return { el: n, c: c, r: r, x: line.x, ang: Math.atan2(c.y - hc.y, c.x - hc.x) };
      }).sort(function (a, b) { return a.ang - b.ang; });
      var routes = list.map(function (n) {
        var pts;
        if (Math.abs(n.c.x - hc.x) < hb.w / 2) pts = [{ x: n.x, y: n.c.y }, { x: n.x, y: n.c.y > hc.y ? hb.y + hb.h : hb.y }];   // straight into the hub
        else {
          var side = n.c.x < hc.x ? 'left' : 'right', by = (bus[side] || hc).y;
          pts = [{ x: n.x, y: n.c.y }, { x: n.x, y: by }, { x: side === 'left' ? hb.x : hb.x + hb.w, y: by }];
        }
        return { points: pts, emerge: n.r, before: n.el, length: util.buildRoute(pts, radius).length };
      });
      // departures one step apart, or (alignArrival) arrivals one step apart; the earliest bar leaves at 0
      var travel = routes.map(function (r) { return (r.length - r.emerge) / T.speed; });
      var at = routes.map(function (r, i) { return T.alignArrival ? i * T.step - travel[i] : i * T.step; });
      var min = Math.min.apply(null, at);
      at = at.map(function (v) { return v - min; });
      return { list: list, routes: routes, at: at, arrive: at.map(function (a, i) { return a + travel[i]; }), radius: radius };
    }

    function prepare() {
      if (flow) return;
      var p = plan();
      flow = P.routeFlow(svg, {
        gsap: gsap, bar: bar, speed: T.speed, cycle: T.round, radius: p.radius,
        routes: p.routes.map(function (r, i) { return { points: r.points, emerge: r.emerge, before: r.before, at: p.at[i] }; }),
      });
      flow.prepare();
      nodePulse = P.pulse(svg, {
        gsap: gsap, targets: p.list.map(function (n) { return n.el; }), events: p.at.map(function (a) { return [a]; }), cycle: T.round,
        scale: T.nodeScale, up: T.nodeUp, down: T.nodeDown, easeUp: ease.enter, easeDown: ease.standard,
      });
      corePulse = P.pulse(svg, {
        gsap: gsap, targets: [core], events: [[p.arrive[T.coreArrival] || p.arrive[0]]], cycle: T.round,   // once per round, when the chosen service's bar arrives
        scale: T.coreScale, up: T.coreUp, hold: T.coreHold, down: T.coreDown, overshoot: T.coreOvershoot, easeDown: ease.standard,
      });
      ambient.prepare(); nodePulse.prepare(); corePulse.prepare();
    }

    function seek(t) { ambient.update(t); flow.update(t); nodePulse.update(t); corePulse.update(t); }

    return {
      start: function () {
        prepare();
        if (tick) gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        t0 = gsap.ticker.time;
        tick = function () { seek(gsap.ticker.time - t0); };
        gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) gsap.ticker.remove(tick);
        tick = null;
        if (!flow) return;
        ambient.reset(); flow.reset(); nodePulse.reset(); corePulse.reset();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);

/* Quality Control animation — implements animations/quality-control/motion.yaml (ADR 0024).
 * Scenes: background streams (ambientFlow) + service icons pulse in turn (pulse) + loading bar and number
 * (progressFill, skeleton) + lens zoom-in with a small bounce (pulse). Infinite while visible (ADR 0007);
 * the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0024). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = {
    step: 0.7, nodeScale: 1.08, nodeUp: 0.22, nodeDown: 0.3,
    round: 7, fillEnd: 0.7, fillPower: 2.2, fillOvershoot: 0.06, numberIn: 0.25, holdEnd: 5, numberOut: 0.4, backEnd: 5.8, rest: 3, riseY: 2,
    lensScale: 1.2, lensUp: 0.25, lensHold: 0, lensDown: 0.6, lensOvershoot: 0.3, lensRoom: 12,
    skeletonAlpha: 0.18, shineAlpha: 0.35, shinePeriod: 1.4,
    ambientSpeed: 36, ambientGapMin: 0.6, ambientGapMax: 1.8,
  };

  TM.register('quality-control', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease, util = TM.util, P = env.primitives;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };

    // a stand may override the tempo of one instance: data-trava-tempo='{"round":9}' (never set on the site)
    var T = {}, over = {}, k;
    try { over = JSON.parse(svg.getAttribute('data-trava-tempo') || '{}'); } catch (e) { over = {}; }
    for (k in TEMPO) T[k] = Object.prototype.hasOwnProperty.call(over, k) ? over[k] : TEMPO[k];

    var nodes = role('node'), fill = role('progress')[0], knob = role('knob')[0], number = role('number')[0], lens = role('lens')[0];
    var impulses = role('impulse');   // the horizontal ones run; the vertical bar under the card (turned by a transform) stays as drawn (ADR 0024)
    var tracks = Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]'));

    var easeIn = gsap.parseEase(ease.enter), easeStd = gsap.parseEase(ease.standard);
    // x^fillPower slows the start; back.out lets the end glide in, overshoot a little (fillOvershoot of the way) and settle back
    var backOut = gsap.parseEase('back.out(' + util.backFor(gsap, T.fillOvershoot) + ')');
    var fillCurve = function (x) { return backOut(Math.pow(x, T.fillPower)); };
    // one round, local time u: the design is the bar held at its place with the number shown (rest … holdEnd)
    var local = function (t) { return (t + T.rest) % T.round; };
    var progress = function (t) {
      var u = local(t);
      if (u < T.fillEnd) return fillCurve(u / T.fillEnd);   // slow start, quick middle, glides in, goes a little past its place and settles back
      if (u < T.holdEnd) return 1;
      if (u < T.backEnd) return 1 - easeStd((u - T.holdEnd) / (T.backEnd - T.holdEnd));
      return 0;
    };
    var shown = function (t) {                        // 0 … 1, how much of the number is shown
      var u = local(t);
      if (u < T.fillEnd) return 0;
      if (u < T.fillEnd + T.numberIn) return easeIn((u - T.fillEnd) / T.numberIn);
      if (u < T.holdEnd) return 1;
      if (u < T.holdEnd + T.numberOut) return 1 - easeStd((u - T.holdEnd) / T.numberOut);
      return 0;
    };

    var ambient = null;
    var bar = P.progressFill(svg, { fill: fill, knob: knob, progress: progress, max: 1 + T.fillOvershoot * 3 });
    var plate = P.skeleton(svg, { target: number, alpha: T.skeletonAlpha, shine: T.shineAlpha, period: T.shinePeriod });
    var nodePulse = null, lensPulse = null, t0 = 0, tick = null, ready = false;

    // The card is drawn with a drop-shadow filter whose region ends right at the lens: a zoomed-in lens would be cut there.
    // While the animation is prepared the region is made a little wider; reset() puts the drawn numbers back.
    var cardFilter = null, filterOrig = null;
    function widenCardFilter(px) {
      var host = lens.parentNode && lens.parentNode.closest ? lens.parentNode.closest('[filter]') : null;
      var m = host && /url\(#([^)]+)\)/.exec(host.getAttribute('filter') || '');
      cardFilter = cardFilter || (m ? svg.querySelector('[id="' + m[1] + '"]') : null);
      if (!cardFilter) return;
      filterOrig = filterOrig || ['x', 'y', 'width', 'height'].map(function (a) { return +cardFilter.getAttribute(a); });
      cardFilter.setAttribute('x', filterOrig[0] - px); cardFilter.setAttribute('y', filterOrig[1] - px);
      cardFilter.setAttribute('width', filterOrig[2] + 2 * px); cardFilter.setAttribute('height', filterOrig[3] + 2 * px);
    }
    function restoreCardFilter() {
      if (!cardFilter || !filterOrig) return;
      ['x', 'y', 'width', 'height'].forEach(function (a, i) { cardFilter.setAttribute(a, filterOrig[i]); });
    }

    function prepare() {
      if (ready) return;
      // icons in clockwise order from the top left: by the angle around the middle of the icons
      var boxes = nodes.map(function (n) { var b = util.boxIn(svg, n); return { el: n, cx: b.x + b.w / 2, cy: b.y + b.h / 2 }; });
      var mx = boxes.reduce(function (s, b) { return s + b.cx; }, 0) / boxes.length, my = boxes.reduce(function (s, b) { return s + b.cy; }, 0) / boxes.length;
      boxes.forEach(function (b) { b.ang = Math.atan2(b.cy - my, b.cx - mx); });
      boxes.sort(function (a, b) { return a.ang - b.ang; });
      nodePulse = P.pulse(svg, {
        gsap: gsap, targets: boxes.map(function (b) { return b.el; }), events: boxes.map(function (b, i) { return [i * T.step]; }), cycle: boxes.length * T.step,
        scale: T.nodeScale, up: T.nodeUp, down: T.nodeDown, easeUp: ease.enter, easeDown: ease.standard,
      });
      // the lens grows when the number appears; the first time that is in the next round, the beginning shows the design
      var first = (T.fillEnd - T.rest + T.round) % T.round;
      lensPulse = P.pulse(svg, {
        gsap: gsap, targets: [lens], events: [[first]], cycle: T.round,
        scale: T.lensScale, up: T.lensUp, hold: T.lensHold, down: T.lensDown, overshoot: T.lensOvershoot, easeDown: ease.standard,
      });
      var bars = impulses.filter(function (r) { var b = util.boxIn(svg, r); return b.w > b.h; });
      ambient = P.ambientFlow(svg, { gsap: gsap, impulses: bars, tracks: tracks, speed: T.ambientSpeed, gapMin: T.ambientGapMin, gapMax: T.ambientGapMax });
      ambient.prepare(); bar.prepare(); plate.prepare(); nodePulse.prepare(); lensPulse.prepare();
      ready = true;
    }

    function seek(t) {
      widenCardFilter(T.lensRoom);   // idempotent; again after every reset
      ambient.update(t); bar.update(t); nodePulse.update(t); lensPulse.update(t);
      var n = shown(t);
      plate.update(t, 1 - n);
      number.style.opacity = n >= 1 ? '' : String(n);
      if (n >= 1) number.removeAttribute('transform'); else number.setAttribute('transform', 'translate(0 ' + ((1 - n) * T.riseY) + ')');
    }

    return {
      start: function () {
        prepare();
        if (tick) gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        t0 = gsap.ticker.time;
        tick = function () { seek(gsap.ticker.time - t0); };
        gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) gsap.ticker.remove(tick);
        tick = null;
        if (!ready) return;
        ambient.reset(); bar.reset(); plate.reset(); nodePulse.reset(); lensPulse.reset();
        number.style.opacity = ''; number.removeAttribute('transform');
        restoreCardFilter();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);

/* Queue Manager animation — implements animations/queue-manager/motion.yaml (approved, task 3.1).
 * Scenes: flow (impulseFlow) → gear-reaction (hubAccent). Infinite while visible (ADR 0007);
 * the runtime calls reset() when the card leaves the screen (interrupt: jump-to-design).
 * Values: tempo from motion.yaml (checked by tools/build-webflow.mjs), eases from tokens.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion;

  // motion.yaml → tempo (ADR 0013). Keep in sync: the build fails if these differ from the spec.
  var TEMPO = { segmentTime: 1.2, impulsesPerSegment: 1, gearDuration: 1.3, gearZoom: 1.2, gearEvery: 3 };

  TM.register('queue-manager', function (svg, env) {
    var gsap = env.gsap, ease = env.tokens.ease;
    var role = function (r) { return Array.prototype.slice.call(svg.querySelectorAll('[data-m="' + r + '"]')); };
    var hub = role('hub')[0], gear = role('gear')[0];

    var flow = env.primitives.impulseFlow(svg, {
      gsap: gsap,
      impulses: role('impulse'),
      // dotted connection lines: the tracks impulses run on (no role in Figma yet, see audit 2.4 notes)
      tracks: Array.prototype.slice.call(svg.querySelectorAll('path[stroke-dasharray]')),
      hub: hub,
      segmentTime: TEMPO.segmentTime,
      perSegment: TEMPO.impulsesPerSegment,
      ease: ease.flow,
    });
    var accent = env.primitives.hubAccent(svg, {
      gsap: gsap, target: gear,
      rotate: 360, zoom: TEMPO.gearZoom, duration: TEMPO.gearDuration, every: TEMPO.gearEvery,
      ease: { rotate: ease.standard, zoomIn: ease.enter, zoomOut: ease.standard },
    });

    var t0 = 0, tick = null;
    function seek(t) { flow.update(t); accent.update(t); }
    function prepare() { flow.prepare(); accent.prepare(flow.arrivalTime()); }

    return {
      start: function () {
        prepare();
        if (tick) gsap.ticker.remove(tick);     // a second start() must not leave the first clock running
        t0 = gsap.ticker.time;
        tick = function () { seek(gsap.ticker.time - t0); };
        gsap.ticker.add(tick);
        seek(0);
      },
      reset: function () {
        if (tick) gsap.ticker.remove(tick);
        tick = null;
        flow.reset(); accent.reset();
      },
      seek: function (t) { prepare(); seek(t); },   // for previews and tests
    };
  });
})(window);
