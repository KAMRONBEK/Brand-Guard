import commentApi from "@/api/commentApi";
import type { CaptionSearchRequest, SearchRequest } from "@/types/comment-api";

const search = (body: SearchRequest) => commentApi.postJson<unknown>("/api/search", body);

const searchCaption = (body: CaptionSearchRequest) => commentApi.postJson<unknown>("/api/search/caption", body);

export default { search, searchCaption };
