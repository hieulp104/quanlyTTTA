import type { Metadata } from "next";
import { StudyHomeWorkspace } from "@/modules/study/components/study-home-workspace";

export const metadata: Metadata = { title: "Bài tập của con" };

export default function StudyHomePage() {
  return <StudyHomeWorkspace />;
}
