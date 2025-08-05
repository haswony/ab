// Admin dashboard logic: Google Sign-In gate for single admin email,
// upload image to Firebase Storage, create product in Realtime Database,
// and list existing products.

(function () {
  const { auth, db, storage } = window.firebaseRefs || {};
  const { ADMIN_EMAIL, formatPrice } = window.helpers || {};

  const gateMsg = document.getElementById("gateMsg");
  const adminFormSec = document.getElementById("adminFormSec");

  // Form elements
  const nameEl = document.getElementById("name");
  const priceEl = document.getElementById("price");
  const descEl = document.getElementById("description");
  const imageEl = document.getElementById("image");
  const preview = document.getElementById("preview");
  const saveBtn = document.getElementById("saveBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("status");

  // Admin product list
  const adminGrid = document.getElementById("adminGrid");

  let selectedFile = null;
  let products = [];

  // Auth gate
  auth.onAuthStateChanged(user => {
    const isAdmin = user?.email === ADMIN_EMAIL;
    if (!user) {
      gateMsg.textContent = "الرجاء تسجيل الدخول بحساب Google للوصول إلى لوحة المشرف.";
      adminFormSec.hidden = true;
      return;
    }
    if (!isAdmin) {
      gateMsg.textContent = "هذا الحساب غير مخول. فقط المشرف المصرح له يمكنه الإضافة أو التعديل.";
      adminFormSec.hidden = true;
      return;
    }
    gateMsg.textContent = "";
    adminFormSec.hidden = false;
  });

  // Image preview
  imageEl.addEventListener("change", (e) => {
    selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      preview.innerHTML = `<img src="${url}" alt="معاينة الصورة" />`;
    } else {
      preview.textContent = "لا توجد صورة محددة بعد.";
    }
  });

  // Save product
  saveBtn.addEventListener("click", async () => {
    status("");
    disableForm(true);
    try {
      const user = auth.currentUser;
      if (!user || user.email !== ADMIN_EMAIL) throw new Error("غير مصرح");

      // Basic validation
      const name = (nameEl.value || "").trim();
      const price = Number(priceEl.value || 0);
      const description = (descEl.value || "").trim();
      if (!name) throw new Error("يرجى إدخال اسم المنتج");
      if (!price || price < 0) throw new Error("يرجى إدخال سعر صحيح");

      // Create product key
      const ref = db.ref("products").push();
      const id = ref.key;

      // Optional image upload
      let imageUrl = "";
      if (selectedFile) {
        const safeName = selectedFile.name.replace(/\s+/g, "-");
        const path = `product-images/${id}/${Date.now()}-${safeName}`;
        const task = storage.ref(path).put(selectedFile);
        await task;
        imageUrl = await storage.ref(path).getDownloadURL();
      }

      const now = Date.now();
      await ref.set({
        name,
        description,
        price,
        imageUrl,
        createdAt: now,
        createdByEmail: user.email
      });

      status("تم حفظ المنتج بنجاح ✔");
      clearForm();
    } catch (err) {
      console.error(err);
      status("حدث خطأ: " + (err && err.message ? err.message : err), true);
    } finally {
      disableForm(false);
    }
  });

  clearBtn.addEventListener("click", clearForm);

  function clearForm() {
    nameEl.value = "";
    priceEl.value = "";
    descEl.value = "";
    imageEl.value = "";
    selectedFile = null;
    preview.textContent = "لا توجد صورة محددة بعد.";
  }

  function disableForm(disabled) {
    [nameEl, priceEl, descEl, imageEl, saveBtn, clearBtn].forEach(el => el.disabled = disabled);
  }

  function status(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "#fecaca" : "#93c5fd";
  }

  // Admin list view (read-only list with basic info)
  function renderAdminList(list) {
    adminGrid.innerHTML = "";
    if (!list || list.length === 0) {
      adminGrid.innerHTML = `<div class="empty"><p>لا توجد منتجات حالياً.</p></div>`;
      return;
    }
    list.forEach(p => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="thumb">
          ${p.imageUrl ? `<img loading="lazy" src="${p.imageUrl}" alt="${escapeHtml(p.name)}" />` : `<div class="skel" aria-hidden="true"></div>`}
        </div>
        <div class="body">
          <div class="title">${escapeHtml(p.name)}</div>
          <div class="desc">${escapeHtml(p.description || "")}</div>
          <div class="price-row">
            <div class="price">${formatPrice(Number(p.price || 0))}</div>
            <button type="button" class="add-btn" data-id="${p.id}">حذف</button>
          </div>
        </div>
      `;
      const delBtn = card.querySelector(".add-btn");
      delBtn.addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
        try {
          const user = auth.currentUser;
          if (!user || user.email !== ADMIN_EMAIL) throw new Error("غير مصرح");
          await db.ref("products").child(p.id).remove();
          status("تم حذف المنتج");
          // Optionally: delete images under product-images/p.id (requires listing, which needs additional rules).
        } catch (e) {
          status("تعذر الحذف: " + (e && e.message ? e.message : e), true);
        }
      });
      adminGrid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/'/g, "&#039;");
  }

  function startAdminListener() {
    const ref = db.ref("products").orderByChild("createdAt");
    ref.on("value", snap => {
      const val = snap.val() || {};
      products = Object.entries(val)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      renderAdminList(products);
    });
  }

  if (db && storage) startAdminListener();
})();
