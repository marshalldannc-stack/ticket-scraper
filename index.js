const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 15000
    });
    
    const html = response.data;
    let min = null;
    let max = null;

    // Look for priceRanges in script tags
    const scriptMatch = html.match(/"priceRanges":\[[\s\S]*?\]/);
    if (scriptMatch) {
      try {
        const json = JSON.parse(`{${scriptMatch[0]}}`);
        if (json.priceRanges?.[0]) {
          min = json.priceRanges[0].min;
          max = json.priceRanges[0].max;
        }
      } catch {}
    }

    // Try min/max in any context
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
  }
});

app.get("/", (req, res) => {
  res.send("Ticket Scraper API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});