import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCard } from "@/components/patterns/stat-card";
import { Alert, BackLink, Badge, ButtonAnchor, ButtonLink, Card, CardContent, TabLink, Tabs, TabsList, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { cn, formatDateTime, nowMs } from "@/lib/utils";
import { QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL, SKILL_LABEL } from "@/common/enums";
import { getAssignmentResults } from "@/modules/assignments/assignments.service";
import { ScoreText, formatDuration, relativeDue } from "@/modules/study/components/study-bits";
import { RemindButton } from "@/modules/assignments/components/remind-button";

export type AssignmentResultsWorkspaceProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lop?: string }>;
};

function heatClass(p: number | undefined) {
  if (p === undefined) return "bg-surface-subtle text-muted";
  return p >= 80 ? "bg-success/15 text-success" : p >= 50 ? "bg-wood-100 text-wood-800" : "bg-danger/15 text-danger";
}

export async function AssignmentResultsWorkspace({ params, searchParams }: AssignmentResultsWorkspaceProps) {
  const user = await requirePagePermission("assignment.view");
  const { id } = await params;
  const { lop } = await searchParams;
  const r = await getAssignmentResults(user, id, lop);
  if (!r) notFound();

  const a = r.assignment;
  const missing = r.rows.filter((x) => !x.submission);
  const worst = r.questionStats.filter((q) => q.pct !== null).sort((x, y) => x.pct! - y.pct!)[0];
  const sorted = [...r.rows].sort((x, y) => (y.submission?.score ?? -1) - (x.submission?.score ?? -1));

  return (
    <>
      <BackLink href="/bai-tap">← Bài tập</BackLink>
      <PageHeader
        title={a.title}
        actions={
          <>
            <ButtonAnchor href={`/api/assignments/${a.id}/export${r.currentClass ? `?lop=${r.currentClass}` : ""}`} variant="outline">⬇ Xuất Excel</ButtonAnchor>
            {hasPermission(user, "assignment.manage") && <ButtonLink href={`/bai-tap/${a.id}/sua`} variant="outline"><Pencil className="size-4" /> Sửa bài</ButtonLink>}
          </>
        }
      />
      <p className="-mt-5 mb-5 text-sm text-muted">
        Hạn {formatDateTime(a.dueAt)} ({relativeDue(a.dueAt)}) · {a.questionCount} câu · {a.timeLimitMin ? `${a.timeLimitMin} phút` : "không giới hạn giờ"} · {a.maxAttempts ? `làm tối đa ${a.maxAttempts} lần` : "làm lại không giới hạn"}
        {a.source === "FILE" && <> · <Badge variant="info">Nhập từ file {a.sourceFile}</Badge></>}
      </p>

      {r.classes.length > 1 && (
        <Tabs className="mb-5">
          <TabsList>
            <TabLink href={`/bai-tap/${a.id}`} active={!r.currentClass}>Tất cả lớp</TabLink>
            {r.classes.map((c) => <TabLink key={c.id} href={`/bai-tap/${a.id}?lop=${c.id}`} active={r.currentClass === c.id}>{c.name} · {c.campus}</TabLink>)}
          </TabsList>
        </Tabs>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Đã nộp bài" value={`${r.stats.done}/${r.stats.total}`} tone="primary" />
        <StatCard label="Điểm trung bình" value={r.stats.avg ?? "–"} tone="pending" />
        <StatCard label="Chưa làm" value={missing.length} tone={missing.length ? "danger" : "neutral"} />
        <StatCard label="Chờ chấm bài nói/viết" value={r.stats.pending} tone="info" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <section>
            <h2 className="mb-3 text-h3 font-bold">Điểm từng bé</h2>
            <TableContainer>
              <Table className="min-w-[680px]">
                <TableHeader><TableRow><TableHead>Học viên</TableHead><TableHead>Lớp</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Điểm</TableHead><TableHead>Lần</TableHead><TableHead>Thời gian làm</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {sorted.map(({ student, submission: s, attempts }) => (
                    <TableRow key={student.id}>
                      <TableCell className="whitespace-nowrap"><Link href={`/hoc-vien/${student.id}`} className="font-semibold hover:underline">{student.fullName}</Link></TableCell>
                      <TableCell tone="muted" className="whitespace-nowrap">{student.className}</TableCell>
                      <TableCell>
                        {!s ? <Badge variant={a.dueAt.getTime() < nowMs() ? "danger" : "warning"}>Chưa làm</Badge> : s.pendingCount ? <Badge variant="info">Chờ chấm</Badge> : <Badge variant="success">Đã chấm</Badge>}
                      </TableCell>
                      <TableCell className="text-right"><ScoreText score={s?.score} /></TableCell>
                      <TableCell>{attempts}</TableCell>
                      <TableCell tone="muted" className="whitespace-nowrap">{s ? formatDuration(s.durationSec) : ""}</TableCell>
                      <TableCell>{s && <ButtonLink href={s.pendingCount && hasPermission(user, "grading.manage") ? `/cham-bai/${s.id}` : `/ket-qua/${s.id}`} size="sm" variant={s.pendingCount ? "primary" : "outline"}>{s.pendingCount ? "Chấm" : "Xem"}</ButtonLink>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </section>

          <Card><CardContent>
            <h2 className="text-h3 font-bold">Bé nào hay sai phần nào</h2>
            <p className="mb-4 text-sm text-muted">Tỉ lệ làm đúng theo kỹ năng trong bài này. Ô đỏ là phần nên kèm thêm.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr><th className="text-left text-xs font-semibold text-muted">Học viên</th>{r.skills.map((k) => <th key={k} className="text-xs font-semibold text-muted">{SKILL_LABEL[k]}</th>)}</tr>
                </thead>
                <tbody>
                  {r.rows.filter((x) => x.submission).map((x) => (
                    <tr key={x.student.id}>
                      <td className="whitespace-nowrap pr-2">{x.student.fullName}</td>
                      {r.skills.map((k) => (
                        <td key={k} className={cn("rounded-md px-2 py-1.5 text-center font-semibold", heatClass(x.perSkill[k]))}>
                          {x.perSkill[k] === undefined ? "…" : `${x.perSkill[k]}%`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="size-3.5 rounded bg-success/15" />Từ 80%</span>
              <span className="flex items-center gap-1.5"><i className="size-3.5 rounded bg-wood-100" />50–79%</span>
              <span className="flex items-center gap-1.5"><i className="size-3.5 rounded bg-danger/15" />Dưới 50%</span>
              <span className="flex items-center gap-1.5"><i className="size-3.5 rounded bg-surface-subtle" />Chờ chấm</span>
            </div>
          </CardContent></Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card><CardContent>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-h3 font-bold">Chưa làm bài ({missing.length})</h2>
              {missing.length > 0 && <RemindButton title={a.title} due={formatDateTime(a.dueAt)} names={missing.map((m) => `${m.student.fullName} – ${m.student.className}`)} />}
            </div>
            {missing.length ? (
              <ul className="divide-y divide-line text-sm">
                {missing.map(({ student }) => (
                  <li key={student.id} className="flex justify-between gap-3 py-2">
                    <span>{student.fullName}<span className="block text-xs text-muted">{student.className}</span></span>
                    <span className="text-xs text-muted">{student.parentPhone}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-center text-sm text-muted">🎉 Cả lớp đã nộp bài.</p>}
          </CardContent></Card>

          <Card><CardContent>
            <h2 className="mb-3 text-h3 font-bold">Tỉ lệ đúng từng câu</h2>
            <div className="space-y-3">
              {r.questionStats.map((q, i) => (
                <div key={q.id} className="grid grid-cols-[32px_1fr_44px] items-center gap-2 text-sm">
                  <b>C{i + 1}</b>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted" title={`${QUESTION_TYPE_LABEL[q.type]}: ${q.prompt}`}>{QUESTION_TYPE_ICON[q.type]} {q.prompt}</p>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-subtle">
                      <div className={cn("h-full rounded-full", (q.pct ?? 0) >= 75 ? "bg-success" : (q.pct ?? 0) >= 50 ? "bg-wood-400" : "bg-danger")} style={{ width: `${q.pct ?? 0}%` }} />
                    </div>
                  </div>
                  <span className="text-right font-semibold tabular-nums">{q.pct === null ? "–" : `${q.pct}%`}</span>
                </div>
              ))}
            </div>
            {worst && worst.pct! < 60 && (
              <Alert variant="danger" className="mt-4">
                Câu {r.questionStats.indexOf(worst) + 1} ({QUESTION_TYPE_LABEL[worst.type].toLowerCase()}) chỉ {worst.pct}% làm đúng. Nên chữa lại trên lớp.
              </Alert>
            )}
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
