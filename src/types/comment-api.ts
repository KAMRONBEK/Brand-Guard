/** Request/response shapes aligned with comment-api Swagger (loose where schema uses additionalProperties). */

export type SentimentFilter = "positive" | "negative" | "neutral";

export interface SearchRequest {
	keyword?: string;
	max_posts?: number;
	period_hours?: number;
	search_type?: string;
	analyze?: boolean;
}

export interface CaptionSearchRequest {
	keyword?: string;
	max_posts?: number;
	period_hours?: number;
}

export interface FetchRequest {
	url: string;
}

export interface FetchResponse {
	message?: string;
	post_url?: string;
	sentiment?: Record<string, number>;
	shortcode?: string;
	total_comments?: number;
}

export interface PostCommentsRequest {
	url: string;
	comments: string[];
	num_bots?: number;
	period_seconds?: number;
}

export interface CampaignRequest {
	comments?: string[];
	generate_count?: number;
	keyword?: string;
	max_posts?: number;
	num_bots?: number;
	period_hours?: number;
	period_seconds?: number;
	search_type?: string;
	tone?: string;
}

export interface AccountAnalyzeRequest {
	username: string;
	max_posts?: number;
}

export interface AddAccountRequest {
	username: string;
	password: string;
}

export interface AddAccountsRequest {
	accounts: AddAccountRequest[];
}

export interface CreateMonitorRequest {
	interval_minutes?: number;
	max_posts?: number;
	search_type?: string;
	target: string;
	type: string;
}

export interface UpdateMonitorStatusRequest {
	status: string;
}

export interface CommentMonitor {
	id?: number;
	created_at?: string;
	interval_minutes?: number;
	last_checked_at?: string;
	max_posts?: number;
	search_type?: string;
	status?: string;
	target?: string;
	type?: string;
}
