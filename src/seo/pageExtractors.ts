export function extractTitle(html: string): string {
	return cleanText(findTagInnerHtml(html, "title") ?? findTagInnerHtml(html, "h1") ?? "");
}

export function extractDescription(html: string): string {
	return cleanText(
		findMetaContent(html, "description") ?? firstParagraph(html) ?? extractTitle(html),
	);
}

export function extractKeyword(html: string): string {
	const keywords = findMetaContent(html, "keywords");
	if (keywords) return cleanText(keywords.split(",")[0] ?? keywords);

	const title = extractTitle(html);
	return title.split(/\s+/).slice(0, 4).join(" ");
}

export function isHomePage(url: string): boolean {
	const pathname = new URL(url).pathname.replace(/\/+$/, "");
	return pathname === "";
}

export function extractBreadcrumbs(url: string): Array<{ name: string; item: string }> {
	const currentUrl = new URL(url);
	const segments = currentUrl.pathname.split("/").filter(Boolean);

	return segments.map((segment, index) => {
		const pathname = `/${segments.slice(0, index + 1).join("/")}`;
		return {
			name: toTitleCase(segment.replace(/[-_]+/g, " ")),
			item: `${currentUrl.origin}${pathname}`,
		};
	});
}

export function cleanText(value: string): string {
	return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
		.replace(/\s+/g, " ")
		.trim();
}

function firstParagraph(html: string): string | undefined {
	const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
	return match?.[1];
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

function getAttribute(source: string, name: string): string | undefined {
	const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
	const match = source.match(pattern);
	return match?.[2] ?? match?.[3] ?? match?.[4];
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

function toTitleCase(value: string): string {
	return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
