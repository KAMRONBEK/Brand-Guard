import { getSearchStreamProgressStep, mergePostArrays, unwrapPayload } from "@/utils/mergeSearchStreamChunk";

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Auto-reply (Instagram) streamed result payloads — permissive shapes from API. */
export function hasAutoReplyStreamResultPayload(chunk: unknown): boolean {
	if (getSearchStreamProgressStep(chunk) !== null) return false;
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) return false;
	if (next.phase !== undefined && next.status !== undefined) return false;
	return (
		next.stats !== undefined ||
		next.entries !== undefined ||
		next.flagged !== undefined ||
		next.replies !== undefined ||
		next.responses !== undefined ||
		(typeof next.url === "string" && next.message !== undefined) ||
		totalish(next)
	);
}

function totalish(r: Record<string, unknown>): boolean {
	const t = r.total_comments ?? r.handled ?? r.processed ?? r.sent;
	return typeof t === "number";
}

/** Facebook account analyze stream result. */
export function hasFbAnalyzeStreamResultPayload(chunk: unknown): boolean {
	if (getSearchStreamProgressStep(chunk) !== null) return false;
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) return false;
	if (next.phase !== undefined && next.status !== undefined) return false;
	return (
		Array.isArray(next.posts) ||
		(typeof next.username === "string" &&
			(typeof next.posts_analyzed === "number" || typeof next.posts_found === "number")) ||
		next.total_comments !== undefined
	);
}

/** Facebook comments fetch stream result. */
export function hasFbFetchStreamResultPayload(chunk: unknown): boolean {
	if (getSearchStreamProgressStep(chunk) !== null) return false;
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) return false;
	if (next.phase !== undefined && next.status !== undefined) return false;
	return (
		next.comments !== undefined ||
		next.post_id !== undefined ||
		(typeof next.url === "string" &&
			(next.stats !== undefined || next.caption !== undefined || next.author !== undefined))
	);
}

/** Facebook comments post stream result. */
export function hasFbPostStreamResultPayload(chunk: unknown): boolean {
	if (getSearchStreamProgressStep(chunk) !== null) return false;
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) return false;
	if (next.phase !== undefined && next.status !== undefined) return false;
	return (
		Array.isArray(next.results) ||
		typeof next.success === "number" ||
		typeof next.failed === "number" ||
		typeof next.total === "number" ||
		next.generated_comments !== undefined ||
		next.mode !== undefined
	);
}

function mergeCommentsByType(
	previous: Record<string, unknown> | undefined,
	incoming: Record<string, unknown>,
): Record<string, unknown> {
	const out = { ...(previous ?? {}) };
	for (const [key, value] of Object.entries(incoming)) {
		if (!Array.isArray(value)) {
			out[key] = value;
			continue;
		}
		const prevArr = Array.isArray(out[key]) ? (out[key] as unknown[]) : [];
		out[key] = [...prevArr, ...((value as unknown[]) ?? [])];
	}
	return out;
}

function mergeFbPostResultsArray(
	prev: Record<string, unknown>[] | undefined,
	incoming: unknown[],
): Record<string, unknown>[] {
	const base = [...(prev ?? [])];
	for (let i = 0; i < incoming.length; i++) {
		const row = incoming[i];
		if (!isRecord(row)) continue;
		const existing = base[i];
		base[i] = existing ? { ...existing, ...row } : { ...row };
	}
	return base;
}

export type WorkbenchStreamKind = "autoReply" | "fbAnalyze" | "fbFetch" | "fbPost";

export function mergeWorkbenchStreamChunk(kind: WorkbenchStreamKind, accumulated: unknown, chunk: unknown): unknown {
	const next = unwrapPayload(chunk);
	if (getSearchStreamProgressStep(chunk) !== null || getSearchStreamProgressStep(next) !== null) {
		return accumulated;
	}
	if (!isRecord(next)) {
		return accumulated ?? next;
	}
	if (!accumulated || !isRecord(accumulated)) {
		return { ...next };
	}

	const merged: Record<string, unknown> = { ...accumulated, ...next };

	if (kind === "autoReply") {
		return merged;
	}

	if (kind === "fbAnalyze") {
		if (Array.isArray(next.posts)) {
			const prevPosts = Array.isArray(accumulated.posts) ? (accumulated.posts as Record<string, unknown>[]) : [];
			merged.posts = mergePostArrays(prevPosts, next.posts as Record<string, unknown>[]);
		}
		return merged;
	}

	if (kind === "fbFetch") {
		if (isRecord(next.comments)) {
			const prevComments = isRecord(accumulated.comments)
				? (accumulated.comments as Record<string, unknown>)
				: undefined;
			merged.comments = mergeCommentsByType(prevComments, next.comments as Record<string, unknown>);
		}
		return merged;
	}

	/* fbPost */
	if (Array.isArray(next.results)) {
		const prevResults = Array.isArray(accumulated.results) ? (accumulated.results as Record<string, unknown>[]) : [];
		merged.results = mergeFbPostResultsArray(prevResults, next.results);
	}
	return merged;
}
