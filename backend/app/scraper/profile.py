import random

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

VIEWPORTS = [
    (1920, 1080),
    (1366, 768),
    (1536, 864),
    (1440, 900),
    (1280, 720),
    (1680, 1050),
    (1600, 900),
]

PLATFORMS = {
    "Win32": ("Windows", "nt"),
    "MacIntel": ("macOS", "mac"),
    "Linux x86_64": ("Linux", "linux"),
}

LOCALES_TIMEZONES: dict[str, list[str]] = {
    "fr-FR": ["Europe/Paris"],
    "en-US": ["America/New_York", "America/Chicago", "America/Los_Angeles"],
    "en-GB": ["Europe/London"],
    "de-DE": ["Europe/Berlin"],
    "es-ES": ["Europe/Madrid"],
    "it-IT": ["Europe/Rome"],
    "pt-BR": ["America/Sao_Paulo"],
    "ja-JP": ["Asia/Tokyo"],
    "zh-CN": ["Asia/Shanghai"],
}


def random_profile():
    ua = random.choice(USER_AGENTS)
    viewport = random.choice(VIEWPORTS)
    locale = random.choice(list(LOCALES_TIMEZONES.keys()))
    timezone = random.choice(LOCALES_TIMEZONES[locale])

    if "Windows" in ua:
        platform_name = "Win32"
    elif "Macintosh" in ua or "iPhone" in ua:
        platform_name = "MacIntel"
    else:
        platform_name = "Linux x86_64"

    return {
        "user_agent": ua,
        "viewport": {"width": viewport[0], "height": viewport[1]},
        "locale": locale,
        "timezone": timezone,
        "platform": platform_name,
        "os_name": PLATFORMS.get(platform_name, ("Windows", "nt"))[0],
    }
