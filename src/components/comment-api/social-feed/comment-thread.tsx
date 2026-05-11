import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalyzedComment, CommentsByType } from "@/types/comment-api";
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

function initialsFromUsername(username: string | undefined): string {
	const raw = (username ?? "?").replace(/^@/, "").trim();
	if (!raw) return "?";
	const parts = raw.split(/[\s._-]+/).filter(Boolean);
	if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 2);
	return raw.slice(0, 2).toUpperCase();
}

function sentimentBadgeVariant(s: string | undefined): "error" | "success" | "outline" {
	const low = typeof s === "string" ? s.trim().toLowerCase() : "";
	if (low === "negative") return "error";
	if (low === "positive") return "success";
	return "outline";
}

export function SocialCommentRow({ comment }: { comment: AnalyzedComment }) {
	const { t } = useTranslation();
	const name = comment.username ?? t("sys.commentApi.socialFeed.unknownUser");
	const initials = initialsFromUsername(comment.username);
	const rawText =
		typeof comment.text === "string" ? comment.text : comment.text !== undefined ? String(comment.text) : "";
	const body = rawText.trim() !== "" ? rawText : "";

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
					<Badge variant={sentimentBadgeVariant(comment.sentiment)} className="capitalize">
						{comment.sentiment ?? t("sys.commentApi.socialFeed.unlabeled")}
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
				<SocialCommentRow key={`${comment.username ?? "x"}-${comment.timestamp ?? index}-${index}`} comment={comment} />
			))}
		</ul>
	);
}

export function CommentThread({ comments }: { comments?: CommentsByType | unknown }) {
	const { t } = useTranslation();
	const groups = normalizeComments(comments);

	const mergedAll = useMemo(
		() => [...(groups.negative ?? []), ...(groups.neutral ?? []), ...(groups.positive ?? [])],
		[groups],
	);

	const totals = useMemo(() => {
		const neg = groups.negative?.length ?? 0;
		const neu = groups.neutral?.length ?? 0;
		const pos = groups.positive?.length ?? 0;
		return { neg, neu, pos, all: neg + neu + pos };
	}, [groups]);

	const hasAny = totals.all > 0;

	const [tab, setTab] = useState("all");

	if (!hasAny) return null;

	const section = (items: AnalyzedComment[]) =>
		items.length === 0 ? (
			<Text variant="caption" className="py-8 text-center text-muted-foreground">
				{t("sys.commentApi.noCommentsInGroup")}
			</Text>
		) : (
			<ul className="max-h-[min(28rem,60vh)] list-none overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-2 pr-1">
				{items.map((comment, index) => (
					<SocialCommentRow
						key={`${comment.username ?? ""}-${comment.timestamp ?? index}-${tab}-${index}`}
						comment={comment}
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
					{section(groups.negative ?? [])}
				</TabsContent>
				<TabsContent value="neutral" className="mt-3">
					{section(groups.neutral ?? [])}
				</TabsContent>
				<TabsContent value="positive" className="mt-3">
					{section(groups.positive ?? [])}
				</TabsContent>
			</Tabs>
		</div>
	);
}
