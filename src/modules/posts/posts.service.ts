import { prisma } from "@/shared/prisma/prisma.service";

export async function listPosts() {
  return prisma.post.findMany({
    where: { deletedAt: null },
    orderBy: { eventDate: "desc" },
    include: { campus: { select: { name: true } } },
  });
}

/** Dữ liệu cho trang giới thiệu: lịch khai giảng sắp tới + tin mới nhất. */
export async function publicPosts() {
  const since = new Date(Date.now() - 86_400_000);
  const [openings, news] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null, kind: "OPENING", eventDate: { gte: since } },
      orderBy: { eventDate: "asc" },
      take: 4,
      include: { campus: { select: { name: true } } },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, kind: { in: ["EVENT", "NEWS"] } },
      orderBy: { eventDate: "desc" },
      take: 4,
    }),
  ]);
  return { openings, news };
}
