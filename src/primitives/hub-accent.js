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
