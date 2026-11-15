import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission, scopeOf } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge, ButtonLink, Card, CardContent, EmptyState, TabLink, Tabs, TabsList, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import { QUESTION_TYPE_ICON } from "@/common/enums";
import { listCampuses, listClasses } from "@/modules/classes/classes.service";
import { listAssignments, listImportRequests } from "@/modules/assignments/assignments.service";
import { ScoreText, relativeDue } from "@/modules/study/components/study-bits";
import { ImportFileButton } from "@/modules/assignments/components/import-file-dialog";
import { AssignmentRowActions } from "@/modules/assignments/components/assignment-row-actions";

export type AssignmentsWorkspaceProps = { searchParams: Promise<{ coso?: string }> };

export async function AssignmentsWorkspace({ searchParams }: AssignmentsWorkspaceProps) {
  const user = await requirePagePermission("assignment.view");
  const { coso } = await searchParams;
  const isAll = scopeOf(user, "assignment.view") === "ALL";
  const canManage = hasPermission(user, "assignment.manage");
  const canProcess = hasPermission(user, "assignment.importProcess");

  const [rows, campuses, classes, requests] = await Promise.all([
    listAssignments(user, { campusId: isAll ? coso : undefined }),
    listCampuses(),
    listClasses(user, "assignment.view"),
    listImportRequests(user, canProcess),
  ]);

  return (
    <>
      <PageHeader
        title="Bài tập"
        actions={
          <>
            {(hasPermission(user, "assignment.import") || canManage) && (
              <ImportFileButton classes={classes.map((c) => ({ id: c.id, name: c.name, campus: c.campus.name }))} />
            )}
            {canManage && (
              <ButtonLink href="/bai-tap/tao-moi"><Plus className="size-4" /> Soạn bài trên web</ButtonLink>
            )}
          </>
        }
      />

      {isAll && (
        <Tabs className="mb-5">
          <TabsList>
            <TabLink href="/bai-tap" active={!coso}>Cả 2 cơ sở</TabLink>
            {campuses.map((c) => <TabLink key={c.id} href={`/bai-tap?coso=${c.id}`} active={coso === c.id}>{c.name}</TabLink>)}
          </TabsList>
        </Tabs>
      )}

      {requests.length > 0 && (
        <Card className="mb-5"><CardContent>
          <h2 className="mb-2 text-h3 font-bold">File đề đang chờ nhập</h2>
          <ul className="divide-y divide-line text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  📄 <b>{r.fileNames}</b>
                  <span className="block text-xs text-muted">{r.createdBy.fullName} gửi {formatDateTime(r.createdAt)}{r.note ? ` · ${r.note}` : ""}</span>
                </span>
                {canProcess ? (
                  <ButtonLink href={`/bai-tap/tao-moi?nhap=${r.id}`} size="sm">Nhập thành bài tập</ButtonLink>
                ) : (
                  <Badge variant="warning">Học vụ đang nhập</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}

      {rows.length ? (
        <TableContainer>
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Bài tập</TableHead><TableHead>Lớp</TableHead><TableHead>Hạn nộp</TableHead><TableHead>Cài đặt</TableHead><TableHead>Đã nộp</TableHead><TableHead className="text-right">Điểm TB</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/bai-tap/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
                    <p className="text-xs text-muted">
                      {a.questionCount} câu · {a.questionTypes.map((t) => QUESTION_TYPE_ICON[t]).join(" ")}{" "}
                      {a.source === "FILE" && <Badge variant="info">Nhập từ file</Badge>}
                    </p>
                  </TableCell>
                  <TableCell>{a.classes.length ? a.classes.map((c) => <span key={c.id} className="block">{c.name}</span>) : <Badge variant="warning">Chưa giao lớp</Badge>}</TableCell>
                  <TableCell tone="muted">{formatDate(a.dueAt)}<span className="block text-xs">{relativeDue(a.dueAt)}</span></TableCell>
                  <TableCell tone="muted" className="text-xs">
                    {a.timeLimitMin ? `⏱ ${a.timeLimitMin} phút` : "Không giới hạn giờ"}
                    <span className="block">{a.maxAttempts ? `🔁 ${a.maxAttempts} lần` : "🔁 Không giới hạn"}</span>
                  </TableCell>
                  <TableCell>
                    {a.done}/{a.total}
                    {a.pending > 0 && <Badge variant="info" className="ml-1">{a.pending} chờ chấm</Badge>}
                  </TableCell>
                  <TableCell className="text-right"><ScoreText score={a.avg} /></TableCell>
                  <TableCell><AssignmentRowActions id={a.id} canManage={canManage} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState title="Chưa có bài tập" description="Soạn bài trên web hoặc gửi file Word/PDF để học vụ nhập giúp." action={canManage ? <ButtonLink href="/bai-tap/tao-moi">Soạn bài đầu tiên</ButtonLink> : undefined} />
      )}
    </>
  );
}
