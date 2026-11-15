import { requirePagePermission } from "@/common/guards/page.guard";
import { hasPermission } from "@/common/permissions/permissions";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge, EmptyState, TabLink, Tabs, TabsList, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { LEAD_STATUS_LABEL } from "@/common/enums";
import type { LeadStatus } from "@/generated/prisma/enums";
import { leadCounts, listLeads } from "@/modules/leads/leads.service";
import { LeadStatusSelect } from "@/modules/leads/components/lead-status-select";

export type LeadsWorkspaceProps = { searchParams: Promise<{ tt?: string }> };

const STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];

export async function LeadsWorkspace({ searchParams }: LeadsWorkspaceProps) {
  const user = await requirePagePermission("lead.view");
  const { tt } = await searchParams;
  const status = STATUSES.includes(tt as LeadStatus) ? (tt as LeadStatus) : undefined;
  const [rows, counts] = await Promise.all([listLeads(status), leadCounts()]);
  const total = Object.values(counts).reduce((n, c) => n + (c ?? 0), 0);
  const canManage = hasPermission(user, "lead.manage");

  return (
    <>
      <PageHeader title="Đăng ký học thử" />
      <p className="-mt-4 mb-5 text-muted">Phụ huynh để lại thông tin từ form trên trang giới thiệu.</p>
      <Tabs className="mb-5">
        <TabsList>
          <TabLink href="/dang-ky-hoc-thu" active={!status}>Tất cả ({total})</TabLink>
          {STATUSES.map((s) => <TabLink key={s} href={`/dang-ky-hoc-thu?tt=${s}`} active={status === s}>{LEAD_STATUS_LABEL[s]} ({counts[s] ?? 0})</TabLink>)}
        </TabsList>
      </Tabs>
      {rows.length ? (
        <TableContainer>
          <Table className="min-w-[860px]">
            <TableHeader><TableRow><TableHead>Phụ huynh</TableHead><TableHead>Con</TableHead><TableHead>Khóa quan tâm</TableHead><TableHead>Cơ sở</TableHead><TableHead>Gọi lúc</TableHead><TableHead>Gửi lúc</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <b>{l.parentName}</b>
                    <a href={`tel:${l.phone}`} className="block text-link hover:underline">{l.phone}</a>
                    {l.note && <span className="block text-xs text-muted">{l.note}</span>}
                  </TableCell>
                  <TableCell>{l.childAge ?? "–"}</TableCell>
                  <TableCell>{l.course}</TableCell>
                  <TableCell>{l.campus?.name ?? "–"}</TableCell>
                  <TableCell tone="muted">{l.callTime ?? "–"}</TableCell>
                  <TableCell tone="muted">{formatDateTime(l.createdAt)}</TableCell>
                  <TableCell>
                    {canManage ? <LeadStatusSelect id={l.id} status={l.status} /> : <Badge>{LEAD_STATUS_LABEL[l.status]}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState title="Chưa có đăng ký nào" description="Đăng ký từ form trên trang giới thiệu sẽ hiện ở đây." />
      )}
    </>
  );
}
