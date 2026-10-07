/* Site settings for trava.co (Webflow). The runtime itself knows nothing about the site's markup.
 * Solutions block: desktop shows all cards stacked and toggles `is-active` on [data-solution-state]
 * (the site's own script does this; Trava Motion only reads the class). Tablet/mobile cards have no such
 * element, so the gate does not apply there.
 * releaseDelay: the switched-off card fades out for 300 ms (site CSS); reset to the design waits for it.
 */
window.TravaMotion = window.TravaMotion || {};
window.TravaMotion.config = window.TravaMotion.config || {};
window.TravaMotion.config.gate = { selector: '[data-solution-state]', activeClass: 'is-active', releaseDelay: 350 };
