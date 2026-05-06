function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapPayload(chunk: unknown): unknown {
	if (!isRecord(chunk)) return chunk;
	if (chunk.data !== undefined) return chunk.data;
	if (chunk.payload !== undefined) return chunk.payload;
	if (chunk.result !== undefined) return chunk.result;
	return chunk;
}

function isSearchStreamProgressEvent(record: unknown): boolean {
	if (!isRecord(record)) return false;
	if (typeof record.phase !== "string" || typeof record.status !== "string") return false;
	if (Array.isArray(record.posts)) return false;
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
	if (isRecord(next.overall)) return true;
	if (next.comments !== undefined) return true;
	if (next.stats !== undefined) return true;
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

function mergePostArrays(
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

function isSearchStreamTerminalResult(next: Record<string, unknown>): boolean {
	if (!Array.isArray(next.posts)) return false;
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

	for (const key of ["keyword", "keywords", "period_hours", "search_type"] as const) {
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
	}

	if (next.stats !== undefined) acc.stats = next.stats;
	if (next.comments !== undefined) acc.comments = next.comments;

	return acc;
}
