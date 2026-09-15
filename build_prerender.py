#!/usr/bin/env python3
"""
build_prerender.py — Prerender produk AliFind ke HTML statis supaya Google bisa baca.

Masalah: #product-grid dikosongkan lalu diisi via JS (fetch products.json).
Googlebot lihat HTML = 0 produk. Solusi: inject kartu produk statis ke dalam
grid di index.html saat build. js/app.js tetap jalan normal untuk user
(mengganti innerHTML saat render), jadi tidak ada duplikat konten bagi visitor.

Pakai sebelum deploy:
    python3 build_prerender.py
Marker block:  <!-- PRERENDER:START --> ... <!-- PRERENDER:END -->
"""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRODUCTS = ROOT / "data" / "products.json"
INDEX = ROOT / "index.html"

START = "<!-- PRERENDER:START -->"
END = "<!-- PRERENDER:END -->"


def E(v) -> str:
    """Escape HTML aman untuk None."""
    return escape(str(v if v is not None else ""), quote=True)


def card(p: dict) -> str:
    name = E(p.get("name"))
    link = E(p.get("affiliateLink")) or "#"
    img = E(p.get("image"))
    price = E(p.get("price"))
    orig = E(p.get("originalPrice"))
    rating = E(p.get("rating"))
    sold = E(p.get("sold"))
    disc = E(p.get("discount"))
    parts = [
        f'<li class="prerender-card" data-id="{p.get("id")}">',
        f'<a href="{link}" rel="nofollow sponsored noopener" target="_blank" title="{name}">',
        f'<img src="{img}" alt="{name}" loading="lazy" width="480" height="480">',
        f'<h3>{name}</h3>',
        f'<p>Preço: {price}' + (f' <s>{orig}</s>' if orig else "") + "</p>",
    ]
    meta = []
    if rating:
        meta.append(f"Nota {escape(str(rating), quote=True)}/5")
    if sold:
        meta.append(f"{sold} vendidos")
    if disc:
        meta.append(f"-{escape(str(disc), quote=True)}%")
    if meta:
        parts.append(f'<p>{" · ".join(meta)}</p>')
    parts.append("</a></li>")
    return "".join(parts)


def jsonld(products: list) -> str:
    items = []
    for i, p in enumerate(products, 1):
        items.append({
            "@type": "ListItem",
            "position": i,
            "name": p.get("name", ""),
            "url": p.get("affiliateLink", ""),
        })
    data = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Achados AliExpress — AliFind",
        "url": "https://mku-api.xyz/",
        "numberOfItems": len(items),
        "itemListElement": items,
    }
    return ("<script type=\"application/ld+json\">"
            + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
            + "</script>")


def main() -> None:
    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    block = (
        START
        + "\n<ul id=\"prerender-grid\" style=\"display:none\">\n"
        + "\n".join(card(p) for p in products)
        + "\n</ul>\n"
        + jsonld(products)
        + "\n" + END
    )

    html = INDEX.read_text(encoding="utf-8")
    if START in html and END in html:
        html = re.sub(
            re.escape(START) + r".*?" + re.escape(END),
            lambda _: block,
            html,
            flags=re.S,
        )
    else:
        marker = '<div id="product-grid"'
        idx = html.index(marker)
        # sisip tepat SEBELUM div grid utama
        html = html[:idx] + block + "\n" + html[idx:]

    INDEX.write_text(html, encoding="utf-8")
    print(f"OK: prerender {len(products)} produk + JSON-LD ItemList -> index.html")


if __name__ == "__main__":
    main()
