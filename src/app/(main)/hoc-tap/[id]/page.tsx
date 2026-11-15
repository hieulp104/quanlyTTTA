import type { Metadata } from "next";
import { PlayerWorkspace, type PlayerWorkspaceProps } from "@/modules/study/components/player-workspace";

export const metadata: Metadata = { title: "Làm bài" };

export default function PlayerPage(props: PlayerWorkspaceProps) {
  return <PlayerWorkspace {...props} />;
}
