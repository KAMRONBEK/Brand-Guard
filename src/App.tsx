import Logo from "@/assets/icons/ic-logo-badge.svg";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { createQueryPersistOptions, getAppQueryClient, QUERY_PERSIST_STORAGE_KEY } from "@/lib/query-client";
import { MotionLazy } from "./components/animate/motion-lazy";
import { RouteLoadingProgress } from "./components/loading";
import Toast from "./components/toast";
import { GLOBAL_CONFIG } from "./global-config";
import { AntdAdapter } from "./theme/adapter/antd.adapter";
import { ThemeProvider } from "./theme/theme-provider";

if (import.meta.env.DEV) {
	import("react-scan").then(({ scan }) => {
		scan({
			enabled: false,
			showToolbar: true,
			log: false,
			animationSpeed: "fast",
		});
	});
}

const workflowQueryPersister = createSyncStoragePersister({
	storage: typeof window === "undefined" ? undefined : window.localStorage,
	key: QUERY_PERSIST_STORAGE_KEY,
	throttleTime: 800,
});

const queryClientForApp = getAppQueryClient();

function App({ children }: { children: React.ReactNode }) {
	return (
		<HelmetProvider>
			<PersistQueryClientProvider
				client={queryClientForApp}
				persistOptions={createQueryPersistOptions(workflowQueryPersister)}
			>
				<ThemeProvider adapters={[AntdAdapter]}>
					<VercelAnalytics debug={import.meta.env.PROD} />
					<Helmet>
						<title>{GLOBAL_CONFIG.appName}</title>
						<link rel="icon" href={Logo} />
					</Helmet>
					<Toast />
					<RouteLoadingProgress />
					<MotionLazy>{children}</MotionLazy>
				</ThemeProvider>
			</PersistQueryClientProvider>
		</HelmetProvider>
	);
}

export default App;
