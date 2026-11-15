import { notFound, redirect } from "next/navigation";
import { requirePagePermission } from "@/common/guards/page.guard";
import { can } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { BackLink } from "@/components/ui";
import { getStudentReport } from "@/modules/students/students.service";
import { StudentReportView } from "@/modules/students/components/student-report-view";

export type StudentDetailWorkspaceProps = { params: Promise<{ id: string }> };

export async function StudentDetailWorkspace({ params }: StudentDetailWorkspaceProps) {
  const user = await requirePagePermission("student.view");
  const { id } = await params;
  const report = await getStudentReport(id);
  if (!report) notFound();
  if (!can(user, "student.view", { teacherIds: [report.student.teacherId], campusIds: [report.student.campus.id] })) redirect("/khong-co-quyen");

  return (
    <>
      <BackLink href="/hoc-vien">← Học viên</BackLink>
      <PageHeader title={report.student.fullName} />
      <p className="-mt-5 mb-6 text-muted">{report.student.code} · {report.student.className} · {report.student.campus.name}</p>
      <StudentReportView report={report} />
    </>
  );
}
