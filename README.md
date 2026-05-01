# LLM Proxy Worker

Cloudflare Worker che agisce come middleware davanti al sito origine.

Tipo di progetto: backend serverless in Node.js e TypeScript, pensato per girare su Cloudflare Workers con KV, Browser Run e integrazioni esterne per SEO/LLM.

Fa tre cose:

- **Livello 1**: riconosce crawler AI o debug manuale e restituisce una versione markdown pulita della pagina.
- **Livello 2**: arricchisce le normali pagine HTML con tag SEO generati usando DataForSEO, OpenAI/Claude e cache KV.
- **Livello 3**: serve ai crawler HTML prerenderizzato con JavaScript gia' eseguito tramite Browser Run.

## Consegne Completate

- **Consegna 1**: l'obiettivo era offrire ai crawler AI una versione leggibile e leggera delle pagine. E' stata implementata con classificazione request, route di debug e conversione HTML -> Markdown pulita.
- **Consegna 2**: l'obiettivo era generare metadata SEO dinamici usando dati SERP e regole condizionali. E' stata implementata con DataForSEO, prompt LLM, fallback provider/locali, validazione e cache KV.
- **Consegna 3**: l'obiettivo era gestire pagine che dipendono da JavaScript prima della lettura da parte dei crawler. E' stata implementata con prerender tramite Browser Run, cache dedicata e fallback alla pagina originale in caso di errore.

Le tre consegne sono state provate sul Worker con le route di debug dedicate e i risultati ottenuti sono quelli attesi.

## Worker Flow

```text
request
  -> index.ts
  -> /robots.txt? risposta diretta valida
  -> classifier.ts
  -> se debug LLM esplicito: htmlToMarkdown.ts
  -> se crawler reale: prerenderService.ts
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

### Livello 3

`src/prerender/prerenderService.ts` gestisce il prerender per crawler e debug, usando `PRERENDER_CACHE` per evitare render ripetuti e Browser Run solo quando serve.

Se il prerender non produce HTML valido o fallisce, il Worker non blocca la richiesta e restituisce la pagina originale.

## File Principali

```text
src/index.ts               entrypoint Worker
src/llm/classifier.ts      classificazione crawler AI/debug/pass-through
src/llm/htmlToMarkdown.ts  conversione HTML -> markdown
src/prerender/*            Browser Run + KV per HTML prerenderizzato
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
PRERENDER_CACHE
```

Binding Browser Run richiesto:

```text
BROWSER
```

Variabili non segrete sono in `wrangler.jsonc`:

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

Livello 3:

```text
/?debug=prerender
```

Con un crawler reale o `?debug=prerender`, il Worker prova prima `PRERENDER_CACHE`; se manca cache usa Browser Run, salva HTML renderizzato e lo restituisce. Se il render fallisce, torna alla pagina originale.

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
- Browser Run viene usato solo per crawler/cache miss, mai per utenti normali.
- `/robots.txt` viene servito dal Worker con direttive standard per evitare errori PageSpeed.
