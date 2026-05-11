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
	/** Display name when the API sends `author` instead of `username` */
	author?: string;
	text?: string;
	timestamp?: string;
	sentiment?: SentimentFilter | string;
	/** Some payloads use these instead of `sentiment` */
	tone?: string;
	mood?: string;
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
	shortcode?: string;
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
	total?: number;
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

/** Body for POST /api/instagram/search and /api/instagram/search/stream (comment-api Swagger). */
export type InstagramUnifiedSearchType = "account" | "url" | "hashtag";

export interface InstagramUnifiedSearchRequest {
	type: InstagramUnifiedSearchType;
	keywords: string[];
	language?: string;
	max_posts_per_account?: number;
	max_comments_per_post?: number;
}

/** Body for POST /api/facebook/search and /api/facebook/search/stream (comment-api Swagger). */
export type FacebookUnifiedSearchType = "account" | "url";

export interface FacebookUnifiedSearchRequest {
	keywords?: string[];
	language?: string;
	max_comments_per_post?: number;
	max_posts?: number;
	period_hours?: number;
	type?: FacebookUnifiedSearchType;
}

export interface FacebookFailedInput {
	input?: string;
	reason?: string;
}

/** Unified Apify-backed Facebook search response (optional fields per Swagger). */
export interface FacebookUnifiedSearchResponse {
	failed_inputs?: FacebookFailedInput[];
	keywords?: string[];
	period_hours?: number;
	posts?: unknown[];
	stats?: SentimentCounts;
	timing_ms?: Record<string, number>;
	type?: FacebookUnifiedSearchType;
}

/** Body for POST /api/telegram/search and /api/telegram/search/stream (comment-api Swagger). */
export interface TelegramSearchRequest {
	channels: string[];
	keywords: string[];
	include_comments?: boolean;
	language?: string;
	max_comments_per_post?: number;
	max_per_hit?: number;
	min_negative_comment_ratio?: number;
	period_hours?: number;
}

/** Telegram comment hit inside a post payload (Swagger `internal_handler_telegram.CommentHit`). */
export interface TelegramSearchCommentHit {
	username?: string;
	text?: string;
	date?: string;
	sentiment?: string;
}

/** Aggregated sentiment for comments under one post (`internal_handler_telegram.CommentStats`). */
export interface TelegramSearchCommentStats {
	total?: number;
	positive?: number;
	negative?: number;
	neutral?: number;
	positive_pct?: number;
	negative_pct?: number;
	neutral_pct?: number;
}

/** Telegram search stream aggregated response (loose; optional fields from API). */
export interface TelegramSearchStreamPost {
	channel_username?: string;
	channel_title?: string;
	id?: number;
	url?: string;
	text?: string;
	date?: string;
	views?: number;
	sentiment?: string;
	has_comments?: boolean;
	comments?: TelegramSearchCommentHit[];
	comments_stats?: TelegramSearchCommentStats;
}

export interface TelegramSearchAdviceExample {
	country?: string;
	solution?: string;
	adaptation?: string;
}

export interface TelegramSearchAdviceIssue {
	topic?: string;
	description?: string;
	suggested_action?: string;
	worldwide_examples?: TelegramSearchAdviceExample[];
	evidence_count?: number;
}

export interface TelegramSearchAdvice {
	summary?: string;
	issues?: TelegramSearchAdviceIssue[];
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

export interface AutoReplyRequest {
	url: string;
	num_bots?: number;
	period_seconds?: number;
}

/** Match comment-api Swagger enum on `tone` fields (generation / campaign) when documented. */
export const COMMENT_GENERATION_TONES = ["positive", "neutral", "negative"] as const;

export type CommentGenerationTone = (typeof COMMENT_GENERATION_TONES)[number];

/** Body for POST /api/comments/post and /api/comments/post/stream when using AI generation (Swagger). */
export interface InstagramAutoGenerateRequest {
	count?: number;
	language?: string;
	tone?: CommentGenerationTone;
}

export interface PostCommentsRequest {
	url: string;
	/** Set for manual (self) mode; omit when using `auto_generate`. */
	comments?: string[];
	auto_generate?: InstagramAutoGenerateRequest;
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
	tone?: CommentGenerationTone;
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
	tone?: CommentGenerationTone;
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
