import { useMemo } from "react";
import type { NavItemDataProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { useUserPermissions } from "@/store/userStore";
import { checkAny } from "@/utils";
import { backendNavData } from "./nav-data-backend";
import { frontendNavData } from "./nav-data-frontend";

const navData = GLOBAL_CONFIG.routerMode === "backend" ? backendNavData : frontendNavData;

/** Recursively drop nav nodes the user cannot access. */
const filterItems = (items: NavItemDataProps[], permissions: string[]) => {
	return items.filter((item) => {
		const hasPermission = item.auth ? checkAny(item.auth, permissions) : true;

		if (item.children?.length) {
			const filteredChildren = filterItems(item.children, permissions);
			if (filteredChildren.length === 0) {
				return false;
			}
			item.children = filteredChildren;
		}

		return hasPermission;
	});
};

/** Filter each sidebar group; remove empty groups. */
const filterNavData = (permissions: string[]) => {
	return navData
		.map((group) => {
			const filteredItems = filterItems(group.items, permissions);

			if (filteredItems.length === 0) {
				return null;
			}

			return {
				...group,
				items: filteredItems,
			};
		})
		.filter((group): group is NonNullable<typeof group> => group !== null);
};

/**
 * Hook to get filtered navigation data based on user permissions
 * @returns Filtered navigation data
 */
export const useFilteredNavData = () => {
	const permissions = useUserPermissions();
	const permissionCodes = useMemo(() => permissions.map((p) => p.code), [permissions]);
	const filteredNavData = useMemo(() => filterNavData(permissionCodes), [permissionCodes]);
	return filteredNavData;
};
