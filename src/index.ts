/**
 * Entry point del Cloudflare Worker.
 *
 * Qui resta solo l'orchestrazione HTTP: classifico la request, recupero la
 * pagina origine e decido se restituirla com'e' o convertirla in markdown.
 * La logica specifica vive nei moduli `llm`, cosi' il flusso resta leggibile.
 */
import { classifyRequest, stripLlmsSuffix } from "./llm/classifier";
import { buildMarkdownPage } from "./llm/htmlToMarkdown";

export default {
	/**
	 * Gestisce ogni richiesta in modo stateless.
	 *
	 * Browser e asset passano quasi invariati; crawler AI e debug route ricevono
	 * una rappresentazione markdown della stessa pagina.
	 */
	async fetch(request: Request): Promise<Response> {
		const classification = classifyRequest(request);
		const requestUrl = new URL(request.url);
		const originUrl = classification.reason === "debug-path"
			? stripLlmsSuffix(requestUrl)
			: requestUrl;
		originUrl.searchParams.delete("debug");

		// La URL debug viene rimappata alla pagina reale prima del fetch.
		const originRequest = new Request(originUrl.toString(), request);
		const originResponse = await fetch(originRequest);

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
			return originResponse;
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
