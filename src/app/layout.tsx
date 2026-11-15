import type { Metadata } from "next";
import { Baloo_2, Be_Vietnam_Pro } from "next/font/google";
import {
  ACTIVE_THEME_FAMILY,
  ACTIVE_THEME_VARIANT,
  createThemeBootstrapScript,
  DEFAULT_THEME_MODE,
  getTheme,
  gospeakThemeManifest,
  ThemeProvider,
} from "@/components/theme";
import { ThemeBootstrapScript } from "@/components/theme/bootstrap-script";
import "./globals.css";

// Font hỗ trợ đầy đủ dấu tiếng Việt.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Font tròn, vui mắt cho tiêu đề trang giới thiệu & màn làm bài của các bé.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
});

const activeTheme = getTheme({
  family: ACTIVE_THEME_FAMILY,
  variant: ACTIVE_THEME_VARIANT,
  mode: DEFAULT_THEME_MODE,
});
const themeBootstrapScript = createThemeBootstrapScript({
  family: ACTIVE_THEME_FAMILY,
  variant: ACTIVE_THEME_VARIANT,
  fallbackMode: DEFAULT_THEME_MODE,
});
const favicon = gospeakThemeManifest.assets.favicon;

/** Môi trường thử (APP_ENV=staging): dải cảnh báo trên mọi trang, giống QLNS. */
const IS_STAGING = process.env.APP_ENV === "staging";

export const metadata: Metadata = {
  title: {
    default: IS_STAGING ? "[THỬ] GoSpeak English" : "GoSpeak English – Tiếng Anh thiếu nhi & giao tiếp",
    template: IS_STAGING ? "[THỬ] %s · GoSpeak" : "%s · GoSpeak English",
  },
  description:
    "GoSpeak English: tiếng Anh thiếu nhi và giao tiếp 4 kỹ năng tại Hà Nội. Bài tập online, phụ huynh theo dõi điểm và nhận xét của con.",
  ...(favicon ? { icons: { icon: favicon } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      data-theme={activeTheme.attribute}
      data-theme-family={ACTIVE_THEME_FAMILY}
      data-theme-variant={ACTIVE_THEME_VARIANT}
      data-color-mode={DEFAULT_THEME_MODE}
      className={`${beVietnam.variable} ${baloo.variable} h-full antialiased`}
    >
      <head>
        <ThemeBootstrapScript html={themeBootstrapScript} />
      </head>
      <body className="min-h-full font-sans">
        {IS_STAGING && (
          <div
            role="status"
            className="sticky top-0 z-[100] bg-warning px-4 py-1 text-center text-xs font-semibold text-on-primary"
          >
            MÔI TRƯỜNG THỬ — dữ liệu khách đã che, thao tác ở đây không ảnh hưởng bản thật.
          </div>
        )}
        <ThemeProvider
          family={ACTIVE_THEME_FAMILY}
          variant={ACTIVE_THEME_VARIANT}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
