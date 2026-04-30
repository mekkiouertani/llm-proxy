import type { Env } from "../env";
import { getNumberEnv } from "../env";
import { getCachedSeoMetadata, putCachedSeoMetadata } from "./cacheRepository";
import { fetchSerpData } from "./dataForSeoClient";
import { buildFallbackSeoMetadata, buildFallbackSerpData } from "./fallbackSeo";
import { generateWithAnthropic, generateWithOpenAi } from "./llmClients";
import { buildSeoPrompt } from "./promptBuilder";
import { deriveSeoConstraints } from "./seoRules";
import { isSeoMetadataValid } from "./seoValidator";
import type { GeneratedSeoMetadata, SeoConstraints, SerpData } from "./types";

export type SeoResult = {
	metadata: GeneratedSeoMetadata;
	cacheHit: boolean;
	serp: SerpData;
	constraints: SeoConstraints;
	prompt?: string;
	providerStatus: Record<string, string>;
};

export async function getSeoMetadata(
	env: Env,
	pageUrl: string,
	html: string,
): Promise<SeoResult> {
	const fallbackSerp = buildFallbackSerpData(pageUrl, html);
	const fallbackConstraints = deriveSeoConstraints(fallbackSerp);
	const cached = env.SEO_CACHE
		? await getCachedSeoMetadata(env.SEO_CACHE, pageUrl)
		: undefined;

	if (cached) {
		return {
			metadata: cached,
			cacheHit: true,
			serp: fallbackSerp,
			constraints: fallbackConstraints,
			providerStatus: {
				cache: "hit",
			},
		};
	}

	const timeoutMs = getNumberEnv(env.SEO_GENERATION_TIMEOUT_MS, 3500);
	const ttlSeconds = getNumberEnv(env.SEO_CACHE_TTL_SECONDS, 86400);
	const locationCode = getNumberEnv(env.SEO_TARGET_LOCATION_CODE, 2380);
	const languageCode = env.SEO_TARGET_LANGUAGE ?? "it";

	const providerStatus: Record<string, string> = {
		cache: "miss",
	};
	const serpResult = await safeFetchSerpData(
		env,
		pageUrl,
		html,
		languageCode,
		locationCode,
		timeoutMs,
	);
	providerStatus.dataForSeo = serpResult.status;
	const serp = serpResult.serp ?? fallbackSerp;
	const constraints = deriveSeoConstraints(serp);
	const prompt = buildSeoPrompt({
		pageUrl,
		html,
		serp,
		constraints,
	});

	const openAiResult = await safeGenerateWithOpenAi(
		env.OPENAI_API_KEY,
		prompt,
		pageUrl,
		timeoutMs,
		serp,
		constraints,
	);
	providerStatus.openai = openAiResult.status;

	const anthropicResult = openAiResult.metadata
		? { status: "skipped-openai-valid", metadata: undefined }
		: await safeGenerateWithAnthropic(
				env.ANTHROPIC_API_KEY,
				prompt,
				pageUrl,
				timeoutMs,
				serp,
				constraints,
			);
	providerStatus.anthropic = anthropicResult.status;

	const generated =
		openAiResult.metadata ??
		anthropicResult.metadata ??
		buildFallbackSeoMetadata(pageUrl, html, serp);
	providerStatus.finalSource = generated.source;

	if (env.SEO_CACHE) {
		await putCachedSeoMetadata(env.SEO_CACHE, pageUrl, generated, ttlSeconds);
	}

	return {
		metadata: generated,
		cacheHit: false,
		serp,
		constraints,
		prompt,
		providerStatus,
	};
}

async function safeFetchSerpData(
	env: Env,
	pageUrl: string,
	html: string,
	languageCode: string,
	locationCode: number,
	timeoutMs: number,
): Promise<{ status: string; serp?: SerpData }> {
	if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
		return { status: "missing-credentials" };
	}

	try {
		const serp = await fetchSerpData({
			login: env.DATAFORSEO_LOGIN,
			password: env.DATAFORSEO_PASSWORD,
			pageUrl,
			html,
			languageCode,
			locationCode,
			timeoutMs,
		});
		return serp ? { status: "ok", serp } : { status: "empty-response" };
	} catch (error) {
		console.warn("DataForSEO unavailable, using fallback SERP data", error);
		return { status: "error-or-timeout" };
	}
}

async function safeGenerateWithOpenAi(
	apiKey: string | undefined,
	prompt: string,
	pageUrl: string,
	timeoutMs: number,
	serp: SerpData,
	constraints: SeoConstraints,
): Promise<{ status: string; metadata?: GeneratedSeoMetadata }> {
	if (!apiKey) {
		return { status: "missing-api-key" };
	}

	try {
		const metadata = await generateWithOpenAi({ apiKey, prompt, pageUrl, timeoutMs });
		if (!metadata) return { status: "empty-or-unparseable-response" };
		return isSeoMetadataValid(metadata, serp, constraints)
			? { status: "ok", metadata }
			: { status: "invalid-output" };
	} catch (error) {
		console.warn("OpenAI SEO generation unavailable", error);
		return { status: "error-or-timeout" };
	}
}

async function safeGenerateWithAnthropic(
	apiKey: string | undefined,
	prompt: string,
	pageUrl: string,
	timeoutMs: number,
	serp: SerpData,
	constraints: SeoConstraints,
): Promise<{ status: string; metadata?: GeneratedSeoMetadata }> {
	if (!apiKey) {
		return { status: "missing-api-key" };
	}

	try {
		const metadata = await generateWithAnthropic({ apiKey, prompt, pageUrl, timeoutMs });
		if (!metadata) return { status: "empty-or-unparseable-response" };
		return isSeoMetadataValid(metadata, serp, constraints)
			? { status: "ok", metadata }
			: { status: "invalid-output" };
	} catch (error) {
		console.warn("Anthropic SEO generation unavailable", error);
		return { status: "error-or-timeout" };
	}
}
