import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { commentAnalyzeService, commentCommentsService } from "@/api/services/comment";
import { ApiJsonPreview, ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import Icon from "@/components/icon/icon";
import type { AccountAnalyzeRequest, FetchRequest, SentimentFilter } from "@/types/comment-api";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import { buildCommentExportFilename, downloadBlob } from "@/utils/download-blob";

const CACHE_TIME = 1000 * 60 * 30;

export default function AnalysisPage() {
	const { t } = useTranslation();
	const { endpoint } = useParams();
	const activeMenu = ["fetch", "list", "stats", "account"].includes(endpoint ?? "") ? (endpoint as string) : "fetch";
	const [postUrl, setPostUrl] = useState("");
	const [fetchRequest, setFetchRequest] = useState<FetchRequest | null>(null);
	const fetchQuery = useQuery({
		queryKey: ["comment-api", "comments-fetch", fetchRequest],
		queryFn: () => commentCommentsService.fetchComments(fetchRequest as FetchRequest),
		enabled: fetchRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [listPostUrl, setListPostUrl] = useState("");
	const [sentiment, setSentiment] = useState<SentimentFilter | "all">("all");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(50);
	const [listRequest, setListRequest] = useState<{
		post_url: string;
		sentiment?: SentimentFilter;
		page: number;
		limit: number;
	} | null>(null);
	const commentsQuery = useQuery({
		queryKey: ["comment-api", "comments-list", listRequest],
		queryFn: () =>
			commentCommentsService.listComments(
				listRequest as { post_url: string; sentiment?: SentimentFilter; page: number; limit: number },
			),
		enabled: listRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [statsPostUrl, setStatsPostUrl] = useState("");
	const [statsRequest, setStatsRequest] = useState<string | null>(null);
	const statsQuery = useQuery({
		queryKey: ["comment-api", "comments-stats", statsRequest],
		queryFn: () => commentCommentsService.stats(statsRequest as string),
		enabled: Boolean(statsRequest),
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const exportMutation = useMutation({
		mutationFn: async (format: "json" | "csv") => {
			const blob = await commentCommentsService.exportComments({
				post_url: statsPostUrl.trim(),
				format,
				...(sentiment === "all" ? {} : { sentiment }),
			});
			downloadBlob(blob, buildCommentExportFilename(statsPostUrl, format));
		},
	});

	const [username, setUsername] = useState("");
	const [maxPosts, setMaxPosts] = useState(10);
	const [accountRequest, setAccountRequest] = useState<AccountAnalyzeRequest | null>(null);
	const analyzeQuery = useQuery({
		queryKey: ["comment-api", "account-analyze", accountRequest],
		queryFn: () => commentAnalyzeService.analyzeAccount(accountRequest as AccountAnalyzeRequest),
		enabled: accountRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	return (
		<div className="flex flex-col gap-4 w-full">
			<div>
				<Title as="h2" className="text-xl font-semibold">
					{t("sys.analysis.title")}
				</Title>
				<Text variant="body2" className="text-muted-foreground">
					{t("sys.analysis.subtitle")}
				</Text>
			</div>

			<Tabs value={activeMenu} className="w-full">
				<TabsContent value="fetch">
					<WorkflowShell
						title={t("sys.analysis.fetchCardTitle")}
						description={t("sys.analysis.fetchCardHint")}
						platform="Instagram"
						intent={t("sys.analysis.intent.report")}
					>
						<div className="space-y-2">
							<Label htmlFor="fetch-url">{t("sys.analysis.instagramPostUrlLabel")}</Label>
							<Input
								id="fetch-url"
								value={postUrl}
								onChange={(event) => setPostUrl(event.target.value)}
								placeholder={t("sys.analysis.postUrlPlaceholder")}
							/>
						</div>
						<Button
							disabled={!postUrl.trim() || fetchQuery.isFetching}
							onClick={() => setFetchRequest({ url: postUrl.trim() })}
						>
							{fetchQuery.isFetching ? t("sys.analysis.fetching") : t("sys.analysis.fetchAnalyze")}
						</Button>
						<ApiLongRunningNotice active={fetchQuery.isFetching} />
						<ApiResultView value={fetchQuery.data ?? (fetchQuery.isError ? fetchQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="list">
					<WorkflowShell
						title={t("sys.analysis.commentsCardTitle")}
						description={t("sys.analysis.commentsCardHint")}
						platform="Instagram"
						intent={t("sys.analysis.intent.review")}
					>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="list-url">{t("sys.analysis.instagramPostUrlLabel")}</Label>
								<Input
									id="list-url"
									value={listPostUrl}
									onChange={(event) => setListPostUrl(event.target.value)}
									placeholder={t("sys.analysis.postUrlPlaceholder")}
								/>
							</div>
							<div className="space-y-2">
								<Label>{t("sys.analysis.sentimentLabel")}</Label>
								<Select value={sentiment} onValueChange={(value) => setSentiment(value as SentimentFilter | "all")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">{t("sys.analysis.sentimentAll")}</SelectItem>
										<SelectItem value="positive">{t("sys.analysis.sentimentPositive")}</SelectItem>
										<SelectItem value="negative">{t("sys.analysis.sentimentNegative")}</SelectItem>
										<SelectItem value="neutral">{t("sys.analysis.sentimentNeutral")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="pg">{t("sys.analysis.pageLabel")}</Label>
								<Input
									id="pg"
									type="number"
									min={1}
									value={page}
									onChange={(event) => setPage(Number(event.target.value) || 1)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lm">{t("sys.analysis.limitLabel")}</Label>
								<Input
									id="lm"
									type="number"
									min={1}
									value={limit}
									onChange={(event) => setLimit(Number(event.target.value) || 50)}
								/>
							</div>
						</div>
						<Button
							disabled={!listPostUrl.trim() || commentsQuery.isFetching}
							onClick={() =>
								setListRequest({
									post_url: listPostUrl.trim(),
									page,
									limit,
									...(sentiment === "all" ? {} : { sentiment }),
								})
							}
						>
							<Icon icon="mdi:refresh" size={16} />
							{commentsQuery.isFetching ? t("sys.analysis.loadingList") : t("sys.analysis.refreshList")}
						</Button>
						<ApiLongRunningNotice active={commentsQuery.isFetching} />
						<ApiResultView value={commentsQuery.data ?? (commentsQuery.isError ? commentsQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="stats">
					<WorkflowShell
						title={t("sys.analysis.statsCardTitle")}
						description={t("sys.analysis.statsCardHint")}
						platform="Instagram"
						intent={t("sys.analysis.intent.report")}
					>
						<div className="space-y-2">
							<Label htmlFor="stats-url">{t("sys.analysis.instagramPostUrlLabel")}</Label>
							<Input
								id="stats-url"
								value={statsPostUrl}
								onChange={(event) => setStatsPostUrl(event.target.value)}
								placeholder={t("sys.analysis.postUrlPlaceholder")}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={!statsPostUrl.trim() || statsQuery.isFetching}
								onClick={() => setStatsRequest(statsPostUrl.trim())}
							>
								{statsQuery.isFetching ? t("sys.analysis.loadingStats") : t("sys.analysis.loadStats")}
							</Button>
							<Button
								variant="secondary"
								disabled={!statsPostUrl.trim() || exportMutation.isPending}
								onClick={() => exportMutation.mutate("json")}
							>
								{t("sys.analysis.exportJson")}
							</Button>
							<Button
								disabled={!statsPostUrl.trim() || exportMutation.isPending}
								onClick={() => exportMutation.mutate("csv")}
							>
								{t("sys.analysis.exportCsv")}
							</Button>
						</div>
						<ApiLongRunningNotice active={statsQuery.isFetching || exportMutation.isPending} />
						<ApiResultView value={statsQuery.data ?? (statsQuery.isError ? statsQuery.error : undefined)} />
						{exportMutation.isError && <ApiJsonPreview value={exportMutation.error} />}
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="account">
					<WorkflowShell
						title={t("sys.analysis.accountCardTitle")}
						description={t("sys.analysis.accountCardHint")}
						platform="Instagram"
						intent={t("sys.analysis.intent.report")}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="un">{t("sys.analysis.usernameLabel")}</Label>
								<Input
									id="un"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder={t("sys.analysis.usernamePlaceholder")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="mx">{t("sys.analysis.maxPostsLabel")}</Label>
								<Input
									id="mx"
									type="number"
									value={maxPosts}
									onChange={(event) => setMaxPosts(Number(event.target.value))}
								/>
							</div>
						</div>
						<Button
							disabled={!username.trim() || analyzeQuery.isFetching}
							onClick={() => setAccountRequest({ username: username.trim(), max_posts: maxPosts })}
						>
							{analyzeQuery.isFetching ? t("sys.analysis.analyzing") : t("sys.analysis.runAccountAnalyze")}
						</Button>
						<ApiLongRunningNotice active={analyzeQuery.isFetching} />
						<ApiResultView value={analyzeQuery.data ?? (analyzeQuery.isError ? analyzeQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>
			</Tabs>
		</div>
	);
}
