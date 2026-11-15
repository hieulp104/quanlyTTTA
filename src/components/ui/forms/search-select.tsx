"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchSelectOption = { value: string; label: string; hint?: string };

const MAX_OPTIONS = 50;

/** Bỏ dấu + chữ thường: gõ "cong thom" ra "VẬT LIỆU NT CÔNG THƠM". */
function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/**
 * Ô chọn có tìm kiếm — thay `<Select>` khi danh sách dài (nhà cung cấp, công trình) mà
 * kéo tìm bằng mắt dễ chọn nhầm. Gõ không dấu được, tìm theo mọi từ. Ô trống = `emptyLabel`.
 */
export function SearchSelect({
  value: controlled,
  defaultValue = "",
  onChange,
  name,
  options,
  emptyLabel,
  placeholder = "Gõ để tìm…",
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: {
  /** Có `value` + `onChange` là ô điều khiển; không có thì tự giữ giá trị từ `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Có thì gửi kèm form qua ô ẩn — thay thẳng cho `<Select name=…>`. */
  name?: string;
  options: SearchSelectOption[];
  /** Có thì người dùng chọn được "không chọn gì" (giá trị rỗng). */
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  const listId = useId();
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);

  const matches = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const list = words.length
      ? options.filter((option) => {
          const text = fold(`${option.label} ${option.hint ?? ""}`);
          return words.every((word) => text.includes(word));
        })
      : options;
    const rows = list.slice(0, MAX_OPTIONS);
    return emptyLabel !== undefined && !words.length ? [{ value: "", label: emptyLabel }, ...rows] : rows;
  }, [options, query, emptyLabel]);

  function pick(next: string) {
    setOwn(next);
    onChange?.(next);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = matches[active];
      if (option) pick(option.value);
    } else if (event.key === "Escape") {
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        autoComplete="off"
        value={open ? query : (selected?.label ?? (value ? "" : (emptyLabel ?? "")))}
        placeholder={open ? (selected?.label ?? placeholder) : placeholder}
        onFocus={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "min-h-10 w-full rounded-control border border-line bg-surface py-2.5 pl-3.5 pr-9 text-base font-medium text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow] placeholder:font-normal placeholder:text-muted hover:border-line-strong focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-disabled",
          invalid && "border-danger/30 focus:border-danger focus:ring-danger/20",
        )}
      />
      {value && emptyLabel !== undefined && !disabled ? (
        <button
          type="button"
          aria-label="Bỏ chọn"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pick("")}
        >
          <X className="size-4" />
        </button>
      ) : (
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-card border border-line bg-surface-raised py-1 shadow-popover"
        >
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">Không tìm thấy</li>}
          {matches.map((option, index) => (
            <li key={option.value || "__empty"} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-subtle",
                  index === active && "bg-surface-subtle",
                  option.value === value && "font-semibold",
                  !option.value && "text-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option.value)}
              >
                <span className="min-w-0 truncate text-foreground">{option.label}</span>
                {option.hint && <span className="shrink-0 text-xs text-muted">{option.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
