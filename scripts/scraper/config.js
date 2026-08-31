const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  ROOT,
  DATA_DIR: path.join(ROOT, 'data', 'scraped'),
  STORES_DIR: path.join(ROOT, 'data', 'scraped', 'stores'),
  INDEX_FILE: path.join(ROOT, 'data', 'scraped', 'restaurants-index.json'),
  ERRORS_FILE: path.join(ROOT, 'data', 'scraped', 'errors.json'),
  IMAGES_ROOT: path.join(ROOT, 'public', 'restaurants'),

  BASE_URL: 'https://glovoapp.com',
  COUNTRY: 'ma',
  DEFAULT_CITY: 'oujda',

  NAV_TIMEOUT: 60000,
  CONSENT_WAIT: 2500,

  SCROLL_STEP: 450,
  SCROLL_DELAY: 350,
  MAX_SCROLL_STEPS: 600,
  STABLE_ROUNDS: 8,
  MENU_SETTLE_MS: 3000,

  PER_STORE_PAUSE_MS: 1200,

  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  VIEWPORT: { width: 1366, height: 900 },
  LOCALE: 'en-US',

  IMAGE_WIDTH: 640,
};

config.listingUrl = (city) =>
  `${config.BASE_URL}/en/${config.COUNTRY}/${city}/categories/food_1`;

module.exports = config;
