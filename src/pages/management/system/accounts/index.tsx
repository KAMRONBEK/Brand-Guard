import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { commentAccountsService } from "@/api/services/comment";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

function extractRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) return data as Record<string, unknown>[];
	if (data && typeof data === "object") {
		const o = data as Record<string, unknown>;
		for (const key of ["accounts", "items", "data", "rows", "list"]) {
			const v = o[key];
			if (Array.isArray(v)) return v as Record<string, unknown>[];
		}
	}
	return [];
}

function rowUsername(row: Record<string, unknown>): string {
	const u = row.username ?? row.user ?? row.name;
	return typeof u === "string" ? u : "";
}

export default function CommentAccountsPage() {
	const queryClient = useQueryClient();
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [reloginUser, setReloginUser] = useState<string | null>(null);
	const [reloginPassword, setReloginPassword] = useState("");

	const listQuery = useQuery({
		queryKey: ["comment-api", "accounts"],
		queryFn: () => commentAccountsService.list(),
	});

	const rows = extractRows(listQuery.data);

	const addMutation = useMutation({
		mutationFn: () =>
			commentAccountsService.add({
				accounts: [{ username: newUsername.trim(), password: newPassword }],
			}),
		onSuccess: () => {
			setNewUsername("");
			setNewPassword("");
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "accounts"] });
		},
	});

	const removeMutation = useMutation({
		mutationFn: (username: string) => commentAccountsService.remove(username),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["comment-api", "accounts"] }),
	});

	const reloginMutation = useMutation({
		mutationFn: ({ username, password }: { username: string; password: string }) =>
			commentAccountsService.relogin(username, { password }),
		onSuccess: () => {
			setReloginUser(null);
			setReloginPassword("");
			void queryClient.invalidateQueries({ queryKey: ["comment-api", "accounts"] });
		},
	});

	const columns: ColumnsType<Record<string, unknown>> = [
		{
			title: "Username",
			key: "username",
			render: (_, row) => <span className="font-mono text-sm">{rowUsername(row) || JSON.stringify(row)}</span>,
		},
		{
			title: "Action",
			key: "actions",
			width: 200,
			render: (_, row) => {
				const u = rowUsername(row);
				if (!u) return null;
				return (
					<div className="flex flex-wrap gap-2">
						{reloginUser === u ? (
							<>
								<Input
									className="h-8 w-36"
									type="password"
									placeholder="password"
									value={reloginPassword}
									onChange={(e) => setReloginPassword(e.target.value)}
								/>
								<Button
									size="sm"
									disabled={reloginMutation.isPending}
									onClick={() => reloginMutation.mutate({ username: u, password: reloginPassword })}
								>
									Submit
								</Button>
								<Button size="sm" variant="ghost" onClick={() => setReloginUser(null)}>
									Cancel
								</Button>
							</>
						) : (
							<>
								<Button size="sm" variant="outline" onClick={() => setReloginUser(u)}>
									Re-login
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="text-destructive"
									disabled={removeMutation.isPending}
									onClick={() => removeMutation.mutate(u)}
								>
									<Icon icon="mingcute:delete-2-fill" size={16} />
								</Button>
							</>
						)}
					</div>
				);
			},
		},
	];

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<div className="font-semibold">Add accounts (POST /api/accounts)</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<div className="space-y-2 flex-1">
						<Label htmlFor="nu">username</Label>
						<Input id="nu" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoComplete="off" />
					</div>
					<div className="space-y-2 flex-1">
						<Label htmlFor="np">password</Label>
						<Input
							id="np"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							autoComplete="new-password"
						/>
					</div>
					<Button
						disabled={!newUsername.trim() || !newPassword || addMutation.isPending}
						onClick={() => addMutation.mutate()}
					>
						{addMutation.isPending ? "Adding…" : "Add to pool"}
					</Button>
					<Button variant="outline" onClick={() => void listQuery.refetch()}>
						Refresh
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<div className="font-semibold">Bot pool (GET /api/accounts)</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table
						rowKey={(_, i) => String(i)}
						size="small"
						loading={listQuery.isFetching}
						pagination={false}
						columns={columns}
						dataSource={rows}
					/>
					<pre className="mt-4 text-xs bg-muted rounded-md p-3 max-h-48 overflow-auto border">
						{JSON.stringify(listQuery.data ?? {}, null, 2)}
					</pre>
				</CardContent>
			</Card>
		</div>
	);
}
