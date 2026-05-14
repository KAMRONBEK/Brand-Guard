import { MutationCache, QueryCache, QueryClient, type Query } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";

/** localStorage key for dehydrated React Query workflow queries. */
export const QUERY_PERSIST_STORAGE_KEY = "brand-guard:rq-workflow-cache";

const PERSISTED_QUERY_TAGS = new Set(["comments-fetch", "comments-list", "account-analyze", "campaign"]);

function shouldPersistCommentApiWorkflowQuery(query: Query): boolean {
	const key = query.queryKey;
	if (!Array.isArray(key) || key[0] !== "comment-api") return false;
	const tag = key[1];
	return typeof tag === "string" && PERSISTED_QUERY_TAGS.has(tag);
}

let queryClientSingleton: QueryClient | null = null;

export function getAppQueryClient(): QueryClient {
	if (!queryClientSingleton) {
		queryClientSingleton = new QueryClient({
			queryCache: new QueryCache(),
			mutationCache: new MutationCache(),
			defaultOptions: {
				queries: {
					retry: 1,
				},
				mutations: {
					retry: 1,
				},
			},
		});
	}
	return queryClientSingleton;
}

export function createQueryPersistOptions(persister: Persister) {
	return {
		persister,
		maxAge: Number.POSITIVE_INFINITY,
		buster: "v1",
		dehydrateOptions: {
			shouldDehydrateQuery: (query: Query) => shouldPersistCommentApiWorkflowQuery(query),
			/** Campaign/results are mirrored via workflow session cache instead. */
			shouldDehydrateMutation: () => false,
		},
	};
}
