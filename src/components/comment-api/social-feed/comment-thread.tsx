import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyzedComment, CommentsByType, SentimentFilter } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text } from "@/ui/typography";
import { CollapsibleText } from "./collapsible-text";

function toRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeComments(comments: unknown): CommentsByType {
	const record = toRecord(comments);
	if (!record) return {};
	return {
		positive: Array.isArray(record.positive) ? (record.positive as AnalyzedComment[]) : [],
		negative: Array.isArray(record.negative) ? (record.negative as AnalyzedComment[]) : [],
		neutral: Array.isArray(record.neutral) ? (record.neutral as AnalyzedComment[]) : [],
	};
}

function commentAuthorLabel(comment: AnalyzedComment): string | undefined {
	const u = comment.username?.trim();
	if (u) return u;
	const a = comment.author?.trim();
	if (a) return a;
	const extra = comment as Record<string, unknown>;
	for (const key of ["display_name", "name", "user", "full_name", "from"] as const) {
		const v = extra[key];
		if (typeof v === "string" && v.trim() !== "") return v.trim();
	}
	return undefined;
}

function initialsFromLabel(label: string | undefined): string {
	const raw = (label ?? "?").replace(/^@/, "").trim();
	if (!raw) return "?";
	const parts = raw.split(/[\s._-]+/).filter(Boolean);
	if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 2);
	return raw.slice(0, 2).toUpperCase();
}

type SentimentBucket = SentimentFilter;

function rawSentimentFromComment(comment: AnalyzedComment): string | undefined {
	const s = comment.sentiment;
	if (typeof s === "string" && s.trim() !== "") return s.trim();
	if (typeof comment.tone === "string" && comment.tone.trim() !== "") return comment.tone.trim();
	if (typeof comment.mood === "string" && comment.mood.trim() !== "") return comment.mood.trim();
	const extra = comment as Record<string, unknown>;
	for (const key of ["label", "sentiment_label", "sentiment_type"] as const) {
		const v = extra[key];
		if (typeof v === "string" && v.trim() !== "") return v.trim();
	}
	return undefined;
}

function resolveSentiment(comment: AnalyzedComment, bucketFallback?: SentimentBucket): string | undefined {
	return rawSentimentFromComment(comment) ?? bucketFallback;
}

function canonicalSentimentKey(resolved: string | undefined): SentimentBucket | undefined {
	if (!resolved?.trim()) return undefined;
	const low = resolved.trim().toLowerCase();
	if (low === "negative") return "negative";
	if (low === "positive") return "positive";
	if (low === "neutral") return "neutral";
	return undefined;
}

function sentimentBadgeVariant(resolved: string | undefined): "error" | "success" | "outline" {
	const key = canonicalSentimentKey(resolved);
	if (key === "negative") return "error";
	if (key === "positive") return "success";
	return "outline";
}

function sentimentDisplayLabel(resolved: string | undefined, t: (key: string) => string): string {
	if (!resolved?.trim()) return t("sys.commentApi.socialFeed.unlabeled");
	const key = canonicalSentimentKey(resolved);
	if (key === "positive") return t("sys.commentApi.sentiment.positive");
	if (key === "negative") return t("sys.commentApi.sentiment.negative");
	if (key === "neutral") return t("sys.commentApi.sentiment.neutral");
	return resolved.trim();
}

function tagCommentsWithBucket(bucket: SentimentBucket, items: AnalyzedComment[]): AnalyzedComment[] {
	return items.map((c) => (rawSentimentFromComment(c) ? c : { ...c, sentiment: bucket }));
}

export function SocialCommentRow({
	comment,
	sentimentBucketFallback,
}: {
	comment: AnalyzedComment;
	/** When the API omits per-comment sentiment, use the group's bucket (positive/negative/neutral). */
	sentimentBucketFallback?: SentimentBucket;
}) {
	const { t } = useTranslation();
	const handle = commentAuthorLabel(comment);
	const name = handle ?? t("sys.commentApi.socialFeed.unknownUser");
	const initials = initialsFromLabel(handle);
	const rawText =
		typeof comment.text === "string" ? comment.text : comment.text !== undefined ? String(comment.text) : "";
	const body = rawText.trim() !== "" ? rawText : "";

	const resolvedSentiment = resolveSentiment(comment, sentimentBucketFallback);
	const badgeText = sentimentDisplayLabel(resolvedSentiment, t);

	return (
		<li className="flex gap-3 border-l-2 border-primary/25 py-3 pl-4">
			<div
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
				aria-hidden
			>
				{initials}
			</div>
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className="flex flex-wrap items-center gap-2 gap-y-1">
					<span className="font-medium text-foreground">{name}</span>
					<Badge variant={sentimentBadgeVariant(resolvedSentiment)} className="capitalize">
						{badgeText}
					</Badge>
					{comment.timestamp ? <time className="text-xs text-muted-foreground">{comment.timestamp}</time> : null}
				</div>
				{body ? <CollapsibleText text={body} clampClassName="line-clamp-3" /> : null}
			</div>
		</li>
	);
}

/** Flat timeline for Telegram (or any homogeneous list). */
export function FlatCommentTimeline({ comments }: { comments: AnalyzedComment[] }) {
	const { t } = useTranslation();
	if (comments.length === 0) return null;

	return (
		<ul
			className="max-h-[min(28rem,60vh)] list-none divide-y divide-border/50 overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-3 pr-1"
			aria-label={t("sys.commentApi.socialFeed.commentsListLabel")}
		>
			{comments.map((comment, index) => (
				<SocialCommentRow
					key={`${commentAuthorLabel(comment) ?? "x"}-${comment.timestamp ?? index}-${index}`}
					comment={comment}
				/>
			))}
		</ul>
	);
}

export function CommentThread({ comments }: { comments?: CommentsByType | unknown }) {
	const { t } = useTranslation();
	const groups = normalizeComments(comments);

	const mergedAll = useMemo(() => {
		const neg = tagCommentsWithBucket("negative", groups.negative ?? []);
		const neu = tagCommentsWithBucket("neutral", groups.neutral ?? []);
		const pos = tagCommentsWithBucket("positive", groups.positive ?? []);
		return [...neg, ...neu, ...pos];
	}, [groups]);

	const totals = useMemo(() => {
		const neg = groups.negative?.length ?? 0;
		const neu = groups.neutral?.length ?? 0;
		const pos = groups.positive?.length ?? 0;
		return { neg, neu, pos, all: neg + neu + pos };
	}, [groups]);

	const hasAny = totals.all > 0;

	const [tab, setTab] = useState("all");

	if (!hasAny) return null;

	const section = (items: AnalyzedComment[], bucketFallback?: SentimentBucket) =>
		items.length === 0 ? (
			<Text variant="caption" className="py-8 text-center text-muted-foreground">
				{t("sys.commentApi.noCommentsInGroup")}
			</Text>
		) : (
			<ul className="max-h-[min(28rem,60vh)] list-none overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-2 pr-1">
				{items.map((comment, index) => (
					<SocialCommentRow
						key={`${commentAuthorLabel(comment) ?? ""}-${comment.timestamp ?? index}-${tab}-${index}`}
						comment={comment}
						sentimentBucketFallback={bucketFallback}
					/>
				))}
			</ul>
		);

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium text-muted-foreground">{t("sys.commentApi.socialFeed.commentsHeading")}</p>
			<Tabs value={tab} onValueChange={setTab} className="w-full">
				<TabsList className="flex h-auto w-full max-w-full flex-wrap justify-start gap-1 p-1">
					<TabsTrigger value="all" className="flex-wrap">
						<span>{t("sys.commentApi.socialFeed.commentsTabAll")}</span>
						<Badge variant="secondary" shape="square" className="ml-1 shrink-0 tabular-nums">
							{totals.all}
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="negative">
						<span>{t("sys.commentApi.sentiment.negative")}</span>
						<Badge variant="error" shape="square" className="ml-1 shrink-0 tabular-nums">
							{totals.neg}
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="neutral">
						<span>{t("sys.commentApi.sentiment.neutral")}</span>
						<Badge variant="outline" shape="square" className="ml-1 shrink-0 tabular-nums">
							{totals.neu}
						</Badge>
					</TabsTrigger>
					<TabsTrigger value="positive">
						<span>{t("sys.commentApi.sentiment.positive")}</span>
						<Badge variant="success" shape="square" className="ml-1 shrink-0 tabular-nums">
							{totals.pos}
						</Badge>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="all" className="mt-3">
					{section(mergedAll)}
				</TabsContent>
				<TabsContent value="negative" className="mt-3">
					{section(groups.negative ?? [], "negative")}
				</TabsContent>
				<TabsContent value="neutral" className="mt-3">
					{section(groups.neutral ?? [], "neutral")}
				</TabsContent>
				<TabsContent value="positive" className="mt-3">
					{section(groups.positive ?? [], "positive")}
				</TabsContent>
			</Tabs>
		</div>
	);
}
