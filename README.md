# 🔧 Self-Healing Web Scraper

A web scraper that automatically detects broken CSS selectors and uses AI to repair them — without human intervention. Built with [Crawlee for Python](https://crawlee.dev/python/docs/quick-start), [Parsel](https://parsel.readthedocs.io/), and [OpenRouter](https://openrouter.ai/).

> **📖 Full article:** Read the full tutorial on the Apify/Crawlee Blog *(link coming soon!)*

## How it works

```
Scraper starts
  → Load selector from selectors.json
  → Fetch page HTML
  → Try extraction with current selector
  → Results found? → Save to articles.json → Done ✅
  → No results?
      → Send HTML to LLM
      → LLM returns new CSS selector
      → Update selectors.json
      → Re-extract with new selector
      → Save results → Done ✅
```

## Quick start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set your OpenRouter API key

```bash
export OPENROUTER_API_KEY="your-key-here"
```

You can grab a free API key from [OpenRouter](https://openrouter.ai/). The model used (`stepfun/step-3.5-flash:free`) is completely free.

### 3. Start the test site

```bash
cd scripts/test-site
npm install
npm run dev
# Runs on http://localhost:3001
```

### 4. Run the basic scraper

```bash
python scraper.py
```

### 5. Run the self-healing scraper

```bash
python self_healing_scraper.py
```

## Testing the self-healing

1. Start the test site (titles render as `<h2>`)
2. Run the scraper — it works fine
3. Go to `http://localhost:3001/settings` and switch titles to `<h3>`
4. Run the scraper again — the AI detects the breakage, finds the new selector, updates `selectors.json`, and scrapes successfully

## Project structure

```
├── scraper.py                 # Basic scraper (no self-healing)
├── self_healing_scraper.py    # Full self-healing scraper
├── selectors.json             # CSS selector config (read/written by scraper)
├── articles.json              # Scraped output
├── requirements.txt           # Python dependencies
└── scripts/
    └── test-site/             # Next.js test site with breakable HTML
        ├── app/
        │   ├── page.tsx       # Article listing page
        │   ├── settings/      # Settings page to switch h2/h3
        │   └── article/       # Individual article pages
        └── data/
            ├── articles.ts    # Article data
            └── settingsStore.ts  # Tag selector persistence
```

## Stack

- **[Crawlee for Python](https://crawlee.dev/python/docs/quick-start)** — ParselCrawler for scraping and DOM parsing
- **[OpenRouter](https://openrouter.ai/)** — Free LLM API for selector repair
- **[Rich](https://rich.readthedocs.io/)** — Colored console output
- **Next.js** — Test site with switchable HTML structure

## License

MIT
