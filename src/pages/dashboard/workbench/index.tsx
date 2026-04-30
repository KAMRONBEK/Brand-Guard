import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	commentCampaignService,
	commentCommentsService,
	commentHealthService,
	commentSearchService,
} from "@/api/services/comment";
import Icon from "@/components/icon/icon";
import { GLOBAL_CONFIG } from "@/global-config";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";

function JsonPreview({ value }: { value: unknown }) {
	const text = useMemo(() => {
		if (value === undefined) return "";
		if (value instanceof Error) return JSON.stringify({ message: value.message }, null, 2);
		return JSON.stringify(value, null, 2);
	}, [value]);
	return <pre className="text-xs bg-muted rounded-md p-3 max-h-[420px] overflow-auto border">{text || "—"}</pre>;
}

export default function Workbench() {
	const { t } = useTranslation();
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
	const searchMutation = useMutation({
		mutationFn: () =>
			commentSearchService.search({
				keyword: searchKeyword,
				max_posts: searchMaxPosts,
				period_hours: searchPeriodHours,
				search_type: searchType,
				analyze: searchAnalyze,
			}),
	});

	const [captionKeyword, setCaptionKeyword] = useState("");
	const [captionMaxPosts, setCaptionMaxPosts] = useState(20);
	const [captionPeriodHours, setCaptionPeriodHours] = useState(24);
	const captionMutation = useMutation({
		mutationFn: () =>
			commentSearchService.searchCaption({
				keyword: captionKeyword,
				max_posts: captionMaxPosts,
				period_hours: captionPeriodHours,
			}),
	});

	const [postUrl, setPostUrl] = useState("");
	const [commentsText, setCommentsText] = useState("");
	const [numBots, setNumBots] = useState(1);
	const [periodSeconds, setPeriodSeconds] = useState(30);
	const postCommentsMutation = useMutation({
		mutationFn: () =>
			commentCommentsService.postComments({
				url: postUrl,
				comments: commentsText
					.split("\n")
					.map((s) => s.trim())
					.filter(Boolean),
				num_bots: numBots,
				period_seconds: periodSeconds,
			}),
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
		mutationFn: () =>
			commentCampaignService.run({
				keyword: campKeyword,
				max_posts: campMaxPosts,
				num_bots: campNumBots,
				period_seconds: campPeriodSeconds,
				period_hours: campPeriodHours,
				search_type: campSearchType,
				tone: campTone,
				generate_count: campGenerateCount,
				comments: campCommentsText
					? campCommentsText
							.split("\n")
							.map((s) => s.trim())
							.filter(Boolean)
					: undefined,
			}),
	});

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
					<Badge variant="outline" className="font-mono text-xs">
						API: {GLOBAL_CONFIG.commentApiBaseUrl}
					</Badge>
					{healthQuery.data && (
						<Badge variant="default" className="gap-1">
							<Icon icon="mdi:heart-pulse" size={14} />
							{JSON.stringify(healthQuery.data)}
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
					<Button size="sm" variant="ghost" onClick={() => setHealthEnabled((v) => !v)}>
						{healthEnabled ? t("sys.workbench.pausePolling") : t("sys.workbench.resumePolling")}
					</Button>
				</div>
			</div>

			<Tabs defaultValue="search" className="w-full">
				<TabsList className="flex-wrap h-auto gap-1">
					<TabsTrigger value="search">{t("sys.workbench.tabs.search")}</TabsTrigger>
					<TabsTrigger value="caption">{t("sys.workbench.tabs.caption")}</TabsTrigger>
					<TabsTrigger value="post">{t("sys.workbench.tabs.post")}</TabsTrigger>
					<TabsTrigger value="campaign">{t("sys.workbench.tabs.campaign")}</TabsTrigger>
				</TabsList>

				<TabsContent value="search">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.workbench.search.cardTitle")}</CardTitle>
							<Text variant="caption" className="text-muted-foreground">
								{t("sys.workbench.search.hint")}
							</Text>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2 sm:col-span-2">
									<Label htmlFor="kw">{t("sys.workbench.search.keywordLabel")}</Label>
									<Input
										id="kw"
										value={searchKeyword}
										onChange={(e) => setSearchKeyword(e.target.value)}
										placeholder={t("sys.workbench.search.keywordPlaceholder")}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="st">{t("sys.workbench.search.searchTypeLabel")}</Label>
									<Input
										id="st"
										value={searchType}
										onChange={(e) => setSearchType(e.target.value)}
										placeholder={t("sys.workbench.search.searchTypePlaceholder")}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="mp">{t("sys.workbench.search.maxPostsLabel")}</Label>
									<Input
										id="mp"
										type="number"
										value={searchMaxPosts}
										onChange={(e) => setSearchMaxPosts(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="ph">{t("sys.workbench.search.periodHoursLabel")}</Label>
									<Input
										id="ph"
										type="number"
										value={searchPeriodHours}
										onChange={(e) => setSearchPeriodHours(Number(e.target.value))}
									/>
								</div>
								<div className="flex items-center gap-2 pt-6">
									<input
										id="an"
										type="checkbox"
										className="size-4"
										checked={searchAnalyze}
										onChange={(e) => setSearchAnalyze(e.target.checked)}
									/>
									<Label htmlFor="an">{t("sys.workbench.search.analyzeLabel")}</Label>
								</div>
							</div>
							<Button disabled={searchMutation.isPending} onClick={() => searchMutation.mutate()}>
								{searchMutation.isPending ? t("sys.workbench.search.running") : t("sys.workbench.search.run")}
							</Button>
							<JsonPreview value={searchMutation.data ?? (searchMutation.isError ? searchMutation.error : undefined)} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="caption">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.workbench.caption.cardTitle")}</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-2 sm:col-span-2">
									<Label htmlFor="ck">{t("sys.workbench.caption.keywordLabel")}</Label>
									<Input id="ck" value={captionKeyword} onChange={(e) => setCaptionKeyword(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="cmp">{t("sys.workbench.caption.maxPostsLabel")}</Label>
									<Input
										id="cmp"
										type="number"
										value={captionMaxPosts}
										onChange={(e) => setCaptionMaxPosts(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="cph">{t("sys.workbench.caption.periodHoursLabel")}</Label>
									<Input
										id="cph"
										type="number"
										value={captionPeriodHours}
										onChange={(e) => setCaptionPeriodHours(Number(e.target.value))}
									/>
								</div>
							</div>
							<Button disabled={captionMutation.isPending} onClick={() => captionMutation.mutate()}>
								{captionMutation.isPending ? t("sys.workbench.caption.running") : t("sys.workbench.caption.run")}
							</Button>
							<JsonPreview
								value={captionMutation.data ?? (captionMutation.isError ? captionMutation.error : undefined)}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="post">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.workbench.post.cardTitle")}</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="space-y-2">
								<Label htmlFor="pu">{t("sys.workbench.post.postUrlLabel")}</Label>
								<Input
									id="pu"
									value={postUrl}
									onChange={(e) => setPostUrl(e.target.value)}
									placeholder={t("sys.workbench.post.postUrlPlaceholder")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ct">{t("sys.workbench.post.commentsLabel")}</Label>
								<textarea
									id="ct"
									className="border-input flex min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
									value={commentsText}
									onChange={(e) => setCommentsText(e.target.value)}
								/>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="nb">{t("sys.workbench.post.numBotsLabel")}</Label>
									<Input id="nb" type="number" value={numBots} onChange={(e) => setNumBots(Number(e.target.value))} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="ps">{t("sys.workbench.post.periodSecondsLabel")}</Label>
									<Input
										id="ps"
										type="number"
										value={periodSeconds}
										onChange={(e) => setPeriodSeconds(Number(e.target.value))}
									/>
								</div>
							</div>
							<Button disabled={postCommentsMutation.isPending} onClick={() => postCommentsMutation.mutate()}>
								{postCommentsMutation.isPending ? t("sys.workbench.post.posting") : t("sys.workbench.post.run")}
							</Button>
							<JsonPreview
								value={
									postCommentsMutation.data ?? (postCommentsMutation.isError ? postCommentsMutation.error : undefined)
								}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="campaign">
					<Card>
						<CardHeader>
							<CardTitle>{t("sys.workbench.campaign.cardTitle")}</CardTitle>
							<Text variant="caption" className="text-muted-foreground">
								{t("sys.workbench.campaign.hint")}
							</Text>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2 sm:col-span-2">
									<Label htmlFor="ckw">{t("sys.workbench.campaign.keywordLabel")}</Label>
									<Input id="ckw" value={campKeyword} onChange={(e) => setCampKeyword(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="cst">{t("sys.workbench.campaign.searchTypeLabel")}</Label>
									<Input id="cst" value={campSearchType} onChange={(e) => setCampSearchType(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="ctone">{t("sys.workbench.campaign.toneLabel")}</Label>
									<Input id="ctone" value={campTone} onChange={(e) => setCampTone(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="cmax">{t("sys.workbench.campaign.maxPostsLabel")}</Label>
									<Input
										id="cmax"
										type="number"
										value={campMaxPosts}
										onChange={(e) => setCampMaxPosts(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="cnb">{t("sys.workbench.campaign.numBotsLabel")}</Label>
									<Input
										id="cnb"
										type="number"
										value={campNumBots}
										onChange={(e) => setCampNumBots(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="cps">{t("sys.workbench.campaign.periodSecondsLabel")}</Label>
									<Input
										id="cps"
										type="number"
										value={campPeriodSeconds}
										onChange={(e) => setCampPeriodSeconds(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="cph2">{t("sys.workbench.campaign.periodHoursLabel")}</Label>
									<Input
										id="cph2"
										type="number"
										value={campPeriodHours}
										onChange={(e) => setCampPeriodHours(Number(e.target.value))}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="cgc">{t("sys.workbench.campaign.generateCountLabel")}</Label>
									<Input
										id="cgc"
										type="number"
										value={campGenerateCount}
										onChange={(e) => setCampGenerateCount(Number(e.target.value))}
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ccust">{t("sys.workbench.campaign.optionalCommentsLabel")}</Label>
								<textarea
									id="ccust"
									className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
									value={campCommentsText}
									onChange={(e) => setCampCommentsText(e.target.value)}
								/>
							</div>
							<Button disabled={campaignMutation.isPending} onClick={() => campaignMutation.mutate()}>
								{campaignMutation.isPending ? t("sys.workbench.campaign.running") : t("sys.workbench.campaign.run")}
							</Button>
							<JsonPreview
								value={campaignMutation.data ?? (campaignMutation.isError ? campaignMutation.error : undefined)}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
