const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForTimeout(5000);

    const html = await page.content();
    
    // Try multiple patterns
    let min = null;
    let max = null;

    // Pattern 1: JSON script tag
    const jsonMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonMatch) {
      for (const script of jsonMatch) {
        const inner = script.replace(/<[^>]*>/g, "");
        try {
          const data = JSON.parse(inner);
          if (data?.offers?.priceRanges) {
            min = data.offers.priceRanges[0].min;
            max = data.offers.priceRanges[0].max;
            break;
          }
        } catch {}
      }
    }

    // Pattern 2: priceRanges in any JSON
    if (!min) {
      const priceMatch = html.match(/"priceRanges":\s*\[[\s\S]*?\]/);
      if (priceMatch) {
        const ranges = JSON.parse(`{${priceMatch[0]}}`).priceRanges;
        if (ranges?.[0]) {
          min = ranges[0].min;
          max = ranges[0].max;
        }
      }
    }

    // Pattern 3: min/max in any script
    if (!min) {
      const minMatch = html.match(/"min":(\d+\.?\d*)/);
      const maxMatch = html.match(/"max":(\d+\.?\d*)/);
      if (minMatch) {
        min = parseFloat(minMatch[1]);
        max = maxMatch ? parseFloat(maxMatch[1]) : min;
      }
    }

    if (min) {
      res.json({ min, max: max || min });
    } else {
      res.json({ error: "Price not found" });
    }
  } catch (e) {
    res.status(500).json({ error: "Scrape failed" });
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