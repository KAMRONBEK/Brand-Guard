import Lottie from "lottie-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import searchAnimation from "@/assets/lotties/search.json";
import { Icon } from "@/components/icon";
import type { AnalyzedPost, SentimentCounts } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Text } from "@/ui/typography";
import { cn } from "@/utils";
import { InsightEmptyState } from "./executive-ui";
import {
	CaptionSignalsPanel,
	CollapsibleText,
	CommentThread,
	MetricsChipsRow,
	PostCardShell,
	SentimentMiniStrip,
	SOCIAL_PLATFORM_ICONS,
	type SocialPlatformBadge,
} from "./social-feed";

const LOADING_START_TIMES = new Map<string, number>();

function toRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | undefined {
	return typeof value === "number"
		? value
		: typeof value === "string" && value.trim() !== ""
			? Number(value)
			: undefined;
}

function formatElapsed(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function ApiLongRunningNotice({
	active,
	storageKey,
	title,
	description,
}: {
	active: boolean;
	storageKey?: string;
	title?: string;
	description?: string;
}) {
	const { t } = useTranslation();
	const location = useLocation();
	const [seconds, setSeconds] = useState(0);
	const startedAtMsRef = useRef<number | null>(null);
	const wasActiveRef = useRef(false);
	const noticeKey =
		storageKey ?? `${location.pathname}::${title ?? "default-title"}::${description ?? "default-description"}`;

	useEffect(() => {
		if (!active) {
			if (wasActiveRef.current) {
				LOADING_START_TIMES.delete(noticeKey);
			}
			wasActiveRef.current = false;
			startedAtMsRef.current = null;
			setSeconds(0);
			return undefined;
		}
		wasActiveRef.current = true;
		if (startedAtMsRef.current === null) {
			startedAtMsRef.current = LOADING_START_TIMES.get(noticeKey) ?? Date.now();
			LOADING_START_TIMES.set(noticeKey, startedAtMsRef.current);
		}
		const syncElapsed = () => {
			const started = startedAtMsRef.current;
			if (started === null) return;
			setSeconds(Math.floor((Date.now() - started) / 1000));
		};
		syncElapsed();
		const timer = window.setInterval(syncElapsed, 1000);
		const onResume = () => syncElapsed();
		document.addEventListener("visibilitychange", onResume);
		window.addEventListener("focus", onResume);
		window.addEventListener("pageshow", onResume);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", onResume);
			window.removeEventListener("focus", onResume);
			window.removeEventListener("pageshow", onResume);
		};
	}, [active, noticeKey]);

	if (!active) return null;

	return (
		<Card className="border-primary/20 bg-primary/5">
			<CardContent className="flex items-center gap-5 p-4 sm:p-5">
				<div className="size-40 shrink-0 overflow-hidden rounded-2xl bg-background/70 sm:size-44">
					<Lottie animationData={searchAnimation} loop autoplay className="size-full scale-[1.1]" />
				</div>
				<div className="flex min-w-0 flex-1 items-center justify-between gap-3">
					<div className="min-w-0">
						<div className="font-medium">{title ?? t("sys.commentApi.loadingTitle")}</div>
						<Text variant="caption" className="text-muted-foreground">
							{description ?? t("sys.commentApi.loadingDescription")}
						</Text>
					</div>
					<Badge variant="info" className="font-mono">
						{formatElapsed(seconds)}
					</Badge>
				</div>
			</CardContent>
		</Card>
	);
}

export function ApiJsonPreview({ value, maxHeight = "max-h-[420px]" }: { value: unknown; maxHeight?: string }) {
	const text = useMemo(() => {
		if (value === undefined) return "";
		if (value instanceof Error) return JSON.stringify({ message: value.message }, null, 2);
		return JSON.stringify(value, null, 2);
	}, [value]);

	return <pre className={`text-xs bg-muted rounded-md p-3 ${maxHeight} overflow-auto border`}>{text || "-"}</pre>;
}

export function RawJsonDetails({ value }: { value: unknown }) {
	const { t } = useTranslation();
	if (value === undefined) return null;
	return (
		<details className="rounded-2xl border bg-muted/20 p-4">
			<summary className="cursor-pointer text-sm font-medium">{t("sys.commentApi.technicalDetails")}</summary>
			<div className="mt-3">
				<ApiJsonPreview value={value} />
			</div>
		</details>
	);
}

export function SentimentSummary({ stats }: { stats?: SentimentCounts | Record<string, unknown> | null }) {
	const { t } = useTranslation();
	if (!stats) return null;
	const total = toNumber(stats.total) ?? 0;
	const positive = toNumber(stats.positive) ?? 0;
	const negative = toNumber(stats.negative) ?? 0;
	const neutral = toNumber(stats.neutral) ?? 0;
	const score = total > 0 ? Math.round(((positive - negative) / total) * 100) : 0;
	const positiveShare = total > 0 ? Math.round((positive / total) * 100) : 0;
	const negativeShare = total > 0 ? Math.round((negative / total) * 100) : 0;
	const risk =
		negativeShare >= 25
			? t("sys.commentApi.risk.high")
			: negativeShare >= 10
				? t("sys.commentApi.risk.medium")
				: t("sys.commentApi.risk.healthy");

	if (total === 0 && positive === 0 && negative === 0 && neutral === 0) return null;

	return (
		<div className="grid gap-3 md:grid-cols-4">
			<MetricCard
				label={t("sys.commentApi.metrics.audienceComments")}
				value={total}
				helper={t("sys.commentApi.metrics.totalAnalyzed")}
			/>
			<MetricCard
				label={t("sys.commentApi.metrics.positiveMood")}
				value={`${positiveShare}%`}
				helper={t("sys.commentApi.metrics.positiveCount", { count: positive })}
				tone="success"
			/>
			<MetricCard
				label={t("sys.commentApi.metrics.needsAttention")}
				value={negative}
				helper={t("sys.commentApi.metrics.negativeShare", { share: negativeShare })}
				tone="danger"
			/>
			<MetricCard
				label={t("sys.commentApi.metrics.brandHealth")}
				value={risk}
				helper={t("sys.commentApi.metrics.score", { score })}
				tone={negativeShare < 10 ? "success" : "warning"}
			/>
		</div>
	);
}

export function MetricCard({
	label,
	value,
	helper,
	tone,
	compact,
	className,
}: {
	label: string;
	value: string | number;
	helper: string;
	tone?: "success" | "warning" | "danger";
	/** Tighter sizing for dense layouts (e.g. inside post grids). */
	compact?: boolean;
	className?: string;
}) {
	const toneClass =
		tone === "success"
			? "text-success"
			: tone === "warning"
				? "text-warning"
				: tone === "danger"
					? "text-destructive"
					: "text-foreground";

	return (
		<Card className={cn("min-w-0 bg-background/70", className)}>
			<CardContent className={cn(compact ? "p-3" : "p-4")}>
				<div className="min-w-0 hyphens-auto break-words text-xs font-medium tracking-wide text-muted-foreground uppercase leading-snug">
					{label}
				</div>
				<div className={cn(`mt-2 font-semibold ${toneClass}`, compact ? "text-xl" : "text-2xl")}>{value}</div>
				<div className="mt-1 min-w-0 hyphens-auto break-words text-xs text-muted-foreground leading-snug">{helper}</div>
			</CardContent>
		</Card>
	);
}

function extractStats(value: unknown): SentimentCounts | Record<string, unknown> | null {
	const record = toRecord(value);
	if (!record) return null;
	const stats = toRecord(record.stats) ?? toRecord(record.comment_stats) ?? toRecord(record.sentiment);
	if (stats) return stats;
	const overall = toRecord(record.overall);
	return toRecord(overall?.comment_sentiment);
}

function extractOverallCards(
	value: unknown,
	t: (key: string, options?: Record<string, unknown>) => string,
): { label: string; value: string | number; helper: string }[] {
	const record = toRecord(value);
	const overall = toRecord(record?.overall);
	if (!overall) return [];
	const sentiment = toRecord(overall.comment_sentiment);
	const categories = toRecord(overall.post_categories);

	return [
		{
			label: t("sys.commentApi.overall.postsFound"),
			value: String(overall.total_posts ?? 0),
			helper: t("sys.commentApi.overall.uniquePosts"),
		},
		{
			label: t("sys.commentApi.overall.commentsReviewed"),
			value: String(overall.total_comments ?? sentiment?.total ?? 0),
			helper: t("sys.commentApi.overall.audienceReactions"),
		},
		{
			label: t("sys.commentApi.overall.sentimentMix"),
			value: `${sentiment?.positive ?? 0}+ / ${sentiment?.negative ?? 0}-`,
			helper: t("sys.commentApi.overall.positiveVsNegative"),
		},
		{
			label: t("sys.commentApi.overall.topCategory"),
			value:
				Object.entries(categories ?? {}).sort(([, a], [, b]) => Number(b) - Number(a))[0]?.[0] ??
				t("sys.commentApi.none"),
			helper: t("sys.commentApi.overall.mostCommonPostType"),
		},
	];
}

function rowLooksLikePublishedCommentRow(row: unknown): boolean {
	const r = toRecord(row);
	if (!r) return false;
	if (typeof r.shortcode === "string") return false;
	const hasComment = typeof r.comment === "string";
	if (!hasComment) return false;
	return typeof r.status === "string" || typeof r.account === "string";
}

function resultsLookLikePublisherCommentResults(results: unknown[]): boolean {
	if (results.length === 0) return false;
	return results.every(rowLooksLikePublishedCommentRow);
}

function extractPosts(value: unknown): AnalyzedPost[] {
	const record = toRecord(value);
	if (!record) return [];
	const posts = record.posts;
	if (Array.isArray(posts)) return posts as AnalyzedPost[];
	const messages = record.messages;
	if (Array.isArray(messages)) return messages as AnalyzedPost[];
	const results = record.results;
	if (Array.isArray(results) && !resultsLookLikePublisherCommentResults(results)) {
		return results as AnalyzedPost[];
	}
	return [];
}

export interface PublisherCommentResultRow {
	account?: string;
	comment?: string;
	posted_at?: string;
	status?: string;
	error?: string;
}

export interface PublisherCommentAggregatePayload {
	url?: string;
	mode?: string;
	caption?: string;
	total?: number;
	success?: number;
	failed?: number;
	generated_comments?: string[];
	results: PublisherCommentResultRow[];
}

function extractPublisherCommentAggregate(value: unknown): PublisherCommentAggregatePayload | null {
	const r = toRecord(value);
	if (!r || typeof r.url !== "string" || !Array.isArray(r.results) || r.results.length === 0) {
		return null;
	}
	if (!resultsLookLikePublisherCommentResults(r.results)) return null;

	const generated = Array.isArray(r.generated_comments)
		? r.generated_comments.filter((x): x is string => typeof x === "string")
		: undefined;

	const rows: PublisherCommentResultRow[] = r.results.map((item) => {
		const row = toRecord(item);
		return {
			account: typeof row?.account === "string" ? row.account : undefined,
			comment: typeof row?.comment === "string" ? row.comment : undefined,
			posted_at: typeof row?.posted_at === "string" ? row.posted_at : undefined,
			status: typeof row?.status === "string" ? row.status : undefined,
			error: typeof row?.error === "string" ? row.error : undefined,
		};
	});

	return {
		url: r.url,
		mode: typeof r.mode === "string" ? r.mode : undefined,
		caption: typeof r.caption === "string" ? r.caption : undefined,
		total: toNumber(r.total),
		success: toNumber(r.success),
		failed: toNumber(r.failed),
		generated_comments: generated,
		results: rows,
	};
}

function publisherPlatformFromUrl(url: string | undefined): SocialPlatformBadge {
	if (!url) return "instagram";
	if (/facebook\.com|fb\.watch|fb\.com\b/i.test(url)) return "facebook";
	return "instagram";
}

function PublisherCommentResultView({ payload }: { payload: PublisherCommentAggregatePayload }) {
	const { t } = useTranslation();
	const platform = publisherPlatformFromUrl(payload.url);
	const platformLabel = t(`sys.commentApi.socialFeed.platform.${platform}`);
	const modeLabel =
		payload.mode != null && payload.mode !== ""
			? t(`sys.commentApi.publisher.modeValues.${payload.mode}`, { defaultValue: payload.mode })
			: null;

	return (
		<div className="flex flex-col gap-4">
			<Card className="border-primary/15 bg-primary/5">
				<CardHeader className="pb-2">
					<CardTitle className="flex flex-wrap items-center gap-2 text-base">
						<span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-sm font-normal">
							<Icon icon={SOCIAL_PLATFORM_ICONS[platform]} size={16} />
							{platformLabel}
						</span>
						{payload.mode != null && payload.mode !== "" && modeLabel != null ? (
							<Badge variant="secondary">{modeLabel}</Badge>
						) : null}
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-3">
					{payload.total != null ? (
						<div className="rounded-2xl border bg-background/80 p-4">
							<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{t("sys.commentApi.publisher.total")}
							</div>
							<div className="mt-2 text-2xl font-semibold tabular-nums">{payload.total}</div>
						</div>
					) : null}
					{payload.success != null ? (
						<div className="rounded-2xl border border-success/25 bg-background/80 p-4">
							<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{t("sys.commentApi.publisher.succeeded")}
							</div>
							<div className="mt-2 text-2xl font-semibold tabular-nums text-success">{payload.success}</div>
						</div>
					) : null}
					{payload.failed != null ? (
						<div className="rounded-2xl border border-destructive/25 bg-background/80 p-4">
							<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{t("sys.commentApi.publisher.failed")}
							</div>
							<div className="mt-2 text-2xl font-semibold tabular-nums text-destructive">{payload.failed}</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			{payload.url ? (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold">
							<span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-sm font-normal">
								<Icon icon={SOCIAL_PLATFORM_ICONS[platform]} size={16} />
								{t("sys.commentApi.publisher.postPreview")}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 pt-0">
						<div className="space-y-1.5">
							<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								{t("sys.commentApi.publisher.postUrl")}
							</div>
							<a
								href={payload.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 break-all text-sm text-primary underline-offset-4 hover:underline"
							>
								<Icon icon="mdi:open-in-new" size={16} className="shrink-0" />
								{payload.url}
							</a>
						</div>
						{payload.caption != null && payload.caption !== "" ? (
							<div className="space-y-1.5">
								<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{t("sys.commentApi.publisher.caption")}
								</div>
								<CollapsibleText text={payload.caption} clampClassName="line-clamp-6" />
							</div>
						) : null}
					</CardContent>
				</Card>
			) : null}

			<div className="space-y-2">
				<div className="text-sm font-semibold">{t("sys.commentApi.publisher.publishedComments")}</div>
				<div className="flex flex-col gap-3">
					{payload.results.map((row, index) => {
						const posted = formatDisplayDatetime(row.posted_at);
						const ok = row.status?.toLowerCase() === "ok";
						const accountLabel = row.account?.trim();
						return (
							<Card key={`${row.posted_at ?? ""}-${index}`} className="overflow-hidden">
								<CardHeader className="space-y-2 pb-2">
									<div className="flex flex-wrap items-start justify-between gap-2">
										{accountLabel != null && accountLabel !== "" ? (
											<div className="min-w-0 font-mono text-sm font-medium text-foreground">@{accountLabel}</div>
										) : posted != null ? (
											<div className="text-xs text-muted-foreground">
												{t("sys.commentApi.publisher.postedAt")}: {posted}
											</div>
										) : (
											<span className="min-w-0 flex-1" />
										)}
										{row.status != null ? (
											<Badge variant={ok ? "success" : "secondary"} className="shrink-0">
												{row.status}
											</Badge>
										) : null}
									</div>
									{accountLabel != null && accountLabel !== "" && posted != null ? (
										<div className="text-xs text-muted-foreground">
											{t("sys.commentApi.publisher.postedAt")}: {posted}
										</div>
									) : null}
								</CardHeader>
								<CardContent className="pt-0">
									<p className="whitespace-pre-wrap text-sm leading-relaxed">{row.comment ?? "—"}</p>
									{row.error != null && row.error !== "" ? (
										<p className="mt-2 text-sm text-destructive">{row.error}</p>
									) : null}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function formatDisplayDatetime(raw: string | undefined): string | undefined {
	if (!raw?.trim()) return undefined;
	const ms = Date.parse(raw);
	if (!Number.isNaN(ms)) return new Date(ms).toLocaleString();
	return raw.trim();
}

function inferAggregatePlatform(_root: Record<string, unknown> | null, posts: AnalyzedPost[]): SocialPlatformBadge {
	let hasFacebook = false;
	let hasInstagram = false;
	let hasWeb = false;
	for (const p of posts) {
		const url = typeof p.url === "string" ? p.url : "";
		if (/facebook\.com|fb\.watch|fb\.com\b/i.test(url)) hasFacebook = true;
		else if (/instagram\.com/i.test(url)) hasInstagram = true;
		else if (/^https?:\/\//i.test(url)) hasWeb = true;
	}
	if (hasFacebook) return "facebook";
	if (hasInstagram) return "instagram";
	if (hasWeb) return "web";
	return "instagram";
}

function inferPostPlatform(post: AnalyzedPost, fallback: SocialPlatformBadge): SocialPlatformBadge {
	const url = typeof post.url === "string" ? post.url : "";
	if (/facebook\.com|fb\.watch|fb\.com\b/i.test(url)) return "facebook";
	if (/instagram\.com/i.test(url)) return "instagram";
	if (/^https?:\/\//i.test(url)) return "web";
	return fallback;
}

export function ApiResultView({
	value,
	empty,
	suppressReadyPlaceholder,
}: {
	value: unknown;
	empty?: string;
	/** When true and there is no payload yet, omit the dashed “ready to run” card (e.g. in-flight Comment API streams). */
	suppressReadyPlaceholder?: boolean;
}) {
	const { t } = useTranslation();
	if (value === undefined) {
		if (suppressReadyPlaceholder) return null;
		return (
			<InsightEmptyState
				title={t("sys.commentApi.readyTitle")}
				description={empty ?? t("sys.commentApi.readyDescription")}
			/>
		);
	}

	const root = toRecord(value);
	const publisherCommentAggregate = extractPublisherCommentAggregate(value);
	const posts = extractPosts(value);
	const stats = extractStats(value);
	const comments = root?.comments;
	const overallCards = extractOverallCards(value, t);
	const rootUsername = typeof root?.username === "string" ? root.username : undefined;
	const streamTotal = typeof root?.total === "number" ? root.total : undefined;
	const defaultPlatform = inferAggregatePlatform(root, posts);

	return (
		<div className="flex flex-col gap-4">
			{publisherCommentAggregate ? <PublisherCommentResultView payload={publisherCommentAggregate} /> : null}
			{overallCards.length === 0 && streamTotal !== undefined && !publisherCommentAggregate && (
				<Card className="border-primary/15 bg-primary/5">
					<CardContent className="p-4">
						<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							{t("sys.commentApi.totalInResponse")}
						</div>
						<div className="mt-1 text-2xl font-semibold">{streamTotal}</div>
					</CardContent>
				</Card>
			)}
			{overallCards.length > 0 && (
				<Card className="bg-gradient-to-br from-primary/10 via-background to-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">{t("sys.commentApi.executiveSummary")}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{overallCards.map((item) => (
							<div key={item.label} className="rounded-2xl border bg-background/70 p-4">
								<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</div>
								<div className="mt-2 text-2xl font-semibold">{item.value}</div>
								<div className="mt-1 text-xs text-muted-foreground">{item.helper}</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}
			<SentimentSummary stats={stats} />
			{stats && (
				<Card className="bg-background/70">
					<CardContent className="p-4">
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">{t("sys.commentApi.positiveConversationShare")}</span>
							<span className="text-muted-foreground">
								{Math.round(((toNumber(stats.positive) ?? 0) / Math.max(toNumber(stats.total) ?? 0, 1)) * 100)}%
							</span>
						</div>
						<Progress
							value={Math.round(((toNumber(stats.positive) ?? 0) / Math.max(toNumber(stats.total) ?? 0, 1)) * 100)}
						/>
					</CardContent>
				</Card>
			)}
			<CommentThread comments={comments} />
			{posts.length > 0 && (
				<div className="flex flex-col gap-4">
					{posts.map((post, index) => {
						const platform = inferPostPlatform(post, defaultPlatform);
						const headline =
							post.username ?? post.author ?? rootUsername ?? t("sys.commentApi.socialFeed.genericPostHeadline");
						const datetimeLine = formatDisplayDatetime(post.timestamp);
						return (
							<PostCardShell
								key={post.url ?? `post-${index}`}
								platform={platform}
								headline={headline}
								datetimeLine={datetimeLine}
								url={post.url}
							>
								<MetricsChipsRow
									shortcode={post.shortcode}
									likeCount={post.like_count}
									commentCount={post.comment_count}
								/>
								{post.caption ? <CollapsibleText text={post.caption} clampClassName="line-clamp-4" /> : null}
								{post.caption_analysis ? <CaptionSignalsPanel analysis={post.caption_analysis} /> : null}
								<SentimentMiniStrip
									stats={post.comment_stats ?? post.stats}
									labels={{
										legend: t("sys.commentApi.socialFeed.mini.sectionAria"),
										total: t("sys.commentApi.socialFeed.mini.commentsTotal"),
										positive: t("sys.commentApi.sentiment.positive"),
										negative: t("sys.commentApi.sentiment.negative"),
										neutral: t("sys.commentApi.sentiment.neutral"),
									}}
								/>
								<CommentThread comments={post.comments} />
							</PostCardShell>
						);
					})}
				</div>
			)}
			{posts.length === 0 &&
				comments === undefined &&
				stats === null &&
				overallCards.length === 0 &&
				!publisherCommentAggregate && (
					<InsightEmptyState
						title={t("sys.commentApi.resultReceived")}
						description={t("sys.commentApi.noExecutiveSummary")}
					/>
				)}
			<RawJsonDetails value={value} />
		</div>
	);
}
