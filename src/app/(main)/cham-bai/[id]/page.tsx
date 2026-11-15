import type { Metadata } from "next";
import { GradeWorkspace, type GradeWorkspaceProps } from "@/modules/grading/components/grade-workspace";

export const metadata: Metadata = { title: "Chấm bài" };

export default function Page(props: GradeWorkspaceProps) {
  return <GradeWorkspace {...props} />;
}
