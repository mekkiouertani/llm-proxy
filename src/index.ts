import { classifyRequest, stripLlmsSuffix } from "./llm/classifier";
import { buildMarkdownPage } from "./llm/htmlToMarkdown";

export default {
	async fetch(request: Request): Promise<Response> {
		const classification = classifyRequest(request);
		const requestUrl = new URL(request.url);
		const originUrl = classification.reason === "debug-path"
			? stripLlmsSuffix(requestUrl)
			: requestUrl;
		originUrl.searchParams.delete("debug");

		const originRequest = new Request(originUrl.toString(), request);
		const originResponse = await fetch(originRequest);

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
