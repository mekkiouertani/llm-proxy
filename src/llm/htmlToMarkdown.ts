export type PageMetadata = {
	title: string;
	url: string;
	description: string;
	keyword: string;
	lastModified: string;
};

type BuildMarkdownInput = {
	html: string;
	sourceUrl: string;
	responseHeaders: Headers;
};

const COMPANY_BLOCK = [
	"___________",
	"www.tuurbo.ai | The results of a web & IT marketing team in one AI tool",
	"Tuurbo S.r.l. P.IVA/VAT: IT06099510874 - Via A. Fleming SNC, Aci Sant'Antonio, 95025 Catania (CT), Italia",
	"Cap.Soc. €13.825,26 (I.V.) - info@tuurbo.ai - tuurbo@pec.it",
].join("\n");

export function buildMarkdownPage(input: BuildMarkdownInput): string {
	const metadata = extractMetadata(input);
	const content = htmlToMarkdown(input.html);

	return [
		`# ${metadata.title}`,
		`url: ${metadata.url}`,
		`description: ${metadata.description}`,
		`keyword: ${metadata.keyword}`,
		`last-modified: ${metadata.lastModified}`,
		"---",
		"",
		COMPANY_BLOCK,
		"",
		content || "_No readable content found._",
		"",
	].join("\n");
}

function extractMetadata(input: BuildMarkdownInput): PageMetadata {
	const canonical = findLinkHref(input.html, "canonical") ?? input.sourceUrl;
	const title =
		findMetaContent(input.html, "og:title") ??
		findTagText(input.html, "title") ??
		"Untitled page";

	return {
		title: cleanText(title),
		url: canonical,
		description: cleanText(
			findMetaContent(input.html, "description") ??
				findMetaContent(input.html, "og:description") ??
				"",
		),
		keyword: cleanText(findMetaContent(input.html, "keywords") ?? ""),
		lastModified:
			input.responseHeaders.get("last-modified") ??
			findMetaContent(input.html, "last-modified") ??
			new Date().toISOString(),
	};
}

function htmlToMarkdown(html: string): string {
	const body = findTagInnerHtml(html, "body") ?? html;
	let readableHtml = body
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
		.replace(/<(nav|footer|aside|form|button|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
		.replace(
			/<([a-z0-9-]+)[^>]*(cookie|banner|modal|newsletter|social|breadcrumb)[^>]*>[\s\S]*?<\/\1>/gi,
			" ",
		);

	readableHtml = readableHtml
		.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text: string) => {
			return `\n# ${cleanText(text)}\n`;
		})
		.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text: string) => {
			return `\n## ${cleanText(text)}\n`;
		})
		.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text: string) => {
			return `\n### ${cleanText(text)}\n`;
		})
		.replace(/<h([4-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => {
			return `\n${"#".repeat(Number(level))} ${cleanText(text)}\n`;
		})
		.replace(/<img\b([^>]*)>/gi, (_, attrs: string) => {
			const alt = getAttribute(attrs, "alt");
			const src = getAttribute(attrs, "src");
			if (!alt && !src) return " ";
			return src ? `![${cleanText(alt ?? "")}](${src})` : cleanText(alt ?? "");
		})
		.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs: string, text: string) => {
			const label = cleanText(text);
			const href = getAttribute(attrs, "href");
			if (!label) return " ";
			return href ? `[${label}](${href})` : label;
		})
		.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text: string) => {
			return `\n- ${cleanText(text)}`;
		})
		.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text: string) => {
			return `\n${cleanText(text)}\n`;
		})
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(section|article|main|div|ul|ol)>/gi, "\n")
		.replace(/<[^>]+>/g, " ");

	return normalizeMarkdown(decodeHtmlEntities(readableHtml));
}

function findTagText(html: string, tagName: string): string | undefined {
	const innerHtml = findTagInnerHtml(html, tagName);
	return innerHtml ? cleanText(innerHtml) : undefined;
}

function findTagInnerHtml(html: string, tagName: string): string | undefined {
	const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
	return match?.[1];
}

function findMetaContent(html: string, name: string): string | undefined {
	const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
	const normalizedName = name.toLowerCase();

	for (const tag of metaTags) {
		const tagName = getAttribute(tag, "name")?.toLowerCase();
		const property = getAttribute(tag, "property")?.toLowerCase();

		if (tagName === normalizedName || property === normalizedName) {
			return getAttribute(tag, "content");
		}
	}

	return undefined;
}

function findLinkHref(html: string, rel: string): string | undefined {
	const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
	const normalizedRel = rel.toLowerCase();

	for (const tag of linkTags) {
		const tagRel = getAttribute(tag, "rel")?.toLowerCase();

		if (tagRel === normalizedRel) {
			return getAttribute(tag, "href");
		}
	}

	return undefined;
}

function getAttribute(source: string, name: string): string | undefined {
	const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
	const match = source.match(pattern);
	return match?.[2] ?? match?.[3] ?? match?.[4];
}

function cleanText(value: string): string {
	return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeMarkdown(value: string): string {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line, index, lines) => line || lines[index - 1])
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function decodeHtmlEntities(value: string): string {
	const namedEntities: Record<string, string> = {
		amp: "&",
		apos: "'",
		gt: ">",
		lt: "<",
		nbsp: " ",
		quot: '"',
	};

	return value
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
		.replace(/&#x([a-f0-9]+);/gi, (_, code: string) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)
		.replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name] ?? entity);
}
