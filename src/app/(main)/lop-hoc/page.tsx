import type { Metadata } from "next";
import { ClassesWorkspace } from "@/modules/classes/components/classes-workspace";

export const metadata: Metadata = { title: "Lớp học" };

export default function Page() {
  return <ClassesWorkspace />;
}
