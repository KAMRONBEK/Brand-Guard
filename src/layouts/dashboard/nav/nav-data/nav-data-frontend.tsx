import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";

export const frontendNavData: NavProps["data"] = [
	{
		name: "sys.nav.dashboard",
		items: [
			{
				title: "sys.nav.workbench",
				path: "/workbench",
				icon: <Icon icon="local:ic-workbench" size="24" />,
				children: [
					{
						title: "sys.nav.platformsSearch",
						path: "/platforms-search",
						icon: <Icon icon="mdi:earth" size={18} />,
					},
					{
						title: "sys.nav.telegramSearch",
						path: "/telegram-search",
						icon: <Icon icon="mdi:telegram" size={18} />,
					},
					{
						title: "sys.nav.instagramSearchStream",
						path: "/workbench/search",
						icon: <Icon icon="skill-icons:instagram" size={18} />,
					},
					{
						title: "sys.nav.instagramPostCommentStream",
						path: "/workbench/post",
						icon: <Icon icon="skill-icons:instagram" size={18} />,
					},
					{
						title: "sys.nav.reports",
						path: "/workbench/stats",
						icon: <Icon icon="mdi:file-chart-outline" size={18} />,
					},
					{
						title: "sys.nav.facebookSearchStream",
						path: "/workbench/fbSearch",
						icon: <Icon icon="logos:facebook" size={18} />,
					},
					{
						title: "sys.nav.facebookPostComment",
						path: "/workbench/fbPost",
						icon: <Icon icon="logos:facebook" size={18} />,
					},
				],
			},
		],
	},
	{
		name: "sys.nav.pages",
		items: [
			// management
			{
				title: "sys.nav.management",
				path: "/management",
				icon: <Icon icon="local:ic-management" size="24" />,
				children: [
					{
						title: "sys.nav.user.index",
						path: "/management/user",
						children: [
							{
								title: "sys.nav.user.profile",
								path: "/management/user/profile",
							},
							{
								title: "sys.nav.user.account",
								path: "/management/user/account",
							},
						],
					},
					{
						title: "sys.nav.system.index",
						path: "/management/system",
						children: [
							{
								title: "sys.nav.system.permission",
								path: "/management/system/permission",
							},
							{
								title: "sys.nav.system.role",
								path: "/management/system/role",
							},
							{
								title: "sys.nav.system.user",
								path: "/management/system/user",
							},
							{
								title: "sys.nav.system.comment_accounts",
								path: "/management/system/accounts",
							},
							{
								title: "sys.nav.system.comment_monitors",
								path: "/management/system/monitors",
							},
						],
					},
				],
			},
		],
	},
];
