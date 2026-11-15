import type { Metadata } from "next";
import { AssignmentBuilderWorkspace, type AssignmentBuilderWorkspaceProps } from "@/modules/assignments/components/assignment-builder-workspace";

export const metadata: Metadata = { title: "Giao bài mới" };

export default function Page(props: AssignmentBuilderWorkspaceProps) {
  return <AssignmentBuilderWorkspace {...props} />;
}
