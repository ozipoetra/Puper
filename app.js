import http from 'node:http';
import url from 'node:url';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const OPTIMAL_VIEWPORT = {
  width: 1,
  height: 1,
  deviceScaleFactor: 0,
};

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
];

chromium.setGraphicsMode = false;

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Method not allowed' }));
    }

    const parsedUrl = url.parse(req.url, true);
    const urlToVisit = parsedUrl.query.url;
    const ref = parsedUrl.query.ref || "https://www.google.com";

    if (!urlToVisit) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Missing URL parameter' }));
    }

    let browser;
    try {
      const executablePath = await chromium.executablePath();
      browser = await puppeteerCore.launch({
        executablePath,
        args: BROWSER_ARGS,
        userDataDir: '/tmp/chrome-pupet',
        headless: chromium.headless,
        defaultViewport: OPTIMAL_VIEWPORT,
        ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Referer': ref });
      await page.setRequestInterception(true);

      page.on('request', (req) => {
        const allowedResources = ['document', 'script', 'xhr', 'fetch'];
        allowedResources.includes(req.resourceType()) ? req.continue() : req.abort();
      });

      await page.goto(urlToVisit, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForSelector('div#animeDownloadLink > a', { timeout: 25000 });

      const content = await page.content();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (error) {
      console.error('Error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error generating content' }));
      }
    } finally {
      if (browser) await browser.close();
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Internal server error' }));
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
