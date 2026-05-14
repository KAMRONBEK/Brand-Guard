import { useCallback, useRef, useState } from "react";

import Icon from "@/components/icon/icon";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/utils";

function splitIntoSegments(raw: string): string[] {
	return raw
		.split(/[,\n\r]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function mergeUnique(current: readonly string[], segments: readonly string[]): string[] {
	const next = [...current];
	for (const s of segments) {
		if (!next.includes(s)) next.push(s);
	}
	return next;
}

function applySegmentNormalizers(
	segments: string[],
	normalizeSegment: ((segment: string) => string) | undefined,
): string[] {
	if (!normalizeSegment) return segments;
	return segments.map((s) => normalizeSegment(s).trim()).filter(Boolean);
}

export interface MultiValueChipInputProps {
	id: string;
	label: string;
	hint?: string;
	values: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	removeItemAriaLabel: (value: string) => string;
	/** Applied to each token when committing (Enter, comma, blur) or paste. */
	normalizeSegment?: (segment: string) => string;
	className?: string;
}

/**
 * Tokens: comma or Enter commits typed text; paste with commas/newlines adds many; Backspace on empty removes last chip.
 */
export function MultiValueChipInput({
	id,
	label,
	hint,
	values,
	onChange,
	placeholder,
	disabled,
	removeItemAriaLabel,
	normalizeSegment,
	className,
}: MultiValueChipInputProps) {
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const valuesRef = useRef(values);
	valuesRef.current = values;

	const finalizeDraft = useCallback(
		(raw: string) => {
			const segments = applySegmentNormalizers(splitIntoSegments(raw), normalizeSegment);
			if (segments.length === 0) return;
			onChange(mergeUnique(valuesRef.current, segments));
			setDraft("");
		},
		[onChange, normalizeSegment],
	);

	const removeAt = (index: number) => {
		onChange(values.filter((_, i) => i !== index));
	};

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={id}>{label}</Label>
			<div
				className={cn(
					"flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow]",
					"focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
					disabled && "pointer-events-none opacity-50",
				)}
				onClick={(e) => {
					const t = e.target as HTMLElement;
					if (t.closest("input") || t.closest("[data-chip-remove]")) return;
					inputRef.current?.focus();
				}}
			>
				{values.map((value, index) => (
					<Badge key={value} variant="secondary" className="max-w-[min(100%,20rem)] gap-1 pl-2 pr-1 py-1">
						<span className="truncate" title={value}>
							{value}
						</span>
						<button
							type="button"
							data-chip-remove=""
							disabled={disabled}
							className="inline-flex shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
							aria-label={removeItemAriaLabel(value)}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => removeAt(index)}
						>
							<Icon icon="mdi:close" size={14} aria-hidden />
						</button>
					</Badge>
				))}
				<Input
					ref={inputRef}
					id={id}
					disabled={disabled}
					placeholder={values.length === 0 ? placeholder : undefined}
					className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0 shadow-none outline-none focus-visible:ring-0 h-8"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							finalizeDraft(draft);
							return;
						}
						if (e.key === ",") {
							e.preventDefault();
							finalizeDraft(draft);
							return;
						}
						if (e.key === "Backspace" && draft === "" && values.length > 0) {
							onChange(values.slice(0, -1));
						}
					}}
					onBlur={() => {
						if (draft.trim() !== "") finalizeDraft(draft);
					}}
					onPaste={(e) => {
						const text = e.clipboardData.getData("text");
						if (!/[\n\r,]/u.test(text)) return;
						e.preventDefault();
						const segments = applySegmentNormalizers(splitIntoSegments(text), normalizeSegment);
						onChange(mergeUnique(valuesRef.current, segments));
						setDraft("");
					}}
				/>
			</div>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}
