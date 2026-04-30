import en_US from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/en";

import type { Locale as AntdLocal } from "antd/es/locale";
import { useTranslation } from "react-i18next";
import { LocalEnum } from "#/enum";

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
};

export default function useLocale() {
	const { t, i18n } = useTranslation();

	const locale = (i18n.resolvedLanguage || LocalEnum.en_US) as Locale;
	const language = LANGUAGE_MAP[locale];

	const setLocale = (next: Locale) => {
		i18n.changeLanguage(next);
		document.documentElement.lang = "en";
		dayjs.locale("en");
	};

	return {
		t,
		locale,
		language,
		setLocale,
	};
}
