// Public homepage logic: load products from Realtime Database and render grid

(function () {
  const { db } = window.firebaseRefs || {};
  const { formatPrice } = window.helpers || {};

  const grid = document.getElementById("productsGrid");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const clearSearch = document.getElementById("clearSearch");

  let products = [];
  let unsubscribe = null;

  function productCard(p) {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="thumb">
        ${p.imageUrl ? `<img loading="lazy" src="${p.imageUrl}" alt="${escapeHtml(p.name)}" />` : `<div class="skel" aria-hidden="true"></div>`}
      </div>
      <div class="body">
        <div class="title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        <div class="desc">${escapeHtml(p.description || "")}</div>
        <div class="price-row">
          <div class="price">${formatPrice(Number(p.price || 0))}</div>
          <button class="add-btn" type="button">إضافة إلى السلة</button>
        </div>
      </div>
    `;
    // "Add to cart" is placeholder as requested; just a toast-like feedback
    el.querySelector(".add-btn").addEventListener("click", () => {
      toast("تمت الإضافة (تجريبية) ✔");
    });
    return el;
  }

  function render(list) {
    grid.innerHTML = "";
    if (!list || list.length === 0) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    list.forEach(p => grid.appendChild(productCard(p)));
  }

  function filterProducts(q) {
    if (!q) return products;
    const needle = q.toLowerCase();
    return products.filter(p =>
      (p.name || "").toLowerCase().includes(needle) ||
      (p.description || "").toLowerCase().includes(needle)
    );
  }

  function startListening() {
    const ref = db.ref("products").orderByChild("createdAt");
    ref.on("value", snap => {
      const val = snap.val() || {};
      products = Object.entries(val)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      render(filterProducts(searchInput.value.trim()));
    });
    unsubscribe = () => ref.off();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed",
      insetInlineStart: "50%",
      transform: "translateX(-50%)",
      bottom: "20px",
      background: "#0b1326",
      color: "#e5e7eb",
      border: "1px solid #1f2937",
      padding: "10px 14px",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      zIndex: 9999,
      fontWeight: 700
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/'/g, "&#039;");
  }

  // Search handlers
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      render(filterProducts(searchInput.value.trim()));
    });
  }
  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      render(products);
      searchInput.focus();
    });
  }

  if (db) startListening();
})();
