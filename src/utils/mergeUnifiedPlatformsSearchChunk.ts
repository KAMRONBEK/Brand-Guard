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

const PLATFORM_KEYS = ["telegram", "instagram", "facebook", "web"] as const;

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
	const listKeys =
		platformKey === "telegram"
			? (["channels"] as const)
			: platformKey === "web"
				? (["sites"] as const)
				: (["accounts"] as const);
	for (const listKey of listKeys) {
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

function sumFiniteNumbers(a: unknown, b: unknown): number {
	const na = typeof a === "number" && Number.isFinite(a) ? a : 0;
	const nb = typeof b === "number" && Number.isFinite(b) ? b : 0;
	return na + nb;
}

const POSTS_BY_DATE_SUM_KEYS = [
	"total_posts",
	"positive",
	"negative",
	"neutral",
	"total_views",
	"total_likes",
	"telegram",
	"instagram",
	"facebook",
	"web",
] as const;

function recomputeRowSentimentPct(row: Record<string, unknown>): void {
	const tp = sumFiniteNumbers(row.total_posts, 0);
	const pos = sumFiniteNumbers(row.positive, 0);
	const neg = sumFiniteNumbers(row.negative, 0);
	const neu = sumFiniteNumbers(row.neutral, 0);
	if (tp > 0) {
		row.positive_pct = Math.round((pos / tp) * 1000) / 10;
		row.negative_pct = Math.round((neg / tp) * 1000) / 10;
		row.neutral_pct = Math.round((neu / tp) * 1000) / 10;
	}
}

function mergePostsByDateRowInto(target: Record<string, unknown>, src: Record<string, unknown>): void {
	for (const key of POSTS_BY_DATE_SUM_KEYS) {
		target[key] = sumFiniteNumbers(target[key], src[key]);
	}
	recomputeRowSentimentPct(target);
}

/** Merge streamed `visualization` slices (sum numeric buckets by `date`). Exported for unit tests. */
export function mergePlatformsVisualization(prev: unknown, inc: unknown): Record<string, unknown> | undefined {
	if (!isRecord(inc)) {
		return isRecord(prev) ? { ...prev } : undefined;
	}
	if (!isRecord(prev)) {
		const clone: Record<string, unknown> = { ...inc };
		if (Array.isArray(clone.posts_by_date)) {
			clone.posts_by_date = (clone.posts_by_date as unknown[]).map((row) => (isRecord(row) ? { ...row } : row));
		}
		if (isRecord(clone.comment_sentiment)) {
			const cs = clone.comment_sentiment as Record<string, unknown>;
			const copy = { ...cs };
			if (Array.isArray(copy.by_date)) {
				copy.by_date = (copy.by_date as unknown[]).map((row) => (isRecord(row) ? { ...row } : row));
			}
			clone.comment_sentiment = copy;
		}
		return clone;
	}

	const out: Record<string, unknown> = { ...prev };

	const mergePostsArrays = (pa: unknown, ia: unknown): Record<string, unknown>[] | undefined => {
		const map = new Map<string, Record<string, unknown>>();
		const ingest = (arr: unknown) => {
			if (!Array.isArray(arr)) return;
			for (const item of arr) {
				if (!isRecord(item)) continue;
				const dk = item.date;
				if (typeof dk !== "string" || dk.trim() === "") continue;
				const dateKey = dk.trim();
				const existing = map.get(dateKey);
				if (!existing) {
					const row = { ...item };
					recomputeRowSentimentPct(row);
					map.set(dateKey, row);
				} else {
					mergePostsByDateRowInto(existing, item);
				}
			}
		};
		ingest(pa);
		ingest(ia);
		if (map.size === 0) return undefined;
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
	};

	if (inc.posts_by_date !== undefined || prev.posts_by_date !== undefined) {
		const merged = mergePostsArrays(prev.posts_by_date, inc.posts_by_date);
		if (merged !== undefined) out.posts_by_date = merged;
	}

	const COMMENT_SUM_KEYS = ["total", "positive", "negative", "neutral"] as const;
	const mergeCommentByDate = (pa: unknown, ia: unknown): Record<string, unknown>[] | undefined => {
		const map = new Map<string, Record<string, unknown>>();
		const ingest = (arr: unknown) => {
			if (!Array.isArray(arr)) return;
			for (const item of arr) {
				if (!isRecord(item)) continue;
				const dk = item.date;
				if (typeof dk !== "string" || dk.trim() === "") continue;
				const dateKey = dk.trim();
				const existing = map.get(dateKey);
				if (!existing) {
					map.set(dateKey, { ...item });
				} else {
					for (const k of COMMENT_SUM_KEYS) {
						existing[k] = sumFiniteNumbers(existing[k], item[k]);
					}
				}
			}
		};
		ingest(pa);
		ingest(ia);
		if (map.size === 0) return undefined;
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
	};

	const mergeCommentRollup = (
		p: Record<string, unknown> | undefined,
		i: Record<string, unknown>,
	): Record<string, unknown> => {
		const base = p ? { ...p } : {};
		for (const k of COMMENT_SUM_KEYS) {
			base[k] = sumFiniteNumbers(base[k], i[k]);
		}
		const total = sumFiniteNumbers(base.total, 0);
		const pos = sumFiniteNumbers(base.positive, 0);
		const neg = sumFiniteNumbers(base.negative, 0);
		const neu = sumFiniteNumbers(base.neutral, 0);
		if (total > 0) {
			base.positive_pct = Math.round((pos / total) * 1000) / 10;
			base.negative_pct = Math.round((neg / total) * 1000) / 10;
			base.neutral_pct = Math.round((neu / total) * 1000) / 10;
		}
		const mergedDates = mergeCommentByDate(p?.by_date, i.by_date);
		if (mergedDates !== undefined) base.by_date = mergedDates;
		else if (Array.isArray(i.by_date)) base.by_date = i.by_date.map((row) => (isRecord(row) ? { ...row } : row));
		else if (Array.isArray(p?.by_date)) base.by_date = p.by_date;
		return base;
	};

	if (inc.comment_sentiment !== undefined || prev.comment_sentiment !== undefined) {
		const prevCs = isRecord(prev.comment_sentiment) ? prev.comment_sentiment : undefined;
		const incCs = isRecord(inc.comment_sentiment) ? inc.comment_sentiment : undefined;
		if (incCs) {
			out.comment_sentiment = mergeCommentRollup(prevCs, incCs);
		} else if (prevCs) {
			out.comment_sentiment = { ...prevCs };
		}
	}

	return out;
}

export function isUnifiedPlatformsSearchPayload(value: unknown): boolean {
	if (!isRecord(value)) return false;
	const stats = value.stats;
	if (isRecord(stats)) {
		if (isRecord(stats.telegram) || isRecord(stats.instagram) || isRecord(stats.facebook) || isRecord(stats.web)) {
			return true;
		}
	}
	if (isRecord(value.telegram) || isRecord(value.instagram) || isRecord(value.facebook) || isRecord(value.web))
		return true;
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
	for (const key of [
		"keywords",
		"keyword_rules",
		"required_keywords",
		"excluded_keywords",
		"period_hours",
		"language",
		"channels",
	] as const) {
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

	if (isRecord(inc.visualization)) {
		const mergedViz = mergePlatformsVisualization(acc.visualization, inc.visualization as Record<string, unknown>);
		if (mergedViz !== undefined) acc.visualization = mergedViz;
	}

	return acc;
}
