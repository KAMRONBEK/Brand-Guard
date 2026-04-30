import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { commentAnalyzeService, commentCommentsService } from "@/api/services/comment";
import { Chart, useChart } from "@/components/chart";
import Icon from "@/components/icon/icon";
import type { SentimentFilter } from "@/types/comment-api";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import { buildCommentExportFilename, downloadBlob } from "@/utils/download-blob";

function serializePreview(data: unknown, error: unknown): unknown {
	if (data !== undefined) return data;
	if (error instanceof Error) return { message: error.message };
	return error;
}

function extractNumericEntries(stats: unknown): { labels: string[]; values: number[] } {
	if (!stats || typeof stats !== "object") return { labels: [], values: [] };
	const entries = Object.entries(stats as Record<string, unknown>).filter(([, v]) => typeof v === "number");
	return {
		labels: entries.map(([k]) => k),
		values: entries.map(([, v]) => Number(v)),
	};
}

function extractCommentsRows(payload: unknown): Record<string, unknown>[] {
	if (Array.isArray(payload)) return payload as Record<string, unknown>[];
	if (payload && typeof payload === "object") {
		const o = payload as Record<string, unknown>;
		for (const key of ["comments", "data", "items", "rows"]) {
			const v = o[key];
			if (Array.isArray(v)) return v as Record<string, unknown>[];
		}
	}
	return [];
}

export default function AnalysisPage() {
	const { t } = useTranslation();
	const [postUrl, setPostUrl] = useState("");
	const [sentiment, setSentiment] = useState<SentimentFilter | "all">("all");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(50);

	const statsQuery = useQuery({
		queryKey: ["comment-api", "comments-stats", postUrl],
		queryFn: () => commentCommentsService.stats(postUrl),
		enabled: Boolean(postUrl.trim()),
	});

	const commentsQuery = useQuery({
		queryKey: ["comment-api", "comments-list", postUrl, sentiment, page, limit],
		queryFn: () =>
			commentCommentsService.listComments({
				post_url: postUrl,
				page,
				limit,
				...(sentiment === "all" ? {} : { sentiment }),
			}),
		enabled: Boolean(postUrl.trim()),
	});

	const fetchMutation = useMutation({
		mutationFn: () => commentCommentsService.fetchComments({ url: postUrl.trim() }),
		onSuccess: () => {
			void statsQuery.refetch();
			void commentsQuery.refetch();
		},
	});

	const exportMutation = useMutation({
		mutationFn: async (format: "json" | "csv") => {
			const blob = await commentCommentsService.exportComments({
				post_url: postUrl,
				format,
				...(sentiment === "all" ? {} : { sentiment }),
			});
			downloadBlob(blob, buildCommentExportFilename(postUrl, format));
		},
	});

	const chartData = useMemo(() => extractNumericEntries(statsQuery.data), [statsQuery.data]);
	const chartOptions = useChart({
		chart: { toolbar: { show: false } },
		xaxis: { categories: chartData.labels },
		plotOptions: { bar: { borderRadius: 4 } },
		dataLabels: { enabled: false },
	});

	const rows = useMemo(() => extractCommentsRows(commentsQuery.data), [commentsQuery.data]);

	const [username, setUsername] = useState("");
	const [maxPosts, setMaxPosts] = useState(10);
	const analyzeMutation = useMutation({
		mutationFn: () => commentAnalyzeService.analyzeAccount({ username, max_posts: maxPosts }),
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

			<Tabs defaultValue="post" className="w-full">
				<TabsList>
					<TabsTrigger value="post">{t("sys.analysis.tabPost")}</TabsTrigger>
					<TabsTrigger value="account">{t("sys.analysis.tabAccount")}</TabsTrigger>
				</TabsList>

				<TabsContent value="post" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.analysis.postUrlCardTitle")}</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="flex-1 space-y-2">
								<Label htmlFor="pu">{t("sys.analysis.instagramPostUrlLabel")}</Label>
								<Input
									id="pu"
									value={postUrl}
									onChange={(e) => setPostUrl(e.target.value)}
									placeholder={t("sys.analysis.postUrlPlaceholder")}
								/>
							</div>
							<Button disabled={!postUrl.trim() || fetchMutation.isPending} onClick={() => fetchMutation.mutate()}>
								{fetchMutation.isPending ? t("sys.analysis.fetching") : t("sys.analysis.fetchAnalyze")}
							</Button>
						</CardContent>
					</Card>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>{t("sys.analysis.statsCardTitle")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{chartData.labels.length > 0 ? (
									<Chart
										type="bar"
										height={260}
										options={chartOptions}
										series={[{ name: t("sys.analysis.chartSeriesName"), data: chartData.values }]}
									/>
								) : (
									<Text variant="caption" className="text-muted-foreground">
										{t("sys.analysis.statsEmpty")}
									</Text>
								)}
								<pre className="text-xs bg-muted rounded-md p-3 max-h-48 overflow-auto border">
									{JSON.stringify(statsQuery.data ?? {}, null, 2)}
								</pre>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>{t("sys.analysis.commentsCardTitle")}</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<div className="grid gap-3 sm:grid-cols-3">
									<div className="space-y-2">
										<Label>{t("sys.analysis.sentimentLabel")}</Label>
										<Select value={sentiment} onValueChange={(v) => setSentiment(v as SentimentFilter | "all")}>
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
											value={page}
											onChange={(e) => setPage(Number(e.target.value) || 1)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lm">{t("sys.analysis.limitLabel")}</Label>
										<Input
											id="lm"
											type="number"
											min={1}
											value={limit}
											onChange={(e) => setLimit(Number(e.target.value) || 50)}
										/>
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={!postUrl.trim()}
										onClick={() => void commentsQuery.refetch()}
									>
										<Icon icon="mdi:refresh" size={16} /> {t("sys.analysis.refreshList")}
									</Button>
									<Button
										size="sm"
										variant="secondary"
										disabled={!postUrl.trim() || exportMutation.isPending}
										onClick={() => exportMutation.mutate("json")}
									>
										{t("sys.analysis.exportJson")}
									</Button>
									<Button
										size="sm"
										disabled={!postUrl.trim() || exportMutation.isPending}
										onClick={() => exportMutation.mutate("csv")}
									>
										{t("sys.analysis.exportCsv")}
									</Button>
								</div>
								<div className="overflow-x-auto rounded-md border">
									<table className="w-full text-sm">
										<thead className="bg-muted">
											<tr>
												<th className="p-2 text-left">{t("sys.analysis.tableIndex")}</th>
												<th className="p-2 text-left">{t("sys.analysis.tablePreview")}</th>
											</tr>
										</thead>
										<tbody>
											{rows.length === 0 ? (
												<tr>
													<td colSpan={2} className="p-4 text-muted-foreground">
														{t("sys.analysis.noRows")}
													</td>
												</tr>
											) : (
												rows.map((row, idx) => (
													<tr
														key={
															typeof row.id === "string" || typeof row.id === "number"
																? String(row.id)
																: `row-${JSON.stringify(row).slice(0, 120)}`
														}
														className="border-t"
													>
														<td className="p-2 align-top">{idx + 1}</td>
														<td className="p-2 font-mono text-xs whitespace-pre-wrap break-all">
															{JSON.stringify(row)}
														</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
								<pre className="text-xs bg-muted rounded-md p-3 max-h-56 overflow-auto border">
									{JSON.stringify(serializePreview(commentsQuery.data, commentsQuery.error), null, 2)}
								</pre>
							</CardContent>
						</Card>
					</div>

					<pre className="text-xs bg-muted rounded-md p-3 max-h-48 overflow-auto border">
						{JSON.stringify(serializePreview(fetchMutation.data, fetchMutation.error), null, 2)}
					</pre>
				</TabsContent>

				<TabsContent value="account">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.analysis.accountCardTitle")}</CardTitle>
							<Text variant="caption" className="text-muted-foreground">
								{t("sys.analysis.accountCardHint")}
							</Text>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 max-w-xl">
							<div className="space-y-2">
								<Label htmlFor="un">{t("sys.analysis.usernameLabel")}</Label>
								<Input
									id="un"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder={t("sys.analysis.usernamePlaceholder")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="mx">{t("sys.analysis.maxPostsLabel")}</Label>
								<Input id="mx" type="number" value={maxPosts} onChange={(e) => setMaxPosts(Number(e.target.value))} />
							</div>
							<Button disabled={!username.trim() || analyzeMutation.isPending} onClick={() => analyzeMutation.mutate()}>
								{analyzeMutation.isPending ? t("sys.analysis.analyzing") : t("sys.analysis.runAccountAnalyze")}
							</Button>
							<pre className="text-xs bg-muted rounded-md p-3 max-h-[480px] overflow-auto border">
								{JSON.stringify(serializePreview(analyzeMutation.data, analyzeMutation.error), null, 2)}
							</pre>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
