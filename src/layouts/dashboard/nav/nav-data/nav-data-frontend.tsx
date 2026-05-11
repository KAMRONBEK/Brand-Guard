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
						title: "sys.nav.telegramSearch",
						path: "/telegram-search",
						icon: <Icon icon="mdi:telegram" size={18} />,
					},
					{
						title: "sys.workbench.tabs.search",
						path: "/workbench/search",
						icon: <Icon icon="solar:magnifer-bold-duotone" size={18} />,
					},
					{
						title: "sys.analysis.tabs.stats",
						path: "/workbench/stats",
						icon: <Icon icon="mdi:chart-donut" size={18} />,
					},
					// {
					// 	title: "sys.workbench.tabs.post",
					// 	path: "/workbench/post",
					// 	icon: <Icon icon="solar:plain-bold-duotone" size={18} />,
					// },
					// {
					// 	title: "sys.workbench.tabs.autoReply",
					// 	path: "/workbench/autoReply",
					// 	icon: <Icon icon="mdi:message-reply-text-outline" size={18} />,
					// },
					// {
					// 	title: "sys.workbench.tabs.campaign",
					// 	path: "/workbench/campaign",
					// 	icon: <Icon icon="mdi:bullhorn-outline" size={18} />,
					// },
					{
						title: "sys.workbench.tabs.facebookSearch",
						path: "/workbench/fbSearch",
						icon: <Icon icon="mdi:facebook-messenger-outline" size={18} />,
					},
					// {
					// 	title: "sys.workbench.tabs.facebookAccount",
					// 	path: "/workbench/fbAccount",
					// 	icon: <Icon icon="mdi:facebook" size={18} />,
					// },
					{
						title: "sys.workbench.tabs.facebookFetch",
						path: "/workbench/fbFetch",
						icon: <Icon icon="solar:document-text-bold-duotone" size={18} />,
					},
					// {
					// 	title: "sys.workbench.tabs.facebookPost",
					// 	path: "/workbench/fbPost",
					// 	icon: <Icon icon="mdi:send-outline" size={18} />,
					// },
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
