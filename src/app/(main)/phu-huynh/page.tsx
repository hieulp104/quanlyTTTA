import type { Metadata } from "next";
import { ParentWorkspace, type ParentWorkspaceProps } from "@/modules/parents/components/parent-workspace";

export const metadata: Metadata = { title: "Con học thế nào" };

export default function ParentPage(props: ParentWorkspaceProps) {
  return <ParentWorkspace {...props} />;
}
