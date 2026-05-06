import { toast } from "sonner";
import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import useUserStore from "@/store/userStore";

export function buildCommentApiStreamUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	const base = GLOBAL_CONFIG.commentApiBaseUrl.replace(/\/+$/, "");
	return `${base}${normalized}`;
}

export function buildCommentApiStreamAuthHeaders(): Record<string, string> {
	const token = useUserStore.getState().userToken?.accessToken;
	const headers: Record<string, string> = {
		"Content-Type": "application/json;charset=utf-8",
		Accept: "application/x-ndjson, application/json, text/event-stream, text/plain, */*",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
	const text = await response.text();
	try {
		const parsed = JSON.parse(text) as { message?: string; error?: string };
		if (parsed.message) return String(parsed.message);
		if (parsed.error) return String(parsed.error);
	} catch {
		/* not JSON */
	}
	return text.trim() || t("sys.api.errorMessage");
}

const PREFIXED_STREAM_LINE = /^([A-Za-z_][A-Za-z0-9_]*)[\t ]+(.+)$/;

function parseJsonFromText(text: string): unknown | null {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		const objectStart = text.indexOf("{");
		const objectEnd = text.lastIndexOf("}");
		if (objectStart >= 0 && objectEnd > objectStart) {
			const objectSlice = text.slice(objectStart, objectEnd + 1).trim();
			try {
				return JSON.parse(objectSlice) as unknown;
			} catch {
				/* keep falling through */
			}
		}
		const arrayStart = text.indexOf("[");
		const arrayEnd = text.lastIndexOf("]");
		if (arrayStart >= 0 && arrayEnd > arrayStart) {
			const arraySlice = text.slice(arrayStart, arrayEnd + 1).trim();
			try {
				return JSON.parse(arraySlice) as unknown;
			} catch {
				/* keep falling through */
			}
		}
		return null;
	}
}

function parseStreamTextLine(line: string): unknown | null {
	const trimmed = line.trim();
	if (!trimmed) return null;
	const match = PREFIXED_STREAM_LINE.exec(trimmed);
	if (match) {
		const payload = match[2];
		return parseJsonFromText(payload);
	}
	return parseJsonFromText(trimmed);
}

function parseSseBlock(block: string): unknown | null {
	const dataLines = block
		.split("\n")
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice(5).trimStart());
	if (dataLines.length === 0) return null;
	const payload = dataLines.join("\n");
	if (payload === "[DONE]" || payload === "") return null;
	return parseStreamTextLine(payload);
}

export interface CommentApiStreamOptions {
	signal: AbortSignal;
	onEvent: (chunk: unknown) => void;
}

function isAbortError(error: unknown): boolean {
	if (error instanceof DOMException && error.name === "AbortError") return true;
	return Boolean(
		error && typeof error === "object" && "name" in error && (error as { name: string }).name === "AbortError",
	);
}

export async function postCommentApiStream(
	path: string,
	body: unknown,
	options: CommentApiStreamOptions,
): Promise<void> {
	const { signal, onEvent } = options;

	try {
		const response = await fetch(buildCommentApiStreamUrl(path), {
			method: "POST",
			headers: buildCommentApiStreamAuthHeaders(),
			body: JSON.stringify(body),
			signal,
		});

		if (!response.ok) {
			throw new Error(await readErrorMessage(response));
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error(t("sys.api.errorMessage"));
		}

		const contentType = response.headers.get("content-type") ?? "";
		const isSse = contentType.includes("text/event-stream");
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (value) {
				buffer += decoder.decode(value, { stream: true });
			}

			if (isSse) {
				const parts = buffer.split(/\n\n+/);
				buffer = parts.pop() ?? "";
				for (const block of parts) {
					const parsed = parseSseBlock(block);
					if (parsed != null) onEvent(parsed);
				}
			} else {
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) {
					const parsed = parseStreamTextLine(line);
					if (parsed != null) onEvent(parsed);
				}
			}

			if (done) {
				if (buffer.length > 0) {
					if (isSse) {
						for (const block of buffer.split(/\n\n+/)) {
							const parsed = parseSseBlock(block);
							if (parsed != null) onEvent(parsed);
						}
					} else {
						for (const line of buffer.split("\n")) {
							const parsed = parseStreamTextLine(line);
							if (parsed != null) onEvent(parsed);
						}
					}
				}
				break;
			}
		}
	} catch (error: unknown) {
		if (signal.aborted || isAbortError(error)) {
			return;
		}
		const message = error instanceof Error ? error.message : t("sys.api.errorMessage");
		toast.error(message, { position: "top-center" });
		throw error instanceof Error ? error : new Error(message);
	}
}
