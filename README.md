# LLM Proxy Worker

Cloudflare Worker che agisce come middleware davanti al sito origine.

Fa due cose:

- **Livello 1**: riconosce crawler AI o debug manuale e restituisce una versione markdown pulita della pagina.
- **Livello 2**: arricchisce le normali pagine HTML con tag SEO generati usando DataForSEO, OpenAI/Claude e cache KV.

## Worker Flow

```text
request
  -> index.ts
  -> /robots.txt? risposta diretta valida
  -> classifier.ts
  -> fetch pagina origine
  -> se crawler/debug LLM: htmlToMarkdown.ts
  -> altrimenti: seoService.ts
  -> response
```

### Livello 1

`src/llm/classifier.ts` decide se una richiesta deve ricevere markdown.

Priorita':

1. `?debug=llm`
2. `{path}/llms`
3. User-Agent AI noti
4. header di purpose espliciti
5. fallback: HTML normale

Se il ramo markdown e' attivo, `src/llm/htmlToMarkdown.ts` rimuove rumore come nav, footer, cookie banner, script e style, poi converte titoli, paragrafi, liste, link e immagini in markdown.

### Livello 2

`src/seo/seoService.ts` gestisce il flusso SEO:

```text
KV cache
  -> DataForSEO se cache miss
  -> seoRules.ts
  -> promptBuilder.ts
  -> OpenAI primary
  -> Claude fallback
  -> fallback locale
  -> htmlSeoInjector.ts
```

I risultati vengono salvati in KV per evitare chiamate LLM a ogni richiesta. Se DataForSEO o gli LLM falliscono, la pagina viene servita comunque con metadata fallback.

## File Principali

```text
src/index.ts               entrypoint Worker
src/llm/classifier.ts      classificazione crawler AI/debug/pass-through
src/llm/htmlToMarkdown.ts  conversione HTML -> markdown
src/seo/seoService.ts      orchestrazione SEO, cache e fallback
src/seo/seoRules.ts        regole condizionali della consegna 2
src/seo/promptBuilder.ts   prompt dinamico per LLM
src/seo/htmlSeoInjector.ts iniezione title, meta, OG, canonical, JSON-LD
src/seo/dataForSeoClient.ts client DataForSEO
src/seo/llmClients.ts      client OpenAI e Claude
```

## Deploy

```bash
npm install
npx wrangler deploy
```

Verifica prima del deploy:

```bash
npx tsc --noEmit
npx wrangler deploy --dry-run
```

## Secrets E Variabili

In locale copia `.dev.vars.example` in `.dev.vars`.

Secrets Cloudflare:

```bash
npx wrangler secret put DATAFORSEO_LOGIN
npx wrangler secret put DATAFORSEO_PASSWORD
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
```

Binding KV richiesto:

```text
SEO_CACHE
```

Variabili non segrete sono in `wrangler.jsonc`:

```text
SEO_CACHE_TTL_SECONDS
SEO_GENERATION_TIMEOUT_MS
SEO_TARGET_LANGUAGE
SEO_TARGET_LOCATION_CODE
OPENAI_MODEL
ANTHROPIC_MODEL
```

## Test

Livello 1:

```text
/?debug=llm
/llms
```

Livello 2:

```text
/?debug=seo&v=test-1
/?debug=seo-ping
```

Controllo HTML:

```text
view-source:https://www.tuurbo-trainer.com/
```

Cercare:

```html
<title>
<meta name="description">
<meta property="og:title">
<link rel="canonical">
<script type="application/ld+json">
```

## Note

- Il Worker e' stateless: lo stato SEO generato vive in KV.
- DataForSEO guida il prompt con keyword, intento, volume, CPC, competitor e SERP feature.
- OpenAI e' il provider primario; Claude e' fallback.
- `/robots.txt` viene servito dal Worker con direttive standard per evitare errori PageSpeed.
