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
