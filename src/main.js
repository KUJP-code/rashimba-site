import './styles.js';
import { siteLinks } from './config.js';
import { initCarousel } from './carousel.js';
import { initInquiryForm } from './inquiry-form.js';
import { inquiryConfig } from './inquiry-config.js';

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');
const setMenuOpen = (open) => {
  menu.hidden = !open;
  document.body.classList.toggle('menu-is-open', open);
  document.querySelector('main').inert = open;
  document.querySelector('.site-footer').inert = open;
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
  if (event.key === 'Tab' && !menu.hidden) {
    const items = [...document.querySelectorAll('.site-header a, .site-header button')]
      .filter(item => item.getClientRects().length);
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header') && !menu.hidden) setMenuOpen(false);
});
const desktop = window.matchMedia('(min-width: 1100px)');
desktop.addEventListener('change', () => setMenuOpen(false));

document.querySelectorAll('[data-enquiry]').forEach((link) => {
  if (siteLinks.sponsorEnquiryUrl) link.href = siteLinks.sponsorEnquiryUrl;
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

initInquiryForm(document.querySelector('#sponsor-enquiry'), {
  ...inquiryConfig,
  endpoint: '/api/rashimba/sponsor_inquiries',
  action: 'rashimba_sponsor',
});

initCarousel({
  track: document.querySelector('.carousel-track'),
  cardSelector: '.mission-card',
  pagination: document.querySelector('.carousel-dots'),
  previous: document.querySelector('.carousel-prev'),
  next: document.querySelector('.carousel-next'),
});
