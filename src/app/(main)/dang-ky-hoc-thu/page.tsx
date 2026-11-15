import type { Metadata } from "next";
import { LeadsWorkspace, type LeadsWorkspaceProps } from "@/modules/leads/components/leads-workspace";

export const metadata: Metadata = { title: "Đăng ký học thử" };

export default function Page(props: LeadsWorkspaceProps) {
  return <LeadsWorkspace {...props} />;
}
