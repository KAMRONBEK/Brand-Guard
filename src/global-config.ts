import { DEFAULT_API_ORIGIN } from "@/constants/api-defaults";
import packageJson from "../package.json";

/**
 * Global application configuration type definition
 */
export type GlobalConfig = {
	/** Application name */
	appName: string;
	/** Application version number */
	appVersion: string;
	/** Default route path for the application */
	defaultRoute: string;
	/** Public path for static assets */
	publicPath: string;
	/** Base URL for API endpoints */
	apiBaseUrl: string;
	/** Base URL for Instagram Comment Reader API (raw JSON, not Result<T> envelope) */
	commentApiBaseUrl: string;
	/** Routing mode: frontend routing or backend routing */
	routerMode: "frontend" | "backend";
	/** Product docs URL (empty hides account menu link) */
	docsUrl: string;
	/** Public repository URL (empty hides header GitHub button) */
	repositoryUrl: string;
	/** Community URL e.g. Discord (empty hides header button) */
	communityUrl: string;
	/** Use fixture-based sign-in instead of calling the auth API (no backend required) */
	mockAuth: boolean;
};

const normalizeAbsoluteCommentApiOrigin = (baseUrl: string): string => {
	const trimmedBaseUrl = baseUrl.replace(/\/+$/, "");

	if (!/^https?:\/\//i.test(trimmedBaseUrl)) {
		return trimmedBaseUrl;
	}

	return trimmedBaseUrl.replace(/\/api$/i, "");
};

/**
 * Global configuration constants
 * Reads configuration from environment variables and package.json
 *
 * @warning
 * Please don't use the import.meta.env to get the configuration, use the GLOBAL_CONFIG instead
 */
export const GLOBAL_CONFIG: GlobalConfig = {
	appName: "Brand Guard",
	appVersion: packageJson.version,
	defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/workbench/search",
	publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
	apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || DEFAULT_API_ORIGIN,
	commentApiBaseUrl: normalizeAbsoluteCommentApiOrigin(
		import.meta.env.VITE_APP_COMMENT_API_BASE_URL || DEFAULT_API_ORIGIN,
	),
	routerMode: import.meta.env.VITE_APP_ROUTER_MODE || "frontend",
	docsUrl: import.meta.env.VITE_APP_DOCS_URL || "",
	repositoryUrl: import.meta.env.VITE_APP_REPOSITORY_URL || "",
	communityUrl: import.meta.env.VITE_APP_COMMUNITY_URL || "",
	mockAuth: import.meta.env.VITE_APP_MOCK_AUTH === "true",
};
