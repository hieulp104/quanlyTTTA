import ExcelJS from "exceljs";
import { normalizeText } from "@/modules/study/study.scoring";

/**
 * Đọc danh sách học viên từ file Excel (.xlsx) hoặc .csv trung tâm có sẵn (câu 7).
 * Nhận diện cột theo tiêu đề (không phân biệt hoa thường): Họ tên · Lớp · Tên phụ huynh · SĐT phụ huynh.
 */
export type ParsedStudentRow = {
  fullName: string;
  className: string;
  parentName: string;
  parentPhone: string;
};

function parseCsv(text: string): string[][] {
  const firstLine = text.split("\n")[0] ?? "";
  const sep = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function readRows(fileName: string, buffer: ArrayBuffer): Promise<string[][]> {
  if (/\.csv$/i.test(fileName)) return parseCsv(new TextDecoder("utf-8").decode(buffer).replace(/^﻿/, ""));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow((r) => {
    const vals = (r.values as unknown[]).slice(1).map((v) => {
      if (v && typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text);
      if (v && typeof v === "object" && "result" in (v as object)) return String((v as { result: unknown }).result);
      return v === null || v === undefined ? "" : String(v);
    });
    rows.push(vals);
  });
  return rows;
}

export async function parseStudentFile(fileName: string, buffer: ArrayBuffer): Promise<{ rows: ParsedStudentRow[]; error?: string }> {
  const rows = await readRows(fileName, buffer);
  if (rows.length < 2) return { rows: [], error: "File không có dữ liệu học viên." };

  const head = rows[0].map((h) => normalizeText(h));
  const col = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const cPhone = col("sđt", "điện thoại", "phone", "số đt");
  const cName = col("họ tên", "họ và tên", "tên học viên", "học viên", "name");
  const cClass = col("lớp", "class");
  const cParentRaw = col("tên phụ huynh", "phụ huynh", "parent");
  const cParent = cParentRaw === cPhone ? -1 : cParentRaw;
  if (cName < 0) return { rows: [], error: "Không thấy cột “Họ tên”. Kiểm tra dòng tiêu đề của file." };

  return {
    rows: rows
      .slice(1)
      .map((r) => ({
        fullName: String(r[cName] ?? "").trim(),
        className: cClass >= 0 ? String(r[cClass] ?? "").trim() : "",
        parentName: cParent >= 0 ? String(r[cParent] ?? "").trim() : "",
        parentPhone: cPhone >= 0 ? String(r[cPhone] ?? "").replace(/\D/g, "").replace(/^(?=[1-9]\d{8}$)/, "0") : "",
      }))
      .filter((r) => r.fullName),
  };
}
