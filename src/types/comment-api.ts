/** Request/response shapes aligned with comment-api Swagger (loose where schema uses additionalProperties). */

export type SentimentFilter = "positive" | "negative" | "neutral";

export interface SentimentCounts {
	total?: number;
	positive?: number;
	negative?: number;
	neutral?: number;
	[key: string]: number | undefined;
}

export interface AnalyzedComment {
	username?: string;
	text?: string;
	timestamp?: string;
	sentiment?: SentimentFilter | string;
}

export interface CommentsByType {
	positive?: AnalyzedComment[];
	negative?: AnalyzedComment[];
	neutral?: AnalyzedComment[];
	[key: string]: AnalyzedComment[] | undefined;
}

export interface CaptionAnalysis {
	topic?: string;
	category?: string;
	language?: string;
	summary?: string;
}

export interface AnalyzedPost {
	url?: string;
	username?: string;
	author?: string;
	caption?: string;
	timestamp?: string;
	like_count?: string | number;
	comment_count?: string | number;
	stats?: SentimentCounts;
	comment_stats?: SentimentCounts;
	comments?: CommentsByType;
	caption_analysis?: CaptionAnalysis;
}

export interface AccountAnalyzeResponse {
	posts?: AnalyzedPost[];
	posts_analyzed?: number;
	posts_found?: number;
	stats?: SentimentCounts;
	total_comments?: number;
	username?: string;
}

export interface SearchResponse {
	keyword?: string;
	keywords?: string[];
	overall?: {
		total_posts?: number;
		total_comments?: number;
		comment_sentiment?: SentimentCounts;
		post_categories?: Record<string, number>;
	};
	period_hours?: number;
	posts?: AnalyzedPost[];
	search_type?: string;
}

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

export interface FacebookAccountAnalyzeRequest extends AccountAnalyzeRequest {}

export interface FacebookFetchRequest {
	url: string;
}

export interface FacebookAutoGenerate {
	tone?: string;
	count?: number;
}

export interface FacebookPostCommentRequest {
	url: string;
	comments?: string[];
	auto_generate?: FacebookAutoGenerate;
	period_seconds?: number;
}

export interface FacebookFetchResponse {
	author?: string;
	caption?: string;
	comments?: CommentsByType;
	message?: string;
	post_id?: string;
	stats?: SentimentCounts;
	url?: string;
}

export interface FacebookPostCommentResponse {
	caption?: string;
	failed?: number;
	generated_comments?: string[];
	mode?: string;
	results?: {
		comment?: string;
		error?: string;
		posted_at?: string;
		status?: string;
	}[];
	success?: number;
	total?: number;
	url?: string;
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
