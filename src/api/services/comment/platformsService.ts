import type { PlatformsUnifiedSearchRequest } from "@/types/comment-api";
import { type CommentApiStreamOptions, postCommentApiStream } from "./commentApiStream";

export type PlatformsUnifiedSearchStreamOptions = CommentApiStreamOptions;

async function searchStream(
	body: PlatformsUnifiedSearchRequest,
	options: PlatformsUnifiedSearchStreamOptions,
): Promise<void> {
	return postCommentApiStream("/api/platforms/search/stream", body, options);
}

export default { searchStream };
