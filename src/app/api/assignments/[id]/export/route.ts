/**
 * Xuất Excel kết quả một bài tập.
 * GET /api/assignments/<id>/export[?lop=<classId>] — quyền `assignment.view` trên lớp liên quan.
 */
import ExcelJS from "exceljs";
import { hasPermission } from "@/common/permissions/permissions";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { getAssignmentResults } from "@/modules/assignments/assignments.service";
import { formatDateTime } from "@/lib/utils";
import { SKILL_LABEL } from "@/common/enums";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Chưa đăng nhập", { status: 401 });
  if (!hasPermission(user, "assignment.view")) return new Response("Không có quyền", { status: 403 });

  const { id } = await ctx.params;
  const lop = new URL(request.url).searchParams.get("lop") ?? undefined;
  const r = await getAssignmentResults(user, id, lop);
  if (!r) return new Response("Không tìm thấy bài tập", { status: 404 });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Kết quả");
  sheet.addRow([`Bài: ${r.assignment.title}`]).font = { bold: true, size: 13 };
  sheet.addRow([`Hạn nộp: ${formatDateTime(r.assignment.dueAt)} · Đã nộp ${r.stats.done}/${r.stats.total} · Điểm TB ${r.stats.avg ?? "–"}`]);
  sheet.addRow([]);
  const head = sheet.addRow(["STT", "Học viên", "Lớp", "Trạng thái", "Điểm", "Số lần làm", "Nộp lúc", ...r.skills.map((k) => `${SKILL_LABEL[k]} (%)`)]);
  head.font = { bold: true };
  sheet.columns = [{ width: 6 }, { width: 26 }, { width: 18 }, { width: 14 }, { width: 8 }, { width: 11 }, { width: 18 }, ...r.skills.map(() => ({ width: 12 }))];
  r.rows.forEach((x, i) => {
    const s = x.submission;
    sheet.addRow([
      i + 1,
      x.student.fullName,
      x.student.className,
      !s ? "Chưa làm" : s.pendingCount ? "Chờ chấm" : "Đã chấm",
      s?.score ?? "",
      x.attempts,
      s ? formatDateTime(s.submittedAt) : "",
      ...r.skills.map((k) => x.perSkill[k] ?? ""),
    ]);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `ket-qua-${r.assignment.title}.xlsx`.replace(/[\/:*?"<>|]/g, "-");
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
