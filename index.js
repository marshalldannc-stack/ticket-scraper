const express = require("express");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--single-process"],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    const html = await page.content();
    const minMatch = html.match(/"min":(\d+\.?\d*)/);
    const maxMatch = html.match(/"max":(\d+\.?\d*)/);

    if (minMatch) {
      res.json({ min: parseFloat(minMatch[1]), max: maxMatch ? parseFloat(maxMatch[1]) : parseFloat(minMatch[1]) });
    } else {
      res.json({ error: "Price not found" });
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