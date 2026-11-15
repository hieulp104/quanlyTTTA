import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { requirePagePermission } from "@/common/guards/page.guard";
import { PageHeader } from "@/components/patterns/page-header";
import { ButtonAnchor, EmptyState, TabLink, Tabs, TabsList } from "@/components/ui";
import { myChildren } from "@/modules/parents/parents.service";
import { getStudentReport } from "@/modules/students/students.service";
import { StudentReportView } from "@/modules/students/components/student-report-view";

export type ParentWorkspaceProps = { searchParams: Promise<{ con?: string }> };

export async function ParentWorkspace({ searchParams }: ParentWorkspaceProps) {
  const user = await requirePagePermission("child.view");
  const { con } = await searchParams;
  const children = await myChildren(user.id);
  if (!children.length) {
    return <EmptyState title="Chưa có học viên nào gắn với số điện thoại này" description="Bố mẹ liên hệ trung tâm để được gắn tài khoản với con nhé." />;
  }
  const current = children.find((c) => c.id === con) ?? children[0];
  const report = await getStudentReport(current.id);
  if (!report) notFound();

  return (
    <>
      <PageHeader
        title="Con học thế nào?"
        actions={
          <ButtonAnchor href={`tel:${report.student.campus.phone.replace(/\s/g, "")}`} variant="outline">
            <Phone className="size-4" /> Gọi trung tâm
          </ButtonAnchor>
        }
      />
      {children.length > 1 && (
        <Tabs className="mb-5">
          <TabsList>
            {children.map((c) => (
              <TabLink key={c.id} href={`/phu-huynh?con=${c.id}`} active={c.id === current.id}>{c.fullName}</TabLink>
            ))}
          </TabsList>
        </Tabs>
      )}
      <p className="-mt-4 mb-6 text-muted">
        {report.student.fullName} · {report.student.className} · {report.student.campus.name}
      </p>
      <StudentReportView report={report} forParent />
    </>
  );
}
