import type { KeyboardEvent } from "react";
import Icon from "@/components/icon/icon";
import type { KeywordSearchRule } from "@/types/comment-api";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text } from "@/ui/typography";
import { cn } from "@/utils";
import { emptyKeywordRule, uniqPreserveOrder } from "@/utils/keyword-search-rules";
import { splitCommaOrNewlineSegments } from "@/utils/splitCommaOrNewline";

export interface KeywordRulesEditorCopy {
	sectionLabel: string;
	sectionHint?: string;
	primaryLabel: string;
	primaryHint: string;
	requiredLabel: string;
	requiredHint: string;
	excludedLabel: string;
	excludedHint: string;
	addRow: string;
	removeRowAria: (index: number) => string;
}

export interface KeywordRulesEditorProps {
	id: string;
	copy: KeywordRulesEditorCopy;
	value: KeywordSearchRule[];
	onChange: (next: KeywordSearchRule[]) => void;
	disabled?: boolean;
	className?: string;
}

export function KeywordRulesEditor({ id, copy, value, onChange, disabled, className }: KeywordRulesEditorProps) {
	const rows = value.length > 0 ? value : [emptyKeywordRule()];

	const patchRow = (index: number, patch: Partial<KeywordSearchRule>) => {
		const next = [...rows];
		const prev = next[index] ?? emptyKeywordRule();
		next[index] = { ...prev, ...patch };
		onChange(next);
	};

	const removeRow = (index: number) => {
		if (rows.length <= 1) {
			onChange([emptyKeywordRule()]);
			return;
		}
		onChange(rows.filter((_, i) => i !== index));
	};

	const focusInput = (rowIndex: number, field: "primary" | "required" | "excluded") => {
		document.getElementById(`${id}-row-${rowIndex}-${field}`)?.focus();
	};

	const handleEnterFocusNext =
		(rowIndex: number, field: "primary" | "required" | "excluded") => (e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
			e.preventDefault();
			if (field === "primary") {
				focusInput(rowIndex, "required");
			} else if (field === "required") {
				focusInput(rowIndex, "excluded");
			} else if (rowIndex < rows.length - 1) {
				focusInput(rowIndex + 1, "primary");
			} else {
				document.getElementById(`${id}-add-row`)?.focus();
			}
		};

	return (
		<div className={cn("space-y-3", className)}>
			<div className="space-y-1">
				<Label htmlFor={`${id}-row-0-primary`}>{copy.sectionLabel}</Label>
				{copy.sectionHint ? (
					<Text variant="caption" className="text-muted-foreground">
						{copy.sectionHint}
					</Text>
				) : null}
			</div>

			<div className="flex flex-col gap-3">
				{rows.map((rule, index) => (
					<div
						key={rule.clientRowKey ?? `${id}-kw-rule-${index}`}
						className="rounded-lg border border-border/80 bg-muted/15 p-3 sm:bg-muted/10"
					>
						<div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto] lg:items-start lg:gap-2">
							<div className="min-w-0 space-y-1.5">
								<Label htmlFor={`${id}-row-${index}-primary`} className="text-xs font-medium text-muted-foreground">
									{copy.primaryLabel}
								</Label>
								<Input
									id={`${id}-row-${index}-primary`}
									disabled={disabled}
									placeholder=""
									className="h-9"
									value={rule.keyword}
									onChange={(e) => patchRow(index, { keyword: e.target.value })}
									onKeyDown={handleEnterFocusNext(index, "primary")}
									autoComplete="off"
								/>
								<p className="text-xs text-muted-foreground">{copy.primaryHint}</p>
							</div>

							<div
								className="hidden shrink-0 items-center justify-center pt-7 text-muted-foreground lg:flex"
								aria-hidden
							>
								<Icon icon="mdi:arrow-right" size={18} />
							</div>

							<div className="min-w-0 space-y-1.5">
								<Label htmlFor={`${id}-row-${index}-required`} className="text-xs font-medium text-muted-foreground">
									{copy.requiredLabel}
								</Label>
								<Input
									id={`${id}-row-${index}-required`}
									disabled={disabled}
									className="h-9"
									value={(rule.required_keywords ?? []).join(", ")}
									onChange={(e) =>
										patchRow(index, {
											required_keywords: uniqPreserveOrder(splitCommaOrNewlineSegments(e.target.value)),
										})
									}
									onKeyDown={handleEnterFocusNext(index, "required")}
									autoComplete="off"
								/>
								<p className="text-xs text-muted-foreground">{copy.requiredHint}</p>
							</div>

							<div
								className="hidden shrink-0 items-center justify-center pt-7 text-muted-foreground lg:flex"
								aria-hidden
							>
								<Icon icon="mdi:arrow-right" size={18} />
							</div>

							<div className="min-w-0 space-y-1.5">
								<Label htmlFor={`${id}-row-${index}-excluded`} className="text-xs font-medium text-muted-foreground">
									{copy.excludedLabel}
								</Label>
								<Input
									id={`${id}-row-${index}-excluded`}
									disabled={disabled}
									className="h-9"
									value={(rule.excluded_keywords ?? []).join(", ")}
									onChange={(e) =>
										patchRow(index, {
											excluded_keywords: uniqPreserveOrder(splitCommaOrNewlineSegments(e.target.value)),
										})
									}
									onKeyDown={handleEnterFocusNext(index, "excluded")}
									autoComplete="off"
								/>
								<p className="text-xs text-muted-foreground">{copy.excludedHint}</p>
							</div>

							<div className="flex justify-end lg:items-start lg:pt-7">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 shrink-0 text-muted-foreground"
									disabled={disabled}
									onClick={() => removeRow(index)}
									aria-label={copy.removeRowAria(index)}
								>
									<Icon icon="mdi:close" size={18} aria-hidden />
								</Button>
							</div>
						</div>
					</div>
				))}
			</div>

			<Button
				type="button"
				id={`${id}-add-row`}
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() => onChange([...rows, emptyKeywordRule()])}
			>
				<Icon icon="mdi:plus" size={16} className="mr-1.5" aria-hidden />
				{copy.addRow}
			</Button>
		</div>
	);
}
