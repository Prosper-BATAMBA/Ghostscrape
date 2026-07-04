import asyncio
import random
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["scrape"])

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
]

ACCEPT_LANGUAGES = [
    "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "en-US,en;q=0.9,fr;q=0.8",
    "fr,en;q=0.9,en-US;q=0.8",
    "en;q=0.9,fr;q=0.8",
]

ACCEPT_ENCODING = "gzip, deflate, br"

DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3
BASE_DELAY = 1.0


def _random_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": random.choice(ACCEPT_LANGUAGES),
        "Accept-Encoding": ACCEPT_ENCODING,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def _validate_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


@router.get("/scrape/html")
async def scrape_html(
    url: str = Query(..., description="URL to scrape"),
    user_agent: Optional[str] = Query(None, description="Override User-Agent"),
    proxy: Optional[str] = Query(None, description="Proxy URL (http://user:pass@host:port)"),
    timeout: int = Query(DEFAULT_TIMEOUT, ge=1, le=120, description="Request timeout in seconds"),
    retry: int = Query(MAX_RETRIES, ge=0, le=10, description="Number of retries on failure"),
    delay: float = Query(BASE_DELAY, ge=0, le=30, description="Base delay between retries (seconds)"),
    wait: float = Query(0, ge=0, le=60, description="Extra wait before extraction (seconds)"),
):
    url = _validate_url(url)

    headers = _random_headers()
    if user_agent:
        headers["User-Agent"] = user_agent

    transport = None
    if proxy:
        transport = httpx.AsyncHTTPTransport(proxy=proxy)

    last_error = None

    for attempt in range(retry + 1):
        if attempt > 0:
            wait_time = delay * (2 ** (attempt - 1)) + random.uniform(0, 1)
            await asyncio.sleep(wait_time)

        try:
            async with httpx.AsyncClient(
                headers=headers,
                transport=transport,
                timeout=httpx.Timeout(timeout),
                follow_redirects=True,
            ) as client:
                if wait > 0:
                    await asyncio.sleep(wait)
                resp = await client.get(url)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "")
                raw_html = resp.text

            soup = BeautifulSoup(raw_html, "lxml")

            meta_desc = soup.find("meta", attrs={"name": "description"})
            description = meta_desc.get("content") if meta_desc else ""

            og = {}
            for tag in soup.find_all("meta", attrs={"property": True}):
                prop = tag.get("property", "")
                if prop.startswith("og:"):
                    og[prop[3:]] = tag.get("content", "")

            headings = {}
            for tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                tags = soup.find_all(tag_name)
                texts = [t.get_text(strip=True) for t in tags if t.get_text(strip=True)]
                if texts:
                    headings[tag_name] = texts

            paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]

            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                links.append({
                    "text": a.get_text(strip=True)[:500],
                    "href": href,
                    "is_internal": href.startswith("/") or href.startswith(url.rstrip("/")),
                })

            images = []
            for img in soup.find_all("img", src=True):
                images.append({
                    "src": img["src"],
                    "alt": img.get("alt", ""),
                    "width": img.get("width"),
                    "height": img.get("height"),
                })

            tables = []
            for table in soup.find_all("table"):
                header_row = table.find("thead")
                headers_list = []
                if header_row:
                    headers_list = [th.get_text(strip=True) for th in header_row.find_all(["th", "td"])]
                rows = []
                for tr in table.find_all("tr"):
                    cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
                    if any(c.strip() for c in cells):
                        rows.append(cells)
                if rows:
                    tables.append({"headers": headers_list, "rows": rows})

            structured = []
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    import json
                    structured.append(json.loads(script.string))
                except Exception:
                    pass

            return {
                "url": url,
                "status_code": resp.status_code,
                "content_type": content_type.split(";")[0],
                "title": soup.title.string.strip() if soup.title and soup.title.string else "",
                "description": description,
                "og": og,
                "headings": headings,
                "paragraphs": paragraphs[:100],
                "links": links[:200],
                "images": images[:100],
                "tables": tables[:20],
                "structured": structured[:10],
                "text_length": len(raw_html),
                "meta": {
                    "attempts": attempt + 1,
                    "user_agent": headers["User-Agent"],
                    "proxy": proxy or None,
                },
            }

        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {str(e)[:200]}"
            if e.response.status_code in (403, 429, 503):
                continue
            raise HTTPException(status_code=502, detail=last_error)
        except httpx.TimeoutException:
            last_error = f"Timeout after {timeout}s"
            continue
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)[:200]}"
            continue
        except Exception as e:
            last_error = f"Unexpected error: {str(e)[:200]}"
            raise HTTPException(status_code=500, detail=last_error)

    raise HTTPException(
        status_code=502,
        detail=f"Failed after {retry + 1} attempts. Last error: {last_error}",
    )


@router.get("/scrape/selectors")
async def scrape_selectors(
    url: str = Query(..., description="URL to scrape"),
    selectors: str = Query(..., description="Comma-separated CSS selectors"),
    user_agent: Optional[str] = Query(None),
    proxy: Optional[str] = Query(None),
    timeout: int = Query(DEFAULT_TIMEOUT, ge=1, le=120),
    retry: int = Query(MAX_RETRIES, ge=0, le=10),
):
    url = _validate_url(url)
    selector_list = [s.strip() for s in selectors.split(",") if s.strip()]
    if not selector_list:
        raise HTTPException(status_code=400, detail="At least one selector is required")

    headers = _random_headers()
    if user_agent:
        headers["User-Agent"] = user_agent

    transport = None
    if proxy:
        transport = httpx.AsyncHTTPTransport(proxy=proxy)

    last_error = None

    for attempt in range(retry + 1):
        if attempt > 0:
            await asyncio.sleep(BASE_DELAY * (2 ** (attempt - 1)))

        try:
            async with httpx.AsyncClient(
                headers=headers,
                transport=transport,
                timeout=httpx.Timeout(timeout),
                follow_redirects=True,
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                raw_html = resp.text

            soup = BeautifulSoup(raw_html, "lxml")
            results = []

            for selector in selector_list:
                elements = soup.select(selector)
                items = []
                for el in elements:
                    items.append({
                        "text": el.get_text(strip=True)[:500],
                        "html": str(el)[:1000],
                        "tag": el.name,
                        "attrs": dict(el.attrs),
                    })
                results.append({
                    "selector": selector,
                    "count": len(items),
                    "items": items[:50],
                })

            return {
                "url": url,
                "selectors": results,
                "meta": {
                    "attempts": attempt + 1,
                    "user_agent": headers["User-Agent"],
                },
            }

        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {str(e)[:200]}"
            if e.response.status_code in (403, 429, 503):
                continue
            raise HTTPException(status_code=502, detail=last_error)
        except httpx.TimeoutException:
            last_error = f"Timeout after {timeout}s"
            continue
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)[:200]}"
            continue
        except Exception as e:
            last_error = f"Unexpected error: {str(e)[:200]}"
            raise HTTPException(status_code=500, detail=last_error)

    raise HTTPException(
        status_code=502,
        detail=f"Failed after {retry + 1} attempts. Last error: {last_error}",
    )
