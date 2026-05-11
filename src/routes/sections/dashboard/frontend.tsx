import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { Component } from "./utils";

export function getFrontendDashboardRoutes(): RouteObject[] {
	const frontendDashboardRoutes: RouteObject[] = [
		{ path: "telegram-search", element: Component("/pages/dashboard/telegram-search") },
		{ path: "workbench", element: <Navigate to="/workbench/search" replace /> },
		{ path: "workbench/:endpoint", element: Component("/pages/dashboard/workbench") },
		{ path: "analysis/stats", element: <Navigate to="/workbench/stats" replace /> },
		{ path: "analysis", element: <Navigate to="/workbench/stats" replace /> },
		{ path: "analysis/:endpoint", element: Component("/pages/dashboard/analysis") },
		{
			path: "management",
			children: [
				{ index: true, element: <Navigate to="user" replace /> },
				{
					path: "user",
					children: [
						{ index: true, element: <Navigate to="profile" replace /> },
						{ path: "profile", element: Component("/pages/management/user/profile") },
						{ path: "account", element: Component("/pages/management/user/account") },
					],
				},
				{
					path: "system",
					children: [
						{ index: true, element: <Navigate to="permission" replace /> },
						{ path: "permission", element: Component("/pages/management/system/permission") },
						{ path: "role", element: Component("/pages/management/system/role") },
						{ path: "user", element: Component("/pages/management/system/user") },
						{ path: "user/:id", element: Component("/pages/management/system/user/detail") },
						{ path: "accounts", element: Component("/pages/management/system/accounts") },
						{ path: "monitors", element: Component("/pages/management/system/monitors") },
					],
				},
			],
		},
	];
	return frontendDashboardRoutes;
}
