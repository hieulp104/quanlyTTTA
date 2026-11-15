import { notFound } from "next/navigation";
import { requirePagePermission } from "@/common/guards/page.guard";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import { getPlayerAssignment } from "@/modules/study/study.service";
import { PlayerGate } from "@/modules/study/components/player-gate";

export type PlayerWorkspaceProps = { params: Promise<{ id: string }> };

export async function PlayerWorkspace({ params }: PlayerWorkspaceProps) {
  const user = await requirePagePermission("study.do");
  const { id } = await params;
  const a = await getPlayerAssignment(user.studentId!, id);
  if (!a) notFound();

  if (a.maxAttempts && a.attempts >= a.maxAttempts) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          variant="plain"
          icon={<span className="text-xl">🙌</span>}
          title={`Con đã làm bài này ${a.attempts} lần, đủ số lần cô cho phép.`}
          action={a.lastSubmissionId ? <ButtonLink href={`/ket-qua/${a.lastSubmissionId}`}>Xem lại bài làm</ButtonLink> : null}
        />
      </Card>
    );
  }

  return <PlayerGate assignment={a} />;
}
