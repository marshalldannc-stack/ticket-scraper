const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 3000;

async function tryScrape(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    let browser;
    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: "wss://brd-customer-hl_c0589124-zone-scraping_browser1:drnr905774ht@brd.superproxy.io:9222",
      });
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(8000);

      const html = await page.content();
      
      // Check if blocked
      if (html.includes("Let's Get Your Identity Verified") || html.includes("browserCheck")) {
        await browser.close();
        continue; // Try again with new IP
      }

      const priceMatches = html.match(/\$[\d,]+/g) || [];
      const prices = priceMatches
        .map(p => parseFloat(p.replace(/[$,]/g, "")))
        .filter(p => p > 10 && p < 100000)
        .sort((a, b) => a - b);

      await browser.close();
      
      if (prices.length >= 2) {
        return { min: prices[0], max: prices[prices.length - 1] };
      } else if (prices.length === 1) {
        return { min: prices[0], max: prices[0] };
      }
    } catch (e) {
      if (browser) await browser.close();
    }
  }
  return null;
}

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  const result = await tryScrape(url, 4);
  if (result) {
    res.json(result);
  } else {
    res.json({ error: "Price not found" });
  }
});

app.get("/", (req, res) => {
  res.send("Ticket Scraper API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});