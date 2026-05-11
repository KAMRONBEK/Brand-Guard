/** Use for controlled `<input type="number">` — `Number("")` is `0` in JS. */
export type OptionalFiniteNumber = number | "";

export function optionalFiniteNumberDisplay(value: OptionalFiniteNumber): string | number {
	return value === "" ? "" : value;
}

export function setOptionalFiniteNumberFromInput(raw: string, setValue: (next: OptionalFiniteNumber) => void): void {
	if (raw === "") {
		setValue("");
		return;
	}
	const n = Number(raw);
	if (Number.isFinite(n)) {
		setValue(n);
	}
}

/** For API payloads when the UI field may be temporarily empty. */
export function finiteNumberOr(value: OptionalFiniteNumber, fallback: number): number {
	if (value === "" || !Number.isFinite(value)) {
		return fallback;
	}
	return value;
}
