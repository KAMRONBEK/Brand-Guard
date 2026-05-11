import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { CardContent, CardHeader } from "@/ui/card";
import { Title } from "@/ui/typography";
import { cn } from "@/utils";
import { LinkRow } from "./link-row";

export type SocialPlatformBadge = "instagram" | "facebook" | "telegram";

const PLATFORM_ICONS: Record<SocialPlatformBadge, string> = {
	instagram: "skill-icons:instagram",
	facebook: "logos:facebook",
	telegram: "mdi:telegram",
};

export function PostCardShell({
	platform,
	platformLabelOverride,
	headline,
	datetimeLine,
	url,
	headerBadges,
	children,
	className,
}: {
	platform: SocialPlatformBadge;
	platformLabelOverride?: string;
	headline: string;
	datetimeLine?: string;
	url?: string;
	headerBadges?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	const { t } = useTranslation();
	const platformLabel = platformLabelOverride ?? t(`sys.commentApi.socialFeed.platform.${platform}`);

	return (
		<article
			className={cn(
				"overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm",
				className,
			)}
		>
			<CardHeader className="space-y-3 border-b border-border/50 bg-muted/20 pb-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						<Badge variant="outline" className="shrink-0 gap-1.5 border-primary/25 bg-background/90 py-1 pr-2 pl-2">
							<Icon icon={PLATFORM_ICONS[platform]} size={14} aria-hidden />
							<span>{platformLabel}</span>
						</Badge>
						{headerBadges}
					</div>
				</div>
				<div className="min-w-0 space-y-1">
					<Title as="h3" className="text-lg font-semibold tracking-tight">
						{headline}
					</Title>
					{datetimeLine ? (
						<p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<Icon icon="mdi:clock-outline" size={14} className="shrink-0 opacity-70" aria-hidden />
							<time>{datetimeLine}</time>
						</p>
					) : null}
				</div>
				{url ? <LinkRow url={url} /> : null}
			</CardHeader>
			<CardContent className="space-y-3 pt-4">{children}</CardContent>
		</article>
	);
}
