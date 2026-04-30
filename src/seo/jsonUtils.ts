export function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function parseJsonObject(text: string): Record<string, unknown> | undefined {
	const direct = tryParse(text);
	if (direct) return direct;

	const match = text.match(/\{[\s\S]*\}/);
	return match ? tryParse(match[0]) : undefined;
}

function tryParse(text: string): Record<string, unknown> | undefined {
	try {
		return asRecord(JSON.parse(text));
	} catch {
		return undefined;
	}
}
