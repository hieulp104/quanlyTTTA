// `npm run dev` — giới hạn heap cho dev server.
// Next mặc định cho heap = 50% RAM (máy 32GB → 16GB) và chỉ tự khởi động lại khi dùng quá
// 80% số đó, nên sau vài giờ sửa code máy đã chậm hẳn mới restart. Đặt 4GB thì dev server
// tự restart quanh 3,2GB (vài giây, không mất trạng thái trình duyệt). Muốn số khác:
// `DEV_HEAP_MB=6144 npm run dev`. NODE_OPTIONS phải có trước khi `next dev` chạy — đặt
// trong .env là quá muộn — và cú pháp `set X=…&&` của npm script không chạy được trên mọi shell.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const heapMb = process.env.DEV_HEAP_MB ?? "4096";
const nodeOptions = [process.env.NODE_OPTIONS, `--max-old-space-size=${heapMb}`]
  .filter(Boolean)
  .join(" ");
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
