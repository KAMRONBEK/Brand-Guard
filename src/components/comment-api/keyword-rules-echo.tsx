import { useTranslation } from "react-i18next";
import type { KeywordSearchRule } from "@/types/comment-api";
import { Badge } from "@/ui/badge";

export function KeywordRulesEchoSummary({ rules }: { rules: KeywordSearchRule[] }) {
	const { t } = useTranslation();
	const visible = rules.filter((r) => r.keyword.trim() !== "");
	if (visible.length === 0) return null;

	return (
		<div className="flex flex-col gap-2">
			{visible.map((r, i) => (
				<div
					key={`${r.keyword}-${i}`}
					className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center"
				>
					<Badge variant="secondary" className="w-fit font-normal">
						{r.keyword.trim()}
					</Badge>
					{(r.required_keywords?.length ?? 0) > 0 ? (
						<span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
							<span className="font-medium">{t("sys.keywordRules.requiredShort")}:</span>
							{r.required_keywords?.map((term) => (
								<Badge key={term} variant="outline" className="font-normal">
									{term}
								</Badge>
							))}
						</span>
					) : null}
					{(r.excluded_keywords?.length ?? 0) > 0 ? (
						<span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
							<span className="font-medium">{t("sys.keywordRules.excludedShort")}:</span>
							{r.excluded_keywords?.map((term) => (
								<Badge key={term} variant="destructive" className="font-normal opacity-90">
									{term}
								</Badge>
							))}
						</span>
					) : null}
				</div>
			))}
		</div>
	);
}
