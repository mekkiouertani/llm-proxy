# 01-spec

## Obiettivo
- Worker serverless che intercetta richieste verso pagine web e, se il client e' un crawler AI, restituisce una versione markdown pulita.
- La trasformazione deve essere trasparente: il crawler non deve conoscere rotte speciali.
- Rotte di debug richieste: `{path}/llms` e `?debug=llm`.

## Input e output
- Input: request HTTP con URL, header e HTML della pagina originale.
- Output crawler/debug: `text/markdown; charset=utf-8`.
- Output client normali: pass-through della risposta originale.

## Markdown richiesto
- Front matter testuale: titolo, url canonico, description, keyword, last-modified, separatore `---`.
- Contenuto rilevante: heading, paragrafi, liste, link, immagini convertite usando testo alternativo.
- Da scartare: navigazione, footer, cookie banner, script, style, elementi decorativi.

## Edge case
- Client ambiguo: classificazione esplicita a priorita', con fallback conservativo.
- Pagine non HTML: pass-through.
- Fetch origine fallito: risposta 502 in debug/crawler, senza side effect.
- Retry e duplicati: operazione idempotente perche' non persiste stato.
