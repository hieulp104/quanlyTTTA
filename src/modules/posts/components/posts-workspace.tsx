import { requirePagePermission } from "@/common/guards/page.guard";
import { PageHeader } from "@/components/patterns/page-header";
import { Badge, ButtonLink, Card, CardContent, EmptyState, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { POST_KIND_LABEL } from "@/common/enums";
import { listCampuses } from "@/modules/classes/classes.service";
import { listPosts } from "@/modules/posts/posts.service";
import { PostForm } from "@/modules/posts/components/post-form";
import { DeletePostButton } from "@/modules/posts/components/delete-post-button";

export async function PostsWorkspace() {
  await requirePagePermission("post.manage");
  const [posts, campuses] = await Promise.all([listPosts(), listCampuses()]);

  return (
    <>
      <PageHeader title="Tin tức & lịch khai giảng" actions={<ButtonLink href="/#tin-tuc" target="_blank" variant="outline">Xem trên trang chủ</ButtonLink>} />
      <p className="-mt-4 mb-6 text-muted">Bài đăng ở đây hiện ngay trên trang giới thiệu trung tâm.</p>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          {posts.length ? (
            <TableContainer>
              <Table className="min-w-[560px]">
                <TableHeader><TableRow><TableHead>Tiêu đề</TableHead><TableHead>Loại</TableHead><TableHead>Ngày</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {posts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell><b>{p.title}</b><span className="block text-xs text-muted">{p.campus?.name ?? "Cả 2 cơ sở"} · {p.body}</span></TableCell>
                      <TableCell><Badge variant={p.kind === "OPENING" ? "warning" : "info"}>{POST_KIND_LABEL[p.kind]}</Badge></TableCell>
                      <TableCell tone="muted">{formatDate(p.eventDate)}</TableCell>
                      <TableCell><DeletePostButton id={p.id} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <EmptyState title="Chưa có bài đăng" />}
        </div>
        <Card className="h-fit"><CardContent>
          <h2 className="mb-4 text-h3 font-bold">Đăng mới</h2>
          <PostForm campuses={campuses.map((c) => ({ id: c.id, name: c.name }))} />
        </CardContent></Card>
      </div>
    </>
  );
}
