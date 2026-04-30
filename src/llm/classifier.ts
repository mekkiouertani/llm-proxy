export type ClassificationReason =
	| "debug-query"
	| "debug-path"
	| "ai-user-agent"
	| "ai-purpose-header"
	| "browser-pass-through";

export type ClientClassification = {
	shouldRenderMarkdown: boolean;
	reason: ClassificationReason;
	matchedSignal?: string;
};

const AI_USER_AGENT_PATTERNS = [
	"gptbot",
	"chatgpt-user",
	"oai-searchbot",
	"claudebot",
	"anthropic-ai",
	"perplexitybot",
	"perplexity-user",
	"ccbot",
	"google-extended",
	"meta-externalagent",
	"facebookbot",
];

const AI_PURPOSE_PATTERNS = ["ai", "llm", "preview"];

export function isLlmsPath(pathname: string): boolean {
	return pathname === "/llms" || pathname.endsWith("/llms");
}

export function stripLlmsSuffix(url: URL): URL {
	const originUrl = new URL(url);

	if (originUrl.pathname === "/llms") {
		originUrl.pathname = "/";
		return originUrl;
	}

	originUrl.pathname = originUrl.pathname.replace(/\/llms\/?$/, "") || "/";
	return originUrl;
}

export function classifyRequest(request: Request): ClientClassification {
	const url = new URL(request.url);
	const debugValue = url.searchParams.get("debug")?.toLowerCase();

	// Priorita' 1: debug esplicito. Serve per testare il markdown senza simulare bot.
	if (debugValue === "llm") {
		return {
			shouldRenderMarkdown: true,
			reason: "debug-query",
			matchedSignal: "debug=llm",
		};
	}

	// Priorita' 2: rotta tecnica richiesta dalla traccia, non dipende dagli header.
	if (isLlmsPath(url.pathname)) {
		return {
			shouldRenderMarkdown: true,
			reason: "debug-path",
			matchedSignal: "/llms",
		};
	}

	const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
	const matchedAgent = AI_USER_AGENT_PATTERNS.find((pattern) =>
		userAgent.includes(pattern),
	);

	// Priorita' 3: crawler AI riconoscibile da User-Agent. E' il segnale piu' forte.
	if (matchedAgent) {
		return {
			shouldRenderMarkdown: true,
			reason: "ai-user-agent",
			matchedSignal: matchedAgent,
		};
	}

	const purposeHeaders = [
		request.headers.get("purpose"),
		request.headers.get("sec-purpose"),
		request.headers.get("x-purpose"),
		request.headers.get("x-ai-purpose"),
	]
		.filter((value): value is string => Boolean(value))
		.join(" ")
		.toLowerCase();
	const matchedPurpose = AI_PURPOSE_PATTERNS.find((pattern) =>
		purposeHeaders.includes(pattern),
	);

	// Priorita' 4: segnali header deboli. Li uso solo se parlano esplicitamente di AI/LLM.
	if (matchedPurpose) {
		return {
			shouldRenderMarkdown: true,
			reason: "ai-purpose-header",
			matchedSignal: matchedPurpose,
		};
	}

	return {
		shouldRenderMarkdown: false,
		reason: "browser-pass-through",
	};
}
