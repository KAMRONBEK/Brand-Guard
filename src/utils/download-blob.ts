/**
 * Triggers a browser download for a Blob (e.g. CSV from Comment API export).
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.rel = "noopener";
	anchor.click();
	URL.revokeObjectURL(url);
}

export function buildCommentExportFilename(postUrl: string, format: "json" | "csv" | "xlsx"): string {
	const safe = postUrl.replace(/[^\w-]+/g, "_").slice(0, 80);
	return `comments_${safe || "export"}.${format}`;
}
