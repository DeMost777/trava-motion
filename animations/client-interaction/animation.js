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
    coreScale: 1.2, coreUp: 0.25, coreHold: 0, coreDown: 0.4, coreOvershoot: 0.3,
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
        gsap: gsap, targets: [core], events: [p.arrive], cycle: T.round,
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
