import { parseGeneratedSeoMetadata } from "./seoValidator";
import type { GeneratedSeoMetadata } from "./types";

type LlmClientInput = {
	apiKey?: string;
	prompt: string;
	pageUrl: string;
	timeoutMs: number;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

export async function generateWithOpenAi(
	input: LlmClientInput,
): Promise<GeneratedSeoMetadata | undefined> {
	if (!input.apiKey) return undefined;

	const response = await fetchWithTimeout(
		OPENAI_RESPONSES_URL,
		{
			method: "POST",
			headers: {
				authorization: `Bearer ${input.apiKey}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-5.2",
				input: input.prompt,
			}),
		},
		input.timeoutMs,
	);

	if (!response.ok) return undefined;

	const payload = await response.json();
	const text = extractOpenAiText(payload);
	return text ? parseGeneratedSeoMetadata(text, input.pageUrl, "openai") : undefined;
}

export async function generateWithAnthropic(
	input: LlmClientInput,
): Promise<GeneratedSeoMetadata | undefined> {
	if (!input.apiKey) return undefined;

	const response = await fetchWithTimeout(
		ANTHROPIC_MESSAGES_URL,
		{
			method: "POST",
			headers: {
				"x-api-key": input.apiKey,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-20250514",
				max_tokens: 1200,
				messages: [
					{
						role: "user",
						content: input.prompt,
					},
				],
			}),
		},
		input.timeoutMs,
	);

	if (!response.ok) return undefined;

	const payload = await response.json();
	const text = extractAnthropicText(payload);
	return text ? parseGeneratedSeoMetadata(text, input.pageUrl, "anthropic") : undefined;
}

function extractOpenAiText(payload: unknown): string | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const record = payload as Record<string, unknown>;

	if (typeof record.output_text === "string") return record.output_text;

	const output = Array.isArray(record.output) ? record.output : [];
	for (const item of output) {
		if (!item || typeof item !== "object") continue;
		const content = Array.isArray((item as Record<string, unknown>).content)
			? ((item as Record<string, unknown>).content as unknown[])
			: [];

		for (const contentItem of content) {
			if (!contentItem || typeof contentItem !== "object") continue;
			const text = (contentItem as Record<string, unknown>).text;
			if (typeof text === "string") return text;
		}
	}

	return undefined;
}

function extractAnthropicText(payload: unknown): string | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const content = (payload as Record<string, unknown>).content;
	if (!Array.isArray(content)) return undefined;

	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const text = (item as Record<string, unknown>).text;
		if (typeof text === "string") return text;
	}

	return undefined;
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
