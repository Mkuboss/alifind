document.addEventListener("DOMContentLoaded", () => {
  const productGrid   = document.getElementById("product-grid");
  const skeletonGrid  = document.getElementById("skeleton-grid");
  const emptyState    = document.getElementById("empty-state");
  const filterButtons = document.getElementById("filter-buttons");
  const searchInput   = document.getElementById("search-input");
  const totalEl       = document.getElementById("total-products");

  let allProducts   = [];
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
        <button class="filter-btn ${cat === "all" ? "active" : ""} px-4 py-1.5 rounded-full border border-white text-sm font-medium hover:bg-white hover:text-red-600 transition"
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
      emptyState.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-5xl mb-4 text-red-400"></i><p class="text-lg font-medium text-red-500">Gagal memuat produk</p><p class="text-sm mt-1">${err.message}</p>`;
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
    totalEl.textContent = filtered.length;

    if (filtered.length === 0) {
      productGrid.classList.remove("grid");
      productGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    productGrid.classList.remove("hidden");
    productGrid.classList.add("grid");

    productGrid.innerHTML = filtered.map(p => `
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden product-card flex flex-col shadow-sm">

        <!-- Gambar + badge -->
        <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer" class="block relative pt-[100%] bg-gray-100 overflow-hidden">
          <img
            src="${p.image}"
            alt="${p.name}"
            class="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            onerror="this.src='https://placehold.co/400x400?text=No+Image'"
          >
          ${p.discount ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded badge-pulse">-${p.discount}</span>` : ""}
          ${p.badge ? `<span class="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded">${p.badge}</span>` : ""}
        </a>

        <!-- Info -->
        <div class="p-3 flex flex-col flex-grow">
          <h3 class="text-gray-800 font-medium text-xs md:text-sm line-clamp-2 mb-1" title="${p.name}">${p.name}</h3>

          <!-- Rating + terjual -->
          <div class="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <span class="text-yellow-400"><i class="fa-solid fa-star text-[10px]"></i> ${p.rating}</span>
            <span>· ${p.sold} terjual</span>
          </div>

          <!-- Harga -->
          <div class="mt-auto">
            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-red-600 font-bold text-sm md:text-base">${p.price}</span>
              ${p.originalPrice ? `<span class="text-gray-300 text-xs line-through">${p.originalPrice}</span>` : ""}
            </div>
            <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer"
              class="block w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white text-center py-2 rounded-lg text-xs md:text-sm font-semibold transition">
              <i class="fa-solid fa-cart-shopping mr-1"></i> Beli Sekarang
            </a>
          </div>
        </div>
      </div>
    `).join("");
  }
});
