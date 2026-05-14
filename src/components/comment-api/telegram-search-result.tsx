import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import type {
	AnalyzedComment,
	TelegramSearchAdviceExample,
	TelegramSearchAdviceIssue,
	TelegramSearchCommentHit,
	TelegramSearchCommentStats,
	TelegramSearchStreamPost,
} from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { isTelegramGroupedPostsObject } from "@/utils/mergeSearchStreamChunk";
import { AdviceRichBody } from "./advice-rich-body";
import { MetricCard, RawJsonDetails } from "./api-result";
import { CollapsibleText } from "./social-feed/collapsible-text";
import { FlatCommentTimeline } from "./social-feed/comment-thread";
import { MetricsChipsRow } from "./social-feed/metrics-chips-row";
import { PostCardShell } from "./social-feed/post-card-shell";

const POST_GROUP_ORDER = ["negative", "neutral", "positive"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isTelegramSearchPayload(value: unknown): boolean {
	if (!isRecord(value)) return false;
	if (!Array.isArray(value.keywords) || !Array.isArray(value.channels)) return false;
	if (isRecord(value.posts) && !Array.isArray(value.posts)) return true;
	const stats = value.stats;
	if (isRecord(stats) && typeof stats.total_posts === "number") return true;
	if (isRecord(value.advice)) return true;
	return false;
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

/** API may return `failed_channels` as plain strings or `{ channel, reason }` objects. */
type TelegramFailedChannelRow = { channel: string; reason?: string };

function normalizeFailedChannels(raw: unknown): TelegramFailedChannelRow[] {
	if (!Array.isArray(raw)) return [];
	const out: TelegramFailedChannelRow[] = [];
	for (const item of raw) {
		if (typeof item === "string") {
			out.push({ channel: item });
		} else if (isRecord(item) && typeof item.channel === "string") {
			out.push({
				channel: item.channel,
				reason: typeof item.reason === "string" ? item.reason : undefined,
			});
		}
	}
	return out;
}

function readCommentHits(value: unknown): TelegramSearchCommentHit[] {
	if (!Array.isArray(value)) return [];
	const hits: TelegramSearchCommentHit[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		const hit: TelegramSearchCommentHit = {
			username: typeof item.username === "string" ? item.username : undefined,
			text: typeof item.text === "string" ? item.text : undefined,
			date: typeof item.date === "string" ? item.date : undefined,
			sentiment: typeof item.sentiment === "string" ? item.sentiment : undefined,
		};
		if (hit.username != null || hit.text != null) hits.push(hit);
	}
	return hits;
}

function readCommentStats(value: unknown): TelegramSearchCommentStats | undefined {
	if (!isRecord(value)) return undefined;
	const stats: TelegramSearchCommentStats = {
		total: toNumber(value.total),
		positive: toNumber(value.positive),
		negative: toNumber(value.negative),
		neutral: toNumber(value.neutral),
		positive_pct: toNumber(value.positive_pct),
		negative_pct: toNumber(value.negative_pct),
		neutral_pct: toNumber(value.neutral_pct),
	};
	if (
		stats.total != null ||
		stats.positive != null ||
		stats.negative != null ||
		stats.neutral != null ||
		stats.positive_pct != null ||
		stats.negative_pct != null ||
		stats.neutral_pct != null
	) {
		return stats;
	}
	return undefined;
}

function sentimentCountsFromHits(hits: TelegramSearchCommentHit[]): TelegramSearchCommentStats {
	let positive = 0;
	let negative = 0;
	let neutral = 0;
	const n = hits.length;
	for (const h of hits) {
		const s = typeof h.sentiment === "string" ? h.sentiment.trim().toLowerCase() : "";
		if (s === "positive") positive++;
		else if (s === "negative") negative++;
		else neutral++;
	}
	return {
		total: n,
		positive,
		negative,
		neutral,
		positive_pct: n > 0 ? Math.round((positive / n) * 1000) / 10 : undefined,
		negative_pct: n > 0 ? Math.round((negative / n) * 1000) / 10 : undefined,
		neutral_pct: n > 0 ? Math.round((neutral / n) * 1000) / 10 : undefined,
	};
}

function mergeCommentSentimentStats(
	api: TelegramSearchCommentStats | undefined,
	derived: TelegramSearchCommentStats | undefined,
): TelegramSearchCommentStats | undefined {
	if (!api && !derived) return undefined;
	const a = api ?? {};
	const d = derived ?? {};
	return {
		total: a.total ?? d.total,
		positive: a.positive ?? d.positive,
		negative: a.negative ?? d.negative,
		neutral: a.neutral ?? d.neutral,
		positive_pct: a.positive_pct ?? d.positive_pct,
		negative_pct: a.negative_pct ?? d.negative_pct,
		neutral_pct: a.neutral_pct ?? d.neutral_pct,
	};
}

function mergedStatsHasRenderableCounts(m: TelegramSearchCommentStats): boolean {
	return (m.total != null && m.total > 0) || (m.positive ?? 0) > 0 || (m.negative ?? 0) > 0 || (m.neutral ?? 0) > 0;
}

function stableAdviceExampleKey(issueTopic: string | undefined, ex: TelegramSearchAdviceExample): string {
	const payload = [issueTopic ?? "", ex.country ?? "", ex.solution ?? "", ex.adaptation ?? ""].join("\n");
	let h = 0;
	for (let i = 0; i < payload.length; i++) h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
	return `${issueTopic ?? "issue"}-${h}`;
}

export function TelegramSearchAdviceTimingPanel({
	advice: adviceRaw,
	timing: timingRaw,
}: {
	advice: unknown;
	timing: unknown;
}) {
	const { t } = useTranslation();
	const advice = isRecord(adviceRaw) ? adviceRaw : undefined;
	const summary = typeof advice?.summary === "string" ? advice.summary : undefined;
	const issues = Array.isArray(advice?.issues) ? (advice.issues as TelegramSearchAdviceIssue[]) : [];
	const timing = isRecord(timingRaw) ? timingRaw : undefined;

	const hasAdviceBody = Boolean(summary?.trim()) || issues.length > 0;
	const hasTiming = timing !== undefined && Object.keys(timing).length > 0;

	return (
		<>
			{hasAdviceBody ? (
				<section className="mt-10 space-y-6 sm:mt-12" aria-labelledby="telegram-ai-advice-heading">
					<h2 id="telegram-ai-advice-heading" className="sr-only">
						{t("sys.telegramSearch.result.aiGeneratedBadge")}
					</h2>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
						<div className="flex flex-wrap items-center gap-2">
							<Badge
								variant="outline"
								className="gap-1.5 border-violet-500/30 bg-violet-500/10 py-1 pr-2.5 pl-2 dark:border-violet-400/35"
							>
								<Icon
									icon="mdi:sparkles"
									size={14}
									className="shrink-0 text-violet-600 dark:text-violet-400"
									aria-hidden
								/>
								{t("sys.telegramSearch.result.aiGeneratedBadge")}
							</Badge>
						</div>
						<p className="max-w-2xl text-xs leading-relaxed text-muted-foreground md:max-w-md md:text-end">
							{t("sys.telegramSearch.result.aiAdviceZoneDisclaimer")}
						</p>
					</div>

					<div className="flex flex-col gap-6">
						{summary?.trim() ? (
							<div className="rounded-2xl bg-muted/20 px-5 py-5 dark:bg-muted/10">
								<h3 className="text-base leading-tight font-semibold tracking-tight">
									{t("sys.telegramSearch.result.adviceSummaryTitle")}
								</h3>
								<div className="mt-4">
									<AdviceRichBody text={summary} className="max-w-none text-[0.9625rem] leading-[1.72]" />
								</div>
							</div>
						) : null}

						{issues.length > 0 ? (
							<div>
								<Title as="h3" className="mb-4 text-lg font-semibold">
									{t("sys.telegramSearch.result.issuesTitle")}
								</Title>
								<div className="flex flex-col divide-y divide-border/50">
									{issues.map((issue, issueIndex) => (
										<article
											key={`${issue.topic ?? "issue"}-${issueIndex}`}
											className="space-y-5 py-7 first:pt-0 last:pb-0"
										>
											<div className="space-y-1.5">
												<h4 className="text-[1.05rem] leading-snug font-semibold tracking-tight">
													{issue.topic ?? t("sys.telegramSearch.result.issueFallbackTitle")}
												</h4>
												{issue.evidence_count != null && (
													<Text variant="caption" className="text-muted-foreground">
														{t("sys.telegramSearch.result.evidenceCount", { count: issue.evidence_count })}
													</Text>
												)}
											</div>

											{issue.description || issue.suggested_action ? (
												<div
													className={cn(
														"grid gap-4",
														issue.description && issue.suggested_action && "md:grid-cols-2 md:items-start md:gap-5",
													)}
												>
													{issue.description ? (
														<div className="rounded-xl bg-muted/25 px-4 py-4 dark:bg-muted/10">
															<p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
																{t("sys.telegramSearch.result.issueDescription")}
															</p>
															<AdviceRichBody text={issue.description} className="max-w-none" />
														</div>
													) : null}

													{issue.suggested_action ? (
														<div className="rounded-xl border-primary/45 border-l-[3px] bg-primary/[0.05] px-4 py-4 dark:bg-primary/[0.08]">
															<p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
																{t("sys.telegramSearch.result.suggestedAction")}
															</p>
															<AdviceRichBody text={issue.suggested_action} className="max-w-none text-foreground/95" />
														</div>
													) : null}
												</div>
											) : null}

											{Array.isArray(issue.worldwide_examples) && issue.worldwide_examples.length > 0 ? (
												<Collapsible defaultOpen={issueIndex === 0}>
													<CollapsibleTrigger asChild>
														<button
															type="button"
															className="group flex w-full items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-left text-sm font-semibold tracking-tight text-foreground transition-colors hover:bg-muted/45 dark:bg-muted/20 dark:hover:bg-muted/30"
														>
															{t("sys.telegramSearch.result.examplesToggle", {
																count: issue.worldwide_examples.length,
															})}
															<Icon
																icon="mdi:chevron-down"
																className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
																aria-hidden
															/>
														</button>
													</CollapsibleTrigger>
													<CollapsibleContent className="mt-4 data-[state=closed]:animate-none">
														<div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-5">
															{(issue.worldwide_examples as TelegramSearchAdviceExample[]).map((ex) => (
																<div
																	key={stableAdviceExampleKey(issue.topic, ex)}
																	className="space-y-4 rounded-xl border border-border/50 bg-muted/15 px-3 py-3 dark:bg-muted/10"
																>
																	{ex.country ? (
																		<div className="space-y-2">
																			<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
																				{t("sys.telegramSearch.result.exampleCountry")}
																			</p>
																			<p className="font-medium leading-snug tracking-tight">{ex.country}</p>
																		</div>
																	) : null}
																	{ex.solution ? (
																		<div className="space-y-2 border-border/35 border-l-2 pl-3">
																			<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
																				{t("sys.telegramSearch.result.exampleSolution")}
																			</p>
																			<AdviceRichBody text={ex.solution} className="max-w-none" />
																		</div>
																	) : null}
																	{ex.adaptation ? (
																		<div className="space-y-2 border-border/35 border-l-2 pl-3">
																			<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
																				{t("sys.telegramSearch.result.exampleAdaptation")}
																			</p>
																			<AdviceRichBody text={ex.adaptation} className="max-w-none" />
																		</div>
																	) : null}
																</div>
															))}
														</div>
													</CollapsibleContent>
												</Collapsible>
											) : null}
										</article>
									))}
								</div>
							</div>
						) : null}
					</div>
				</section>
			) : null}

			{hasTiming ? (
				<details className={cn("rounded-xl border border-border/60 bg-muted/15 p-4 text-sm", hasAdviceBody && "mt-6")}>
					<summary className="cursor-pointer font-medium">{t("sys.telegramSearch.result.timingTitle")}</summary>
					<dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{Object.entries(timing).map(([key, ms]) => (
							<div key={key} className="flex flex-col rounded-lg border border-border/50 bg-background/60 px-3 py-2">
								<dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{key}</dt>
								<dd className="font-mono text-sm">{typeof ms === "number" ? `${ms} ms` : String(ms)}</dd>
							</div>
						))}
					</dl>
				</details>
			) : null}
		</>
	);
}

function postsForSentiment(
	postsRoot: unknown,
	sentiment: (typeof POST_GROUP_ORDER)[number],
): TelegramSearchStreamPost[] {
	if (!isTelegramGroupedPostsObject(postsRoot)) return [];
	const grouped = postsRoot as Record<string, unknown>;
	const bucket = grouped[sentiment];
	return Array.isArray(bucket) ? (bucket as TelegramSearchStreamPost[]) : [];
}

function hitsToAnalyzedComments(hits: TelegramSearchCommentHit[]): AnalyzedComment[] {
	return hits.map((h) => ({
		username: h.username ? `@${h.username.replace(/^@/, "")}` : undefined,
		text: h.text,
		timestamp: formatWhen(h.date),
		sentiment: h.sentiment,
	}));
}

function TelegramPostCommentsSection({ post }: { post: TelegramSearchStreamPost }) {
	const { t } = useTranslation();
	const raw = post as Record<string, unknown>;
	const hits = readCommentHits(raw.comments);
	const commentStats = readCommentStats(raw.comments_stats);
	const hasCommentsRequested =
		typeof raw.has_comments === "boolean"
			? raw.has_comments
			: typeof post.has_comments === "boolean"
				? post.has_comments
				: false;
	const emptyAfterRequest = hasCommentsRequested === true && hits.length === 0;

	const derivedFromHits = hits.length > 0 ? sentimentCountsFromHits(hits) : undefined;
	const mergedStats = mergeCommentSentimentStats(commentStats, derivedFromHits);
	const showMetricRow = mergedStats != null && mergedStatsHasRenderableCounts(mergedStats);

	if (!showMetricRow && hits.length === 0 && !emptyAfterRequest) return null;

	const pctSuffix = (n: number | undefined) =>
		n != null && Number.isFinite(n) ? ` (${n}% ${t("sys.telegramSearch.result.commentStatShareSuffix")})` : "";

	return (
		<div className="flex flex-col gap-3 border-border/60 border-t pt-3">
			{showMetricRow && mergedStats ? (
				<div>
					<Text variant="caption" className="mb-2 block font-medium text-muted-foreground">
						{t("sys.telegramSearch.result.commentsStatsTitle")}
					</Text>
					<div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]">
						{mergedStats.total != null && mergedStats.total > 0 && (
							<MetricCard
								compact
								label={t("sys.telegramSearch.result.commentsTotalLabel")}
								value={mergedStats.total}
								helper={t("sys.telegramSearch.result.onThisPost")}
							/>
						)}
						{(mergedStats.positive ?? 0) > 0 && (
							<MetricCard
								compact
								label={t("sys.commentApi.sentiment.positive")}
								value={mergedStats.positive ?? 0}
								helper={`${t("sys.telegramSearch.result.inThisPeriod")}${pctSuffix(mergedStats.positive_pct)}`}
								tone="success"
							/>
						)}
						{(mergedStats.negative ?? 0) > 0 && (
							<MetricCard
								compact
								label={t("sys.commentApi.sentiment.negative")}
								value={mergedStats.negative ?? 0}
								helper={`${t("sys.telegramSearch.result.inThisPeriod")}${pctSuffix(mergedStats.negative_pct)}`}
								tone="danger"
							/>
						)}
						{(mergedStats.neutral ?? 0) > 0 && (
							<MetricCard
								compact
								label={t("sys.commentApi.sentiment.neutral")}
								value={mergedStats.neutral ?? 0}
								helper={`${t("sys.telegramSearch.result.inThisPeriod")}${pctSuffix(mergedStats.neutral_pct)}`}
							/>
						)}
					</div>
				</div>
			) : null}

			{hits.length > 0 ? (
				<Collapsible defaultOpen={false}>
					<CollapsibleTrigger asChild>
						<Button type="button" variant="outline" size="sm" className="group w-full justify-between gap-2">
							{t("sys.telegramSearch.result.commentsToggle", { count: hits.length })}
							<Icon
								icon="mdi:chevron-down"
								className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
								aria-hidden
							/>
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="pt-2">
						<FlatCommentTimeline comments={hitsToAnalyzedComments(hits)} />
					</CollapsibleContent>
				</Collapsible>
			) : emptyAfterRequest ? (
				<p className="text-sm text-muted-foreground">{t("sys.telegramSearch.result.commentsNoneInPayload")}</p>
			) : null}
		</div>
	);
}

export function TelegramSearchResultView({
	value,
	hideQuerySummary,
	omitRawJson,
	hideStatsSummary,
}: {
	value: unknown;
	/** When true, omit the query recap card (e.g. embedded in unified multi-platform results). */
	hideQuerySummary?: boolean;
	/** When true, omit technical JSON details (parent view may show one combined payload). */
	omitRawJson?: boolean;
	/** When true, omit sentiment count grid (aggregate dashboard already showed these). */
	hideStatsSummary?: boolean;
}) {
	const { t } = useTranslation();
	if (!isRecord(value)) return null;

	const keywords = Array.isArray(value.keywords) ? (value.keywords as string[]) : [];
	const channels = Array.isArray(value.channels) ? (value.channels as string[]) : [];
	const periodHours = toNumber(value.period_hours);
	const stats = isRecord(value.stats) ? value.stats : undefined;
	const totalPosts = toNumber(stats?.total_posts);
	const pos = toNumber(stats?.positive);
	const neg = toNumber(stats?.negative);
	const neu = toNumber(stats?.neutral);
	const failed = normalizeFailedChannels(value.failed_channels);

	const hasPostGroups = POST_GROUP_ORDER.some((s) => postsForSentiment(value.posts, s).length > 0);

	return (
		<div className="flex flex-col gap-4">
			{!hideQuerySummary ? (
				<Card className="border-border/80 bg-gradient-to-br from-primary/5 via-background to-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{t("sys.telegramSearch.result.queryTitle")}</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<div>
							<Text variant="caption" className="mb-1.5 font-medium text-muted-foreground">
								{t("sys.telegramSearch.result.keywordsHeading")}
							</Text>
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
						</div>
						<div>
							<Text variant="caption" className="mb-1.5 font-medium text-muted-foreground">
								{t("sys.telegramSearch.result.channelsHeading")}
							</Text>
							<div className="flex flex-wrap gap-1.5">
								{channels.length === 0 ? (
									<span className="text-sm text-muted-foreground">—</span>
								) : (
									channels.map((ch) => (
										<Badge key={ch} variant="outline" className="font-mono text-xs font-normal">
											{ch}
										</Badge>
									))
								)}
							</div>
						</div>
						{periodHours != null && (
							<p className="text-sm text-muted-foreground">
								{t("sys.telegramSearch.result.periodLabel", { hours: periodHours })}
							</p>
						)}
					</CardContent>
				</Card>
			) : null}

			{!hideStatsSummary && stats && (totalPosts != null || pos != null || neg != null || neu != null) && (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						label={t("sys.telegramSearch.result.totalPosts")}
						value={totalPosts ?? 0}
						helper={t("sys.telegramSearch.result.totalPostsHint")}
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.positive")}
						value={pos ?? 0}
						helper={t("sys.telegramSearch.result.inThisPeriod")}
						tone="success"
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.negative")}
						value={neg ?? 0}
						helper={t("sys.telegramSearch.result.inThisPeriod")}
						tone="danger"
					/>
					<MetricCard
						label={t("sys.commentApi.sentiment.neutral")}
						value={neu ?? 0}
						helper={t("sys.telegramSearch.result.inThisPeriod")}
					/>
				</div>
			)}

			{failed.length > 0 && (
				<Card className="border-destructive/40 bg-destructive/5">
					<CardHeader className="pb-2">
						<CardTitle className="text-base text-destructive">
							{t("sys.telegramSearch.result.failedChannels")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm">
							{failed.map((entry, fi) => (
								<li key={`${entry.channel}-${fi}-${entry.reason ?? ""}`}>
									<div className="font-mono">{entry.channel}</div>
									{entry.reason !== undefined ? (
										<Text variant="caption" className="block pl-4 text-muted-foreground whitespace-pre-wrap">
											{entry.reason}
										</Text>
									) : null}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{hasPostGroups && (
				<div className="flex flex-col gap-4">
					<Title as="h3" className="text-lg font-semibold">
						{t("sys.telegramSearch.result.postsTitle")}
					</Title>
					{POST_GROUP_ORDER.map((sentiment) => {
						const posts = postsForSentiment(value.posts, sentiment);
						if (posts.length === 0) return null;
						const sectionBorder =
							sentiment === "negative"
								? "border-destructive/35"
								: sentiment === "positive"
									? "border-success/35"
									: "border-border/80";
						return (
							<Card key={sentiment} className={cn("overflow-hidden bg-background/70", sectionBorder)}>
								<CardHeader className="border-b bg-muted/30 pb-3">
									<CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base capitalize">
										{t(`sys.telegramSearch.result.sentimentSection.${sentiment}`)}
										<Badge
											variant={sentiment === "negative" ? "error" : sentiment === "positive" ? "success" : "outline"}
										>
											{posts.length}
										</Badge>
									</CardTitle>
								</CardHeader>
								<CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3">
									{posts.map((post, index) => (
										<PostCardShell
											key={post.url ?? `${sentiment}-${index}`}
											className="min-w-0"
											dense
											platform="telegram"
											headline={post.channel_title ?? "—"}
											datetimeLine={formatWhen(post.date)}
											url={post.url}
											headerBadges={
												<>
													{post.channel_username ? (
														<Badge variant="outline" className="font-mono text-xs">
															@{post.channel_username.replace(/^@/, "")}
														</Badge>
													) : null}
													{post.sentiment ? (
														<Badge
															variant={
																post.sentiment === "negative"
																	? "error"
																	: post.sentiment === "positive"
																		? "success"
																		: "outline"
															}
															className="capitalize"
														>
															{post.sentiment}
														</Badge>
													) : null}
												</>
											}
										>
											{post.views != null ? <MetricsChipsRow views={post.views} /> : null}
											{post.text?.trim() ? (
												<CollapsibleText text={post.text} clampClassName="line-clamp-3" />
											) : (
												<p className="text-sm text-muted-foreground">—</p>
											)}
											<TelegramPostCommentsSection post={post} />
										</PostCardShell>
									))}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			<TelegramSearchAdviceTimingPanel advice={value.advice} timing={value.timing_ms} />

			{omitRawJson ? null : <RawJsonDetails value={value} />}
		</div>
	);
}
