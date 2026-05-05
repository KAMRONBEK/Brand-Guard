import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import {
	commentCampaignService,
	commentCommentsService,
	commentFacebookService,
	commentHealthService,
	commentSearchService,
} from "@/api/services/comment";
import { ApiJsonPreview, ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import Icon from "@/components/icon/icon";
import type {
	CampaignRequest,
	CaptionSearchRequest,
	FacebookAccountAnalyzeRequest,
	FacebookFetchRequest,
	FacebookPostCommentRequest,
	PostCommentsRequest,
	SearchRequest,
} from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";

const CACHE_TIME = 1000 * 60 * 30;

function linesToArray(value: string): string[] {
	return value
		.split("\n")
		.map((item) => item.trim())
		.filter(Boolean);
}

export default function Workbench() {
	const { t } = useTranslation();
	const { endpoint } = useParams();
	const queryClient = useQueryClient();
	const activeMenu = ["search", "caption", "post", "campaign", "fbAccount", "fbFetch", "fbPost"].includes(
		endpoint ?? "",
	)
		? (endpoint as string)
		: "search";
	const [healthEnabled, setHealthEnabled] = useState(true);
	const healthQuery = useQuery({
		queryKey: ["comment-api", "health"],
		queryFn: () => commentHealthService.health(),
		enabled: healthEnabled,
		refetchInterval: 60_000,
	});

	const [searchKeyword, setSearchKeyword] = useState("");
	const [searchMaxPosts, setSearchMaxPosts] = useState(20);
	const [searchPeriodHours, setSearchPeriodHours] = useState(24);
	const [searchType, setSearchType] = useState("all");
	const [searchAnalyze, setSearchAnalyze] = useState(true);
	const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
	const searchQuery = useQuery({
		queryKey: ["comment-api", "search", searchRequest],
		queryFn: () => commentSearchService.search(searchRequest as SearchRequest),
		enabled: searchRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [captionKeyword, setCaptionKeyword] = useState("");
	const [captionMaxPosts, setCaptionMaxPosts] = useState(20);
	const [captionPeriodHours, setCaptionPeriodHours] = useState(24);
	const [captionRequest, setCaptionRequest] = useState<CaptionSearchRequest | null>(null);
	const captionQuery = useQuery({
		queryKey: ["comment-api", "caption-search", captionRequest],
		queryFn: () => commentSearchService.searchCaption(captionRequest as CaptionSearchRequest),
		enabled: captionRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [postUrl, setPostUrl] = useState("");
	const [commentsText, setCommentsText] = useState("");
	const [numBots, setNumBots] = useState(1);
	const [periodSeconds, setPeriodSeconds] = useState(30);
	const postCommentsMutation = useMutation({
		mutationFn: (body: PostCommentsRequest) => commentCommentsService.postComments(body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["comment-api", "comments-post", variables], data);
		},
	});

	const [campKeyword, setCampKeyword] = useState("");
	const [campMaxPosts, setCampMaxPosts] = useState(10);
	const [campNumBots, setCampNumBots] = useState(2);
	const [campPeriodSeconds, setCampPeriodSeconds] = useState(60);
	const [campPeriodHours, setCampPeriodHours] = useState(24);
	const [campSearchType, setCampSearchType] = useState("all");
	const [campTone, setCampTone] = useState("neutral");
	const [campGenerateCount, setCampGenerateCount] = useState(5);
	const [campCommentsText, setCampCommentsText] = useState("");
	const campaignMutation = useMutation({
		mutationFn: (body: CampaignRequest) => commentCampaignService.run(body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["comment-api", "campaign", variables], data);
		},
	});

	const [fbUsername, setFbUsername] = useState("");
	const [fbMaxPosts, setFbMaxPosts] = useState(1);
	const [fbAnalyzeRequest, setFbAnalyzeRequest] = useState<FacebookAccountAnalyzeRequest | null>(null);
	const fbAnalyzeQuery = useQuery({
		queryKey: ["comment-api", "facebook", "account-analyze", fbAnalyzeRequest],
		queryFn: () => commentFacebookService.analyzeAccount(fbAnalyzeRequest as FacebookAccountAnalyzeRequest),
		enabled: fbAnalyzeRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [fbPostUrl, setFbPostUrl] = useState("");
	const [fbFetchRequest, setFbFetchRequest] = useState<FacebookFetchRequest | null>(null);
	const fbFetchQuery = useQuery({
		queryKey: ["comment-api", "facebook", "comments-fetch", fbFetchRequest],
		queryFn: () => commentFacebookService.fetchComments(fbFetchRequest as FacebookFetchRequest),
		enabled: fbFetchRequest != null,
		staleTime: CACHE_TIME,
		gcTime: CACHE_TIME,
	});

	const [fbPostCommentsUrl, setFbPostCommentsUrl] = useState("");
	const [fbCommentsText, setFbCommentsText] = useState("");
	const [fbGenerateTone, setFbGenerateTone] = useState("positive");
	const [fbGenerateCount, setFbGenerateCount] = useState(3);
	const [fbPostPeriodSeconds, setFbPostPeriodSeconds] = useState(30);
	const fbPostMutation = useMutation({
		mutationFn: (body: FacebookPostCommentRequest) => commentFacebookService.postComments(body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["comment-api", "facebook", "comments-post", variables], data);
		},
	});

	const runPostComments = () => {
		postCommentsMutation.mutate({
			url: postUrl.trim(),
			comments: linesToArray(commentsText),
			num_bots: numBots,
			period_seconds: periodSeconds,
		});
	};

	const runCampaign = () => {
		campaignMutation.mutate({
			keyword: campKeyword.trim(),
			max_posts: campMaxPosts,
			num_bots: campNumBots,
			period_seconds: campPeriodSeconds,
			period_hours: campPeriodHours,
			search_type: campSearchType,
			tone: campTone,
			generate_count: campGenerateCount,
			comments: campCommentsText ? linesToArray(campCommentsText) : undefined,
		});
	};

	const runFacebookPost = () => {
		const comments = linesToArray(fbCommentsText);
		fbPostMutation.mutate({
			url: fbPostCommentsUrl.trim(),
			period_seconds: fbPostPeriodSeconds,
			...(comments.length > 0 ? { comments } : { auto_generate: { tone: fbGenerateTone, count: fbGenerateCount } }),
		});
	};

	return (
		<div className="flex flex-col gap-4 w-full">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<Title as="h2" className="text-xl font-semibold">
						{t("sys.workbench.title")}
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						{t("sys.workbench.subtitle")}
					</Text>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{healthQuery.data && (
						<Badge variant="default" className="gap-1">
							<Icon icon="mdi:heart-pulse" size={14} />
							{t("sys.workbench.serviceOnline")}
						</Badge>
					)}
					{healthQuery.isError && (
						<Badge variant="destructive" className="gap-1">
							<Icon icon="mdi:alert" size={14} />
							{t("sys.workbench.healthFailed")}
						</Badge>
					)}
					<Button size="sm" variant="outline" onClick={() => void healthQuery.refetch()}>
						{t("sys.workbench.refreshHealth")}
					</Button>
					<Button size="sm" variant="ghost" onClick={() => setHealthEnabled((value) => !value)}>
						{healthEnabled ? t("sys.workbench.pausePolling") : t("sys.workbench.resumePolling")}
					</Button>
				</div>
			</div>

			<Tabs value={activeMenu} className="w-full">
				<TabsContent value="search">
					<WorkflowShell
						title={t("sys.workbench.search.cardTitle")}
						description={t("sys.workbench.search.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.discovery")}
					>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="kw">{t("sys.workbench.search.keywordLabel")}</Label>
								<Input
									id="kw"
									value={searchKeyword}
									onChange={(event) => setSearchKeyword(event.target.value)}
									placeholder={t("sys.workbench.search.keywordPlaceholder")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="st">{t("sys.workbench.search.searchTypeLabel")}</Label>
								<Select value={searchType} onValueChange={setSearchType}>
									<SelectTrigger id="st">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">all</SelectItem>
										<SelectItem value="account">account</SelectItem>
										<SelectItem value="hashtag">hashtag</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="mp">{t("sys.workbench.search.maxPostsLabel")}</Label>
								<Input
									id="mp"
									type="number"
									value={searchMaxPosts}
									onChange={(event) => setSearchMaxPosts(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ph">{t("sys.workbench.search.periodHoursLabel")}</Label>
								<Input
									id="ph"
									type="number"
									value={searchPeriodHours}
									onChange={(event) => setSearchPeriodHours(Number(event.target.value))}
								/>
							</div>
							<div className="flex items-center gap-2 pt-6">
								<input
									id="an"
									type="checkbox"
									className="size-4"
									checked={searchAnalyze}
									onChange={(event) => setSearchAnalyze(event.target.checked)}
								/>
								<Label htmlFor="an">{t("sys.workbench.search.analyzeLabel")}</Label>
							</div>
						</div>
						<Button
							disabled={!searchKeyword.trim() || searchQuery.isFetching}
							onClick={() =>
								setSearchRequest({
									keyword: searchKeyword.trim(),
									max_posts: searchMaxPosts,
									period_hours: searchPeriodHours,
									search_type: searchType,
									analyze: searchAnalyze,
								})
							}
						>
							{searchQuery.isFetching ? t("sys.workbench.search.running") : t("sys.workbench.search.run")}
						</Button>
						<ApiLongRunningNotice active={searchQuery.isFetching} />
						<ApiResultView value={searchQuery.data ?? (searchQuery.isError ? searchQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="caption">
					<WorkflowShell
						title={t("sys.workbench.caption.cardTitle")}
						description={t("sys.workbench.caption.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.discovery")}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="ck">{t("sys.workbench.caption.keywordLabel")}</Label>
								<Input id="ck" value={captionKeyword} onChange={(event) => setCaptionKeyword(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="cmp">{t("sys.workbench.caption.maxPostsLabel")}</Label>
								<Input
									id="cmp"
									type="number"
									value={captionMaxPosts}
									onChange={(event) => setCaptionMaxPosts(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cph">{t("sys.workbench.caption.periodHoursLabel")}</Label>
								<Input
									id="cph"
									type="number"
									value={captionPeriodHours}
									onChange={(event) => setCaptionPeriodHours(Number(event.target.value))}
								/>
							</div>
						</div>
						<Button
							disabled={!captionKeyword.trim() || captionQuery.isFetching}
							onClick={() =>
								setCaptionRequest({
									keyword: captionKeyword.trim(),
									max_posts: captionMaxPosts,
									period_hours: captionPeriodHours,
								})
							}
						>
							{captionQuery.isFetching ? t("sys.workbench.caption.running") : t("sys.workbench.caption.run")}
						</Button>
						<ApiLongRunningNotice active={captionQuery.isFetching} />
						<ApiResultView value={captionQuery.data ?? (captionQuery.isError ? captionQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="post">
					<WorkflowShell
						title={t("sys.workbench.post.cardTitle")}
						description={t("sys.workbench.post.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.action")}
					>
						<div className="space-y-2">
							<Label htmlFor="pu">{t("sys.workbench.post.postUrlLabel")}</Label>
							<Input
								id="pu"
								value={postUrl}
								onChange={(event) => setPostUrl(event.target.value)}
								placeholder={t("sys.workbench.post.postUrlPlaceholder")}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ct">{t("sys.workbench.post.commentsLabel")}</Label>
							<Textarea id="ct" value={commentsText} onChange={(event) => setCommentsText(event.target.value)} />
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="nb">{t("sys.workbench.post.numBotsLabel")}</Label>
								<Input
									id="nb"
									type="number"
									value={numBots}
									onChange={(event) => setNumBots(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ps">{t("sys.workbench.post.periodSecondsLabel")}</Label>
								<Input
									id="ps"
									type="number"
									value={periodSeconds}
									onChange={(event) => setPeriodSeconds(Number(event.target.value))}
								/>
							</div>
						</div>
						<Button
							disabled={!postUrl.trim() || linesToArray(commentsText).length === 0 || postCommentsMutation.isPending}
							onClick={runPostComments}
						>
							{postCommentsMutation.isPending ? t("sys.workbench.post.posting") : t("sys.workbench.post.run")}
						</Button>
						<ApiLongRunningNotice active={postCommentsMutation.isPending} />
						<ApiJsonPreview
							value={
								postCommentsMutation.data ?? (postCommentsMutation.isError ? postCommentsMutation.error : undefined)
							}
						/>
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="campaign">
					<WorkflowShell
						title={t("sys.workbench.campaign.cardTitle")}
						description={t("sys.workbench.campaign.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.action")}
					>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-2 sm:col-span-2">
								<Label htmlFor="ckw">{t("sys.workbench.campaign.keywordLabel")}</Label>
								<Input id="ckw" value={campKeyword} onChange={(event) => setCampKeyword(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="cst">{t("sys.workbench.campaign.searchTypeLabel")}</Label>
								<Input id="cst" value={campSearchType} onChange={(event) => setCampSearchType(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="ctone">{t("sys.workbench.campaign.toneLabel")}</Label>
								<Input id="ctone" value={campTone} onChange={(event) => setCampTone(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="cmax">{t("sys.workbench.campaign.maxPostsLabel")}</Label>
								<Input
									id="cmax"
									type="number"
									value={campMaxPosts}
									onChange={(event) => setCampMaxPosts(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cnb">{t("sys.workbench.campaign.numBotsLabel")}</Label>
								<Input
									id="cnb"
									type="number"
									value={campNumBots}
									onChange={(event) => setCampNumBots(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cps">{t("sys.workbench.campaign.periodSecondsLabel")}</Label>
								<Input
									id="cps"
									type="number"
									value={campPeriodSeconds}
									onChange={(event) => setCampPeriodSeconds(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cph2">{t("sys.workbench.campaign.periodHoursLabel")}</Label>
								<Input
									id="cph2"
									type="number"
									value={campPeriodHours}
									onChange={(event) => setCampPeriodHours(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cgc">{t("sys.workbench.campaign.generateCountLabel")}</Label>
								<Input
									id="cgc"
									type="number"
									value={campGenerateCount}
									onChange={(event) => setCampGenerateCount(Number(event.target.value))}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ccust">{t("sys.workbench.campaign.optionalCommentsLabel")}</Label>
							<Textarea
								id="ccust"
								className="min-h-[80px]"
								value={campCommentsText}
								onChange={(event) => setCampCommentsText(event.target.value)}
							/>
						</div>
						<Button disabled={!campKeyword.trim() || campaignMutation.isPending} onClick={runCampaign}>
							{campaignMutation.isPending ? t("sys.workbench.campaign.running") : t("sys.workbench.campaign.run")}
						</Button>
						<ApiLongRunningNotice active={campaignMutation.isPending} />
						<ApiResultView
							value={campaignMutation.data ?? (campaignMutation.isError ? campaignMutation.error : undefined)}
						/>
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="fbAccount">
					<WorkflowShell
						title={t("sys.workbench.facebook.accountTitle")}
						description={t("sys.workbench.facebook.heavyHint")}
						platform="Facebook"
						intent={t("sys.workbench.intent.report")}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="fbu">{t("sys.workbench.facebook.usernameLabel")}</Label>
								<Input id="fbu" value={fbUsername} onChange={(event) => setFbUsername(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="fbmp">{t("sys.workbench.facebook.maxPostsLabel")}</Label>
								<Input
									id="fbmp"
									type="number"
									value={fbMaxPosts}
									onChange={(event) => setFbMaxPosts(Number(event.target.value))}
								/>
							</div>
						</div>
						<Button
							disabled={!fbUsername.trim() || fbAnalyzeQuery.isFetching}
							onClick={() => setFbAnalyzeRequest({ username: fbUsername.trim(), max_posts: fbMaxPosts })}
						>
							{fbAnalyzeQuery.isFetching ? t("sys.workbench.facebook.analyzing") : t("sys.workbench.facebook.analyze")}
						</Button>
						<ApiLongRunningNotice active={fbAnalyzeQuery.isFetching} />
						<ApiResultView value={fbAnalyzeQuery.data ?? (fbAnalyzeQuery.isError ? fbAnalyzeQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="fbFetch">
					<WorkflowShell
						title={t("sys.workbench.facebook.fetchTitle")}
						description={t("sys.workbench.facebook.fetchHint")}
						platform="Facebook"
						intent={t("sys.workbench.intent.report")}
					>
						<div className="space-y-2">
							<Label htmlFor="fburl">{t("sys.workbench.facebook.postUrlLabel")}</Label>
							<Input id="fburl" value={fbPostUrl} onChange={(event) => setFbPostUrl(event.target.value)} />
						</div>
						<Button
							disabled={!fbPostUrl.trim() || fbFetchQuery.isFetching}
							onClick={() => setFbFetchRequest({ url: fbPostUrl.trim() })}
						>
							{fbFetchQuery.isFetching ? t("sys.workbench.facebook.fetching") : t("sys.workbench.facebook.fetch")}
						</Button>
						<ApiLongRunningNotice active={fbFetchQuery.isFetching} />
						<ApiResultView value={fbFetchQuery.data ?? (fbFetchQuery.isError ? fbFetchQuery.error : undefined)} />
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="fbPost">
					<WorkflowShell
						title={t("sys.workbench.facebook.postTitle")}
						description={t("sys.workbench.facebook.postHint")}
						platform="Facebook"
						intent={t("sys.workbench.intent.action")}
					>
						<div className="space-y-2">
							<Label htmlFor="fbposturl">{t("sys.workbench.facebook.postUrlLabel")}</Label>
							<Input
								id="fbposturl"
								value={fbPostCommentsUrl}
								onChange={(event) => setFbPostCommentsUrl(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fbcomments">{t("sys.workbench.facebook.commentsLabel")}</Label>
							<Textarea
								id="fbcomments"
								value={fbCommentsText}
								onChange={(event) => setFbCommentsText(event.target.value)}
							/>
						</div>
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="space-y-2">
								<Label htmlFor="fbton">{t("sys.workbench.facebook.toneLabel")}</Label>
								<Input id="fbton" value={fbGenerateTone} onChange={(event) => setFbGenerateTone(event.target.value)} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="fbcnt">{t("sys.workbench.facebook.generateCountLabel")}</Label>
								<Input
									id="fbcnt"
									type="number"
									value={fbGenerateCount}
									onChange={(event) => setFbGenerateCount(Number(event.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="fbps">{t("sys.workbench.facebook.periodSecondsLabel")}</Label>
								<Input
									id="fbps"
									type="number"
									value={fbPostPeriodSeconds}
									onChange={(event) => setFbPostPeriodSeconds(Number(event.target.value))}
								/>
							</div>
						</div>
						<Button disabled={!fbPostCommentsUrl.trim() || fbPostMutation.isPending} onClick={runFacebookPost}>
							{fbPostMutation.isPending ? t("sys.workbench.facebook.posting") : t("sys.workbench.facebook.post")}
						</Button>
						<ApiLongRunningNotice active={fbPostMutation.isPending} />
						<ApiResultView value={fbPostMutation.data ?? (fbPostMutation.isError ? fbPostMutation.error : undefined)} />
					</WorkflowShell>
				</TabsContent>
			</Tabs>
		</div>
	);
}
