document.addEventListener("DOMContentLoaded", () => {
  const productGrid   = document.getElementById("product-grid");
  const skeletonGrid  = document.getElementById("skeleton-grid");
  const emptyState    = document.getElementById("empty-state");
  const filterButtons = document.getElementById("filter-buttons");
  const searchInput   = document.getElementById("search-input");

  let allProducts    = [];
  let activeCategory = "all";
  let searchQuery    = "";

  // ── Fetch produk ──────────────────────────────────────────────
  fetch("data/products.json")
    .then(r => { if (!r.ok) throw new Error("Gagal ambil data"); return r.json(); })
    .then(products => {
      allProducts = products;

      // Bangun tombol filter kategori dari data
      const categories = ["all", ...new Set(products.flatMap(p => p.categories || []))];
      filterButtons.innerHTML = categories.map(cat => `
        <button class="filter-btn ${cat === "all" ? "active" : ""} px-5 py-1.5 rounded-full text-xs md:text-sm font-medium"
          data-category="${cat}">
          ${cat === "all" ? "Semua" : cat}
        </button>
      `).join("");

      // Event filter
      filterButtons.addEventListener("click", e => {
        const btn = e.target.closest(".filter-btn");
        if (!btn) return;
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.dataset.category;
        renderProducts();
      });

      renderProducts();
    })
    .catch(err => {
      skeletonGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      emptyState.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-5xl mb-4 text-red-500"></i><p class="text-lg font-medium text-red-400">Gagal memuat produk</p><p class="text-sm mt-1 text-gray-500">${err.message}</p>`;
    });

  // ── Search ────────────────────────────────────────────────────
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderProducts();
  });

  // ── Render ────────────────────────────────────────────────────
  function renderProducts() {
    let filtered = allProducts;

    if (activeCategory !== "all") {
      filtered = filtered.filter(p => (p.categories || []).includes(activeCategory));
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery));
    }

    // Sembunyikan skeleton
    skeletonGrid.classList.add("hidden");

    if (filtered.length === 0) {
      productGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    productGrid.classList.remove("hidden");
    productGrid.classList.add("grid");

    productGrid.innerHTML = filtered.map(p => `
      <div class="bg-[#121216] rounded-2xl border border-[#1e1e24] overflow-hidden product-card flex flex-col">

        <!-- Gambar + badge -->
        <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer" class="block relative pt-[100%] bg-[#1a1a1f] overflow-hidden">
          <img
            src="${p.image}"
            alt="${p.name}"
            class="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            onerror="this.src='https://placehold.co/400x400/1a1a1f/666?text=No+Image'"
          >
          ${p.discount ? `<span class="absolute top-2.5 left-2.5 buy-btn text-white text-[11px] font-bold px-2.5 py-1 rounded-full badge-pulse">-${p.discount}</span>` : ""}
          ${p.badge ? `<span class="absolute top-2.5 right-2.5 bg-cyan-400 text-[#04252b] text-[11px] font-bold px-2.5 py-1 rounded-full">${p.badge}</span>` : ""}
        </a>

        <!-- Info -->
        <div class="p-4 flex flex-col flex-grow">
          <div class="text-[10px] text-cyan-400 uppercase tracking-wider mb-1.5">${(p.categories || []).slice(0,1).join("")}</div>
          <h3 class="text-gray-100 font-semibold text-sm leading-snug line-clamp-2 mb-2" title="${p.name}">${p.name}</h3>

          <!-- Rating + terjual -->
          <div class="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <span class="text-amber-400 font-bold"><i class="fa-solid fa-star text-[10px]"></i> ${p.rating}</span>
            <span>· ${p.sold} orders</span>
          </div>

          <!-- Harga -->
          <div class="mt-auto">
            <div class="flex items-baseline gap-1.5 mb-3">
              <span class="text-white font-extrabold text-base md:text-lg">${p.price}</span>
              ${p.originalPrice ? `<span class="text-gray-600 text-xs line-through">${p.originalPrice}</span>` : ""}
            </div>
            <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer"
              class="buy-btn block w-full text-white text-center py-2.5 rounded-full text-xs md:text-sm font-bold transition active:scale-95">
              <i class="fa-solid fa-cart-shopping mr-1"></i> Beli Sekarang
            </a>
          </div>
        </div>
      </div>
    `).join("");
  }
});
