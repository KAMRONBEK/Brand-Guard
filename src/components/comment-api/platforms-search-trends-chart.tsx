import type { ApexOptions } from "apexcharts";
import { endOfISOWeek, endOfMonth, format, parseISO, startOfISOWeek, startOfMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Chart } from "@/components/chart";
import { useChart } from "@/components/chart/useChart";
import type { PlatformsSearchDateRange } from "@/components/comment-api/platforms-search-date-filter";
import { paletteColors } from "@/theme/tokens/color";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/ui/toggle-group";
import { Text } from "@/ui/typography";
import { cn } from "@/utils";

export type TrendGranularity = "day" | "week" | "month";

export type PlatformsTrendBucket = {
	label: string;
	range: PlatformsSearchDateRange;
	total_posts: number;
	total_views: number;
	positive: number;
	negative: number;
	neutral: number;
};

function toFiniteNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
			? Number(value)
			: 0;
}

export function distinctCalendarMonthsCount(rows: Record<string, unknown>[]): number {
	const months = new Set<string>();
	for (const row of rows) {
		const d = row.date;
		if (typeof d === "string" && d.length >= 7) months.add(d.slice(0, 7));
	}
	return months.size;
}

/** Aggregate daily `posts_by_date` rows by day / ISO week / calendar month. */
export function buildVisualizationBuckets(
	rows: Record<string, unknown>[],
	granularity: TrendGranularity,
): PlatformsTrendBucket[] {
	const sorted = [...rows]
		.filter((r) => typeof r.date === "string" && String(r.date).trim() !== "")
		.sort((a, b) => String(a.date).localeCompare(String(b.date)));

	type Acc = {
		total_posts: number;
		total_views: number;
		positive: number;
		negative: number;
		neutral: number;
	};

	const map = new Map<string, { label: string; range: PlatformsSearchDateRange; acc: Acc }>();

	for (const row of sorted) {
		const dateStr = String(row.date).trim();
		const d = parseISO(dateStr);
		let bucketKey: string;
		let label: string;
		let range: PlatformsSearchDateRange;

		if (granularity === "day") {
			bucketKey = dateStr;
			range = { from: dateStr, to: dateStr };
			label = format(d, "d MMM");
		} else if (granularity === "week") {
			const ws = startOfISOWeek(d);
			const we = endOfISOWeek(d);
			bucketKey = format(ws, "yyyy-MM-dd");
			range = { from: format(ws, "yyyy-MM-dd"), to: format(we, "yyyy-MM-dd") };
			label = format(ws, "d MMM");
		} else {
			const ms = startOfMonth(d);
			const me = endOfMonth(d);
			bucketKey = format(ms, "yyyy-MM");
			range = { from: format(ms, "yyyy-MM-dd"), to: format(me, "yyyy-MM-dd") };
			label = format(ms, "MMM yyyy");
		}

		const tp = toFiniteNumber(row.total_posts);
		const tv = toFiniteNumber(row.total_views);
		const pos = toFiniteNumber(row.positive);
		const neg = toFiniteNumber(row.negative);
		const neu = toFiniteNumber(row.neutral);

		const existing = map.get(bucketKey);
		if (!existing) {
			map.set(bucketKey, {
				label,
				range,
				acc: { total_posts: tp, total_views: tv, positive: pos, negative: neg, neutral: neu },
			});
		} else {
			existing.acc.total_posts += tp;
			existing.acc.total_views += tv;
			existing.acc.positive += pos;
			existing.acc.negative += neg;
			existing.acc.neutral += neu;
		}
	}

	return [...map.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, v]) => ({
			label: v.label,
			range: v.range,
			total_posts: v.acc.total_posts,
			total_views: v.acc.total_views,
			positive: v.acc.positive,
			negative: v.acc.negative,
			neutral: v.acc.neutral,
		}));
}

function rangesEqual(a: PlatformsSearchDateRange | null, b: PlatformsSearchDateRange): boolean {
	return a !== null && a.from === b.from && a.to === b.to;
}

export type PlatformsSearchTrendsChartProps = {
	rows: Record<string, unknown>[];
	selectedRange: PlatformsSearchDateRange | null;
	onSelectRange: (range: PlatformsSearchDateRange | null) => void;
	className?: string;
};

export function PlatformsSearchTrendsChart({
	rows,
	selectedRange,
	onSelectRange,
	className,
}: PlatformsSearchTrendsChartProps) {
	const { t } = useTranslation();
	const [chartTab, setChartTab] = useState<"mentions" | "sentiment">("mentions");
	const [granularity, setGranularity] = useState<TrendGranularity>("day");

	const granRef = useRef(granularity);
	useEffect(() => {
		if (granRef.current !== granularity) {
			granRef.current = granularity;
			onSelectRange(null);
		}
	}, [granularity, onSelectRange]);

	const tabRef = useRef(chartTab);
	useEffect(() => {
		if (tabRef.current !== chartTab) {
			tabRef.current = chartTab;
			onSelectRange(null);
		}
	}, [chartTab, onSelectRange]);

	const monthGranularityDisabled = distinctCalendarMonthsCount(rows) < 2;

	useEffect(() => {
		if (monthGranularityDisabled && granularity === "month") {
			setGranularity("day");
		}
	}, [monthGranularityDisabled, granularity]);

	const buckets = useMemo(() => buildVisualizationBuckets(rows, granularity), [rows, granularity]);

	const postsSeriesName = t("sys.platformsSearch.visualization.seriesPosts");
	const viewsSeriesName = t("sys.platformsSearch.visualization.seriesViews");
	const posName = t("sys.commentApi.sentiment.positive");
	const negName = t("sys.commentApi.sentiment.negative");
	const neuName = t("sys.commentApi.sentiment.neutral");

	const chartOptions = useChart({
		colors:
			chartTab === "mentions"
				? [paletteColors.info.default, paletteColors.primary.default]
				: [paletteColors.success.default, paletteColors.error.default, paletteColors.warning.default],
		chart: {
			events: {
				dataPointSelection: (_event, _chartContext, cfg) => {
					const i = cfg.dataPointIndex;
					if (typeof i !== "number" || i < 0 || i >= buckets.length) return;
					const picked = buckets[i].range;
					if (rangesEqual(selectedRange, picked)) {
						onSelectRange(null);
					} else {
						onSelectRange(picked);
					}
				},
			},
		},
		stroke: { width: chartTab === "mentions" ? [2.5, 2.5] : [2.5, 2.5, 2.5] },
		xaxis: {
			categories: buckets.map((b) => b.label),
		},
		yaxis:
			chartTab === "mentions"
				? [
						{
							seriesName: postsSeriesName,
							title: { text: postsSeriesName },
							labels: { formatter: (val: string | number) => `${val}` },
						},
						{
							seriesName: viewsSeriesName,
							opposite: true,
							title: { text: viewsSeriesName },
							labels: { formatter: (val: string | number) => `${val}` },
						},
					]
				: {
						title: { text: t("sys.platformsSearch.visualization.sentimentAxisTitle") },
						labels: { formatter: (val: string | number) => `${val}` },
					},
		legend: {
			show: true,
			position: "bottom",
			horizontalAlign: "left",
			fontWeight: 400,
		},
		markers: { size: 4, hover: { size: 6 } },
		tooltip: {
			shared: true,
			intersect: false,
			y: {
				formatter: (val: number) => (typeof val === "number" ? `${val}` : ""),
			},
		},
	} as ApexOptions);

	const series = useMemo(() => {
		if (chartTab === "mentions") {
			return [
				{ name: postsSeriesName, type: "line" as const, data: buckets.map((b) => b.total_posts) },
				{ name: viewsSeriesName, type: "line" as const, data: buckets.map((b) => b.total_views) },
			];
		}
		return [
			{ name: posName, type: "line" as const, data: buckets.map((b) => b.positive) },
			{ name: negName, type: "line" as const, data: buckets.map((b) => b.negative) },
			{ name: neuName, type: "line" as const, data: buckets.map((b) => b.neutral) },
		];
	}, [buckets, chartTab, postsSeriesName, viewsSeriesName, posName, negName, neuName]);

	if (buckets.length === 0) return null;

	return (
		<Card className={cn("overflow-hidden bg-background/70", className)}>
			<CardHeader className="flex flex-col gap-4 space-y-0 border-border/60 border-b pb-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<ToggleGroup
						type="single"
						value={chartTab}
						onValueChange={(v) => {
							if (v === "mentions" || v === "sentiment") setChartTab(v);
						}}
						className="justify-start bg-muted/40 p-1"
						size="sm"
						variant="outline"
					>
						<ToggleGroupItem value="mentions" className="px-3 text-xs sm:text-sm">
							{t("sys.platformsSearch.visualization.tabMentions")}
						</ToggleGroupItem>
						<ToggleGroupItem value="sentiment" className="px-3 text-xs sm:text-sm">
							{t("sys.platformsSearch.visualization.tabSentiment")}
						</ToggleGroupItem>
					</ToggleGroup>

					<ToggleGroup
						type="single"
						value={granularity}
						onValueChange={(v) => {
							if (v === "day" || v === "week" || v === "month") setGranularity(v);
						}}
						className="justify-start bg-muted/40 p-1"
						size="sm"
						variant="outline"
					>
						<ToggleGroupItem value="day" className="px-3 text-xs sm:text-sm">
							{t("sys.platformsSearch.visualization.granularityDays")}
						</ToggleGroupItem>
						<ToggleGroupItem value="week" className="px-3 text-xs sm:text-sm">
							{t("sys.platformsSearch.visualization.granularityWeeks")}
						</ToggleGroupItem>
						<ToggleGroupItem
							value="month"
							disabled={monthGranularityDisabled}
							className="px-3 text-xs sm:text-sm disabled:opacity-40"
						>
							{t("sys.platformsSearch.visualization.granularityMonths")}
						</ToggleGroupItem>
					</ToggleGroup>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<Text variant="caption" className="text-center text-muted-foreground sm:text-start">
						{t("sys.platformsSearch.visualization.clickHint")}
					</Text>
					{selectedRange ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 shrink-0 self-center sm:self-auto"
							onClick={() => onSelectRange(null)}
						>
							{t("sys.platformsSearch.visualization.clearFilter")}
						</Button>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="pt-4">
				<Chart type="line" series={series} options={chartOptions} height={320} />
			</CardContent>
		</Card>
	);
}
