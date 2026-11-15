"use client";

/**
 * Chạy đồng bộ trong HTML server để áp theme trước first paint. Khi hydrate,
 * React thấy script là text/plain nên không cảnh báo hoặc cố thực thi lại.
 */
export function ThemeBootstrapScript({ html }: { html: string }) {
  return (
    <script
      id="gospeak-theme-bootstrap"
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
