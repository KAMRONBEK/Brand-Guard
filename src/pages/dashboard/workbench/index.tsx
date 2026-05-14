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
import { ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { SearchStreamProgress, type SearchStreamStepRow } from "@/components/comment-api/search-stream-progress";
import { SentimentReportSection } from "@/components/comment-api/sentiment-report-section";
import { MultiValueChipInput } from "@/components/form/multi-value-chip-input";
import Icon from "@/components/icon/icon";
import { PeriodHoursPresetSelect } from "@/components/period-hours-preset-select";
import { DEFAULT_COMMENT_API_LANGUAGE_HINT } from "@/constants/api-defaults";
import {
	type AutoReplyRequest,
	type CampaignRequest,
	COMMENT_GENERATION_TONES,
	type CommentGenerationTone,
	type FacebookAccountAnalyzeRequest,
	type FacebookFetchRequest,
	type FacebookPostCommentRequest,
	type FacebookUnifiedSearchRequest,
	type FacebookUnifiedSearchType,
	type InstagramUnifiedSearchRequest,
	type InstagramUnifiedSearchType,
	type PostCommentsRequest,
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
import {
	finiteNumberOr,
	type OptionalFiniteNumber,
	optionalFiniteNumberDisplay,
	setOptionalFiniteNumberFromInput,
} from "@/utils/optional-number-input";

const CACHE_TIME = 1000 * 60 * 30;

/** Sent with Instagram unified search/stream; not exposed in the workbench UI. */
const INSTAGRAM_UNIFIED_MAX_COMMENTS_PER_POST = 150;

/** Facebook unified search: fixed cap, not exposed in the workbench UI. */
const FACEBOOK_UNIFIED_MAX_COMMENTS_PER_POST = 150;

const LANGUAGE_SELECT_OMIT = "__language_omit__" as const;
const COMMENT_API_LANGUAGE_CODES = ["ru", "en", "uz"] as const;

type FbPostCommentsMode = "manual" | "auto";

type IgPostCommentsMode = "self" | "ai";

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
	const activeMenu = [
		"search",
		"stats",
		"post",
		"autoReply",
		"campaign",
		"fbSearch",
		"fbAccount",
		"fbFetch",
		"fbPost",
	].includes(endpoint ?? "")
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

	const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
	const [searchMaxPostsPerAccount, setSearchMaxPostsPerAccount] = useState<OptionalFiniteNumber>(5);
	const [searchType, setSearchType] = useState<InstagramUnifiedSearchType>("account");
	const [searchLanguage, setSearchLanguage] = useState(DEFAULT_COMMENT_API_LANGUAGE_HINT);
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

	const fbUnifiedSearchAbortRef = useRef<AbortController | null>(null);
	const fbUnifiedSearchStreamStepIdRef = useRef(0);

	const igPostAbortRef = useRef<AbortController | null>(null);
	const igPostStreamStepIdRef = useRef(0);

	useEffect(() => {
		return () => {
			searchAbortRef.current?.abort();
			autoReplyAbortRef.current?.abort();
			fbUnifiedSearchAbortRef.current?.abort();
			fbAnalyzeAbortRef.current?.abort();
			fbFetchAbortRef.current?.abort();
			fbPostAbortRef.current?.abort();
			igPostAbortRef.current?.abort();
		};
	}, []);

	const runSearch = () => {
		const keywords = searchKeywords;
		const maxPostsEffective =
			searchMaxPostsPerAccount === ""
				? 10
				: searchMaxPostsPerAccount === 0
					? 10
					: Number.isFinite(searchMaxPostsPerAccount) && searchMaxPostsPerAccount > 0
						? Math.floor(searchMaxPostsPerAccount)
						: 10;
		const body: InstagramUnifiedSearchRequest = {
			type: searchType,
			keywords,
			max_posts_per_account: maxPostsEffective,
			max_comments_per_post: INSTAGRAM_UNIFIED_MAX_COMMENTS_PER_POST,
		};
		const lang = searchLanguage.trim();
		if (lang !== "") {
			body.language = lang;
		}
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

	const [fbUnifiedKeywords, setFbUnifiedKeywords] = useState<string[]>([]);
	const [fbUnifiedSearchType, setFbUnifiedSearchType] = useState<FacebookUnifiedSearchType>("account");
	const [fbUnifiedMaxPosts, setFbUnifiedMaxPosts] = useState<OptionalFiniteNumber>(5);
	const [fbUnifiedPeriodHours, setFbUnifiedPeriodHours] = useState(168);
	const [fbUnifiedLanguage, setFbUnifiedLanguage] = useState(DEFAULT_COMMENT_API_LANGUAGE_HINT);
	const [fbUnifiedSearchStreamSteps, setFbUnifiedSearchStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [fbUnifiedSearchData, setFbUnifiedSearchData] = useState<unknown>();
	const [fbUnifiedSearchStreaming, setFbUnifiedSearchStreaming] = useState(false);
	const [fbUnifiedSearchError, setFbUnifiedSearchError] = useState<Error | null>(null);

	const runFacebookUnifiedSearch = () => {
		const keywords = fbUnifiedKeywords;
		const body: FacebookUnifiedSearchRequest = {
			keywords,
			type: fbUnifiedSearchType,
			max_posts: finiteNumberOr(fbUnifiedMaxPosts, 5),
			max_comments_per_post: FACEBOOK_UNIFIED_MAX_COMMENTS_PER_POST,
			period_hours: fbUnifiedPeriodHours,
			...(fbUnifiedLanguage.trim() !== "" ? { language: fbUnifiedLanguage.trim() } : {}),
		};
		fbUnifiedSearchAbortRef.current?.abort();
		const ac = new AbortController();
		fbUnifiedSearchAbortRef.current = ac;
		setFbUnifiedSearchError(null);
		setFbUnifiedSearchData(undefined);
		fbUnifiedSearchStreamStepIdRef.current = 0;
		setFbUnifiedSearchStreamSteps([]);
		setFbUnifiedSearchStreaming(true);
		let hasResultChunk = false;
		void commentFacebookService
			.searchStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++fbUnifiedSearchStreamStepIdRef.current;
						setFbUnifiedSearchStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					if (hasSearchResultPayload(chunk)) {
						hasResultChunk = true;
					}
					setFbUnifiedSearchData((prev: unknown) => mergeSearchStreamChunk(prev, chunk));
				},
			})
			.then(async () => {
				if (hasResultChunk || ac.signal.aborted || fbUnifiedSearchAbortRef.current !== ac) {
					return;
				}
				const fallbackResult = await commentFacebookService.search(body);
				if (fbUnifiedSearchAbortRef.current === ac) {
					setFbUnifiedSearchData(fallbackResult);
				}
			})
			.catch((error: unknown) => {
				setFbUnifiedSearchError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (fbUnifiedSearchAbortRef.current === ac) {
					setFbUnifiedSearchStreaming(false);
					setFbUnifiedSearchStreamSteps([]);
				}
			});
	};

	const [postUrl, setPostUrl] = useState("");
	const [commentsText, setCommentsText] = useState("");
	const [postSelectedAccounts, setPostSelectedAccounts] = useState<string[]>([]);
	const [periodSeconds, setPeriodSeconds] = useState<OptionalFiniteNumber>(30);
	const [igPostCommentsMode, setIgPostCommentsMode] = useState<IgPostCommentsMode>("self");
	const [igGenerateTone, setIgGenerateTone] = useState<CommentGenerationTone>("positive");
	const [igGenerateCount, setIgGenerateCount] = useState<OptionalFiniteNumber>(3);
	const [igGenerateLanguage, setIgGenerateLanguage] = useState(DEFAULT_COMMENT_API_LANGUAGE_HINT);
	const [postStreamSteps, setPostStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [postStreamData, setPostStreamData] = useState<unknown>();
	const [postStreaming, setPostStreaming] = useState(false);
	const [postStreamError, setPostStreamError] = useState<Error | null>(null);

	const [autoReplyPostUrl, setAutoReplyPostUrl] = useState("");
	const [autoReplySelectedAccounts, setAutoReplySelectedAccounts] = useState<string[]>([]);
	const [autoReplyPeriodSeconds, setAutoReplyPeriodSeconds] = useState<OptionalFiniteNumber>(30);
	const [autoReplyStreamSteps, setAutoReplyStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [autoReplyData, setAutoReplyData] = useState<unknown>();
	const [autoReplyStreaming, setAutoReplyStreaming] = useState(false);
	const [autoReplyError, setAutoReplyError] = useState<Error | null>(null);

	const [campKeyword, setCampKeyword] = useState("");
	const [campMaxPosts, setCampMaxPosts] = useState<OptionalFiniteNumber>(10);
	const [campSelectedAccounts, setCampSelectedAccounts] = useState<string[]>([]);
	const [campPeriodSeconds, setCampPeriodSeconds] = useState<OptionalFiniteNumber>(60);
	const [campPeriodHours, setCampPeriodHours] = useState(24);
	const [campSearchType, setCampSearchType] = useState("all");
	const [campTone, setCampTone] = useState<CommentGenerationTone>("neutral");
	const [campGenerateCount, setCampGenerateCount] = useState<OptionalFiniteNumber>(5);
	const [campCommentsText, setCampCommentsText] = useState("");
	const campaignMutation = useMutation({
		mutationFn: (body: CampaignRequest) => commentCampaignService.run(body),
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["comment-api", "campaign", variables], data);
		},
	});

	const [fbUsername, setFbUsername] = useState("");
	const [fbMaxPosts, setFbMaxPosts] = useState<OptionalFiniteNumber>(1);
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
	const [fbGenerateCount, setFbGenerateCount] = useState<OptionalFiniteNumber>(3);
	const [fbPostPeriodSeconds, setFbPostPeriodSeconds] = useState<OptionalFiniteNumber>(30);
	const [fbPostStreamSteps, setFbPostStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [fbPostData, setFbPostData] = useState<unknown>();
	const [fbPostStreaming, setFbPostStreaming] = useState(false);
	const [fbPostError, setFbPostError] = useState<Error | null>(null);

	const buildInstagramPostBody = (): PostCommentsRequest => {
		const base: PostCommentsRequest = {
			url: postUrl.trim(),
			num_bots: postSelectedAccounts.length,
			period_seconds: finiteNumberOr(periodSeconds, 30),
		};
		if (igPostCommentsMode === "self") {
			return { ...base, comments: linesToArray(commentsText) };
		}
		const auto_generate = {
			tone: igGenerateTone,
			count: finiteNumberOr(igGenerateCount, 3),
		};
		const lang = igGenerateLanguage.trim();
		if (lang !== "") {
			return { ...base, auto_generate: { ...auto_generate, language: lang } };
		}
		return { ...base, auto_generate };
	};

	const runPostComments = () => {
		const body = buildInstagramPostBody();
		igPostAbortRef.current?.abort();
		const ac = new AbortController();
		igPostAbortRef.current = ac;
		setPostStreamError(null);
		setPostStreamData(undefined);
		igPostStreamStepIdRef.current = 0;
		setPostStreamSteps([]);
		setPostStreaming(true);

		void commentCommentsService
			.postCommentsStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++igPostStreamStepIdRef.current;
						setPostStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					setPostStreamData((prev: unknown) => mergeWorkbenchStreamChunk("igPost", prev, chunk));
				},
			})
			.catch((error: unknown) => {
				setPostStreamError(error instanceof Error ? error : new Error(String(error)));
			})
			.finally(() => {
				if (igPostAbortRef.current === ac) {
					setPostStreaming(false);
					setPostStreamSteps([]);
				}
			});
	};

	const runAutoReply = () => {
		const body: AutoReplyRequest = {
			url: autoReplyPostUrl.trim(),
			num_bots: autoReplySelectedAccounts.length,
			period_seconds: finiteNumberOr(autoReplyPeriodSeconds, 30),
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
			max_posts: finiteNumberOr(fbMaxPosts, 1),
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
			period_seconds: finiteNumberOr(fbPostPeriodSeconds, 30),
		};
		if (fbPostCommentsMode === "manual") {
			return { ...base, comments: linesToArray(fbCommentsText) };
		}
		return {
			...base,
			auto_generate: { tone: fbGenerateTone, count: finiteNumberOr(fbGenerateCount, 3) },
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
			max_posts: finiteNumberOr(campMaxPosts, 10),
			num_bots: campSelectedAccounts.length,
			period_seconds: finiteNumberOr(campPeriodSeconds, 60),
			period_hours: campPeriodHours,
			search_type: campSearchType,
			tone: campTone,
			generate_count: finiteNumberOr(campGenerateCount, 5),
			comments: campCommentsText ? linesToArray(campCommentsText) : undefined,
		});
	};

	const searchLanguageSelectValue = searchLanguage.trim() === "" ? LANGUAGE_SELECT_OMIT : searchLanguage.trim();
	const fbUnifiedLanguageSelectValue =
		fbUnifiedLanguage.trim() === "" ? LANGUAGE_SELECT_OMIT : fbUnifiedLanguage.trim();

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
						<div className="flex flex-col gap-4">
							<MultiValueChipInput
								className="min-w-0"
								id="ig-search-keywords"
								label={t("sys.workbench.search.keywordsLabel")}
								hint={t("sys.workbench.search.chipCommitHint")}
								values={searchKeywords}
								onChange={setSearchKeywords}
								placeholder={t("sys.workbench.search.keywordsPlaceholder")}
								disabled={searchStreaming}
								removeItemAriaLabel={(value) => t("sys.workbench.search.removeChipAria", { value })}
							/>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-start lg:gap-5">
								<div className="space-y-2">
									<Label htmlFor="st">{t("sys.workbench.search.searchTypeLabel")}</Label>
									<Select
										disabled={searchStreaming}
										value={searchType}
										onValueChange={(value) => setSearchType(value as InstagramUnifiedSearchType)}
									>
										<SelectTrigger id="st" className="h-9 w-full min-w-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="account">account</SelectItem>
											<SelectItem value="hashtag">hashtag</SelectItem>
											<SelectItem value="url">url</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="mpa">{t("sys.workbench.search.maxPostsPerAccountLabel")}</Label>
									<Input
										id="mpa"
										type="number"
										className="h-9"
										value={optionalFiniteNumberDisplay(searchMaxPostsPerAccount)}
										onChange={(event) =>
											setOptionalFiniteNumberFromInput(event.target.value, setSearchMaxPostsPerAccount)
										}
										disabled={searchStreaming}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2 lg:col-span-1">
									<Label htmlFor="ig-search-lang-select">{t("sys.workbench.search.languageLabel")}</Label>
									<Select
										disabled={searchStreaming}
										value={searchLanguageSelectValue}
										onValueChange={(next) => setSearchLanguage(next === LANGUAGE_SELECT_OMIT ? "" : next)}
									>
										<SelectTrigger id="ig-search-lang-select" className="h-9 w-full min-w-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
											<SelectItem value={LANGUAGE_SELECT_OMIT}>
												{t("sys.telegramSearch.languageOption.omit")}
											</SelectItem>
											{COMMENT_API_LANGUAGE_CODES.map((code) => (
												<SelectItem key={code} value={code}>
													{t(`sys.telegramSearch.languageOption.${code}`)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<Button
								className="w-full sm:w-auto"
								disabled={searchKeywords.length === 0 || searchStreaming}
								onClick={runSearch}
							>
								{searchStreaming ? t("sys.workbench.search.running") : t("sys.workbench.search.run")}
							</Button>
							<SearchStreamProgress
								active={searchStreaming}
								storageKey="workbench-search"
								title={t("sys.workbench.search.streamProgressTitle")}
								subtitle={t("sys.workbench.search.streamProgressSubtitle")}
								waitingText={t("sys.workbench.search.streamProgressWaiting")}
								runningLabel={t("sys.workbench.search.running")}
								steps={searchStreamSteps}
							/>
							<ApiResultView
								value={searchData !== undefined ? searchData : searchError !== null ? searchError : undefined}
							/>
						</div>
					</WorkflowShell>
				</TabsContent>

				<TabsContent value="stats">
					<SentimentReportSection />
				</TabsContent>

				<TabsContent value="post">
					<WorkflowShell
						title={t("sys.workbench.post.cardTitle")}
						description={t("sys.workbench.post.hint")}
						platform="Instagram"
						intent={t("sys.workbench.intent.action")}
					>
						<div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
							<div className="space-y-2">
								<Label htmlFor="pu">{t("sys.workbench.post.postUrlLabel")}</Label>
								<Input
									id="pu"
									value={postUrl}
									onChange={(event) => setPostUrl(event.target.value)}
									placeholder={t("sys.workbench.post.postUrlPlaceholder")}
								/>
							</div>
						</div>

						<div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
							<div className="space-y-3">
								<Label className="text-sm font-medium">{t("sys.workbench.post.postModeLabel")}</Label>
								<RadioGroup
									value={igPostCommentsMode}
									onValueChange={(value) => setIgPostCommentsMode(value as IgPostCommentsMode)}
									className="grid gap-3 sm:grid-cols-2"
								>
									<div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
										<RadioGroupItem value="self" id="ig-mode-self" className="mt-0.5" />
										<div className="grid gap-1">
											<Label htmlFor="ig-mode-self" className="cursor-pointer leading-none font-normal">
												{t("sys.workbench.post.postModeSelf")}
											</Label>
											<Text variant="caption" className="text-muted-foreground">
												{t("sys.workbench.post.postModeSelfHint")}
											</Text>
										</div>
									</div>
									<div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
										<RadioGroupItem value="ai" id="ig-mode-ai" className="mt-0.5" />
										<div className="grid gap-1">
											<Label htmlFor="ig-mode-ai" className="cursor-pointer leading-none font-normal">
												{t("sys.workbench.post.postModeAi")}
											</Label>
											<Text variant="caption" className="text-muted-foreground">
												{t("sys.workbench.post.postModeAiHint")}
											</Text>
										</div>
									</div>
								</RadioGroup>
							</div>
						</div>

						{igPostCommentsMode === "self" ? (
							<div className="space-y-2">
								<Label htmlFor="ct">{t("sys.workbench.post.commentsLabel")}</Label>
								<Textarea id="ct" value={commentsText} onChange={(event) => setCommentsText(event.target.value)} />
							</div>
						) : (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="ig-ton">{t("sys.workbench.post.toneLabel")}</Label>
									<Select value={igGenerateTone} onValueChange={(v) => setIgGenerateTone(v as CommentGenerationTone)}>
										<SelectTrigger id="ig-ton">
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
									<Label htmlFor="ig-cnt">{t("sys.workbench.post.generateCountLabel")}</Label>
									<Input
										id="ig-cnt"
										type="number"
										min={1}
										value={optionalFiniteNumberDisplay(igGenerateCount)}
										onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setIgGenerateCount)}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2 lg:col-span-1">
									<Label htmlFor="ig-lang">{t("sys.workbench.post.languageLabel")}</Label>
									<Input
										id="ig-lang"
										value={igGenerateLanguage}
										onChange={(event) => setIgGenerateLanguage(event.target.value)}
										placeholder={t("sys.workbench.post.languagePlaceholder")}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="ps">{t("sys.workbench.post.periodSecondsLabel")}</Label>
							<Input
								id="ps"
								type="number"
								value={optionalFiniteNumberDisplay(periodSeconds)}
								onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setPeriodSeconds)}
							/>
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
							className="w-full sm:w-auto"
							disabled={
								!postUrl.trim() ||
								postStreaming ||
								postSelectedAccounts.length === 0 ||
								(igPostCommentsMode === "self" && linesToArray(commentsText).length === 0) ||
								(igPostCommentsMode === "ai" && (igGenerateCount === "" || igGenerateCount < 1)) ||
								periodSeconds === ""
							}
							onClick={runPostComments}
						>
							{postStreaming ? t("sys.workbench.post.posting") : t("sys.workbench.post.run")}
						</Button>
						<SearchStreamProgress
							active={postStreaming}
							storageKey="workbench-instagram-post-stream"
							steps={postStreamSteps}
							title={t("sys.workbench.post.postStreamProgressTitle")}
							subtitle={t("sys.workbench.post.postStreamProgressSubtitle")}
							waitingText={t("sys.workbench.post.streamProgressWaiting")}
							runningLabel={t("sys.workbench.post.posting")}
						/>
						<ApiResultView
							value={
								postStreamData !== undefined ? postStreamData : postStreamError !== null ? postStreamError : undefined
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
									value={optionalFiniteNumberDisplay(autoReplyPeriodSeconds)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setAutoReplyPeriodSeconds)}
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
							disabled={
								!autoReplyPostUrl.trim() ||
								autoReplySelectedAccounts.length === 0 ||
								autoReplyStreaming ||
								autoReplyPeriodSeconds === ""
							}
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
									value={optionalFiniteNumberDisplay(campMaxPosts)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setCampMaxPosts)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="cps">{t("sys.workbench.campaign.periodSecondsLabel")}</Label>
								<Input
									id="cps"
									type="number"
									value={optionalFiniteNumberDisplay(campPeriodSeconds)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setCampPeriodSeconds)}
								/>
							</div>
							<PeriodHoursPresetSelect
								id="cph2"
								label={t("sys.workbench.campaign.periodHoursLabel")}
								value={campPeriodHours}
								onHoursChange={setCampPeriodHours}
								disabled={campaignMutation.isPending}
							/>
							<div className="space-y-2">
								<Label htmlFor="cgc">{t("sys.workbench.campaign.generateCountLabel")}</Label>
								<Input
									id="cgc"
									type="number"
									value={optionalFiniteNumberDisplay(campGenerateCount)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setCampGenerateCount)}
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

				<TabsContent value="fbSearch">
					<WorkflowShell
						title={t("sys.workbench.facebookSearch.cardTitle")}
						description={t("sys.workbench.facebookSearch.hint")}
						platform="Facebook"
						intent={t("sys.workbench.intent.discovery")}
					>
						<div className="flex flex-col gap-4">
							<MultiValueChipInput
								className="min-w-0"
								id="fbus-keywords"
								label={t("sys.workbench.facebookSearch.keywordsLabel")}
								hint={t("sys.workbench.facebookSearch.chipCommitHint")}
								values={fbUnifiedKeywords}
								onChange={setFbUnifiedKeywords}
								placeholder={t("sys.workbench.facebookSearch.keywordsPlaceholder")}
								disabled={fbUnifiedSearchStreaming}
								removeItemAriaLabel={(value) => t("sys.workbench.facebookSearch.removeChipAria", { value })}
							/>
							<div className="grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-5">
								<div className="space-y-2">
									<Label htmlFor="fbus-type">{t("sys.workbench.facebookSearch.searchTypeLabel")}</Label>
									<Select
										disabled={fbUnifiedSearchStreaming}
										value={fbUnifiedSearchType}
										onValueChange={(v) => setFbUnifiedSearchType(v as FacebookUnifiedSearchType)}
									>
										<SelectTrigger id="fbus-type" className="h-9 w-full min-w-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="account">{t("sys.workbench.facebookSearch.typeAccount")}</SelectItem>
											<SelectItem value="url">{t("sys.workbench.facebookSearch.typeUrl")}</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="fbus-mp">{t("sys.workbench.facebookSearch.maxPostsLabel")}</Label>
									<Input
										id="fbus-mp"
										type="number"
										className="h-9"
										value={optionalFiniteNumberDisplay(fbUnifiedMaxPosts)}
										onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setFbUnifiedMaxPosts)}
										disabled={fbUnifiedSearchStreaming}
									/>
								</div>
							</div>
							<div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
								<PeriodHoursPresetSelect
									id="fbus-ph"
									label={t("sys.workbench.facebookSearch.periodHoursLabel")}
									value={fbUnifiedPeriodHours}
									onHoursChange={setFbUnifiedPeriodHours}
									disabled={fbUnifiedSearchStreaming}
								/>
								<div className="space-y-2">
									<Label htmlFor="fbus-lang-select">{t("sys.workbench.facebookSearch.languageLabel")}</Label>
									<Select
										disabled={fbUnifiedSearchStreaming}
										value={fbUnifiedLanguageSelectValue}
										onValueChange={(next) => setFbUnifiedLanguage(next === LANGUAGE_SELECT_OMIT ? "" : next)}
									>
										<SelectTrigger id="fbus-lang-select" className="h-9 w-full min-w-0">
											<SelectValue />
										</SelectTrigger>
										<SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
											<SelectItem value={LANGUAGE_SELECT_OMIT}>
												{t("sys.telegramSearch.languageOption.omit")}
											</SelectItem>
											{COMMENT_API_LANGUAGE_CODES.map((code) => (
												<SelectItem key={code} value={code}>
													{t(`sys.telegramSearch.languageOption.${code}`)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<Button
								className="w-full sm:w-auto"
								disabled={fbUnifiedKeywords.length === 0 || fbUnifiedSearchStreaming}
								onClick={runFacebookUnifiedSearch}
							>
								{fbUnifiedSearchStreaming
									? t("sys.workbench.facebookSearch.running")
									: t("sys.workbench.facebookSearch.run")}
							</Button>
							<SearchStreamProgress
								active={fbUnifiedSearchStreaming}
								storageKey="workbench-fb-unified-search"
								steps={fbUnifiedSearchStreamSteps}
								title={t("sys.workbench.facebookSearch.streamProgressTitle")}
								subtitle={t("sys.workbench.facebookSearch.streamProgressSubtitle")}
								waitingText={t("sys.workbench.facebookSearch.streamProgressWaiting")}
								runningLabel={t("sys.workbench.facebookSearch.running")}
							/>
							<ApiResultView
								value={
									fbUnifiedSearchData !== undefined
										? fbUnifiedSearchData
										: fbUnifiedSearchError !== null
											? fbUnifiedSearchError
											: undefined
								}
							/>
						</div>
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
									value={optionalFiniteNumberDisplay(fbMaxPosts)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setFbMaxPosts)}
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
						<div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
							<div className="space-y-2">
								<Label htmlFor="fbposturl">{t("sys.workbench.facebook.postUrlLabel")}</Label>
								<Input
									id="fbposturl"
									value={fbPostCommentsUrl}
									onChange={(event) => setFbPostCommentsUrl(event.target.value)}
								/>
							</div>
						</div>

						<div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
							<div className="space-y-3">
								<Label className="text-sm font-medium">{t("sys.workbench.facebook.postModeLabel")}</Label>
								<RadioGroup
									value={fbPostCommentsMode}
									onValueChange={(value) => setFbPostCommentsMode(value as FbPostCommentsMode)}
									className="grid gap-3 sm:grid-cols-2"
								>
									<div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
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
									<div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
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
										value={optionalFiniteNumberDisplay(fbGenerateCount)}
										onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setFbGenerateCount)}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="fbps">{t("sys.workbench.facebook.periodSecondsLabel")}</Label>
							<Input
								id="fbps"
								type="number"
								value={optionalFiniteNumberDisplay(fbPostPeriodSeconds)}
								onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setFbPostPeriodSeconds)}
							/>
						</div>
						<Button
							className="w-full sm:w-auto"
							disabled={
								!fbPostCommentsUrl.trim() ||
								fbPostStreaming ||
								(fbPostCommentsMode === "manual" && linesToArray(fbCommentsText).length === 0) ||
								(fbPostCommentsMode === "auto" && (fbGenerateCount === "" || fbGenerateCount < 1)) ||
								fbPostPeriodSeconds === ""
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
