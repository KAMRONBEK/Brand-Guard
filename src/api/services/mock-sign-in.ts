import type { SignInReq, SignInRes } from "./userService";
import { DB_PERMISSION, DB_ROLE, DB_ROLE_PERMISSION, DB_USER, DB_USER_ROLE } from "@/fixtures/assets_backup";
import type { UserInfo } from "#/entity";

function userInfoForDbUser(username: string): UserInfo {
	const dbUser = DB_USER.find((u) => u.username === username);
	if (!dbUser) {
		throw new Error("Invalid username or password");
	}

	const userRoleLinks = DB_USER_ROLE.filter((ur) => ur.userId === dbUser.id);
	const roles = userRoleLinks.map((ur) => {
		const role = DB_ROLE.find((r) => r.id === ur.roleId);
		if (!role) {
			throw new Error("Invalid username or password");
		}
		return { id: role.id, name: role.name, code: role.code };
	});

	const permissionIds = new Set<string>();
	for (const ur of userRoleLinks) {
		for (const rp of DB_ROLE_PERMISSION.filter((x) => x.roleId === ur.roleId)) {
			permissionIds.add(rp.permissionId);
		}
	}
	const permissions = DB_PERMISSION.filter((p) => permissionIds.has(p.id)).map((p) => ({
		id: p.id,
		name: p.name,
		code: p.code,
	}));

	return {
		id: dbUser.id,
		email: dbUser.email,
		username: dbUser.username,
		avatar: dbUser.avatar,
		roles,
		permissions,
	};
}

/** Local sign-in using fixture users (admin / test / guest + demo1234). No network. */
export function mockSignIn(data: SignInReq): Promise<SignInRes> {
	const row = DB_USER.find((u) => u.username === data.username && u.password === data.password);
	if (!row) {
		return Promise.reject(new Error("Invalid username or password"));
	}
	return Promise.resolve({
		accessToken: "mock-access-token",
		refreshToken: "mock-refresh-token",
		user: userInfoForDbUser(row.username),
	});
}
