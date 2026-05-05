import { GLOBAL_CONFIG } from "@/global-config";
import commentApi from "../commentApi";
import apiClient from "../apiClient";

import type { UserInfo, UserToken } from "#/entity";
import { mockSignIn } from "./mock-sign-in";

export interface SignInReq {
	username: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}
export type SignInRes = UserToken & { user: UserInfo };

interface AuthLoginResponse {
	accessToken?: string;
	access_token?: string;
	token?: string;
	refreshToken?: string;
	refresh_token?: string;
	user?: Partial<UserInfo>;
	id?: string | number;
	email?: string;
	username?: string;
	avatar?: string;
	roles?: UserInfo["roles"];
	permissions?: UserInfo["permissions"];
}

export enum UserApi {
	SignIn = "/api/auth/login",
	SignUp = "/auth/signup",
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	User = "/user",
}

const normalizeSignInResponse = (res: AuthLoginResponse, request: SignInReq): SignInRes => {
	const accessToken = res.accessToken ?? res.access_token ?? res.token;
	if (!accessToken) {
		throw new Error("Login response is missing access token");
	}

	const user = res.user ?? res;
	const username = user.username ?? request.username;

	return {
		accessToken,
		refreshToken: res.refreshToken ?? res.refresh_token,
		user: {
			id: user.id ? String(user.id) : username,
			email: user.email ?? "",
			username,
			avatar: user.avatar,
			roles: user.roles,
			permissions: user.permissions,
		},
	};
};

const signin = (data: SignInReq) =>
	GLOBAL_CONFIG.mockAuth
		? mockSignIn(data)
		: commentApi.postJson<AuthLoginResponse>(UserApi.SignIn, data).then((res) => normalizeSignInResponse(res, data));
const signup = (data: SignUpReq) => apiClient.post<SignInRes>({ url: UserApi.SignUp, data });
const logout = () => apiClient.get({ url: UserApi.Logout });
const findById = (id: string) => apiClient.get<UserInfo[]>({ url: `${UserApi.User}/${id}` });

export default {
	signin,
	signup,
	findById,
	logout,
};
