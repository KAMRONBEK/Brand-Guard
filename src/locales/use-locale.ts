import en_US from "antd/locale/en_US";
import ru_RU from "antd/locale/ru_RU";
import uz_UZ from "antd/locale/uz_UZ";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/ru";
import "dayjs/locale/uz-latn";

import type { Locale as AntdLocal } from "antd/es/locale";
import { useTranslation } from "react-i18next";
import { LocalEnum } from "#/enum";
import { APP_LOCALE_TO_DAYJS, APP_LOCALE_TO_HTML_LANG } from "./map-browser-language";

type Locale = keyof typeof LocalEnum;
type Language = {
	locale: keyof typeof LocalEnum;
	icon: string;
	label: string;
	antdLocal: AntdLocal;
};

export const LANGUAGE_MAP: Record<Locale, Language> = {
	[LocalEnum.en_US]: {
		locale: LocalEnum.en_US,
		label: "English",
		icon: "flag-us",
		antdLocal: en_US,
	},
	[LocalEnum.ru_RU]: {
		locale: LocalEnum.ru_RU,
		label: "Русский",
		icon: "flag-ru",
		antdLocal: ru_RU,
	},
	[LocalEnum.uz_UZ]: {
		locale: LocalEnum.uz_UZ,
		label: "Oʻzbekcha",
		icon: "flag-uz",
		antdLocal: uz_UZ,
	},
};

export default function useLocale() {
	const { t, i18n } = useTranslation();

	const locale = (i18n.resolvedLanguage || LocalEnum.en_US) as Locale;
	const language = LANGUAGE_MAP[locale] ?? LANGUAGE_MAP[LocalEnum.en_US];

	const setLocale = (next: Locale) => {
		i18n.changeLanguage(next);
		document.documentElement.lang = APP_LOCALE_TO_HTML_LANG[next];
		dayjs.locale(APP_LOCALE_TO_DAYJS[next]);
	};

	return {
		t,
		locale,
		language,
		setLocale,
	};
}
