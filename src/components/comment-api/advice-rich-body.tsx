import { cn } from "@/utils";

const BULLET_RE = /^[-•*–—]\s+/;
/** Line starts with a simple numbered step (`1.` or `2)`). */
const ORDERED_RE = /^\d+[.)]\s+/;

interface AdviceRichBodyProps {
	text: string;
	className?: string;
}

function normalize(raw: string): string {
	return raw.replace(/\r\n/g, "\n").trim();
}

function splitSentences(text: string): string[] {
	try {
		const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
		if (typeof Seg !== "undefined") {
			const seg = new Seg(undefined, { granularity: "sentence" });
			const out: string[] = [];
			for (const { segment } of seg.segment(text) as Iterable<{ segment: string }>) {
				const s = segment.trim();
				if (s) out.push(s);
			}
			if (out.length > 1) return out;
		}
	} catch {
		/* fall through */
	}
	return text
		.split(/(?<=[.!?…])\s+(?=\S)/)
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Turn a single dense line into readable paragraphs (~targetLen chars each). */
function chunkProseChunks(text: string, targetLen = 300): string[] {
	const trimmed = text.trim();
	if (!trimmed) return [];

	const paragraphs = trimmed
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);
	const out: string[] = [];

	for (const paragraph of paragraphs) {
		const lines = paragraph
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length !== 1) {
			out.push(lines.join("\n"));
			continue;
		}

		const line = lines[0];
		if (line.length <= targetLen) {
			out.push(line);
			continue;
		}

		const sentences = splitSentences(line);
		if (sentences.length <= 1) {
			const clauses = splitBySemicolonClauses(line);
			if (clauses) {
				out.push(...clauses);
				continue;
			}
			out.push(line);
			continue;
		}

		let buf = "";
		const flush = () => {
			if (buf.trim()) out.push(buf.trim());
			buf = "";
		};

		for (const s of sentences) {
			if (!buf) buf = s;
			else if (buf.length + 1 + s.length > targetLen) {
				flush();
				buf = s;
			} else buf = `${buf} ${s}`;
		}
		flush();
	}

	return out;
}

/** Fallback when one line has multiple administrative clauses separated by ';'. */
function splitBySemicolonClauses(text: string): string[] | undefined {
	const t = text.trim();
	if (t.length < 380 || !t.includes(";")) return undefined;
	const parts = t
		.split(/;\s+/)
		.map((s) => s.trim())
		.filter(Boolean);
	if (parts.length < 2) return undefined;
	const longest = Math.max(...parts.map((p) => p.length));
	if (parts.length < 3 && longest < 260) return undefined;
	const minTail = Math.min(...parts.map((p) => p.length));
	if (parts.length === 2 && minTail < 24) return undefined;
	return parts;
}

/** Deterministic React key — avoids leaking array index while staying stable for static AI text blobs. */
function adviceBlockKey(segment: string, position: number, body: string): string {
	let h = 5381 >>> 0;
	const mix = `${segment}|${position}|${body.slice(0, 320)}`;
	for (let i = 0; i < mix.length; i++) {
		h = (Math.imul(33, h) ^ mix.charCodeAt(i)) >>> 0;
	}
	return `${segment}_${h.toString(36)}`;
}

function BulletList({ items }: { items: string[] }) {
	return (
		<ul className="my-1 list-none space-y-2.5 pl-0">
			{items.map((item, position) => (
				<li key={adviceBlockKey("bullet", position, item)} className="flex gap-3 text-pretty leading-relaxed">
					<span
						className="mt-[0.45em] inline-block size-1.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/15"
						aria-hidden
					/>
					<span className="min-w-0 flex-1">{item}</span>
				</li>
			))}
		</ul>
	);
}

function OrderedList({ items }: { items: string[] }) {
	return (
		<ol className="my-1 list-decimal space-y-2.5 pl-8 marker:text-sm marker:font-semibold marker:text-primary">
			{items.map((item, position) => (
				<li key={adviceBlockKey("ord", position, item)} className="text-pretty pl-2 leading-relaxed">
					{item}
				</li>
			))}
		</ol>
	);
}

function renderParagraphGroup(body: string) {
	const lines = body
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	if (lines.length === 0) return null;

	if (lines.length >= 2 && lines.every((l) => BULLET_RE.test(l))) {
		return <BulletList items={lines.map((l) => l.replace(BULLET_RE, "").trim())} />;
	}

	if (lines.length >= 2 && lines.every((l) => ORDERED_RE.test(l))) {
		return <OrderedList items={lines.map((l) => l.replace(ORDERED_RE, "").trim())} />;
	}

	if (lines.length >= 2) {
		return (
			<div className="space-y-2.5">
				{lines.map((line, position) => (
					<p key={adviceBlockKey("para", position, line)} className="text-pretty leading-relaxed">
						{line}
					</p>
				))}
			</div>
		);
	}

	const chunks = chunkProseChunks(lines[0]);
	if (chunks.length >= 3 && chunks.every((c) => c.length < 240)) {
		return <BulletList items={chunks} />;
	}
	return (
		<div className="space-y-2.5">
			{chunks.map((chunk, position) => (
				<p key={adviceBlockKey("chunk", position, chunk)} className="text-pretty leading-relaxed whitespace-pre-wrap">
					{chunk}
				</p>
			))}
		</div>
	);
}

/**
 * Rich body for AI advice: honours blank-line paragraphs, bullets / numbering,
 * and breaks dense prose into shorter paragraphs via sentence boundaries.
 */
export function AdviceRichBody({ text, className }: AdviceRichBodyProps) {
	const normalized = normalize(text);
	if (!normalized) return null;

	const segments = normalized
		.split(/\n{2,}/)
		.map((s) => s.trim())
		.filter(Boolean);

	return (
		<div className={cn("max-w-[65ch] text-[0.9375rem] leading-[1.7] tracking-[-0.01em] text-foreground/95", className)}>
			{segments.map((segment, position) => (
				<div key={adviceBlockKey("seg", position, segment)} className={position > 0 ? "mt-4" : undefined}>
					{renderParagraphGroup(segment)}
				</div>
			))}
		</div>
	);
}
