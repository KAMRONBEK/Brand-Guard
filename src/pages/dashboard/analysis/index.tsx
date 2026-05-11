import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { commentAnalyzeService, commentCommentsService } from "@/api/services/comment";
import { ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { SentimentReportSection } from "@/components/comment-api/sentiment-report-section";
import Icon from "@/components/icon/icon";
import type { AccountAnalyzeRequest, FetchRequest, SentimentFilter } from "@/types/comment-api";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import {
	finiteNumberOr,
	type OptionalFiniteNumber,
	optionalFiniteNumberDisplay,
	setOptionalFiniteNumberFromInput,
} from "@/utils/optional-number-input";

const CACHE_TIME = 1000 * 60 * 30;

export default function AnalysisPage() {
	const { t } = useTranslation();
	const { endpoint } = useParams();
	const activeMenu = ["fetch", "list", "stats", "account"].includes(endpoint ?? "") ? (endpoint as string) : "stats";
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
	const [page, setPage] = useState<OptionalFiniteNumber>(1);
	const [limit, setLimit] = useState<OptionalFiniteNumber>(50);
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

	const [username, setUsername] = useState("");
	const [maxPosts, setMaxPosts] = useState<OptionalFiniteNumber>(10);
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
						<ApiLongRunningNotice active={fetchQuery.isFetching} storageKey="analysis-fetch" />
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
									value={optionalFiniteNumberDisplay(page)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setPage)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="lm">{t("sys.analysis.limitLabel")}</Label>
								<Input
									id="lm"
									type="number"
									min={1}
									value={optionalFiniteNumberDisplay(limit)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setLimit)}
								/>
							</div>
						</div>
						<Button
							disabled={!listPostUrl.trim() || commentsQuery.isFetching || page === "" || limit === ""}
							onClick={() =>
								setListRequest({
									post_url: listPostUrl.trim(),
									page: finiteNumberOr(page, 1),
									limit: finiteNumberOr(limit, 50),
									...(sentiment === "all" ? {} : { sentiment }),
								})
							}
						>
							<Icon icon="mdi:refresh" size={16} />
							{commentsQuery.isFetching ? t("sys.analysis.loadingList") : t("sys.analysis.refreshList")}
						</Button>
						<ApiLongRunningNotice active={commentsQuery.isFetching} storageKey="analysis-list" />
						<ApiResultView value={commentsQuery.data ?? (commentsQuery.isError ? commentsQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="stats">
					<SentimentReportSection />
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
									value={optionalFiniteNumberDisplay(maxPosts)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setMaxPosts)}
								/>
							</div>
						</div>
						<Button
							disabled={!username.trim() || analyzeQuery.isFetching || maxPosts === ""}
							onClick={() =>
								setAccountRequest({
									username: username.trim(),
									max_posts: finiteNumberOr(maxPosts, 10),
								})
							}
						>
							{analyzeQuery.isFetching ? t("sys.analysis.analyzing") : t("sys.analysis.runAccountAnalyze")}
						</Button>
						<ApiLongRunningNotice active={analyzeQuery.isFetching} storageKey="analysis-account" />
						<ApiResultView value={analyzeQuery.data ?? (analyzeQuery.isError ? analyzeQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>
			</Tabs>
		</div>
	);
}
