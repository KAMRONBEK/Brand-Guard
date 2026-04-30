import { type MotionProps, m } from "motion/react";

import { varContainer } from "./variants";

interface Props extends MotionProps {
	className?: string;
}

/**
 * Scroll-triggered animation wrapper (`whileInView`). See Framer Motion scroll docs.
 * @see https://www.framer.com/motion/scroll-animations/#scroll-triggered-animations
 */
export default function MotionViewport({ children, className, ...other }: Props) {
	return (
		<m.div
			initial="initial"
			whileInView="animate"
			viewport={{ once: true, amount: 0.3 }}
			variants={varContainer()}
			className={className}
			{...other}
		>
			{children}
		</m.div>
	);
}
