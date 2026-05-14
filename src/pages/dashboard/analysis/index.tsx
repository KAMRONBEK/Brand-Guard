import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
	clearWorkflowSnapshot,
	readWorkflowSnapshot,
	WORKFLOW_CACHE_VERSION,
	writeWorkflowSnapshot,
	WORKFLOW_SNAPSHOT_IDS,
} from "@/utils/workflow-session-cache";

type ListRequestState = {
	post_url: string;
	sentiment?: SentimentFilter;
	page: number;
	limit: number;
};

type AnalysisFetchFormSnapshot = { postUrl: string; fetchRequest: FetchRequest | null };
type AnalysisListFormSnapshot = {
	listPostUrl: string;
	sentiment: SentimentFilter | "all";
	page: OptionalFiniteNumber;
	limit: OptionalFiniteNumber;
	listRequest: ListRequestState | null;
};
type AnalysisAccountFormSnapshot = {
	username: string;
	maxPosts: OptionalFiniteNumber;
	accountRequest: AccountAnalyzeRequest | null;
};

const workflowQueryOptions = {
	staleTime: Number.POSITIVE_INFINITY,
	gcTime: Number.POSITIVE_INFINITY,
	refetchOnWindowFocus: false,
	refetchOnMount: false,
} as const;

export default function AnalysisPage() {
	const { t } = useTranslation();
	const { endpoint } = useParams();
	const queryClient = useQueryClient();
	const activeMenu = ["fetch", "list", "stats", "account"].includes(endpoint ?? "") ? (endpoint as string) : "stats";

	const fetchFormSnap = readWorkflowSnapshot<AnalysisFetchFormSnapshot>(WORKFLOW_SNAPSHOT_IDS.analysisCommentsFetch);
	const [postUrl, setPostUrl] = useState(() => fetchFormSnap?.inputs.postUrl ?? "");
	const [fetchRequest, setFetchRequest] = useState<FetchRequest | null>(
		() => fetchFormSnap?.inputs.fetchRequest ?? null,
	);
	const fetchQuery = useQuery({
		queryKey: ["comment-api", "comments-fetch", fetchRequest],
		queryFn: () => commentCommentsService.fetchComments(fetchRequest as FetchRequest),
		enabled: fetchRequest != null,
		...workflowQueryOptions,
	});

	const listFormSnap = readWorkflowSnapshot<AnalysisListFormSnapshot>(WORKFLOW_SNAPSHOT_IDS.analysisCommentsList);
	const [listPostUrl, setListPostUrl] = useState(() => listFormSnap?.inputs.listPostUrl ?? "");
	const [sentiment, setSentiment] = useState<SentimentFilter | "all">(() => listFormSnap?.inputs.sentiment ?? "all");
	const [page, setPage] = useState<OptionalFiniteNumber>(() => listFormSnap?.inputs.page ?? 1);
	const [limit, setLimit] = useState<OptionalFiniteNumber>(() => listFormSnap?.inputs.limit ?? 50);
	const [listRequest, setListRequest] = useState<ListRequestState | null>(
		() => listFormSnap?.inputs.listRequest ?? null,
	);
	const commentsQuery = useQuery({
		queryKey: ["comment-api", "comments-list", listRequest],
		queryFn: () => commentCommentsService.listComments(listRequest as ListRequestState),
		enabled: listRequest != null,
		...workflowQueryOptions,
	});

	const accountFormSnap = readWorkflowSnapshot<AnalysisAccountFormSnapshot>(WORKFLOW_SNAPSHOT_IDS.analysisAccount);
	const [username, setUsername] = useState(() => accountFormSnap?.inputs.username ?? "");
	const [maxPosts, setMaxPosts] = useState<OptionalFiniteNumber>(() => accountFormSnap?.inputs.maxPosts ?? 10);
	const [accountRequest, setAccountRequest] = useState<AccountAnalyzeRequest | null>(
		() => accountFormSnap?.inputs.accountRequest ?? null,
	);
	const analyzeQuery = useQuery({
		queryKey: ["comment-api", "account-analyze", accountRequest],
		queryFn: () => commentAnalyzeService.analyzeAccount(accountRequest as AccountAnalyzeRequest),
		enabled: accountRequest != null,
		...workflowQueryOptions,
	});

	const persistFetchForm = (next: AnalysisFetchFormSnapshot) => {
		writeWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisCommentsFetch, {
			version: WORKFLOW_CACHE_VERSION,
			savedAt: Date.now(),
			inputs: next,
			result: null,
			error: null,
		});
	};

	const persistListForm = (next: AnalysisListFormSnapshot) => {
		writeWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisCommentsList, {
			version: WORKFLOW_CACHE_VERSION,
			savedAt: Date.now(),
			inputs: next,
			result: null,
			error: null,
		});
	};

	const persistAccountForm = (next: AnalysisAccountFormSnapshot) => {
		writeWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisAccount, {
			version: WORKFLOW_CACHE_VERSION,
			savedAt: Date.now(),
			inputs: next,
			result: null,
			error: null,
		});
	};

	const clearFetchWorkflow = () => {
		queryClient.removeQueries({ queryKey: ["comment-api", "comments-fetch"] });
		clearWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisCommentsFetch);
		setPostUrl("");
		setFetchRequest(null);
	};

	const clearListWorkflow = () => {
		queryClient.removeQueries({ queryKey: ["comment-api", "comments-list"] });
		clearWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisCommentsList);
		setListPostUrl("");
		setSentiment("all");
		setPage(1);
		setLimit(50);
		setListRequest(null);
	};

	const clearAccountWorkflow = () => {
		queryClient.removeQueries({ queryKey: ["comment-api", "account-analyze"] });
		clearWorkflowSnapshot(WORKFLOW_SNAPSHOT_IDS.analysisAccount);
		setUsername("");
		setMaxPosts(10);
		setAccountRequest(null);
	};

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
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={!postUrl.trim() || fetchQuery.isFetching}
								onClick={() => {
									const trimmed = postUrl.trim();
									const req: FetchRequest = { url: trimmed };
									persistFetchForm({ postUrl: trimmed, fetchRequest: req });
									setFetchRequest(req);
								}}
							>
								{fetchQuery.isFetching ? t("sys.analysis.fetching") : t("sys.analysis.fetchAnalyze")}
							</Button>
							<Button type="button" variant="outline" disabled={fetchQuery.isFetching} onClick={clearFetchWorkflow}>
								{t("sys.workflowCache.clearOutcome")}
							</Button>
						</div>
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
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={!listPostUrl.trim() || commentsQuery.isFetching || page === "" || limit === ""}
								onClick={() => {
									const trimmed = listPostUrl.trim();
									const lr: ListRequestState = {
										post_url: trimmed,
										page: finiteNumberOr(page, 1),
										limit: finiteNumberOr(limit, 50),
										...(sentiment === "all" ? {} : { sentiment }),
									};
									persistListForm({
										listPostUrl: trimmed,
										sentiment,
										page,
										limit,
										listRequest: lr,
									});
									setListRequest(lr);
								}}
							>
								<Icon icon="mdi:refresh" size={16} />
								{commentsQuery.isFetching ? t("sys.analysis.loadingList") : t("sys.analysis.refreshList")}
							</Button>
							<Button type="button" variant="outline" disabled={commentsQuery.isFetching} onClick={clearListWorkflow}>
								{t("sys.workflowCache.clearOutcome")}
							</Button>
						</div>
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
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={!username.trim() || analyzeQuery.isFetching || maxPosts === ""}
								onClick={() => {
									const trimmed = username.trim();
									const ar: AccountAnalyzeRequest = {
										username: trimmed,
										max_posts: finiteNumberOr(maxPosts, 10),
									};
									persistAccountForm({
										username: trimmed,
										maxPosts,
										accountRequest: ar,
									});
									setAccountRequest(ar);
								}}
							>
								{analyzeQuery.isFetching ? t("sys.analysis.analyzing") : t("sys.analysis.runAccountAnalyze")}
							</Button>
							<Button type="button" variant="outline" disabled={analyzeQuery.isFetching} onClick={clearAccountWorkflow}>
								{t("sys.workflowCache.clearOutcome")}
							</Button>
						</div>
						<ApiLongRunningNotice active={analyzeQuery.isFetching} storageKey="analysis-account" />
						<ApiResultView value={analyzeQuery.data ?? (analyzeQuery.isError ? analyzeQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>
			</Tabs>
		</div>
	);
}
