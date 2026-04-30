import type { GeneratedSeoMetadata } from "./types";

const CACHE_VERSION = "v1";

export function buildSeoCacheKey(url: string): string {
	const normalizedUrl = new URL(url);
	normalizedUrl.hash = "";
	normalizedUrl.searchParams.delete("debug");

	return `seo:${CACHE_VERSION}:${normalizedUrl.toString()}`;
}

export async function getCachedSeoMetadata(
	cache: KVNamespace,
	url: string,
): Promise<GeneratedSeoMetadata | undefined> {
	const rawValue = await cache.get(buildSeoCacheKey(url));
	if (!rawValue) return undefined;

	try {
		return JSON.parse(rawValue) as GeneratedSeoMetadata;
	} catch {
		return undefined;
	}
}

export async function putCachedSeoMetadata(
	cache: KVNamespace,
	url: string,
	metadata: GeneratedSeoMetadata,
	ttlSeconds: number,
): Promise<void> {
	await cache.put(buildSeoCacheKey(url), JSON.stringify(metadata), {
		expirationTtl: ttlSeconds,
	});
}
