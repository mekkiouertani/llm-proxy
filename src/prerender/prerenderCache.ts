const CACHE_VERSION = "v1";

export function buildPrerenderCacheKey(url: string): string {
	const normalizedUrl = new URL(url);
	normalizedUrl.hash = "";
	normalizedUrl.searchParams.delete("debug");

	return `prerender:${CACHE_VERSION}:${normalizedUrl.toString()}`;
}

export async function getCachedPrerenderedHtml(
	cache: KVNamespace | undefined,
	url: string,
): Promise<string | undefined> {
	if (!cache) return undefined;
	return (await cache.get(buildPrerenderCacheKey(url))) ?? undefined;
}

export async function putCachedPrerenderedHtml(
	cache: KVNamespace | undefined,
	url: string,
	html: string,
	ttlSeconds: number,
): Promise<void> {
	if (!cache) return;

	await cache.put(buildPrerenderCacheKey(url), html, {
		expirationTtl: ttlSeconds,
	});
}
