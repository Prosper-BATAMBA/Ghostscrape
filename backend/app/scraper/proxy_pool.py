import random
from pathlib import Path
from typing import Optional


class ProxyPool:
    def __init__(self, file_path: Optional[str] = None, max_fails: int = 3):
        self._proxies: list[str] = []
        self._health: dict[str, int] = {}
        self._round_robin_index = 0
        self.max_fails = max_fails
        if file_path:
            self.load(file_path)

    def load(self, file_path: str):
        path = Path(file_path)
        if not path.exists():
            print(f"[ProxyPool] File not found: {file_path}")
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    self._proxies.append(line)
        print(f"[ProxyPool] Loaded {len(self._proxies)} proxies from {file_path}")

    @property
    def count(self) -> int:
        return len(self._proxies)

    def get(self, strategy: str = "random") -> Optional[str]:
        if not self._proxies:
            return None
        healthy = [p for p in self._proxies if self._health.get(p, 0) < self.max_fails]
        if not healthy:
            self._health.clear()
            healthy = self._proxies[:]

        if strategy == "round_robin":
            idx = self._round_robin_index % len(healthy)
            self._round_robin_index += 1
            return healthy[idx]
        return random.choice(healthy)

    def add(self, proxy: str):
        if proxy not in self._proxies:
            self._proxies.append(proxy)

    def mark_failed(self, proxy: str):
        self._health[proxy] = self._health.get(proxy, 0) + 1

    def mark_success(self, proxy: str):
        self._health[proxy] = 0

    def list_all(self) -> list[dict]:
        return [
            {"proxy": p, "fails": self._health.get(p, 0)}
            for p in self._proxies
        ]


proxy_pool = ProxyPool(file_path=str(Path(__file__).parent.parent.parent / "proxies.txt"))
