import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { can, hasPermission } from "@/common/permissions/permissions";
import { BackLink, Badge, ButtonLink, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { getSubmissionDetail } from "@/modules/study/study.service";
import { ReviewList } from "@/modules/study/components/review-list";
import { formatDuration } from "@/modules/study/components/study-bits";
import { scoreTone } from "@/modules/study/study.scoring";
import { cn } from "@/lib/utils";

export type SubmissionResultWorkspaceProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ moi?: string }>;
};

function cheer(score: number | null) {
  if (score === null) return { emoji: "⏳", text: "Cô sẽ chấm bài nói / bài viết và gửi điểm sớm." };
  if (score >= 9) return { emoji: "🏆", text: "Xuất sắc! Con làm rất tốt." };
  if (score >= 7) return { emoji: "🎉", text: "Giỏi lắm! Xem lại các câu sai nhé." };
  if (score >= 5) return { emoji: "👍", text: "Khá rồi! Xem đáp án rồi làm lại để được điểm cao hơn." };
  return { emoji: "💪", text: "Không sao, con xem đáp án rồi thử lại nhé!" };
}

export async function SubmissionResultWorkspace({ params, searchParams }: SubmissionResultWorkspaceProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { moi } = await searchParams;
  const sub = await getSubmissionDetail(id);
  if (!sub) notFound();

  // Học viên / phụ huynh: bài của chính mình / con mình. Nhân sự: lớp mình phụ trách.
  const allowed =
    can(user, "result.view", { ownerIds: [sub.student.userId, sub.student.parentUserId] }) ||
    can(user, "assignment.view", { teacherIds: [sub.classTeacherId], campusIds: [sub.campusId] });
  if (!allowed) redirect("/khong-co-quyen");

  const isStudent = hasPermission(user, "study.do");
  const isStaff = hasPermission(user, "assignment.view");
  const canRetry = isStudent && (!sub.assignment.maxAttempts || sub.attempts < sub.assignment.maxAttempts);
  const c = cheer(sub.score);
  const tone = scoreTone(sub.score);
  const back = isStudent ? "/hoc-tap" : isStaff ? `/bai-tap/${sub.assignment.id}` : "/ket-qua";

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={back}>← Quay lại</BackLink>
      <Card className="mb-5 p-8 text-center">
        <p className="text-6xl" aria-hidden>{c.emoji}</p>
        <p
          className={cn(
            "mt-3 font-display text-6xl font-extrabold leading-none",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger",
          )}
        >
          {sub.score === null ? "Chờ chấm" : <>{sub.score.toLocaleString("vi-VN")}<small className="text-2xl text-muted">/10</small></>}
        </p>
        <p className="mt-3 text-lg">{moi ? c.text : sub.assignment.title}</p>
        <p className="mt-1 text-sm text-muted">
          {sub.student.fullName} · Lần {sub.attempt} · Nộp lúc {formatDateTime(sub.submittedAt)} · Làm trong {formatDuration(sub.durationSec)}
          {sub.autoSubmitted && " · Tự nộp khi hết giờ"}
        </p>
        {sub.pendingCount > 0 && sub.score !== null && (
          <Badge variant="info" className="mt-3">Điểm tạm tính · còn {sub.pendingCount} câu chờ cô chấm</Badge>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {canRetry && (
            <ButtonLink href={`/hoc-tap/${sub.assignment.id}`}>
              Làm lại{sub.assignment.maxAttempts ? ` (còn ${sub.assignment.maxAttempts - sub.attempts} lần)` : ""}
            </ButtonLink>
          )}
          {hasPermission(user, "grading.manage") && <ButtonLink href={`/cham-bai/${sub.id}`}>Chấm / nhận xét</ButtonLink>}
          {isStudent && <ButtonLink href="/hoc-tap" variant="outline">Về danh sách bài</ButtonLink>}
        </div>
      </Card>

      {sub.teacherComment && (
        <div className="mb-5 rounded-card bg-wood-50 px-5 py-4">
          <p className="text-xs font-semibold text-wood-700">Nhận xét chung của {sub.gradedBy ?? "cô"}</p>
          <p className="mt-1">{sub.teacherComment}</p>
        </div>
      )}

      <h2 className="mb-3 text-h3 font-bold">Chi tiết từng câu</h2>
      <ReviewList items={sub.items} />
    </div>
  );
}
