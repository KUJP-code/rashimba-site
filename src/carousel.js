// Shared pagination and scrolling behavior for both landing pages.
export function initCarousel({ track, cardSelector, pagination, previous, next }) {
  if (!track) return;
  const cards = [...track.querySelectorAll(cardSelector)];
  if (!cards.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let pending = null;
  let settleTimer;
  let lastWidth;
  let lastCardWidth;

  const geometryChanged = () => track.clientWidth !== lastWidth || cards[0].offsetWidth !== lastCardWidth;

  const dots = cards.map((card, index) => {
    const title = card.querySelector('h4').textContent.trim();
    card.setAttribute('aria-label', `${index + 1} / ${cards.length} ${title}`);
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `${title}を表示`);
    dot.setAttribute('aria-controls', track.id);
    dot.addEventListener('click', () => show(index));
    return dot;
  });
  pagination.replaceChildren(...dots);
  pagination.setAttribute('role', 'group');

  function update(index) {
    selected = index;
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === selected)));
  }
  function position(index) {
    return cards[index].offsetLeft - cards[0].offsetLeft;
  }
  function syncFromScroll() {
    if (geometryChanged()) return resize();
    const nearest = cards.reduce((best, _, index) =>
      Math.abs(track.scrollLeft - position(index)) < Math.abs(track.scrollLeft - position(best)) ? index : best, 0);
    update(nearest);
  }
  function settle() {
    clearTimeout(settleTimer);
    pending = null;
    syncFromScroll();
  }
  function show(index) {
    update((index + cards.length) % cards.length);
    pending = selected;
    track.scrollTo({ left: position(selected), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    if (Math.abs(track.scrollLeft - position(selected)) < 1) settle();
  }

  previous.setAttribute('aria-controls', track.id);
  next.setAttribute('aria-controls', track.id);
  previous.addEventListener('click', () => show(selected - 1));
  next.addEventListener('click', () => show(selected + 1));
  track.addEventListener('keydown', (event) => {
    const index = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: cards.length - 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    show(index);
  });
  track.addEventListener('scroll', () => {
    if (geometryChanged()) return resize();
    if (pending === null) syncFromScroll();
    else if (Math.abs(track.scrollLeft - position(pending)) < 1) settle();
    clearTimeout(settleTimer);
    // Also covers browsers that do not dispatch scrollend.
    settleTimer = setTimeout(settle, 150);
  }, { passive: true });
  track.addEventListener('scrollend', settle);
  const interrupt = () => {
    pending = null;
    clearTimeout(settleTimer);
    track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    syncFromScroll();
  };
  track.addEventListener('pointerdown', interrupt, { passive: true });
  track.addEventListener('wheel', interrupt, { passive: true });

  function resize() {
    const width = track.clientWidth;
    const cardWidth = cards[0].offsetWidth;
    if (width === lastWidth && cardWidth === lastCardWidth) return;
    lastWidth = width;
    lastCardWidth = cardWidth;
    pending = null;
    clearTimeout(settleTimer);
    track.scrollTo({ left: position(selected), behavior: 'instant' });
    update(selected);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(track);
  observer.observe(cards[0]);
  resize();
}
