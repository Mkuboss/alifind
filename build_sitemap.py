#!/usr/bin/env python3
"""
build_sitemap.py — Generator sitemap.xml untuk AliFind.

Menghasilkan URL:
  1. Homepage (apex + www)
  2. Halaman kategori (?cat=<Kategori>) — dibaca dari data/products.json
  3. Halaman legal (legal/*.html)

lastmod diambil dari mtime file sumber (index.html / products.json / file legal),
jadi sitemap selalu jujur soal kapan konten terakhir berubah.

Pakai sebelum deploy:
    python3 build_sitemap.py && wrangler pages deploy . --project-name=...
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
SITE = "https://mku-api.xyz"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


def lastmod(path: Path) -> str:
    """Tanggal (YYYY-MM-DD) kapan file terakhir diubah."""
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).strftime("%Y-%m-%d")
    except OSError:
        return TODAY


def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;"))


def url_entry(loc: str, lastmod_date: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{esc(loc)}</loc>\n"
        f"    <lastmod>{lastmod_date}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>"
    )


def main() -> None:
    entries = []

    # 1. Homepage (apex)
    home_lm = lastmod(ROOT / "index.html")
    entries.append(url_entry(f"{SITE}/", home_lm, "daily", "1.0"))

    # 2. Halaman kategori — hanya kategori yang benar-benar punya produk
    products_file = ROOT / "data" / "products.json"
    data_lm = lastmod(products_file)
    cats = []
    try:
        products = json.loads(products_file.read_text(encoding="utf-8"))
        cats = sorted({c for p in products for c in (p.get("categories") or []) if c})
    except Exception as e:
        print(f"[warn] gagal baca products.json: {e}")

    for c in cats:
        entries.append(url_entry(f"{SITE}/?cat={quote(c)}", data_lm, "daily", "0.8"))

    # 3. Halaman legal
    legal_dir = ROOT / "legal"
    if legal_dir.is_dir():
        for f in sorted(legal_dir.glob("*.html")):
            # Cloudflare Pages menyajikan versi tanpa .html (dan 308-redirect dari .html),
            # jadi sitemap memakai URL final agar crawler tidak kena redirect.
            entries.append(url_entry(f"{SITE}/legal/{f.stem}", lastmod(f), "monthly", "0.3"))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )

    out = ROOT / "sitemap.xml"
    out.write_text(xml, encoding="utf-8")
    n_legal = len(list(legal_dir.glob("*.html"))) if legal_dir.is_dir() else 0
    print(f"sitemap.xml ditulis: {len(entries)} URL "
          f"(1 homepage + {len(cats)} kategori + {n_legal} legal)")


if __name__ == "__main__":
    main()
