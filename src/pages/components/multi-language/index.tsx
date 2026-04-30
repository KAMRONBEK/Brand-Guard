import { LocalEnum } from "#/enum";
import { Icon } from "@/components/icon";
import useLocale from "@/locales/use-locale";
import { themeVars } from "@/theme/theme.css";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

export default function MultiLanguagePage() {
	const {
		setLocale,
		locale,
		language: { icon, label },
	} = useLocale();

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
					<CardTitle>Flexible</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<p className="text-sm text-muted-foreground">
						The UI is shipped in English only. Locale is fixed to <code className="font-mono">en_US</code>.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() => setLocale(LocalEnum.en_US)}
					>
						Reset locale to English
					</Button>

					<div className="flex items-center text-4xl">
						<Icon icon={`local:${icon}`} className="mr-4 rounded-md" size="30" />
						{label} ({locale})
					</div>
				</CardContent>
			</Card>
		</>
	);
}
