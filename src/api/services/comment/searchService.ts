import commentApi from "@/api/commentApi";
import type { SearchRequest } from "@/types/comment-api";
import { type CommentApiStreamOptions, postCommentApiStream } from "./commentApiStream";

const search = (body: SearchRequest) => commentApi.postJson<unknown>("/api/search", body);

export type SearchStreamOptions = CommentApiStreamOptions;

async function searchStream(body: SearchRequest, options: SearchStreamOptions): Promise<void> {
	return postCommentApiStream("/api/search/stream", body, options);
}

export default { search, searchStream };
