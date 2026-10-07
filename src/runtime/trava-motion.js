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
