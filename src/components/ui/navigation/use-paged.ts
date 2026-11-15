"use client";

import { useState } from "react";

export const LIST_PAGE_SIZE = 20;

/**
 * Chia trang phía client cho danh sách đã tải đủ (tồn kho, nhà cung cấp…): dài 100–200 dòng
 * thì kéo mỏi tay, mà vẫn cần đủ dữ liệu để cộng tổng. Đổi `resetKey` (bộ lọc, từ khóa) thì về
 * trang 1; dữ liệu làm mới sau khi lưu thì GIỮ trang đang xem, chỉ kéo về trang cuối nếu vượt.
 */
export function usePaged<T>(items: T[], resetKey = "", pageSize = LIST_PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const pageCount = Math.max(Math.ceil(items.length / pageSize), 1);
  const page = state.key === resetKey ? Math.min(state.page, pageCount) : 1;
  const offset = (page - 1) * pageSize;
  return {
    page,
    pageCount,
    offset,
    rows: items.slice(offset, offset + pageSize),
    setPage: (next: number) => {
      setState({ page: next, key: resetKey });
      // Khung app cuộn trong <main>, không phải window.
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    },
  };
}
