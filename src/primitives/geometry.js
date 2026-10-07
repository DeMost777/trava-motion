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
