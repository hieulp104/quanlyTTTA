import Link from "next/link";
import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission, scopeOf } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState, TabLink, Tabs, TabsList, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { listCampuses, listClasses } from "@/modules/classes/classes.service";
import { listStudents } from "@/modules/students/students.service";
import { studentFilterSchema } from "@/modules/students/students.schema";
import { ScoreText } from "@/modules/study/components/study-bits";
import { StudentFilters } from "@/modules/students/components/student-filters";
import { AddStudentButton } from "@/modules/students/components/add-student-dialog";
import { ImportStudentsButton } from "@/modules/students/components/import-students-dialog";

export type StudentsWorkspaceProps = { searchParams: Promise<{ lop?: string; coso?: string; q?: string }> };

export async function StudentsWorkspace({ searchParams }: StudentsWorkspaceProps) {
  const user = await requirePagePermission("student.view");
  const raw = await searchParams;
  const filter = studentFilterSchema.parse({ classId: raw.lop || undefined, campusId: raw.coso || undefined, q: raw.q || undefined });
  const isAll = scopeOf(user, "student.view") === "ALL";

  const [rows, classes, campuses, manageClasses] = await Promise.all([
    listStudents(user, filter),
    listClasses(user, "student.view"),
    listCampuses(),
    listClasses(user, "student.manage"),
  ]);
  const classOptions = manageClasses.map((c) => ({ id: c.id, name: c.name, campus: c.campus.name }));
  const qs = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ ...raw, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return s ? `/hoc-vien?${s}` : "/hoc-vien";
  };

  return (
    <>
      <PageHeader
        title="Học viên"
        actions={
          <>
            {hasPermission(user, "student.manage") && <AddStudentButton classes={classOptions} />}
            {hasPermission(user, "student.import") && <ImportStudentsButton classes={classOptions} />}
          </>
        }
      />

      {isAll && (
        <Tabs className="mb-4">
          <TabsList>
            <TabLink href={qs({ coso: undefined, lop: undefined })} active={!filter.campusId}>Cả 2 cơ sở</TabLink>
            {campuses.map((c) => <TabLink key={c.id} href={qs({ coso: c.id, lop: undefined })} active={filter.campusId === c.id}>{c.name}</TabLink>)}
          </TabsList>
        </Tabs>
      )}
      <StudentFilters
        classes={classes.filter((c) => !filter.campusId || c.campusId === filter.campusId).map((c) => ({ id: c.id, name: `${c.name} – ${c.campus.name}` }))}
        classId={filter.classId}
        q={filter.q}
      />
      <p className="mb-3 text-sm text-muted">{rows.length} học viên</p>

      {rows.length ? (
        <TableContainer>
          <Table className="min-w-[760px]">
            <TableHeader><TableRow><TableHead>Mã HV</TableHead><TableHead>Học viên</TableHead><TableHead>Lớp</TableHead><TableHead>Phụ huynh</TableHead><TableHead>Bài đã làm</TableHead><TableHead className="text-right">Điểm TB</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell tone="muted">{s.code}</TableCell>
                  <TableCell className="whitespace-nowrap"><Link href={`/hoc-vien/${s.id}`} className="font-semibold hover:underline">{s.fullName}</Link></TableCell>
                  <TableCell>{s.className}<span className="block text-xs text-muted">{s.campus}</span></TableCell>
                  <TableCell>{s.parentName ?? "–"}<span className="block text-xs text-muted">{s.parentPhone}</span></TableCell>
                  <TableCell>{s.done}/{s.assigned}</TableCell>
                  <TableCell className="text-right"><ScoreText score={s.avg} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState title="Chưa có học viên" description="Bấm “Nhập từ Excel” để đưa danh sách có sẵn của trung tâm lên." />
      )}
    </>
  );
}
