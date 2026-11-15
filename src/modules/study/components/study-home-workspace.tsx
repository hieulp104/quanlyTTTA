import Link from "next/link";
import { requirePagePermission } from "@/common/guards/page.guard";
import { ButtonLink, Card, CardContent, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/shared/prisma/prisma.service";
import { studentAssignments, studentSkills } from "@/modules/study/study.service";
import { ScoreText, SkillBars, StateBadge, relativeDue } from "@/modules/study/components/study-bits";

type Row = Awaited<ReturnType<typeof studentAssignments>>[number];

function HomeworkCard({ a }: { a: Row }) {
  return (
    <Card className="grid items-center gap-x-4 gap-y-3 p-4 transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[1fr_auto] sm:px-5">
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-foreground">{a.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <StateBadge state={a.state} />
          <span>{a.questionCount} câu</span>
          <span>Hạn {formatDate(a.dueAt)} ({relativeDue(a.dueAt)})</span>
          {a.timeLimitMin > 0 && <span>Làm trong {a.timeLimitMin} phút</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {!a.last ? (
          <ButtonLink href={`/hoc-tap/${a.id}`} variant={a.state === "overdue" ? "outline" : "primary"} className="w-full sm:w-auto">
            Làm bài
          </ButtonLink>
        ) : (
          <>
            <ScoreText score={a.last.score} className="mr-1" />
            <ButtonLink href={`/ket-qua/${a.last.id}`} variant="outline" size="sm">Xem bài</ButtonLink>
            {a.canRetry && <ButtonLink href={`/hoc-tap/${a.id}`} variant="secondary" size="sm">Làm lại</ButtonLink>}
          </>
        )}
      </div>
    </Card>
  );
}

export async function StudyHomeWorkspace() {
  const user = await requirePagePermission("study.do");
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: user.studentId! },
    include: { classGroup: { include: { campus: true, teacher: { select: { fullName: true } } } } },
  });
  const [rows, skills] = await Promise.all([studentAssignments(student.id), studentSkills(student.id)]);
  const todo = rows.filter((r) => !r.last).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const done = rows.filter((r) => r.last);
  const stars = done.reduce((n, r) => n + (r.last?.score != null ? Math.round(r.last.score / 2) : 0), 0);
  const first = student.fullName.split(" ").slice(-2).join(" ");

  return (
    <>
      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-card bg-primary px-6 py-6 text-on-primary">
        <span aria-hidden className="absolute -right-10 -top-24 size-64 rounded-full bg-white/[0.07]" />
        <div className="gs-rise relative">
          <h1 className="font-display text-h1 font-extrabold">Chào {first}!</h1>
          <p className="mt-1 text-on-primary/90">
            {todo.length ? `Con có ${todo.length} bài cần làm. Cố lên nhé!` : "Con đã làm hết bài rồi. Giỏi quá!"}
          </p>
        </div>
        <p className="gs-rise relative flex items-baseline gap-2" style={{ "--d": "150ms" } as React.CSSProperties}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-7 self-center fill-wood-300">
            <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z" />
          </svg>
          <b className="font-display text-4xl font-extrabold leading-none tabular-nums">{stars}</b>
          <span className="text-sm text-on-primary/90">sao đã nhận</span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-3">
          <h2 className="text-h3 font-bold">Bài cần làm</h2>
          {todo.length ? todo.map((a) => <HomeworkCard key={a.id} a={a} />) : (
            <EmptyState title="Không còn bài nào" description="Con nghỉ ngơi hoặc làm lại bài cũ để lấy thêm sao nhé!" />
          )}
          <h2 className="pt-4 text-h3 font-bold">Bài đã làm</h2>
          {done.length ? done.map((a) => <HomeworkCard key={a.id} a={a} />) : <p className="text-sm text-muted">Chưa có bài nào.</p>}
        </div>
        <div className="min-w-0 space-y-4">
          <Card><CardContent>
            <h2 className="mb-4 text-h3 font-bold">Kỹ năng của con</h2>
            <SkillBars skills={skills} />
          </CardContent></Card>
          <Card><CardContent>
            <h2 className="mb-3 text-h3 font-bold">Lớp của con</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Lớp</dt><dd className="font-semibold">{student.classGroup.name}</dd>
              <dt className="text-muted">Giáo viên</dt><dd className="font-semibold">{student.classGroup.teacher?.fullName ?? "–"}</dd>
              <dt className="text-muted">Lịch học</dt><dd className="font-semibold">{student.classGroup.schedule}</dd>
              <dt className="text-muted">Cơ sở</dt><dd className="font-semibold">{student.classGroup.campus.name}</dd>
            </dl>
            <p className="mt-4 text-sm"><Link href="/ket-qua" className="text-link hover:underline">Xem tất cả kết quả</Link></p>
          </CardContent></Card>
        </div>
      </div>
    </>
  );
}
