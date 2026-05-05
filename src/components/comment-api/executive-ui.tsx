import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Card, CardContent } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";

export function WorkflowShell({
	title,
	description,
	platform,
	intent,
	children,
	className,
}: {
	title: string;
	description: string;
	platform?: "Instagram" | "Facebook" | "Brand Guard";
	intent?: string;
	children: ReactNode;
	className?: string;
}) {
	const icon =
		platform === "Facebook" ? "logos:facebook" : platform === "Instagram" ? "skill-icons:instagram" : "mdi:shield-star";

	return (
		<Card className={cn("overflow-hidden border-border/70 bg-card/95 shadow-sm", className)}>
			<div className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-5 py-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-3">
						<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
							<Icon icon={icon} size={24} />
						</div>
						<div>
							<div className="mb-2 flex flex-wrap items-center gap-2">
								{platform && <Badge variant="outline">{platform}</Badge>}
								{intent && <Badge variant="info">{intent}</Badge>}
							</div>
							<Title as="h3" className="text-xl font-semibold">
								{title}
							</Title>
							<Text variant="body2" className="mt-1 max-w-3xl text-muted-foreground">
								{description}
							</Text>
						</div>
					</div>
				</div>
			</div>
			<CardContent className="flex flex-col gap-5 p-5">{children}</CardContent>
		</Card>
	);
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="rounded-2xl border bg-background/60 p-4">
			<div className="mb-3 text-sm font-semibold">{title}</div>
			{children}
		</div>
	);
}

export function InsightEmptyState({ title, description }: { title: string; description: string }) {
	return (
		<Card className="border-dashed bg-muted/20">
			<CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
					<Icon icon="mdi:chart-line-variant" size={24} />
				</div>
				<div className="text-base font-semibold">{title}</div>
				<Text variant="body2" className="max-w-md text-muted-foreground">
					{description}
				</Text>
			</CardContent>
		</Card>
	);
}
