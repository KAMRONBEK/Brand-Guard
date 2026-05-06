import commentApi from "@/api/commentApi";
import type { AutoReplyRequest, FetchRequest, PostCommentsRequest, SentimentFilter } from "@/types/comment-api";

import { postCommentApiStream, type CommentApiStreamOptions } from "./commentApiStream";

const fetchComments = (body: FetchRequest) => commentApi.postJson<unknown>("/api/comments/fetch", body);

const listComments = (params: { post_url: string; sentiment?: SentimentFilter; page?: number; limit?: number }) =>
	commentApi.getJson<unknown>("/api/comments", { params });

const stats = (post_url: string) => commentApi.getJson<unknown>("/api/comments/stats", { params: { post_url } });

const exportComments = (params: { post_url: string; format?: "json" | "csv"; sentiment?: SentimentFilter }) =>
	commentApi.getBlob("/api/comments/export", { params });

const postComments = (body: PostCommentsRequest) => commentApi.postJson<unknown>("/api/comments/post", body);

const autoReply = (body: AutoReplyRequest) => commentApi.postJson<unknown>("/api/posts/auto-reply", body);

const autoReplyStream = (body: AutoReplyRequest, options: CommentApiStreamOptions) =>
	postCommentApiStream("/api/posts/auto-reply/stream", body, options);

export default { fetchComments, listComments, stats, exportComments, postComments, autoReply, autoReplyStream };
