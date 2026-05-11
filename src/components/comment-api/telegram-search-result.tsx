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
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{mergedStats.total != null && mergedStats.total > 0 && (
							<MetricCard
								label={t("sys.telegramSearch.result.commentsTotalLabel")}
								value={mergedStats.total}
								helper={t("sys.telegramSearch.result.onThisPost")}
							/>
						)}
						{(mergedStats.positive ?? 0) > 0 && (
							<MetricCard
								label={t("sys.commentApi.sentiment.positive")}
								value={mergedStats.positive ?? 0}
								helper={`${t("sys.telegramSearch.result.inThisPeriod")}${pctSuffix(mergedStats.positive_pct)}`}
								tone="success"
							/>
						)}
						{(mergedStats.negative ?? 0) > 0 && (
							<MetricCard
								label={t("sys.commentApi.sentiment.negative")}
								value={mergedStats.negative ?? 0}
								helper={`${t("sys.telegramSearch.result.inThisPeriod")}${pctSuffix(mergedStats.negative_pct)}`}
								tone="danger"
							/>
						)}
						{(mergedStats.neutral ?? 0) > 0 && (
							<MetricCard
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

export function TelegramSearchResultView({ value }: { value: unknown }) {
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
	const advice = isRecord(value.advice) ? value.advice : undefined;
	const summary = typeof advice?.summary === "string" ? advice.summary : undefined;
	const issues = Array.isArray(advice?.issues) ? (advice.issues as TelegramSearchAdviceIssue[]) : [];
	const failed = normalizeFailedChannels(value.failed_channels);
	const timing = isRecord(value.timing_ms) ? value.timing_ms : undefined;

	const hasPostGroups = POST_GROUP_ORDER.some((s) => postsForSentiment(value.posts, s).length > 0);

	return (
		<div className="flex flex-col gap-4">
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

			{stats && (totalPosts != null || pos != null || neg != null || neu != null) && (
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
								<CardContent className="flex flex-col gap-4 pt-4">
									{posts.map((post, index) => (
										<PostCardShell
											key={post.url ?? `${sentiment}-${index}`}
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
												<CollapsibleText text={post.text} />
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

			{summary && (
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{t("sys.telegramSearch.result.adviceSummaryTitle")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
					</CardContent>
				</Card>
			)}

			{issues.length > 0 && (
				<div className="flex flex-col gap-3">
					<Title as="h3" className="text-lg font-semibold">
						{t("sys.telegramSearch.result.issuesTitle")}
					</Title>
					{issues.map((issue, issueIndex) => (
						<Card key={`${issue.topic ?? "issue"}-${issueIndex}`} className="border-border/80 bg-background/70">
							<CardHeader className="pb-2">
								<CardTitle className="text-base leading-snug">
									{issue.topic ?? t("sys.telegramSearch.result.issueFallbackTitle")}
								</CardTitle>
								{issue.evidence_count != null && (
									<Text variant="caption" className="text-muted-foreground">
										{t("sys.telegramSearch.result.evidenceCount", { count: issue.evidence_count })}
									</Text>
								)}
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								{issue.description && (
									<div>
										<p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
											{t("sys.telegramSearch.result.issueDescription")}
										</p>
										<p className="text-sm leading-relaxed whitespace-pre-wrap">{issue.description}</p>
									</div>
								)}
								{issue.suggested_action && (
									<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
										<p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
											{t("sys.telegramSearch.result.suggestedAction")}
										</p>
										<p className="text-sm leading-relaxed whitespace-pre-wrap">{issue.suggested_action}</p>
									</div>
								)}
								{Array.isArray(issue.worldwide_examples) && issue.worldwide_examples.length > 0 && (
									<Collapsible defaultOpen={issueIndex === 0}>
										<CollapsibleTrigger asChild>
											<Button type="button" variant="outline" size="sm" className="group w-full justify-between gap-2">
												{t("sys.telegramSearch.result.examplesToggle", { count: issue.worldwide_examples.length })}
												<Icon
													icon="mdi:chevron-down"
													className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
													aria-hidden
												/>
											</Button>
										</CollapsibleTrigger>
										<CollapsibleContent className="space-y-3 pt-3">
											{(issue.worldwide_examples as TelegramSearchAdviceExample[]).map((ex) => (
												<Card
													key={stableAdviceExampleKey(issue.topic, ex)}
													className="border-muted/80 bg-muted/20 shadow-none"
												>
													<CardContent className="space-y-2 p-4 text-sm">
														{ex.country && (
															<div>
																<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
																	{t("sys.telegramSearch.result.exampleCountry")}
																</span>
																<p className="mt-0.5 font-medium">{ex.country}</p>
															</div>
														)}
														{ex.solution && (
															<div>
																<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
																	{t("sys.telegramSearch.result.exampleSolution")}
																</span>
																<p className="mt-0.5 leading-relaxed whitespace-pre-wrap">{ex.solution}</p>
															</div>
														)}
														{ex.adaptation && (
															<div>
																<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
																	{t("sys.telegramSearch.result.exampleAdaptation")}
																</span>
																<p className="mt-0.5 leading-relaxed whitespace-pre-wrap">{ex.adaptation}</p>
															</div>
														)}
													</CardContent>
												</Card>
											))}
										</CollapsibleContent>
									</Collapsible>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{timing && Object.keys(timing).length > 0 && (
				<details className="rounded-xl border border-border/60 bg-muted/15 p-4 text-sm">
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
			)}

			<RawJsonDetails value={value} />
		</div>
	);
}
