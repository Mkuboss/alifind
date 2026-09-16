document.addEventListener("DOMContentLoaded", () => {
  const productGrid   = document.getElementById("product-grid");
  const skeletonGrid  = document.getElementById("skeleton-grid");
  const emptyState    = document.getElementById("empty-state");
  const filterButtons = document.getElementById("filter-buttons");
  const searchInput   = document.getElementById("search-input");


  const CAT_PT = {Auto:'Auto', Beauty:'Beleza', Gadget:'Gadget', Hair:'Cabelo', Home:'Casa',
    Jewelry:'Joias', Kitchen:'Cozinha', Lashes:'Cilios', Makeup:'Maquiagem', Nails:'Unhas',
    Outdoor:'Ar livre', 'Skincare':'Pele', Storage:'Organizacao', Tools:'Ferramentas', Trending:'Em alta'};
  // ── Palette pastel per kategori: memberi variasi visual pada grid ──
  const CAT_COLORS = {
    Jewelry : { bg: '#f8eed4', fg: '#7a5a12' },
    Tools   : { bg: '#e8eef3', fg: '#3c5666' },
    Storage : { bg: '#f0e7d9', fg: '#6a5227' },
    Skincare: { bg: '#fdeee0', fg: '#96501c' },
    Kitchen : { bg: '#fcead9', fg: '#9c4a17' },
    Hair    : { bg: '#f6e5e0', fg: '#873f2c' },
    Nails   : { bg: '#fbe7f4', fg: '#9c2a72' },
    Makeup  : { bg: '#f3e8fb', fg: '#6b3596' },
    Home    : { bg: '#e2f1ed', fg: '#155f50' },
    Auto    : { bg: '#e6ecef', fg: '#33454e' },
    Lashes  : { bg: '#eee8fb', fg: '#5b3ba5' },
    Outdoor : { bg: '#e8f2e0', fg: '#3d6a26' },
    Gadget  : { bg: '#e6ecfa', fg: '#2c4c8c' },
    Beauty  : { bg: '#fde6ec', fg: '#a82b4b' },
    Trending: { bg: '#fdf3d6', fg: '#7a5c10' }
  };
  const GENERIC_CATS = new Set(['Trending','Beauty','Home','Jewelry','Tools','Storage','Gadget','Outdoor']);
  const getPrimaryCat = (cats) => {
    if (!cats || !cats.length) return 'Beauty';
    const clean = cats.filter(c => c !== 'Trending');
    const spec = clean.filter(c => !GENERIC_CATS.has(c));
    if (spec.length) return spec[spec.length - 1];
    return clean.length ? clean[clean.length - 1] : cats[cats.length - 1];
  };
  const renderCatBadges = (cats) => {
    if (!cats || !cats.length) return '';
    const primary = getPrimaryCat(cats);
    const col = CAT_COLORS[primary] || CAT_COLORS.Beauty;
    const labelStr = cats.map(c => CAT_PT[c] || c).join(' · ');
    return `<span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5 transition-colors" style="background-color:${col.bg};color:${col.fg}">${labelStr}</span>`;
  };
  const renderFilterBtn = (cat, active, _CAT_PT) => {
    if (cat === 'all') {
      const bg = active ? '#232019' : '#f1eadf';
      const fg = active ? '#ffffff' : '#5f5849';
      return `<button class="filter-btn px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors" data-category="all" style="background-color:${bg};color:${fg}">Tudo</button>`;
    }
    const col = CAT_COLORS[cat] || CAT_COLORS.Beauty;
    const bg = active ? col.bg : '#f1eadf';
    const fg = active ? col.fg : '#5f5849';
    const label = _CAT_PT[cat] || cat;
    return `<button class="filter-btn px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors" data-category="${cat}" style="background-color:${bg};color:${fg}">${label}</button>`;
  };


  // ── AliExpress CDN menyajikan beberapa ukuran dari URL yang sama: ganti segmen
  //    `_480x480q75` jadi ukuran yang benar-benar dipakai. Kartu grid ±220px,
  //    modal ±960px. Menghemat ~70% byte gambar tanpa mengubah data listing.
  //    PENTING: segmen kualitas (`q75`) wajib DIPERTAHANKAN — menghapusnya
  //    menghasilkan URL yang tidak ada (HTTP 404) dan gambar tidak muncul.
  const imgVariant = (src, size) => String(src || "")
    .replace(/_(\d+)x(\d+)(q\d+)?(?=\.)/, (m, w, h, q) => "_" + size + "x" + size + (q || ""));
  // Produk tanpa foto asli (banner AliExpress gepeng sudah dibuang di data):
  // render kotak netral + ikon, bukan gambar rusak.
  const imgTag = (src, size, cls, extra) => src
    ? `<img src="${imgVariant(src, size)}" ${extra} class="${cls}" draggable="false">`
    : `<span class="${cls} flex items-center justify-center bg-[#f1eadf] text-[#b3a893]"><i class="fa-solid fa-box-open text-2xl"></i></span>`;

  // ── WhatsApp share (trafik Brasil mayoritas via WhatsApp) ──
  // Pakai URL halaman produk (/produto/<slug>/) supaya penerima mendarat di
  // halaman yang bisa diindeks, bukan modal yang tidak punya URL sendiri.
  const slugify = (s) => String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // buang aksen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "produto";
  const productUrl = (p) => `${location.origin}/produto/${slugify(p.name)}-${p.id}/`;
  const shareBase = (p) => `${p.name} — ${p.price}${p.discount ? ` (-${p.discount}%)` : ""}`;
  const waShare = (p) => `https://wa.me/?text=${encodeURIComponent(shareBase(p) + "\n" + productUrl(p))}`;
  const pinShare = (p) => {
    const u = new URL("https://www.pinterest.com/pin/create/button/");
    u.searchParams.set("url", productUrl(p));
    u.searchParams.set("media", p.image || "");
    u.searchParams.set("description", shareBase(p));
    return u.toString();
  };
  const tgShare = (p) => `https://t.me/share/url?url=${encodeURIComponent(productUrl(p))}&text=${encodeURIComponent(shareBase(p))}`;
  const nativeShare = async (p) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: p.name, text: shareBase(p), url: productUrl(p) });
        return;
      }
    } catch (e) { /* user cancel / tidak didukung */ }
    // Fallback desktop: salin link + toast
    try {
      await navigator.clipboard.writeText(productUrl(p));
      showToast('<i class="fa-solid fa-link text-[#e8a13d]"></i> Link copiado!');
    } catch (e2) {
      window.prompt("Copie o link:", productUrl(p));
    }
  };
  const clickCopy = async (p) => {
    try {
      await navigator.clipboard.writeText(productUrl(p));
      showToast('<i class="fa-solid fa-link text-[#e8a13d]"></i> Link copiado!');
    } catch (e) {
      window.prompt("Copie o link:", productUrl(p));
    }
  };
  // ── Popover share di kartu grid (WA · Pinterest · Telegram · Copy) ──
  let sharePop = null;
  function closeSharePop() { if (sharePop) { sharePop.remove(); sharePop = null; } }
  document.addEventListener("click", (e) => {
    if (sharePop && !e.target.closest(".share-pop") && !e.target.closest("[data-share-open]")) closeSharePop();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSharePop(); });
  function openSharePop(btn, p) {
    closeSharePop();
    const d = document.createElement("div");
    d.className = "share-pop bg-white border border-[#eadfcd] rounded-2xl shadow-xl p-2 flex gap-1.5";
    // WAJIB fixed + ditempel ke <body>: kalau di dalam tombol, popover terpotong
    // oleh `overflow-y:auto` milik .sheet / kartu.
    d.style.cssText = "position:fixed;z-index:130;display:flex;gap:6px;padding:8px;background:#fff;border:1px solid #eadfcd;border-radius:16px;box-shadow:0 14px 30px -10px #23201955;";
    const mk = (href, icon, label, color) => {
      const a = document.createElement("a");
      a.className = "w-9 h-9 rounded-full flex items-center justify-center transition";
      a.style.cssText = `width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:${color};text-decoration:none;`;
      a.setAttribute("aria-label", label);
      a.title = label;
      if (href) { a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; }
      a.innerHTML = `<i class="${icon}"></i>`;
      a.addEventListener("mouseenter", () => { a.style.background = color; a.style.color = "#fff"; });
      a.addEventListener("mouseleave", () => { a.style.background = ""; a.style.color = color; });
      return a;
    };
    d.appendChild(mk(waShare(p), "fa-brands fa-whatsapp", "WhatsApp", "#128C4A"));
    d.appendChild(mk(pinShare(p), "fa-brands fa-pinterest", "Pinterest", "#c9432f"));
    d.appendChild(mk(tgShare(p), "fa-brands fa-telegram", "Telegram", "#2c6f9c"));
    // Native share (Web Share API): munculkan hanya bila didukung — di HP ini
    // membuka sheet OS dengan SEMUA app (Instagram, Messenger, email, dsb).
    if (navigator.share) {
      const n = document.createElement("button");
      n.style.cssText = "width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#232019;background:none;border:0;cursor:pointer;";
      n.setAttribute("aria-label", "Mais opções de compartilhamento");
      n.title = "Mais opções";
      n.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i>';
      n.addEventListener("mouseenter", () => { n.style.background = "#f1eadf"; });
      n.addEventListener("mouseleave", () => { n.style.background = ""; });
      n.addEventListener("click", (ev) => { ev.stopPropagation(); closeSharePop(); nativeShare(p); });
      d.appendChild(n);
    }
    const c = document.createElement("button");
    c.style.cssText = "width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#6f685c;background:none;border:0;cursor:pointer;";
    c.setAttribute("aria-label", "Copiar link");
    c.title = "Copiar link";
    c.innerHTML = '<i class="fa-solid fa-link"></i>';
    c.addEventListener("mouseenter", () => { c.style.background = "#f1eadf"; });
    c.addEventListener("mouseleave", () => { c.style.background = ""; });
    c.addEventListener("click", (ev) => { ev.stopPropagation(); clickCopy(p); closeSharePop(); });
    d.appendChild(c);

    document.body.appendChild(d);
    // Posisi: di atas tombol, di tengah, dijepit agar tidak keluar viewport
    const r = btn.getBoundingClientRect();
    const w = d.offsetWidth, h = d.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.top - h - 8;
    if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - h - 8);
    d.style.left = left + "px";
    d.style.top = top + "px";
    sharePop = d;
  }
  let allProducts    = [];
  let activeCategory = "all";
  let searchQuery    = "";

  // ── Keep the sticky filter bar glued right under the header, whatever its
  //    real height is (it changes when the browser translates the page). ──
  const hdr = document.querySelector("header");
  function syncHeaderHeight() {
    if (hdr) document.documentElement.style.setProperty("--hdr-h", hdr.offsetHeight + "px");
  }
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("load", syncHeaderHeight);
  if (window.ResizeObserver && hdr) new ResizeObserver(syncHeaderHeight).observe(hdr);
  setInterval(syncHeaderHeight, 1500);

  const BADGE_STYLE = {
    "Bestseller":  "bg-[#232019] text-white",
    "Top Seller":  "bg-[#e85d4a] text-white",
    "Trending":    "bg-[#f4c94c] text-[#5c4405]",
    "Hot":         "bg-[#c9432f] text-white",
    "New Arrival": "bg-[#1f7a5c] text-white",
  };

  // ── Update stat & marquee dari data (biar tidak hardcode basi saat nambah produk) ──
  function updateDynamicStats(products) {
    try {
      const num = s => parseFloat(String(s || "").replace("R$", "").trim().replace(/\./g, "").replace(",", ".")) || 0;
      const disc = products.map(p => parseInt(p.discount || 0, 10)).filter(n => !isNaN(n));
      const saves = products.filter(p => p.originalPrice).map(p => num(p.originalPrice) - num(p.price)).filter(n => n > 0);
      const priced = products.map(p => num(p.price)).filter(n => n > 0);
      const rated = products.map(p => parseFloat(p.rating)).filter(n => !isNaN(n));
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("stat-total", String(products.length));
      // Klaim hero & panel "como escolhemos" dihitung dari data — tidak ada angka
      // fix yang bisa basi saat katalog berubah (dulu "4.7★+" padahal ada 3,9).
      const fmt1 = n => n.toFixed(1).replace(".", ",");
      if (rated.length) {
        const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
        const el = document.getElementById("hero-avg-rating");
        if (el) el.textContent = rated.length === products.length
          ? `nota média ${fmt1(avg)}★`
          : `nota média ${fmt1(avg)}★ nas avaliações verificadas`;
        const hw = document.getElementById("how-strict-line");
        if (hw) hw.textContent = rated.length === products.length
          ? `Nota média do catálogo ${fmt1(avg)}★, checada contra as avaliações reais do AliExpress. Sem réplica de marca, sem promessa furada.`
          : `Nota média ${fmt1(avg)}★ nas ${rated.length} avaliações verificadas; o restante entra como novidade sem nota. Sem réplica de marca, sem promessa furada.`;
      }
      const discEl = document.getElementById("hero-max-disc");
      if (discEl && disc.length) discEl.textContent = `${Math.max(...disc)}% de desconto`;
      // Nota min. hanya klaim utk produk yang punya rating — kalau tidak lengkap, label jujur.
      if (rated.length === products.length && rated.length) {
        set("stat-rating", Math.min(...rated).toFixed(1).replace(".", ",") + "★+");
      } else if (rated.length) {
        set("stat-rating", Math.min(...rated).toFixed(1).replace(".", ",") + "★");
        const dts = document.querySelectorAll("dt");
        dts.forEach(dt => { if (dt.textContent.trim() === "nota mín.") dt.textContent = "nota dos aval."; });
      }
      if (disc.length) set("stat-discount", Math.max(...disc) + "%");
      // Marquee ikut data: ekonomia maks, harga termurah, jumlah item
      const maxSave = saves.length ? Math.max(...saves) : 0;
      const minPrice = priced.length ? Math.min(...priced) : 0;
      const maxDisc = disc.length ? Math.max(...disc) : 0;
      document.querySelectorAll(".marquee-track span").forEach(sp => {
        sp.innerHTML = `🔥 Descontos de até <b>${maxDisc}%</b> &nbsp;·&nbsp; 💰 Economia de até <b>R$ ${maxSave.toLocaleString("pt-BR", {maximumFractionDigits: 0})}</b> &nbsp;·&nbsp; 🪙 Achados a partir de <b>R$ ${minPrice.toLocaleString("pt-BR", {minimumFractionDigits: 2})}</b> &nbsp;·&nbsp; ✅ <b>${products.length} itens</b> verificados &nbsp;·&nbsp; 🛡️ Proteção ao Comprador AliExpress &nbsp;·&nbsp;`;
      });
    } catch (e) { /* dekorasi saja */ }
  }

  // ── Fetch products ────────────────────────────────────────────
  fetch("data/products.json")
    .then(r => { if (!r.ok) throw new Error("Could not load products"); return r.json(); })
    .then(products => {
      allProducts = products;
      updateDynamicStats(products);

      // ── SEO: JSON-LD (ItemList + Product/Offer) di-generate dari data live —
      //    harga selalu sama dengan yang tampil; tanpa aggregateRating inventado.
      try {
        const toNum = s => parseFloat(String(s).replace("R$", "").trim().replace(/\./g, "").replace(",", "."));
        // Snapshot harga: wave2 scrape SERP BR hari ini (15/09) memverifikasi harga
        // 141 produk baru; katalog lama masih bertumpu pada snapshot 14/09.
        // Kalau harga katalog disinkronkan ulang, update konstanta ini lagi.
        const PRICE_SNAPSHOT = new Date("2026-09-15T00:00:00");
        // priceValidUntil dihitung dari KALENDER lokal snapshot (bukan getTime()+TZ UTC):
        // cara lama menghasilkan off-by-one di container non-UTC (14/09 + 14d jadi 27, bukan 28).
        const validUntil = new Date(Date.UTC(
          PRICE_SNAPSHOT.getFullYear(), PRICE_SNAPSHOT.getMonth(), PRICE_SNAPSHOT.getDate() + 14
        )).toISOString().slice(0, 10);
        const ld = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "AliFind — Vitrine da semana",
          "itemListElement": products.map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
              "@type": "Product",
              "name": p.name,
              "image": p.image || undefined,
              "url": "https://mku-api.xyz/",
              "sku": "alifind-" + p.id,
              "brand": { "@type": "Brand", "name": "AliExpress" },
              "offers": {
                "@type": "Offer",
                "priceCurrency": "BRL",
                "price": toNum(p.price).toFixed(2),
                "priceValidUntil": validUntil,
                "availability": "https://schema.org/InStock",
                "url": "https://mku-api.xyz/"
              }
            }
          }))
        };
        const tag = document.createElement("script");
        tag.type = "application/ld+json";
        tag.textContent = JSON.stringify(ld);
        document.head.appendChild(tag);
        const dl = document.getElementById("price-date-label");
        if (dl) dl.textContent = "Preços em R$ verificados em " +
          PRICE_SNAPSHOT.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) + ".";
      } catch (e) { /* SEO enhancement only — never break the grid */ }

      const categories = ["all", ...new Set(products.flatMap(p => p.categories || []))];
      // Deep-link kategori: ?cat=Jewelry → langsung aktifkan filter itu (dipakai sitemap).
      try {
        const urlCat = new URLSearchParams(location.search).get("cat");
        if (urlCat && categories.includes(urlCat)) activeCategory = urlCat;
      } catch (e) {}
      filterButtons.innerHTML = categories.map(cat => renderFilterBtn(cat, cat === activeCategory, CAT_PT)).join("");
      if (activeCategory !== "all") renderProducts();

      filterButtons.addEventListener("click", e => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        activeCategory = btn.dataset.category;
        document.querySelectorAll(".filter-btn").forEach(b => {
          const c = b.dataset.category;
          const isActive = (c === activeCategory);
          b.classList.toggle("active", isActive);
          if (c === "all") {
            b.style.backgroundColor = isActive ? "#232019" : "#f1eadf";
            b.style.color = isActive ? "#ffffff" : "#5f5849";
          } else {
            const col = CAT_COLORS[c] || CAT_COLORS.Beauty;
            b.style.backgroundColor = isActive ? col.bg : "#f1eadf";
            b.style.color = isActive ? col.fg : "#5f5849";
          }
        });
        btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        renderProducts();
      });

      // ── Kartu penawaran: angka nyata dari katalog (bukan hardcode) ──
      try {
        const maxDisc = [...products].sort((a, b) => (parseInt(b.discount || 0, 10) - parseInt(a.discount || 0, 10)))[0];
        const maxSave = [...products].sort((a, b) => economia(b) - economia(a))[0];
        const cheapest = [...products].sort((a, b) => brlToNum(a.price) - brlToNum(b.price))[0];
        const put = (id, txt, nameId, name) => {
          const el = document.getElementById(id); if (el) el.textContent = txt;
          const nm = document.getElementById(nameId); if (nm) nm.textContent = name || "";
        };
        if (maxDisc) put("offer-disc", maxDisc.discount ? maxDisc.discount + "% OFF" : maxDisc.price, "offer-disc-name", maxDisc.name);
        if (maxSave) put("offer-save", fmtBRL(Math.round(economia(maxSave))), "offer-save-name", maxSave.name);
        if (cheapest) put("offer-cheap", cheapest.price, "offer-cheap-name", cheapest.name);

        // klik kartu penawaran -> urutkan grid + antar ke vitrine
        document.querySelectorAll("[data-offer]").forEach(btn => {
          btn.addEventListener("click", () => {
            activeSort = btn.dataset.offer === "menor" ? "menor" : "desconto";
            if (sortSelect) sortSelect.value = activeSort;
            try { localStorage.setItem("alifind_sort", activeSort); } catch (err) {}
            renderProducts();
            document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
      } catch (e) { /* penawaran opsional — jangan ganggu grid */ }

      renderProducts();
    })
    .catch(err => {
      skeletonGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      emptyState.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-5xl mb-4 text-[#c9432f]"></i><p class="text-lg font-semibold">Algo quebrou do nosso lado</p><p class="text-sm mt-1 text-[#6f685c]">${err.message}</p>`;
    });

  // ── Search: PT-BR aware ───────────────────────────────────────
  //    Nama produk EN, pembeli mengetik PT. Kosakata di js/search-map.js
  //    (tanpa menyentuh data listing). Aksen diabaikan: cilios = cílios.
  const norm = s => String(s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function productHaystack(p) {
    const catPt = (window.ALIFIND_CATEGORY_PT || {});
    const catsEn = (p.categories || []).join(" ");
    const catsPt = (p.categories || []).map(c => catPt[c] || "").join(" ");
    return norm(p.name + " " + catsEn + " " + catsPt);
  }

  function searchMatches(p, q) {
    const hay = productHaystack(p);
    if (hay.includes(q)) return true;                    // cocok langsung
    const syns = window.ALIFIND_SYNONYMS || {};
    const words = q.split(/\s+/).filter(Boolean);
    return words.some(w =>                               // tiap kata: cocok atau via sinonim
      hay.includes(w) || ((syns[w] || []).some(k => hay.includes(norm(k))))
    );
  }

  function renderEmptyState(q) {
    const sug = (window.ALIFIND_SUGGESTIONS || []);
    const chips = sug.map(s =>
      `<button data-suggest="${s}" class="px-4 py-2.5 rounded-full text-xs font-medium input-soft hover:border-[#e85d4a] transition">${s}</button>`
    ).join("");
    emptyState.innerHTML = `
      <i class="fa-solid fa-magnifying-glass text-5xl text-[#e2d5c0] mb-4"></i>
      <p class="text-lg font-semibold text-[#232019]">Nenhum achado encontrado.</p>
      <p class="text-sm text-[#6f685c] mt-1 mb-5">Tente outra palavra-chave ou categoria.</p>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#7a7264] mb-2.5">Talvez você esteja procurando:</p>
      <div class="flex flex-wrap justify-center gap-2">${chips}</div>`;
  }

  searchInput.addEventListener("input", e => {
    searchQuery = norm(e.target.value).trim();
    renderProducts();
  });
  emptyState.addEventListener("click", e => {            // klik saran = isi pencarian
    const s = e.target.closest("[data-suggest]");
    if (!s) return;
    searchInput.value = s.dataset.suggest;
    searchQuery = norm(s.dataset.suggest);
    renderProducts();
    document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ── Helper harga & terjual ────────────────────────────────────
  const brlToNum = s => {
    const v = parseFloat(String(s || "").replace("R$", "").trim().replace(/\./g, "").replace(",", "."));
    return isNaN(v) ? 0 : v;
  };
  const fmtBRL = v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const soldToNum = s => {
    const m = String(s || "").match(/([\d.,]+)\s*([km])?\+?/i);
    if (!m) return 0;
    const n = parseFloat(m[1].replace(",", "."));
    return isNaN(n) ? 0 : n * (m[2] ? (m[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1);
  };
  const economia = p => {
    if (!p.originalPrice) return 0;
    return Math.max(0, brlToNum(p.originalPrice) - brlToNum(p.price));
  };

  // ── Sort & jumlah hasil ───────────────────────────────────────
  const sortSelect  = document.getElementById("sort-select");
  const resultCount = document.getElementById("result-count");
  let activeSort = "relevancia";

  function sortList(list) {
    const a = [...list];
    switch (activeSort) {
      case "menor":     return a.sort((x, y) => brlToNum(x.price) - brlToNum(y.price));
      case "maior":     return a.sort((x, y) => brlToNum(y.price) - brlToNum(x.price));
      case "desconto":  return a.sort((x, y) => economia(y) - economia(x) || (parseInt(y.discount||0,10) - parseInt(x.discount||0,10)));
      case "nota":      return a.sort((x, y) => (y.rating || 0) - (x.rating || 0));
      case "vendidos":  return a.sort((x, y) => soldToNum(y.sold) - soldToNum(x.sold));
      default:          return a;
    }
  }

  function updateResultCount(n) {
    if (!resultCount) return;
    const cat = activeCategory === "all" ? "todos os achados" : (CAT_PT[activeCategory] || activeCategory);
    resultCount.innerHTML = searchQuery
      ? `<strong>${n}</strong> achado${n === 1 ? "" : "s"} para "<strong>${searchQuery}</strong>"`
      : `<strong>${n}</strong> ${n === 1 ? "achado" : "achados"} · ${cat}`;
  }

  sortSelect?.addEventListener("change", e => {
    activeSort = e.target.value;
    renderProducts();
    try { localStorage.setItem("alifind_sort", activeSort); } catch (err) {}
  });
  try {
    const saved = localStorage.getItem("alifind_sort");
    if (saved && sortSelect && [...sortSelect.options].some(o => o.value === saved)) {
      activeSort = saved; sortSelect.value = saved;
    }
  } catch (err) {}

  // ── Render ────────────────────────────────────────────────────
  function renderProducts() {
    let filtered = allProducts;

    if (activeCategory !== "all") {
      filtered = filtered.filter(p => (p.categories || []).includes(activeCategory));
    }
    if (searchQuery) {
      filtered = filtered.filter(p => searchMatches(p, searchQuery));
    }
    filtered = sortList(filtered);

    skeletonGrid.classList.add("hidden");

    if (!filtered.length) {
      productGrid.innerHTML = "";
      resultCount && (resultCount.innerHTML = `<strong>0</strong> achados para "<strong>${searchQuery}</strong>"`);
      renderEmptyState(searchQuery);
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");
    updateResultCount(filtered.length);

    // Kartu grid ±220px: pakai varian 220 (≈7 KB/gambar vs 23 KB di 480).
    // width/height eksplisit mencegah CLS saat lazy image tiba.
    const thumbDims = () => {
      const w = window.innerWidth;
      const cols = w < 640 ? 2 : (w < 768 ? 3 : (w < 1024 ? 4 : 5));
      const pad = 32, gap = w < 768 ? 12 : 16;
      return Math.max(120, Math.floor((w - pad - (cols - 1) * gap) / cols));
    };

    productGrid.innerHTML = filtered.map((p, i) => {
      const badgeCls = BADGE_STYLE[p.badge] || "bg-[#232019] text-white";
      const td = thumbDims();
      return `
      <div class="product-card rounded-2xl overflow-hidden flex flex-col fade-in" style="animation-delay:${Math.min(i,10)*40}ms"
           data-id="${p.id}">
        <div class="relative aspect-square overflow-hidden bg-[#f1eadf]">
          ${imgTag(p.image, 220, "w-full h-full object-cover transition-transform duration-500 hover:scale-105", `alt="${p.name}" loading="${i < 4 ? "eager" : "lazy"}" ${i < 4 ? 'fetchpriority="high"' : ""} decoding="async" width="${td}" height="${td}"`)}
          ${p.discount ? `<span class="absolute top-2.5 left-2.5 price-off text-white text-xs font-extrabold px-2.5 py-1 rounded-full">-${p.discount}%</span>` : ""}
          ${p.badge ? `<span class="absolute top-2.5 right-2.5 ${badgeCls} text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">${p.badge}</span>` : ""}
          <button class="fav-btn ${isFav(p.id) ? "on" : ""} absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                  data-fav="${p.id}" aria-label="Salvar nos favoritos" aria-pressed="${isFav(p.id)}">
            <i class="fa-regular fa-heart text-[15px]"></i>
          </button>
          <button class="share-btn absolute bottom-2.5 left-2.5 w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-white/90 text-[#6f685c] hover:text-[#c9432f] transition"
                  data-share-open="${p.id}" aria-label="Compartilhar ${p.name}" aria-haspopup="true">
            <i class="fa-solid fa-share-nodes text-[15px]"></i>
          </button>
        </div>

        <div class="p-3 md:p-3.5 flex flex-col flex-1">
          <div>${renderCatBadges(p.categories)}</div>
          <h3 class="font-semibold text-[12px] md:text-[12.5px] leading-snug line-clamp-2 mb-1.5 min-h-[2.4em]">
            <a href="${productUrl(p)}" data-open="${p.id}" class="text-left hover:text-[#c9432f] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e85d4a] rounded" title="${p.name}">${p.name}</a>
          </h3>

          ${(p.rating || p.sold) ? `
          <div class="flex items-center gap-2 text-[11px] text-[#4a4538] mb-3">
            ${p.rating ? `<span class="font-bold text-[#4a4538]"><i class="fa-solid fa-star text-[10px] text-[#e8a13d]" aria-hidden="true"></i> ${p.rating}</span>` : ""}
            ${p.sold ? `<span>· ${p.sold} vendidos</span>` : ""}
          </div>` : `<div class="mb-3"></div>`}

          <div class="mt-auto">
            <div class="flex items-baseline gap-1.5 mb-1">
              <span class="text-[#232019] font-extrabold text-base md:text-lg">${p.price}</span>
              ${economia(p) >= 1 ? `<span class="text-[#7a7264] text-xs line-through">${p.originalPrice}</span>` : ""}
            </div>
            ${economia(p) >= 5 ? `<p class="save-line mb-2.5"><i class="fa-solid fa-piggy-bank text-[9px]"></i> Economize ${fmtBRL(economia(p))}</p>` : '<div class="mb-2.5"></div>'}
            <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer sponsored"
              class="buy-btn block w-full text-white text-center py-2.5 rounded-full text-xs md:text-sm font-bold transition active:scale-95">
              <i class="fa-solid fa-bag-shopping mr-1"></i> Comprar no AliExpress
            </a>
            <!-- FTC 16 CFR 255.5: disclosure harus dekat & jelas dengan link, bukan hanya di footer -->
            <p class="text-[10.5px] font-medium text-[#5f5849] text-center mt-1.5 leading-tight">Link de afiliado — podemos receber comissão</p>
          </div>
        </div>
      </div>
    `}).join("");
  }

  // ══════════════════════════════════════════════════════════════
  //  WISHLIST (localStorage) — hati di kartu + drawer kanan
  // ══════════════════════════════════════════════════════════════
  const FAV_KEY = "alifind_favs_v1";
  let favs = [];
  try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { favs = []; }
  const isFav = id => favs.includes(id);

  const wishToggle   = document.getElementById("wish-toggle");
  const wishCount    = document.getElementById("wish-count");
  const wishDrawer   = document.getElementById("wish-drawer");
  const wishBackdrop = document.getElementById("wish-backdrop");
  const wishItems    = document.getElementById("wish-items");
  const wishDrawerCt = document.getElementById("wish-drawer-count");

  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
  }

  function updateFavBadge() {
    if (!wishCount) return;
    wishCount.textContent = favs.length;
    wishCount.classList.toggle("hidden-count", favs.length === 0);
    if (wishDrawerCt) wishDrawerCt.textContent = favs.length ? `(${favs.length})` : "";
  }

  function renderWishDrawer() {
    if (!wishItems) return;
    const items = allProducts.filter(p => isFav(p.id));
    if (!items.length) {
      wishItems.innerHTML = `
        <div class="text-center py-16">
          <i class="fa-regular fa-heart text-5xl text-[#e2d5c0] mb-4"></i>
          <p class="text-sm font-semibold text-[#232019]">Nenhum favorito ainda</p>
          <p class="text-xs text-[#6f685c] mt-1.5">Toque no <i class="fa-solid fa-heart text-[#e85d4a]"></i> dos achados que você quer guardar.</p>
        </div>`;
      return;
    }
    wishItems.innerHTML = items.map(p => `
      <div class="flex gap-3 bg-white border border-[#eadfcd] rounded-xl p-2.5 items-center">
          ${p.image ? `<img src="${imgVariant(p.image, 220)}" alt="${p.name}" loading="lazy" decoding="async" class="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-[#f1eadf]">` : `<span class="w-16 h-16 rounded-lg flex items-center justify-center bg-[#f1eadf] text-[#b3a893] flex-shrink-0"><i class="fa-solid fa-box-open"></i></span>`}
        <div class="min-w-0 flex-1">
          <p class="text-[12.5px] font-semibold leading-snug line-clamp-2 mb-1">${p.name}</p>
          <p class="text-[13px] font-extrabold text-[#232019]">${p.price}</p>
        </div>
        <div class="flex flex-col gap-1.5 flex-shrink-0">
          <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer sponsored"
             class="buy-btn text-white text-[10px] font-bold px-3 py-1.5 rounded-full text-center whitespace-nowrap">
            Comprar
          </a>
          <button data-remove="${p.id}" class="text-[11px] text-[#7a7264] hover:text-[#c9432f] font-medium transition">
            Remover
          </button>
        </div>
      </div>`).join("");
  }

  function toggleFav(id, btn) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    const idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); showToast(`<i class="fa-solid fa-heart text-[#e85d4a]"></i> Salvo nos favoritos`); }
    else { favs.splice(idx, 1); showToast(`<i class="fa-regular fa-heart"></i> Removido dos favoritos`); }
    saveFavs();
    updateFavBadge();
    renderWishDrawer();
    // sinkronkan semua tombol hati yang menampilkan produk ini
    document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => {
      const on = isFav(id);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
      const ic = b.querySelector("i");
      if (ic) ic.className = on ? "fa-solid fa-heart text-[15px]" : "fa-regular fa-heart text-[15px]";
    });
    const sf = document.getElementById("sheet-fav-btn");
    if (sf && currentProduct && currentProduct.id === id) syncSheetFav();
  }

  function openWishDrawer()  {
    if (!wishDrawer) return;
    if (!wishDrawer.classList.contains("open")) openOverlayHistory();
    wishDrawer.classList.add("open");  wishBackdrop.classList.add("open");  document.body.classList.add("sheet-open"); suppressCookieBanner(true);
  }
  function closeWishDrawer(fromPop) {
    if (!wishDrawer || !wishDrawer.classList.contains("open")) return;
    wishDrawer.classList.remove("open"); wishBackdrop.classList.remove("open"); document.body.classList.remove("sheet-open"); suppressCookieBanner(false);
    if (!fromPop) closeOverlayHistory();
  }

  if (wishToggle)   wishToggle.addEventListener("click", () => { renderWishDrawer(); openWishDrawer(); });
  if (wishBackdrop) wishBackdrop.addEventListener("click", closeWishDrawer);
  document.getElementById("wish-close")?.addEventListener("click", closeWishDrawer);
  document.getElementById("wish-clear")?.addEventListener("click", () => {
    if (!favs.length) return;
    favs = []; saveFavs(); updateFavBadge(); renderWishDrawer();
    document.querySelectorAll("[data-fav]").forEach(b => {
      b.classList.remove("on"); b.setAttribute("aria-pressed", "false");
      const ic = b.querySelector("i"); if (ic) ic.className = "fa-regular fa-heart text-[15px]";
    });
    showToast(`<i class="fa-solid fa-trash-can"></i> Favoritos limpos`);
  });
  if (wishItems) wishItems.addEventListener("click", e => {
    const rm = e.target.closest("[data-remove]");
    if (rm) { toggleFav(parseInt(rm.dataset.remove, 10)); return; }
    const card = e.target.closest(".product-card");
    if (card) { closeWishDrawer(); openSheet(parseInt(card.dataset.id, 10)); }
  });

  // ══════════════════════════════════════════════════════════════
  //  MODAL DETAIL PRODUK (bottom-sheet mobile / dialog desktop)
  // ══════════════════════════════════════════════════════════════
  const sheet        = document.getElementById("product-sheet");
  const sheetBackdrop= document.getElementById("sheet-backdrop");

  // ── Tombol kembali (Android / browser): tutup dulu drawer yang terbuka,
  //    baru tinggalkan halaman bila tidak ada drawer aktif. Tanpa ini,
  //    menekan "kembali" langsung keluar dari halaman dan isi di belakang berubah. ──
  let overlayDepth = 0;        // jumlah entry history milik drawer yang sedang terbuka
  function openOverlayHistory() {
    overlayDepth++;
    try { history.pushState({ afOverlay: overlayDepth }, ""); } catch (e) {}
  }
  function closeOverlayHistory() {
    if (overlayDepth <= 0) return;
    overlayDepth--;
    try { history.back(); } catch (e) {}
  }
  // Tombol kembali browser/Android: tutup drawer yang terbuka dulu.
  // Bila tidak ada drawer aktif, tidak melakukan apa-apa → browser lanjut ke halaman sebelumnya.
  window.addEventListener("popstate", () => {
    if (overlayDepth > 0) overlayDepth--;
    if (sheet?.classList.contains("open")) { closeSheet(true); return; }
    if (wishDrawer?.classList.contains("open")) { closeWishDrawer(true); }
  });
  // Banner cookie (z-[999]) di-suppress sementara saat modal/drawer terbuka
  // agar tidak menutupi tombol \"Comprar\" di mobile. Kembalikan saat modal tutup.
  function suppressCookieBanner(hide) {
    const b = document.getElementById("cookie-banner");
    if (!b) return;
    if (hide) {
      b.dataset.prevDisplay = b.style.display || "";
      b.style.display = "none";
    } else {
      b.style.display = b.dataset.prevDisplay !== undefined ? b.dataset.prevDisplay : "";
    }
  }
  const sheetBuy     = document.getElementById("sheet-buy-link");
  const sheetFav     = document.getElementById("sheet-fav-btn");
  let currentProduct = null;
  let lastFocused = null;   // elemen pemicu modal — fokus dikembalikan ke sini saat tutup

  function syncSheetFav() {
    if (!sheetFav || !currentProduct) return;
    const on = isFav(currentProduct.id);
    sheetFav.classList.toggle("text-[#e85d4a]", on);
    sheetFav.classList.toggle("text-[#6f685c]", !on);
    const ic = sheetFav.querySelector("i");
    if (ic) ic.className = on ? "fa-solid fa-heart text-lg" : "fa-regular fa-heart text-lg";
    sheetFav.setAttribute("aria-pressed", on);
  }

  // ── Produk terkait: skor tumpang-tindih kategori dulu, lalu dilengkapi yang hits ──
  const soldRank = s => soldToNum(s);
  function categoryScore(a, b) {
    const bb = (b.categories || []);
    // "Trending" bobotnya kecil: produk yang cuma sama-sama Trending
    // (mis. lampu solar vs pimple patch) jangan menang dari yang se-kategori.
    return (a.categories || []).reduce((acc, c) => {
      if (!bb.includes(c)) return acc;
      return acc + (c === "Trending" ? 0.5 : 1);
    }, 0);
  }
  function relatedProducts(p, limit = 6) {
    const scored = allProducts
      .filter(x => x.id !== p.id)
      .map(x => ({ x, s: categoryScore(p, x) }))
      .filter(o => o.s > 0);
    scored.sort((a, b2) =>
      (b2.s - a.s) ||
      ((b2.x.rating || 0) - (a.x.rating || 0)) ||
      (soldRank(b2.x.sold) - soldRank(a.x.sold)));
    const picked = scored.slice(0, limit).map(o => o.x);
    if (picked.length < limit) {
      const trending = allProducts.filter(x =>
        x.id !== p.id && !picked.some(y => y.id === x.id) &&
        (x.categories || []).includes("Trending"));
      trending.sort((a, b) => (soldRank(b.sold) - soldRank(a.sold)) || ((b.rating||0) - (a.rating||0)));
      picked.push(...trending.slice(0, limit - picked.length));
    }
    return picked;
  }

  function renderRelated(p) {
    const wrap = document.getElementById("sheet-related");
    const list = document.getElementById("sheet-related-list");
    if (!wrap || !list) return;
    const items = relatedProducts(p);
    if (!items.length) { wrap.style.display = "none"; return; }
    wrap.style.display = "";
    list.innerHTML = items.map(r => `
      <button class="related-card flex-shrink-0 w-[122px] text-left bg-white border border-[#eadfcd] rounded-xl overflow-hidden transition active:scale-95 hover:border-[#e85d4a]"
              data-related="${r.id}" aria-label="Ver ${r.name}">
        <span class="relative block aspect-square bg-[#f1eadf] overflow-hidden">
          ${r.image ? `<img src="${imgVariant(r.image, 220)}" alt="${r.name}" loading="lazy" decoding="async" class="w-full h-full object-cover">` : `<span class="w-full h-full flex items-center justify-center text-[#b3a893]"><i class="fa-solid fa-box-open text-xl"></i></span>`}
          ${parseInt(r.discount || 0, 10) >= 50 ? `<span class="absolute top-1.5 left-1.5 price-off text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">-${r.discount}%</span>` : ""}
        </span>
        <span class="block p-2">
          <span class="block text-[10.5px] leading-tight line-clamp-2 mb-1 text-[#232019]">${r.name}</span>
          <span class="block font-extrabold text-[12px] text-[#232019]">${r.price}</span>
          <span class="block text-[10.5px] text-[#4a4538] mt-0.5"><i class="fa-solid fa-star text-[#e8a13d] text-[8px]"></i> ${r.rating} · ${r.sold}</span>
        </span>
      </button>`).join("");
    list.scrollTop = 0;
  }

  // klik kartu terkait -> ganti isi modal (jelajah berantai, tidak buka tab baru)
  document.getElementById("sheet-related-list")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-related]");
    if (!btn) return;
    openSheet(parseInt(btn.dataset.related, 10));
  });

  function openSheet(id, fromPop) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    // deep-link dari browser history: jangan tambah entry baru
    const wasOpen = sheet.classList.contains("open");
    if (!wasOpen && !fromPop) openOverlayHistory();
    currentProduct = p;

    // Modal: gambar besar layak 960.
    document.getElementById("sheet-img").src = imgVariant(p.image, 960);
    document.getElementById("sheet-img").alt = p.name;
    document.getElementById("sheet-img").style.display = p.image ? "" : "none";
    document.getElementById("sheet-title").textContent = p.name;
    const descs = (window.ALIFIND_DESC || {});
    const descEl = document.getElementById("sheet-desc");
    if (descEl) {
      descEl.textContent = descs[p.id] || window.ALIFIND_DESC_FALLBACK || "";
    }
    // "Por que está na curadoria" — dibangun dari angka produk itu sendiri
    const whyEl = document.getElementById("sheet-why");
    if (whyEl) {
      const catsPt = (p.categories || []).map(c => (window.ALIFIND_CATEGORY_PT || {})[c] || c).join(", ");
      const bits = [];
      if (p.sold)   bits.push(`<strong>${p.sold} pedidos</strong> no AliExpress`);
      if (p.rating) bits.push(`nota <strong>${p.rating}★</strong>`);
      if (p.discount) bits.push(`<strong>${p.discount}% de desconto</strong> sobre o preço de referência`);
      if (catsPt)   bits.push(`categoria ${catsPt}`);
      whyEl.innerHTML = bits.length
        ? "Selecionado por " + bits.join(", ") + ". Preço conferido na data indicada acima."
        : window.ALIFIND_DESC_FALLBACK || "";
    }
    document.getElementById("sheet-category").textContent = (p.categories || []).map(c => CAT_PT[c] || c).join(" · ");
    // Rating/sold opsional: produk baru belum punya data → sembunyikan badge bintang kalau kosong.
    try {
      const srow2 = document.getElementById("sheet-rating")?.closest("span");
      if (srow2) srow2.style.display = p.rating ? "" : "none";
      const srow3 = document.getElementById("sheet-sold");
      if (srow3) srow3.style.display = p.sold ? "" : "none";
      const soldSep = document.getElementById("sheet-sold")?.previousElementSibling;
      if (soldSep && soldSep.textContent === "·" && (!p.rating || !p.sold)) soldSep.style.display = "none";
      else if (soldSep) soldSep.style.display = "";
    } catch (err) {}
    document.getElementById("sheet-rating").textContent = p.rating || "";
    document.getElementById("sheet-sold").textContent = p.sold ? `${p.sold} vendidos` : "";
    // Blok kepercayaan: sebut nama produk + tanggal verifikasi harga
    const tName = document.getElementById("sheet-trust-name");
    if (tName) tName.textContent = p.name;
    const tDate = document.getElementById("sheet-trust-date");
    if (tDate) {
      // Ambil HANYA tanggalnya dari label harga global — menempelkan kalimat
      // utuh membuat "conferidos Preços em R$ verificados em ..." berulang.
      const dl2 = document.getElementById("price-date-label");
      const raw = dl2 && dl2.textContent ? dl2.textContent : "";
      const m = raw.match(/(\d{2}\/\d{2}\/\d{4})/);
      const when = m ? ` em ${m[1]}` : " hoje";
      tDate.innerHTML = `<i class="fa-solid fa-circle-check text-[#1f7a5c] mr-1"></i>Preço conferido${when}. Oferta muda rápido — confirme o valor final na página do AliExpress antes de comprar.`;
    }
    document.getElementById("sheet-price").textContent = p.price;
    sheetBuy.href = p.affiliateLink;
    try {
      const sv = (typeof economia === "function") ? economia(p) : 0;
      const srow = document.getElementById("sheet-save");
      const stxt = document.getElementById("sheet-save-text");
      if (srow && stxt) {
        // WAJIB reset teksnya, bukan cuma disembunyikan: kalau tidak, produk
        // tanpa diskon menampilkan angka penghematan milik produk sebelumnya.
        if (sv >= 5) {
          stxt.textContent = "Economize " + fmtBRL(sv);
          srow.style.display = "";
        } else {
          stxt.textContent = "";
          srow.style.display = "none";
        }
      }
    } catch (err) {}

    const op = document.getElementById("sheet-orig-price");
    const orig = (typeof economia === "function") ? economia(p) : 0;
    // Harga coret hanya bermakna kalau memang lebih tinggi dari harga jual.
    // Di katalog ada produk dengan originalPrice == price (tanpa desconto) —
    // menampilkan coret yang sama besar menyesatkan pembeli.
    if (orig >= 1) {
      op.textContent = p.originalPrice;
      op.style.display = "";
    } else {
      op.textContent = "";
      op.style.display = "none";
    }

    const bd = document.getElementById("sheet-badge");
    bd.textContent = p.badge || "";
    bd.className = "text-[11px] font-bold px-3 py-1 rounded-full tracking-wide " +
      (BADGE_STYLE[p.badge] || "bg-[#232019] text-white");
    bd.style.visibility = p.badge ? "visible" : "hidden";  // tetap makan ruang: X jangan pindah ke kiri

    const dc = document.getElementById("sheet-discount");
    dc.textContent = p.discount ? `-${p.discount}%` : "";
    dc.style.display = p.discount ? "" : "none";

    syncSheetFav();
    renderRelated(p);
    const shBtn = document.getElementById("sheet-share-btn");
    if (shBtn) {
      shBtn.onclick = (e) => { e.stopPropagation(); openSharePop(shBtn, p); };
    }
    const _si = document.getElementById("sheet-img");
    if (_si) { _si.alt = p.name || "Foto do produto"; }
    sheet.classList.add("open");
    sheetBackdrop.classList.add("open");
    document.body.classList.add("sheet-open");
    suppressCookieBanner(true);
    sheet.scrollTop = 0;
    // Fokus dipindah ke dalam dialog (WCAG 2.4.3): pembaca layar & Tab
    // langsung ikut ke isi modal, bukan tertinggal di kartu belakang.
    lastFocused = document.activeElement;
    setTimeout(() => document.getElementById("sheet-close")?.focus(), 60);
  }

  function closeSheet(fromPop) {
    if (!sheet.classList.contains("open")) return;
    sheet.classList.remove("open");
    sheetBackdrop.classList.remove("open");
    document.body.classList.remove("sheet-open");
    suppressCookieBanner(false);
    currentProduct = null;
    // kembalikan fokus ke elemen pemicu tadi
    try { lastFocused?.focus(); } catch (e) {}
    // selaraskan history: tombol X / backdrop / Escape juga "memakan" entry overlay
    if (!fromPop) closeOverlayHistory();
  }

  if (sheetFav) sheetFav.addEventListener("click", () => { if (currentProduct) toggleFav(currentProduct.id); });
  if (sheetBackdrop) sheetBackdrop.addEventListener("click", closeSheet);
  document.getElementById("sheet-close")?.addEventListener("click", closeSheet);
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (wishDrawer?.classList.contains("open")) closeWishDrawer();
    else if (sheet?.classList.contains("open")) closeSheet();
  });

  // ══════════════════════════════════════════════════════════════
  //  TOAST
  // ══════════════════════════════════════════════════════════════
  function showToast(html) {
    const wrap = document.getElementById("toast-wrap");
    if (!wrap) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    wrap.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s, transform .3s"; t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 1900);
    setTimeout(() => t.remove(), 2300);
  }

  // ══════════════════════════════════════════════════════════════
  //  KLIK KARTU: seluruh kartu bisa dibuka (hati & tombol beli dikecualikan)
  // ══════════════════════════════════════════════════════════════
  productGrid.addEventListener("click", e => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) { e.preventDefault(); e.stopPropagation(); toggleFav(parseInt(favBtn.dataset.fav, 10)); return; }
    const shBtn = e.target.closest("[data-share-open]");
    if (shBtn) {
      e.preventDefault(); e.stopPropagation();
      const pr = allProducts.find(x => x.id === parseInt(shBtn.dataset.shareOpen, 10));
      if (pr) openSharePop(shBtn, pr);
      return;
    }
    if (e.target.closest("a")) return;   // beli & judul (link produk) jalan sendiri
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) { e.preventDefault(); openSheet(parseInt(openBtn.dataset.open, 10)); return; }
    const card = e.target.closest(".product-card");
    if (card) openSheet(parseInt(card.dataset.id, 10));
  });

  // Keyboard: tombol judul eksplisit per kartu (bukan role=button di div —
  // nested-interactive WCAG karena ada <a> & <button> di dalam kartu).
  productGrid.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".product-card");
    if (card) { e.preventDefault(); openSheet(parseInt(card.dataset.id, 10)); }
  });

  // ══════════════════════════════════════════════════════════════
  //  ANALYTICS: Event tracking untuk GA4 (klik tombol Beli)
  // ══════════════════════════════════════════════════════════════
  function trackOutbound(id, name, link, location) {
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "select_content", {
          content_type: "product",
          item_id: String(id),
          item_name: name,
          location_name: location,
          destination_url: link
        });
      }
    } catch (err) {}
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("a.buy-btn, #sheet-buy-link");
    if (!a) return;
    const card = a.closest(".product-card, #product-sheet, #wish-drawer");
    const id = card ? (card.dataset.id || (currentProduct ? currentProduct.id : "")) : "";
    const name = card?.querySelector("h3, h2, .font-semibold")?.textContent?.trim() || "";
    const loc = a.id === "sheet-buy-link" ? "sheet" : (a.closest("#wish-drawer") ? "wishlist" : "grid");
    trackOutbound(id, name, a.href, loc);
  }, true);

  // ── Floating kompak (mobile): begitu keluar dari hero (Y > 80px), header berubah
  //    menjadi bilah kompak yang menempel di atas — konsisten baik saat scroll turun
  //    maupun scroll naik. Kembali normal hanya saat Y <= 80px. Desktop tidak disentuh.
  try {
    let lastY = window.scrollY, downFrom = null;
    const mq = window.matchMedia("(max-width: 767px)");
    const onScrollCompact = () => {
      if (!mq.matches) {
        document.body.classList.remove("hdr-hidden", "compact");
        lastY = window.scrollY; downFrom = null;
        return;
      }
      const y = window.scrollY;
      if (y <= 80) {
        document.body.classList.remove("hdr-hidden", "compact");
        downFrom = null;
      } else {
        // Begitu melewati 80px (keluar dari hero atas), tetap konsisten floating kompak
        // baik ditarik ke bawah maupun ditarik ke atas.
        document.body.classList.add("hdr-hidden", "compact");
      }
      lastY = y;
    };
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onScrollCompact(); ticking = false; });
    }, { passive: true });
    mq.addEventListener?.("change", onScrollCompact);
    onScrollCompact();
  } catch (err) {}

  // ── Tombol kembali ke atas ────────────────────────────────
  const backTop = document.getElementById("back-top");
  function syncBackTop() {
    if (!backTop) return;
    backTop.classList.toggle("show", window.scrollY > 700);
  }
  window.addEventListener("scroll", syncBackTop, { passive: true });
  syncBackTop();
  backTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  updateFavBadge();
});

