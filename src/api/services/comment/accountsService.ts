import commentApi from "@/api/commentApi";
import type { AddAccountsRequest } from "@/types/comment-api";

const list = () => commentApi.getJson<unknown>("/api/accounts");

const add = (body: AddAccountsRequest) => commentApi.postJson<unknown>("/api/accounts", body);

const remove = (username: string) => commentApi.deleteJson<unknown>(`/api/accounts/${encodeURIComponent(username)}`);

const relogin = (username: string, body: Record<string, string>) =>
	commentApi.postJson<unknown>(`/api/accounts/${encodeURIComponent(username)}/relogin`, body);

export default { list, add, remove, relogin };
