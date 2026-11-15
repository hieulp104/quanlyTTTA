import type { Metadata } from "next";
import { StudentDetailWorkspace, type StudentDetailWorkspaceProps } from "@/modules/students/components/student-detail-workspace";

export const metadata: Metadata = { title: "Hồ sơ học viên" };

export default function Page(props: StudentDetailWorkspaceProps) {
  return <StudentDetailWorkspace {...props} />;
}
