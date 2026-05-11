import dayjs from "dayjs";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import "dayjs/locale/en";
import "dayjs/locale/ru";
import "dayjs/locale/uz-latn";
import { LocalEnum, StorageEnum } from "#/enum";
import en_US from "./lang/en_US";
import ru_RU from "./lang/ru_RU";
import uz_UZ from "./lang/uz_UZ";
import { APP_LOCALE_TO_DAYJS, APP_LOCALE_TO_HTML_LANG, mapBrowserLanguageToAppLocale } from "./map-browser-language";

function syncLocaleSideEffects(lng: string | null | undefined) {
	const appLocale = lng ? mapBrowserLanguageToAppLocale(lng) : LocalEnum.ru_RU;
	document.documentElement.lang = APP_LOCALE_TO_HTML_LANG[appLocale];
	dayjs.locale(APP_LOCALE_TO_DAYJS[appLocale]);
}

i18n.on("languageChanged", syncLocaleSideEffects);

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		debug: false,
		lng: LocalEnum.ru_RU,
		fallbackLng: LocalEnum.ru_RU,
		supportedLngs: [LocalEnum.en_US, LocalEnum.ru_RU, LocalEnum.uz_UZ],
		nonExplicitSupportedLngs: false,
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ["localStorage"],
			caches: ["localStorage"],
			lookupLocalStorage: StorageEnum.I18N,
			convertDetectedLanguage: (lng) => mapBrowserLanguageToAppLocale(lng),
		},
		resources: {
			en_US: { translation: en_US },
			ru_RU: { translation: ru_RU },
			uz_UZ: { translation: uz_UZ },
		},
	})
	.then(() => {
		syncLocaleSideEffects(i18n.resolvedLanguage);
	});

export const { t } = i18n;
export default i18n;
