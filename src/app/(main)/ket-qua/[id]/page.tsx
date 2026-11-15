import type { Metadata } from "next";
import {
  SubmissionResultWorkspace,
  type SubmissionResultWorkspaceProps,
} from "@/modules/study/components/submission-result-workspace";

export const metadata: Metadata = { title: "Kết quả bài làm" };

export default function SubmissionResultPage(props: SubmissionResultWorkspaceProps) {
  return <SubmissionResultWorkspace {...props} />;
}
