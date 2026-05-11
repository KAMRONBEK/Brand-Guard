/** Shorten URL for display while keeping href intact */
export function formatUrlForDisplay(fullUrl: string, maxLen = 48): string {
	try {
		const u = new URL(fullUrl);
		const host = u.hostname.replace(/^www\./, "");
		const pathAndQuery = u.pathname.replace(/\/$/, "") + u.search.replace(/#$/, "") + (u.pathname === "/" ? "" : "");
		const rest = `${host}${pathAndQuery}`;
		if (rest.length <= maxLen) return rest;
		return `${rest.slice(0, maxLen - 1)}…`;
	} catch {
		return fullUrl.length <= maxLen ? fullUrl : `${fullUrl.slice(0, maxLen - 1)}…`;
	}
}
