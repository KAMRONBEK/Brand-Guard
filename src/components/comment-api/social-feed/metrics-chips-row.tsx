import { useTranslation } from "react-i18next";
import { Badge } from "@/ui/badge";

function formatMetric(value: string | number | undefined): string {
	if (value === undefined) return "—";
	if (typeof value === "string" && value.trim() === "") return "—";
	return String(value);
}

export function MetricsChipsRow({
	shortcode,
	likeCount,
	commentCount,
	views,
}: {
	shortcode?: string;
	likeCount?: string | number;
	commentCount?: string | number;
	views?: string | number;
}) {
	const { t } = useTranslation();
	const chips: { key: string; label: string; value: string }[] = [];
	if (typeof shortcode === "string" && shortcode.length > 0) {
		chips.push({ key: "sc", label: t("sys.commentApi.post.shortcode"), value: shortcode });
	}
	if (likeCount !== undefined) {
		chips.push({ key: "lk", label: t("sys.commentApi.post.likes"), value: formatMetric(likeCount) });
	}
	if (commentCount !== undefined) {
		chips.push({ key: "cc", label: t("sys.commentApi.post.commentsOnPost"), value: formatMetric(commentCount) });
	}
	if (views !== undefined) {
		chips.push({ key: "vw", label: t("sys.commentApi.socialFeed.views"), value: formatMetric(views) });
	}
	if (chips.length === 0) return null;

	return (
		<ul className="m-0 flex list-none flex-wrap gap-2 p-0">
			{chips.map((c) => (
				<li key={c.key} className="list-none">
					<Badge variant="secondary" className="h-auto max-w-full gap-1.5 py-1 pr-2.5 pl-2 font-normal">
						<span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</span>
						<span className="font-mono text-foreground text-xs">{c.value}</span>
					</Badge>
				</li>
			))}
		</ul>
	);
}
