/** Namespace prefix for persisted workflow UI state (SSE + analysis forms). */
const STORAGE_PREFIX = "brand-guard:workflow-v1:";
export const WORKFLOW_CACHE_VERSION = 1 as const;

export type WorkflowCachedError = { name: string; message: string };

export type WorkflowSnapshot<TInputs> = {
	version: typeof WORKFLOW_CACHE_VERSION;
	savedAt: number;
	inputs: TInputs;
	result: unknown | null;
	error: WorkflowCachedError | null;
};

function storageKey(namespace: string): string {
	return `${STORAGE_PREFIX}${namespace}`;
}

export function errorToCached(error: unknown): WorkflowCachedError | null {
	if (error instanceof Error) {
		return { name: error.name, message: error.message };
	}
	if (error !== null && typeof error !== "undefined") {
		try {
			return { name: "Error", message: String(error) };
		} catch {
			return { name: "Error", message: "Unknown error" };
		}
	}
	return null;
}

export function cachedErrorFromSnapshot(cached: WorkflowCachedError | null): Error | undefined {
	if (cached == null) return undefined;
	const e = new Error(cached.message);
	e.name = cached.name;
	return e;
}

export function readWorkflowSnapshot<TInputs>(namespace: string): WorkflowSnapshot<TInputs> | null {
	try {
		if (typeof window === "undefined") return null;
		const raw = window.localStorage.getItem(storageKey(namespace));
		if (raw === null || raw === "") return null;
		const parsed = JSON.parse(raw) as WorkflowSnapshot<TInputs>;
		if (parsed.version !== WORKFLOW_CACHE_VERSION || typeof parsed.savedAt !== "number") return null;
		return parsed;
	} catch {
		return null;
	}
}

export type WriteWorkflowOutcome = "ok" | "quota" | "error";

/** Persists merged workflow payload plus last form inputs (JSON). Handles quota gracefully. */
export function writeWorkflowSnapshot<TInputs>(
	namespace: string,
	snapshot: WorkflowSnapshot<TInputs>,
): WriteWorkflowOutcome {
	try {
		if (typeof window === "undefined") return "error";
		window.localStorage.setItem(storageKey(namespace), JSON.stringify(snapshot));
		return "ok";
	} catch (e) {
		if (e instanceof DOMException && e.name === "QuotaExceededError") return "quota";
		return "error";
	}
}

export function clearWorkflowSnapshot(namespace: string): void {
	try {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(storageKey(namespace));
	} catch {
		// ignore
	}
}

/** Stable namespaces for persisted workbench/search workflows. */
export const WORKFLOW_SNAPSHOT_IDS = {
	platformsUnifiedSearch: "platforms-unified-search",
	telegramSearch: "telegram-search",
	wbInstagramSearch: "wb-ig-unified-search",
	wbInstagramPost: "wb-ig-post-comments",
	wbAutoReply: "wb-auto-reply",
	wbFacebookUnifiedSearch: "wb-fb-unified-search",
	wbFacebookAnalyze: "wb-fb-account-analyze",
	wbFacebookFetch: "wb-fb-fetch-comments",
	wbFacebookPost: "wb-fb-post-comments",
	wbCampaign: "wb-campaign",
	analysisCommentsFetch: "analysis-comments-fetch",
	analysisCommentsList: "analysis-comments-list",
	analysisAccount: "analysis-account-analyze",
	sentimentReportsPostUrl: "sentiment-reports-post-url",
} as const;
