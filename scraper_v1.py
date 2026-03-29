import asyncio
import json
import os
import tempfile
from crawlee.crawlers import ParselCrawler, ParselCrawlingContext

async def main() -> None:
    # Use a list to collect all articles across requests
    all_articles = []

    # Redirect the crawlee storage to a temporary directory to avoid 
    # creating a './storage' folder in the project root.
    os.environ['CRAWLEE_STORAGE_DIR'] = tempfile.mkdtemp()

    # Configure the crawler
    crawler = ParselCrawler(max_requests_per_crawl=10)

    @crawler.router.default_handler
    async def request_handler(context: ParselCrawlingContext) -> None:
        context.log.info(f"Processing {context.request.url} ...")

        # Extract all h2 titles
        raw_titles = context.selector.css("h2::text").getall()
        
        # Format and collect them
        for title in raw_titles:
            article = {
                "id": len(all_articles) + 1,
                "title": title.strip()
            }
            all_articles.append(article)
            context.log.info(f"Captured: {article['title']}")

    # Start the crawl
    await crawler.run(["http://localhost:3001/"])

    # Wrap the results in the requested structure
    output_data = {
        "articles": all_articles
    }

    # Save to a single output file
    output_file = "articles.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nSuccessfully scraped {len(all_articles)} articles.")
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    asyncio.run(main())

