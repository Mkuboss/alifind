#!/usr/bin/env python3
"""
build_product_pages.py — Halaman produk individual statis untuk AliFind.

Masalah: semua produk hanya muncul lewat modal JS tanpa URL sendiri → Google
tidak bisa mengindeks produk → SEO produk nol.

Solusi: satu halaman per produk di /produto/<slug>-<id>/ dengan:
  - title/description/canonical/og:image unik per produk
  - JSON-LD Product (harga BRL numeric, rating asli, availability)
  - BreadcrumbList
  - CTA beli (link afiliat) + disclosure FTC tepat di bawah
  - Consent-mode GA4 (sama dengan index.html — TIDAK load gtag tanpa consent)
  - internal link: kategori + homepage + link rel=canonical
  - data biaya/gambar dari products.json — server-side, tanpa JS untuk dibaca

Pakai sebelum deploy:
    python3 build_product_pages.py
Output: produto/<slug>-<id>/index.html
"""
import json
import re
import shutil
import unicodedata
from html import escape
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
PRODUCTS = ROOT / "data" / "products.json"
OUT = ROOT / "produto"
SITE = "https://mku-api.xyz"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

CAT_LABEL = {
    "Jewelry": ("joias", "Joias e Piercings"),
    "Beauty": ("beleza", "Beleza"),
    "Skincare": ("skincare", "Skincare e Cuidados da Pele"),
    "Lashes": ("cilios", "Cílios Postiços e Extensões"),
    "Nails": ("unhas", "Unhas Postiças"),
    "Hair": ("cabelo", "Cuidados e Acessórios de Cabelo"),
    "Makeup": ("maquiagem", "Maquiagem"),
    "Home": ("casa", "Casa e Decoração"),
    "Storage": ("organizacao", "Organização da Casa"),
    "Kitchen": ("cozinha", "Cozinha Prática"),
    "Tools": ("ferramentas", "Ferramentas e Utilidades"),
    "Gadget": ("gadgets", "Gadgets e Tech"),
    "Auto": ("auto", "Acessórios Automotivos"),
    "Outdoor": ("ar-livre", "Ar Livre e Viagem"),
    "Trending": ("em-alta", "Em Alta Esta Semana"),
}


def slugify(s: str, maxlen: int = 60) -> str:
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:maxlen].strip("-") or "produto"


def E(v) -> str:
    return escape(str(v if v is not None else ""), quote=True)


def brl_to_num(price: str):
    """'R$ 71,09' -> 71.09 ; 'R$ 1.299,90' -> 1299.90 ; gagal -> None"""
    if not price:
        return None
    m = re.sub(r"[^\d.,]", "", str(price))
    if not m:
        return None
    # BRL: koma = desimal, titik = ribuan
    if "," in m:
        m = m.replace(".", "").replace(",", ".")
    try:
        return round(float(m), 2)
    except ValueError:
        return None


def price_date() -> str:
    """Tanggal snapshot harga: dari data/products.json mtime — jujur."""
    try:
        return datetime.fromtimestamp(PRODUCTS.stat().st_mtime, tz=timezone.utc).strftime("%d/%m/%Y")
    except OSError:
        return TODAY.replace("-", "/")


def build_descriptions_map():
    """Baca js/descriptions.js -> {id: desc}. Tidak mengeksekusi JS."""
    src = (ROOT / "js" / "descriptions.js").read_text(encoding="utf-8")
    m = re.findall(r"^\s*(\d+):\s*(?:\"(.*?)(?<!\\)\"|'((?:.*?)(?<!\\))')", src, re.M | re.S)
    out = {}
    for k, dq, sq in m:
        text = dq if dq else sq
        if text is None:
            continue
        text = text.replace('\\"', '"').replace("\\'", "'")
        out[int(k)] = text
    return out


DESCS = build_descriptions_map()
FALLBACK_DESC = (
    "Item selecionado por volume real de pedidos, nota média alta e envio internacional "
    "pelo AliExpress. O preço e a disponibilidade podem mudar a qualquer momento — "
    "confirme no anúncio oficial antes de comprar."
)


def why_card(p: dict) -> str:
    """Blok 'Por que está na curadoria' — hanya fakta dari data."""
    bits = []
    if p.get("sold"):
        bits.append(f"<strong>{E(p['sold'])}</strong> de pedidos registrados no anúncio")
    if p.get("rating"):
        bits.append(f"nota <strong>{E(p['rating'])}/5</strong> nas avaliações do AliExpress")
    d = p.get("discount")
    if d:
        bits.append(f"desconto real de <strong>-{E(d)}%</strong> em relação ao preço de referência")
    if not bits:
        bits.append("passou no filtro de curadoria: avaliação, vendas e preço compatíveis")
    return " | ".join(bits)


# Blok JS untuk tombol "Copiar link" — KONSTANTA di luar f-string karena
# kurung kurawal JavaScript bentrok dengan sintaks f-string.
COPY_SCRIPT = """  <script>
    // Copiar link — tombol kecil di baris share
    document.querySelectorAll('.s-cp').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-copy') || location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            var old = btn.textContent; btn.textContent = 'Link copiado!';
            setTimeout(function () { btn.textContent = old; }, 1600);
          });
        } else {
          window.prompt('Copie o link:', url);
        }
      });
    });
  </script>
"""


def main() -> None:
    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    if OUT.exists():
        shutil.rmtree(OUT)

    cdate = price_date()
    made = 0
    for p in products:
        pid = p.get("id")
        if pid is None:
            continue
        slug = f"{slugify(p.get('name'))}-{pid}"
        url = f"{SITE}/produto/{slug}/"
        name = p.get("name") or "Produto AliFind"
        img = p.get("image") or ""
        price = p.get("price") or ""
        orig = p.get("originalPrice")
        disc = p.get("discount")
        rating = p.get("rating")
        sold = p.get("sold")
        badge = p.get("badge")
        cats = p.get("categories") or []
        desc = DESCS.get(pid, FALLBACK_DESC)
        price_num = brl_to_num(price)
        orig_num = brl_to_num(orig)

        # Kategori primer untuk link internal
        cat_links = []
        for c in cats:
            if c in CAT_LABEL:
                cslug, clabel = CAT_LABEL[c]
                cat_links.append(f'<a href="{SITE}/categoria/{cslug}/">{E(clabel)}</a>')
        cat_html = " · ".join(dict.fromkeys(cat_links)) or '<a href="{SITE}/">vitrine</a>'

        price_html = f'<span class="price">{E(price)}</span>'
        if orig_num and price_num and orig_num > price_num:
            price_html += f' <s class="orig">{E(orig)}</s>'
        if disc:
            price_html += f' <span class="off">-{E(disc)}%</span>'

        meta_bits = []
        if rating:
            meta_bits.append(f'<span class="star">★ {E(rating)}/5</span>')
        if sold:
            meta_bits.append(f"{E(sold)} vendidos")
        meta_html = '<span class="meta">' + " · ".join(meta_bits) + "</span>" if meta_bits else ""

        badge_html = f'<span class="badge">{E(badge)}</span>' if badge else ""

        # JSON-LD Product — hanya sertakan rating/offers yang benar-benar tampil.
        offers = {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "availability": "https://schema.org/InStock",
            "url": p.get("affiliateLink") or url,
            "price": price_num if price_num is not None else None,
            "priceValidUntil": f"{TODAY[:4]}-12-31",
        }
        offers = {k: v for k, v in offers.items() if v is not None}
        product_ld = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "image": [img] if img else [],
            "description": desc,
            "sku": str(p.get("product_id") or pid),
            "url": url,
            "offers": offers,
            "isPartOf": {"@type": "WebSite", "name": "AliFind", "url": f"{SITE}/"},
        }
        # Jangan sertakan aggregateRating tanpa reviewCount asli — Google
        # menolak ratingValue tanpa jumlah ulasan yang benar-benar tampil.
        breadcrumb_ld = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "AliFind", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": name, "item": url},
            ],
        }

        title = f"{name} | AliFind"
        desc_meta = f"{desc[:150].strip()}"
        # Escape "</" agar tidak menutup tag <script> lebih awal
        ld_product = json.dumps(product_ld, ensure_ascii=False).replace("</", "<\\/")
        ld_bread = json.dumps(breadcrumb_ld, ensure_ascii=False).replace("</", "<\\/")
        # URL share (di-quote) — dipakai tombol WhatsApp/Pinterest/Telegram
        from urllib.parse import quote as _q
        share_txt = f"{name} — {price}" + (f" (-{disc}%)" if disc else "")
        url_q = _q(url, safe="")
        img_q = _q(img or "", safe="")
        share_q = _q(share_txt, safe="")
        wa_q = _q(share_txt + "\n" + url, safe="")
        page = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{E(title)}</title>
  <meta name="description" content="{E(desc_meta)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/png" href="/favicon.png">
  <meta property="og:title" content="{E(name)}">
  <meta property="og:description" content="{E(desc_meta)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{E(img)}">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{E(img)}">
  <script type="application/ld+json">{ld_product}</script>
  <script type="application/ld+json">{ld_bread}</script>
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
           margin: 0; background: #faf6f0; color: #232019; line-height: 1.6; }}
    .wrap {{ max-width: 980px; margin: 0 auto; padding: 0 18px; }}
    header {{ background: #232019; color: #f1eadf; }}
    header .wrap {{ display: flex; justify-content: space-between; align-items: center; padding-block: 14px; }}
    .logo {{ font-weight: 800; font-size: 20px; color: #fff; text-decoration: none; letter-spacing: .5px; }}
    .logo span {{ color: #e85d4a; }}
    .back {{ color: #ffd9a8; text-decoration: none; font-size: 13px; font-weight: 600; }}
    main {{ padding-block: 28px 48px; }}
    .badge {{ display: inline-block; background: #232019; color: #fff; font-size: 11px;
              font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase;
              letter-spacing: .06em; }}
    .grid {{ display: grid; grid-template-columns: 1fr; gap: 28px; margin-top: 18px; }}
    @media (min-width: 768px) {{ .grid {{ grid-template-columns: 1fr 1fr; }} }}
    .imgbox {{ background: #fff; border-radius: 18px; overflow: hidden; border: 1px solid #eadfcd; }}
    .imgbox img {{ width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }}
    .off {{ background: #c9432f; color: #fff; font-weight: 800; font-size: 13px;
            padding: 3px 10px; border-radius: 999px; }}
    .price {{ font-size: 28px; font-weight: 800; }}
    .orig {{ font-size: 15px; color: #6f685c; font-weight: 400; margin-left: 8px; }}
    .meta {{ display: inline-block; font-size: 13px; color: #6f685c; margin-top: 6px; }}
    .star {{ color: #8f5a0c; font-weight: 700; }}
    .buy {{ display: block; width: 100%; box-sizing: border-box; text-align: center;
            background: #c9432f; color: #fff; font-weight: 800; font-size: 16px;
            padding: 16px 20px; border-radius: 999px; text-decoration: none;
            margin-top: 18px; transition: background .2s; }}
    .buy:hover {{ background: #a8331f; }}
    .disclosure {{ font-size: 11.5px; color: #5f5849; text-align: center; margin: 10px 0 22px; }}
    .save {{ background: #fdf3d6; border: 1px solid #eadfcd; border-radius: 12px;
            padding: 8px 14px; font-size: 12.5px; color: #6a5227; font-weight: 600;
            display: inline-block; margin-top: 10px; }}
    .why {{ background: #faf6f0; border: 1px solid #eadfcd; border-radius: 14px;
           padding: 14px 16px; font-size: 13px; color: #6f685c; margin-top: 20px; }}
    .why b {{ color: #232019; }}
    .cats {{ font-size: 13px; color: #6f685c; margin-top: 16px; }}
    .cats a {{ color: #c9432f; font-weight: 700; }}
    h2 {{ font-size: 20px; margin: 26px 0 10px; }}
    .trust {{ display: grid; gap: 10px; margin-top: 16px; }}
    .trust div {{ background: #fff; border: 1px solid #eadfcd; border-radius: 12px;
                 padding: 12px 14px; font-size: 13px; color: #6f685c; }}
    .trust b {{ color: #232019; }}
    .pdate {{ font-size: 12px; color: #5f5849; margin-top: 14px; }}
    .share-row {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 16px; font-size: 13px; }}
    .share-label {{ color: #6f685c; font-weight: 600; }}
    .share-row a, .share-row button {{ display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 12.5px; border: 1px solid #eadfcd; background: #fff; cursor: pointer; transition: all .15s; }}
    .s-wa {{ color: #0f7a41; }}
    .s-wa:hover {{ background: #0f7a41; color: #fff; }}
    .s-pin {{ color: #c9432f; }}
    .s-pin:hover {{ background: #c9432f; color: #fff; }}
    .s-tg {{ color: #2c6f9c; }}
    .s-tg:hover {{ background: #2c6f9c; color: #fff; }}
    .s-cp {{ color: #6f685c; }}
    .s-cp:hover {{ background: #6f685c; color: #fff; }}
    footer {{ background: #232019; color: #f1eadf; }}
    footer .wrap {{ display: flex; gap: 18px; flex-wrap: wrap; padding-block: 18px; font-size: 13px; }}
    footer a {{ color: #ffd9a8; text-decoration: none; }}
  </style>
</head>
<body>
  <header><div class="wrap">
    <a class="logo" href="{SITE}/">Ali<span>Find</span></a>
    <a class="back" href="{SITE}/">← Voltar à vitrine</a>
  </div></header>
  <main class="wrap">
    <div class="badge">{E(badge or "Achado verificado")}</div>
    <div class="grid">
      <div class="imgbox"><img src="{E(img)}" alt="{E(name)}" width="800" height="800" fetchpriority="high" decoding="async"></div>
      <div>
        <h1 style="font-size:24px;line-height:1.3;margin:10px 0 8px;">{E(name)}</h1>
        <div class="price-wrap">
          {price_html}
        </div>
        {meta_html}
        <a class="buy" href="{E(p.get('affiliateLink') or '#')}" target="_blank" rel="nofollow sponsored noopener">
          Comprar no AliExpress
        </a>
        <p class="disclosure">Link de afiliado — podemos receber comissão, sem custo extra para você. Preço final é o do AliExpress.</p>
        <div class="share-row">
          <span class="share-label">Compartilhar:</span>
          <a class="s-wa" href="https://wa.me/?text={wa_q}" target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp"><i class="i-wa"></i>WhatsApp</a>
          <a class="s-pin" href="https://www.pinterest.com/pin/create/button/?url={url_q}&amp;media={img_q}&amp;description={share_q}" target="_blank" rel="noopener noreferrer" aria-label="Salvar no Pinterest">Pinterest</a>
          <a class="s-tg" href="https://t.me/share/url?url={url_q}&amp;text={share_q}" target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Telegram">Telegram</a>
          <button class="s-cp" type="button" data-copy="{E(url)}" aria-label="Copiar link">Copiar link</button>
        </div>
        <div class="why"><b>Por que está na curadoria:</b> {why_card(p)}</div>
        <div class="cats">Categoria: {cat_html}</div>
        <p class="pdate">Preço conferido em {cdate}. Oferta muda rápido — confirme o valor no anúncio.</p>
      </div>
    </div>

    <h2>Sobre este achado</h2>
    <p style="font-size:14px;color:#4a4538;">{E(desc)}</p>

    <div class="trust">
      <div><b>Chega no Brasil com rastreio</b> — a maioria leva de 7 a 15 dias úteis. Prazo e frete aparecem no AliExpress conforme seu CEP.</div>
      <div><b>Impostos na importação</b> — o AliExpress é certificado no Programa Remessa Conforme: compras até US$ 50 têm Imposto de Importação zero. O ICMS do seu estado (17% a 20%) aparece no checkout. <a href="{SITE}/legal/impostos" style="color:#c9432f;font-weight:700;">Entenda as regras</a>.</div>
      <div><b>Proteção ao Comprador AliExpress</b> — reembolso integral se o item não chegar ou vier diferente do anúncio.</div>
      <div><b>Pagamento 100% no AliExpress</b> — checkout e dados ficam só com o AliExpress. O AliFind apenas indica o link.</div>
    </div>
  </main>
  <footer><div class="wrap">
    <a href="{SITE}/">← Voltar à vitrine</a>
    <a href="{SITE}/legal/impostos">Impostos e Importação</a>
    <a href="{SITE}/legal/divulgacao-afiliado">Divulgação de afiliado</a>
    <a href="{SITE}/legal/privacidade">Privacidade</a>
    <a href="{SITE}/legal/termos">Termos</a>
    <a href="{SITE}/legal/contato">Contato</a>
  </div></footer>
{COPY_SCRIPT}
</body>
</html>
"""
        d = OUT / slug
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page, encoding="utf-8")
        made += 1

    print(f"OK: {made} halaman produk dibuat di produto/")


if __name__ == "__main__":
    main()