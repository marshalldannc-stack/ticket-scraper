const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: "wss://brd-customer-hl_c0589124-zone-scraping_browser1:drnr905774ht@brd.superproxy.io:9222",
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForTimeout(8000);

    const html = await page.content();
    const priceMatches = html.match(/\$[\d,]+/g) || [];
    const prices = priceMatches
      .map(p => parseFloat(p.replace(/[$,]/g, "")))
      .filter(p => p > 10 && p < 100000)
      .sort((a, b) => a - b);

    if (prices.length >= 2) {
      res.json({ min: prices[0], max: prices[prices.length - 1], all: prices.slice(0, 10) });
    } else if (prices.length === 1) {
      res.json({ min: prices[0], max: prices[0], all: prices });
    } else {
      res.json({ error: "Price not found", sample: html.substring(0, 3000) });
    }
  } catch (e) {
    res.status(500).json({ error: "Scrape failed: " + e.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/", (req, res) => {
  res.send("Ticket Scraper API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});