# LLM Proxy Worker

Cloudflare Worker che intercetta le richieste del sito e applica due livelli:

- **Livello 1**: serve una versione markdown pulita ai crawler AI.
- **Livello 2**: migliora la SEO tecnica delle pagine HTML con metadata generati da DataForSEO + LLM.

La scelta di usare un Worker permette di intervenire sulle risposte senza modificare il repository del sito origine.

## Flusso Generale

```text
request
  -> Cloudflare Worker
  -> gestione /robots.txt se richiesto
  -> classificazione client
  -> fetch pagina origine
  -> se crawler AI/debug LLM: HTML -> markdown
  -> altrimenti: SEO cache/generation -> injection HTML
  -> response
```

Il file principale e' `src/index.ts`: fa da regista, ma delega la logica specifica ai moduli `llm` e `seo`.

## Livello 1: Markdown Per Crawler AI

Obiettivo: quando un crawler AI visita una pagina, deve ricevere testo strutturato e pulito invece di HTML/CSS/JS.

Il Worker decide se attivare questa modalita' in `src/llm/classifier.ts`, con priorita' esplicita:

1. `?debug=llm`, utile per test manuale;
2. `{path}/llms`, rotta alternativa richiesta dalla consegna;
3. User-Agent noti come `GPTBot`, `ClaudeBot`, `PerplexityBot`;
4. header di purpose espliciti come `ai` o `llm`;
5. fallback conservativo: pagina HTML normale.

Ho scelto un fallback conservativo per non rompere browser o client ambigui. Se non sono ragionevolmente sicuro che sia un crawler AI, non cambio la risposta.

Quando il ramo LLM e' attivo, `src/llm/htmlToMarkdown.ts`:

- estrae title, canonical URL, description, keyword e last-modified;
- rimuove navigazione, footer, cookie banner, script, style e decorazioni;
- converte heading, paragrafi, liste, link e immagini in markdown;
- restituisce `text/markdown`.

Test:

```text
/about?debug=llm
/about/llms
```

## Livello 2: SEO Tecnico Con AI

Obiettivo: generare e iniettare automaticamente tag SEO senza toccare il repo origine:

- `<title>`;
- `<meta name="description">`;
- Open Graph: `og:title`, `og:description`, `og:url`, `og:type`;
- `<link rel="canonical">`;
- JSON-LD: `WebSite` + `SearchAction` in homepage, `BreadcrumbList` sulle pagine interne.

Il flusso vive soprattutto in `src/seo/seoService.ts`:

```text
HTML page
  -> cerca metadata in KV
  -> se cache miss: DataForSEO
  -> regole condizionali nel codice
  -> prompt dinamico
  -> OpenAI primary
  -> Claude fallback
  -> fallback locale se qualcosa fallisce
  -> salva in KV
  -> inject HTML
```

### Perche' KV

La consegna dice che chiamare l'LLM a ogni richiesta HTTP e' un errore architetturale. Per questo i metadata generati vengono salvati in Cloudflare KV con chiave per URL.

```text
prima richiesta nuova  -> DataForSEO + LLM + KV put
richieste successive   -> KV get + injection HTML
```

Questo riduce latenza, costo e rischio di rate limit.

### Perche' OpenAI + Claude

OpenAI e' usato come provider primario. Claude e' usato come fallback se OpenAI fallisce, va in timeout o produce un output non valido.

Non chiamo entrambi sempre: aumenterebbe costi e latenza. Il pattern scelto e' `primary + fallback`, con validazione locale prima di salvare in cache.

### Regole SEO Nel Codice

Le regole della consegna non sono scritte come prompt statico. Sono trasformate in vincoli da `src/seo/seoRules.ts`:

- intent informational: title in forma di domanda o con "Come", "Cosa", "Perche";
- intent transactional: title con verbo d'azione;
- intent navigational: brand in prima posizione;
- CPC alto: description differenziata dai primi competitor SERP;
- featured snippet: title come risposta diretta;
- knowledge panel: JSON-LD piu' ricco;
- volume alto: keyword nel title entro i primi 30 caratteri.

Poi `src/seo/promptBuilder.ts` costruisce un prompt dinamico usando dati DataForSEO e vincoli calcolati. Due pagine con dati diversi generano prompt diversi.

### Fallback

Se DataForSEO non risponde, se OpenAI/Claude falliscono, o se il timeout viene superato, il Worker serve comunque la pagina.

Il fallback locale usa title/meta/H1/paragrafi presenti nell'HTML e genera metadata validi ma meno ottimizzati. Questo evita pagine rotte e rende il sistema resiliente.

Debug:

```text
/?debug=seo
/?debug=seo-ping
```

`?debug=seo` mostra metadata, SERP, vincoli, prompt e stato dei provider. `?debug=seo-ping` verifica se il Worker vede KV e secrets.

## Robots.txt

Il Worker serve anche `/robots.txt` per evitare direttive non standard che PageSpeed segnala come errore.

Risposta generata:

```txt
User-agent: *
Allow: /

Sitemap: https://www.tuurbo-trainer.com/sitemap.xml
```

## Struttura

```text
src/index.ts               entrypoint Worker e orchestrazione HTTP
src/env.ts                 binding Cloudflare e variabili ambiente
src/llm/classifier.ts      classificazione crawler/debug/pass-through
src/llm/htmlToMarkdown.ts  conversione HTML -> markdown
src/seo/seoService.ts      cache, DataForSEO, LLM, fallback
src/seo/seoRules.ts        regole condizionali SEO
src/seo/promptBuilder.ts   prompt dinamico per LLM
src/seo/htmlSeoInjector.ts injection tag SEO e JSON-LD
src/seo/dataForSeoClient.ts client DataForSEO
src/seo/llmClients.ts      client OpenAI e Claude
```

## Variabili E Secrets

In locale copiare `.dev.vars.example` in `.dev.vars`.

Secrets Cloudflare:

```bash
npx wrangler secret put DATAFORSEO_LOGIN
npx wrangler secret put DATAFORSEO_PASSWORD
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
```

Binding KV:

```text
SEO_CACHE
```

Variabili non segrete configurate in `wrangler.jsonc`:

```text
SEO_CACHE_TTL_SECONDS
SEO_GENERATION_TIMEOUT_MS
SEO_TARGET_LANGUAGE
SEO_TARGET_LOCATION_CODE
OPENAI_MODEL
ANTHROPIC_MODEL
```

## Comandi

```bash
npm install
npm run dev
npm run deploy
```

Verifiche:

```bash
npx tsc --noEmit
npx wrangler deploy --dry-run
```

## Come Verificare

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

HTML reale:

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

## Trade-Off

- Ho preferito un Worker stateless: meno infrastruttura e deploy piu' semplice.
- Ho usato KV per i risultati SEO: abbastanza semplice per cache per URL, senza introdurre DB.
- Ho evitato parsing HTML pesante: soluzione piu' piccola, ma meno adatta a markup molto complesso.
- Ho lasciato DataForSEO non bloccante: se non trova dati, il sistema usa fallback SERP e continua.
- Ho scelto timeout e fallback per non sacrificare disponibilita' della pagina.

## Cosa Migliorerei In Produzione

- invalidazione cache basata su `ETag` o `Last-Modified`;
- metriche dedicate per DataForSEO, OpenAI, Claude, fallback e cache hit;
- allowlist dei domini origine;
- parser HTML piu' robusto;
- gestione sitemap reale se il sito ne espone una;
- lista crawler configurabile senza deploy.
