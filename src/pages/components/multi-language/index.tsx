import { Icon } from "@/components/icon";
import useLocale, { LANGUAGE_MAP } from "@/locales/use-locale";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
export default function MultiLanguagePage() {
	const {
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
					<CardTitle>Multi-language</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="text-sm text-muted-foreground">
						English, Russian, and Uzbek are available. On the first visit the app uses your browser language when it
						matches a supported locale; otherwise English is used. After you pick a language, it is stored in{" "}
						<code className="font-mono">localStorage</code> under <code className="font-mono">i18nextLng</code>.
					</p>
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
