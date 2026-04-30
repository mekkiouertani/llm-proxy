# LLM Proxy Worker

Cloudflare Worker che intercetta richieste verso pagine HTML e restituisce una versione markdown pulita quando il client e' un crawler AI o quando il debug e' forzato.

L'obiettivo e' rendere lo stesso sito piu' leggibile da modelli come ChatGPT, Claude o Perplexity senza chiedere al crawler di conoscere rotte speciali.

## Come Funziona

Il Worker riceve ogni richiesta e la classifica:

1. `?debug=llm` forza sempre la modalita' markdown.
2. `{path}/llms` forza la modalita' markdown per la pagina corrispondente.
3. User-Agent noti come `GPTBot`, `ClaudeBot` o `PerplexityBot` ricevono markdown.
4. Header di purpose espliciti come `ai` o `llm` sono usati come segnale secondario.
5. Browser e client ambigui ricevono la pagina originale.

Quando la modalita' markdown e' attiva, il Worker recupera la pagina originale, verifica che sia HTML, estrae metadata e contenuto rilevante, poi restituisce `text/markdown`.

Esempi:

```text
/about?debug=llm -> converte /about in markdown
/about/llms      -> converte /about in markdown
/style.css       -> pass-through, non viene convertito
```

## Output Markdown

La risposta contiene:

- titolo pagina;
- URL canonico;
- description;
- keyword;
- last-modified;
- blocco aziendale richiesto dalla traccia;
- contenuto convertito: heading, paragrafi, liste, link e immagini.

Elementi come navigazione, footer, script, style, form, banner e cookie UI vengono scartati per ridurre rumore e token inutili.

## Scelte Tecniche

La soluzione e' stateless: non usa DB, KV o memoria locale per dati critici. Questo rende retry e richieste duplicate naturalmente sicuri, perche' la trasformazione non crea side effect.

La classificazione e' conservativa: se un client e' ambiguo, riceve l'HTML normale. Ho scelto questa priorita' per evitare di rompere l'esperienza browser e rendere il comportamento facile da spiegare in review.

Il converter HTML e' volutamente minimale. Non esegue JavaScript e non fa crawling ricorsivo: lavora solo sull'HTML gia' restituito dall'origine. In produzione aggiungerei cache, metriche dedicate e un parser piu' completo per siti con markup molto rumoroso.

## Struttura

```text
src/index.ts              entrypoint Worker e orchestrazione HTTP
src/llm/classifier.ts     classificazione crawler/debug/pass-through
src/llm/htmlToMarkdown.ts estrazione metadata e conversione markdown
docs/                     spec, decisioni, piano e note di review
```

## Comandi

```bash
npm install
npm run dev
npm run deploy
```

Verifiche utili:

```bash
npx tsc --noEmit
npx wrangler deploy --dry-run
```

## Come Presentarla

La frase breve e' questa: il Worker si comporta come un middleware stateless che serve HTML ai browser e markdown ai crawler AI. La parte importante non e' avere una lista infinita di bot, ma una classificazione esplicita, prioritaria ed estendibile.
