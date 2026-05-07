import type { TelegramSearchRequest } from "@/types/comment-api";
import { type CommentApiStreamOptions, postCommentApiStream } from "./commentApiStream";

export type TelegramSearchStreamOptions = CommentApiStreamOptions;

async function searchStream(body: TelegramSearchRequest, options: TelegramSearchStreamOptions): Promise<void> {
	return postCommentApiStream("/api/telegram/search/stream", body, options);
}

export default { searchStream };
