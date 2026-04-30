import type { MotionValue } from "motion/react";
import { useScroll } from "motion/react";
import { useMemo, useRef } from "react";

export type UseScrollProgressReturn = {
	scrollXProgress: MotionValue<number>;
	scrollYProgress: MotionValue<number>;
	/** Attach to the scrollable element when `target` is `"container"`. */
	elementRef: React.RefObject<HTMLDivElement | null>;
};

/** `"document"` uses window scroll; `"container"` uses `elementRef` as the scroll root. */
export type UseScrollProgress = "document" | "container";

/**
 * Thin wrapper around Motion `useScroll` for document vs. element scrolling.
 *
 * @example Document: `const { scrollYProgress } = useScrollProgress();`
 * @example Container: bind `elementRef` to your overflow element.
 */
export function useScrollProgress(target: UseScrollProgress = "document"): UseScrollProgressReturn {
	const elementRef = useRef<HTMLDivElement>(null);

	const options = { container: elementRef };

	const { scrollYProgress, scrollXProgress } = useScroll(target === "container" ? options : undefined);

	const memoizedValue = useMemo(
		() => ({ elementRef, scrollXProgress, scrollYProgress }),
		[scrollXProgress, scrollYProgress],
	);

	return memoizedValue;
}
