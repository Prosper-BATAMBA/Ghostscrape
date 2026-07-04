import asyncio
import json
import traceback
from typing import Optional

from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

from app.scraper.profile import random_profile
from app.scraper.proxy_pool import proxy_pool

router = APIRouter(tags=["playwright"])


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    selectors: Optional[list[str]] = Field(None, description="CSS selectors to extract")
    wait_until: str = Field("networkidle", description="Wait until: load, domcontentloaded, networkidle")
    timeout: int = Field(60, ge=5, le=180, description="Navigation timeout in seconds")
    scroll: bool = Field(False, description="Auto-scroll the page before extraction")
    scroll_delay: float = Field(0.5, ge=0.1, le=5, description="Delay between scroll steps (seconds)")
    use_proxy: bool = Field(False, description="Use a proxy from the pool")
    proxy_url: Optional[str] = Field(None, description="Override proxy URL")
    headless: bool = Field(True, description="Run browser in headless mode")
    extract_images: bool = Field(True, description="Extract image URLs")
    extract_links: bool = Field(True, description="Extract links")
    extract_tables: bool = Field(True, description="Extract tables")
    extract_structured: bool = Field(True, description="Extract JSON-LD structured data")


@router.post("/scrape/playwright")
async def scrape_playwright(req: ScrapeRequest):
    req.url = _validate_url(req.url)
    profile = random_profile()

    launch_opts = {
        "headless": req.headless,
        "args": [
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-infobars",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-field-trial-config",
            "--disable-ipc-flooding-protection",
            f"--lang={profile['locale']}",
        ],
    }

    proxy = req.proxy_url or (proxy_pool.get() if req.use_proxy else None)
    if proxy:
        if "://" not in proxy:
            proxy = "http://" + proxy
        launch_opts["proxy"] = {"server": proxy}

    context_opts = {
        "user_agent": profile["user_agent"],
        "locale": profile["locale"],
        "timezone_id": profile["timezone"],
        "viewport": profile["viewport"],
        "ignore_https_errors": True,
    }

    pw = None
    browser = None
    context = None

    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(**launch_opts)
        context = await browser.new_context(**context_opts)
        page = await context.new_page()

        try:
            await page.goto(req.url, wait_until=req.wait_until, timeout=req.timeout * 1000)
        except Exception as nav_err:
            raise HTTPException(status_code=504, detail=f"Navigation failed: {str(nav_err)[:300]}")

        try:
            await stealth_async(page)
        except Exception:
            pass

        blocked = await _detect_blocked_playwright(page)
        if blocked:
            await _safe_close(pw, browser, context)
            return {**blocked, "url": req.url, "profile": profile}

        if req.scroll:
            await _auto_scroll(page, req.scroll_delay, req.timeout)

        await asyncio.sleep(0.5)

        raw_html = await page.content()
        page_title = await page.title()
        final_url = page.url
        status_code = await _get_status_code(page)

        soup = BeautifulSoup(raw_html, "lxml")
        result = {
            "url": final_url,
            "initial_url": req.url,
            "status_code": status_code,
            "title": page_title,
            "profile": {
                "user_agent": profile["user_agent"],
                "viewport": profile["viewport"],
                "locale": profile["locale"],
                "timezone": profile["timezone"],
                "platform": profile["platform"],
            },
            "proxy": proxy or None,
        }

        meta_desc = soup.find("meta", attrs={"name": "description"})
        result["description"] = meta_desc.get("content") if meta_desc else ""

        headings = {}
        for tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            tags = soup.find_all(tag_name)
            texts = [t.get_text(strip=True) for t in tags if t.get_text(strip=True)]
            if texts:
                headings[tag_name] = texts
        result["headings"] = headings

        result["paragraphs"] = [
            p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)
        ][:100]

        if req.extract_links:
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                links.append({
                    "text": a.get_text(strip=True)[:500],
                    "href": href,
                    "is_internal": href.startswith("/") or href.startswith(final_url.rstrip("/")),
                })
            result["links"] = links[:200]

        if req.extract_images:
            images = []
            for img in soup.find_all("img", src=True):
                images.append({
                    "src": img["src"],
                    "alt": img.get("alt", ""),
                    "width": img.get("width"),
                    "height": img.get("height"),
                })
            result["images"] = images[:100]

        if req.extract_tables:
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
            result["tables"] = tables[:20]

        if req.extract_structured:
            structured = []
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    structured.append(json.loads(script.string))
                except Exception:
                    pass
            result["structured"] = structured[:10]

        if req.selectors:
            selector_results = []
            for selector in req.selectors:
                elements = soup.select(selector)
                items = []
                for el in elements:
                    items.append({
                        "text": el.get_text(strip=True)[:500],
                        "html": str(el)[:1000],
                        "tag": el.name,
                        "attrs": dict(el.attrs),
                    })
                selector_results.append({
                    "selector": selector,
                    "count": len(items),
                    "items": items[:50],
                })
            result["selectors"] = selector_results

        if proxy:
            proxy_pool.mark_success(proxy)

        await _safe_close(pw, browser, context)
        return result

    except HTTPException:
        await _safe_close(pw, browser, context)
        raise
    except Exception as e:
        await _safe_close(pw, browser, context)
        raise HTTPException(status_code=500, detail=f"Playwright scraping failed: {str(e)[:300]}")


async def _get_status_code(page) -> int:
    try:
        entries = await page.evaluate("""() => {
            const nav = performance.getEntriesByType('navigation');
            return nav.length > 0 ? nav[0].responseStatus : null;
        }""")
        return entries or 200
    except Exception:
        return 200


async def _detect_blocked_playwright(page):
    try:
        title = await page.title()
        body_text = await page.evaluate("() => document.body?.innerText || ''")
        page_html = await page.content()

        patterns = [
            (r"access.?denied", "Access Denied"),
            (r"403 forbidden", "HTTP 403"),
            (r"404 not found", "HTTP 404"),
            (r"too many requests", "Rate Limited"),
            (r"rate.?limited", "Rate Limited"),
            (r"captcha", "CAPTCHA"),
            (r"cf.?challenge", "Cloudflare Challenge"),
            (r"just a moment", "Cloudflare Challenge"),
            (r"checking your browser", "Cloudflare Challenge"),
            (r"your request has been blocked", "Blocked"),
            (r"attention required", "Attention Required"),
            (r"cloudflare", "Cloudflare"),
            (r"please wait", "Please Wait"),
            (r"verifying you are human", "Human Verification"),
        ]

        checks = []
        import re
        for pattern, label in patterns:
            if re.search(pattern, body_text, re.IGNORECASE) or re.search(pattern, page_html, re.IGNORECASE) or re.search(pattern, title, re.IGNORECASE):
                checks.append({"type": "content_pattern", "detail": label, "severity": "high"})

        if checks:
            return {
                "blocked": True,
                "suspicious": True,
                "checks": checks,
                "warning": "blocked_page",
                "detail": "Page appears to be blocked or restricted",
            }

        return None
    except Exception:
        return None


async def _auto_scroll(page, delay, timeout):
    start = asyncio.get_event_loop().time()
    prev_height = 0
    for _ in range(30):
        if asyncio.get_event_loop().time() - start > timeout:
            break
        try:
            height = await page.evaluate("document.body.scrollHeight")
            if height == prev_height:
                break
            prev_height = height
            await page.evaluate(f"window.scrollTo(0, {height})")
            await asyncio.sleep(delay)
        except Exception:
            break


async def _safe_close(pw, browser, context):
    try:
        if context:
            await context.close()
    except Exception:
        pass
    try:
        if browser:
            await browser.close()
    except Exception:
        pass
    try:
        if pw:
            await pw.stop()
    except Exception:
        pass


def _validate_url(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url
