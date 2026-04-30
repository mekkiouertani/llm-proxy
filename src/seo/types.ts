export type SearchIntent = "informational" | "transactional" | "navigational" | "unknown";

export type SerpFeature = "featured_snippet" | "knowledge_panel" | "none" | string;

export type SerpCompetitor = {
	title: string;
	url: string;
	description: string;
};

export type SerpData = {
	url: string;
	keyword: string;
	intent: SearchIntent;
	volume: number;
	cpc: number;
	competitors: SerpCompetitor[];
	features: SerpFeature[];
};

export type SeoConstraints = {
	titlePattern: string;
	descriptionPattern: string;
	jsonLdPattern: string;
	keywordPlacement: string;
	avoidDescriptionOpeningTerms: string[];
};

export type GeneratedSeoMetadata = {
	title: string;
	description: string;
	ogTitle: string;
	ogDescription: string;
	ogUrl: string;
	ogType: "website" | "article";
	canonical: string;
	jsonLd: Array<Record<string, unknown>>;
	source: "openai" | "anthropic" | "fallback";
	generatedAt: string;
};

export type SeoGenerationContext = {
	pageUrl: string;
	html: string;
	serp: SerpData;
	constraints: SeoConstraints;
};

export type LlmProvider = "openai" | "anthropic";

export type LlmGenerationResult = {
	provider: LlmProvider;
	metadata: GeneratedSeoMetadata;
};
