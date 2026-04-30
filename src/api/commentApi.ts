import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from "sonner";
import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import useUserStore from "@/store/userStore";

const axiosInstance = axios.create({
	baseURL: GLOBAL_CONFIG.commentApiBaseUrl,
	timeout: 300_000,
	headers: { "Content-Type": "application/json;charset=utf-8" },
});

axiosInstance.interceptors.request.use((config) => {
	const token = useUserStore.getState().userToken?.accessToken;
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

axiosInstance.interceptors.response.use(
	(res: AxiosResponse) => res,
	(error) => {
		const msg =
			(error?.response?.data && typeof error.response.data === "object" && "message" in error.response.data
				? String((error.response.data as { message?: string }).message)
				: null) ||
			error?.message ||
			t("sys.api.errorMessage");
		toast.error(msg, { position: "top-center" });
		return Promise.reject(error);
	},
);

class CommentAPIClient {
	getJson<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return axiosInstance.get<T>(url, config).then((r) => r.data);
	}

	postJson<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
		return axiosInstance.post<T>(url, data, config).then((r) => r.data);
	}

	patchJson<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
		return axiosInstance.patch<T>(url, data, config).then((r) => r.data);
	}

	deleteJson<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		return axiosInstance.delete<T>(url, config).then((r) => r.data);
	}

	getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
		return axiosInstance.get(url, { ...config, responseType: "blob" }).then((r) => r.data as Blob);
	}
}

export default new CommentAPIClient();
