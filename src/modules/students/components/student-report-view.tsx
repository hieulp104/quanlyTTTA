import Link from "next/link";
import { StatCard } from "@/components/patterns/stat-card";
import { Alert, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { QUESTION_TYPE_LABEL, SKILL_LABEL } from "@/common/enums";
import { formatDate } from "@/lib/utils";
import type { StudentReport } from "@/modules/students/students.service";
import { ScoreText, SkillBars, StateBadge } from "@/modules/study/components/study-bits";

/** Hồ sơ học tập của một bé — phụ huynh, giáo viên, quản lý cùng xem một khung. */
export function StudentReportView({ report, forParent = false }: { report: StudentReport; forParent?: boolean }) {
  const { student: st, rows, stats, skills, comments } = report;
  return (
    <>
      {forParent && stats.todo > 0 && (
        <Alert variant="warning" className="mb-5">Con còn {stats.todo} bài chưa làm. Bố mẹ nhắc con làm trước hạn nhé.</Alert>
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Bài đã làm" value={`${stats.done}/${stats.total}`} tone="primary" />
        <StatCard label="Điểm trung bình" value={stats.avg ?? "–"} tone="pending" />
        <StatCard label="Bài chưa làm" value={stats.missing} tone={stats.missing ? "danger" : "neutral"} />
        <StatCard label="Kỹ năng cần kèm thêm" value={stats.weakest ? SKILL_LABEL[stats.weakest.skill] : "–"} tone="info" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <TableContainer>
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow><TableHead>Bài tập</TableHead><TableHead>Hạn</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Điểm</TableHead><TableHead /></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.title}</TableCell>
                    <TableCell tone="muted">{formatDate(r.dueAt)}</TableCell>
                    <TableCell><StateBadge state={r.state} /></TableCell>
                    <TableCell className="text-right"><ScoreText score={r.last?.score} /></TableCell>
                    <TableCell>{r.last && <Link href={`/ket-qua/${r.last.id}`} className="text-link hover:underline">Xem bài</Link>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Card><CardContent>
            <h2 className="mb-3 text-h3 font-bold">Nhận xét của giáo viên</h2>
            {comments.length ? (
              <div className="space-y-2.5">
                {comments.map((c, i) => (
                  <div key={i} className="rounded-control bg-wood-50 px-4 py-3 text-sm">
                    <span className="block text-xs font-semibold text-wood-700">
                      {c.title}{c.type ? ` · ${QUESTION_TYPE_LABEL[c.type]}` : ""} · {formatDate(c.at)}
                    </span>
                    {c.text}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">Chưa có nhận xét.</p>}
          </CardContent></Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card><CardContent>
            <h2 className="mb-4 text-h3 font-bold">Kỹ năng</h2>
            <SkillBars skills={skills} />
            <p className="mt-4 text-xs text-muted">Tỉ lệ làm đúng theo từng kỹ năng, tính trên các bài đã chấm.</p>
          </CardContent></Card>
          <Card><CardContent>
            <h2 className="mb-3 text-h3 font-bold">Thông tin lớp</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Học viên</dt><dd className="font-semibold">{st.fullName}</dd>
              <dt className="text-muted">Mã HV</dt><dd className="font-semibold">{st.code}</dd>
              <dt className="text-muted">Lớp</dt><dd className="font-semibold">{st.className} ({st.level})</dd>
              <dt className="text-muted">Giáo viên</dt><dd className="font-semibold">{st.teacherName ?? "–"}</dd>
              <dt className="text-muted">Lịch học</dt><dd className="font-semibold">{st.schedule}</dd>
              <dt className="text-muted">Cơ sở</dt><dd className="font-semibold">{st.campus.name}</dd>
              {!forParent && (<><dt className="text-muted">Phụ huynh</dt><dd className="font-semibold">{st.parentName ?? "–"} · {st.parentPhone ?? "–"}</dd></>)}
            </dl>
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
