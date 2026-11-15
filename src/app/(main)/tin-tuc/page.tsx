import type { Metadata } from "next";
import { PostsWorkspace } from "@/modules/posts/components/posts-workspace";

export const metadata: Metadata = { title: "Tin tức & khai giảng" };

export default function Page() {
  return <PostsWorkspace />;
}
