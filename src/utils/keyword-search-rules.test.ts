import { describe, expect, it } from "vitest";
import {
	activeKeywordRules,
	buildApiKeywordPayload,
	keywordRulesFromLegacyKeywords,
	migrateSnapshotKeywordRules,
	parseKeywordRulesArray,
	toApiKeywordRule,
} from "./keyword-search-rules";
import { splitCommaOrNewlineSegments } from "./splitCommaOrNewline";

describe("splitCommaOrNewlineSegments", () => {
	it("splits on commas and newlines and trims", () => {
		expect(splitCommaOrNewlineSegments("a, b\nc")).toEqual(["a", "b", "c"]);
	});
});

describe("keywordRulesFromLegacyKeywords", () => {
	it("maps non-empty strings to rules and yields one empty row when input empty", () => {
		const rows = keywordRulesFromLegacyKeywords(["x", " y "]);
		expect(rows.map((r) => r.keyword)).toEqual(["x", "y"]);
		expect(rows.every((r) => typeof r.clientRowKey === "string" && r.clientRowKey.length > 0)).toBe(true);
		const fallback = keywordRulesFromLegacyKeywords([]);
		expect(fallback).toHaveLength(1);
		expect(fallback[0].keyword).toBe("");
		expect(fallback[0].clientRowKey).toBeDefined();
	});
});

describe("migrateSnapshotKeywordRules", () => {
	it("prefers keyword_rules over legacy keywords", () => {
		const migrated = migrateSnapshotKeywordRules({
			keyword_rules: [{ keyword: "a", required_keywords: ["b"] }],
			keywords: ["legacy"],
		});
		expect(migrated).toEqual([{ keyword: "a", required_keywords: ["b"] }]);
	});

	it("migrates legacy keywords array", () => {
		const migrated = migrateSnapshotKeywordRules({ keywords: ["one", "two"] });
		expect(migrated.map((r) => r.keyword)).toEqual(["one", "two"]);
	});
});

describe("buildApiKeywordPayload", () => {
	it("adds shared required/excluded when all rules match", () => {
		const p = buildApiKeywordPayload([
			{ keyword: "a", required_keywords: ["x"], excluded_keywords: ["z"] },
			{ keyword: "b", required_keywords: ["x"], excluded_keywords: ["z"] },
		]);
		expect(p.keywords).toEqual(["a", "b"]);
		expect(p.required_keywords).toEqual(["x"]);
		expect(p.excluded_keywords).toEqual(["z"]);
		expect(p.keyword_rules).toHaveLength(2);
	});

	it("omits global required/excluded when modifiers differ per row", () => {
		const p = buildApiKeywordPayload([
			{ keyword: "a", required_keywords: ["x"] },
			{ keyword: "b", required_keywords: ["y"] },
		]);
		expect(p.required_keywords).toBeUndefined();
		expect(p.excluded_keywords).toBeUndefined();
	});
});

describe("activeKeywordRules", () => {
	it("skips rows with blank primary", () => {
		expect(activeKeywordRules([{ keyword: "  " }, { keyword: "ok" }]).map((r) => r.keyword)).toEqual(["ok"]);
	});
});

describe("toApiKeywordRule", () => {
	it("drops clientRowKey from API payload shape", () => {
		const api = toApiKeywordRule({
			keyword: "a",
			required_keywords: ["b"],
			clientRowKey: "client-only",
		});
		expect(api).toEqual({ keyword: "a", required_keywords: ["b"] });
		expect(api).not.toHaveProperty("clientRowKey");
	});
});

describe("parseKeywordRulesArray", () => {
	it("ignores invalid entries", () => {
		expect(parseKeywordRulesArray([null, { keyword: "k" }, 3])).toEqual([{ keyword: "k" }]);
	});
});
