Self-Healing Web Scrapers: How I Used AI to Automatically Fix Broken CSS Selectors with Crawlee

By [Your Name]
Published March 2026

[IMAGE_PLACEHOLDER_HERO]

Note: One of our community members wrote this guide as a contribution to the Crawlee Blog. If you'd like to contribute articles like these, please reach out to us on Apify's Discord channel.

How I built a scraper that detects broken selectors, sends the DOM to an LLM, and patches itself — without human intervention.

Key steps we'll cover:

1. The original scraper
2. Preparing the test environment
3. The JSON bridge
4. The self-healing scraper
5. Breaking and healing — the real test
6. Limitations & trade-offs
7. Scraping Cloudflare-protected sites
8. Deploying as an Apify Actor

---

What you'll need to get started

* Python 3.10 or higher
* Crawlee for Python v0.6.0 or higher
* An OpenRouter API key (free tier works)
* Node.js 18+ (for the test site)
* Familiarity with CSS selectors and basic web scraping concepts

---

My scraper worked. Then it didn't.

I had a Crawlee for Python script pulling article titles from a blog. Simple job — grab every h2, dump them to JSON, done. It ran perfectly for days. Then one morning I checked the output file: zero articles. No errors in the logs either. The scraper ran, finished, reported success, and collected absolutely nothing.

The site had changed its HTML. Titles that were in <h2> tags were now wrapped in <h3>. My CSS selector h2::text matched nothing. The scraper didn't crash — it just quietly returned an empty list.

This is the silent killer of every scraping pipeline. Not the errors. Not the blocks. The zero-result runs that look successful.

I spent 20 minutes inspecting the DOM, finding the new tag, updating my selector, and re-running the script. Not a big deal for one scraper on one site. But I was building a content monitoring pipeline — tracking article listings across multiple blogs to feed a competitive intelligence dashboard. When you're running scrapers against 10+ sites, each with their own layout preferences and redesign schedules, that manual debugging doesn't scale. You're always one missed change away from collecting garbage data (or no data at all) for days before anyone notices.

This is a real problem in any data collection workflow: lead enrichment pipelines that scrape company directories, price monitoring systems that pull competitor listings, ML training pipelines that need fresh content daily. The moment a target site updates its layout, your entire downstream pipeline goes stale — and the scraper won't tell you.

So I asked myself: what if the scraper could fix itself?

---

The Idea

The concept is straightforward. When a CSS selector returns zero results, instead of failing silently, the scraper:

1. Captures the full HTML of the page
2. Sends it to an LLM with the instruction: "find the CSS selector for article titles"
3. Gets back a new selector
4. Compares it against what's stored in a config file
5. Updates the config if it changed
6. Re-scrapes with the corrected selector

The whole repair cycle happens in-flight. No human in the loop. The scraper heals itself and keeps running.

I built this in Python using Crawlee and a free LLM endpoint. Here's how.

---

Architecture

Scraper starts
  → Load selector from selectors.json
  → Fetch page HTML
  → Try extraction with current selector
  → Results found? → Save to articles.json → Done 
  → No results?
      → Send HTML to LLM
      → LLM returns new CSS selector
      → Update selectors.json
      → Re-extract with new selector
      → Save results → Done 

Stack:
- Crawlee for Python (ParselCrawler) — scraping and DOM parsing throughout
- OpenRouter API (free tier LLM) — selector repair
- JSON config file — selector persistence

I also built a test website in Next.js specifically to break my scraper on purpose. More on that later.

Note: Before going ahead, if you like this blog, we would be really happy if you gave Crawlee for Python a star on GitHub! It helps us spread the word to fellow scraper developers.

---

Step 1: The Original Scraper

I started with a basic Crawlee ParselCrawler to scrape article titles from a local test site. You can also scaffold a Crawlee project with pipx run crawlee['cli'] create my-scraper — I started from a blank script here to keep things minimal.

import asyncio
import json
import os
import tempfile
from crawlee.crawlers import ParselCrawler, ParselCrawlingContext

async def main() -> None:
    all_articles = []

    # Redirect crawlee storage to a temp directory
    os.environ['CRAWLEE_STORAGE_DIR'] = tempfile.mkdtemp()

    crawler = ParselCrawler(max_requests_per_crawl=10)

    @crawler.router.default_handler
    async def request_handler(context: ParselCrawlingContext) -> None:
        context.log.info(f"Processing {context.request.url} ...")

        # Extract all h2 titles
        raw_titles = context.selector.css("h2::text").getall()

        for title in raw_titles:
            article = {
                "id": len(all_articles) + 1,
                "title": title.strip()
            }
            all_articles.append(article)
            context.log.info(f"Captured: {article['title']}")

    await crawler.run(["http://localhost:3001/"])

    output_data = {"articles": all_articles}

    with open("articles.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSuccessfully scraped {len(all_articles)} articles.")

if __name__ == "__main__":
    asyncio.run(main())

This worked. I ran it against my local test site and got 10 articles back, clean and structured:

{
  "articles": [
    { "id": 1, "title": "How AI is Transforming Modern Businesses" },
    { "id": 2, "title": "Beginner's Guide to Web Scraping in 2026" },
    { "id": 3, "title": "Top 10 Side Hustles You Can Start Today" }
  ]
}

Lesson: Start with the simplest thing that works. A ParselCrawler with a hardcoded CSS selector is about 30 lines of code. That's the baseline you're protecting.

---

Step 2: Preparing the Test Environment

Before writing any self-healing logic, I needed two things: a proper Python environment and a website I could break on command.

Python dependencies

The project uses a few libraries. Here's what I installed:

pip install crawlee openai rich

- crawlee — the scraper framework (ParselCrawler) — handles HTTP fetching, DOM parsing, and request management throughout
- openai — the client library, pointed at OpenRouter's endpoint for the healing calls
- rich — colored console output for visibility into what the scraper is doing

I also set the API key as an environment variable to keep it out of the code:

export OPENROUTER_API_KEY="your-key-here"

You can grab a free API key from OpenRouter — the model I used (stepfun/step-3.5-flash:free) doesn't cost anything.

The test site — breakage on demand

To test self-healing properly, I needed a site that I control and can break instantly. No waiting for a real website to redesign itself. So I built a local blog in Next.js with one specific feature: a settings page that switches the HTML tag used for article titles.

The idea is simple. The site renders 10 article cards. Each card has a title. By default, the title is rendered inside an <h2> tag. But from a settings page at /settings, I can flip a switch that changes every title to an <h3> tag instead.

Here's the server-side logic. A settings.json file stores which tag to use:

// settingsStore.ts
export const getTitleSelector = (): TitleSelector => {
  const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  return data.titleSelector || 'h2';
};

The article page reads from this on every render and uses the tag dynamically:

// page.tsx
const TitleTag = getTitleSelector(); // returns 'h2' or 'h3'
// ...
<TitleTag>{article.title}</TitleTag>

To start the test site:

cd scripts/test-site
npm install
npm run dev
# Runs on http://localhost:3001

[Image 1: Screenshot of the test site's article listing page at localhost:3001, showing 10 articles with their titles rendered in <h2> tags. DevTools is open on the right, showing the HTML source where each title is inside <a href="/article/..."><div>...<h2>Article Title</h2>...</div></a>.]

The settings page is the key piece. It shows two buttons — "Use h2 (Default)" and "Use h3 (New)" — with the current active tag highlighted. One click, and the entire site's HTML structure changes.

[Image 2: Screenshot of the test site's Settings page at localhost:3001/settings, showing two buttons — "Use h2 (Default)" and "Use h3 (New)" — with h2 currently active (highlighted in blue). Below it reads: Current Active Selector: h2.]

When I click "Use h3", every title on the listing page re-renders inside <h3> tags. My original scraper — which has h2::text hardcoded — instantly returns zero results. No crash, no error, just an empty list. That's the exact failure mode I wanted to reproduce and fix.

---

Step 3: The JSON Bridge

Before adding AI, I introduced a simple abstraction: instead of hardcoding the CSS selector in the scraper, I moved it to a JSON config file.

{
  "title": "a[href^='/article/'] h2"
}

This file — selectors.json — becomes the bridge between what the scraper expects and what the AI discovers. The scraper reads from it. The AI writes to it. This separation is important because it means the repair doesn't require touching the scraper code itself.

It also gives you a permanent record. You can look at selectors.json and see exactly what selector is being used right now, and compare it to what was used before. That's useful for debugging, auditing, and understanding how the site has changed over time.

---

Step 4: The Self-Healing Scraper

Here's the full implementation. The key insight is that the healing logic lives inside Crawlee's request handler. When extraction fails, the handler grabs the raw HTML from context.http_response, sends it to the LLM, and retries — all within the same crawl run.

import asyncio
import json
import os
import tempfile
from openai import OpenAI
from crawlee.crawlers import ParselCrawler, ParselCrawlingContext
from rich.console import Console
from rich.panel import Panel

# --- Configuration ---
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
MODEL_ID = "stepfun/step-3.5-flash:free"
TARGET_URL = "http://localhost:3001/"
SELECTORS_FILE = "selectors.json"
OUTPUT_FILE = "articles.json"

console = Console()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

Loading and saving selectors:

def load_selectors():
    if os.path.exists(SELECTORS_FILE):
        with open(SELECTORS_FILE, "r") as f:
            return json.load(f)
    return {"title": "h2"}

def save_selectors(selectors):
    with open(SELECTORS_FILE, "w") as f:
        json.dump(selectors, f, indent=2)

The healing function — this is where it gets interesting:

def heal_selector(html):
    console.print(Panel(
        "[bold yellow]Selector returned 0 results. "
        "Consulting AI for healing...[/bold yellow]",
        border_style="yellow"
    ))

    # Clean and truncate HTML to reduce tokens
    clean_html = ""
    for line in html.splitlines():
        trimmed = line.strip()
        if trimmed:
            clean_html += trimmed + "\n"
    clean_html = clean_html[:15000]

    prompt = f"""
    Analyze the following HTML from a blog/articles page.
    Find the CSS selector that accurately targets
    the 'titles' of the articles.
    Return ONLY a JSON object in this format:
    {{"title": "your_css_selector"}}

    HTML Snippet:
    {clean_html}
    """

    try:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[
                {
                    "role": "system",
                    "content": "You are a web scraping expert. "
                               "You return only valid JSON."
                },
                {"role": "user", "content": prompt}
            ]
        )

        ai_response = response.choices[0].message.content.strip()

        # Handle markdown code fences in response
        if "```json" in ai_response:
            ai_response = ai_response.split("```json")[1].split("```")[0].strip()
        elif "```" in ai_response:
            ai_response = ai_response.split("```")[1].split("```")[0].strip()

        new_selectors = json.loads(ai_response)
        return new_selectors.get("title")
    except Exception as e:
        console.print(f"[bold red]AI Healing failed:[/bold red] {e}")
        return None

A few things worth noting about the prompt design:

- I send the raw HTML, not a screenshot. The LLM needs the actual DOM structure. Screenshots lose the tag names that matter.
- I truncate to 15,000 characters. Article titles are usually in the first third of the page. Sending the full DOM eats tokens for no reason.
- I ask for JSON output only. This makes parsing deterministic. No "Here's the selector:" preamble to strip.
- The system prompt matters. "You are a web scraping expert. You return only valid JSON." — this single line dramatically reduced hallucinated responses.

The main loop — Crawlee handles the fetching, the handler handles the healing:

async def main() -> None:
    console.print(Panel.fit(
        "[bold cyan]🚀 Self-Healing Scraper with Crawlee[/bold cyan]",
        border_style="cyan"
    ))

    all_articles = []
    os.environ['CRAWLEE_STORAGE_DIR'] = tempfile.mkdtemp()

    # 1. Load selector from config
    selectors = load_selectors()
    current_selector = selectors.get("title", "h2")
    console.print(
        f"[*] Current selector: "
        f"[bold green]'{current_selector}'[/bold green]"
    )

    crawler = ParselCrawler(max_requests_per_crawl=10)

    @crawler.router.default_handler
    async def request_handler(
        context: ParselCrawlingContext
    ) -> None:
        nonlocal selectors, current_selector

        context.log.info(
            f"Processing {context.request.url} ..."
        )

        # 2. Try extraction with current selector
        if "::text" not in current_selector:
            raw_titles = context.selector.css(
                f"{current_selector}::text"
            ).getall()
        else:
            raw_titles = context.selector.css(
                current_selector
            ).getall()

        titles = [
            t.strip() for t in raw_titles if t.strip()
        ]

        # 3. If no results, trigger healing
        if not titles:
            console.print(
                "[bold red][!] No titles found. "
                "Triggering healing...[/bold red]"
            )

            # Get raw HTML from Crawlee's HTTP response
            html = context.http_response.read().decode(
                "utf-8"
            )

            new_selector = heal_selector(html)

            if new_selector:
                console.print(
                    f"[*] AI suggested: "
                    f"[bold magenta]'{new_selector}'"
                    f"[/bold magenta]"
                )

                if new_selector != current_selector:
                    console.print(
                        "[green]✓ Selector has changed! "
                        "Updating selectors.json..."
                        "[/green]"
                    )
                    selectors["title"] = new_selector
                    save_selectors(selectors)
                    current_selector = new_selector

                # Re-extract with healed selector
                if "::text" not in new_selector:
                    raw_titles = context.selector.css(
                        f"{new_selector}::text"
                    ).getall()
                else:
                    raw_titles = context.selector.css(
                        new_selector
                    ).getall()

                titles = [
                    t.strip() for t in raw_titles
                    if t.strip()
                ]
            else:
                console.print(
                    "[red]✗ Healing failed.[/red]"
                )
                return

        # 4. Collect results
        for title in titles:
            article = {
                "id": len(all_articles) + 1,
                "title": title
            }
            all_articles.append(article)
            context.log.info(
                f"Captured: {article['title']}"
            )

    # Run the crawler
    await crawler.run([TARGET_URL])

    # 5. Save results
    if all_articles:
        output = {
            "articles": all_articles
        }
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        console.print(Panel(
            f"[bold green]Success![/bold green]\n"
            f"Scraped {len(all_articles)} articles.\n"
            f"Saved to {OUTPUT_FILE}",
            border_style="green"
        ))

The critical line is context.http_response.read().decode("utf-8"). Crawlee already fetched the page — we don't need a second HTTP call. We just grab the raw HTML from the response that Crawlee already has, pass it to the LLM, and retry extraction using the same context.selector Parsel object. Everything stays inside Crawlee's request lifecycle.

[Image 3: Screenshot of the terminal running the self-healing scraper with h2 still working. Console output shows: [*] Current selector: 'a[href^='/article/'] h2' followed by Success! Scraped 10 articles. — green panel, no healing triggered.]

---

The Real Test: Breaking and Healing

Here's the scenario I actually tested:

1. Start the test site with titles in <h2> tags
2. Run the scraper — it works, scrapes 10 articles
3. Switch the test site to <h3> tags (via the settings page)
4. Run the scraper again — selector returns empty
5. AI healing kicks in — analyzes the HTML, finds the new selector
6. selectors.json gets updated — "a[href^='/article/'] h2" → "a[href^='/article/'] h3"
7. Articles are scraped successfully with the corrected selector

[Image 4: Screenshot of the terminal after the title tag was switched to h3. Console output shows: [*] Current selector: 'a[href^='/article/'] h2' → [!] No titles found with current selector. → yellow panel Selector failed. Consulting AI... → [*] AI suggested new selector: 'a[href^='/article/'] h3' → [green]✓ Selector has changed! Updating selectors.json... → green panel Success! Scraped 10 articles.]

[Image 5: Screenshot of the updated selectors.json file in the editor, now showing {"title": "a[href^='/article/'] h3"} — proving the config was automatically patched by the AI.]

The entire healing cycle took about 3 seconds. The LLM call was the bottleneck — the actual extraction takes milliseconds.

I ran this test a dozen times, switching between h2 and h3. The AI got the correct selector on the first try every single time. For this simple case, at least, it's rock solid.

Here's the output after healing — 10 articles scraped successfully with the corrected selector:

{
  "articles": [
    { "id": 1, "title": "How AI is Transforming Modern Businesses" },
    { "id": 2, "title": "Beginner's Guide to Web Scraping in 2026" },
    { "id": 3, "title": "Top 10 Side Hustles You Can Start Today" },
    { "id": 4, "title": "Understanding Cryptocurrency for Beginners" },
    { "id": 5, "title": "Remote Work Tips for Better Productivity" }
  ]
}

Identical to the pre-breakage output. The scraper healed, re-extracted, and produced the same data — no manual intervention required.

Results Summary

Metric | Value
--------------------------------------|--------------------------------------
Healing success rate (tag rename) | 100% across 12 test runs
Average healing latency | ~3 seconds (LLM call + re-extraction)
LLM cost per repair (free tier) | $0.00 (stepfun/step-3.5-flash:free)
Estimated cost with GPT-4o mini | ~$0.002 per repair call
Manual fix time saved per breakage | ~20 minutes of DOM inspection + code edit
Extra HTTP requests per heal | 0 (reuses Crawlee's existing response)

For a pipeline monitoring 10 blogs daily, even one layout change per week means ~17 hours/year of manual debugging eliminated. The LLM cost at scale would be under $1/year.

---

Limitations & Trade-offs

This works. But it's not magic. Here's where it breaks down:

LLM latency. Each healing call takes 2–4 seconds. That's fine for a scraper that runs on a schedule. It's not fine for real-time pipelines or scrapers hitting thousands of pages per minute. You'd want to heal once and cache, not heal on every request.

Token cost. I used a free-tier model (stepfun/step-3.5-flash:free via OpenRouter). For a production system, you'd use something like GPT-4o mini at ~$0.001–0.005 per repair call. Cheap, but it's not zero — and if your scraper panics and keeps healing unnecessarily, those calls add up.

Complex layouts. My test site has clean, semantic HTML. Real-world sites have deeply nested <div> soups, dynamically injected content, shadow DOM, and obfuscated class names. The LLM handles simple structural changes well. It's less reliable when the entire page layout gets redesigned. If you're dealing with fingerprinting-heavy sites, consider using Camoufox — a browser configuration that's more resistant to detection.

JavaScript-heavy SPAs. The ParselCrawler fetches raw HTML — if the titles are rendered client-side by JavaScript, they won't be in the response. The fix is straightforward: swap to Crawlee's PlaywrightCrawler. The self-healing logic works the same way — you'd just pull the rendered DOM from context.page.content() instead of context.http_response. Check the Crawlee guide on scraping dynamic websites for more on this.

False positives. The LLM can return a selector that matches something, but not the right thing. I didn't build a confidence check. In production, you'd want to verify the extracted titles look reasonable — e.g., check the count, check the text length, compare against historical data.

Proxy rotation. If you're running self-healing scrapers at scale, you'll want to add proxy management to avoid IP-based blocks. The healing logic doesn't help if your requests are being blocked before reaching the page. Apify Proxy integrates directly with Crawlee via ProxyConfiguration.

---

Going Further: Scraping Cloudflare-Protected Sites

There's one scenario I haven't addressed yet: what happens when the site itself blocks your HTTP request before you even get to the HTML?

My test site runs on localhost — no anti-bot protection, no challenge pages, no CAPTCHAs. But real-world targets often sit behind Cloudflare, which detects automated traffic and serves interstitial challenge pages instead of the actual content. Your scraper gets back a "Checking your browser" page, not the article listing. At that point, self-healing selectors don't matter because there's no DOM to analyze.

I ran into this exact problem when I tried pointing my scraper at a production blog protected by Cloudflare. The raw HTML came back with a JavaScript challenge, not the article page. Crawlee's ParselCrawler doesn't execute JavaScript, so the challenge never resolved.

The solution I found was the Universal Bypasser Actor on the Apify Store. It uses sophisticated browser profiles and behavioral patterns to get past challenge-response systems and returns clean HTML.

Here's how I integrated it into the self-healing scraper as a fallback fetcher:

from apify_client import ApifyClient

apify_client = ApifyClient(os.environ.get("APIFY_TOKEN"))

async def get_page_html_with_bypass(url):
    """Fallback: use Apify's Universal Bypasser for protected sites."""
    console.print(
        "[yellow]⚡ Cloudflare detected. "
        "Using Universal Bypasser...[/yellow]"
    )

    run_input = { "url": url }

    run = apify_client.actor("macheta/universal-bypasser").call(
        run_input=run_input
    )

    # Get results from the Actor's dataset
    items = list(
        apify_client.dataset(run["defaultDatasetId"]).iterate_items()
    )

    if items and items[0].get("status") == "success":
        console.print("[green]✓ Bypass successful. Got clean HTML.[/green]")
        return items[0]["content"]

    console.print("[red]✗ Bypass failed.[/red]")
    return None

The fetch logic now tries a normal request first, and falls back to the Bypasser if it detects a Cloudflare challenge:

async def get_page_html(url):
    """Fetch HTML, with Cloudflare bypass fallback."""
    try:
        response = requests.get(url, timeout=15)
        html = response.text

        # Detect Cloudflare challenge pages
        if "cf-browser-verification" in html or "Just a moment" in html:
            return await get_page_html_with_bypass(url)

        return html
    except Exception as e:
        console.print(f"[red]Fetch failed: {e}[/red]")
        return await get_page_html_with_bypass(url)

The Actor returns structured JSON that includes the clean HTML, session cookies, and the user agent used — everything you need to continue scraping without getting blocked again:

{
  "url": "https://target-blog.com/articles",
  "status": "success",
  "content": "<html>...actual page content...</html>",
  "cookies": { "cf_clearance": "..." },
  "user_agent": "Mozilla/5.0 ..."
}

This makes the self-healing scraper robust against two different failure modes: broken selectors (fixed by the AI) and blocked requests (fixed by the Bypasser). The scraper doesn't care why it's failing — it just tries the next recovery strategy.

[Image 6: Screenshot of the terminal showing the Cloudflare bypass in action. Console output shows: [yellow]⚡ Cloudflare detected. Using Universal Bypasser...[/yellow] followed by [green]✓ Bypass successful. Got clean HTML.[/green] and then the normal scraping flow continues.]

---

Deploying as an Apify Actor

The natural next step is running this in the cloud. The Apify platform lets you package any Crawlee scraper as an Actor — a serverless microapp with configurable inputs, built-in storage, and scheduling.

For the self-healing scraper, the Actor input schema would look something like this:

{
  "title": "Self-Healing Scraper",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "targetUrl": {
      "title": "Target URL",
      "type": "string",
      "description": "The URL of the page to scrape.",
      "editor": "textfield",
      "prefill": "https://example.com/articles"
    },
    "selectorIntent": {
      "title": "What to extract",
      "type": "string",
      "description": "Describe what the selector should target (e.g., 'article titles').",
      "editor": "textfield",
      "prefill": "article titles"
    },
    "proxySettings": {
      "title": "Proxy configuration",
      "type": "object",
      "description": "Select proxies to be used.",
      "prefill": { "useApifyProxy": true },
      "editor": "proxy"
    }
  },
  "required": ["targetUrl"]
}

With this deployed, you'd schedule the Actor to run hourly or daily. Every run checks whether the selectors still work. If they break, the Actor heals them and pushes results to the Dataset. You can set up integrations to pipe the data to Google Sheets, Slack, or a webhook — so you get notified when a repair happens.

To deploy, you'd use the Apify CLI:

apify login   # authenticate with your API token
apify push     # deploy to the platform

---

Lessons Learned

Building this taught me a few things I didn't expect:

1. Validate before you trust the AI. The LLM can return a selector that matches something — but not the right thing. In production, always compare the healed output against the last known good result. If the count or content structure looks wildly different, flag it for review instead of auto-patching. Blind trust in AI repairs is how you get corrupted datasets.

2. The DOM tells you more than the selector. I learned to cache HTML snapshots alongside the selector in selectors.json. If the HTML hasn't changed but extraction fails, the problem isn't a selector change — it's something else entirely (rate limiting, network error, JS rendering issue). This saved me hours of debugging false healing triggers.

3. Keep the healing logic modular. My first version had the AI call buried inside the request handler. Extracting it into a standalone utility that accepts a ParselCrawlingContext and returns corrected selectors made it reusable across every scraper in my pipeline. If you're building this for a team, make the healing function a drop-in module.

4. One LLM isn't enough for production. Free-tier models work for prototyping, but in a production data pipeline, you need fallback models. If one model returns garbage, try another. The OpenRouter API makes this trivial — just swap the model ID and re-send the same prompt.

5. Log everything. Every healing attempt should be logged: which selector failed, what the AI suggested, whether it actually worked, and how many items were extracted before vs. after. This audit trail is how you build confidence in the system over time. Use Crawlee's built-in error handling patterns to structure this.

---

The Takeaway

The dirty secret of web scraping is that the scraping itself isn't the hard part. The hard part is maintenance. Selectors rot. Layouts change. What worked last Tuesday returns nothing on Wednesday.

What I built here isn't a replacement for good monitoring — you should still have alerts when your scrapers return empty datasets. But it's a repair layer that sits between "breakage detected" and "human fixes it manually." For simple structural changes — a tag renamed, a class updated, a wrapper added — the LLM nails it. And those are exactly the kind of changes that break scrapers most often.

The real insight isn't "AI can find CSS selectors." It's that AI works as a repair layer on top of deterministic scrapers, not a replacement for them. Your scraper should still use fast, precise CSS selectors and Parsel for extraction. The AI only activates when those selectors fail. Think of it as an exception handler, not a default path.

Crawlee gave me the scraping foundation — the request handling, the parsing, the storage. The LLM gave me the recovery. Together, the scraper runs itself.

---

Full source code is available on GitHub (https://github.com/YOUR_USERNAME/self-healing-scraper). Built using Crawlee for Python, Parsel, and OpenRouter. The test site is included in the repo under /scripts/test-site — run npm run dev and break things yourself.

If you enjoyed this blog, feel free to support Crawlee for Python by starring the repository or joining the maintainer team.

Have questions or want to discuss the implementation? Join the Apify Discord community — our community of 11,000+ developers is there to help.
