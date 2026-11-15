import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { studentAssignments } from "@/modules/study/study.service";
import { ScoreText, StateBadge } from "@/modules/study/components/study-bits";
import { myChildren } from "@/modules/parents/parents.service";
import { prisma } from "@/shared/prisma/prisma.service";

export type ResultsWorkspaceProps = { searchParams: Promise<{ con?: string }> };

/** Bảng điểm từng bài — học viên xem của mình, phụ huynh xem của con. */
export async function ResultsWorkspace({ searchParams }: ResultsWorkspaceProps) {
  const user = await requirePagePermission("result.view");
  const { con } = await searchParams;

  let studentId = user.studentId;
  if (!studentId && hasPermission(user, "child.view")) {
    const kids = await myChildren(user.id);
    studentId = (kids.find((k) => k.id === con) ?? kids[0])?.id ?? null;
  }
  if (!studentId) redirect("/khong-co-quyen");

  const st = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, include: { classGroup: { select: { name: true } } } });
  const rows = await studentAssignments(studentId);
  const isStudent = hasPermission(user, "study.do");

  return (
    <>
      <PageHeader title={isStudent ? "Kết quả của con" : "Bài tập & điểm của con"} />
      <p className="-mt-4 mb-6 text-muted">{st.fullName} · {st.classGroup.name}</p>
      {rows.length ? (
        <TableContainer>
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow><TableHead>Bài tập</TableHead><TableHead>Hạn nộp</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Điểm</TableHead><TableHead>Lần làm</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.title}</TableCell>
                  <TableCell tone="muted">{formatDate(r.dueAt)}</TableCell>
                  <TableCell><StateBadge state={r.state} /></TableCell>
                  <TableCell className="text-right"><ScoreText score={r.last?.score} /></TableCell>
                  <TableCell>{r.attempts}{r.maxAttempts ? `/${r.maxAttempts}` : ""}</TableCell>
                  <TableCell>
                    {r.last ? (
                      <Link href={`/ket-qua/${r.last.id}`} className="text-link hover:underline">Xem chi tiết</Link>
                    ) : isStudent ? (
                      <Link href={`/hoc-tap/${r.id}`} className="text-link hover:underline">Làm bài</Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState title="Chưa có bài tập nào" description="Khi cô giao bài, bài sẽ hiện ở đây." />
      )}
    </>
  );
}
