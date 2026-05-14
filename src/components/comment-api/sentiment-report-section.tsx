import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { commentCommentsService } from "@/api/services/comment";
import { ApiJsonPreview, ApiLongRunningNotice } from "@/components/comment-api/api-result";
import { WorkflowShell } from "@/components/comment-api/executive-ui";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { buildCommentExportFilename, downloadBlob } from "@/utils/download-blob";

export function SentimentReportSection() {
	const { t } = useTranslation();
	const [statsPostUrl, setStatsPostUrl] = useState("");

	const exportMutation = useMutation({
		mutationFn: async (format: "json" | "csv") => {
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
			<div className="flex flex-col gap-4">
				<div className="rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
					<div className="space-y-2">
						<Label htmlFor="stats-url">{t("sys.analysis.instagramPostUrlLabel")}</Label>
						<Input
							id="stats-url"
							value={statsPostUrl}
							onChange={(event) => setStatsPostUrl(event.target.value)}
							placeholder={t("sys.analysis.postUrlPlaceholder")}
						/>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						disabled={!statsPostUrl.trim() || exportMutation.isPending}
						onClick={() => exportMutation.mutate("json")}
					>
						{t("sys.analysis.exportJson")}
					</Button>
					<Button
						className="w-full sm:w-auto"
						disabled={!statsPostUrl.trim() || exportMutation.isPending}
						onClick={() => exportMutation.mutate("csv")}
					>
						{t("sys.analysis.exportCsv")}
					</Button>
				</div>
			</div>
			<ApiLongRunningNotice active={exportMutation.isPending} storageKey="analysis-stats" />
			{exportMutation.isError && <ApiJsonPreview value={exportMutation.error} />}
		</WorkflowShell>
	);
}
