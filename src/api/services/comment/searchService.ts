import commentApi from "@/api/commentApi";
import type { SearchRequest } from "@/types/comment-api";

const search = (body: SearchRequest) => commentApi.postJson<unknown>("/api/search", body);

export default { search };
