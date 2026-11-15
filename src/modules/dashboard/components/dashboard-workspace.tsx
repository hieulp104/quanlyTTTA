import Link from "next/link";
import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission, scopeOf } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Badge, ButtonLink, Card, CardContent, EmptyState, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate, nowMs } from "@/lib/utils";
import { SKILL_LABEL } from "@/common/enums";
import { prisma } from "@/shared/prisma/prisma.service";
import { classStats, listCampuses, listClasses } from "@/modules/classes/classes.service";
import { listAssignments } from "@/modules/assignments/assignments.service";
import { listPendingGrading } from "@/modules/grading/grading.service";
import { countNewLeads } from "@/modules/leads/leads.service";
import { studentSkills } from "@/modules/study/study.service";
import { ScoreText, relativeDue } from "@/modules/study/components/study-bits";

function RateBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted">–</span>;
  return <Badge variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger"}>{pct}%</Badge>;
}

/** Bé có kỹ năng tỉ lệ đúng dưới 60% — gợi ý cô kèm thêm. */
async function weakStudents(classIds: string[]) {
  const sts = await prisma.student.findMany({ where: { classId: { in: classIds }, deletedAt: null }, select: { id: true, fullName: true, classGroup: { select: { name: true } } } });
  const out = [];
  for (const st of sts) {
    const w = (await studentSkills(st.id)).sort((a, b) => a.pct - b.pct)[0];
    if (w && w.pct < 60) out.push({ st, ...w });
  }
  return out.sort((a, b) => a.pct - b.pct).slice(0, 6);
}

export async function DashboardWorkspace() {
  const user = await requirePagePermission("dashboard.view");
  const isCenter = scopeOf(user, "dashboard.view") === "ALL";
  const classes = await listClasses(user, "dashboard.view");
  const classIds = classes.map((c) => c.id);
  const [stats, asgs, pending, weak, newLeads, campuses] = await Promise.all([
    classStats(classIds),
    listAssignments(user),
    hasPermission(user, "grading.manage") ? listPendingGrading(user) : Promise.resolve([]),
    weakStudents(classIds),
    hasPermission(user, "lead.view") ? countNewLeads() : Promise.resolve(0),
    listCampuses(),
  ]);
  const open = asgs.filter((a) => a.dueAt.getTime() > nowMs());
  const studentCount = [...stats.values()].reduce((n, s) => n + s.students, 0);

  return (
    <>
      <PageHeader
        title={isCenter ? "Tổng quan trung tâm" : `Chào ${user.fullName}`}
        actions={hasPermission(user, "assignment.manage") ? <ButtonLink href="/bai-tap/tao-moi">+ Giao bài mới</ButtonLink> : null}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={isCenter ? "Lớp đang học" : "Lớp phụ trách"} value={classes.length} tone="primary" />
        <StatCard label="Học viên" value={studentCount} tone="info" />
        <StatCard label="Bài đang mở" value={open.length} tone="pending" />
        {isCenter && hasPermission(user, "lead.view") ? (
          <StatCard label="Đăng ký học thử mới" value={newLeads} tone={newLeads ? "danger" : "neutral"} detail={<Link href="/dang-ky-hoc-thu" className="text-link hover:underline">Xem danh sách</Link>} />
        ) : (
          <StatCard label="Bài chờ chấm" value={pending.length} tone={pending.length ? "danger" : "neutral"} />
        )}
      </div>

      {isCenter && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {campuses.map((cp) => {
            const cls = classes.filter((c) => c.campusId === cp.id);
            const st = cls.map((c) => stats.get(c.id)!).filter(Boolean);
            const rates = st.filter((s) => s.doneRate !== null);
            const avgs = st.filter((s) => s.avgScore !== null);
            return (
              <Card key={cp.id}><CardContent>
                <h2 className="text-h3 font-bold">{cp.name}</h2>
                <p className="mb-3 text-sm text-muted">{cp.address}</p>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted">Lớp</dt><dd className="font-semibold">{cls.length}</dd>
                  <dt className="text-muted">Học viên</dt><dd className="font-semibold">{st.reduce((n, s) => n + s.students, 0)}</dd>
                  <dt className="text-muted">Tỉ lệ làm bài</dt><dd><RateBadge pct={rates.length ? Math.round(rates.reduce((n, s) => n + s.doneRate!, 0) / rates.length) : null} /></dd>
                  <dt className="text-muted">Điểm TB</dt><dd><ScoreText score={avgs.length ? Math.round((avgs.reduce((n, s) => n + s.avgScore!, 0) / avgs.length) * 10) / 10 : null} /></dd>
                </dl>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h3 font-bold">Bài đang mở</h2>
              <Link href="/bai-tap" className="text-sm text-link hover:underline">Tất cả bài tập</Link>
            </div>
            {open.length ? (
              <TableContainer>
                <Table className="min-w-[560px]">
                  <TableHeader><TableRow><TableHead>Bài</TableHead><TableHead>Hạn</TableHead><TableHead>Đã nộp</TableHead><TableHead className="text-right">Điểm TB</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {open.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link href={`/bai-tap/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                          <p className="text-xs text-muted">{a.classes.map((c) => c.name).join(", ")}</p>
                        </TableCell>
                        <TableCell tone="muted">{formatDate(a.dueAt)}<br /><span className="text-xs">{relativeDue(a.dueAt)}</span></TableCell>
                        <TableCell>
                          {a.done}/{a.total} {a.total - a.done > 0 && <Badge variant="danger">{a.total - a.done} chưa làm</Badge>}
                        </TableCell>
                        <TableCell className="text-right"><ScoreText score={a.avg} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState title="Chưa có bài nào đang mở" action={<ButtonLink href="/bai-tap/tao-moi">Giao bài mới</ButtonLink>} />
            )}
          </section>

          <section>
            <h2 className="mb-3 text-h3 font-bold">{isCenter ? "Tất cả lớp" : "Lớp của tôi"}</h2>
            <TableContainer>
              <Table className="min-w-[640px]">
                <TableHeader><TableRow><TableHead>Lớp</TableHead><TableHead>Cơ sở</TableHead><TableHead>Giáo viên</TableHead><TableHead className="text-right">Sĩ số</TableHead><TableHead>Tỉ lệ làm bài</TableHead><TableHead className="text-right">Điểm TB</TableHead></TableRow></TableHeader>
                <TableBody>
                  {classes.map((c) => {
                    const s = stats.get(c.id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell><Link href={`/hoc-vien?lop=${c.id}`} className="font-semibold hover:underline">{c.name}</Link><p className="text-xs text-muted">{c.level} · {c.schedule}</p></TableCell>
                        <TableCell>{c.campus.name}</TableCell>
                        <TableCell>{c.teacher?.fullName ?? "–"}</TableCell>
                        <TableCell className="text-right">{s?.students ?? 0}</TableCell>
                        <TableCell><RateBadge pct={s?.doneRate ?? null} /></TableCell>
                        <TableCell className="text-right"><ScoreText score={s?.avgScore} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {hasPermission(user, "grading.manage") && (
            <Card><CardContent>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-h3 font-bold">Cần chấm</h2>
                {pending[0] && <ButtonLink href={`/cham-bai/${pending[0].id}`} size="sm">Chấm ngay</ButtonLink>}
              </div>
              {pending.length ? (
                <ul className="divide-y divide-line">
                  {pending.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Link href={`/cham-bai/${s.id}`} className="flex justify-between gap-3 py-2.5 hover:text-link">
                        <span><b>{s.student.fullName}</b><span className="block text-xs text-muted">{s.assignment.title}</span></span>
                        <span className="text-xs text-muted">{formatDate(s.submittedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-muted">Đã chấm hết bài.</p>}
              {pending.length > 6 && <Link href="/cham-bai" className="mt-2 block text-sm text-link hover:underline">Xem thêm {pending.length - 6} bài</Link>}
            </CardContent></Card>
          )}
          <Card><CardContent>
            <h2 className="mb-2 text-h3 font-bold">Bé cần kèm thêm</h2>
            {weak.length ? (
              <ul className="divide-y divide-line">
                {weak.map((w) => (
                  <li key={w.st.id}>
                    <Link href={`/hoc-vien/${w.st.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-link">
                      <span><b>{w.st.fullName}</b><span className="block text-xs text-muted">{w.st.classGroup.name}</span></span>
                      <Badge variant="danger">{SKILL_LABEL[w.skill]} {w.pct}%</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Chưa đủ dữ liệu.</p>}
            <p className="mt-3 text-xs text-muted">Kỹ năng có tỉ lệ đúng thấp nhất của từng bé (dưới 60%).</p>
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
