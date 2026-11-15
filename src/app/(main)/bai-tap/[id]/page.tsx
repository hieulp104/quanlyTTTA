import type { Metadata } from "next";
import { AssignmentResultsWorkspace, type AssignmentResultsWorkspaceProps } from "@/modules/assignments/components/assignment-results-workspace";

export const metadata: Metadata = { title: "Kết quả bài tập" };

export default function Page(props: AssignmentResultsWorkspaceProps) {
  return <AssignmentResultsWorkspace {...props} />;
}
