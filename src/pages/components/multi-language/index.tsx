import { StorageEnum } from "#/enum";
import { Icon } from "@/components/icon";
import useLocale, { LANGUAGE_MAP } from "@/locales/use-locale";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

export default function MultiLanguagePage() {
	const {
		t,
		setLocale,
		locale,
		language: { icon, label },
	} = useLocale();

	const localeOptions = Object.values(LANGUAGE_MAP);

	return (
		<>
			<Button variant="link" asChild>
				<a href="https://www.i18next.com/" style={{ color: themeVars.colors.palette.primary.default }}>
					https://www.i18next.com
				</a>
			</Button>
			<Button variant="link" asChild>
				<a href="https://ant.design/docs/react/i18n" style={{ color: themeVars.colors.palette.primary.default }}>
					https://ant.design/docs/react/i18n
				</a>
			</Button>
			<Card>
				<CardHeader>
					<CardTitle>{t("sys.i18nPage.cardTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="text-sm text-muted-foreground">{t("sys.i18nPage.body", { key: StorageEnum.I18N })}</p>
					<div className="flex flex-wrap gap-2">
						{localeOptions.map((item) => (
							<Button
								key={item.locale}
								type="button"
								variant={locale === item.locale ? "default" : "outline"}
								size="sm"
								onClick={() => setLocale(item.locale)}
							>
								{item.label}
							</Button>
						))}
					</div>

					<div className="flex items-center text-4xl">
						<Icon icon={`local:${icon}`} className="mr-4 rounded-md" size="30" />
						{label} ({locale})
					</div>
				</CardContent>
			</Card>
		</>
	);
}
