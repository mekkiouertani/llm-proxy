import { extractBreadcrumbs, extractDescription, extractKeyword, extractTitle, isHomePage } from "./pageExtractors";
import type { GeneratedSeoMetadata, SerpData } from "./types";

export function buildFallbackSeoMetadata(
	pageUrl: string,
	html: string,
	serp?: SerpData,
): GeneratedSeoMetadata {
	const title = normalizeTitle(serp?.keyword ?? extractTitle(html) ?? "Pagina");
	const description = normalizeDescription(
		extractDescription(html) || `Scopri informazioni aggiornate su ${title}.`,
	);

	return {
		title,
		description,
		ogTitle: title,
		ogDescription: description,
		ogUrl: pageUrl,
		ogType: isHomePage(pageUrl) ? "website" : "article",
		canonical: pageUrl,
		jsonLd: buildFallbackJsonLd(pageUrl, title, description),
		source: "fallback",
		generatedAt: new Date().toISOString(),
	};
}

export function buildFallbackSerpData(pageUrl: string, html: string): SerpData {
	return {
		url: pageUrl,
		keyword: extractKeyword(html) || extractTitle(html) || "pagina",
		intent: "unknown",
		volume: 0,
		cpc: 0,
		competitors: [],
		features: ["none"],
	};
}

function buildFallbackJsonLd(
	pageUrl: string,
	title: string,
	description: string,
): Array<Record<string, unknown>> {
	if (isHomePage(pageUrl)) {
		return [
			{
				"@context": "https://schema.org",
				"@type": "WebSite",
				url: pageUrl,
				name: title,
				description,
				potentialAction: {
					"@type": "SearchAction",
					target: `${new URL(pageUrl).origin}/?s={search_term_string}`,
					"query-input": "required name=search_term_string",
				},
			},
		];
	}

	const breadcrumbs = extractBreadcrumbs(pageUrl);
	return [
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((breadcrumb, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: breadcrumb.name,
				item: breadcrumb.item,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			url: pageUrl,
			name: title,
			description,
		},
	];
}

function normalizeTitle(value: string): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= 60) return normalized;
	return normalized.slice(0, 57).trimEnd() + "...";
}

function normalizeDescription(value: string): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= 155) return normalized;
	return normalized.slice(0, 152).trimEnd() + "...";
}
