import { describe, expect, it } from "vitest";
import { mergePlatformsVisualization, mergeUnifiedPlatformsSearchChunk } from "./mergeUnifiedPlatformsSearchChunk";

function postsByDateOf(out: Record<string, unknown> | undefined): Record<string, unknown>[] | undefined {
	const raw = out?.posts_by_date;
	return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : undefined;
}

describe("mergePlatformsVisualization", () => {
	it("clones incoming slice when previous is undefined", () => {
		const inc = {
			posts_by_date: [{ date: "2026-05-14", total_posts: 3, positive: 1, negative: 2, neutral: 0 }],
		};
		const out = mergePlatformsVisualization(undefined, inc);
		const rows = postsByDateOf(out);
		expect(rows).toHaveLength(1);
		expect(rows?.[0]).toEqual(expect.objectContaining({ date: "2026-05-14", total_posts: 3 }));
		expect(rows?.[0]).not.toBe(inc.posts_by_date[0]);
	});

	it("sums rows that share the same date", () => {
		const prev = {
			posts_by_date: [{ date: "2026-05-14", total_posts: 2, positive: 0, negative: 2, neutral: 0, total_views: 100 }],
		};
		const inc = {
			posts_by_date: [{ date: "2026-05-14", total_posts: 3, positive: 1, negative: 2, neutral: 0, total_views: 50 }],
		};
		const out = mergePlatformsVisualization(prev, inc);
		expect(postsByDateOf(out)).toEqual([
			expect.objectContaining({
				date: "2026-05-14",
				total_posts: 5,
				positive: 1,
				negative: 4,
				neutral: 0,
				total_views: 150,
				positive_pct: 20,
				negative_pct: 80,
				neutral_pct: 0,
			}),
		]);
	});

	it("merges disjoint dates and sorts ascending", () => {
		const prev = {
			posts_by_date: [{ date: "2026-05-15", total_posts: 1 }],
		};
		const inc = {
			posts_by_date: [{ date: "2026-05-13", total_posts: 2 }],
		};
		const out = mergePlatformsVisualization(prev, inc);
		expect(postsByDateOf(out)?.map((r) => r.date)).toEqual(["2026-05-13", "2026-05-15"]);
	});

	it("sums comment_sentiment totals and by_date", () => {
		const prev = {
			comment_sentiment: {
				total: 10,
				positive: 3,
				negative: 4,
				neutral: 3,
				by_date: [{ date: "2026-05-14", total: 10, positive: 3, negative: 4, neutral: 3 }],
			},
		};
		const inc = {
			comment_sentiment: {
				total: 5,
				positive: 1,
				negative: 2,
				neutral: 2,
				by_date: [{ date: "2026-05-14", total: 5, positive: 1, negative: 2, neutral: 2 }],
			},
		};
		const out = mergePlatformsVisualization(prev, inc);
		const cs = out?.comment_sentiment as Record<string, unknown> | undefined;
		expect(cs).toMatchObject({
			total: 15,
			positive: 4,
			negative: 6,
			neutral: 5,
		});
		const byDate = cs?.by_date;
		const firstDay = Array.isArray(byDate) ? (byDate[0] as Record<string, unknown>) : undefined;
		expect(firstDay).toMatchObject({
			date: "2026-05-14",
			total: 15,
			positive: 4,
			negative: 6,
			neutral: 5,
		});
	});
});

describe("mergeUnifiedPlatformsSearchChunk visualization", () => {
	it("accumulates visualization across chunks", () => {
		const base = { stats: { telegram: {} } };
		const chunkA = {
			stats: { telegram: {} },
			visualization: {
				posts_by_date: [{ date: "2026-01-02", total_posts: 1 }],
			},
		};
		const chunkB = {
			stats: { telegram: {} },
			visualization: {
				posts_by_date: [{ date: "2026-01-02", total_posts: 4 }],
			},
		};
		const step1 = mergeUnifiedPlatformsSearchChunk(base, chunkA);
		const step2 = mergeUnifiedPlatformsSearchChunk(step1, chunkB);
		expect(step2).toMatchObject({
			visualization: {
				posts_by_date: [expect.objectContaining({ date: "2026-01-02", total_posts: 5 })],
			},
		});
	});
});
