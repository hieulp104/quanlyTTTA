import { prisma } from "@/shared/prisma/prisma.service";

/** Các con của phụ huynh đang đăng nhập — anh chị em học cùng trung tâm thì có nhiều bé. */
export async function myChildren(parentUserId: string) {
  return prisma.student.findMany({
    where: { parentUserId, deletedAt: null },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}
