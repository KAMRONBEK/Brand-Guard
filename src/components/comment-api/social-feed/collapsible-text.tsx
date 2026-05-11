import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui/button";
import { cn } from "@/utils";

const DEFAULT_CLAMP = "line-clamp-4";

export function CollapsibleText({
	text,
	className,
	clampClassName = DEFAULT_CLAMP,
}: {
	text: string;
	className?: string;
	/** Tailwind line-clamp utility applied when collapsed */
	clampClassName?: string;
}) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	const needsToggle = text.length > 380 || text.split("\n").length > 5;

	if (!text.trim()) return null;

	return (
		<div className={cn("space-y-1.5", className)}>
			<p className={cn("text-sm leading-relaxed whitespace-pre-wrap", needsToggle && !expanded && clampClassName)}>
				{text}
			</p>
			{needsToggle ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-auto px-0 py-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
					onClick={() => setExpanded((v) => !v)}
				>
					{expanded ? t("sys.commentApi.socialFeed.showLess") : t("sys.commentApi.socialFeed.showMore")}
				</Button>
			) : null}
		</div>
	);
}
