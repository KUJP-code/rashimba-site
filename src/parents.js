import './main.js';
import './parents.scss';
import { initCarousel } from './carousel.js';

const form = document.querySelector('#parents-notification');
form.addEventListener('submit', (event) => {
  // Native validation runs first. Remove this handler and set the form action
  // when the release notification backend is ready.
  event.preventDefault();
});

initCarousel({
  track: document.querySelector('.parents-shop-track'),
  cardSelector: '.parents-shop-card',
  pagination: document.querySelector('.parents-carousel-dots'),
  previous: document.querySelector('.parents-carousel-prev'),
  next: document.querySelector('.parents-carousel-next'),
});
