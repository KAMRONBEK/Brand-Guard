import commentApi from "@/api/commentApi";
import type {
	AccountAnalyzeResponse,
	FacebookAccountAnalyzeRequest,
	FacebookFetchRequest,
	FacebookFetchResponse,
	FacebookPostCommentRequest,
	FacebookPostCommentResponse,
	FacebookUnifiedSearchRequest,
	FacebookUnifiedSearchResponse,
} from "@/types/comment-api";
import { type CommentApiStreamOptions, postCommentApiStream } from "./commentApiStream";

const analyzeAccount = (body: FacebookAccountAnalyzeRequest) =>
	commentApi.postJson<AccountAnalyzeResponse>("/api/facebook/account/analyze", body);

const fetchComments = (body: FacebookFetchRequest) =>
	commentApi.postJson<FacebookFetchResponse>("/api/facebook/comments/fetch", body);

const postComments = (body: FacebookPostCommentRequest) =>
	commentApi.postJson<FacebookPostCommentResponse>("/api/facebook/comments/post", body);

const analyzeAccountStream = (body: FacebookAccountAnalyzeRequest, options: CommentApiStreamOptions) =>
	postCommentApiStream("/api/facebook/account/analyze/stream", body, options);

const fetchCommentsStream = (body: FacebookFetchRequest, options: CommentApiStreamOptions) =>
	postCommentApiStream("/api/facebook/comments/fetch/stream", body, options);

const postCommentsStream = (body: FacebookPostCommentRequest, options: CommentApiStreamOptions) =>
	postCommentApiStream("/api/facebook/comments/post/stream", body, options);

const search = (body: FacebookUnifiedSearchRequest) =>
	commentApi.postJson<FacebookUnifiedSearchResponse>("/api/facebook/search", body);

const searchStream = (body: FacebookUnifiedSearchRequest, options: CommentApiStreamOptions) =>
	postCommentApiStream("/api/facebook/search/stream", body, options);

export default {
	analyzeAccount,
	fetchComments,
	postComments,
	analyzeAccountStream,
	fetchCommentsStream,
	postCommentsStream,
	search,
	searchStream,
};
