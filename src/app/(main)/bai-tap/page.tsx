import type { Metadata } from "next";
import { AssignmentsWorkspace, type AssignmentsWorkspaceProps } from "@/modules/assignments/components/assignments-workspace";

export const metadata: Metadata = { title: "Bài tập" };

export default function Page(props: AssignmentsWorkspaceProps) {
  return <AssignmentsWorkspace {...props} />;
}
