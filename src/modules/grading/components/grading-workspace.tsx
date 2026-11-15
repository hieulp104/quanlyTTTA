import { requirePagePermission } from "@/common/guards/page.guard";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge, ButtonLink, EmptyState, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL } from "@/common/enums";
import { listPendingGrading } from "@/modules/grading/grading.service";

export async function GradingWorkspace() {
  const user = await requirePagePermission("grading.manage");
  const list = await listPendingGrading(user);

  return (
    <>
      <PageHeader title="Chấm bài nói & bài viết" actions={list[0] ? <ButtonLink href={`/cham-bai/${list[0].id}`}>Chấm lần lượt</ButtonLink> : null} />
      <p className="-mt-4 mb-6 text-muted">Trắc nghiệm đã được chấm tự động. Ở đây là các bài cô cần nghe, đọc và nhận xét.</p>
      {list.length ? (
        <TableContainer>
          <Table className="min-w-[720px]">
            <TableHeader><TableRow><TableHead>Học viên</TableHead><TableHead>Lớp</TableHead><TableHead>Bài tập</TableHead><TableHead>Cần chấm</TableHead><TableHead>Nộp lúc</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.student.fullName}</TableCell>
                  <TableCell tone="muted">{s.student.classGroup.name}<span className="block text-xs">{s.student.classGroup.campus.name}</span></TableCell>
                  <TableCell>{s.assignment.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.answers.map((a, i) => <Badge key={i} variant="info">{QUESTION_TYPE_ICON[a.question.type]} {QUESTION_TYPE_LABEL[a.question.type]}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell tone="muted">{formatDateTime(s.submittedAt)}</TableCell>
                  <TableCell><ButtonLink href={`/cham-bai/${s.id}`} size="sm">Chấm</ButtonLink></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState icon={<span className="text-xl">✅</span>} title="Không còn bài nào chờ chấm" />
      )}
    </>
  );
}
