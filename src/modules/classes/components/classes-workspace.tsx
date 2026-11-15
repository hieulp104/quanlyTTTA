import Link from "next/link";
import { requirePagePermission } from "@/common/guards/page.guard";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge, EmptyState, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { classStats, listClasses } from "@/modules/classes/classes.service";
import { ScoreText } from "@/modules/study/components/study-bits";

export async function ClassesWorkspace() {
  const user = await requirePagePermission("class.view");
  const classes = await listClasses(user);
  const stats = await classStats(classes.map((c) => c.id));

  return (
    <>
      <PageHeader title="Lớp học" />
      {classes.length ? (
        <TableContainer>
          <Table className="min-w-[760px]">
            <TableHeader><TableRow><TableHead>Lớp</TableHead><TableHead>Cơ sở</TableHead><TableHead>Giáo viên</TableHead><TableHead>Lịch học</TableHead><TableHead className="text-right">Sĩ số</TableHead><TableHead>Tỉ lệ làm bài</TableHead><TableHead className="text-right">Điểm TB</TableHead></TableRow></TableHeader>
            <TableBody>
              {classes.map((c) => {
                const s = stats.get(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell><Link href={`/hoc-vien?lop=${c.id}`} className="font-semibold hover:underline">{c.name}</Link><span className="block text-xs text-muted">{c.level}</span></TableCell>
                    <TableCell>{c.campus.name}</TableCell>
                    <TableCell>{c.teacher?.fullName ?? "–"}</TableCell>
                    <TableCell tone="muted">{c.schedule}</TableCell>
                    <TableCell className="text-right">{c._count.students}</TableCell>
                    <TableCell>{s?.doneRate == null ? "–" : <Badge variant={s.doneRate >= 80 ? "success" : s.doneRate >= 50 ? "warning" : "danger"}>{s.doneRate}%</Badge>}</TableCell>
                    <TableCell className="text-right"><ScoreText score={s?.avgScore} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState title="Chưa có lớp nào" />
      )}
    </>
  );
}
