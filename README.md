# LLM Proxy Worker

Backend serverless in Node.js e TypeScript basato su Cloudflare Workers.

Il progetto implementa un proxy HTTP davanti a un sito origine con tre obiettivi tecnici:

- rendere le pagine piu' leggibili per crawler AI e strumenti LLM;
- arricchire l'HTML con metadata SEO generati in modo controllato;
- servire HTML prerenderizzato ai crawler quando la pagina dipende da JavaScript.

La soluzione e' stateless: lo stato utile vive in Cloudflare KV, mentre secret, route e binding vengono configurati sull'infrastruttura Cloudflare.

## Architettura

```text
request
  -> src/index.ts
  -> /robots.txt? risposta diretta
  -> classifier.ts
  -> debug LLM? markdown
  -> crawler/prerender? HTML renderizzato
  -> browser normale? HTML origine + metadata SEO
  -> response
```

Il Worker resta il punto di orchestrazione HTTP. La logica e' divisa per responsabilita':

```text
src/llm/*        classificazione request e conversione HTML -> Markdown
src/seo/*        metadata SEO, SERP data, prompt LLM, cache e fallback
src/prerender/*  policy crawler, Browser Rendering e cache HTML
src/index.ts     entrypoint e mapping delle risposte HTTP
```

## Step 1: Markdown Per Crawler AI

Il primo step introduce una rappresentazione markdown delle pagine HTML. Serve a offrire ai crawler AI un contenuto piu' pulito, senza navigazione, script, cookie banner o markup poco utile.

`src/llm/classifier.ts` decide quando attivare questo comportamento usando segnali espliciti e User-Agent noti:

- query `?debug=llm`;
- path tecnico `/llms`;
- User-Agent di crawler AI;
- header di purpose espliciti.

`src/llm/htmlToMarkdown.ts` scarica la pagina origine, pulisce l'HTML e restituisce `text/markdown`.

Esempio di verifica:

```text
GET https://<worker-url>/?debug=llm
```

Esempio di risultato:

```markdown
# Titolo pagina

Descrizione principale del contenuto.

## Sezione

- Punto informativo
- Link rilevante: [Nome link](https://example.com/path)
```

Header significativi:

```text
content-type: text/markdown; charset=utf-8
x-llm-proxy-reason: debug-query
vary: user-agent, purpose, sec-purpose, x-purpose, x-ai-purpose
```

## Step 2: Metadata SEO Dinamici

Il secondo step arricchisce le pagine HTML con metadata SEO generati a partire da dati SERP, regole applicative e provider LLM.

Il flusso e' gestito da `src/seo/seoService.ts`:

```text
SEO_CACHE
  -> DataForSEO se cache miss
  -> seoRules.ts
  -> promptBuilder.ts
  -> OpenAI primary
  -> Claude fallback
  -> fallback locale
  -> htmlSeoInjector.ts
```

La cache KV evita chiamate esterne a ogni richiesta. Se DataForSEO o i provider LLM non rispondono, il Worker continua a servire la pagina usando metadata fallback.

Esempio di verifica:

```text
GET https://<worker-url>/?debug=seo
```

Esempio di risultato JSON:

```json
{
  "debug": "seo",
  "applied": true,
  "cacheHit": false,
  "metadata": {
    "title": "Titolo SEO generato",
    "description": "Descrizione ottimizzata per intento e SERP.",
    "canonical": "https://example.com/"
  },
  "providerStatus": {
    "primary": "success",
    "fallback": "not-used"
  }
}
```

Esempio di HTML finale:

```html
<title>Titolo SEO generato</title>
<meta name="description" content="Descrizione ottimizzata per intento e SERP.">
<meta property="og:title" content="Titolo SEO generato">
<link rel="canonical" href="https://example.com/">
<script type="application/ld+json">{ "...": "..." }</script>
```

## Step 3: Prerender Per Crawler

Il terzo step gestisce le pagine che richiedono JavaScript per mostrare contenuto completo. Per crawler e debug esplicito, il Worker usa Cloudflare Browser Rendering tramite il binding `BROWSER`.

`src/prerender/crawlerPolicy.ts` decide se applicare il prerender. `src/prerender/prerenderService.ts` controlla prima `PRERENDER_CACHE`; in caso di cache miss usa Browser Rendering, salva l'HTML prodotto e lo restituisce.

Esempio di verifica:

```text
GET https://<worker-url>/?debug=prerender
```

Esempio di risultato:

```json
{
  "debug": "prerender",
  "applied": true,
  "status": "rendered",
  "cacheHit": false,
  "reason": "debug-query",
  "hasBrowserBinding": true,
  "hasPrerenderCache": true
}
```

Se il render fallisce, va in timeout o il binding non e' disponibile, la richiesta non viene bloccata: il Worker torna al flusso standard e serve la pagina origine.

## Configurazione Cloudflare

Per far funzionare il progetto in ambiente Cloudflare non basta il deploy del codice: il Worker deve essere collegato a una route, ai binding KV, al binding Browser Rendering e ai secret necessari.

Passaggi operativi:

1. Creare o selezionare un Worker Cloudflare.
2. Collegare una route al dominio o sottodominio da proteggere, ad esempio `https://example.com/*`.
3. Creare due namespace KV e associarli ai binding `SEO_CACHE` e `PRERENDER_CACHE`.
4. Abilitare Cloudflare Browser Rendering e collegarlo al binding `BROWSER`.
5. Inserire i secret per DataForSEO e provider AI.
6. Configurare le variabili non segrete in `wrangler.jsonc`.
7. Eseguire il deploy con Wrangler.

Binding richiesti:

```text
SEO_CACHE
PRERENDER_CACHE
BROWSER
```

Secret richiesti:

```bash
npx wrangler secret put DATAFORSEO_LOGIN
npx wrangler secret put DATAFORSEO_PASSWORD
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
```

Esempio: `OPENAI_API_KEY` e `ANTHROPIC_API_KEY` non devono stare nel repository. Vanno inseriti come secret del Worker, cosi' il codice puo' leggerli da `env` senza esporli.

Variabili non segrete configurate in `wrangler.jsonc`:

```text
SEO_CACHE_TTL_SECONDS
SEO_GENERATION_TIMEOUT_MS
PRERENDER_CACHE_TTL_SECONDS
PRERENDER_TIMEOUT_MS
SEO_TARGET_LANGUAGE
SEO_TARGET_LOCATION_CODE
OPENAI_MODEL
ANTHROPIC_MODEL
```

## Setup Locale

Installazione:

```bash
npm install
```

Ambiente locale:

```bash
cp .dev.vars.example .dev.vars
```

Avvio in sviluppo:

```bash
npm run dev
```

Verifica TypeScript:

```bash
npx tsc --noEmit
```

Deploy:

```bash
npm run deploy
```

Dry run prima del deploy:

```bash
npx wrangler deploy --dry-run
```

## Route Di Debug

Markdown per crawler AI:

```text
https://<worker-url>/?debug=llm
https://<worker-url>/llms
```

SEO e provider:

```text
https://<worker-url>/?debug=seo
https://<worker-url>/?debug=seo-ping
```

Prerender:

```text
https://<worker-url>/?debug=prerender
```

Controllo HTML finale:

```text
view-source:https://<worker-url>/
```

Elementi da cercare:

```html
<title>
<meta name="description">
<meta property="og:title">
<link rel="canonical">
<script type="application/ld+json">
```

## File Principali

```text
src/index.ts                 entrypoint Worker e orchestrazione HTTP
src/env.ts                   tipizzazione delle variabili ambiente
src/llm/classifier.ts        classificazione crawler AI/debug/pass-through
src/llm/htmlToMarkdown.ts    conversione HTML -> Markdown
src/prerender/crawlerPolicy.ts policy di attivazione prerender
src/prerender/prerenderService.ts cache e rendering HTML
src/seo/seoService.ts        orchestrazione SEO, cache e fallback
src/seo/seoRules.ts          regole condizionali SEO
src/seo/promptBuilder.ts     prompt dinamico per LLM
src/seo/htmlSeoInjector.ts   iniezione metadata nell'HTML
src/seo/dataForSeoClient.ts  client DataForSEO
src/seo/llmClients.ts        client OpenAI e Claude
```

## Note Tecniche

- Il Worker e' stateless: cache e risultati generati vivono in KV.
- Browser Rendering viene usato solo per crawler/cache miss o debug esplicito.
- Gli utenti normali non pagano il costo del prerender.
- Il flusso SEO ha fallback progressivi: cache, provider primario, provider secondario, fallback locale.
- `/robots.txt` viene servito direttamente dal Worker per garantire una risposta stabile.
- Le route di debug rendono verificabili classificazione, binding, provider, cache e output generato.
