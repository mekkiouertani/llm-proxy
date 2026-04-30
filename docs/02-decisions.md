# 02-decisions

- Runtime: Cloudflare Worker TypeScript, stateless e senza DB.
- Pattern: handler leggero in `src/index.ts`, logica separata in moduli `llm`.
- Classificazione: priorita' esplicita `debug route/query` > `AI user-agent noto` > `header di supporto` > `browser/pass-through`.
- Parsing: conversione HTML minimale e difensiva, sufficiente per titolo, meta, testo, liste, link e immagini.
- Idempotenza: nessuna persistenza e nessun side effect; retry della stessa URL produce lo stesso tipo di risposta.
- Osservabilita': log essenziali con path, decisione e motivo della classificazione.
- Costi/performance: un solo fetch verso origine per richiesta trasformata; nessun crawling ricorsivo.
- Semplificazione: lista crawler estendibile ma non esaustiva; il valore sta nella priorita' documentata.
- Production: aggiungerei cache condivisa, parser HTML piu' robusto, allowlist domini e metriche dedicate.
