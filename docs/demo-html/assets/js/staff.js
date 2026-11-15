/* Cổng học tập GoSpeak — giáo viên & quản lý */
(function () {
  if (!window.APP) return;
  const { db, S, $, $$, esc, toast, modal, fmtDate, fmtDateTime, relDue, fmtDur, scoreCls, scoreHtml, picHtml, byId, classOf, campusOf, teacherOf, studentsOf, latestSub, statusOf, skillSummary, myClasses, myStudents, myAssignments, pendingGrading, routes, reviewList, answerText, correctText, compressImage, say, STATE_BADGE, view, T } = APP;
  const STAFF = ["teacher", "admin"];
  let campusFilter = "all";

  // ---------- thống kê ----------
  function asgStats(a, classIds) {
    const cids = classIds || a.classIds;
    const sts = db.students.filter((s) => cids.includes(s.classId));
    let done = 0, pending = 0, sum = 0, n = 0;
    const rows = sts.map((st) => {
      const s = statusOf(a, st.id);
      if (s.sub) done++;
      if (s.state === "pending") pending++;
      if (s.score != null) { sum += s.score; n++; }
      return { st, s };
    });
    return { rows, total: sts.length, done, pending, avg: n ? Math.round((sum / n) * 10) / 10 : null };
  }
  function classStats(c) {
    const asgs = db.assignments.filter((a) => a.classIds.includes(c.id) && a.createdAt <= Date.now());
    let need = 0, done = 0, sum = 0, n = 0;
    asgs.forEach((a) => { const r = asgStats(a, [c.id]); need += r.total; done += r.done; if (r.avg != null) { sum += r.avg; n++; } });
    return { students: studentsOf(c.id).length, rate: need ? Math.round((done / need) * 100) : null, avg: n ? Math.round((sum / n) * 10) / 10 : null, asgs: asgs.length };
  }
  const campusChips = () => `<div class="filters" role="group" aria-label="Lọc cơ sở">${[["all", "Cả 2 cơ sở"], ...db.campuses.map((c) => [c.id, c.name])].map(([id, n]) => `<button class="chip" data-campus="${id}" aria-pressed="${campusFilter === id}">${esc(n)}</button>`).join("")}</div>`;
  const bindCampus = (rerender) => $$("[data-campus]").forEach((b) => (b.onclick = () => { campusFilter = b.dataset.campus; rerender(); }));
  const inCampus = (c) => campusFilter === "all" || c.campus === campusFilter;
  const pctBadge = (p) => (p == null ? "–" : `<span class="badge ${p >= 80 ? "green" : p >= 50 ? "sun" : "red"}">${p}%</span>`);

  // ======================================================================
  // TỔNG QUAN GIÁO VIÊN
  // ======================================================================
  routes.dashboard = {
    roles: ["teacher"], fn() {
      const t = byId("teachers", S.id);
      const classes = myClasses();
      const open = myAssignments().filter((a) => a.due > Date.now());
      const pend = pendingGrading();
      view.innerHTML = `<div class="page-head"><div><h1>Chào ${esc(t.name)} 👋</h1><p>Hôm nay ${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</p></div>
        <a class="btn btn-primary" href="#/builder/new">+ Giao bài mới</a></div>
        <div class="stats">
          <div class="stat"><b>${classes.length}</b><span>Lớp phụ trách</span></div>
          <div class="stat"><b>${myStudents().length}</b><span>Học viên</span></div>
          <div class="stat"><b>${open.length}</b><span>Bài đang mở</span></div>
          <div class="stat ${pend.length ? "warn" : ""}"><b>${pend.length}</b><span>Bài chờ chấm</span></div>
        </div>
        <div class="grid-main">
          <div>
            <div class="card"><div class="card-head"><h2>Bài đang mở</h2><a href="#/assignments" class="hint">Tất cả bài tập</a></div>
              ${open.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Bài</th><th>Hạn</th><th>Đã nộp</th><th class="num">Điểm TB</th><th></th></tr></thead><tbody>${open.map((a) => { const r = asgStats(a, a.classIds.filter((c) => classes.some((x) => x.id === c))); return `<tr><td><a href="#/asg/${a.id}">${esc(a.title)}</a><br><span class="hint">${a.classIds.map((c) => esc(byId("classes", c).name)).join(", ")}</span></td><td>${fmtDate(a.due)}<br><span class="hint">${relDue(a.due)}</span></td><td>${r.done}/${r.total} ${r.total - r.done ? `<span class="badge red">${r.total - r.done} chưa làm</span>` : ""}</td><td class="num">${scoreHtml(r.avg)}</td><td><a class="btn btn-light btn-sm" href="#/asg/${a.id}">Xem</a></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">Chưa có bài nào đang mở. <a href="#/builder/new">Giao bài mới</a></div>`}
            </div>
            <div class="card"><h2>Lớp của tôi</h2><div class="table-wrap"><table class="t"><thead><tr><th>Lớp</th><th>Cơ sở</th><th>Lịch</th><th class="num">Sĩ số</th><th>Tỉ lệ làm bài</th><th class="num">Điểm TB</th></tr></thead><tbody>
              ${classes.map((c) => { const s = classStats(c); return `<tr><td><a href="#/students/${c.id}">${esc(c.name)}</a><br><span class="hint">${esc(c.level)}</span></td><td>${esc(campusOf(c).name)}</td><td>${esc(c.schedule)}</td><td class="num">${s.students}</td><td>${pctBadge(s.rate)}</td><td class="num">${scoreHtml(s.avg)}</td></tr>`; }).join("")}
            </tbody></table></div></div>
          </div>
          <div>
            <div class="card"><div class="card-head"><h2>Cần chấm</h2>${pend.length ? `<a class="btn btn-primary btn-sm" href="#/grade/${pend[0].sub.id}">Chấm ngay</a>` : ""}</div>
              ${pend.length ? pend.slice(0, 6).map(({ a, st, sub }) => `<a href="#/grade/${sub.id}" style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);text-decoration:none"><span><b>${esc(st.name)}</b><br><span class="hint">${esc(a.title)}</span></span><span class="hint">${fmtDate(sub.submittedAt)}</span></a>`).join("") + (pend.length > 6 ? `<p class="hint" style="margin-top:10px"><a href="#/grading">Xem thêm ${pend.length - 6} bài</a></p>` : "") : '<div class="empty"><div class="big">✅</div>Đã chấm hết bài.</div>'}
            </div>
            <div class="card"><h2>Bé cần kèm thêm</h2>${weakStudents(myStudents()).slice(0, 5).map((x) => `<a href="#/student/${x.st.id}" style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);text-decoration:none"><span><b>${esc(x.st.name)}</b><br><span class="hint">${esc(classOf(x.st).name)}</span></span><span class="badge red">${esc(x.skill)} ${x.pct}%</span></a>`).join("") || '<p class="hint">Chưa đủ dữ liệu.</p>'}<p class="hint" style="margin-top:10px">Kỹ năng có tỉ lệ đúng thấp nhất của từng bé.</p></div>
          </div>
        </div>`;
    },
  };
  function weakStudents(list) {
    return list.map((st) => { const sk = skillSummary(st).sort((a, b) => a.pct - b.pct)[0]; return sk ? { st, skill: sk.skill, pct: sk.pct } : null; }).filter((x) => x && x.pct < 60).sort((a, b) => a.pct - b.pct);
  }

  // ======================================================================
  // DANH SÁCH BÀI TẬP
  // ======================================================================
  routes.assignments = {
    roles: STAFF, fn() {
      const render = () => {
        const list = myAssignments().filter((a) => campusFilter === "all" || a.classIds.some((c) => byId("classes", c).campus === campusFilter)).sort((a, b) => b.createdAt - a.createdAt);
        const reqs = (db.importRequests || []).filter((r) => S.role === "admin" || r.by === S.id);
        view.innerHTML = `<div class="page-head"><div><h1>Bài tập</h1><p>Giao bài cho một hoặc nhiều lớp, ở cả 2 cơ sở.</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-light" id="importFile">📄 Gửi file Word/PDF để nhập</button><a class="btn btn-primary" href="#/builder/new">+ Soạn bài trên web</a></div></div>
          ${S.role === "admin" ? `<div style="margin-bottom:14px">${campusChips()}</div>` : ""}
          ${reqs.length ? `<div class="card"><h2>File đang chờ nhập</h2>${reqs.map((r) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);flex-wrap:wrap"><span>📄 <b>${esc(r.file)}</b> · ${r.classIds.map((c) => esc(byId("classes", c).name)).join(", ")}<br><span class="hint">${esc(r.note || "")} · gửi ${fmtDateTime(r.at)}</span></span><span class="badge sun">Học vụ đang nhập</span></div>`).join("")}</div>` : ""}
          <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Bài tập</th><th>Lớp</th><th>Hạn nộp</th><th>Cài đặt</th><th>Đã nộp</th><th class="num">Điểm TB</th><th></th></tr></thead><tbody>
          ${list.map((a) => { const r = asgStats(a); return `<tr><td><a href="#/asg/${a.id}">${esc(a.title)}</a><br><span class="hint">${a.questions.length} câu · ${[...new Set(a.questions.map((q) => T[q.type].icon))].join(" ")}</span> ${a.source === "file" ? '<span class="badge blue">Nhập từ file</span>' : ""}</td>
            <td>${a.classIds.map((c) => esc(byId("classes", c).name)).join("<br>")}</td>
            <td>${fmtDate(a.due)}<br><span class="hint">${relDue(a.due)}</span></td>
            <td class="hint">${a.timeLimit ? `⏱ ${a.timeLimit} phút` : "Không giới hạn giờ"}<br>${a.maxAttempts ? `🔁 ${a.maxAttempts} lần` : "🔁 Không giới hạn"}</td>
            <td>${r.done}/${r.total}${r.pending ? `<br><span class="badge blue">${r.pending} chờ chấm</span>` : ""}</td><td class="num">${scoreHtml(r.avg)}</td>
            <td style="white-space:nowrap"><a class="btn btn-light btn-sm" href="#/asg/${a.id}">Kết quả</a> <a class="btn btn-sm" href="#/builder/${a.id}" title="Sửa bài" aria-label="Sửa bài">✏️</a> <button class="btn btn-sm" data-copy="${a.id}" title="Nhân bản để giao lớp khác" aria-label="Nhân bản">⧉</button></td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">Chưa có bài tập.</td></tr>`}
          </tbody></table></div></div>`;
        bindCampus(render);
        $("#importFile").onclick = importFileModal;
        $$("[data-copy]").forEach((b) => (b.onclick = () => { const src = byId("assignments", b.dataset.copy); const c = JSON.parse(JSON.stringify(src)); c.id = GS.uid("a"); c.title = src.title + " (bản sao)"; c.createdAt = Date.now(); c.due = Date.now() + 7 * GS.DAY; c.createdBy = S.role === "teacher" ? S.id : src.createdBy; db.assignments.push(c); GS.save(); location.hash = `#/builder/${c.id}`; toast("Đã tạo bản sao. Chọn lớp và hạn nộp rồi lưu nhé."); }));
      };
      render();
    },
  };
  function importFileModal() {
    const box = document.createElement("div");
    box.innerHTML = `<p class="hint">Trung tâm gửi file đề có sẵn, bộ phận học vụ sẽ nhập thành bài tập trên web (nghe, chọn đáp án, điền từ…) và giao cho lớp.</p>
      <label class="field"><span>File đề (Word, PDF, ảnh, file nghe)</span><input class="input" type="file" id="ifFile" accept=".doc,.docx,.pdf,image/*,audio/*" multiple></label>
      <div class="field"><span>Giao cho lớp</span><div class="checks">${myClasses().map((c) => `<label><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join("")}</div></div>
      <label class="field"><span>Ghi chú cho học vụ</span><input class="input" id="ifNote" placeholder="VD: hạn nộp thứ 6, cho làm 2 lần, 20 phút"></label>`;
    modal({ title: "Gửi file để nhập bài", body: box, actions: [{ label: "Hủy" }, { label: "Gửi cho học vụ", kind: "btn-primary", onClick: () => {
      const f = $("#ifFile", box).files; const cids = $$(".checks input:checked", box).map((i) => i.value);
      if (!f.length) { toast("Chọn file đề trước nhé.", "err"); return false; }
      if (!cids.length) { toast("Chọn ít nhất một lớp.", "err"); return false; }
      db.importRequests = db.importRequests || [];
      db.importRequests.unshift({ id: GS.uid("r"), file: [...f].map((x) => x.name).join(", "), classIds: cids, note: $("#ifNote", box).value, by: S.id, at: Date.now() });
      GS.save(); toast("Đã gửi file. Học vụ nhập xong, bài sẽ hiện trong danh sách.", "ok"); routes.assignments.fn();
    } }] });
  }

  // ======================================================================
  // KẾT QUẢ MỘT BÀI TẬP
  // ======================================================================
  routes.asg = {
    roles: STAFF, fn(id, cid) {
      const a = byId("assignments", id);
      if (!a) { view.innerHTML = `<div class="card empty">Không tìm thấy bài tập.</div>`; return; }
      const mine = S.role === "admin" ? a.classIds : a.classIds.filter((c) => myClasses().some((x) => x.id === c));
      const classIds = mine.length ? mine : a.classIds;
      const curClass = cid && classIds.includes(cid) ? cid : "all";
      const r = asgStats(a, curClass === "all" ? classIds : [curClass]);
      const missing = r.rows.filter((x) => !x.s.sub);
      const skills = [...new Set(a.questions.map((q) => q.skill || T[q.type].skill))];

      // tỉ lệ đúng từng câu
      const qStats = a.questions.map((q) => { let got = 0, n = 0; r.rows.forEach(({ s }) => { if (!s.sub) return; let f; if (T[q.type].manual) { const m = s.sub.manual[q.id]; if (!m || m.score === undefined) return; f = m.score / 10; } else f = GS.gradeQuestion(q, s.sub.answers[q.id]); got += f; n++; }); return { q, pct: n ? Math.round((got / n) * 100) : null }; });
      const worst = qStats.filter((x) => x.pct != null).sort((x, y) => x.pct - y.pct)[0];

      view.innerHTML = `<a class="crumb" href="#/assignments">← Bài tập</a>
        <div class="page-head"><div><h1>${esc(a.title)}</h1><p>Hạn ${fmtDateTime(a.due)} (${relDue(a.due)}) · ${a.questions.length} câu · ${a.timeLimit ? a.timeLimit + " phút" : "không giới hạn giờ"} · ${a.maxAttempts ? "làm tối đa " + a.maxAttempts + " lần" : "làm lại không giới hạn"}</p></div>
          <div style="display:flex;gap:8px"><a class="btn btn-light" href="#/builder/${a.id}">✏️ Sửa bài</a></div></div>
        ${classIds.length > 1 ? `<div class="filters" style="margin-bottom:14px">${[["all", "Tất cả lớp"], ...classIds.map((c) => [c, byId("classes", c).name + " · " + campusOf(byId("classes", c)).name])].map(([v, n]) => `<a class="chip" style="text-decoration:none" href="#/asg/${a.id}/${v}" aria-pressed="${curClass === v}">${esc(n)}</a>`).join("")}</div>` : ""}
        <div class="stats">
          <div class="stat"><b>${r.done}/${r.total}</b><span>Đã nộp bài</span></div>
          <div class="stat"><b class="${scoreCls(r.avg)}">${r.avg ?? "–"}</b><span>Điểm trung bình</span></div>
          <div class="stat ${missing.length ? "warn" : ""}"><b>${missing.length}</b><span>Chưa làm</span></div>
          <div class="stat"><b>${r.pending}</b><span>Chờ chấm bài nói/viết</span></div>
        </div>
        <div class="grid-main">
          <div>
            <div class="card"><div class="card-head"><h2>Điểm từng bé</h2><button class="btn btn-light btn-sm" id="exportCsv">⬇ Xuất Excel</button></div><div class="table-wrap"><table class="t"><thead><tr><th>Học viên</th><th>Lớp</th><th>Trạng thái</th><th class="num">Điểm</th><th>Lần</th><th>Thời gian làm</th><th></th></tr></thead><tbody>
              ${r.rows.sort((x, y) => (y.s.score ?? -1) - (x.s.score ?? -1)).map(({ st, s }) => `<tr><td><a href="#/student/${st.id}">${esc(st.name)}</a></td><td>${esc(classOf(st).name)}</td><td>${STATE_BADGE[s.state]}</td><td class="num">${scoreHtml(s.score)}</td><td>${s.attempts || 0}</td><td class="hint">${s.sub ? fmtDur(s.sub.durationSec) : ""}</td><td>${s.sub ? `<a class="btn btn-${s.state === "pending" ? "primary" : "light"} btn-sm" href="#/grade/${s.sub.id}">${s.state === "pending" ? "Chấm" : "Xem"}</a>` : ""}</td></tr>`).join("")}
            </tbody></table></div></div>
            <div class="card"><h2>Bé nào hay sai phần nào</h2><p class="hint" style="margin-top:-6px">Tỉ lệ làm đúng theo kỹ năng trong bài này. Ô đỏ là phần nên kèm thêm.</p>
              <div class="table-wrap"><table class="heat"><thead><tr><th>Học viên</th>${skills.map((k) => `<th>${k}</th>`).join("")}</tr></thead><tbody>
              ${r.rows.filter((x) => x.s.sub).map(({ st, s }) => `<tr><td>${esc(st.name)}</td>${skills.map((k) => { const v = s.perSkill[k]; if (!v || !v.total) return '<td class="h0">…</td>'; const p = Math.round((v.got / v.total) * 100); return `<td class="${p >= 80 ? "h3" : p >= 50 ? "h2" : "h1"}">${p}%</td>`; }).join("")}</tr>`).join("") || `<tr><td colspan="${skills.length + 1}" class="empty">Chưa có bài nộp.</td></tr>`}
              </tbody></table></div>
              <div class="legend"><span><i class="h3"></i>Từ 80%</span><span><i class="h2"></i>50–79%</span><span><i class="h1"></i>Dưới 50%</span><span><i class="h0"></i>Chờ chấm</span></div></div>
          </div>
          <div>
            <div class="card"><div class="card-head"><h2>Chưa làm bài (${missing.length})</h2>${missing.length ? '<button class="btn btn-primary btn-sm" id="remind">Nhắc qua Zalo</button>' : ""}</div>
              ${missing.length ? missing.map(({ st }) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)"><span>${esc(st.name)}<br><span class="hint">${esc(classOf(st).name)}</span></span><span class="hint">${esc(st.parentPhone)}</span></div>`).join("") : '<div class="empty"><div class="big">🎉</div>Cả lớp đã nộp bài.</div>'}</div>
            <div class="card"><h2>Tỉ lệ đúng từng câu</h2>
              ${qStats.map((x, i) => `<div class="qa-bar"><b>C${i + 1}</b><div><div class="hint" style="line-height:1.3;margin-bottom:3px">${T[x.q.type].icon} ${esc(x.q.prompt.slice(0, 48))}${x.q.prompt.length > 48 ? "…" : ""}</div><div class="bar"><i class="${x.pct >= 75 ? "" : x.pct >= 50 ? "mid" : "low"}" style="width:${x.pct || 0}%"></i></div></div><b class="num">${x.pct == null ? "–" : x.pct + "%"}</b></div>`).join("")}
              ${worst && worst.pct < 60 ? `<div class="notice red" style="margin:12px 0 0">Câu ${a.questions.indexOf(worst.q) + 1} (${T[worst.q.type].label.toLowerCase()}) chỉ ${worst.pct}% làm đúng. Nên chữa lại trên lớp.</div>` : ""}
            </div>
          </div>
        </div>`;
      const rem = $("#remind");
      if (rem) rem.onclick = () => {
        const msg = `[GoSpeak English] Kính gửi phụ huynh, các bé sau chưa làm bài "${a.title}" (hạn ${fmtDateTime(a.due)}):\n${missing.map(({ st }, i) => `${i + 1}. ${st.name} – ${classOf(st).name}`).join("\n")}\nBố mẹ nhắc con vào làm bài giúp cô nhé. Cảm ơn bố mẹ!`;
        const box = document.createElement("div");
        box.innerHTML = `<p class="hint">Sao chép tin nhắn rồi dán vào nhóm Zalo của lớp.</p><textarea class="input" rows="9" id="remMsg">${esc(msg)}</textarea>`;
        modal({ title: "Tin nhắn nhắc làm bài", body: box, actions: [{ label: "Đóng" }, { label: "Sao chép", kind: "btn-primary", onClick: () => { const t = $("#remMsg", box); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast("Đã sao chép tin nhắn.", "ok")).catch(() => { document.execCommand("copy"); toast("Đã sao chép tin nhắn.", "ok"); }); } }] });
      };
      $("#exportCsv").onclick = () => downloadCsv(`ket-qua-${a.title}.csv`, [["Mã HV", "Học viên", "Lớp", "Trạng thái", "Điểm", "Số lần làm", "Nộp lúc"], ...r.rows.map(({ st, s }) => [st.code, st.name, classOf(st).name, { todo: "Chưa làm", overdue: "Chưa làm", pending: "Chờ chấm", done: "Đã chấm" }[s.state], s.score ?? "", s.attempts || 0, s.sub ? fmtDateTime(s.sub.submittedAt) : ""])]);
    },
  };
  function downloadCsv(name, rows) {
    const csv = "﻿" + rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name.replace(/[\\/:*?"<>|]/g, "-"); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ======================================================================
  // CHẤM BÀI
  // ======================================================================
  routes.grading = {
    roles: STAFF, fn() {
      const list = pendingGrading();
      view.innerHTML = `<div class="page-head"><div><h1>Chấm bài nói & bài viết</h1><p>Trắc nghiệm đã được chấm tự động. Ở đây là các bài cô cần nghe, đọc và nhận xét.</p></div></div>
        <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Học viên</th><th>Lớp</th><th>Bài tập</th><th>Cần chấm</th><th>Nộp lúc</th><th></th></tr></thead><tbody>
        ${list.map(({ a, st, sub }) => `<tr><td><b>${esc(st.name)}</b></td><td>${esc(classOf(st).name)}</td><td>${esc(a.title)}</td><td>${a.questions.filter((q) => T[q.type].manual && !(sub.manual[q.id] && sub.manual[q.id].score !== undefined)).map((q) => `<span class="badge">${T[q.type].icon} ${T[q.type].label}</span>`).join(" ")}</td><td>${fmtDateTime(sub.submittedAt)}</td><td><a class="btn btn-primary btn-sm" href="#/grade/${sub.id}">Chấm</a></td></tr>`).join("") || `<tr><td colspan="6"><div class="empty"><div class="big">✅</div>Không còn bài nào chờ chấm.</div></td></tr>`}
        </tbody></table></div></div>`;
    },
  };
  const QUICK = { speak: ["Phát âm rõ ràng, cô khen!", "Chú ý âm cuối /s/ nhé.", "Con đọc to và tự tin hơn nhé.", "Ngữ điệu tự nhiên, rất tốt!"], write: ["Câu đúng ngữ pháp, rất tốt!", "Thêm từ nối and, but, because nhé.", "Chú ý viết hoa đầu câu.", "Ý hay, con viết dài hơn nhé."] };
  routes.grade = {
    roles: STAFF, fn(subId) {
      const sub = db.submissions.find((s) => s.id === subId);
      const a = sub && byId("assignments", sub.assignmentId);
      if (!a) { view.innerHTML = `<div class="card empty">Không tìm thấy bài làm.</div>`; return; }
      const st = byId("students", sub.studentId);
      const draft = JSON.parse(JSON.stringify(sub.manual || {}));
      const r = GS.scoreSubmission(sub, a);
      view.innerHTML = `<a class="crumb" href="#/asg/${a.id}">← ${esc(a.title)}</a>
        <div class="page-head"><div><h1>${esc(st.name)}</h1><p>${esc(classOf(st).name)} · Lần ${sub.attempt} · Nộp ${fmtDateTime(sub.submittedAt)} · ${fmtDur(sub.durationSec)}</p></div><div>${scoreHtml(r.score)}${r.pending ? ' <span class="badge blue">tạm tính</span>' : ""}</div></div>
        <div class="review">${a.questions.map((q, i) => {
          if (!T[q.type].manual) { const g = GS.gradeQuestion(q, sub.answers[q.id]); return `<div class="rv ${g === 1 ? "ok" : g > 0 ? "part" : "no"}"><h4><span>Câu ${i + 1}. ${T[q.type].icon} ${esc(q.prompt)}</span>${g === 1 ? '<span class="badge green">Đúng</span>' : '<span class="badge red">Sai</span>'}</h4><p class="yours">Bé chọn: ${answerText(q, sub.answers[q.id])}</p>${g !== 1 ? `<p class="right-ans">Đáp án: ${correctText(q)}</p>` : ""}</div>`; }
          const m = draft[q.id] || {};
          return `<div class="rv wait" data-q="${q.id}"><h4><span>Câu ${i + 1}. ${T[q.type].icon} ${esc(q.prompt)}</span><span class="badge blue">Cô chấm</span></h4>
            <div class="grade-row"><div>${q.type === "speak" ? `<p class="hint">Câu cần đọc: “${esc(q.text)}” <button class="btn btn-sm" data-say="${esc(q.text)}">🔊 Mẫu</button></p>` : ""}<div class="yours">${answerText(q, sub.answers[q.id])}</div></div>
            <div class="grade-box"><b style="font-size:.85rem">Điểm (0–10)</b><div class="score-pick">${[...Array(11).keys()].map((n) => `<button data-s="${n}" class="${m.score === n ? "on" : ""}">${n}</button>`).join("")}</div>
            <textarea class="input" rows="2" placeholder="Nhận xét cho bé…" data-c>${esc(m.comment || "")}</textarea>
            <div class="quick-cmt">${QUICK[q.type].map((c) => `<button data-qc="${esc(c)}">${esc(c)}</button>`).join("")}</div></div></div></div>`;
        }).join("")}</div>
        <div class="card" style="margin-top:16px"><label class="field" style="margin:0"><span>Nhận xét chung (phụ huynh sẽ xem được)</span><textarea class="input" id="overall" rows="3" placeholder="VD: Con tiến bộ phần nghe, cần luyện thêm phát âm âm cuối.">${esc(sub.teacherComment || "")}</textarea></label></div>
        <div class="sticky-actions"><a class="btn btn-light" href="#/asg/${a.id}">Hủy</a><button class="btn btn-primary btn-lg" id="saveGrade">Lưu điểm & nhận xét</button></div>`;
      $$("[data-say]").forEach((b) => (b.onclick = () => say(b.dataset.say.replace(/^Gợi ý:\s*/, ""), 0.85, b)));
      $$("[data-q]").forEach((box) => {
        const qid = box.dataset.q;
        $$("[data-s]", box).forEach((b) => (b.onclick = () => { draft[qid] = { ...(draft[qid] || {}), score: +b.dataset.s }; $$("[data-s]", box).forEach((x) => x.classList.toggle("on", x === b)); }));
        const ta = $("[data-c]", box);
        ta.oninput = () => { draft[qid] = { ...(draft[qid] || {}), comment: ta.value }; };
        $$("[data-qc]", box).forEach((b) => (b.onclick = () => { ta.value = (ta.value ? ta.value.trim() + " " : "") + b.dataset.qc; ta.oninput(); }));
      });
      $("#saveGrade").onclick = () => {
        const missingScore = a.questions.filter((q) => T[q.type].manual && sub.answers[q.id] && (draft[q.id] == null || draft[q.id].score == null));
        Object.values(draft).forEach((m) => { if (m.score == null) delete m.score; });
        sub.manual = draft; sub.teacherComment = $("#overall").value.trim(); sub.gradedBy = S.id; sub.gradedAt = Date.now();
        GS.save();
        const nr = GS.scoreSubmission(sub, a);
        toast(missingScore.length ? "Đã lưu nhận xét. Còn câu chưa cho điểm." : `Đã lưu điểm: ${nr.score}/10`, "ok");
        const next = pendingGrading()[0];
        location.hash = next ? `#/grade/${next.sub.id}` : `#/asg/${a.id}`;
      };
    },
  };

  // ======================================================================
  // SOẠN BÀI TẬP
  // ======================================================================
  const BLANK = {
    mcq: () => ({ prompt: "", options: ["", "", "", ""], answer: 0, skill: "Ngữ pháp" }),
    fill: () => ({ prompt: "", answer: [""], skill: "Từ vựng" }),
    picture: () => ({ prompt: "Đây là gì?", image: "", options: ["", "", "", ""], answer: 0 }),
    match: () => ({ prompt: "Nối hình với từ đúng", pairs: [["", ""], ["", ""], ["", ""]] }),
    listen: () => ({ prompt: "", audioText: "", options: ["", "", "", ""], answer: 0 }),
    order: () => ({ prompt: "Sắp xếp các từ thành câu đúng", words: [] }),
    speak: () => ({ prompt: "Con đọc to câu sau rồi gửi cho cô nhé", text: "" }),
    write: () => ({ prompt: "" }),
  };
  const toLocalInput = (t) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

  routes.builder = {
    roles: STAFF, fn(id) {
      const src = id && id !== "new" ? byId("assignments", id) : null;
      const d = src ? JSON.parse(JSON.stringify(src)) : { id: GS.uid("a"), title: "", classIds: [], createdBy: S.role === "teacher" ? S.id : "admin", source: "web", createdAt: Date.now(), due: Date.now() + 5 * GS.DAY, timeLimit: 20, maxAttempts: 2, note: "", questions: [] };
      const classes = S.role === "admin" ? db.classes : myClasses();
      const hasSubs = src && db.submissions.some((s) => s.assignmentId === src.id);

      function qEditor(q, i) {
        const optRows = () => q.options.map((o, k) => `<div class="opt-edit"><input type="radio" name="ans_${q.id}" ${q.answer === k ? "checked" : ""} data-f="answer" data-k="${k}" aria-label="Đáp án đúng"><input class="input" value="${esc(o)}" data-f="opt" data-k="${k}" placeholder="Đáp án ${"ABCD"[k] || k + 1}"><button class="icon-btn" data-act="delopt" data-k="${k}" aria-label="Xóa đáp án" ${q.options.length <= 2 ? "disabled" : ""}>✕</button></div>`).join("") + (q.options.length < 6 ? `<button class="btn btn-sm" data-act="addopt">+ Thêm đáp án</button>` : "") + `<p class="hint">Tích vào ô tròn ở đáp án đúng.</p>`;
        let body = `<label class="field"><span>${q.type === "fill" ? "Câu có chỗ trống (gõ ___ ở chỗ cần điền)" : "Câu hỏi / yêu cầu"}</span><input class="input" data-f="prompt" value="${esc(q.prompt)}" placeholder="${q.type === "fill" ? "VD: She ___ to school every day." : ""}"></label>`;
        if (q.type === "picture") body += `<div class="field"><span>Hình ảnh</span><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="font-size:3rem;min-width:60px;text-align:center">${q.image ? picHtml(q.image) : "🖼️"}</div><input class="input" data-f="image" value="${GS.TYPE_INFO && !APP.isMedia(q.image) ? esc(q.image) : ""}" placeholder="Dán emoji (🐘) hoặc tải ảnh lên" style="max-width:240px"><label class="btn btn-light btn-sm">Tải ảnh<input type="file" accept="image/*" data-f="imagefile" hidden></label></div></div>`;
        if (q.type === "listen") body += `<label class="field"><span>Nội dung bài nghe (máy sẽ đọc bằng giọng bản ngữ)</span><textarea class="input" rows="2" data-f="audioText">${esc(q.audioText)}</textarea></label><button class="btn btn-light btn-sm" data-act="play" style="margin:-4px 0 12px">🔊 Nghe thử</button>`;
        if (["mcq", "picture", "listen"].includes(q.type)) body += optRows();
        if (q.type === "fill") body += `<label class="field"><span>Đáp án đúng (nhiều đáp án chấp nhận thì cách nhau bởi dấu /)</span><input class="input" data-f="fillans" value="${esc(q.answer.join(" / "))}"></label>`;
        if (q.type === "order") body += `<label class="field"><span>Câu đúng (bé sẽ thấy các từ bị xáo trộn)</span><input class="input" data-f="sentence" value="${esc(q.words.join(" "))}" placeholder="VD: I can see three ducks"></label>`;
        if (q.type === "match") body += `<div class="field"><span>Các cặp hình – từ</span>${q.pairs.map((p, k) => `<div class="opt-edit" style="grid-template-columns:90px 1fr 34px"><input class="input" data-f="pl" data-k="${k}" value="${esc(p[0])}" placeholder="Emoji" style="text-align:center;font-size:1.2rem"><input class="input" data-f="pr" data-k="${k}" value="${esc(p[1])}" placeholder="Từ tiếng Anh"><button class="icon-btn" data-act="delpair" data-k="${k}" aria-label="Xóa cặp" ${q.pairs.length <= 2 ? "disabled" : ""}>✕</button></div>`).join("")}${q.pairs.length < 6 ? '<button class="btn btn-sm" data-act="addpair">+ Thêm cặp</button>' : ""}</div>`;
        if (q.type === "speak") body += `<label class="field"><span>Câu / đoạn bé cần đọc to</span><textarea class="input" rows="2" data-f="text">${esc(q.text)}</textarea></label>`;
        if (q.type === "write") body += `<p class="hint">Bé gõ bài viết hoặc chụp ảnh vở gửi lên. Cô chấm điểm 0–10 và nhận xét.</p>`;
        if (["mcq", "fill"].includes(q.type)) body += `<label class="field" style="max-width:220px"><span>Kỹ năng (để phân tích bé hay sai phần nào)</span><select class="input" data-f="skill">${GS.SKILLS.map((s) => `<option ${q.skill === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>`;
        return `<div class="qedit" data-i="${i}"><div class="qedit-head"><b>Câu ${i + 1} · ${T[q.type].icon} ${T[q.type].label}</b><div class="qedit-tools"><button class="icon-btn" data-act="up" aria-label="Lên" ${i === 0 ? "disabled" : ""}>↑</button><button class="icon-btn" data-act="down" aria-label="Xuống" ${i === d.questions.length - 1 ? "disabled" : ""}>↓</button><button class="icon-btn" data-act="dup" aria-label="Nhân bản câu">⧉</button><button class="icon-btn" data-act="del" aria-label="Xóa câu">🗑</button></div></div>${body}</div>`;
      }

      function render() {
        view.innerHTML = `<a class="crumb" href="#/assignments">← Bài tập</a>
          <div class="page-head"><div><h1>${src ? "Sửa bài tập" : "Giao bài mới"}</h1><p>Soạn câu hỏi, chọn lớp và hạn nộp. Bé sẽ thấy bài ngay khi lưu.</p></div></div>
          ${hasSubs ? '<div class="notice sun">Bài này đã có học viên nộp. Sửa đáp án sẽ làm điểm được tính lại theo đáp án mới.</div>' : ""}
          <div class="grid-main">
            <div>
              <div id="qlist">${d.questions.map(qEditor).join("") || '<div class="card empty"><div class="big">✏️</div>Chưa có câu hỏi. Chọn dạng bài bên dưới để thêm.</div>'}</div>
              <div class="card" style="margin-top:12px"><h2 style="font-size:1.05rem">Thêm câu hỏi</h2><div class="add-types">${Object.entries(T).map(([k, v]) => `<button data-add="${k}"><span>${v.icon}</span>${v.label}</button>`).join("")}</div></div>
            </div>
            <div><div class="card" style="position:sticky;top:16px">
              <label class="field"><span>Tên bài *</span><input class="input" id="bTitle" value="${esc(d.title)}" placeholder="VD: Unit 5 – At school"></label>
              <div class="field"><span>Giao cho lớp *</span><div class="checks">${classes.map((c) => `<label><input type="checkbox" value="${c.id}" ${d.classIds.includes(c.id) ? "checked" : ""}> ${esc(c.name)} <span class="hint">${esc(campusOf(c).name)}</span></label>`).join("")}</div></div>
              <label class="field"><span>Hạn nộp</span><input class="input" type="datetime-local" id="bDue" value="${toLocalInput(d.due)}"></label>
              <div class="grid-2" style="gap:10px"><label class="field"><span>Thời gian làm</span><select class="input" id="bTime">${[0, 10, 15, 20, 25, 30, 45, 60].map((m) => `<option value="${m}" ${d.timeLimit === m ? "selected" : ""}>${m ? m + " phút" : "Không giới hạn"}</option>`).join("")}</select></label>
              <label class="field"><span>Số lần được làm</span><select class="input" id="bAtt">${[1, 2, 3, 5, 0].map((m) => `<option value="${m}" ${d.maxAttempts === m ? "selected" : ""}>${m ? m + " lần" : "Không giới hạn"}</option>`).join("")}</select></label></div>
              <label class="field"><span>Lời dặn cho bé</span><input class="input" id="bNote" value="${esc(d.note || "")}" placeholder="VD: Nhớ nghe 2 lần trước khi chọn nhé!"></label>
              <button class="btn btn-primary btn-lg" id="bSave" style="width:100%">${src ? "Lưu thay đổi" : "Giao bài"}</button>
              ${src ? '<button class="btn btn-sm" id="bDel" style="width:100%;margin-top:8px;color:var(--red)">Xóa bài tập</button>' : ""}
            </div></div>
          </div>`;
        bind();
      }
      function readSettings() {
        d.title = $("#bTitle").value.trim();
        d.classIds = $$(".checks input:checked").map((x) => x.value);
        d.due = new Date($("#bDue").value).getTime() || d.due;
        d.timeLimit = +$("#bTime").value; d.maxAttempts = +$("#bAtt").value; d.note = $("#bNote").value.trim();
      }
      function bind() {
        $$("[data-add]").forEach((b) => (b.onclick = () => { readSettings(); d.questions.push({ id: GS.uid("q"), type: b.dataset.add, ...BLANK[b.dataset.add]() }); render(); const all = $$(".qedit"); all[all.length - 1].scrollIntoView({ behavior: "smooth", block: "center" }); }));
        $$(".qedit").forEach((box) => {
          const i = +box.dataset.i, q = d.questions[i];
          $$("[data-f]", box).forEach((el) => {
            const f = el.dataset.f, k = +el.dataset.k;
            const ev = el.type === "radio" || el.type === "file" || el.tagName === "SELECT" ? "change" : "input";
            el.addEventListener(ev, async () => {
              if (f === "prompt" || f === "audioText" || f === "text" || f === "skill") q[f] = el.value;
              if (f === "opt") q.options[k] = el.value;
              if (f === "answer") q.answer = k;
              if (f === "fillans") q.answer = el.value.split("/").map((s) => s.trim()).filter(Boolean);
              if (f === "sentence") q.words = el.value.trim().split(/\s+/).filter(Boolean);
              if (f === "pl") q.pairs[k][0] = el.value.trim();
              if (f === "pr") q.pairs[k][1] = el.value.trim();
              if (f === "image") q.image = el.value.trim();
              if (f === "imagefile" && el.files[0]) { q.image = await compressImage(el.files[0], 600); readSettings(); render(); }
            });
          });
          $$("[data-act]", box).forEach((b) => (b.onclick = () => {
            const act = b.dataset.act, k = +b.dataset.k;
            readSettings();
            if (act === "play") { say(q.audioText || "Please type the listening text first.", 0.9, b); return; }
            if (act === "up" && i > 0) [d.questions[i - 1], d.questions[i]] = [d.questions[i], d.questions[i - 1]];
            if (act === "down" && i < d.questions.length - 1) [d.questions[i + 1], d.questions[i]] = [d.questions[i], d.questions[i + 1]];
            if (act === "del") d.questions.splice(i, 1);
            if (act === "dup") d.questions.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(q)), id: GS.uid("q") });
            if (act === "addopt") { q.options.push(""); }
            if (act === "delopt") { q.options.splice(k, 1); if (q.answer >= q.options.length) q.answer = 0; else if (q.answer > k) q.answer--; }
            if (act === "addpair") q.pairs.push(["", ""]);
            if (act === "delpair") q.pairs.splice(k, 1);
            render();
          }));
        });
        $("#bSave").onclick = save;
        const del = $("#bDel");
        if (del) del.onclick = () => modal({ title: "Xóa bài tập này?", body: "<p>Bài làm của học viên cho bài này cũng sẽ bị xóa.</p>", actions: [{ label: "Hủy" }, { label: "Xóa", kind: "btn-primary", onClick: () => { db.assignments = db.assignments.filter((x) => x.id !== d.id); db.submissions = db.submissions.filter((s) => s.assignmentId !== d.id); GS.save(); APP.db.assignments = db.assignments; toast("Đã xóa bài tập."); location.hash = "#/assignments"; } }] });
      }
      function validate() {
        if (!d.title) return "Bài tập cần có tên.";
        if (!d.classIds.length) return "Chọn ít nhất một lớp để giao bài.";
        if (!d.questions.length) return "Thêm ít nhất một câu hỏi.";
        for (let i = 0; i < d.questions.length; i++) {
          const q = d.questions[i], n = `Câu ${i + 1}: `;
          if (!q.prompt.trim()) return n + "chưa có nội dung câu hỏi.";
          if (q.options && q.options.some((o) => !o.trim())) return n + "còn đáp án để trống.";
          if (q.type === "picture" && !q.image) return n + "chưa có hình.";
          if (q.type === "listen" && !q.audioText.trim()) return n + "chưa có nội dung bài nghe.";
          if (q.type === "fill" && (!q.prompt.includes("___") || !q.answer.length)) return n + "cần có ___ trong câu và đáp án đúng.";
          if (q.type === "order" && q.words.length < 2) return n + "câu đúng cần ít nhất 2 từ.";
          if (q.type === "match" && q.pairs.some((p) => !p[0] || !p[1])) return n + "còn cặp nối để trống.";
          if (q.type === "speak" && !q.text.trim()) return n + "chưa có câu để bé đọc.";
        }
        return null;
      }
      function save() {
        readSettings();
        const err = validate();
        if (err) { toast(err, "err"); return; }
        const idx = db.assignments.findIndex((x) => x.id === d.id);
        if (idx >= 0) db.assignments[idx] = d; else db.assignments.push(d);
        if (!GS.save()) { toast("Không lưu được: bộ nhớ demo đầy. Bớt ảnh tải lên rồi thử lại.", "err"); return; }
        toast(src ? "Đã lưu thay đổi." : `Đã giao bài cho ${d.classIds.map((c) => byId("classes", c).name).join(", ")}.`, "ok");
        location.hash = `#/asg/${d.id}`;
      }
      render();
    },
  };

  // ======================================================================
  // HỌC VIÊN & NHẬP EXCEL
  // ======================================================================
  routes.students = {
    roles: STAFF, fn(classParam) {
      let cls = classParam || "all";
      const render = () => {
        const classes = myClasses().filter(inCampus);
        if (cls !== "all" && !classes.some((c) => c.id === cls)) cls = "all";
        const list = myStudents().filter((s) => (cls === "all" ? classes.some((c) => c.id === s.classId) : s.classId === cls));
        view.innerHTML = `<div class="page-head"><div><h1>Học viên</h1><p>${list.length} học viên${S.role === "admin" ? " · 2 cơ sở quản lý chung" : ""}</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-light" id="addSt">+ Thêm học viên</button><button class="btn btn-primary" id="impSt">⬆ Nhập từ Excel</button></div></div>
          <div class="filters" style="margin-bottom:14px">${S.role === "admin" ? campusChips() : ""}<select class="input" id="clsSel" style="width:auto;min-width:200px" aria-label="Chọn lớp"><option value="all">Tất cả lớp</option>${classes.map((c) => `<option value="${c.id}" ${cls === c.id ? "selected" : ""}>${esc(c.name)} – ${esc(campusOf(c).name)}</option>`).join("")}</select></div>
          <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Mã HV</th><th>Học viên</th><th>Lớp</th><th>Phụ huynh</th><th>Bài đã làm</th><th class="num">Điểm TB</th><th>Cần kèm</th></tr></thead><tbody>
          ${list.map((st) => { const asg = db.assignments.filter((a) => a.classIds.includes(st.classId)); const ss = asg.map((a) => statusOf(a, st.id)); const sc = ss.filter((s) => s.score != null); const avg = sc.length ? Math.round((sc.reduce((n, s) => n + s.score, 0) / sc.length) * 10) / 10 : null; const weak = skillSummary(st).sort((x, y) => x.pct - y.pct)[0];
            return `<tr><td class="hint">${esc(st.code)}</td><td><a href="#/student/${st.id}">${esc(st.name)}</a></td><td>${esc(classOf(st).name)}<br><span class="hint">${esc(campusOf(classOf(st)).name)}</span></td><td>${esc(st.parentName)}<br><span class="hint">${esc(st.parentPhone)}</span></td><td>${ss.filter((s) => s.sub).length}/${asg.length}</td><td class="num">${scoreHtml(avg)}</td><td>${weak && weak.pct < 60 ? `<span class="badge red">${esc(weak.skill)} ${weak.pct}%</span>` : '<span class="hint">–</span>'}</td></tr>`; }).join("") || `<tr><td colspan="7" class="empty">Chưa có học viên. Bấm “Nhập từ Excel” để đưa danh sách lên.</td></tr>`}
          </tbody></table></div></div>`;
        bindCampus(render);
        $("#clsSel").onchange = (e) => { cls = e.target.value; render(); };
        $("#impSt").onclick = importStudents;
        $("#addSt").onclick = addStudent;
      };
      render();
    },
  };
  function nextCode() { const max = db.students.reduce((m, s) => Math.max(m, parseInt(s.code.replace(/\D/g, ""), 10) || 0), 0); return "hv" + String(max + 1).padStart(3, "0"); }
  function addStudent() {
    const box = document.createElement("div");
    box.innerHTML = `<label class="field"><span>Họ tên học viên *</span><input class="input" id="nName"></label>
      <label class="field"><span>Lớp *</span><select class="input" id="nClass">${myClasses().map((c) => `<option value="${c.id}">${esc(c.name)} – ${esc(campusOf(c).name)}</option>`).join("")}</select></label>
      <div class="grid-2" style="gap:10px"><label class="field"><span>Tên phụ huynh</span><input class="input" id="nPName"></label><label class="field"><span>SĐT phụ huynh</span><input class="input" id="nPhone" inputmode="tel"></label></div>
      <p class="hint">Mã học viên tự tạo (${nextCode()}). Mật khẩu mặc định 123456.</p>`;
    modal({ title: "Thêm học viên", body: box, actions: [{ label: "Hủy" }, { label: "Thêm", kind: "btn-primary", onClick: () => {
      const name = $("#nName", box).value.trim(); if (!name) { toast("Nhập họ tên học viên.", "err"); return false; }
      db.students.push({ id: GS.uid("s"), code: nextCode(), name, classId: $("#nClass", box).value, parentName: $("#nPName", box).value.trim() || "Phụ huynh bé " + name.split(" ").slice(-2).join(" "), parentPhone: $("#nPhone", box).value.replace(/\D/g, "") });
      GS.save(); toast("Đã thêm " + name, "ok"); routes.students.fn();
    } }] });
  }
  function parseCsv(text) {
    const rows = []; let row = [], cur = "", q = false;
    const sep = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ""; } else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; } else if (c !== "\r") cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  function importStudents() {
    const classes = myClasses();
    const box = document.createElement("div");
    box.innerHTML = `<p class="hint">Chọn file Excel (.xlsx) hoặc .csv có các cột: <b>Họ tên</b>, <b>Lớp</b>, <b>Tên phụ huynh</b>, <b>SĐT phụ huynh</b>. Dòng đầu là tiêu đề cột. <a href="#" id="tpl">Tải file mẫu</a></p>
      <label class="upload" style="margin:12px 0">📄 <b>Chọn file danh sách</b><br><span class="hint">.xlsx, .xls, .csv</span><input type="file" id="xf" accept=".xlsx,.xls,.csv" hidden></label>
      <label class="field"><span>Lớp mặc định (khi file không có cột Lớp hoặc tên lớp không khớp)</span><select class="input" id="defCls">${classes.map((c) => `<option value="${c.id}">${esc(c.name)} – ${esc(campusOf(c).name)}</option>`).join("")}</select></label>
      <div id="xprev"></div>`;
    let parsed = [];
    const m = modal({ title: "Nhập danh sách học viên", wide: true, body: box, actions: [{ label: "Hủy" }, { label: "Nhập học viên", kind: "btn-primary", onClick: () => {
      if (!parsed.length) { toast("Chưa có dòng nào để nhập.", "err"); return false; }
      const def = $("#defCls", box).value;
      let n = 0;
      parsed.forEach((p) => { db.students.push({ id: GS.uid("s"), code: nextCode(), name: p.name, classId: p.classId || def, parentName: p.parentName || "Phụ huynh bé " + p.name.split(" ").slice(-2).join(" "), parentPhone: p.phone }); n++; });
      GS.save(); toast(`Đã nhập ${n} học viên. Mỗi bé có mã đăng nhập riêng.`, "ok"); routes.students.fn();
    } }] });
    $("#tpl", box).onclick = (e) => { e.preventDefault(); downloadCsv("mau-danh-sach-hoc-vien.csv", [["Họ tên", "Lớp", "Tên phụ huynh", "SĐT phụ huynh"], ["Nguyễn Văn An", classes[0] ? classes[0].name : "Starters 1A", "Nguyễn Thị Hoa", "0912000111"], ["Trần Bảo Châu", classes[0] ? classes[0].name : "Starters 1A", "Trần Văn Nam", "0988000222"]]); };
    $("#xf", box).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      let rows;
      try {
        if (/\.csv$/i.test(f.name)) rows = parseCsv(await f.text());
        else {
          if (!window.XLSX) { toast("Chưa tải được thư viện đọc Excel (cần mạng). Lưu file dạng .csv rồi thử lại.", "err"); return; }
          const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }).map((r) => r.map((x) => String(x)));
        }
      } catch (err) { toast("Không đọc được file này.", "err"); return; }
      if (!rows || rows.length < 2) { $("#xprev", box).innerHTML = '<div class="notice red">File không có dữ liệu học viên.</div>'; return; }
      const head = rows[0].map((h) => GS.norm(h));
      const col = (...keys) => head.findIndex((h) => keys.some((k) => h.includes(k)));
      const cName = col("họ tên", "họ và tên", "tên học viên", "học viên", "name");
      const cClass = col("lớp", "class");
      const cPName = col("phụ huynh", "parent");
      const cPhone = col("sđt", "điện thoại", "phone", "số đt");
      const cPName2 = cPName === cPhone ? -1 : cPName;
      if (cName < 0) { $("#xprev", box).innerHTML = '<div class="notice red">Không thấy cột “Họ tên”. Kiểm tra dòng tiêu đề của file.</div>'; return; }
      parsed = rows.slice(1).map((r) => {
        const cn = cClass >= 0 ? GS.norm(r[cClass]) : "";
        const c = cn ? classes.find((x) => GS.norm(x.name) === cn) : null;
        return { name: String(r[cName]).trim(), classId: c ? c.id : null, className: cClass >= 0 ? r[cClass] : "", parentName: cPName2 >= 0 ? String(r[cPName2]).trim() : "", phone: cPhone >= 0 ? String(r[cPhone]).replace(/\D/g, "") : "" };
      }).filter((p) => p.name);
      const unmatched = parsed.filter((p) => !p.classId).length;
      $("#xprev", box).innerHTML = `<div class="notice">Đọc được <b>${parsed.length}</b> học viên.${unmatched ? ` ${unmatched} bé chưa khớp tên lớp sẽ vào lớp mặc định.` : ""}</div>
        <div class="table-wrap" style="max-height:260px;overflow:auto"><table class="t"><thead><tr><th>Họ tên</th><th>Lớp</th><th>Phụ huynh</th><th>SĐT</th></tr></thead><tbody>${parsed.slice(0, 50).map((p) => `<tr><td>${esc(p.name)}</td><td>${p.classId ? esc(byId("classes", p.classId).name) : `<span class="badge sun">${esc(p.className || "–")} → mặc định</span>`}</td><td>${esc(p.parentName)}</td><td>${esc(p.phone)}</td></tr>`).join("")}</tbody></table></div>`;
    };
  }

  // ======================================================================
  // QUẢN LÝ TRUNG TÂM
  // ======================================================================
  routes.overview = {
    roles: ["admin"], fn() {
      const newLeads = db.leads.filter((l) => l.status === "moi").length;
      view.innerHTML = `<div class="page-head"><div><h1>Tổng quan trung tâm</h1><p>Hai cơ sở quản lý chung trên một hệ thống.</p></div><a class="btn btn-light" href="../index.html" target="_blank">Xem trang giới thiệu</a></div>
        <div class="stats">
          <div class="stat"><b>${db.students.length}</b><span>Học viên</span></div>
          <div class="stat"><b>${db.teachers.length}</b><span>Giáo viên</span></div>
          <div class="stat"><b>${db.classes.length}</b><span>Lớp đang học</span></div>
          <div class="stat ${newLeads ? "warn" : ""}"><b>${newLeads}</b><span>Đăng ký học thử mới</span></div>
        </div>
        <div class="grid-2" style="margin-bottom:16px">${db.campuses.map((cp) => { const cls = db.classes.filter((c) => c.campus === cp.id); const st = cls.map(classStats); const rates = st.filter((s) => s.rate != null); const avgs = st.filter((s) => s.avg != null);
          return `<div class="card"><h2>${esc(cp.name)}</h2><p class="hint" style="margin-top:-8px">${esc(cp.address)}</p><dl class="kv"><dt>Lớp</dt><dd>${cls.length}</dd><dt>Học viên</dt><dd>${st.reduce((n, s) => n + s.students, 0)}</dd><dt>Tỉ lệ làm bài</dt><dd>${pctBadge(rates.length ? Math.round(rates.reduce((n, s) => n + s.rate, 0) / rates.length) : null)}</dd><dt>Điểm TB</dt><dd>${scoreHtml(avgs.length ? Math.round((avgs.reduce((n, s) => n + s.avg, 0) / avgs.length) * 10) / 10 : null)}</dd></dl></div>`; }).join("")}</div>
        <div class="card"><h2>Tất cả lớp</h2><div class="table-wrap"><table class="t"><thead><tr><th>Lớp</th><th>Cơ sở</th><th>Giáo viên</th><th>Lịch</th><th class="num">Sĩ số</th><th>Tỉ lệ làm bài</th><th class="num">Điểm TB</th></tr></thead><tbody>
          ${db.classes.map((c) => { const s = classStats(c); return `<tr><td><a href="#/students/${c.id}">${esc(c.name)}</a><br><span class="hint">${esc(c.level)}</span></td><td>${esc(campusOf(c).name)}</td><td>${esc(teacherOf(c).name)}</td><td>${esc(c.schedule)}</td><td class="num">${s.students}</td><td>${pctBadge(s.rate)}</td><td class="num">${scoreHtml(s.avg)}</td></tr>`; }).join("")}
        </tbody></table></div></div>`;
    },
  };
  const LEAD_ST = { moi: ["Mới", "red"], "da-goi": ["Đã gọi", "sun"], "hen-hoc-thu": ["Hẹn học thử", "blue"], "nhap-hoc": ["Đã nhập học", "green"], dung: ["Không tiếp tục", ""] };
  routes.leads = {
    roles: ["admin"], fn() {
      let filter = "all";
      const render = () => {
        const list = db.leads.filter((l) => filter === "all" || l.status === filter).sort((a, b) => b.createdAt - a.createdAt);
        view.innerHTML = `<div class="page-head"><div><h1>Đăng ký học thử</h1><p>Phụ huynh để lại thông tin từ form trên trang giới thiệu.</p></div><button class="btn btn-light" id="expLeads">⬇ Xuất Excel</button></div>
          <div class="filters" style="margin-bottom:14px">${[["all", "Tất cả"], ...Object.entries(LEAD_ST).map(([k, v]) => [k, v[0]])].map(([k, n]) => `<button class="chip" data-f="${k}" aria-pressed="${filter === k}">${n} (${k === "all" ? db.leads.length : db.leads.filter((l) => l.status === k).length})</button>`).join("")}</div>
          <div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Phụ huynh</th><th>Con</th><th>Khóa quan tâm</th><th>Cơ sở</th><th>Gọi lúc</th><th>Gửi lúc</th><th>Trạng thái</th></tr></thead><tbody>
          ${list.map((l) => `<tr><td><b>${esc(l.parent)}</b><br><a href="tel:${esc(l.phone.replace(/\s/g, ""))}">${esc(l.phone)}</a>${l.note ? `<br><span class="hint">${esc(l.note)}</span>` : ""}</td><td>${esc(l.childAge || "–")}</td><td>${esc(l.course)}</td><td>${esc((byId("campuses", l.campus) || {}).name || "")}</td><td>${esc(l.time)}</td><td>${fmtDateTime(l.createdAt)}</td>
            <td><select class="input" data-lead="${l.id}" style="padding:.4em .6em;width:auto">${Object.entries(LEAD_ST).map(([k, v]) => `<option value="${k}" ${l.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select></td></tr>`).join("") || `<tr><td colspan="7"><div class="empty">Chưa có đăng ký nào. Thử gửi form ở <a href="../index.html#dang-ky" target="_blank">trang giới thiệu</a>.</div></td></tr>`}
          </tbody></table></div></div>`;
        $$("[data-f]").forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(); }));
        $$("[data-lead]").forEach((s) => (s.onchange = () => { byId("leads", s.dataset.lead).status = s.value; GS.save(); toast("Đã cập nhật trạng thái.", "ok"); render(); }));
        $("#expLeads").onclick = () => downloadCsv("dang-ky-hoc-thu.csv", [["Phụ huynh", "SĐT", "Con", "Khóa học", "Cơ sở", "Gọi lúc", "Ghi chú", "Gửi lúc", "Trạng thái"], ...db.leads.map((l) => [l.parent, l.phone, l.childAge, l.course, (byId("campuses", l.campus) || {}).name, l.time, l.note, fmtDateTime(l.createdAt), LEAD_ST[l.status][0]])]);
      };
      render();
    },
  };
  const KIND = { "khai-giang": "Lịch khai giảng", "su-kien": "Sự kiện", "tin-tuc": "Góc phụ huynh / tin tức" };
  routes.content = {
    roles: ["admin"], fn() {
      const list = db.news.slice().sort((a, b) => b.date - a.date);
      view.innerHTML = `<div class="page-head"><div><h1>Tin tức & lịch khai giảng</h1><p>Nội dung ở đây hiện ngay trên trang giới thiệu trung tâm.</p></div><a class="btn btn-light" href="../index.html#tin-tuc" target="_blank">Xem trên trang chủ</a></div>
        <div class="grid-main"><div class="card"><h2>Đã đăng</h2><div class="table-wrap"><table class="t"><thead><tr><th>Tiêu đề</th><th>Loại</th><th>Ngày</th><th></th></tr></thead><tbody>
          ${list.map((n) => `<tr><td><b>${esc(n.title)}</b><br><span class="hint">${esc(n.body)}</span></td><td><span class="badge ${n.kind === "khai-giang" ? "sun" : "blue"}">${KIND[n.kind]}</span></td><td>${fmtDate(n.date)}</td><td><button class="btn btn-sm" data-del="${n.id}" aria-label="Xóa">🗑</button></td></tr>`).join("")}
        </tbody></table></div></div>
        <div class="card"><h2>Đăng mới</h2>
          <label class="field"><span>Loại</span><select class="input" id="nKind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
          <label class="field"><span>Tiêu đề *</span><input class="input" id="nTitle" placeholder="VD: Khai giảng lớp Movers tháng 12"></label>
          <label class="field"><span>Ngày (khai giảng / sự kiện)</span><input class="input" type="date" id="nDate"></label>
          <label class="field"><span>Cơ sở</span><select class="input" id="nCampus"><option value="">Cả 2 cơ sở</option>${db.campuses.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
          <label class="field"><span>Mô tả ngắn</span><textarea class="input" id="nBody" rows="3"></textarea></label>
          <button class="btn btn-primary" id="nSave" style="width:100%">Đăng lên trang chủ</button></div></div>`;
      $("#nDate").value = new Date(Date.now() + 7 * GS.DAY).toISOString().slice(0, 10);
      $$("[data-del]").forEach((b) => (b.onclick = () => { db.news = db.news.filter((n) => n.id !== b.dataset.del); APP.db.news = db.news; GS.save(); toast("Đã xóa."); routes.content.fn(); }));
      $("#nSave").onclick = () => {
        const title = $("#nTitle").value.trim(); if (!title) { toast("Nhập tiêu đề.", "err"); return; }
        db.news.push({ id: GS.uid("n"), kind: $("#nKind").value, title, date: new Date($("#nDate").value).getTime() || Date.now(), campus: $("#nCampus").value, body: $("#nBody").value.trim() });
        GS.save(); toast("Đã đăng. Trang chủ đã cập nhật.", "ok"); routes.content.fn();
      };
    },
  };
})();
