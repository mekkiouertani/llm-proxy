import { asArray, asNumber, asRecord, asString } from "./jsonUtils";
import { extractKeyword } from "./pageExtractors";
import type { SearchIntent, SerpCompetitor, SerpData, SerpFeature } from "./types";

type DataForSeoInput = {
	login?: string;
	password?: string;
	pageUrl: string;
	html: string;
	languageCode: string;
	locationCode: number;
	timeoutMs: number;
};

const DATAFORSEO_ENDPOINT =
	"https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live";

export async function fetchSerpData(input: DataForSeoInput): Promise<SerpData | undefined> {
	if (!input.login || !input.password) return undefined;

	const keyword = extractKeyword(input.html);
	if (!keyword) return undefined;

	const response = await fetchWithTimeout(
		DATAFORSEO_ENDPOINT,
		{
			method: "POST",
			headers: {
				authorization: `Basic ${btoa(`${input.login}:${input.password}`)}`,
				"content-type": "application/json",
			},
			body: JSON.stringify([
				{
					keywords: [keyword],
					language_code: input.languageCode,
					location_code: input.locationCode,
					include_serp_info: true,
				},
			]),
		},
		input.timeoutMs,
	);

	if (!response.ok) return undefined;

	const payload = asRecord(await response.json());
	if (!payload) return undefined;

	return mapDataForSeoResponse(payload, input.pageUrl, keyword);
}

function mapDataForSeoResponse(
	payload: Record<string, unknown>,
	pageUrl: string,
	fallbackKeyword: string,
): SerpData | undefined {
	const task = asRecord(asArray(payload.tasks)[0]);
	const result = asRecord(asArray(task?.result)[0]);
	const item = asRecord(asArray(result?.items)[0]);
	if (!item) return undefined;

	const keywordInfo = asRecord(item.keyword_info);
	const serpInfo = asRecord(item.serp_info);
	const searchIntentInfo = asRecord(item.search_intent_info);

	return {
		url: pageUrl,
		keyword: asString(item.keyword) ?? fallbackKeyword,
		intent: normalizeIntent(asString(searchIntentInfo?.main_intent)),
		volume: asNumber(keywordInfo?.search_volume) ?? 0,
		cpc: asNumber(keywordInfo?.cpc) ?? 0,
		competitors: extractCompetitors(serpInfo),
		features: extractSerpFeatures(serpInfo),
	};
}

function extractCompetitors(serpInfo: Record<string, unknown> | undefined): SerpCompetitor[] {
	const items = asArray(serpInfo?.items);

	return items
		.map(asRecord)
		.filter((item): item is Record<string, unknown> => Boolean(item))
		.filter((item) => asString(item.type) === "organic")
		.slice(0, 3)
		.map((item) => ({
			title: asString(item.title) ?? "",
			url: asString(item.url) ?? "",
			description: asString(item.description) ?? "",
		}));
}

function extractSerpFeatures(serpInfo: Record<string, unknown> | undefined): SerpFeature[] {
	const features = new Set<SerpFeature>();

	for (const item of asArray(serpInfo?.items).map(asRecord)) {
		const type = asString(item?.type);
		if (type === "featured_snippet" || type === "knowledge_graph") {
			features.add(type === "knowledge_graph" ? "knowledge_panel" : "featured_snippet");
		}
	}

	return features.size > 0 ? [...features] : ["none"];
}

function normalizeIntent(intent: string | undefined): SearchIntent {
	if (intent === "informational" || intent === "transactional" || intent === "navigational") {
		return intent;
	}

	return "unknown";
}

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
	timeoutMs: number,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}
