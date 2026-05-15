import type { KeywordSearchRule } from "@/types/comment-api";
import { splitCommaOrNewlineSegments } from "@/utils/splitCommaOrNewline";

function newClientRowKey(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `kw-row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function uniqPreserveOrder(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		if (seen.has(v)) continue;
		seen.add(v);
		out.push(v);
	}
	return out;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/** Normalize one rule: trim keyword, dedupe modifier tokens. Preserves `clientRowKey` when present. */
export function normalizeKeywordRule(rule: KeywordSearchRule): KeywordSearchRule {
	const keyword = rule.keyword.trim();
	const req = uniqPreserveOrder(splitCommaOrNewlineSegments((rule.required_keywords ?? []).join(",")));
	const ex = uniqPreserveOrder(splitCommaOrNewlineSegments((rule.excluded_keywords ?? []).join(",")));
	const out: KeywordSearchRule = { keyword };
	if (req.length > 0) out.required_keywords = req;
	if (ex.length > 0) out.excluded_keywords = ex;
	if (typeof rule.clientRowKey === "string" && rule.clientRowKey.trim() !== "") {
		out.clientRowKey = rule.clientRowKey;
	}
	return out;
}

/** Migrate cached flat `keywords` chips to one rule per primary term. */
export function keywordRulesFromLegacyKeywords(keywords: readonly string[]): KeywordSearchRule[] {
	const rows: KeywordSearchRule[] = [];
	for (const k of keywords) {
		const trimmed = typeof k === "string" ? k.trim() : "";
		if (trimmed === "") continue;
		rows.push({ keyword: trimmed, clientRowKey: newClientRowKey() });
	}
	return rows.length > 0 ? rows : [emptyKeywordRule()];
}

export function emptyKeywordRule(): KeywordSearchRule {
	return { keyword: "", required_keywords: [], excluded_keywords: [], clientRowKey: newClientRowKey() };
}

/** Rules with a non-empty primary keyword after trim. */
export function activeKeywordRules(rules: readonly KeywordSearchRule[]): KeywordSearchRule[] {
	const out: KeywordSearchRule[] = [];
	for (const r of rules) {
		const n = normalizeKeywordRule({
			...r,
			required_keywords: r.required_keywords ?? [],
			excluded_keywords: r.excluded_keywords ?? [],
		});
		if (n.keyword !== "") out.push(n);
	}
	return out;
}

/** Payload-safe rule (no client-only fields). */
export function toApiKeywordRule(r: KeywordSearchRule): KeywordSearchRule {
	return normalizeKeywordRule({
		keyword: r.keyword,
		required_keywords: r.required_keywords,
		excluded_keywords: r.excluded_keywords,
	});
}

export type ApiKeywordPayload = {
	keywords: string[];
	keyword_rules: KeywordSearchRule[];
	required_keywords?: string[];
	excluded_keywords?: string[];
};

/**
 * Build request keyword fields: always includes `keyword_rules` + flat `keywords`.
 * Adds top-level `required_keywords` / `excluded_keywords` when all active rules share the same modifiers (legacy/global API shape).
 */
export function buildApiKeywordPayload(rules: readonly KeywordSearchRule[]): ApiKeywordPayload {
	const active = activeKeywordRules(rules);
	if (active.length === 0) {
		return { keywords: [], keyword_rules: [] };
	}

	const keywords = active.map((r) => r.keyword);
	const keyword_rules = active.map(toApiKeywordRule);

	const first = active[0];
	const firstReq = first.required_keywords ?? [];
	const firstEx = first.excluded_keywords ?? [];
	const allSame =
		active.length > 0 &&
		active.every((r) => arraysEqual(r.required_keywords ?? [], firstReq)) &&
		active.every((r) => arraysEqual(r.excluded_keywords ?? [], firstEx));

	let required_keywords: string[] | undefined;
	let excluded_keywords: string[] | undefined;
	if (allSame) {
		if (firstReq.length > 0) required_keywords = [...firstReq];
		if (firstEx.length > 0) excluded_keywords = [...firstEx];
	}

	return {
		keywords,
		keyword_rules,
		...(required_keywords ? { required_keywords } : {}),
		...(excluded_keywords ? { excluded_keywords } : {}),
	};
}

/** True if at least one non-empty primary keyword exists. */
export function hasAnyPrimaryKeyword(rules: readonly KeywordSearchRule[]): boolean {
	return activeKeywordRules(rules).length > 0;
}

function isKeywordRuleRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parse `keyword_rules` as returned by the API (or stored in cache).
 */
export function parseKeywordRulesArray(raw: unknown): KeywordSearchRule[] {
	if (!Array.isArray(raw)) return [];
	const out: KeywordSearchRule[] = [];
	for (const item of raw) {
		if (!isKeywordRuleRecord(item)) continue;
		const kw = typeof item.keyword === "string" ? item.keyword : "";
		const req = Array.isArray(item.required_keywords)
			? item.required_keywords.filter((x): x is string => typeof x === "string")
			: [];
		const ex = Array.isArray(item.excluded_keywords)
			? item.excluded_keywords.filter((x): x is string => typeof x === "string")
			: [];
		const rowKey =
			typeof item.clientRowKey === "string" && item.clientRowKey.trim() !== "" ? item.clientRowKey : undefined;
		out.push({
			keyword: kw,
			...(req.length > 0 ? { required_keywords: uniqPreserveOrder(req) } : {}),
			...(ex.length > 0 ? { excluded_keywords: uniqPreserveOrder(ex) } : {}),
			...(rowKey ? { clientRowKey: rowKey } : {}),
		});
	}
	return out;
}

/**
 * Restore keyword rules from workflow cache: prefers `keyword_rules`, else migrates legacy `keywords: string[]`.
 */
export function migrateSnapshotKeywordRules(raw: unknown): KeywordSearchRule[] {
	if (!raw || typeof raw !== "object") return [emptyKeywordRule()];
	const o = raw as Record<string, unknown>;

	if (Array.isArray(o.keyword_rules)) {
		const parsed = parseKeywordRulesArray(o.keyword_rules);
		if (parsed.length > 0) return parsed;
	}

	if (Array.isArray(o.keywords)) {
		return keywordRulesFromLegacyKeywords(o.keywords as string[]);
	}

	return [emptyKeywordRule()];
}
