import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import type { CaptionAnalysis } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";

const ORDER: ReadonlyArray<keyof CaptionAnalysis> = ["topic", "category", "language", "summary"];

function formatUnknownKey(raw: string): string {
	return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CaptionSignalsPanel({ analysis }: { analysis: CaptionAnalysis }) {
	const { t } = useTranslation();
	const record = analysis as CaptionAnalysis & Record<string, unknown>;

	const knownPairs = ORDER.map((key) => {
		const raw = record[key];
		if (raw === undefined || raw === null) return null;
		const str = typeof raw === "string" ? raw.trim() : String(raw).trim();
		if (!str) return null;
		return {
			key: String(key),
			label: t(`sys.commentApi.socialFeed.signal.${String(key)}`),
			value: str,
		};
	}).filter((x): x is { key: string; label: string; value: string } => x !== null);

	const knownKeySet = new Set(ORDER.map(String));
	const extraPairs = Object.entries(record)
		.filter(([key]) => !knownKeySet.has(key))
		.flatMap(([key, val]) => {
			if (val === undefined || val === null) return [];
			const str = typeof val === "string" ? val.trim() : String(val).trim();
			if (!str) return [];
			return [{ key, label: formatUnknownKey(key), value: str }];
		});

	const rows = [...knownPairs, ...extraPairs];
	if (rows.length === 0) return null;

	return (
		<Collapsible defaultOpen={false}>
			<CollapsibleTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="group h-auto min-h-9 w-full justify-between gap-2 py-2 data-[state=open]:border-primary/30"
				>
					<span className="flex min-w-0 items-center gap-2">
						<Icon icon="mdi:sparkles-outline" size={16} className="shrink-0 text-muted-foreground" aria-hidden />
						<span className="truncate text-left">{t("sys.commentApi.socialFeed.postSignals")}</span>
						<Badge variant="secondary" shape="square" className="shrink-0">
							{rows.length}
						</Badge>
					</span>
					<Icon
						icon="mdi:chevron-down"
						size={18}
						className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
						aria-hidden
					/>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-2 pt-2">
				<dl className="grid gap-2 sm:grid-cols-2">
					{rows.map((row) => (
						<div key={row.key} className="rounded-lg border border-border/60 bg-muted/25 p-3">
							<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
							<dd className="mt-1 text-sm leading-relaxed font-medium">{row.value}</dd>
						</div>
					))}
				</dl>
			</CollapsibleContent>
		</Collapsible>
	);
}
