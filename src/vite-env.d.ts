/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Default route path for the application */
	readonly VITE_APP_DEFAULT_ROUTE: string;
	/** Public path for static assets */
	readonly VITE_APP_PUBLIC_PATH: string;
	/** Base URL for API endpoints */
	readonly VITE_APP_API_BASE_URL: string;
	/** Routing mode: frontend routing or backend routing */
	readonly VITE_APP_ROUTER_MODE: "frontend" | "backend";
	/** Optional product documentation URL */
	readonly VITE_APP_DOCS_URL?: string;
	/** Optional public Git repository URL */
	readonly VITE_APP_REPOSITORY_URL?: string;
	/** Optional community URL (e.g. Discord) */
	readonly VITE_APP_COMMUNITY_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
