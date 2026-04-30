import type { Env } from "../env";
import { getNumberEnv } from "../env";
import { renderHtmlWithBrowser } from "./browserRenderer";
import { getCachedPrerenderedHtml, putCachedPrerenderedHtml } from "./prerenderCache";

export type PrerenderResult = {
	html?: string;
	cacheHit: boolean;
	status: "cache-hit" | "rendered" | "render-failed";
};

export async function getPrerenderedHtml(env: Env, url: string): Promise<PrerenderResult> {
	const cachedHtml = await getCachedPrerenderedHtml(env.PRERENDER_CACHE, url);
	if (cachedHtml) {
		return {
			html: cachedHtml,
			cacheHit: true,
			status: "cache-hit",
		};
	}

	const timeoutMs = getNumberEnv(env.PRERENDER_TIMEOUT_MS, 12000);
	const ttlSeconds = getNumberEnv(env.PRERENDER_CACHE_TTL_SECONDS, 86400);
	const renderedHtml = await renderHtmlWithBrowser({
		browserBinding: env.BROWSER,
		url,
		timeoutMs,
	});

	if (!renderedHtml) {
		return {
			cacheHit: false,
			status: "render-failed",
		};
	}

	await putCachedPrerenderedHtml(env.PRERENDER_CACHE, url, renderedHtml, ttlSeconds);

	return {
		html: renderedHtml,
		cacheHit: false,
		status: "rendered",
	};
}
