#!/usr/bin/env python3
"""
build_category_pages.py — Halaman kategori statis SEO-friendly untuk AliFind.

Mengganti peran ?cat=X (query-param, bukan halaman sungguhan) dengan URL bersih:
    /categoria/joias/  /categoria/beleza/  /categoria/casa/  dst.

Isi tiap halaman: H1 + intro pt-BR + grid produk kategori (HTML statis, bisa
dibaca Google) + link ke vitrine utama + disclosure afiliasi + canonical +
JSON-LD CollectionPage. Produk di-link ke affiliate link (rel sponsored).

Jalankan sebelum deploy:  python3 build_category_pages.py
Output: categoria/<slug>/index.html (satu folder per kategori)
"""
import json
import re
import shutil
import unicodedata
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRODUCTS = ROOT / "data" / "products.json"
INDEX = ROOT / "index.html"
OUT = ROOT / "categoria"

SITE = "https://mku-api.xyz"

# Nama kategori -> (slug, label pt-BR)
CATS = {
    "Jewelry":   ("joias",        "Joias e Piercings"),
    "Beauty":    ("beleza",       "Beleza"),
    "Skincare":  ("skincare",     "Skincare e Cuidados da Pele"),
    "Lashes":    ("cilios",       "Cílios Postiços e Extensões"),
    "Nails":     ("unhas",        "Unhas Postiças"),
    "Hair":      ("cabelo",       "Cuidados e Acessórios de Cabelo"),
    "Makeup":    ("maquiagem",    "Maquiagem"),
    "Home":      ("casa",         "Casa e Decoração"),
    "Storage":   ("organizacao",  "Organização da Casa"),
    "Kitchen":   ("cozinha",      "Cozinha Prática"),
    "Tools":     ("ferramentas",  "Ferramentas e Utilidades"),
    "Gadget":    ("gadgets",      "Gadgets e Tech"),
    "Auto":      ("auto",         "Acessórios Automotivos"),
    "Outdoor":   ("ar-livre",     "Ar Livre e Viagem"),
    "Trending":  ("em-alta",      "Em Alta Esta Semana"),
}

INTRO = {
    "Jewelry": "Argolas, piercings em titânio grau implante, colares e pulseiras que são campeões de venda no AliExpress — curados por nota, número de pedidos e preço real.",
    "Beauty": "Os achados de beleza mais pedidos do AliExpress, selecionados por dados: nota média alta, milhares de avaliações e desconto de verdade.",
    "Skincare": "Adesivos para espinhas, máscaras e cuidados diários que viralizaram — com avaliações reais de compradores.",
    "Lashes": "Fueros pré-fabricados, extensões W-shape e cílios volume profissional para uso doméstico ou de salão.",
    "Nails": "Unhas postiças decoradas, formato almond, coffin e estilos sazonais — aplicação em minutos, preço de atacado.",
    "Hair": "Presilhas, scrunchies, faixas e acessórios de cabelo mais vendidos, curados por nota e volume de pedidos.",
    "Makeup": "Pincéis, esponjas e acessórios de maquiagem queridinhos das influenciadoras, direto dos vendedores melhor avaliados.",
    "Home": "Gadgets e organizadores de casa que resolvem problemas reais — testados por milhares de compradores antes de entrarem aqui.",
    "Storage": "Caixas organizadoras, gavetas e soluções de arrumação que cabem no seu orçamento.",
    "Kitchen": "Fatiamos, raladores, espiralizadores e utilidades de cozinha que viram best-sellers por um motivo: funcionam.",
    "Tools": "Ferramentas manuais e elétricas para consertos rápidos, seleção com nota 4.5+.",
    "Gadget": "Acessórios tech e gadgets úteis, de suportes a iluminação LED, com bom custo-benefício.",
    "Auto": "Organizadores, limpadores e acessórios para carro, avaliados por milhares de motoristas.",
    "Outdoor": "Equipamentos leves para trilha, praia e viagem.",
    "Trending": "O que mais explode em pedidos esta semana no AliExpress Brasil — atualizado toda segunda.",
}


def E(v) -> str:
    return escape(str(v if v is not None else ""), quote=True)


def slugify(s: str, maxlen: int = 60) -> str:
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return (s[:maxlen].strip("-") or "produto")


def product_path(p: dict) -> str:
    return f"/produto/{slugify(p.get('name') or '')}-{p.get('id')}/"


def card(p: dict) -> str:
    name = E(p.get("name"))
    link = E(product_path(p))
    img = E(p.get("image"))
    price = E(p.get("price"))
    orig = E(p.get("originalPrice"))
    rating = E(p.get("rating"))
    sold = E(p.get("sold"))
    disc = E(p.get("discount"))
    meta = []
    if rating and rating != "None":
        meta.append(f"Nota {rating}/5")
    if sold and sold != "None":
        meta.append(f"{sold} vendidos")
    if disc and disc != "None":
        meta.append(f"-{disc}%")
    return (
        '<li class="card">'
        f'<a href="{link}">'
        f'<img src="{img}" alt="{name}" loading="lazy" width="480" height="480">'
        f'<h2>{name}</h2>'
        f'<p class="price">{price or "Consultar"}</p>'
        + (f'<p class="meta">{" · ".join(meta)}</p>' if meta else "")
        + "</a></li>"
    )


PAGE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{canonical}">
  <link rel="icon" type="image/png" href="/favicon.png">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{site}/og-image.png">
  <meta property="og:locale" content="pt_BR">
  <script type="application/ld+json">{jsonld}</script>
  <!-- Consent Mode: GA4 hanya dimuat bila pengguna sudah menyetujui (alifind_consent=granted) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{ dataLayer.push(arguments); }}
    gtag('consent', 'default', {{
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied',
      wait_for_update: 500
    }});
    (function () {{
      var c = null;
      try {{ c = localStorage.getItem('alifind_consent'); }} catch (e) {{}}
      if (c !== 'granted') return;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-HYQ30MH80M';
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('consent', 'update', {{ analytics_storage: 'granted' }});
      gtag('config', 'G-HYQ30MH80M', {{ anonymize_ip: true }});
    }})();
  </script>
  <style>
    :root {{ color-scheme: light; }}
    body {{ font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
           margin: 0; background: #faf6ee; color: #232019; }}
    header, footer {{ background: #232019; color: #f1eadf; }}
    header a, footer a {{ color: #ffd9a8; text-decoration: none; }}
    .wrap {{ max-width: 1080px; margin: 0 auto; padding: 0 16px; }}
    header .wrap {{ display: flex; justify-content: space-between; align-items: center; padding-block: 14px; }}
    .logo {{ font-weight: 800; font-size: 20px; color: #fff; letter-spacing: .5px; }}
    h1 {{ font-size: clamp(26px, 4vw, 38px); margin: 28px 0 8px; }}
    .intro {{ max-width: 720px; line-height: 1.6; color: #5f5849; margin-bottom: 24px; }}
    ul.grid {{ list-style: none; padding: 0; margin: 0 0 40px;
               display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }}
    .card {{ background: #fff; border-radius: 16px; overflow: hidden;
             box-shadow: 0 1px 3px rgba(35,32,25,.08); }}
    .card a {{ display: block; color: inherit; text-decoration: none; padding-bottom: 12px; }}
    .card img {{ width: 100%; aspect-ratio: 1; object-fit: cover; display: block; background: #f1eadf; }}
    .card h2 {{ font-size: 14px; line-height: 1.35; margin: 10px 12px 6px; font-weight: 600;
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }}
    .price {{ margin: 0 12px; font-weight: 800; font-size: 16px; }}
    .price s {{ color: #b3a893; font-weight: 400; font-size: 12px; margin-left: 6px; }}
    .meta {{ margin: 4px 12px 0; font-size: 12px; color: #6f685c; }}
    .disclosure {{ font-size: 12px; color: #6f685c; padding: 12px 0 28px; line-height: 1.5; }}
    footer .wrap {{ padding-block: 18px; font-size: 13px; display: flex; gap: 18px; flex-wrap: wrap; }}
  </style>
</head>
<body>
  <header><div class="wrap">
    <a class="logo" href="{site}/">AliFind</a>
    <a href="{site}/">← Voltar à vitrine completa</a>
  </div></header>
  <main class="wrap">
    <h1>{h1}</h1>
    <p class="intro">{intro}</p>
    <ul class="grid">
{cards}
    </ul>
    <p class="disclosure">Divulgação: AliFind participa do programa de afiliados do AliExpress e pode receber comissão por compras indicadas. Preços e disponibilidade podem mudar; consulte o anúncio oficial.</p>
  </main>
  <footer><div class="wrap">
    <a href="{site}/legal/impostos">Impostos e Importação</a>
    <a href="{site}/legal/divulgacao-afiliado">Divulgação de afiliado</a>
    <a href="{site}/legal/privacidade">Privacidade</a>
    <a href="{site}/legal/termos">Termos</a>
    <a href="{site}/legal/contato">Contato</a>
  </div></footer>
</body>
</html>
"""


def inject_footer_nav(made) -> None:
    """Sisipkan nav link kategori ke footer index.html (internal linking)."""
    html = INDEX.read_text(encoding="utf-8")
    links = "".join(
        f'<a href="/categoria/{slug}" class="px-2 py-1.5 rounded-lg hover:text-[#c9432f] transition">{escape(label)}</a>'
        for slug, label, _ in made
    )
    block = (
        '<!-- CATNAV:START -->\n'
        '      <nav class="flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[12.5px] font-semibold text-[#6f685c] pt-2" aria-label="Categorias">\n'
        '        <span class="px-1 text-[#5f5849]">Categorias:</span>\n'
        f'        {links}\n'
        '      </nav>\n'
        '      <!-- CATNAV:END -->'
    )
    if "<!-- CATNAV:START -->" in html:
        html = re.sub(r"<!-- CATNAV:START -->.*?<!-- CATNAV:END -->", lambda _: block, html, flags=re.S)
    else:
        anchor = '      <p class="text-xs text-[#7a7264] pt-1">&copy; 2026 AliFind.'
        html = html.replace(anchor, block + "\n" + anchor, 1)
    INDEX.write_text(html, encoding="utf-8")


def main() -> None:
    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    if OUT.exists():
        shutil.rmtree(OUT)

    made = []
    for cat, (slug, label) in CATS.items():
        items = [p for p in products if cat in (p.get("categories") or [])]
        if len(items) < 3:
            continue
        # unggulan: urutkan by rating desc
        def key(p):
            try:
                r = float(p.get("rating") or 0)
            except (TypeError, ValueError):
                r = 0.0
            return -r
        items = sorted(items, key=key)

        url = f"{SITE}/categoria/{slug}/"
        n = len(items)
        title = f"{label} — Achados AliExpress com Nota Alta | AliFind"
        desc = f"{n} {label.lower()} mais pedidos do AliExpress, curados por nota e volume de vendas. {INTRO[cat][:110]}"
        jsonld = json.dumps({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": title,
            "url": url,
            "description": desc,
            "isPartOf": {"@type": "WebSite", "name": "AliFind", "url": f"{SITE}/"},
        }, ensure_ascii=False)

        html = PAGE.format(
            site=SITE, title=E(title), description=E(desc), canonical=url,
            h1=E(label), intro=E(INTRO[cat]),
            cards="\n".join("      " + card(p) for p in items),
            jsonld=jsonld.replace("</", "<\\/"),
        )
        d = OUT / slug
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(html, encoding="utf-8")
        made.append((slug, label, n))

    inject_footer_nav(made)

    print(f"OK: {len(made)} halaman kategori dibuat:")
    for slug, label, n in made:
        print(f"  /categoria/{slug}/  ({label}, {n} produk)")


if __name__ == "__main__":
    main()
