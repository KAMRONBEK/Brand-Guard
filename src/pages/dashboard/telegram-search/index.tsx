import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { commentHealthService, commentTelegramService } from "@/api/services/comment";
import { ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { SearchStreamProgress, type SearchStreamStepRow } from "@/components/comment-api/search-stream-progress";
import { isTelegramSearchPayload, TelegramSearchResultView } from "@/components/comment-api/telegram-search-result";
import { MultiValueChipInput } from "@/components/form/multi-value-chip-input";
import Icon from "@/components/icon/icon";
import { PeriodHoursPresetSelect } from "@/components/period-hours-preset-select";
import { DEFAULT_COMMENT_API_LANGUAGE_HINT } from "@/constants/api-defaults";
import type { TelegramSearchRequest } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { Text, Title } from "@/ui/typography";
import { getSearchStreamProgressStep, mergeSearchStreamChunk } from "@/utils/mergeSearchStreamChunk";
import {
	type OptionalFiniteNumber,
	optionalFiniteNumberDisplay,
	setOptionalFiniteNumberFromInput,
} from "@/utils/optional-number-input";
import {
	clearWorkflowSnapshot,
	errorToCached,
	readWorkflowSnapshot,
	WORKFLOW_CACHE_VERSION,
	writeWorkflowSnapshot,
	WORKFLOW_SNAPSHOT_IDS,
} from "@/utils/workflow-session-cache";

const TG_CACHE_NS = WORKFLOW_SNAPSHOT_IDS.telegramSearch;
const TELEGRAM_SEARCH_MAX_PER_HIT = 150;
const TELEGRAM_DEFAULT_MAX_COMMENTS_PER_POST = 25;
const TELEGRAM_DEFAULT_MIN_NEGATIVE_COMMENT_RATIO = 0.5;

const LANGUAGE_SELECT_OMIT = "__language_omit__" as const;
const TELEGRAM_LANGUAGE_CODES = ["ru", "en", "uz"] as const;

/** Plain usernames become @handles; URLs and explicit @handles are unchanged. */
function normalizeTelegramChannelSegment(segment: string): string {
	const s = segment.trim();
	if (s === "") return s;
	const lower = s.toLowerCase();
	if (lower.startsWith("http://") || lower.startsWith("https://")) return s;
	if (lower.startsWith("t.me/") || lower.startsWith("telegram.me/")) return s;
	if (s.startsWith("@")) return s;
	return `@${s}`;
}

export default function TelegramSearchPage() {
	const { t } = useTranslation();
	const persisted = readWorkflowSnapshot<TelegramSearchRequest>(TG_CACHE_NS);

	const [healthEnabled, setHealthEnabled] = useState(true);
	const healthQuery = useQuery({
		queryKey: ["comment-api", "health"],
		queryFn: () => commentHealthService.health(),
		enabled: healthEnabled,
		refetchInterval: 60_000,
		staleTime: 1000 * 60 * 30,
	});

	const [keywords, setKeywords] = useState<string[]>(() => persisted?.inputs.keywords ?? []);
	const [channels, setChannels] = useState<string[]>(() => persisted?.inputs.channels ?? []);
	const [periodHours, setPeriodHours] = useState(() => persisted?.inputs.period_hours ?? 168);
	const [language, setLanguage] = useState(() => persisted?.inputs.language ?? DEFAULT_COMMENT_API_LANGUAGE_HINT);
	const [includeComments, setIncludeComments] = useState(() => persisted?.inputs.include_comments === true);
	const [maxCommentsPerPost, setMaxCommentsPerPost] = useState<OptionalFiniteNumber>(() => {
		const m = persisted?.inputs.max_comments_per_post;
		return typeof m === "number" ? m : TELEGRAM_DEFAULT_MAX_COMMENTS_PER_POST;
	});
	const abortRef = useRef<AbortController | null>(null);
	const mergedPayloadRef = useRef<unknown | undefined>(persisted?.result ?? undefined);
	const streamErrorRef = useRef<Error | null>(null);
	const streamStepIdRef = useRef(0);
	const [streamSteps, setStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [resultData, setResultData] = useState<unknown | undefined>(() => persisted?.result ?? undefined);
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<Error | null>(() => {
		if (!persisted?.error) return null;
		const e = new Error(persisted.error.message);
		e.name = persisted.error.name;
		return e;
	});
	const [hasStartedTelegramSearch, setHasStartedTelegramSearch] = useState(() =>
		Boolean(persisted && (persisted.result != null || persisted.error != null)),
	);

	const persistOutcome = (body: TelegramSearchRequest, payload: unknown | undefined, streamErr: Error | null) => {
		const snapshot = {
			version: WORKFLOW_CACHE_VERSION as typeof WORKFLOW_CACHE_VERSION,
			savedAt: Date.now(),
			inputs: body,
			result: streamErr !== null ? null : (payload ?? null),
			error: errorToCached(streamErr),
		};
		const w = writeWorkflowSnapshot(TG_CACHE_NS, snapshot);
		if (w === "quota") {
			toast.error(t("sys.workflowCache.quotaExceeded"));
		}
	};

	const handleClearPersistedOutcome = () => {
		clearWorkflowSnapshot(TG_CACHE_NS);
		mergedPayloadRef.current = undefined;
		streamErrorRef.current = null;
		setKeywords([]);
		setChannels([]);
		setPeriodHours(168);
		setLanguage(DEFAULT_COMMENT_API_LANGUAGE_HINT);
		setIncludeComments(false);
		setMaxCommentsPerPost(TELEGRAM_DEFAULT_MAX_COMMENTS_PER_POST);
		setStreamSteps([]);
		setResultData(undefined);
		setError(null);
		setHasStartedTelegramSearch(false);
	};

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const languageSelectValue = language.trim() === "" ? LANGUAGE_SELECT_OMIT : language.trim();

	const canRun =
		keywords.length > 0 && channels.length > 0 && !streaming && (!includeComments || maxCommentsPerPost !== "");

	const runSearch = () => {
		const maxComments =
			maxCommentsPerPost === ""
				? TELEGRAM_DEFAULT_MAX_COMMENTS_PER_POST
				: Number.isFinite(maxCommentsPerPost) && maxCommentsPerPost >= 1
					? Math.floor(maxCommentsPerPost)
					: TELEGRAM_DEFAULT_MAX_COMMENTS_PER_POST;

		const body: TelegramSearchRequest = {
			keywords,
			channels,
			period_hours: periodHours,
			max_per_hit: TELEGRAM_SEARCH_MAX_PER_HIT,
			...(language.trim() !== "" ? { language: language.trim() } : {}),
			...(includeComments
				? {
						include_comments: true,
						max_comments_per_post: maxComments,
						min_negative_comment_ratio: TELEGRAM_DEFAULT_MIN_NEGATIVE_COMMENT_RATIO,
					}
				: {}),
		};
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		setError(null);
		setResultData(undefined);
		streamErrorRef.current = null;
		setHasStartedTelegramSearch(true);
		streamStepIdRef.current = 0;
		setStreamSteps([]);
		setStreaming(true);

		void commentTelegramService
			.searchStream(body, {
				signal: ac.signal,
				onEvent: (chunk) => {
					const progressStep = getSearchStreamProgressStep(chunk);
					if (progressStep !== null) {
						const id = ++streamStepIdRef.current;
						setStreamSteps((prev) => [...prev, { id, ...progressStep }]);
						return;
					}
					setResultData((prev: unknown) => {
						const next = mergeSearchStreamChunk(prev, chunk);
						mergedPayloadRef.current = next;
						return next;
					});
				},
			})
			.catch((err: unknown) => {
				const normalized = err instanceof Error ? err : new Error(String(err));
				streamErrorRef.current = normalized;
				setError(normalized);
			})
			.finally(() => {
				if (abortRef.current === ac) {
					setStreaming(false);
					persistOutcome(body, mergedPayloadRef.current, streamErrorRef.current);
					setStreamSteps([]);
				}
			});
	};

	const displayValue = resultData !== undefined ? resultData : error !== null ? error : undefined;
	const showTelegramRich =
		displayValue !== undefined && !(displayValue instanceof Error) && isTelegramSearchPayload(displayValue);

	return (
		<div className="flex w-full flex-col gap-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<Title as="h2" className="text-xl font-semibold">
						{t("sys.telegramSearch.title")}
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						{t("sys.telegramSearch.subtitle")}
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

			<WorkflowShell
				title={t("sys.telegramSearch.cardTitle")}
				description={t("sys.telegramSearch.hint")}
				platform="Telegram"
				intent={t("sys.workbench.intent.discovery")}
			>
				<div className="flex flex-col gap-4">
					<div className="grid gap-4 sm:grid-cols-2 sm:items-start sm:gap-5">
						<MultiValueChipInput
							className="min-w-0"
							id="tg-keywords"
							label={t("sys.telegramSearch.keywordsLabel")}
							hint={t("sys.telegramSearch.chipCommitHint")}
							values={keywords}
							onChange={setKeywords}
							placeholder={t("sys.telegramSearch.keywordsPlaceholder")}
							disabled={streaming}
							removeItemAriaLabel={(value) => t("sys.telegramSearch.removeChipAria", { value })}
						/>
						<MultiValueChipInput
							className="min-w-0"
							id="tg-channels"
							label={t("sys.telegramSearch.channelsLabel")}
							hint={t("sys.telegramSearch.chipCommitHint")}
							values={channels}
							onChange={setChannels}
							normalizeSegment={normalizeTelegramChannelSegment}
							placeholder={t("sys.telegramSearch.channelsPlaceholder")}
							disabled={streaming}
							removeItemAriaLabel={(value) => t("sys.telegramSearch.removeChipAria", { value })}
						/>
					</div>
					<div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
						<div
							className={
								streaming
									? "pointer-events-none flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-muted/25 px-4 py-3 opacity-70"
									: "flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-muted/25 px-4 py-3"
							}
						>
							<label
								htmlFor="tg-include-comments"
								className="flex cursor-pointer flex-row items-start justify-between gap-3 select-none sm:items-center"
							>
								<div className="min-w-0 flex-1 space-y-0.5 pr-2">
									<span className="block text-sm font-medium leading-none">
										{t("sys.telegramSearch.includeCommentsLabel")}
									</span>
									<span className="block text-xs font-normal text-muted-foreground">
										{t("sys.telegramSearch.includeCommentsHint")}
									</span>
								</div>
								<Switch
									id="tg-include-comments"
									checked={includeComments}
									onCheckedChange={(checked) => setIncludeComments(checked === true)}
									disabled={streaming}
									className="mt-1 shrink-0 sm:mt-0"
								/>
							</label>
							<div
								className={`flex w-full min-w-0 max-w-[8.5rem] flex-col gap-1.5 border-t border-border/60 pt-3 ${includeComments ? "" : "opacity-40"}`}
							>
								<Label htmlFor="tg-max-comments" className="text-sm leading-tight text-muted-foreground">
									{t("sys.telegramSearch.maxCommentsPerPostShortLabel")}
								</Label>
								<Input
									id="tg-max-comments"
									type="number"
									min={1}
									className="h-9 w-full sm:w-24"
									value={optionalFiniteNumberDisplay(maxCommentsPerPost)}
									onChange={(event) => setOptionalFiniteNumberFromInput(event.target.value, setMaxCommentsPerPost)}
									placeholder={t("sys.telegramSearch.maxCommentsPerPostPlaceholder")}
									disabled={streaming || !includeComments}
								/>
							</div>
						</div>

						<div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
							<div className="w-full min-w-0 flex-1 sm:min-w-[10rem] sm:max-w-[220px]">
								<PeriodHoursPresetSelect
									id="tg-ph"
									label={t("sys.telegramSearch.periodHoursLabel")}
									value={periodHours}
									onHoursChange={setPeriodHours}
									disabled={streaming}
								/>
							</div>
							<div className="w-full min-w-0 flex-1 space-y-2 sm:min-w-[9rem] sm:max-w-[180px]">
								<Label htmlFor="tg-lang-select" className="text-sm">
									{t("sys.telegramSearch.languageLabel")}
								</Label>
								<Select
									disabled={streaming}
									value={languageSelectValue}
									onValueChange={(next) => setLanguage(next === LANGUAGE_SELECT_OMIT ? "" : next)}
								>
									<SelectTrigger id="tg-lang-select" className="h-9 w-full min-w-0">
										<SelectValue />
									</SelectTrigger>
									<SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
										<SelectItem value={LANGUAGE_SELECT_OMIT}>{t("sys.telegramSearch.languageOption.omit")}</SelectItem>
										{TELEGRAM_LANGUAGE_CODES.map((code) => (
											<SelectItem key={code} value={code}>
												{t(`sys.telegramSearch.languageOption.${code}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button className="w-full sm:w-auto" disabled={!canRun} onClick={runSearch}>
						{streaming ? t("sys.telegramSearch.running") : t("sys.telegramSearch.run")}
					</Button>
					<Button type="button" variant="outline" disabled={streaming} onClick={handleClearPersistedOutcome}>
						{t("sys.workflowCache.clearOutcome")}
					</Button>
				</div>
				<SearchStreamProgress
					active={streaming}
					storageKey="telegram-search-stream"
					title={t("sys.telegramSearch.streamProgressTitle")}
					subtitle={t("sys.telegramSearch.streamProgressSubtitle")}
					waitingText={t("sys.telegramSearch.streamProgressWaiting")}
					runningLabel={t("sys.telegramSearch.running")}
					steps={streamSteps}
				/>
				{showTelegramRich ? (
					<TelegramSearchResultView value={displayValue} />
				) : (
					<ApiResultView value={displayValue} suppressReadyPlaceholder={streaming || hasStartedTelegramSearch} />
				)}
			</WorkflowShell>
		</div>
	);
}
