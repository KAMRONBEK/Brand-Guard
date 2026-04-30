import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { commentMonitorsService } from "@/api/services/comment";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

function extractRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) return data as Record<string, unknown>[];
	if (data && typeof data === "object") {
		const o = data as Record<string, unknown>;
		for (const key of ["monitors", "items", "data", "rows", "list"]) {
			const v = o[key];
			if (Array.isArray(v)) return v as Record<string, unknown>[];
		}
	}
	return [];
}

function extractAlertRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) return data as Record<string, unknown>[];
	if (data && typeof data === "object") {
		const o = data as Record<string, unknown>;
		for (const key of ["alerts", "items", "data", "rows", "list"]) {
			const v = o[key];
			if (Array.isArray(v)) return v as Record<string, unknown>[];
		}
	}
	return [];
}

function monitorId(row: Record<string, unknown>): number | null {
	const v = row.id;
	return typeof v === "number" ? v : null;
}

function alertId(row: Record<string, unknown>): number | null {
	const v = row.id;
	return typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null;
}

export default function CommentMonitorsPage() {
	const queryClient = useQueryClient();
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const [target, setTarget] = useState("");
	const [type, setType] = useState("keyword");
	const [searchType, setSearchType] = useState("all");
	const [intervalMinutes, setIntervalMinutes] = useState(60);
	const [maxPosts, setMaxPosts] = useState(20);

	const listQuery = useQuery({
		queryKey: ["comment-api", "monitors"],
		queryFn: () => commentMonitorsService.list(),
	});

	const monitorRows = useMemo(() => extractRows(listQuery.data), [listQuery.data]);

	const alertsQuery = useQuery({
		queryKey: ["comment-api", "monitors", selectedId, "alerts"],
		queryFn: () => commentMonitorsService.listAlerts(selectedId as number),
		enabled: selectedId != null,
	});

	const alertRows = useMemo(() => extractAlertRows(alertsQuery.data), [alertsQuery.data]);

	const createMutation = useMutation({
		mutationFn: () =>
			commentMonitorsService.create({
				target,
				type,
				search_type: searchType,
				interval_minutes: intervalMinutes,
				max_posts: maxPosts,
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "monitors"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => commentMonitorsService.remove(id),
		onSuccess: (_, id) => {
			setSelectedId((cur) => (cur === id ? null : cur));
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "monitors"] });
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "monitors", id, "alerts"] });
		},
	});

	const pauseMutation = useMutation({
		mutationFn: ({ id, status }: { id: number; status: string }) => commentMonitorsService.updateStatus(id, { status }),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["comment-api", "monitors"] }),
	});

	const ackMutation = useMutation({
		mutationFn: (alertId: number) => commentMonitorsService.ackAlert(alertId),
		onSuccess: () =>
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "monitors", selectedId, "alerts"] }),
	});

	const monitorColumns: ColumnsType<Record<string, unknown>> = [
		{ title: "ID", dataIndex: "id", width: 70 },
		{ title: "Target", dataIndex: "target" },
		{ title: "Type", dataIndex: "type", width: 100 },
		{ title: "Status", dataIndex: "status", width: 100 },
		{
			title: "Actions",
			key: "a",
			width: 220,
			render: (_, row) => {
				const id = monitorId(row);
				if (id == null) return null;
				return (
					<div className="flex flex-wrap gap-2">
						<Button size="sm" variant={selectedId === id ? "default" : "outline"} onClick={() => setSelectedId(id)}>
							Alerts
						</Button>
						<Button size="sm" variant="outline" onClick={() => pauseMutation.mutate({ id, status: "paused" })}>
							Pause
						</Button>
						<Button size="sm" variant="outline" onClick={() => pauseMutation.mutate({ id, status: "active" })}>
							Resume
						</Button>
						<Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(id)}>
							Delete
						</Button>
					</div>
				);
			},
		},
	];

	const alertColumns: ColumnsType<Record<string, unknown>> = [
		{
			title: "ID",
			key: "id",
			width: 80,
			render: (_, row) => String(alertId(row) ?? "—"),
		},
		{
			title: "Payload",
			key: "p",
			render: (_, row) => (
				<span className="font-mono text-xs whitespace-pre-wrap break-all">{JSON.stringify(row)}</span>
			),
		},
		{
			title: "Ack",
			key: "ack",
			width: 100,
			render: (_, row) => {
				const aid = alertId(row);
				if (aid == null) return "—";
				return (
					<Button size="sm" disabled={ackMutation.isPending} onClick={() => ackMutation.mutate(aid)}>
						Ack
					</Button>
				);
			},
		},
	];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<div className="font-semibold">Create monitor (POST /api/monitors)</div>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="tg">target</Label>
						<Input
							id="tg"
							value={target}
							onChange={(e) => setTarget(e.target.value)}
							placeholder="keyword or @handle"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="ty">type</Label>
						<Input id="ty" value={type} onChange={(e) => setType(e.target.value)} placeholder="username | keyword" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="st">search_type</Label>
						<Input
							id="st"
							value={searchType}
							onChange={(e) => setSearchType(e.target.value)}
							placeholder="all | account | hashtag"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="im">interval_minutes</Label>
						<Input
							id="im"
							type="number"
							value={intervalMinutes}
							onChange={(e) => setIntervalMinutes(Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="mp">max_posts</Label>
						<Input id="mp" type="number" value={maxPosts} onChange={(e) => setMaxPosts(Number(e.target.value))} />
					</div>
					<div className="flex items-end gap-2">
						<Button disabled={!target.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
							{createMutation.isPending ? "Creating…" : "Create"}
						</Button>
						<Button variant="outline" onClick={() => void listQuery.refetch()}>
							Refresh monitors
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="font-semibold">Monitors (GET /api/monitors)</div>
				</CardHeader>
				<CardContent>
					<Table
						rowKey={(_, i) => String(i)}
						size="small"
						loading={listQuery.isFetching}
						pagination={false}
						columns={monitorColumns}
						dataSource={monitorRows}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="font-semibold">
						Alerts {selectedId != null ? `(GET /api/monitors/${selectedId}/alerts)` : "(select a monitor)"}
					</div>
				</CardHeader>
				<CardContent>
					{selectedId == null ? (
						<p className="text-sm text-muted-foreground">Choose “Alerts” on a monitor row.</p>
					) : (
						<>
							<Table
								rowKey={(_, i) => String(i)}
								size="small"
								loading={alertsQuery.isFetching}
								pagination={false}
								columns={alertColumns}
								dataSource={alertRows}
							/>
							<pre className="mt-4 text-xs bg-muted rounded-md p-3 max-h-48 overflow-auto border">
								{JSON.stringify(alertsQuery.data ?? {}, null, 2)}
							</pre>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
