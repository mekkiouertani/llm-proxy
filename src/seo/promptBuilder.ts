import { extractBreadcrumbs, isHomePage } from "./pageExtractors";
import type { SeoGenerationContext } from "./types";

export function buildSeoPrompt(context: SeoGenerationContext): string {
	const pageType = isHomePage(context.pageUrl) ? "homepage" : "internal-page";
	const breadcrumbs = extractBreadcrumbs(context.pageUrl);

	return [
		"Genera metadata SEO per una pagina HTML.",
		"Rispondi solo con JSON valido, senza markdown e senza testo extra.",
		"",
		"Formato JSON richiesto:",
		JSON.stringify(
			{
				title: "string",
				description: "string",
				ogTitle: "string",
				ogDescription: "string",
				ogUrl: context.pageUrl,
				ogType: pageType === "homepage" ? "website" : "article",
				canonical: context.pageUrl,
				jsonLd: [{ "@context": "https://schema.org", "@type": "WebPage" }],
			},
			null,
			2,
		),
		"",
		"Dati pagina:",
		`- URL: ${context.pageUrl}`,
		`- Tipo pagina: ${pageType}`,
		`- Breadcrumb: ${breadcrumbs.map((item) => item.name).join(" > ") || "homepage"}`,
		"",
		"Dati DataForSEO:",
		`- Keyword principale: ${context.serp.keyword}`,
		`- Intento: ${context.serp.intent}`,
		`- Volume mensile: ${context.serp.volume}`,
		`- CPC: ${context.serp.cpc}`,
		`- SERP features: ${context.serp.features.join(", ") || "none"}`,
		`- Competitor top 3: ${context.serp.competitors
			.slice(0, 3)
			.map((item) => `${item.title} (${item.url})`)
			.join(" | ")}`,
		"",
		"Vincoli calcolati dal Worker:",
		`- Title: ${context.constraints.titlePattern}`,
		`- Description: ${context.constraints.descriptionPattern}`,
		`- Keyword placement: ${context.constraints.keywordPlacement}`,
		`- JSON-LD: ${context.constraints.jsonLdPattern}`,
		`- Termini da evitare nei primi 10 token della description: ${context.constraints.avoidDescriptionOpeningTerms.join(", ") || "nessuno"}`,
		"",
		"HTML pagina, da usare solo come contesto:",
		context.html.slice(0, 6000),
	].join("\n");
}
