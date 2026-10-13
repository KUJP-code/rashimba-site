import './main.js';
import './parents.scss';
import { initCarousel } from './carousel.js';
import { initInquiryForm } from './inquiry-form.js';
import { inquiryConfig } from './inquiry-config.js';

initInquiryForm(document.querySelector('#parents-notification'), {
  ...inquiryConfig,
  endpoint: '/api/rashimba/release_notifications',
  action: 'rashimba_release_notification',
});

initCarousel({
  track: document.querySelector('.parents-shop-track'),
  cardSelector: '.parents-shop-card',
  pagination: document.querySelector('.parents-carousel-dots'),
  previous: document.querySelector('.parents-carousel-prev'),
  next: document.querySelector('.parents-carousel-next'),
});
