import { isTelegramGroupedPostsObject } from "@/utils/mergeSearchStreamChunk";

const GROUP_KEYS = ["negative", "neutral", "positive"] as const;

export type PlatformsSearchDateRange = { from: string; to: string };

/** Calendar yyyy-MM-dd from post payload (local timezone when parsing ISO datetimes). */
export function postCalendarDateKey(post: Record<string, unknown>): string | null {
	const raw =
		typeof post.date === "string"
			? post.date
			: typeof post.timestamp === "string"
				? post.timestamp
				: typeof post.published === "string"
					? post.published
					: null;
	if (!raw) return null;
	const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
	if (ymd) return ymd[1];
	const t = Date.parse(raw);
	if (Number.isNaN(t)) return null;
	const d = new Date(t);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function postMatchesDateRange(post: Record<string, unknown>, range: PlatformsSearchDateRange | null): boolean {
	if (!range) return true;
	const key = postCalendarDateKey(post);
	if (!key) return false;
	return key >= range.from && key <= range.to;
}

export function filterGroupedPostsByDateRange(postsRoot: unknown, range: PlatformsSearchDateRange | null): unknown {
	if (!range || !isTelegramGroupedPostsObject(postsRoot)) return postsRoot;
	const grouped = postsRoot as Record<string, unknown>;
	const out: Record<string, unknown> = { ...grouped };
	for (const bucket of GROUP_KEYS) {
		const arr = grouped[bucket];
		if (!Array.isArray(arr)) continue;
		out[bucket] = (arr as Record<string, unknown>[]).filter((p) => postMatchesDateRange(p, range));
	}
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Apply date-range filter to unified search root platform post buckets (telegram / instagram / facebook / web). */
export function filterUnifiedRootPostsByDateRange(
	root: Record<string, unknown>,
	range: PlatformsSearchDateRange | null,
): Record<string, unknown> {
	if (!range) return root;
	const next: Record<string, unknown> = { ...root };
	for (const platform of ["telegram", "instagram", "facebook", "web"] as const) {
		const sec = next[platform];
		if (!isRecord(sec)) continue;
		next[platform] = { ...sec, posts: filterGroupedPostsByDateRange(sec.posts, range) };
	}
	return next;
}
