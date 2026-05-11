const WRAPPED_ARRAY_KEYS = ["comments", "data", "items", "results"] as const;
const SENTIMENT_BUCKET_KEYS = new Set(["positive", "negative", "neutral"]);
const RAW_JSON_MAX = 50_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectArrayFromList(arr: unknown[]): Record<string, unknown>[] {
	return arr.filter((el): el is Record<string, unknown> => isPlainObject(el));
}

function tryWrappedArrayField(parsed: Record<string, unknown>): Record<string, unknown>[] | null {
	for (const key of WRAPPED_ARRAY_KEYS) {
		const v = parsed[key];
		if (!Array.isArray(v)) {
			continue;
		}
		const rows = objectArrayFromList(v);
		if (v.length === 0 || rows.length > 0) {
			return rows;
		}
	}
	return null;
}

function trySentimentBuckets(parsed: Record<string, unknown>): Record<string, unknown>[] | null {
	const keys = Object.keys(parsed);
	if (keys.length === 0) {
		return null;
	}
	if (!keys.every((k) => SENTIMENT_BUCKET_KEYS.has(k))) {
		return null;
	}
	if (!keys.every((k) => Array.isArray(parsed[k]))) {
		return null;
	}
	const rows: Record<string, unknown>[] = [];
	for (const bucket of keys) {
		const arr = parsed[bucket] as unknown[];
		for (const item of arr) {
			if (isPlainObject(item)) {
				rows.push({ ...item, sentiment: bucket });
			}
		}
	}
	return rows;
}

/**
 * Turns comment-api JSON export payloads into flat rows for spreadsheets.
 */
export function normalizeExportJsonToRows(parsed: unknown): Record<string, unknown>[] {
	if (Array.isArray(parsed)) {
		const rows = objectArrayFromList(parsed);
		if (parsed.length === 0 || rows.length > 0) {
			return rows;
		}
	}

	if (isPlainObject(parsed)) {
		const fromWrap = tryWrappedArrayField(parsed);
		if (fromWrap !== null) {
			return fromWrap;
		}
		const fromBuckets = trySentimentBuckets(parsed);
		if (fromBuckets !== null) {
			return fromBuckets;
		}
	}

	let raw: string;
	try {
		raw = JSON.stringify(parsed);
	} catch {
		raw = String(parsed);
	}
	if (raw.length > RAW_JSON_MAX) {
		raw = `${raw.slice(0, RAW_JSON_MAX)}…`;
	}
	return [{ raw }];
}
