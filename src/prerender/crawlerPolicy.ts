import type { ClientClassification } from "../llm/classifier";

export type PrerenderDecision = {
	shouldPrerender: boolean;
	reason: "ai-crawler" | "search-crawler" | "explicit-debug" | "not-crawler";
	matchedSignal?: string;
};

const SEARCH_CRAWLER_PATTERNS = [
	"googlebot",
	"bingbot",
	"slurp",
	"duckduckbot",
	"baiduspider",
	"yandexbot",
];

/**
 * Decide se un crawler reale deve ricevere HTML prerenderizzato.
 *
 * Il Livello 1 resta disponibile solo con `?debug=llm` e `/llms`; dal Livello 3
 * i crawler veri ricevono HTML completo, perche' la nuova traccia chiede una
 * pagina con JavaScript gia' risolto, non markdown.
 */
export function shouldPrerenderRequest(
	request: Request,
	classification: ClientClassification,
): PrerenderDecision {
	const url = new URL(request.url);
	const debugMode = url.searchParams.get("debug")?.toLowerCase();

	if (debugMode === "prerender") {
		return {
			shouldPrerender: true,
			reason: "explicit-debug",
			matchedSignal: "debug=prerender",
		};
	}

	if (classification.reason === "ai-user-agent" || classification.reason === "ai-purpose-header") {
		return {
			shouldPrerender: true,
			reason: "ai-crawler",
			matchedSignal: classification.matchedSignal,
		};
	}

	const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
	const matchedSearchCrawler = SEARCH_CRAWLER_PATTERNS.find((pattern) =>
		userAgent.includes(pattern),
	);

	if (matchedSearchCrawler) {
		return {
			shouldPrerender: true,
			reason: "search-crawler",
			matchedSignal: matchedSearchCrawler,
		};
	}

	return {
		shouldPrerender: false,
		reason: "not-crawler",
	};
}
