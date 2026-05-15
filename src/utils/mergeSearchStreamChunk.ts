function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function unwrapPayload(chunk: unknown): unknown {
	if (!isRecord(chunk)) return chunk;
	if (chunk.data !== undefined) return chunk.data;
	if (chunk.payload !== undefined) return chunk.payload;
	if (chunk.result !== undefined) return chunk.result;
	return chunk;
}

const TELEGRAM_GROUPED_SENTIMENTS = ["negative", "neutral", "positive"] as const;

export function isTelegramGroupedPostsObject(posts: unknown): boolean {
	if (!isRecord(posts) || Array.isArray(posts)) return false;
	return TELEGRAM_GROUPED_SENTIMENTS.some((key) => Array.isArray(posts[key]));
}

function isSearchStreamProgressEvent(record: unknown): boolean {
	if (!isRecord(record)) return false;
	if (typeof record.phase !== "string" || typeof record.status !== "string") return false;
	if (Array.isArray(record.posts)) return false;
	if (isTelegramGroupedPostsObject(record.posts)) return false;
	if (Array.isArray(record.messages)) return false;
	if (Array.isArray(record.results)) return false;
	if (isRecord(record.overall)) return false;
	if (typeof record.keyword === "string" || Array.isArray(record.keywords)) return false;
	return true;
}

export interface SearchStreamProgressStepPayload {
	phase: string;
	status: string;
	detail?: string;
}

export function getSearchStreamProgressStep(chunk: unknown): SearchStreamProgressStepPayload | null {
	const next = unwrapPayload(chunk);
	if (!isSearchStreamProgressEvent(next) || !isRecord(next)) return null;
	const phase = String(next.phase ?? "");
	const status = String(next.status ?? "");
	if (phase === "" && status === "") return null;
	if (typeof next.detail === "string") {
		return { phase, status, detail: next.detail };
	}
	return { phase, status };
}

export function hasSearchResultPayload(chunk: unknown): boolean {
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) return false;
	if (Array.isArray(next.posts)) return true;
	if (isTelegramGroupedPostsObject(next.posts)) return true;
	if (Array.isArray(next.messages)) return true;
	if (Array.isArray(next.results)) return true;
	if (isRecord(next.overall)) return true;
	if (next.comments !== undefined) return true;
	if (next.stats !== undefined) return true;
	if (isRecord(next.advice)) return true;
	return false;
}

export function formatSearchStreamProgressLabel(chunk: unknown): string | null {
	const step = getSearchStreamProgressStep(chunk);
	if (!step) return null;
	const detail = step.detail ?? "";
	return detail !== "" ? `${step.phase} · ${step.status} — ${detail}` : `${step.phase} · ${step.status}`;
}

function postKey(post: Record<string, unknown>): string {
	const url = post.url;
	if (typeof url === "string" && url.length > 0) return url;
	return JSON.stringify(post);
}

export function mergePostArrays(
	previous: Record<string, unknown>[],
	incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
	const order: string[] = [];
	const map = new Map<string, Record<string, unknown>>();
	const upsert = (post: Record<string, unknown>) => {
		const key = postKey(post);
		const existing = map.get(key);
		if (!existing) order.push(key);
		map.set(key, existing ? { ...existing, ...post } : { ...post });
	};
	for (const post of previous) upsert(post);
	for (const post of incoming) upsert(post);
	return order.map((key) => map.get(key) as Record<string, unknown>);
}

function mergeOverall(
	previous: Record<string, unknown> | undefined,
	incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!incoming) return previous;
	if (!previous) return { ...incoming };
	return { ...previous, ...incoming };
}

function failedInputDedupeKey(row: Record<string, unknown>): string {
	const input = row.input;
	const reason = row.reason;
	return `${typeof input === "string" ? input : ""}\u0000${typeof reason === "string" ? reason : ""}`;
}

function isSearchStreamTerminalResult(next: Record<string, unknown>): boolean {
	if (isTelegramGroupedPostsObject(next.posts)) {
		if (Array.isArray(next.keywords) || Array.isArray(next.channels)) return true;
	}
	const hasList = Array.isArray(next.posts) || Array.isArray(next.messages) || Array.isArray(next.results);
	if (!hasList) return false;
	if (typeof next.keyword === "string") return true;
	if (Array.isArray(next.keywords)) return true;
	if (typeof next.total === "number") return true;
	if (isRecord(next.overall)) return true;
	return false;
}

export function mergeSearchStreamChunk(accumulated: unknown, chunk: unknown): unknown {
	const next = unwrapPayload(chunk);
	if (isSearchStreamProgressEvent(next)) {
		return accumulated;
	}
	if (!isRecord(next)) {
		return accumulated ?? next;
	}
	if (isSearchStreamTerminalResult(next)) {
		return { ...next };
	}
	if (!accumulated || !isRecord(accumulated)) {
		return { ...next };
	}
	const acc: Record<string, unknown> = { ...accumulated };

	for (const key of [
		"keyword",
		"keywords",
		"keyword_rules",
		"required_keywords",
		"excluded_keywords",
		"channels",
		"period_hours",
		"search_type",
		"language",
		"max_per_hit",
		"type",
	] as const) {
		if (next[key] !== undefined) acc[key] = next[key];
	}

	if (next.overall !== undefined) {
		acc.overall = isRecord(next.overall)
			? mergeOverall(isRecord(acc.overall) ? acc.overall : undefined, next.overall)
			: next.overall;
	}

	if (Array.isArray(next.posts)) {
		const prevPosts = Array.isArray(acc.posts) ? (acc.posts as Record<string, unknown>[]) : [];
		acc.posts = mergePostArrays(prevPosts, next.posts as Record<string, unknown>[]);
	} else if (isTelegramGroupedPostsObject(next.posts)) {
		const groupedNext = next.posts as Record<string, unknown>;
		const prevGrouped = isTelegramGroupedPostsObject(acc.posts) ? (acc.posts as Record<string, unknown>) : {};
		const mergedGrouped: Record<string, unknown> = { ...prevGrouped };
		for (const key of Object.keys(groupedNext)) {
			const inc = groupedNext[key];
			if (Array.isArray(inc)) {
				const prevArr = Array.isArray(mergedGrouped[key]) ? (mergedGrouped[key] as Record<string, unknown>[]) : [];
				mergedGrouped[key] = mergePostArrays(prevArr, inc as Record<string, unknown>[]);
			}
		}
		acc.posts = mergedGrouped;
	}

	if (Array.isArray(next.messages)) {
		const prev = Array.isArray(acc.messages) ? (acc.messages as Record<string, unknown>[]) : [];
		acc.messages = mergePostArrays(prev, next.messages as Record<string, unknown>[]);
	}

	if (Array.isArray(next.results)) {
		const prev = Array.isArray(acc.results) ? (acc.results as Record<string, unknown>[]) : [];
		acc.results = mergePostArrays(prev, next.results as Record<string, unknown>[]);
	}

	if (next.stats !== undefined) {
		acc.stats = isRecord(next.stats)
			? mergeOverall(isRecord(acc.stats) ? acc.stats : undefined, next.stats)
			: next.stats;
	}
	if (next.comments !== undefined) acc.comments = next.comments;
	if (next.advice !== undefined) acc.advice = next.advice;
	if (Array.isArray(next.failed_channels)) {
		const prev = Array.isArray(acc.failed_channels)
			? (acc.failed_channels as unknown[]).filter((item): item is string => typeof item === "string")
			: [];
		const inc = next.failed_channels.filter((item): item is string => typeof item === "string");
		acc.failed_channels = [...new Set([...prev, ...inc])];
	}
	if (Array.isArray(next.failed_inputs)) {
		const byKey = new Map<string, Record<string, unknown>>();
		const pushRows = (rows: unknown[]) => {
			for (const item of rows) {
				if (!isRecord(item)) continue;
				const k = failedInputDedupeKey(item);
				const existing = byKey.get(k);
				byKey.set(k, existing ? { ...existing, ...item } : { ...item });
			}
		};
		if (Array.isArray(acc.failed_inputs)) pushRows(acc.failed_inputs as unknown[]);
		pushRows(next.failed_inputs);
		acc.failed_inputs = [...byKey.values()];
	}
	if (next.timing_ms !== undefined) acc.timing_ms = next.timing_ms;

	return acc;
}
