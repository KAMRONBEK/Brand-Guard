import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { LocalEnum, StorageEnum } from "#/enum";
import { getStringItem } from "@/utils/storage";
import en_US from "./lang/en_US";

const stored = getStringItem(StorageEnum.I18N);
const defaultLng = stored === LocalEnum.en_US ? stored : LocalEnum.en_US;

// Set HTML lang early so the browser does not prompt to translate when it mismatches OS language.
document.documentElement.lang = "en";

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		debug: true,
		lng: defaultLng,
		fallbackLng: LocalEnum.en_US,
		supportedLngs: [LocalEnum.en_US],
		nonExplicitSupportedLngs: false,
		interpolation: {
			escapeValue: false,
		},
		resources: {
			en_US: { translation: en_US },
		},
	});

export const { t } = i18n;
export default i18n;
