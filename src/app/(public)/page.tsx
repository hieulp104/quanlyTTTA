import type { Metadata } from "next";
import { LandingWorkspace } from "@/modules/landing/components/landing-workspace";

export const metadata: Metadata = {
  title: { absolute: "GoSpeak English – Tiếng Anh thiếu nhi & giao tiếp 4 kỹ năng tại Hà Nội" },
  description:
    "GoSpeak English: tiếng Anh thiếu nhi và giao tiếp 4 kỹ năng. 2 cơ sở tại Hà Nội, lớp nhỏ, bài tập online, phụ huynh theo dõi điểm và nhận xét của con. Đăng ký học thử miễn phí.",
  openGraph: { title: "GoSpeak English – Con tự tin nói tiếng Anh", type: "website" },
};

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <LandingWorkspace />;
}
