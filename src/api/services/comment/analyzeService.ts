import commentApi from "@/api/commentApi";
import type { AccountAnalyzeRequest } from "@/types/comment-api";

const analyzeAccount = (body: AccountAnalyzeRequest) => commentApi.postJson<unknown>("/api/account/analyze", body);

export default { analyzeAccount };
