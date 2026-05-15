import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { parseKeywordRulesArray } from "@/utils/keyword-search-rules";
import { isTelegramGroupedPostsObject } from "@/utils/mergeSearchStreamChunk";
import { isUnifiedPlatformsSearchPayload } from "@/utils/mergeUnifiedPlatformsSearchChunk";
import { KeywordRulesEchoSummary } from "./keyword-rules-echo";
import { MetricCard, RawJsonDetails } from "./api-result";
import type { PlatformsSearchDateRange } from "./platforms-search-date-filter";
import { filterUnifiedRootPostsByDateRange } from "./platforms-search-date-filter";
import { PlatformsSearchTrendsChart } from "./platforms-search-trends-chart";
import { CollapsibleText } from "./social-feed/collapsible-text";
import { MetricsChipsRow } from "./social-feed/metrics-chips-row";
import { PostCardShell, SOCIAL_PLATFORM_ICONS, type SocialPlatformBadge } from "./social-feed/post-card-shell";
import { TelegramSearchAdviceTimingPanel, TelegramSearchResultView } from "./telegram-search-result";

const SENTIMENT_ORDER = ["negative", "neutral", "positive"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: typeof value === "string" && value.trim() !== ""
			? Number(value)
			: undefined;
}

function formatWhen(iso: string | undefined): string {
	if (!iso || typeof iso !== "string") return "—";
	const d = Date.parse(iso);
	if (Number.isNaN(d)) return iso;
	return new Date(d).toLocaleString();
}

function socialHeadline(post: Record<string, unknown>): string {
	const author = typeof post.author === "string" ? post.author.trim() : "";
	if (author !== "") return author;
	const account = typeof post.account === "string" ? post.account.trim() : "";
	return account !== "" ? account : "—";
}

function postsForBucket(postsRoot: unknown, bucket: (typeof SENTIMENT_ORDER)[number]): Record<string, unknown>[] {
	if (!isTelegramGroupedPostsObject(postsRoot)) return [];
	const grouped = postsRoot as Record<string, unknown>;
	const arr = grouped[bucket];
	return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
}

function countSocialPosts(postsRoot: unknown): number {
	if (!isTelegramGroupedPostsObject(postsRoot)) return 0;
	let n = 0;
	for (const key of SENTIMENT_ORDER) {
		const arr = (postsRoot as Record<string, unknown>)[key];
		if (Array.isArray(arr)) n += arr.length;
	}
	return n;
}

function buildSyntheticTelegram(root: Record<string, unknown>): Record<string, unknown> | null {
	const tg = root.telegram;
	if (!isRecord(tg)) return null;
	return {
		keywords: Array.isArray(root.keywords) ? root.keywords : [],
		channels: Array.isArray(tg.channels) ? tg.channels : [],
		period_hours: root.period_hours,
		stats: tg.stats,
		posts: tg.posts,
		failed_channels: tg.failed_channels,
	};
}

function SocialPlatformPostsSection({
	platform,
	title,
	postsRoot,
	t,
}: {
	platform: SocialPlatformBadge;
	title: string;
	postsRoot: unknown;
	t: (key: string, options?: Record<string, unknown>) => string;
}) {
	const total = countSocialPosts(postsRoot);
	if (total === 0) return null;

	return (
		<div className="flex flex-col gap-4">
			{title.trim() !== "" ? (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Title as="h3" className="text-lg font-semibold">
						{title}
					</Title>
					<Badge variant="secondary" className="tabular-nums">
						{total}
					</Badge>
				</div>
			) : null}
			{SENTIMENT_ORDER.map((sentiment) => {
				const posts = postsForBucket(postsRoot, sentiment);
				if (posts.length === 0) return null;
				const isWeb = platform === "web";
				const sectionBorder =
					sentiment === "negative"
						? "border-destructive/35"
						: sentiment === "positive"
							? "border-success/35"
							: "border-border/80";
				return (
					<Card key={`${platform}-${sentiment}`} className={cn("overflow-hidden bg-background/70", sectionBorder)}>
						<CardHeader className="border-b bg-muted/30 pb-3">
							<CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base capitalize">
								{t(`sys.telegramSearch.result.sentimentSection.${sentiment}`)}
								<Badge variant={sentiment === "negative" ? "error" : sentiment === "positive" ? "success" : "outline"}>
									{posts.length}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
							{posts.map((post, index) => {
								const sentStr = typeof post.sentiment === "string" ? post.sentiment : "";
								const caption =
									typeof post.caption === "string" ? post.caption : typeof post.text === "string" ? post.text : "";
								const likesRaw = post.likes ?? post.like_count;
								const titleStr = typeof post.title === "string" ? post.title.trim() : "";
								const siteStr = typeof post.site === "string" ? post.site.trim() : "";
								const headline = isWeb ? (titleStr !== "" ? titleStr : "—") : socialHeadline(post);
								const datetimeLine = isWeb
									? formatWhen(typeof post.published === "string" ? post.published : undefined)
									: formatWhen(
											typeof post.timestamp === "string"
												? post.timestamp
												: typeof post.date === "string"
													? post.date
													: undefined,
										);
								return (
									<PostCardShell
										key={typeof post.url === "string" ? post.url : `${platform}-${sentiment}-${index}`}
										className="min-w-0"
										dense
										platform={platform}
										headline={headline}
										datetimeLine={datetimeLine}
										url={typeof post.url === "string" ? post.url : undefined}
										headerBadges={
											sentStr ? (
												<Badge
													variant={sentStr === "negative" ? "error" : sentStr === "positive" ? "success" : "outline"}
													className="capitalize"
												>
													{sentStr}
												</Badge>
											) : null
										}
									>
										{isWeb ? (
											siteStr !== "" ? (
												<Badge variant="secondary" className="w-fit font-normal">
													{siteStr}
												</Badge>
											) : null
										) : (
											<>
												<MetricsChipsRow
													likeCount={
														typeof likesRaw === "string" || typeof likesRaw === "number" ? likesRaw : undefined
													}
												/>
												{caption.trim() !== "" ? (
													<CollapsibleText text={caption} clampClassName="line-clamp-3" />
												) : (
													<p className="text-sm text-muted-foreground">—</p>
												)}
											</>
										)}
									</PostCardShell>
								);
							})}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

export function UnifiedPlatformsSearchResultView({
	value,
	bilingualEnabled,
}: {
	value: unknown;
	/** Shown when API does not echo bilingual; reflects the form toggle. */
	bilingualEnabled?: boolean;
}) {
	const { t } = useTranslation();

	const rootRecord =
		isRecord(value) && isUnifiedPlatformsSearchPayload(value) ? (value as Record<string, unknown>) : null;

	const [selectedTrendRange, setSelectedTrendRange] = useState<PlatformsSearchDateRange | null>(null);

	const searchQueryKey = useMemo(() => {
		if (!rootRecord) return "";
		const rules = parseKeywordRulesArray(rootRecord.keyword_rules).filter((r) => r.keyword.trim() !== "");
		const rulesKey =
			rules.length > 0
				? rules
						.map((r) => [r.keyword, ...(r.required_keywords ?? []), ...(r.excluded_keywords ?? [])].join("\u0002"))
						.join("\u0003")
				: Array.isArray(rootRecord.keywords)
					? (rootRecord.keywords as string[]).join("\u0001")
					: "";
		return `${rulesKey}|${String(rootRecord.period_hours ?? "")}`;
	}, [rootRecord]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clear stale drill-down when keywords or period change without relying on rootRecord identity (streaming updates reuse structure)
	useEffect(() => {
		setSelectedTrendRange(null);
	}, [searchQueryKey]);

	const displayRoot = useMemo(() => {
		if (!rootRecord) return null;
		return filterUnifiedRootPostsByDateRange(rootRecord, selectedTrendRange);
	}, [rootRecord, selectedTrendRange]);

	const postsByDate = useMemo(() => {
		if (!rootRecord) return [];
		const vizRoot = isRecord(rootRecord.visualization) ? rootRecord.visualization : undefined;
		return Array.isArray(vizRoot?.posts_by_date) ? (vizRoot.posts_by_date as Record<string, unknown>[]) : [];
	}, [rootRecord]);

	if (!rootRecord || displayRoot === null) {
		return null;
	}

	const keywords = Array.isArray(rootRecord.keywords) ? (rootRecord.keywords as string[]) : [];
	const echoedRules = parseKeywordRulesArray(rootRecord.keyword_rules);
	const hasEchoedRules = echoedRules.some((r) => r.keyword.trim() !== "");
	const expandedKeywords = Array.isArray(rootRecord.expanded_keywords)
		? (rootRecord.expanded_keywords as string[])
		: [];
	const periodHours = toNumber(rootRecord.period_hours);

	const stats = isRecord(rootRecord.stats) ? rootRecord.stats : undefined;
	const totalPosts = toNumber(stats?.total_posts);
	const pos = toNumber(stats?.positive);
	const neg = toNumber(stats?.negative);
	const neu = toNumber(stats?.neutral);
	const posPct = toNumber(stats?.positive_pct);
	const negPct = toNumber(stats?.negative_pct);
	const neuPct = toNumber(stats?.neutral_pct);

	const tg = isRecord(displayRoot.telegram) ? displayRoot.telegram : undefined;
	const ig = isRecord(displayRoot.instagram) ? displayRoot.instagram : undefined;
	const fb = isRecord(displayRoot.facebook) ? displayRoot.facebook : undefined;
	const web = isRecord(displayRoot.web) ? displayRoot.web : undefined;

	const tgStats = isRecord(tg?.stats) ? tg.stats : undefined;
	const igStats = isRecord(ig?.stats) ? ig.stats : undefined;
	const fbStats = isRecord(fb?.stats) ? fb.stats : undefined;
	const webStats = isRecord(web?.stats) ? web.stats : undefined;

	const filteredByChart = selectedTrendRange !== null;
	const tgPosts = filteredByChart
		? countSocialPosts(tg?.posts)
		: (toNumber(tgStats?.total_posts) ?? countSocialPosts(tg?.posts));
	const igPosts = filteredByChart
		? countSocialPosts(ig?.posts)
		: (toNumber(igStats?.total_posts) ?? countSocialPosts(ig?.posts));
	const fbPosts = filteredByChart
		? countSocialPosts(fb?.posts)
		: (toNumber(fbStats?.total_posts) ?? countSocialPosts(fb?.posts));
	const webPosts = filteredByChart
		? countSocialPosts(web?.posts)
		: (toNumber(webStats?.total_posts) ?? countSocialPosts(web?.posts));
	const sumPlatformPosts = tgPosts + igPosts + fbPosts + webPosts;
	const allTabPostCount = filteredByChart ? sumPlatformPosts : totalPosts != null ? totalPosts : sumPlatformPosts;

	const syntheticTelegram = buildSyntheticTelegram(displayRoot);

	return (
		<div className="flex flex-col gap-5">
			{postsByDate.length > 0 ? (
				<PlatformsSearchTrendsChart
					rows={postsByDate}
					selectedRange={selectedTrendRange}
					onSelectRange={setSelectedTrendRange}
				/>
			) : null}

			<Card className="border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-background">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">{t("sys.platformsSearch.result.summaryTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						{bilingualEnabled === true ? (
							<Badge variant="outline" className="gap-1">
								<Icon icon="mdi:translate" size={14} aria-hidden />
								{t("sys.platformsSearch.bilingualOn")}
							</Badge>
						) : null}
						{periodHours != null ? (
							<Badge variant="secondary" className="tabular-nums">
								{t("sys.telegramSearch.result.periodLabel", { hours: periodHours })}
							</Badge>
						) : null}
					</div>
					<div>
						<Text variant="caption" className="mb-1.5 font-medium text-muted-foreground">
							{t("sys.platformsSearch.result.keywordsHeading")}
						</Text>
						{hasEchoedRules ? (
							<KeywordRulesEchoSummary rules={echoedRules} />
						) : (
							<div className="flex flex-wrap gap-1.5">
								{keywords.length === 0 ? (
									<span className="text-sm text-muted-foreground">—</span>
								) : (
									keywords.map((kw) => (
										<Badge key={kw} variant="secondary" className="font-normal">
											{kw}
										</Badge>
									))
								)}
							</div>
						)}
					</div>
					{expandedKeywords.length > 0 ? (
						<Collapsible>
							<CollapsibleTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="group h-auto w-full justify-between gap-2 px-2 py-1"
								>
									<Text variant="caption" className="font-medium text-muted-foreground">
										{t("sys.platformsSearch.result.expandedKeywordsToggle", { count: expandedKeywords.length })}
									</Text>
									<Icon
										icon="mdi:chevron-down"
										className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
										aria-hidden
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="pt-2">
								<div className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/15 p-3">
									{expandedKeywords.map((kw) => (
										<Badge key={kw} variant="outline" className="font-normal opacity-90">
											{kw}
										</Badge>
									))}
								</div>
							</CollapsibleContent>
						</Collapsible>
					) : null}
				</CardContent>
			</Card>

			{stats && (totalPosts != null || pos != null || neg != null || neu != null) ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						label={t("sys.platformsSearch.result.totalPostsAll")}
						value={totalPosts ?? 0}
						helper={t("sys.platformsSearch.result.totalPostsAllHint")}
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.positive")}
						value={`${pos ?? 0}${posPct != null ? ` (${posPct}%)` : ""}`}
						helper={t("sys.platformsSearch.result.inAllPlatforms")}
						tone="success"
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.negative")}
						value={`${neg ?? 0}${negPct != null ? ` (${negPct}%)` : ""}`}
						helper={t("sys.platformsSearch.result.inAllPlatforms")}
						tone="danger"
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.neutral")}
						value={`${neu ?? 0}${neuPct != null ? ` (${neuPct}%)` : ""}`}
						helper={t("sys.platformsSearch.result.inAllPlatforms")}
					/>
				</div>
			) : null}

			<Tabs defaultValue="all" className="w-full min-w-0">
				<TabsList className="h-auto min-h-9 w-full max-w-full flex-wrap justify-start gap-1 p-1">
					<TabsTrigger value="all" className="shrink-0 tabular-nums">
						{t("sys.platformsSearch.tabWithCount", {
							name: t("sys.platformsSearch.tabAll"),
							count: allTabPostCount,
						})}
					</TabsTrigger>
					<TabsTrigger value="telegram" className="shrink-0 gap-1 tabular-nums">
						<Icon icon="mdi:telegram" size={14} aria-hidden />
						{t("sys.platformsSearch.tabWithCount", {
							name: t("sys.commentApi.socialFeed.platform.telegram"),
							count: tgPosts,
						})}
					</TabsTrigger>
					<TabsTrigger value="instagram" className="shrink-0 gap-1 tabular-nums">
						<Icon icon="skill-icons:instagram" size={14} aria-hidden />
						{t("sys.platformsSearch.tabWithCount", {
							name: t("sys.commentApi.socialFeed.platform.instagram"),
							count: igPosts,
						})}
					</TabsTrigger>
					<TabsTrigger value="facebook" className="shrink-0 gap-1 tabular-nums">
						<Icon icon="logos:facebook" size={14} aria-hidden />
						{t("sys.platformsSearch.tabWithCount", {
							name: t("sys.commentApi.socialFeed.platform.facebook"),
							count: fbPosts,
						})}
					</TabsTrigger>
					<TabsTrigger value="web" className="shrink-0 gap-1 tabular-nums">
						<Icon icon={SOCIAL_PLATFORM_ICONS.web} size={14} aria-hidden />
						{t("sys.platformsSearch.tabWithCount", {
							name: t("sys.commentApi.socialFeed.platform.web"),
							count: webPosts,
						})}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="all" className="mt-4 flex flex-col gap-10">
					{syntheticTelegram ? (
						<section className="flex flex-col gap-3">
							<div className="flex items-center gap-2 border-border/60 border-b pb-2">
								<Icon icon="mdi:telegram" size={20} className="text-sky-600" aria-hidden />
								<Title as="h3" className="text-lg font-semibold">
									{t("sys.commentApi.socialFeed.platform.telegram")}
								</Title>
								<Badge variant="secondary">{tgPosts}</Badge>
							</div>
							<TelegramSearchResultView value={syntheticTelegram} hideQuerySummary hideStatsSummary omitRawJson />
						</section>
					) : null}
					{ig?.posts ? (
						<section>
							<div className="mb-3 flex items-center gap-2 border-border/60 border-b pb-2">
								<Icon icon="skill-icons:instagram" size={20} aria-hidden />
								<Title as="h3" className="text-lg font-semibold">
									{t("sys.commentApi.socialFeed.platform.instagram")}
								</Title>
								<Badge variant="secondary">{igPosts}</Badge>
							</div>
							<SocialPlatformPostsSection platform="instagram" title="" postsRoot={ig.posts} t={t} />
						</section>
					) : null}
					{fb?.posts ? (
						<section>
							<div className="mb-3 flex items-center gap-2 border-border/60 border-b pb-2">
								<Icon icon="logos:facebook" size={20} aria-hidden />
								<Title as="h3" className="text-lg font-semibold">
									{t("sys.commentApi.socialFeed.platform.facebook")}
								</Title>
								<Badge variant="secondary">{fbPosts}</Badge>
							</div>
							<SocialPlatformPostsSection platform="facebook" title="" postsRoot={fb.posts} t={t} />
						</section>
					) : null}
					{web?.posts ? (
						<section>
							<div className="mb-3 flex items-center gap-2 border-border/60 border-b pb-2">
								<Icon icon={SOCIAL_PLATFORM_ICONS.web} size={20} className="text-emerald-600" aria-hidden />
								<Title as="h3" className="text-lg font-semibold">
									{t("sys.commentApi.socialFeed.platform.web")}
								</Title>
								<Badge variant="secondary">{webPosts}</Badge>
							</div>
							<SocialPlatformPostsSection platform="web" title="" postsRoot={web.posts} t={t} />
						</section>
					) : null}
				</TabsContent>

				<TabsContent value="telegram" className="mt-4">
					{syntheticTelegram ? (
						<TelegramSearchResultView value={syntheticTelegram} hideQuerySummary hideStatsSummary omitRawJson />
					) : (
						<Text variant="body2" className="text-muted-foreground">
							{t("sys.platformsSearch.noTelegramBlock")}
						</Text>
					)}
				</TabsContent>

				<TabsContent value="instagram" className="mt-4">
					{ig?.posts ? (
						<SocialPlatformPostsSection
							platform="instagram"
							title={t("sys.commentApi.socialFeed.platform.instagram")}
							postsRoot={ig.posts}
							t={t}
						/>
					) : (
						<Text variant="body2" className="text-muted-foreground">
							{t("sys.platformsSearch.noInstagramPosts")}
						</Text>
					)}
				</TabsContent>

				<TabsContent value="facebook" className="mt-4">
					{fb?.posts ? (
						<SocialPlatformPostsSection
							platform="facebook"
							title={t("sys.commentApi.socialFeed.platform.facebook")}
							postsRoot={fb.posts}
							t={t}
						/>
					) : (
						<Text variant="body2" className="text-muted-foreground">
							{t("sys.platformsSearch.noFacebookPosts")}
						</Text>
					)}
				</TabsContent>

				<TabsContent value="web" className="mt-4">
					{web?.posts ? (
						<SocialPlatformPostsSection
							platform="web"
							title={t("sys.commentApi.socialFeed.platform.web")}
							postsRoot={web.posts}
							t={t}
						/>
					) : (
						<Text variant="body2" className="text-muted-foreground">
							{t("sys.platformsSearch.noWebPosts")}
						</Text>
					)}
				</TabsContent>
			</Tabs>

			<TelegramSearchAdviceTimingPanel advice={rootRecord.advice} timing={rootRecord.timing_ms} />

			<RawJsonDetails value={rootRecord} />
		</div>
	);
}
