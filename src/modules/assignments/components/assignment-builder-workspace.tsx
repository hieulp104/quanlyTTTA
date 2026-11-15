import { notFound, redirect } from "next/navigation";
import { requirePagePermission } from "@/common/guards/page.guard";
import { can, hasPermission } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { BackLink } from "@/components/ui";
import { nowMs } from "@/lib/utils";
import { listClasses } from "@/modules/classes/classes.service";
import { getAssignmentForEdit, getImportRequest } from "@/modules/assignments/assignments.service";
import { AssignmentBuilder, type BuilderProps } from "@/modules/assignments/components/assignment-builder";
import { DeleteAssignmentButton } from "@/modules/assignments/components/delete-assignment-button";

/** Giờ VN dạng yyyy-MM-ddTHH:mm cho ô datetime-local. */
function toLocalInput(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

export type AssignmentBuilderWorkspaceProps = {
  params?: Promise<{ id: string }>;
  searchParams?: Promise<{ nhap?: string }>;
};

export async function AssignmentBuilderWorkspace({ params, searchParams }: AssignmentBuilderWorkspaceProps) {
  const user = await requirePagePermission("assignment.manage");
  const id = params ? (await params).id : undefined;
  const nhap = searchParams ? (await searchParams).nhap : undefined;

  const classes = (await listClasses(user, "assignment.manage")).map((c) => ({ id: c.id, name: c.name, campus: c.campus.name }));

  let initial: BuilderProps["initial"];
  let hasSubmissions = false;
  let importRequest: BuilderProps["importRequest"];

  if (id) {
    const a = await getAssignmentForEdit(id);
    if (!a) notFound();
    if (!can(user, "assignment.manage", { teacherIds: [a.createdById, ...a.teacherIds] })) redirect("/khong-co-quyen");
    hasSubmissions = a.submissionCount > 0;
    initial = {
      title: a.title,
      note: a.note,
      classIds: a.classIds,
      dueAt: toLocalInput(a.dueAt),
      timeLimitMin: a.timeLimitMin,
      maxAttempts: a.maxAttempts,
      questions: a.questions.map((q) => ({ ...q, key: q.id })),
    };
  } else {
    let classIds: string[] = [];
    if (nhap && hasPermission(user, "assignment.importProcess")) {
      const r = await getImportRequest(nhap);
      if (r && r.status === "PENDING") {
        importRequest = { id: r.id, files: r.files, note: r.note };
        classIds = r.classIds.filter((c) => classes.some((x) => x.id === c));
      }
    }
    initial = {
      title: "",
      note: "",
      classIds,
      dueAt: toLocalInput(new Date(nowMs() + 5 * 86_400_000)),
      timeLimitMin: 20,
      maxAttempts: 2,
      questions: [],
    };
  }

  return (
    <>
      <BackLink href={id ? `/bai-tap/${id}` : "/bai-tap"}>← {id ? "Kết quả bài" : "Bài tập"}</BackLink>
      <PageHeader title={id ? "Sửa bài tập" : importRequest ? "Nhập bài từ file" : "Giao bài mới"} actions={id ? <DeleteAssignmentButton id={id} /> : null} />
      <AssignmentBuilder assignmentId={id} initial={initial} classes={classes} importRequest={importRequest} hasSubmissions={hasSubmissions} />
    </>
  );
}
