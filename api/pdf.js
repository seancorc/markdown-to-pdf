const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// On Vercel the function runs on AWS Lambda, where we use the bundled
// serverless Chromium. Locally (vercel dev) that Linux binary can't run, so
// fall back to the machine's installed Chrome.
const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function launchBrowser() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }
  return puppeteer.launch({
    executablePath: LOCAL_CHROME,
    headless: 'shell',
    args: ['--no-sandbox'],
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
