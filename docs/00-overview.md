# 00-overview

Questo progetto e' un Cloudflare Worker che fa da proxy leggero per crawler AI.

Flusso principale:

```text
request pagina
  -> classifica client da URL/header
  -> se browser normale: pass-through
  -> se crawler AI o debug: fetch origine
  -> se HTML: estrai metadata e contenuto utile
  -> ritorna markdown
```

Il punto piu' importante della soluzione e' la classificazione esplicita:

1. `?debug=llm`
2. `{path}/llms`
3. User-Agent AI noto
4. Header di purpose espliciti
5. fallback browser/pass-through

Non serve persistenza: la trasformazione e' stateless, idempotente e senza side effect.
