import commentApi from "@/api/commentApi";
import type { InstagramUnifiedSearchRequest } from "@/types/comment-api";
import { type CommentApiStreamOptions, postCommentApiStream } from "./commentApiStream";

const search = (body: InstagramUnifiedSearchRequest) => commentApi.postJson<unknown>("/api/instagram/search", body);

export type SearchStreamOptions = CommentApiStreamOptions;

async function searchStream(body: InstagramUnifiedSearchRequest, options: SearchStreamOptions): Promise<void> {
	return postCommentApiStream("/api/instagram/search/stream", body, options);
}

export default { search, searchStream };
