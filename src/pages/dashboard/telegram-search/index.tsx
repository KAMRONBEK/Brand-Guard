import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { commentHealthService, commentTelegramService } from "@/api/services/comment";
import { ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { SearchStreamProgress, type SearchStreamStepRow } from "@/components/comment-api/search-stream-progress";
import { isTelegramSearchPayload, TelegramSearchResultView } from "@/components/comment-api/telegram-search-result";
import Icon from "@/components/icon/icon";
import type { TelegramSearchRequest } from "@/types/comment-api";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import { getSearchStreamProgressStep, mergeSearchStreamChunk } from "@/utils/mergeSearchStreamChunk";

const CACHE_TIME = 1000 * 60 * 30;

function linesToList(value: string): string[] {
	return value
		.split("\n")
		.map((item) => item.trim())
		.filter(Boolean);
}

export default function TelegramSearchPage() {
	const { t } = useTranslation();
	const [healthEnabled, setHealthEnabled] = useState(true);
	const healthQuery = useQuery({
		queryKey: ["comment-api", "health"],
		queryFn: () => commentHealthService.health(),
		enabled: healthEnabled,
		refetchInterval: 60_000,
		staleTime: CACHE_TIME,
	});

	const [keywordsText, setKeywordsText] = useState("");
	const [channelsText, setChannelsText] = useState("");
	const [periodHours, setPeriodHours] = useState(24);
	const [language, setLanguage] = useState("");
	const [maxPerHit, setMaxPerHit] = useState(20);
	const abortRef = useRef<AbortController | null>(null);
	const streamStepIdRef = useRef(0);
	const [streamSteps, setStreamSteps] = useState<SearchStreamStepRow[]>([]);
	const [resultData, setResultData] = useState<unknown>();
	const [streaming, setStreaming] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const keywords = linesToList(keywordsText);
	const channels = linesToList(channelsText);
	const canRun = keywords.length > 0 && channels.length > 0 && !streaming;

	const runSearch = () => {
		const body: TelegramSearchRequest = {
			keywords,
			channels,
			period_hours: Number.isFinite(periodHours) && periodHours > 0 ? periodHours : 24,
			...(language.trim() !== "" ? { language: language.trim() } : {}),
			max_per_hit: Number.isFinite(maxPerHit) && maxPerHit >= 0 ? maxPerHit : 0,
		};
		abortRef.current?.abort();
		const ac = new AbortController();
		abortRef.current = ac;
		setError(null);
		setResultData(undefined);
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
					setResultData((prev: unknown) => mergeSearchStreamChunk(prev, chunk));
				},
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err : new Error(String(err)));
			})
			.finally(() => {
				if (abortRef.current === ac) {
					setStreaming(false);
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
				<div className="grid gap-3 lg:grid-cols-2">
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="tg-keywords">{t("sys.telegramSearch.keywordsLabel")}</Label>
						<Textarea
							id="tg-keywords"
							className="min-h-[88px]"
							value={keywordsText}
							onChange={(event) => setKeywordsText(event.target.value)}
							placeholder={t("sys.telegramSearch.keywordsPlaceholder")}
						/>
					</div>
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="tg-channels">{t("sys.telegramSearch.channelsLabel")}</Label>
						<Textarea
							id="tg-channels"
							className="min-h-[88px]"
							value={channelsText}
							onChange={(event) => setChannelsText(event.target.value)}
							placeholder={t("sys.telegramSearch.channelsPlaceholder")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="tg-ph">{t("sys.telegramSearch.periodHoursLabel")}</Label>
						<Input
							id="tg-ph"
							type="number"
							min={1}
							value={periodHours}
							onChange={(event) => setPeriodHours(Number(event.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="tg-max">{t("sys.telegramSearch.maxPerHitLabel")}</Label>
						<Input
							id="tg-max"
							type="number"
							min={0}
							value={maxPerHit}
							onChange={(event) => setMaxPerHit(Number(event.target.value))}
						/>
					</div>
					<div className="space-y-2 lg:col-span-2">
						<Label htmlFor="tg-lang">{t("sys.telegramSearch.languageLabel")}</Label>
						<Input
							id="tg-lang"
							value={language}
							onChange={(event) => setLanguage(event.target.value)}
							placeholder={t("sys.telegramSearch.languagePlaceholder")}
						/>
					</div>
				</div>
				<Button disabled={!canRun} onClick={runSearch}>
					{streaming ? t("sys.telegramSearch.running") : t("sys.telegramSearch.run")}
				</Button>
				<SearchStreamProgress
					active={streaming}
					storageKey="telegram-search-stream"
					title={t("sys.telegramSearch.streamProgressTitle")}
					subtitle={t("sys.telegramSearch.streamProgressSubtitle")}
					waitingText={t("sys.telegramSearch.streamProgressWaiting")}
					runningLabel={t("sys.telegramSearch.running")}
					steps={streamSteps}
				/>
				{showTelegramRich ? <TelegramSearchResultView value={displayValue} /> : <ApiResultView value={displayValue} />}
			</WorkflowShell>
		</div>
	);
}
