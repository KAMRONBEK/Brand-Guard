import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";
import { Badge } from "@/ui/badge";

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
						title: "sys.workbench.tabs.post",
						path: "/workbench/post",
						icon: <Icon icon="solar:plain-bold-duotone" size={18} />,
					},
					{
						title: "sys.workbench.tabs.autoReply",
						path: "/workbench/autoReply",
						icon: <Icon icon="mdi:message-reply-text-outline" size={18} />,
					},
					{
						title: "sys.workbench.tabs.campaign",
						path: "/workbench/campaign",
						icon: <Icon icon="mdi:bullhorn-outline" size={18} />,
					},
					{
						title: "sys.workbench.tabs.facebookAccount",
						path: "/workbench/fbAccount",
						icon: <Icon icon="mdi:facebook" size={18} />,
					},
					{
						title: "sys.workbench.tabs.facebookFetch",
						path: "/workbench/fbFetch",
						icon: <Icon icon="solar:document-text-bold-duotone" size={18} />,
					},
					{
						title: "sys.workbench.tabs.facebookPost",
						path: "/workbench/fbPost",
						icon: <Icon icon="mdi:send-outline" size={18} />,
					},
				],
			},
			{
				title: "sys.nav.analysis",
				path: "/analysis",
				icon: <Icon icon="local:ic-analysis" size="24" />,
				children: [
					{
						title: "sys.analysis.tabs.fetch",
						path: "/analysis/fetch",
						icon: <Icon icon="mdi:file-search-outline" size={18} />,
					},
					{
						title: "sys.analysis.tabs.list",
						path: "/analysis/list",
						icon: <Icon icon="mdi:comment-text-multiple-outline" size={18} />,
					},
					{
						title: "sys.analysis.tabs.stats",
						path: "/analysis/stats",
						icon: <Icon icon="mdi:chart-donut" size={18} />,
					},
					{
						title: "sys.analysis.tabs.account",
						path: "/analysis/account",
						icon: <Icon icon="mdi:account-search-outline" size={18} />,
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
			// menulevel
			{
				title: "sys.nav.menulevel.index",
				path: "/menu_level",
				icon: <Icon icon="local:ic-menulevel" size="24" />,
				children: [
					{
						title: "sys.nav.menulevel.1a",
						path: "/menu_level/1a",
					},
					{
						title: "sys.nav.menulevel.1b.index",
						path: "/menu_level/1b",
						children: [
							{
								title: "sys.nav.menulevel.1b.2a",
								path: "/menu_level/1b/2a",
							},
							{
								title: "sys.nav.menulevel.1b.2b.index",
								path: "/menu_level/1b/2b",
								children: [
									{
										title: "sys.nav.menulevel.1b.2b.3a",
										path: "/menu_level/1b/2b/3a",
									},
									{
										title: "sys.nav.menulevel.1b.2b.3b",
										path: "/menu_level/1b/2b/3b",
									},
								],
							},
						],
					},
				],
			},
			// errors
			{
				title: "sys.nav.error.index",
				path: "/error",
				icon: <Icon icon="bxs:error-alt" size="24" />,
				children: [
					{
						title: "sys.nav.error.403",
						path: "/error/403",
					},
					{
						title: "sys.nav.error.404",
						path: "/error/404",
					},
					{
						title: "sys.nav.error.500",
						path: "/error/500",
					},
				],
			},
		],
	},
	{
		name: "sys.nav.ui",
		items: [
			// components
			{
				title: "sys.nav.components",
				path: "/components",
				icon: <Icon icon="solar:widget-5-bold-duotone" size="24" />,
				caption: "sys.nav.custom_ui_components",
				children: [
					{
						title: "sys.nav.icon",
						path: "/components/icon",
					},
					{
						title: "sys.nav.animate",
						path: "/components/animate",
					},
					{
						title: "sys.nav.scroll",
						path: "/components/scroll",
					},
					{
						title: "sys.nav.i18n",
						path: "/components/multi-language",
					},
					{
						title: "sys.nav.upload",
						path: "/components/upload",
					},
					{
						title: "sys.nav.chart",
						path: "/components/chart",
					},
					{
						title: "sys.nav.toast",
						path: "/components/toast",
					},
				],
			},
			// functions
			{
				title: "sys.nav.functions",
				path: "/functions",
				icon: <Icon icon="solar:plain-2-bold-duotone" size="24" />,
				children: [
					{
						title: "sys.nav.clipboard",
						path: "/functions/clipboard",
					},
					{
						title: "sys.nav.token_expired",
						path: "/functions/token_expired",
					},
				],
			},
		],
	},
	{
		name: "sys.nav.others",
		items: [
			{
				title: "sys.nav.permission_demo.index",
				path: "/permission",
				icon: <Icon icon="mingcute:safe-lock-fill" size="24" />,
			},
			{
				title: "sys.nav.permission_demo.page_test",
				path: "/permission/page-test",
				icon: <Icon icon="mingcute:safe-lock-fill" size="24" />,
				auth: ["permission:read"],
				hidden: true,
			},
			{
				title: "sys.nav.calendar",
				path: "/calendar",
				icon: <Icon icon="solar:calendar-bold-duotone" size="24" />,
				info: <Badge variant="warning">+12</Badge>,
			},
			{
				title: "sys.nav.kanban",
				path: "/kanban",
				icon: <Icon icon="solar:clipboard-bold-duotone" size="24" />,
			},
			{
				title: "sys.nav.disabled",
				path: "/disabled",
				icon: <Icon icon="local:ic-disabled" size="24" />,
				disabled: true,
			},
			{
				title: "sys.nav.label",
				path: "#label",
				icon: <Icon icon="local:ic-label" size="24" />,
				info: (
					<Badge variant="info">
						<Icon icon="solar:bell-bing-bold-duotone" size={14} />
						New
					</Badge>
				),
			},
			{
				title: "sys.nav.link",
				path: "/link",
				icon: <Icon icon="local:ic-external" size="24" />,
				children: [
					{
						title: "sys.nav.external_link",
						path: "/link/external-link",
					},
					{
						title: "sys.nav.iframe",
						path: "/link/iframe",
					},
				],
			},
			{
				title: "sys.nav.blank",
				path: "/blank",
				icon: <Icon icon="local:ic-blank" size="24" />,
			},
		],
	},
];
