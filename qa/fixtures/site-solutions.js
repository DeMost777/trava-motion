// The site's own script for the Solutions block (Webflow embed `facc277d…` on the home page),
// copied as is (whitespace only compacted) to test that Trava Motion does not disturb it.
document.addEventListener('DOMContentLoaded', function () {
  const navItems = Array.from(document.querySelectorAll('[data-solution-nav]'));
  const states = Array.from(document.querySelectorAll('[data-solution-state]'));
  const steps = Array.from(document.querySelectorAll('[data-solution-step]'));
  const sticky = document.querySelector('.solutions-sticky');
  const track = document.querySelector('.solutions-scroll-track');
  let isProgrammaticScroll = false; let scrollStopTimer = null; let scrollSequence = 0; let ticking = false;

  function activateSolution(selectedSolution) {
    states.forEach(function (state) { const stateName = state.getAttribute('data-solution-state'); state.classList.toggle('is-active', stateName === selectedSolution); });
    navItems.forEach(function (nav) { const navName = nav.getAttribute('data-solution-nav'); nav.classList.toggle('is-active', navName === selectedSolution); });
  }
  function getTriggerY() {
    if (!sticky) return window.innerHeight / 2;
    const stickyStyle = window.getComputedStyle(sticky); const stickyTop = parseFloat(stickyStyle.top) || 0;
    return (stickyTop + sticky.offsetHeight / 2);
  }
  function updateSolutionFromScroll() {
    ticking = false;
    if (isProgrammaticScroll) return;
    if (!sticky || !track || !steps.length) return;
    const stickyStyle = window.getComputedStyle(sticky); const stickyTop = parseFloat(stickyStyle.top) || 0;
    const stickyRect = sticky.getBoundingClientRect(); const trackRect = track.getBoundingClientRect();
    if (stickyRect.top > stickyTop + 2) { activateSolution('queue-manager'); return; }
    const stickyEnd = stickyTop + sticky.offsetHeight;
    if (trackRect.bottom <= stickyEnd + 2) { return; }
    const triggerY = getTriggerY();
    let activeStep = null; let closestDistance = Infinity;
    steps.forEach(function (step) {
      const rect = step.getBoundingClientRect(); const stepCenter = rect.top + rect.height / 2; const distance = Math.abs(stepCenter - triggerY);
      if (distance < closestDistance) { closestDistance = distance; activeStep = step; }
    });
    if (!activeStep) return;
    const selectedSolution = activeStep.getAttribute('data-solution-step');
    activateSolution(selectedSolution);
  }
  function finishProgrammaticScroll(sequence) {
    if (sequence !== scrollSequence) return;
    clearTimeout(scrollStopTimer); isProgrammaticScroll = false;
    requestAnimationFrame(updateSolutionFromScroll);
  }
  function scheduleScrollEnd(sequence) {
    clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(function () { finishProgrammaticScroll(sequence); }, 180);
  }
  navItems.forEach(function (nav) {
    nav.addEventListener('click', function (event) {
      event.preventDefault();
      const selectedSolution = nav.getAttribute('data-solution-nav');
      const targetStep = steps.find(function (step) { return (step.getAttribute('data-solution-step') === selectedSolution); });
      if (!targetStep) { activateSolution(selectedSolution); return; }
      scrollSequence += 1; const currentSequence = scrollSequence;
      isProgrammaticScroll = true;
      activateSolution(selectedSolution);
      const triggerY = getTriggerY(); const stepRect = targetStep.getBoundingClientRect();
      const stepCenter = stepRect.top + stepRect.height / 2; const delta = stepCenter - triggerY;
      const targetY = window.scrollY + delta; const distance = Math.abs(delta);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: targetY, behavior: reducedMotion ? 'auto' : 'smooth' });
      if (reducedMotion || distance < 4) { finishProgrammaticScroll(currentSequence); }
      else { setTimeout(function () { finishProgrammaticScroll(currentSequence); }, 2500); }
    });
  });
  window.addEventListener('scroll', function () {
    if (isProgrammaticScroll) { scheduleScrollEnd(scrollSequence); return; }
    if (ticking) return;
    ticking = true; requestAnimationFrame(updateSolutionFromScroll);
  }, { passive: true });
  function cancelProgrammaticScroll() {
    if (!isProgrammaticScroll) return;
    scrollSequence += 1; clearTimeout(scrollStopTimer); isProgrammaticScroll = false;
    requestAnimationFrame(updateSolutionFromScroll);
  }
  window.addEventListener('wheel', cancelProgrammaticScroll, { passive: true });
  window.addEventListener('touchstart', cancelProgrammaticScroll, { passive: true });
  window.addEventListener('resize', updateSolutionFromScroll);
  activateSolution('queue-manager');
  updateSolutionFromScroll();
});
