import type { Metadata } from "next";
import { StudentsWorkspace, type StudentsWorkspaceProps } from "@/modules/students/components/students-workspace";

export const metadata: Metadata = { title: "Học viên" };

export default function Page(props: StudentsWorkspaceProps) {
  return <StudentsWorkspace {...props} />;
}
