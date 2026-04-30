import { LocalEnum } from "#/enum";

const SUPPORTED = new Set<string>(Object.values(LocalEnum));

export function mapBrowserLanguageToAppLocale(detected: string): LocalEnum {
	const normalized = detected.trim().toLowerCase().replaceAll("-", "_");
	if (normalized.startsWith("ru")) {
		return LocalEnum.ru_RU;
	}
	if (normalized.startsWith("uz")) {
		return LocalEnum.uz_UZ;
	}
	if (normalized.startsWith("en")) {
		return LocalEnum.en_US;
	}
	if (SUPPORTED.has(detected)) {
		return detected as LocalEnum;
	}
	if (SUPPORTED.has(normalized)) {
		return normalized as LocalEnum;
	}
	return LocalEnum.en_US;
}

export const APP_LOCALE_TO_HTML_LANG: Record<LocalEnum, string> = {
	[LocalEnum.en_US]: "en",
	[LocalEnum.ru_RU]: "ru",
	[LocalEnum.uz_UZ]: "uz",
};

export const APP_LOCALE_TO_DAYJS: Record<LocalEnum, string> = {
	[LocalEnum.en_US]: "en",
	[LocalEnum.ru_RU]: "ru",
	[LocalEnum.uz_UZ]: "uz-latn",
};
