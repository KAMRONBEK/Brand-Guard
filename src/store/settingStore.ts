import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { StorageEnum, ThemeColorPresets, ThemeLayout, ThemeMode } from "#/enum";
import { FontFamilyPreset, typographyTokens } from "@/theme/tokens/typography";

export type SettingsType = {
	themeColorPresets: ThemeColorPresets;
	themeMode: ThemeMode;
	themeLayout: ThemeLayout;
	themeStretch: boolean;
	breadCrumb: boolean;
	accordion: boolean;
	multiTab: boolean;
	darkSidebar: boolean;
	fontFamily: string;
	fontSize: number;
	direction: "ltr" | "rtl";
};
type SettingStore = {
	settings: SettingsType;
	// All imperative updates live under `actions`.
	actions: {
		setSettings: (settings: SettingsType) => void;
		clearSettings: () => void;
	};
};

const useSettingStore = create<SettingStore>()(
	persist(
		(set) => ({
			settings: {
				themeColorPresets: ThemeColorPresets.Default,
				themeMode: ThemeMode.Light,
				themeLayout: ThemeLayout.Vertical,
				themeStretch: false,
				breadCrumb: true,
				accordion: false,
				multiTab: false,
				darkSidebar: false,
				fontFamily: FontFamilyPreset.openSans,
				fontSize: Number(typographyTokens.fontSize.sm),
				direction: "ltr",
			},
			actions: {
				setSettings: (settings) => {
					set({ settings });
				},
				clearSettings() {
					useSettingStore.persist.clearStorage();
				},
			},
		}),
		{
			name: StorageEnum.Settings, // name of the item in the storage (must be unique)
			storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
			partialize: (state) => ({ [StorageEnum.Settings]: state.settings }),
		},
	),
);

export const useSettings = () => useSettingStore((state) => state.settings);
export const useSettingActions = () => useSettingStore((state) => state.actions);
