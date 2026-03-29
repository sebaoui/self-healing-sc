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

# Initialize OpenAI client with OpenRouter base URL
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)


def load_selectors():
    """Load CSS selectors from the JSON config file."""
    if os.path.exists(SELECTORS_FILE):
        with open(SELECTORS_FILE, "r") as f:
            return json.load(f)
    return {"title": "h2"}


def save_selectors(selectors):
    """Save updated CSS selectors to the JSON config file."""
    with open(SELECTORS_FILE, "w") as f:
        json.dump(selectors, f, indent=2)


def heal_selector(html):
    """Uses AI to find the correct CSS selector for article titles."""
    console.print(Panel(
        "[bold yellow]Selector returned 0 results. "
        "Consulting AI for healing...[/bold yellow]",
        border_style="yellow"
    ))

    # Clean and truncate HTML to reduce token usage
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
            ai_response = ai_response.split("```json")[1]\
                                     .split("```")[0].strip()
        elif "```" in ai_response:
            ai_response = ai_response.split("```")[1]\
                                     .split("```")[0].strip()

        new_selectors = json.loads(ai_response)
        return new_selectors.get("title")
    except Exception as e:
        console.print(f"[bold red]AI Healing failed:[/bold red] {e}")
        return None


async def main() -> None:
    console.print(Panel.fit(
        "[bold cyan]🚀 Self-Healing Scraper with Crawlee[/bold cyan]",
        border_style="cyan"
    ))

    all_articles = []

    # Redirect crawlee storage to a temp directory
    os.environ['CRAWLEE_STORAGE_DIR'] = tempfile.mkdtemp()

    # 1. Load current selector from config
    selectors = load_selectors()
    current_selector = selectors.get("title", "h2")
    console.print(
        f"[*] Current selector: "
        f"[bold green]'{current_selector}'[/bold green]"
    )

    crawler = ParselCrawler(max_requests_per_crawl=10)

    @crawler.router.default_handler
    async def request_handler(context: ParselCrawlingContext) -> None:
        nonlocal selectors, current_selector

        context.log.info(f"Processing {context.request.url} ...")

        # 2. Try extraction with current selector
        if "::text" not in current_selector:
            raw_titles = context.selector.css(
                f"{current_selector}::text"
            ).getall()
        else:
            raw_titles = context.selector.css(current_selector).getall()

        titles = [t.strip() for t in raw_titles if t.strip()]

        # 3. If no results, trigger healing
        if not titles:
            console.print(
                "[bold red][!] No titles found with current "
                "selector. Triggering healing...[/bold red]"
            )

            # Get raw HTML from Crawlee's HTTP response
            html = context.http_response.read().decode("utf-8")

            new_selector = heal_selector(html)

            if new_selector:
                console.print(
                    f"[*] AI suggested new selector: "
                    f"[bold magenta]'{new_selector}'[/bold magenta]"
                )

                if new_selector != current_selector:
                    console.print(
                        "[green]✓ Selector has changed! "
                        "Updating selectors.json...[/green]"
                    )
                    selectors["title"] = new_selector
                    save_selectors(selectors)
                    current_selector = new_selector

                # Re-extract with the healed selector
                if "::text" not in new_selector:
                    raw_titles = context.selector.css(
                        f"{new_selector}::text"
                    ).getall()
                else:
                    raw_titles = context.selector.css(
                        new_selector
                    ).getall()

                titles = [t.strip() for t in raw_titles if t.strip()]
            else:
                console.print(
                    "[bold red]✗ Healing failed. "
                    "Could not determine new selector.[/bold red]"
                )
                return

        # 4. Collect results
        for title in titles:
            article = {
                "id": len(all_articles) + 1,
                "title": title
            }
            all_articles.append(article)
            context.log.info(f"Captured: {article['title']}")

    # Run the crawler
    await crawler.run([TARGET_URL])

    # 5. Save results
    if all_articles:
        output_data = {"articles": all_articles}
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        console.print(Panel(
            f"[bold green]Success![/bold green]\n"
            f"Scraped {len(all_articles)} articles.\n"
            f"Saved to {OUTPUT_FILE}",
            border_style="green"
        ))
    else:
        console.print(
            "[bold red]No articles scraped. "
            "Healing may have failed.[/bold red]"
        )


if __name__ == "__main__":
    asyncio.run(main())
