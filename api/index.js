import { Hono } from 'hono';
//import { cache } from 'hono/cache'
//import { cors } from 'hono/cors'
//import { etag } from 'hono/etag'
import { serve } from '@hono/node-server';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const app = new Hono();

const OPTIMAL_VIEWPORT = { width: 1, height: 1, deviceScaleFactor: 0 }; // Adjusted device scale factor
const BROWSER_ARGS = [
  ...chromium.args,
  '--disable-gpu',
  '--no-zygote',
  '--single-process',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-fonts',
  '--disable-images',
  '--disk-cache-size=104857600',
  '--disable-session-crashed-bubble',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--noerrdialogs'
];

let browserInstance;
async function getBrowserInstance() {
  if (!browserInstance) {
    const executablePath = await chromium.executablePath();
    browserInstance = await puppeteerCore.launch({
      executablePath,
      args: BROWSER_ARGS,
      headless: chromium.headless,
      defaultViewport: OPTIMAL_VIEWPORT,
      ignoreHTTPSErrors: true,
    });
  }
  return browserInstance;
}

app.get('*', async (c) => {
  try {
    const { url: urlToVisit, ref = "https://www.google.com" } = c.req.query();
    if (!urlToVisit) {
      c.header('Cache-Control', 'no-store');
      return c.json({ message: 'Missing URL parameter' }, 400);
    }

    let page;
    try {
      const browser = await getBrowserInstance();
      page = await browser.newPage();
      //await page.setExtraHTTPHeaders({ 'Referer': ref });
      await page.setRequestInterception(true);

      page.on('request', (req) => {
        const allowedResources = ['document', 'script', 'xhr', 'fetch'];
        allowedResources.includes(req.resourceType()) ? req.continue() : req.abort();
      });

      await page.goto(urlToVisit, { waitUntil: 'networkidle0', timeout: 25000 });
      // await page.waitForSelector('div#animeDownloadLink > a', { timeout: 25000 });
      const content = await page.content();

      // optional: this to reduce request to the origin which will save your compute times. remove this if you want get real time data
      c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=30');
      return c.html(content);
    } catch (error) {
      console.error('Error:', error);
      c.header('Cache-Control', 'no-store');
      return c.json({ message: 'Error generating content' }, 500);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.error('Error closing page:', error);
        }
      }
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    c.header('Cache-Control', 'no-store');
    return c.json({ message: 'Internal server error' }, 500);
  }
});

app.all('*', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json({ message: 'Method not allowed' }, 405);
});

const PORT = process.env.PORT || 3000;
serve({
  fetch: app.fetch,
  port: PORT
}, () => {
  console.log(`Server running on port ${PORT}`);
});
