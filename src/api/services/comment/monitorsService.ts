import commentApi from "@/api/commentApi";
import type {
	CommentMonitor,
	CreateMonitorRequest,
	SentimentFilter,
	UpdateMonitorStatusRequest,
} from "@/types/comment-api";

const list = () => commentApi.getJson<unknown>("/api/monitors");

const create = (body: CreateMonitorRequest) => commentApi.postJson<CommentMonitor>("/api/monitors", body);

const getById = (id: number) => commentApi.getJson<CommentMonitor>(`/api/monitors/${id}`);

const remove = (id: number) => commentApi.deleteJson<unknown>(`/api/monitors/${id}`);

const updateStatus = (id: number, body: UpdateMonitorStatusRequest) =>
	commentApi.patchJson<unknown>(`/api/monitors/${id}`, body);

const listAlerts = (
	id: number,
	params?: { page?: number; limit?: number; sentiment?: SentimentFilter; unread?: boolean },
) => commentApi.getJson<unknown>(`/api/monitors/${id}/alerts`, { params });

const ackAlert = (alertId: number) => commentApi.postJson<unknown>(`/api/alerts/${alertId}/ack`);

export default { list, create, getById, remove, updateStatus, listAlerts, ackAlert };
