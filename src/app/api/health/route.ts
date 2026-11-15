import { prisma } from "@/shared/prisma/prisma.service";

export const dynamic = "force-dynamic";

/** Docker healthcheck: app trả lời được và còn nói chuyện được với Postgres. Không cần đăng nhập. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
