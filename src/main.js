import '@fontsource-variable/noto-sans-jp';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import './styles.scss';
import { siteLinks } from './config.js';

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');
const setMenuOpen = (open) => {
  menu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
};
menuToggle.addEventListener('click', () => setMenuOpen(menu.hidden));
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header') && !menu.hidden) setMenuOpen(false);
});
const desktop = window.matchMedia('(min-width: 1100px)');
desktop.addEventListener('change', () => setMenuOpen(false));

document.querySelectorAll('[data-enquiry]').forEach((link) => {
  if (siteLinks.sponsorEnquiryUrl) link.href = siteLinks.sponsorEnquiryUrl;
  else link.addEventListener('click', () => {
    document.querySelector('.enquiry-status').hidden = false;
  });
});
const notice = document.querySelector('.notice-dialog');
document.querySelectorAll('[data-destination]').forEach((link) => {
  const url = siteLinks[link.dataset.destination];
  if (url) link.href = url;
  else link.addEventListener('click', (event) => {
    event.preventDefault();
    notice.showModal();
  });
});
notice.addEventListener('click', (event) => {
  if (event.target === notice) {
    const bounds = notice.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) notice.close();
  }
});

const track = document.querySelector('.carousel-track');
const cards = [...track.querySelectorAll('.mission-card')];
const dots = [...document.querySelectorAll('.carousel-dots button')];
let slide = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function slidePosition(index) {
  const spacing = cards[1].offsetLeft - cards[0].offsetLeft;
  if (window.innerWidth <= 767) return index * spacing;
  const max = track.scrollWidth - track.clientWidth;
  // The desktop draft centers the three-card strip and clips its outer edges.
  return [max / 2, max, 0][index];
}
function showSlide(index) {
  slide = (index + cards.length) % cards.length;
  const target = slidePosition(slide);
  track.scrollTo({ left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  document.querySelector('.carousel-dots').classList.toggle('has-moved', slide !== 0);
  dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === slide)));
}
track.scrollLeft = slidePosition(0);
window.addEventListener('resize', () => { track.scrollLeft = slidePosition(slide); });
document.querySelector('.carousel-prev').addEventListener('click', () => showSlide(slide - 1));
document.querySelector('.carousel-next').addEventListener('click', () => showSlide(slide + 1));
dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i % cards.length)));
track.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showSlide(slide + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
track.addEventListener('scroll', () => {
  if (window.innerWidth > 767) return;
  const spacing = cards[1].offsetLeft - cards[0].offsetLeft;
  slide = Math.min(cards.length - 1, Math.round(track.scrollLeft / spacing));
  document.querySelector('.carousel-dots').classList.toggle('has-moved', slide !== 0);
  dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === slide)));
}, { passive: true });
