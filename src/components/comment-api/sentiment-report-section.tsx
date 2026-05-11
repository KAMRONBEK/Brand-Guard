import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { commentCommentsService } from "@/api/services/comment";
import { ApiJsonPreview, ApiLongRunningNotice, ApiResultView } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { commentsJsonBlobToXlsxBlob } from "@/utils/commentExportXlsx";
import { buildCommentExportFilename, downloadBlob } from "@/utils/download-blob";

const CACHE_TIME = 1000 * 60 * 30;

export function SentimentReportSection() {
	const { t } = useTranslation();
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
		mutationFn: async (format: "json" | "csv" | "xlsx") => {
			if (format === "xlsx") {
				const jsonBlob = await commentCommentsService.exportComments({
					post_url: statsPostUrl.trim(),
					format: "json",
				});
				const xlsxBlob = await commentsJsonBlobToXlsxBlob(jsonBlob);
				downloadBlob(xlsxBlob, buildCommentExportFilename(statsPostUrl, "xlsx"));
				return;
			}
			const blob = await commentCommentsService.exportComments({
				post_url: statsPostUrl.trim(),
				format,
			});
			downloadBlob(blob, buildCommentExportFilename(statsPostUrl, format));
		},
	});

	return (
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
				<Button
					variant="secondary"
					disabled={!statsPostUrl.trim() || exportMutation.isPending}
					onClick={() => exportMutation.mutate("xlsx")}
				>
					{t("sys.analysis.exportXlsx")}
				</Button>
			</div>
			<ApiLongRunningNotice active={statsQuery.isFetching || exportMutation.isPending} storageKey="analysis-stats" />
			<ApiResultView value={statsQuery.data ?? (statsQuery.isError ? statsQuery.error : undefined)} />
			{exportMutation.isError && <ApiJsonPreview value={exportMutation.error} />}
		</WorkflowShell>
	);
}
