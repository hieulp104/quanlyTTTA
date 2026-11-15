import type { Metadata } from "next";
import { GradingWorkspace } from "@/modules/grading/components/grading-workspace";

export const metadata: Metadata = { title: "Chấm bài" };

export default function Page() {
  return <GradingWorkspace />;
}
