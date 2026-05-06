import Lottie from "lottie-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import searchAnimation from "@/assets/lotties/search.json";
import type { AnalyzedComment, AnalyzedPost, CommentsByType, SentimentCounts } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Text } from "@/ui/typography";
import { InsightEmptyState } from "./executive-ui";

const SENTIMENTS = ["positive", "negative", "neutral"] as const;
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

function MetricCard({
	label,
	value,
	helper,
	tone,
}: {
	label: string;
	value: string | number;
	helper: string;
	tone?: "success" | "warning" | "danger";
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
		<Card className="bg-background/70">
			<CardContent className="p-4">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
				<div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
				<div className="mt-1 text-xs text-muted-foreground">{helper}</div>
			</CardContent>
		</Card>
	);
}

function normalizeComments(comments: unknown): CommentsByType {
	const record = toRecord(comments);
	if (!record) return {};
	return SENTIMENTS.reduce<CommentsByType>((acc, sentiment) => {
		const value = record[sentiment];
		acc[sentiment] = Array.isArray(value) ? (value as AnalyzedComment[]) : [];
		return acc;
	}, {});
}

export function GroupedComments({ comments }: { comments?: CommentsByType | unknown }) {
	const { t } = useTranslation();
	const groups = normalizeComments(comments);
	const hasComments = SENTIMENTS.some((sentiment) => (groups[sentiment]?.length ?? 0) > 0);

	if (!hasComments) return null;

	return (
		<div className="grid gap-3 lg:grid-cols-3">
			{SENTIMENTS.map((sentiment) => {
				const rows = groups[sentiment] ?? [];
				return (
					<Card key={sentiment} className="bg-background/70">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center justify-between text-sm capitalize">
								{t(`sys.commentApi.sentiment.${sentiment}`)}
								<Badge variant={sentiment === "negative" ? "error" : sentiment === "positive" ? "success" : "outline"}>
									{rows.length}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{rows.length === 0 ? (
								<Text variant="caption" className="text-muted-foreground">
									{t("sys.commentApi.noCommentsInGroup")}
								</Text>
							) : (
								<div className="max-h-96 space-y-2 overflow-y-auto pr-1">
									{rows.map((comment, index) => (
										<div
											key={`${comment.username ?? "user"}-${comment.timestamp ?? index}`}
											className="rounded-xl border bg-card/60 p-3"
										>
											<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
												<span className="font-medium text-foreground">{comment.username ?? "unknown"}</span>
												<span>{comment.timestamp ?? ""}</span>
											</div>
											<p className="mt-1 text-sm whitespace-pre-wrap">{comment.text ?? JSON.stringify(comment)}</p>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
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

function extractPosts(value: unknown): AnalyzedPost[] {
	const record = toRecord(value);
	if (!record) return [];
	const posts = record.posts;
	return Array.isArray(posts) ? (posts as AnalyzedPost[]) : [];
}

export function ApiResultView({ value, empty }: { value: unknown; empty?: string }) {
	const { t } = useTranslation();
	if (value === undefined) {
		return (
			<InsightEmptyState
				title={t("sys.commentApi.readyTitle")}
				description={empty ?? t("sys.commentApi.readyDescription")}
			/>
		);
	}

	const root = toRecord(value);
	const posts = extractPosts(value);
	const stats = extractStats(value);
	const comments = root?.comments;
	const overallCards = extractOverallCards(value, t);
	const rootUsername = typeof root?.username === "string" ? root.username : undefined;

	return (
		<div className="flex flex-col gap-4">
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
			<GroupedComments comments={comments} />
			{posts.length > 0 && (
				<div className="flex flex-col gap-3">
					{posts.map((post, index) => (
						<Card key={post.url ?? `post-${index}`} className="overflow-hidden bg-background/70">
							<CardHeader>
								<CardTitle className="text-base">
									{post.username ?? post.author ?? rootUsername ?? "Post"} {post.timestamp ? `- ${post.timestamp}` : ""}
								</CardTitle>
								{post.url && (
									<a className="text-sm text-primary break-all" href={post.url} target="_blank" rel="noreferrer">
										{post.url}
									</a>
								)}
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								{post.caption && <p className="text-sm whitespace-pre-wrap">{post.caption}</p>}
								{post.caption_analysis && (
									<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
										{Object.entries(post.caption_analysis).map(([key, item]) => (
											<div key={key} className="rounded-xl bg-muted/60 p-3 text-sm">
												<div className="text-xs uppercase text-muted-foreground">{key}</div>
												<div className="mt-1 font-medium">{String(item ?? "-")}</div>
											</div>
										))}
									</div>
								)}
								<SentimentSummary stats={post.comment_stats ?? post.stats} />
								<GroupedComments comments={post.comments} />
							</CardContent>
						</Card>
					))}
				</div>
			)}
			{posts.length === 0 && comments === undefined && stats === null && overallCards.length === 0 && (
				<InsightEmptyState
					title={t("sys.commentApi.resultReceived")}
					description={t("sys.commentApi.noExecutiveSummary")}
				/>
			)}
			<RawJsonDetails value={value} />
		</div>
	);
}
