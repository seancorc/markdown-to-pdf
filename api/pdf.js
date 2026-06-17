// puppeteer-core and @sparticuz/chromium are ESM-only, so they must be loaded
// with dynamic import() from this CommonJS function.
//
// On Vercel the function runs on AWS Lambda, where we use the bundled
// serverless Chromium. Locally (vercel dev) that Linux binary can't run, so
// fall back to the machine's installed Chrome.
const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// We're running locally (vercel dev / plain node) only when VERCEL_ENV is
// "development" or the VERCEL env is absent. In production/preview on Vercel
// we always use the bundled serverless Chromium.
const isLocalDev =
  process.env.VERCEL_ENV === 'development' || !process.env.VERCEL;

async function launchBrowser() {
  const puppeteer = (await import('puppeteer-core')).default;
  if (isLocalDev) {
    return puppeteer.launch({
      executablePath: LOCAL_CHROME,
      headless: 'shell',
      args: ['--no-sandbox'],
    });
  }
  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const html = req.body && req.body.html;
  if (typeof html !== 'string' || html.length === 0) {
    res.status(400).json({ error: 'Missing "html" in request body' });
    return;
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setContent(html, { waitUntil: 'load' });
    // Wait for Twemoji (and other) images to finish loading before printing.
    await page.evaluate(() =>
      Promise.all(
        [...document.images]
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              })
          )
      )
    );
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(Buffer.from(pdf));
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  } finally {
    if (browser) await browser.close();
  }
};
