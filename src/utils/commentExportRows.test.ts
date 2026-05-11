import { describe, expect, it } from "vitest";
import { normalizeExportJsonToRows } from "./commentExportRows";

describe("normalizeExportJsonToRows", () => {
	it("uses top-level array of objects", () => {
		const rows = normalizeExportJsonToRows([{ u: "a", t: "x" }, { u: "b" }]);
		expect(rows).toEqual([{ u: "a", t: "x" }, { u: "b" }]);
	});

	it("unwraps comments array", () => {
		const rows = normalizeExportJsonToRows({
			comments: [{ username: "u1", text: "hi" }],
		});
		expect(rows).toEqual([{ username: "u1", text: "hi" }]);
	});

	it("flattens sentiment buckets with sentiment column", () => {
		const rows = normalizeExportJsonToRows({
			positive: [{ username: "a", text: "nice" }],
			negative: [{ username: "b", text: "bad" }],
		});
		expect(rows).toEqual([
			{ username: "a", text: "nice", sentiment: "positive" },
			{ username: "b", text: "bad", sentiment: "negative" },
		]);
	});

	it("falls back to raw string for unknown shapes", () => {
		const rows = normalizeExportJsonToRows({ foo: "bar" });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ raw: expect.stringContaining("foo") });
	});
});
