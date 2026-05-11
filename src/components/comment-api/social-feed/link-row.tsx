import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { formatUrlForDisplay } from "./format-url-display";

export function LinkRow({ url, className }: { url: string; className?: string }) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const display = formatUrlForDisplay(url);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className={`flex flex-wrap items-center gap-2 gap-y-2 ${className ?? ""}`}>
			<a
				href={url}
				target="_blank"
				rel="noreferrer noopener"
				aria-label={`${t("sys.commentApi.socialFeed.openPost")}: ${url}`}
				className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
			>
				<Icon icon="mdi:open-in-new" size={16} className="shrink-0 opacity-70" aria-hidden />
				<span className="truncate">{t("sys.commentApi.socialFeed.openPost")}</span>
			</a>
			<span className="min-w-0 max-w-[min(100%,24rem)] truncate font-mono text-xs text-muted-foreground" title={url}>
				{display}
			</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 shrink-0 gap-1.5 text-xs"
				onClick={() => void handleCopy()}
			>
				<Icon icon={copied ? "mdi:check" : "mdi:content-copy"} size={14} aria-hidden />
				{copied ? t("sys.commentApi.socialFeed.copied") : t("sys.commentApi.socialFeed.copyLink")}
			</Button>
		</div>
	);
}
