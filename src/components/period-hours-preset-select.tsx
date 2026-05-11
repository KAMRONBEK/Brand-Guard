import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

/** Hours sent as `period_hours`; one month encoded as 30×24 h for API consistency. */
export const PERIOD_HOUR_PRESETS = [1, 6, 12, 24, 168, 720] as const;
export type PeriodHourPresetValue = (typeof PERIOD_HOUR_PRESETS)[number];

/** One month preset (30×24 h); kept visible but not selectable from the list. */
const DISABLED_MONTH_PRESET_HOURS = 720;

/** Radix Select value for custom hours — not a numeric string so it cannot clash with presets. */
const CUSTOM_HOURS_KEY = "__period_hours_custom__";

/** Upper bound when clamping user-entered `period_hours`. */
const MAX_PERIOD_HOURS = 8760;

function isPresetHours(hours: number): hours is PeriodHourPresetValue {
	return (PERIOD_HOUR_PRESETS as readonly number[]).includes(hours);
}

function clampHours(n: number): number {
	if (!Number.isFinite(n)) return 1;
	return Math.min(MAX_PERIOD_HOURS, Math.max(1, Math.floor(n)));
}

export interface PeriodHoursPresetSelectProps {
	disabled?: boolean;
	id: string;
	label: string;
	value: number;
	onHoursChange: (hours: number) => void;
}

/**
 * Preset list plus free-form hours. Radix Select `value` must not collapse to a preset hour
 * when the user chose “Custom” but the numeric value still matches a preset (e.g. 24).
 * `customMode` tracks that explicitly.
 */
export function PeriodHoursPresetSelect({ disabled, id, label, value, onHoursChange }: PeriodHoursPresetSelectProps) {
	const { t } = useTranslation();
	const [customMode, setCustomMode] = useState(() => !isPresetHours(value));
	const [customText, setCustomText] = useState(() =>
		!isPresetHours(value) ? String(value) : String(clampHours(value)),
	);

	const selectValue = customMode ? CUSTOM_HOURS_KEY : String(value);

	useEffect(() => {
		if (!isPresetHours(value)) {
			setCustomMode(true);
			setCustomText(String(value));
		}
	}, [value]);

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select
				disabled={disabled}
				value={selectValue}
				onValueChange={(next) => {
					if (next === CUSTOM_HOURS_KEY) {
						setCustomMode(true);
						setCustomText(String(clampHours(value)));
						return;
					}
					setCustomMode(false);
					onHoursChange(Number(next));
				}}
			>
				<SelectTrigger id={id} className="w-full min-w-0">
					<SelectValue />
				</SelectTrigger>
				<SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
					{PERIOD_HOUR_PRESETS.map((hours) => (
						<SelectItem key={hours} value={String(hours)} disabled={hours === DISABLED_MONTH_PRESET_HOURS}>
							{t(`sys.periodHourPreset.${hours}`)}
						</SelectItem>
					))}
					<SelectItem value={CUSTOM_HOURS_KEY}>{t("sys.periodHourPreset.custom")}</SelectItem>
				</SelectContent>
			</Select>
			{customMode ? (
				<div className="space-y-1">
					<Label htmlFor={`${id}-custom`} className="text-muted-foreground text-xs font-normal">
						{t("sys.periodHourPreset.customHoursLabel")}
					</Label>
					<Input
						id={`${id}-custom`}
						type="number"
						min={1}
						max={MAX_PERIOD_HOURS}
						step={1}
						disabled={disabled}
						value={customText}
						onChange={(event) => {
							const raw = event.target.value;
							setCustomText(raw);
							const n = Number.parseInt(raw, 10);
							if (Number.isFinite(n)) {
								onHoursChange(clampHours(n));
							}
						}}
						onBlur={() => {
							if (customText.trim() === "") {
								const n = clampHours(value);
								setCustomText(String(n));
								onHoursChange(n);
								return;
							}
							const n = clampHours(Number.parseInt(customText, 10));
							setCustomText(String(n));
							onHoursChange(n);
						}}
					/>
				</div>
			) : null}
		</div>
	);
}
