import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import {
	commentAccountsService,
	commentCampaignService,
	commentCommentsService,
	commentFacebookService,
	commentHealthService,
	commentSearchService,
} from "@/api/services/comment";
import { ApiJsonPreview, ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { SearchStreamProgress, type SearchStreamStepRow } from "@/components/comment-api/search-stream-progress";
import Icon from "@/components/icon/icon";
import {
	type AutoReplyRequest,
	type CampaignRequest,
	COMMENT_GENERATION_TONES,
	type CommentGenerationTone,
	type FacebookAccountAnalyzeRequest,
	type FacebookFetchRequest,
	type FacebookPostCommentRequest,
	type PostCommentsRequest,
	type SearchRequest,
} from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent } from "@/ui/tabs";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import {
	getSearchStreamProgressStep,
	hasSearchResultPayload,
	mergeSearchStreamChunk,
} from "@/utils/mergeSearchStreamChunk";
import {
	hasAutoReplyStreamResultPayload,
	hasFbAnalyzeStreamResultPayload,
	hasFbFetchStreamResultPayload,
	hasFbPostStreamResultPayload,
	mergeWorkbenchStreamChunk,
} from "@/utils/mergeWorkbenchStreamChunk";

const CACHE_TIME = 1000 * 60 * 30;

type FbPostCommentsMode = "manual" | "auto";

interface AccountOption {
	commentCount: number;
	username: string;
}

function linesToArray(value: string): string[] {
	return value
		.split("\n")
		.map((item) => item.trim())
		.filter(Boolean);
}

function extractAccountOptions(data: unknown): AccountOption[] {
	const rows = Array.isArray(data)
		? data
		: data && typeof data === "object"
			? (["accounts", "items", "data", "rows", "list"]
					.map((key) => (data as Record<string, unknown>)[key])
					.find(Array.isArray) as unknown[] | undefined)
			: undefined;

	return (rows ?? []).flatMap((row) => {
		if (!row || typeof row !== "object") return [];
		const account = row as Record<string, unknown>;
		const value = account.username ?? account.user ?? account.name;
		if (typeof value !== "string") return [];
		return [
			{
				username: value,
				commentCount: typeof account.comment_count === "number" ? account.comment_count : 0,
			},
		];
	});
}

function toggleAccount(accounts: string[], account: string, checked: boolean): string[] {
	if (checked) return accounts.includes(account) ? accounts : [...accounts, account];
	return accounts.filter((item) => item !== account);
}

interface AccountMultiSelectProps {
	accounts: AccountOption[];
	commentCountLabel: string;
	emptyText: string;
	idPrefix: string;
	isLoading: boolean;
	label: string;
	loadingText: string;
	onChange: (accounts: string[]) => void;
	onRefresh: () => void;
	refreshLabel: string;
	selectedAccounts: string[];
	showCommentCounts?: boolean;
}

function AccountMultiSelect({
	accounts,
	commentCountLabel,
	emptyText,
	idPrefix,
	isLoading,
	label,
	loadingText,
	onChange,
	onRefresh,
	refreshLabel,
	selectedAccounts,
	showCommentCounts = false,
}: AccountMultiSelectProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<Label>{label}</Label>
				<Button type="button" size="sm" variant="ghost" disabled={isLoading} onClick={onRefresh}>
					{refreshLabel}
				</Button>
			</div>
			<div className="rounded-md border border-border bg-background p-3">
				{isLoading && accounts.length === 0 ? (
					<p className="text-sm text-muted-foreground">{loadingText}</p>
				) : accounts.length === 0 ? (
					<p className="text-sm text-muted-foreground">{emptyText}</p>
				) : (
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{accounts.map((account) => {
							const id = `${idPrefix}-${account.username}`;
							return (
								<div key={account.username} className="flex items-center justify-between gap-3 rounded-md border p-2">
									<div className="flex items-center gap-2">
										<Checkbox
											id={id}
											checked={selectedAccounts.includes(account.username)}
											onCheckedChange={(checked) =>
												onChange(toggleAccount(selectedAccounts, account.username, checked === true))
											}
										/>
										<Label htmlFor={id} className="cursor-pointer font-mono text-sm">
											{account.username}
										</Label>
									</div>
									{showCommentCounts && (
										<Badge variant="secondary" className="shrink-0">
											{account.commentCount} {commentCountLabel}
										</Badge>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

export default function Workbench() {
	const { t } = useTranslation();
	const { endpoint } = useParams();
	const queryClient = useQueryClient();
	const activeMenu = ["search", "post", "autoReply", "campaign", "fbAccount", "fbFetch", "fbPost"].includes(
		endpoint ?? "",
	)
		? (endpoint as string)
		: "search";
	const accountsQuery = useQuery({
		queryKey: ["comment-api", "accounts"],
		queryFn: () => commentAccountsService.list(),
		staleTime: CACHE_TIME,
	});
	const accountOptions = extractAccountOptions(accountsQuery.data);
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
	const searchAbortRef = useRef<AbortController | null>(null);
	const searchStreamStepIdRef = useRef(0);
	const [searchStreamSteps, setSearchStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [searchData, setSearchData] = useState<unknown>();
	const [searchStreaming, setSearchStreaming] = useState(false);
	const [searchError, setSearchError] = useState<Error | null>(null);

	const autoReplyAbortRef = useRef<AbortController | null>(null);
	const autoReplyStreamStepIdRef = useRef(0);

	const fbAnalyzeAbortRef = useRef<AbortController | null>(null);
	const fbAnalyzeStreamStepIdRef = useRef(0);

	const fbFetchAbortRef = useRef<AbortController | null>(null);
	const fbFetchStreamStepIdRef = useRef(0);

	const fbPostAbortRef = useRef<AbortController | null>(null);
	const fbPostStreamStepIdRef = useRef(0);

	useEffect(() => {
		return () => {
			searchAbortRef.current?.abort();
			autoReplyAbortRef.current?.abort();
			fbAnalyzeAbortRef.current?.abort();
			fbFetchAbortRef.current?.abort();
			fbPostAbortRef.current?.abort();
		};
	}, []);

	const runSearch = () => {
		const body: SearchRequest = {
			keyword: searchKeyword.trim(),
			max_posts: searchMaxPosts,
			period_hours: searchPeriodHours,
			search_type: searchType,
			analyze: searchAnalyze,
		};
		searchAbortRef.current?.abort();
		const ac = new AbortController();
		searchAbortRef.current = ac;
		setSearchError(null);
		setSearchData(undefined);
		searchStreamStepIdRef.current = 0;
		setSearchStreamSteps([]);
		setSearchStreaming(true);
		let hasResultChunk = false;
		void commentSearchService
			.searchStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++searchStreamStepIdRef.current;
						setSearchStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasSearchResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setSearchData((prev: unknown) => mergeSearchStreamChunk(prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || searchAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentSearchService.search(body);
				if (searchAbortRef.current === ac) {
					setSearchData(fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setSearchError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (searchAbortRef.current === ac) {
					setSearchStreaming(false);
					setSearchStreamSteps([]);
				}
			});
	};

	const [postUrl, setPostUrl] = useState("");
	const [commentsText, setCommentsText] = useState("");
	const [postSelectedAccounts, setPostSelectedAccounts] = useState<string[]>([]);
	const [periodSeconds, setPeriodSeconds] = useState(30);
	const postCommentCount = linesToArray(commentsText).length;
	const postCommentsMutation = useMutation({
		mutationFn: (body: PostCommentsRequest) => commentCommentsService.postComments(body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["comment-api", "comments-post", variables], data);
		},
	});

	const [autoReplyPostUrl, setAutoReplyPostUrl] = useState("");
	const [autoReplySelectedAccounts, setAutoReplySelectedAccounts] = useState<string[]>([]);
	const [autoReplyPeriodSeconds, setAutoReplyPeriodSeconds] = useState(30);
	const [autoReplyStreamSteps, setAutoReplyStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [autoReplyData, setAutoReplyData] = useState<unknown>();
	const [autoReplyStreaming, setAutoReplyStreaming] = useState(false);
	const [autoReplyError, setAutoReplyError] = useState<Error | null>(null);

	const [campKeyword, setCampKeyword] = useState("");
	const [campMaxPosts, setCampMaxPosts] = useState(10);
	const [campSelectedAccounts, setCampSelectedAccounts] = useState<string[]>([]);
	const [campPeriodSeconds, setCampPeriodSeconds] = useState(60);
	const [campPeriodHours, setCampPeriodHours] = useState(24);
	const [campSearchType, setCampSearchType] = useState("all");
	const [campTone, setCampTone] = useState<CommentGenerationTone>("neutral");
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
	const [fbAnalyzeStreamSteps, setFbAnalyzeStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [fbAnalyzeData, setFbAnalyzeData] = useState<unknown>();
	const [fbAnalyzeStreaming, setFbAnalyzeStreaming] = useState(false);
	const [fbAnalyzeError, setFbAnalyzeError] = useState<Error | null>(null);

	const [fbPostUrl, setFbPostUrl] = useState("");
	const [fbFetchStreamSteps, setFbFetchStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [fbFetchData, setFbFetchData] = useState<unknown>();
	const [fbFetchStreaming, setFbFetchStreaming] = useState(false);
	const [fbFetchError, setFbFetchError] = useState<Error | null>(null);

	const [fbPostCommentsUrl, setFbPostCommentsUrl] = useState("");
	const [fbPostCommentsMode, setFbPostCommentsMode] = useState<FbPostCommentsMode>("auto");
	const [fbCommentsText, setFbCommentsText] = useState("");
	const [fbGenerateTone, setFbGenerateTone] = useState<CommentGenerationTone>("positive");
	const [fbGenerateCount, setFbGenerateCount] = useState(3);
	const [fbPostPeriodSeconds, setFbPostPeriodSeconds] = useState(30);
	const [fbPostStreamSteps, setFbPostStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [fbPostData, setFbPostData] = useState<unknown>();
	const [fbPostStreaming, setFbPostStreaming] = useState(false);
	const [fbPostError, setFbPostError] = useState<Error | null>(null);

	const runPostComments = () => {
		postCommentsMutation.mutate({
			url: postUrl.trim(),
			comments: linesToArray(commentsText),
			num_bots: postSelectedAccounts.length,
			period_seconds: periodSeconds,
		});
	};

	const runAutoReply = () => {
		const body: AutoReplyRequest = {
			url: autoReplyPostUrl.trim(),
			num_bots: autoReplySelectedAccounts.length,
			period_seconds: autoReplyPeriodSeconds,
		};
		autoReplyAbortRef.current?.abort();
		const ac = new AbortController();
		autoReplyAbortRef.current = ac;
		setAutoReplyError(null);
		setAutoReplyData(undefined);
		autoReplyStreamStepIdRef.current = 0;
		setAutoReplyStreamSteps([]);
		setAutoReplyStreaming(true);
		let hasResultChunk = false;

		void commentCommentsService
			.autoReplyStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++autoReplyStreamStepIdRef.current;
						setAutoReplyStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasAutoReplyStreamResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setAutoReplyData((prev: unknown) => mergeWorkbenchStreamChunk("autoReply", prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || autoReplyAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentCommentsService.autoReply(body);
				if (autoReplyAbortRef.current === ac) {
					setAutoReplyData(fallbackResult);
					queryClient.setQueryData(["comment-api", "auto-reply", body], fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setAutoReplyError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (autoReplyAbortRef.current === ac) {
					setAutoReplyStreaming(false);
					setAutoReplyStreamSteps([]);
				}
			});
	};

	const runFacebookAnalyze = () => {
		const body: FacebookAccountAnalyzeRequest = {
			username: fbUsername.trim(),
			max_posts: fbMaxPosts,
		};
		fbAnalyzeAbortRef.current?.abort();
		const ac = new AbortController();
		fbAnalyzeAbortRef.current = ac;
		setFbAnalyzeError(null);
		setFbAnalyzeData(undefined);
		fbAnalyzeStreamStepIdRef.current = 0;
		setFbAnalyzeStreamSteps([]);
		setFbAnalyzeStreaming(true);
		let hasResultChunk = false;

		void commentFacebookService
			.analyzeAccountStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++fbAnalyzeStreamStepIdRef.current;
						setFbAnalyzeStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasFbAnalyzeStreamResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setFbAnalyzeData((prev: unknown) => mergeWorkbenchStreamChunk("fbAnalyze", prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || fbAnalyzeAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentFacebookService.analyzeAccount(body);
				if (fbAnalyzeAbortRef.current === ac) {
					setFbAnalyzeData(fallbackResult);
					queryClient.setQueryData(["comment-api", "facebook", "account-analyze", body], fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setFbAnalyzeError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (fbAnalyzeAbortRef.current === ac) {
					setFbAnalyzeStreaming(false);
					setFbAnalyzeStreamSteps([]);
				}
			});
	};

	const runFacebookFetch = () => {
		const body: FacebookFetchRequest = { url: fbPostUrl.trim() };
		fbFetchAbortRef.current?.abort();
		const ac = new AbortController();
		fbFetchAbortRef.current = ac;
		setFbFetchError(null);
		setFbFetchData(undefined);
		fbFetchStreamStepIdRef.current = 0;
		setFbFetchStreamSteps([]);
		setFbFetchStreaming(true);
		let hasResultChunk = false;

		void commentFacebookService
			.fetchCommentsStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++fbFetchStreamStepIdRef.current;
						setFbFetchStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasFbFetchStreamResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setFbFetchData((prev: unknown) => mergeWorkbenchStreamChunk("fbFetch", prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || fbFetchAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentFacebookService.fetchComments(body);
				if (fbFetchAbortRef.current === ac) {
					setFbFetchData(fallbackResult);
					queryClient.setQueryData(["comment-api", "facebook", "comments-fetch", body], fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setFbFetchError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (fbFetchAbortRef.current === ac) {
					setFbFetchStreaming(false);
					setFbFetchStreamSteps([]);
				}
			});
	};

	const buildFacebookPostBody = (): FacebookPostCommentRequest => {
		const base = {
			url: fbPostCommentsUrl.trim(),
			period_seconds: fbPostPeriodSeconds,
		};
		if (fbPostCommentsMode === "manual") {
			return { ...base, comments: linesToArray(fbCommentsText) };
		}
		return {
			...base,
			auto_generate: { tone: fbGenerateTone, count: fbGenerateCount },
		};
	};

	const runFacebookPost = () => {
		const body = buildFacebookPostBody();
		fbPostAbortRef.current?.abort();
		const ac = new AbortController();
		fbPostAbortRef.current = ac;
		setFbPostError(null);
		setFbPostData(undefined);
		fbPostStreamStepIdRef.current = 0;
		setFbPostStreamSteps([]);
		setFbPostStreaming(true);
		let hasResultChunk = false;

		void commentFacebookService
			.postCommentsStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++fbPostStreamStepIdRef.current;
						setFbPostStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasFbPostStreamResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setFbPostData((prev: unknown) => mergeWorkbenchStreamChunk("fbPost", prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || fbPostAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentFacebookService.postComments(body);
				if (fbPostAbortRef.current === ac) {
					setFbPostData(fallbackResult);
					queryClient.setQueryData(["comment-api", "facebook", "comments-post", body], fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setFbPostError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (fbPostAbortRef.current === ac) {
					setFbPostStreaming(false);
					setFbPostStreamSteps([]);
				}
			});
	};

	const runCampaign = () => {
		campaignMutation.mutate({
			keyword: campKeyword.trim(),
			max_posts: campMaxPosts,
			num_bots: campSelectedAccounts.length,
			period_seconds: campPeriodSeconds,
			period_hours: campPeriodHours,
			search_type: campSearchType,
			tone: campTone,
			generate_count: campGenerateCount,
			comments: campCommentsText ? linesToArray(campCommentsText) : undefined,
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
						<Button disabled={!searchKeyword.trim() || searchStreaming} onClick={runSearch}>
							{searchStreaming ? t("sys.workbench.search.running") : t("sys.workbench.search.run")}
						</Button>
						<SearchStreamProgress active={searchStreaming} storageKey="workbench-search" steps={searchStreamSteps} />
						<ApiResultView
							value={searchData !== undefined ? searchData : searchError !== null ? searchError : undefined}
						/>
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
								<Label htmlFor="ps">{t("sys.workbench.post.periodSecondsLabel")}</Label>
								<Input
									id="ps"
									type="number"
									value={periodSeconds}
									onChange={(event) => setPeriodSeconds(Number(event.target.value))}
								/>
							</div>
						</div>
						<AccountMultiSelect
							idPrefix="post-response-account"
							label={t("sys.workbench.shared.responseAccountsLabel")}
							accounts={accountOptions}
							selectedAccounts={postSelectedAccounts}
							isLoading={accountsQuery.isFetching}
							onChange={setPostSelectedAccounts}
							onRefresh={() => void accountsQuery.refetch()}
							commentCountLabel={t("sys.workbench.shared.commentCountLabel")}
							showCommentCounts
							loadingText={t("sys.workbench.shared.loadingAccounts")}
							emptyText={t("sys.workbench.shared.noAccounts")}
							refreshLabel={t("sys.workbench.shared.refreshAccounts")}
						/>
						<Button
							disabled={
								!postUrl.trim() ||
								postCommentCount === 0 ||
								postSelectedAccounts.length === 0 ||
								postCommentsMutation.isPending
							}
							onClick={runPostComments}
						>
							{postCommentsMutation.isPending ? t("sys.workbench.post.posting") : t("sys.workbench.post.run")}
						</Button>
						<ApiLongRunningNotice active={postCommentsMutation.isPending} storageKey="workbench-post" />
						<ApiJsonPreview
							value={
								postCommentsMutation.data ?? (postCommentsMutation.isError ? postCommentsMutation.error : undefined)
							}
						/>
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="autoReply">
					<WorkflowShell
						title={t("sys.workbench.autoReply.cardTitle")}
						description={t("sys.workbench.autoReply.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.action")}
					>
						<div className="space-y-2">
							<Label htmlFor="auto-reply-url">{t("sys.workbench.post.postUrlLabel")}</Label>
							<Input
								id="auto-reply-url"
								value={autoReplyPostUrl}
								onChange={(event) => setAutoReplyPostUrl(event.target.value)}
								placeholder={t("sys.workbench.post.postUrlPlaceholder")}
							/>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="auto-reply-period">{t("sys.workbench.post.periodSecondsLabel")}</Label>
								<Input
									id="auto-reply-period"
									type="number"
									value={autoReplyPeriodSeconds}
									onChange={(event) => setAutoReplyPeriodSeconds(Number(event.target.value))}
								/>
							</div>
						</div>
						<AccountMultiSelect
							idPrefix="auto-reply-response-account"
							label={t("sys.workbench.shared.responseAccountsLabel")}
							accounts={accountOptions}
							selectedAccounts={autoReplySelectedAccounts}
							isLoading={accountsQuery.isFetching}
							onChange={setAutoReplySelectedAccounts}
							onRefresh={() => void accountsQuery.refetch()}
							commentCountLabel={t("sys.workbench.shared.commentCountLabel")}
							showCommentCounts
							loadingText={t("sys.workbench.shared.loadingAccounts")}
							emptyText={t("sys.workbench.shared.noAccounts")}
							refreshLabel={t("sys.workbench.shared.refreshAccounts")}
						/>
						<Button
							disabled={!autoReplyPostUrl.trim() || autoReplySelectedAccounts.length === 0 || autoReplyStreaming}
							onClick={runAutoReply}
						>
							{autoReplyStreaming ? t("sys.workbench.autoReply.running") : t("sys.workbench.autoReply.run")}
						</Button>
						<SearchStreamProgress
							active={autoReplyStreaming}
							storageKey="workbench-auto-reply-stream"
							steps={autoReplyStreamSteps}
							title={t("sys.workbench.autoReply.streamProgressTitle")}
							subtitle={t("sys.workbench.autoReply.streamProgressSubtitle")}
							waitingText={t("sys.workbench.autoReply.streamProgressWaiting")}
							runningLabel={t("sys.workbench.autoReply.running")}
						/>
						<ApiResultView
							value={autoReplyData !== undefined ? autoReplyData : autoReplyError !== null ? autoReplyError : undefined}
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
								<Select value={campTone} onValueChange={(v) => setCampTone(v as CommentGenerationTone)}>
									<SelectTrigger id="ctone">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{COMMENT_GENERATION_TONES.map((tone) => (
											<SelectItem key={tone} value={tone}>
												{t(`sys.workbench.generationTone.${tone}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
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
						<AccountMultiSelect
							idPrefix="campaign-response-account"
							label={t("sys.workbench.shared.responseAccountsLabel")}
							accounts={accountOptions}
							selectedAccounts={campSelectedAccounts}
							isLoading={accountsQuery.isFetching}
							onChange={setCampSelectedAccounts}
							onRefresh={() => void accountsQuery.refetch()}
							commentCountLabel={t("sys.workbench.shared.commentCountLabel")}
							showCommentCounts
							loadingText={t("sys.workbench.shared.loadingAccounts")}
							emptyText={t("sys.workbench.shared.noAccounts")}
							refreshLabel={t("sys.workbench.shared.refreshAccounts")}
						/>
						<Button
							disabled={!campKeyword.trim() || campSelectedAccounts.length === 0 || campaignMutation.isPending}
							onClick={runCampaign}
						>
							{campaignMutation.isPending ? t("sys.workbench.campaign.running") : t("sys.workbench.campaign.run")}
						</Button>
						<ApiLongRunningNotice active={campaignMutation.isPending} storageKey="workbench-campaign" />
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
						<Button disabled={!fbUsername.trim() || fbAnalyzeStreaming} onClick={runFacebookAnalyze}>
							{fbAnalyzeStreaming ? t("sys.workbench.facebook.analyzing") : t("sys.workbench.facebook.analyze")}
						</Button>
						<SearchStreamProgress
							active={fbAnalyzeStreaming}
							storageKey="workbench-facebook-account-stream"
							steps={fbAnalyzeStreamSteps}
							title={t("sys.workbench.facebook.accountStreamProgressTitle")}
							subtitle={t("sys.workbench.facebook.accountStreamProgressSubtitle")}
							waitingText={t("sys.workbench.facebook.streamProgressWaiting")}
							runningLabel={t("sys.workbench.facebook.analyzing")}
						/>
						<ApiResultView
							value={fbAnalyzeData !== undefined ? fbAnalyzeData : fbAnalyzeError !== null ? fbAnalyzeError : undefined}
						/>
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
						<Button disabled={!fbPostUrl.trim() || fbFetchStreaming} onClick={runFacebookFetch}>
							{fbFetchStreaming ? t("sys.workbench.facebook.fetching") : t("sys.workbench.facebook.fetch")}
						</Button>
						<SearchStreamProgress
							active={fbFetchStreaming}
							storageKey="workbench-facebook-fetch-stream"
							steps={fbFetchStreamSteps}
							title={t("sys.workbench.facebook.fetchStreamProgressTitle")}
							subtitle={t("sys.workbench.facebook.fetchStreamProgressSubtitle")}
							waitingText={t("sys.workbench.facebook.streamProgressWaiting")}
							runningLabel={t("sys.workbench.facebook.fetching")}
						/>
						<ApiResultView
							value={fbFetchData !== undefined ? fbFetchData : fbFetchError !== null ? fbFetchError : undefined}
						/>
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

						<div className="space-y-3">
							<Label className="text-sm font-medium">{t("sys.workbench.facebook.postModeLabel")}</Label>
							<RadioGroup
								value={fbPostCommentsMode}
								onValueChange={(value) => setFbPostCommentsMode(value as FbPostCommentsMode)}
								className="grid gap-3 sm:grid-cols-2"
							>
								<div className="flex items-start gap-3 rounded-lg border border-border p-3">
									<RadioGroupItem value="manual" id="fb-mode-manual" className="mt-0.5" />
									<div className="grid gap-1">
										<Label htmlFor="fb-mode-manual" className="cursor-pointer leading-none font-normal">
											{t("sys.workbench.facebook.postModeManual")}
										</Label>
										<Text variant="caption" className="text-muted-foreground">
											{t("sys.workbench.facebook.postModeManualHint")}
										</Text>
									</div>
								</div>
								<div className="flex items-start gap-3 rounded-lg border border-border p-3">
									<RadioGroupItem value="auto" id="fb-mode-auto" className="mt-0.5" />
									<div className="grid gap-1">
										<Label htmlFor="fb-mode-auto" className="cursor-pointer leading-none font-normal">
											{t("sys.workbench.facebook.postModeAuto")}
										</Label>
										<Text variant="caption" className="text-muted-foreground">
											{t("sys.workbench.facebook.postModeAutoHint")}
										</Text>
									</div>
								</div>
							</RadioGroup>
						</div>

						{fbPostCommentsMode === "manual" ? (
							<div className="space-y-2">
								<Label htmlFor="fbcomments">{t("sys.workbench.facebook.commentsLabel")}</Label>
								<Textarea
									id="fbcomments"
									value={fbCommentsText}
									onChange={(event) => setFbCommentsText(event.target.value)}
								/>
							</div>
						) : (
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="fbton">{t("sys.workbench.facebook.toneLabel")}</Label>
									<Select value={fbGenerateTone} onValueChange={(v) => setFbGenerateTone(v as CommentGenerationTone)}>
										<SelectTrigger id="fbton">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{COMMENT_GENERATION_TONES.map((tone) => (
												<SelectItem key={tone} value={tone}>
													{t(`sys.workbench.generationTone.${tone}`)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="fbcnt">{t("sys.workbench.facebook.generateCountLabel")}</Label>
									<Input
										id="fbcnt"
										type="number"
										min={1}
										value={fbGenerateCount}
										onChange={(event) => setFbGenerateCount(Number(event.target.value))}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="fbps">{t("sys.workbench.facebook.periodSecondsLabel")}</Label>
							<Input
								id="fbps"
								type="number"
								value={fbPostPeriodSeconds}
								onChange={(event) => setFbPostPeriodSeconds(Number(event.target.value))}
							/>
						</div>
						<Button
							disabled={
								!fbPostCommentsUrl.trim() ||
								fbPostStreaming ||
								(fbPostCommentsMode === "manual" && linesToArray(fbCommentsText).length === 0) ||
								(fbPostCommentsMode === "auto" && fbGenerateCount < 1)
							}
							onClick={runFacebookPost}
						>
							{fbPostStreaming ? t("sys.workbench.facebook.posting") : t("sys.workbench.facebook.post")}
						</Button>
						<SearchStreamProgress
							active={fbPostStreaming}
							storageKey="workbench-facebook-post-stream"
							steps={fbPostStreamSteps}
							title={t("sys.workbench.facebook.postStreamProgressTitle")}
							subtitle={t("sys.workbench.facebook.postStreamProgressSubtitle")}
							waitingText={t("sys.workbench.facebook.streamProgressWaiting")}
							runningLabel={t("sys.workbench.facebook.posting")}
						/>
						<ApiResultView
							value={fbPostData !== undefined ? fbPostData : fbPostError !== null ? fbPostError : undefined}
						/>
					</WorkflowShell>
				</TabsContent>
			</Tabs>
		</div>
	);
}
