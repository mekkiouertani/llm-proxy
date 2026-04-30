# 05-notes

- Gap noto: la conversione HTML non sostituisce un renderer JS; funziona meglio con HTML gia' presente nella risposta.
- La lista degli AI crawler e' intenzionalmente estendibile, non definitiva.
- In production valuterei cache per URL e invalidazione su `last-modified`/`etag`.
- Test prioritari: debug query, path `/llms`, user-agent AI, browser pass-through, HTML non valido, origine 500.
- Rischio residuo: siti con markup molto rumoroso possono richiedere regole di pruning specifiche.
