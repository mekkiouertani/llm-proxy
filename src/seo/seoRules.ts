import { isHomePage } from "./pageExtractors";
import type { SeoConstraints, SerpData } from "./types";

const ACTION_VERBS = ["Scopri", "Prova", "Ottieni", "Scegli", "Richiedi"];

/**
 * Traduce i dati DataForSEO in vincoli operativi per il prompt.
 *
 * La consegna chiede che le regole siano logica condizionale del Worker,
 * non testo statico: qui le trasformo in istruzioni gia' risolte dal codice.
 */
export function deriveSeoConstraints(serp: SerpData): SeoConstraints {
	const constraints: SeoConstraints = {
		titlePattern: "Title naturale e leggibile, massimo 60 caratteri.",
		descriptionPattern: "Description chiara, massimo 155 caratteri.",
		jsonLdPattern: isHomePage(serp.url)
			? 'JSON-LD: un oggetto WebSite con url, name, description e potentialAction di tipo SearchAction (target con parametro "s").'
			: "JSON-LD: un oggetto BreadcrumbList con itemListElement ricavato dal percorso URL, e un oggetto WebPage con url, name, description.",
		keywordPlacement: "Keyword usata in modo naturale.",
		avoidDescriptionOpeningTerms: [],
	};

	if (serp.intent === "informational") {
		// Intento informativo: chi cerca vuole una risposta, non una CTA commerciale.
		constraints.titlePattern =
			'Il title deve iniziare con una domanda oppure con "Come", "Cosa" o "Perche".';
	}

	if (serp.intent === "transactional") {
		// Intento transazionale: il title deve spingere a un'azione concreta.
		constraints.titlePattern =
			`Il title deve contenere un verbo d'azione come ${ACTION_VERBS.join(", ")}.`;
	}

	if (serp.intent === "navigational") {
		// Intento navigazionale: l'utente cerca un brand, quindi lo metto subito.
		constraints.titlePattern = "Il brand deve comparire in prima posizione nel title.";
	}

	if (serp.cpc > 2) {
		// CPC alto: differenzio la description dai competitor piu' costosi in SERP.
		constraints.descriptionPattern =
			"La description deve differenziarsi dai primi risultati SERP nei primi 10 token.";
		constraints.avoidDescriptionOpeningTerms = collectOpeningTerms(serp);
	}

	if (serp.features.includes("featured_snippet")) {
		// Featured snippet: favorisco un title che sembri gia' una risposta sintetica.
		constraints.titlePattern =
			"Il title deve essere formulato come risposta diretta a una domanda.";
	}

	if (serp.features.includes("knowledge_panel")) {
		// Knowledge panel: chiedo structured data piu' descrittivi del soggetto.
		constraints.jsonLdPattern =
			"Il JSON-LD deve includere campi aggiuntivi sul soggetto, ad esempio founder, foundingDate e description se deducibili.";
	}

	if (serp.volume > 1000) {
		// Volume alto: anticipo la keyword per aumentare rilevanza percepita nel title.
		constraints.keywordPlacement =
			"La keyword principale deve comparire nel title entro i primi 30 caratteri.";
	}

	return constraints;
}

function collectOpeningTerms(serp: SerpData): string[] {
	const terms = new Set<string>();

	for (const competitor of serp.competitors.slice(0, 3)) {
		const text = `${competitor.title} ${competitor.description}`.toLowerCase();
		for (const token of text.split(/\W+/).filter(Boolean).slice(0, 10)) {
			if (token.length > 3) terms.add(token);
		}
	}

	return [...terms].slice(0, 30);
}
