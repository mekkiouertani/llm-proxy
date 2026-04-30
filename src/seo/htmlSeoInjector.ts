import type { GeneratedSeoMetadata } from "./types";

export function injectSeoMetadata(html: string, metadata: GeneratedSeoMetadata): string {
	const headContent = buildHeadContent(metadata);
	const cleanedHtml = removeManagedSeoTags(html);

	if (/<head\b[^>]*>/i.test(cleanedHtml)) {
		return cleanedHtml.replace(/<head\b([^>]*)>/i, `<head$1>\n${headContent}`);
	}

	return `<!doctype html><html><head>${headContent}</head><body>${cleanedHtml}</body></html>`;
}

function removeManagedSeoTags(html: string): string {
	return html
		.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
		.replace(/<meta\b[^>]*(name=["']description["']|name=description)[^>]*>/gi, "")
		.replace(/<meta\b[^>]*(property=["']og:(title|description|url|type)["']|property=og:(title|description|url|type))[^>]*>/gi, "")
		.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
		.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
}

function buildHeadContent(metadata: GeneratedSeoMetadata): string {
	return [
		`<title>${escapeHtml(metadata.title)}</title>`,
		`<meta name="description" content="${escapeAttribute(metadata.description)}">`,
		`<meta property="og:title" content="${escapeAttribute(metadata.ogTitle)}">`,
		`<meta property="og:description" content="${escapeAttribute(metadata.ogDescription)}">`,
		`<meta property="og:url" content="${escapeAttribute(metadata.ogUrl)}">`,
		`<meta property="og:type" content="${escapeAttribute(metadata.ogType)}">`,
		`<link rel="canonical" href="${escapeAttribute(metadata.canonical)}">`,
		...metadata.jsonLd.map((jsonLd) => {
			return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
		}),
	].join("\n");
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
	return escapeHtml(value).replace(/"/g, "&quot;");
}
