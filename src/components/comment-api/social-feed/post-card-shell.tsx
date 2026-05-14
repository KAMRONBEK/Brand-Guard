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

/** Top-of-card wash that fades toward the neutral card body below the metadata block. */
const PLATFORM_HEADER_SURFACE: Record<SocialPlatformBadge, string> = {
	instagram:
		"relative border-border/35 border-b bg-card bg-[linear-gradient(180deg,rgb(251_113_133/0.28)_0%,rgb(217_70_239/0.16)_34%,rgb(249_115_22/0.1)_55%,transparent_88%)] dark:bg-[linear-gradient(180deg,rgb(251_207_232/0.22)_0%,rgb(192_132_252/0.16)_38%,rgb(253_186_116/0.12)_58%,transparent_88%)]",
	facebook:
		"relative border-border/35 border-b bg-card bg-gradient-to-b from-[#0866FF]/[0.24] via-[#0866FF]/10 via-45% to-transparent to-[88%] dark:from-[#4294FF]/[0.22] dark:via-blue-400/12 dark:to-transparent",
	telegram:
		"relative border-border/35 border-b bg-card bg-gradient-to-b from-sky-500/[0.24] via-sky-600/[0.10] via-45% to-transparent to-[88%] dark:from-sky-400/[0.22] dark:via-cyan-500/12 dark:to-transparent",
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
	dense,
}: {
	platform: SocialPlatformBadge;
	platformLabelOverride?: string;
	headline: string;
	datetimeLine?: string;
	url?: string;
	headerBadges?: ReactNode;
	children: ReactNode;
	className?: string;
	/** Tighter typography and spacing—e.g. multi-column post grids */
	dense?: boolean;
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
			<CardHeader className={cn(PLATFORM_HEADER_SURFACE[platform], dense ? "space-y-2 pb-3" : "space-y-3 pb-4")}>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className={cn(
								"shrink-0 gap-1.5 border-primary/25 bg-background/90 py-1 pr-2 pl-2",
								dense && "py-0.5 text-[11px]",
							)}
						>
							<Icon icon={PLATFORM_ICONS[platform]} size={dense ? 12 : 14} aria-hidden />
							<span>{platformLabel}</span>
						</Badge>
						{headerBadges}
					</div>
				</div>
				<div className="min-w-0 space-y-1">
					<Title as="h3" className={cn("font-semibold tracking-tight", dense ? "text-base leading-snug" : "text-lg")}>
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
			<CardContent className={cn(dense ? "space-y-2 pt-3" : "space-y-3 pt-4")}>{children}</CardContent>
		</article>
	);
}
