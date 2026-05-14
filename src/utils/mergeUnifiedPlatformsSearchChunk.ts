import {
	getSearchStreamProgressStep,
	isTelegramGroupedPostsObject,
	mergePostArrays,
	unwrapPayload,
} from "@/utils/mergeSearchStreamChunk";

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeOverall(
	previous: Record<string, unknown> | undefined,
	incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!incoming) return previous;
	if (!previous) return { ...incoming };
	return { ...previous, ...incoming };
}

function uniqStrings(values: unknown[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		if (typeof v !== "string" || v.trim() === "") continue;
		if (!seen.has(v)) {
			seen.add(v);
			out.push(v);
		}
	}
	return out;
}

function mergeStringList(prev: unknown, inc: unknown): string[] | undefined {
	if (!Array.isArray(inc)) return Array.isArray(prev) ? uniqStrings(prev) : undefined;
	if (!Array.isArray(prev)) return uniqStrings(inc);
	return uniqStrings([...prev, ...inc]);
}

const PLATFORM_KEYS = ["telegram", "instagram", "facebook"] as const;

function mergeUnifiedStats(
	prev: Record<string, unknown> | undefined,
	inc: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...(prev ?? {}), ...inc };
	for (const p of PLATFORM_KEYS) {
		const incSlice = inc[p];
		if (isRecord(incSlice)) {
			const prevSlice = isRecord(prev?.[p]) ? (prev?.[p] as Record<string, unknown>) : {};
			out[p] = { ...prevSlice, ...incSlice };
		}
	}
	return out;
}

function mergeGroupedPosts(prev: unknown, inc: unknown): Record<string, unknown> {
	const prevGrouped = isTelegramGroupedPostsObject(prev) ? (prev as Record<string, unknown>) : {};
	const incGrouped = isTelegramGroupedPostsObject(inc) ? (inc as Record<string, unknown>) : {};
	const merged: Record<string, unknown> = { ...prevGrouped };
	for (const key of Object.keys(incGrouped)) {
		const bucket = incGrouped[key];
		if (!Array.isArray(bucket)) continue;
		const prevArr = Array.isArray(merged[key]) ? (merged[key] as Record<string, unknown>[]) : [];
		merged[key] = mergePostArrays(prevArr, bucket as Record<string, unknown>[]);
	}
	return merged;
}

function failedChannelKey(item: unknown): string {
	if (typeof item === "string") return `s:${item}`;
	if (!isRecord(item)) return JSON.stringify(item);
	const ch = item.channel;
	return `o:${typeof ch === "string" ? ch : ""}\u0000${typeof item.reason === "string" ? item.reason : ""}`;
}

function mergeFailedChannels(prev: unknown, inc: unknown): unknown[] | undefined {
	if (!Array.isArray(inc) && !Array.isArray(prev)) return undefined;
	const map = new Map<string, unknown>();
	const pushArr = (a: unknown) => {
		if (!Array.isArray(a)) return;
		for (const item of a) {
			map.set(failedChannelKey(item), item);
		}
	};
	pushArr(prev);
	pushArr(inc);
	return [...map.values()];
}

function mergePlatformSection(platformKey: (typeof PLATFORM_KEYS)[number], prev: unknown, inc: unknown): unknown {
	if (!isRecord(inc)) return prev;
	const prevRecord = isRecord(prev) ? prev : {};
	const out: Record<string, unknown> = { ...prevRecord, ...inc };
	for (const listKey of platformKey === "telegram" ? (["channels"] as const) : (["accounts"] as const)) {
		const mergedList = mergeStringList(prevRecord[listKey], inc[listKey]);
		if (mergedList !== undefined) out[listKey] = mergedList;
	}
	if (isRecord(inc.stats) || isRecord(prevRecord.stats)) {
		out.stats = mergeOverall(
			isRecord(prevRecord.stats) ? prevRecord.stats : undefined,
			isRecord(inc.stats) ? inc.stats : undefined,
		);
	}
	if (isTelegramGroupedPostsObject(inc.posts) || isTelegramGroupedPostsObject(prevRecord.posts)) {
		out.posts = mergeGroupedPosts(prevRecord.posts, inc.posts);
	}
	if (platformKey === "telegram" && (inc.failed_channels !== undefined || prevRecord.failed_channels !== undefined)) {
		const mergedFc = mergeFailedChannels(prevRecord.failed_channels, inc.failed_channels);
		if (mergedFc !== undefined) out.failed_channels = mergedFc;
	}
	return out;
}

function advicePreferIncoming(
	prev: Record<string, unknown> | undefined,
	inc: Record<string, unknown>,
): Record<string, unknown> {
	const incSummary = typeof inc.summary === "string" ? inc.summary.trim() : "";
	const incIssues = Array.isArray(inc.issues) ? inc.issues : [];
	if (incSummary === "" && incIssues.length === 0) return prev ?? inc;
	return inc;
}

export function isUnifiedPlatformsSearchPayload(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const stats = value.stats;
	if (isRecord(stats)) {
		if (isRecord(stats.telegram) || isRecord(stats.instagram) || isRecord(stats.facebook)) return true;
	}
	if (isRecord(value.telegram) || isRecord(value.instagram) || isRecord(value.facebook)) return true;
	return false;
}

export function mergeUnifiedPlatformsSearchChunk(accumulated: unknown, chunk: unknown): unknown {
	if (getSearchStreamProgressStep(chunk) !== null) {
		return accumulated;
	}
	const next = unwrapPayload(chunk);
	if (!isRecord(next)) {
		return accumulated ?? next;
	}
	if (!accumulated || !isRecord(accumulated)) {
		return mergeUnifiedPlatformsSearchInto({}, next);
	}
	return mergeUnifiedPlatformsSearchInto({ ...accumulated }, next);
}

function mergeUnifiedPlatformsSearchInto(
	acc: Record<string, unknown>,
	inc: Record<string, unknown>,
): Record<string, unknown> {
	for (const key of ["keywords", "period_hours", "language", "channels"] as const) {
		if (inc[key] !== undefined) acc[key] = inc[key];
	}

	const ek = mergeStringList(acc.expanded_keywords, inc.expanded_keywords);
	if (ek !== undefined) acc.expanded_keywords = ek;

	if (inc.stats !== undefined) {
		acc.stats = isRecord(inc.stats)
			? mergeUnifiedStats(isRecord(acc.stats) ? acc.stats : undefined, inc.stats as Record<string, unknown>)
			: inc.stats;
	}

	for (const platform of PLATFORM_KEYS) {
		if (inc[platform] !== undefined) {
			acc[platform] = mergePlatformSection(platform, acc[platform], inc[platform]);
		}
	}

	if (isRecord(inc.advice)) {
		const prevAdvice = isRecord(acc.advice) ? acc.advice : undefined;
		acc.advice = advicePreferIncoming(prevAdvice, inc.advice as Record<string, unknown>);
	}

	if (isRecord(inc.timing_ms)) {
		const prevT = isRecord(acc.timing_ms) ? acc.timing_ms : {};
		acc.timing_ms = { ...prevT, ...inc.timing_ms };
	}

	return acc;
}
