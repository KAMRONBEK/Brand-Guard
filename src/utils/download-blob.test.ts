import { describe, expect, it } from "vitest";
import { buildCommentExportFilename } from "./download-blob";

describe("buildCommentExportFilename", () => {
	it("appends json extension", () => {
		expect(buildCommentExportFilename("https://instagram.com/p/ABC123/", "json")).toMatch(/\.json$/);
	});

	it("sanitizes post url for filename", () => {
		const name = buildCommentExportFilename("https://a.b/c?d=1", "csv");
		expect(name.endsWith(".csv")).toBe(true);
		expect(name.startsWith("comments_")).toBe(true);
	});

	it("appends xlsx extension", () => {
		expect(buildCommentExportFilename("https://example.com/p/1", "xlsx")).toMatch(/\.xlsx$/);
	});
});
