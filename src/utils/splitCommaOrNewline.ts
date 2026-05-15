/** Split user paste/typing on commas and newlines; trim; drop empties. */
export function splitCommaOrNewlineSegments(raw: string): string[] {
	return raw
		.split(/[,\n\r]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}
