/**
 * Binding disponibili nel Worker.
 *
 * Le chiavi reali vivono in `.dev.vars` durante lo sviluppo e nei secrets
 * Cloudflare in produzione. Questo file centralizza i nomi per evitare stringhe
 * sparse nei moduli SEO.
 */
export type Env = {
	SEO_CACHE?: KVNamespace;
	DATAFORSEO_LOGIN?: string;
	DATAFORSEO_PASSWORD?: string;
	OPENAI_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	OPENAI_MODEL?: string;
	ANTHROPIC_MODEL?: string;
	SEO_CACHE_TTL_SECONDS?: string;
	SEO_GENERATION_TIMEOUT_MS?: string;
	SEO_TARGET_LANGUAGE?: string;
	SEO_TARGET_LOCATION_CODE?: string;
};

export function getNumberEnv(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
