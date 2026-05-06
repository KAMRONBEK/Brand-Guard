import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import Icon from "@/components/icon/icon";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";
import type { SearchStreamProgressStepPayload } from "@/utils/mergeSearchStreamChunk";

const LOADING_START_TIMES = new Map<string, number>();

export type SearchStreamStepRow = SearchStreamProgressStepPayload & { id: number };

function formatElapsed(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function phaseIcon(phase: string): string {
	const p = phase.toLowerCase();
	if (p === "request") return "mdi:clipboard-text-outline";
	if (p === "browser") return "mdi:web";
	if (p === "search") return "mdi:magnify";
	if (p === "analyze") return "mdi:chart-box-outline";
	return "mdi:progress-clock";
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "info" | "error" {
	const s = status.toLowerCase();
	if (s.includes("done") || s.includes("ready") || s.includes("accepted")) return "success";
	if (s.includes("error") || s.includes("fail")) return "error";
	if (s.includes("starting") || s.includes("launching")) return "info";
	return "secondary";
}

export function SearchStreamProgress({
	active,
	steps,
	storageKey,
}: {
	active: boolean;
	steps: ReadonlyArray<SearchStreamStepRow>;
	storageKey?: string;
}) {
	const { t } = useTranslation();
	const location = useLocation();
	const [seconds, setSeconds] = useState(0);
	const startedAtMsRef = useRef<number | null>(null);
	const wasActiveRef = useRef(false);
	const listRef = useRef<HTMLDivElement>(null);
	const noticeKey = storageKey ?? `${location.pathname}::search-stream-progress`;

	useEffect(() => {
		if (!active) {
			if (wasActiveRef.current) {
				LOADING_START_TIMES.delete(noticeKey);
			}
			wasActiveRef.current = false;
			startedAtMsRef.current = null;
			setSeconds(0);
			return undefined;
		}
		wasActiveRef.current = true;
		if (startedAtMsRef.current === null) {
			startedAtMsRef.current = LOADING_START_TIMES.get(noticeKey) ?? Date.now();
			LOADING_START_TIMES.set(noticeKey, startedAtMsRef.current);
		}
		const syncElapsed = () => {
			const started = startedAtMsRef.current;
			if (started === null) return;
			setSeconds(Math.floor((Date.now() - started) / 1000));
		};
		syncElapsed();
		const timer = window.setInterval(syncElapsed, 1000);
		const onResume = () => syncElapsed();
		document.addEventListener("visibilitychange", onResume);
		window.addEventListener("focus", onResume);
		window.addEventListener("pageshow", onResume);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", onResume);
			window.removeEventListener("focus", onResume);
			window.removeEventListener("pageshow", onResume);
		};
	}, [active, noticeKey]);

	useEffect(() => {
		const el = listRef.current;
		if (!el || steps.length === 0) return;
		el.scrollTop = el.scrollHeight;
	}, [steps]);

	if (!active) return null;

	return (
		<Card className="border-primary/20 bg-primary/5">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<CardTitle className="text-base">{t("sys.workbench.search.streamProgressTitle")}</CardTitle>
						<Text variant="caption" className="text-muted-foreground">
							{t("sys.workbench.search.streamProgressSubtitle")}
						</Text>
					</div>
					<div className="flex items-center gap-2">
						{active && (
							<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
								<span className="size-2 rounded-full bg-primary/80 animate-pulse" />
								{t("sys.workbench.search.running")}
							</span>
						)}
						<Badge variant="info" className="shrink-0 font-mono">
							{formatElapsed(seconds)}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div
					ref={listRef}
					className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-2 pr-1"
				>
					{steps.length === 0 ? (
						<Text variant="caption" className="block px-2 py-4 text-muted-foreground">
							{t("sys.workbench.search.streamProgressWaiting")}
						</Text>
					) : (
						steps.map((row, index) => {
							const isCurrent = index === steps.length - 1;
							return (
								<div
									key={row.id}
									className={`flex min-w-0 gap-3 rounded-lg px-2 py-2.5 ${
										isCurrent ? "bg-primary/10 ring-1 ring-primary/20" : ""
									}`}
								>
									<div className="flex shrink-0 items-start pt-0.5">
										<Icon icon={phaseIcon(row.phase)} size={22} className="text-primary" />
									</div>
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
												{row.phase}
											</span>
											<Badge variant={statusBadgeVariant(row.status)} className="text-xs capitalize">
												{row.status.replace(/_/g, " ")}
											</Badge>
										</div>
										{row.detail !== undefined && row.detail !== "" && (
											<Text variant="caption" className="block break-words text-muted-foreground">
												{row.detail}
											</Text>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</CardContent>
		</Card>
	);
}
