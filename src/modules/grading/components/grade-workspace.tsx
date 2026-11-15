import { notFound, redirect } from "next/navigation";
import { requirePagePermission } from "@/common/guards/page.guard";
import { can } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { Alert, BackLink } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { getSubmissionDetail } from "@/modules/study/study.service";
import { ScoreText, formatDuration } from "@/modules/study/components/study-bits";
import { GradeForm } from "@/modules/grading/components/grade-form";

export type GradeWorkspaceProps = { params: Promise<{ id: string }>; searchParams: Promise<{ "vua-cham"?: string }> };

export async function GradeWorkspace({ params, searchParams }: GradeWorkspaceProps) {
  const user = await requirePagePermission("grading.manage");
  const { id } = await params;
  const justGraded = (await searchParams)["vua-cham"];
  const sub = await getSubmissionDetail(id);
  if (!sub) notFound();
  if (!can(user, "grading.manage", { teacherIds: [sub.classTeacherId], campusIds: [sub.campusId] })) redirect("/khong-co-quyen");

  return (
    <>
      {justGraded && <Alert variant="success" className="mb-4">Đã lưu điểm bài của {justGraded}. Đây là bài tiếp theo cần chấm.</Alert>}
      <BackLink href={`/bai-tap/${sub.assignment.id}`}>← {sub.assignment.title}</BackLink>
      <PageHeader
        title={sub.student.fullName}
        actions={<span className="flex items-center gap-2"><ScoreText score={sub.score} className="text-3xl" />{sub.pendingCount > 0 && <span className="text-sm text-muted">tạm tính</span>}</span>}
      />
      <p className="-mt-5 mb-6 text-sm text-muted">
        {sub.student.className} · Lần {sub.attempt} · Nộp {formatDateTime(sub.submittedAt)} · Làm trong {formatDuration(sub.durationSec)}
      </p>
      <GradeForm submission={sub} />
    </>
  );
}
