const fs = require('fs');
const path = require('path');
const config = require('./config');

function ensureDirs() {
  fs.mkdirSync(config.STORES_DIR, { recursive: true });
  fs.mkdirSync(config.IMAGES_ROOT, { recursive: true });
}

function saveIndex(restaurants, city) {
  ensureDirs();
  const payload = {
    source: config.listingUrl(city),
    city,
    scrapedAt: new Date().toISOString(),
    count: restaurants.length,
    restaurants,
  };
  fs.writeFileSync(config.INDEX_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return config.INDEX_FILE;
}

function loadIndex() {
  if (!fs.existsSync(config.INDEX_FILE)) return null;
  return JSON.parse(fs.readFileSync(config.INDEX_FILE, 'utf8'));
}

function storeFile(slug) {
  return path.join(config.STORES_DIR, `${slug}.json`);
}

function saveStore(slug, data) {
  ensureDirs();
  const file = storeFile(slug);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

function loadStore(slug) {
  const file = storeFile(slug);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function appendError(entry) {
  ensureDirs();
  let errors = [];
  if (fs.existsSync(config.ERRORS_FILE)) {
    try {
      errors = JSON.parse(fs.readFileSync(config.ERRORS_FILE, 'utf8'));
      if (!Array.isArray(errors)) errors = [];
    } catch {
      errors = [];
    }
  }
  errors.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(config.ERRORS_FILE, JSON.stringify(errors, null, 2), 'utf8');
}

module.exports = { ensureDirs, saveIndex, loadIndex, storeFile, saveStore, loadStore, appendError };
