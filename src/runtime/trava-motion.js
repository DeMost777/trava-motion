/* Trava Motion runtime (task 6.1–6.3, short path for Queue Manager).
 * Finds elements with data-trava-animation, turns an <img> of the prepared SVG into inline SVG,
 * and plays the registered animation while the illustration is visible.
 * Animation is an enhancement: no GSAP, reduced motion, a failed fetch or any error leave the
 * illustration exactly as designed (principles §9, ADR 0014).
 * Plain browser script, no modules: tools/build-webflow.mjs concatenates it with primitives and animations.
 */
(function (root) {
  'use strict';
  var TM = root.TravaMotion = root.TravaMotion || {};
  TM.animations = TM.animations || {};
  TM.primitives = TM.primitives || {};
  TM.tokens = TM.tokens || { trigger: { threshold: 0.35, delay: 0 } };
  TM.register = function (name, factory) { TM.animations[name] = factory; };
  TM.controllers = [];

  function warn(msg, err) { if (root.console) root.console.warn('[trava-motion] ' + msg, err || ''); }
  function reducedMotion() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  // <img src="….svg" data-trava-animation> → the same SVG inline, so its layers can move.
  function inlineSvg(el) {
    if (el.tagName.toLowerCase() === 'svg') return Promise.resolve(el);
    var src = el.currentSrc || el.src;
    return fetch(src, { mode: 'cors', credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + src);
      return res.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('not an SVG: ' + src);
      var node = document.importNode(svg, true);
      if (el.getAttribute('class')) node.setAttribute('class', el.getAttribute('class'));
      if (el.getAttribute('style')) node.setAttribute('style', el.getAttribute('style'));
      node.style.width = node.style.width || '100%';
      node.style.height = 'auto';
      node.style.display = node.style.display || 'block';
      node.setAttribute('data-trava-animation', el.getAttribute('data-trava-animation'));
      el.parentNode.replaceChild(node, el);
      return node;
    });
  }

  function mount(el) {
    var name = el.getAttribute('data-trava-animation');
    var factory = TM.animations[name];
    if (!factory) return warn('no animation registered for "' + name + '"');
    if (!root.gsap) return warn('GSAP is not loaded; illustration stays static');
    if (reducedMotion()) return; // static design, as approved
    var threshold = TM.tokens.trigger.threshold, delay = TM.tokens.trigger.delay || 0;

    inlineSvg(el).then(function (svg) {
      var ctrl = factory(svg, { gsap: root.gsap, tokens: TM.tokens, primitives: TM.primitives });
      var running = false, timer = null;
      function safe(fn) { try { fn(); } catch (e) { warn('animation error, back to design', e); try { ctrl.reset(); } catch (_) { /* ignore */ } running = false; } }
      TM.controllers.push({ name: name, svg: svg, controller: ctrl });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
          if (visible && !running) {
            running = true;
            timer = root.setTimeout(function () { safe(function () { ctrl.start(); }); }, delay);
          } else if (!visible && running) {
            root.clearTimeout(timer);
            safe(function () { ctrl.reset(); }); // interrupt: jump to design; replays on next activation
            running = false;
          }
        });
      }, { threshold: [0, threshold] });
      io.observe(svg);
    }).catch(function (e) { warn('could not inline "' + name + '", illustration stays static', e); });
  }

  TM.mountAll = function (scope) {
    var list = (scope || document).querySelectorAll('[data-trava-animation]');
    for (var i = 0; i < list.length; i++) mount(list[i]);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { TM.mountAll(); });
  else root.setTimeout(function () { TM.mountAll(); }, 0);
})(window);
