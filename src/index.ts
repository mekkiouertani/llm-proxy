/**
 * Entry point del Cloudflare Worker.
 *
 * Qui resta solo l'orchestrazione HTTP: classifico la request, recupero la
 * pagina origine e decido se restituirla com'e' o convertirla in markdown.
 * La logica specifica vive nei moduli `llm`, cosi' il flusso resta leggibile.
 */
import type { Env } from "./env";
import { classifyRequest, stripLlmsSuffix } from "./llm/classifier";
import { buildMarkdownPage } from "./llm/htmlToMarkdown";
import { injectSeoMetadata } from "./seo/htmlSeoInjector";
import { getSeoMetadata } from "./seo/seoService";

export default {
	/**
	 * Gestisce ogni richiesta in modo stateless.
	 *
	 * Browser e asset passano quasi invariati; crawler AI e debug route ricevono
	 * una rappresentazione markdown della stessa pagina.
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		const classification = classifyRequest(request);
		const requestUrl = new URL(request.url);
		const originUrl = classification.reason === "debug-path"
			? stripLlmsSuffix(requestUrl)
			: requestUrl;
		originUrl.searchParams.delete("debug");

		// La URL debug viene rimappata alla pagina reale prima del fetch.
		const originRequest = new Request(originUrl.toString(), request);
		let originResponse: Response;
		try {
			originResponse = await fetch(originRequest);
		} catch {
			return new Response("Origin unreachable.", {
				status: 502,
				headers: { "content-type": "text/plain; charset=utf-8" },
			});
		}

		// Log compatto: basta a capire perche' una richiesta e' stata trasformata.
		console.log(
			JSON.stringify({
				path: requestUrl.pathname,
				llmMode: classification.shouldRenderMarkdown,
				reason: classification.reason,
				matchedSignal: classification.matchedSignal,
				status: originResponse.status,
			}),
		);

		if (!classification.shouldRenderMarkdown) {
			return enhanceHtmlWithSeo(originResponse, env, originUrl.toString(), requestUrl);
		}

		const contentType = originResponse.headers.get("content-type") ?? "";

		// Non provo a convertire asset, JSON o file: la traccia riguarda pagine HTML.
		if (!contentType.toLowerCase().includes("text/html")) {
			return originResponse;
		}

		if (!originResponse.ok) {
			return new Response("Unable to fetch source page for LLM markdown.", {
				status: 502,
				headers: {
					"content-type": "text/plain; charset=utf-8",
				},
			});
		}

		const html = await originResponse.text();
		const markdown = buildMarkdownPage({
			html,
			sourceUrl: originUrl.toString(),
			responseHeaders: originResponse.headers,
		});

		return new Response(markdown, {
			status: 200,
			headers: {
				"cache-control": "public, max-age=300",
				"content-type": "text/markdown; charset=utf-8",
				"vary": "user-agent, purpose, sec-purpose, x-purpose, x-ai-purpose",
				"x-llm-proxy-reason": classification.reason,
			},
		});
	},
};

async function enhanceHtmlWithSeo(
	originResponse: Response,
	env: Env,
	originUrl: string,
	requestUrl: URL,
): Promise<Response> {
	const contentType = originResponse.headers.get("content-type") ?? "";

	if (!originResponse.ok || !contentType.toLowerCase().includes("text/html")) {
		return originResponse;
	}

	const html = await originResponse.text();
	const seo = await getSeoMetadata(env, originUrl, html);

	if (requestUrl.searchParams.get("debug") === "seo") {
		return Response.json({
			metadata: seo.metadata,
			cacheHit: seo.cacheHit,
			serp: seo.serp,
			constraints: seo.constraints,
			prompt: seo.prompt,
		});
	}

	const enhancedHtml = injectSeoMetadata(html, seo.metadata);
	const headers = new Headers(originResponse.headers);
	headers.set("content-type", "text/html; charset=utf-8");
	headers.set("x-seo-source", seo.metadata.source);
	headers.set("x-seo-cache", seo.cacheHit ? "hit" : "miss");

	return new Response(enhancedHtml, {
		status: originResponse.status,
		statusText: originResponse.statusText,
		headers,
	});
}
