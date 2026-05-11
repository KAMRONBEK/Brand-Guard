import type { SentimentCounts } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { toNumberSentimentMini } from "./to-number-stats";

/** Compact per-post totals instead of the full MetricCard grid. */
export function SentimentMiniStrip({
	stats,
	labels,
}: {
	stats?: SentimentCounts | Record<string, unknown> | null;
	labels: { legend: string; total: string; positive: string; negative: string; neutral: string };
}) {
	if (!stats) return null;
	const total = toNumberSentimentMini(stats.total) ?? 0;
	const positive = toNumberSentimentMini(stats.positive) ?? 0;
	const negative = toNumberSentimentMini(stats.negative) ?? 0;
	const neutral = toNumberSentimentMini(stats.neutral) ?? 0;
	if (total === 0 && positive === 0 && negative === 0 && neutral === 0) return null;

	return (
		<fieldset className="m-0 flex flex-wrap gap-2 border-none p-0">
			<legend className="sr-only">{labels.legend}</legend>
			{total > 0 ? (
				<Badge variant="secondary" className="gap-1 font-normal tabular-nums">
					<span className="text-muted-foreground">{labels.total}</span>
					{total}
				</Badge>
			) : null}
			{positive > 0 ? (
				<Badge variant="success" className="gap-1 capitalize">
					{labels.positive}
					<span className="tabular-nums">{positive}</span>
				</Badge>
			) : null}
			{neutral > 0 ? (
				<Badge variant="outline" className="gap-1 capitalize">
					{labels.neutral}
					<span className="tabular-nums">{neutral}</span>
				</Badge>
			) : null}
			{negative > 0 ? (
				<Badge variant="error" className="gap-1 capitalize">
					{labels.negative}
					<span className="tabular-nums">{negative}</span>
				</Badge>
			) : null}
		</fieldset>
	);
}
