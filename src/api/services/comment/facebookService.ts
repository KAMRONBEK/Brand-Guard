import commentApi from "@/api/commentApi";
import type {
	AccountAnalyzeResponse,
	FacebookAccountAnalyzeRequest,
	FacebookFetchRequest,
	FacebookFetchResponse,
	FacebookPostCommentRequest,
	FacebookPostCommentResponse,
} from "@/types/comment-api";

const analyzeAccount = (body: FacebookAccountAnalyzeRequest) =>
	commentApi.postJson<AccountAnalyzeResponse>("/api/facebook/account/analyze", body);

const fetchComments = (body: FacebookFetchRequest) =>
	commentApi.postJson<FacebookFetchResponse>("/api/facebook/comments/fetch", body);

const postComments = (body: FacebookPostCommentRequest) =>
	commentApi.postJson<FacebookPostCommentResponse>("/api/facebook/comments/post", body);

export default { analyzeAccount, fetchComments, postComments };
