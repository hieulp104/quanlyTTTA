/* Cổng học tập GoSpeak — khung ứng dụng, học viên, phụ huynh */
(function () {
  const db = GS.load();
  const S = GS.getSession();
  if (!S) { location.replace("index.html"); return; }

  // ---------- tiện ích ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const view = $("#view");
  const T = GS.TYPE_INFO;
  const byId = (list, id) => db[list].find((x) => x.id === id);

  function toast(msg, kind = "") {
    const el = document.createElement("div");
    el.className = "toast " + kind; el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function modal({ title, body, actions = [], wide = false }) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${wide ? 'style="width:min(900px,100%)"' : ""}><h2>${esc(title)}</h2><div class="modal-body"></div><div class="modal-actions"></div></div>`;
    const bodyEl = $(".modal-body", back);
    if (typeof body === "string") bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    actions.forEach((a) => {
      const b = document.createElement("button");
      b.className = "btn " + (a.kind || "btn-light"); b.textContent = a.label;
      b.addEventListener("click", () => { if (a.onClick) { if (a.onClick(back) === false) return; } close(); });
      $(".modal-actions", back).appendChild(b);
    });
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(back);
    const f = $("input, select, textarea, button", back); if (f) f.focus();
    return { el: back, close };
  }
  const pad = (n) => String(n).padStart(2, "0");
  const fmtDate = (t) => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const fmtDateTime = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  function relDue(t) {
    const diff = t - Date.now(), d = Math.round(Math.abs(diff) / GS.DAY);
    if (diff < 0) return d < 1 ? "vừa hết hạn" : `quá hạn ${d} ngày`;
    if (diff < GS.DAY) return `còn ${Math.max(1, Math.round(diff / 3600000))} giờ`;
    return `còn ${d} ngày`;
  }
  const fmtDur = (sec) => `${Math.floor(sec / 60)}:${pad(sec % 60)} phút`;
  const scoreCls = (s) => (s == null ? "" : s >= 8 ? "good" : s >= 5 ? "mid" : "low");
  const scoreHtml = (s) => (s == null ? "–" : `<span class="score ${scoreCls(s)}">${s}</span>`);
  const initials = (name) => (/^Quản lý/.test(name) ? "QL" : /^Phụ huynh/.test(name) ? "PH" : name.split(" ").slice(-1)[0][0] || "?");
  const isMedia = (s) => /^(data:|https?:)/.test(s || "");
  const picHtml = (s, cls = "") => (isMedia(s) ? `<img src="${esc(s)}" alt="" class="${cls}" style="max-height:200px;margin:auto;border-radius:12px">` : esc(s));

  // ---------- dữ liệu dẫn xuất ----------
  const classOf = (st) => byId("classes", st.classId) || {};
  const campusOf = (cls) => byId("campuses", cls.campus) || {};
  const teacherOf = (cls) => byId("teachers", cls.teacher) || {};
  const studentsOf = (classId) => db.students.filter((s) => s.classId === classId);
  const subsOf = (aid, sid) => db.submissions.filter((s) => s.assignmentId === aid && s.studentId === sid).sort((a, b) => a.attempt - b.attempt);
  const latestSub = (aid, sid) => { const l = subsOf(aid, sid); return l[l.length - 1] || null; };
  const asgsForStudent = (st) => db.assignments.filter((a) => a.classIds.includes(st.classId)).sort((a, b) => b.due - a.due);
  function statusOf(a, sid) {
    const sub = latestSub(a.id, sid);
    if (!sub) return { state: a.due < Date.now() ? "overdue" : "todo", sub: null, score: null };
    const r = GS.scoreSubmission(sub, a);
    return { state: r.pending ? "pending" : "done", sub, score: r.score, pending: r.pending, perSkill: r.perSkill, attempts: subsOf(a.id, sid).length };
  }
  const STATE_BADGE = {
    todo: '<span class="badge sun">Chưa làm</span>',
    overdue: '<span class="badge red">Chưa làm · quá hạn</span>',
    pending: '<span class="badge blue">Chờ cô chấm</span>',
    done: '<span class="badge green">Đã chấm</span>',
  };
  function skillSummary(st) {
    const agg = {};
    asgsForStudent(st).forEach((a) => {
      const s = statusOf(a, st.id);
      if (!s.perSkill) return;
      Object.entries(s.perSkill).forEach(([k, v]) => { agg[k] = agg[k] || { got: 0, total: 0 }; agg[k].got += v.got; agg[k].total += v.total; });
    });
    return GS.SKILLS.filter((k) => agg[k] && agg[k].total).map((k) => ({ skill: k, pct: Math.round((agg[k].got / agg[k].total) * 100) }));
  }
  function skillBars(list) {
    if (!list.length) return `<p class="hint">Chưa có dữ liệu. Làm bài xong sẽ hiện ở đây.</p>`;
    return `<div class="skills">${list.map((x) => `<div class="skill-row"><span>${x.skill}</span><div class="bar"><i class="${x.pct >= 75 ? "" : x.pct >= 50 ? "mid" : "low"}" style="width:${x.pct}%"></i></div><b class="num">${x.pct}%</b></div>`).join("")}</div>`;
  }

  // ---------- người dùng ----------
  let me = null, child = null;
  if (S.role === "student" || S.role === "parent") { child = byId("students", S.id); if (!child) return logout(); me = S.role === "student" ? { name: child.name, sub: classOf(child).name } : { name: child.parentName, sub: "Lớp " + classOf(child).name }; }
  if (S.role === "teacher") { const t = byId("teachers", S.id); if (!t) return logout(); me = { name: t.name, sub: t.subject }; }
  if (S.role === "admin") me = { name: "Quản lý trung tâm", sub: "Cả 2 cơ sở" };
  function logout() { GS.setSession(null); location.replace("index.html"); }
  const myClasses = () => (S.role === "admin" ? db.classes : S.role === "teacher" ? db.classes.filter((c) => c.teacher === S.id) : []);
  const myStudents = () => { const ids = myClasses().map((c) => c.id); return db.students.filter((s) => ids.includes(s.classId)); };
  const myAssignments = () => {
    if (S.role === "admin") return db.assignments.slice();
    const ids = myClasses().map((c) => c.id);
    return db.assignments.filter((a) => a.createdBy === S.id || a.classIds.some((c) => ids.includes(c)));
  };
  function pendingGrading() {
    const sids = new Set(myStudents().map((s) => s.id));
    const out = [];
    myAssignments().forEach((a) => {
      if (!a.questions.some((q) => T[q.type].manual)) return;
      db.students.forEach((st) => {
        if (!sids.has(st.id)) return;
        const sub = latestSub(a.id, st.id);
        if (sub && GS.scoreSubmission(sub, a).pending) out.push({ a, st, sub });
      });
    });
    return out.sort((x, y) => x.sub.submittedAt - y.sub.submittedAt);
  }

  // ---------- điều hướng ----------
  const NAV = {
    student: [["home", "🏠", "Bài tập"], ["results", "⭐", "Kết quả"]],
    parent: [["child", "📊", "Con học thế nào"], ["results", "📝", "Bài & điểm"]],
    teacher: [["dashboard", "🏠", "Tổng quan"], ["assignments", "📚", "Bài tập"], ["grading", "✅", "Chấm bài", () => pendingGrading().length], ["students", "🧒", "Học viên"]],
    admin: [["overview", "🏫", "Tổng quan"], ["leads", "📞", "Đăng ký học thử", () => db.leads.filter((l) => l.status === "moi").length], ["assignments", "📚", "Bài tập"], ["grading", "✅", "Chấm bài", () => pendingGrading().length], ["students", "🧒", "Học viên"], ["content", "📰", "Tin tức & khai giảng"]],
  };
  function renderChrome(route) {
    const items = NAV[S.role];
    const link = (it, cls) => { const c = it[3] ? it[3]() : 0; return `<a href="#/${it[0]}" class="${route === it[0] ? "active" : ""}" ${route === it[0] ? 'aria-current="page"' : ""}><span class="ic" aria-hidden="true">${it[1]}</span><span>${it[2]}</span>${c ? `<span class="count">${c}</span>` : ""}</a>`; };
    const brand = `<a class="brand" href="#/"><span class="brand-mark"><svg viewBox="0 0 42 42" width="42" height="42" aria-hidden="true"><text x="21" y="31" text-anchor="middle" font-family="Baloo 2, Arial Black" font-weight="800" font-size="30" fill="#fff">S</text></svg></span><span class="brand-name">GoSpeak<small>CỔNG HỌC TẬP</small></span></a>`;
    $("#side").innerHTML = `${brand}<nav aria-label="Điều hướng">${items.map((it) => link(it)).join("")}</nav>
      <div class="side-foot"><div class="me"><span class="avatar">${esc(initials(me.name))}</span><div><b>${esc(me.name)}</b><small>${esc(me.sub)}</small></div></div>
      <button class="btn btn-light btn-sm" id="logout" style="width:100%">Đăng xuất</button>
      ${S.role === "admin" ? '<button class="btn btn-sm" id="resetDemo" style="width:100%;margin-top:6px;color:var(--ink-3)">Đặt lại dữ liệu demo</button>' : ""}
      <a href="../index.html" class="hint" style="display:block;text-align:center;margin-top:8px">Trang giới thiệu</a></div>`;
    $("#topbar").innerHTML = `${brand}<div style="display:flex;gap:8px;align-items:center"><span class="avatar" style="width:34px;height:34px;border-radius:50%;background:var(--sun);display:grid;place-items:center;font-weight:700">${esc(initials(me.name))}</span><button class="btn btn-light btn-sm" id="logout2">Thoát</button></div>`;
    $("#tabbar").innerHTML = items.slice(0, 5).map((it) => link(it)).join("");
    $("#logout").onclick = logout; $("#logout2").onclick = logout;
    const r = $("#resetDemo"); if (r) r.onclick = () => modal({ title: "Đặt lại dữ liệu demo?", body: "<p>Mọi bài nộp, bài tập, học viên mới thêm sẽ bị xóa và quay về dữ liệu mẫu ban đầu.</p>", actions: [{ label: "Hủy" }, { label: "Đặt lại", kind: "btn-primary", onClick: () => { GS.reset(); location.reload(); } }] });
  }

  const routes = {};
  let cleanup = null;
  function router() {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const home = NAV[S.role][0][0];
    let name = parts[0] || home;
    if (!routes[name] || (routes[name].roles && !routes[name].roles.includes(S.role))) name = home;
    const alias = { do: "home", asg: "assignments", builder: "assignments", grade: "grading", student: "students" };
    renderChrome(alias[name] || (name === "result" && S.role === "student" ? "results" : name));
    view.innerHTML = "";
    routes[name].fn(...parts.slice(1));
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", router);

  // ---------- đọc tiếng Anh (Text-to-speech) ----------
  let voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /female|samantha|aria|jenny|zira|google us/i.test(v.name)) || vs.find((v) => /en[-_](US|GB)/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, rate = 0.9, btn) {
    if (!window.speechSynthesis) { toast("Trình duyệt này chưa hỗ trợ đọc bài nghe. Bé thử Chrome hoặc Safari nhé.", "err"); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate; if (voice) u.voice = voice;
    if (btn) { btn.classList.add("playing"); u.onend = u.onerror = () => btn.classList.remove("playing"); }
    speechSynthesis.speak(u);
  }

  // ---------- hiển thị đáp án ----------
  function answerText(q, ans) {
    if (ans === undefined || ans === null || ans === "") return "<i>(bỏ trống)</i>";
    switch (q.type) {
      case "mcq": case "picture": case "listen": return esc(q.options[ans]);
      case "fill": return esc(ans);
      case "order": return esc((ans || []).join(" "));
      case "match": return q.pairs.map((p, i) => `${picHtml(p[0])} → ${esc(ans[i] !== undefined ? q.pairs[ans[i]][1] : "?")}${Number(ans[i]) === i ? " ✓" : " ✗"}`).join("&nbsp;&nbsp; ");
      case "speak": return ans.audio ? `<audio controls src="${ans.audio}" style="width:100%;max-width:360px;margin-top:4px"></audio>` : ans.seeded ? `<span class="badge">🎙️ Bản ghi âm ${ans.duration || 10} giây (dữ liệu mẫu)</span>` : "<i>(chưa ghi âm)</i>";
      case "write": return `${ans.text ? `<span style="white-space:pre-wrap">${esc(ans.text)}</span>` : ""}${ans.image ? `<img src="${ans.image}" alt="Ảnh bài viết" style="max-height:320px;border-radius:8px;margin-top:6px">` : ""}` || "<i>(bỏ trống)</i>";
    }
    return "";
  }
  function correctText(q) {
    switch (q.type) {
      case "mcq": case "picture": case "listen": return esc(q.options[q.answer]);
      case "fill": return esc(q.answer.join(" / "));
      case "order": return esc(q.words.join(" "));
      case "match": return q.pairs.map((p) => `${picHtml(p[0])} → ${esc(p[1])}`).join("&nbsp;&nbsp; ");
    }
    return "";
  }
  function reviewList(sub, a, { showCorrect = true } = {}) {
    return `<div class="review">${a.questions.map((q, i) => {
      const ans = sub.answers[q.id];
      let cls, mark;
      if (T[q.type].manual) {
        const m = sub.manual && sub.manual[q.id];
        if (m && m.score !== undefined && m.score !== "") { cls = m.score >= 8 ? "ok" : m.score >= 5 ? "part" : "no"; mark = `<span class="score ${scoreCls(m.score)}">${m.score}/10</span>`; }
        else { cls = "wait"; mark = '<span class="badge blue">Chờ cô chấm</span>'; }
      } else {
        const g = GS.gradeQuestion(q, ans);
        cls = g === 1 ? "ok" : g > 0 ? "part" : "no";
        mark = g === 1 ? '<span class="badge green">Đúng</span>' : g > 0 ? `<span class="badge sun">Đúng ${Math.round(g * q.pairs.length)}/${q.pairs.length}</span>` : '<span class="badge red">Chưa đúng</span>';
      }
      const m = sub.manual && sub.manual[q.id];
      return `<div class="rv ${cls}"><h4><span>Câu ${i + 1}. ${T[q.type].icon} ${esc(q.prompt)}</span>${mark}</h4>
        ${q.type === "speak" ? `<p class="hint">Câu cần đọc: “${esc(q.text)}”</p>` : ""}
        <p class="yours">Bài làm: ${answerText(q, ans)}</p>
        ${showCorrect && !T[q.type].manual && cls !== "ok" ? `<p class="right-ans">Đáp án: ${correctText(q)}</p>` : ""}
        ${m && m.comment ? `<div class="comment"><b>Cô nhận xét</b>${esc(m.comment)}</div>` : ""}</div>`;
    }).join("")}</div>`;
  }

  // ======================================================================
  // HỌC VIÊN
  // ======================================================================
  routes.home = {
    roles: ["student"], fn() {
      const list = asgsForStudent(child).map((a) => ({ a, s: statusOf(a, child.id) }));
      const todo = list.filter((x) => x.s.state === "todo" || x.s.state === "overdue").sort((x, y) => x.a.due - y.a.due);
      const done = list.filter((x) => x.s.sub);
      const stars = done.reduce((n, x) => n + (x.s.score != null ? Math.round(x.s.score / 2) : 0), 0);
      const first = child.name.split(" ").slice(-2).join(" ");
      view.innerHTML = `
        <div class="hello"><div><h1>Chào ${esc(first)}! 👋</h1><p>${todo.length ? `Con có ${todo.length} bài cần làm. Cố lên nhé!` : "Con đã làm hết bài rồi. Giỏi quá!"}</p></div>
          <div class="stars"><b>⭐ ${stars}</b><small>sao đã nhận</small></div></div>
        <div class="grid-main">
          <div>
            <h2 style="font-size:1.35rem">Bài cần làm</h2>
            <div class="hw-list">${todo.length ? todo.map(({ a, s }) => hwCard(a, s)).join("") : `<div class="card empty"><div class="big">🎉</div>Không còn bài nào. Con nghỉ ngơi hoặc làm lại bài cũ để lấy thêm sao nhé!</div>`}</div>
            <h2 style="font-size:1.35rem;margin-top:28px">Bài đã làm</h2>
            <div class="hw-list">${done.length ? done.map(({ a, s }) => hwCard(a, s)).join("") : `<div class="card empty">Chưa có bài nào.</div>`}</div>
          </div>
          <div>
            <div class="card"><h2>Kỹ năng của con</h2>${skillBars(skillSummary(child))}</div>
            <div class="card"><h2>Lớp của con</h2><dl class="kv"><dt>Lớp</dt><dd>${esc(classOf(child).name)}</dd><dt>Giáo viên</dt><dd>${esc(teacherOf(classOf(child)).name)}</dd><dt>Lịch học</dt><dd>${esc(classOf(child).schedule)}</dd><dt>Cơ sở</dt><dd>${esc(campusOf(classOf(child)).name)}</dd></dl></div>
          </div>
        </div>`;
    },
  };
  function hwCard(a, s) {
    const icons = [...new Set(a.questions.map((q) => T[q.type].icon))].slice(0, 4).join(" ");
    const canRetry = s.sub && (!a.maxAttempts || s.attempts < a.maxAttempts);
    let action;
    if (!s.sub) action = `<a class="btn ${s.state === "overdue" ? "btn-light" : "btn-primary"}" href="#/do/${a.id}">Làm bài</a>`;
    else action = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${s.score != null ? scoreHtml(s.score) : ""}<a class="btn btn-light btn-sm" href="#/result/${s.sub.id}">Xem bài</a>${canRetry ? `<a class="btn btn-ghost btn-sm" href="#/do/${a.id}">Làm lại</a>` : ""}</div>`;
    return `<article class="hw ${s.state === "overdue" ? "overdue" : ""}"><div class="ic" aria-hidden="true">${s.sub ? (s.state === "pending" ? "⏳" : "✅") : "📒"}</div>
      <div><h3>${esc(a.title)}</h3><div class="meta">${STATE_BADGE[s.state]}<span>${a.questions.length} câu · ${icons}</span><span>Hạn ${fmtDate(a.due)} (${relDue(a.due)})</span>${a.timeLimit ? `<span>⏱ ${a.timeLimit} phút</span>` : ""}</div></div>
      <div>${action}</div></article>`;
  }

  routes.results = {
    roles: ["student", "parent"], fn() {
      const rows = asgsForStudent(child).map((a) => ({ a, s: statusOf(a, child.id) }));
      view.innerHTML = `<div class="page-head"><div><h1>${S.role === "parent" ? "Bài tập & điểm của con" : "Kết quả của con"}</h1><p>${esc(child.name)} · ${esc(classOf(child).name)}</p></div></div>
        <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Bài tập</th><th>Hạn nộp</th><th>Trạng thái</th><th class="num">Điểm</th><th>Lần làm</th><th></th></tr></thead><tbody>
        ${rows.map(({ a, s }) => `<tr><td><b>${esc(a.title)}</b></td><td>${fmtDate(a.due)}</td><td>${STATE_BADGE[s.state]}</td><td class="num">${scoreHtml(s.score)}</td><td>${s.attempts || 0}${a.maxAttempts ? "/" + a.maxAttempts : ""}</td><td>${s.sub ? `<a href="#/result/${s.sub.id}">Xem chi tiết</a>` : S.role === "student" ? `<a href="#/do/${a.id}">Làm bài</a>` : ""}</td></tr>`).join("")}
        </tbody></table></div></div>`;
    },
  };

  // ---------- Trình làm bài ----------
  function seededShuffle(arr, seedStr) {
    let h = 0; for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length > 1 && a.every((x, i) => x === arr[i])) a.push(a.shift());
    return a;
  }
  function compressImage(file, max = 1200) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.7)); }; img.onerror = rej; img.src = r.result; };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }
  const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

  routes.do = {
    roles: ["student"], fn(aid) {
      const a = byId("assignments", aid);
      if (!a || !a.classIds.includes(child.classId)) { view.innerHTML = `<div class="card empty"><div class="big">🔍</div>Không tìm thấy bài tập này.<br><a class="btn btn-light" style="margin-top:12px" href="#/home">Về danh sách bài</a></div>`; return; }
      const attempts = subsOf(a.id, child.id).length;
      if (a.maxAttempts && attempts >= a.maxAttempts) {
        view.innerHTML = `<div class="card empty"><div class="big">🙌</div><p>Con đã làm bài này ${attempts} lần, đủ số lần cô cho phép.</p><a class="btn btn-primary" href="#/result/${latestSub(a.id, child.id).id}">Xem lại bài làm</a></div>`; return;
      }
      const types = [...new Set(a.questions.map((q) => q.type))];
      view.innerHTML = `<div class="player"><div class="card intro"><div class="big">📒</div><h1 style="font-size:2rem">${esc(a.title)}</h1>
        ${a.note ? `<div class="notice sun">💬 Cô dặn: ${esc(a.note)}</div>` : ""}
        <ul>
          <li>📝 ${a.questions.length} câu: ${types.map((t) => T[t].label.toLowerCase()).join(", ")}</li>
          <li>⏱ ${a.timeLimit ? `Thời gian: ${a.timeLimit} phút, hết giờ bài tự nộp` : "Không giới hạn thời gian"}</li>
          <li>🔁 ${a.maxAttempts ? `Được làm ${a.maxAttempts} lần (con đã làm ${attempts} lần)` : "Được làm lại nhiều lần"}</li>
          ${types.includes("listen") || types.includes("speak") ? "<li>🎧 Có bài nghe / ghi âm: con nhớ bật loa hoặc đeo tai nghe</li>" : ""}
        </ul><br><button class="btn btn-primary btn-lg" id="start">Bắt đầu làm bài</button>
        <p style="margin-top:14px"><a href="#/home" class="hint">Để sau</a></p></div></div>`;
      $("#start").onclick = () => startPlayer(a, attempts);
    },
  };

  function startPlayer(a, attempts) {
    const st = { idx: 0, answers: {}, started: Date.now(), submitted: false };
    let timerId = null, recorder = null, stream = null;
    const deadline = a.timeLimit ? st.started + a.timeLimit * 60000 : 0;
    const stopMedia = () => { try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch (e) { } if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
    cleanup = () => { clearInterval(timerId); stopMedia(); window.onbeforeunload = null; };
    window.onbeforeunload = () => "Con chưa nộp bài, thoát ra sẽ mất bài làm.";

    view.innerHTML = `<div class="player">
      <div class="player-top"><button class="x" id="quit" aria-label="Thoát">✕</button><div class="progress" aria-hidden="true"><i id="prog"></i></div>${a.timeLimit ? '<div class="timer" id="timer" aria-live="off"></div>' : ""}</div>
      <div class="qcard" id="qcard"></div>
      <div class="player-nav"><button class="btn btn-light" id="prev">Câu trước</button><div class="dots" id="dots"></div><button class="btn btn-primary" id="next">Câu tiếp</button></div></div>`;

    if (deadline) {
      const tick = () => {
        const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        const el = $("#timer"); if (!el) return;
        el.textContent = `⏱ ${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
        el.classList.toggle("low", left <= 60);
        if (left === 0) { clearInterval(timerId); toast("Hết giờ! Bài đã được nộp tự động."); submit(true); }
      };
      tick(); timerId = setInterval(tick, 1000);
    }
    $("#quit").onclick = () => modal({ title: "Thoát bài làm?", body: "<p>Bài làm chưa nộp sẽ không được lưu.</p>", actions: [{ label: "Làm tiếp", kind: "btn-primary" }, { label: "Thoát", onClick: () => { cleanup(); cleanup = null; location.hash = "#/home"; } }] });
    $("#prev").onclick = () => go(st.idx - 1);
    $("#next").onclick = () => { if (st.idx === a.questions.length - 1) confirmSubmit(); else go(st.idx + 1); };

    const answered = (q) => {
      const v = st.answers[q.id];
      if (v === undefined || v === null || v === "") return false;
      if (q.type === "order") return v.length === q.words.length;
      if (q.type === "match") return Object.keys(v).length === q.pairs.length;
      if (q.type === "speak") return !!v.audio;
      if (q.type === "write") return !!(v.text && v.text.trim()) || !!v.image;
      return true;
    };
    function go(i) { if (i < 0 || i >= a.questions.length) return; stopMedia(); if (window.speechSynthesis) speechSynthesis.cancel(); st.idx = i; draw(); }
    function chrome() {
      $("#prog").style.width = (a.questions.filter(answered).length / a.questions.length) * 100 + "%";
      $("#dots").innerHTML = a.questions.map((q, i) => `<button class="${answered(q) ? "done" : ""} ${i === st.idx ? "cur" : ""}" data-i="${i}" aria-label="Câu ${i + 1}">${i + 1}</button>`).join("");
      $$("#dots button").forEach((b) => (b.onclick = () => go(+b.dataset.i)));
      $("#prev").disabled = st.idx === 0;
      $("#next").textContent = st.idx === a.questions.length - 1 ? "Nộp bài" : "Câu tiếp";
      $("#next").className = "btn " + (st.idx === a.questions.length - 1 ? "btn-green" : "btn-primary");
    }
    function draw() {
      const q = a.questions[st.idx];
      const box = $("#qcard");
      const head = `<div class="qtype">Câu ${st.idx + 1}/${a.questions.length} · ${T[q.type].icon} ${T[q.type].label}</div>`;
      const opts = () => `<div class="opts">${q.options.map((o, i) => `<button class="opt ${st.answers[q.id] === i ? "sel" : ""}" data-i="${i}"><span class="k">${"ABCD"[i] || i + 1}</span>${esc(o)}</button>`).join("")}</div>`;
      const bindOpts = () => $$(".opt", box).forEach((b) => (b.onclick = () => { st.answers[q.id] = +b.dataset.i; $$(".opt", box).forEach((x) => x.classList.toggle("sel", x === b)); chrome(); }));

      if (q.type === "mcq") { box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div>` + opts(); bindOpts(); }
      if (q.type === "picture") { box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div><div class="qpic">${picHtml(q.image)}</div>` + opts(); bindOpts(); }
      if (q.type === "listen") {
        box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div><div class="listen-btn"><button id="play" aria-label="Nghe"><svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0014 8v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z"/></svg></button><button class="slow" id="slow" aria-label="Nghe chậm">🐢</button><span class="hint">Bấm loa để nghe, 🐢 để nghe chậm.<br>Con nghe được nhiều lần.</span></div>` + opts();
        bindOpts();
        $("#play").onclick = (e) => say(q.audioText, 0.9, e.currentTarget);
        $("#slow").onclick = (e) => say(q.audioText, 0.6, e.currentTarget);
      }
      if (q.type === "fill") {
        const parts = q.prompt.split("___");
        box.innerHTML = head + `<div class="hint" style="margin-bottom:10px">Gõ từ còn thiếu vào ô trống</div><div class="fill-line">${esc(parts[0])}<input id="fillIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Từ còn thiếu" value="${esc(st.answers[q.id] || "")}">${esc(parts.slice(1).join("___"))}</div>`;
        const inp = $("#fillIn"); inp.focus();
        inp.oninput = () => { st.answers[q.id] = inp.value; chrome(); };
        inp.onkeydown = (e) => { if (e.key === "Enter") $("#next").click(); };
      }
      if (q.type === "order") {
        const bank = seededShuffle(q.words.map((w, i) => i), a.id + q.id);
        const cur = st.answers[q.id] ? st.answers[q.id].slice() : [];
        const usedIdx = st._orderIdx && st._orderIdx[q.id] ? st._orderIdx[q.id] : [];
        st._orderIdx = st._orderIdx || {}; st._orderIdx[q.id] = usedIdx;
        const paint = () => {
          box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div><div class="order-answer" aria-label="Câu của con">${usedIdx.map((wi, k) => `<button class="word in" data-k="${k}">${esc(q.words[wi])}</button>`).join("") || '<span class="hint" style="align-self:center">Bấm vào các từ bên dưới theo đúng thứ tự…</span>'}</div>
            <div class="order-bank">${bank.map((wi) => `<button class="word ${usedIdx.includes(wi) ? "used" : ""}" data-w="${wi}">${esc(q.words[wi])}</button>`).join("")}</div>`;
          $$(".order-bank .word", box).forEach((b) => (b.onclick = () => { usedIdx.push(+b.dataset.w); sync(); }));
          $$(".order-answer .word", box).forEach((b) => (b.onclick = () => { usedIdx.splice(+b.dataset.k, 1); sync(); }));
        };
        const sync = () => { st.answers[q.id] = usedIdx.map((wi) => q.words[wi]); if (!usedIdx.length) delete st.answers[q.id]; paint(); chrome(); };
        if (!usedIdx.length && cur.length) cur.forEach((w) => { const wi = q.words.findIndex((x, i) => x === w && !usedIdx.includes(i)); if (wi >= 0) usedIdx.push(wi); });
        paint();
      }
      if (q.type === "match") {
        const right = seededShuffle(q.pairs.map((_, i) => i), a.id + q.id);
        const COLORS = ["#2f6fdf", "#e08a00", "#1f9d63", "#9b51e0", "#c8102e", "#0097a7"];
        st.answers[q.id] = st.answers[q.id] || {};
        const ans = st.answers[q.id];
        let active = null;
        const paint = () => {
          const rightOwner = {}; Object.entries(ans).forEach(([l, r]) => (rightOwner[r] = +l));
          box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div><p class="hint">Bấm một hình bên trái, rồi bấm từ đúng bên phải.</p>
            <div class="match"><div class="col">${q.pairs.map((p, i) => `<button class="mitem pic ${active === i ? "active" : ""}" data-l="${i}" ${ans[i] !== undefined ? `data-pair style="--pc:${COLORS[i % 6]}"` : ""}>${picHtml(p[0])}${ans[i] !== undefined ? `<span class="tag">${i + 1}</span>` : ""}</button>`).join("")}</div>
            <div class="col">${right.map((ri) => { const o = rightOwner[ri]; return `<button class="mitem" data-r="${ri}" ${o !== undefined ? `data-pair style="--pc:${COLORS[o % 6]}"` : ""}>${esc(q.pairs[ri][1])}${o !== undefined ? `<span class="tag">${o + 1}</span>` : ""}</button>`; }).join("")}</div></div>`;
          $$("[data-l]", box).forEach((b) => (b.onclick = () => { const i = +b.dataset.l; if (ans[i] !== undefined) { delete ans[i]; active = i; } else active = active === i ? null : i; paint(); chrome(); }));
          $$("[data-r]", box).forEach((b) => (b.onclick = () => {
            const r = +b.dataset.r;
            if (active === null) { const o = Object.keys(ans).find((l) => ans[l] === r); if (o !== undefined) { delete ans[o]; paint(); chrome(); } else toast("Con bấm vào một hình bên trái trước nhé."); return; }
            Object.keys(ans).forEach((l) => { if (ans[l] === r) delete ans[l]; });
            ans[active] = r; active = null; paint(); chrome();
          }));
        };
        paint();
      }
      if (q.type === "speak") {
        const v = st.answers[q.id] || {};
        box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div><div class="rec"><div class="rec-text">${esc(q.text)}</div>
          <button class="btn btn-light btn-sm" id="model">🔊 Nghe mẫu</button>
          <button class="rec-btn" id="recBtn" aria-label="Bấm để ghi âm"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V21h2v-3.1A7 7 0 0019 11h-2z"/></svg></button>
          <div id="recState" class="hint">${v.audio ? "Con đã ghi âm. Nghe lại hoặc bấm micro để ghi lại." : "Bấm micro để bắt đầu ghi âm, bấm lần nữa để dừng."}</div>
          <div id="recOut">${v.audio ? `<audio controls src="${v.audio}"></audio>` : ""}</div>
          <label class="hint" style="cursor:pointer;text-decoration:underline">Hoặc chọn file ghi âm có sẵn<input type="file" accept="audio/*" id="recFile" hidden></label></div>`;
        $("#model").onclick = (e) => say(q.text.replace(/^Gợi ý:\s*/, ""), 0.85, e.currentTarget);
        const btn = $("#recBtn"), state = $("#recState");
        let chunks = [], t0 = 0, tInt = null;
        btn.onclick = async () => {
          if (recorder && recorder.state === "recording") { recorder.stop(); return; }
          if (!navigator.mediaDevices || !window.MediaRecorder) { state.textContent = "Máy này chưa ghi âm được trên trình duyệt. Con chọn file ghi âm có sẵn ở bên dưới nhé."; return; }
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
          catch (e) { state.textContent = "Chưa có quyền dùng micro. Con bấm “Cho phép” khi trình duyệt hỏi, hoặc nhờ bố mẹ bật quyền micro."; return; }
          chunks = []; recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
          recorder.onstop = async () => {
            clearInterval(tInt); btn.classList.remove("on"); stream.getTracks().forEach((t) => t.stop()); stream = null;
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            const url = await blobToDataURL(blob);
            st.answers[q.id] = { audio: url, duration: Math.round((Date.now() - t0) / 1000) };
            $("#recOut").innerHTML = `<audio controls src="${url}"></audio>`;
            state.textContent = "Đã ghi xong! Con nghe lại, nếu chưa ưng thì bấm micro để ghi lại."; chrome();
          };
          recorder.start(); t0 = Date.now(); btn.classList.add("on");
          tInt = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); state.textContent = `🔴 Đang ghi âm… ${s} giây (bấm lại để dừng)`; if (s >= 120) recorder.stop(); }, 300);
        };
        $("#recFile").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 3e6) { toast("File hơi lớn (trên 3MB), con ghi ngắn hơn nhé.", "err"); return; } const url = await blobToDataURL(f); st.answers[q.id] = { audio: url }; $("#recOut").innerHTML = `<audio controls src="${url}"></audio>`; chrome(); };
      }
      if (q.type === "write") {
        const v = st.answers[q.id] || {};
        box.innerHTML = head + `<div class="qprompt">${esc(q.prompt)}</div>
          <label class="field"><span>Con gõ bài viết ở đây</span><textarea class="input" id="wText" rows="6" spellcheck="false" style="font-size:1.1rem">${esc(v.text || "")}</textarea></label>
          <label class="upload" id="wUp">📷 <b>Hoặc chụp ảnh bài viết trong vở</b><br><span class="hint">Bấm để chụp / chọn ảnh</span><input type="file" accept="image/*" capture="environment" id="wFile" hidden>${v.image ? `<img src="${v.image}" alt="Ảnh bài viết">` : ""}</label>
          <p class="hint" id="wCount"></p>`;
        const ta = $("#wText");
        const count = () => { const n = (ta.value.match(/[A-Za-zÀ-ỹ']+/g) || []).length; $("#wCount").textContent = `${n} từ`; };
        ta.oninput = () => { st.answers[q.id] = { ...(st.answers[q.id] || {}), text: ta.value }; count(); chrome(); };
        count();
        $("#wFile").onchange = async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { const url = await compressImage(f); st.answers[q.id] = { ...(st.answers[q.id] || {}), image: url }; draw(); chrome(); }
          catch (err) { toast("Không đọc được ảnh này, con chụp lại nhé.", "err"); }
        };
      }
      chrome();
    }
    function confirmSubmit() {
      const left = a.questions.filter((q) => !answered(q)).length;
      modal({
        title: left ? `Con còn ${left} câu chưa làm` : "Nộp bài nhé?",
        body: left ? "<p>Con có muốn quay lại làm nốt không? Câu bỏ trống sẽ không được điểm.</p>" : "<p>Con đã làm hết các câu. Kiểm tra lại hoặc nộp bài luôn.</p>",
        actions: [{ label: "Xem lại" }, { label: "Nộp bài", kind: "btn-green", onClick: () => submit(false) }],
      });
    }
    function submit(auto) {
      if (st.submitted) return; st.submitted = true;
      cleanup(); cleanup = null;
      $$(".modal-back").forEach((m) => m.remove());
      const sub = {
        id: GS.uid("sub"), assignmentId: a.id, studentId: child.id, attempt: attempts + 1,
        startedAt: st.started, submittedAt: Date.now(), durationSec: Math.round((Date.now() - st.started) / 1000),
        answers: JSON.parse(JSON.stringify(st.answers)), manual: {}, teacherComment: "", autoSubmitted: !!auto,
      };
      db.submissions.push(sub);
      if (!GS.save()) {
        // bộ nhớ trình duyệt đầy: bỏ file ghi âm/ảnh trong bản demo
        Object.values(sub.answers).forEach((v) => { if (v && v.audio) { v.audio = null; v.seeded = true; } if (v && v.image) v.image = null; });
        GS.save(); toast("Bộ nhớ demo đầy nên file ghi âm/ảnh không được lưu. Bản chính thức lưu trên máy chủ.", "err");
      }
      location.hash = `#/result/${sub.id}/new`;
    }
    draw();
  }

  // ---------- Kết quả bài làm ----------
  routes.result = {
    fn(subId, isNew) {
      const sub = db.submissions.find((s) => s.id === subId);
      const a = sub && byId("assignments", sub.assignmentId);
      const st = sub && byId("students", sub.studentId);
      const allowed = sub && (S.role === "admin" || S.role === "teacher" || sub.studentId === S.id);
      if (!sub || !a || !allowed) { view.innerHTML = `<div class="card empty">Không tìm thấy bài làm.</div>`; return; }
      const r = GS.scoreSubmission(sub, a);
      const attempts = subsOf(a.id, st.id).length;
      const canRetry = S.role === "student" && (!a.maxAttempts || attempts < a.maxAttempts);
      const emoji = r.score == null ? "⏳" : r.score >= 9 ? "🏆" : r.score >= 7 ? "🎉" : r.score >= 5 ? "👍" : "💪";
      const msg = r.score == null ? "Cô sẽ chấm bài nói / bài viết và gửi điểm sớm." : r.score >= 9 ? "Xuất sắc! Con làm rất tốt." : r.score >= 7 ? "Giỏi lắm! Xem lại các câu sai nhé." : r.score >= 5 ? "Khá rồi! Xem đáp án rồi làm lại để được điểm cao hơn." : "Không sao, con xem đáp án rồi thử lại nhé!";
      const back = S.role === "student" ? "#/home" : S.role === "parent" ? "#/results" : `#/asg/${a.id}`;
      view.innerHTML = `<a class="crumb" href="${back}">← Quay lại</a>
        <div class="result-hero"><div class="big">${emoji}</div>
          <div class="result-score ${scoreCls(r.score)}">${r.score == null ? "Chờ chấm" : r.score + "<small style='font-size:1.6rem;color:var(--ink-3)'>/10</small>"}</div>
          <p style="font-size:1.1rem;margin:0 0 4px">${isNew ? msg : esc(a.title)}</p>
          <p class="hint">${esc(st.name)} · Lần ${sub.attempt} · Nộp lúc ${fmtDateTime(sub.submittedAt)} · Làm trong ${fmtDur(sub.durationSec)}${sub.autoSubmitted ? " · Tự nộp khi hết giờ" : ""}</p>
          ${r.pending && r.score != null ? `<p class="badge blue">Điểm tạm tính phần trắc nghiệm · còn ${r.pending} câu chờ cô chấm</p>` : ""}
          <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap">
            ${canRetry ? `<a class="btn btn-primary" href="#/do/${a.id}">Làm lại${a.maxAttempts ? ` (còn ${a.maxAttempts - attempts} lần)` : ""}</a>` : ""}
            ${S.role === "teacher" || S.role === "admin" ? `<a class="btn btn-primary" href="#/grade/${sub.id}">Chấm / nhận xét</a>` : ""}
            ${S.role === "student" ? '<a class="btn btn-light" href="#/home">Về danh sách bài</a>' : ""}
          </div></div>
        ${sub.teacherComment ? `<div class="comment" style="margin-bottom:16px;font-size:1rem"><b>Nhận xét chung của cô</b>${esc(sub.teacherComment)}</div>` : ""}
        <h2 style="font-size:1.3rem">Chi tiết từng câu</h2>${reviewList(sub, a)}`;
    },
  };

  // ======================================================================
  // PHỤ HUYNH / HỒ SƠ HỌC VIÊN (dùng chung cho giáo viên, quản lý)
  // ======================================================================
  function studentReport(st, { forParent = false } = {}) {
    const cls = classOf(st);
    const rows = asgsForStudent(st).map((a) => ({ a, s: statusOf(a, st.id) }));
    const scored = rows.filter((x) => x.s.score != null);
    const avg = scored.length ? Math.round((scored.reduce((n, x) => n + x.s.score, 0) / scored.length) * 10) / 10 : null;
    const missing = rows.filter((x) => !x.s.sub);
    const skills = skillSummary(st);
    const weak = skills.slice().sort((x, y) => x.pct - y.pct)[0];
    const comments = [];
    rows.forEach(({ a, s }) => { if (!s.sub) return; if (s.sub.teacherComment) comments.push({ a, c: s.sub.teacherComment, t: s.sub.submittedAt }); Object.entries(s.sub.manual || {}).forEach(([qid, m]) => { if (m.comment) comments.push({ a, c: m.comment, t: s.sub.submittedAt, q: a.questions.find((q) => q.id === qid) }); }); });
    comments.sort((x, y) => y.t - x.t);
    return `
      ${missing.filter((x) => x.s.state === "todo").length && forParent ? `<div class="notice sun">📌 Con còn ${missing.filter((x) => x.s.state === "todo").length} bài chưa làm. Bố mẹ nhắc con làm trước hạn nhé.</div>` : ""}
      <div class="stats">
        <div class="stat"><b>${rows.length - missing.length}/${rows.length}</b><span>Bài đã làm</span></div>
        <div class="stat"><b class="${scoreCls(avg)}">${avg ?? "–"}</b><span>Điểm trung bình</span></div>
        <div class="stat ${missing.length ? "warn" : ""}"><b>${missing.length}</b><span>Bài chưa làm</span></div>
        <div class="stat"><b style="font-size:1.4rem;padding-top:6px">${weak ? weak.skill : "–"}</b><span>Kỹ năng cần kèm thêm</span></div>
      </div>
      <div class="grid-main">
        <div>
          <div class="card"><h2>Điểm từng bài</h2><div class="table-wrap"><table class="t"><thead><tr><th>Bài tập</th><th>Hạn</th><th>Trạng thái</th><th class="num">Điểm</th><th></th></tr></thead><tbody>
            ${rows.map(({ a, s }) => `<tr><td><b>${esc(a.title)}</b></td><td>${fmtDate(a.due)}</td><td>${STATE_BADGE[s.state]}</td><td class="num">${scoreHtml(s.score)}</td><td>${s.sub ? `<a href="#/result/${s.sub.id}">Xem bài</a>` : ""}</td></tr>`).join("")}
          </tbody></table></div></div>
          <div class="card"><h2>Nhận xét của giáo viên</h2>${comments.length ? comments.slice(0, 6).map((x) => `<div class="comment"><b>${esc(x.a.title)}${x.q ? " · " + T[x.q.type].label : ""} · ${fmtDate(x.t)}</b>${esc(x.c)}</div>`).join("") : '<p class="hint">Chưa có nhận xét.</p>'}</div>
        </div>
        <div>
          <div class="card"><h2>Kỹ năng</h2>${skillBars(skills)}<p class="hint" style="margin-top:12px">Tỉ lệ làm đúng theo từng kỹ năng, tính trên các bài đã chấm.</p></div>
          <div class="card"><h2>Thông tin lớp</h2><dl class="kv"><dt>Học viên</dt><dd>${esc(st.name)}</dd><dt>Mã HV</dt><dd>${esc(st.code)}</dd><dt>Lớp</dt><dd>${esc(cls.name)} (${esc(cls.level)})</dd><dt>Giáo viên</dt><dd>${esc(teacherOf(cls).name)}</dd><dt>Lịch học</dt><dd>${esc(cls.schedule)}</dd><dt>Cơ sở</dt><dd>${esc(campusOf(cls).name)}</dd>${forParent ? "" : `<dt>Phụ huynh</dt><dd>${esc(st.parentName)} · ${esc(st.parentPhone)}</dd>`}</dl></div>
        </div>
      </div>`;
  }
  routes.child = {
    roles: ["parent"], fn() {
      view.innerHTML = `<div class="page-head"><div><h1>Con học thế nào?</h1><p>${esc(child.name)} · ${esc(classOf(child).name)} · ${esc(campusOf(classOf(child)).name)}</p></div>
        <a class="btn btn-light btn-sm" href="tel:${esc((campusOf(classOf(child)).phone || "").replace(/\s/g, ""))}">📞 Gọi trung tâm</a></div>${studentReport(child, { forParent: true })}`;
    },
  };
  routes.student = {
    roles: ["teacher", "admin"], fn(id) {
      const st = byId("students", id);
      if (!st) { view.innerHTML = `<div class="card empty">Không tìm thấy học viên.</div>`; return; }
      view.innerHTML = `<a class="crumb" href="#/students">← Học viên</a><div class="page-head"><div><h1>${esc(st.name)}</h1><p>${esc(classOf(st).name)} · ${esc(campusOf(classOf(st)).name)}</p></div></div>${studentReport(st)}`;
    },
  };

  // Chia sẻ cho phần giáo viên / quản lý (staff.js)
  window.APP = { db, S, $, $$, esc, toast, modal, fmtDate, fmtDateTime, relDue, fmtDur, scoreCls, scoreHtml, picHtml, isMedia, byId, classOf, campusOf, teacherOf, studentsOf, subsOf, latestSub, statusOf, skillSummary, skillBars, myClasses, myStudents, myAssignments, pendingGrading, routes, reviewList, answerText, correctText, compressImage, say, STATE_BADGE, view, T, initials };
  document.addEventListener("DOMContentLoaded", router);
})();
