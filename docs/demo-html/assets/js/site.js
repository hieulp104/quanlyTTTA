(function () {
  const db = GS.load();
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Menu điện thoại
  const nav = $("#nav"), btn = $("#menuBtn");
  btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
  nav.addEventListener("click", (e) => { if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });

  // Nút "Học thử" ở từng khóa -> chọn sẵn khóa trong form
  document.querySelectorAll("[data-course]").forEach((a) => a.addEventListener("click", () => {
    const sel = $("#courseSelect");
    [...sel.options].forEach((o) => { if (o.text === a.dataset.course) sel.value = o.value; });
  }));

  // Cơ sở
  $("#campusList").innerHTML = db.campuses.map((c) => `
    <div class="campus"><h3>${esc(c.name)}</h3><p>📍 ${esc(c.address)}</p><p>📞 <a href="tel:${esc(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a> · 🕗 ${esc(c.hours)}</p></div>`).join("");

  // Tin tức & khai giảng (quản lý cập nhật trong cổng học tập)
  const fmt = (t) => { const d = new Date(t); return { d: d.getDate(), m: "Th" + (d.getMonth() + 1), full: d.toLocaleDateString("vi-VN") }; };
  const campusName = (id) => (db.campuses.find((c) => c.id === id) || {}).name || "Cả 2 cơ sở";
  const openings = db.news.filter((n) => n.kind === "khai-giang" && n.date >= Date.now() - GS.DAY).sort((a, b) => a.date - b.date);
  $("#openingList").innerHTML = openings.length ? openings.map((n) => { const f = fmt(n.date); return `
    <div class="opening-item"><div class="opening-date"><b>${f.d}</b><small>${f.m}</small></div><div><h4>${esc(n.title)}</h4><p>${esc(campusName(n.campus))} · ${esc(n.body)}</p></div></div>`; }).join("")
    : `<p style="opacity:.8">Lịch khai giảng mới sẽ được cập nhật sớm. Bố mẹ để lại số điện thoại để được báo trước.</p>`;
  const emoji = { "su-kien": "🎉", "tin-tuc": "📰", "khai-giang": "🎒" };
  const tagName = { "su-kien": "Sự kiện", "tin-tuc": "Góc phụ huynh", "khai-giang": "Khai giảng" };
  $("#newsList").innerHTML = db.news.filter((n) => n.kind !== "khai-giang").sort((a, b) => b.date - a.date).slice(0, 4).map((n) => `
    <article class="news-item"><div class="photo"><div class="ph">${emoji[n.kind] || "📰"}</div></div>
    <div><span class="tag">${tagName[n.kind] || "Tin tức"} · ${fmt(n.date).full}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div></article>`).join("");

  // Form đăng ký -> lưu vào danh sách khách hàng tiềm năng (quản lý xem trong cổng học tập)
  $("#leadForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const phone = String(f.get("phone") || "").replace(/[^\d+]/g, "");
    const err = $("#formErr");
    if (!String(f.get("parent")).trim()) { err.textContent = "Bố mẹ nhập họ tên giúp trung tâm nhé."; return; }
    if (!/^(\+84|0)\d{9}$/.test(phone)) { err.textContent = "Số điện thoại chưa đúng. Ví dụ: 0912 345 678."; return; }
    if (!f.get("agree")) { err.textContent = "Bố mẹ tích vào ô đồng ý để trung tâm được liên hệ."; return; }
    err.textContent = "";
    db.leads.unshift({
      id: GS.uid("l"), parent: f.get("parent").trim(), phone: f.get("phone").trim(), childAge: f.get("childAge"),
      course: f.get("course"), campus: f.get("campus"), time: f.get("time"), note: f.get("note"), createdAt: Date.now(), status: "moi",
    });
    GS.save();
    $("#formWrap").innerHTML = `<div class="form-done"><div class="big">🎉</div><h2>Đã gửi đăng ký</h2><p>Cảm ơn ${esc(f.get("parent"))}. Trung tâm sẽ gọi lại số ${esc(f.get("phone"))} trong vòng 24 giờ.</p><p class="hint">(Demo: đăng ký này hiện trong mục “Đăng ký học thử” của tài khoản quản lý.)</p></div>`;
  });
})();
