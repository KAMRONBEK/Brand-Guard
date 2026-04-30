import commentApi from "@/api/commentApi";
import type { CampaignRequest } from "@/types/comment-api";

const run = (body: CampaignRequest) => commentApi.postJson<unknown>("/api/campaign", body);

export default { run };
