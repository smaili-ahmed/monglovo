const { chromium } = require('playwright');
const config = require('./config');

async function launch() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const context = await browser.newContext({
    userAgent: config.USER_AGENT,
    viewport: config.VIEWPORT,
    locale: config.LOCALE,
    timezoneId: 'Europe/Paris',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8' },
  });
  context.setDefaultTimeout(config.NAV_TIMEOUT);
  return { browser, context };
}

async function newPage(context) {
  const page = await context.newPage();
  page.on('pageerror', () => {});
  return page;
}

// Dismiss cookie/consent walls when present (multiple strategies)
async function dismissConsent(page) {
  try {
    await page.evaluate(() => {
      const byText = () => {
        const candidates = [...document.querySelectorAll('button')];
        const btn = candidates.find((b) => {
          const t = (b.textContent || '').trim().toLowerCase();
          return (
            t === 'accept all' ||
            t === 'tout accepter' ||
            t === 'accept' ||
            t === 'accepter' ||
            t.includes('accept all')
          );
        });
        if (btn) btn.click();
      };
      byText();
      document
        .querySelectorAll('[data-testid="usercentrics-root"] [role="button"], #usercentrics-root button')
        .forEach((el) => {
          const t = (el.textContent || '').toLowerCase();
          if (t.includes('accept')) el.click();
        });
    });
    await page.waitForTimeout(config.CONSENT_WAIT);
  } catch {
    /* consent banner optional */
  }
}

async function closeAll({ browser }) {
  if (browser) await browser.close().catch(() => {});
}

module.exports = { launch, newPage, dismissConsent, closeAll };
