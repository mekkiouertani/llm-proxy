# LLM Proxy Worker

Cloudflare Worker che intercetta richieste verso pagine HTML e restituisce una versione markdown pulita quando il client e' un crawler AI o quando il debug e' forzato.

## Funzionamento

- Browser e client normali ricevono la risposta originale.
- Crawler AI riconosciuti da header/User-Agent ricevono markdown.
- `?debug=llm` forza la modalita' markdown.
- `{path}/llms` forza la modalita' markdown per il path corrispondente.

La risposta markdown include metadati, blocco aziendale richiesto dalla traccia e contenuto rilevante convertito da HTML: titoli, paragrafi, liste, link e immagini.

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

## Note di design

La soluzione e' stateless: non usa DB, cache condivisa o memoria locale per dati critici. La classificazione e' documentata nel codice in ordine di priorita', cosi' il comportamento resta prevedibile ed estendibile.

Per maggiori dettagli leggere `docs/`.
