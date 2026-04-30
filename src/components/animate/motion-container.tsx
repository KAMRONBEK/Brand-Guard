import { type MotionProps, m } from "motion/react";
import { varContainer } from "./variants/container";

interface Props extends MotionProps {
	className?: string;
}

/**
 * Framer Motion wrapper that applies shared `initial` / `animate` / `exit` variant names
 * so children can reuse staggered container variants from `varContainer`.
 */
export default function MotionContainer({ children, className }: Props) {
	return (
		<m.div initial="initial" animate="animate" exit="exit" variants={varContainer()} className={className}>
			{children}
		</m.div>
	);
}
