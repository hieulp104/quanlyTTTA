"use client";

import { useEffect } from "react";

const BEFORE_NAVIGATION_EVENT = "gospeak:before-navigation";
const WARNING = "Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi biểu mẫu?";

/** Cho các điều hướng bằng nút (ví dụ chọn stage) hỏi form đang mở trước khi đi. */
export function confirmUnsavedNavigation(): boolean {
  const event = new Event(BEFORE_NAVIGATION_EVENT, { cancelable: true });
  window.dispatchEvent(event);
  return !event.defaultPrevented;
}

/**
 * Cảnh báo khi reload/đóng trang, bấm link nội bộ hoặc điều hướng bằng nút.
 * Chỉ gắn listener trong lúc form thực sự có thay đổi.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const confirmNavigation = (event: Event) => {
      if (!window.confirm(WARNING)) event.preventDefault();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      if (!confirmUnsavedNavigation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener(BEFORE_NAVIGATION_EVENT, confirmNavigation);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener(BEFORE_NAVIGATION_EVENT, confirmNavigation);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
