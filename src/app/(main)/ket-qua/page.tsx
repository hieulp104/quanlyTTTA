import type { Metadata } from "next";
import { ResultsWorkspace, type ResultsWorkspaceProps } from "@/modules/study/components/results-workspace";

export const metadata: Metadata = { title: "Kết quả" };

export default function ResultsPage(props: ResultsWorkspaceProps) {
  return <ResultsWorkspace {...props} />;
}
