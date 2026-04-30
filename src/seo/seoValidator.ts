import { asArray, asRecord, asString, parseJsonObject } from "./jsonUtils";
import type { GeneratedSeoMetadata, SeoConstraints, SerpData } from "./types";

export function parseGeneratedSeoMetadata(
	text: string,
	pageUrl: string,
	source: GeneratedSeoMetadata["source"],
): GeneratedSeoMetadata | undefined {
	const parsed = parseJsonObject(text);
	if (!parsed) return undefined;

	const jsonLd = asArray(parsed.jsonLd)
		.map(asRecord)
		.filter((item): item is Record<string, unknown> => Boolean(item));

	const title = asString(parsed.title);
	const description = asString(parsed.description);
	if (!title || !description) return undefined;

	return {
		title,
		description,
		ogTitle: asString(parsed.ogTitle) ?? title,
		ogDescription: asString(parsed.ogDescription) ?? description,
		ogUrl: asString(parsed.ogUrl) ?? pageUrl,
		ogType: asString(parsed.ogType) === "website" ? "website" : "article",
		canonical: asString(parsed.canonical) ?? pageUrl,
		jsonLd,
		source,
		generatedAt: new Date().toISOString(),
	};
}

export function isSeoMetadataValid(
	metadata: GeneratedSeoMetadata,
	serp: SerpData,
	constraints: SeoConstraints,
): boolean {
	if (metadata.title.length < 10 || metadata.title.length > 70) return false;
	if (metadata.description.length < 50 || metadata.description.length > 170) return false;

	if (serp.intent === "transactional" && !hasActionVerb(metadata.title)) return false;
	if (serp.intent === "navigational" && !metadata.title.toLowerCase().startsWith("tuurbo")) {
		return false;
	}

	if (serp.volume > 1000 && metadata.title.indexOf(serp.keyword) > 30) return false;

	if (serp.cpc > 2 && hasAvoidedOpeningTerm(metadata.description, constraints)) {
		return false;
	}

	return metadata.jsonLd.length > 0;
}

function hasActionVerb(title: string): boolean {
	return /\b(Scopri|Prova|Ottieni|Scegli|Richiedi)\b/i.test(title);
}

function hasAvoidedOpeningTerm(description: string, constraints: SeoConstraints): boolean {
	const openingTokens = description.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 10);
	return openingTokens.some((token) =>
		constraints.avoidDescriptionOpeningTerms.includes(token),
	);
}
