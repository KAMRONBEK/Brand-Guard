import * as XLSX from "xlsx";

import { normalizeExportJsonToRows } from "./commentExportRows";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SHEET_NAME = "Comments";

export async function commentsJsonBlobToXlsxBlob(jsonBlob: Blob): Promise<Blob> {
	const text = await jsonBlob.text();
	const parsed: unknown = JSON.parse(text) as unknown;
	const rows = normalizeExportJsonToRows(parsed);

	const worksheet = rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([["(no rows)"]]);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
	const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
	return new Blob([buffer], { type: XLSX_MIME });
}
