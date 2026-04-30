import { Icon } from "@/components/icon";
import LocalePicker from "@/components/locale-picker";
import { GLOBAL_CONFIG } from "@/global-config";
import { useSettings } from "@/store/settingStore";
import { Button } from "@/ui/button";
import { cn } from "@/utils";
import type { ReactNode } from "react";
import AccountDropdown from "../components/account-dropdown";
import BreadCrumb from "../components/bread-crumb";
import NoticeButton from "../components/notice";
import SearchBar from "../components/search-bar";
import SettingButton from "../components/setting-button";

interface HeaderProps {
	leftSlot?: ReactNode;
}

export default function Header({ leftSlot }: HeaderProps) {
	const { breadCrumb } = useSettings();
	return (
		<header
			data-slot="brand-guard-layout-header"
			className={cn(
				"sticky top-0 left-0 right-0 z-app-bar",
				"flex items-center justify-between px-2 grow-0 shrink-0",
				"bg-background/60 backdrop-blur-xl",
				"h-[var(--layout-header-height)] ",
			)}
		>
			<div className="flex items-center">
				{leftSlot}

				<div className="hidden md:block ml-4">{breadCrumb && <BreadCrumb />}</div>
			</div>

			<div className="flex items-center gap-1">
				<SearchBar />
				<LocalePicker />
				{GLOBAL_CONFIG.repositoryUrl ? (
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full"
						onClick={() => window.open(GLOBAL_CONFIG.repositoryUrl)}
					>
						<Icon icon="mdi:github" size={24} />
					</Button>
				) : null}
				{GLOBAL_CONFIG.communityUrl ? (
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full"
						onClick={() => window.open(GLOBAL_CONFIG.communityUrl)}
					>
						<Icon icon="carbon:logo-discord" size={24} />
					</Button>
				) : null}
				<NoticeButton />
				<SettingButton />
				<AccountDropdown />
			</div>
		</header>
	);
}
