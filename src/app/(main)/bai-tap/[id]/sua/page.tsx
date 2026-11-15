import type { Metadata } from "next";
import { AssignmentBuilderWorkspace, type AssignmentBuilderWorkspaceProps } from "@/modules/assignments/components/assignment-builder-workspace";

export const metadata: Metadata = { title: "Sửa bài tập" };

export default function Page(props: AssignmentBuilderWorkspaceProps) {
  return <AssignmentBuilderWorkspace {...props} />;
}
